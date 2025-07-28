import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

// ⚡ Constants moved outside component for better performance
const MATERIAL_DENSITY = 2.2;
const MAX_RENDER_POINTS = 8000;
const MAX_SAMPLE_POINTS = 15000;
const MAX_WORN_POINTS = 20000;

const SCREEN_CONFIGS = {
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

// ⚡ Optimized section detection with memoization
const detectPointSection = (() => {
  const cache = new Map();

  return (point, allPoints = []) => {
    const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
    const [x, y, z] = pos;

    // Cache key for memoization
    const key = `${x.toFixed(1)},${y.toFixed(1)},${z.toFixed(1)}`;
    if (cache.has(key)) return cache.get(key);

    const distanceFromCenter = Math.sqrt(x * x + y * y);
    const totalDistance = Math.sqrt(x * x + y * y + z * z);
    const heightRatio = Math.abs(z) / Math.max(totalDistance, 1);

    let result;

    // Enhanced detection logic for better distribution
    if (z < -20 || (z < -5 && heightRatio > 0.3) || (Math.abs(z) > 15 && distanceFromCenter < 20)) {
      result = "Screed";
    } else if (
      distanceFromCenter > 25 ||
      (distanceFromCenter > 15 && Math.abs(z) < 15) ||
      x > 30 ||
      y > 30 ||
      x < -30 ||
      y < -30 ||
      (distanceFromCenter > 20 && z > -10 && z < 10)
    ) {
      result = "Slag Line";
    } else {
      result = "Bricks";
    }

    // Cache the result
    if (cache.size > 10000) cache.clear(); // Prevent memory leak
    cache.set(key, result);

    return result;
  };
})();

// ⚡ Optimized enhanced section detection with statistical analysis
const detectPointSectionEnhanced = (() => {
  let cachedPercentiles = null;
  let lastPointsLength = 0;

  return (point, allPoints = []) => {
    const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
    const [x, y, z] = pos;

    const distanceFromCenter = Math.sqrt(x * x + y * y);

    // Use statistical approach for large datasets
    if (allPoints.length > 1000 && allPoints.length !== lastPointsLength) {
      // Recalculate percentiles only when point count changes
      const zValues = new Float32Array(allPoints.length);
      const radialValues = new Float32Array(allPoints.length);

      for (let i = 0; i < allPoints.length; i++) {
        const p = allPoints[i];
        const pos = p.position || [p.x || 0, p.y || 0, p.z || 0];
        zValues[i] = pos[2];
        radialValues[i] = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1]);
      }

      zValues.sort((a, b) => a - b);
      radialValues.sort((a, b) => a - b);

      cachedPercentiles = {
        zLow: zValues[Math.floor(zValues.length * 0.25)],
        zHigh: zValues[Math.floor(zValues.length * 0.75)],
        radialHigh: radialValues[Math.floor(radialValues.length * 0.75)],
      };
      lastPointsLength = allPoints.length;
    }

    if (cachedPercentiles) {
      if (z <= cachedPercentiles.zLow) {
        return "Screed";
      } else if (distanceFromCenter >= cachedPercentiles.radialHigh || z >= cachedPercentiles.zHigh) {
        return "Slag Line";
      } else {
        return "Bricks";
      }
    }

    // Fallback for smaller datasets
    if (z < -15) return "Screed";
    if (distanceFromCenter > 30 || z > 20) return "Slag Line";
    return "Bricks";
  };
})();

// ⚡ Optimized point sampling
const samplePoints = (points, maxPoints) => {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, index) => index % step === 0);
};

