import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Constants
const MATERIAL_DENSITY = 2.2;
const MAX_RENDER_POINTS = 8000;
const MAX_SAMPLE_POINTS = 15000;
const MAX_WORN_POINTS = 20000;

// 🏭 Furnace 2D Layout Configuration - Simple rectangular layout
const FURNACE_2D_CONFIG = {
  width: 800,
  height: 600,
  // Simple 12 panels layout
  panels: {
    count: 12,
    margin: 10
  }
};

const SCREEN_CONFIGS = {
  Bricks: {
    title: "BRICK WEAR ANALYSIS",
    color: "#FF4444",
    description: "Analyze brick wear patterns and thickness measurements",
    thresholdLabel: "Brick wear threshold:",
    unit: "cm",
    furnaceDescription: "Main furnace wall section (middle Z-range)"
  },
  "Slag Line": {
    title: "SLAG LINE WEAR ANALYSIS", 
    color: "#FF8800",
    description: "Monitor slag line erosion and damage patterns",
    thresholdLabel: "Slag line wear threshold:",
    unit: "cm",
    furnaceDescription: "Upper section where molten slag floats (high Z-range)"
  },
  Screed: {
    title: "SCREED WEAR ANALYSIS",
    color: "#8844FF", 
    description: "Evaluate screed surface condition and wear rates",
    thresholdLabel: "Screed wear threshold:",
    unit: "cm",
    furnaceDescription: "Bottom floor section of furnace (low Z-range)"
  },
};

// 🔧 FIXED: Enhanced section detection handling both data formats correctly
// 🔧 FIXED: Using the working logic from your reference code
// Enhanced section detection handling both data formats correctly
const detectPointSectionEnhanced = (() => {
  let cachedPercentiles = null;
  let lastPointsLength = 0;

  return (point, allPoints = []) => {
    let x, y, z, thickness;
    
    // 🔧 IMPROVED: Better format detection based on data structure
    if (point.position) {
      // Format with position array
      [x, y, z] = point.position;
      thickness = point.thickness;
    } else if (point.X !== undefined && point.Y !== undefined && point.Z !== undefined) {
      // Header format with named columns (X, Y, Z, etc.)
      x = point.X;
      y = point.Y;
      z = point.Z;
      thickness = point.Reflectivity || point.thickness; // Use Reflectivity as thickness for header format
    } else if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
      // Format with lowercase named properties
      x = point.x;
      y = point.y;
      z = point.z;
      thickness = point.thickness;
    } else if (Array.isArray(point) && point.length >= 4) {
      // Headerless format: [unknown, x, y, z, thickness]
      x = point[1];
      y = point[2];
      z = point[3];
      thickness = point[4];
    } else {
      console.warn("⚠️ Unknown point format:", point);
      return "Bricks"; // Default fallback
    }
    
    // Convert to numbers if they're strings
    x = Number(x) || 0;
    y = Number(y) || 0;
    z = Number(z) || 0;
    thickness = Number(thickness) || 0;
    
    // 🔧 FIXED: Handle different data formats correctly using working logic
    // Handle coordinate scaling - assuming data is in cm initially
    if (Math.abs(x) > 10000 || Math.abs(y) > 10000) {
      x = x / 10; // Scale down if needed
      y = y / 10;
    }
    
    if (Math.abs(x) > 50000 || Math.abs(y) > 50000) {
      x = x / 10; // mm to cm conversion
      y = y / 10;
      z = z / 10;
    }

    const distanceFromCenter = Math.sqrt(x * x + y * y);

    // Use statistical approach for large datasets (from your working code)
    if (allPoints.length > 1000 && allPoints.length !== lastPointsLength) {
      const zValues = new Float32Array(allPoints.length);
      const radialValues = new Float32Array(allPoints.length);

      for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];
        let px, py, pz;
        
        // Handle different point formats for percentile calculation
        if (p.position) {
          [px, py, pz] = p.position;
        } else if (p.X !== undefined) {
          // Header format
          px = p.X;
          py = p.Y;
          pz = p.Z;
        } else if (p.x !== undefined) {
          px = p.x;
          py = p.y;
          pz = p.z;
        } else if (Array.isArray(p) && p.length >= 4) {
          px = p[1];
          py = p[2];
          pz = p[3];
        } else {
          continue; // Skip invalid points
        }
        
        px = Number(px) || 0;
        py = Number(py) || 0;
        pz = Number(pz) || 0;
        
        // Apply same scaling logic to all points
        if (Math.abs(px) > 10000) {
          px = px / 10;
          py = py / 10;
        }
        if (Math.abs(px) > 50000) {
          px = px / 10;
          py = py / 10;
          pz = pz / 10;
        }
        
        zValues[i] = pz;
        radialValues[i] = Math.sqrt(px * px + py * py);
      }

      zValues.sort((a, b) => a - b);
      radialValues.sort((a, b) => a - b);

      cachedPercentiles = {
        zLow: zValues[Math.floor(zValues.length * 0.25)],
        zHigh: zValues[Math.floor(zValues.length * 0.75)],
        radialHigh: radialValues[Math.floor(radialValues.length * 0.75)],
      };
      lastPointsLength = allPoints.length;
      
      console.log(`🔧 Furnace section thresholds (from working logic):`, {
        screedMax: `${cachedPercentiles.zLow.toFixed(1)}cm`,
        brickRange: `${cachedPercentiles.zLow.toFixed(1)}cm to ${cachedPercentiles.zHigh.toFixed(1)}cm`,
        slagLineMin: `${cachedPercentiles.zHigh.toFixed(1)}cm`,
        radialThreshold: `${cachedPercentiles.radialHigh.toFixed(1)}cm`
      });
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

    // Fallback for smaller datasets (adjusted for cm like in working code)
    if (z < -150) return "Screed";    // Bottom section
    if (distanceFromCenter > 300 || z > 200) return "Slag Line";  // Outer/upper section
    return "Bricks";  // Middle section
  };
})();

const samplePoints = (points, maxPoints) => {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
};

