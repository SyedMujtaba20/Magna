export const groupPointsByProximity = (points, maxDistance, minimumAreaSize) => {
  const areas = [];
  const processedIndices = new Set();
  points.forEach((point, index) => {
    if (processedIndices.has(index)) return;
    const area = { points: [point] };
    processedIndices.add(index);
    points.forEach((otherPoint, otherIndex) => {
      if (processedIndices.has(otherIndex)) return;
      const pos1 = point.position || [point.x || 0, point.y || 0, point.z || 0];
      const pos2 = otherPoint.position || [otherPoint.x || 0, otherPoint.y || 0, otherPoint.z || 0];
      const distance = Math.sqrt(
        Math.pow(pos1[0] - pos2[0], 2) +
        Math.pow(pos1[1] - pos2[1], 2) +
        Math.pow(pos1[2] - pos2[2], 2)
      );
      if (distance <= maxDistance) {
        area.points.push(otherPoint);
        processedIndices.add(otherIndex);
      }
    });
    if (area.points.length >= minimumAreaSize) areas.push(area);
  });
  return areas;
};

export const calculateRepairProposal = (wornPoints, parameters, materialDensity) => {
  if (!wornPoints.length) return { areas: [], total: { volume: 0, weight: 0 } };
  const areas = [];
  let processedIndices = new Set();
  wornPoints.forEach((point, index) => {
    if (processedIndices.has(index)) return;
    const area = { points: [point] };
    processedIndices.add(index);
    const pos1 = point.position || [point.x || 0, point.y || 0, point.z || 0];
    for (let i = index + 1; i < Math.min(index + 1000, wornPoints.length); i++) {
      if (processedIndices.has(i)) continue;
      const otherPoint = wornPoints[i];
      const pos2 = otherPoint.position || [otherPoint.x || 0, otherPoint.y || 0, otherPoint.z || 0];
      const distance = Math.sqrt(
        Math.pow(pos1[0] - pos2[0], 2) +
        Math.pow(pos1[1] - pos2[1], 2) +
        Math.pow(pos1[2] - pos2[2], 2)
      );
      if (distance <= parameters.distanceBetweenAreas) {
        area.points.push(otherPoint);
        processedIndices.add(i);
      }
    }
    if (area.points.length >= parameters.minimumAreaSize) areas.push(area);
  });
  const processedAreas = areas.map((area, index) => {
    const avgThickness = area.points.reduce(
      (sum, p) => sum + (parameters.wearThreshold - p.thickness),
      0
    ) / area.points.length;
    const pointDensity = 1000;
    const areaSize = area.points.length / pointDensity;
    const volume = Math.max(0.001, areaSize * (avgThickness / 100));
    const weight = volume * materialDensity * 1000;
    return {
      id: index + 1,
      volume: volume,
      weight: weight,
      pointCount: area.points.length,
      avgWear: avgThickness,
    };
  });
  const totalVolume = processedAreas.reduce((sum, area) => sum + area.volume, 0);
  const totalWeight = processedAreas.reduce((sum, area) => sum + area.weight, 0);
  return {
    areas: processedAreas,
    total: { volume: totalVolume, weight: totalWeight },
  };
};