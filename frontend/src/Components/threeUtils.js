// src/Components/threeUtils.js
import * as THREE from "three";
import { getColorForThickness } from "../Components/utils";

export const createSimpleControls = (camera, domElement, isUiDisabled, selectedArea) => {
  let isMouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;
  let rotationX = 0;
  let rotationY = 0;
  let distance = 50;

  const onMouseDown = (event) => {
    if (isUiDisabled || selectedArea) return;
    isMouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  const onMouseUp = () => {
    isMouseDown = false;
  };

  const onMouseMove = (event) => {
    if (!isMouseDown || isUiDisabled || selectedArea) return;
    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;
    targetRotationY += deltaX * 0.01;
    targetRotationX += deltaY * 0.01;
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  const onWheel = (event) => {
    if (isUiDisabled) return;
    event.preventDefault();
    const delta = event.deltaY * 0.01;
    distance = Math.max(5, Math.min(100, distance + delta));
  };

  domElement.addEventListener("mousedown", onMouseDown);
  domElement.addEventListener("mouseup", onMouseUp);
  domElement.addEventListener("mousemove", onMouseMove);
  domElement.addEventListener("wheel", onWheel);

  return {
    update: () => {
      if (!camera) return;
      rotationX += (targetRotationX - rotationX) * 0.1;
      rotationY += (targetRotationY - rotationY) * 0.1;
      camera.position.x = Math.sin(rotationY) * distance * Math.cos(rotationX);
      camera.position.y = Math.sin(rotationX) * distance;
      camera.position.z = Math.cos(rotationY) * distance * Math.cos(rotationX);
      camera.lookAt(0, 0, 0);
    },
    setDistance: (newDistance) => {
      distance = Math.max(5, Math.min(100, newDistance));
    },
    getDistance: () => distance,
    dispose: () => {
      domElement.removeEventListener("mousedown", onMouseDown);
      domElement.removeEventListener("mouseup", onMouseUp);
      domElement.removeEventListener("mousemove", onMouseMove);
      domElement.removeEventListener("wheel", onWheel);
    },
  };
};

// Optimized section statistics computation
const computeSectionStats = (points, viewMode) => {
  if (viewMode !== "mean" && viewMode !== "minimum") {
    return {};
  }

  const sectionData = new Map();
  
  // Single pass through data to collect section values
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const section = point.section || "default";
    
    if (!sectionData.has(section)) {
      sectionData.set(section, {
        values: [],
        sum: 0,
        min: Infinity,
        count: 0
      });
    }
    
    const data = sectionData.get(section);
    const thickness = point.thickness;
    
    data.sum += thickness;
    data.count++;
    if (thickness < data.min) {
      data.min = thickness;
    }
  }
  
  // Compute final statistics
  const sectionComputed = {};
  for (const [section, data] of sectionData.entries()) {
    sectionComputed[section] = viewMode === "mean" 
      ? data.sum / data.count 
      : data.min;
  }
  
  return sectionComputed;
};

// Batch processing for large datasets
const processPointsInBatches = (points, batchSize = 10000) => {
  const batches = [];
  for (let i = 0; i < points.length; i += batchSize) {
    batches.push(points.slice(i, i + batchSize));
  }
  return batches;
};

export const renderPointCloud = (
  scene,
  ref,
  inputPoints,
  minThickness,
  maxThickness,
  isTemplate,
  useGlobalScaling,
  globalDataRange,
  wearRange,
  viewMode,
  selectedFurnace,
  cameraRef,
  controlsRef
) => {
  // Cleanup existing cloud
  if (ref.current) {
    scene.remove(ref.current);
    if (ref.current.geometry) ref.current.geometry.dispose();
    if (ref.current.material) ref.current.material.dispose();
    ref.current = null;
  }

  if (!Array.isArray(inputPoints) || inputPoints.length === 0) return;

  console.log(`Processing ${inputPoints.length} points...`);
  const startTime = performance.now();

  // Filter points by selected furnace first to reduce dataset size
  let filteredPoints = inputPoints;
  if (selectedFurnace) {
    filteredPoints = inputPoints.filter(point => 
      point.furnaceId === selectedFurnace.furnace_id
    );
  }

  console.log(`Filtered to ${filteredPoints.length} points`);

  // Compute section statistics efficiently
  const sectionComputed = computeSectionStats(filteredPoints, viewMode);

  // Pre-allocate arrays with known size
  const totalPoints = filteredPoints.length;
  const positions = new Float32Array(totalPoints * 3);
  const colors = new Float32Array(totalPoints * 3);
  let pointCount = 0;

  // Process points in batches to avoid blocking UI
  const processBatch = (batch, startIndex) => {
    for (let i = 0; i < batch.length; i++) {
      const point = batch[i];
      
      let thickness = point.thickness;
      if (viewMode === "mean" || viewMode === "minimum") {
        const section = point.section || "default";
        thickness = sectionComputed[section];
      }

      const color = isTemplate
        ? new THREE.Color(0xaaaaaa)
        : getColorForThickness(
            thickness,
            minThickness,
            maxThickness,
            useGlobalScaling,
            globalDataRange,
            wearRange
          );

      if (!color) continue;

      let x, y, z;
      if (viewMode === "developed") {
        const r = Math.sqrt(point.position[0] ** 2 + point.position[2] ** 2);
        const theta = Math.atan2(point.position[2], point.position[0]);
        x = theta * 10;
        y = point.position[1];
        z = 0;
      } else {
        [x, y, z] = point.position;
      }

      const i3 = pointCount * 3;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      pointCount++;
    }
  };

  // Process all points (for small datasets, batching overhead isn't worth it)
  if (filteredPoints.length < 50000) {
    processBatch(filteredPoints, 0);
  } else {
    // For large datasets, process in chunks
    const batches = processPointsInBatches(filteredPoints, 10000);
    batches.forEach((batch, index) => {
      processBatch(batch, index * 10000);
    });
  }

  console.log(`Processed ${pointCount} valid points`);

  if (pointCount === 0) return;

  // Create geometry with exact size needed
  const finalPositions = positions.slice(0, pointCount * 3);
  const finalColors = colors.slice(0, pointCount * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(finalPositions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(finalColors, 3));
  
  // Compute bounding box and center
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);

  const material = new THREE.PointsMaterial({
    size: 0.2,
    vertexColors: true,
    transparent: true,
    opacity: isTemplate ? 0.5 : 0.8,
  });

  const pointCloud = new THREE.Points(geometry, material);
  scene.add(pointCloud);
  ref.current = pointCloud;

  // Update camera and controls
  if (cameraRef.current && controlsRef.current) {
    cameraRef.current.position.set(0, 0, 50);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.setDistance(50);
    controlsRef.current.update();
  }

  const endTime = performance.now();
  console.log(`Point cloud rendering completed in ${(endTime - startTime).toFixed(2)}ms`);
};