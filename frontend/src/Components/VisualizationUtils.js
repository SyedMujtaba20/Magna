import * as THREE from "three";

export const initializeScene = (canvasRef, sceneRef, cameraRef, rendererRef, bgColor = 0x000000) => {
  if (!canvasRef.current) return null;
  const canvas = canvasRef.current;
  const scene = sceneRef.current;
  scene.background = new THREE.Color(bgColor);
  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 20, 50);
  camera.lookAt(0, 0, 0);
  cameraRef.current = camera;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setClearColor(bgColor);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendererRef.current = renderer;
  scene.add(new THREE.AmbientLight(0x404040, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  return renderer;
};

export const createPointCloud = (points, scene, wearThreshold, setIsProcessing) => {
  scene.children.forEach((child) => {
    if (child.type === "Points") {
      scene.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
  });
  if (!points.length) return;
  setIsProcessing(true);
  const chunkSize = 10000;
  const processChunk = (startIndex) => {
    const positions = [];
    const colors = [];
    const endIndex = Math.min(startIndex + chunkSize, points.length);
    for (let i = startIndex; i < endIndex; i++) {
      const point = points[i];
      if (point.position && Array.isArray(point.position) && point.position.length >= 3) {
        positions.push(...point.position);
      } else if (point.x !== undefined && point.y !== undefined && point.z !== undefined) {
        positions.push(point.x, point.y, point.z);
      } else {
        continue;
      }
      let color;
      if (point.thickness <= wearThreshold) {
        color = { r: 1, g: 0, b: 0 };
      } else if (point.thickness <= wearThreshold * 1.5) {
        color = { r: 1, g: 0.5, b: 0 };
      } else {
        color = { r: 0, g: 1, b: 0 };
      }
      colors.push(color.r, color.g, color.b);
    }
    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      });
      const pointCloud = new THREE.Points(geometry, material);
      scene.add(pointCloud);
    }
    if (endIndex < points.length) {
      setTimeout(() => processChunk(endIndex), 10);
    } else {
      setIsProcessing(false);
      const box = new THREE.Box3();
      scene.children.forEach((child) => {
        if (child.type === "Points") box.expandByObject(child);
      });
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        scene.children.forEach((child) => {
          if (child.type === "Points") child.position.sub(center);
        });
      }
    }
  };
  processChunk(0);
};

export const createPlaceholderVisualization = (scene, activeScreen, wearThreshold, screenConfigs) => {
  scene.children.forEach((child) => {
    if (child.type === "Points" || child.type === "Mesh" || child.type === "Group") {
      scene.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  });
  const furnaceGroup = new THREE.Group();
  let geometry, material;
  switch (activeScreen) {
    case "Bricks":
      geometry = new THREE.CylinderGeometry(15, 18, 30, 16);
      material = new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.7 });
      break;
    case "Slag Line":
      geometry = new THREE.TorusGeometry(15, 3, 8, 24);
      material = new THREE.MeshLambertMaterial({ color: 0x886644, transparent: true, opacity: 0.7 });
      break;
    case "Screed":
      geometry = new THREE.BoxGeometry(30, 5, 30);
      material = new THREE.MeshLambertMaterial({ color: 0x444488, transparent: true, opacity: 0.7 });
      break;
    default:
      geometry = new THREE.CylinderGeometry(15, 18, 30, 16);
      material = new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.7 });
  }
  const mesh = new THREE.Mesh(geometry, material);
  furnaceGroup.add(mesh);
  for (let i = 0; i < 15; i++) {
    const angle = (i / 15) * Math.PI * 2;
    const radius = 14 + Math.random() * 2;
    const height = -10 + Math.random() * 20;
    const indicatorGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const thickness = Math.random() * 30;
    let color;
    if (thickness <= wearThreshold) {
      color = 0xff0000;
    } else if (thickness <= wearThreshold * 1.5) {
      color = 0xff8800;
    } else {
      color = 0x00ff00;
    }
    const indicatorMaterial = new THREE.MeshLambertMaterial({ color });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    furnaceGroup.add(indicator);
  }
  scene.add(furnaceGroup);
};