
// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   TimeScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   Filler,
// } from 'chart.js';
// import 'chartjs-adapter-date-fns';

// // Register all necessary Chart.js components
// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   TimeScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// // Chart options for the ThicknessDialog chart
// export const chartOptionsForDialog = {
//   responsive: true,
//   maintainAspectRatio: false,
//   animation: false,
//   plugins: {
//     legend: {
//       labels: { color: 'black' },
//     },
//     tooltip: {
//       callbacks: {
//         label: function (context) {
//           return `Thickness: ${context.parsed.y.toFixed(2)} cm`;
//         },
//       },
//     },
//   },
//   scales: {
//     x: {
//       type: 'category',
//       ticks: {
//         color: 'black',
//         maxRotation: 45,
//         minRotation: 45,
//       },
//       grid: { color: 'rgba(0,0,0,0.1)' },
//       title: {
//         display: true,
//         text: 'Files',
//         color: 'black',
//       },
//     },
//     y: {
//       ticks: { color: 'black' },
//       grid: { color: 'rgba(0,0,0,0.1)' },
//       title: {
//         display: true,
//         text: 'Thickness (cm)',
//         color: 'black',
//       },
//     },
//   },
// };

// // Helper function for floating point comparison
// const isPositionMatch = (pos1, pos2, tolerance = 0.01) => {
//   if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2) || pos1.length !== pos2.length) {
//     return false;
//   }

//   const tolerances = [tolerance, 0.001, 0.0001, 1e-6];
//   for (const tol of tolerances) {
//     const matches = pos1.every((val, index) => Math.abs(val - pos2[index]) < tol);
//     if (matches) {
//       console.log(`[isPositionMatch] Match found with tolerance: ${tol}`);
//       return true;
//     }
//   }
//   return false;
// };

// // Enhanced thickness extraction function
// const extractThickness = (data, type) => {
//   if (!data) return null;

//   let thickness = null;
//   if (type === 'point') {
//     thickness = data.thickness || data.thick || data.t || data.value;
//   } else if (type === 'cell') {
//     thickness = data.averageThickness || data.avgThickness || data.thickness || 
//                 data.thick || data.meanThickness || data.value;
//   }

//   if (typeof thickness === 'string') {
//     thickness = parseFloat(thickness);
//   }

//   if (thickness === null || thickness === undefined || isNaN(thickness) || !isFinite(thickness)) {
//     return null;
//   }

//   if (thickness > 100) {
//     thickness = thickness / 10; // Convert mm to cm
//   }

//   return thickness;
// };

// // Normalize strings for matching
// const normalizeString = (str) =>
//   String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// // Parse CSV point cloud data into cells
// export const parseCSV = (csvData, fileName) => {
//   console.log(`[CSVParser] Parsing ${fileName}, rows: ${csvData.length}`);
//   console.log(`[CSVParser] Sample data:`, csvData.slice(0, 5));

//   const cells = [];
//   const cellMap = new Map();
//   const pointStats = { xRange: { min: Infinity, max: -Infinity }, zRange: { min: Infinity, max: -Infinity }, tags: new Set() };

//   // Map Tag to zone/profile (adjust based on actual Tag values)
//   const tagToZoneProfile = {
//     32: { zone: 'SlagLine', profile: 'P15' }, // Example mapping
//     33: { zone: 'Belly', profile: 'P14' },
//     // Add more mappings based on CSV data
//   };

//   // Match createGridOverlay's grid: 20 profiles over x=-150 to 150
//   const profileCount = 20;
//   const xMin = -150 / 1000; // Convert to meters
//   const xMax = 150 / 1000;
//   const profileSpacing = (xMax - xMin) / profileCount; // ~0.015 meters per profile

//   csvData.forEach((point, index) => {
//     // Validate point data
//     if (!point.X || !point.Y || !point.Z) {
//       console.warn(`[CSVParser] Skipping row ${index} due to missing coordinates:`, point);
//       return;
//     }

//     // Convert coordinates to meters (assuming input is in mm)
//     const x = parseFloat(point.X) / 1000;
//     const z = parseFloat(point.Z) / 1000;

//     // Update point stats
//     pointStats.xRange.min = Math.min(pointStats.xRange.min, x);
//     pointStats.xRange.max = Math.max(pointStats.xRange.max, x);
//     pointStats.zRange.min = Math.min(pointStats.zRange.min, z);
//     pointStats.zRange.max = Math.max(pointStats.zRange.max, z);
//     if (point.Tag) pointStats.tags.add(point.Tag);

//     // Assign zone and profile
//     let zone, profile;
//     const tagMapping = tagToZoneProfile[point.Tag];
//     if (tagMapping) {
//       zone = tagMapping.zone;
//       profile = tagMapping.profile;
//     } else {
//       // Coordinate-based fallback (align with zoneMap in sceneUtils.js)
//       if (z < -90 / 1000) {
//         zone = 'SlagLine';
//       } else if (z < -30 / 1000) {
//         zone = 'Roof';
//       } else if (z < 30 / 1000) {
//         zone = 'Belly';
//       } else if (z < 90 / 1000) {
//         zone = 'InitialBricks';
//       } else {
//         zone = 'Bottom';
//       }

//       // Map x to profiles P1 to P20
//       const profileIndex = Math.min(
//         profileCount - 1,
//         Math.max(0, Math.floor((x - xMin) / profileSpacing))
//       );
//       profile = `P${profileIndex + 1}`;
//     }

//     // Calculate thickness (Z distance from reference plane in cm)
//     const referenceZ = 0; // Adjust based on furnace geometry
//     const thickness = Math.abs(z - referenceZ) * 100; // Convert meters to cm

//     if (!isFinite(thickness)) {
//       console.warn(`[CSVParser] Invalid thickness for row ${index}:`, point);
//       return;
//     }

//     const key = `${zone}|${profile}`;
//     if (!cellMap.has(key)) {
//       cellMap.set(key, { zone, profile, points: [], sumThickness: 0 });
//     }
//     const cell = cellMap.get(key);
//     cell.points.push(point);
//     cell.sumThickness += thickness;
//   });

//   cellMap.forEach((cell, key) => {
//     if (cell.points.length > 0) {
//       cells.push({
//         zone: cell.zone,
//         profile: cell.profile,
//         averageThickness: cell.sumThickness / cell.points.length
//       });
//     }
//   });

//   console.log(`[CSVParser] Generated ${cells.length} cells for ${fileName}:`, cells.slice(0, 5));
//   console.log(`[CSVParser] Point stats:`, {
//     xRange: pointStats.xRange,
//     zRange: pointStats.zRange,
//     tags: Array.from(pointStats.tags)
//   });
//   return { points: csvData, cells };
// };

// // Analyze data coverage across files
// export const analyzeFurnaceDataCoverage = (files, fileDataCache) => {
//   console.log('\n=== FURNACE DATA COVERAGE ANALYSIS ===');

//   const coverage = {
//     totalFiles: files.length,
//     zones: new Set(),
//     profiles: new Set(),
//     zoneCoverage: {},
//     profileCoverage: {},
//     cellCombinations: new Set(),
//     missingData: []
//   };

