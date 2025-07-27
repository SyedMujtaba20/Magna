import React, { useEffect, useCallback } from "react";
import * as THREE from "three";
import { initializeScene } from "./utils";

const RepairProposal = ({
  canvasRef,
  sceneRef,
  cameraRef,
  rendererRef,
  points,
  wornPoints,
  activeScreen,
  currentFileData,
  isProcessing,
  setProcessing,
  repairAreasCount,
}) => {
  const createRepairAreasVisualization = useCallback(async () => {
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

    if (!currentFileData?.points?.length) return;

    setProcessing((prev) => ({ ...prev, isProcessing: true }));

    try {
      const sectionPoints = points;

      if (sectionPoints.length > 0) {
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
          bgColors[index] = 0.4;
          bgColors[index + 1] = 0.4;
          bgColors[index + 2] = 0.4;
          bgCount++;
        }

        if (bgCount > 0) {
          const backgroundGeometry = new THREE.BufferGeometry();
          backgroundGeometry.setAttribute("position", new THREE.BufferAttribute(bgPositions.slice(0, bgCount * 3), 3));
          backgroundGeometry.setAttribute("color", new THREE.BufferAttribute(bgColors.slice(0, bgCount * 3), 3));

          const backgroundMaterial = new THREE.PointsMaterial({
            size: Math.max(1.5, Math.min(6.0, 2000 / Math.sqrt(bgCount))),
            vertexColors: true,
            opacity: 0.3,
            transparent: true,
            sizeAttenuation: false,
          });

          scene.add(new THREE.Points(backgroundGeometry, backgroundMaterial));
        }
      }

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
          dmgColors[index] = 1.0;
          dmgColors[index + 1] = 0.0;
          dmgColors[index + 2] = 0.0;
          dmgCount++;
        }

        if (dmgCount > 0) {
          const damagedGeometry = new THREE.BufferGeometry();
          damagedGeometry.setAttribute("position", new THREE.BufferAttribute(dmgPositions.slice(0, dmgCount * 3), 3));
          damagedGeometry.setAttribute("color", new THREE.BufferAttribute(dmgColors.slice(0, dmgCount * 3), 3));

          const damagedMaterial = new THREE.PointsMaterial({
            size: Math.max(4.0, Math.min(12.0, 4000 / Math.sqrt(dmgCount))),
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            sizeAttenuation: false,
          });

          scene.add(new THREE.Points(damagedGeometry, damagedMaterial));
        }
      }

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
      setProcessing((prev) => ({ ...prev, isProcessing: false }));
    }
  }, [points, wornPoints, activeScreen, currentFileData, sceneRef, cameraRef, setProcessing]);

  useEffect(() => {
    const cleanup = initializeScene(canvasRef, sceneRef, cameraRef, rendererRef, 0x222222);
    return cleanup;
  }, [canvasRef, sceneRef, cameraRef, rendererRef]);

  useEffect(() => {
    if (currentFileData) {
      createRepairAreasVisualization();
    }
  }, [currentFileData, createRepairAreasVisualization]);

  return (
    <div style={{ flex: 1, backgroundColor: "#000", border: "2px solid #FF6600", borderRadius: "8px", position: "relative", overflow: "hidden", minHeight: "500px", height: "60vh" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.8)", color: "white", padding: "8px 16px", fontSize: "14px", fontWeight: "bold", zIndex: 1000 }}>
        GUNITE REPAIR PROPOSAL
      </div>
      <div style={{ position: "absolute", top: "85px", left: "10px", backgroundColor: "rgba(0,0,0,0.7)", color: repairAreasCount > 0 ? "#FF4444" : "#666", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", zIndex: 1000 }}>
        {repairAreasCount > 0 ? `${repairAreasCount} Repair Area(s) - ${activeScreen}` : `No Repairs Needed - ${activeScreen}`}
      </div>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", minHeight: "500px" }} />
    </div>
  );
};

export default RepairProposal;