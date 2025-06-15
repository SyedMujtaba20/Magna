import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import Sidebar from "./SidebarDummy";
import { Play, RefreshCw, BellOff, Monitor, BarChart2, Settings, FileText, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import lidarStyles from './LidarStyles';

// Gradient Scale Component
const GradientScale = () => {
  const gradientStops = [
    { distance: "1.00m", color: "#0000FF" }, // Blue
    { distance: "2.20m", color: "#00BFFF" }, // Light Blue
    { distance: "3.40m", color: "#00FF00" }, // Green
    { distance: "4.60m", color: "#FFFF00" }, // Yellow
    { distance: "5.80m", color: "#FF0000" }, // Red
    { distance: "7.00m", color: "#FFC0CB" }, // Pink
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "15px",
        color: "white",
        fontSize: "12px",
      }}
    >
      <span style={{ color: "#cccccc", fontWeight: "500" }}>
        Thickness Scale:
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: `linear-gradient(to right, ${gradientStops
            .map((stop) => stop.color)
            .join(", ")})`,
          height: "20px",
          width: "300px",
          borderRadius: "10px",
          border: "1px solid #404040",
          position: "relative",
        }}
      >
        {gradientStops.map((stop, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${(index / (gradientStops.length - 1)) * 100}%`,
              transform: "translateX(-50%)",
              bottom: "-25px",
              fontSize: "10px",
              color: "#cccccc",
              whiteSpace: "nowrap",
            }}
          >
            {stop.distance}
          </div>
        ))}
      </div>
    </div>
  );
};

const LidarVisualizer = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', or null
  const [uploadMessage, setUploadMessage] = useState('');
  const [dataStats, setDataStats] = useState({
    min: 0,
    max: 10,
    dataMin: 0,
    dataMax: 10,
  });
  const [globalDataRange, setGlobalDataRange] = useState({
    min: Infinity,
    max: -Infinity,
    isInitialized: false,
  });
  const [useGlobalScaling, setUseGlobalScaling] = useState(true);
  const [fileDataCache, setFileDataCache] = useState(new Map());
  const [previewScenes, setPreviewScenes] = useState(new Map());

  const mainCanvasRef = useRef(null);
  const previewCanvasRefs = useRef(new Map());
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Three.js references for main canvas
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const pointsRef = useRef(null);
  const animationIdRef = useRef(null);

  // Updated color gradient configuration to match the image
  const colorStops = [
    { distance: 1.0, color: new THREE.Color(0x0000ff) }, // Blue - 1.00m
    { distance: 2.2, color: new THREE.Color(0x00bfff) }, // Light Blue - 2.20m
    { distance: 3.4, color: new THREE.Color(0x00ff00) }, // Green - 3.40m
    { distance: 4.6, color: new THREE.Color(0xffff00) }, // Yellow - 4.60m
    { distance: 5.8, color: new THREE.Color(0xff0000) }, // Red - 5.80m
    { distance: 7.0, color: new THREE.Color(0xffc0cb) }, // Pink - 7.00m
  ];

  const getColorForThickness = (thickness, localMin, localMax) => {
    // Choose scaling range based on user preference and data availability
    let minRange, maxRange;

    if (useGlobalScaling && globalDataRange.isInitialized) {
      minRange = globalDataRange.min;
      maxRange = globalDataRange.max;
    } else {
      minRange = localMin;
      maxRange = localMax;
    }

    // Ensure we have valid ranges
    if (minRange === maxRange) {
      return colorStops[Math.floor(colorStops.length / 2)].color; // Return middle color
    }

    // Scale thickness to our 1.00-7.00 range based on chosen data range
    const scaledThickness = THREE.MathUtils.mapLinear(
      thickness,
      minRange,
      maxRange,
      1.0,
      7.0
    );

    // Clamp to valid range
    const clampedThickness = Math.max(1.0, Math.min(7.0, scaledThickness));

    for (let i = 1; i < colorStops.length; i++) {
      if (clampedThickness <= colorStops[i].distance) {
        const prevStop = colorStops[i - 1];
        const currStop = colorStops[i];
        const t =
          (clampedThickness - prevStop.distance) /
          (currStop.distance - prevStop.distance);
        const color = prevStop.color.clone();
        color.lerp(currStop.color, t);
        return color;
      }
    }
    return colorStops[colorStops.length - 1].color;
  };

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Upload files to backend
  const handleUploadToBackend = async () => {
    if (files.length === 0) {
      setUploadStatus('error');
      setUploadMessage('No files selected for upload');
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setUploadMessage('');

    try {
      const formData = new FormData();
      
      // Add all files to form data
      files.forEach((file, index) => {
        formData.append('files', file);
      });

      // Make API call to your backend
      const response = await fetch('/api/furnace/upload-files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setUploadMessage(`Successfully uploaded ${result.totalFiles} files. Processed ${result.results.length} campaigns.`);
      } else {
        setUploadStatus('error');
        setUploadMessage(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage('Network error during upload');
    } finally {
      setUploading(false);
      
      // Clear status after 5 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    }
  };

  const handleFolderChange = async (e) => {
    const fileList = Array.from(e.target.files);
    setFiles(fileList);

    // Clear upload status when new files are selected
    setUploadStatus(null);
    setUploadMessage('');

    // Reset states
    setGlobalDataRange({ min: Infinity, max: -Infinity, isInitialized: false });
    setFileDataCache(new Map());
    setPreviewScenes(new Map());

    if (fileList.length > 0) {
      // Pre-analyze all files to determine global range
      setLoading(true);
      let globalMin = Infinity;
      let globalMax = -Infinity;
      const cache = new Map();

      for (const file of fileList) {
        try {
          const content = await readFileAsText(file);
          const { points, minThickness, maxThickness } = parseCSV(content);

          globalMin = Math.min(globalMin, minThickness);
          globalMax = Math.max(globalMax, maxThickness);

          // Cache the parsed data
          cache.set(file.name, { points, minThickness, maxThickness });
        } catch (error) {
          console.error(`Error parsing file ${file.name}:`, error);
        }
      }

      setGlobalDataRange({
        min: globalMin,
        max: globalMax,
        isInitialized: true,
      });
      setFileDataCache(cache);
      setSelectedFile(fileList[0]);
      setLoading(false);
    }
  };

  // Create a simple OrbitControls implementation
  const createSimpleControls = (camera, domElement) => {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let rotationX = 0;
    let rotationY = 0;

    const onMouseDown = (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseMove = (event) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      targetRotationY += deltaX * 0.01;
      targetRotationX += deltaY * 0.01;

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    domElement.addEventListener("mousedown", onMouseDown);
    domElement.addEventListener("mouseup", onMouseUp);
    domElement.addEventListener("mousemove", onMouseMove);

    return {
      update: () => {
        rotationX += (targetRotationX - rotationX) * 0.1;
        rotationY += (targetRotationY - rotationY) * 0.1;

        camera.position.x = Math.sin(rotationY) * 30;
        camera.position.z = Math.cos(rotationY) * 30;
        camera.position.y = Math.sin(rotationX) * 30;
        camera.lookAt(0, 0, 0);
      },
      dispose: () => {
        domElement.removeEventListener("mousedown", onMouseDown);
        domElement.removeEventListener("mouseup", onMouseUp);
        domElement.removeEventListener("mousemove", onMouseMove);
      },
    };
  };

  // Function to update canvas size
  const updateCanvasSize = () => {
    if (!containerRef.current || !rendererRef.current || !cameraRef.current)
      return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Update camera aspect ratio
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();

    // Update renderer size
    rendererRef.current.setSize(width, height);
  };

  // Initialize Three.js scene
  useEffect(() => {
    if (!mainCanvasRef.current || !containerRef.current) return;

    const canvas = mainCanvasRef.current;
    const container = containerRef.current;
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x000000);

    // Get initial container dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Controls
    const controls = createSimpleControls(camera, renderer.domElement);
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0x404040));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Initial size update
    updateCanvasSize();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (pointsRef.current) {
        scene.remove(pointsRef.current);
        pointsRef.current.geometry.dispose();
        pointsRef.current.material.dispose();
      }
    };
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load and display selected file
  useEffect(() => {
    if (!selectedFile || !sceneRef.current) return;

    // Check if data is already cached
    const cachedData = fileDataCache.get(selectedFile.name);
    if (cachedData) {
      const { points, minThickness, maxThickness } = cachedData;
      setDataStats((prev) => ({
        ...prev,
        dataMin: minThickness,
        dataMax: maxThickness,
      }));
      renderPointCloud(points, minThickness, maxThickness);
      return;
    }

    // If not cached, load the file
    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const { points, minThickness, maxThickness } = parseCSV(content);

        setDataStats((prev) => ({
          ...prev,
          dataMin: minThickness,
          dataMax: maxThickness,
        }));

        renderPointCloud(points, minThickness, maxThickness);
        setLoading(false);
      } catch (error) {
        console.error("Error rendering point cloud:", error);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      console.error("Error reading file");
      setLoading(false);
    };

    reader.readAsText(selectedFile);
  }, [selectedFile, fileDataCache]);

  // Re-render when scaling mode changes
  useEffect(() => {
    if (selectedFile && fileDataCache.has(selectedFile.name)) {
      const { points, minThickness, maxThickness } = fileDataCache.get(
        selectedFile.name
      );
      renderPointCloud(points, minThickness, maxThickness);
    }
  }, [useGlobalScaling, globalDataRange]);

  // Setup preview canvases
  useEffect(() => {
    if (files.length === 0 || fileDataCache.size === 0) return;

    const timer = setTimeout(() => {
      files.forEach((file) => {
        const canvas = previewCanvasRefs.current.get(file.name);
        if (!canvas || !fileDataCache.has(file.name)) {
          return;
        }

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        camera.position.set(20, 20, 20);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(80, 80);

        // Add lighting
        scene.add(new THREE.AmbientLight(0x404040));
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);

        // Render the cached data
        const { points, minThickness, maxThickness } = fileDataCache.get(
          file.name
        );
        const positions = [];
        const colors = [];

        // Sample points for preview (use every 10th point for performance)
        const sampleStep = Math.max(1, Math.floor(points.length / 1000));

        for (let i = 0; i < points.length; i += sampleStep) {
          const point = points[i];
          positions.push(...point.position);
          const color = getColorForThickness(
            point.thickness,
            minThickness,
            maxThickness
          );
          colors.push(color.r, color.g, color.b);
        }

        if (positions.length === 0) {
          return;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(positions, 3)
        );
        geometry.setAttribute(
          "color",
          new THREE.Float32BufferAttribute(colors, 3)
        );

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

        // Simple rotation animation
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

  const parseCSV = (content) => {
    const lines = content.split("\n").filter((line) => line.trim() !== "");
    let points = [];
    let minThickness = Infinity;
    let maxThickness = -Infinity;

    if (lines.length === 0) {
      throw new Error("Empty CSV file");
    }

    // Check if first line contains headers
    const firstLine = lines[0].toLowerCase();
    const hasHeader =
      firstLine.includes("x") &&
      firstLine.includes("y") &&
      firstLine.includes("z");

    let startIndex = hasHeader ? 1 : 0;
    let xIndex = 0,
      yIndex = 1,
      zIndex = 2;

    if (hasHeader) {
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      xIndex = header.findIndex((h) => h === "x");
      yIndex = header.findIndex((h) => h === "y");
      zIndex = header.findIndex((h) => h === "z");

      if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
        throw new Error("Could not find x, y, z columns in header");
      }
    }

    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());

      if (values.length < 3) continue;

      const x = parseFloat(values[xIndex]);
      const y = parseFloat(values[yIndex]);
      const z = parseFloat(values[zIndex]);

      if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

      const thickness = Math.sqrt(x * x + y * y + z * z);

      minThickness = Math.min(minThickness, thickness);
      maxThickness = Math.max(maxThickness, thickness);

      // Determine scaling based on data magnitude
      let scale = 1;
      const maxCoord = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));

      if (maxCoord > 100) {
        scale = 0.01;
      } else if (maxCoord < 1) {
        scale = 10;
      }

      points.push({
        position: [x * scale, y * scale, z * scale],
        thickness,
      });
    }

    if (points.length === 0) {
      throw new Error("No valid data points found in CSV");
    }

    return { points, minThickness, maxThickness };
  };

  const renderPointCloud = (points, minThickness, maxThickness) => {
    const scene = sceneRef.current;

    // Remove previous points if they exist
    if (pointsRef.current) {
      scene.remove(pointsRef.current);
      pointsRef.current.geometry.dispose();
      pointsRef.current.material.dispose();
    }

    // Prepare geometry data
    const positions = [];
    const colors = [];

    points.forEach((point) => {
      positions.push(...point.position);
      const color = getColorForThickness(
        point.thickness,
        minThickness,
        maxThickness
      );
      colors.push(color.r, color.g, color.b);
    });

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    // Compute center to recenter the points
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    // Create material
    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    // Create points and add to scene
    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
    pointsRef.current = pointCloud;

    // Reset camera position
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 50);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.update();
    }

    setTimeout(() => {
      updateCanvasSize();
    }, 100);
  };

  // Upload status component
  const UploadStatus = () => {
    if (!uploadStatus) return null;

    const isSuccess = uploadStatus === 'success';
    const Icon = isSuccess ? CheckCircle : AlertCircle;
    const color = isSuccess ? '#10B981' : '#EF4444';

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: isSuccess ? '#065F46' : '#7F1D1D',
          color: color,
          borderRadius: '6px',
          fontSize: '14px',
          maxWidth: '300px',
        }}
      >
        <Icon size={16} />
        <span>{uploadMessage}</span>
      </div>
    );
  };

  // Updated return statement for your LiDAR component
  return (
    <div style={lidarStyles.container}>
      {/* Header with original sidebar content */}
      <div style={lidarStyles.header}>
        <div style={lidarStyles.headerTitle}>LiDAR Viewer</div>
        <div style={lidarStyles.headerControls}>
          {/* Folder Upload */}
          <div style={lidarStyles.folderUpload}>
            <label style={lidarStyles.folderLabel}>
              Select Folder
              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory=""
                directory=""
                multiple
                accept=".csv,.txt"
                onChange={handleFolderChange}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Upload Button */}
          {files.length > 0 && (
            <button
              onClick={handleUploadToBackend}
              disabled={uploading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: uploading ? '#374151' : '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
            </button>
          )}
          
          {/* Upload Status */}
          <UploadStatus />
          
          {/* Global Scaling Control */}
          <div style={lidarStyles.controls}>
            <label style={lidarStyles.controlLabel}>
              <input
                type="checkbox"
                checked={useGlobalScaling}
                onChange={(e) => setUseGlobalScaling(e.target.checked)}
                style={{ marginRight: "8px" }}
              />
              Global Scaling
            </label>
          </div>
          
          {/* File List in Header */}
          <div style={lidarStyles.headerFileList}>
            {files.map((file, index) => (
              <div
                key={index}
                onClick={() => setSelectedFile(file)}
                style={lidarStyles.headerFileItem(selectedFile === file)}
              >
                {file.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area with Sidebar and Main Content */}
      <div style={lidarStyles.contentArea}>
        {/* Sidebar Component */}
        <Sidebar />

        {/* Main Content */}
        <div style={lidarStyles.mainContent}>
          <div style={lidarStyles.visualization}>
            <div ref={containerRef} style={lidarStyles.canvasContainer}>
              <canvas ref={mainCanvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
              {loading && <div style={lidarStyles.loading}>Loading...</div>}
              {!selectedFile && files.length === 0 && (
                <div style={lidarStyles.noFileMessage}>
                  <div style={{ marginBottom: "10px", fontSize: "18px" }}>📁</div>
                  <div>Select a folder to load LiDAR data</div>
                </div>
              )}
            </div>
            {selectedFile && <div style={lidarStyles.gradientScale}><GradientScale /></div>}
          </div>

          {files.length > 0 && (
            <div style={lidarStyles.thumbnailsContainer}>
              {files.map((file, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedFile(file)}
                  style={lidarStyles.thumbnailItem(selectedFile === file)}
                >
                  <canvas
                    ref={(el) => {
                      if (el) previewCanvasRefs.current.set(file.name, el);
                    }}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                  <div style={lidarStyles.thumbnailLabel}>
                    {file.name.replace(".csv", "").replace(".txt", "")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LidarVisualizer;