//   files.forEach((file, fileIndex) => {
//     console.log(`\nAnalyzing file ${fileIndex + 1}/${files.length}: ${file.name}`);
//     const fileData = fileDataCache.get(file.name);
//     if (!fileData || !fileData.cells) {
//       console.log(`❌ No cell data in ${file.name}`);
//       coverage.missingData.push({
//         file: file.name,
//         issue: 'No cell data'
//       });
//       return;
//     }

//     console.log(`📊 Found ${fileData.cells.length} cells, ${fileData.points?.length || 0} points in ${file.name}`);

//     const fileZones = new Set();
//     const fileProfiles = new Set();
//     const fileCells = new Set();

//     fileData.cells.forEach(cell => {
//       if (cell.zone) {
//         coverage.zones.add(cell.zone);
//         fileZones.add(cell.zone);
//         if (!coverage.zoneCoverage[cell.zone]) {
//           coverage.zoneCoverage[cell.zone] = new Set();
//         }
//         coverage.zoneCoverage[cell.zone].add(file.name);
//       }

//       if (cell.profile) {
//         coverage.profiles.add(cell.profile);
//         fileProfiles.add(cell.profile);
//         if (!coverage.profileCoverage[cell.profile]) {
//           coverage.profileCoverage[cell.profile] = new Set();
//         }
//         coverage.profileCoverage[cell.profile].add(file.name);
//       }

//       if (cell.zone && cell.profile) {
//         const combo = `${cell.zone}|${cell.profile}`;
//         coverage.cellCombinations.add(combo);
//         fileCells.add(combo);
//       }
//     });

//     console.log(`📍 File zones: [${Array.from(fileZones).join(', ')}]`);
//     console.log(`📏 File profiles: [${Array.from(fileProfiles).join(', ')}]`);
//     console.log(`🔗 File combinations: ${fileCells.size}`);
//   });

//   const allZones = Array.from(coverage.zones).sort();
//   const allProfiles = Array.from(coverage.profiles).sort();
//   const allCombinations = Array.from(coverage.cellCombinations).sort();

//   console.log('\n=== COVERAGE SUMMARY ===');
//   console.log(`🏭 Total unique zones: ${allZones.length}`);
//   console.log(`📏 Total unique profiles: ${allProfiles.length}`);
//   console.log(`🔗 Total unique combinations: ${allCombinations.length}`);

//   console.log('\n=== ZONE COVERAGE ===');
//   allZones.forEach(zone => {
//     const fileCount = coverage.zoneCoverage[zone]?.size || 0;
//     const percentage = ((fileCount / files.length) * 100).toFixed(1);
//     console.log(`${zone}: ${fileCount}/${files.length} files (${percentage}%)`);
//   });

//   console.log('\n=== PROFILE COVERAGE ===');
//   allProfiles.forEach(profile => {
//     const fileCount = coverage.profileCoverage[profile]?.size || 0;
//     const percentage = ((fileCount / files.length) * 100).toFixed(1);
//     console.log(`${profile}: ${fileCount}/${files.length} files (${percentage}%)`);
//     if (fileCount < files.length) {
//       const missingFiles = files.filter(f => !coverage.profileCoverage[profile]?.has(f.name));
//       console.log(`  ❌ Missing in: ${missingFiles.map(f => f.name).join(', ')}`);
//     }
//   });

//   console.log('\n=== LOW COVERAGE COMBINATIONS ===');
//   const lowCoverageCombos = allCombinations.filter(combo => {
//     const [zone, profile] = combo.split('|');
//     const zoneFiles = coverage.zoneCoverage[zone] || new Set();
//     const profileFiles = coverage.profileCoverage[profile] || new Set();
//     const intersection = new Set([...zoneFiles].filter(x => profileFiles.has(x)));
//     return intersection.size < files.length * 0.5;
//   });

//   lowCoverageCombos.forEach(combo => {
//     const [zone, profile] = combo.split('|');
//     const zoneFiles = coverage.zoneCoverage[zone] || new Set();
//     const profileFiles = coverage.profileCoverage[profile] || new Set();
//     const intersection = new Set([...zoneFiles].filter(x => profileFiles.has(x)));
//     const percentage = ((intersection.size / files.length) * 100).toFixed(1);
//     console.log(`⚠️  ${zone} + ${profile}: ${intersection.size}/${files.length} files (${percentage}%)`);
//   });

//   return {
//     zones: allZones,
//     profiles: allProfiles,
//     combinations: allCombinations,
//     zoneCoverage: coverage.zoneCoverage,
//     profileCoverage: coverage.profileCoverage,
//     lowCoverageCombos
//   };
// };

// // Run data coverage analysis
// export const runDataCoverageAnalysis = (files, fileDataCache) => {
//   console.log('\n🔍 RUNNING COMPLETE DATA COVERAGE ANALYSIS...');
//   return analyzeFurnaceDataCoverage(files, fileDataCache);
// };


// import {
//   Chart as ChartJS,
//   LineElement,
//   PointElement,
//   LinearScale,
//   TimeScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   Filler,
// } from 'chart.js';
// import 'chartjs-adapter-date-fns';

// // Register all necessary Chart.js components
// ChartJS.register(
//   LineElement,
//   PointElement,
//   LinearScale,
//   TimeScale,
//   CategoryScale,
//   Title,
//   Tooltip,
//   Legend,
//   Filler
// );

// // Chart options for the ThicknessDialog chart
// export const chartOptionsForDialog = {
//   responsive: true,
//   maintainAspectRatio: false,
//   animation: false,
//   plugins: {
//     legend: {
//       labels: { color: 'black' },
//     },
//     tooltip: {
//       callbacks: {
//         label: function (context) {
//           return `Thickness: ${context.parsed.y.toFixed(2)} cm`;
//         },
//       },
//     },
//   },
//   scales: {
//     x: {
//       type: 'category',
//       ticks: {
//         color: 'black',
//         maxRotation: 45,
//         minRotation: 45,
//       },
//       grid: { color: 'rgba(0,0,0,0.1)' },
//       title: {
//         display: true,
//         text: 'Files',
//         color: 'black',
//       },
//     },
//     y: {
//       ticks: { color: 'black' },
//       grid: { color: 'rgba(0,0,0,0.1)' },
//       title: {
//         display: true,
//         text: 'Thickness (cm)',
//         color: 'black',
//       },
//     },
//   },
// };

// // Helper function for floating point comparison
// const isPositionMatch = (pos1, pos2, tolerance = 0.01) => {
//   if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2) || pos1.length !== pos2.length) {
//     return false;
//   }

//   const tolerances = [tolerance, 0.001, 0.0001, 1e-6];
//   for (const tol of tolerances) {
//     const matches = pos1.every((val, index) => Math.abs(val - pos2[index]) < tol);
//     if (matches) {
//       console.log(`[isPositionMatch] Match found with tolerance: ${tol}`);
//       return true;
//     }
//   }
//   return false;
// };

// // Enhanced thickness extraction function
// const extractThickness = (data, type) => {
//   if (!data) return null;