const GunningScreen = ({
  files,
  fileDataCache,
  selectedFile,
  selectedFurnace,
  isUiDisabled,
  // 🆕 NEW: State lifting props
  onDataUpdate,
  onCaptureScreenshot,
  currentGunningData,
}) => {
  const [activeScreen, setActiveScreen] = useState("Bricks");
  const [parameters, setParameters] = useState({
    repairMaterial: "Gunnimag C2",
    wearThreshold: 20,
    distanceBetweenAreas: 0.25,
    minimumAreaSize: 100,
  });

  const { t } = useTranslation();

  // ⚡ Single state for all processing flags
  const [processingState, setProcessingState] = useState({
    isProcessing: false,
    showNoDataDialog: false,
    visualizationMode: "all",
  });

  // ⚡ Optimized refs
  const canvasRef = useRef(null);
  const proposalCanvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const proposalSceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const proposalRendererRef = useRef(null);
  const cameraRef = useRef(null);
  const proposalCameraRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    i18n.changeLanguage(savedLang);
  }, []);

  // 🔧 FIXED: Enhanced screenshot capture function for Three.js WebGL canvas
  const captureCurrentScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('❌ Canvas not available for screenshot');
      return null;
    }

    try {
      // 🔧 FIX: Force a render before capturing
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        console.log('🎨 Forcing render before screenshot...');
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // 🔧 FIX: WebGL canvas needs preserveDrawingBuffer for screenshots
      const dataUrl = canvas.toDataURL('image/png');
      
      // 🔧 FIX: Check if screenshot is actually captured (not blank)
      if (dataUrl === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
        console.warn('⚠️ Screenshot appears to be blank - WebGL context issue');
        // Try alternative capture method
        return captureAlternativeScreenshot();
      }

      console.log('✅ Screenshot captured successfully');
      return {
        dataUrl,
        filename: `${activeScreen.toLowerCase()}_analysis_${Date.now()}.png`,
        timestamp: Date.now(),
        section: activeScreen
      };
    } catch (error) {
      console.error('❌ Screenshot capture failed:', error);
      return captureAlternativeScreenshot();
    }
  }, [activeScreen]);

  // 🆕 NEW: Alternative screenshot method using canvas-to-blob
  const captureAlternativeScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    try {
      // Force render first
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      // Create a new canvas with the same dimensions
      const screenshotCanvas = document.createElement('canvas');
      const ctx = screenshotCanvas.getContext('2d');
      screenshotCanvas.width = canvas.width;
      screenshotCanvas.height = canvas.height;

      // Copy the WebGL canvas content
      ctx.drawImage(canvas, 0, 0);
      
      const dataUrl = screenshotCanvas.toDataURL('image/png');
      
      return {
        dataUrl,
        filename: `${activeScreen.toLowerCase()}_analysis_${Date.now()}.png`,
        timestamp: Date.now(),
        section: activeScreen
      };
    } catch (error) {
      console.error('❌ Alternative screenshot method failed:', error);
      return null;
    }
  }, [activeScreen]);

  // 🆕 NEW: Current section data indicator
  const currentSectionData = useMemo(() => {
    const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
    return currentGunningData?.[sectionKey];
  }, [activeScreen, currentGunningData]);

  // ⚡ Memoized current file data
  const currentFileData = useMemo(() => {
    if (!selectedFile || !fileDataCache?.has(selectedFile.name)) return null;
    const data = fileDataCache.get(selectedFile.name);
    console.log("📊 Points available:", data?.points?.length);
    return data;
  }, [selectedFile, fileDataCache]);

  // ⚡ Points processing - separated from worn points calculation
  const { processedPoints, sectionCounts, allPointsWithSections } = useMemo(() => {
    if (!currentFileData?.points) {
      console.log("❌ No points available for processing");
      return { processedPoints: [], sectionCounts: {}, allPointsWithSections: [] };
    }

    const startTime = performance.now();

    // Aggressive sampling for performance
    const sampledPoints = samplePoints(currentFileData.points, MAX_SAMPLE_POINTS);
    console.log(`📊 Sampled ${sampledPoints.length} from ${currentFileData.points.length} points`);

    // Batch process all points with sections
    const pointsWithSections = new Array(sampledPoints.length);
    for (let i = 0; i < sampledPoints.length; i++) {
      pointsWithSections[i] = {
        ...sampledPoints[i],
        detectedSection: detectPointSectionEnhanced(sampledPoints[i], sampledPoints),
      };
    }

    // Filter points for current screen
    const filtered = [];
    const counts = { Bricks: 0, "Slag Line": 0, Screed: 0 };

    for (const point of pointsWithSections) {
      counts[point.detectedSection]++;

      const furnaceMatch =
        !selectedFurnace ||
        !point.furnaceId ||
        point.furnaceId === selectedFurnace.furnace_id;

      if (!furnaceMatch) continue;

      const sectionMatch = point.detectedSection === activeScreen;

      if (sectionMatch) {
        const thicknessFilter =
          processingState.visualizationMode !== "filtered" ||
          (point.thickness != null && point.thickness <= parameters.wearThreshold);

        if (thicknessFilter) {
          filtered.push(point);
        }
      }
    }

    const endTime = performance.now();
    console.log(`⚡ Processing took ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`✅ Section distribution:`, counts);
    console.log(`✅ Filtered points for ${activeScreen}:`, filtered.length);

    return {
      processedPoints: filtered,
      sectionCounts: counts,
      allPointsWithSections: pointsWithSections,
    };
  }, [
    currentFileData,
    selectedFurnace,
    activeScreen,
    processingState.visualizationMode,
    parameters.wearThreshold,
  ]);

  // ⚡ FIXED: Combined worn points and repair proposal calculation
  const { wornPoints, repairProposal } = useMemo(() => {
    console.log(`🔄 RECALCULATING WORN POINTS AND REPAIR PROPOSAL for ${activeScreen}`);
    console.log(
      `🎯 Parameters: Threshold=${parameters.wearThreshold}cm, MinArea=${parameters.minimumAreaSize}, Distance=${parameters.distanceBetweenAreas}m, Material=${parameters.repairMaterial}`
    );

    if (!allPointsWithSections || !allPointsWithSections.length) {
      console.log("❌ No points available for calculation");
      return {
        wornPoints: [],
        repairProposal: {
          areas: [],
          total: { volume: 0, weight: 0, cost: 0 },
          parameters: { ...parameters },
        },
      };
    }

    // Calculate worn points using CURRENT parameters and activeScreen
    const worn = [];

    for (const point of allPointsWithSections) {
      const furnaceMatch =
        !selectedFurnace ||
        !point.furnaceId ||
        point.furnaceId === selectedFurnace.furnace_id;

      const sectionMatch = point.detectedSection === activeScreen;

      // ✅ Ensure thickness is valid and within threshold
      const isWorn =
        point.thickness != null &&
        !isNaN(point.thickness) &&
        point.thickness <= parameters.wearThreshold;

      if (furnaceMatch && sectionMatch && isWorn) {
        worn.push(point);
      }
    }

    const finalWornPoints = worn.slice(0, MAX_WORN_POINTS);
    console.log(
      `🚨 WORN POINTS for ${activeScreen} (≤${parameters.wearThreshold}cm): ${finalWornPoints.length}`
    );

    // ⚡ Calculate repair proposal using the just-calculated worn points
    if (!finalWornPoints.length) {
      console.log("❌ No worn points available for repair proposal");
      return {
        wornPoints: finalWornPoints,
        repairProposal: {
          areas: [],
          total: { volume: 0, weight: 0, cost: 0 },
          parameters: { ...parameters },
        },
      };
    }

    // Limit processing for performance
    const processPoints = finalWornPoints.slice(0, 3000);
    console.log(`📊 Processing ${processPoints.length} worn points for repair calculation`);

    const areas = [];
    const processedIndices = new Set();
    const maxDistance = parameters.distanceBetweenAreas * 1000; // Convert to mm

    // Group points by proximity based on current parameters
    for (let i = 0; i < processPoints.length; i++) {
      if (processedIndices.has(i)) continue;

      const area = { points: [processPoints[i]] };
      processedIndices.add(i);

      const pos1 = processPoints[i].position || [
        processPoints[i].x || 0,
        processPoints[i].y || 0,
        processPoints[i].z || 0,
      ];

      // Search for nearby points within distance threshold
      const searchLimit = Math.min(i + 500, processPoints.length);
      for (let j = i + 1; j < searchLimit; j++) {
        if (processedIndices.has(j)) continue;

        const pos2 = processPoints[j].position || [
          processPoints[j].x || 0,
          processPoints[j].y || 0,
          processPoints[j].z || 0,
        ];

        const distance = Math.sqrt(
          (pos1[0] - pos2[0]) ** 2 +
          (pos1[1] - pos2[1]) ** 2 +
          (pos1[2] - pos2[2]) ** 2
        );

        if (distance <= maxDistance) {
          area.points.push(processPoints[j]);
          processedIndices.add(j);
        }
      }

      // Only include areas that meet the current minimum size requirement
      if (area.points.length >= parameters.minimumAreaSize) {
        areas.push(area);
        console.log(
          `✅ ACCEPTED Area ${areas.length}: ${area.points.length} points (≥ ${parameters.minimumAreaSize} required)`
        );
      } else {
        console.log(
          `❌ REJECTED Area: ${area.points.length} points (< ${parameters.minimumAreaSize} required)`
        );
      }
    }

    console.log(`📊 === AREA GROUPING RESULTS ===`);
    console.log(`Total qualifying areas: ${areas.length}`);

    // Calculate repair requirements for each area using current parameters
    const processedAreas = areas.map((area, index) => {
      // Calculate wear depth based on current threshold
      const wearDepths = area.points.map((p) =>
        Math.max(0, parameters.wearThreshold - (p.thickness || 0))
      );
      const avgWearDepth = wearDepths.reduce((sum, depth) => sum + depth, 0) / wearDepths.length;

      const pointDensity = 1000; // points per m²
      const areaSize = Math.max(0.001, area.points.length / pointDensity); // m²

      // Volume calculation based on current wear threshold
      const volume = areaSize * (avgWearDepth / 100); // m³ (convert cm to m)
      const weight = volume * MATERIAL_DENSITY * 1000; // kg
      const cost = weight * 2.5; // $2.5 per kg

      const result = {
        id: index + 1,
        volume: Math.max(0.001, volume),
        weight: Math.max(0.1, weight),
        cost: cost,
        pointCount: area.points.length,
        avgWear: avgWearDepth,
        areaSize: areaSize,
        material: parameters.repairMaterial,
      };

      console.log(`🔧 Area ${result.id} calculation:`, {
        points: result.pointCount,
        avgWear: `${result.avgWear.toFixed(2)}cm`,
        volume: `${result.volume.toFixed(3)}m³`,
        weight: `${result.weight.toFixed(1)}kg`,
        cost: `${result.cost.toFixed(0)}`,
        material: result.material,
      });

      return result;
    });

    const totalVolume = processedAreas.reduce((sum, area) => sum + area.volume, 0);
    const totalWeight = processedAreas.reduce((sum, area) => sum + area.weight, 0);
    const totalCost = processedAreas.reduce((sum, area) => sum + area.cost, 0);

    const proposal = {
      areas: processedAreas,
      total: {
        volume: totalVolume,
        weight: totalWeight,
        cost: totalCost,
        material: parameters.repairMaterial,
      },
      parameters: {
        wearThreshold: parameters.wearThreshold,
        distanceBetweenAreas: parameters.distanceBetweenAreas,
        minimumAreaSize: parameters.minimumAreaSize,
        repairMaterial: parameters.repairMaterial,
        timestamp: Date.now(),
      },
    };

    console.log("🎯 === FINAL REPAIR PROPOSAL ===");
    console.log(`Total Areas: ${proposal.areas.length}`);
    console.log(`Total Volume: ${proposal.total.volume.toFixed(3)}m³`);
    console.log(`Total Weight: ${proposal.total.weight.toFixed(1)}kg`);
    console.log(`Total Cost: ${proposal.total.cost.toFixed(0)}`);
    console.log(`Material: ${proposal.total.material}`);
    console.log("=======================================");

    return {
      wornPoints: finalWornPoints,
      repairProposal: proposal,
    };
  }, [
    allPointsWithSections,
    selectedFurnace,
    activeScreen,
    parameters.wearThreshold,
    parameters.distanceBetweenAreas,
    parameters.minimumAreaSize,
    parameters.repairMaterial,
  ]);

  // ⚡ Enhanced parameter change handler with immediate feedback
  const handleParameterChange = useCallback((param, value) => {
    console.log(`🔧 Parameter changing: ${param} = ${value}`);
    setParameters((prev) => {
      const newParams = { ...prev, [param]: value };
      console.log("🔄 New parameters:", newParams);
      return newParams;
    });
  }, []);

  // 🔧 FIXED: Enhanced accept button handler with improved screenshot handling
  const handleAcceptParameters = useCallback(() => {
    console.log("✅ Parameters accepted and applied:", parameters);

    // Prepare data for parent component
    const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
    const captureData = {
      section: activeScreen,
      parameters: { ...parameters },
      repairProposal: { ...repairProposal },
      wornPoints: [...wornPoints],
      processedPoints: [...processedPoints],
      sectionCounts: { ...sectionCounts },
      timestamp: Date.now(),
      fileInfo: {
        name: selectedFile?.name || 'unknown',
        furnace: selectedFurnace?.furnace_id || 'unknown'
      }
    };

    // 🔧 FIXED: Enhanced screenshot capture with validation
    let screenshot = null;
    
    // Force render before screenshot
    if (rendererRef.current && cameraRef.current && sceneRef.current) {
      console.log('🎨 Forcing render before data save screenshot...');
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    
    if (onCaptureScreenshot && canvasRef.current) {
      screenshot = onCaptureScreenshot(canvasRef, `${activeScreen.toLowerCase()}_analysis`);
    } else {
      screenshot = captureCurrentScreenshot();
    }

    // Validate screenshot
    if (screenshot && screenshot.dataUrl) {
      console.log('📸 Screenshot captured for data save');
    } else {
      console.warn('⚠️ Screenshot capture failed during data save');
    }

    // Send data to parent
    if (onDataUpdate) {
      onDataUpdate(sectionKey, captureData, screenshot);
      console.log(`📊 Data sent to parent for ${activeScreen}:`, sectionKey);
    }

    // Enhanced feedback message
    const message = `✅ Parameters Applied & Data Captured!\n\n` +
      `New Settings Active:\n` +
      `• Wear Threshold: ${parameters.wearThreshold}cm\n` +
      `• Distance Between Areas: ${parameters.distanceBetweenAreas}m\n` +
      `• Minimum Area Size: ${parameters.minimumAreaSize} points\n` +
      `• Repair Material: ${parameters.repairMaterial}\n\n` +
      `📊 Analysis Results:\n` +
      `• Section: ${activeScreen}\n` +
      `• Repair Areas: ${repairProposal.areas.length}\n` +
      `• Worn Points: ${wornPoints.length}\n` +
      `• Total Cost: $${repairProposal.total?.cost?.toFixed(0) || 0}\n\n` +
      `${screenshot ? '📸 Screenshot captured!' : '⚠️ Screenshot capture failed'}\n` +
      `🔄 Data ready for gunning report generation!`;

    alert(message);
  }, [
    parameters, 
    activeScreen, 
    repairProposal, 
    wornPoints, 
    processedPoints, 
    sectionCounts,
    selectedFile,
    selectedFurnace,
    onDataUpdate,
    onCaptureScreenshot,
    captureCurrentScreenshot
  ]);

  // 🆕 NEW: Screen switch with auto-save
  const handleScreenSwitchWithAutoSave = useCallback((newScreen) => {
    // Auto-save current screen data before switching (optional)
    if (repairProposal.areas.length > 0 && onDataUpdate) {
      const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
      const autoSaveData = {
        section: activeScreen,
        parameters: { ...parameters },
        repairProposal: { ...repairProposal },
        wornPoints: [...wornPoints],
        processedPoints: [...processedPoints],
        sectionCounts: { ...sectionCounts },
        timestamp: Date.now(),
        autoSaved: true,
        fileInfo: {
          name: selectedFile?.name || 'unknown',
          furnace: selectedFurnace?.furnace_id || 'unknown'
        }
      };

      const screenshot = captureCurrentScreenshot();
      onDataUpdate(sectionKey, autoSaveData, screenshot);
      console.log(`🔄 Auto-saved data for ${activeScreen} before switching to ${newScreen}`);
    }

    setActiveScreen(newScreen);
  }, [
    activeScreen,
    parameters,
    repairProposal,
    wornPoints,
    processedPoints,
    sectionCounts,
    selectedFile,
    selectedFurnace,
    onDataUpdate,
    captureCurrentScreenshot
  ]);

  // 🆕 NEW: Enhanced screen buttons with data indicators
  const screenSwitchButtons = useMemo(() => 
    Object.keys(SCREEN_CONFIGS).map((screen) => (
      <button
        key={screen}
        onClick={() => handleScreenSwitchWithAutoSave(screen)}
        style={{
          backgroundColor: activeScreen === screen ? SCREEN_CONFIGS[screen].color : "#555",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "6px 12px",
          cursor: isUiDisabled ? "not-allowed" : "pointer",
          fontSize: "11px",
          fontWeight: "500",
          position: 'relative'
        }}
        disabled={isUiDisabled}
      >
        {screen}
        {/* 🆕 NEW: Data indicator dot */}
        {currentGunningData?.[screen === "Slag Line" ? "slagLine" : screen.toLowerCase()] && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '8px',
            height: '8px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            border: '1px solid white'
          }} />
        )}
      </button>
    )), 
    [activeScreen, isUiDisabled, handleScreenSwitchWithAutoSave, currentGunningData]
  );

  const incrementValue = useCallback((param, increment) => {
    setParameters((prev) => ({
      ...prev,
      [param]: Math.max(0, prev[param] + increment),
    }));
  }, []);

  const handleVisualizationModeToggle = useCallback(() => {
    setProcessingState((prev) => ({
      ...prev,
      visualizationMode: prev.visualizationMode === "all" ? "filtered" : "all",
    }));
  }, []);

  // 🔧 FIXED: Enhanced scene initialization with preserveDrawingBuffer
  const initializeScene = useCallback((canvasRef, sceneRef, cameraRef, rendererRef, bgColor = 0x000000) => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    scene.background = new THREE.Color(bgColor);

    const container = canvas.parentElement;
    const { clientWidth: width, clientHeight: height } = container;

    // Optimized camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 🔧 FIXED: Renderer setup with preserveDrawingBuffer for screenshots
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      alpha: false,
      preserveDrawingBuffer: true, // 🔧 FIX: Essential for screenshots!
    });
    renderer.setSize(width, height);
    renderer.setClearColor(bgColor);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Optimized lighting
    scene.add(new THREE.AmbientLight(0x404040, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Throttled resize handler
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const { clientWidth: newWidth, clientHeight: newHeight } = container;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }, 16); // ~60fps throttling
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // ⚡ FIXED: Point cloud creation with correct color logic
  const createPointCloud = useCallback(
    async (points, scene, camera) => {
      // Efficient cleanup
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

      setProcessingState((prev) => ({ ...prev, isProcessing: true }));

      try {
        // Aggressive point reduction for rendering
        const renderPoints = samplePoints(points, MAX_RENDER_POINTS);
        console.log(`🎨 Rendering ${renderPoints.length} points for ${activeScreen}`);

        // Pre-allocate arrays for better performance
        const positions = new Float32Array(renderPoints.length * 3);
        const colors = new Float32Array(renderPoints.length * 3);
        let validPointCount = 0;

        // Batch process positions and colors
        for (let i = 0; i < renderPoints.length; i++) {
          const point = renderPoints[i];
          const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];

          if (pos.length < 3 || pos.some(isNaN)) continue;

          const index = validPointCount * 3;
          positions[index] = pos[0];
          positions[index + 1] = pos[1];
          positions[index + 2] = pos[2];

          // 🔧 FIXED: Correct color logic - check thickness properly
          const pointThickness = point.thickness || 0;
          const threshold = parameters.wearThreshold || 20;
          
          if (pointThickness > 0 && pointThickness <= threshold) {
            // 🔴 Red for worn/damaged points (thickness <= threshold)
            colors[index] = 1.0;     // R
            colors[index + 1] = 0.0; // G  
            colors[index + 2] = 0.0; // B
          } else {
            // 🔘 Grey for healthy furnace structure (thickness > threshold)
            colors[index] = 0.6;     // R
            colors[index + 1] = 0.6; // G
            colors[index + 2] = 0.6; // B
          }
          validPointCount++;
        }

        if (validPointCount === 0) return;

        // Create optimized geometry
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

        // Optimized camera positioning
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
      } finally {
        setProcessingState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [activeScreen, parameters.wearThreshold]
  );

  // 🎨 ENHANCED: Optimized repair areas visualization with improved color scheme
  const createRepairAreasVisualization = useCallback(
    async (scene, camera) => {
      // Efficient cleanup
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

      setProcessingState((prev) => ({ ...prev, isProcessing: true }));

      try {
        // Use already processed points to avoid recomputation
        const sectionPoints = processedPoints;

        if (sectionPoints.length > 0) {
          // 🎨 ENHANCED: Background geometry in darker grey
          const bgPositions = new Float32Array(sectionPoints.length * 3);
          const bgColors = new Float32Array(sectionPoints.length * 3);
          let bgCount = 0;

          for (const point of sectionPoints) {
            const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
            if (pos.length < 3 || pos.some(isNaN)) continue;

            const index = bgCount * 3;
            bgPositions[index] = pos[0];
            bgPositions[index + 1] = pos[1];
            bgPositions[index + 2] = pos[2];
            
            // 🎨 ENHANCED: Darker grey for background furnace structure
            bgColors[index] = 0.4;   // R
            bgColors[index + 1] = 0.4; // G
            bgColors[index + 2] = 0.4; // B
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
              opacity: 0.3, // 🎨 ENHANCED: More transparent background
              transparent: true,
              sizeAttenuation: false,
            });

            scene.add(new THREE.Points(backgroundGeometry, backgroundMaterial));
          }
        }

        // 🎨 ENHANCED: Bright red damaged points overlay for maximum contrast
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

            // 🎨 ENHANCED: Bright red for all repair points regardless of section
            dmgColors[index] = 1.0;   // R - Bright red
            dmgColors[index + 1] = 0.0; // G
            dmgColors[index + 2] = 0.0; // B
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
              size: Math.max(4.0, Math.min(12.0, 4000 / Math.sqrt(dmgCount))), // 🎨 ENHANCED: Larger size for visibility
              vertexColors: true,
              transparent: true,
              opacity: 1.0, // 🎨 ENHANCED: Full opacity for maximum visibility
              sizeAttenuation: false,
            });

            scene.add(new THREE.Points(damagedGeometry, damagedMaterial));
          }
        }

        // Optimized camera positioning
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
      } finally {
        setProcessingState((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [processedPoints, wornPoints, activeScreen, currentFileData]
  );

  // ⚡ Animation loop setup
  useEffect(() => {
    const cleanup1 = initializeScene(canvasRef, sceneRef, cameraRef, rendererRef);
    const cleanup2 = initializeScene(proposalCanvasRef, proposalSceneRef, proposalCameraRef, proposalRendererRef, 0x222222);

    let lastTime = 0;
    const animate = (currentTime) => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Throttle to ~60fps
      if (currentTime - lastTime >= 16) {
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        if (proposalRendererRef.current && proposalCameraRef.current) {
          proposalRendererRef.current.render(proposalSceneRef.current, proposalCameraRef.current);
        }
        lastTime = currentTime;
      }
    };

    if (rendererRef.current || proposalRendererRef.current) {
      animate(0);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      rendererRef.current?.dispose();
      proposalRendererRef.current?.dispose();
      cleanup1?.();
      cleanup2?.();
    };
  }, [initializeScene]);

  // ⚡ Update visualizations when data changes
  useEffect(() => {
    if (currentFileData && processedPoints.length) {
      createPointCloud(processedPoints, sceneRef.current, cameraRef.current);
    } else {
      setProcessingState((prev) => ({ ...prev, showNoDataDialog: true }));
    }
  }, [currentFileData, processedPoints, createPointCloud]);

  useEffect(() => {
    if (currentFileData) {
      createRepairAreasVisualization(proposalSceneRef.current, proposalCameraRef.current);
    }
  }, [currentFileData, createRepairAreasVisualization]);

  const currentConfig = SCREEN_CONFIGS[activeScreen];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        maxHeight: "100vh",
        overflowY: "auto",
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
        {/* 🔧 FIXED: Enhanced Header with dynamic repair counts per section */}
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
            {screenSwitchButtons}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <div>
              File: {selectedFile ? selectedFile.name : "No file selected"} |
              Section: {activeScreen} |
              Points: {processedPoints.length} | 
              Worn: {wornPoints.length} |
              Areas: {repairProposal.areas.length}
              {processingState.isProcessing && <span style={{ color: "#ffaa00" }}> | Processing...</span>}
            </div>
            {/* 🆕 NEW: Data status indicator */}
            {currentSectionData && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#10b981",
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "bold"
              }}>
                <div style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "white",
                  borderRadius: "50%"
                }} />
                DATA SAVED
              </div>
            )}
          </div>
        </div>

        {/* Section title */}
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

        {/* 🔄 UPDATED: Larger Visualization panels for better furnace view */}
        <div style={{ display: "flex", gap: "10px", minHeight: "500px" }}>
          {/* Main visualization - Enhanced size */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#000",
              border: `2px solid ${currentConfig.color}`,
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
              minHeight: "500px", // 🔧 FIX: Minimum height for better view
              height: "60vh",     // 🔧 FIX: Responsive height
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
                onClick={handleVisualizationModeToggle}
                style={{
                  backgroundColor: processingState.visualizationMode === "filtered" ? "#10B981" : "#666",
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
                {processingState.visualizationMode === "all" ? "Show Filtered" : "Show All"}
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
              {/* 🔧 FIXED: Dynamic repair count display */}
              {wornPoints.length > 0 ? 
                `${wornPoints.length} points need repair (${activeScreen})` : 
                `No repairs needed (${activeScreen})`}
            </div>

            <canvas ref={canvasRef} style={{ 
              width: "100%", 
              height: "100%",
              minHeight: "500px" // 🔧 FIX: Ensure canvas maintains minimum size
            }} />
          </div>

          {/* Proposal visualization - Enhanced size */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#000",
              border: "2px solid #FF6600",
              borderRadius: "8px",
              position: "relative",
              overflow: "hidden",
              minHeight: "500px", // 🔧 FIX: Minimum height for better view
              height: "60vh",     // 🔧 FIX: Responsive height
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
              GUNITE REPAIR PROPOSAL
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
              {/* 🔧 FIXED: Dynamic repair area count with section info */}
              {repairProposal.areas.length > 0 ? 
                `${repairProposal.areas.length} Repair Area(s) - ${activeScreen}` : 
                `No Repairs Needed - ${activeScreen}`}
            </div>

            <canvas ref={proposalCanvasRef} style={{ 
              width: "100%", 
              height: "100%",
              minHeight: "500px" // 🔧 FIX: Ensure canvas maintains minimum size
            }} />
          </div>
        </div>

        {/* Control panels */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "100px" }}>
          {/* 🔄 UPDATED: Settings panel with data preview and quick actions */}
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
              {activeScreen.toUpperCase()} ANALYSIS SETTINGS
            </h3>

            {/* 🆕 NEW: Current section data preview */}
            {currentSectionData && (
              <div style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "#d4edda",
                borderRadius: "4px",
                border: "1px solid #c3e6cb"
              }}>
                <div style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#155724",
                  marginBottom: "5px"
                }}>
                  💾 Saved Data for {activeScreen}:
                </div>
                <div style={{ fontSize: "11px", color: "#155724" }}>
                  • Areas: {currentSectionData.repairProposal?.areas?.length || 0}
                  • Cost: ${currentSectionData.repairProposal?.total?.cost?.toFixed(0) || 0}
                  • Saved: {new Date(currentSectionData.timestamp).toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Material selection */}
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
                Repair Material:
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
                onChange={(e) => handleParameterChange("repairMaterial", e.target.value)}
                disabled={isUiDisabled}
              >
                <option value="Gunnimag C2">Gunnimag C2</option>
                <option value="Standard Gunite">Standard Gunite</option>
                <option value="High-Density">High-Density</option>
                <option value="Low-Thermal">Low-Thermal</option>
              </select>
            </div>

            {/* Wear threshold */}
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
                  onChange={(e) => handleParameterChange("wearThreshold", Number(e.target.value))}
                  min="0"
                  step="1"
                  disabled={isUiDisabled || processingState.isProcessing}
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
                  disabled={isUiDisabled || processingState.isProcessing}
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
                  disabled={isUiDisabled || processingState.isProcessing}
                >
                  ▼
                </button>
                <span style={{ fontSize: "11px", color: "#666", minWidth: "20px" }}>
                  {currentConfig.unit}
                </span>
              </div>
            </div>

            {/* Distance between areas */}
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
                Distance Between Areas:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  style={{ flex: 1 }}
                  min="0.1"
                  max="2.0"
                  step="0.05"
                  value={parameters.distanceBetweenAreas}
                  onChange={(e) => handleParameterChange("distanceBetweenAreas", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
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
                  onChange={(e) => handleParameterChange("distanceBetweenAreas", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
                  min="0.1"
                  step="0.05"
                />
                <span style={{ fontSize: "11px", color: "#666", minWidth: "40px" }}>
                  meters
                </span>
              </div>
            </div>

            {/* Minimum area size */}
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
                Minimum Area Size:
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  style={{ flex: 1 }}
                  min="10"
                  max="500"
                  step="10"
                  value={parameters.minimumAreaSize}
                  onChange={(e) => handleParameterChange("minimumAreaSize", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
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
                  onChange={(e) => handleParameterChange("minimumAreaSize", Number(e.target.value))}
                  disabled={isUiDisabled || processingState.isProcessing}
                  min="10"
                  step="10"
                />
                <span style={{ fontSize: "12px", color: "#666", minWidth: "40px" }}>
                  points
                </span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Quick Presets:
              </label>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                <button
                  onClick={() =>
                    setParameters((prev) => ({
                      ...prev,
                      wearThreshold: 15,
                      distanceBetweenAreas: 0.2,
                      minimumAreaSize: 50,
                    }))
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    backgroundColor: "#DC2626",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  disabled={isUiDisabled}
                >
                  Critical
                </button>
                <button
                  onClick={() =>
                    setParameters((prev) => ({
                      ...prev,
                      wearThreshold: 25,
                      distanceBetweenAreas: 0.3,
                      minimumAreaSize: 100,
                    }))
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    backgroundColor: "#F59E0B",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  disabled={isUiDisabled}
                >
                  Standard
                </button>
                <button
                  onClick={() =>
                    setParameters((prev) => ({
                      ...prev,
                      wearThreshold: 35,
                      distanceBetweenAreas: 0.5,
                      minimumAreaSize: 200,
                    }))
                  }
                  style={{
                    padding: "4px 8px",
                    fontSize: "10px",
                    backgroundColor: "#10B981",
                    color: "white",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  disabled={isUiDisabled}
                >
                  Conservative
                </button>
              </div>
            </div>

            {/* 🔄 UPDATED: Accept button with enhanced styling */}
            <button
              style={{
                backgroundColor: currentSectionData ? "#10b981" : "#666",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}
              disabled={isUiDisabled}
              onClick={handleAcceptParameters}
            >
              {currentSectionData ? "🔄 UPDATE DATA" : "💾 SAVE DATA"}
              {currentSectionData && <span style={{ fontSize: "10px" }}>✓</span>}
            </button>

            {/* 🆕 NEW: Quick actions buttons */}
            <div style={{ display: "flex", gap: "5px", marginTop: "10px" }}>
              <button
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: "500",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}
                disabled={isUiDisabled}
                onClick={() => {
                  console.log('🔧 Manual screenshot capture triggered');
                  
                  // Force render before capture
                  if (rendererRef.current && cameraRef.current && sceneRef.current) {
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                  }
                  
                  const screenshot = captureCurrentScreenshot();
                  if (screenshot) {
                    // Test if screenshot has actual content
                    const img = new Image();
                    img.onload = () => {
                      console.log(`✅ Screenshot validated: ${img.width}x${img.height}`);
                      const a = document.createElement('a');
                      a.href = screenshot.dataUrl;
                      a.download = screenshot.filename;
                      a.click();
                      alert(`📸 Screenshot saved: ${screenshot.filename}`);
                    };
                    img.onerror = () => {
                      console.error('❌ Screenshot validation failed');
                      alert('❌ Screenshot capture failed - please try again');
                    };
                    img.src = screenshot.dataUrl;
                  } else {
                    alert('❌ Screenshot capture failed - WebGL context issue');
                  }
                }}
              >
                📸 CAPTURE
              </button>
              
              <button
                style={{
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: "500",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px"
                }}
                disabled={isUiDisabled || repairProposal.areas.length === 0}
                onClick={() => {
                  const reportData = {
                    section: activeScreen,
                    parameters,
                    repairProposal,
                    wornPointsCount: wornPoints.length,
                    timestamp: Date.now()
                  };
                  
                  const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                    type: 'application/json'
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${activeScreen.toLowerCase()}_report_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  alert(`📄 Quick report exported for ${activeScreen}!`);
                }}
              >
                📄 EXPORT
              </button>
            </div>
          </div>

          {/* Repair proposal panel */}
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

            <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
              <strong>Material:</strong> {repairProposal.total?.material || parameters.repairMaterial}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
              <strong>Density:</strong> {MATERIAL_DENSITY} g/cm³
            </div>
            <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
              <strong>Section:</strong> {activeScreen}
            </div>
            <div style={{ fontSize: "12px", marginBottom: "20px", color: "#333" }}>
              <strong>Current Threshold:</strong> {parameters.wearThreshold}cm
            </div>

            {/* Repair proposal display */}
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
              {/* Debug info panel */}
              <div
                style={{
                  fontSize: "10px",
                  color: "#666",
                  marginBottom: "10px",
                  padding: "8px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Debug Info:</div>
                <div>• Total Points: {currentFileData?.points?.length || 0}</div>
                <div>• Section Points: {processedPoints.length}</div>
                <div>• Worn Points: {wornPoints.length} (≤ {parameters.wearThreshold}cm)</div>
                <div>• Repair Areas: {repairProposal.areas.length}</div>
                <div>
                  • Distribution: B:{sectionCounts.Bricks || 0} S:{sectionCounts["Slag Line"] || 0} C:
                  {sectionCounts.Screed || 0}
                </div>
                <div>• Using Threshold: {repairProposal.parameters?.wearThreshold || parameters.wearThreshold}cm</div>
                <div>• Min Area Size: {repairProposal.parameters?.minimumAreaSize || parameters.minimumAreaSize}</div>
              </div>

              {repairProposal.areas.length > 0 ? (
                <>
                  {repairProposal.areas.map((area) => (
                    <div
                      key={area.id}
                      style={{
                        marginBottom: "12px",
                        padding: "10px",
                        backgroundColor: "#ffebee",
                        borderRadius: "6px",
                        border: "2px solid #ffcdd2",
                      }}
                    >
                      <div
                        style={{
                          color: "#d32f2f",
                          fontWeight: "bold",
                          fontSize: "13px",
                          marginBottom: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        🔧 Repair Area {area.id}
                        <span
                          style={{
                            backgroundColor: "#d32f2f",
                            color: "white",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            fontSize: "10px",
                          }}
                        >
                          {area.pointCount} pts
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: "11px",
                          color: "#333",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "4px",
                        }}
                      >
                        <div>
                          <strong>Volume:</strong> {area.volume.toFixed(3)} m³
                        </div>
                        <div>
                          <strong>Weight:</strong> {area.weight.toFixed(1)} kg
                        </div>
                        <div>
                          <strong>Area:</strong> {area.areaSize.toFixed(2)} m²
                        </div>
                        <div>
                          <strong>Avg Wear:</strong> {area.avgWear.toFixed(1)} cm
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "6px",
                          padding: "4px 8px",
                          backgroundColor: "#fff3e0",
                          borderRadius: "3px",
                          fontSize: "10px",
                          color: "#e65100",
                        }}
                      >
                        💰 Est. Cost: ${(area.weight * 2.5).toFixed(0)} USD
                      </div>
                    </div>
                  ))}

                  {/* Summary */}
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "12px",
                      backgroundColor: "#e3f2fd",
                      borderRadius: "6px",
                      border: "2px solid #90caf9",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "13px",
                        color: "#1565c0",
                        marginBottom: "8px",
                      }}
                    >
                      📊 PROJECT SUMMARY
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px",
                        fontSize: "11px",
                      }}
                    >
                      <div>
                        <strong>Total Areas:</strong> {repairProposal.areas.length}
                      </div>
                      <div>
                        <strong>Total Points:</strong>{" "}
                        {repairProposal.areas.reduce((sum, area) => sum + area.pointCount, 0)}
                      </div>
                      <div>
                        <strong>Total Volume:</strong> {repairProposal.total.volume.toFixed(3)} m³
                      </div>
                      <div>
                        <strong>Total Weight:</strong> {repairProposal.total.weight.toFixed(1)} kg
                      </div>
                    </div>
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "6px",
                        backgroundColor: "#1565c0",
                        color: "white",
                        borderRadius: "4px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      💰 Total Project Cost: ${(repairProposal.total?.cost || repairProposal.total.weight * 2.5).toFixed(0)} USD
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontSize: "12px",
                    color: wornPoints.length > 0 ? "#d32f2f" : "#666",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "20px",
                    backgroundColor: wornPoints.length > 0 ? "#ffebee" : "#f5f5f5",
                    borderRadius: "6px",
                    border: wornPoints.length > 0 ? "2px solid #ffcdd2" : "1px solid #e0e0e0",
                  }}
                >
                  {wornPoints.length > 0 ? (
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#d32f2f" }}>
                        ⚠️ {wornPoints.length} worn points found
                      </div>
                      <div style={{ fontSize: "11px" }}>
                        No areas meet the minimum size requirement of {parameters.minimumAreaSize} points.
                      </div>
                      <div style={{ fontSize: "10px", marginTop: "8px", color: "#666" }}>
                        💡 Try reducing the minimum area size or distance between areas.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: "bold", marginBottom: "8px", color: "#666" }}>
                        ✅ No repairs needed
                      </div>
                      <div style={{ fontSize: "11px" }}>
                        All areas are above the {parameters.wearThreshold}cm threshold.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No data dialog */}
      {processingState.showNoDataDialog && (
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
            if (e.target === e.currentTarget) {
              setProcessingState((prev) => ({ ...prev, showNoDataDialog: false }));
            }
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
                onClick={() => setProcessingState((prev) => ({ ...prev, showNoDataDialog: false }))}
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
                ✕
              </button>
            </div>
            <div style={{ color: "#dc3545", textAlign: "center", padding: "20px" }}>
              No points are available for the selected screen "{activeScreen}".
              <br />
              This could be caused by:
              <ul style={{ textAlign: "left", marginTop: "10px" }}>
                <li>Missing or mismatched section data in the CSV file</li>
                <li>No points match the current furnace selection</li>
                <li>Thickness data may not align with the wear threshold</li>
              </ul>
              Please check the file "{selectedFile?.name || ""}" or adjust the settings.
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setProcessingState((prev) => ({ ...prev, showNoDataDialog: false }))}
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