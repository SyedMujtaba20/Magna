import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { createSimpleControls, renderPointCloud } from "./threeUtils";

const ThreeSceneManager = ({
  mainCanvasRef,
  containerRef,
  selectedFile,
  fileDataCache,
  useGlobalScaling,
  globalDataRange,
  wearRange,
  viewMode,
  showTemplate,
  showFurnace,
  selectedFurnace,
  activeScreen,
  templateData,
  setDataStats,
  isUiDisabled,
  selectedArea,
  zoomLevel = 1,
  lensMode = "normal",
}) => {
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const pointsRef = useRef(null);
  const templatePointsRef = useRef(null);
  const animationIdRef = useRef(null);

  const updateCanvasSize = () => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  const applyZoomAndLens = () => {
    const camera = cameraRef.current;
    if (!camera) return;

    // Adjust FOV based on lensMode
    switch (lensMode) {
      case "normal":
        camera.fov = 75;
        break;
      case "zoom":
        camera.fov = 40;
        break;
      case "wide":
        camera.fov = 100;
        break;
      default:
        camera.fov = 75;
    }

    // Apply zoom scale factor (Three.js PerspectiveCamera has no .zoom like OrthographicCamera)
    // So we simulate zoom by moving the camera in/out on z-axis
    const baseZ = 50;
    camera.position.z = baseZ / zoomLevel;
    camera.updateProjectionMatrix();
  };

  useEffect(() => {
    if (!mainCanvasRef.current || !containerRef.current) return;

    const canvas = mainCanvasRef.current;
    const container = containerRef.current;
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x000000);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const controls = createSimpleControls(camera, renderer.domElement, isUiDisabled, selectedArea);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0x404040));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    updateCanvasSize();
    applyZoomAndLens(); // Apply zoom/lens on mount

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) rendererRef.current.dispose();

      [pointsRef, templatePointsRef].forEach((ref) => {
        if (ref.current) {
          scene.remove(ref.current);
          ref.current.geometry.dispose();
          ref.current.material.dispose();
        }
      });
    };
  }, []);

  useEffect(() => {
    const handleResize = () => updateCanvasSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    applyZoomAndLens(); // 🔍 Update camera settings when zoom or lens mode changes
  }, [zoomLevel, lensMode]);

  useEffect(() => {
    if (!selectedFile || !sceneRef.current || activeScreen !== "3DView") return;
    const cachedData = fileDataCache.get(selectedFile.name);
    if (cachedData) {
      const { points, minThickness, maxThickness } = cachedData;
      setDataStats((prev) => ({
        ...prev,
        dataMin: minThickness,
        dataMax: maxThickness,
      }));

      if (showFurnace) {
        renderPointCloud(
          sceneRef.current,
          pointsRef,
          points,
          minThickness,
          maxThickness,
          false,
          useGlobalScaling,
          globalDataRange,
          wearRange,
          viewMode,
          selectedFurnace,
          cameraRef,
          controlsRef,
          zoomLevel,
          lensMode
        );
      }

      if (templateData && showTemplate) {
        renderPointCloud(
          sceneRef.current,
          templatePointsRef,
          templateData.points,
          templateData.minThickness,
          templateData.maxThickness,
          true,
          useGlobalScaling,
          globalDataRange,
          wearRange,
          viewMode,
          selectedFurnace,
          cameraRef,
          controlsRef,
          zoomLevel,
          lensMode
        );
      }
    }
  }, [
    selectedFile,
    fileDataCache,
    useGlobalScaling,
    globalDataRange,
    wearRange,
    viewMode,
    showTemplate,
    showFurnace,
    selectedFurnace,
    activeScreen,
    templateData,
    zoomLevel,
    lensMode,
  ]);

  return <canvas ref={mainCanvasRef} style={{ width: "100%", height: "100%", display: "block" }} />;
};

export default ThreeSceneManager;