//   let thickness = null;
//   if (type === 'point') {
//     thickness = data.thickness || data.thick || data.t || data.value;
//   } else if (type === 'cell') {
//     thickness = data.averageThickness || data.avgThickness || data.thickness || 
//                 data.thick || data.meanThickness || data.value;
//   }

//   if (typeof thickness === 'string') {
//     thickness = parseFloat(thickness);
//   }

//   if (thickness === null || thickness === undefined || isNaN(thickness) || !isFinite(thickness)) {
//     return null;
//   }

//   if (thickness > 100) {
//     thickness = thickness / 10; // Convert mm to cm
//   }

//   return thickness;
// };

// // Normalize strings for matching
// const normalizeString = (str) =>
//   String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

// // Detect CSV format and determine column mapping
// const detectCSVFormat = (csvData) => {
//   if (!csvData || csvData.length === 0) {
//     throw new Error("Empty CSV data");
//   }

//   // Check if first row has recognizable header properties
//   const firstRow = csvData[0];
//   const hasHeaders = firstRow && (
//     firstRow.hasOwnProperty('X') || firstRow.hasOwnProperty('x') ||
//     firstRow.hasOwnProperty('Y') || firstRow.hasOwnProperty('y') ||
//     firstRow.hasOwnProperty('Z') || firstRow.hasOwnProperty('z') ||
//     firstRow.hasOwnProperty('Timestamp') || firstRow.hasOwnProperty('timestamp') ||
//     firstRow.hasOwnProperty('Reflectivity') || firstRow.hasOwnProperty('reflectivity') ||
//     firstRow.hasOwnProperty('Tag') || firstRow.hasOwnProperty('tag')
//   );

//   if (hasHeaders) {
//     console.log('[detectCSVFormat] Header format detected');
//     return {
//       hasHeader: true,
//       columnMapping: getHeaderColumnMapping(firstRow)
//     };
//   } else {
//     console.log('[detectCSVFormat] Headerless format detected, analyzing structure...');
//     return {
//       hasHeader: false,
//       columnMapping: getHeaderlessColumnMapping(csvData)
//     };
//   }
// };

// // Get column mapping for header format
// const getHeaderColumnMapping = (firstRow) => {
//   const keys = Object.keys(firstRow);
//   return {
//     x: keys.find(key => key.toLowerCase() === 'x') || 'X',
//     y: keys.find(key => key.toLowerCase() === 'y') || 'Y',
//     z: keys.find(key => key.toLowerCase() === 'z') || 'Z',
//     timestamp: keys.find(key => key.toLowerCase() === 'timestamp') || 'Timestamp',
//     reflectivity: keys.find(key => key.toLowerCase() === 'reflectivity') || 'Reflectivity',
//     tag: keys.find(key => key.toLowerCase() === 'tag') || 'Tag'
//   };
// };

// // Get column mapping for headerless format
// const getHeaderlessColumnMapping = (csvData) => {
//   // Find the first row with meaningful data
//   const dataStartIndex = findDataStartIndex(csvData);
  
//   if (dataStartIndex >= csvData.length) {
//     throw new Error("No valid data found in CSV");
//   }

//   const sampleRow = csvData[dataStartIndex];
//   const keys = Object.keys(sampleRow);
  
//   // Analyze data patterns to identify coordinate columns
//   const coordinateColumns = analyzeDataColumns(csvData, dataStartIndex);
  
//   if (coordinateColumns) {
//     return coordinateColumns;
//   }

//   // Fallback mapping based on common patterns
//   console.log('[getHeaderlessColumnMapping] Using fallback column mapping');
//   return {
//     x: keys[0] || '0',  // First column as X
//     y: keys[1] || '1',  // Second column as Y  
//     z: keys[2] || '2',  // Third column as Z
//     reflectivity: keys[3] || '3', // Fourth column as reflectivity
//     timestamp: keys.length > 4 ? keys[4] : null,
//     tag: keys.length > 5 ? keys[5] : null
//   };
// };

// // Find where actual LiDAR data starts (skip zero/empty rows)
// const findDataStartIndex = (csvData) => {
//   for (let i = 0; i < Math.min(csvData.length, 100); i++) {
//     const row = csvData[i];
//     const values = Object.values(row);
    
//     // Check if row has meaningful coordinate data
//     if (hasSignificantCoordinates(values)) {
//       console.log(`[findDataStartIndex] Data starts at index: ${i}`);
//       return i;
//     }
//   }
  
//   return 0; // Fallback to start
// };

// // Check if row has significant coordinate values
// const hasSignificantCoordinates = (values) => {
//   const numericValues = values
//     .map(val => parseFloat(val))
//     .filter(val => !isNaN(val) && Math.abs(val) > 0.001);
  
//   return numericValues.length >= 3; // At least 3 significant values
// };

// // Analyze data columns to identify coordinate positions
// const analyzeDataColumns = (csvData, startIndex) => {
//   const sampleSize = Math.min(50, csvData.length - startIndex);
//   const firstRow = csvData[startIndex];
//   const keys = Object.keys(firstRow);
//   const columnStats = {};
  
//   // Initialize stats for each column
//   keys.forEach(key => {
//     columnStats[key] = {
//       values: [],
//       hasNegative: false,
//       hasPositive: false,
//       range: 0,
//       nonZeroCount: 0,
//       avgAbs: 0
//     };
//   });
  
//   // Collect statistics from sample data
//   for (let i = startIndex; i < Math.min(startIndex + sampleSize, csvData.length); i++) {
//     const row = csvData[i];
    
//     keys.forEach(key => {
//       const val = parseFloat(row[key]);
//       if (!isNaN(val) && val !== 0) {
//         columnStats[key].values.push(val);
//         columnStats[key].nonZeroCount++;
//         if (val > 0) columnStats[key].hasPositive = true;
//         if (val < 0) columnStats[key].hasNegative = true;
//       }
//     });
//   }
  
//   // Calculate ranges and averages
//   keys.forEach(key => {
//     const stat = columnStats[key];
//     if (stat.values.length > 0) {
//       stat.range = Math.max(...stat.values) - Math.min(...stat.values);
//       stat.avgAbs = stat.values.reduce((sum, val) => sum + Math.abs(val), 0) / stat.values.length;
//     }
//   });
  
//   // Find columns most likely to be coordinates
//   const coordinateCandidates = keys
//     .filter(key => {
//       const stat = columnStats[key];
//       return stat.nonZeroCount > sampleSize * 0.1 && stat.range > 10;
//     })
//     .sort((a, b) => columnStats[b].range - columnStats[a].range);
  
//   if (coordinateCandidates.length >= 3) {
//     console.log('[analyzeDataColumns] Identified coordinate columns:', coordinateCandidates.slice(0, 3));
    
//     return {
//       x: coordinateCandidates[0],
//       y: coordinateCandidates[1], 
//       z: coordinateCandidates[2],
//       reflectivity: coordinateCandidates[3] || null,
//       timestamp: null,
//       tag: null
//     };
//   }
  
//   return null;
// };

