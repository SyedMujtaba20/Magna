import React, { useEffect, useCallback } from "react";
import * as THREE from "three";
import { MAX_RENDER_POINTS } from "./constants";
import { initializeScene } from "./utils";

const PointCloud = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  points,
  activeScreen,
  wearThreshold,
  isProcessing,
  setProcessing,
  visualizationMode,
  toggleVisualizationMode,
  isUiDisabled,
  currentConfig,
  wornPointsCount,
}) => {
  const createPointCloud = useCallback(async () => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
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

    setProcessing((prev) => ({ ...prev, isProcessing: true }));

    try {
      const renderPoints = points.slice(0, MAX_RENDER_POINTS);
      console.log(`🎨 Rendering ${renderPoints.length} points for ${activeScreen}`);

      const positions = new Float32Array(renderPoints.length * 3);
      const colors = new Float32Array(renderPoints.length * 3);
      let validPointCount = 0;

      for (let i = 0; i < renderPoints.length; i++) {
        const point = renderPoints[i];
        const pos = point.position || [point.x || 0, point.y || 0, point.z || 0];
        if (pos.length < 3 || pos.some(isNaN)) continue;

        const index = validPointCount * 3;
        positions[index] = pos[0];
        positions[index + 1] = pos[1];
        positions[index + 2] = pos[2];

        const pointThickness = point.thickness || 0;
        const threshold = wearThreshold || 20;
        if (pointThickness > 0 && pointThickness <= threshold) {
          colors[index] = 1.0;
          colors[index + 1] = 0.0;
          colors[index + 2] = 0.0;
        } else {
          colors[index] = 0.6;
          colors[index + 1] = 0.6;
          colors[index + 2] = 0.6;
        }
        validPointCount++;
      }

      if (validPointCount === 0) return;

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
      setProcessing((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [points, activeScreen, wearThreshold, sceneRef, cameraRef, setProcessing]);

  useEffect(() => {
    const cleanup = initializeScene(canvasRef, sceneRef, cameraRef, rendererRef);
    return cleanup;
  }, [canvasRef, sceneRef, cameraRef, rendererRef]);

  useEffect(() => {
    if (points.length) {
      createPointCloud();
    }
  }, [points, createPointCloud]);

  return (
    <div style={{ flex: 1, backgroundColor: "#000", border: `2px solid ${currentConfig.color}`, borderRadius: "8px", position: "relative", overflow: "hidden", minHeight: "500px", height: "60vh" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.8)", color: "white", padding: "8px 16px", fontSize: "14px", fontWeight: "bold", zIndex: 1000 }}>
        {currentConfig.title}
      </div>
      <div style={{ position: "absolute", top: "50px", right: "10px", zIndex: 1000 }}>
        <button
          onClick={toggleVisualizationMode}
          style={{
            backgroundColor: visualizationMode === "filtered" ? "#10B981" : "#666",
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
      <div style={{ position: "absolute", top: "85px", left: "10px", backgroundColor: "rgba(0,0,0,0.7)", color: wornPointsCount > 0 ? "#FF4444" : "#10B981", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", zIndex: 1000 }}>
        {wornPointsCount > 0 ? `${wornPointsCount} points need repair (${activeScreen})` : `No repairs needed (${activeScreen})`}
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", minHeight: "500px" }} />
    </div>
  );
};

export default PointCloud;