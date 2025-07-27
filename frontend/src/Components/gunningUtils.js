export const MATERIAL_DENSITY = 2.2;
export const MAX_RENDER_POINTS = 8000;
export const MAX_SAMPLE_POINTS = 15000;
export const MAX_WORN_POINTS = 20000;

export const SCREEN_CONFIGS = {
  Bricks: {
    title: "BRICK WEAR ANALYSIS",
    color: "#FF4444",
    description: "Analyze brick wear patterns and thickness measurements",
    thresholdLabel: "Brick wear threshold:",
    unit: "cm",
  },
  "Slag Line": {
    title: "SLAG LINE WEAR ANALYSIS",
    color: "#FF8800",
    description: "Monitor slag line erosion and damage patterns",
    thresholdLabel: "Slag line wear threshold:",
    unit: "cm",
  },
  Screed: {
    title: "SCREED WEAR ANALYSIS",
    color: "#8844FF",
    description: "Evaluate screed surface condition and wear rates",
    thresholdLabel: "Screed wear threshold:",
    unit: "cm",
  },
};

export const detectPointSection = (() => {
  const cache = new Map();

  return (point, allPoints = []) => {
    const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
    const [x, y, z] = pos;

    const key = `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
    if (cache.has(key)) return cache.get(key);

    const distanceFromCenter = Math.sqrt(x * x + y * y);
    const totalDistance = Math.sqrt(x * x + y * y + z * z);
    const heightRatio = Math.abs(z) / Math.max(totalDistance, 1);

    let result;

    if (z < -20 || (z < -5 && heightRatio > 0.3) || (Math.abs(z) > 15 && distanceFromCenter < 20)) {
      result = "Screed";
    } else if (
      distanceFromCenter > 25 ||
      (distanceFromCenter > 15 && Math.abs(z) < 15) ||
      x > 30 ||
      y > 30 ||
      x < -30 ||
      y < -30 ||
      (distanceFromCenter > 20 && z > -10 && z < 10)
    ) {
      result = "Slag Line";
    } else {
      result = "Bricks";
    }

    if (cache.size > 10000) cache.clear();
    cache.set(key, result);

    return result;
  };
})();

export const detectPointSectionEnhanced = (() => {
  let cachedPercentiles = null;
  let lastPointsLength = 0;

  return (point, allPoints = []) => {
    const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
    const [x, y, z] = pos;

    const distanceFromCenter = Math.sqrt(x * x + y * y);

    if (allPoints.length > 1000 && allPoints.length !== lastPointsLength) {
      const zValues = new Float32Array(allPoints.length);
      const radialValues = new Float32Array(allPoints.length);

      for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];
        const pos = p.position || [p.x || 0, p.y || 0, p.z || 0];
        zValues[i] = pos[2];
        radialValues[i] = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1]);
      }

      zValues.sort((a, b) => a - b);
      radialValues.sort((a, b) => a - b);

      cachedPercentiles = {
        zLow: zValues[Math.floor(zValues.length * 0.25)],
        zHigh: zValues[Math.floor(zValues.length * 0.75)],
        radialHigh: radialValues[Math.floor(radialValues.length * 0.75)],
      };
      lastPointsLength = allPoints.length;
    }

    if (cachedPercentiles) {
      if (z <= cachedPercentiles.zLow) {
        return "Screed";
      } else if (distanceFromCenter >= cachedPercentiles.radialHigh || z >= cachedPercentiles.zHigh) {
        return "Slag Line";
      } else {
        return "Bricks";
      }
    }

    if (z < -15) return "Screed";
    if (distanceFromCenter > 30 || z > 20) return "Slag Line";
    return "Bricks";
  };
})();

export const samplePoints = (points, maxPoints) => {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
};