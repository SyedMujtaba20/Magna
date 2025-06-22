import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import * as THREE from "three";
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
} from "chart.js";
import "chartjs-adapter-date-fns";
import { getColorForThickness,parseThicknessCSV  } from "./utils";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend
);

const zoneMap = {
  Roof: 100,
  SlagLine: 75,
  Belly: 50,
  InitialBricks: 25,
  Bottom: 0,
};

const profileLabels = Array.from({ length: 10 }, (_, i) => `P${i + 1}`);

const ThicknessesScreen = ({
  fileDataCache,
  selectedFile,
  selectedFurnace,
  isUiDisabled,
}) => {
  const [selectedBrick, setSelectedBrick] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const canvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);
  const meshPoolRef = useRef([]);
  const geometryRef = useRef(null);
  const lastFileRef = useRef(null);

  // Memoize the points data to prevent unnecessary re-renders
  // Memoize the points data to prevent unnecessary re-renders
  const points = useMemo(() => {
    if (!selectedFile) {
      console.log("[points] selectedFile is null");
      return [];
    }
    if (!fileDataCache.has(selectedFile.name)) {
      console.log("[points] fileDataCache missing key:", selectedFile.name);
      return [];
    }
    const data = fileDataCache.get(selectedFile.name).points || [];
    console.log(
      "[points] Loaded",
      data.length,
      "points from",
      selectedFile.name
    );
    return data;
  }, [selectedFile, fileDataCache]);

  // Initialize Three.js scene once
  useEffect(() => {
    console.log("[Three.js] Initializing scene");

    if (!canvasRef.current) {
      console.log("[Three.js] canvasRef is null");
      return;
    }

    const canvas = canvasRef.current;
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;

    console.log("[Three.js] Renderer and camera set up");

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
    rendererRef.current = renderer;

    // Initialize camera
    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      1,
      1000
    );
    camera.position.z = 100;
    cameraRef.current = camera;

    // Initialize scene
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x000000);
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // Create reusable geometry
    const cellSize = 20;
    geometryRef.current = new THREE.PlaneGeometry(cellSize - 2, cellSize - 2);

    // Start render loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      const newWidth = canvas.parentElement.clientWidth;
      const newHeight = canvas.parentElement.clientHeight;

      camera.left = -newWidth / 2;
      camera.right = newWidth / 2;
      camera.top = newHeight / 2;
      camera.bottom = -newHeight / 2;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      console.log("[Three.js] Cleaning up scene");
      window.removeEventListener("resize", handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      renderer.dispose();
      if (geometryRef.current) geometryRef.current.dispose();
      meshPoolRef.current.forEach(
        (mesh) => mesh.material && mesh.material.dispose()
      );
    };
  }, []);

  // Optimized mesh creation and management
  const updateScene = useCallback(async () => {
    console.log(
      "[updateScene] Called. Points:",
      points.length,
      "IsRendering:",
      isRendering
    );

    if (!points.length || isRendering) {
      console.log(
        "[updateScene] Early return — either no points or already rendering."
      );
      return;
    }

    setIsRendering(true);

    const updateInChunks = () => {
      return new Promise((resolve) => {
        const scene = sceneRef.current;
        const cellSize = 20;

        const meshesToRemove = scene.children.filter(
          (child) => child.type === "Mesh"
        );
        console.log("[updateScene] Removing", meshesToRemove.length, "meshes");
        meshesToRemove.forEach((mesh) => {
          scene.remove(mesh);
          if (meshPoolRef.current.length < 1000) {
            mesh.visible = false;
            meshPoolRef.current.push(mesh);
          } else {
            mesh.material.dispose();
          }
        });

        const chunkSize = 50;
        let currentIndex = 0;

        const processChunk = () => {
          const endIndex = Math.min(currentIndex + chunkSize, points.length);
          console.log(
            "[updateScene] Processing chunk:",
            currentIndex,
            "to",
            endIndex
          );

          for (let i = currentIndex; i < endIndex; i++) {
            const point = points[i];
            const x =
              point.profileIndex * cellSize -
              (profileLabels.length / 2) * cellSize;
            const y = zoneMap[point.zone] ?? 0;

            // console.log(
            //   `[point-${i}] profile: ${point.profileIndex}, zone: ${point.zone}, x: ${x}, y: ${y}, thickness: ${point.thickness}`
            // );

            let mesh = meshPoolRef.current.pop();
            if (!mesh) {
              const color = getColorForThickness(
                point.thickness,
                0,
                10,
                false,
                {}
              );
              const material = new THREE.MeshBasicMaterial({
                color,
                side: THREE.DoubleSide,
              });
              mesh = new THREE.Mesh(geometryRef.current, material);
            } else {
              mesh.material.color.setHex(
                getColorForThickness(point.thickness, 0, 10, false, {})
              );
            }

            mesh.position.set(x, y, 0);
            mesh.userData = { ...point, index: i };
            mesh.visible = true;
            scene.add(mesh);
          }

          currentIndex = endIndex;
          if (currentIndex < points.length) {
            requestAnimationFrame(processChunk);
          } else {
            console.log("[updateScene] Finished rendering all points.");
            resolve();
          }
        };

        processChunk();
      });
    };

    try {
      await updateInChunks();
    } catch (err) {
      console.error("[updateScene] Error while rendering:", err);
    } finally {
      setIsRendering(false);
    }
  }, [points, isRendering]);

  // Update scene when points change, with debouncing
  useEffect(() => {
    if (lastFileRef.current === selectedFile) {
      console.log("[sceneEffect] Skipped: same file as last render");
      return;
    }

    lastFileRef.current = selectedFile;

    console.log(
      "[sceneEffect] File changed, triggering updateScene for:",
      selectedFile?.name
    );

    const timeoutId = setTimeout(() => {
      updateScene();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [updateScene, selectedFile]);

  // Optimized click handler with throttling
  const handleCanvasClick = useCallback(
    (event) => {
      if (isUiDisabled || isRendering) {
        console.log("[CanvasClick] Ignored — UI disabled or rendering");
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("[CanvasClick] No canvas found");
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      const visibleMeshes = sceneRef.current.children.filter(
        (child) => child.type === "Mesh" && child.visible
      );
      const intersects = raycaster.intersectObjects(visibleMeshes);

      if (intersects.length > 0) {
        console.log(
          "[CanvasClick] Brick selected:",
          intersects[0].object.userData
        );
        setSelectedBrick(intersects[0].object.userData);
      } else {
        console.log("[CanvasClick] No intersection");
      }
    },
    [isUiDisabled, isRendering]
  );

  // Memoize chart data to prevent unnecessary re-renders
  const thicknessData = useMemo(() => {
    if (!selectedBrick?.history) return null;

    return {
      labels: selectedBrick.history.map((h) => h.date),
      datasets: [
        {
          label: `Brick ${selectedBrick.index} Thickness (mm)`,
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

  // Memoize chart options
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          labels: {
            color: "#fff",
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "day" },
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
        y: {
          title: {
            display: true,
            text: "Thickness (mm)",
            color: "#fff",
          },
          min: 0,
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
    }),
    []
  );

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ flex: 1, position: "relative" }}>
        {!selectedFile && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
              zIndex: 1,
            }}
          >
            Please select a file
          </div>
        )}

        {isRendering && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              color: "white",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "5px 10px",
              borderRadius: "4px",
              zIndex: 2,
            }}
          >
            Rendering...
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%" }}
          onClick={handleCanvasClick}
        />
      </div>

      {selectedBrick && thicknessData && (
        <div
          style={{
            width: "300px",
            padding: "10px",
            background: "#111",
            color: "#fff",
            borderLeft: "1px solid #333",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0" }}>Brick #{selectedBrick.index}</h3>
          <div style={{ height: "250px" }}>
            <Line data={thicknessData} options={chartOptions} />
          </div>
          <div style={{ marginTop: "10px", fontSize: "12px" }}>
            <p>Zone: {selectedBrick.zone}</p>
            <p>Profile: P{selectedBrick.profileIndex + 1}</p>
            <p>Current Thickness: {selectedBrick.thickness}mm</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThicknessesScreen;

