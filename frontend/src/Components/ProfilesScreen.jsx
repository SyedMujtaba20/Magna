import React, { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { getColorForThickness } from "./ColorUtils";
import {
  getBaselineFile,
  getBaselinePoints,
  getFurnacePoints,
  getDataBounds,
  getAvailableFurnaces,
} from "./FurnaceDataUtils";
import { setupThreeScene, updateThreeScene } from "./SceneSetup";
import { getSliceData, drawSliceProfile } from "./SliceProfileUtils";
import {
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
} from "./MouseInteraction";

const ProfilesScreen = ({
  files,
  fileDataCache,
  selectedFile,
  isUiDisabled,
}) => {
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

  // Get baseline file
  const baselineFile = getBaselineFile(files);

  // Get baseline points
  const baselinePoints = getBaselinePoints(
    baselineFile,
    fileDataCache,
    selectedFurnace
  );

  // Get furnace points
  const furnacePoints = getFurnacePoints(
    selectedFile,
    fileDataCache,
    selectedFurnace
  );

  // Calculate data bounds
  const dataBounds = getDataBounds(furnacePoints, baselinePoints);

  // Initialize slice positions
  useEffect(() => {
    setHorizontalSlice((dataBounds.minZ + dataBounds.maxZ) / 2);
    setVerticalSlice((dataBounds.minX + dataBounds.maxX) / 2);
  }, [dataBounds]);

  // Extract available furnaces
  useEffect(() => {
    getAvailableFurnaces(
      selectedFile,
      fileDataCache,
      setAvailableFurnaces,
      setSelectedFurnace,
      selectedFurnace
    );
  }, [selectedFile, fileDataCache, selectedFurnace]);

  // Initialize Three.js scene
  useEffect(() => {
    return setupThreeScene(
      canvasRef,
      sceneRef,
      rendererRef,
      cameraRef,
      animationIdRef,
      dataBounds
    );
  }, [dataBounds]);

  // Update 3D scene with points and slice lines
  useEffect(() => {
    updateThreeScene(
      sceneRef,
      furnacePoints,
      horizontalSlice,
      verticalSlice,
      dataBounds,
      getColorForThickness
    );
  }, [furnacePoints, horizontalSlice, verticalSlice, dataBounds]);

  // Update slice profiles
  useEffect(() => {
    drawSliceProfile(
      xSliceCanvasRef.current,
      true,
      horizontalSlice,
      furnacePoints,
      baselinePoints,
      dataBounds,
      getColorForThickness
    );
  }, [horizontalSlice, furnacePoints, baselinePoints, dataBounds]);

  useEffect(() => {
    drawSliceProfile(
      ySliceCanvasRef.current,
      false,
      verticalSlice,
      furnacePoints,
      baselinePoints,
      dataBounds,
      getColorForThickness
    );
  }, [verticalSlice, furnacePoints, baselinePoints, dataBounds]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100%",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* No data message */}
      {(!selectedFile || !fileDataCache.has(selectedFile?.name)) && (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            fontSize: "16px",
          }}
        >
          No data available. Please select a file with LiDAR data.
        </div>
      )}

      {/* Furnace selector */}
      {selectedFile &&
        fileDataCache.has(selectedFile.name) &&
        availableFurnaces.length > 0 && (
          <div
            style={{
              padding: "10px",
              borderBottom: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
              flexShrink: 0,
            }}
          >
            <label style={{ marginRight: "10px", fontWeight: "bold" }}>
              Select Furnace:
            </label>
            <select
              value={selectedFurnace?.furnace_id || ""}
              onChange={(e) => {
                const furnace = availableFurnaces.find(
                  (f) => f.furnace_id === e.target.value
                );
                setSelectedFurnace(furnace);
              }}
              style={{
                padding: "5px 10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                backgroundColor: "white",
              }}
            >
              <option value="">Select a furnace...</option>
              {availableFurnaces.map((furnace) => (
                <option key={furnace.furnace_id} value={furnace.furnace_id}>
                  {furnace.name}
                </option>
              ))}
            </select>
          </div>
        )}

      {/* Main content */}
      {selectedFile &&
        fileDataCache.has(selectedFile.name) &&
        selectedFurnace && (
          <div
            style={{
              display: "flex",
              height: "100%",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Main 3D view - Furnace seen from above */}
            <div
              style={{
                width: "50%",
                position: "relative",
                border: "1px solid #ccc",
                overflow: "hidden",
              }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                }}
                onMouseDown={(e) =>
                  handleMouseDown(
                    e,
                    canvasRef,
                    cameraRef,
                    dataBounds,
                    setDraggingLine,
                    verticalSlice,
                    horizontalSlice,
                    isUiDisabled
                  )
                }
                onMouseMove={(e) =>
                  handleMouseMove(
                    e,
                    canvasRef,
                    dataBounds,
                    draggingLine,
                    isUiDisabled,
                    setHorizontalSlice,
                    setVerticalSlice,
                    horizontalSlice,
                    verticalSlice
                  )
                }
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              />

              {/* Orientation labels */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Z ↑ | X →
              </div>

              {/* Furnace info */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
              >
                {selectedFurnace?.name || "No Furnace Selected"}
                <br />
                <small>{furnacePoints.length} points</small>
              </div>

              {/* Slice position info */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: 10,
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                }}
              >
                Horizontal: {horizontalSlice.toFixed(1)}
                <br />
                Vertical: {verticalSlice.toFixed(1)}
              </div>
            </div>

            {/* Profile views */}
            <div
              style={{
                width: "50%",
                display: "flex",
                flexDirection: "column",
                border: "1px solid #ccc",
                overflow: "hidden",
              }}
            >
              {/* Color Legend */}
              <div
                style={{
                  height: "40px",
                  background:
                    "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
                  position: "relative",
                  borderBottom: "1px solid #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                <span>Low Wear: {dataBounds.minY.toFixed(1)}</span>
                <span
                  style={{ color: "white", textShadow: "1px 1px 2px black" }}
                >
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
                    backgroundColor: "#ffffff",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    // Grammar fix suggestion: Consider replacing
                    fontSize: "12px",
                    //  " with "
                    // fontSize: "12px",
                    // to maintain consistency with single quotes used elsewhere in the style object.

                    fontWeight: "bold",
                    border: "1px solid #ccc",
                  }}
                >
                  Y Profile (Vertical Slice at X={verticalSlice.toFixed(1)})
                </div>

                {/* Legend for profile lines */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 50,
                    right: 10,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: "6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    border: "1px solid #ccc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "2px",
                        backgroundColor: "#000",
                        marginRight: "5px",
                      }}
                    ></div>
                    Initial Line
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "2px",
                        background:
                          "linear-gradient(to right, #0000ff, #ff0000)",
                        marginRight: "5px",
                      }}
                    ></div>
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
                    backgroundColor: "#ffffff",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    border: "1px solid #ccc",
                  }}
                >
                  X Profile (Horizontal Slice at Z={horizontalSlice.toFixed(1)})
                </div>

                {/* Legend for profile lines */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 50,
                    right: 10,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    padding: "6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    border: "1px solid #ccc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "2px",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "2px",
                        backgroundColor: "#000",
                        marginRight: "5px",
                      }}
                    ></div>
                    Initial Line
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "2px",
                        background:
                          "linear-gradient(to right, #0000ff, #ff0000)",
                        marginRight: "5px",
                      }}
                    ></div>
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
