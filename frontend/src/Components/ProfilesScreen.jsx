// import React, { useState, useRef, useEffect, useMemo } from "react";
// import * as THREE from "three";

// // Color utility function for thickness visualization
// const getColorForThickness = (thickness, minThickness, maxThickness, useCustomRange = false, customRange = {}) => {
//   const min = useCustomRange ? (customRange.min || 0) : minThickness;
//   const max = useCustomRange ? (customRange.max || 10) : maxThickness;
  
//   if (max <= min) return { r: 0, g: 1, b: 0 }; // Default green
  
//   const normalized = Math.max(0, Math.min(1, (thickness - min) / (max - min)));
  
//   // Color gradient: Blue (low) -> Green (medium) -> Yellow -> Red (high)
//   if (normalized < 0.25) {
//     // Blue to Cyan
//     const t = normalized * 4;
//     return { r: 0, g: t, b: 1 };
//   } else if (normalized < 0.5) {
//     // Cyan to Green
//     const t = (normalized - 0.25) * 4;
//     return { r: 0, g: 1, b: 1 - t };
//   } else if (normalized < 0.75) {
//     // Green to Yellow
//     const t = (normalized - 0.5) * 4;
//     return { r: t, g: 1, b: 0 };
//   } else {
//     // Yellow to Red
//     const t = (normalized - 0.75) * 4;
//     return { r: 1, g: 1 - t, b: 0 };
//   }
// };

// const ProfilesScreen = ({ files, fileDataCache, selectedFile, isUiDisabled }) => {
//   const [horizontalSlice, setHorizontalSlice] = useState(0);
//   const [verticalSlice, setVerticalSlice] = useState(0);
//   const [draggingLine, setDraggingLine] = useState(null);
//   const [availableFurnaces, setAvailableFurnaces] = useState([]);
//   const [selectedFurnace, setSelectedFurnace] = useState(null);

//   const canvasRef = useRef(null);
//   const xSliceCanvasRef = useRef(null);
//   const ySliceCanvasRef = useRef(null);
//   const sceneRef = useRef(new THREE.Scene());
//   const rendererRef = useRef(null);
//   const cameraRef = useRef(null);
//   const animationIdRef = useRef(null);

//   // Process furnace points with better performance
//   const furnacePoints = useMemo(() => {
//     if (!selectedFile || !fileDataCache.has(selectedFile.name) || !selectedFurnace) {
//       return [];
//     }

//     const fileData = fileDataCache.get(selectedFile.name);
//     const points = fileData?.points || fileData?.data || [];
    
//     if (!points || points.length === 0) return [];

//     // Filter points for selected furnace
//     const filtered = points.filter(point => {
//       const pointFurnaceId = point.furnaceId || point.furnace_id || point.id || 'default';
//       return selectedFurnace && pointFurnaceId === selectedFurnace.furnace_id;
//     });

//     console.log("[ProfilesScreen] Filtered points for furnace:", filtered.length);
//     return filtered;
//   }, [selectedFile, fileDataCache, selectedFurnace]);

//   // Calculate data bounds efficiently
//   const dataBounds = useMemo(() => {
//     if (furnacePoints.length === 0) {
//       return { minX: -50, maxX: 50, minZ: -50, maxZ: 50, minY: 0, maxY: 10 };
//     }

//     let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
//     let minY = Infinity, maxY = -Infinity;

//     // Sample points for bounds calculation if dataset is very large
//     const sampleSize = Math.min(5000, furnacePoints.length);
//     const step = Math.ceil(furnacePoints.length / sampleSize);
    
//     for (let i = 0; i < furnacePoints.length; i += step) {
//       const point = furnacePoints[i];
//       const x = point.position?.[0] || point.x || 0;
//       const z = point.position?.[2] || point.z || 0;
//       const thickness = point.thickness || point.y || 0;
      
//       minX = Math.min(minX, x);
//       maxX = Math.max(maxX, x);
//       minZ = Math.min(minZ, z);
//       maxZ = Math.max(maxZ, z);
//       minY = Math.min(minY, thickness);
//       maxY = Math.max(maxY, thickness);
//     }

//     return { minX, maxX, minZ, maxZ, minY, maxY };
//   }, [furnacePoints]);

//   // Initialize slice positions to center of data
//   useEffect(() => {
//     setHorizontalSlice((dataBounds.minZ + dataBounds.maxZ) / 2);
//     setVerticalSlice((dataBounds.minX + dataBounds.maxX) / 2);
//   }, [dataBounds]);

//   // Extract available furnaces
//   useEffect(() => {
//     if (selectedFile && fileDataCache.has(selectedFile.name)) {
//       const fileData = fileDataCache.get(selectedFile.name);
//       const points = fileData?.points || fileData?.data || [];
      
//       if (points && points.length > 0) {
//         // Sample points to find furnace IDs efficiently
//         const sampleSize = Math.min(1000, points.length);
//         const step = Math.ceil(points.length / sampleSize);
//         const samplePoints = [];
        
//         for (let i = 0; i < points.length; i += step) {
//           samplePoints.push(points[i]);
//         }
        
//         const furnaceIds = [...new Set(samplePoints.map(p => {
//           return p.furnaceId || p.furnace_id || p.id || 'default';
//         }).filter(id => id != null))];
        
//         const furnaces = furnaceIds.map(id => ({ 
//           furnace_id: id, 
//           name: `Furnace ${id}` 
//         }));
        
