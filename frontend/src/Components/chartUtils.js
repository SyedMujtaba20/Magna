
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

// Helper function for floating point comparison
const isPositionMatch = (pos1, pos2, tolerance = 0.01) => {
  if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2) || pos1.length !== pos2.length) {
    return false;
  }

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
    thickness = data.thickness || data.thick || data.t || data.value;
  } else if (type === 'cell') {
    thickness = data.averageThickness || data.avgThickness || data.thickness || 
                data.thick || data.meanThickness || data.value;
  }

  if (typeof thickness === 'string') {
    thickness = parseFloat(thickness);
  }

  if (thickness === null || thickness === undefined || isNaN(thickness) || !isFinite(thickness)) {
    return null;
  }

  if (thickness > 100) {
    thickness = thickness / 10; // Convert mm to cm
  }

  return thickness;
};

// Normalize strings for matching
const normalizeString = (str) =>
  String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// Parse CSV point cloud data into cells
export const parseCSV = (csvData, fileName) => {
  console.log(`[CSVParser] Parsing ${fileName}, rows: ${csvData.length}`);
  console.log(`[CSVParser] Sample data:`, csvData.slice(0, 5));

  const cells = [];
  const cellMap = new Map();
  const pointStats = { xRange: { min: Infinity, max: -Infinity }, zRange: { min: Infinity, max: -Infinity }, tags: new Set() };

  // Map Tag to zone/profile (adjust based on actual Tag values)
  const tagToZoneProfile = {
    32: { zone: 'SlagLine', profile: 'P15' }, // Example mapping
    33: { zone: 'Belly', profile: 'P14' },
    // Add more mappings based on CSV data
  };

  // Match createGridOverlay's grid: 20 profiles over x=-150 to 150
  const profileCount = 20;
  const xMin = -150 / 1000; // Convert to meters
  const xMax = 150 / 1000;
  const profileSpacing = (xMax - xMin) / profileCount; // ~0.015 meters per profile

  csvData.forEach((point, index) => {
    // Validate point data
    if (!point.X || !point.Y || !point.Z) {
      console.warn(`[CSVParser] Skipping row ${index} due to missing coordinates:`, point);
      return;
    }

    // Convert coordinates to meters (assuming input is in mm)
    const x = parseFloat(point.X) / 1000;
    const z = parseFloat(point.Z) / 1000;

    // Update point stats
    pointStats.xRange.min = Math.min(pointStats.xRange.min, x);
    pointStats.xRange.max = Math.max(pointStats.xRange.max, x);
    pointStats.zRange.min = Math.min(pointStats.zRange.min, z);
    pointStats.zRange.max = Math.max(pointStats.zRange.max, z);
    if (point.Tag) pointStats.tags.add(point.Tag);

    // Assign zone and profile
    let zone, profile;
    const tagMapping = tagToZoneProfile[point.Tag];
    if (tagMapping) {
      zone = tagMapping.zone;
      profile = tagMapping.profile;
    } else {
      // Coordinate-based fallback (align with zoneMap in sceneUtils.js)
      if (z < -90 / 1000) {
        zone = 'SlagLine';
      } else if (z < -30 / 1000) {
        zone = 'Roof';
      } else if (z < 30 / 1000) {
        zone = 'Belly';
      } else if (z < 90 / 1000) {
        zone = 'InitialBricks';
      } else {
        zone = 'Bottom';
      }

      // Map x to profiles P1 to P20
      const profileIndex = Math.min(
        profileCount - 1,
        Math.max(0, Math.floor((x - xMin) / profileSpacing))
      );
      profile = `P${profileIndex + 1}`;
    }

    // Calculate thickness (Z distance from reference plane in cm)
    const referenceZ = 0; // Adjust based on furnace geometry
    const thickness = Math.abs(z - referenceZ) * 100; // Convert meters to cm

    if (!isFinite(thickness)) {
      console.warn(`[CSVParser] Invalid thickness for row ${index}:`, point);
      return;
    }

    const key = `${zone}|${profile}`;
    if (!cellMap.has(key)) {
      cellMap.set(key, { zone, profile, points: [], sumThickness: 0 });
    }
    const cell = cellMap.get(key);
    cell.points.push(point);
    cell.sumThickness += thickness;
  });

  cellMap.forEach((cell, key) => {
    if (cell.points.length > 0) {
      cells.push({
        zone: cell.zone,
        profile: cell.profile,
        averageThickness: cell.sumThickness / cell.points.length
      });
    }
  });

  console.log(`[CSVParser] Generated ${cells.length} cells for ${fileName}:`, cells.slice(0, 5));
  console.log(`[CSVParser] Point stats:`, {
    xRange: pointStats.xRange,
    zRange: pointStats.zRange,
    tags: Array.from(pointStats.tags)
  });
  return { points: csvData, cells };
};

