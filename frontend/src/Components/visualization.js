import * as THREE from "three";
import { MAX_RENDER_POINTS } from "./constants";

export const initializeScene = (canvasRef, sceneRef, cameraRef, rendererRef, bgColor = 0x000000) => {
  if (!canvasRef.current) return null;

  const canvas = canvasRef.current;
  const scene = sceneRef.current;
  scene.background = new THREE.Color(bgColor);

  const container = canvas.parentElement;
  const { clientWidth: width, clientHeight: height } = container;

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 20, 50);
  camera.lookAt(0, 0, 0);
  cameraRef.current = camera;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(width, height);
  renderer.setClearColor(bgColor);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendererRef.current = renderer;

  scene.add(new THREE.AmbientLight(0x404040, 0.6));
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  let resizeTimeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const { clientWidth: newWidth, clientHeight: newHeight } = container;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    }, 16);
  };

  window.addEventListener("resize", handleResize);
  return () => {
    window.removeEventListener("resize", handleResize);
    clearTimeout(resizeTimeout);
  };
};

export const createPointCloud = async (points, scene, camera, activeScreen, wearThreshold) => {
  const objectsToRemove = [];
  scene.traverse((child) => {
    if (child.type === "Points" || child.type === "Line") {
      objectsToRemove.push(child);
    }
  });

  objectsToRemove.forEach((child) => {
    scene.remove(child);
    child.geometry?.dispose();
    child.material?.dispose();
  });

  if (!points.length) return;

  const renderPoints = points.length > MAX_RENDER_POINTS
    ? points.filter((_, index) => index % Math.ceil(points.length / MAX_RENDER_POINTS) === 0)
    : points;
  console.log(`🎨 Rendering ${renderPoints.length} points for ${activeScreen}`);

  const positions = new Float32Array(renderPoints.length * 3);
  const colors = new Float32Array(renderPoints.length * 3);
  let validPointCount = 0;

  for (let i = 0; i < renderPoints.length; i++) {
    const point = renderPoints[i];
    const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];

    if (pos.length < 3 || pos.some(isNaN)) continue;

    const index = validPointCount * 3;
    positions[index] = pos[0];
    positions[index + 1] = pos[1];
    positions[index + 2] = pos[2];

    const pointThickness = point.thickness || 0;
    const threshold = wearThreshold || 20;
    
    if (pointThickness > 0 && pointThickness <= threshold) {
      colors[index] = 1.0;
      colors[index + 1] = 0.0;
      colors[index + 2] = 0.0;
    } else {
      colors[index] = 0.6;
      colors[index + 1] = 0.6;
      colors[index + 2] = 0.6;
    }
    validPointCount++;
  }

  if (validPointCount === 0) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions.slice(0, validPointCount * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors.slice(0, validPointCount * 3), 3));

  const pointSize = Math.max(2.0, Math.min(8.0, 3000 / Math.sqrt(validPointCount)));
  const material = new THREE.PointsMaterial({
    size: pointSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: false,
  });

  const pointCloud = new THREE.Points(geometry, material);
  scene.add(pointCloud);

  const box = new THREE.Box3().setFromObject(pointCloud);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = Math.max(maxDim * 1.2, 30);

    camera.position.set(
      center.x + cameraDistance * 0.5,
      center.y + cameraDistance * 0.3,
      center.z + cameraDistance * 0.8
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }
};

export const createRepairAreasVisualization = async (scene, camera, processedPoints, wornPoints, activeScreen, currentFileData) => {
  const objectsToRemove = [];
  scene.traverse((child) => {
    if (child.type === "Points" || child.type === "Line") {
      objectsToRemove.push(child);
    }
  });

  objectsToRemove.forEach((child) => {
    scene.remove(child);
    child.geometry?.dispose();
    child.material?.dispose();
  });

  if (!currentFileData?.points?.length) return;

  if (processedPoints.length > 0) {
    const bgPositions = new Float32Array(processedPoints.length * 3);
    const bgColors = new Float32Array(processedPoints.length * 3);
    let bgCount = 0;

    for (const point of processedPoints) {
      const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
      if (pos.length < 3 || pos.some(isNaN)) continue;

      const index = bgCount * 3;
      bgPositions[index] = pos[0];
      bgPositions[index + 1] = pos[1];
      bgPositions[index + 2] = pos[2];
      
      bgColors[index] = 0.4;
      bgColors[index + 1] = 0.4;
      bgColors[index + 2] = 0.4;
      bgCount++;
    }

    if (bgCount > 0) {
      const backgroundGeometry = new THREE.BufferGeometry();
      backgroundGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(bgPositions.slice(0, bgCount * 3), 3)
      );
      backgroundGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(bgColors.slice(0, bgCount * 3), 3)
      );

      const backgroundMaterial = new THREE.PointsMaterial({
        size: Math.max(1.5, Math.min(6.0, 2000 / Math.sqrt(bgCount))),
        vertexColors: true,
        opacity: 0.3,
        transparent: true,
        sizeAttenuation: false,
      });

      scene.add(new THREE.Points(backgroundGeometry, backgroundMaterial));
    }
  }

  if (wornPoints.length > 0) {
    const dmgPositions = new Float32Array(wornPoints.length * 3);
    const dmgColors = new Float32Array(wornPoints.length * 3);
    let dmgCount = 0;

    for (const point of wornPoints) {
      const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
      if (pos.length < 3 || pos.some(isNaN)) continue;

      const index = dmgCount * 3;
      dmgPositions[index] = pos[0];
      dmgPositions[index + 1] = pos[1];
      dmgPositions[index + 2] = pos[2];

      dmgColors[index] = 1.0;
      dmgColors[index + 1] = 0.0;
      dmgColors[index + 2] = 0.0;
      dmgCount++;
    }

    if (dmgCount > 0) {
      const damagedGeometry = new THREE.BufferGeometry();
      damagedGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(dmgPositions.slice(0, dmgCount * 3), 3)
      );
      damagedGeometry.setAttribute(
        "color",
        new THREE.BufferAttribute(dmgColors.slice(0, dmgCount * 3), 3)
      );

      const damagedMaterial = new THREE.PointsMaterial({
        size: Math.max(4.0, Math.min(12.0, 4000 / Math.sqrt(dmgCount))),
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        sizeAttenuation: false,
      });

      scene.add(new THREE.Points(damagedGeometry, damagedMaterial));
    }
  }

  const box = new THREE.Box3().setFromObject(scene);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const cameraDistance = Math.max(maxDim * 1.1, 25);

    const cameraOffsets = {
      Bricks: { x: 0.4, y: 0.4, z: 0.8 },
      "Slag Line": { x: 0.8, y: 0.1, z: 0.5 },
      Screed: { x: 0.2, y: 0.9, z: 0.3 },
    };

    const offset = cameraOffsets[activeScreen] || { x: 0.5, y: 0.3, z: 0.8 };

    camera.position.set(
      center.x + cameraDistance * offset.x,
      center.y + cameraDistance * offset.y,
      center.z + cameraDistance * offset.z
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }
};

