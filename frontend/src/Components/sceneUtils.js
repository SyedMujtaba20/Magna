import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { debounce } from "lodash";
import { zoneMap, getColorForThickness } from "./utils";

const initializeScene = (
  canvasRef,
  sceneRef,
  rendererRef,
  cameraRef,
  controlsRef,
  gridMeshRef,
  setIsInitialized
) => {
  if (!canvasRef.current) return;

  console.log("[Three.js] Initializing renderer and scene.");
  const canvas = canvasRef.current;
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendererRef.current = renderer;

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 0, 300); // Adjusted for mm scale
  camera.lookAt(0, 0, 0);
  cameraRef.current = camera;

  const scene = sceneRef.current;
  scene.background = new THREE.Color(0x111111);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableRotate = true;
  controls.minDistance = 50;
  controls.maxDistance = 500;
  controlsRef.current = controls;
  console.log("[OrbitControls] Initialized:", controls);

  createGridOverlay(sceneRef, gridMeshRef);

  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();

  const handleResize = () => {
    const newWidth = canvas.parentElement.clientWidth;
    const newHeight = canvas.parentElement.clientHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  };

  window.addEventListener("resize", handleResize);
  setIsInitialized(true);

  return () => {
    console.log("[Three.js] Cleaning up.");
    window.removeEventListener("resize", handleResize);
    renderer.dispose();
    controls.dispose();
  };
};

const createGridOverlay = (sceneRef, gridMeshRef) => {
  const scene = sceneRef.current;

  if (gridMeshRef.current) {
    scene.remove(gridMeshRef.current);
    gridMeshRef.current.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    gridMeshRef.current = null;
  }

  const gridGroup = new THREE.Group();
  gridGroup.name = "gridOverlay";

  const zoneNames = Object.keys(zoneMap);
  const zonePositions = Object.values(zoneMap); // e.g., [-120, -60, 0, 60, 120] in mm

  zonePositions.forEach((zPos, index) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-150, zPos, 1),
      new THREE.Vector3(150, zPos, 1),
    ]);

    const material = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    line.userData = { type: "zone", name: zoneNames[index], position: zPos };
    line.renderOrder = 999;
    gridGroup.add(line);

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 128;
    canvas.height = 32;
    context.fillStyle = "#00ff00";
    context.font = "16px Arial";
    context.fillText(zoneNames[index], 4, 20);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(-160, zPos, 2);
    sprite.scale.set(40, 10, 1);
    sprite.renderOrder = 1000;
    gridGroup.add(sprite);
  });

  const profileCount = 20;
  const profileSpacing = 300 / profileCount; // 15 mm

  for (let i = 0; i < profileCount; i++) {
    const xPos = -150 + i * profileSpacing;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(xPos, -120, 1),
      new THREE.Vector3(xPos, 120, 1),
    ]);

    const material = new THREE.LineBasicMaterial({
      color: 0x0080ff,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
      depthWrite: false,
    });

    const line = new THREE.Line(geometry, material);
    line.userData = {
      type: "profile",
      name: `P${i + 1}`,
      position: xPos,
    };
    line.renderOrder = 999;
    gridGroup.add(line);

    if (i % 5 === 0) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = 64;
      canvas.height = 32;
      context.fillStyle = "#0080ff";
      context.font = "14px Arial";
      context.fillText(`P${i + 1}`, 4, 20);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(xPos, -130, 2);
      sprite.scale.set(20, 8, 1);
      sprite.renderOrder = 1000;
      gridGroup.add(sprite);
    }
  }

  const cellGeometry = new THREE.PlaneGeometry(profileSpacing, 30); // 15 mm x 30 mm

  for (let zoneIndex = 0; zoneIndex < zonePositions.length - 1; zoneIndex++) {
    for (let profileIndex = 0; profileIndex < profileCount - 1; profileIndex++) {
      const xPos = -150 + profileIndex * profileSpacing + profileSpacing / 2;
      const yPos = (zonePositions[zoneIndex] + zonePositions[zoneIndex + 1]) / 2;

      const cellMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      });

      const cellMesh = new THREE.Mesh(cellGeometry, cellMaterial);
      cellMesh.position.set(xPos, yPos, 0.5);
      cellMesh.renderOrder = 998;
      cellMesh.userData = {
        type: "cell",
        zone: zoneNames[zoneIndex],
        profile: `P${profileIndex + 1}`,
        zoneIndex,
        profileIndex,
      };
      console.log("[GridCell] Position:", {
        xPos,
        yPos,
        zone: zoneNames[zoneIndex],
        profile: `P${profileIndex + 1}`,
      });
      gridGroup.add(cellMesh);
    }
  }

  scene.add(gridGroup);
  gridMeshRef.current = gridGroup;
};

