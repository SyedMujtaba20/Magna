import React from "react";
import { Check } from "lucide-react";

const WearRangeTopbar = ({
  selectedArea,
  setSelectedArea, // Add this prop
  dataStats,
  wearRange,
  setWearRange,
  viewMode,
  setViewMode,
  profileMode = "all", // Add profile mode prop
  setProfileMode, // Add profile mode setter
  isUiDisabled,
  currentDate = "2023-09-27 08:53:40",
  selectedFile,
  fileDataCache
}) => {
  console.log("🔍 WearRangeTopbar Debug:", {
    selectedFile: selectedFile?.name || selectedFile,
    viewMode,
    hasFileDataCache: !!fileDataCache,
    cacheSize: fileDataCache?.size || 0
  });

  // Calculate average wear in selection based on actual selected area
  const getSelectionWear = () => {
    if (!selectedArea || !selectedFile || !fileDataCache) {
      return null;
    }

    const fileName = typeof selectedFile === 'string' ? selectedFile : selectedFile?.name;
    const fileData = fileDataCache.get(fileName);
    
    if (!fileData || !fileData.points) {
      return null;
    }

    // If selectedArea has bounds, calculate actual wear in that area
    if (selectedArea.bounds) {
      const { minX, maxX, minY, maxY } = selectedArea.bounds;
      const pointsInSelection = fileData.points.filter(point => {
        if (!point.position || point.position.length < 3) return false;
        const [x, y] = point.position;
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      });

      if (pointsInSelection.length > 0) {
        const avgThickness = pointsInSelection.reduce((sum, p) => sum + (p.thickness || 0), 0) / pointsInSelection.length;
        return avgThickness.toFixed(2);
      }
    }

    // Fallback: simulate based on overall data statistics
    if (fileData.points.length > 0) {
      const samplePoints = fileData.points.slice(0, Math.min(1000, fileData.points.length));
      const avgThickness = samplePoints.reduce((sum, p) => sum + (p.thickness || 0), 0) / samplePoints.length;
      return avgThickness.toFixed(2);
    }

    return null;
  };

  const selectionWear = getSelectionWear();

  // Get actual thickness data from your LiDAR processing
  const getThicknessData = () => {
    console.log("📊 getThicknessData called:", { selectedFile, viewMode });
    
    // Fix: Check if selectedFile is a string or object
    const fileName = typeof selectedFile === 'string' ? selectedFile : selectedFile?.name;
    
    if (!fileName || !fileDataCache.has(fileName)) {
      console.log("❌ No file data found:", { fileName, hasCache: fileDataCache.has(fileName) });
      return null;
    }

    const fileData = fileDataCache.get(fileName);
    console.log("📂 FileData:", { 
      hasCells: !!fileData?.cells, 
      cellsLength: fileData?.cells?.length,
      hasPoints: !!fileData?.points,
      pointsLength: fileData?.points?.length,
      firstCell: fileData?.cells?.[0]
    });

    // 🆕 NEW: Fallback to points if no cells available
    if (!fileData) {
      console.log("❌ No file data");
      return null;
    }

    // Try to use cells first (preferred method)
    if (fileData.cells && fileData.cells.length > 0) {
      console.log("✅ Using cells data");
      return getCellBasedThickness(fileData, viewMode);
    }
    
    // 🆕 Fallback: Use points data directly
    if (fileData.points && fileData.points.length > 0) {
      console.log("✅ Using points data (fallback)");
      return getPointBasedThickness(fileData, viewMode);
    }

    console.log("❌ No usable data found");
    return null;
  };

  // Original cell-based method
  const getCellBasedThickness = (fileData, viewMode) => {
    const zoneData = {};
    
    fileData.cells.forEach(cell => {
      if (!cell.zone || cell.averageThickness == null) return;
      
      if (!zoneData[cell.zone]) {
        zoneData[cell.zone] = {
          thicknesses: [],
          minThickness: Infinity,
          maxThickness: -Infinity
        };
      }
      
      const thickness = cell.averageThickness;
      zoneData[cell.zone].thicknesses.push(thickness);
      zoneData[cell.zone].minThickness = Math.min(zoneData[cell.zone].minThickness, cell.minThickness || thickness);
      zoneData[cell.zone].maxThickness = Math.max(zoneData[cell.zone].maxThickness, cell.maxThickness || thickness);
    });

    const result = {};
    Object.entries(zoneData).forEach(([zone, data]) => {
      if (viewMode === "mean") {
        const mean = data.thicknesses.reduce((sum, t) => sum + t, 0) / data.thicknesses.length;
        result[zone] = `${mean.toFixed(1)} cm`;
      } else if (viewMode === "minimum") {
        result[zone] = `${data.minThickness.toFixed(1)} cm`;
      }
    });

    return Object.keys(result).length > 0 ? result : null;
  };

  // 🆕 NEW: Point-based method for when no cells are available
  const getPointBasedThickness = (fileData, viewMode) => {
    console.log("📍 Processing points for thickness data...");
    
    if (!fileData.points || fileData.points.length === 0) {
      return null;
    }

    // Create synthetic zones based on point positions
    const zoneData = {
      "Overall": {
        thicknesses: [],
        minThickness: Infinity,
        maxThickness: -Infinity
      }
    };

    // Enhanced zone creation with better names and Z-coordinate ranges
    const createZonesFromPoints = (points) => {
      const zones = {
        "Main Body": { thicknesses: [], minThickness: Infinity }, // Middle zone (most important)
        "Upper Section": { thicknesses: [], minThickness: Infinity }, // Upper zone
        "Lower Section": { thicknesses: [], minThickness: Infinity }  // Lower zone
      };

      points.forEach(point => {
        if (!point.thickness || !point.position) return;
        
        const z = point.position[2]; // Z coordinate
        let zoneName = "Main Body"; // Default to main body
        
        // Classify based on Z position (adjust these ranges based on your furnace geometry)
        if (z > 50) {
          zoneName = "Upper Section";
        } else if (z < -50) {
          zoneName = "Lower Section";
        }
        // else stays "Main Body" (-50 to 50)
        
        zones[zoneName].thicknesses.push(point.thickness);
        zones[zoneName].minThickness = Math.min(zones[zoneName].minThickness, point.thickness);
      });

      return zones;
    };

    // Use zone-based approach if we have enough points
    const zones = fileData.points.length > 1000 ? createZonesFromPoints(fileData.points) : zoneData;

    // Process all points for overall statistics
    fileData.points.forEach(point => {
      if (point.thickness != null && isFinite(point.thickness)) {
        zoneData["Overall"].thicknesses.push(point.thickness);
        zoneData["Overall"].minThickness = Math.min(zoneData["Overall"].minThickness, point.thickness);
        zoneData["Overall"].maxThickness = Math.max(zoneData["Overall"].maxThickness, point.thickness);
      }
    });

    console.log("📊 Point statistics:", {
      totalPoints: fileData.points.length,
      validThickness: zoneData["Overall"].thicknesses.length,
      minThickness: zoneData["Overall"].minThickness,
      maxThickness: zoneData["Overall"].maxThickness
    });

    // Calculate result based on view mode
    const result = {};
    
    // Add overall statistics
    if (zoneData["Overall"].thicknesses.length > 0) {
      if (viewMode === "mean") {
        const mean = zoneData["Overall"].thicknesses.reduce((sum, t) => sum + t, 0) / zoneData["Overall"].thicknesses.length;
        result["Average"] = `${mean.toFixed(1)} cm`;
      } else if (viewMode === "minimum") {
        result["Minimum"] = `${zoneData["Overall"].minThickness.toFixed(1)} cm`;
      }
    }

    // Add zone-based results if available
    Object.entries(zones).forEach(([zoneName, data]) => {
      if (data.thicknesses && data.thicknesses.length > 0) {
        if (viewMode === "mean") {
          const mean = data.thicknesses.reduce((sum, t) => sum + t, 0) / data.thicknesses.length;
          result[zoneName] = `${mean.toFixed(1)} cm`;
        } else if (viewMode === "minimum") {
          result[zoneName] = `${data.minThickness.toFixed(1)} cm`;
        }
      }
    });

    console.log("✅ Point-based result:", { viewMode, result });
    return Object.keys(result).length > 0 ? result : null;
  };

  const thicknessData = getThicknessData();
  console.log("🎯 ThicknessData to display:", thicknessData);

  // Wear range definitions with colors and proper thickness ranges
  const wearRanges = [
    { 
      id: "critical", 
      range: "0-20", 
      color: "#22C55E", // Green
      description: "Critical Wear",
      fullTooltip: "Critical Wear (0-20 cm) - Immediate attention required",
      isActive: wearRange === "critical" || wearRange === "all"
    },
    { 
      id: "high", 
      range: "20-30", 
      color: "#8B5CF6", // Purple  
      description: "High Wear",
      fullTooltip: "High Wear (20-30 cm) - Needs monitoring",
      isActive: wearRange === "high" || wearRange === "all"
    },
    { 
      id: "medium", 
      range: "30-40", 
      color: "#EF4444", // Red
      description: "Medium Wear",
      fullTooltip: "Medium Wear (30-40 cm) - Moderate risk",
      isActive: wearRange === "medium" || wearRange === "all"
    },
    { 
      id: "low", 
      range: "40-50", 
      color: "#F97316", // Orange
      description: "Low Wear",
      fullTooltip: "Low Wear (40-50 cm) - Good condition",
      isActive: wearRange === "low" || wearRange === "all"
    },
    { 
      id: "minimal", 
      range: "50+", 
      color: "#06B6D4", // Cyan
      description: "Minimal Wear",
      fullTooltip: "Minimal Wear (50+ cm) - Excellent condition",
      isActive: wearRange === "minimal" || wearRange === "all"
    }
  ];

  const handleWearRangeClick = (rangeId) => {
    if (!isUiDisabled) {
      setWearRange(rangeId);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "0px",
        left: "0px",
        right: "0px",
        height: "60px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderBottom: "2px solid #E5E7EB",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        zIndex: 1000,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        opacity: isUiDisabled ? 0.6 : 1,
      }}
    >
      {/* Left Section - Date/Time */}
      {/* <div
        style={{
          color: "#374151",
          fontWeight: "bold",
          fontSize: "14px",
        }}
      >
        {currentDate}
      </div> */}

      {/* Center Section - Wear Range Buttons */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignItems: "center",
        }}
      >
        {wearRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => handleWearRangeClick(range.id)}
            disabled={isUiDisabled}
            style={{
              width: "50px",
              height: "35px",
              backgroundColor: range.color,
              border: range.isActive ? "2px solid #1F2937" : "1px solid #D1D5DB",
              borderRadius: "4px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: range.isActive ? 1 : 0.7,
              position: "relative",
              transition: "all 0.2s ease",
              transform: "scale(1)",
            }}
            title={range.fullTooltip}
            onMouseEnter={(e) => {
              if (!isUiDisabled) {
                e.target.style.transform = "scale(1.05)";
                e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                
                // Show hover tooltip
                const tooltip = document.createElement('div');
                tooltip.id = 'wear-range-tooltip';
                tooltip.style.cssText = `
                  position: absolute;
                  bottom: 45px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: rgba(0,0,0,0.9);
                  color: white;
                  padding: 6px 10px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: bold;
                  white-space: nowrap;
                  z-index: 1001;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  pointer-events: none;
                `;
                tooltip.innerHTML = `
                  <div style="color: ${range.color}; margin-bottom: 2px;">${range.description}</div>
                  <div style="font-size: 10px; opacity: 0.9;">${range.range} cm</div>
                `;
                e.target.appendChild(tooltip);
              }
            }}
            onMouseLeave={(e) => {
              if (!isUiDisabled) {
                e.target.style.transform = "scale(1)";
                e.target.style.boxShadow = "none";
                
                // Remove hover tooltip
                const tooltip = e.target.querySelector('#wear-range-tooltip');
                if (tooltip) {
                  tooltip.remove();
                }
              }
            }}
          >
            {range.isActive && (
              <Check 
                size={16} 
                color="white" 
                style={{
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Right Section - View Options and Selection Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          color: "#374151",
        }}
      >
        {/* Selection Mode Instructions */}
        {selectedArea && !selectionWear && (
          <div
            style={{
              padding: "4px 8px",
              backgroundColor: "#DBEAFE",
              border: "1px solid #3B82F6",
              borderRadius: "4px",
              fontSize: "10px",
              fontStyle: "italic",
              color: "#1E40AF",
            }}
          >
            💡 Draw a box on the 3D view to measure wear
          </div>
        )}
        {/* Thickness Data Display */}
        {thicknessData && (viewMode === "mean" || viewMode === "minimum") && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "6px 10px",
              backgroundColor: viewMode === "mean" ? "#F0F9FF" : "#FEF3C7",
              border: viewMode === "mean" ? "2px solid #0284C7" : "2px solid #F59E0B",
              borderRadius: "8px",
              fontSize: "11px",
              maxWidth: "400px",
              flexWrap: "wrap",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: viewMode === "mean" ? "#1E40AF" : "#92400E",
                marginRight: "8px",
                fontSize: "12px",
              }}
            >
              {viewMode === "mean" ? "📊 MEAN:" : "⚠️ MIN:"}
            </div>
            {Object.entries(thicknessData).map(([zone, thickness]) => {
              // 🎨 Special styling for Main Body zone in mean mode
              const isMainBody = zone === "Main Body" || zone === "Middle";
              const isDarkMode = viewMode === "mean" && isMainBody;
              
              return (
                <div
                  key={zone}
                  style={{
                    padding: "3px 8px",
                    backgroundColor: isDarkMode ? "#1E40AF" : "white", // Dark blue for Main Body in mean mode
                    borderRadius: "4px",
                    border: isDarkMode ? "2px solid #1E40AF" : "1px solid #E5E7EB",
                    fontWeight: "bold",
                    color: isDarkMode ? "white" : (viewMode === "mean" ? "#1E40AF" : "#92400E"),
                    fontSize: "10px",
                    boxShadow: isDarkMode ? "0 2px 4px rgba(30,64,175,0.3)" : "0 1px 2px rgba(0,0,0,0.05)",
                    position: "relative",
                  }}
                  title={isMainBody ? `${zone} - Main furnace area (most critical)` : `${zone} zone`}
                >
                  {isDarkMode && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-2px",
                        right: "-2px",
                        width: "6px",
                        height: "6px",
                        backgroundColor: "#FBBF24",
                        borderRadius: "50%",
                        border: "1px solid white",
                      }}
                      title="Critical zone indicator"
                    />
                  )}
                  {zone}: {thickness}
                </div>
              );
            })}
          </div>
        )}

        {/* View Mode Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => {
              console.log("🔵 Mean button clicked");
              !isUiDisabled && setViewMode("mean");
            }}
            disabled={isUiDisabled}
            style={{
              padding: "4px 8px",
              backgroundColor: viewMode === "mean" ? "#3B82F6" : "#F3F4F6",
              color: viewMode === "mean" ? "white" : "#374151",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
              fontWeight: viewMode === "mean" ? "bold" : "normal",
              transition: "all 0.2s ease",
            }}
            title="Show mean thickness values"
          >
            Mean
          </button>
          <button
            onClick={() => {
              console.log("🔴 Minimum button clicked");
              !isUiDisabled && setViewMode("minimum");
            }}
            disabled={isUiDisabled}
            style={{
              padding: "4px 8px",
              backgroundColor: viewMode === "minimum" ? "#3B82F6" : "#F3F4F6",
              color: viewMode === "minimum" ? "white" : "#374151",
              border: "1px solid #D1D5DB",
              borderRadius: "4px",
              fontSize: "11px",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
              fontWeight: viewMode === "minimum" ? "bold" : "normal",
              transition: "all 0.2s ease",
            }}
            title="Show minimum thickness values"
          >
            Minimum
          </button>
        </div>

        {/* Selection Tools and Info */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Box Selection Tool */}
          <button
            onClick={() => {
              console.log("📦 Box selection tool clicked");
              if (!isUiDisabled) {
                // Toggle selection mode
                if (selectedArea) {
                  setSelectedArea(null); // Clear selection
                } else {
                  setSelectedArea({}); // Activate selection mode
                }
              }
            }}
            disabled={isUiDisabled}
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: selectedArea ? "#3B82F6" : "#E5E7EB",
              border: selectedArea ? "2px solid #1E40AF" : "1px solid #9CA3AF",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
              fontSize: "14px",
              color: selectedArea ? "white" : "#374151",
              transition: "all 0.2s ease",
              fontWeight: selectedArea ? "bold" : "normal",
            }}
            title={selectedArea ? "Clear selection area (Click to deactivate)" : "Draw selection area (Click to activate)"}
          >
            □
          </button>

          {/* Selection Status Indicator */}
          {selectedArea && (
            <div
              style={{
                padding: "2px 6px",
                backgroundColor: selectedArea && selectionWear ? "#10B981" : "#3B82F6",
                color: "white",
                borderRadius: "3px",
                fontSize: "9px",
                fontWeight: "bold",
              }}
              title={selectionWear ? "Selection active with measurement" : "Selection mode active - draw on 3D view"}
            >
              {selectionWear ? "✓ MEASURED" : "⏳ READY"}
            </div>
          )}

          {/* Selection Wear Info */}
          {selectionWear && (
            <div
              style={{
                padding: "4px 8px",
                backgroundColor: "#FEF3C7",
                border: "2px solid #F59E0B",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "bold",
                color: "#92400E",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              📏 Wear in Selection: {selectionWear}cm
            </div>
          )}
        </div>

        {/* 3D View Mode and Profile Controls */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <div
            style={{
              fontSize: "9px",
              color: "#6B7280",
              fontWeight: "bold",
              marginRight: "4px",
            }}
          >
            VIEW:
          </div>
          
          {/* 3D View Button */}
          <button
            onClick={() => {
              console.log("🔵 3D View clicked");
              if (!isUiDisabled) {
                setViewMode("3D");
              }
            }}
            disabled={isUiDisabled}
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: viewMode === "3D" ? "#10B981" : "#F3F4F6",
              border: viewMode === "3D" ? "2px solid #059669" : "1px solid #D1D5DB",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: viewMode === "3D" ? "white" : "#6B7280",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              transform: "scale(1)",
            }}
            title="3D View - Standard three-dimensional furnace visualization"
            onMouseEnter={(e) => {
              if (!isUiDisabled && viewMode !== "3D") {
                e.target.style.transform = "scale(1.1)";
                e.target.style.backgroundColor = "#E5E7EB";
              }
            }}
            onMouseLeave={(e) => {
              if (!isUiDisabled) {
                e.target.style.transform = "scale(1)";
                if (viewMode !== "3D") {
                  e.target.style.backgroundColor = "#F3F4F6";
                }
              }
            }}
          >
            ○
          </button>
          
          {/* Developed View Button */}
          <button
            onClick={() => {
              console.log("🔶 Developed View clicked");
              if (!isUiDisabled) {
                setViewMode("developed");
              }
            }}
            disabled={isUiDisabled}
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: viewMode === "developed" ? "#10B981" : "#F3F4F6",
              border: viewMode === "developed" ? "2px solid #059669" : "1px solid #D1D5DB",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: viewMode === "developed" ? "white" : "#6B7280",
              cursor: isUiDisabled ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
              transform: "scale(1)",
            }}
            title="Developed View - Unwrapped/flat view showing complete furnace surface with brick thickness sections"
            onMouseEnter={(e) => {
              if (!isUiDisabled && viewMode !== "developed") {
                e.target.style.transform = "scale(1.1)";
                e.target.style.backgroundColor = "#E5E7EB";
              }
            }}
            onMouseLeave={(e) => {
              if (!isUiDisabled) {
                e.target.style.transform = "scale(1)";
                if (viewMode !== "developed") {
                  e.target.style.backgroundColor = "#F3F4F6";
                }
              }
            }}
          >
            ◆
          </button>

          {/* Profile Selection Dropdown */}
          {viewMode === "developed" && (
            <select
              value={profileMode}
              onChange={(e) => {
                console.log("📏 Profile selected:", e.target.value);
                if (setProfileMode) {
                  setProfileMode(e.target.value);
                }
              }}
              disabled={isUiDisabled}
              style={{
                marginLeft: "6px",
                padding: "2px 6px",
                fontSize: "10px",
                border: "1px solid #D1D5DB",
                borderRadius: "3px",
                backgroundColor: "white",
                color: "#374151",
                cursor: isUiDisabled ? "not-allowed" : "pointer",
                minWidth: "70px",
              }}
              title="Select furnace profile cross-section for detailed analysis"
            >
              <option value="all">All Profiles</option>
              <option value="P1">Profile P1</option>
              <option value="P5">Profile P5</option>
              <option value="P10">Profile P10</option>
              <option value="P15">Profile P15</option>
              <option value="P20">Profile P20</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );
};

export default WearRangeTopbar;