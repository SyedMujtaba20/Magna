import React, { useState, useCallback, useMemo } from "react";
import {
  Play,
  RefreshCw,
  BellOff,
  Monitor,
  Settings,
  FileText,
  Download,
} from "lucide-react";
import "./Sidebar.css";
import FurnaceDialog from "../Components/FurnaceDialog";

const Sidebar = ({
  onStartCycle,
  onStopCycle,
  onResetCycle,
  onSetTemplate,
  onResetAlarms,
  isCycling,
  progress,
  isUiDisabled,
  templateData,
  alarmState,
  selectedFile,
  onScreenChange,
    onCreateReportClick,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState("3DView");

  // Memoized handlers
  const handleDialogOpen = useCallback(() => setIsDialogOpen(true), []);
  const handleDialogClose = useCallback(() => setIsDialogOpen(false), []);

  const handleScreenChange = useCallback((screen) => {
    setActiveScreen(screen);
    onScreenChange(screen);
  }, [onScreenChange]);

  const handleSetTemplateClick = useCallback(() => {
    if (!selectedFile) return;
    const confirm = window.confirm(
      `Do you want to set "${selectedFile.name}" as the new template?`
    );
    if (confirm) {
      onSetTemplate();
    }
  }, [selectedFile, onSetTemplate]);

  const handleGunningClick = useCallback(() => {
    handleScreenChange("Gunning");
    handleDialogOpen();
  }, [handleScreenChange, handleDialogOpen]);

  // Memoized progress bar component
  const progressBar = useMemo(() => (
    isCycling ? (
      <div style={{ width: "100%", marginBottom: "10px" }}>
        <div
          style={{
            height: "8px",
            background: "#ccc",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#4ade80",
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <p style={{ fontSize: "12px", textAlign: "center", marginTop: "5px" }}>
          Reconstruction in progress: {progress}%
        </p>
      </div>
    ) : null
  ), [isCycling, progress]);

  // Memoized button states
  const buttonStates = useMemo(() => ({
    start: { disabled: isCycling || isUiDisabled, opacity: isCycling || isUiDisabled ? 0.5 : 1 },
    template: { disabled: isCycling || isUiDisabled || !selectedFile, opacity: isCycling || isUiDisabled || !selectedFile ? 0.5 : 1 },
    resetAlarm: { disabled: isUiDisabled, opacity: isUiDisabled ? 0.5 : 1 },
    stop: { disabled: !isCycling, opacity: !isCycling ? 0.5 : 1 },
    reset: { disabled: isCycling || isUiDisabled, opacity: isCycling || isUiDisabled ? 0.5 : 1 },
    screen: { disabled: isUiDisabled },
    action: { disabled: isUiDisabled },
    footer: { disabled: isUiDisabled },
  }), [isCycling, isUiDisabled, selectedFile]);

  // Memoized screen buttons
  const screenButtons = useMemo(() => [
    { key: "3DView", label: "3D View", icon: <Monitor size={16} /> },
    { key: "Thicknesses", label: "Thicknesses" },
    { key: "Profiles", label: "Profiles" },
    { key: "Comparison", label: "Comparison" },
    { key: "Gunning", label: "Gunning", icon: <Settings size={16} />, onClick: handleGunningClick },
  ], [handleGunningClick]);

  // Memoized alarm states
  const alarmElements = useMemo(() => (
    <div style={{ marginTop: "10px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <span>Robot:</span>
        <div
          className="dot"
          style={{ backgroundColor: alarmState.robot ? "red" : "green" }}
        />
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <span>Variator:</span>
        <div
          className="dot"
          style={{ backgroundColor: alarmState.variator ? "red" : "green" }}
        />
      </div>
    </div>
  ), [alarmState.robot, alarmState.variator]);

  // Memoized info box content
  const infoBoxContent = useMemo(() => (
    <div className="info-box">
      <h3>Measurement Info</h3>
      <p>Campaign: 2023-09-27</p>
      <p>No. of Casts: -</p>
      <p>Date: 2023-09-27 06:13</p>
      {templateData && <p>Template: {templateData.name}</p>}
    </div>
  ), [templateData]);

  return (
    <div className="sidebar">
      <div className="sidebar-content-scrollable">
        <div className="main-content">
          {progressBar}

          {/* Cycle */}
          <div>
            <h3 className="section-title">Cycle</h3>
            <div className="button-group">
              <button
                className="btn"
                onClick={onStartCycle}
                disabled={buttonStates.start.disabled}
                style={{ opacity: buttonStates.start.opacity }}
              >
                <Play size={16} /> Start
              </button>
              <button
                className="btn"
                onClick={handleSetTemplateClick}
                disabled={buttonStates.template.disabled}
                style={{ opacity: buttonStates.template.opacity }}
              >
                <RefreshCw size={16} /> Template
              </button>
              <button
                className="btn"
                onClick={onResetAlarms}
                disabled={buttonStates.resetAlarm.disabled}
                style={{ opacity: buttonStates.resetAlarm.opacity }}
              >
                <BellOff size={16} /> Reset Alarm
              </button>
            </div>
            <div className="button-group">
              <button
                className="btn"
                onClick={onStopCycle}
                disabled={buttonStates.stop.disabled}
                style={{ opacity: buttonStates.stop.opacity }}
              >
                ⏹️ Stop
              </button>
              <button
                className="btn"
                onClick={onResetCycle}
                disabled={buttonStates.reset.disabled}
                style={{ opacity: buttonStates.reset.opacity }}
              >
                ♻️ Reset
              </button>
            </div>

            {alarmElements}
          </div>

          {/* Screens */}
          <div>
            <h3 className="section-title">Screens</h3>
            <div className="button-group">
              {screenButtons.map(({ key, label, icon, onClick }) => (
                <button
                  key={key}
                  className={`btn ${activeScreen === key ? "active" : ""}`}
                  onClick={onClick || (() => handleScreenChange(key))}
                  disabled={buttonStates.screen.disabled}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="section-title">Actions</h3>
            <div className="button-group">
              <button className="btn" onClick={onCreateReportClick}  disabled={buttonStates.action.disabled}>
                <FileText size={16} /> Create Report
              </button>
              <button className="btn" disabled={buttonStates.action.disabled}>
                <Download size={16} /> Download Images
              </button>
            </div>
          </div>

          {infoBoxContent}
        </div>

        {/* Footer */}
        <div className="footer-buttons">
          <button className="footer-btn" disabled={buttonStates.footer.disabled}>{"<"}</button>
          <button className="footer-btn" onClick={handleDialogOpen} disabled={buttonStates.footer.disabled}>📁</button>
          <button className="footer-btn" disabled={buttonStates.footer.disabled}>{">"}</button>
        </div>
      </div>

      {/* Furnace Dialog */}
      {/* {isDialogOpen && (
        <FurnaceDialog isOpen={isDialogOpen} onClose={handleDialogClose} />
      )} */}
    </div>
  );
};

export default Sidebar;