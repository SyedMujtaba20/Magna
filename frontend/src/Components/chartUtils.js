import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register all necessary Chart.js components
ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Chart options for the ThicknessDialog chart
export const chartOptionsForDialog = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      labels: { color: 'black' },
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `Thickness: ${context.parsed.y.toFixed(2)} cm`;
        },
      },
    },
  },
  scales: {
    x: {
      type: 'category',
      ticks: {
        color: 'black',
        maxRotation: 45,
        minRotation: 45,
      },
      grid: { color: 'rgba(0,0,0,0.1)' },
      title: {
        display: true,
        text: 'Files',
        color: 'black',
      },
    },
    y: {
      ticks: { color: 'black' },
      grid: { color: 'rgba(0,0,0,0.1)' },
      title: {
        display: true,
        text: 'Thickness (cm)',
        color: 'black',
      },
    },
  },
};

// Enhanced helper function for floating point comparison with multiple tolerance levels
const isPositionMatch = (pos1, pos2, tolerance = 0.01) => {
  if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2)) {
    return false;
  }
  
  if (pos1.length !== pos2.length) {
    return false;
  }
  
  // Try multiple tolerance levels
  const tolerances = [tolerance, 0.001, 0.0001, 1e-6];
  
  for (const tol of tolerances) {
    const matches = pos1.every((val, index) => Math.abs(val - pos2[index]) < tol);
    if (matches) {
      console.log(`[isPositionMatch] Match found with tolerance: ${tol}`);
      return true;
    }
  }
  
  return false;
};

// Enhanced thickness extraction function
const extractThickness = (data, type) => {
  if (!data) return null;
  
  let thickness = null;
  
  if (type === 'point') {
    // Try multiple possible thickness property names
    thickness = data.thickness || data.thick || data.t || data.value;
  } else if (type === 'cell') {
    // Try multiple possible thickness property names for cells
    thickness = data.averageThickness || data.avgThickness || data.thickness || 
                data.thick || data.meanThickness || data.value;
  }
  
  // Handle different data types
  if (typeof thickness === 'string') {
    thickness = parseFloat(thickness);
  }
  
  // Validate thickness value
  if (thickness === null || thickness === undefined || isNaN(thickness) || !isFinite(thickness)) {
    return null;
  }
  
  // Handle unit conversion - only convert if value seems to be in mm (> 100)
  if (thickness > 100) {
    thickness = thickness / 10; // Convert mm to cm
  }
  
  return thickness;
};

