import * as THREE from "three";

const colorStops = [
  { distance: 1.0, color: new THREE.Color(0x0000ff) }, // Blue - thickest
  { distance: 2.2, color: new THREE.Color(0x00bfff) }, // Light blue
  { distance: 3.4, color: new THREE.Color(0x00ff00) }, // Green
  { distance: 4.6, color: new THREE.Color(0xffff00) }, // Yellow
  { distance: 5.8, color: new THREE.Color(0xff0000) }, // Red
  { distance: 7.0, color: new THREE.Color(0xffc0cb) }, // Pink - thinnest
];

export const getColorForThickness = (
  thickness,
  localMin,
  localMax,
  useGlobalScaling,
  globalDataRange,
  wearRange = "all"
) => {
  let minRange, maxRange;

  if (useGlobalScaling && globalDataRange.isInitialized) {
    minRange = globalDataRange.min;
    maxRange = globalDataRange.max;
  } else {
    minRange = localMin;
    maxRange = localMax;
  }

  if (minRange === maxRange) {
    return colorStops[Math.floor(colorStops.length / 2)].color;
  }

  const ranges = {
    low: [0.8, 1.0],
    medium: [0.5, 0.8],
    high: [0.2, 0.5],
    critical: [0.0, 0.2],
  };

  const normalized = (thickness - minRange) / (maxRange - minRange);

  if (wearRange !== "all") {
    const [min, max] = ranges[wearRange] || [0, 1];
    if (normalized < min || normalized > max) {
      return null; // Skip rendering this point
    }
  }

  const scaledThickness = THREE.MathUtils.mapLinear(thickness, minRange, maxRange, 1.0, 7.0);
  const clampedThickness = Math.max(1.0, Math.min(7.0, scaledThickness));

  for (let i = 1; i < colorStops.length; i++) {
    if (clampedThickness <= colorStops[i].distance) {
      const prevStop = colorStops[i - 1];
      const currStop = colorStops[i];
      const t = (clampedThickness - prevStop.distance) / (currStop.distance - prevStop.distance);
      const color = prevStop.color.clone();
      color.lerp(currStop.color, t);
      return color;
    }
  }

  return colorStops[colorStops.length - 1].color;
};

// Helper: Simple groupBy function
export const groupBy = (array, keyFn) => {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
    return result;
  }, {});
};

// Zone Mapping Function (adjusted for furnace coordinates)
// export const getZone = (y) => {
//   // Adjust these thresholds based on your furnace geometry
//   if (y > 0) return "Roof";
//   if (y > -0.5) return "SlagLine";
//   if (y > -1.0) return "Belly";
//   if (y > -1.5) return "InitialBricks";
//   return "Bottom";
// };

// // Profile Index Function (adjusted for your coordinate system)
// export const getProfileIndex = (x) => {
//   // Based on your data (X around 7.2-7.3), create 20 slices
//   const minX = 7.0;
//   const maxX = 7.5;
//   const normalized = Math.min(Math.max((x - minX) / (maxX - minX), 0), 0.999);
//   return Math.floor(normalized * 20);
// };

