import * as THREE from "three";

export const setupThreeScene = (canvasRef, sceneRef, rendererRef, cameraRef, animationIdRef, dataBounds) => {
  if (!canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const scene = sceneRef.current;
  scene.clear();
  scene.background = new THREE.Color(0x000000);

  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 400;
  const height = rect.height || 400;

  const aspect = width / height;
  const dataWidth = Math.abs(dataBounds.maxX - dataBounds.minX) || 100;
  const dataHeight = Math.abs(dataBounds.maxZ - dataBounds.minZ) || 100;
  const frustumSize = Math.max(dataWidth, dataHeight) * 1.2;
  
  const camera = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    1000
  );
  
  camera.position.set(0, 100, 0);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, -1);
  cameraRef.current = camera;

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
  if (furnacePoints.length === 0) return;

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

  // Sample points for visualization
  const maxDisplayPoints = 20000;
  const step = Math.max(1, Math.ceil(furnacePoints.length / maxDisplayPoints));
  const positions = [];
  const colors = [];

  for (let i = 0; i < furnacePoints.length; i += step) {
    const point = furnacePoints[i];
    const x = point.position?.[0] || point.x || 0;
    const z = point.position?.[2] || point.z || 0;
    const thickness = point.thickness || point.y || 0;
    
    positions.push(x, 0.1, z);
    
    const color = getColorForThickness(thickness, dataBounds.minY, dataBounds.maxY);
    colors.push(color.r, color.g, color.b);
  }

  if (positions.length > 0) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({ 
      size: 1.5,
      vertexColors: true,
      sizeAttenuation: false
    });
    
    const pointsMesh = new THREE.Points(geometry, material);
    pointsMesh.userData.isDataPoint = true;
    scene.add(pointsMesh);
  }

  // Create slice lines - WHITE lines for better visibility
  const whiteLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
  
  const padding = Math.max(dataBounds.maxX - dataBounds.minX, dataBounds.maxZ - dataBounds.minZ) * 0.1;
  
  // Horizontal slice line (moving in Z direction)
  const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(dataBounds.minX - padding, 0.5, horizontalSlice),
    new THREE.Vector3(dataBounds.maxX + padding, 0.5, horizontalSlice),
  ]);
  const hLine = new THREE.Line(hLineGeometry, whiteLineMaterial);
  hLine.userData.isSliceLine = true;
  scene.add(hLine);
  
  // Vertical slice line (moving in X direction)
  const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(verticalSlice, 0.5, dataBounds.minZ - padding),
    new THREE.Vector3(verticalSlice, 0.5, dataBounds.maxZ + padding),
  ]);
  const vLine = new THREE.Line(vLineGeometry, whiteLineMaterial);
  vLine.userData.isSliceLine = true;
  scene.add(vLine);
};