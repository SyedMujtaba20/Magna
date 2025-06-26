import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { getColorForThickness } from "./utils";

const GunningScreen = ({ files,fileDataCache, selectedFile, selectedFurnace, isUiDisabled }) => {
  const [section, setSection] = useState("All");
  const [parameters, setParameters] = useState({
    repairMaterial: "Standard",
    wearThreshold: 2,
    distanceBetweenAreas: 10,
    minimumAreaSize: 5,
  });
  const [visualizationMode, setVisualizationMode] = useState("all");
  const canvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x000000);
    const width = canvas.parentElement.clientWidth * 0.7;
    const height = canvas.parentElement.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;
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
    return () => {
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!selectedFile || !fileDataCache.has(selectedFile.name) || !selectedFurnace) return;
    const { points, minThickness, maxThickness } = fileDataCache.get(selectedFile.name);
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
      if (point.furnaceId !== selectedFurnace.furnace_id) return;
      if (point.section !== section && section !== "All") return;
      if (visualizationMode === "filtered" && point.thickness > parameters.wearThreshold) {
        return;
      }
      positions.push(...point.position);
      const color = getColorForThickness(point.thickness, minThickness, maxThickness, false, {});
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
      opacity: 0.8,
    });
    scene.add(new THREE.Points(geometry, material));
  }, [selectedFile, fileDataCache, visualizationMode, parameters, section, selectedFurnace]);

  const calculateRepairMaterial = () => {
    if (!selectedFile || !fileDataCache.has(selectedFile.name) || !selectedFurnace) return 0;
    const { points } = fileDataCache.get(selectedFile.name);
    const wornPoints = points.filter(
      (p) =>
        (p.section === section || section === "All") &&
        p.thickness <= parameters.wearThreshold &&
        p.furnaceId === selectedFurnace.furnace_id
    );
    return wornPoints.length * 0.1; // Mock calculation
  };

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div style={{ width: "70%", position: "relative" }}>
        {!selectedFurnace && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white" }}>
            Please select a furnace
          </div>
        )}
        <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "5px" }}>
          {["All", "Bricks", "Slag Line", "Screed"].map((sec) => (
            <button
              key={sec}
              onClick={() => setSection(sec)}
              style={{
                backgroundColor: section === sec ? "#3B82F6" : "#6B7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "6px 10px",
                cursor: isUiDisabled ? "not-allowed" : "pointer",
              }}
              disabled={isUiDisabled}
            >
              {sec}
            </button>
          ))}
          <button
            onClick={() => setVisualizationMode(visualizationMode === "all" ? "filtered" : "all")}
            style={{
              backgroundColor: visualizationMode === "filtered" ? "#3B82F6" : "#6B7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px 10px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
            }}
            disabled={isUiDisabled}
          >
            {visualizationMode === "all" ? "Show Filtered" : "Show All"}
          </button>
        </div>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div style={{ width: "30%", padding: "10px" }}>
        <h3>Parameters</h3>
        <div>
          <label>Repair Material:</label>
          <select
            value={parameters.repairMaterial}
            onChange={(e) => setParameters({ ...parameters, repairMaterial: e.target.value })}
            disabled={isUiDisabled}
          >
            <option>Standard</option>
            <option>High-Density</option>
            <option>Low-Thermal</option>
          </select>
        </div>
        <div>
          <label>Wear Threshold (mm):</label>
          <input
            type="number"
            value={parameters.wearThreshold}
            onChange={(e) => setParameters({ ...parameters, wearThreshold: Number(e.target.value) })}
            disabled={isUiDisabled}
            min="0"
          />
        </div>
        <div>
          <label>Distance Between Areas (cm):</label>
          <input
            type="number"
            value={parameters.distanceBetweenAreas}
            onChange={(e) => setParameters({ ...parameters, distanceBetweenAreas: Number(e.target.value) })}
            disabled={isUiDisabled}
            min="0"
          />
        </div>
        <div>
          <label>Minimum Area Size (cm²):</label>
          <input
            type="number"
            value={parameters.minimumAreaSize}
            onChange={(e) => setParameters({ ...parameters, minimumAreaSize: Number(e.target.value) })}
            disabled={isUiDisabled}
            min="0"
          />
        </div>
        <h3>Repair Proposal</h3>
        <p>Material Needed: {calculateRepairMaterial().toFixed(2)} kg</p>
        <p>Section: {section}</p>
        {selectedFurnace && <p>Furnace: {selectedFurnace.name}</p>}
      </div>
    </div>
  );
};

export default GunningScreen;