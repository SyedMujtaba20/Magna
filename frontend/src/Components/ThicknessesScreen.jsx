import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import * as THREE from "three";
import { Line } from "react-chartjs-2";
import { debounce } from "lodash";
import { X } from "lucide-react";
import { initializeScene, createGridOverlay, updateScene } from "./sceneUtils";
import {
  getThicknessDataAcrossFiles,
  runDataCoverageAnalysis,
} from "./chartUtils";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

// FurnaceGridCanvas Component
const FurnaceGridCanvas = ({ 
  selectedFile, 
  fileDataCache, 
  onCellClick,
  isUiDisabled 
}) => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const gridMeshRef = useRef(null);
  const textMeshesRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Movement controls state
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const cameraPositionRef = useRef({ x: 0, y: 0, zoom: 1 });
  const rotationRef = useRef(0);

  // Grid configuration - simplified for lines only
  const gridConfig = {
    profiles: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17'],
    zones: ['Initial bricks', 'Slag line', 'Slopes']
  };

  // Initialize the scene with movement controls
  const initializeScene = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(rect.width, rect.height);
    renderer.setClearColor(0x000000, 1); // Black background
    rendererRef.current = renderer;

    // Create camera with initial position
    const camera = new THREE.OrthographicCamera(
      -10, 10, 6, -6, 0.1, 1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Set up scene
    const scene = sceneRef.current;
    scene.clear();

    // Initialize camera position
    cameraPositionRef.current = { x: 0, y: 0, zoom: 1 };
    rotationRef.current = 0;

    setIsInitialized(true);
  }, []);

  // Create furnace visualization matching the reference image
  const createFurnaceLines = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    
    // Clear existing content
    if (gridMeshRef.current) {
      scene.remove(gridMeshRef.current);
      gridMeshRef.current.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    textMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    textMeshesRef.current = [];

    const linesGroup = new THREE.Group();
    const profileCount = gridConfig.profiles.length;
    const zoneCount = gridConfig.zones.length;
    
    const cellWidth = 18 / profileCount;
    const cellHeight = 10 / zoneCount;
    const startX = -9;
    const startY = 4;

    // Get thickness data from cache
    const getThicknessForCell = (zone, profile) => {
      if (!selectedFile || !fileDataCache.has(selectedFile.name)) {
        return Math.random() * 50 + 30;
      }
      
      const fileData = fileDataCache.get(selectedFile.name);
      const cells = fileData?.cells || [];
      
      const cell = cells.find(c => c.zone === zone && c.profile === profile);
      return cell ? (cell.averageThickness || cell.thickness || 0) : Math.random() * 50 + 30;
    };

    // Create furnace background shape with gradient colors
    const createFurnaceBackground = () => {
      // Create furnace silhouette matching the image
      const furnaceShape = new THREE.Shape();
      const centerX = (startX + startX + (profileCount * cellWidth)) / 2;
      const topY = startY;
      const bottomY = startY - (zoneCount * cellHeight);
      
      // Start from bottom left
      furnaceShape.moveTo(startX + 1, bottomY + 0.5);
      // Bottom curve (hearth)
      furnaceShape.quadraticCurveTo(centerX, bottomY - 0.5, startX + (profileCount * cellWidth) - 1, bottomY + 0.5);
      // Right side going up with bosh curve
      furnaceShape.quadraticCurveTo(startX + (profileCount * cellWidth) + 0.5, centerY, startX + (profileCount * cellWidth) - 0.5, topY - 1);
      // Top section
      furnaceShape.lineTo(startX + (profileCount * cellWidth) - 1, topY + 0.5);
      furnaceShape.quadraticCurveTo(centerX, topY + 1, startX + 1, topY + 0.5);
      // Left side going down
      furnaceShape.lineTo(startX + 0.5, topY - 1);
      furnaceShape.quadraticCurveTo(startX - 0.5, centerY, startX + 1, bottomY + 0.5);
      
      const furnaceGeometry = new THREE.ShapeGeometry(furnaceShape);
      
      // Create gradient material for furnace
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 512;
      
      const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, '#44ff44'); // Green center
      gradient.addColorStop(0.3, '#88ff44'); // Light green
      gradient.addColorStop(0.6, '#ffaa44'); // Orange
      gradient.addColorStop(1, '#ff4444'); // Red edges
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const texture = new THREE.CanvasTexture(canvas);
      const furnaceMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.8
      });
      
      const furnaceMesh = new THREE.Mesh(furnaceGeometry, furnaceMaterial);
      furnaceMesh.position.z = -0.01;
      return furnaceMesh;
    };

    // Add furnace background
    const centerY = startY - (zoneCount * cellHeight) / 2;
    linesGroup.add(createFurnaceBackground());

    // Create thickness text at intersections with enhanced styling
    gridConfig.zones.forEach((zone, zoneIndex) => {
      gridConfig.profiles.forEach((profile, profileIndex) => {
        const x = startX + (profileIndex * cellWidth) + (cellWidth / 2);
        const y = startY - (zoneIndex * cellHeight) - (cellHeight / 2);
        const thickness = getThicknessForCell(zone, profile);
        
        // Create thickness text with better styling
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 50;
        
        // Background with rounded corners
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.roundRect = function(x, y, w, h, r) {
          if (w < 2 * r) r = w / 2;
          if (h < 2 * r) r = h / 2;
          this.beginPath();
          this.moveTo(x+r, y);
          this.arcTo(x+w, y, x+w, y+h, r);
          this.arcTo(x+w, y+h, x, y+h, r);
          this.arcTo(x, y+h, x, y, r);
          this.arcTo(x, y, x+w, y, r);
          this.closePath();
          return this;
        };
        context.roundRect(5, 5, 90, 40, 8).fill();
        
        // Color based on thickness with better contrast
        let textColor = '#ffffff';
        if (thickness < 40) textColor = '#ff4444';
        else if (thickness < 60) textColor = '#ffaa44';
        else textColor = '#44ff44';
        
        // Add subtle glow effect
        context.shadowColor = textColor;
        context.shadowBlur = 3;
        context.fillStyle = textColor;
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(thickness.toFixed(1), canvas.width/2, canvas.height/2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMaterial = new THREE.MeshBasicMaterial({ 
          map: texture,
          transparent: true,
          alphaTest: 0.1
        });
        const textGeometry = new THREE.PlaneGeometry(cellWidth * 0.8, cellHeight * 0.4);
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.set(x, y, 0.02);
        textMesh.userData = {
          type: 'thickness',
          zone: zone,
          profile: profile,
          thickness: thickness,
          profileIndex,
          zoneIndex
        };
        
        linesGroup.add(textMesh);
        textMeshesRef.current.push(textMesh);
      });
    });

    // Create enhanced grid lines
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
    
    // Vertical lines (profiles) - more prominent
    for (let i = 0; i <= profileCount; i++) {
      const x = startX + (i * cellWidth);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, startY + 0.5, 0.01),
        new THREE.Vector3(x, startY - (zoneCount * cellHeight) - 0.5, 0.01)
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesGroup.add(line);
    }
    
    // Horizontal lines (zones) - more prominent
    for (let i = 0; i <= zoneCount; i++) {
      const y = startY - (i * cellHeight);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX - 0.5, y, 0.01),
        new THREE.Vector3(startX + (profileCount * cellWidth) + 0.5, y, 0.01)
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      linesGroup.add(line);
    }

    // Enhanced labeling system
    const createEnhancedLabel = (text, x, y, size = 14, bgColor = 'rgba(0, 0, 0, 0.9)', textColor = '#ffffff') => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 150;
      canvas.height = 40;
      
      // Enhanced background
      const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, bgColor);
      gradient.addColorStop(1, bgColor.replace('0.9', '0.7'));
      
      context.fillStyle = gradient;
      context.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x+r, y);
        this.arcTo(x+w, y, x+w, y+h, r);
        this.arcTo(x+w, y+h, x, y+h, r);
        this.arcTo(x, y+h, x, y, r);
        this.arcTo(x, y, x+w, y, r);
        this.closePath();
        return this;
      };
      context.roundRect(2, 2, canvas.width-4, canvas.height-4, 6).fill();
      
      // Border
      context.strokeStyle = textColor;
      context.lineWidth = 2;
      context.roundRect(2, 2, canvas.width-4, canvas.height-4, 6).stroke();
      
      // Text with shadow
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 2;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 1;
      context.fillStyle = textColor;
      context.font = `bold ${size}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width/2, canvas.height/2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
      });
      const geometry = new THREE.PlaneGeometry(2, 0.5);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0.03);
      return mesh;
    };

    // Profile labels (P1, P2, etc.) - top of furnace
    gridConfig.profiles.forEach((profile, index) => {
      const x = startX + (index * cellWidth) + (cellWidth / 2);
      const y = startY + 1.2;
      const label = createEnhancedLabel(profile, x, y, 12, 'rgba(0, 100, 200, 0.9)', '#ffffff');
      linesGroup.add(label);
    });

    // Zone labels on the right side
    const zoneLabels = ['Initial bricks', 'Slag line', 'Slopes'];
    zoneLabels.forEach((zone, index) => {
      const x = startX + (profileCount * cellWidth) + 2;
      const y = startY - (index * cellHeight) - (cellHeight / 2);
      const label = createEnhancedLabel(zone, x, y, 11, 'rgba(200, 100, 0, 0.9)', '#ffffff');
      linesGroup.add(label);
    });

    // Main title
    const titleLabel = createEnhancedLabel('BLAST FURNACE MONITORING', 0, startY + 2.5, 18, 'rgba(50, 50, 150, 0.95)', '#ffffff');
    titleLabel.scale.set(3, 1.2, 1);
    linesGroup.add(titleLabel);

    // Color legend at bottom
    const legendY = startY - (zoneCount * cellHeight) - 1.5;
    const legendLabels = [
      { text: '🟢 Good (>60cm)', x: startX + 1, color: 'rgba(0, 150, 0, 0.9)' },
      { text: '🟠 Warning (40-60cm)', x: startX + 4, color: 'rgba(200, 100, 0, 0.9)' },
      { text: '🔴 Critical (<40cm)', x: startX + 7, color: 'rgba(200, 0, 0, 0.9)' }
    ];

    legendLabels.forEach(legend => {
      const label = createEnhancedLabel(legend.text, legend.x, legendY, 10, legend.color, '#ffffff');
      linesGroup.add(label);
    });

    // Add measurement scale on the left
    const scaleLabel = createEnhancedLabel('cm', startX - 2.5, startY - (zoneCount * cellHeight) / 2, 12, 'rgba(100, 100, 100, 0.9)', '#ffffff');
    scaleLabel.rotation.z = Math.PI / 2;
    linesGroup.add(scaleLabel);

    scene.add(linesGroup);
    gridMeshRef.current = linesGroup;
    
    // Render the scene
    rendererRef.current.render(scene, cameraRef.current);
  }, [selectedFile, fileDataCache]);

  // Handle canvas clicks - simplified for thickness text only
  const handleCanvasClick = useCallback((event) => {
    if (isUiDisabled || !gridMeshRef.current || !cameraRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(gridMeshRef.current.children, true);
    const thicknessIntersect = intersects.find(intersect => 
      intersect.object.userData.type === 'thickness'
    );

    if (thicknessIntersect && onCellClick) {
      const cellData = thicknessIntersect.object.userData;
      onCellClick({
        ...cellData,
        type: 'cell',
        thicknessData: [{
          fileName: selectedFile?.name || 'Current',
          thickness: cellData.thickness,
          date: new Date(),
          color: '#3B82F6'
        }]
      });
    }
  }, [isUiDisabled, onCellClick, selectedFile]);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    rendererRef.current.setSize(rect.width, rect.height);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, []);

  // Initialize scene on mount
  useEffect(() => {
    initializeScene();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [initializeScene, handleResize]);

  // Update lines when data changes
  useEffect(() => {
    if (isInitialized) {
      createFurnaceLines();
    }
  }, [isInitialized, createFurnaceLines]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'pointer',
          display: 'block'
        }}
        onClick={handleCanvasClick}
      />
      {!isInitialized && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'white',
            fontSize: '16px',
            pointerEvents: 'none'
          }}
        >
          Initializing Grid View...
        </div>
      )}
    </div>
  );
};

const useChartCleanup = () => {
  const chartRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    i18n.changeLanguage(savedLang);
  }, []);

  const destroyChart = useCallback(() => {
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
        chartRef.current = null;
      } catch (error) {
        console.warn("Error destroying chart:", error);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      destroyChart();
    };
  }, [destroyChart]);

  return { chartRef, destroyChart };
};

const ThicknessDialog = ({ showDialog, dialogData, files, onClose }) => {
  const { chartRef, destroyChart } = useChartCleanup();
  const [chartKey, setChartKey] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (showDialog && dialogData) {
      destroyChart();
      setChartKey((prev) => prev + 1);
    }
  }, [showDialog, dialogData, destroyChart]);

  useEffect(() => {
    if (!showDialog) {
      destroyChart();
    }
  }, [showDialog, destroyChart]);

  const getDialogChartData = (data) => {
    if (!data || !data.thicknessData || data.thicknessData.length === 0) {
      console.log("[ThicknessDialog] No data for:", data);
      return {
        labels: ["No Data"],
        datasets: [
          {
            label: "No Data Available",
            data: [0],
            borderColor: "#ccc",
            backgroundColor: "rgba(204, 204, 204, 0.1)",
          },
        ],
      };
    }

    const sortedData = data.thicknessData.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    return {
      labels: sortedData.map((d) => d.fileName),
      datasets: [
        {
          label: `${
            data.type === "cell" ? "Cell" : "Point"
          } Thickness Across Files`,
          data: sortedData.map((d) => d.thickness),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          pointBackgroundColor: sortedData.map((d) => d.color),
          pointBorderColor: sortedData.map((d) => d.color),
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.1,
        },
      ],
    };
  };

  const chartOptionsForDialog = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: "black" },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `Thickness: ${context.parsed.y.toFixed(2)} cm`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        ticks: {
          color: "black",
          maxRotation: 45,
          minRotation: 45,
        },
        grid: { color: "rgba(0,0,0,0.1)" },
        title: {
          display: true,
          text: "Files",
          color: "black",
        },
      },
      y: {
        ticks: { color: "black" },
        grid: { color: "rgba(0,0,0,0.1)" },
        title: {
          display: true,
          text: "Thickness (cm)",
          color: "black",
        },
      },
    },
  };

  if (!showDialog || !dialogData) return null;

  if (!dialogData.thicknessData || dialogData.thicknessData.length === 0) {
    return (
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
          if (e.target === e.currentTarget) onClose();
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
            <h3 style={{ margin: 0, color: "#1a202c" }}>
              {dialogData.type === "cell"
                ? `Cell: ${dialogData.zone} - ${dialogData.profile}`
                : `Point #${dialogData.index}`}
            </h3>
            <button
              onClick={onClose}
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
              <X size={20} color="#666" />
            </button>
          </div>
          <div
            style={{ color: "#dc3545", textAlign: "center", padding: "20px" }}
          >
            {t("thickness.noData", {
              zone: dialogData.zone || "unknown",
              profile: dialogData.profile || "unknown",
              count: files.length,
            })}
            <br />
            {t("thickness.possibleCauses")}
          </div>
        </div>
      </div>
    );
  }

  return (
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
        if (e.target === e.currentTarget) onClose();
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
          <h3 style={{ margin: 0, color: "#1a202c" }}>
            {dialogData.type === "cell"
              ? `Cell: ${dialogData.zone} - ${dialogData.profile}`
              : `Point #${dialogData.index}`}
          </h3>
          <button
            onClick={onClose}
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
            <X size={20} color="#666" />
          </button>
        </div>

        <div style={{ height: "400px", marginBottom: "20px" }}>
          <Line
            key={`chart-${chartKey}`}
            ref={chartRef}
            data={getDialogChartData(dialogData)}
            options={chartOptionsForDialog}
            id={`chart-${chartKey}`}
          />
        </div>

        <div style={{ color: "#2d3748", fontSize: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <strong>Selected Item:</strong>
              <div>{dialogData.type === "cell" ? "Grid Cell" : "Point"}</div>
            </div>

            {dialogData.type === "point" && (
              <div>
                <strong>Position:</strong>
                <div>X: {dialogData.position[0]?.toFixed(3)}</div>
                <div>Y: {dialogData.position[1]?.toFixed(3)}</div>
                <div>Z: {dialogData.position[2]?.toFixed(3)}</div>
              </div>
            )}

            <div>
              <strong>{t("thickness.filesWithData")}:</strong>
              <div>
                {dialogData.thicknessData?.length || 0} of {files.length}
              </div>
            </div>

            {dialogData.thicknessData &&
              dialogData.thicknessData.length > 0 && (
                <div>
                  <strong>{t("thickness.range")}:</strong>
                  <div>
                    {Math.min(
                      ...dialogData.thicknessData.map((d) => d.thickness)
                    ).toFixed(2)}{" "}
                    -
                    {Math.max(
                      ...dialogData.thicknessData.map((d) => d.thickness)
                    ).toFixed(2)}{" "}
                    cm
                  </div>
                </div>
              )}
          </div>

          {dialogData.thicknessData && dialogData.thicknessData.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <strong>Thickness Data by File:</strong>
              <div
                style={{
                  marginTop: "8px",
                  maxHeight: "150px",
                  overflowY: "auto",
                }}
              >
                {dialogData.thicknessData.map((data, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 8px",
                      backgroundColor: index % 2 === 0 ? "#f7fafc" : "white",
                      borderRadius: "4px",
                      margin: "2px 0",
                    }}
                  >
                    <span style={{ color: data.color, fontWeight: "bold" }}>
                      {data.fileName}
                    </span>
                    <span>{data.thickness.toFixed(2)} cm</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
          <button
            onClick={onClose}
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
  );
};

const ThicknessesScreen = ({
  files,
  fileDataCache,
  selectedFile,
  selectedFurnace,
  isUiDisabled,
}) => {
  const [selectedBrick, setSelectedBrick] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState(null);
  const [viewMode, setViewMode] = useState("3d");
  const [selectedThumbnail, setSelectedThumbnail] = useState("first");

  const canvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const pointsMeshRef = useRef(null);
  const gridMeshRef = useRef(null);
  const markerMeshRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const controlsRef = useRef(null);
  const prevPointsLengthRef = useRef(0);
  const isRenderingRef = useRef(false);
  const firstThumbnailRef = useRef(null);
  const secondThumbnailRef = useRef(null);
  const { t } = useTranslation();

  raycasterRef.current.params.Points.threshold = 2;
  raycasterRef.current.params.Mesh = { threshold: 0.1 };

  const points = useMemo(() => {
    if (!selectedFile) {
      console.log("[points] No file selected.");
      return [];
    }
    if (!fileDataCache.has(selectedFile.name)) {
      console.log("[points] File data not found for:", selectedFile.name);
      return [];
    }
    const data = fileDataCache.get(selectedFile.name).points || [];
    console.log(
      "[points] Loaded",
      data.length,
      "points from",
      selectedFile.name
    );
    return data;
  }, [selectedFile?.name, fileDataCache]);

  useEffect(() => {
    if (files.length > 0 && fileDataCache.size > 0) {
      files.forEach((file) => {
        const fileData = fileDataCache.get(file.name);
        console.log(`[FileDataCache] ${file.name}:`, {
          cellCount: fileData?.cells?.length || 0,
          cells:
            fileData?.cells?.map((cell) => ({
              zone: cell.zone,
              profile: cell.profile,
              thickness: cell.averageThickness || cell.thickness,
              allProps: Object.keys(cell),
            })) || [],
          pointCount: fileData?.points?.length || 0,
        });
      });

      const coverage = runDataCoverageAnalysis(files, fileDataCache);
      console.log("[CoverageAnalysis] Zones:", coverage.zones);
      console.log("[CoverageAnalysis] Profiles:", coverage.profiles);
      console.log("[CoverageAnalysis] Combinations:", coverage.combinations);
      console.log("[CoverageAnalysis] Zone Coverage:", coverage.zoneCoverage);
      console.log(
        "[CoverageAnalysis] Profile Coverage:",
        coverage.profileCoverage
      );
      console.log(
        "[CoverageAnalysis] Low Coverage Combos:",
        coverage.lowCoverageCombos
      );
    }
  }, [files, fileDataCache]);

  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.traverse((child) => {
        if (child.userData.type === "cell") {
          console.log("[GridOverlay] Cell:", {
            zone: child.userData.zone,
            profile: child.userData.profile,
            position: child.position,
          });
        }
      });
    }
  }, [isInitialized]);

  useEffect(() => {
    if (viewMode === "3d") {
      const cleanup = initializeScene(
        canvasRef,
        sceneRef,
        rendererRef,
        cameraRef,
        controlsRef,
        gridMeshRef,
        setIsInitialized
      );
      return cleanup;
    }
  }, [viewMode]);

  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.visible = showGrid;
      console.log("[GridVisibility] Grid visible:", showGrid);
    }
  }, [showGrid]);

  useEffect(() => {
    console.log("[DEBUG] selectedBrick changed:", selectedBrick);
    console.log("[DEBUG] selectedCell changed:", selectedCell);
    setDebugInfo(
      `Brick: ${selectedBrick ? "Selected" : "None"}, Cell: ${
        selectedCell ? "Selected" : "None"
      }`
    );
  }, [selectedBrick, selectedCell]);

  useEffect(() => {
    if (viewMode === "2d-grid" && selectedCell && gridMeshRef.current) {
      gridMeshRef.current.traverse((child) => {
        if (child.userData.type === "cell" && child.material) {
          if (
            child.userData.zone === selectedCell.zone &&
            child.userData.profile === selectedCell.profile
          ) {
            child.material.opacity = 0.3;
            child.material.color.set(0x00ff88);
          } else {
            child.material.opacity = 0.2;
            child.material.color.set(0x333333);
          }
        }
      });
    }
  }, [selectedCell, viewMode]);

  const handleCanvasClick = useCallback(
    debounce((event) => {
      if (isUiDisabled || isRendering || viewMode !== "3d") {
        console.log("[CanvasClick] Blocked: UI disabled, rendering, or not in 3D mode");
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        console.log("[CanvasClick] No canvas reference");
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      console.log("[CanvasClick] Mouse coords:", mouse.x, mouse.y);

      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(mouse, cameraRef.current);

      if (gridMeshRef.current) {
        gridMeshRef.current.traverse((child) => {
          if (child.userData.type === "cell" && child.material) {
            child.material.opacity = 0.2;
            child.material.color.set(0x333333);
          }
        });
      }

      if (markerMeshRef.current) {
        sceneRef.current.remove(markerMeshRef.current);
        markerMeshRef.current.geometry.dispose();
        markerMeshRef.current.material.dispose();
        markerMeshRef.current = null;
      }

      if (gridMeshRef.current && showGrid) {
        const gridIntersects = raycaster.intersectObjects(
          gridMeshRef.current.children,
          true
        );
        console.log("[CanvasClick] Grid intersections:", gridIntersects.length);

        const cellIntersect = gridIntersects
          .filter((intersect) => intersect.object.userData.type === "cell")
          .sort((a, b) => a.distance - b.distance)[0];

        if (cellIntersect) {
          const cellData = cellIntersect.object.userData;
          console.log("[CanvasClick] Grid cell selected:", cellData);

          cellIntersect.object.material.opacity = 0.3;
          cellIntersect.object.material.color.set(0x00ff88);

          const thicknessDataAcrossFiles = getThicknessDataAcrossFiles(
            cellData,
            "cell",
            files,
            fileDataCache
          );

          const cellSelection = {
            ...cellData,
            type: "cell",
            thicknessData: thicknessDataAcrossFiles,
          };

          console.log("[CanvasClick] Setting selectedCell:", cellSelection);
          setSelectedCell(cellSelection);
          setSelectedBrick(null);

          setTimeout(() => {
            setDialogData(cellSelection);
            setShowDialog(true);
          }, 50);
          return;
        }
      }

      if (pointsMeshRef.current) {
        const intersects = raycaster.intersectObject(pointsMeshRef.current);
        console.log("[CanvasClick] Point intersections:", intersects.length);

        if (intersects.length > 0) {
          const selectedIndex = intersects[0].index;
          const validPoints = pointsMeshRef.current.userData.validPoints;
          const selectedData = validPoints[selectedIndex];

          if (selectedData) {
            console.log("[CanvasClick] Point selected:", selectedData);

            const markerGeometry = new THREE.SphereGeometry(1, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({
              color: 0xff0000,
            });
            const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
            const markerPos = {
              x: selectedData.position[0],
              y: selectedData.position[1],
              z: selectedData.position[2],
            };
            markerMesh.position.set(markerPos.x, markerPos.y, markerPos.z);
            console.log("[CanvasClick] Marker position:", markerPos);
            sceneRef.current.add(markerMesh);
            markerMeshRef.current = markerMesh;

            const thicknessDataAcrossFiles = getThicknessDataAcrossFiles(
              selectedData,
              "point",
              files,
              fileDataCache
            );

            const brickSelection = {
              ...selectedData,
              index: selectedIndex,
              type: "point",
              thickness: selectedData.thickness,
              thicknessData: thicknessDataAcrossFiles,
            };

            console.log("[CanvasClick] Setting selectedBrick:", brickSelection);
            setSelectedBrick(brickSelection);
            setSelectedCell(null);

            setTimeout(() => {
              setDialogData(brickSelection);
              setShowDialog(true);
            }, 50);
          }
        }
      }
    }, 200),
    [isUiDisabled, isRendering, showGrid, files, fileDataCache, viewMode]
  );

  const handle2DCellClick = useCallback((cellData) => {
    console.log("[2D Grid] Cell clicked:", cellData);
    setSelectedCell(cellData);
    setSelectedBrick(null);
    
    setTimeout(() => {
      setDialogData(cellData);
      setShowDialog(true);
    }, 50);
  }, []);

  const handleMouseMove = debounce(() => {
    console.log("[Canvas] Mouse move event");
  }, 100);

  useEffect(() => {
    if (!selectedFile || viewMode !== "3d") return;

    console.log(
      "[sceneEffect] File changed, updating scene for:",
      selectedFile?.name
    );

    const timeoutId = setTimeout(() => {
      updateScene(
        points,
        sceneRef,
        pointsMeshRef,
        isRenderingRef,
        setIsRendering,
        prevPointsLengthRef,
        gridMeshRef
      )();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedFile?.name, points, viewMode]);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setTimeout(() => {
      setDialogData(null);
    }, 100);
  }, []);

  const clearSelection = () => {
    console.log("[ClearSelection] Clearing selections");
    setSelectedCell(null);
    setSelectedBrick(null);
    setShowDialog(false);
    setDialogData(null);

    if (markerMeshRef.current) {
      sceneRef.current.remove(markerMeshRef.current);
      markerMeshRef.current.geometry.dispose();
      markerMeshRef.current.material.dispose();
      markerMeshRef.current = null;
    }

    if (gridMeshRef.current) {
      gridMeshRef.current.traverse((child) => {
        if (child.userData.type === "cell" && child.material) {
          child.material.opacity = 0.2;
          child.material.color.set(0x333333);
        }
      });
    }
  };

  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
    setViewMode(thumbnail === "first" ? "3d" : "2d-grid");
    clearSelection();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{ flex: 1, position: "relative" }}>
        {!isInitialized && viewMode === "3d" && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "black",
              zIndex: 1,
              textAlign: "center",
            }}
          >
            {t("common.initializing")}
          </div>
        )}
        {!selectedFile && isInitialized && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "black",
              zIndex: 1,
              textAlign: "center",
            }}
          >
            {t("thickness.selectFilePrompt")}
          </div>
        )}
        {isRendering && viewMode === "3d" && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              color: "black",
              backgroundColor: "rgba(255,255,255,0.7)",
              padding: "5px 10px",
              borderRadius: "4px",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            Loading {points.length} points...
          </div>
        )}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            color: "black",
            backgroundColor: "rgba(255,255,255,0.7)",
            padding: "10px",
            borderRadius: "5px",
            fontSize: "12px",
            zIndex: 5,
            pointerEvents: "all",
          }}
        >
          <div>{t("analysis.points", { count: points.length })}</div>
          <div>{t("analysis.files", { count: files.length })}</div>
          <div>🟢 {t("analysis.zones")}</div>
          <div>🔵 {t("analysis.profiles")}</div>
          <div>{t("analysis.instructions")}</div>
          <div>{t("view.controls1")}</div>
          <div style={{ marginTop: "5px", fontSize: "10px", color: "#666" }}>
            {t("analysis.debug", { value: debugInfo })}
          </div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            style={{
              marginTop: "5px",
              padding: "3px 8px",
              backgroundColor: showGrid ? "#333" : "#888",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
              marginRight: "5px",
            }}
            disabled={viewMode !== "3d"}
          >
            {showGrid ? "Hide Grid" : "Show Grid"}
          </button>
          {(selectedCell || selectedBrick) && (
            <button
              onClick={clearSelection}
              style={{
                padding: "3px 8px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              {t("common.clear")}
            </button>
          )}
          <div style={{ marginTop: "5px" }}>
            <button
              onClick={() => handleThumbnailSelect("first")}
              style={{
                padding: "3px 8px",
                backgroundColor: selectedThumbnail === "first" ? "#3182ce" : "#888",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
                marginRight: "5px",
              }}
            >
              3D Furnace
            </button>
            <button
              onClick={() => handleThumbnailSelect("second")}
              style={{
                padding: "3px 8px",
                backgroundColor: selectedThumbnail === "second" ? "#3182ce" : "#888",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Grid View
            </button>
          </div>
        </div>
        <div style={{ width: "100%", height: viewMode === "3d" ? "100%" : "60%", position: "relative" }}>
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              cursor: "crosshair",
              display: viewMode === "3d" && isInitialized ? "block" : "none",
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onWheel={(e) => console.log("[Canvas] Wheel event:", e.deltaY)}
          />
          {viewMode === "2d-grid" && (
            <FurnaceGridCanvas
              selectedFile={selectedFile}
              fileDataCache={fileDataCache}
              onCellClick={handle2DCellClick}
              isUiDisabled={isUiDisabled}
            />
          )}
        </div>
      </div>
      
      <div style={{ height: "150px", padding: "10px", overflowX: "auto", whiteSpace: "nowrap", backgroundColor: "#f0f0f0" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", height: "100%" }}>
          <div
            style={{
              border: selectedThumbnail === "first" ? "3px solid #3182ce" : "2px solid #ccc",
              borderRadius: "8px",
              padding: "12px",
              backgroundColor: "white",
              cursor: "pointer",
              minWidth: "140px",
              textAlign: "center",
              transition: "all 0.2s ease",
              boxShadow: selectedThumbnail === "first" ? "0 4px 12px rgba(49, 130, 206, 0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
            }}
            onClick={() => handleThumbnailSelect("first")}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#1a202c" }}>
              3D Furnace View
            </div>
            <div style={{ 
              width: "110px", 
              height: "70px", 
              backgroundColor: selectedThumbnail === "first" ? "#e6f3ff" : "#f8f9fa", 
              border: "1px solid #ddd",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "#666",
              margin: "0 auto",
            }}>
              🔮 3D Model
            </div>
            <div style={{ 
              fontSize: "10px", 
              color: selectedThumbnail === "first" ? "#3182ce" : "#888", 
              marginTop: "6px",
              fontWeight: selectedThumbnail === "first" ? "600" : "normal"
            }}>
              Interactive 3D visualization
            </div>
          </div>
          
          <div
            style={{
              border: selectedThumbnail === "second" ? "3px solid #3182ce" : "2px solid #ccc",
              borderRadius: "8px",
              padding: "12px",
              backgroundColor: "white",
              cursor: "pointer",
              minWidth: "140px",
              textAlign: "center",
              transition: "all 0.2s ease",
              boxShadow: selectedThumbnail === "second" ? "0 4px 12px rgba(49, 130, 206, 0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
            }}
            onClick={() => handleThumbnailSelect("second")}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", color: "#1a202c" }}>
              Grid View
            </div>
            <div style={{ 
              width: "110px", 
              height: "70px", 
              backgroundColor: selectedThumbnail === "second" ? "#e6f3ff" : "#f8f9fa", 
              border: "1px solid #ddd",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              color: "#666",
              margin: "0 auto",
            }}>
              📊 Grid Layout
            </div>
            <div style={{ 
              fontSize: "10px", 
              color: selectedThumbnail === "second" ? "#3182ce" : "#888", 
              marginTop: "6px",
              fontWeight: selectedThumbnail === "second" ? "600" : "normal"
            }}>
              2D grid analysis
            </div>
          </div>

          <div style={{ 
            padding: "12px", 
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            fontSize: "12px",
            color: "#4a5568",
            maxWidth: "200px",
          }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
              💡 Quick Tips:
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.4" }}>
              • Click points/cells for details<br/>
              • Use mouse to rotate/zoom in 3D<br/>
              • Toggle grid overlay as needed
            </div>
          </div>
        </div>
      </div>

      <ThicknessDialog
        showDialog={showDialog}
        dialogData={dialogData}
        files={files}
        onClose={closeDialog}
      />
    </div>
  );
};

export default React.memo(ThicknessesScreen);