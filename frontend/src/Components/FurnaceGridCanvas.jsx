import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

// Updated ThicknessesScreen component with integrated FurnaceGridCanvas
// const FurnaceGridCanvas = ({ 
//   selectedFile, 
//   fileDataCache, 
//   onCellClick,
//   isUiDisabled 
// }) => {
//   const canvasRef = useRef(null);
//   const sceneRef = useRef(new THREE.Scene());
//   const rendererRef = useRef(null);
//   const cameraRef = useRef(null);
//   const gridMeshRef = useRef(null);
//   const textMeshesRef = useRef([]);
//   const raycasterRef = useRef(new THREE.Raycaster());
//   const [isInitialized, setIsInitialized] = useState(false);

//   // Grid configuration based on your image
//   const gridConfig = {
//     profiles: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17'],
//     zones: ['Initial bricks', 'Slag line', 'Slopes'],
//     zoneColors: {
//       'Initial bricks': 0x4ade80, // Green
//       'Slag line': 0xfbbf24,     // Yellow/Orange
//       'Slopes': 0x10b981        // Darker green
//     }
//   };

//   // Initialize the scene
//   const initializeScene = useCallback(() => {
//     if (!canvasRef.current) return;

//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
    
//     // Create renderer
//     const renderer = new THREE.WebGLRenderer({ 
//       canvas, 
//       antialias: true,
//       alpha: true 
//     });
//     renderer.setSize(rect.width, rect.height);
//     renderer.setClearColor(0x000000, 1); // Black background
//     rendererRef.current = renderer;

//     // Create camera
//     const camera = new THREE.OrthographicCamera(
//       -10, 10, 6, -6, 0.1, 1000
//     );
//     camera.position.set(0, 0, 10);
//     camera.lookAt(0, 0, 0);
//     cameraRef.current = camera;

//     // Set up scene
//     const scene = sceneRef.current;
//     scene.clear();

//     setIsInitialized(true);
//   }, []);

//   // Create grid with thickness values
//   const createFurnaceGrid = useCallback(() => {
//     if (!sceneRef.current || !rendererRef.current) return;

//     const scene = sceneRef.current;
    
//     // Clear existing grid and text
//     if (gridMeshRef.current) {
//       scene.remove(gridMeshRef.current);
//       gridMeshRef.current.traverse((child) => {
//         if (child.geometry) child.geometry.dispose();
//         if (child.material) child.material.dispose();
//       });
//     }

//     textMeshesRef.current.forEach(mesh => {
//       scene.remove(mesh);
//       if (mesh.geometry) mesh.geometry.dispose();
//       if (mesh.material) mesh.material.dispose();
//     });
//     textMeshesRef.current = [];

//     const gridGroup = new THREE.Group();
//     const profileCount = gridConfig.profiles.length;
//     const zoneCount = gridConfig.zones.length;
    
//     const cellWidth = 18 / profileCount;
//     const cellHeight = 10 / zoneCount;
//     const startX = -9;
//     const startY = 4;

//     // Get thickness data from cache
//     const getThicknessForCell = (zone, profile) => {
//       if (!selectedFile || !fileDataCache.has(selectedFile.name)) {
//         return Math.random() * 50 + 30; // Random for demo
//       }
      
//       const fileData = fileDataCache.get(selectedFile.name);
//       const cells = fileData?.cells || [];
      
//       const cell = cells.find(c => c.zone === zone && c.profile === profile);
//       return cell ? (cell.averageThickness || cell.thickness || 0) : Math.random() * 50 + 30;
//     };

//     // Create grid cells
//     gridConfig.zones.forEach((zone, zoneIndex) => {
//       gridConfig.profiles.forEach((profile, profileIndex) => {
//         const x = startX + (profileIndex * cellWidth) + (cellWidth / 2);
//         const y = startY - (zoneIndex * cellHeight) - (cellHeight / 2);
        
//         // Create cell geometry
//         const cellGeometry = new THREE.PlaneGeometry(cellWidth * 0.95, cellHeight * 0.95);
//         const thickness = getThicknessForCell(zone, profile);
        