//         setAvailableFurnaces(furnaces);
        
//         if (!selectedFurnace && furnaces.length > 0) {
//           setSelectedFurnace(furnaces[0]);
//         }
//       }
//     }
//   }, [selectedFile, fileDataCache, selectedFurnace]);

//   // Initialize Three.js scene
//   useEffect(() => {
//     if (!canvasRef.current) return;
    
//     const canvas = canvasRef.current;
//     const scene = sceneRef.current;
//     scene.clear();
//     scene.background = new THREE.Color(0x000000);

//     const rect = canvas.getBoundingClientRect();
//     const width = rect.width || 400;
//     const height = rect.height || 400;

//     const aspect = width / height;
//     const dataWidth = Math.abs(dataBounds.maxX - dataBounds.minX) || 100;
//     const dataHeight = Math.abs(dataBounds.maxZ - dataBounds.minZ) || 100;
//     const frustumSize = Math.max(dataWidth, dataHeight) * 1.2;
    
//     const camera = new THREE.OrthographicCamera(
//       (frustumSize * aspect) / -2,
//       (frustumSize * aspect) / 2,
//       frustumSize / 2,
//       frustumSize / -2,
//       0.1,
//       1000
//     );
    
//     camera.position.set(0, 100, 0);
//     camera.lookAt(0, 0, 0);
//     camera.up.set(0, 0, -1);
//     cameraRef.current = camera;

//     const renderer = new THREE.WebGLRenderer({ 
//       canvas, 
//       antialias: true,
//       alpha: true
//     });
//     renderer.setSize(width, height);
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//     renderer.setClearColor(0x000000, 1);
//     rendererRef.current = renderer;

//     // Lighting
//     const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
//     scene.add(ambientLight);

//     const animate = () => {
//       animationIdRef.current = requestAnimationFrame(animate);
//       if (renderer && camera) {
//         renderer.render(scene, camera);
//       }
//     };
//     animate();

//     const handleResize = () => {
//       const newRect = canvas.getBoundingClientRect();
//       const newWidth = newRect.width || 400;
//       const newHeight = newRect.height || 400;
      
//       const newAspect = newWidth / newHeight;
//       camera.left = (frustumSize * newAspect) / -2;
//       camera.right = (frustumSize * newAspect) / 2;
//       camera.top = frustumSize / 2;
//       camera.bottom = frustumSize / -2;
//       camera.updateProjectionMatrix();
      
//       renderer.setSize(newWidth, newHeight);
//     };

//     window.addEventListener('resize', handleResize);

//     return () => {
//       if (animationIdRef.current) {
//         cancelAnimationFrame(animationIdRef.current);
//       }
//       window.removeEventListener('resize', handleResize);
//       if (renderer) renderer.dispose();
//     };
//   }, [dataBounds]);

//   // Update 3D scene with points and slice lines
//   useEffect(() => {
//     if (furnacePoints.length === 0) return;

//     const scene = sceneRef.current;
    
//     // Clear existing objects
//     const objectsToRemove = [];
//     scene.traverse((child) => {
//       if (child.userData.isDataPoint || child.userData.isSliceLine) {
//         objectsToRemove.push(child);
//       }
//     });
    
//     objectsToRemove.forEach(obj => {
//       scene.remove(obj);
//       if (obj.geometry) obj.geometry.dispose();
//       if (obj.material) obj.material.dispose();
//     });

//     // Sample points for visualization
//     const maxDisplayPoints = 20000;
//     const step = Math.max(1, Math.ceil(furnacePoints.length / maxDisplayPoints));
//     const positions = [];
//     const colors = [];

//     for (let i = 0; i < furnacePoints.length; i += step) {
//       const point = furnacePoints[i];
//       const x = point.position?.[0] || point.x || 0;
//       const z = point.position?.[2] || point.z || 0;
//       const thickness = point.thickness || point.y || 0;
      
//       positions.push(x, 0.1, z);
      
//       const color = getColorForThickness(thickness, dataBounds.minY, dataBounds.maxY);
//       colors.push(color.r, color.g, color.b);
//     }

//     if (positions.length > 0) {
//       const geometry = new THREE.BufferGeometry();
//       geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
//       geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      
//       const material = new THREE.PointsMaterial({ 
//         size: 1.5,
//         vertexColors: true,
//         sizeAttenuation: false
//       });
      
//       const pointsMesh = new THREE.Points(geometry, material);
//       pointsMesh.userData.isDataPoint = true;
//       scene.add(pointsMesh);
//     }

//     // Create slice lines - BLACK as initial lines
//     const blackLineMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 3 });
    
//     const padding = Math.max(dataBounds.maxX - dataBounds.minX, dataBounds.maxZ - dataBounds.minZ) * 0.1;
    
//     // Horizontal slice line (moving in Z direction)
//     const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
//       new THREE.Vector3(dataBounds.minX - padding, 0.5, horizontalSlice),
//       new THREE.Vector3(dataBounds.maxX + padding, 0.5, horizontalSlice),
//     ]);
//     const hLine = new THREE.Line(hLineGeometry, blackLineMaterial);
//     hLine.userData.isSliceLine = true;
//     scene.add(hLine);
    
//     // Vertical slice line (moving in X direction)
//     const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
//       new THREE.Vector3(verticalSlice, 0.5, dataBounds.minZ - padding),
//       new THREE.Vector3(verticalSlice, 0.5, dataBounds.maxZ + padding),
//     ]);
//     const vLine = new THREE.Line(vLineGeometry, blackLineMaterial);
//     vLine.userData.isSliceLine = true;
//     scene.add(vLine);

