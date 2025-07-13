// Create this file: src/Components/ThicknessVisualizationHelper.js

import * as THREE from 'three';

export const getThicknessVisualizationData = (fileData, viewMode) => {
  console.log("🎯 getThicknessVisualizationData called:", { 
    hasCells: !!fileData?.cells, 
    cellsLength: fileData?.cells?.length,
    hasPoints: !!fileData?.points,
    pointsLength: fileData?.points?.length,
    viewMode 
  });

  if (!fileData) {
    console.log("❌ No fileData");
    return null;
  }

  const visualizationData = {
    mode: viewMode,
    zoneData: {},
    colorMapping: {},
    textLabels: []
  };

  // Try cells first, then fallback to points
  if (fileData.cells && fileData.cells.length > 0) {
    console.log("✅ Using cells for visualization");
    return getCellBasedVisualization(fileData, viewMode);
  } else if (fileData.points && fileData.points.length > 0) {
    console.log("✅ Using points for visualization (fallback)");
    return getPointBasedVisualization(fileData, viewMode);
  }

  console.log("❌ No usable data for visualization");
  return null;
};

// Original cell-based visualization
const getCellBasedVisualization = (fileData, viewMode) => {
  const visualizationData = {
    mode: viewMode,
    zoneData: {},
    colorMapping: {},
    textLabels: []
  };

  // Group cells by zone for calculation
  const zoneGroups = {};
  fileData.cells.forEach(cell => {
    if (!cell.zone || cell.averageThickness == null) return;
    
    if (!zoneGroups[cell.zone]) {
      zoneGroups[cell.zone] = [];
    }
    zoneGroups[cell.zone].push(cell);
  });

  console.log("📊 Zone groups:", Object.keys(zoneGroups));

  // Calculate mean or minimum for each zone
  Object.entries(zoneGroups).forEach(([zone, cells]) => {
    let displayValue;
    let position = null;
    let color;

    if (viewMode === "mean") {
      const totalThickness = cells.reduce((sum, cell) => sum + cell.averageThickness, 0);
      displayValue = totalThickness / cells.length;
      color = displayValue > 70 ? '#1E40AF' : displayValue > 50 ? '#3B82F6' : '#93C5FD';
    } else if (viewMode === "minimum") {
      displayValue = Math.min(...cells.map(cell => cell.minThickness || cell.averageThickness));
      color = displayValue < 30 ? '#EF4444' : displayValue < 50 ? '#F59E0B' : '#10B981';
    }

    // Find position (simplified - use first cell)
    if (cells[0] && fileData.points && fileData.points.length > 0) {
      const centerIndex = Math.floor(fileData.points.length / 2);
      position = fileData.points[centerIndex].position;
    }

    if (position) {
      visualizationData.zoneData[zone] = {
        thickness: displayValue,
        position: position,
        color: color
      };

      visualizationData.textLabels.push({
        text: `${zone}: ${displayValue.toFixed(1)}cm`,
        position: position,
        color: color,
        fontSize: 16,
        backgroundColor: 'rgba(255,255,255,0.9)'
      });
    }
  });

  return visualizationData;
};

