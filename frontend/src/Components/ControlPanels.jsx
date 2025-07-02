import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from 'i18next';

const ControlPanels = ({
  activeScreen,
  currentConfig,
  parameters,
  handleParameterChange,
  incrementValue,
  repairProposal,
  materialDensity,
  isUiDisabled,
  isProcessing,
}) => {
    const { t } = useTranslation();
  
    useEffect(() => {
      const savedLang = localStorage.getItem("language") || "en";
      i18n.changeLanguage(savedLang);
    }, []);
  return (
    <div style={{ display: "flex", gap: "10px", minHeight: "40vh" }}>
      <div
        style={{
          flex: 1,
          backgroundColor: "#e5e5e5",
          border: "2px solid #ccc",
          borderRadius: "8px",
          padding: "15px",
          overflow: "visible",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "14px",
            fontWeight: "bold",
            textAlign: "center",
            color: "#333",
          }}
        >
          {activeScreen.toUpperCase()} {t("comparison.analysisSettings")}
          {/* ANALYSIS SETTINGS */}
        </h3>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            {t("comparison.repairMaterial")}
            {/* Repair material: */}
          </label>
          <select
            style={{
              width: "100%",
              padding: "6px 8px",
              border: "1px solid #999",
              borderRadius: "4px",
              backgroundColor: "white",
              fontSize: "12px",
            }}
            value={parameters.repairMaterial}
            onChange={(e) =>
              handleParameterChange("repairMaterial", e.target.value)
            }
            disabled={isUiDisabled}
          >
            {/* <option value="Gunnimag C2">Gunnimag C2</option>
            <option value="Standard Gunite">Standard Gunite</option>
            <option value="High-Density">High-Density</option>
            <option value="Low-Thermal">Low-Thermal</option> */}

            <option value="Gunnimag C2">
              {t("comparison.materials.gunnimagC2")}
            </option>
            <option value="Standard Gunite">
              {t("comparison.materials.standardGunite")}
            </option>
            <option value="High-Density">
              {t("comparison.materials.highDensity")}
            </option>
            <option value="Low-Thermal">
              {t("comparison.materials.lowThermal")}
            </option>
          </select>
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            {currentConfig.thresholdLabel}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <input
              type="number"
              style={{
                flex: 1,
                padding: "6px 8px",
                border: "1px solid #999",
                borderRadius: "4px",
                backgroundColor: "white",
                fontSize: "12px",
              }}
              value={parameters.wearThreshold}
              onChange={(e) =>
                handleParameterChange("wearThreshold", Number(e.target.value))
              }
              min="0"
              step="1"
              disabled={isUiDisabled || isProcessing}
            />
            <button
              style={{
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "3px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
              }}
              onClick={() => incrementValue("wearThreshold", 1)}
              disabled={isUiDisabled || isProcessing}
            >
              ▲
            </button>
            <button
              style={{
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "3px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "12px",
              }}
              onClick={() => incrementValue("wearThreshold", -1)}
              disabled={isUiDisabled || isProcessing}
            >
              ▼
            </button>
            <span style={{ fontSize: "11px", color: "#666", minWidth: "20px" }}>
              {currentConfig.unit}
            </span>
          </div>
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            {t("comparison.distanceBetweenAreas")}
            {/* Distance between areas: */}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="range"
              style={{ flex: 1 }}
              min="0.1"
              max="2.0"
              step="0.05"
              value={parameters.distanceBetweenAreas}
              onChange={(e) =>
                handleParameterChange(
                  "distanceBetweenAreas",
                  Number(e.target.value)
                )
              }
              disabled={isUiDisabled || isProcessing}
            />
            <input
              type="number"
              style={{
                width: "60px",
                padding: "4px 6px",
                border: "1px solid #999",
                borderRadius: "4px",
                backgroundColor: "white",
                fontSize: "11px",
              }}
              value={parameters.distanceBetweenAreas}
              onChange={(e) =>
                handleParameterChange(
                  "distanceBetweenAreas",
                  Number(e.target.value)
                )
              }
              disabled={isUiDisabled || isProcessing}
              min="0.1"
              step="0.05"
            />
            <span style={{ fontSize: "11px", color: "#666", minWidth: "40px" }}>
              {t("units.meters")}
            </span>
          </div>
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "5px",
              fontSize: "12px",
              fontWeight: "500",
              color: "#333",
            }}
          >
            {t("comparison.minAreaSize")}
            {/* Minimum area size: */}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="range"
              style={{ flex: 1 }}
              min="10"
              max="500"
              step="10"
              value={parameters.minimumAreaSize}
              onChange={(e) =>
                handleParameterChange("minimumAreaSize", Number(e.target.value))
              }
              disabled={isUiDisabled || isProcessing}
            />
            <input
              type="number"
              style={{
                width: "60px",
                padding: "4px 6px",
                border: "1px solid #999",
                borderRadius: "4px",
                backgroundColor: "white",
                fontSize: "11px",
              }}
              value={parameters.minimumAreaSize}
              onChange={(e) =>
                handleParameterChange("minimumAreaSize", Number(e.target.value))
              }
              disabled={isUiDisabled || isProcessing}
              min="10"
              step="10"
            />
            <span style={{ fontSize: "12px", color: "#666", minWidth: "40px" }}>
              {/* points
               */}
              {t("units.points")}
            </span>
          </div>
        </div>
        <button
          style={{
            backgroundColor: "#666",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600",
            width: "100%",
          }}
          disabled={isUiDisabled}
          onClick={() => {
            console.log("Parameters accepted:", parameters);
            alert("Parameters accepted successfully!");
          }}
        >
          {/* Accept */}
          {t("common.accept")}
        </button>
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: "#e5e5e5",
          border: "2px solid #ccc",
          borderRadius: "8px",
          padding: "15px",
        }}
      >
        <h3
          style={{
            margin: "0 0 20px 0",
            fontSize: "14px",
            fontWeight: "bold",
            textAlign: "center",
            color: "#333",
          }}
        >
          {t("repair.title")}
        </h3>

        <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
          <strong>{t("repair.material")}:</strong> {parameters.repairMaterial}
        </div>
        <div style={{ fontSize: "12px", marginBottom: "10px", color: "#333" }}>
          <strong>{t("repair.density")}:</strong> {materialDensity} g/cm³
        </div>
        <div style={{ fontSize: "12px", marginBottom: "20px", color: "#333" }}>
          <strong>{t("repair.section")}:</strong> {activeScreen}
        </div>
        <div
          style={{
            borderTop: "1px solid #999",
            paddingTop: "15px",
            backgroundColor: "white",
            padding: "15px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        >
          {repairProposal.areas.length > 0 ? (
            repairProposal.areas.map((area) => (
              <div
                key={area.id}
                style={{
                  marginBottom: "12px",
                  fontSize: "12px",
                  color: "#d32f2f",
                  fontWeight: "bold",
                }}
              >
                <span style={{ color: "#d32f2f" }}>Area {area.id}:</span>{" "}
                {area.volume.toFixed(2)}m³ | {area.weight.toFixed(2)} Kg |{" "}
                {area.pointCount} points | Avg Wear: {area.avgWear.toFixed(2)}{" "}
                cm
              </div>
            ))
          ) : (
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                fontStyle: "italic",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              {t("repair.noAreas")}
              {/* No areas requiring repair with current parameters */}
            </div>
          )}
          <div
            style={{
              borderTop: "1px solid #ddd",
              paddingTop: "12px",
              marginTop: "15px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#333",
            }}
          >
            {/* <strong>TOTAL:</strong>{" "} */}
            <strong>{t("common.total")}:</strong>{" "}
            <span style={{ color: "#d32f2f" }}>
              {repairProposal.total.volume.toFixed(2)}m³ |{" "}
              {repairProposal.total.weight.toFixed(2)} Kg
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanels;