// Timestamp to Date Converter
export const timestampToDate = (timestamp) => {
  // Your timestamp appears to be in nanoseconds
  const date = new Date(Number(timestamp) / 1e6);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

// Main CSV Parser for your LiDAR data format
// export const parseCSV = (content) => {
//   const lines = content.split("\n").filter((line) => line.trim() !== "");
//   let points = [];
//   let minThickness = Infinity;
//   let maxThickness = -Infinity;

//   if (lines.length === 0) {
//     throw new Error("Empty CSV file");
//   }

//   // Parse header
//   const header = lines[0].split(",").map((h) => h.trim());
//   console.log("CSV Headers:", header);

//   // Find column indices
//   const xIndex = header.findIndex((h) => h.toLowerCase() === "x");
//   const yIndex = header.findIndex((h) => h.toLowerCase() === "y");
//   const zIndex = header.findIndex((h) => h.toLowerCase() === "z");
//   const timestampIndex = header.findIndex((h) => h.toLowerCase() === "timestamp");
//   const reflectivityIndex = header.findIndex((h) => h.toLowerCase() === "reflectivity");
//   const tagIndex = header.findIndex((h) => h.toLowerCase() === "tag");

//   if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
//     throw new Error("Could not find X, Y, Z columns in CSV header");
//   }

//   console.log(`Found columns - X: ${xIndex}, Y: ${yIndex}, Z: ${zIndex}, Timestamp: ${timestampIndex}`);

//   // Process data rows (skip header)
//   for (let i = 1; i < lines.length; i++) {
//     const values = lines[i].split(",").map((v) => v.trim());
    
//     if (values.length < Math.max(xIndex, yIndex, zIndex) + 1) {
//       continue; // Skip incomplete rows
//     }

//     const x = parseFloat(values[xIndex]);
//     const y = parseFloat(values[yIndex]);
//     const z = parseFloat(values[zIndex]);
    
//     if (isNaN(x) || isNaN(y) || isNaN(z)) {
//       continue; // Skip invalid coordinates
//     }

//     // Calculate thickness from distance to origin (or use reflectivity as proxy)
//     let thickness;
//     if (reflectivityIndex !== -1 && !isNaN(parseFloat(values[reflectivityIndex]))) {
//       // Use reflectivity as thickness indicator
//       thickness = parseFloat(values[reflectivityIndex]) / 10; // Scale down reflectivity
//     } else {
//       // Calculate distance from origin as thickness
//       thickness = Math.sqrt(x * x + y * y + z * z);
//     }

//     minThickness = Math.min(minThickness, thickness);
//     maxThickness = Math.max(maxThickness, thickness);

//     // Determine appropriate scaling
//     let scale = 1;
//     const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
//     if (maxCoord > 1000) {
//       scale = 0.001; // Convert mm to meters
//     } else if (maxCoord > 100) {
//       scale = 0.01; // Convert cm to meters
//     }

//     const scaledX = x * scale;
//     const scaledY = y * scale;
//     const scaledZ = z * scale;

//     // Create point data
//     const point = {
//       position: [scaledX, scaledY, scaledZ],
//       thickness,
//       zone: getZone(scaledY),
//       profileIndex: getProfileIndex(scaledX),
//       timestamp: timestampIndex !== -1 ? values[timestampIndex] : null,
//       reflectivity: reflectivityIndex !== -1 ? parseFloat(values[reflectivityIndex]) : null,
//       tag: tagIndex !== -1 ? values[tagIndex] : null,
//       section: "LiDAR",
//       furnaceId: "default",
//     };

//     points.push(point);

//     // Progress logging for large datasets
//     if (i % 50000 === 0) {
//       console.log(`Processed ${i}/${lines.length - 1} rows...`);
//     }
//   }

//   if (points.length === 0) {
//     throw new Error("No valid data points found in CSV");
//   }

//   console.log(`Successfully parsed ${points.length} points from ${lines.length - 1} rows`);
//   console.log(`Thickness range: ${minThickness.toFixed(3)} - ${maxThickness.toFixed(3)}`);

//   return { points, minThickness, maxThickness };
// };

// Alternative parser specifically for thickness data
export const parseThicknessCSV = (csvContent) => {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  const xIndex = headers.findIndex(h => h.toLowerCase() === 'x');
  const yIndex = headers.findIndex(h => h.toLowerCase() === 'y');
  const zIndex = headers.findIndex(h => h.toLowerCase() === 'z');
  const timestampIndex = headers.findIndex(h => h.toLowerCase() === 'timestamp');

  if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
    throw new Error('CSV headers missing required X, Y, Z columns.');
  }

  const points = [];
  let minThickness = Infinity;
  let maxThickness = -Infinity;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());

    const x = parseFloat(values[xIndex]);
    const y = parseFloat(values[yIndex]);
    const z = parseFloat(values[zIndex]);
    const timestamp = values[timestampIndex];

    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    const thickness = Math.sqrt(x * x + y * y + z * z);
    minThickness = Math.min(minThickness, thickness);
    maxThickness = Math.max(maxThickness, thickness);

    // Apply scaling
    let scale = 1;
    const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    if (maxCoord > 1000) scale = 0.001;
    else if (maxCoord > 100) scale = 0.01;
    else if (maxCoord < 0.1 && maxCoord !== 0) scale = 10;

    const scaledX = x * scale;
    const scaledY = y * scale;
    const scaledZ = z * scale;

    points.push({
      position: [scaledX, scaledY, scaledZ],
      thickness,
      zone: getZone(scaledY),
      profileIndex: getProfileIndex(scaledX),
      timestamp: timestamp,
      section: "Bricks",
      furnaceId: "default",
    });
  }

  if (points.length === 0) throw new Error('No valid data points found in CSV.');

  return { points, minThickness, maxThickness };
};

