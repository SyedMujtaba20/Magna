export const getBaselineFile = (files) => {
  if (!files || files.length === 0) return null;
  
  // Sort files by name or date to get the first/baseline file
  const sortedFiles = [...files].sort((a, b) => {
    if (a.lastModified && b.lastModified) {
      return a.lastModified - b.lastModified;
    }
    return a.name.localeCompare(b.name);
  });
  
  return sortedFiles[0];
};

export const getBaselinePoints = (baselineFile, fileDataCache, selectedFurnace) => {
  if (!baselineFile || !fileDataCache.has(baselineFile.name) || !selectedFurnace) {
    return [];
  }

  const fileData = fileDataCache.get(baselineFile.name);
  const points = fileData?.points || fileData?.data || [];
  
  if (!points || points.length === 0) return [];

  // Filter points for selected furnace
  const filtered = points.filter(point => {
    const pointFurnaceId = point.furnaceId || point.furnace_id || point.id || 'default';
    return selectedFurnace && pointFurnaceId === selectedFurnace.furnace_id;
  });

  return filtered;
};

export const getFurnacePoints = (selectedFile, fileDataCache, selectedFurnace) => {
  if (!selectedFile || !fileDataCache.has(selectedFile.name) || !selectedFurnace) {
    return [];
  }

  const fileData = fileDataCache.get(selectedFile.name);
  const points = fileData?.points || fileData?.data || [];
  
  if (!points || points.length === 0) return [];

  // Filter points for selected furnace
  const filtered = points.filter(point => {
    const pointFurnaceId = point.furnaceId || point.furnace_id || point.id || 'default';
    return selectedFurnace && pointFurnaceId === selectedFurnace.furnace_id;
  });

  console.log("[FurnaceDataUtils] Filtered points for furnace:", filtered.length);
  return filtered;
};

export const getDataBounds = (furnacePoints, baselinePoints) => {
  const allPoints = [...furnacePoints, ...baselinePoints];
  
  if (allPoints.length === 0) {
    return { minX: -50, maxX: 50, minZ: -50, maxZ: 50, minY: 0, maxY: 10 };
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // Sample points for bounds calculation if dataset is very large
  const sampleSize = Math.min(5000, allPoints.length);
  const step = Math.ceil(allPoints.length / sampleSize);
  
  for (let i = 0; i < allPoints.length; i += step) {
    const point = allPoints[i];
    const x = point.position?.[0] || point.x || 0;
    const z = point.position?.[2] || point.z || 0;
    const thickness = point.thickness || point.y || 0;
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
    minY = Math.min(minY, thickness);
    maxY = Math.max(maxY, thickness);
  }

  return { minX, maxX, minZ, maxZ, minY, maxY };
};

export const getAvailableFurnaces = (selectedFile, fileDataCache, setAvailableFurnaces, setSelectedFurnace, selectedFurnace) => {
  if (selectedFile && fileDataCache.has(selectedFile.name)) {
    const fileData = fileDataCache.get(selectedFile.name);
    const points = fileData?.points || fileData?.data || [];
    
    if (points && points.length > 0) {
      // Sample points to find furnace IDs efficiently
      const sampleSize = Math.min(1000, points.length);
      const step = Math.ceil(points.length / sampleSize);
      const samplePoints = [];
      
      for (let i = 0; i < points.length; i += step) {
        samplePoints.push(points[i]);
      }
      
      const furnaceIds = [...new Set(samplePoints.map(p => {
        return p.furnaceId || p.furnace_id || p.id || 'default';
      }).filter(id => id != null))];
      
      const furnaces = furnaceIds.map(id => ({ 
        furnace_id: id, 
        name: `Furnace ${id}` 
      }));
      
      setAvailableFurnaces(furnaces);
      
      if (!selectedFurnace && furnaces.length > 0) {
        setSelectedFurnace(furnaces[0]);
      }
    }
  }
};