// Analyze data coverage across files
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

    console.log(`📊 Found ${fileData.cells.length} cells, ${fileData.points?.length || 0} points in ${file.name}`);

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

  const allZones = Array.from(coverage.zones).sort();
  const allProfiles = Array.from(coverage.profiles).sort();
  const allCombinations = Array.from(coverage.cellCombinations).sort();

  console.log('\n=== COVERAGE SUMMARY ===');
  console.log(`🏭 Total unique zones: ${allZones.length}`);
  console.log(`📏 Total unique profiles: ${allProfiles.length}`);
  console.log(`🔗 Total unique combinations: ${allCombinations.length}`);

  console.log('\n=== ZONE COVERAGE ===');
  allZones.forEach(zone => {
    const fileCount = coverage.zoneCoverage[zone]?.size || 0;
    const percentage = ((fileCount / files.length) * 100).toFixed(1);
    console.log(`${zone}: ${fileCount}/${files.length} files (${percentage}%)`);
  });

  console.log('\n=== PROFILE COVERAGE ===');
  allProfiles.forEach(profile => {
    const fileCount = coverage.profileCoverage[profile]?.size || 0;
    const percentage = ((fileCount / files.length) * 100).toFixed(1);
    console.log(`${profile}: ${fileCount}/${files.length} files (${percentage}%)`);
    if (fileCount < files.length) {
      const missingFiles = files.filter(f => !coverage.profileCoverage[profile]?.has(f.name));
      console.log(`  ❌ Missing in: ${missingFiles.map(f => f.name).join(', ')}`);
    }
  });

  console.log('\n=== LOW COVERAGE COMBINATIONS ===');
  const lowCoverageCombos = allCombinations.filter(combo => {
    const [zone, profile] = combo.split('|');
    const zoneFiles = coverage.zoneCoverage[zone] || new Set();
    const profileFiles = coverage.profileCoverage[profile] || new Set();
    const intersection = new Set([...zoneFiles].filter(x => profileFiles.has(x)));
    return intersection.size < files.length * 0.5;
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

// Run data coverage analysis
export const runDataCoverageAnalysis = (files, fileDataCache) => {
  console.log('\n🔍 RUNNING COMPLETE DATA COVERAGE ANALYSIS...');
  return analyzeFurnaceDataCoverage(files, fileDataCache);
};

// Get thickness data across files
export const getThicknessDataAcrossFiles = (selectedData, type, files, fileDataCache) => {
  console.log('\n[getThicknessDataAcrossFiles] === START ===');
  console.log(`[getThicknessDataAcrossFiles] Searching for: ${type} - ${selectedData.zone || 'N/A'} | ${selectedData.profile || 'N/A'}`);

  if (type === 'cell' && selectedData.zone && selectedData.profile) {
    const combo = `${selectedData.zone}|${selectedData.profile}`;
    console.log(`[getThicknessDataAcrossFiles] Analyzing coverage for: ${combo}`);

    let filesWithCombo = 0;
    let filesWithZone = 0;
    let filesWithProfile = 0;

    // Check current file explicitly
    if (selectedData.fileName) {
      const currentFileData = fileDataCache.get(selectedData.fileName);
      if (currentFileData?.cells) {
        console.log(`[getThicknessDataAcrossFiles] Current file ${selectedData.fileName} cells:`, 
          currentFileData.cells.map(cell => `${cell.zone}|${cell.profile}`).slice(0, 10));
      }
    }

    files.forEach(file => {
      const fileData = fileDataCache.get(file.name);
      if (fileData?.cells) {
        const hasZone = fileData.cells.some(cell => normalizeString(cell.zone) === normalizeString(selectedData.zone));
        const hasProfile = fileData.cells.some(cell => normalizeString(cell.profile) === normalizeString(selectedData.profile));
        const hasCombo = fileData.cells.some(cell =>
          normalizeString(cell.zone) === normalizeString(selectedData.zone) &&
          normalizeString(cell.profile) === normalizeString(selectedData.profile)
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
        console.log(`[getThicknessDataAcrossFiles] Searching in ${fileData.cells.length} cells...`);
        const availableCells = fileData.cells.map(cell => `${cell.zone}|${cell.profile}`);
        console.log(`[getThicknessDataAcrossFiles] Available cells: ${availableCells.slice(0, 5).join(', ')}${availableCells.length > 5 ? '...' : ''}`);

        const cellData = fileData.cells.find((cell, cellIndex) => {
          const cellZone = normalizeString(cell.zone);
          const cellProfile = normalizeString(cell.profile);
          const targetZone = normalizeString(selectedData.zone);
          const targetProfile = normalizeString(selectedData.profile);

          console.log(`[CellMatch] Checking cell ${cellIndex}: ${cellZone}|${cellProfile} vs ${targetZone}|${targetProfile}`);
          return cellZone === targetZone && cellProfile === targetProfile;
        });

        if (cellData) {
          thickness = extractThickness(cellData, 'cell');
          matchFound = true;
          console.log(`[getThicknessDataAcrossFiles] ✓ Cell match found, thickness: ${thickness}`);
        } else {
          console.log(`[getThicknessDataAcrossFiles] ✗ No matching cell found`);
          const partialMatches = fileData.cells.filter(cell => {
            const zoneMatch = normalizeString(cell.zone) === normalizeString(selectedData.zone);
            const profileMatch = normalizeString(cell.profile) === normalizeString(selectedData.profile);
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