// // Enhanced CSV parser with format detection
// export const parseCSV = (csvData, fileName) => {
//   console.log(`[CSVParser] Parsing ${fileName}, rows: ${csvData.length}`);
//   console.log(`[CSVParser] Sample data:`, csvData.slice(0, 3));

//   if (!csvData || csvData.length === 0) {
//     throw new Error("Empty CSV data");
//   }

//   // Detect CSV format and get column mapping
//   const { hasHeader, columnMapping } = detectCSVFormat(csvData);
//   console.log(`[CSVParser] Format: ${hasHeader ? 'Header' : 'Headerless'}`);
//   console.log(`[CSVParser] Column mapping:`, columnMapping);

//   const cells = [];
//   const cellMap = new Map();
//   const pointStats = { 
//     xRange: { min: Infinity, max: -Infinity }, 
//     zRange: { min: Infinity, max: -Infinity }, 
//     tags: new Set(),
//     processedPoints: 0,
//     skippedPoints: 0
//   };

//   // Enhanced tag to zone/profile mapping
//   const tagToZoneProfile = {
//     16: { zone: 'SlagLine', profile: 'P15' },
//     32: { zone: 'SlagLine', profile: 'P15' },
//     33: { zone: 'Belly', profile: 'P14' },
//     34: { zone: 'Roof', profile: 'P13' },
//     35: { zone: 'InitialBricks', profile: 'P12' },
//     36: { zone: 'Bottom', profile: 'P11' },
//     // Add more mappings based on actual data patterns
//   };

//   // Grid configuration matching createGridOverlay
//   const profileCount = 20;
//   const xMin = -150 / 1000; // Convert to meters
//   const xMax = 150 / 1000;
//   const profileSpacing = (xMax - xMin) / profileCount;

//   // Find data start index for headerless format
//   const dataStartIndex = hasHeader ? 0 : findDataStartIndex(csvData);
  
//   // Process data points
//   csvData.slice(dataStartIndex).forEach((point, index) => {
//     // Extract coordinates using column mapping
//     let x, y, z, reflectivity, timestamp, tag;
    
//     try {
//       x = parseFloat(point[columnMapping.x]);
//       y = parseFloat(point[columnMapping.y]);  
//       z = parseFloat(point[columnMapping.z]);
      
//       if (columnMapping.reflectivity) {
//         reflectivity = parseFloat(point[columnMapping.reflectivity]);
//       }
      
//       if (columnMapping.timestamp) {
//         timestamp = point[columnMapping.timestamp];
//       }
      
//       if (columnMapping.tag) {
//         tag = point[columnMapping.tag];
//       }
//     } catch (error) {
//       console.warn(`[CSVParser] Error parsing row ${index}:`, error);
//       pointStats.skippedPoints++;
//       return;
//     }

//     // Validate coordinates
//     if (isNaN(x) || isNaN(y) || isNaN(z)) {
//       console.warn(`[CSVParser] Invalid coordinates at row ${index}:`, { x, y, z });
//       pointStats.skippedPoints++;
//       return;
//     }

//     // Skip zero coordinates (likely invalid data)
//     if (x === 0 && y === 0 && z === 0) {
//       pointStats.skippedPoints++;
//       return;
//     }

//     // Convert coordinates to meters with smart scaling
//     const scale = determineScale(x, y, z);
//     x = x * scale;
//     y = y * scale;
//     z = z * scale;

//     // Update point statistics
//     pointStats.xRange.min = Math.min(pointStats.xRange.min, x);
//     pointStats.xRange.max = Math.max(pointStats.xRange.max, x);
//     pointStats.zRange.min = Math.min(pointStats.zRange.min, z);
//     pointStats.zRange.max = Math.max(pointStats.zRange.max, z);
//     if (tag) pointStats.tags.add(tag);

//     // Assign zone and profile
//     let zone, profile;
//     const tagMapping = tagToZoneProfile[tag];
    
//     if (tagMapping) {
//       zone = tagMapping.zone;
//       profile = tagMapping.profile;
//     } else {
//       // Coordinate-based zone assignment
//       if (z < -90 / 1000) {
//         zone = 'SlagLine';
//       } else if (z < -30 / 1000) {
//         zone = 'Roof';
//       } else if (z < 30 / 1000) {
//         zone = 'Belly';
//       } else if (z < 90 / 1000) {
//         zone = 'InitialBricks';
//       } else {
//         zone = 'Bottom';
//       }

//       // Map x to profiles P1 to P20
//       const profileIndex = Math.min(
//         profileCount - 1,
//         Math.max(0, Math.floor((x - xMin) / profileSpacing))
//       );
//       profile = `P${profileIndex + 1}`;
//     }

//     // Calculate thickness (Z distance from reference plane in cm)
//     const referenceZ = 0; // Adjust based on furnace geometry
//     const thickness = Math.abs(z - referenceZ) * 100; // Convert meters to cm

//     if (!isFinite(thickness)) {
//       console.warn(`[CSVParser] Invalid thickness for row ${index}:`, thickness);
//       pointStats.skippedPoints++;
//       return;
//     }

//     // Add to cell map
//     const key = `${zone}|${profile}`;
//     if (!cellMap.has(key)) {
//       cellMap.set(key, { zone, profile, points: [], sumThickness: 0 });
//     }
    
//     const cell = cellMap.get(key);
//     const pointData = {
//       position: [x, y, z],
//       thickness,
//       reflectivity,
//       timestamp,
//       tag,
//       ...point // Include original point data
//     };
    
//     cell.points.push(pointData);
//     cell.sumThickness += thickness;
//     pointStats.processedPoints++;

//     // Progress logging for large datasets
//     if (pointStats.processedPoints % 50000 === 0) {
//       console.log(`[CSVParser] Processed ${pointStats.processedPoints} points, skipped ${pointStats.skippedPoints}...`);
//     }
//   });

//   // Generate cells from cell map
//   cellMap.forEach((cell, key) => {
//     if (cell.points.length > 0) {
//       cells.push({
//         zone: cell.zone,
//         profile: cell.profile,
//         averageThickness: cell.sumThickness / cell.points.length,
//         pointCount: cell.points.length,
//         minThickness: Math.min(...cell.points.map(p => p.thickness)),
//         maxThickness: Math.max(...cell.points.map(p => p.thickness))
//       });
//     }
//   });

//   console.log(`[CSVParser] Completed parsing for ${fileName}:`);
//   console.log(`  - Generated ${cells.length} cells`);
//   console.log(`  - Processed ${pointStats.processedPoints} valid points`);
//   console.log(`  - Skipped ${pointStats.skippedPoints} invalid points`);
//   console.log(`  - Point stats:`, {
//     xRange: pointStats.xRange,
//     zRange: pointStats.zRange,
//     tags: Array.from(pointStats.tags)
//   });

//   return { 
//     points: csvData.slice(dataStartIndex).map((point, index) => ({
//       ...point,
//       index: index + dataStartIndex
//     })), 
//     cells 
//   };
// };

// // Determine appropriate scaling based on coordinate values
// const determineScale = (x, y, z) => {
//   const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
  