//         // Color based on thickness (green to red gradient)
//         let color = gridConfig.zoneColors[zone];
//         if (thickness < 40) {
//           color = 0xff4444; // Red for low thickness
//         } else if (thickness < 60) {
//           color = 0xffaa44; // Orange for medium thickness
//         }
        
//         const cellMaterial = new THREE.MeshBasicMaterial({ 
//           color: color,
//           transparent: true,
//           opacity: 0.8,
//           side: THREE.DoubleSide
//         });
        
//         const cellMesh = new THREE.Mesh(cellGeometry, cellMaterial);
//         cellMesh.position.set(x, y, 0);
//         cellMesh.userData = {
//           type: 'cell',
//           zone: zone,
//           profile: profile,
//           thickness: thickness,
//           profileIndex,
//           zoneIndex
//         };
        
//         gridGroup.add(cellMesh);

//         // Create thickness text
//         const canvas = document.createElement('canvas');
//         const context = canvas.getContext('2d');
//         canvas.width = 128;
//         canvas.height = 64;
        
//         context.fillStyle = '#ffffff';
//         context.fillRect(0, 0, canvas.width, canvas.height);
//         context.fillStyle = '#000000';
//         context.font = 'bold 16px Arial';
//         context.textAlign = 'center';
//         context.textBaseline = 'middle';
//         context.fillText(thickness.toFixed(1), canvas.width/2, canvas.height/2);
        
//         const texture = new THREE.CanvasTexture(canvas);
//         const textMaterial = new THREE.MeshBasicMaterial({ 
//           map: texture,
//           transparent: true,
//           alphaTest: 0.1
//         });
//         const textGeometry = new THREE.PlaneGeometry(cellWidth * 0.8, cellHeight * 0.4);
//         const textMesh = new THREE.Mesh(textGeometry, textMaterial);
//         textMesh.position.set(x, y, 0.01);
        
//         gridGroup.add(textMesh);
//         textMeshesRef.current.push(textMesh);
//       });
//     });

//     // Create grid lines
//     const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    
//     // Vertical lines (profiles)
//     for (let i = 0; i <= profileCount; i++) {
//       const x = startX + (i * cellWidth);
//       const lineGeometry = new THREE.BufferGeometry().setFromPoints([
//         new THREE.Vector3(x, startY, 0.02),
//         new THREE.Vector3(x, startY - (zoneCount * cellHeight), 0.02)
//       ]);
//       const line = new THREE.Line(lineGeometry, lineMaterial);
//       gridGroup.add(line);
//     }
    
//     // Horizontal lines (zones)
//     for (let i = 0; i <= zoneCount; i++) {
//       const y = startY - (i * cellHeight);
//       const lineGeometry = new THREE.BufferGeometry().setFromPoints([
//         new THREE.Vector3(startX, y, 0.02),
//         new THREE.Vector3(startX + (profileCount * cellWidth), y, 0.02)
//       ]);
//       const line = new THREE.Line(lineGeometry, lineMaterial);
//       gridGroup.add(line);
//     }

//     // Create labels
//     const createLabel = (text, x, y, size = 20) => {
//       const canvas = document.createElement('canvas');
//       const context = canvas.getContext('2d');
//       canvas.width = 256;
//       canvas.height = 64;
      
//       context.fillStyle = 'rgba(0, 0, 0, 0)';
//       context.fillRect(0, 0, canvas.width, canvas.height);
//       context.fillStyle = '#ffffff';
//       context.font = `bold ${size}px Arial`;
//       context.textAlign = 'center';
//       context.textBaseline = 'middle';
//       context.fillText(text, canvas.width/2, canvas.height/2);
      
//       const texture = new THREE.CanvasTexture(canvas);
//       const material = new THREE.MeshBasicMaterial({ 
//         map: texture,
//         transparent: true,
//         alphaTest: 0.1
//       });
//       const geometry = new THREE.PlaneGeometry(3, 0.8);
//       const mesh = new THREE.Mesh(geometry, material);
//       mesh.position.set(x, y, 0.03);
//       return mesh;
//     };

//     // Profile labels (P1, P2, etc.)
//     gridConfig.profiles.forEach((profile, index) => {
//       const x = startX + (index * cellWidth) + (cellWidth / 2);
//       const y = startY + 1;
//       const label = createLabel(profile, x, y, 16);
//       gridGroup.add(label);
//     });