//   }, [furnacePoints, horizontalSlice, verticalSlice, dataBounds]);

//   // Get slice data efficiently
//   const getSliceData = (isHorizontal, slicePosition, tolerance = 2.0) => {
//     if (furnacePoints.length === 0) return [];

//     const matching = [];
//     const maxSlicePoints = 2000;
    
//     for (const point of furnacePoints) {
//       const x = point.position?.[0] || point.x || 0;
//       const z = point.position?.[2] || point.z || 0;
//       const thickness = point.thickness || point.y || 0;
      
//       const distanceFromSlice = isHorizontal ? 
//         Math.abs(z - slicePosition) : 
//         Math.abs(x - slicePosition);
      
//       if (distanceFromSlice < tolerance) {
//         matching.push({ 
//           x: isHorizontal ? x : z, 
//           y: thickness,
//           thickness: thickness
//         });
        
//         if (matching.length >= maxSlicePoints) break;
//       }
//     }

//     return matching.sort((a, b) => a.x - b.x);
//   };

//   // Draw slice profile with multi-color gradient
//   const drawSliceProfile = (canvas, isHorizontal) => {
//     if (!canvas) return;
    
//     const rect = canvas.getBoundingClientRect();
//     canvas.width = rect.width;
//     canvas.height = rect.height;
    
//     const ctx = canvas.getContext("2d");
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
    
//     // White background
//     ctx.fillStyle = '#ffffff';
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     const slicePosition = isHorizontal ? horizontalSlice : verticalSlice;
//     const matching = getSliceData(isHorizontal, slicePosition);

//     if (matching.length === 0) {
//       // Draw "No data" message
//       ctx.fillStyle = '#999';
//       ctx.font = '14px Arial';
//       ctx.textAlign = 'center';
//       ctx.fillText('No data at this slice position', canvas.width / 2, canvas.height / 2);
//       return;
//     }

//     // Get bounds for scaling
//     const xMin = Math.min(...matching.map(p => p.x));
//     const xMax = Math.max(...matching.map(p => p.x));
//     const yMin = 0;
//     const yMax = Math.max(...matching.map(p => p.y));
    
//     const margin = 40;
//     const plotWidth = canvas.width - 2 * margin;
//     const plotHeight = canvas.height - 2 * margin;

//     // Draw grid
//     ctx.strokeStyle = '#e0e0e0';
//     ctx.lineWidth = 1;
    
//     // Vertical grid lines
//     for (let i = 0; i <= 10; i++) {
//       const x = margin + (i / 10) * plotWidth;
//       ctx.beginPath();
//       ctx.moveTo(x, margin);
//       ctx.lineTo(x, canvas.height - margin);
//       ctx.stroke();
//     }
    
//     // Horizontal grid lines
//     for (let i = 0; i <= 10; i++) {
//       const y = margin + (i / 10) * plotHeight;
//       ctx.beginPath();
//       ctx.moveTo(margin, y);
//       ctx.lineTo(canvas.width - margin, y);
//       ctx.stroke();
//     }

//     // Draw baseline (black line at y=0)
//     const baselineY = canvas.height - margin;
//     ctx.strokeStyle = '#000000';
//     ctx.lineWidth = 2;
//     ctx.beginPath();
//     ctx.moveTo(margin, baselineY);
//     ctx.lineTo(canvas.width - margin, baselineY);
//     ctx.stroke();

//     // Draw wear profile with multi-color gradient
//     if (matching.length > 1) {
//       ctx.lineWidth = 3;
      
//       for (let i = 0; i < matching.length - 1; i++) {
//         const point1 = matching[i];
//         const point2 = matching[i + 1];
        
//         const px1 = margin + ((point1.x - xMin) / (xMax - xMin || 1)) * plotWidth;
//         const py1 = canvas.height - margin - ((point1.y - yMin) / (yMax - yMin || 1)) * plotHeight;
//         const px2 = margin + ((point2.x - xMin) / (xMax - xMin || 1)) * plotWidth;
//         const py2 = canvas.height - margin - ((point2.y - yMin) / (yMax - yMin || 1)) * plotHeight;
        
//         // Color based on thickness
//         const avgThickness = (point1.thickness + point2.thickness) / 2;
//         const color = getColorForThickness(avgThickness, dataBounds.minY, dataBounds.maxY);
//         const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
        
//         ctx.strokeStyle = hexColor;
//         ctx.beginPath();
//         ctx.moveTo(px1, py1);
//         ctx.lineTo(px2, py2);
//         ctx.stroke();
//       }
//     }

//     // Draw points with color mapping
//     matching.forEach(point => {
//       const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
//       const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
      
//       const color = getColorForThickness(point.thickness, dataBounds.minY, dataBounds.maxY);
//       const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      
//       ctx.fillStyle = hexColor;
//       ctx.beginPath();
//       ctx.arc(px, py, 2, 0, 2 * Math.PI);
//       ctx.fill();
//     });

//     // Draw axes labels
//     ctx.fillStyle = '#000000';
//     ctx.font = '12px Arial';
//     ctx.textAlign = 'left';
//     ctx.fillText(xMin.toFixed(1), margin, canvas.height - 5);
//     ctx.textAlign = 'right';
//     ctx.fillText(xMax.toFixed(1), canvas.width - margin, canvas.height - 5);
//     ctx.textAlign = 'left';
//     ctx.fillText(`${yMax.toFixed(1)}`, 5, margin + 5);
//     ctx.fillText('0', 5, canvas.height - margin + 5);
    