//   if (maxCoord > 100000) {
//     return 0.0001; // Very large values, likely in micrometers
//   } else if (maxCoord > 10000) {
//     return 0.001; // Large values, likely in millimeters
//   } else if (maxCoord > 1000) {
//     return 0.01; // Medium values, likely in centimeters
//   } else if (maxCoord > 100) {
//     return 0.1; // Smaller values
//   }
  
//   return 1; // Values already in appropriate range
// };

// // Enhanced data coverage analysis with format detection
// export const analyzeFurnaceDataCoverage = (files, fileDataCache) => {
//   console.log('\n=== ENHANCED FURNACE DATA COVERAGE ANALYSIS ===');

//   const coverage = {
//     totalFiles: files.length,
//     zones: new Set(),
//     profiles: new Set(),
//     zoneCoverage: {},
//     profileCoverage: {},
//     cellCombinations: new Set(),
//     missingData: [],
//     formatInfo: {}
//   };

//   files.forEach((file, fileIndex) => {
//     console.log(`\nAnalyzing file ${fileIndex + 1}/${files.length}: ${file.name}`);
//     const fileData = fileDataCache.get(file.name);
    
//     if (!fileData || !fileData.cells) {
//       console.log(`❌ No cell data in ${file.name}`);
//       coverage.missingData.push({
//         file: file.name,
//         issue: 'No cell data'
//       });
//       return;
//     }

//     // Detect format info
//     const hasHeaders = fileData.points && fileData.points.length > 0 && 
//                       fileData.points[0].hasOwnProperty('X');
//     coverage.formatInfo[file.name] = {
//       hasHeaders,
//       cellCount: fileData.cells.length,
//       pointCount: fileData.points?.length || 0
//     };

//     console.log(`📊 Found ${fileData.cells.length} cells, ${fileData.points?.length || 0} points in ${file.name}`);
//     console.log(`📋 Format: ${hasHeaders ? 'Header' : 'Headerless'}`);

//     const fileZones = new Set();
//     const fileProfiles = new Set();
//     const fileCells = new Set();

//     fileData.cells.forEach(cell => {
//       if (cell.zone) {
//         coverage.zones.add(cell.zone);
//         fileZones.add(cell.zone);
//         if (!coverage.zoneCoverage[cell.zone]) {
//           coverage.zoneCoverage[cell.zone] = new Set();
//         }
//         coverage.zoneCoverage[cell.zone].add(file.name);
//       }

//       if (cell.profile) {
//         coverage.profiles.add(cell.profile);
//         fileProfiles.add(cell.profile);
//         if (!coverage.profileCoverage[cell.profile]) {
//           coverage.profileCoverage[cell.profile] = new Set();
//         }
//         coverage.profileCoverage[cell.profile].add(file.name);
//       }

//       if (cell.zone && cell.profile) {
//         const combo = `${cell.zone}|${cell.profile}`;
//         coverage.cellCombinations.add(combo);
//         fileCells.add(combo);
//       }
//     });

//     console.log(`📍 File zones: [${Array.from(fileZones).join(', ')}]`);
//     console.log(`📏 File profiles: [${Array.from(fileProfiles).join(', ')}]`);
//     console.log(`🔗 File combinations: ${fileCells.size}`);
//   });

//   const allZones = Array.from(coverage.zones).sort();
//   const allProfiles = Array.from(coverage.profiles).sort();
//   const allCombinations = Array.from(coverage.cellCombinations).sort();

//   console.log('\n=== ENHANCED COVERAGE SUMMARY ===');
//   console.log(`🏭 Total unique zones: ${allZones.length}`);
//   console.log(`📏 Total unique profiles: ${allProfiles.length}`);
//   console.log(`🔗 Total unique combinations: ${allCombinations.length}`);

//   // Format distribution
//   const headerFiles = Object.values(coverage.formatInfo).filter(info => info.hasHeaders).length;
//   const headerlessFiles = coverage.totalFiles - headerFiles;
//   console.log(`📋 Format distribution: ${headerFiles} header files, ${headerlessFiles} headerless files`);

//   console.log('\n=== ZONE COVERAGE ===');
//   allZones.forEach(zone => {
//     const fileCount = coverage.zoneCoverage[zone]?.size || 0;
//     const percentage = ((fileCount / files.length) * 100).toFixed(1);
//     console.log(`${zone}: ${fileCount}/${files.length} files (${percentage}%)`);
//   });

//   console.log('\n=== PROFILE COVERAGE ===');
//   allProfiles.forEach(profile => {
//     const fileCount = coverage.profileCoverage[profile]?.size || 0;
//     const percentage = ((fileCount / files.length) * 100).toFixed(1);
//     console.log(`${profile}: ${fileCount}/${files.length} files (${percentage}%)`);
//     if (fileCount < files.length) {
//       const missingFiles = files.filter(f => !coverage.profileCoverage[profile]?.has(f.name));
//       console.log(`  ❌ Missing in: ${missingFiles.map(f => f.name).join(', ')}`);
//     }
//   });

//   return {
//     zones: allZones,
//     profiles: allProfiles,
//     combinations: allCombinations,
//     zoneCoverage: coverage.zoneCoverage,
//     profileCoverage: coverage.profileCoverage,
//     formatInfo: coverage.formatInfo,
//     lowCoverageCombos: allCombinations.filter(combo => {
//       const [zone, profile] = combo.split('|');
//       const zoneFiles = coverage.zoneCoverage[zone] || new Set();
//       const profileFiles = coverage.profileCoverage[profile] || new Set();
//       const intersection = new Set([...zoneFiles].filter(x => profileFiles.has(x)));
//       return intersection.size < files.length * 0.5;
//     })
//   };
// };

// // Run enhanced data coverage analysis
export const runDataCoverageAnalysis = (files, fileDataCache) => {
  console.log('\n🔍 RUNNING ENHANCED DATA COVERAGE ANALYSIS...');
  return analyzeFurnaceDataCoverage(files, fileDataCache);
};

// Enhanced LiDAR CSV Parser with optimized dual format support
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

// Register Chart.js components
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

// Chart options for thickness visualization
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

// Enhanced format detection with better pattern recognition
export const detectCSVFormat = (csvData) => {
  if (!csvData || csvData.length === 0) {
    throw new Error("Empty CSV data");
  }

  console.log('[detectCSVFormat] Analyzing CSV format...');
  
  // Sample first few rows to determine format
  const sampleSize = Math.min(10, csvData.length);
  const sampleRows = csvData.slice(0, sampleSize);
  
  // Check for header format indicators
  const firstRow = csvData[0];
  const hasKnownHeaders = firstRow && (
    firstRow.hasOwnProperty('X') || firstRow.hasOwnProperty('x') ||
    firstRow.hasOwnProperty('Y') || firstRow.hasOwnProperty('y') ||
    firstRow.hasOwnProperty('Z') || firstRow.hasOwnProperty('z') ||
    firstRow.hasOwnProperty('Timestamp') || firstRow.hasOwnProperty('timestamp') ||
    firstRow.hasOwnProperty('Reflectivity') || firstRow.hasOwnProperty('reflectivity') ||
    firstRow.hasOwnProperty('Tag') || firstRow.hasOwnProperty('tag') ||
    firstRow.hasOwnProperty('Version') || firstRow.hasOwnProperty('version')
  );

  if (hasKnownHeaders) {
    console.log('[detectCSVFormat] Header format detected');
    return {
      format: 'header',
      columnMapping: getHeaderColumnMapping(firstRow),
      dataStartIndex: 0
    };
  }

  // For headerless format, analyze data patterns
  console.log('[detectCSVFormat] Analyzing headerless format...');
  const analysisResult = analyzeHeaderlessFormat(csvData);
  
  return {
    format: 'headerless',
    columnMapping: analysisResult.columnMapping,
    dataStartIndex: analysisResult.dataStartIndex
  };
};