export const draw2DCrossSection = (canvas, points, isProposal = false, wearThreshold) => {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  if (points.length === 0) return;

  const bounds = {
    minX: Math.min(...points.map(p => p.position ? p.position[0] : p.x || 0)),
    maxX: Math.max(...points.map(p => p.position ? p.position[0] : p.x || 0)),
    minZ: Math.min(...points.map(p => p.position ? p.position[2] : p.z || 0)),
    maxZ: Math.max(...points.map(p => p.position ? p.position[2] : p.z || 0))
  };

  const scaleX = (width - 80) / (bounds.maxX - bounds.minX);
  const scaleZ = (height - 80) / (bounds.maxZ - bounds.minZ);
  const scale = Math.min(scaleX, scaleZ);

  const offsetX = 40 + (width - 80 - (bounds.maxX - bounds.minX) * scale) / 2;
  const offsetZ = 40 + (height - 80 - (bounds.maxZ - bounds.minZ) * scale) / 2;

  const zoneHeight = (bounds.maxZ - bounds.minZ) * scale;
  const zoneWidth = (bounds.maxX - bounds.minX) * scale;

  const zQuartile = (bounds.maxZ - bounds.minZ) / 4;
  
  ctx.fillStyle = '#8B4513';
  const banksHeight = zQuartile * scale;
  ctx.fillRect(offsetX, offsetZ + zoneHeight - banksHeight, zoneWidth, banksHeight);
  
  ctx.fillStyle = '#2F2F2F';
  const bricksHeight = zQuartile * 2 * scale;
  ctx.fillRect(offsetX, offsetZ + zoneHeight - banksHeight - bricksHeight, zoneWidth, bricksHeight);
  
  ctx.fillStyle = '#5F5F5F';
  const slagHeight = zQuartile * scale;
  ctx.fillRect(offsetX, offsetZ + zoneHeight - banksHeight - bricksHeight - slagHeight, zoneWidth, slagHeight);

  points.forEach(point => {
    const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
    const x = offsetX + (pos[0] - bounds.minX) * scale;
    const z = offsetZ + (bounds.maxZ - pos[2]) * scale;

    let color;
    let pointSize = 2;

    if (isProposal) {
      const isWorn = point.thickness != null && point.thickness <= wearThreshold;
      if (isWorn) {
        color = '#FF0000';
        pointSize = 4;
      } else {
        color = '#666666';
        pointSize = 1.5;
      }
    } else {
      if (point.thickness != null && point.thickness <= wearThreshold) {
        color = '#FF0000';
        pointSize = 3;
      } else {
        const zPos = pos[2];
        const zRange = bounds.maxZ - bounds.minZ;
        const zNorm = (zPos - bounds.minZ) / zRange;
        
        if (zNorm < 0.25) {
          color = '#CD853F';
        } else if (zNorm < 0.75) {
          color = '#555555';
        } else {
          color = '#888888';
        }
        pointSize = 2;
      }
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, z, pointSize, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('Refrigerating Panels', offsetX + 10, offsetZ + 20);
  ctx.fillText('Slag Line', offsetX + 10, offsetZ + zoneHeight * 0.25);
  ctx.fillText('Bricks', offsetX + 10, offsetZ + zoneHeight * 0.6);
  ctx.fillText('Banks/Bottom', offsetX + 10, offsetZ + zoneHeight - 20);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  
  ctx.beginPath();
  ctx.moveTo(offsetX - 30, offsetZ);
  ctx.lineTo(offsetX - 30, offsetZ + zoneHeight);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(offsetX, offsetZ + zoneHeight + 20);
  ctx.lineTo(offsetX + zoneWidth, offsetZ + zoneHeight + 20);
  ctx.stroke();
  
  ctx.setLineDash([]);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px Arial';
  ctx.fillText('Z', offsetX - 25, offsetZ - 5);
  ctx.fillText('X', offsetX + zoneWidth + 5, offsetZ + zoneHeight + 25);
};