const zoneMap = {
  Roof: 100,
  SlagLine: 50,
  Belly: 0,
  InitialBricks: -50,
  Bottom: -100,
};

const profileLabels = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);

// const getColorForThickness = (thickness, min, max, useGlobal, range) => {
//   const normalized = Math.max(0, Math.min(1, (thickness - min) / (max - min)));
//   return {
//     r: normalized,
//     g: 1 - normalized,
//     b: 0.5,
//   };
// };

const getThicknessHistoryForCell = (cellData, fileDataCache) => {
  const { zone, profileIndex } = cellData;
  const history = [];

  for (const [fileName, fileData] of fileDataCache) {
    let timestamp = null;
    const points = fileData.points || [];
    if (points.length > 0 && points[0].timestamp) {
      try {
        const tsNumber = parseInt(points[0].timestamp, 10);
        if (!isNaN(tsNumber)) {
          timestamp = new Date(tsNumber).toISOString().split("T")[0];
        }
      } catch (e) {
        console.warn("[History] Failed to parse point timestamp for file:", fileName, points[0].timestamp);
      }
    }

    if (!timestamp) {
      try {
        timestamp = new Date(fileName).toISOString().split("T")[0];
      } catch (e) {
        console.warn("[History] Invalid timestamp for file:", fileName);
        continue;
      }
    }

    const matchingPoints = points.filter(
      (point) =>
        point.zone === zone &&
        point.profileIndex === profileIndex &&
        typeof point.thickness === "number"
    );

    if (matchingPoints.length > 0) {
      const avgThickness = matchingPoints.reduce((sum, point) => sum + point.thickness, 0) / matchingPoints.length / 10;
      history.push({
        date: timestamp,
        thickness: avgThickness,
      });
    }
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log("[History] Cell history:", history);
  return history;
};

const getThicknessHistoryForPoint = (pointData, fileDataCache) => {
  const { position } = pointData;
  const history = [];

  for (const [fileName, fileData] of fileDataCache) {
    let timestamp = null;
    const points = fileData.points || [];
    if (points.length > 0 && points[0].timestamp) {
      try {
        const tsNumber = parseInt(points[0].timestamp, 10);
        if (!isNaN(tsNumber)) {
          timestamp = new Date(tsNumber).toISOString().split("T")[0];
        }
      } catch (e) {
        console.warn("[History] Failed to parse point timestamp for file:", fileName, points[0].timestamp);
      }
    }

    if (!timestamp) {
      try {
        timestamp = new Date(fileName).toISOString().split("T")[0];
      } catch (e) {
        console.warn("[History] Invalid timestamp for file:", fileName);
        continue;
      }
    }

    const matchingPoint = points.find((point) => {
      if (!point.position || point.position.length !== 3) return false;
      const dx = point.position[0] - position[0];
      const dy = point.position[1] - position[1];
      const dz = point.position[2] - position[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.01;
    });

    if (matchingPoint && typeof matchingPoint.thickness === "number") {
      history.push({
        date: timestamp,
        thickness: matchingPoint.thickness / 10,
      });
    }
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log("[History] Point history:", history);
  return history;
};

export { zoneMap, profileLabels,  getThicknessHistoryForCell, getThicknessHistoryForPoint };


//here
// Enhanced CSV Parser for LiDAR data - handles both header and headerless formats
export const parseCSV = (content) => {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  let points = [];
  let minThickness = Infinity;
  let maxThickness = -Infinity;

  if (lines.length === 0) {
    throw new Error("Empty CSV file");
  }

  console.log(`Processing CSV with ${lines.length} lines...`);

  // Detect if CSV has headers or is headerless
  const { hasHeader, dataStartIndex, columnMapping } = detectCSVFormat(lines);
  
  console.log(`CSV Format: ${hasHeader ? 'Header' : 'Headerless'}, Data starts at line: ${dataStartIndex + 1}`);
  console.log('Column mapping:', columnMapping);

  // Process data rows
  let validPoints = 0;
  let skippedRows = 0;
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    
    // Skip rows that are too short or contain only zeros
    if (values.length < 5 || isRowEmpty(values)) {
      skippedRows++;
      continue;
    }

    // Extract coordinates based on column mapping
    const x = parseFloat(values[columnMapping.x]);
    const y = parseFloat(values[columnMapping.y]);
    const z = parseFloat(values[columnMapping.z]);
    
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      skippedRows++;
      continue;
    }

    // Skip points at origin (likely invalid data)
    if (x === 0 && y === 0 && z === 0) {
      skippedRows++;
      continue;
    }

    // Calculate thickness
    let thickness;
    if (columnMapping.reflectivity !== -1 && 
        values[columnMapping.reflectivity] && 
        !isNaN(parseFloat(values[columnMapping.reflectivity]))) {
      // Use reflectivity as thickness indicator
      thickness = parseFloat(values[columnMapping.reflectivity]) / 10;
    } else {
      // Calculate distance from origin as thickness
      thickness = Math.sqrt(x * x + y * y + z * z);
    }

    minThickness = Math.min(minThickness, thickness);
    maxThickness = Math.max(maxThickness, thickness);

    // Determine appropriate scaling
    let scale = determineScale(x, y, z);
    
    const scaledX = x * scale;
    const scaledY = y * scale;
    const scaledZ = z * scale;

    // Create point data
    const point = {
      position: [scaledX, scaledY, scaledZ],
      thickness,
      zone: getZone(scaledY),
      profileIndex: getProfileIndex(scaledX),
      timestamp: columnMapping.timestamp !== -1 ? values[columnMapping.timestamp] : null,
      reflectivity: columnMapping.reflectivity !== -1 ? parseFloat(values[columnMapping.reflectivity]) || null : null,
      tag: columnMapping.tag !== -1 ? values[columnMapping.tag] : null,
      section: "LiDAR",
      furnaceId: "default",
    };

    points.push(point);
    validPoints++;

    // Progress logging for large datasets
    if (validPoints % 50000 === 0) {
      console.log(`Processed ${validPoints} valid points, skipped ${skippedRows} invalid rows...`);
    }
  }

  if (points.length === 0) {
    throw new Error("No valid data points found in CSV");
  }

  console.log(`Successfully parsed ${points.length} points from ${lines.length} total rows`);
  console.log(`Skipped ${skippedRows} invalid/empty rows`);
  console.log(`Thickness range: ${minThickness.toFixed(3)} - ${maxThickness.toFixed(3)}`);

  return { points, minThickness, maxThickness };
};

// Detect CSV format and determine column mapping
const detectCSVFormat = (lines) => {
  // Check first few lines to determine format
  const firstLine = lines[0].split(",").map(v => v.trim());
  
  // Check if first line contains text headers
  const hasTextHeaders = firstLine.some(val => 
    isNaN(parseFloat(val)) && val.toLowerCase().match(/[xyz]|timestamp|reflectivity|tag/)
  );

  if (hasTextHeaders) {
    // Header format
    const header = firstLine;
    console.log("Detected header format. Headers:", header);
    
    return {
      hasHeader: true,
      dataStartIndex: 1,
      columnMapping: getHeaderColumnMapping(header)
    };
  } else {
    // Headerless format - find where actual data starts
    console.log("Detected headerless format. Analyzing data structure...");
    
    const dataStartIndex = findDataStartIndex(lines);
    const columnMapping = getHeaderlessColumnMapping(lines, dataStartIndex);
    
    return {
      hasHeader: false,
      dataStartIndex,
      columnMapping
    };
  }
};

// Get column mapping for header format
const getHeaderColumnMapping = (header) => {
  return {
    x: header.findIndex(h => h.toLowerCase() === "x"),
    y: header.findIndex(h => h.toLowerCase() === "y"),
    z: header.findIndex(h => h.toLowerCase() === "z"),
    timestamp: header.findIndex(h => h.toLowerCase() === "timestamp"),
    reflectivity: header.findIndex(h => h.toLowerCase() === "reflectivity"),
    tag: header.findIndex(h => h.toLowerCase() === "tag")
  };
};

// Get column mapping for headerless format based on your data structure
const getHeaderlessColumnMapping = (lines, startIndex) => {
  // Based on your headerless example, analyze the data structure
  // Looking for patterns in the data to identify X, Y, Z columns
  
  if (startIndex < lines.length) {
    const sampleRow = lines[startIndex].split(",").map(v => v.trim());
    console.log("Sample data row:", sampleRow);
    
    // For headerless format, we need to make educated guesses based on data patterns
    // This is based on common LiDAR data formats
    
    // Try to identify X, Y, Z based on value ranges and positions
    let mapping = analyzeDataColumns(lines, startIndex);
    
    if (!mapping) {
      // Fallback mapping based on your data example
      // Assuming format similar to: [other_cols...] X Y Z Reflectivity [other_cols...]
      mapping = {
        x: findLikelyCoordinateColumn(lines, startIndex, 'x'),
        y: findLikelyCoordinateColumn(lines, startIndex, 'y'), 
        z: findLikelyCoordinateColumn(lines, startIndex, 'z'),
        reflectivity: findLikelyReflectivityColumn(lines, startIndex),
        timestamp: -1, // Usually not available in headerless format
        tag: -1
      };
    }
    
    return mapping;
  }
  
  // Default fallback
  return { x: 0, y: 1, z: 2, reflectivity: 3, timestamp: -1, tag: -1 };
};

// Find where actual LiDAR data starts (skip zero rows)
const findDataStartIndex = (lines) => {
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    const values = lines[i].split(",").map(v => parseFloat(v.trim()));
    
    // Look for a row with meaningful coordinate data
    if (values.length >= 3 && 
        !isRowEmpty(values) && 
        hasSignificantCoordinates(values)) {
      return i;
    }
  }
  
  return 0; // Fallback to start if no pattern found
};

