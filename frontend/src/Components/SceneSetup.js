import * as THREE from "three";

export const setupThreeScene = (canvasRef, sceneRef, rendererRef, cameraRef, animationIdRef, dataBounds) => {
  if (!canvasRef.current) return;
  
  console.log("[SceneSetup] Setting up scene with dataBounds:", dataBounds);
  
  const canvas = canvasRef.current;
  const scene = sceneRef.current;
  scene.clear();
  scene.background = new THREE.Color(0x000000);

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 400;

  console.log("[SceneSetup] Canvas dimensions:", { width, height });

  // Calculate the center point of your furnace data (X and Z only)
  const centerX = (dataBounds.minX + dataBounds.maxX) / 2;
  const centerZ = (dataBounds.minZ + dataBounds.maxZ) / 2;
  // Don't use the Y center for camera positioning since points are rendered at Y=0.1

  console.log("[SceneSetup] Data center X,Z:", { centerX, centerZ });

  const aspect = width / height;
  const dataWidth = Math.abs(dataBounds.maxX - dataBounds.minX) || 100;
  const dataHeight = Math.abs(dataBounds.maxZ - dataBounds.minZ) || 100;
  
  console.log("[SceneSetup] Data dimensions:", { dataWidth, dataHeight });
  
  // Increase frustum size for better visibility and add padding
  const frustumSize = Math.max(dataWidth, dataHeight) * 1.4;
  
  console.log("[SceneSetup] Frustum size:", frustumSize);
  
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  
  // Position camera above the CENTER of the data at a FIXED height
  // Use Y=100 instead of centerY since points are rendered at Y=0.1
  camera.position.set(centerX, 100, centerZ);
  camera.lookAt(centerX, 0, centerZ); // Look at Y=0, not centerY
  camera.up.set(0, 0, -1);
  cameraRef.current = camera;

  console.log("[SceneSetup] Camera position:", camera.position);
  console.log("[SceneSetup] Camera looking at:", { x: centerX, y: 0, z: centerZ });

  const renderer = new THREE.WebGLRenderer({ 
    canvas, 
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);
  rendererRef.current = renderer;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const animate = () => {
    animationIdRef.current = requestAnimationFrame(animate);
    if (renderer && camera) {
      renderer.render(scene, camera);
    }
  };
  animate();

  const handleResize = () => {
    const newRect = canvas.getBoundingClientRect();
    const newWidth = newRect.width || 400;
    const newHeight = newRect.height || 400;
    
    const newAspect = newWidth / newHeight;
    camera.left = (frustumSize * newAspect) / -2;
    camera.right = (frustumSize * newAspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(newWidth, newHeight);
  };

  window.addEventListener('resize', handleResize);

  return () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    window.removeEventListener('resize', handleResize);
    if (renderer) renderer.dispose();
  };
};

export const updateThreeScene = (sceneRef, furnacePoints, horizontalSlice, verticalSlice, dataBounds, getColorForThickness) => {
  console.log("[updateThreeScene] Called with:", {
    furnacePointsLength: furnacePoints.length,
    horizontalSlice,
    verticalSlice,
    dataBounds
  });

  if (furnacePoints.length === 0) {
    console.warn("[updateThreeScene] No furnace points provided!");
    return;
  }

  // Log first few points to understand data structure
  console.log("[updateThreeScene] First 3 points:", furnacePoints.slice(0, 3));

  const scene = sceneRef.current;
  
  // Clear existing objects
  const objectsToRemove = [];
  scene.traverse((child) => {
    if (child.userData.isDataPoint || child.userData.isSliceLine) {
      objectsToRemove.push(child);
    }
  });
  
  objectsToRemove.forEach(obj => {
    scene.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });

  console.log("[updateThreeScene] Removed", objectsToRemove.length, "old objects");

  // Sample points for visualization
  const maxDisplayPoints = 20000;
  const step = Math.max(1, Math.ceil(furnacePoints.length / maxDisplayPoints));
  const positions = [];
  const colors = [];

  console.log("[updateThreeScene] Processing points with step:", step);

  let validPointsCount = 0;
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let i = 0; i < furnacePoints.length; i += step) {
    const point = furnacePoints[i];
    
    // Try different ways to extract coordinates
    let x, z, thickness;
    
    if (point.position && Array.isArray(point.position)) {
      x = point.position[0];
      z = point.position[2];
      thickness = point.thickness || point.position[1];
    } else if (point.x !== undefined && point.z !== undefined) {
      x = point.x;
      z = point.z;
      thickness = point.thickness || point.y || 0;
    } else if (Array.isArray(point) && point.length >= 3) {
      x = point[0];
      z = point[2];
      thickness = point[3] || point[1];
    } else {
      // Log the point structure to understand the data format
      if (i < 5) {
        console.log(`[updateThreeScene] Point ${i} structure:`, point);
      }
      continue;
    }

    if (x !== undefined && z !== undefined && thickness !== undefined) {
      // Render all points at Y=0.1 for top-down view
      positions.push(x, 0.1, z);
      
      // Track actual data bounds
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
      minY = Math.min(minY, thickness);
      maxY = Math.max(maxY, thickness);
      
      const color = getColorForThickness(thickness, dataBounds.minY, dataBounds.maxY);
      colors.push(color.r, color.g, color.b);
      validPointsCount++;
    }
  }

  console.log("[updateThreeScene] Processed points:", {
    validPointsCount,
    totalPositions: positions.length / 3,
    actualDataBounds: { minX, maxX, minZ, maxZ, minY, maxY },
    providedDataBounds: dataBounds
  });

  if (positions.length > 0) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({ 
      size: 2.0, // Good size for visibility
      vertexColors: true,
      sizeAttenuation: false
    });
    
    const pointsMesh = new THREE.Points(geometry, material);
    pointsMesh.userData.isDataPoint = true;
    scene.add(pointsMesh);
    
    console.log("[updateThreeScene] Added points mesh to scene");
  } else {
    console.error("[updateThreeScene] No valid positions found!");
    return;
  }

  // Create slice lines - WHITE lines for better visibility
  const whiteLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
  
  const padding = Math.max(dataBounds.maxX - dataBounds.minX, dataBounds.maxZ - dataBounds.minZ) * 0.1;
  
  // Horizontal slice line (moving in Z direction) - at Y=0.5 to be visible above points
  const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dataBounds.minX - padding, 0.5, horizontalSlice),
    new THREE.Vector3(dataBounds.maxX + padding, 0.5, horizontalSlice),
  ]);
  const hLine = new THREE.Line(hLineGeometry, whiteLineMaterial);
  hLine.userData.isSliceLine = true;
  scene.add(hLine);
  
  // Vertical slice line (moving in X direction) - at Y=0.5 to be visible above points
  const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(verticalSlice, 0.5, dataBounds.minZ - padding),
    new THREE.Vector3(verticalSlice, 0.5, dataBounds.maxZ + padding),
  ]);
  const vLine = new THREE.Line(vLineGeometry, whiteLineMaterial);
  vLine.userData.isSliceLine = true;
  scene.add(vLine);
  
  console.log("[updateThreeScene] Added slice lines to scene");
};