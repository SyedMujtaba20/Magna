
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Line } from 'react-chartjs-2';
import { debounce } from 'lodash';
import { X } from 'lucide-react';
import { initializeScene, createGridOverlay, updateScene } from './sceneUtils';
import { getThicknessDataAcrossFiles, runDataCoverageAnalysis } from './chartUtils';

// Custom hook to manage Chart.js cleanup
const useChartCleanup = () => {
  const chartRef = useRef(null);
  const destroyChart = useCallback(() => {
    if (chartRef.current) {
      try {
        chartRef.current.destroy();
        chartRef.current = null;
      } catch (error) {
        console.warn('Error destroying chart:', error);
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

// ThicknessDialog component
const ThicknessDialog = ({ showDialog, dialogData, files, onClose }) => {
  const { chartRef, destroyChart } = useChartCleanup();
  const [chartKey, setChartKey] = useState(0);

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
      console.log('[ThicknessDialog] No data for:', data);
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'No Data Available',
          data: [0],
          borderColor: '#ccc',
          backgroundColor: 'rgba(204, 204, 204, 0.1)',
        }],
      };
    }

    const sortedData = data.thicknessData.sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
      labels: sortedData.map((d) => d.fileName),
      datasets: [{
        label: `${data.type === 'cell' ? 'Cell' : 'Point'} Thickness Across Files`,
        data: sortedData.map((d) => d.thickness),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: sortedData.map((d) => d.color),
        pointBorderColor: sortedData.map((d) => d.color),
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.1,
      }],
    };
  };

  const chartOptionsForDialog = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: 'black' },
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
        type: 'category',
        ticks: {
          color: 'black',
          maxRotation: 45,
          minRotation: 45,
        },
        grid: { color: 'rgba(0,0,0,0.1)' },
        title: {
          display: true,
          text: 'Files',
          color: 'black',
        },
      },
      y: {
        ticks: { color: 'black' },
        grid: { color: 'rgba(0,0,0,0.1)' },
        title: {
          display: true,
          text: 'Thickness (cm)',
          color: 'black',
        },
      },
    },
  };

  if (!showDialog || !dialogData) return null;

  // Enhanced error message for no data
  if (!dialogData.thicknessData || dialogData.thicknessData.length === 0) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80%',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '10px',
            }}
          >
            <h3 style={{ margin: 0, color: '#1a202c' }}>
              {dialogData.type === 'cell'
                ? `Cell: ${dialogData.zone} - ${dialogData.profile}`
                : `Point #${dialogData.index}`}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} color='#666' />
            </button>
          </div>
          <div style={{ color: '#dc3545', textAlign: 'center', padding: '20px' }}>
            No thickness data found for {dialogData.zone || 'unknown'}|{dialogData.profile || 'unknown'} in any of the {files.length} files.
            <br />
            Possible causes: Incorrect data format or missing data in CSV files.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          width: '90%',
          maxWidth: '800px',
          maxHeight: '80%',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '2px solid #e2e8f0',
            paddingBottom: '10px',
          }}
        >
          <h3 style={{ margin: 0, color: '#1a202c' }}>
            {dialogData.type === 'cell'
              ? `Cell: ${dialogData.zone} - ${dialogData.profile}`
              : `Point #${dialogData.index}`}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} color='#666' />
          </button>
        </div>

        <div style={{ height: '400px', marginBottom: '20px' }}>
          <Line
            key={`chart-${chartKey}`}
            ref={chartRef}
            data={getDialogChartData(dialogData)}
            options={chartOptionsForDialog}
            id={`chart-${chartKey}`}
          />
        </div>

        <div style={{ color: '#2d3748', fontSize: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <strong>Selected Item:</strong>
              <div>{dialogData.type === 'cell' ? 'Grid Cell' : 'Point'}</div>
            </div>

            {dialogData.type === 'point' && (
              <div>
                <strong>Position:</strong>
                <div>X: {dialogData.position[0]?.toFixed(3)}</div>
                <div>Y: {dialogData.position[1]?.toFixed(3)}</div>
                <div>Z: {dialogData.position[2]?.toFixed(3)}</div>
              </div>
            )}

            <div>
              <strong>Files with data:</strong>
              <div>{dialogData.thicknessData?.length || 0} of {files.length}</div>
            </div>

            {dialogData.thicknessData && dialogData.thicknessData.length > 0 && (
              <div>
                <strong>Thickness Range:</strong>
                <div>
                  {Math.min(...dialogData.thicknessData.map((d) => d.thickness)).toFixed(2)} -
                  {Math.max(...dialogData.thicknessData.map((d) => d.thickness)).toFixed(2)} cm
                </div>
              </div>
            )}
          </div>

          {dialogData.thicknessData && dialogData.thicknessData.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <strong>Thickness Data by File:</strong>
              <div style={{ marginTop: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                {dialogData.thicknessData.map((data, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      backgroundColor: index % 2 === 0 ? '#f7fafc' : 'white',
                      borderRadius: '4px',
                      margin: '2px 0',
                    }}
                  >
                    <span style={{ color: data.color, fontWeight: 'bold' }}>{data.fileName}</span>
                    <span>{data.thickness.toFixed(2)} cm</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ThicknessesScreen = ({ files, fileDataCache, selectedFile, selectedFurnace, isUiDisabled }) => {
  const [selectedBrick, setSelectedBrick] = useState(null);
  const [isRendering, setIsRendering] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogData, setDialogData] = useState(null);

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

  raycasterRef.current.params.Points.threshold = 2;
  raycasterRef.current.params.Mesh = { threshold: 0.1 };

  const points = useMemo(() => {
    if (!selectedFile) {
      console.log('[points] No file selected.');
      return [];
    }
    if (!fileDataCache.has(selectedFile.name)) {
      console.log('[points] File data not found for:', selectedFile.name);
      return [];
    }
    const data = fileDataCache.get(selectedFile.name).points || [];
    console.log('[points] Loaded', data.length, 'points from', selectedFile.name);
    return data;
  }, [selectedFile?.name, fileDataCache]);

  // Log fileDataCache and run coverage analysis
  useEffect(() => {
    if (files.length > 0 && fileDataCache.size > 0) {
      files.forEach(file => {
        const fileData = fileDataCache.get(file.name);
        console.log(`[FileDataCache] ${file.name}:`, {
          cellCount: fileData?.cells?.length || 0,
          cells: fileData?.cells?.map(cell => ({
            zone: cell.zone,
            profile: cell.profile,
            thickness: cell.averageThickness || cell.thickness,
            allProps: Object.keys(cell)
          })) || [],
          pointCount: fileData?.points?.length || 0
        });
      });

      const coverage = runDataCoverageAnalysis(files, fileDataCache);
      console.log('[CoverageAnalysis] Zones:', coverage.zones);
      console.log('[CoverageAnalysis] Profiles:', coverage.profiles);
      console.log('[CoverageAnalysis] Combinations:', coverage.combinations);
      console.log('[CoverageAnalysis] Zone Coverage:', coverage.zoneCoverage);
      console.log('[CoverageAnalysis] Profile Coverage:', coverage.profileCoverage);
      console.log('[CoverageAnalysis] Low Coverage Combos:', coverage.lowCoverageCombos);
    }
  }, [files, fileDataCache]);

  // Log grid cell assignments
  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.traverse(child => {
        if (child.userData.type === 'cell') {
          console.log('[GridOverlay] Cell:', {
            zone: child.userData.zone,
            profile: child.userData.profile,
            position: child.position
          });
        }
      });
    }
  }, [isInitialized]);

  useEffect(() => {
    const cleanup = initializeScene(canvasRef, sceneRef, rendererRef, cameraRef, controlsRef, gridMeshRef, setIsInitialized);
    return cleanup;
  }, []);

  useEffect(() => {
    if (gridMeshRef.current) {
      gridMeshRef.current.visible = showGrid;
      console.log('[GridVisibility] Grid visible:', showGrid);
    }
  }, [showGrid]);

  useEffect(() => {
    console.log('[DEBUG] selectedBrick changed:', selectedBrick);
    console.log('[DEBUG] selectedCell changed:', selectedCell);
    setDebugInfo(`Brick: ${selectedBrick ? 'Selected' : 'None'}, Cell: ${selectedCell ? 'Selected' : 'None'}`);
  }, [selectedBrick, selectedCell]);

const handleCanvasClick = useCallback(
  debounce((event) => {
    console.log('[CanvasClick] Starting click handler');
    console.log('[CanvasClick] isUiDisabled:', isUiDisabled);
    console.log('[CanvasClick] isRendering:', isRendering);

    if (isUiDisabled || isRendering) {
      console.log('[CanvasClick] Blocked: UI disabled or rendering');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('[CanvasClick] No canvas reference');
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    console.log('[CanvasClick] Mouse coords:', mouse.x, mouse.y);

    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(mouse, cameraRef.current);

    if (gridMeshRef.current) {
      gridMeshRef.current.traverse((child) => {
        if (child.userData.type === 'cell' && child.material) {
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
      const gridIntersects = raycaster.intersectObjects(gridMeshRef.current.children, true);
      console.log('[CanvasClick] Grid intersections:', gridIntersects.length);

      const cellIntersect = gridIntersects
        .filter((intersect) => intersect.object.userData.type === 'cell')
        .sort((a, b) => a.distance - b.distance)[0];

      if (cellIntersect) {
        const cellData = cellIntersect.object.userData;
        console.log('[CanvasClick] Grid cell selected:', cellData);

        cellIntersect.object.material.opacity = 0.3;
        cellIntersect.object.material.color.set(0x00ff88);

        const thicknessDataAcrossFiles = getThicknessDataAcrossFiles(cellData, 'cell', files, fileDataCache);

        const cellSelection = {
          ...cellData,
          type: 'cell',
          thicknessData: thicknessDataAcrossFiles,
        };

        console.log('[CanvasClick] Setting selectedCell:', cellSelection);
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
      console.log('[CanvasClick] Point intersections:', intersects.length);

      if (intersects.length > 0) {
        const selectedIndex = intersects[0].index;
        const validPoints = pointsMeshRef.current.userData.validPoints;
        const selectedData = validPoints[selectedIndex];

        if (selectedData) {
          console.log('[CanvasClick] Point selected:', selectedData);

          const markerGeometry = new THREE.SphereGeometry(1, 16, 16); // Size in mm
          const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
          const markerPos = {
            x: selectedData.position[0], // Already in mm
            y: selectedData.position[1],
            z: selectedData.position[2],
          };
          markerMesh.position.set(markerPos.x, markerPos.y, markerPos.z);
          console.log('[CanvasClick] Marker position:', markerPos);
          sceneRef.current.add(markerMesh);
          markerMeshRef.current = markerMesh;

          const thicknessDataAcrossFiles = getThicknessDataAcrossFiles(selectedData, 'point', files, fileDataCache);

          const brickSelection = {
            ...selectedData,
            index: selectedIndex,
            type: 'point',
            thickness: selectedData.thickness, // Already in cm
            thicknessData: thicknessDataAcrossFiles,
          };

          console.log('[CanvasClick] Setting selectedBrick:', brickSelection);
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
  [isUiDisabled, isRendering, showGrid, files, fileDataCache]
);

  const handleMouseMove = debounce(() => {
    console.log('[Canvas] Mouse move event');
  }, 100);

  useEffect(() => {
    if (!selectedFile) return;

    console.log('[sceneEffect] File changed, updating scene for:', selectedFile?.name);

    const timeoutId = setTimeout(() => {
      updateScene(points, sceneRef, pointsMeshRef, isRenderingRef, setIsRendering, prevPointsLengthRef, gridMeshRef)();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedFile?.name, points]);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setTimeout(() => {
      setDialogData(null);
    }, 100);
  }, []);

  const clearSelection = () => {
    console.log('[ClearSelection] Clearing selections');
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
        if (child.userData.type === 'cell' && child.material) {
          child.material.opacity = 0.2;
          child.material.color.set(0x333333);
        }
      });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        {!isInitialized && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'black',
              zIndex: 1,
              textAlign: 'center',
            }}
          >
            Initializing...
          </div>
        )}
        {!selectedFile && isInitialized && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'black',
              zIndex: 1,
              textAlign: 'center',
            }}
          >
            Please select a file to visualize thickness data.
          </div>
        )}
        {isRendering && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              color: 'black',
              backgroundColor: 'rgba(255,255,255,0.7)',
              padding: '5px 10px',
              borderRadius: '4px',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          >
            Loading {points.length} points...
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            color: 'black',
            backgroundColor: 'rgba(255,255,255,0.7)',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 5,
            pointerEvents: 'all',
          }}
        >
          <div>Points: {points.length}</div>
          <div>Files: {files.length}</div>
          <div>🟢 Zones: Roof, SlagLine, Belly, InitialBricks, Bottom</div>
          <div>🔵 Profiles</div>
          <div>Click grid cells or points to view thickness across all files</div>
          <div>Drag to rotate, scroll to zoom</div>
          <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
            Debug: {debugInfo}
          </div>
          <button
            onClick={() => setShowGrid(!showGrid)}
            style={{
              marginTop: '5px',
              padding: '3px 8px',
              backgroundColor: showGrid ? '#333' : '#888',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              marginRight: '5px',
            }}
          >
            {showGrid ? 'Hide Grid' : 'Show Grid'}
          </button>
          {(selectedCell || selectedBrick) && (
            <button
              onClick={clearSelection}
              style={{
                padding: '3px 8px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Clear
            </button>
          )}
        </div>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: isInitialized ? 'block' : 'none' }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onWheel={(e) => console.log('[Canvas] Wheel event:', e.deltaY)}
        />
      </div>

      <ThicknessDialog showDialog={showDialog} dialogData={dialogData} files={files} onClose={closeDialog} />
    </div>
  );
};

export default React.memo(ThicknessesScreen);
