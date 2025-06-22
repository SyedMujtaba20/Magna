import React, { useEffect } from "react";
import * as THREE from "three";
import { getColorForThickness } from "./utils";
import styles from "./styles";

const ThumbnailViewer = ({
  files,
  selectedFile,
  setSelectedFile,
  previewCanvasRefs,
  fileDataCache,
  useGlobalScaling,
  globalDataRange,
}) => {
  useEffect(() => {
    if (files.length === 0 || fileDataCache.size === 0) return;
    const timer = setTimeout(() => {
      files.forEach((file) => {
        const canvas = previewCanvasRefs.current.get(file.name);
        if (!canvas || !fileDataCache.has(file.name)) return;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(20, 20, 20);
        camera.lookAt(0, 0, 0);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(80, 80);
        scene.add(new THREE.AmbientLight(0x404040));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        const { points, minThickness, maxThickness } = fileDataCache.get(file.name);
        const positions = [];
        const colors = [];
        const sampleStep = Math.max(1, Math.floor(points.length / 1000));
        for (let i = 0; i < points.length; i += sampleStep) {
          const point = points[i];
          positions.push(...point.position);
          const color = getColorForThickness(
            point.thickness,
            minThickness,
            maxThickness,
            useGlobalScaling,
            globalDataRange
          );
          colors.push(color.r, color.g, color.b);
        }
        if (positions.length === 0) return;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
        const material = new THREE.PointsMaterial({
          size: 0.3,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
        });
        const pointCloud = new THREE.Points(geometry, material);
        scene.add(pointCloud);
        let rotation = 0;
        const animate = () => {
          rotation += 0.01;
          pointCloud.rotation.y = rotation;
          renderer.render(scene, camera);
          requestAnimationFrame(animate);
        };
        animate();
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [fileDataCache, files, useGlobalScaling, globalDataRange]);

  return (
    <div style={styles.thumbnailsContainer}>
      {files.map((file, index) => (
        <div
          key={index}
          onClick={() => setSelectedFile(file)}
          style={styles.thumbnailItem(selectedFile === file)}
        >
          <canvas
            ref={(el) => {
              if (el) previewCanvasRefs.current.set(file.name, el);
            }}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
          <div style={styles.thumbnailLabel}>
            {file.name.replace(".csv", "").replace(".txt", "")}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ThumbnailViewer;