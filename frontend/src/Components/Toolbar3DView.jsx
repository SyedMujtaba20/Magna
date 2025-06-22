import React from "react";
import { Box, Eye, EyeOff, Camera, ZoomIn, ZoomOut } from "lucide-react";

const Toolbar3DView = ({
  wearRange,
  setWearRange,
  viewMode,
  setViewMode,
  showTemplate,
  setShowTemplate,
  showFurnace,
  setShowFurnace,
  selectedArea,
  setSelectedArea,
  isUiDisabled,
  templateData,
  zoomLevel = 1,
  setZoomLevel,
  lensMode = "normal",
  setLensMode,
}) => {
  const handleAreaSelection = () => {
    setSelectedArea(selectedArea ? null : {});
  };

  const zoomLevels = [0.5, 1, 2];

  const handleZoomIn = () => {
    const next = zoomLevels.find((z) => z > zoomLevel);
    if (next) setZoomLevel(next);
  };

  const handleZoomOut = () => {
    const prev = [...zoomLevels].reverse().find((z) => z < zoomLevel);
    if (prev) setZoomLevel(prev);
  };

  const lenses = ["normal", "zoom", "wide"];

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        backgroundColor: "rgba(28,28,28,0.95)",
        padding: "12px",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        color: "white",
        fontFamily: "sans-serif",
        fontSize: "14px",
        width: "260px",
        boxShadow: "0 0 12px rgba(0,0,0,0.5)",
        opacity: isUiDisabled ? 0.5 : 1,
      }}
    >
      {/* Wear Range */}
      <div>
        <div style={{ marginBottom: "6px", fontWeight: "bold" }}>Wear Range</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {["all", "low", "medium", "high", "critical"].map((range) => (
            <button
              key={range}
              onClick={() => setWearRange(range)}
              disabled={isUiDisabled}
              style={{
                backgroundColor: wearRange === range ? "#3B82F6" : "#6B7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: isUiDisabled ? "not-allowed" : "pointer",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode */}
      <div>
        <div style={{ marginBottom: "6px", fontWeight: "bold" }}>View Mode</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {["3D", "developed", "mean", "minimum"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              disabled={isUiDisabled}
              style={{
                backgroundColor: viewMode === mode ? "#3B82F6" : "#6B7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: isUiDisabled ? "not-allowed" : "pointer",
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Lens */}
      <div>
        <div style={{ marginBottom: "6px", fontWeight: "bold" }}>Lens</div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {lenses.map((lens) => (
            <button
              key={lens}
              onClick={() => setLensMode(lens)}
              disabled={isUiDisabled}
              style={{
                backgroundColor: lensMode === lens ? "#4ADE80" : "#6B7280",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: isUiDisabled ? "not-allowed" : "pointer",
              }}
              title={`Lens: ${lens}`}
            >
              <Camera size={14} style={{ marginRight: "4px" }} /> {lens}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom */}
      <div>
        <div style={{ marginBottom: "6px", fontWeight: "bold" }}>Zoom</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleZoomOut}
            disabled={isUiDisabled || zoomLevel <= 0.5}
            style={{
              backgroundColor: "#6B7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
            }}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <div style={{ width: "40px", textAlign: "center" }}>
            {(zoomLevel * 100).toFixed(0)}%
          </div>
          <button
            onClick={handleZoomIn}
            disabled={isUiDisabled || zoomLevel >= 2}
            style={{
              backgroundColor: "#6B7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
            }}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div>
        <div style={{ marginBottom: "6px", fontWeight: "bold" }}>Toggles</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={handleAreaSelection}
            disabled={isUiDisabled}
            title="Select Area"
            style={{
              backgroundColor: selectedArea ? "#3B82F6" : "#6B7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
            }}
          >
            <Box size={16} />
          </button>
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            disabled={isUiDisabled || !templateData}
            title={showTemplate ? "Hide Template" : "Show Template"}
            style={{
              backgroundColor: showTemplate ? "#3B82F6" : "#6B7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
            }}
          >
            {showTemplate ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={() => setShowFurnace(!showFurnace)}
            disabled={isUiDisabled}
            title={showFurnace ? "Hide Furnace" : "Show Furnace"}
            style={{
              backgroundColor: showFurnace ? "#3B82F6" : "#6B7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "6px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
            }}
          >
            {showFurnace ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toolbar3DView;