// Check if row contains only zeros or empty values
const isRowEmpty = (values) => {
  return values.every(val => {
    const num = parseFloat(val);
    return isNaN(num) || num === 0 || val === "";
  });
};

// Check if row has significant coordinate values
const hasSignificantCoordinates = (values) => {
  const nonZeroValues = values.filter(val => !isNaN(val) && Math.abs(val) > 0.001);
  return nonZeroValues.length >= 3; // At least 3 non-zero values
};

// Analyze data columns to identify X, Y, Z positions
const analyzeDataColumns = (lines, startIndex) => {
  const sampleSize = Math.min(100, lines.length - startIndex);
  const columnStats = [];
  
  // Analyze first valid row to get column count
  const firstValidRow = lines[startIndex].split(",").map(v => parseFloat(v.trim()));
  const numColumns = firstValidRow.length;
  
  // Initialize stats for each column
  for (let col = 0; col < numColumns; col++) {
    columnStats[col] = {
      values: [],
      hasNegative: false,
      hasPositive: false,
      range: 0,
      nonZeroCount: 0
    };
  }
  
  // Collect statistics
  for (let i = startIndex; i < Math.min(startIndex + sampleSize, lines.length); i++) {
    const values = lines[i].split(",").map(v => parseFloat(v.trim()));
    
    for (let col = 0; col < Math.min(values.length, numColumns); col++) {
      const val = values[col];
      if (!isNaN(val) && val !== 0) {
        columnStats[col].values.push(val);
        columnStats[col].nonZeroCount++;
        if (val > 0) columnStats[col].hasPositive = true;
        if (val < 0) columnStats[col].hasNegative = true;
      }
    }
  }
  
  // Calculate ranges and identify coordinate columns
  columnStats.forEach((stat, idx) => {
    if (stat.values.length > 0) {
      stat.range = Math.max(...stat.values) - Math.min(...stat.values);
      stat.avgAbs = stat.values.reduce((sum, val) => sum + Math.abs(val), 0) / stat.values.length;
    }
  });
  
  // Find columns most likely to be coordinates
  const coordinateColumns = columnStats
    .map((stat, idx) => ({ idx, ...stat }))
    .filter(stat => stat.nonZeroCount > sampleSize * 0.1 && stat.range > 10)
    .sort((a, b) => b.range - a.range)
    .slice(0, 5); // Take top 5 candidates
  
  if (coordinateColumns.length >= 3) {
    return {
      x: coordinateColumns[0].idx,
      y: coordinateColumns[1].idx,
      z: coordinateColumns[2].idx,
      reflectivity: coordinateColumns.length > 3 ? coordinateColumns[3].idx : -1,
      timestamp: -1,
      tag: -1
    };
  }
  
  return null;
};

