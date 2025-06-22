import * as THREE from "three";

const colorStops = [
  { distance: 1.0, color: new THREE.Color(0x0000ff) },
  { distance: 2.2, color: new THREE.Color(0x00bfff) },
  { distance: 3.4, color: new THREE.Color(0x00ff00) },
  { distance: 4.6, color: new THREE.Color(0xffff00) },
  { distance: 5.8, color: new THREE.Color(0xff0000) },
  { distance: 7.0, color: new THREE.Color(0xffc0cb) },
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
      return null; // 💡 skip rendering this point
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

export const parseCSV = (content) => {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  let points = [];
  let minThickness = Infinity;
  let maxThickness = -Infinity;
  if (lines.length === 0) {
    throw new Error("Empty CSV file");
  }
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("x") && firstLine.includes("y") && firstLine.includes("z");
  let startIndex = hasHeader ? 1 : 0;
  let xIndex, yIndex, zIndex, thicknessIndex, sectionIndex, furnaceIdIndex;
  if (hasHeader) {
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    xIndex = header.findIndex((h) => h === "x");
    yIndex = header.findIndex((h) => h === "y");
    zIndex = header.findIndex((h) => h === "z");
    thicknessIndex = header.findIndex((h) => h === "thickness");
    sectionIndex = header.findIndex((h) => h === "section");
    furnaceIdIndex = header.findIndex((h) => h === "furnace_id");
    if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
      throw new Error("Could not find x, y, z columns in header");
    }
  } else {
    xIndex = 1;
    yIndex = 2;
    zIndex = 3;
    thicknessIndex = 4;
    sectionIndex = 5;
    furnaceIdIndex = 6;
  }
  for (let i = startIndex; i < lines.length; i++) {
    const values = lines[i].split(/[\t,]/).map((v) => v.trim());
    if (Math.max(xIndex, yIndex, zIndex, thicknessIndex, sectionIndex, furnaceIdIndex) >= values.length) continue;
    const x = parseFloat(values[xIndex]);
    const y = parseFloat(values[yIndex]);
    const z = parseFloat(values[zIndex]);
    const thickness = parseFloat(values[thicknessIndex] || Math.sqrt(x * x + y * y + z * z));
    if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(thickness)) continue;
    minThickness = Math.min(minThickness, thickness);
    maxThickness = Math.max(maxThickness, thickness);
    let scale = 1;
    const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    if (maxCoord > 5000) {
      scale = 0.001;
    } else if (maxCoord > 100) {
      scale = 0.01;
    } else if (maxCoord < 0.1 && maxCoord !== 0) {
      scale = 10;
    }
    points.push({
      position: [x * scale, y * scale, z * scale],
      thickness,
      section: values[sectionIndex] || "Bricks", // Default to Bricks
      furnaceId: values[furnaceIdIndex] || "default", // Default furnace ID
    });
  }
  if (points.length === 0) {
    throw new Error("No valid data points found in CSV");
  }
  return { points, minThickness, maxThickness };
};

export const parseThicknessCSV = (content) => {
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  let points = [];
  let minThickness = Infinity;
  let maxThickness = -Infinity;

  if (lines.length === 0) throw new Error("Empty CSV file");

  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes("x") && firstLine.includes("y") && firstLine.includes("z");
  const startIndex = hasHeader ? 1 : 0;

  let xIndex = 1, yIndex = 2, zIndex = 3, thicknessIndex = 4;
  if (hasHeader) {
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    xIndex = header.findIndex((h) => h === "x");
    yIndex = header.findIndex((h) => h === "y");
    zIndex = header.findIndex((h) => h === "z");
    thicknessIndex = header.findIndex((h) => h === "thickness");
    if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
      throw new Error("Could not find x, y, z columns in header");
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const values = lines[i].split(/[\t,]/).map((v) => v.trim());
    const x = parseFloat(values[xIndex]);
    const y = parseFloat(values[yIndex]);
    const z = parseFloat(values[zIndex]);
    const thickness = parseFloat(values[thicknessIndex] || Math.sqrt(x * x + y * y + z * z));
    if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(thickness)) continue;

    minThickness = Math.min(minThickness, thickness);
    maxThickness = Math.max(maxThickness, thickness);

    let scale = 1;
    const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    if (maxCoord > 5000) scale = 0.001;
    else if (maxCoord > 100) scale = 0.01;
    else if (maxCoord < 0.1 && maxCoord !== 0) scale = 10;

    const scaledX = x * scale;
    const scaledY = y * scale;
    const scaledZ = z * scale;

    const zone = (() => {
      if (scaledZ >= 2) return "Roof";
      if (scaledZ >= 1) return "SlagLine";
      if (scaledZ >= 0) return "Belly";
      if (scaledZ >= -1) return "InitialBricks";
      return "Bottom";
    })();

    const profileIndex = (() => {
      const minX = 7.2;
      const maxX = 7.4;
      const normalized = Math.min(Math.max((scaledX - minX) / (maxX - minX), 0), 0.999);
      return Math.floor(normalized * 10);
    })();

    points.push({
      position: [scaledX, scaledY, scaledZ],
      thickness,
      profileIndex,
      zone,
    });
  }

  if (points.length === 0) throw new Error("No valid data points found in CSV");
  return { points, minThickness, maxThickness };
};