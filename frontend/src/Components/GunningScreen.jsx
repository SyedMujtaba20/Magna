import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import * as THREE from "three";

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
  const [visualizationMode, setVisualizationMode] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef(null);
  const proposalCanvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const proposalSceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const proposalRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const proposalCameraRef = useRef(null);
  const animationFrameRef = useRef(null);
  const proposalAnimationFrameRef = useRef(null);

  const materialDensity = 2.2; // g/cm³

  // Screen configurations for different sections
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

  // Get current file data with performance optimization
  const currentFileData = useMemo(() => {
    if (!selectedFile || !fileDataCache?.has(selectedFile.name)) {
      return null;
    }
    return fileDataCache.get(selectedFile.name);
  }, [selectedFile, fileDataCache]);

  // Optimized point processing with chunking for large datasets
  const processedPoints = useMemo(() => {
    if (!currentFileData?.points) {
      return [];
    }

    // Limit points for performance (sample if too many)
    let points = currentFileData.points;
    if (points.length > 50000) {
      // Sample every nth point to reduce load
      const step = Math.ceil(points.length / 50000);
      points = points.filter((_, index) => index % step === 0);
    }

    return points.filter((point) => {
      if (selectedFurnace && point.furnaceId !== selectedFurnace.furnace_id) {
        return false;
      }

      if (point.section && point.section !== activeScreen) {
        return false;
      }

      if (
        visualizationMode === "filtered" &&
        point.thickness > parameters.wearThreshold
      ) {
        return false;
      }

      return true;
    });
  }, [
    currentFileData,
    selectedFurnace,
    activeScreen,
    visualizationMode,
    parameters.wearThreshold,
  ]);

  // Get worn points for repair calculation
  const wornPoints = useMemo(() => {
    if (!currentFileData?.points) {
      return [];
    }

    return currentFileData.points.filter((point) => {
      if (selectedFurnace && point.furnaceId !== selectedFurnace.furnace_id) {
        return false;
      }

      if (point.section && point.section !== activeScreen) {
        return false;
      }

      return point.thickness <= parameters.wearThreshold;
    });
  }, [
    currentFileData,
    selectedFurnace,
    activeScreen,
    parameters.wearThreshold,
  ]);

  // Optimized 3D scene initialization
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
        antialias: false, // Disable for better performance
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setClearColor(bgColor);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
      rendererRef.current = renderer;

      // Optimized lighting
      scene.add(new THREE.AmbientLight(0x404040, 0.6));
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      return renderer;
    },
    []
  );

  // Initialize main visualization canvas
  useEffect(() => {
    const renderer = initializeScene(
      canvasRef,
      sceneRef,
      cameraRef,
      rendererRef
    );
    if (!renderer) return;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(sceneRef.current, cameraRef.current);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
    };
  }, [initializeScene]);

  // Initialize proposal visualization canvas
  useEffect(() => {
    const renderer = initializeScene(
      proposalCanvasRef,
      proposalSceneRef,
      proposalCameraRef,
      proposalRendererRef,
      0x222222
    );
    if (!renderer) return;

    const animate = () => {
      proposalAnimationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(proposalSceneRef.current, proposalCameraRef.current);
    };
    animate();

    return () => {
      if (proposalAnimationFrameRef.current) {
        cancelAnimationFrame(proposalAnimationFrameRef.current);
      }
      renderer.dispose();
    };
  }, [initializeScene]);

  // Optimized point cloud creation
  const createPointCloud = useCallback(
    (points, scene) => {
      // Clear existing points
      scene.children.forEach((child) => {
        if (child.type === "Points") {
          scene.remove(child);
          child.geometry.dispose();
          child.material.dispose();
        }
      });

      if (!points.length) return;

      setIsProcessing(true);

      // Process points in chunks to avoid blocking
      const chunkSize = 10000;
      const processChunk = (startIndex) => {
        const positions = [];
        const colors = [];
        const endIndex = Math.min(startIndex + chunkSize, points.length);

        for (let i = startIndex; i < endIndex; i++) {
          const point = points[i];

          // Get position
          if (
            point.position &&
            Array.isArray(point.position) &&
            point.position.length >= 3
          ) {
            positions.push(...point.position);
          } else if (
            point.x !== undefined &&
            point.y !== undefined &&
            point.z !== undefined
          ) {
            positions.push(point.x, point.y, point.z);
          } else {
            continue;
          }

          // Color coding based on thickness
          let color;
          if (point.thickness <= parameters.wearThreshold) {
            color = { r: 1, g: 0, b: 0 }; // Red for areas needing repair
          } else if (point.thickness <= parameters.wearThreshold * 1.5) {
            color = { r: 1, g: 0.5, b: 0 }; // Orange for moderate wear
          } else {
            color = { r: 0, g: 1, b: 0 }; // Green for good condition
          }

          colors.push(color.r, color.g, color.b);
        }

        // Create geometry for this chunk
        if (positions.length > 0) {
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
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
          });

          const pointCloud = new THREE.Points(geometry, material);
          scene.add(pointCloud);
        }

        // Process next chunk or finish
        if (endIndex < points.length) {
          setTimeout(() => processChunk(endIndex), 10);
        } else {
          setIsProcessing(false);

          // Center the view on all point clouds
          const box = new THREE.Box3();
          scene.children.forEach((child) => {
            if (child.type === "Points") {
              box.expandByObject(child);
            }
          });

          if (!box.isEmpty()) {
            const center = box.getCenter(new THREE.Vector3());
            scene.children.forEach((child) => {
              if (child.type === "Points") {
                child.position.sub(center);
              }
            });
          }
        }
      };

      processChunk(0);
    },
    [parameters.wearThreshold]
  );

  // Update main visualization
  useEffect(() => {
    if (!currentFileData || !processedPoints.length) {
      createPlaceholderVisualization(sceneRef.current);
      return;
    }

    createPointCloud(processedPoints, sceneRef.current);
  }, [currentFileData, processedPoints, createPointCloud]);

  // Create placeholder visualization
  const createPlaceholderVisualization = useCallback(
    (scene) => {
      // Clear existing objects
      scene.children.forEach((child) => {
        if (
          child.type === "Points" ||
          child.type === "Mesh" ||
          child.type === "Group"
        ) {
          scene.remove(child);
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        }
      });

      const furnaceGroup = new THREE.Group();
      const currentConfig = screenConfigs[activeScreen];

      // Create different shapes for different screens
      let geometry, material;

      switch (activeScreen) {
        case "Bricks":
          geometry = new THREE.CylinderGeometry(15, 18, 30, 16);
          material = new THREE.MeshLambertMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.7,
          });
          break;
        case "Slag Line":
          geometry = new THREE.TorusGeometry(15, 3, 8, 24);
          material = new THREE.MeshLambertMaterial({
            color: 0x886644,
            transparent: true,
            opacity: 0.7,
          });
          break;
        case "Screed":
          geometry = new THREE.BoxGeometry(30, 5, 30);
          material = new THREE.MeshLambertMaterial({
            color: 0x444488,
            transparent: true,
            opacity: 0.7,
          });
          break;
        default:
          geometry = new THREE.CylinderGeometry(15, 18, 30, 16);
          material = new THREE.MeshLambertMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.7,
          });
      }

      const mesh = new THREE.Mesh(geometry, material);
      furnaceGroup.add(mesh);

      // Add sample indicators
      for (let i = 0; i < 15; i++) {
        const angle = (i / 15) * Math.PI * 2;
        const radius = 14 + Math.random() * 2;
        const height = -10 + Math.random() * 20;

        const indicatorGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const thickness = Math.random() * 30;
        let color;
        if (thickness <= parameters.wearThreshold) {
          color = 0xff0000;
        } else if (thickness <= parameters.wearThreshold * 1.5) {
          color = 0xff8800;
        } else {
          color = 0x00ff00;
        }

        const indicatorMaterial = new THREE.MeshLambertMaterial({ color });
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
        furnaceGroup.add(indicator);
      }

      scene.add(furnaceGroup);
    },
    [activeScreen, parameters.wearThreshold]
  );

  // Create repair areas visualization
  const createRepairAreasVisualization = useCallback(
    (scene, repairProposal) => {
      // Create base visualization
      createPlaceholderVisualization(scene);

      // Add repair area indicators based on actual worn points
      if (wornPoints.length > 0) {
        // Group worn points by proximity to create repair areas
        const repairAreas = groupPointsByProximity(
          wornPoints,
          parameters.distanceBetweenAreas
        );

        repairAreas.forEach((area, index) => {
          if (area.points.length < parameters.minimumAreaSize) return;

          // Calculate center of repair area
          const center = area.points
            .reduce(
              (acc, point) => {
                const pos = point.position || [
                  point.x || 0,
                  point.y || 0,
                  point.z || 0,
                ];
                return [acc[0] + pos[0], acc[1] + pos[1], acc[2] + pos[2]];
              },
              [0, 0, 0]
            )
            .map((coord) => coord / area.points.length);

          // Create repair area indicator
          const areaGeometry = new THREE.SphereGeometry(2, 16, 16);
          const areaMaterial = new THREE.MeshLambertMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.8,
          });
          const areaIndicator = new THREE.Mesh(areaGeometry, areaMaterial);
          areaIndicator.position.set(center[0], center[1], center[2]);

          scene.add(areaIndicator);

          // Add pulsing animation
          const animatePulse = () => {
            const scale = 1 + Math.sin(Date.now() * 0.005 + index) * 0.2;
            areaIndicator.scale.setScalar(scale);
            proposalAnimationFrameRef.current =
              requestAnimationFrame(animatePulse);
          };
          animatePulse();
        });
      }
    },
    [wornPoints, parameters.distanceBetweenAreas, parameters.minimumAreaSize]
  );

  // Group points by proximity
  const groupPointsByProximity = useCallback(
    (points, maxDistance) => {
      const areas = [];
      const processedIndices = new Set();

      points.forEach((point, index) => {
        if (processedIndices.has(index)) return;

        const area = { points: [point] };
        processedIndices.add(index);

        points.forEach((otherPoint, otherIndex) => {
          if (processedIndices.has(otherIndex)) return;

          const pos1 = point.position || [
            point.x || 0,
            point.y || 0,
            point.z || 0,
          ];
          const pos2 = otherPoint.position || [
            otherPoint.x || 0,
            otherPoint.y || 0,
            otherPoint.z || 0,
          ];

          const distance = Math.sqrt(
            Math.pow(pos1[0] - pos2[0], 2) +
              Math.pow(pos1[1] - pos2[1], 2) +
              Math.pow(pos1[2] - pos2[2], 2)
          );

          if (distance <= maxDistance) {
            area.points.push(otherPoint);
            processedIndices.add(otherIndex);
          }
        });

        if (area.points.length >= parameters.minimumAreaSize) {
          areas.push(area);
        }
      });

      return areas;
    },
    [parameters.minimumAreaSize]
  );

  // Update proposal visualization with real data
  useEffect(() => {
    if (!currentFileData) {
      createPlaceholderVisualization(proposalSceneRef.current);
      return;
    }

    const repairProposal = calculateRepairProposal();
    const scene = proposalSceneRef.current;

    // Clear existing objects
    scene.children.forEach((child) => {
      if (
        child.type === "Points" ||
        child.type === "Mesh" ||
        child.type === "Group"
      ) {
        scene.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }
    });

    if (repairProposal.areas.length > 0) {
      createRepairAreasVisualization(scene, repairProposal);
    } else {
      createPlaceholderVisualization(scene);
    }
  }, [currentFileData, wornPoints, parameters, createRepairAreasVisualization]);

  // Calculate repair proposal
  const calculateRepairProposal = useCallback(() => {
    if (!wornPoints.length) {
      return { areas: [], total: { volume: 0, weight: 0 } };
    }

    // Simplified grouping for better performance
    const areas = [];
    let processedIndices = new Set();

    wornPoints.forEach((point, index) => {
      if (processedIndices.has(index)) return;

      const area = { points: [point] };
      processedIndices.add(index);

      // Simple proximity check (limited for performance)
      const pos1 = point.position || [point.x || 0, point.y || 0, point.z || 0];

      for (
        let i = index + 1;
        i < Math.min(index + 1000, wornPoints.length);
        i++
      ) {
        if (processedIndices.has(i)) continue;

        const otherPoint = wornPoints[i];
        const pos2 = otherPoint.position || [
          otherPoint.x || 0,
          otherPoint.y || 0,
          otherPoint.z || 0,
        ];

        const distance = Math.sqrt(
          Math.pow(pos1[0] - pos2[0], 2) +
            Math.pow(pos1[1] - pos2[1], 2) +
            Math.pow(pos1[2] - pos2[2], 2)
        );

        if (distance <= parameters.distanceBetweenAreas) {
          area.points.push(otherPoint);
          processedIndices.add(i);
        }
      }

      if (area.points.length >= parameters.minimumAreaSize) {
        areas.push(area);
      }
    });

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
        volume: volume,
        weight: weight,
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

  // Get available sections from data
  const availableSections = useMemo(() => {
    if (!currentFileData?.points) return Object.keys(screenConfigs);

    const sections = new Set();
    currentFileData.points.forEach((point) => {
      if (point.section && screenConfigs[point.section]) {
        sections.add(point.section);
      }
    });

    return sections.size > 0
      ? Array.from(sections)
      : Object.keys(screenConfigs);
  }, [currentFileData]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f0f0f0",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "10px",
        }}
      >
        {/* Header with Screen Selection */}
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

        {/* Screen Description */}
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

        {/* Upper Section - Visualization Panels */}
        <div style={{ display: "flex", gap: "10px", height: "60vh" }}>
          {/* Left Panel - Current Screen Visualization */}
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

          {/* Right Panel - Gunite Proposal Visualization */}
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
              GUNITE PROPOSAL VISUALIZATION
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
              Shows 3D visualization of repair areas and material requirements
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

        {/* Lower Section - Control Panels */}
        <div style={{ display: "flex", gap: "10px", minHeight: "40vh" }}>
          {/* Left Panel - Settings */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#e5e5e5",
              border: "2px solid #ccc",
              borderRadius: "8px",
              padding: "15px",
              overflow: "visible",
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
              {activeScreen.toUpperCase()} ANALYSIS SETTINGS
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
                Repair material:
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
                <option value="Gunnimag C2">Gunnimag C2</option>
                <option value="Standard Gunite">Standard Gunite</option>
                <option value="High-Density">High-Density</option>
                <option value="Low-Thermal">Low-Thermal</option>
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
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
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
                    handleParameterChange("wearThreshold", Number(e.target.value))
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
                Distance between areas:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    minWidth: "40px",
                  }}
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
                Minimum area size:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    minWidth: "40px",
                  }}
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
              Accept
            </button>
          </div>

          {/* Right Panel - Repair Proposal */}
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
              REPAIR PROPOSAL
            </h3>

            <div
              style={{
                fontSize: "12px",
                marginBottom: "10px",
                color: "#333",
              }}
            >
              <strong>Material:</strong> {parameters.repairMaterial}
            </div>
            <div
              style={{
                fontSize: "12px",
                marginBottom: "10px",
                color: "#333",
              }}
            >
              <strong>Density:</strong> {materialDensity} g/cm³
            </div>
            <div
              style={{
                fontSize: "12px",
                marginBottom: "20px",
                color: "#333",
              }}
            >
              <strong>Section:</strong> {activeScreen}
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
                  No areas requiring repair with current parameters
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
    </div>
  );
};

export default GunningScreen;