// 🔧 FIXED: 2D projection handling both data formats correctly
// 🔧 FIXED: 2D projection handling both data formats correctl y
// Enhanced 2D projection function with distinct viewing angles
// 🔧 FIXED: Enhanced 2D projection with proper centering for Slag Line
const mapPointTo2D = (point, canvasWidth, canvasHeight, activeScreen, allPoints = []) => {
  let x, y, z, thickness;
  
  // Handle different point formats
  if (point.position) {
    [x, y, z] = point.position;
    thickness = point.thickness;
  } else if (point.X !== undefined && point.Y !== undefined && point.Z !== undefined) {
    x = point.X;
    y = point.Y;
    z = point.Z;
    thickness = point.Reflectivity || point.thickness;
  } else if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
    x = point.x;
    y = point.y;
    z = point.z;
    thickness = point.thickness;
  } else if (Array.isArray(point) && point.length >= 4) {
    x = point[1];
    y = point[2];
    z = point[3];
    thickness = point[4];
  } else {
    console.warn("⚠️ Unknown point format in mapPointTo2D:", point);
    return { x: 0, y: 0, originalPoint: point, section: "Unknown", radius: 0, angle: 0, z: 0 };
  }
  
  // Convert to numbers
  x = Number(x) || 0;
  y = Number(y) || 0;
  z = Number(z) || 0;
  thickness = Number(thickness) || 0;
  
  // Handle coordinate scaling using the working logic
  if (Math.abs(x) > 10000 || Math.abs(y) > 10000) {
    x = x / 10; 
    y = y / 10;
  }
  
  if (Math.abs(x) > 50000 || Math.abs(y) > 50000) {
    x = x / 10; 
    y = y / 10; 
    z = z / 10; 
  }
  
  // Map to canvas coordinates with margins
  const margin = 20;
  const usableWidth = canvasWidth - (margin * 2);
  const usableHeight = canvasHeight - (margin * 2);
  
  let mappedX, mappedY;
  
  // 🎯 DIFFERENT VIEWING ANGLES BASED ON SELECTED SCREEN:
  if (activeScreen === "Screed") {
    // 👁️ TOP/BOTTOM VIEW for Screed - looking down at furnace floor
    
    let xMin = x, xMax = x, yMin = y, yMax = y;
    
    // Calculate bounds from all available points for proper centering
    if (allPoints && allPoints.length > 0) {
      const sampleSize = Math.min(allPoints.length, 1000); // Sample for performance
      const step = Math.ceil(allPoints.length / sampleSize);
      
      for (let i = 0; i < allPoints.length; i += step) {
        const p = allPoints[i];
        let px, py;
        
        // Handle different point formats for bounds calculation
        if (p.position) {
          [px, py] = p.position;
        } else if (p.X !== undefined) {
          px = p.X;
          py = p.Y;
        } else if (p.x !== undefined) {
          px = p.x;
          py = p.y;
        } else if (Array.isArray(p) && p.length >= 4) {
          px = p[1];
          py = p[2];
        } else {
          continue;
        }
        
        px = Number(px) || 0;
        py = Number(py) || 0;
        
        // Apply same scaling logic
        if (Math.abs(px) > 10000) {
          px = px / 10;
          py = py / 10;
        }
        if (Math.abs(px) > 50000) {
          px = px / 10;
          py = py / 10;
        }
        
        xMin = Math.min(xMin, px);
        xMax = Math.max(xMax, px);
        yMin = Math.min(yMin, py);
        yMax = Math.max(yMax, py);
      }
    }
    
    // Use actual data bounds with padding for proper centering
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const padding = Math.max(xRange, yRange) * 0.1; // 10% padding
    
    // Center the data properly
    const xCenter = (xMin + xMax) / 2;
    const yCenter = (yMin + yMax) / 2;
    const maxRange = Math.max(xRange, yRange) + padding * 2;
    
    // Map coordinates to center them properly in the canvas
    mappedX = margin + ((x - xCenter + maxRange/2) / maxRange) * usableWidth;
    mappedY = margin + ((y - yCenter + maxRange/2) / maxRange) * usableHeight;
    
  } else if (activeScreen === "Bricks" || activeScreen === "Slag Line") {
    // 👁️ SIDE VIEW for Bricks and Slag Line - FURNACE CROSS-SECTION
    
    // Calculate radial distance from center (furnace radius)
    const radialDistance = Math.sqrt(x * x + y * y);
    
    // 🔧 FIXED: Get Z bounds from ALL points, not just current section
    let zMin = z, zMax = z;
    let maxRadial = radialDistance;
    
    if (allPoints && allPoints.length > 0) {
      const sampleSize = Math.min(allPoints.length, 2000); // Larger sample for better bounds
      const step = Math.ceil(allPoints.length / sampleSize);
      
      for (let i = 0; i < allPoints.length; i += step) {
        const p = allPoints[i];
        let px, py, pz;
        
        if (p.position) {
          [px, py, pz] = p.position;
        } else if (p.X !== undefined) {
          px = p.X;
          py = p.Y;
          pz = p.Z;
        } else if (p.x !== undefined) {
          px = p.x;
          py = p.y;
          pz = p.z;
        } else if (Array.isArray(p) && p.length >= 4) {
          px = p[1];
          py = p[2];
          pz = p[3];
        } else {
          continue;
        }
        
        px = Number(px) || 0;
        py = Number(py) || 0;
        pz = Number(pz) || 0;
        
        // Apply scaling
        if (Math.abs(px) > 10000) {
          px = px / 10;
          py = py / 10;
        }
        if (Math.abs(px) > 50000) {
          px = px / 10;
          py = py / 10;
          pz = pz / 10;
        }
        
        zMin = Math.min(zMin, pz);
        zMax = Math.max(zMax, pz);
        
        const pRadial = Math.sqrt(px * px + py * py);
        maxRadial = Math.max(maxRadial, pRadial);
      }
    }
    
    // 🔧 FIXED: Proper furnace cross-section mapping with better centering
    
    // X-axis: Radial position (center to wall)
    const normalizedRadial = maxRadial > 0 ? radialDistance / maxRadial : 0;
    mappedX = margin + normalizedRadial * usableWidth;
    
    // 🔧 CRITICAL FIX: Section-specific Z-range mapping for proper centering
    let sectionZMin, sectionZMax, sectionNormalizedZ;
    
    if (activeScreen === "Slag Line") {
      // 🔧 SLAG LINE SPECIFIC: Calculate Z bounds only for slag line points
      sectionZMin = zMin;
      sectionZMax = zMax;
      
      // Get slag line specific Z bounds from all points
      if (allPoints && allPoints.length > 0) {
        const slagLinePoints = [];
        const sampleSize = Math.min(allPoints.length, 3000);
        const step = Math.ceil(allPoints.length / sampleSize);
        
        for (let i = 0; i < allPoints.length; i += step) {
          const p = allPoints[i];
          const detectedSection = detectPointSectionEnhanced(p, allPoints);
          
          if (detectedSection === "Slag Line") {
            let pz;
            if (p.position) {
              pz = p.position[2];
            } else if (p.Z !== undefined) {
              pz = p.Z;
            } else if (p.z !== undefined) {
              pz = p.z;
            } else if (Array.isArray(p) && p.length >= 4) {
              pz = p[3];
            }
            
            if (pz !== undefined) {
              pz = Number(pz) || 0;
              if (Math.abs(pz) > 50000) pz = pz / 10;
              slagLinePoints.push(pz);
            }
          }
        }
        
        if (slagLinePoints.length > 0) {
          sectionZMin = Math.min(...slagLinePoints);
          sectionZMax = Math.max(...slagLinePoints);
          console.log(`🔧 Slag Line Z bounds: ${sectionZMin.toFixed(1)} to ${sectionZMax.toFixed(1)} (${slagLinePoints.length} points)`);
        }
      }
      
      // Calculate normalized Z for slag line section only
      const sectionZRange = sectionZMax - sectionZMin;
      if (sectionZRange > 0) {
        sectionNormalizedZ = (z - sectionZMin) / sectionZRange;
      } else {
        sectionNormalizedZ = 0.5;
      }
      
      // 🔧 CENTER THE SLAG LINE: Use section-specific bounds for proper centering
      const verticalPadding = 0.2; // 20% padding for better visibility
      const paddedHeight = usableHeight * (1 - 2 * verticalPadding);
      const yOffset = usableHeight * verticalPadding;
      
      // Map using slag line specific Z range - higher Z at top
      mappedY = margin + yOffset + (1 - sectionNormalizedZ) * paddedHeight;
      
    } else if (activeScreen === "Bricks") {
      // 🔧 BRICKS SPECIFIC: Calculate Z bounds only for brick points
      sectionZMin = zMin;
      sectionZMax = zMax;
      
      if (allPoints && allPoints.length > 0) {
        const brickPoints = [];
        const sampleSize = Math.min(allPoints.length, 3000);
        const step = Math.ceil(allPoints.length / sampleSize);
        
        for (let i = 0; i < allPoints.length; i += step) {
          const p = allPoints[i];
          const detectedSection = detectPointSectionEnhanced(p, allPoints);
          
          if (detectedSection === "Bricks") {
            let pz;
            if (p.position) {
              pz = p.position[2];
            } else if (p.Z !== undefined) {
              pz = p.Z;
            } else if (p.z !== undefined) {
              pz = p.z;
            } else if (Array.isArray(p) && p.length >= 4) {
              pz = p[3];
            }
            
            if (pz !== undefined) {
              pz = Number(pz) || 0;
              if (Math.abs(pz) > 50000) pz = pz / 10;
              brickPoints.push(pz);
            }
          }
        }
        
        if (brickPoints.length > 0) {
          sectionZMin = Math.min(...brickPoints);
          sectionZMax = Math.max(...brickPoints);
        }
      }
      
      const sectionZRange = sectionZMax - sectionZMin;
      if (sectionZRange > 0) {
        sectionNormalizedZ = (z - sectionZMin) / sectionZRange;
      } else {
        sectionNormalizedZ = 0.5;
      }
      
      const verticalPadding = 0.15;
      const paddedHeight = usableHeight * (1 - 2 * verticalPadding);
      const yOffset = usableHeight * verticalPadding;
      
      mappedY = margin + yOffset + (1 - sectionNormalizedZ) * paddedHeight;
    }
    
    // Debug logging for section-specific positioning
    if ((activeScreen === "Slag Line" || activeScreen === "Bricks") && Math.random() < 0.001) {
      console.log(`🔧 ${activeScreen} positioning: z=${z.toFixed(1)}, sectionZ(${sectionZMin.toFixed(1)},${sectionZMax.toFixed(1)}), sectionNormZ=${sectionNormalizedZ.toFixed(3)}, mappedY=${mappedY.toFixed(1)}, canvas=${canvasHeight}`);
    }
    
  } else {
    // Fallback - should not reach here
    mappedX = margin + (x / 1000) * usableWidth;
    mappedY = margin + (y / 1000) * usableHeight;
  }
  
  return {
    x: Math.max(margin, Math.min(canvasWidth - margin, mappedX)),
    y: Math.max(margin, Math.min(canvasHeight - margin, mappedY)),
    originalPoint: point,
    section: detectPointSectionEnhanced(point),
    radius: Math.sqrt(x * x + y * y),
    angle: Math.atan2(y, x),
    z: z,
    thickness: thickness
  };
};


