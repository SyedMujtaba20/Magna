import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { debounce, throttle } from "lodash";

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, Filler);

const getColorForThickness = (thickness, min, max, useGlobal, range) => {
  const normalized = Math.max(0, Math.min(1, (thickness - min) / (max - min)));
  return {
    r: normalized,
    g: 1 - normalized,
    b: 0.5,
  };
};

const zoneMap = {
  Roof: 100,
  SlagLine: 50,
  Belly: 0,
  InitialBricks: -50,
  Bottom: -100,
};

const profileLabels = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);

function getThicknessHistoryForCell(cellData, fileDataCache) {
  const { zone, profileIndex } = cellData;
  const history = [];

  for (const [fileName, fileData] of fileDataCache) {
    let timestamp = null;
    const points = fileData.points || [];
    if (points.length > 0 && points[0].timestamp) {
      try {
        const tsNumber = parseInt(points[0].timestamp, 10);
        if (!isNaN(tsNumber)) {
          timestamp = new Date(tsNumber).toISOString().split("T")[0];
        }
      } catch (e) {
        console.warn("[History] Failed to parse point timestamp for file:", fileName, points[0].timestamp);
      }
    }

    if (!timestamp) {
      try {
        timestamp = new Date(fileName).toISOString().split("T")[0];
      } catch (e) {
        console.warn("[History] Invalid timestamp for file:", fileName);
        continue;
      }
    }

    const matchingPoints = points.filter(
      (point) =>
        point.zone === zone &&
        point.profileIndex === profileIndex &&
        typeof point.thickness === "number"
    );

    if (matchingPoints.length > 0) {
      const avgThickness = matchingPoints.reduce((sum, point) => sum + point.thickness, 0) / matchingPoints.length / 10;
      history.push({
        date: timestamp,
        thickness: avgThickness,
      });
    }
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log("[History] Cell history:", history);
  return history;
}

function getThicknessHistoryForPoint(pointData, fileDataCache) {
  const { position } = pointData;
  const history = [];

  for (const [fileName, fileData] of fileDataCache) {
    let timestamp = null;
    const points = fileData.points || [];
    if (points.length > 0 && points[0].timestamp) {
      try {
        const tsNumber = parseInt(points[0].timestamp, 10);
        if (!isNaN(tsNumber)) {
          timestamp = new Date(tsNumber).toISOString().split("T")[0];
        }
      } catch (e) {
        console.warn("[History] Failed to parse point timestamp for file:", fileName, points[0].timestamp);
      }
    }

    if (!timestamp) {
      try {
        timestamp = new Date(fileName).toISOString().split("T")[0];
      } catch (e) {
        console.warn("[History] Invalid timestamp for file:", fileName);
        continue;
      }
    }

    const matchingPoint = points.find((point) => {
      if (!point.position || point.position.length !== 3) return false;
      const dx = point.position[0] - position[0];
      const dy = point.position[1] - position[1];
      const dz = point.position[2] - position[2];
      return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.01;
    });

    if (matchingPoint && typeof matchingPoint.thickness === "number") {
      history.push({
        date: timestamp,
        thickness: matchingPoint.thickness / 10,
      });
    }
  }

  history.sort((a, b) => new Date(a.date) - new Date(b.date));
  console.log("[History] Point history:", history);
  return history;
}

const ThicknessesScreen = ({ fileDataCache, selectedFile, selectedFurnace, isUiDisabled }) => {
  const [selectedBrick, setSelectedBrick] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const canvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);
  const pointsMeshRef = useRef(null);
  const gridMeshRef = useRef(null);
  const markerMeshRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const controlsRef = useRef(null);
  const prevPointsLengthRef = useRef(0);
  const isRenderingRef = useRef(false);

  const points = useMemo(() => {
    if (!selectedFile) {
      console.log("[points] No file selected.");
      return [];
    }
    if (!fileDataCache.has(selectedFile.name)) {
      console.log("[points] File data not found for:", selectedFile.name);
      return [];
    }
    const data = fileDataCache.get(selectedFile.name).points || [];
    console.log("[points] Loaded", data.length, "points from", selectedFile.name);
    return data;
  }, [selectedFile?.name, fileDataCache]);

  // Chart data
  const cellThicknessData = useMemo(() => {
    if (!selectedCell?.history || selectedCell.history.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: `${selectedCell?.zone || "Unknown"} - ${selectedCell?.profile || "Unknown"} Thickness (cm)`,
            data: [],
            borderColor: "#00ff88",
            backgroundColor: "rgba(0, 255, 136, 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      };
    }

    return {
      labels: selectedCell.history.map((h) => h.date),
      datasets: [
        {
          label: `${selectedCell.zone} - ${selectedCell.profile} Thickness (cm)`,
          data: selectedCell.history.map((h) => h.thickness),
          borderColor: "#00ff88",
          backgroundColor: "rgba(0, 255, 136, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [selectedCell]);

  const pointThicknessData = useMemo(() => {
    if (!selectedBrick?.history || selectedBrick.history.length === 0) {
      return {
        labels: [],
        datasets: [
          {
            label: `Point ${selectedBrick?.index || "Unknown"} Thickness (cm)`,
            data: [],
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: false,
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      };
    }

    return {
      labels: selectedBrick.history.map((h) => h.date),
      datasets: [
        {
          label: `Point ${selectedBrick.index} Thickness (cm)`,
          data: selectedBrick.history.map((h) => h.thickness),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: false,
          tension: 0.1,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [selectedBrick]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          labels: { color: "#fff" },
          position: "top",
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "day" },
          ticks: { color: "black" },
          grid: { color: "rgba(255,255,255,0.1)" },
          title: {
            display: true,
            text: "Time",
            color: "black",
          },
        },
        y: {
          title: {
            display: true,
            text: "Thickness (cm)",
            color: "black",
          },
          min: 0,
          ticks: { color: "black" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
    }),
    []
  );

  useEffect(() => {
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
    camera.position.set(0, 0, 200);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x111111);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    raycasterRef.current.params.Points.threshold = 2;
    raycasterRef.current.params.Mesh = { threshold: 0.1 };

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

    createGridOverlay();
    gridMeshRef.current.visible = showGrid;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
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
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.visible = showGrid;
      console.log("[GridVisibility] Grid visible:", showGrid);
    }
  }, [showGrid]);

  const createGridOverlay = useCallback(() => {
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
    const zonePositions = Object.values(zoneMap);

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
    const profileSpacing = 300 / profileCount;

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
      line.userData = { type: "profile", name: `P${i + 1}`, position: xPos };
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

    const cellGeometry = new THREE.PlaneGeometry(profileSpacing, 30);

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
        console.log("[GridCell] Position:", { xPos, yPos, zone: zoneNames[zoneIndex], profile: `P${profileIndex + 1}` });
        gridGroup.add(cellMesh);
      }
    }

    scene.add(gridGroup);
    gridMeshRef.current = gridGroup;
  }, []);

  const updateScene = useCallback(
    debounce(async () => {
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

          const visualX = x * 10;
          const visualY = y * 10;
          const visualZ = z * 10;

          positions.push(visualX, visualY, visualZ);

          const computedThickness = point.thickness ?? Math.sqrt(x * x + y * y + z * z);
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
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 2,
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
        console.log("[updateScene] Grid children:", gridMeshRef.current ? gridMeshRef.current.children.length : 0);
      } catch (err) {
        console.error("[updateScene] Error while rendering:", err);
      } finally {
        isRenderingRef.current = false;
        setIsRendering(false);
      }
    }, 100),
    [points]
  );

  useEffect(() => {
    if (!selectedFile) return;

    console.log("[sceneEffect] File changed, updating scene for:", selectedFile?.name);

    const timeoutId = setTimeout(() => {
      updateScene();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedFile?.name, updateScene]);

  const handleCanvasClick = useCallback((event) => {
    if (isUiDisabled || isRendering) {
      console.log("[CanvasClick] Blocked: UI disabled or rendering");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log("[CanvasClick] No canvas reference");
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    console.log("[CanvasClick] Mouse coords:", mouse.x, mouse.y);

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(mouse, cameraRef.current);

    if (gridMeshRef.current) {
      gridMeshRef.current.traverse((child) => {
        if (child.userData.type === "cell" && child.material) {
          child.material.opacity = 0.2;
          child.material.color.set(0x333333);
        }
      });
    }

    if (markerMeshRef.current) {
      sceneRef.current.remove(markerMeshRef.current);
      markerMeshRef.current.geometry.dispose();
      markerMeshRef.current.material.dispose();
      markerMeshRef.current = null;
    }

    if (gridMeshRef.current && showGrid) {
      const gridIntersects = raycaster.intersectObjects(gridMeshRef.current.children, true);
      console.log("[CanvasClick] Grid intersections:", gridIntersects.length);

      const cellIntersect = gridIntersects
        .filter((intersect) => intersect.object.userData.type === "cell")
        .sort((a, b) => a.distance - b.distance)[0];

      if (cellIntersect) {
        const cellData = cellIntersect.object.userData;
        console.log("[CanvasClick] Grid cell selected:", cellData);

        cellIntersect.object.material.opacity = 0.3;
        cellIntersect.object.material.color.set(0x00ff88);

        const history = getThicknessHistoryForCell(cellData, fileDataCache);
        const currentThickness = history.length > 0 ? history[history.length - 1].thickness : 0;

        setSelectedCell({
          ...cellData,
          history,
          currentThickness,
        });
        setSelectedBrick(null);
        return;
      }
    }

    if (pointsMeshRef.current) {
      const intersects = raycaster.intersectObject(pointsMeshRef.current);
      console.log("[CanvasClick] Point intersections:", intersects.length);

      if (intersects.length > 0) {
        const selectedIndex = intersects[0].index;
        const validPoints = pointsMeshRef.current.userData.validPoints;
        const selectedData = validPoints[selectedIndex];

        if (selectedData) {
          console.log("[CanvasClick] Point selected:", selectedData);

          if (markerMeshRef.current) {
            sceneRef.current.remove(markerMeshRef.current);
            markerMeshRef.current.geometry.dispose();
            markerMeshRef.current.material.dispose();
            markerMeshRef.current = null;
          }

          const markerGeometry = new THREE.SphereGeometry(3, 16, 16);
          const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
          const markerPos = {
            x: selectedData.position[0] * 10,
            y: selectedData.position[1] * 10,
            z: selectedData.position[2] * 10,
          };
          markerMesh.position.set(markerPos.x, markerPos.y, markerPos.z);
          console.log("[CanvasClick] Marker position:", markerPos);
          sceneRef.current.add(markerMesh);
          markerMeshRef.current = markerMesh;

          const history = getThicknessHistoryForPoint(selectedData, fileDataCache);
          const currentThickness = history.length > 0 ? history[history.length - 1].thickness : selectedData.thickness / 10;

          setSelectedBrick({
            ...selectedData,
            index: selectedIndex,
            history,
            thickness: currentThickness,
          });
          setSelectedCell(null);
        }
      }
    }
  }, [isUiDisabled, isRendering, showGrid, fileDataCache]);

  const handleMouseMove = throttle(() => {
    console.log("[Canvas] Mouse move event");
  }, 100);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, position: "relative" }}>
        {!isInitialized && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "black",
              zIndex: 1,
              textAlign: "center",
            }}
          >
            Initializing...
          </div>
        )}
        {!selectedFile && isInitialized && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "black",
              zIndex: 1,
              textAlign: "center",
            }}
          >
            Please select a file to visualize thickness data.
          </div>
        )}
        {isRendering && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              color: "black",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: "5px 10px",
              borderRadius: "4px",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            Loading {points.length} points...
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            color: "black",
            backgroundColor: "rgba(255,255,255,0.7)",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            zIndex: 5,
            pointerEvents: "all",
          }}
        >
          <div>Points: {points.length}</div>
          <div>🟢 Zones: Roof, Slag Line, Belly, Initial Bricks, Bottom</div>
          <div>🔵 Profiles</div>
          <div>Click grid cells or points to view thickness history</div>
          <div>Drag to rotate, scroll to zoom</div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            style={{
              marginTop: "5px",
              padding: "3px 8px",
              backgroundColor: showGrid ? "#333" : "#888",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
        </div>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", cursor: "crosshair", display: isInitialized ? "block" : "none" }}
          onClick={(e) => {
            console.log("[Canvas] Raw click");
            handleCanvasClick(e);
          }}
          onMouseMove={handleMouseMove}
          onWheel={(e) => console.log("[Canvas] Wheel event:", e.deltaY)}
        />
      </div>
      {(selectedCell || selectedBrick) && (
        <div
          style={{
            width: "30%",
            padding: "15px",
            background: "#fff",
            color: "black",
            borderLeft: "1px solid #333",
            overflowY: "auto",
          }}
        >
          {selectedCell && (
            <>
              <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>
                Grid Cell: {selectedCell.zone} - {selectedCell.profile}
              </h3>
              {selectedCell.history.length === 0 ? (
                <p style={{ color: "#333" }}>No thickness history data available.</p>
              ) : (
                <div style={{ height: "200px", marginBottom: "15px" }}>
                  <Line data={cellThicknessData} options={chartOptions} />
                </div>
              )}
            </>
          )}
          {selectedBrick && !selectedCell && (
            <>
              <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Point #{selectedBrick.index}</h3>
              {selectedBrick.history.length === 0 ? (
                <p style={{ color: "#333" }}>No thickness history data available.</p>
              ) : (
                <div style={{ height: "200px", marginBottom: "15px" }}>
                  <Line data={pointThicknessData} options={chartOptions} />
                </div>
              )}
              <div style={{ fontSize: "12px", color: "black", lineHeight: "1.6" }}>
                <p><strong>Position:</strong></p>
                <p>X: {selectedBrick.position[0]?.toFixed(3)}</p>
                <p>Y: {selectedBrick.position[1]?.toFixed(3)}</p>
                <p>Z: {selectedBrick.position[2]?.toFixed(3)}</p>
                <p><strong>Thickness:</strong> {selectedBrick.thickness?.toFixed(2)} cm</p>
                {selectedBrick.zone && <p><strong>Zone:</strong> {selectedBrick.zone}</p>}
                {selectedBrick.section && <p><strong>Section:</strong> {selectedBrick.section}</p>}
              </div>
            </>
          )}
          <button
            onClick={() => {
              setSelectedCell(null);
              setSelectedBrick(null);
              if (markerMeshRef.current) {
                sceneRef.current.remove(markerMeshRef.current);
                markerMeshRef.current.geometry.dispose();
                markerMeshRef.current.material.dispose();
                markerMeshRef.current = null;
              }
              if (gridMeshRef.current) {
                gridMeshRef.current.traverse((child) => {
                  if (child.userData.type === "cell" && child.material) {
                    child.material.opacity = 0.2;
                    child.material.color.set(0x333333);
                  }
                });
              }
            }}
            style={{
              marginTop: "10px",
              padding: "8px 15px",
              backgroundColor: "#333",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(ThicknessesScreen);