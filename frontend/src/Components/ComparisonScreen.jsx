import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { getColorForThickness } from "./utils";

const ComparisonScreen = ({ files, fileDataCache, templateData, setActiveScreen, selectedFurnace, isUiDisabled }) => {
  const [referenceFile, setReferenceFile] = useState(null);
  const [compareFile, setCompareFile] = useState(null);
  const leftCanvasRef = useRef(null);
  const rightCanvasRef = useRef(null);
  const leftSceneRef = useRef(new THREE.Scene());
  const rightSceneRef = useRef(new THREE.Scene());
  const leftRendererRef = useRef(null);
  const rightRendererRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    const width = window.innerWidth / 2 - 100;
    const height = window.innerHeight - 200;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    const setupCanvas = (canvasRef, sceneRef, rendererRef) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const scene = sceneRef.current;
      scene.background = new THREE.Color(0x000000);
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(width, height);
      rendererRef.current = renderer;
      scene.add(new THREE.AmbientLight(0x404040));
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      const animate = () => {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    };

    setupCanvas(leftCanvasRef, leftSceneRef, leftRendererRef);
    setupCanvas(rightCanvasRef, rightSceneRef, rightRendererRef);

    return () => {
      if (leftRendererRef.current) leftRendererRef.current.dispose();
      if (rightRendererRef.current) rightRendererRef.current.dispose();
    };
  }, []);

  const renderPointCloud = (sceneRef, points, minThickness, maxThickness, isTemplate = false) => {
    const scene = sceneRef.current;
    scene.children.forEach((child) => {
      if (child.type === "Points") {
        scene.remove(child);
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    const positions = [];
    const colors = [];
    points.forEach((point) => {
      if (selectedFurnace && point.furnaceId !== selectedFurnace.furnace_id) return;
      positions.push(...point.position);
      const color = isTemplate
        ? new THREE.Color(0xaaaaaa)
        : getColorForThickness(point.thickness, minThickness, maxThickness, false, {});
      colors.push(color.r, color.g, color.b);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: isTemplate ? 0.5 : 0.8,
    });
    scene.add(new THREE.Points(geometry, material));
  };

  useEffect(() => {
    if (referenceFile && fileDataCache.has(referenceFile.name)) {
      const { points, minThickness, maxThickness } = fileDataCache.get(referenceFile.name);
      renderPointCloud(leftSceneRef, points, minThickness, maxThickness, true);
    }
    if (compareFile && fileDataCache.has(compareFile.name)) {
      const { points, minThickness, maxThickness } = fileDataCache.get(compareFile.name);
      renderPointCloud(rightSceneRef, points, minThickness, maxThickness);
    }
  }, [referenceFile, compareFile, fileDataCache, selectedFurnace]);

  const handleAccept = () => {
    if (!referenceFile || !compareFile) {
      alert("Please select both a reference and a comparison file.");
      return;
    }
    setActiveScreen("3DView"); // Switch to 3D View with template and comparison
    // Template is already set; comparison data is in compareFile
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {!selectedFurnace && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white" }}>
          Please select a furnace
        </div>
      )}
      <div style={{ display: "flex", gap: "10px", padding: "10px" }}>
        <select
          onChange={(e) => setReferenceFile(files.find((f) => f.name === e.target.value))}
          disabled={isUiDisabled}
          style={{ padding: "5px" }}
        >
          <option value="">Select Reference</option>
          {files.map((file) => (
            <option key={file.name} value={file.name}>{file.name}</option>
          ))}
        </select>
        <select
          onChange={(e) => setCompareFile(files.find((f) => f.name === e.target.value))}
          disabled={isUiDisabled}
          style={{ padding: "5px" }}
        >
          <option value="">Select Comparison</option>
          {files.map((file) => (
            <option key={file.name} value={file.name}>{file.name}</option>
          ))}
        </select>
        <button
          onClick={handleAccept}
          style={{
            backgroundColor: "#3B82F6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "6px 12px",
            cursor: isUiDisabled ? "not-allowed" : "pointer",
          }}
          disabled={isUiDisabled}
        >
          Accept
        </button>
      </div>
      <div style={{ display: "flex", height: "100%" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <h3>Reference</h3>
          <canvas ref={leftCanvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <h3>Comparison</h3>
          <canvas ref={rightCanvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
};

export default ComparisonScreen;