// 🆕 NEW: Point-based visualization with performance optimization
const getPointBasedVisualization = (fileData, viewMode) => {
  const visualizationData = {
    mode: viewMode,
    zoneData: {},
    colorMapping: {},
    textLabels: []
  };

  if (!fileData.points || fileData.points.length === 0) {
    return visualizationData;
  }

  console.log(`🚀 Processing ${fileData.points.length} points for visualization...`);

  // 🔥 PERFORMANCE: Sample points if we have too many (avoid stack overflow)
  const MAX_POINTS = 10000; // Limit to prevent stack overflow
  let pointsToProcess = fileData.points;
  
  if (fileData.points.length > MAX_POINTS) {
    console.log(`⚡ Sampling ${MAX_POINTS} points from ${fileData.points.length} total points`);
    const step = Math.floor(fileData.points.length / MAX_POINTS);
    pointsToProcess = fileData.points.filter((_, index) => index % step === 0);
  }

  // Create synthetic zones based on point positions (optimized)
  const zones = {
    "Main Body": { points: [], thicknesses: [], positions: [] },      // Most important zone
    "Upper Section": { points: [], thicknesses: [], positions: [] },  // Top of furnace
    "Lower Section": { points: [], thicknesses: [], positions: [] }   // Bottom of furnace
  };

  // 🔥 OPTIMIZED: Process points in batches to avoid stack overflow
  const BATCH_SIZE = 1000;
  for (let i = 0; i < pointsToProcess.length; i += BATCH_SIZE) {
    const batch = pointsToProcess.slice(i, i + BATCH_SIZE);
    
    batch.forEach(point => {
      // Safety checks
      if (!point || typeof point.thickness !== 'number' || !Array.isArray(point.position)) {
        return;
      }
      
      if (!isFinite(point.thickness) || point.position.length < 3) {
        return;
      }
      
      const z = point.position[2]; // Z coordinate
      let zoneName = "Main Body"; // Default to main body (most important)
      
      if (z > 50) zoneName = "Upper Section";
      else if (z < -50) zoneName = "Lower Section";
      
      zones[zoneName].points.push(point);
      zones[zoneName].thicknesses.push(point.thickness);
      zones[zoneName].positions.push(point.position);
    });
  }

  console.log("📊 Zone distribution:", {
    "Main Body": zones["Main Body"].thicknesses.length,
    "Upper Section": zones["Upper Section"].thicknesses.length,
    "Lower Section": zones["Lower Section"].thicknesses.length
  });

  // Process each zone
  Object.entries(zones).forEach(([zoneName, zoneData]) => {
    if (zoneData.thicknesses.length === 0) return;

    let displayValue;
    let color;
    let position;

    try {
      if (viewMode === "mean") {
        displayValue = zoneData.thicknesses.reduce((sum, t) => sum + t, 0) / zoneData.thicknesses.length;
        
        // 🎨 Special dark color for Main Body in mean mode
        if (zoneName === "Main Body") {
          color = '#1E40AF'; // Dark blue for main body
        } else {
          color = displayValue > 70 ? '#3B82F6' : displayValue > 50 ? '#60A5FA' : '#93C5FD';
        }
        
        // Use center position
        const centerIndex = Math.floor(zoneData.positions.length / 2);
        position = zoneData.positions[centerIndex];
        
      } else if (viewMode === "minimum") {
        displayValue = Math.min(...zoneData.thicknesses);
        color = displayValue < 30 ? '#EF4444' : displayValue < 50 ? '#F59E0B' : '#10B981';
        
        // Find the position of minimum thickness point
        const minIndex = zoneData.thicknesses.indexOf(displayValue);
        position = zoneData.positions[minIndex] || zoneData.positions[0];
      }

      if (position && displayValue != null && isFinite(displayValue)) {
        visualizationData.zoneData[zoneName] = {
          thickness: displayValue,
          position: position,
          color: color
        };

        visualizationData.textLabels.push({
          text: `${zoneName}: ${displayValue.toFixed(1)}cm`,
          position: position,
          color: color,
          fontSize: zoneName === "Main Body" ? 18 : 16, // Larger font for main body
          backgroundColor: zoneName === "Main Body" ? 'rgba(30,64,175,0.9)' : 'rgba(255,255,255,0.9)',
          textColor: zoneName === "Main Body" ? 'white' : color
        });
      }
    } catch (error) {
      console.error(`❌ Error processing zone ${zoneName}:`, error);
    }
  });

  console.log("✅ Point-based visualization completed:", {
    zoneCount: Object.keys(visualizationData.zoneData).length,
    labelCount: visualizationData.textLabels.length
  });

  return visualizationData;
};

// Function to update your 3D scene based on view mode (optimized)
export const updateThreeSceneForViewMode = (scene, camera, fileData, viewMode) => {
  console.log("🎨 updateThreeSceneForViewMode called:", { viewMode });

  try {
    // Remove existing thickness labels
    const existingLabels = scene.children.filter(child => child.userData.isThicknessLabel);
    console.log(`🧹 Removing ${existingLabels.length} existing labels`);
    existingLabels.forEach(label => {
      scene.remove(label);
      // Clean up texture memory
      if (label.material && label.material.map) {
        label.material.map.dispose();
      }
      if (label.material) {
        label.material.dispose();
      }
    });

    if (viewMode !== "mean" && viewMode !== "minimum") {
      console.log("⏭️ Not mean/minimum mode, skipping label creation");
      return;
    }

    const vizData = getThicknessVisualizationData(fileData, viewMode);
    if (!vizData || vizData.textLabels.length === 0) {
      console.log("❌ No visualization data or labels to create");
      return;
    }

    console.log(`🏷️ Creating ${vizData.textLabels.length} text labels`);

    // 🔥 LIMIT: Only create labels if we have a reasonable number
    const MAX_LABELS = 10;
    const labelsToCreate = vizData.textLabels.slice(0, MAX_LABELS);

    // Add text labels to 3D scene
    labelsToCreate.forEach((labelData, index) => {
      try {
        // Create canvas for text rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;

        // Draw background
        context.fillStyle = labelData.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw border
        context.strokeStyle = labelData.color;
        context.lineWidth = 2;
        context.strokeRect(0, 0, canvas.width, canvas.height);

        // Draw text
        context.fillStyle = labelData.textColor || labelData.color;
        context.font = `bold ${labelData.fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(labelData.text, canvas.width / 2, canvas.height / 2);

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(material);

        // 🔥 SAFETY: Validate position values
        if (!Array.isArray(labelData.position) || labelData.position.length < 3) {
          console.warn(`⚠️ Invalid position for label ${index}:`, labelData.position);
          return;
        }

        const [x, y, z] = labelData.position;
        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
          console.warn(`⚠️ Non-finite position values for label ${index}:`, [x, y, z]);
          return;
        }

        // Position the label (convert mm to appropriate scale)
        const scale = 0.001; // Adjust this based on your coordinate system
        sprite.position.set(
          x * scale,
          y * scale,
          z * scale + 20 // Offset above the surface
        );
        
        // Scale appropriately
        sprite.scale.set(20, 5, 1);
        
        // Mark as thickness label for cleanup
        sprite.userData.isThicknessLabel = true;
        sprite.userData.viewMode = viewMode;

        scene.add(sprite);
        console.log(`✅ Added label ${index + 1}: ${labelData.text} at [${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}]`);

      } catch (error) {
        console.error(`❌ Error creating label ${index}:`, error);
      }
    });

    console.log("🎉 Label creation complete");

  } catch (error) {
    console.error("❌ Critical error in updateThreeSceneForViewMode:", error);
  }
};