// 🔧 FIXED: Enhanced point processing that handles both formats correctly
const processPointData = (rawPoints) => {
  if (!rawPoints || !Array.isArray(rawPoints)) {
    console.warn("⚠️ Invalid point data provided");
    return [];
  }

  const processedPoints = [];
  
  for (let i = 0; i < rawPoints.length; i++) {
    const rawPoint = rawPoints[i];
    let processedPoint = {};
    
    if (rawPoint.position) {
      // Format with position array
      processedPoint = {
        position: rawPoint.position,
        thickness: rawPoint.thickness,
        ...rawPoint
      };
    } else if (rawPoint.x !== undefined) {
      // Format with named properties (header format)
      processedPoint = {
        x: rawPoint.x,
        y: rawPoint.y,
        z: rawPoint.z,
        thickness: rawPoint.thickness,
        ...rawPoint
      };
    } else if (Array.isArray(rawPoint) && rawPoint.length >= 4) {
      // Headerless format: [unknown, x, y, z, thickness]
      const x = Number(rawPoint[1]) || 0;
      const y = Number(rawPoint[2]) || 0;
      const z = Number(rawPoint[3]) || 0;
      const thickness = Number(rawPoint[4]) || 0;
      
      processedPoint = {
        x: x,
        y: y,
        z: z,
        thickness: thickness,
        rawIndex: i,
        originalData: rawPoint,
        // Add position array for consistency
        position: [x, y, z]
      };
      
      if (i < 5) { // Log first few points for debugging
        console.log(`📊 Processed headerless point ${i}: (${x}, ${y}, ${z}, thickness: ${thickness})`);
      }
    } else {
      console.warn(`⚠️ Skipping invalid point at index ${i}:`, rawPoint);
      continue;
    }
    
    processedPoints.push(processedPoint);
  }
  
  console.log(`✅ Processed ${processedPoints.length} points from ${rawPoints.length} raw points`);
  return processedPoints;
};

