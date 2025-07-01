import React from "react";

const ScreenHeader = ({
  activeScreen,
  setActiveScreen,
  availableSections,
  screenConfigs,
  selectedFile,
  processedPoints,
  wornPoints,
  isProcessing,
  isUiDisabled,
}) => {
  return (
    <div
      style={{
        backgroundColor: "#333",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        fontSize: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <span>Screen:</span>
        {availableSections.map((screen) => (
          <button
            key={screen}
            onClick={() => setActiveScreen(screen)}
            style={{
              backgroundColor: activeScreen === screen ? screenConfigs[screen].color : "#555",
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
            {screen}
          </button>
        ))}
      </div>
      <div>
        File: {selectedFile ? selectedFile.name : "No file selected"} |
        Points: {processedPoints.length} | Worn: {wornPoints.length}
        {isProcessing && <span style={{ color: "#ffaa00" }}> | Processing...</span>}
      </div>
    </div>
  );
};

export default ScreenHeader;