// Helper function to detect if data has headers
const detectDataWithHeaders = (points) => {
  if (!points || points.length === 0) return false;
  
  // Check if the first few points have very small coordinate values (indicating header data)
  // Header data typically has coordinates in centimeters (small values)
  // While non-header data has coordinates in millimeters (larger values)
  const sampleSize = Math.min(10, points.length);
  let smallValueCount = 0;
  
  for (let i = 0; i < sampleSize; i++) {
    const point = points[i];
    if (point.position && point.position.length === 3) {
      const [x, y, z] = point.position;
      // If coordinates are generally small (< 50), likely header data in cm
      if (Math.abs(x) < 50 && Math.abs(y) < 50 && Math.abs(z) < 50) {
        smallValueCount++;
      }
    }
  }
  
  // If more than half the sample has small values, assume it's header data
  return smallValueCount > sampleSize / 2;
};

// Updated updateScene function with header detection
const updateScene = (
  points,
  sceneRef,
  pointsMeshRef,
  isRenderingRef,
  setIsRendering,
  prevPointsLengthRef,
  gridMeshRef
) => {
  return debounce(async () => {
    console.log("[updateScene] Called. Points:", points.length);

    if (prevPointsLengthRef.current === points.length) {
      console.log("[updateScene] No change in points, skipping update.");
      return;
    }
    prevPointsLengthRef.current = points.length;

    if (isRenderingRef.current) {
      console.log("[updateScene] Early return: already rendering.");
      return;
    }

    isRenderingRef.current = true;
    setIsRendering(true);

    try {
      const scene = sceneRef.current;

      if (pointsMeshRef.current) {
        scene.remove(pointsMeshRef.current);
        pointsMeshRef.current.geometry.dispose();
        pointsMeshRef.current.material.dispose();
        pointsMeshRef.current = null;
      }

      if (points.length === 0) {
        console.warn("[updateScene] No valid points to render");
        isRenderingRef.current = false;
        setIsRendering(false);
        return;
      }

      // Detect if this is header data (small coordinates) or regular data
      const hasHeaders = detectDataWithHeaders(points);
      console.log("[updateScene] Data has headers:", hasHeaders);

      const positions = [];
      const colors = [];
      const validPoints = [];

      const batchSize = 10000;
      let processedCount = 0;

      for (let i = 0; i < points.length; i++) {
        const point = points[i];

        if (!point.position || point.position.length !== 3) {
          continue;
        }

        const [x, y, z] = point.position;

        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          continue;
        }

        // Apply scaling based on whether data has headers
        let visualX, visualY, visualZ;
        if (hasHeaders) {
          // Header data: scale up by 10x (cm to mm * 10 for visibility)
          visualX = x * 10;
          visualY = y * 10;
          visualZ = z * 10;
        } else {
          // Non-header data: use coordinates directly (already in appropriate scale)
          visualX = x;
          visualY = y;
          visualZ = z;
        }

        positions.push(visualX, visualY, visualZ);

        // Calculate thickness based on data type
        const computedThickness = hasHeaders 
          ? (point.thickness ?? Math.sqrt(x * x + y * y + z * z))  // Original calculation for header data
          : (point.thickness ?? Math.abs(z) / 10);  // For non-header data, use |z| in cm

        const color = getColorForThickness(computedThickness, 0, 10, false, {});

        validPoints.push({
          ...point,
          thickness: computedThickness,
          visualIndex: validPoints.length,
        });

        colors.push(color.r, color.g, color.b);

        processedCount++;

        if (processedCount % batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      if (positions.length === 0) {
        console.warn("[updateScene] No valid points to render");
        isRenderingRef.current = false;
        setIsRendering(false);
        return;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );

      const material = new THREE.PointsMaterial({
        size: hasHeaders ? 2 : 0.5, // Larger points for header data, smaller for non-header
        vertexColors: true,
        sizeAttenuation: false,
        depthTest: true,
        depthWrite: true,
      });

      const pointsMesh = new THREE.Points(geometry, material);
      pointsMesh.userData = { validPoints };
      pointsMesh.renderOrder = 1;
      scene.add(pointsMesh);
      pointsMeshRef.current = pointsMesh;

      console.log("[updateScene] Rendered", validPoints.length, "points");
      console.log("[updateScene] Point size:", hasHeaders ? 2 : 0.5);
      console.log(
        "[updateScene] Grid children:",
        gridMeshRef.current ? gridMeshRef.current.children.length : 0
      );
    } catch (err) {
      console.error("[updateScene] Error while rendering:", err);
    } finally {
      isRenderingRef.current = false;
      setIsRendering(false);
    }
  }, 100);
};

export { initializeScene, createGridOverlay, updateScene };