//     // Axis titles
//     ctx.textAlign = 'center';
//     ctx.font = 'bold 12px Arial';
//     ctx.fillText(isHorizontal ? 'X Position' : 'Z Position', canvas.width / 2, canvas.height - 5);
    
//     ctx.save();
//     ctx.translate(15, canvas.height / 2);
//     ctx.rotate(-Math.PI / 2);
//     ctx.fillText('Thickness', 0, 0);
//     ctx.restore();
//   };

//   // Update slice profiles
//   useEffect(() => {
//     drawSliceProfile(xSliceCanvasRef.current, true);
//   }, [horizontalSlice, furnacePoints, dataBounds]);

//   useEffect(() => {
//     drawSliceProfile(ySliceCanvasRef.current, false);
//   }, [verticalSlice, furnacePoints, dataBounds]);

//   // Mouse interaction handlers
//   const handleMouseDown = (e) => {
//     if (isUiDisabled || !canvasRef.current) return;
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const camera = cameraRef.current;
//     if (!camera) return;
    
//     const frustumSize = Math.max(
//       Math.abs(dataBounds.maxX - dataBounds.minX),
//       Math.abs(dataBounds.maxZ - dataBounds.minZ)
//     ) * 1.2;
    
//     const x = ((e.clientX - rect.left) / rect.width - 0.5) * frustumSize;
//     const z = ((e.clientY - rect.top) / rect.height - 0.5) * frustumSize;

//     const tolerance = frustumSize * 0.02; // 2% of frustum size
//     const nearVertical = Math.abs(x - verticalSlice) < tolerance;
//     const nearHorizontal = Math.abs(z - horizontalSlice) < tolerance;

//     if (nearVertical) {
//       setDraggingLine("vertical");
//       canvasRef.current.style.cursor = 'ew-resize';
//     } else if (nearHorizontal) {
//       setDraggingLine("horizontal");
//       canvasRef.current.style.cursor = 'ns-resize';
//     }
//   };

//   const handleMouseMove = (e) => {
//     if (!canvasRef.current) return;
    
//     const rect = canvasRef.current.getBoundingClientRect();
//     const frustumSize = Math.max(
//       Math.abs(dataBounds.maxX - dataBounds.minX),
//       Math.abs(dataBounds.maxZ - dataBounds.minZ)
//     ) * 1.2;
    
//     const x = ((e.clientX - rect.left) / rect.width - 0.5) * frustumSize;
//     const z = ((e.clientY - rect.top) / rect.height - 0.5) * frustumSize;
    
//     if (!draggingLine && !isUiDisabled) {
//       const tolerance = frustumSize * 0.02;
//       const nearVertical = Math.abs(x - verticalSlice) < tolerance;
//       const nearHorizontal = Math.abs(z - horizontalSlice) < tolerance;

//       canvasRef.current.style.cursor = nearVertical ? 'ew-resize' : nearHorizontal ? 'ns-resize' : 'default';
//     }

//     if (!draggingLine || isUiDisabled) return;
    
//     const clampedX = Math.max(dataBounds.minX, Math.min(dataBounds.maxX, x));
//     const clampedZ = Math.max(dataBounds.minZ, Math.min(dataBounds.maxZ, z));

//     if (draggingLine === "horizontal") {
//       setHorizontalSlice(clampedZ);
//     } else if (draggingLine === "vertical") {
//       setVerticalSlice(clampedX);
//     }
//   };

//   const handleMouseUp = () => {
//     setDraggingLine(null);
//     if (canvasRef.current) {
//       canvasRef.current.style.cursor = 'default';
//     }
//   };

//   const handleMouseLeave = () => {
//     setDraggingLine(null);
//     if (canvasRef.current) {
//       canvasRef.current.style.cursor = 'default';
//     }
//   };


import React, { useState, useRef, useEffect, useMemo } from "react";
import * as THREE from "three";

// Color utility function for thickness visualization
const getColorForThickness = (thickness, minThickness, maxThickness, useCustomRange = false, customRange = {}) => {
  const min = useCustomRange ? (customRange.min || 0) : minThickness;
  const max = useCustomRange ? (customRange.max || 10) : maxThickness;
  
  if (max <= min) return { r: 0, g: 1, b: 0 }; // Default green
  
  const normalized = Math.max(0, Math.min(1, (thickness - min) / (max - min)));
  
  // Color gradient: Blue (low) -> Green (medium) -> Yellow -> Red (high)
  if (normalized < 0.25) {
    // Blue to Cyan
    const t = normalized * 4;
    return { r: 0, g: t, b: 1 };
  } else if (normalized < 0.5) {
    // Cyan to Green
    const t = (normalized - 0.25) * 4;
    return { r: 0, g: 1, b: 1 - t };
  } else if (normalized < 0.75) {
    // Green to Yellow
    const t = (normalized - 0.5) * 4;
    return { r: t, g: 1, b: 0 };
  } else {
    // Yellow to Red
    const t = (normalized - 0.75) * 4;
    return { r: 1, g: 1 - t, b: 0 };
  }
};