//     // Zone labels
//     gridConfig.zones.forEach((zone, index) => {
//       const x = startX + (profileCount * cellWidth) + 2;
//       const y = startY - (index * cellHeight) - (cellHeight / 2);
//       const label = createLabel(zone, x, y, 14);
//       gridGroup.add(label);
//     });

//     scene.add(gridGroup);
//     gridMeshRef.current = gridGroup;
    
//     // Render the scene
//     rendererRef.current.render(scene, cameraRef.current);
//   }, [selectedFile, fileDataCache]);

//   // Handle canvas clicks
//   const handleCanvasClick = useCallback((event) => {
//     if (isUiDisabled || !gridMeshRef.current || !cameraRef.current) return;

//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
//     const mouse = new THREE.Vector2(
//       ((event.clientX - rect.left) / rect.width) * 2 - 1,
//       -((event.clientY - rect.top) / rect.height) * 2 + 1
//     );

//     const raycaster = raycasterRef.current;
//     raycaster.setFromCamera(mouse, cameraRef.current);

//     const intersects = raycaster.intersectObjects(gridMeshRef.current.children, true);
//     const cellIntersect = intersects.find(intersect => intersect.object.userData.type === 'cell');

//     if (cellIntersect && onCellClick) {
//       const cellData = cellIntersect.object.userData;
//       onCellClick({
//         ...cellData,
//         type: 'cell',
//         thicknessData: [{
//           fileName: selectedFile?.name || 'Current',
//           thickness: cellData.thickness,
//           date: new Date(),
//           color: '#3B82F6'
//         }]
//       });
//     }
//   }, [isUiDisabled, onCellClick, selectedFile]);

//   // Handle window resize
//   const handleResize = useCallback(() => {
//     if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;
    
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
    
//     rendererRef.current.setSize(rect.width, rect.height);
//     rendererRef.current.render(sceneRef.current, cameraRef.current);
//   }, []);

//   // Initialize scene on mount
//   useEffect(() => {
//     initializeScene();
//     window.addEventListener('resize', handleResize);
    
//     return () => {
//       window.removeEventListener('resize', handleResize);
//       if (rendererRef.current) {
//         rendererRef.current.dispose();
//       }
//     };
//   }, [initializeScene, handleResize]);

//   // Update grid when data changes
//   useEffect(() => {
//     if (isInitialized) {
//       createFurnaceGrid();
//     }
//   }, [isInitialized, createFurnaceGrid]);