// New function to analyze data coverage across all files
export const analyzeFurnaceDataCoverage = (files, fileDataCache) => {
  console.log('\n=== FURNACE DATA COVERAGE ANALYSIS ===');
  
  const coverage = {
    totalFiles: files.length,
    zones: new Set(),
    profiles: new Set(),
    zoneCoverage: {},
    profileCoverage: {},
    cellCombinations: new Set(),
    missingData: []
  };
  
  files.forEach((file, fileIndex) => {
    console.log(`\nAnalyzing file ${fileIndex + 1}/${files.length}: ${file.name}`);
    
    const fileData = fileDataCache.get(file.name);
    if (!fileData || !fileData.cells) {
      console.log(`❌ No cell data in ${file.name}`);
      coverage.missingData.push({
        file: file.name,
        issue: 'No cell data'
      });
      return;
    }
    
    console.log(`📊 Found ${fileData.cells.length} cells in ${file.name}`);
    
    // Analyze zones and profiles in this file
    const fileZones = new Set();
    const fileProfiles = new Set();
    const fileCells = new Set();
    
    fileData.cells.forEach(cell => {
      if (cell.zone) {
        coverage.zones.add(cell.zone);
        fileZones.add(cell.zone);
        
        if (!coverage.zoneCoverage[cell.zone]) {
          coverage.zoneCoverage[cell.zone] = new Set();
        }
        coverage.zoneCoverage[cell.zone].add(file.name);
      }
      
      if (cell.profile) {
        coverage.profiles.add(cell.profile);
        fileProfiles.add(cell.profile);
        
        if (!coverage.profileCoverage[cell.profile]) {
          coverage.profileCoverage[cell.profile] = new Set();
        }
        coverage.profileCoverage[cell.profile].add(file.name);
      }
      
      if (cell.zone && cell.profile) {
        const combo = `${cell.zone}|${cell.profile}`;
        coverage.cellCombinations.add(combo);
        fileCells.add(combo);
      }
    });
    
    console.log(`📍 File zones: [${Array.from(fileZones).join(', ')}]`);
    console.log(`📏 File profiles: [${Array.from(fileProfiles).join(', ')}]`);
    console.log(`🔗 File combinations: ${fileCells.size}`);
  });
  
  // Convert Sets to Arrays and calculate coverage statistics
  const allZones = Array.from(coverage.zones).sort();
  const allProfiles = Array.from(coverage.profiles).sort();
  const allCombinations = Array.from(coverage.cellCombinations).sort();
  
  console.log('\n=== COVERAGE SUMMARY ===');
  console.log(`🏭 Total unique zones: ${allZones.length}`);
  console.log(`📏 Total unique profiles: ${allProfiles.length}`);
  console.log(`🔗 Total unique combinations: ${allCombinations.length}`);
  
  console.log('\n=== ZONE COVERAGE ===');
  allZones.forEach(zone => {
    const fileCount = coverage.zoneCoverage[zone].size;
    const percentage = ((fileCount / files.length) * 100).toFixed(1);
    console.log(`${zone}: ${fileCount}/${files.length} files (${percentage}%)`);
  });
  
  console.log('\n=== PROFILE COVERAGE ===');
  allProfiles.forEach(profile => {
    const fileCount = coverage.profileCoverage[profile].size;
    const percentage = ((fileCount / files.length) * 100).toFixed(1);
    console.log(`${profile}: ${fileCount}/${files.length} files (${percentage}%)`);
    
    if (fileCount < files.length) {
      const missingFiles = files.filter(f => !coverage.profileCoverage[profile].has(f.name));
      console.log(`  ❌ Missing in: ${missingFiles.map(f => f.name).join(', ')}`);
    }
  });
  
  // Find combinations with low coverage
  console.log('\n=== LOW COVERAGE COMBINATIONS ===');
  const lowCoverageCombos = allCombinations.filter(combo => {
    const [zone, profile] = combo.split('|');
    const zoneFiles = coverage.zoneCoverage[zone] || new Set();
    const profileFiles = coverage.profileCoverage[profile] || new Set();
    const intersection = new Set([...zoneFiles].filter(x => profileFiles.has(x)));
    return intersection.size < files.length * 0.5; // Less than 50% coverage
  });
  
  lowCoverageCombos.forEach(combo => {
    const [zone, profile] = combo.split('|');
    const zoneFiles = coverage.zoneCoverage[zone] || new Set();
    const profileFiles = coverage.profileCoverage[profile] || new Set();
    const intersection = new Set([...zoneFiles].filter(x => profileFiles.has(x)));
    const percentage = ((intersection.size / files.length) * 100).toFixed(1);
    console.log(`⚠️  ${zone} + ${profile}: ${intersection.size}/${files.length} files (${percentage}%)`);
  });
  
  return {
    zones: allZones,
    profiles: allProfiles,
    combinations: allCombinations,
    zoneCoverage: coverage.zoneCoverage,
    profileCoverage: coverage.profileCoverage,
    lowCoverageCombos
  };
};

// Enhanced utility function to get thickness data across files
// Add this function to your component to run a one-time analysis
export const runDataCoverageAnalysis = (files, fileDataCache) => {
  console.log('\n🔍 RUNNING COMPLETE DATA COVERAGE ANALYSIS...');
  return analyzeFurnaceDataCoverage(files, fileDataCache);
};