// Get column mapping for header format
export const getHeaderColumnMapping = (firstRow) => {
  const keys = Object.keys(firstRow);
  
  // Find columns by name (case-insensitive)
  const findColumn = (patterns) => {
    for (const pattern of patterns) {
      const key = keys.find(k => k.toLowerCase() === pattern.toLowerCase());
      if (key) return key;
    }
    return null;
  };

  return {
    version: findColumn(['Version', 'version']),
    slot: findColumn(['Slot', 'slot']),
    id: findColumn(['ID', 'id']),
    lidarIndex: findColumn(['LiDAR Index', 'lidar_index', 'lidarindex']),
    rsvd: findColumn(['Rsvd', 'rsvd', 'reserved']),
    errorCode: findColumn(['Error Code', 'error_code', 'errorcode']),
    timestamp: findColumn(['Timestamp', 'timestamp', 'time']),
    type: findColumn(['Type', 'type']),
    dataType: findColumn(['Data Type', 'data_type', 'datatype']),
    x: findColumn(['X', 'x']),
    y: findColumn(['Y', 'y']),
    z: findColumn(['Z', 'z']),
    reflectivity: findColumn(['Reflectivity', 'reflectivity', 'intensity']),
    tag: findColumn(['Tag', 'tag']),
    oriX: findColumn(['Ori_x', 'ori_x', 'origin_x']),
    oriY: findColumn(['Ori_y', 'ori_y', 'origin_y']),
    oriZ: findColumn(['Ori_z', 'ori_z', 'origin_z']),
    oriRadius: findColumn(['Ori_radius', 'ori_radius', 'origin_radius']),
    oriTheta: findColumn(['Ori_theta', 'ori_theta', 'origin_theta']),
    oriPhi: findColumn(['Ori_phi', 'ori_phi', 'origin_phi'])
  };
};

// Enhanced analysis for headerless format
export const analyzeHeaderlessFormat = (csvData) => {
  console.log('[analyzeHeaderlessFormat] Analyzing headerless data structure...');
  
  // Find where actual data starts (skip rows with all zeros)
  const dataStartIndex = findDataStartIndex(csvData);
  console.log(`[analyzeHeaderlessFormat] Data starts at index: ${dataStartIndex}`);
  
  if (dataStartIndex >= csvData.length) {
    throw new Error("No valid LiDAR data found in CSV");
  }

  // Analyze column patterns from valid data
  const columnMapping = analyzeColumnPatterns(csvData, dataStartIndex);
  
  return {
    columnMapping,
    dataStartIndex
  };
};

// Find where actual LiDAR data begins
export const findDataStartIndex = (csvData) => {
  for (let i = 0; i < Math.min(csvData.length, 100); i++) {
    const row = csvData[i];
    const values = Object.values(row);
    
    // Check if this row contains meaningful LiDAR coordinates
    if (hasValidLiDARData(values)) {
      return i;
    }
  }
  
  return 0; // Fallback to start
};

// Check if a row contains valid LiDAR coordinate data
export const hasValidLiDARData = (values) => {
  const numericValues = values
    .map(val => parseFloat(val))
    .filter(val => !isNaN(val));
  
  // Look for patterns typical of LiDAR data:
  // - At least 3 significant coordinate values
  // - Values in reasonable ranges for coordinates
  const significantValues = numericValues.filter(val => Math.abs(val) > 0.001);
  
  if (significantValues.length < 3) return false;
  
  // Check for coordinate-like patterns
  const hasLargeCoordinates = significantValues.some(val => 
    Math.abs(val) > 100 && Math.abs(val) < 1000000
  );
  
  const hasSmallCoordinates = significantValues.some(val => 
    Math.abs(val) > 0.1 && Math.abs(val) < 100
  );
  
  return hasLargeCoordinates || hasSmallCoordinates;
};

// Analyze column patterns for headerless format
export const analyzeColumnPatterns = (csvData, startIndex) => {
  console.log('[analyzeColumnPatterns] Analyzing column patterns...');
  
  const sampleSize = Math.min(100, csvData.length - startIndex);
  const firstRow = csvData[startIndex];
  const keys = Object.keys(firstRow);
  
  const columnStats = {};
  keys.forEach((key, index) => {
    columnStats[index] = {
      key,
      values: [],
      nonZeroCount: 0,
      range: 0,
      avgAbs: 0,
      isCoordinate: false,
      isMetadata: false
    };
  });

  // Collect statistics
  for (let i = startIndex; i < Math.min(startIndex + sampleSize, csvData.length); i++) {
    const row = csvData[i];
    keys.forEach((key, index) => {
      const val = parseFloat(row[key]);
      if (!isNaN(val)) { // Consider all non-NaN values
        columnStats[index].values.push(val);
        if (val !== 0) columnStats[index].nonZeroCount++;
      }
    });
  }

  // Calculate ranges and identify column types
  keys.forEach((key, index) => {
    const stat = columnStats[index];
    if (stat.values.length > 0) {
      stat.range = Math.max(...stat.values) - Math.min(...stat.values);
      stat.avgAbs = stat.values.reduce((sum, val) => sum + Math.abs(val), 0) / stat.values.length;
      
      // Enhanced coordinate detection: large values typical of LiDAR data
      stat.isCoordinate = stat.avgAbs > 1000 && stat.range > 1000; // Adjusted threshold for LiDAR data
      stat.isMetadata = stat.avgAbs < 100 && stat.range < 100;
    }
  });

  // Sort columns by average absolute value to prioritize coordinates
  const coordinateColumns = keys
    .map((key, index) => ({ key, index, ...columnStats[index] }))
    .filter(col => col.isCoordinate)
    .sort((a, b) => b.avgAbs - a.avgAbs); // Sort by magnitude to get X, Y, Z

  console.log(`[analyzeColumnPatterns] Found ${coordinateColumns.length} coordinate columns:`, 
    coordinateColumns.map(col => ({ key: col.key, avgAbs: col.avgAbs.toFixed(2) })));

  // Ensure we have at least 3 coordinate columns
  if (coordinateColumns.length < 3) {
    console.warn('[analyzeColumnPatterns] Insufficient coordinate columns detected:', coordinateColumns.length);
  }

  // Default mapping with fallback to positional indices
  const mapping = {
    version: keys[0] || '0',
    slot: keys[1] || '1',
    id: keys[2] || '2',
    lidarIndex: keys[3] || '3',
    rsvd: keys[4] || '4',
    errorCode: keys[5] || '5',
    timestamp: keys[6] || '6',
    type: keys[7] || '7',
    dataType: keys[8] || '8',
    x: coordinateColumns[0]?.key || keys[9] || '9',  // Adjusted default indices
    y: coordinateColumns[1]?.key || keys[10] || '10',
    z: coordinateColumns[2]?.key || keys[11] || '11',
    reflectivity: coordinateColumns[3]?.key || keys[12] || '12',
    tag: coordinateColumns[4]?.key || keys[13] || '13',
    oriX: keys[14] || '14',
    oriY: keys[15] || '15',
    oriZ: keys[16] || '16',
    oriRadius: keys[17] || '17',
    oriTheta: keys[18] || '18',
    oriPhi: keys[19] || '19'
  };

  console.log('[analyzeColumnPatterns] Column mapping created:', {
    coordinates: { x: mapping.x, y: mapping.y, z: mapping.z },
    reflectivity: mapping.reflectivity,
    tag: mapping.tag
  });

  return mapping;
};

