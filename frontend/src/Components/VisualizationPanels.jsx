import React from "react";

const VisualizationPanels = ({
  canvasRef,
  proposalCanvasRef,
  currentConfig,
  visualizationMode,
  setVisualizationMode,
  wornPoints,
  repairProposal,
  isUiDisabled,
}) => {
  return (
    <div style={{ display: "flex", gap: "10px", height: "60vh" }}>
      <div
        style={{
          flex: 1,
          backgroundColor: "#000",
          border: `2px solid ${currentConfig.color}`,
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "bold",
            zIndex: 1000,
          }}
        >
          {currentConfig.title}
        </div>
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: "10px",
            zIndex: 1000,
          }}
        >
          <button
            onClick={() => setVisualizationMode(visualizationMode === "all" ? "filtered" : "all")}
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
        <div
          style={{
            position: "absolute",
            top: "85px",
            left: "10px",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: wornPoints.length > 0 ? "#FF4444" : "#10B981",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            zIndex: 1000,
          }}
        >
          {wornPoints.length > 0 ? `${wornPoints.length} points need repair` : "No repairs needed"}
        </div>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: "#000",
          border: "2px solid #FF6600",
          borderRadius: "8px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "bold",
            zIndex: 1000,
          }}
        >
          GUNITE PROPOSAL VISUALIZATION
        </div>
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "10px",
            right: "10px",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "#FFD700",
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "10px",
            zIndex: 1000,
            textAlign: "center",
          }}
        >
          Shows 3D visualization of repair areas and material requirements
        </div>
        <div
          style={{
            position: "absolute",
            top: "85px",
            left: "10px",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: repairProposal.areas.length > 0 ? "#FF4444" : "#666",
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            zIndex: 1000,
          }}
        >
          {repairProposal.areas.length > 0 ? `${repairProposal.areas.length} Repair Area(s)` : "No Repairs Needed"}
        </div>
        <canvas ref={proposalCanvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
};

export default VisualizationPanels;