// Find likely coordinate column based on data patterns
const findLikelyCoordinateColumn = (lines, startIndex, coord) => {
  // This is a simplified heuristic - you may need to adjust based on your specific data
  const sampleSize = Math.min(20, lines.length - startIndex);
  
  for (let i = startIndex; i < startIndex + sampleSize; i++) {
    const values = lines[i].split(",").map(v => parseFloat(v.trim()));
    
    // Look for the first columns with significant non-zero values
    for (let col = 0; col < values.length; col++) {
      if (!isNaN(values[col]) && Math.abs(values[col]) > 100) {
        // Return based on coordinate type (this is a simple heuristic)
        if (coord === 'x') return col;
        if (coord === 'y') return col + 1;
        if (coord === 'z') return col + 2;
      }
    }
  }
  
  // Fallback
  return coord === 'x' ? 0 : coord === 'y' ? 1 : 2;
};

// Find likely reflectivity column
const findLikelyReflectivityColumn = (lines, startIndex) => {
  const sampleSize = Math.min(20, lines.length - startIndex);
  
  for (let i = startIndex; i < startIndex + sampleSize; i++) {
    const values = lines[i].split(",").map(v => parseFloat(v.trim()));
    
    // Look for column with values in typical reflectivity range (0-255)
    for (let col = 3; col < values.length; col++) {
      const val = parseFloat(values[col]);
      if (!isNaN(val) && val > 0 && val <= 255) {
        return col;
      }
    }
  }
  
  return -1; // Not found
};

// Determine appropriate scaling based on coordinate values
const determineScale = (x, y, z) => {
  const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
  
  if (maxCoord > 100000) {
    return 0.0001; // Very large values, likely in micrometers
  } else if (maxCoord > 10000) {
    return 0.001; // Large values, likely in millimeters
  } else if (maxCoord > 1000) {
    return 0.01; // Medium values, likely in centimeters
  } else if (maxCoord > 100) {
    return 0.1; // Smaller values
  }
  
  return 1; // Values already in appropriate range
};

// Helper functions (you'll need to implement these based on your application logic)
const getZone = (y) => {
  // Implement your zone calculation logic
  return Math.floor(y * 10) % 10;
};

const getProfileIndex = (x) => {
  // Implement your profile index calculation logic
  return Math.floor(x * 10) % 100;
};