// Determine appropriate scaling for coordinates
export const determineScale = (x, y, z) => {
  const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
  
  if (maxCoord > 100000) {
    return 0.001; // Large values, likely in millimeters
  } else if (maxCoord > 10000) {
    return 0.01; // Medium values, likely in centimeters  
  } else if (maxCoord > 1000) {
    return 0.1; // Smaller values
  }
  
  return 1; // Values already in appropriate range (meters)
};

// Enhanced CSV parser with optimized processing for large datasets
export const parseCSV = (csvData, fileName) => {
  console.log(`[parseCSV] Starting parse of ${fileName} with ${csvData.length} rows`);
  
  if (!csvData || csvData.length === 0) {
    throw new Error(`Empty CSV data for ${fileName}`);
  }

  const { format, columnMapping, dataStartIndex } = detectCSVFormat(csvData);
  console.log(`[parseCSV] Format: ${format}, Data starts at index: ${dataStartIndex}`);

  const cells = [];
  const cellMap = new Map();
  const points = [];
  const pointStats = { 
    xRange: { min: Infinity, max: -Infinity }, 
    yRange: { min: Infinity, max: -Infinity },
    zRange: { min: Infinity, max: -Infinity }, 
    tags: new Set(),
    reflectivityRange: { min: Infinity, max: -Infinity },
    processedPoints: 0,
    skippedPoints: 0,
    totalRows: csvData.length - dataStartIndex
  };

  const tagToZoneProfile = {
    16: { zone: 'SlagLine', profile: 'P15' },
    32: { zone: 'SlagLine', profile: 'P15' },
    33: { zone: 'Belly', profile: 'P14' },
    34: { zone: 'Roof', profile: 'P13' },
    35: { zone: 'InitialBricks', profile: 'P12' },
    36: { zone: 'Bottom', profile: 'P11' },
    37: { zone: 'Belly', profile: 'P13' },
    38: { zone: 'Roof', profile: 'P14' },
  };

  const profileCount = 20;
  const xMin = -150; // millimeters
  const xMax = 150;  // millimeters
  const profileSpacing = (xMax - xMin) / profileCount;

  const batchSize = 10000;
  const dataSlice = csvData.slice(dataStartIndex);
  
  // Determine scale to convert to millimeters
  const samplePoint = dataSlice.find(row => {
    const values = Object.values(row).map(val => parseFloat(val)).filter(val => !isNaN(val));
    return hasValidLiDARData(values);
  });

  let scale = 1; // Scale to millimeters
  if (samplePoint) {
    const rawX = parseFloat(samplePoint[columnMapping.x] || 0);
    const rawY = parseFloat(samplePoint[columnMapping.y] || 0);
    const rawZ = parseFloat(samplePoint[columnMapping.z] || 0);
    scale = determineScale(rawX, rawY, rawZ) * 1000; // Convert to millimeters
    console.log(`[parseCSV] Determined scale factor: ${scale} for sample coordinates: [${rawX}, ${rawY}, ${rawZ}]`);
  } else {
    console.warn('[parseCSV] Could not determine scale, defaulting to 1');
  }

  for (let batchStart = 0; batchStart < dataSlice.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, dataSlice

.length);
    const batch = dataSlice.slice(batchStart, batchEnd);
    
    console.log(`[parseCSV] Processing batch ${Math.floor(batchStart/batchSize) + 1}/${Math.ceil(dataSlice.length/batchSize)} (${batch.length} rows)`);
    
    batch.forEach((point, localIndex) => {
      const globalIndex = batchStart + localIndex;
      
      try {
        const rawX = parseFloat(point[columnMapping.x]);
        const rawY = parseFloat(point[columnMapping.y]);
        const rawZ = parseFloat(point[columnMapping.z]);
        
        if (isNaN(rawX) || isNaN(rawY) || isNaN(rawZ)) {
          pointStats.skippedPoints++;
          return;
        }

        if (rawX === 0 && rawY === 0 && rawZ === 0) {
          pointStats.skippedPoints++;
          return;
        }

        const x = rawX * scale; // Coordinates in millimeters
        const y = rawY * scale;
        const z = rawZ * scale;

        const reflectivity = columnMapping.reflectivity ? 
          parseFloat(point[columnMapping.reflectivity]) : 0;
        const tag = columnMapping.tag ? 
          parseInt(point[columnMapping.tag]) : null;
        const timestamp = columnMapping.timestamp ? 
          point[columnMapping.timestamp] : null;

        pointStats.xRange.min = Math.min(pointStats.xRange.min, x);
        pointStats.xRange.max = Math.max(pointStats.xRange.max, x);
        pointStats.yRange.min = Math.min(pointStats.yRange.min, y);
        pointStats.yRange.max = Math.max(pointStats.yRange.max, y);
        pointStats.zRange.min = Math.min(pointStats.zRange.min, z);
        pointStats.zRange.max = Math.max(pointStats.zRange.max, z);
        
        if (!isNaN(reflectivity)) {
          pointStats.reflectivityRange.min = Math.min(pointStats.reflectivityRange.min, reflectivity);
          pointStats.reflectivityRange.max = Math.max(pointStats.reflectivityRange.max, reflectivity);
        }
        
        if (tag !== null) pointStats.tags.add(tag);

        let zone, profile;
        const tagMapping = tagToZoneProfile[tag];
        
        if (tagMapping) {
          zone = tagMapping.zone;
          profile = tagMapping.profile;
        } else {
          if (z < -90) {
            zone = 'SlagLine';
          } else if (z < -30) {
            zone = 'Roof';
          } else if (z < 30) {
            zone = 'Belly';
          } else if (z < 90) {
            zone = 'InitialBricks';
          } else {
            zone = 'Bottom';
          }

          const profileIndex = Math.min(
            profileCount - 1,
            Math.max(0, Math.floor((x - xMin) / profileSpacing))
          );
          profile = `P${profileIndex + 1}`;
        }

        const referenceZ = 0;
        const thickness = Math.abs(z - referenceZ) / 10; // Convert mm to cm

        if (!isFinite(thickness)) {
          pointStats.skippedPoints++;
          return;
        }

        const pointData = {
          position: [x, y, z], // Store in millimeters
          thickness, // Store in centimeters
          reflectivity,
          timestamp,
          tag,
          globalIndex: dataStartIndex + globalIndex,
          scale // Store scale for debugging
        };

        points.push(pointData);

        const key = `${zone}|${profile}`;
        if (!cellMap.has(key)) {
          cellMap.set(key, { 
            zone, 
            profile, 
            points: [], 
            sumThickness: 0,
            sumReflectivity: 0,
            minThickness: Infinity,
            maxThickness: -Infinity
          });
        }
        
        const cell = cellMap.get(key);
        cell.points.push(pointData);
        cell.sumThickness += thickness;
        cell.sumReflectivity += reflectivity || 0;
        cell.minThickness = Math.min(cell.minThickness, thickness);
        cell.maxThickness = Math.max(cell.maxThickness, thickness);
        
        pointStats.processedPoints++;

      } catch (error) {
        console.warn(`[parseCSV] Error processing row ${globalIndex}:`, error);
        pointStats.skippedPoints++;
      }
    });
  }

  cellMap.forEach((cell, key) => {
    if (cell.points.length > 0) {
      cells.push({
        zone: cell.zone,
        profile: cell.profile,
        averageThickness: cell.sumThickness / cell.points.length,
        averageReflectivity: cell.sumReflectivity / cell.points.length,
        pointCount: cell.points.length,
        minThickness: cell.minThickness,
        maxThickness: cell.maxThickness,
        thicknessStdDev: calculateStdDev(cell.points.map(p => p.thickness))
      });
    }
  });

  cells.sort((a, b) => {
    if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
    return a.profile.localeCompare(b.profile);
  });

  console.log(`[parseCSV] Completed parsing ${fileName}:`);
  console.log(`  - Format: ${format}`);
  console.log(`  - Scale applied: ${scale} (to millimeters)`);
  console.log(`  - Generated ${cells.length} cells`);
  console.log(`  - Processed ${pointStats.processedPoints} valid points`);
  console.log(`  - Skipped ${pointStats.skippedPoints} invalid points`);
  console.log(`  - Success rate: ${((pointStats.processedPoints / pointStats.totalRows) * 100).toFixed(1)}%`);
  console.log(`  - Coordinate ranges (mm):`, {
    x: `${pointStats.xRange.min.toFixed(3)} to ${pointStats.xRange.max.toFixed(3)}`,
    y: `${pointStats.yRange.min.toFixed(3)} to ${pointStats.yRange.max.toFixed(3)}`,
    z: `${pointStats.zRange.min.toFixed(3)} to ${pointStats.zRange.max.toFixed(3)}`
  });
  console.log(`  - Tags found: [${Array.from(pointStats.tags).sort().join(', ')}]`);

  return { 
    points,
    cells,
    format,
    stats: pointStats
  };
};