const GunningScreen = ({
  files,
  fileDataCache,
  selectedFile,
  selectedFurnace,
  isUiDisabled,
  onDataUpdate,
  onCaptureScreenshot,
  currentGunningData,
}) => {
  const [activeScreen, setActiveScreen] = useState("Bricks");
  const [parameters, setParameters] = useState({
    repairMaterial: "Gunnimag C2",
    wearThreshold: 20,
    distanceBetweenAreas: 0.25,
    minimumAreaSize: 100,
  });

  const { t } = useTranslation();

  const [processingState, setProcessingState] = useState({
    isProcessing: false,
    showNoDataDialog: false,
    visualizationMode: "all",
  });

  const canvasRef = useRef(null);
  const proposalCanvasRef = useRef(null);

  const currentSectionData = useMemo(() => {
    const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
    return currentGunningData?.[sectionKey];
  }, [activeScreen, currentGunningData]);

  const currentFileData = useMemo(() => {
    if (!selectedFile || !fileDataCache?.has(selectedFile.name)) return null;
    const data = fileDataCache.get(selectedFile.name);
    console.log("📊 Points available:", data?.points?.length);
    return data;
  }, [selectedFile, fileDataCache]);

  const { processedPoints, sectionCounts, allPointsWithSections } = useMemo(() => {
    if (!currentFileData?.points) {
      console.log("❌ No points available for processing");
      return { 
        processedPoints: [], 
        sectionCounts: {}, 
        allPointsWithSections: []
      };
    }

    const startTime = performance.now();
    const sampledPoints = samplePoints(currentFileData.points, MAX_SAMPLE_POINTS);
    console.log(`📊 Sampled ${sampledPoints.length} from ${currentFileData.points.length} points`);

    const pointsWithSections = new Array(sampledPoints.length);
    
    for (let i = 0; i < sampledPoints.length; i++) {
      const detectedSection = detectPointSectionEnhanced(sampledPoints[i], sampledPoints);
      pointsWithSections[i] = {
        ...sampledPoints[i],
        detectedSection
      };
    }

    const filtered = [];
    const counts = { Bricks: 0, "Slag Line": 0, Screed: 0 };

    for (const point of pointsWithSections) {
      counts[point.detectedSection]++;

      const furnaceMatch = !selectedFurnace || !point.furnaceId || point.furnaceId === selectedFurnace.furnace_id;
      if (!furnaceMatch) continue;

      const sectionMatch = point.detectedSection === activeScreen;
      if (sectionMatch) {
        const thicknessFilter = processingState.visualizationMode !== "filtered" || 
          (point.thickness != null && point.thickness <= parameters.wearThreshold);

        if (thicknessFilter) {
          filtered.push(point);
        }
      }
    }

    const endTime = performance.now();
    console.log(`⚡ Processing took ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`✅ Section distribution:`, counts);
    console.log(`✅ Filtered points for ${activeScreen}:`, filtered.length);

    return {
      processedPoints: filtered,
      sectionCounts: counts,
      allPointsWithSections: pointsWithSections
    };
  }, [
    currentFileData,
    selectedFurnace,
    activeScreen,
    processingState.visualizationMode,
    parameters.wearThreshold,
  ]);

  const { wornPoints, repairProposal } = useMemo(() => {
    console.log(`🔄 RECALCULATING WORN POINTS AND REPAIR PROPOSAL for ${activeScreen}`);

    if (!allPointsWithSections || !allPointsWithSections.length) {
      console.log("❌ No points available for calculation");
      return {
        wornPoints: [],
        repairProposal: {
          areas: [],
          total: { volume: 0, weight: 0, cost: 0 },
          parameters: { ...parameters },
        },
      };
    }

    const worn = [];

    for (const point of allPointsWithSections) {
      const furnaceMatch = !selectedFurnace || !point.furnaceId || point.furnaceId === selectedFurnace.furnace_id;
      const sectionMatch = point.detectedSection === activeScreen;
      const isWorn = point.thickness != null && !isNaN(point.thickness) && point.thickness <= parameters.wearThreshold;

      if (furnaceMatch && sectionMatch && isWorn) {
        worn.push(point);
      }
    }

    const finalWornPoints = worn.slice(0, MAX_WORN_POINTS);
    console.log(`🚨 WORN POINTS for ${activeScreen}: ${finalWornPoints.length}`);

    if (!finalWornPoints.length) {
      return {
        wornPoints: finalWornPoints,
        repairProposal: {
          areas: [],
          total: { volume: 0, weight: 0, cost: 0 },
          parameters: { ...parameters },
        },
      };
    }

    // Repair proposal calculation
    const processPoints = finalWornPoints.slice(0, 3000);
    const areas = [];
    const processedIndices = new Set();
    const maxDistance = parameters.distanceBetweenAreas * 1000;

    for (let i = 0; i < processPoints.length; i++) {
      if (processedIndices.has(i)) continue;

      const area = { points: [processPoints[i]] };
      processedIndices.add(i);

      const pos1 = processPoints[i].position || [processPoints[i].x || 0, processPoints[i].y || 0, processPoints[i].z || 0];

      const searchLimit = Math.min(i + 500, processPoints.length);
      for (let j = i + 1; j < searchLimit; j++) {
        if (processedIndices.has(j)) continue;

        const pos2 = processPoints[j].position || [processPoints[j].x || 0, processPoints[j].y || 0, processPoints[j].z || 0];

        const distance = Math.sqrt(
          (pos1[0] - pos2[0]) ** 2 +
          (pos1[1] - pos2[1]) ** 2 +
          (pos1[2] - pos2[2]) ** 2
        );

        if (distance <= maxDistance) {
          area.points.push(processPoints[j]);
          processedIndices.add(j);
        }
      }

      if (area.points.length >= parameters.minimumAreaSize) {
        areas.push(area);
      }
    }

    const processedAreas = areas.map((area, index) => {
      const wearDepths = area.points.map((p) => Math.max(0, parameters.wearThreshold - (p.thickness || 0)));
      const avgWearDepth = wearDepths.reduce((sum, depth) => sum + depth, 0) / wearDepths.length;

      const pointDensity = 1000;
      const areaSize = Math.max(0.001, area.points.length / pointDensity);
      const volume = areaSize * (avgWearDepth / 100);
      const weight = volume * MATERIAL_DENSITY * 1000;
      const cost = weight * 2.5;

      return {
        id: index + 1,
        volume: Math.max(0.001, volume),
        weight: Math.max(0.1, weight),
        cost: cost,
        pointCount: area.points.length,
        avgWear: avgWearDepth,
        areaSize: areaSize,
        material: parameters.repairMaterial,
      };
    });

    const totalVolume = processedAreas.reduce((sum, area) => sum + area.volume, 0);
    const totalWeight = processedAreas.reduce((sum, area) => sum + area.weight, 0);
    const totalCost = processedAreas.reduce((sum, area) => sum + area.cost, 0);

    const proposal = {
      areas: processedAreas,
      total: {
        volume: totalVolume,
        weight: totalWeight,
        cost: totalCost,
        material: parameters.repairMaterial,
      },
      parameters: {
        ...parameters,
        timestamp: Date.now(),
      },
    };

    return {
      wornPoints: finalWornPoints,
      repairProposal: proposal,
    };
  }, [
    allPointsWithSections,
    selectedFurnace,
    activeScreen,
    parameters
  ]);

  // 🔧 Simple 2D furnace visualization without section divisions - like old code

// Update the drawing function to pass allPoints to mapPointTo2D
// 🔧 PROFESSIONAL: Clean, realistic furnace visualization matching LidarVisualizer quality
// 🔧 PROFESSIONAL: Clean, realistic furnace visualization matching LidarVisualizer quality
const draw2DFurnaceLayout = useCallback((canvas, isProposal = false) => {
  if (!canvas) {
    console.warn("❌ Canvas not available for drawing");
    return;
  }

  console.log(`🎨 Drawing professional 2D furnace - Active: ${activeScreen}, Proposal: ${isProposal}`);

  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  
  // Set canvas size with high DPI support like LidarVisualizer
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  
  // Clean black background for maximum contrast
  ctx.fillStyle = "#000000"; // Pure black background
  ctx.fillRect(0, 0, width, height);

  const margin = 25; // Professional spacing
  const furnaceWidth = width - (margin * 2);
  const furnaceHeight = height - (margin * 2);

  // Check if data is available
  if (!allPointsWithSections || allPointsWithSections.length === 0) {
    // Clean loading state
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No furnace data available", width / 2, height / 2);
    ctx.fillStyle = "#CCCCCC";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillText(`Loading ${activeScreen} analysis...`, width / 2, height / 2 + 25);
    return;
  }

  // 🔧 HIGH-DENSITY: More points for realistic density
  const maxPoints = Math.min(30000, allPointsWithSections.length);
  const sampledPoints = samplePoints(allPointsWithSections, maxPoints);
  
  console.log(`🎨 Rendering ${sampledPoints.length} tiny points for ${activeScreen}`);

  // 🔧 SECTION-SPECIFIC FILTERING: Only show points relevant to active screen + zoom in
  const filteredPoints = [];
  const activeScreenPoints = [];
  const otherSectionPoints = [];

  sampledPoints.forEach((point) => {
    const mapped2D = mapPointTo2D(point, width, height, activeScreen, allPointsWithSections);
    
    // Skip points outside visible area
    if (mapped2D.x < margin || mapped2D.x > width - margin || 
        mapped2D.y < margin || mapped2D.y > height - margin) {
      return;
    }
    
    const thickness = point.thickness || 0;
    const threshold = parameters.wearThreshold;
    const isWorn = thickness > 0 && thickness <= threshold;
    
    // 🔧 FIXED: Use the enhanced section detection for headerless CSV
    const pointSection = point.detectedSection || detectPointSectionEnhanced(point, allPointsWithSections);
    const isActiveScreenPoint = pointSection === activeScreen;
    
    const pointData = { 
      ...mapped2D, 
      thickness, 
      isWorn, 
      isActiveScreenPoint, 
      pointSection 
    };
    
    if (isActiveScreenPoint) {
      activeScreenPoints.push(pointData);
    } else {
      otherSectionPoints.push(pointData);
    }
  });

  // 🔧 ZOOM CALCULATION: Calculate bounds for active screen points only
  let zoomBounds = null;
  if (activeScreenPoints.length > 0) {
    let minX = activeScreenPoints[0].x;
    let maxX = activeScreenPoints[0].x;
    let minY = activeScreenPoints[0].y;
    let maxY = activeScreenPoints[0].y;
    
    activeScreenPoints.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    
    // Add padding around the bounds
    const paddingX = (maxX - minX) * 0.2; // 20% padding
    const paddingY = (maxY - minY) * 0.2;
    
    zoomBounds = {
      minX: Math.max(margin, minX - paddingX),
      maxX: Math.min(width - margin, maxX + paddingX),
      minY: Math.max(margin, minY - paddingY),
      maxY: Math.min(height - margin, maxY + paddingY),
      width: maxX - minX + (paddingX * 2),
      height: maxY - minY + (paddingY * 2)
    };
  }

  // 🔧 ZOOM TRANSFORMATION: Apply zoom to focus on active section
  const applyZoomToPoint = (point) => {
    if (!zoomBounds) return point;
    
    // Scale factor to zoom into the section
    const scaleX = furnaceWidth / Math.max(zoomBounds.width, 100); // Minimum width to prevent over-zoom
    const scaleY = furnaceHeight / Math.max(zoomBounds.height, 100);
    const scale = Math.min(scaleX, scaleY, 3.0); // Maximum 3x zoom
    
    // Center the zoomed area
    const centerX = margin + furnaceWidth / 2;
    const centerY = margin + furnaceHeight / 2;
    const boundsCenterX = zoomBounds.minX + zoomBounds.width / 2;
    const boundsCenterY = zoomBounds.minY + zoomBounds.height / 2;
    
    return {
      ...point,
      x: centerX + (point.x - boundsCenterX) * scale,
      y: centerY + (point.y - boundsCenterY) * scale
    };
  };

  // Apply zoom transformation to all points
  const zoomedActivePoints = activeScreenPoints.map(applyZoomToPoint);
  const zoomedOtherPoints = otherSectionPoints.map(applyZoomToPoint);

  // Filter out points that are now outside the visible area after zoom
  const visibleActivePoints = zoomedActivePoints.filter(point => 
    point.x >= margin && point.x <= width - margin && 
    point.y >= margin && point.y <= height - margin
  );
  
  const visibleOtherPoints = zoomedOtherPoints.filter(point => 
    point.x >= margin && point.x <= width - margin && 
    point.y >= margin && point.y <= height - margin
  );

  // 🔧 CATEGORIZE ACTIVE SECTION POINTS: Only the active screen points get detailed categorization
  const pointCategories = {
    background: visibleOtherPoints, // All other sections - minimal visibility
    healthy: [],    // Active section healthy - bright green
    worn: [],       // Active section worn - red
    critical: []    // Severely worn - bright red
  };

  // Categorize only the active screen points for detailed visualization
  visibleActivePoints.forEach((point) => {
    if (point.isWorn) {
      // Further categorize worn points by severity
      if (point.thickness > 0 && point.thickness <= parameters.wearThreshold * 0.5) {
        pointCategories.critical.push(point); // Very worn
      } else {
        pointCategories.worn.push(point); // Moderately worn
      }
    } else {
      pointCategories.healthy.push(point);
    }
  });

  console.log(`🎯 ZOOMED VIEW (headerless CSV): ${activeScreen} - Active: ${visibleActivePoints.length}, Other: ${visibleOtherPoints.length}`);

  // 🔧 SIMPLE OUTLINE: Draw furnace outline
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 1;
  ctx.strokeRect(margin, margin, furnaceWidth, furnaceHeight);

  // 🔧 ZOOM INDICATOR: Draw zoom bounds outline
  if (zoomBounds && zoomBounds.width > 50 && zoomBounds.height > 50) {
    ctx.strokeStyle = SCREEN_CONFIGS[activeScreen].color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(margin, margin, furnaceWidth, furnaceHeight);
    ctx.globalAlpha = 1.0;
  }

  // 🔧 SECTION-FOCUSED RENDERING: Render with section-specific zoom and colors
  
  // 1. Background sections (other furnace parts) - very faint gray
  if (pointCategories.background.length > 0) {
    ctx.fillStyle = "#404040"; // Dark gray
    ctx.globalAlpha = 0.05; // Very faint - almost invisible
    pointCategories.background.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.2, 0, 2 * Math.PI); // Ultra tiny
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  // 2. Active section healthy areas - BRIGHT GREEN for selected section
  if (pointCategories.healthy.length > 0) {
    ctx.fillStyle = isProposal ? "#666666" : "#00FF00"; // Bright green for active section
    ctx.globalAlpha = isProposal ? 0.6 : 1.0; // Full opacity for analysis view
    pointCategories.healthy.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.8, 0, 2 * Math.PI); // Larger points for active section
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }

  // 3. Active section worn areas - BRIGHT RED for selected section
  if (pointCategories.worn.length > 0) {
    ctx.fillStyle = "#FF3333"; // Bright red for worn areas
    ctx.globalAlpha = 1.0;
    pointCategories.worn.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.0, 0, 2 * Math.PI); // Larger for visibility
      ctx.fill();
    });
  }

  // 4. Active section critical areas - PURE RED, most prominent
  if (pointCategories.critical.length > 0) {
    ctx.fillStyle = "#FF0000"; // Pure red for critical areas
    ctx.globalAlpha = 1.0;
    pointCategories.critical.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.2, 0, 2 * Math.PI); // Largest for critical areas
      ctx.fill();
      
      // Add subtle glow for critical areas in active section
      if (!isProposal) {
        ctx.fillStyle = "#FF6666";
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#FF0000"; // Reset color
        ctx.globalAlpha = 1.0;
      }
    });
  }

  // 🔧 CLEAN LABELING: Professional typography with high contrast
  
  // Professional font
  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  
  // Title - bright white on black with zoom indicator
  ctx.fillStyle = "#FFFFFF"; // Pure white
  ctx.font = `bold 13px ${fontFamily}`;
  ctx.textAlign = "center";
  const title = `${activeScreen.toUpperCase()} ${isProposal ? "REPAIR ANALYSIS" : "CONDITION ASSESSMENT"} - ZOOMED VIEW`;
  ctx.fillText(title, width / 2, margin - 30);

  // View type indicator - bright yellow with zoom info
  ctx.fillStyle = "#FFFF00"; // Bright yellow
  ctx.font = `11px ${fontFamily}`;
  let viewType = "";
  if (activeScreen === "Screed") {
    viewType = "TOP VIEW - FOCUSED ON SCREED SECTION";
  } else if (activeScreen === "Bricks") {
    viewType = "CROSS SECTION - FOCUSED ON BRICK SECTION";
  } else {
    viewType = "UPPER VIEW - FOCUSED ON SLAG LINE SECTION";
  }
  ctx.fillText(`${viewType}`, width / 2, margin - 15);

  // Section color indicator
  ctx.fillStyle = SCREEN_CONFIGS[activeScreen].color;
  ctx.font = `10px ${fontFamily}`;
  ctx.fillText(`● ${activeScreen.toUpperCase()} SECTION HIGHLIGHTED ●`, width / 2, margin - 5);

  // Panel numbering - light gray
  ctx.fillStyle = "#CCCCCC";
  ctx.font = `9px ${fontFamily}`;
  ctx.textAlign = "center";
  const panelWidth = furnaceWidth / FURNACE_2D_CONFIG.panels.count;
  
  for (let i = 0; i < FURNACE_2D_CONFIG.panels.count; i++) {
    const x = margin + (i * panelWidth) + (panelWidth / 2);
    ctx.fillText(`P${i + 1}`, x, margin - 5);
  }

  // 🔧 SECTION-FOCUSED STATISTICS: Statistics for the active section only
  const totalActivePoints = pointCategories.healthy.length + 
                           pointCategories.worn.length + 
                           pointCategories.critical.length;
  const wornCount = pointCategories.worn.length + pointCategories.critical.length;
  const otherSectionsCount = pointCategories.background.length;
  
  // Left side: Active section status - prominent display
  ctx.font = `11px ${fontFamily}`;
  ctx.textAlign = "left";
  
  if (wornCount > 0) {
    // Wear status for active section
    ctx.fillStyle = "#FF4444";
    ctx.fillText(`⚠ ${activeScreen}: ${wornCount} worn areas detected`, margin, height - margin + 15);
    
    // Percentage for active section
    const wearPercentage = totalActivePoints > 0 ? 
      ((wornCount / totalActivePoints) * 100).toFixed(1) : "0.0";
    ctx.fillStyle = "#FF8800";
    ctx.fillText(`${wearPercentage}% of ${activeScreen} section affected`, margin, height - margin + 28);
    
    // Critical areas in active section
    if (pointCategories.critical.length > 0) {
      ctx.fillStyle = "#FF0000";
      ctx.fillText(`${pointCategories.critical.length} critical ${activeScreen} areas`, margin, height - margin + 41);
    }
  } else {
    ctx.fillStyle = "#00FF00"; // Bright green
    ctx.fillText(`✓ ${activeScreen} section healthy`, margin, height - margin + 15);
    ctx.fillStyle = "#CCCCCC";
    ctx.fillText(`${totalActivePoints} points analyzed in ${activeScreen}`, margin, height - margin + 28);
  }

  // Show other sections count
  ctx.fillStyle = "#808080";
  ctx.font = `9px ${fontFamily}`;
  ctx.fillText(`${otherSectionsCount} points in other sections (dimmed)`, margin, height - margin + 54);

  // Right side: Technical details - white text
  ctx.font = `9px ${fontFamily}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(
    `${totalActivePoints} ${activeScreen} points analyzed`,
    width - margin,
    height - margin + 15
  );
  ctx.fillText(
    `${parameters.wearThreshold}cm threshold`,
    width - margin,
    height - margin + 28
  );
  
  // Zoom level indicator
  ctx.fillStyle = SCREEN_CONFIGS[activeScreen].color;
  ctx.fillText(
    `ZOOMED: ${activeScreen} SECTION`,
    width - margin,
    height - margin + 41
  );

  // 🔧 COORDINATE INDICATORS: Clean compass/height markers
  ctx.fillStyle = "#AAAAAA"; // Light gray
  ctx.font = `8px ${fontFamily}`;
  
  if (activeScreen === "Screed") {
    // Compass for top view
    ctx.textAlign = "center";
    ctx.fillText("N", width / 2, margin + 12);
    ctx.fillText("S", width / 2, height - margin - 5);
    
    ctx.save();
    ctx.translate(margin + 12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("W", 0, 0);
    ctx.restore();
    
    ctx.save();
    ctx.translate(width - margin - 12, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText("E", 0, 0);
    ctx.restore();
  } else {
    // Height markers for cross-section
    ctx.textAlign = "right";
    ctx.fillText("TOP", margin - 8, margin + 15);
    ctx.fillText("BOTTOM", margin - 8, height - margin - 10);
    
    ctx.textAlign = "center";
    ctx.fillText("CENTER", width / 2, height - margin - 25);
    ctx.fillText("WALL", width - margin - 25, height - margin - 25);
  }

  // 🔧 SECTION-SPECIFIC LEGEND: Focused legend for active section
  const legendX = width - margin - 110;
  const legendY = margin + 20;
  
  // Legend background with section color accent
  ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
  ctx.fillRect(legendX - 5, legendY - 15, 105, 70);
  
  // Section color accent border
  ctx.strokeStyle = SCREEN_CONFIGS[activeScreen].color;
  ctx.lineWidth = 2;
  ctx.strokeRect(legendX - 5, legendY - 15, 105, 70);
  
  // Legend title with section name
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 9px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(`${activeScreen.toUpperCase()} LEGEND`, legendX, legendY);

  ctx.font = `8px ${fontFamily}`;
  
  // Healthy indicator for active section
  ctx.fillStyle = isProposal ? "#666666" : "#00FF00";
  ctx.beginPath();
  ctx.arc(legendX + 5, legendY + 12, 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`${activeScreen} Healthy`, legendX + 12, legendY + 15);

  // Worn indicator for active section
  ctx.fillStyle = "#FF3333";
  ctx.beginPath();
  ctx.arc(legendX + 5, legendY + 25, 2, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`${activeScreen} Worn`, legendX + 12, legendY + 28);

  // Critical indicator for active section
  ctx.fillStyle = "#FF0000";
  ctx.beginPath();
  ctx.arc(legendX + 5, legendY + 38, 2.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`${activeScreen} Critical`, legendX + 12, legendY + 41);

  // Other sections indicator
  ctx.fillStyle = "#404040";
  ctx.beginPath();
  ctx.arc(legendX + 5, legendY + 51, 1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "#AAAAAA";
  ctx.fillText("Other Sections", legendX + 12, legendY + 54);

}, [activeScreen, parameters.wearThreshold, allPointsWithSections]);


  // Update canvases when data changes
  useEffect(() => {
    if (canvasRef.current) {
      console.log("🎨 Updating main furnace canvas");
      draw2DFurnaceLayout(canvasRef.current, false);
    }
  }, [draw2DFurnaceLayout, allPointsWithSections, processedPoints]);

  useEffect(() => {
    if (proposalCanvasRef.current) {
      console.log("🎨 Updating proposal furnace canvas");
      draw2DFurnaceLayout(proposalCanvasRef.current, true);
    }
  }, [draw2DFurnaceLayout, wornPoints]);

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        if (canvasRef.current) draw2DFurnaceLayout(canvasRef.current, false);
        if (proposalCanvasRef.current) draw2DFurnaceLayout(proposalCanvasRef.current, true);
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw2DFurnaceLayout]);

  // Helper functions
  const captureCurrentScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('❌ Canvas not available for screenshot');
      return null;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      console.log('✅ Screenshot captured successfully');
      return {
        dataUrl,
        filename: `${activeScreen.toLowerCase()}_furnace_analysis_${Date.now()}.png`,
        timestamp: Date.now(),
        section: activeScreen
      };
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      return null;
    }
  }, [activeScreen]);

  const handleParameterChange = useCallback((param, value) => {
    console.log(`🔧 Parameter changing: ${param} = ${value}`);
    setParameters((prev) => {
      const newParams = { ...prev, [param]: value };
      console.log("🔄 New parameters:", newParams);
      return newParams;
    });
  }, []);

  const handleAcceptParameters = useCallback(() => {
    console.log("✅ Parameters accepted and applied:", parameters);

    const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
    const captureData = {
      section: activeScreen,
      parameters: { ...parameters },
      repairProposal: { ...repairProposal },
      wornPoints: [...wornPoints],
      processedPoints: [...processedPoints],
      sectionCounts: { ...sectionCounts },
      timestamp: Date.now(),
      fileInfo: {
        name: selectedFile?.name || 'unknown',
        furnace: selectedFurnace?.furnace_id || 'unknown'
      }
    };

    let screenshot = null;
    if (onCaptureScreenshot && canvasRef.current) {
      screenshot = onCaptureScreenshot(canvasRef, `${activeScreen.toLowerCase()}_analysis`);
    } else {
      screenshot = captureCurrentScreenshot();
    }

    if (onDataUpdate) {
      onDataUpdate(sectionKey, captureData, screenshot);
      console.log(`📊 Data sent to parent for ${activeScreen}:`, sectionKey);
    }

    alert(`✅ Parameters Applied & Data Captured for ${activeScreen}!`);
  }, [
    parameters,
    activeScreen,
    repairProposal,
    wornPoints,
    processedPoints,
    sectionCounts,
    selectedFile,
    selectedFurnace,
    onDataUpdate,
    onCaptureScreenshot,
    captureCurrentScreenshot
  ]);

  const handleScreenSwitchWithAutoSave = useCallback((newScreen) => {
    if (repairProposal.areas.length > 0 && onDataUpdate) {
      const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
      const autoSaveData = {
        section: activeScreen,
        parameters: { ...parameters },
        repairProposal: { ...repairProposal },
        wornPoints: [...wornPoints],
        processedPoints: [...processedPoints],
        sectionCounts: { ...sectionCounts },
        timestamp: Date.now(),
        autoSaved: true,
        fileInfo: {
          name: selectedFile?.name || 'unknown',
          furnace: selectedFurnace?.furnace_id || 'unknown'
        }
      };

      const screenshot = captureCurrentScreenshot();
      onDataUpdate(sectionKey, autoSaveData, screenshot);
      console.log(`🔄 Auto-saved data for ${activeScreen} before switching to ${newScreen}`);
    }

    setActiveScreen(newScreen);
  }, [
    activeScreen,
    parameters,
    repairProposal,
    wornPoints,
    processedPoints,
    sectionCounts,
    selectedFile,
    selectedFurnace,
    onDataUpdate,
    captureCurrentScreenshot
  ]);

  const screenSwitchButtons = useMemo(() => 
    Object.keys(SCREEN_CONFIGS).map((screen) => (
      <button
        key={screen}
        onClick={() => handleScreenSwitchWithAutoSave(screen)}
        style={{
          backgroundColor: activeScreen === screen ? SCREEN_CONFIGS[screen].color : "#555",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "6px 12px",
          cursor: isUiDisabled ? "not-allowed" : "pointer",
          fontSize: "11px",
          fontWeight: "500",
          position: 'relative'
        }}
        disabled={isUiDisabled}
      >
        {screen}
        {currentGunningData?.[screen === "Slag Line" ? "slagLine" : screen.toLowerCase()] && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '8px',
            height: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            border: '1px solid white'
          }} />
        )}
      </button>
    )),
    [activeScreen, isUiDisabled, handleScreenSwitchWithAutoSave, currentGunningData]
  );

  const incrementValue = useCallback((param, increment) => {
    setParameters((prev) => ({
      ...prev,
      [param]: Math.max(0, prev[param] + increment),
    }));
  }, []);

  const handleVisualizationModeToggle = useCallback(() => {
    setProcessingState((prev) => ({
      ...prev,
      visualizationMode: prev.visualizationMode === "all" ? "filtered" : "all",
    }));
  }, []);

  const currentConfig = SCREEN_CONFIGS[activeScreen];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        maxHeight: "100vh",
        overflowY: "auto",
        backgroundColor: "#f0f0f0",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "10px",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#333",
            color: "white",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span>Screen:</span>
            {screenSwitchButtons}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div>
              File: {selectedFile ? selectedFile.name : "No file selected"} |
              Section: {activeScreen} |
              Points: {processedPoints.length} | 
              Worn: {wornPoints.length} |
              Areas: {repairProposal.areas.length}
              {processingState.isProcessing && <span style={{ color: "#ffaa00" }}> | Processing...</span>}
            </div>
            {currentSectionData && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#10b981",
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "bold"
              }}>
                <div style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "white",
                  borderRadius: "50%"
                }} />
                DATA SAVED
              </div>
            )}
          </div>
        </div>

        {/* Section title */}
        <div
          style={{
            backgroundColor: currentConfig.color,
            color: "white",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          <strong>{currentConfig.title}</strong> - {currentConfig.description}
        </div>

        {/* 2D Furnace Layout Panels */}
        <div style={{ display: "flex", gap: "10px", minHeight: "500px" }}>
          {/* Main 2D Furnace Analysis View */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#1a1a1a",
              border: `2px solid ${currentConfig.color}`,
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
              minHeight: "500px",
              height: "60vh",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.9)",
                color: "white",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "bold",
                zIndex: 1000,
                borderBottom: "1px solid #444"
              }}
            >
              🏭 2D FURNACE LAYOUT - {currentConfig.title}
            </div>

            <div
              style={{
                position: "absolute",
                top: "50px",
                right: "10px",
                zIndex: 1000,
              }}
            >
              <button
                onClick={handleVisualizationModeToggle}
                style={{
                  backgroundColor: processingState.visualizationMode === "filtered" ? "#10B981" : "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: isUiDisabled ? "not-allowed" : "pointer",
                  fontSize: "11px",
                  fontWeight: "500",
                }}
                disabled={isUiDisabled}
              >
                {processingState.visualizationMode === "all" ? "Show Filtered" : "Show All"}
              </button>
            </div>

            <div
              style={{
                position: "absolute",
                top: "85px",
                left: "10px",
                backgroundColor: "rgba(0,0,0,0.8)",
                color: wornPoints.length > 0 ? "#FF4444" : "#10B981",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                zIndex: 1000,
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              {wornPoints.length > 0 ? 
                `${wornPoints.length} points need repair (${activeScreen})` : 
                `No repairs needed (${activeScreen})`}
            </div>

            {/* Updated Legend with viewing angle info */}
            <div
              style={{
                position: "absolute",
                bottom: "40px",
                left: "10px",
                backgroundColor: "rgba(0,0,0,0.9)",
                color: "white",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "10px",
                zIndex: 1000,
                maxWidth: "220px",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                🎨 {activeScreen} View:
              </div>
              <div style={{ fontSize: "9px", color: "#FFFF00", marginBottom: "4px" }}>
                {activeScreen === "Screed" ? "👁️ Top View (Bird's Eye)" : 
                 activeScreen === "Bricks" ? "👁️ Side View (Circumferential)" : 
                 "👁️ Angled View (Upper Section)"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <div style={{ width: "8px", height: "8px", backgroundColor: "#00FF00", borderRadius: "50%" }}></div>
                <span>{activeScreen} (Healthy)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <div style={{ width: "8px", height: "8px", backgroundColor: "#FF0000", borderRadius: "50%" }}></div>
                <span>{activeScreen} (Worn)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div style={{ width: "8px", height: "8px", backgroundColor: "#808080", borderRadius: "50%" }}></div>
                <span>Other Sections</span>
              </div>
            </div>

            <canvas 
              ref={canvasRef} 
              style={{ 
                width: "100%", 
                height: "100%",
                minHeight: "500px",
                cursor: "crosshair"
              }} 
            />
          </div>

          {/* 2D Repair Proposal View */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#1a1a1a",
              border: "2px solid #FF6600",
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
              minHeight: "500px",
              height: "60vh",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(255,102,0,0.9)",
                color: "white",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "bold",
                zIndex: 1000,
                borderBottom: "1px solid #FF6600"
              }}
            >
              🔧 2D GUNITE REPAIR PROPOSAL
            </div>

            <div
              style={{
                position: "absolute",
                top: "85px",
                left: "10px",
                backgroundColor: "rgba(0,0,0,0.8)",
                color: repairProposal.areas.length > 0 ? "#FF4444" : "#10B981",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                zIndex: 1000,
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              {repairProposal.areas.length > 0 ? 
                `${repairProposal.areas.length} Repair Area(s) - ${activeScreen}` : 
                `No Repairs Needed - ${activeScreen}`}
            </div>

            <canvas 
              ref={proposalCanvasRef} 
              style={{ 
                width: "100%", 
                height: "100%",
                minHeight: "500px",
                cursor: "crosshair"
              }} 
            />
          </div>
        </div>

        {/* Control panels */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "100px" }}>
          {/* Settings panel */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#e5e5e5",
              border: "2px solid #ccc",
              borderRadius: "8px",
              padding: "15px",
              overflow: "visible",
              minHeight: "40vh",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                fontWeight: "bold",
                textAlign: "center",
                color: "#333",
              }}
            >
              {activeScreen.toUpperCase()} ANALYSIS SETTINGS
            </h3>

            {currentSectionData && (
              <div style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#d4edda",
                borderRadius: "4px",
                border: "1px solid #c3e6cb"
              }}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#155724",
                  marginBottom: "5px"
                }}>
                  💾 Saved Data for {activeScreen}:
                </div>
                <div style={{ fontSize: "11px", color: "#155724" }}>
                  • Areas: {currentSectionData.repairProposal?.areas?.length || 0}
                  • Cost: ${currentSectionData.repairProposal?.total?.cost?.toFixed(0) || 0}
                  • Saved: {new Date(currentSectionData.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Material selection */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Repair Material:
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #999",
                  borderRadius: "4px",
                  backgroundColor: "white",
                  fontSize: "12px",
                }}
                value={parameters.repairMaterial}
                onChange={(e) => handleParameterChange("repairMaterial", e.target.value)}
                disabled={isUiDisabled}
              >
                <option value="Gunnimag C2">Gunnimag C2</option>
                <option value="Standard Gunite">Standard Gunite</option>
                <option value="High-Density">High-Density</option>
                <option value="Low-Thermal">Low-Thermal</option>
              </select>
            </div>

            {/* Wear threshold */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                {currentConfig.thresholdLabel}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="number"
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    border: "1px solid #999",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    fontSize: "12px",
                  }}
                  value={parameters.wearThreshold}
                  onChange={(e) => handleParameterChange("wearThreshold", Number(e.target.value))}
                  min="0"
                  step="1"
                  disabled={isUiDisabled || processingState.isProcessing}
                />
                <button
                  style={{
                    backgroundColor: "#666",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                  onClick={() => incrementValue("wearThreshold", 1)}
                  disabled={isUiDisabled || processingState.isProcessing}
                >
                  ▲
                </button>
                <button
                  style={{
                    backgroundColor: "#666",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                  onClick={() => incrementValue("wearThreshold", -1)}
                  disabled={isUiDisabled || processingState.isProcessing}
                >
                  ▼
                </button>
                <span style={{ fontSize: "11px", color: "#666", minWidth: "20px" }}>
                  {currentConfig.unit}
                </span>
              </div>
            </div>

            {/* Distance between areas */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Distance Between Areas:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  style={{ flex: 1 }}
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={parameters.distanceBetweenAreas}
                  onChange={(e) => handleParameterChange("distanceBetweenAreas", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
                />
                <input
                  type="number"
                  style={{
                    width: "60px",
                    padding: "4px 6px",
                    border: "1px solid #999",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    fontSize: "11px",
                  }}
                  value={parameters.distanceBetweenAreas}
                  onChange={(e) => handleParameterChange("distanceBetweenAreas", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
                  min="0.1"
                  step="0.05"
                />
                <span style={{ fontSize: "11px", color: "#666", minWidth: "40px" }}>
                  meters
                </span>
              </div>
            </div>

            {/* Minimum area size */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Minimum Area Size:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  style={{ flex: 1 }}
                  min="10"
                  max="500"
                  step="10"
                  value={parameters.minimumAreaSize}
                  onChange={(e) => handleParameterChange("minimumAreaSize", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
                />
                <input
                  type="number"
                  style={{
                    width: "60px",
                    padding: "4px 6px",
                    border: "1px solid #999",
                    borderRadius: "4px",
                    backgroundColor: "white",
                    fontSize: "11px",
                  }}
                  value={parameters.minimumAreaSize}
                  onChange={(e) => handleParameterChange("minimumAreaSize", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
                  min="10"
                  step="10"
                />
                <span style={{ fontSize: "12px", color: "#666", minWidth: "40px" }}>
                  points
                </span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Quick Presets:
              </label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                <button
                  onClick={() =>
                    setParameters((prev) => ({
                      ...prev,
                      wearThreshold: 15,
                      distanceBetweenAreas: 0.2,
                      minimumAreaSize: 50,
                    }))
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    backgroundColor: "#DC2626",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  disabled={isUiDisabled}
                >
                  Critical
                </button>
                <button
                  onClick={() =>
                    setParameters((prev) => ({
                      ...prev,
                      wearThreshold: 25,
                      distanceBetweenAreas: 0.3,
                      minimumAreaSize: 100,
                    }))
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    backgroundColor: "#F59E0B",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  disabled={isUiDisabled}
                >
                  Standard
                </button>
                <button
                  onClick={() =>
                    setParameters((prev) => ({
                      ...prev,
                      wearThreshold: 35,
                      distanceBetweenAreas: 0.5,
                      minimumAreaSize: 200,
                    }))
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    backgroundColor: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  disabled={isUiDisabled}
                >
                  Conservative
                </button>
              </div>
            </div>

            {/* Save/Update button */}
            <button
              style={{
                backgroundColor: currentSectionData ? "#10b981" : "#666",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              disabled={isUiDisabled}
              onClick={handleAcceptParameters}
            >
              {currentSectionData ? "🔄 UPDATE DATA" : "💾 SAVE DATA"}
              {currentSectionData && <span style={{ fontSize: "10px" }}>✓</span>}
            </button>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
              <button
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: "500",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}
                disabled={isUiDisabled}
                onClick={() => {
                  console.log('🔧 Manual screenshot capture triggered');
                  const screenshot = captureCurrentScreenshot();
                  if (screenshot) {
                    const a = document.createElement('a');
                    a.href = screenshot.dataUrl;
                    a.download = screenshot.filename;
                    a.click();
                    alert(`📸 Screenshot saved: ${screenshot.filename}`);
                  } else {
                    alert('❌ Screenshot capture failed - please try again');
                  }
                }}
              >
                📸 CAPTURE
              </button>
              
              <button
                style={{
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: "500",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}
                disabled={isUiDisabled || repairProposal.areas.length === 0}
                onClick={() => {
                  const reportData = {
                    section: activeScreen,
                    parameters,
                    repairProposal,
                    wornPointsCount: wornPoints.length,
                    timestamp: Date.now()
                  };
                  
                  const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                    type: 'application/json'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeScreen.toLowerCase()}_report_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  alert(`📄 Quick report exported for ${activeScreen}!`);
                }}
              >
                📄 EXPORT
              </button>
            </div>
          </div>

          {/* Repair proposal panel */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#e5e5e5",
              border: "2px solid #ccc",
              borderRadius: "8px",
              padding: "15px",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                fontWeight: "bold",
                textAlign: "center",
                color: "#333",
              }}
            >
              REPAIR PROPOSAL
            </h3>

            <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
              <strong>Material:</strong> {repairProposal.total?.material || parameters.repairMaterial}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
              <strong>Density:</strong> {MATERIAL_DENSITY} g/cm³
            </div>
            <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
              <strong>Section:</strong> {activeScreen}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "20px", color: "#333" }}>
              <strong>Current Threshold:</strong> {parameters.wearThreshold}cm
            </div>

            <div style={{ 
              fontSize: "11px", 
              marginBottom: "15px", 
              color: "#666",
              backgroundColor: "#f8f9fa",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #dee2e6"
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>🏭 3D to 2D Projection:</div>
              <div>• <strong>Bricks/Slag Line:</strong> Side view (circumferential angle)</div>
              <div>• <strong>Screed:</strong> Top-down view (bird's eye perspective)</div>
              <div>• Zoomed focus on selected furnace section</div>
              <div>• Current view: <strong>{activeScreen}</strong> - {currentConfig.furnaceDescription}</div>
            </div>

            <div
              style={{
                borderTop: "1px solid #999",
                paddingTop: "15px",
                backgroundColor: "white",
                padding: "15px",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  marginBottom: "10px",
                  padding: "8px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>🔍 LiDAR Furnace Analysis:</div>
                <div>• Total Points: {currentFileData?.points?.length || 0}</div>
                <div>• Section Points: {processedPoints.length}</div>
                <div>• Worn Points: {wornPoints.length} (≤ {parameters.wearThreshold}cm)</div>
                <div>• Repair Areas: {repairProposal.areas.length}</div>
                <div>
                  • Distribution: B:{sectionCounts.Bricks || 0} S:{sectionCounts["Slag Line"] || 0} C:
                  {sectionCounts.Screed || 0}
                </div>
                <div>• Current Analysis: {activeScreen} ({currentConfig.furnaceDescription})</div>
              </div>

              {repairProposal.areas.length > 0 ? (
                <>
                  {repairProposal.areas.map((area) => (
                    <div
                      key={area.id}
                      style={{
                        marginBottom: "12px",
                        padding: "10px",
                        backgroundColor: "#ffebee",
                        borderRadius: "6px",
                        border: "2px solid #ffcdd2",
                      }}
                    >
                      <div
                        style={{
                          color: "#d32f2f",
                          fontWeight: "bold",
                          fontSize: "13px",
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        🔧 Repair Area {area.id}
                        <span
                          style={{
                            backgroundColor: "#d32f2f",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "10px",
                          }}
                        >
                          {area.pointCount} pts
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          color: "#333",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "4px",
                        }}
                      >
                        <div>
                          <strong>Volume:</strong> {area.volume.toFixed(3)} m³
                        </div>
                        <div>
                          <strong>Weight:</strong> {area.weight.toFixed(1)} kg
                        </div>
                        <div>
                          <strong>Area:</strong> {area.areaSize.toFixed(2)} m²
                        </div>
                        <div>
                          <strong>Avg Wear:</strong> {area.avgWear.toFixed(1)} cm
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                          padding: "4px 8px",
                          backgroundColor: "#fff3e0",
                          borderRadius: "3px",
                          fontSize: "10px",
                          color: "#e65100",
                        }}
                      >
                        💰 Est. Cost: ${(area.weight * 2.5).toFixed(0)} USD
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      marginTop: "15px",
                      padding: "12px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "6px",
                      border: "2px solid #90caf9",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "13px",
                        color: "#1565c0",
                        marginBottom: "8px",
                      }}
                    >
                      📊 PROJECT SUMMARY
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        fontSize: "11px",
                      }}
                    >
                      <div>
                        <strong>Total Areas:</strong> {repairProposal.areas.length}
                      </div>
                      <div>
                        <strong>Total Points:</strong>{" "}
                        {repairProposal.areas.reduce((sum, area) => sum + area.pointCount, 0)}
                      </div>
                      <div>
                        <strong>Total Volume:</strong> {repairProposal.total.volume.toFixed(3)} m³
                      </div>
                      <div>
                        <strong>Total Weight:</strong> {repairProposal.total.weight.toFixed(1)} kg
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "6px",
                        backgroundColor: "#1565c0",
                        color: "white",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      💰 Total Project Cost: ${(repairProposal.total?.cost || repairProposal.total.weight * 2.5).toFixed(0)} USD
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    color: wornPoints.length > 0 ? "#d32f2f" : "#666",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "20px",
                    backgroundColor: wornPoints.length > 0 ? "#ffebee" : "#f5f5f5",
                    borderRadius: "6px",
                    border: wornPoints.length > 0 ? "2px solid #ffcdd2" : "1px solid #e0e0e0",
                  }}
                >
                  {wornPoints.length > 0 ? (
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#d32f2f" }}>
                        ⚠️ {wornPoints.length} worn points found in {activeScreen} section
                      </div>
                      <div style={{ fontSize: "11px" }}>
                        No areas meet the minimum size requirement of {parameters.minimumAreaSize} points.
                      </div>
                      <div style={{ fontSize: "10px", marginTop: "8px", color: "#666" }}>
                        💡 Try reducing the minimum area size or distance between areas.
                        <br />
                        🏭 Check the 2D furnace layout for damage distribution.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#666" }}>
                        ✅ No repairs needed in {activeScreen} section
                      </div>
                      <div style={{ fontSize: "11px" }}>
                        All areas are above the {parameters.wearThreshold}cm threshold.
                      </div>
                      <div style={{ fontSize: "10px", marginTop: "4px", color: "#666" }}>
                        🏭 2D furnace layout shows healthy condition in this section.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No Data Dialog */}
      {processingState.showNoDataDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setProcessingState((prev) => ({ ...prev, showNoDataDialog: false }));
            }
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "24px",
              width: "90%",
              maxWidth: "800px",
              maxHeight: "80%",
              overflow: "auto",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: "10px",
              }}
            >
              <h3 style={{ margin: 0, color: "#1a202c" }}>🏭 No 2D Furnace Data Available</h3>
              <button
                onClick={() => setProcessingState((prev) => ({ ...prev, showNoDataDialog: false }))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px"
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ color: "#dc3545", textAlign: "center", padding: "20px" }}>
              <div style={{ fontSize: "16px", marginBottom: "15px" }}>
                No points are available for the selected "{activeScreen}" section in the 2D furnace layout.
              </div>
              <div style={{ textAlign: "left", fontSize: "14px" }}>
                This could be caused by:
                <ul style={{ marginTop: "10px", marginBottom: "15px" }}>
                  <li>Missing or mismatched section data in the CSV file</li>
                  <li>No points match the current furnace selection</li>
                  <li>Z-coordinate thresholds don't match your furnace geometry</li>
                  <li>Points are outside the expected coordinate ranges for this section</li>
                </ul>
                
                <div style={{ 
                  backgroundColor: "#f8f9fa", 
                  padding: "10px", 
                  borderRadius: "4px", 
                  border: "1px solid #dee2e6",
                  marginTop: "15px"
                }}>
                  <strong>💡 Troubleshooting Tips:</strong>
                  <ul style={{ marginTop: "8px", fontSize: "13px" }}>
                    <li>Check if your data contains proper Z-coordinates (height values)</li>
                    <li>Verify the file "{selectedFile?.name || "unknown"}" has the expected furnace geometry</li>
                    <li>Try switching to a different section to verify data availability</li>
                    <li>Check browser console for detailed section detection logs</li>
                    <li>Ensure thickness values are properly formatted in the CSV</li>
                  </ul>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setProcessingState((prev) => ({ ...prev, showNoDataDialog: false }))}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#3182ce",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GunningScreen;