export const getThicknessDataAcrossFiles = (selectedData, type, files, fileDataCache) => {
  console.log('\n[getThicknessDataAcrossFiles] === START ===');
  console.log(`[getThicknessDataAcrossFiles] Searching for: ${type} - ${selectedData.zone || 'N/A'} | ${selectedData.profile || 'N/A'}`);
  
  // Run coverage analysis if this is a cell and we haven't seen this combination before
  if (type === 'cell' && selectedData.zone && selectedData.profile) {
    const combo = `${selectedData.zone}|${selectedData.profile}`;
    console.log(`[getThicknessDataAcrossFiles] Analyzing coverage for: ${combo}`);
    
    // Quick coverage check for this specific combination
    let filesWithCombo = 0;
    let filesWithZone = 0;
    let filesWithProfile = 0;
    
    files.forEach(file => {
      const fileData = fileDataCache.get(file.name);
      if (fileData?.cells) {
        const hasZone = fileData.cells.some(cell => cell.zone === selectedData.zone);
        const hasProfile = fileData.cells.some(cell => cell.profile === selectedData.profile);
        const hasCombo = fileData.cells.some(cell => 
          cell.zone === selectedData.zone && cell.profile === selectedData.profile
        );
        
        if (hasZone) filesWithZone++;
        if (hasProfile) filesWithProfile++;
        if (hasCombo) filesWithCombo++;
      }
    });
    
    console.log(`[getThicknessDataAcrossFiles] Coverage check:`);
    console.log(`  Zone "${selectedData.zone}": ${filesWithZone}/${files.length} files`);
    console.log(`  Profile "${selectedData.profile}": ${filesWithProfile}/${files.length} files`);
    console.log(`  Combination: ${filesWithCombo}/${files.length} files`);
    
    if (filesWithCombo === 0) {
      console.log(`[getThicknessDataAcrossFiles] ❌ ZERO FILES contain this combination!`);
      
      // Show what combinations DO exist
      const alternativeCombos = new Set();
      files.forEach(file => {
        const fileData = fileDataCache.get(file.name);
        if (fileData?.cells) {
          fileData.cells.forEach(cell => {
            if (cell.zone && cell.profile) {
              alternativeCombos.add(`${cell.zone}|${cell.profile}`);
            }
          });
        }
      });
      
      console.log(`[getThicknessDataAcrossFiles] Available combinations:`, 
        Array.from(alternativeCombos).slice(0, 10).join(', '));
    }
  }

  if (!selectedData || !files || !fileDataCache) {
    console.error('[getThicknessDataAcrossFiles] Missing required parameters');
    return [];
  }

  const thicknessData = [];
  let totalMatches = 0;
  let totalFiles = files.length;

  files.forEach((file, index) => {
    console.log(`\n[getThicknessDataAcrossFiles] === FILE ${index + 1}/${totalFiles}: ${file.name} ===`);
    
    const fileData = fileDataCache.get(file.name);
    if (!fileData) {
      console.warn(`[getThicknessDataAcrossFiles] No cached data for file: ${file.name}`);
      return;
    }

    let thickness = null;
    let matchFound = false;

    if (type === 'point' && selectedData.position) {
      console.log(`[getThicknessDataAcrossFiles] === POINT MATCHING ===`);
      console.log(`[getThicknessDataAcrossFiles] Target position:`, selectedData.position);

      if (fileData.points && Array.isArray(fileData.points)) {
        const matchedPoint = fileData.points.find((point) => {
          if (!point.position || !Array.isArray(point.position)) {
            return false;
          }
          return isPositionMatch(point.position, selectedData.position);
        });

        if (matchedPoint) {
          thickness = extractThickness(matchedPoint, 'point');
          matchFound = true;
          console.log(`[getThicknessDataAcrossFiles] ✓ Point match found, thickness: ${thickness}`);
        } else {
          console.log(`[getThicknessDataAcrossFiles] ✗ No matching point found`);
        }
      }
    } else if (type === 'cell' && selectedData.zone && selectedData.profile) {
      console.log(`[getThicknessDataAcrossFiles] === CELL MATCHING ===`);
      console.log(`[getThicknessDataAcrossFiles] Target: zone="${selectedData.zone}", profile="${selectedData.profile}"`);

      if (fileData.cells && Array.isArray(fileData.cells)) {
        // Enhanced cell matching with detailed logging
        console.log(`[getThicknessDataAcrossFiles] Searching in ${fileData.cells.length} cells...`);
        
        // Log all available cells in this file
        const availableCells = fileData.cells.map(cell => `${cell.zone}|${cell.profile}`);
        console.log(`[getThicknessDataAcrossFiles] Available cells: ${availableCells.slice(0, 5).join(', ')}${availableCells.length > 5 ? '...' : ''}`);
        
        const cellData = fileData.cells.find((cell, cellIndex) => {
          // More detailed matching with logging
          const cellZone = String(cell.zone || '').trim();
          const cellProfile = String(cell.profile || '').trim();
          const targetZone = String(selectedData.zone || '').trim();
          const targetProfile = String(selectedData.profile || '').trim();
          
          const zoneMatch = cellZone.toLowerCase() === targetZone.toLowerCase();
          const profileMatch = cellProfile.toLowerCase() === targetProfile.toLowerCase();
          
          if (zoneMatch && profileMatch) {
            console.log(`[getThicknessDataAcrossFiles] EXACT MATCH at index ${cellIndex}:`, {
              zone: cellZone,
              profile: cellProfile,
              thickness: cell.averageThickness || cell.thickness,
              allProps: Object.keys(cell)
            });
            return true;
          }
          
          return false;
        });

        if (cellData) {
          thickness = extractThickness(cellData, 'cell');
          matchFound = true;
          console.log(`[getThicknessDataAcrossFiles] ✓ Cell match found, thickness: ${thickness}`);
        } else {
          console.log(`[getThicknessDataAcrossFiles] ✗ No matching cell found`);
          
          // Show partial matches for debugging
          const partialMatches = fileData.cells.filter(cell => {
            const zoneMatch = String(cell.zone || '').toLowerCase().trim() === String(selectedData.zone || '').toLowerCase().trim();
            const profileMatch = String(cell.profile || '').toLowerCase().trim() === String(selectedData.profile || '').toLowerCase().trim();
            return zoneMatch || profileMatch;
          });
          
          if (partialMatches.length > 0) {
            console.log(`[getThicknessDataAcrossFiles] Found ${partialMatches.length} partial matches:`);
            partialMatches.slice(0, 3).forEach((cell, i) => {
              console.log(`  ${i + 1}. ${cell.zone}|${cell.profile}`);
            });
          }
        }
      }
    }

    // Add data point if valid thickness found
    if (matchFound && thickness !== null && !isNaN(thickness) && isFinite(thickness)) {
      const dataPoint = {
        fileName: file.name,
        thickness,
        date: file.date || new Date().toISOString(),
        color: selectedData.color || '#3B82F6',
      };
      
      thicknessData.push(dataPoint);
      totalMatches++;
      console.log(`[getThicknessDataAcrossFiles] ✓ DATA ADDED: ${file.name} -> ${thickness} cm`);
    } else {
      console.log(`[getThicknessDataAcrossFiles] ✗ DATA SKIPPED: ${file.name} (thickness: ${thickness}, matchFound: ${matchFound})`);
    }
  });

  console.log(`\n[getThicknessDataAcrossFiles] === SUMMARY ===`);
  console.log(`[getThicknessDataAcrossFiles] Search target: ${selectedData.zone || 'N/A'} | ${selectedData.profile || 'N/A'}`);
  console.log(`[getThicknessDataAcrossFiles] Total files processed: ${totalFiles}`);
  console.log(`[getThicknessDataAcrossFiles] Successful matches: ${totalMatches}`);
  console.log(`[getThicknessDataAcrossFiles] Match rate: ${((totalMatches / totalFiles) * 100).toFixed(1)}%`);
  
  if (totalMatches === 0) {
    console.log(`[getThicknessDataAcrossFiles] ❌ NO DATA FOUND - This combination may not exist in any files`);
  }
  
  console.log('[getThicknessDataAcrossFiles] === END ===\n');
  
  return thicknessData;
};