// Helper function to calculate standard deviation
export const calculateStdDev = (values) => {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

// Helper functions for data analysis
export const normalizeString = (str) =>
  String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export const isPositionMatch = (pos1, pos2, tolerance = 0.01) => {
  if (!pos1 || !pos2 || !Array.isArray(pos1) || !Array.isArray(pos2) || pos1.length !== pos2.length) {
    return false;
  }

  const tolerances = [tolerance, 0.001, 0.0001, 1e-6];
  for (const tol of tolerances) {
    const matches = pos1.every((val, index) => Math.abs(val - pos2[index]) < tol);
    if (matches) return true;
  }
  return false;
};

export const extractThickness = (data, type) => {
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

  // Convert mm to cm if needed
  if (thickness > 100) {
    thickness = thickness / 10;
  }

  return thickness;
};

// Enhanced data coverage analysis
export const analyzeFurnaceDataCoverage = (files, fileDataCache) => {
  console.log('\n=== ENHANCED FURNACE DATA COVERAGE ANALYSIS ===');

  const coverage = {
    totalFiles: files.length,
    zones: new Set(),
    profiles: new Set(),
    zoneCoverage: {},
    profileCoverage: {},
    cellCombinations: new Set(),
    missingData: [],
    formatInfo: {},
    qualityMetrics: {}
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

    // Record format info
    coverage.formatInfo[file.name] = {
      format: fileData.format || 'unknown',
      cellCount: fileData.cells.length,
      pointCount: fileData.points?.length || 0,
      stats: fileData.stats || {}
    };

    // Quality metrics
    const successRate = fileData.stats ? 
      (fileData.stats.processedPoints / (fileData.stats.processedPoints + fileData.stats.skippedPoints)) * 100 : 0;
    
    coverage.qualityMetrics[file.name] = {
      successRate: successRate.toFixed(1),
      pointDensity: fileData.cells.length > 0 ? 
        (fileData.points?.length || 0) / fileData.cells.length : 0
    };

    console.log(`📊 Found ${fileData.cells.length} cells, ${fileData.points?.length || 0} points`);
    console.log(`📋 Format: ${fileData.format || 'unknown'}, Success rate: ${successRate.toFixed(1)}%`);

    // Analyze coverage
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

    console.log(`📍 Zones: [${Array.from(fileZones).join(', ')}]`);
    console.log(`📏 Profiles: [${Array.from(fileProfiles).join(', ')}]`);
  });

  const allZones = Array.from(coverage.zones).sort();
  const allProfiles = Array.from(coverage.profiles).sort();
  const allCombinations = Array.from(coverage.cellCombinations).sort();

  console.log('\n=== ENHANCED COVERAGE SUMMARY ===');
  console.log(`🏭 Total unique zones: ${allZones.length}`);
  console.log(`📏 Total unique profiles: ${allProfiles.length}`);
  console.log(`🔗 Total unique combinations: ${allCombinations.length}`);

  // Format distribution
  const formatCounts = {};
  Object.values(coverage.formatInfo).forEach(info => {
    formatCounts[info.format] = (formatCounts[info.format] || 0) + 1;
  });
  
  console.log('\n=== FORMAT DISTRIBUTION ===');
  Object.entries(formatCounts).forEach(([format, count]) => {
    console.log(`${format}: ${count} files (${((count / files.length) * 100).toFixed(1)}%)`);
  });

  // Quality summary
  const avgSuccessRate = Object.values(coverage.qualityMetrics)
    .reduce((sum, metrics) => sum + parseFloat(metrics.successRate), 0) / files.length;
  
  console.log(`\n=== QUALITY METRICS ===`);
  console.log(`Average success rate: ${avgSuccessRate.toFixed(1)}%`);

  return {
    zones: allZones,
    profiles: allProfiles,
    combinations: allCombinations,
    zoneCoverage: coverage.zoneCoverage,
    profileCoverage: coverage.profileCoverage,
    formatInfo: coverage.formatInfo,
    qualityMetrics: coverage.qualityMetrics,
    formatCounts
  };
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