const ProfilesScreen = ({ files, fileDataCache, selectedFile, isUiDisabled }) => {
  const [horizontalSlice, setHorizontalSlice] = useState(0);
  const [verticalSlice, setVerticalSlice] = useState(0);
  const [draggingLine, setDraggingLine] = useState(null);
  const [availableFurnaces, setAvailableFurnaces] = useState([]);
  const [selectedFurnace, setSelectedFurnace] = useState(null);

  const canvasRef = useRef(null);
  const xSliceCanvasRef = useRef(null);
  const ySliceCanvasRef = useRef(null);
  const sceneRef = useRef(new THREE.Scene());
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationIdRef = useRef(null);

  // Get baseline/initial file (first file chronologically or by name)
  const baselineFile = useMemo(() => {
    if (!files || files.length === 0) return null;
    
    // Sort files by name or date to get the first/baseline file
    const sortedFiles = [...files].sort((a, b) => {
      // Try to sort by date if available, otherwise by name
      if (a.lastModified && b.lastModified) {
        return a.lastModified - b.lastModified;
      }
      return a.name.localeCompare(b.name);
    });
    
    return sortedFiles[0];
  }, [files]);

  // Get baseline points for comparison
  const baselinePoints = useMemo(() => {
    if (!baselineFile || !fileDataCache.has(baselineFile.name) || !selectedFurnace) {
      return [];
    }

    const fileData = fileDataCache.get(baselineFile.name);
    const points = fileData?.points || fileData?.data || [];
    
    if (!points || points.length === 0) return [];

    // Filter points for selected furnace
    const filtered = points.filter(point => {
      const pointFurnaceId = point.furnaceId || point.furnace_id || point.id || 'default';
      return selectedFurnace && pointFurnaceId === selectedFurnace.furnace_id;
    });

    return filtered;
  }, [baselineFile, fileDataCache, selectedFurnace]);

  // Process furnace points with better performance
  const furnacePoints = useMemo(() => {
    if (!selectedFile || !fileDataCache.has(selectedFile.name) || !selectedFurnace) {
      return [];
    }

    const fileData = fileDataCache.get(selectedFile.name);
    const points = fileData?.points || fileData?.data || [];
    
    if (!points || points.length === 0) return [];

    // Filter points for selected furnace
    const filtered = points.filter(point => {
      const pointFurnaceId = point.furnaceId || point.furnace_id || point.id || 'default';
      return selectedFurnace && pointFurnaceId === selectedFurnace.furnace_id;
    });

    console.log("[ProfilesScreen] Filtered points for furnace:", filtered.length);
    return filtered;
  }, [selectedFile, fileDataCache, selectedFurnace]);

  // Calculate data bounds efficiently (combined from both current and baseline)
  const dataBounds = useMemo(() => {
    const allPoints = [...furnacePoints, ...baselinePoints];
    
    if (allPoints.length === 0) {
      return { minX: -50, maxX: 50, minZ: -50, maxZ: 50, minY: 0, maxY: 10 };
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Sample points for bounds calculation if dataset is very large
    const sampleSize = Math.min(5000, allPoints.length);
    const step = Math.ceil(allPoints.length / sampleSize);
    
    for (let i = 0; i < allPoints.length; i += step) {
      const point = allPoints[i];
      const x = point.position?.[0] || point.x || 0;
      const z = point.position?.[2] || point.z || 0;
      const thickness = point.thickness || point.y || 0;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
      minY = Math.min(minY, thickness);
      maxY = Math.max(maxY, thickness);
    }

    return { minX, maxX, minZ, maxZ, minY, maxY };
  }, [furnacePoints, baselinePoints]);

  // Initialize slice positions to center of data
  useEffect(() => {
    setHorizontalSlice((dataBounds.minZ + dataBounds.maxZ) / 2);
    setVerticalSlice((dataBounds.minX + dataBounds.maxX) / 2);
  }, [dataBounds]);

  // Extract available furnaces
  useEffect(() => {
    if (selectedFile && fileDataCache.has(selectedFile.name)) {
      const fileData = fileDataCache.get(selectedFile.name);
      const points = fileData?.points || fileData?.data || [];
      
      if (points && points.length > 0) {
        // Sample points to find furnace IDs efficiently
        const sampleSize = Math.min(1000, points.length);
        const step = Math.ceil(points.length / sampleSize);
        const samplePoints = [];
        
        for (let i = 0; i < points.length; i += step) {
          samplePoints.push(points[i]);
        }
        
        const furnaceIds = [...new Set(samplePoints.map(p => {
          return p.furnaceId || p.furnace_id || p.id || 'default';
        }).filter(id => id != null))];
        
        const furnaces = furnaceIds.map(id => ({ 
          furnace_id: id, 
          name: `Furnace ${id}` 
        }));
        
        setAvailableFurnaces(furnaces);
        
        if (!selectedFurnace && furnaces.length > 0) {
          setSelectedFurnace(furnaces[0]);
        }
      }
    }
  }, [selectedFile, fileDataCache, selectedFurnace]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    scene.clear();
    scene.background = new THREE.Color(0x000000);

    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 400;

    const aspect = width / height;
    const dataWidth = Math.abs(dataBounds.maxX - dataBounds.minX) || 100;
    const dataHeight = Math.abs(dataBounds.maxZ - dataBounds.minZ) || 100;
    const frustumSize = Math.max(dataWidth, dataHeight) * 1.2;
    
    const camera = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      1000
    );
    
    camera.position.set(0, 100, 0);
    camera.lookAt(0, 0, 0);
    camera.up.set(0, 0, -1);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (renderer && camera) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect();
      const newWidth = newRect.width || 400;
      const newHeight = newRect.height || 400;
      
      const newAspect = newWidth / newHeight;
      camera.left = (frustumSize * newAspect) / -2;
      camera.right = (frustumSize * newAspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = frustumSize / -2;
      camera.updateProjectionMatrix();
      
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (renderer) renderer.dispose();
    };
  }, [dataBounds]);

  // Update 3D scene with points and slice lines
  useEffect(() => {
    if (furnacePoints.length === 0) return;

    const scene = sceneRef.current;
    
    // Clear existing objects
    const objectsToRemove = [];
    scene.traverse((child) => {
      if (child.userData.isDataPoint || child.userData.isSliceLine) {
        objectsToRemove.push(child);
      }
    });
    
    objectsToRemove.forEach(obj => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });

    // Sample points for visualization
    const maxDisplayPoints = 20000;
    const step = Math.max(1, Math.ceil(furnacePoints.length / maxDisplayPoints));
    const positions = [];
    const colors = [];

    for (let i = 0; i < furnacePoints.length; i += step) {
      const point = furnacePoints[i];
      const x = point.position?.[0] || point.x || 0;
      const z = point.position?.[2] || point.z || 0;
      const thickness = point.thickness || point.y || 0;
      
      positions.push(x, 0.1, z);
      
      const color = getColorForThickness(thickness, dataBounds.minY, dataBounds.maxY);
      colors.push(color.r, color.g, color.b);
    }

    if (positions.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({ 
        size: 1.5,
        vertexColors: true,
        sizeAttenuation: false
      });
      
      const pointsMesh = new THREE.Points(geometry, material);
      pointsMesh.userData.isDataPoint = true;
      scene.add(pointsMesh);
    }

    // Create slice lines - WHITE lines for better visibility
    const whiteLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
    
    const padding = Math.max(dataBounds.maxX - dataBounds.minX, dataBounds.maxZ - dataBounds.minZ) * 0.1;
    
    // Horizontal slice line (moving in Z direction)
    const hLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(dataBounds.minX - padding, 0.5, horizontalSlice),
      new THREE.Vector3(dataBounds.maxX + padding, 0.5, horizontalSlice),
    ]);
    const hLine = new THREE.Line(hLineGeometry, whiteLineMaterial);
    hLine.userData.isSliceLine = true;
    scene.add(hLine);
    
    // Vertical slice line (moving in X direction)
    const vLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(verticalSlice, 0.5, dataBounds.minZ - padding),
      new THREE.Vector3(verticalSlice, 0.5, dataBounds.maxZ + padding),
    ]);
    const vLine = new THREE.Line(vLineGeometry, whiteLineMaterial);
    vLine.userData.isSliceLine = true;
    scene.add(vLine);

  }, [furnacePoints, horizontalSlice, verticalSlice, dataBounds]);

  // Get slice data efficiently
  const getSliceData = (isHorizontal, slicePosition, tolerance = 2.0) => {
    if (furnacePoints.length === 0) return { current: [], baseline: [] };

    const currentMatching = [];
    const baselineMatching = [];
    const maxSlicePoints = 2000;
    
    // Get current data
    for (const point of furnacePoints) {
      const x = point.position?.[0] || point.x || 0;
      const z = point.position?.[2] || point.z || 0;
      const thickness = point.thickness || point.y || 0;
      
      const distanceFromSlice = isHorizontal ? 
        Math.abs(z - slicePosition) : 
        Math.abs(x - slicePosition);
      
      if (distanceFromSlice < tolerance) {
        currentMatching.push({ 
          x: isHorizontal ? x : z, 
          y: thickness,
          thickness: thickness
        });
        
        if (currentMatching.length >= maxSlicePoints) break;
      }
    }

    // Get baseline data
    for (const point of baselinePoints) {
      const x = point.position?.[0] || point.x || 0;
      const z = point.position?.[2] || point.z || 0;
      const thickness = point.thickness || point.y || 0;
      
      const distanceFromSlice = isHorizontal ? 
        Math.abs(z - slicePosition) : 
        Math.abs(x - slicePosition);
      
      if (distanceFromSlice < tolerance) {
        baselineMatching.push({ 
          x: isHorizontal ? x : z, 
          y: thickness,
          thickness: thickness
        });
        
        if (baselineMatching.length >= maxSlicePoints) break;
      }
    }

    return {
      current: currentMatching.sort((a, b) => a.x - b.x),
      baseline: baselineMatching.sort((a, b) => a.x - b.x)
    };
  };

  // Draw slice profile with multi-color gradient and baseline comparison
  const drawSliceProfile = (canvas, isHorizontal) => {
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const slicePosition = isHorizontal ? horizontalSlice : verticalSlice;
    const { current: currentData, baseline: baselineData } = getSliceData(isHorizontal, slicePosition);

    if (currentData.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#999';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data at this slice position', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Get bounds for scaling (include both current and baseline)
    const allData = [...currentData, ...baselineData];
    const xMin = Math.min(...allData.map(p => p.x));
    const xMax = Math.max(...allData.map(p => p.x));
    const yMin = 0;
    const yMax = Math.max(...allData.map(p => p.y));
    
    const margin = 40;
    const plotWidth = canvas.width - 2 * margin;
    const plotHeight = canvas.height - 2 * margin;

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = margin + (i / 10) * plotWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin);
      ctx.lineTo(x, canvas.height - margin);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = margin + (i / 10) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(canvas.width - margin, y);
      ctx.stroke();
    }

    // Draw baseline (black line at y=0)
    const baselineY = canvas.height - margin;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, baselineY);
    ctx.lineTo(canvas.width - margin, baselineY);
    ctx.stroke();

    // Draw baseline/initial profile (black line)
    if (baselineData.length > 1) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      baselineData.forEach((point, i) => {
        const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
        const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      });
      
      ctx.stroke();
    }

    // Draw current wear profile with multi-color gradient
    if (currentData.length > 1) {
      ctx.lineWidth = 3;
      
      for (let i = 0; i < currentData.length - 1; i++) {
        const point1 = currentData[i];
        const point2 = currentData[i + 1];
        
        const px1 = margin + ((point1.x - xMin) / (xMax - xMin || 1)) * plotWidth;
        const py1 = canvas.height - margin - ((point1.y - yMin) / (yMax - yMin || 1)) * plotHeight;
        const px2 = margin + ((point2.x - xMin) / (xMax - xMin || 1)) * plotWidth;
        const py2 = canvas.height - margin - ((point2.y - yMin) / (yMax - yMin || 1)) * plotHeight;
        
        // Color based on thickness
        const avgThickness = (point1.thickness + point2.thickness) / 2;
        const color = getColorForThickness(avgThickness, dataBounds.minY, dataBounds.maxY);
        const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
        
        ctx.strokeStyle = hexColor;
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();
      }
    }

    // Draw baseline points (black circles)
    baselineData.forEach(point => {
      const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
      const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw current points with color mapping
    currentData.forEach(point => {
      const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
      const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
      
      const color = getColorForThickness(point.thickness, dataBounds.minY, dataBounds.maxY);
      const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      
      ctx.fillStyle = hexColor;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw axes labels
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(xMin.toFixed(1), margin, canvas.height - 5);
    ctx.textAlign = 'right';
    ctx.fillText(xMax.toFixed(1), canvas.width - margin, canvas.height - 5);
    ctx.textAlign = 'left';
    ctx.fillText(`${yMax.toFixed(1)}`, 5, margin + 5);
    ctx.fillText('0', 5, canvas.height - margin + 5);
    
    // Axis titles
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(isHorizontal ? 'X Position' : 'Z Position', canvas.width / 2, canvas.height - 5);
    
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Thickness', 0, 0);
    ctx.restore();
  };

  // Update slice profiles
  useEffect(() => {
    drawSliceProfile(xSliceCanvasRef.current, true);
  }, [horizontalSlice, furnacePoints, baselinePoints, dataBounds]);

  useEffect(() => {
    drawSliceProfile(ySliceCanvasRef.current, false);
  }, [verticalSlice, furnacePoints, baselinePoints, dataBounds]);

  // Mouse interaction handlers
  const handleMouseDown = (e) => {
    if (isUiDisabled || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const camera = cameraRef.current;
    if (!camera) return;
    
    const frustumSize = Math.max(
      Math.abs(dataBounds.maxX - dataBounds.minX),
      Math.abs(dataBounds.maxZ - dataBounds.minZ)
    ) * 1.2;
    
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * frustumSize;
    const z = ((e.clientY - rect.top) / rect.height - 0.5) * frustumSize;

    const tolerance = frustumSize * 0.02; // 2% of frustum size
    const nearVertical = Math.abs(x - verticalSlice) < tolerance;
    const nearHorizontal = Math.abs(z - horizontalSlice) < tolerance;

    if (nearVertical) {
      setDraggingLine("vertical");
      canvasRef.current.style.cursor = 'ew-resize';
    } else if (nearHorizontal) {
      setDraggingLine("horizontal");
      canvasRef.current.style.cursor = 'ns-resize';
    }
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const frustumSize = Math.max(
      Math.abs(dataBounds.maxX - dataBounds.minX),
      Math.abs(dataBounds.maxZ - dataBounds.minZ)
    ) * 1.2;
    
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * frustumSize;
    const z = ((e.clientY - rect.top) / rect.height - 0.5) * frustumSize;
    
    if (!draggingLine && !isUiDisabled) {
      const tolerance = frustumSize * 0.02;
      const nearVertical = Math.abs(x - verticalSlice) < tolerance;
      const nearHorizontal = Math.abs(z - horizontalSlice) < tolerance;

      canvasRef.current.style.cursor = nearVertical ? 'ew-resize' : nearHorizontal ? 'ns-resize' : 'default';
    }

    if (!draggingLine || isUiDisabled) return;
    
    const clampedX = Math.max(dataBounds.minX, Math.min(dataBounds.maxX, x));
    const clampedZ = Math.max(dataBounds.minZ, Math.min(dataBounds.maxZ, z));

    if (draggingLine === "horizontal") {
      setHorizontalSlice(clampedZ);
    } else if (draggingLine === "vertical") {
      setVerticalSlice(clampedX);
    }
  };

  const handleMouseUp = () => {
    setDraggingLine(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleMouseLeave = () => {
    setDraggingLine(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      width: "100%", 
      flexDirection: "column",
      overflow: "hidden" 
    }}>
      {/* No data message */}
      {(!selectedFile || !fileDataCache.has(selectedFile?.name)) && (
        <div style={{ 
          flex: 1, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          color: "#666",
          fontSize: "16px"
        }}>
          No data available. Please select a file with LiDAR data.
        </div>
      )}
      
      {/* Furnace selector */}
      {selectedFile && fileDataCache.has(selectedFile.name) && availableFurnaces.length > 0 && (
        <div style={{ 
          padding: "10px", 
          borderBottom: "1px solid #ccc",
          backgroundColor: "#f5f5f5",
          flexShrink: 0
        }}>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>
            Select Furnace:
          </label>
          <select 
            value={selectedFurnace?.furnace_id || ''} 
            onChange={(e) => {
              const furnace = availableFurnaces.find(f => f.furnace_id === e.target.value);
              setSelectedFurnace(furnace);
            }}
            style={{
              padding: "5px 10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "white"
            }}
          >
            <option value="">Select a furnace...</option>
            {availableFurnaces.map(furnace => (
              <option key={furnace.furnace_id} value={furnace.furnace_id}>
                {furnace.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main content */}
      {selectedFile && fileDataCache.has(selectedFile.name) && selectedFurnace && (
        <div style={{ 
          display: "flex", 
          height: "100%", 
          flex: 1,
          overflow: "hidden"
        }}>
          {/* Main 3D view - Furnace seen from above */}
          <div style={{ 
            width: "50%", 
            position: "relative",
            border: "1px solid #ccc",
            overflow: "hidden"
          }}>
            <canvas
              ref={canvasRef}
              style={{ 
                width: "100%", 
                height: "100%",
                display: "block"
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
            
            {/* Orientation labels */}
            <div style={{ 
              position: "absolute", 
              top: 10, 
              left: 10, 
              color: "white",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              Z ↑ | X →
            </div>
            
            {/* Furnace info */}
            <div style={{ 
              position: "absolute", 
              top: 10, 
              right: 10, 
              color: "white",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px"
            }}>
              {selectedFurnace?.name || 'No Furnace Selected'}
              <br />
              <small>{furnacePoints.length} points</small>
            </div>

            {/* Slice position info */}
            <div style={{ 
              position: "absolute", 
              bottom: 10, 
              left: 10, 
              color: "white",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "11px"
            }}>
              Horizontal: {horizontalSlice.toFixed(1)}<br />
              Vertical: {verticalSlice.toFixed(1)}
            </div>
          </div>

{/* Profile views */}
          <div style={{ 
            width: "50%", 
            display: "flex", 
            flexDirection: "column",
            border: "1px solid #ccc",
            overflow: "hidden"
          }}>
            {/* Color Legend */}
            <div style={{
              height: "40px",
              background: "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
              position: "relative",
              borderBottom: "1px solid #ccc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px",
              fontSize: "12px",
              fontWeight: "bold"
            }}>
              <span>Low Wear: {dataBounds.minY.toFixed(1)}</span>
              <span style={{ color: "white", textShadow: "1px 1px 2px black" }}>
                Furnace Lining Thickness
              </span>
              <span>High Wear: {dataBounds.maxY.toFixed(1)}</span>
            </div>

            {/* Y Profile (Vertical Slice) */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <canvas 
                ref={ySliceCanvasRef} 
                style={{ 
                  width: "100%", 
                  height: "100%",
                  display: "block",
                  backgroundColor: "#ffffff"
                }} 
              />
              <div style={{
                position: "absolute",
                top: 10,
                left: 10,
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
                border: "1px solid #ccc"
              }}>
                Y Profile (Vertical Slice at X={verticalSlice.toFixed(1)})
              </div>
              
              {/* Legend for profile lines */}
              <div style={{
                position: "absolute",
                bottom: 50,
                right: 10,
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: "6px",
                borderRadius: "4px",
                fontSize: "11px",
                border: "1px solid #ccc"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}>
                  <div style={{ 
                    width: "20px", 
                    height: "2px", 
                    backgroundColor: "#000", 
                    marginRight: "5px" 
                  }}></div>
                  Initial Line
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ 
                    width: "20px", 
                    height: "2px", 
                    background: "linear-gradient(to right, #0000ff, #ff0000)", 
                    marginRight: "5px" 
                  }}></div>
                  Wear
                </div>
              </div>
            </div>
            
            {/* X Profile (Horizontal Slice) */}
            <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
              <canvas 
                ref={xSliceCanvasRef} 
                style={{ 
                  width: "100%", 
                  height: "100%",
                  display: "block",
                  backgroundColor: "#ffffff" 
                }} 
              />
              <div style={{
                position: "absolute",
                top: 10,
                left: 10,
                backgroundColor: "rgba(255,255,255,0.9)",  
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "bold",
                border: "1px solid #ccc"
              }}>
                X Profile (Horizontal Slice at Z={horizontalSlice.toFixed(1)})
              </div>

              {/* Legend for profile lines */}
              <div style={{
                position: "absolute",
                bottom: 50,
                right: 10,
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: "6px",
                borderRadius: "4px",
                fontSize: "11px",
                border: "1px solid #ccc"
              }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}>
                  <div style={{ 
                    width: "20px", 
                    height: "2px", 
                    backgroundColor: "#000", 
                    marginRight: "5px" 
                  }}></div>
                  Initial Line
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ 
                    width: "20px", 
                    height: "2px", 
                    background: "linear-gradient(to right, #0000ff, #ff0000)", 
                    marginRight: "5px" 
                  }}></div>
                  Wear
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilesScreen;