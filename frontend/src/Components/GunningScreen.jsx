import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import * as THREE from "three";
import { useTranslation } from "react-i18next";

const GunningScreen = ({
  files,
  fileDataCache,
  selectedFile,
  selectedFurnace,
  isUiDisabled,
}) => {
  const [activeScreen, setActiveScreen] = useState("Bricks");
  const [parameters, setParameters] = useState({
    repairMaterial: "Gunnimag C2",
    wearThreshold: 20,
    distanceBetweenAreas: 0.25,
    minimumAreaSize: 100,
  });

     const { t } = useTranslation();
    
      useEffect(() => {
        const savedLang = localStorage.getItem("language") || "en";
        i18n.changeLanguage(savedLang);
      }, []);
  const [visualizationMode, setVisualizationMode] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNoDataDialog, setShowNoDataDialog] = useState(false);

  const canvasRef = useRef(null);
  const proposalCanvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const proposalSceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const proposalRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const proposalCameraRef = useRef(null);
  const animationFrameRef = useRef(null);

  const materialDensity = 2.2; // g/cm³

  const screenConfigs = {
    Bricks: {
      title: "BRICK WEAR ANALYSIS",
      color: "#FF4444",
      description: "Analyze brick wear patterns and thickness measurements",
      thresholdLabel: "Brick wear threshold:",
      unit: "cm",
    },
    "Slag Line": {
      title: "SLAG LINE WEAR ANALYSIS",
      color: "#FF8800",
      description: "Monitor slag line erosion and damage patterns",
      thresholdLabel: "Slag line wear threshold:",
      unit: "cm",
    },
    Screed: {
      title: "SCREED WEAR ANALYSIS",
      color: "#8844FF",
      description: "Evaluate screed surface condition and wear rates",
      thresholdLabel: "Screed wear threshold:",
      unit: "cm",
    },
  };

  const currentFileData = useMemo(() => {
    if (!selectedFile || !fileDataCache?.has(selectedFile.name)) return null;
    const data = fileDataCache.get(selectedFile.name);
    console.log("currentFileData:", data);
    return data;
  }, [selectedFile, fileDataCache]);

  const processedPoints = useMemo(() => {
    if (!currentFileData?.points) return [];
    let points = currentFileData.points;
    console.log("Raw points count:", points.length);
    if (points.length > 50000) {
      const step = Math.ceil(points.length / 50000);
      points = points.filter((_, index) => index % step === 0);
    }
    const filtered = points.filter((point) => {
      const furnaceMatch =
        !selectedFurnace ||
        !point.furnaceId ||
        point.furnaceId === selectedFurnace.furnace_id;
      const sectionMatch =
        !point.section ||
        point.section === activeScreen ||
        !Object.keys(screenConfigs).includes(point.section);
      const thicknessFilter =
        visualizationMode !== "filtered" ||
        point.thickness <= parameters.wearThreshold;
      return furnaceMatch && sectionMatch && thicknessFilter;
    });
    console.log("Processed points count:", filtered.length, "after filtering");
    if (filtered.length === 0 && points.length > 0) setShowNoDataDialog(true);
    return filtered;
  }, [
    currentFileData,
    selectedFurnace,
    activeScreen,
    visualizationMode,
    parameters.wearThreshold,
  ]);

  const wornPoints = useMemo(() => {
    if (!currentFileData?.points) return [];
    const filtered = currentFileData.points.filter((point) => {
      const furnaceMatch =
        !selectedFurnace ||
        !point.furnaceId ||
        point.furnaceId === selectedFurnace.furnace_id;
      const sectionMatch =
        !point.section ||
        point.section === activeScreen ||
        !Object.keys(screenConfigs).includes(point.section);
      return (
        furnaceMatch &&
        sectionMatch &&
        point.thickness <= parameters.wearThreshold
      );
    });
    console.log("Worn points count:", filtered.length);
    return filtered;
  }, [
    currentFileData,
    selectedFurnace,
    activeScreen,
    parameters.wearThreshold,
  ]);

  const initializeScene = useCallback(
    (canvasRef, sceneRef, cameraRef, rendererRef, bgColor = 0x000000) => {
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

      const handleResize = () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      window.addEventListener("resize", handleResize);

      return () => window.removeEventListener("resize", handleResize);
    },
    []
  );

  useEffect(() => {
    const cleanup = initializeScene(
      canvasRef,
      sceneRef,
      cameraRef,
      rendererRef
    );
    if (!rendererRef.current) return cleanup;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      if (cleanup) cleanup();
    };
  }, [initializeScene]);

  useEffect(() => {
    const cleanup = initializeScene(
      proposalCanvasRef,
      proposalSceneRef,
      proposalCameraRef,
      proposalRendererRef,
      0x222222
    );
    if (!proposalRendererRef.current) return cleanup;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (proposalRendererRef.current && proposalCameraRef.current) {
        proposalRendererRef.current.render(
          proposalSceneRef.current,
          proposalCameraRef.current
        );
      }
    };
    animate();

    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (proposalRendererRef.current) proposalRendererRef.current.dispose();
      if (cleanup) cleanup();
    };
  }, [initializeScene]);

  const createPointCloud = useCallback(
    async (points, scene, camera) => {
      // Clear old points and lines
      scene.children.forEach((child) => {
        if (child.type === "Points" || child.type === "Line") {
          scene.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });

      if (!points.length) {
        console.log("No points to render");
        return;
      }

      setIsProcessing(true);
      const positions = [];
      const colors = [];

      // Separate brick points and other points
      const brickPoints = [];
      const otherPoints = [];

      for (const point of points) {
        const pos = point.position || [
          point.x || 0,
          point.y || 0,
          point.z || 0,
        ];
        if (!pos || pos.length < 3 || pos.some(isNaN)) continue;

        if (point.section === "Bricks") {
          brickPoints.push({ ...point, pos });
        } else {
          otherPoints.push({ ...point, pos });
        }
      }

      // Add other furnace parts in gray
      for (const point of otherPoints) {
        positions.push(...point.pos);
        colors.push(0.5, 0.5, 0.5); // Gray color
      }

      // Add brick points with color coding
      for (const point of brickPoints) {
        positions.push(...point.pos);

        if (point.thickness <= parameters.wearThreshold) {
          colors.push(1, 0, 0); // Red for damaged bricks
        } else {
          colors.push(0, 1, 0); // Green for good bricks
        }
      }

      if (positions.length === 0) {
        console.log("No valid positions after processing");
        setIsProcessing(false);
        return;
      }

      const geometry = new THREE.BufferGeometry();
      const pointSize = Math.min(1.0, 1000 / Math.sqrt(points.length)); // Dynamic point size
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );

      const material = new THREE.PointsMaterial({
        size: pointSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      });
      const pointCloud = new THREE.Points(geometry, material);
      scene.add(pointCloud);

      // Add horizontal white lines for brick section if brick points exist
      if (brickPoints.length > 0) {
        const brickYPositions = brickPoints.map((p) => p.pos[1]);
        const minY = Math.min(...brickYPositions);
        const maxY = Math.max(...brickYPositions);

        const allXPositions = points.map((p) => {
          const pos = p.position || [p.x || 0, p.y || 0, p.z || 0];
          return pos[0];
        });
        const allZPositions = points.map((p) => {
          const pos = p.position || [p.x || 0, p.y || 0, p.z || 0];
          return pos[2];
        });

        const minX = Math.min(...allXPositions);
        const maxX = Math.max(...allXPositions);
        const minZ = Math.min(...allZPositions);
        const maxZ = Math.max(...allZPositions);

        const createHorizontalLine = (y) => {
          const lineGeometry = new THREE.BufferGeometry();
          const linePositions = [
            minX,
            y,
            minZ,
            maxX,
            y,
            minZ,
            maxX,
            y,
            maxZ,
            minX,
            y,
            maxZ,
            minX,
            y,
            minZ,
          ];
          lineGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(linePositions, 3)
          );

          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1, // Thin lines
            transparent: true,
            opacity: 0.8,
          });
          return new THREE.Line(lineGeometry, lineMaterial);
        };

        scene.add(createHorizontalLine(minY));
        scene.add(createHorizontalLine(maxY));
      }

      setIsProcessing(false);

      const box = new THREE.Box3().setFromObject(pointCloud);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraDistance = maxDim * 1.5; // Adjusted zoom
        camera.position.set(center.x, center.y, center.z + cameraDistance);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
      }
    },
    [parameters.wearThreshold]
  );

  useEffect(() => {
    if (!currentFileData || !processedPoints.length) {
      sceneRef.current.children.forEach((child) => {
        if (child.type === "Points" || child.type === "Line") {
          sceneRef.current.remove(child);
          child.geometry.dispose();
          child.material.dispose();
        }
      });
      console.log("No data or points to render in main scene");
      return;
    }
    createPointCloud(processedPoints, sceneRef.current, cameraRef.current);
  }, [currentFileData, processedPoints, createPointCloud]);

  const createRepairAreasVisualization = useCallback(
    async (scene, camera) => {
      scene.children.forEach((child) => {
        if (child.type === "Points" || child.type === "Line") {
          scene.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });

      if (!currentFileData?.points?.length) {
        console.log("No points to render in repair visualization");
        return;
      }

      setIsProcessing(true);
      const positions = [];
      const colors = [];
      const brickPoints = [];

      // Process all points for the furnace
      for (const point of currentFileData.points) {
        const pos = point.position || [
          point.x || 0,
          point.y || 0,
          point.z || 0,
        ];
        if (!pos || pos.length < 3 || pos.some(isNaN)) continue;

        positions.push(...pos);
        colors.push(0.5, 0.5, 0.5); // Gray for entire furnace

        if (point.section === "Bricks") {
          brickPoints.push({ ...point, pos });
        }
      }

      // Create furnace geometry
      const furnaceGeometry = new THREE.BufferGeometry();
      const pointSize = Math.min(
        1.0,
        1000 / Math.sqrt(currentFileData.points.length)
      );
      furnaceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      furnaceGeometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );

      const furnaceMaterial = new THREE.PointsMaterial({
        size: pointSize,
        vertexColors: true,
        opacity: 0.4,
        transparent: true,
      });
      const furnaceCloud = new THREE.Points(furnaceGeometry, furnaceMaterial);
      scene.add(furnaceCloud);

      // Add horizontal white lines for brick section
      if (brickPoints.length > 0) {
        const brickYPositions = brickPoints.map((p) => p.pos[1]);
        const minY = Math.min(...brickYPositions);
        const maxY = Math.max(...brickYPositions);

        const allXPositions = currentFileData.points.map((p) => {
          const pos = p.position || [p.x || 0, p.y || 0, p.z || 0];
          return pos[0];
        });
        const allZPositions = currentFileData.points.map((p) => {
          const pos = p.position || [p.x || 0, p.y || 0, p.z || 0];
          return pos[2];
        });

        const minX = Math.min(...allXPositions);
        const maxX = Math.max(...allXPositions);
        const minZ = Math.min(...allZPositions);
        const maxZ = Math.max(...allZPositions);

        const createHorizontalLine = (y) => {
          const lineGeometry = new THREE.BufferGeometry();
          const linePositions = [
            minX,
            y,
            minZ,
            maxX,
            y,
            minZ,
            maxX,
            y,
            maxZ,
            minX,
            y,
            maxZ,
            minX,
            y,
            minZ,
          ];
          lineGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(linePositions, 3)
          );

          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1, // Thin lines
            transparent: true,
            opacity: 0.9,
          });
          return new THREE.Line(lineGeometry, lineMaterial);
        };

        scene.add(createHorizontalLine(minY));
        scene.add(createHorizontalLine(maxY));
      }

      // Highlight damaged brick areas in red
      if (wornPoints.length > 0) {
        const damagedBrickPositions = [];
        const damagedBrickColors = [];

        for (const point of wornPoints) {
          if (point.section === "Bricks") {
            const pos = point.position || [
              point.x || 0,
              point.y || 0,
              point.z || 0,
            ];
            if (!pos || pos.length < 3 || pos.some(isNaN)) continue;

            damagedBrickPositions.push(...pos);
            damagedBrickColors.push(1, 0, 0); // Red for damaged areas
          }
        }

        if (damagedBrickPositions.length > 0) {
          const damagedGeometry = new THREE.BufferGeometry();
          damagedGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(damagedBrickPositions, 3)
          );
          damagedGeometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(damagedBrickColors, 3)
          );

          const damagedMaterial = new THREE.PointsMaterial({
            size: pointSize * 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
          });
          const damagedCloud = new THREE.Points(
            damagedGeometry,
            damagedMaterial
          );
          scene.add(damagedCloud);
        }
      }

      setIsProcessing(false);

      const box = new THREE.Box3().setFromObject(scene);
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraDistance = maxDim * 1.5; // Adjusted zoom
        camera.position.set(center.x, center.y, center.z + cameraDistance);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
      }
    },
    [wornPoints, currentFileData]
  );

  useEffect(() => {
    if (!currentFileData) {
      proposalSceneRef.current.children.forEach((child) => {
        if (child.type === "Points" || child.type === "Line") {
          proposalSceneRef.current.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });
      console.log("No data for proposal scene");
      return;
    }
    createRepairAreasVisualization(
      proposalSceneRef.current,
      proposalCameraRef.current
    );
  }, [currentFileData, wornPoints, parameters, createRepairAreasVisualization]);

  const groupPointsByProximity = useCallback(
    async (points, maxDistance) => {
      const areas = [];
      const processedIndices = new Set();

      for (let i = 0; i < points.length; i++) {
        if (processedIndices.has(i)) continue;
        const area = { points: [points[i]] };
        processedIndices.add(i);

        for (let j = i + 1; j < points.length; j++) {
          if (processedIndices.has(j)) continue;
          const pos1 = points[i].position || [
            points[i].x || 0,
            points[i].y || 0,
            points[i].z || 0,
          ];
          const pos2 = points[j].position || [
            points[j].x || 0,
            points[j].y || 0,
            points[j].z || 0,
          ];
          const distance = Math.sqrt(
            Math.pow(pos1[0] - pos2[0], 2) +
              Math.pow(pos1[1] - pos2[1], 2) +
              Math.pow(pos1[2] - pos2[2], 2)
          );
          if (distance <= maxDistance) {
            area.points.push(points[j]);
            processedIndices.add(j);
          }
        }

        if (area.points.length >= parameters.minimumAreaSize) areas.push(area);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      return areas;
    },
    [parameters.minimumAreaSize]
  );

  const calculateRepairProposal = useCallback(() => {
    if (!wornPoints.length)
      return { areas: [], total: { volume: 0, weight: 0 } };

    const areas = [];
    const processedIndices = new Set();

    for (let i = 0; i < wornPoints.length; i++) {
      if (processedIndices.has(i)) continue;
      const area = { points: [wornPoints[i]] };
      processedIndices.add(i);

      const pos1 = wornPoints[i].position || [
        wornPoints[i].x || 0,
        wornPoints[i].y || 0,
        wornPoints[i].z || 0,
      ];
      for (let j = i + 1; j < Math.min(i + 1000, wornPoints.length); j++) {
        if (processedIndices.has(j)) continue;
        const pos2 = wornPoints[j].position || [
          wornPoints[j].x || 0,
          wornPoints[j].y || 0,
          points[j].z || 0,
        ];
        const distance = Math.sqrt(
          Math.pow(pos1[0] - pos2[0], 2) +
            Math.pow(pos1[1] - pos2[1], 2) +
            Math.pow(pos1[2] - pos2[2], 2)
        );
        if (distance <= parameters.distanceBetweenAreas) {
          area.points.push(wornPoints[j]);
          processedIndices.add(j);
        }
      }

      if (area.points.length >= parameters.minimumAreaSize) areas.push(area);
    }

    const processedAreas = areas.map((area, index) => {
      const avgThickness =
        area.points.reduce(
          (sum, p) => sum + (parameters.wearThreshold - p.thickness),
          0
        ) / area.points.length;
      const pointDensity = 1000;
      const areaSize = area.points.length / pointDensity;
      const volume = Math.max(0.001, areaSize * (avgThickness / 100));
      const weight = volume * materialDensity * 1000;
      return {
        id: index + 1,
        volume,
        weight,
        pointCount: area.points.length,
        avgWear: avgThickness,
      };
    });

    const totalVolume = processedAreas.reduce(
      (sum, area) => sum + area.volume,
      0
    );
    const totalWeight = processedAreas.reduce(
      (sum, area) => sum + area.weight,
      0
    );

    return {
      areas: processedAreas,
      total: { volume: totalVolume, weight: totalWeight },
    };
  }, [wornPoints, parameters]);

  const handleParameterChange = useCallback((param, value) => {
    setParameters((prev) => ({ ...prev, [param]: value }));
  }, []);

  const incrementValue = useCallback((param, increment) => {
    setParameters((prev) => ({
      ...prev,
      [param]: Math.max(0, prev[param] + increment),
    }));
  }, []);

  const repairProposal = useMemo(
    () => calculateRepairProposal(),
    [calculateRepairProposal]
  );
  const currentConfig = screenConfigs[activeScreen];
  const availableSections = useMemo(() => {
    if (!currentFileData?.points) return Object.keys(screenConfigs);
    const sections = new Set();
    currentFileData.points.forEach((point) => {
      if (point.section && screenConfigs[point.section])
        sections.add(point.section);
    });
    return sections.size > 0
      ? Array.from(sections)
      : Object.keys(screenConfigs);
  }, [currentFileData]);

  const closeNoDataDialog = () => {
    setShowNoDataDialog(false);
  };

  return (
    // <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f0f0f0", fontFamily: "Arial, sans-serif", overflow: "hidden" }}>
    <div
      style={{
        display: "flex",
        flexDirection: "column", // Make it column-based
        minHeight: "100vh", // Ensure it covers full height
        maxHeight: "100vh", // Prevent it from exceeding the viewport
        overflowY: "auto", // Enable vertical scroll if needed
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
            {availableSections.map((screen) => (
              <button
                key={screen}
                onClick={() => setActiveScreen(screen)}
                style={{
                  backgroundColor:
                    activeScreen === screen
                      ? screenConfigs[screen].color
                      : "#555",
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
                {screen}
              </button>
            ))}
          </div>
          <div>
            File: {selectedFile ? selectedFile.name : "No file selected"} |
            Points: {processedPoints.length} | Worn: {wornPoints.length}
            {isProcessing && (
              <span style={{ color: "#ffaa00" }}> | Processing...</span>
            )}
          </div>
        </div>

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

        <div style={{ display: "flex", gap: "10px" }}>
          <div
            style={{
              flex: 1,
              backgroundColor: "#000",
              border: `2px solid ${currentConfig.color}`,
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                color: "white",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "bold",
                zIndex: 1000,
              }}
            >
              {currentConfig.title}
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
                onClick={() =>
                  setVisualizationMode(
                    visualizationMode === "all" ? "filtered" : "all"
                  )
                }
                style={{
                  backgroundColor:
                    visualizationMode === "filtered" ? "#10B981" : "#666",
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
                {visualizationMode === "all" ? "Show Filtered" : "Show All"}
              </button>
            </div>

            <div
              style={{
                position: "absolute",
                top: "85px",
                left: "10px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: wornPoints.length > 0 ? "#FF4444" : "#10B981",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                zIndex: 1000,
              }}
            >
              {wornPoints.length > 0
                ? `${wornPoints.length} points need repair`
                : "No repairs needed"}
            </div>

            <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: "#000",
              border: "2px solid #FF6600",
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: "rgba(0,0,0,0.8)",
                color: "white",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "bold",
                zIndex: 1000,
              }}
            >
              {t("gunite.title")}
              {/* GUNITE PROPOSAL VISUALIZATION */}
            </div>

            <div
              style={{
                position: "absolute",
                top: "40px",
                left: "10px",
                right: "10px",
                backgroundColor: "rgba(0,0,0,0.8)",
                color: "#FFD700",
                padding: "6px 10px",
                borderRadius: "4px",
                fontSize: "10px",
                zIndex: 1000,
                textAlign: "center",
              }}
            >
              {t("gunite.description")}
              {/* Shows 3D visualization of repair areas and material requirements */}
            </div>

            <div
              style={{
                position: "absolute",
                top: "85px",
                left: "10px",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: repairProposal.areas.length > 0 ? "#FF4444" : "#666",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "10px",
                zIndex: 1000,
              }}
            >
              {repairProposal.areas.length > 0
                ? `${repairProposal.areas.length} Repair Area(s)`
                : "No Repairs Needed"}
            </div>

            <canvas
              ref={proposalCanvasRef}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "100px" }}>
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
              {activeScreen.toUpperCase()} {t("analysis.settingsTitle")}
            </h3>

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
                {t("repair.materialLabel")}
                {/* Repair material: */}
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
                onChange={(e) =>
                  handleParameterChange("repairMaterial", e.target.value)
                }
                disabled={isUiDisabled}
              >
                {/* <option value="Gunnimag C2">Gunnimag C2</option>
                <option value="Standard Gunite">Standard Gunite</option>
                <option value="High-Density">High-Density</option>
                <option value="Low-Thermal">Low-Thermal</option> */}
                <option value="Gunnimag C2">
                  {t("repair.materialOptions.gunnimagC2")}
                </option>
                <option value="Standard Gunite">
                  {t("repair.materialOptions.standardGunite")}
                </option>
                <option value="High-Density">
                  {t("repair.materialOptions.highDensity")}
                </option>
                <option value="Low-Thermal">
                  {t("repair.materialOptions.lowThermal")}
                </option>
              </select>
            </div>

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
              <div
                style={{ display: "flex", alignItems: "center", gap: "5px" }}
              >
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
                  onChange={(e) =>
                    handleParameterChange(
                      "wearThreshold",
                      Number(e.target.value)
                    )
                  }
                  min="0"
                  step="1"
                  disabled={isUiDisabled || isProcessing}
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
                  disabled={isUiDisabled || isProcessing}
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
                  disabled={isUiDisabled || isProcessing}
                >
                  ▼
                </button>
                <span
                  style={{ fontSize: "11px", color: "#666", minWidth: "20px" }}
                >
                  {currentConfig.unit}
                </span>
              </div>
            </div>

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
                {t("analysis.distanceBetweenAreas")}
                {/* Distance between areas: */}
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="range"
                  style={{ flex: 1 }}
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={parameters.distanceBetweenAreas}
                  onChange={(e) =>
                    handleParameterChange(
                      "distanceBetweenAreas",
                      Number(e.target.value)
                    )
                  }
                  disabled={isUiDisabled || isProcessing}
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
                  onChange={(e) =>
                    handleParameterChange(
                      "distanceBetweenAreas",
                      Number(e.target.value)
                    )
                  }
                  disabled={isUiDisabled || isProcessing}
                  min="0.1"
                  step="0.05"
                />
                <span
                  style={{ fontSize: "11px", color: "#666", minWidth: "40px" }}
                >
                  meters
                </span>
              </div>
            </div>

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
                {/* Minimum area size: */}
                {t("comparison.minAreaSize")}
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="range"
                  style={{ flex: 1 }}
                  min="10"
                  max="500"
                  step="10"
                  value={parameters.minimumAreaSize}
                  onChange={(e) =>
                    handleParameterChange(
                      "minimumAreaSize",
                      Number(e.target.value)
                    )
                  }
                  disabled={isUiDisabled || isProcessing}
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
                  onChange={(e) =>
                    handleParameterChange(
                      "minimumAreaSize",
                      Number(e.target.value)
                    )
                  }
                  disabled={isUiDisabled || isProcessing}
                  min="10"
                  step="10"
                />
                <span
                  style={{ fontSize: "12px", color: "#666", minWidth: "40px" }}
                >
                  points
                </span>
              </div>
            </div>
            <button
              style={{
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                width: "100%",
              }}
              disabled={isUiDisabled}
              onClick={() => {
                console.log("Parameters accepted:", parameters);
                alert("Parameters accepted successfully!");
              }}
            >
              {/* Accept */}
              {t("common.accept")}
            </button>
          </div>

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
              {/* REPAIR PROPOSAL */}
              {t("repair.title")}
            </h3>

            {/* <div
              style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}
            >
              <strong>Material:</strong> {parameters.repairMaterial}
            </div>
            <div
              style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}
            >
              <strong>Density:</strong> {materialDensity} g/cm³
            </div>
            <div
              style={{ fontSize: "12px", marginBottom: "20px", color: "#333" }}
            >
              <strong>Section:</strong> {activeScreen}
            </div> */}
            <div
              style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}
            >
              <strong>{t("repair.material")}:</strong>{" "}
              {parameters.repairMaterial}
            </div>
            <div
              style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}
            >
              <strong>{t("repair.density")}:</strong> {materialDensity} g/cm³
            </div>
            <div
              style={{ fontSize: "12px", marginBottom: "20px", color: "#333" }}
            >
              <strong>{t("repair.section")}:</strong> {activeScreen}
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
              {repairProposal.areas.length > 0 ? (
                repairProposal.areas.map((area) => (
                  <div
                    key={area.id}
                    style={{
                      marginBottom: "12px",
                      fontSize: "12px",
                      color: "#d32f2f",
                      fontWeight: "bold",
                    }}
                  >
                    <span style={{ color: "#d32f2f" }}>Area {area.id}:</span>{" "}
                    {area.volume.toFixed(2)}m³ | {area.weight.toFixed(2)} Kg |{" "}
                    {area.pointCount} points | Avg Wear:{" "}
                    {area.avgWear.toFixed(2)} cm
                  </div>
                ))
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "20px 0",
                  }}
                >
                  {t("repair.noAreas")}
                  {/* No areas requiring repair with current parameters */}
                </div>
              )}

              <div
                style={{
                  borderTop: "1px solid #ddd",
                  paddingTop: "12px",
                  marginTop: "15px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                <strong>TOTAL:</strong>{" "}
                <span style={{ color: "#d32f2f" }}>
                  {repairProposal.total.volume.toFixed(2)}m³ |{" "}
                  {repairProposal.total.weight.toFixed(2)} Kg
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showNoDataDialog && (
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
            if (e.target === e.currentTarget) closeNoDataDialog();
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
              <h3 style={{ margin: 0, color: "#1a202c" }}>No Data Available</h3>
              <button
                onClick={closeNoDataDialog}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#666"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {/* <div
              style={{ color: "#dc3545", textAlign: "center", padding: "20px" }}
            >
              No points are available for the selected screen "{activeScreen}".
              <br />
              Possible causes:
              <ul style={{ textAlign: "left", marginTop: "10px" }}>
                <li>Missing or mismatched "section" data in the CSV file.</li>
                <li>No points match the current furnace selection.</li>
                <li>Thickness data may not align with the wear threshold.</li>
              </ul>
              Please check the file "{selectedFile?.name}" or adjust the
              settings.
            </div> */}
            <div
              style={{ color: "#dc3545", textAlign: "center", padding: "20px" }}
            >
              {t("warning.noPoints", { screen: activeScreen })}
              <br />
              {t("warning.causes")}:
              <ul style={{ textAlign: "left", marginTop: "10px" }}>
                <li>{t("warning.cause1")}</li>
                <li>{t("warning.cause2")}</li>
                <li>{t("warning.cause3")}</li>
              </ul>
              {t("warning.suggestion", { file: selectedFile?.name || "" })}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={closeNoDataDialog}
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
