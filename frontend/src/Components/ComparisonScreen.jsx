import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { getColorForThickness } from "./utils";

const ComparisonScreen = ({ 
  files, 
  fileDataCache, 
  templateData, 
  setActiveScreen, 
  selectedFurnace, 
  isUiDisabled
}) => {
  const [referenceFile, setReferenceFile] = useState(null);
  const [compareFile, setCompareFile] = useState(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Separate 3D View refs for each canvas
  const templateCanvasRef = useRef(null);
  const comparisonCanvasRef = useRef(null);
  const templateSceneRef = useRef(new THREE.Scene());
  const comparisonSceneRef = useRef(new THREE.Scene());
  const templateRendererRef = useRef(null);
  const comparisonRendererRef = useRef(null);
  const templateCameraRef = useRef(null);
  const comparisonCameraRef = useRef(null);
  const templateMeshRef = useRef(null);
  const comparisonMeshRef = useRef(null);
  const animationIdRef = useRef(null);

  // Initialize 3D scene for a canvas
  const initializeScene = (canvasRef, sceneRef, rendererRef, cameraRef, isTemplate = false) => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    // Setup camera with larger field of view for bigger display
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 30); // Closer to make objects appear larger
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(isTemplate ? 0x1a1a1a : 0x0a0a0a); // Slightly different backgrounds
    rendererRef.current = renderer;

    // Setup enhanced lighting for better visibility
    scene.add(new THREE.AmbientLight(0x404040, 0.8));
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight1.position.set(20, 20, 20);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-20, -20, 20);
    scene.add(directionalLight2);

    // Enhanced camera controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const handleMouseDown = (event) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event) => {
      if (!isDragging) return;
      
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };

      const deltaRotationQuaternion = new THREE.Quaternion()
        .setFromEuler(new THREE.Euler(
          deltaMove.y * 0.01,
          deltaMove.x * 0.01,
          0,
          'XYZ'
        ));

      camera.quaternion.multiplyQuaternions(deltaRotationQuaternion, camera.quaternion);
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 1.1 : 0.9;
      camera.position.multiplyScalar(delta);
      // Keep camera within reasonable bounds
      const distance = camera.position.length();
      if (distance < 10) camera.position.normalize().multiplyScalar(10);
      if (distance > 100) camera.position.normalize().multiplyScalar(100);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
  };

  // Animation loop for both canvases
  useEffect(() => {
    if (!showComparison) return;

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      if (templateRendererRef.current && templateCameraRef.current) {
        templateRendererRef.current.render(templateSceneRef.current, templateCameraRef.current);
      }
      if (comparisonRendererRef.current && comparisonCameraRef.current) {
        comparisonRendererRef.current.render(comparisonSceneRef.current, comparisonCameraRef.current);
      }
    };
    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [showComparison]);

  // Initialize both scenes
  useEffect(() => {
    if (!showComparison) return;

    const templateControls = initializeScene(
      templateCanvasRef, 
      templateSceneRef, 
      templateRendererRef, 
      templateCameraRef, 
      true
    );
    
    const comparisonControls = initializeScene(
      comparisonCanvasRef, 
      comparisonSceneRef, 
      comparisonRendererRef, 
      comparisonCameraRef, 
      false
    );

    // Handle resize for both canvases
    const handleResize = () => {
      if (templateCanvasRef.current && templateCameraRef.current && templateRendererRef.current) {
        const templateCanvas = templateCanvasRef.current;
        const newWidth = templateCanvas.clientWidth;
        const newHeight = templateCanvas.clientHeight;
        templateCameraRef.current.aspect = newWidth / newHeight;
        templateCameraRef.current.updateProjectionMatrix();
        templateRendererRef.current.setSize(newWidth, newHeight);
      }

      if (comparisonCanvasRef.current && comparisonCameraRef.current && comparisonRendererRef.current) {
        const comparisonCanvas = comparisonCanvasRef.current;
        const newWidth = comparisonCanvas.clientWidth;
        const newHeight = comparisonCanvas.clientHeight;
        comparisonCameraRef.current.aspect = newWidth / newHeight;
        comparisonCameraRef.current.updateProjectionMatrix();
        comparisonRendererRef.current.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Cleanup template canvas events
      if (templateCanvasRef.current && templateControls) {
        const canvas = templateCanvasRef.current;
        canvas.removeEventListener('mousedown', templateControls.handleMouseDown);
        canvas.removeEventListener('mousemove', templateControls.handleMouseMove);
        canvas.removeEventListener('mouseup', templateControls.handleMouseUp);
        canvas.removeEventListener('wheel', templateControls.handleWheel);
      }
      
      // Cleanup comparison canvas events
      if (comparisonCanvasRef.current && comparisonControls) {
        const canvas = comparisonCanvasRef.current;
        canvas.removeEventListener('mousedown', comparisonControls.handleMouseDown);
        canvas.removeEventListener('mousemove', comparisonControls.handleMouseMove);
        canvas.removeEventListener('mouseup', comparisonControls.handleMouseUp);
        canvas.removeEventListener('wheel', comparisonControls.handleWheel);
      }
      
      // Dispose renderers
      if (templateRendererRef.current) {
        templateRendererRef.current.dispose();
      }
      if (comparisonRendererRef.current) {
        comparisonRendererRef.current.dispose();
      }
    };
  }, [showComparison]);

  // Create enhanced point cloud with larger points and better high-wear visualization
  const createPointCloud = (points, minThickness, maxThickness, isTemplate = false) => {
    const positions = [];
    const colors = [];

    points.forEach((point) => {
      if (selectedFurnace && point.furnaceId !== selectedFurnace.furnace_id) return;
      
      positions.push(...point.position);
      
      if (isTemplate) {
        // Template shows as neutral gray
        const color = new THREE.Color(0xcccccc);
        colors.push(color.r, color.g, color.b);
      } else {
        // Enhanced comparison coloring with emphasis on high-wear areas
        const normalizedThickness = (point.thickness - minThickness) / (maxThickness - minThickness);
        let color;
        
        if (normalizedThickness < 0.3) {
          // High wear areas - bright red for maximum visibility
          color = new THREE.Color(0xff0000);
        } else if (normalizedThickness < 0.6) {
          // Medium wear areas - orange
          color = new THREE.Color(0xff6600);
        } else if (normalizedThickness < 0.8) {
          // Low-medium wear - yellow
          color = new THREE.Color(0xffff00);
        } else {
          // Low wear areas - green
          color = new THREE.Color(0x00ff00);
        }
        
        colors.push(color.r, color.g, color.b);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    
    // Center and scale the geometry for better visibility
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    
    // Scale up the geometry to make it appear larger
    const scale = 1.5;
    geometry.scale(scale, scale, scale);

    const material = new THREE.PointsMaterial({
      size: isTemplate ? 0.4 : 0.6, // Larger points for better visibility
      vertexColors: true,
      transparent: true,
      opacity: isTemplate ? 0.7 : 1.0,
      sizeAttenuation: true, // Points get smaller with distance
    });

    return new THREE.Points(geometry, material);
  };

  // Update 3D visualizations
  useEffect(() => {
    if (!showComparison) return;

    // Update template scene
    if (templateSceneRef.current) {
      const scene = templateSceneRef.current;
      
      // Clear existing template mesh
      if (templateMeshRef.current) {
        scene.remove(templateMeshRef.current);
        templateMeshRef.current.geometry.dispose();
        templateMeshRef.current.material.dispose();
      }

      // Add template (reference)
      if (referenceFile && fileDataCache.has(referenceFile.name)) {
        const { points, minThickness, maxThickness } = fileDataCache.get(referenceFile.name);
        const templateMesh = createPointCloud(points, minThickness, maxThickness, true);
        scene.add(templateMesh);
        templateMeshRef.current = templateMesh;
      }
    }

    // Update comparison scene
    if (comparisonSceneRef.current) {
      const scene = comparisonSceneRef.current;
      
      // Clear existing comparison mesh
      if (comparisonMeshRef.current) {
        scene.remove(comparisonMeshRef.current);
        comparisonMeshRef.current.geometry.dispose();
        comparisonMeshRef.current.material.dispose();
      }

      // Add comparison with enhanced wear visualization
      if (compareFile && fileDataCache.has(compareFile.name)) {
        const { points, minThickness, maxThickness } = fileDataCache.get(compareFile.name);
        const comparisonMesh = createPointCloud(points, minThickness, maxThickness, false);
        scene.add(comparisonMesh);
        comparisonMeshRef.current = comparisonMesh;
      }
    }
  }, [showComparison, referenceFile, compareFile, fileDataCache, selectedFurnace]);

  const handleAccept = () => {
    if (!referenceFile || !compareFile) {
      alert("Please select both a reference and a comparison file.");
      return;
    }

    // Show the comparison view
    setShowComparison(true);
  };

  const handleBackToSelection = () => {
    setShowComparison(false);
    setReferenceFile(null);
    setCompareFile(null);
  };

  const handleBackTo3DView = () => {
    setActiveScreen("3DView");
  };

  if (showComparison) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        height: "100vh",
        backgroundColor: "#111827"
      }}>
        {/* Header with controls */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "15px 20px",
          backgroundColor: "#1F2937",
          color: "#E5E7EB",
          borderBottom: "1px solid #374151",
          minHeight: "60px"
        }}>
          <h2 style={{ margin: 0, color: "#F9FAFB" }}>Dual Furnace Comparison View</h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleBackToSelection}
              style={{
                backgroundColor: "#6B7280",
                color: "#F9FAFB",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Back to Selection
            </button>
            <button
              onClick={handleBackTo3DView}
              style={{
                backgroundColor: "#3B82F6",
                color: "#F9FAFB",
                border: "none",
                borderRadius: "6px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              Back to 3D View
            </button>
          </div>
        </div>

        {/* Main comparison view with dual canvas */}
        <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
          {/* Left Panel - Template (Reference) */}
          <div style={{ 
            flex: 1, 
            backgroundColor: "#1F2937",
            color: "#E5E7EB",
            padding: "15px",
            borderRight: "2px solid #374151",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ 
              margin: "0 0 15px 0", 
              textAlign: "center",
              color: "#F9FAFB",
              fontSize: "18px",
              fontWeight: "600"
            }}>
              Template: {referenceFile?.name}
            </h3>
            <div style={{ 
              flex: 1,
              border: "1px solid #374151",
              borderRadius: "8px",
              backgroundColor: "#0F172A",
              position: "relative",
              overflow: "hidden"
            }}>
              <canvas 
                ref={templateCanvasRef}
                style={{ 
                  width: "100%", 
                  height: "100%",
                  display: "block"
                }} 
              />
            </div>
          </div>

          {/* Middle Panel - Comparison Furnace */}
          <div style={{ 
            flex: 1, 
            backgroundColor: "#1F2937",
            color: "#E5E7EB",
            padding: "15px",
            borderRight: "2px solid #374151",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ 
              margin: "0 0 15px 0", 
              textAlign: "center",
              color: "#F9FAFB",
              fontSize: "18px",
              fontWeight: "600"
            }}>
              Comparison: {compareFile?.name}
            </h3>
            <div style={{ 
              flex: 1,
              border: "1px solid #374151",
              borderRadius: "8px",
              backgroundColor: "#0F172A",
              position: "relative",
              overflow: "hidden"
            }}>
              <canvas 
                ref={comparisonCanvasRef}
                style={{ 
                  width: "100%", 
                  height: "100%",
                  display: "block"
                }} 
              />
            </div>
          </div>

          {/* Right Panel - Enhanced Analysis */}
          <div style={{ 
            width: "350px",
            backgroundColor: "#1F2937",
            color: "#E5E7EB",
            padding: "15px",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ 
              margin: "0 0 15px 0", 
              textAlign: "center",
              color: "#F9FAFB",
              fontSize: "18px",
              fontWeight: "600"
            }}>
              Wear Analysis
            </h3>
            
            <div style={{ 
              flex: 1,
              border: "1px solid #374151",
              borderRadius: "8px",
              padding: "20px",
              backgroundColor: "#111827",
              overflow: "auto"
            }}>
              <div style={{ marginBottom: "25px" }}>
                <h4 style={{ 
                  margin: "0 0 15px 0", 
                  fontSize: "16px",
                  color: "#F9FAFB",
                  fontWeight: "600"
                }}>
                  High-Wear Detection
                </h4>
                <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#ff0000", 
                      marginRight: "12px",
                      borderRadius: "4px",
                      border: "2px solid #374151",
                      boxShadow: "0 0 8px rgba(255, 0, 0, 0.3)"
                    }}></div>
                    <span style={{ color: "#F9FAFB", fontWeight: "600" }}>Critical wear areas (RED)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#ff6600", 
                      marginRight: "12px",
                      borderRadius: "4px",
                      border: "2px solid #374151"
                    }}></div>
                    <span style={{ color: "#E5E7EB" }}>Medium wear areas (Orange)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#ffff00", 
                      marginRight: "12px",
                      borderRadius: "4px",
                      border: "2px solid #374151"
                    }}></div>
                    <span style={{ color: "#E5E7EB" }}>Low-medium wear (Yellow)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ 
                      width: "20px", 
                      height: "20px", 
                      backgroundColor: "#00ff00", 
                      marginRight: "12px",
                      borderRadius: "4px",
                      border: "2px solid #374151"
                    }}></div>
                    <span style={{ color: "#E5E7EB" }}>Minimal wear areas (Green)</span>
                  </div>
                </div>
              </div>

              <div style={{ 
                marginBottom: "20px",
                padding: "15px",
                backgroundColor: "#dc2626",
                borderRadius: "8px",
                border: "1px solid #b91c1c"
              }}>
                <div style={{ 
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#fef2f2",
                  marginBottom: "8px"
                }}>
                  ⚠️ CRITICAL ATTENTION REQUIRED
                </div>
                <div style={{ fontSize: "13px", color: "#fef2f2", lineHeight: "1.4" }}>
                  Red areas indicate severe thickness reduction requiring immediate inspection and potential replacement.
                </div>
              </div>
              
              {compareFile && fileDataCache.has(compareFile.name) && (
                <div style={{ 
                  fontSize: "14px",
                  backgroundColor: "#374151",
                  padding: "15px",
                  borderRadius: "6px",
                  border: "1px solid #4B5563"
                }}>
                  <div style={{ 
                    marginBottom: "12px",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#F9FAFB"
                  }}>
                    Measurement Statistics:
                  </div>
                  <div style={{ marginBottom: "8px", color: "#D1D5DB" }}>
                    <strong style={{ color: "#F9FAFB" }}>Min Thickness:</strong> {fileDataCache.get(compareFile.name).minThickness?.toFixed(2) || 'N/A'} mm
                  </div>
                  <div style={{ marginBottom: "8px", color: "#D1D5DB" }}>
                    <strong style={{ color: "#F9FAFB" }}>Max Thickness:</strong> {fileDataCache.get(compareFile.name).maxThickness?.toFixed(2) || 'N/A'} mm
                  </div>
                  <div style={{ marginBottom: "8px", color: "#D1D5DB" }}>
                    <strong style={{ color: "#F9FAFB" }}>Data Points:</strong> {fileDataCache.get(compareFile.name).points?.length?.toLocaleString() || 0}
                  </div>
                  <div style={{ color: "#D1D5DB" }}>
                    <strong style={{ color: "#F9FAFB" }}>Thickness Range:</strong> {((fileDataCache.get(compareFile.name).maxThickness || 0) - (fileDataCache.get(compareFile.name).minThickness || 0)).toFixed(2)} mm
                  </div>
                </div>
              )}

              <div style={{ 
                marginTop: "20px",
                fontSize: "12px",
                color: "#9CA3AF",
                textAlign: "center",
                fontStyle: "italic"
              }}>
                Use mouse to rotate • Scroll to zoom
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selection screen remains the same
  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      padding: "0",
      backgroundColor: "#111827",
      color: "#E5E7EB"
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#1F2937",
        padding: "20px",
        borderBottom: "1px solid #374151"
      }}>
        <h2 style={{ 
          margin: 0, 
          textAlign: "center",
          color: "#F9FAFB",
          fontSize: "24px",
          fontWeight: "700"
        }}>
          Dual Furnace Comparison Setup
        </h2>
      </div>
      
      {/* No furnace selected warning */}
      {!selectedFurnace && (
        <div style={{ 
          position: "absolute", 
          top: "50%", 
          left: "50%", 
          transform: "translate(-50%, -50%)", 
          color: "white",
          fontSize: "18px",
          textAlign: "center"
        }}>
          Please select a furnace
        </div>
      )}
      
      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px"
      }}>
        <div style={{ 
          maxWidth: "600px", 
          width: "100%",
          backgroundColor: "#1F2937",
          padding: "40px",
          borderRadius: "12px",
          border: "1px solid #374151",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)"
        }}>
          <p style={{ 
            marginBottom: "30px", 
            textAlign: "center", 
            color: "#9CA3AF",
            fontSize: "16px",
            lineHeight: "1.5"
          }}>
            Select two castings for dual-view comparison. The template will be displayed in neutral colors, 
            while the comparison will highlight critical wear areas in bright red for immediate identification.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "10px", 
                fontWeight: "600",
                color: "#F9FAFB",
                fontSize: "15px"
              }}>
                Reference Template:
              </label>
              <select
                value={referenceFile?.name || ""}
                onChange={(e) => setReferenceFile(files.find((f) => f.name === e.target.value) || null)}
                disabled={isUiDisabled}
                style={{ 
                  width: "100%",
                  padding: "12px 15px",
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  backgroundColor: "#111827",
                  color: "#F9FAFB",
                  fontSize: "15px",
                  cursor: isUiDisabled ? "not-allowed" : "pointer",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3B82F6"}
                onBlur={(e) => e.target.style.borderColor = "#374151"}
              >
                <option value="" style={{ backgroundColor: "#111827", color: "#9CA3AF" }}>
                  Select Reference Template
                </option>
                {files.map((file) => (
                  <option key={file.name} value={file.name} style={{ backgroundColor: "#111827", color: "#F9FAFB" }}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ 
                display: "block", 
                marginBottom: "10px", 
                fontWeight: "600",
                color: "#F9FAFB",
                fontSize: "15px"
              }}>
                Comparison Casting:
              </label>
              <select
                value={compareFile?.name || ""}
                onChange={(e) => setCompareFile(files.find((f) => f.name === e.target.value) || null)}
                disabled={isUiDisabled}
                style={{ 
                  width: "100%",
                  padding: "12px 15px",
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  backgroundColor: "#111827",
                  color: "#F9FAFB",
                  fontSize: "15px",
                  cursor: isUiDisabled ? "not-allowed" : "pointer",
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
                onFocus={(e) => e.target.style.borderColor = "#3B82F6"}
                onBlur={(e) => e.target.style.borderColor = "#374151"}
              >
                <option value="" style={{ backgroundColor: "#111827", color: "#9CA3AF" }}>
                  Select Comparison Casting
                </option>
                {files.map((file) => (
                  <option key={file.name} value={file.name} style={{ backgroundColor: "#111827", color: "#F9FAFB" }}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAccept}
              disabled={!referenceFile || !compareFile || isUiDisabled}
              style={{
                backgroundColor: (!referenceFile || !compareFile || isUiDisabled) ? "#374151" : "#3B82F6",
                color: (!referenceFile || !compareFile || isUiDisabled) ? "#9CA3AF" : "#F9FAFB",
                border: "none",
                borderRadius: "8px",
                padding: "15px 30px",
                cursor: (!referenceFile || !compareFile || isUiDisabled) ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: "600",
                marginTop: "15px",
                transition: "all 0.2s"
              }}
            >
              Start Dual Comparison
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonScreen;