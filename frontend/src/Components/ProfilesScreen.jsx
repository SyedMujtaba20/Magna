import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { getColorForThickness } from "./utils";

const ProfilesScreen = ({ files,fileDataCache, selectedFile, selectedFurnace, isUiDisabled }) => {
  const [horizontalSlice, setHorizontalSlice] = useState(0);
  const [verticalSlice, setVerticalSlice] = useState(0);
  const canvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x000000);
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    const camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 1000);
    camera.position.set(0, 50, 0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    scene.add(new THREE.AmbientLight(0xffffff));
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
    const { points } = fileDataCache.get(selectedFile.name);
    const scene = sceneRef.current;
    scene.children.forEach((child) => {
      if (child.type === "Points" || child.type === "Line") {
        scene.remove(child);
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    // Render points for top-down view
    const positions = [];
    const colors = [];
    points.forEach((point) => {
      if (point.furnaceId !== selectedFurnace.furnace_id) return;
      positions.push(point.position[0], 0, point.position[2]);
      colors.push(...getColorForThickness(point.thickness, 0, 10, false, {}).toArray());
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true });
    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
    // Render slice lines
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const hPoints = [
      new THREE.Vector3(-50, 0, horizontalSlice),
      new THREE.Vector3(50, 0, horizontalSlice),
    ];
    const vPoints = [
      new THREE.Vector3(verticalSlice, 0, -50),
      new THREE.Vector3(verticalSlice, 0, 50),
    ];
    const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
    const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
    scene.add(new THREE.Line(hGeometry, lineMaterial));
    scene.add(new THREE.Line(vGeometry, lineMaterial));
  }, [selectedFile, fileDataCache, horizontalSlice, verticalSlice, selectedFurnace]);

  const handleCanvasClick = (event) => {
    if (isUiDisabled) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    // Update slice positions (simplified)
    setHorizontalSlice(mouse.y * 50);
    setVerticalSlice(mouse.x * 50);
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {!selectedFurnace && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", color: "white" }}>
          Please select a furnace
        </div>
      )}
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} onClick={handleCanvasClick} />
    </div>
  );
};

export default ProfilesScreen;