//   return (
//     <div style={{ width: '100%', height: '100%', position: 'relative' }}>
//       <canvas
//         ref={canvasRef}
//         style={{
//           width: '100%',
//           height: '100%',
//           cursor: 'pointer',
//           display: 'block'
//         }}
//         onClick={handleCanvasClick}
//       />
//       {!isInitialized && (
//         <div
//           style={{
//             position: 'absolute',
//             top: '50%',
//             left: '50%',
//             transform: 'translate(-50%, -50%)',
//             color: 'white',
//             fontSize: '16px',
//             pointerEvents: 'none'
//           }}
//         >
//           Initializing Grid View...
//         </div>
//       )}
//     </div>
//   );
// };

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

  // Grid configuration based on your image
  const gridConfig = {
    profiles: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12', 'P13', 'P14', 'P15', 'P16', 'P17'],
    zones: ['Initial bricks', 'Slag line', 'Slopes'],
    zoneColors: {
      'Initial bricks': 0x4ade80, // Green
      'Slag line': 0xfbbf24,     // Yellow/Orange
      'Slopes': 0x10b981        // Darker green
    }
  };

  // Initialize the scene
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

    // Create camera
    const camera = new THREE.OrthographicCamera(
      -10, 10, 6, -6, 0.1, 1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Set up scene
    const scene = sceneRef.current;
    scene.clear();

    setIsInitialized(true);
  }, []);

  // Create grid with thickness values
  const createFurnaceGrid = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const scene = sceneRef.current;
    
    // Clear existing grid and text
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

    const gridGroup = new THREE.Group();
    const profileCount = gridConfig.profiles.length;
    const zoneCount = gridConfig.zones.length;
    
    const cellWidth = 18 / profileCount;
    const cellHeight = 10 / zoneCount;
    const startX = -9;
    const startY = 4;

    // Get thickness data from cache
    const getThicknessForCell = (zone, profile) => {
      if (!selectedFile || !fileDataCache.has(selectedFile.name)) {
        return Math.random() * 50 + 30; // Random for demo
      }
      
      const fileData = fileDataCache.get(selectedFile.name);
      const cells = fileData?.cells || [];
      
      const cell = cells.find(c => c.zone === zone && c.profile === profile);
      return cell ? (cell.averageThickness || cell.thickness || 0) : Math.random() * 50 + 30;
    };

    // Create grid cells
    gridConfig.zones.forEach((zone, zoneIndex) => {
      gridConfig.profiles.forEach((profile, profileIndex) => {
        const x = startX + (profileIndex * cellWidth) + (cellWidth / 2);
        const y = startY - (zoneIndex * cellHeight) - (cellHeight / 2);
        
        // Create cell geometry
        const cellGeometry = new THREE.PlaneGeometry(cellWidth * 0.95, cellHeight * 0.95);
        const thickness = getThicknessForCell(zone, profile);
        
        // Color based on thickness (green to red gradient)
        let color = gridConfig.zoneColors[zone];
        if (thickness < 40) {
          color = 0xff4444; // Red for low thickness
        } else if (thickness < 60) {
          color = 0xffaa44; // Orange for medium thickness
        }
        
        const cellMaterial = new THREE.MeshBasicMaterial({ 
          color: color,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        });
        
        const cellMesh = new THREE.Mesh(cellGeometry, cellMaterial);
        cellMesh.position.set(x, y, 0);
        cellMesh.userData = {
          type: 'cell',
          zone: zone,
          profile: profile,
          thickness: thickness,
          profileIndex,
          zoneIndex
        };
        
        gridGroup.add(cellMesh);

        // Create thickness text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
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
        textMesh.position.set(x, y, 0.01);
        
        gridGroup.add(textMesh);
        textMeshesRef.current.push(textMesh);
      });
    });

    // Create grid lines
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    
    // Vertical lines (profiles)
    for (let i = 0; i <= profileCount; i++) {
      const x = startX + (i * cellWidth);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, startY, 0.02),
        new THREE.Vector3(x, startY - (zoneCount * cellHeight), 0.02)
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      gridGroup.add(line);
    }
    
    // Horizontal lines (zones)
    for (let i = 0; i <= zoneCount; i++) {
      const y = startY - (i * cellHeight);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(startX, y, 0.02),
        new THREE.Vector3(startX + (profileCount * cellWidth), y, 0.02)
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      gridGroup.add(line);
    }

    // Create labels
    const createLabel = (text, x, y, size = 20) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = 'rgba(0, 0, 0, 0)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
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
      const geometry = new THREE.PlaneGeometry(3, 0.8);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0.03);
      return mesh;
    };

    // Profile labels (P1, P2, etc.)
    gridConfig.profiles.forEach((profile, index) => {
      const x = startX + (index * cellWidth) + (cellWidth / 2);
      const y = startY + 1;
      const label = createLabel(profile, x, y, 16);
      gridGroup.add(label);
    });

    // Zone labels
    gridConfig.zones.forEach((zone, index) => {
      const x = startX + (profileCount * cellWidth) + 2;
      const y = startY - (index * cellHeight) - (cellHeight / 2);
      const label = createLabel(zone, x, y, 14);
      gridGroup.add(label);
    });

    scene.add(gridGroup);
    gridMeshRef.current = gridGroup;
    
    // Render the scene
    rendererRef.current.render(scene, cameraRef.current);
  }, [selectedFile, fileDataCache]);

  // Handle canvas clicks
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
    const cellIntersect = intersects.find(intersect => intersect.object.userData.type === 'cell');

    if (cellIntersect && onCellClick) {
      const cellData = cellIntersect.object.userData;
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

  // Update grid when data changes
  useEffect(() => {
    if (isInitialized) {
      createFurnaceGrid();
    }
  }, [isInitialized, createFurnaceGrid]);

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

export default FurnaceGridCanvas;