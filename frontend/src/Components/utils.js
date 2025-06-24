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
export const getZone = (y) => {
  // Adjust these thresholds based on your furnace geometry
  if (y > 0) return "Roof";
  if (y > -0.5) return "SlagLine";
  if (y > -1.0) return "Belly";
  if (y > -1.5) return "InitialBricks";
  return "Bottom";
};

// Profile Index Function (adjusted for your coordinate system)
export const getProfileIndex = (x) => {
  // Based on your data (X around 7.2-7.3), create 20 slices
  const minX = 7.0;
  const maxX = 7.5;
  const normalized = Math.min(Math.max((x - minX) / (maxX - minX), 0), 0.999);
  return Math.floor(normalized * 20);
};

// Timestamp to Date Converter
export const timestampToDate = (timestamp) => {
  // Your timestamp appears to be in nanoseconds
  const date = new Date(Number(timestamp) / 1e6);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
};

// Main CSV Parser for your LiDAR data format
export const parseCSV = (content) => {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  let points = [];
  let minThickness = Infinity;
  let maxThickness = -Infinity;

  if (lines.length === 0) {
    throw new Error("Empty CSV file");
  }

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim());
  console.log("CSV Headers:", header);

  // Find column indices
  const xIndex = header.findIndex((h) => h.toLowerCase() === "x");
  const yIndex = header.findIndex((h) => h.toLowerCase() === "y");
  const zIndex = header.findIndex((h) => h.toLowerCase() === "z");
  const timestampIndex = header.findIndex((h) => h.toLowerCase() === "timestamp");
  const reflectivityIndex = header.findIndex((h) => h.toLowerCase() === "reflectivity");
  const tagIndex = header.findIndex((h) => h.toLowerCase() === "tag");

  if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
    throw new Error("Could not find X, Y, Z columns in CSV header");
  }

  console.log(`Found columns - X: ${xIndex}, Y: ${yIndex}, Z: ${zIndex}, Timestamp: ${timestampIndex}`);

  // Process data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    
    if (values.length < Math.max(xIndex, yIndex, zIndex) + 1) {
      continue; // Skip incomplete rows
    }

    const x = parseFloat(values[xIndex]);
    const y = parseFloat(values[yIndex]);
    const z = parseFloat(values[zIndex]);
    
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      continue; // Skip invalid coordinates
    }

    // Calculate thickness from distance to origin (or use reflectivity as proxy)
    let thickness;
    if (reflectivityIndex !== -1 && !isNaN(parseFloat(values[reflectivityIndex]))) {
      // Use reflectivity as thickness indicator
      thickness = parseFloat(values[reflectivityIndex]) / 10; // Scale down reflectivity
    } else {
      // Calculate distance from origin as thickness
      thickness = Math.sqrt(x * x + y * y + z * z);
    }

    minThickness = Math.min(minThickness, thickness);
    maxThickness = Math.max(maxThickness, thickness);

    // Determine appropriate scaling
    let scale = 1;
    const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    if (maxCoord > 1000) {
      scale = 0.001; // Convert mm to meters
    } else if (maxCoord > 100) {
      scale = 0.01; // Convert cm to meters
    }

    const scaledX = x * scale;
    const scaledY = y * scale;
    const scaledZ = z * scale;

    // Create point data
    const point = {
      position: [scaledX, scaledY, scaledZ],
      thickness,
      zone: getZone(scaledY),
      profileIndex: getProfileIndex(scaledX),
      timestamp: timestampIndex !== -1 ? values[timestampIndex] : null,
      reflectivity: reflectivityIndex !== -1 ? parseFloat(values[reflectivityIndex]) : null,
      tag: tagIndex !== -1 ? values[tagIndex] : null,
      section: "LiDAR",
      furnaceId: "default",
    };

    points.push(point);

    // Progress logging for large datasets
    if (i % 50000 === 0) {
      console.log(`Processed ${i}/${lines.length - 1} rows...`);
    }
  }

  if (points.length === 0) {
    throw new Error("No valid data points found in CSV");
  }

  console.log(`Successfully parsed ${points.length} points from ${lines.length - 1} rows`);
  console.log(`Thickness range: ${minThickness.toFixed(3)} - ${maxThickness.toFixed(3)}`);

  return { points, minThickness, maxThickness };
};

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