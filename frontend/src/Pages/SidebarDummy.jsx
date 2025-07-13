import React, { useState, useCallback, useMemo, useEffect, useContext } from "react";
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
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { LanguageContext } from "../Components/LanguageContext";

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
  // 🆕 NEW: Gunning data prop for Daily Report integration
  gunningData,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState("3DView");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || {});

  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);

  // Fix 1: Remove user from dependency array and add polling mechanism
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user")) || {};
      setUser(updatedUser);
    };

    // Handle cross-tab changes
    window.addEventListener("storage", handleStorageChange);
    
    // Fix 2: Add polling to detect same-tab changes
    const pollForChanges = setInterval(() => {
      const currentUser = JSON.parse(localStorage.getItem("user")) || {};
      setUser(prevUser => {
        // Only update if there's actually a change
        if (JSON.stringify(prevUser) !== JSON.stringify(currentUser)) {
          return currentUser;
        }
        return prevUser;
      });
    }, 1000); // Check every second

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(pollForChanges);
    };
  }, []); // Empty dependency array

  const isOperator = user.role === "operator";

  useEffect(() => {
    // const savedLang = localStorage.getItem("language") || "en";
    // i18n.changeLanguage(savedLang);
  }, [language]);

  // 🆕 NEW: Check if gunning data exists for Daily Report enhancement
  const hasGunningData = useMemo(() => {
    return !!(gunningData?.bricks || gunningData?.slagLine || gunningData?.screed);
  }, [gunningData]);

  // 🆕 NEW: Calculate total repair areas from gunning data
  const totalRepairAreas = useMemo(() => {
    if (!hasGunningData) return 0;
    
    let total = 0;
    if (gunningData.bricks?.repairProposal?.areas) {
      total += gunningData.bricks.repairProposal.areas.length;
    }
    if (gunningData.slagLine?.repairProposal?.areas) {
      total += gunningData.slagLine.repairProposal.areas.length;
    }
    if (gunningData.screed?.repairProposal?.areas) {
      total += gunningData.screed.repairProposal.areas.length;
    }
    return total;
  }, [gunningData, hasGunningData]);

  // Memoized handlers
  const handleDialogOpen = useCallback(() => setIsDialogOpen(true), []);
  const handleDialogClose = useCallback(() => setIsDialogOpen(false), []);

  const handleScreenChange = useCallback(
    (screen) => {
      setActiveScreen(screen);
      onScreenChange(screen);
    },
    [onScreenChange]
  );

  const handleSetTemplateClick = useCallback(() => {
    if (!selectedFile) return;
    const confirm = window.confirm(
      t("template.confirmSet", { file: selectedFile.name })
    );
    if (confirm) {
      onSetTemplate();
    }
  }, [selectedFile, onSetTemplate, t]);

  const handleGunningClick = useCallback(() => {
    handleScreenChange("Gunning");
    handleDialogOpen();
  }, [handleScreenChange, handleDialogOpen]);

  // 🆕 NEW: Enhanced report click handler with gunning data awareness
  const handleReportClick = useCallback(() => {
    if (hasGunningData) {
      console.log('📊 Creating Daily Report with gunning analysis data');
    } else {
      console.log('📋 Creating standard Daily Report');
    }
    onCreateReportClick();
  }, [onCreateReportClick, hasGunningData]);

  // Memoized progress bar component
  const progressBar = useMemo(
    () =>
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
          <p
            style={{ fontSize: "12px", textAlign: "center", marginTop: "5px" }}
          >
            {t("reconstruction.progress", { progress })}
          </p>
        </div>
      ) : null,
    [isCycling, progress, t]
  );

  // Fix 3: Add isOperator to the dependency array
  const buttonStates = useMemo(
    () => ({
      start: {
        disabled: isCycling || isUiDisabled,
        opacity: isCycling || isUiDisabled ? 0.5 : 1,
      },
      template: {
        disabled: isCycling || isUiDisabled || !selectedFile,
        opacity: isCycling || isUiDisabled || !selectedFile ? 0.5 : 1,
      },
      resetAlarm: { disabled: isUiDisabled, opacity: isUiDisabled ? 0.5 : 1 },
      stop: { disabled: !isCycling, opacity: !isCycling ? 0.5 : 1 },
      reset: {
        disabled: isCycling || isUiDisabled,
        opacity: isCycling || isUiDisabled ? 0.5 : 1,
      },
      screen: { disabled: isUiDisabled },
      action: { disabled: isOperator || isUiDisabled },
      footer: { disabled: isUiDisabled },
    }),
    [isCycling, isUiDisabled, selectedFile, isOperator] // Added isOperator here
  );

  const screenButtons = useMemo(
    () => [
      {
        key: "3DView",
        label: t("screens.3dView"),
        icon: <Monitor size={16} />,
      },
      { key: "Thicknesses", label: t("screens.thicknesses") },
      { key: "Profiles", label: t("screens.profiles") },
      { key: "Comparison", label: t("screens.comparison") },
      {
        key: "Gunning",
        label: t("screens.gunning"),
        icon: <Settings size={16} />,
        onClick: handleGunningClick,
      },
    ],
    [t, handleGunningClick]
  );

  // Memoized alarm states
  const alarmElements = useMemo(
    () => (
      <div style={{ marginTop: "10px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span>{t("robot.label")}:</span>
          <div
            className="dot"
            style={{ backgroundColor: alarmState.robot ? "red" : "green" }}
          />
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span>{t("robot.variator")}:</span>
          <div
            className="dot"
            style={{ backgroundColor: alarmState.variator ? "red" : "green" }}
          />
        </div>
      </div>
    ),
    [alarmState.robot, alarmState.variator, t]
  );

  // 🔄 UPDATED: Enhanced info box content with gunning data status
  const infoBoxContent = useMemo(
    () => (
      <div className="info-box">
        <h3>{t("measurementInfo.title")}</h3>
        <p>{t("measurementInfo.campaign")}: 2023-09-27</p>
        <p>{t("measurementInfo.casts")}: -</p>
        <p>{t("measurementInfo.date")}: 2023-09-27 06:13</p>
        {templateData && (
          <p>
            {t("measurementInfo.template")}: {templateData.name}
          </p>
        )}
        
        {/* 🆕 NEW: Gunning data status for Daily Report */}
        {/* {hasGunningData && (
          <div style={{
            marginTop: "12px",
            padding: "10px",
            backgroundColor: "#d4edda",
            borderRadius: "6px",
            border: "1px solid #c3e6cb"
          }}>
            <p style={{ 
              fontSize: "12px", 
              margin: "0 0 4px 0", 
              color: "#155724",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              🔧 Gunning Analysis Ready
            </p>
            <div style={{ 
              fontSize: "11px", 
              color: "#155724",
              lineHeight: "1.3"
            }}>
              {gunningData.bricks && (
                <div>• Bricks: {gunningData.bricks.repairProposal?.areas?.length || 0} areas</div>
              )}
              {gunningData.slagLine && (
                <div>• Slag Line: {gunningData.slagLine.repairProposal?.areas?.length || 0} areas</div>
              )}
              {gunningData.screed && (
                <div>• Screed: {gunningData.screed.repairProposal?.areas?.length || 0} areas</div>
              )}
              <div style={{ 
                marginTop: "4px", 
                fontWeight: "bold", 
                color: "#0f5132" 
              }}>
                Total: {totalRepairAreas} repair areas
              </div>
            </div>
          </div>
        )} */}
      </div>
    ),
    [templateData, t, hasGunningData, gunningData, totalRepairAreas]
  );

  return (
    <div className="sidebar">
      <div className="sidebar-content-scrollable">
        <div className="main-content">
          {progressBar}

          {/* Cycle */}
          <div>
            <h3 className="section-title">{t("cycle")}</h3>
            <div className="button-group">
              <button
                className="btn"
                onClick={onStartCycle}
                disabled={buttonStates.start.disabled}
                style={{ opacity: buttonStates.start.opacity }}
              >
                <Play size={16} /> {t("common.start")}
              </button>
              <button
                className="btn"
                onClick={handleSetTemplateClick}
                disabled={buttonStates.template.disabled}
                style={{ opacity: buttonStates.template.opacity }}
              >
                <RefreshCw size={16} /> {t("common.template")}
              </button>
              <button
                className="btn"
                onClick={onResetAlarms}
                disabled={buttonStates.resetAlarm.disabled}
                style={{ opacity: buttonStates.resetAlarm.opacity }}
              >
                <BellOff size={16} /> {t("common.resetAlarm")}
              </button>
            </div>
            <div className="button-group">
              <button
                className="btn"
                onClick={onStopCycle}
                disabled={buttonStates.stop.disabled}
                style={{ opacity: buttonStates.stop.opacity }}
              >
                ⏹️ {t("common.stop")}
              </button>
              <button
                className="btn"
                onClick={onResetCycle}
                disabled={buttonStates.reset.disabled}
                style={{ opacity: buttonStates.reset.opacity }}
              >
                ♻️ {t("common.reset")}
              </button>
            </div>

            {alarmElements}
          </div>

          {/* Screens */}
          <div>
            <h3 className="section-title">{t("section.screens")}</h3>
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

          {/* 🔄 UPDATED: Enhanced Actions section with gunning data awareness */}
          <div>
            <h3 className="section-title">{t("actions")}</h3>
            <div className="button-group">
              {/* 🔄 UPDATED: Enhanced Create Report button */}
              <button
                className="btn"
                onClick={handleReportClick}
                disabled={buttonStates.action.disabled}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                title={hasGunningData ? 
                  `Create Daily Report with gunning analysis (${totalRepairAreas} repair areas)` : 
                  "Create standard Daily Report"
                }
              >
                <FileText size={16} /> 
                {t("report.create")}
                {/* 🆕 NEW: Gunning data indicator */}
                {hasGunningData && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#28a745',
                    borderRadius: '50%',
                    border: '1px solid white'
                  }} />
                )}
              </button>
              
              <button className="btn" disabled={buttonStates.action.disabled}>
                <Download size={16} /> {t("report.downloadImages")}
              </button>
            </div>

            {/* 🆕 NEW: Gunning data enhancement notice */}
            {/* {hasGunningData && (
              <div style={{
                marginTop: "8px",
                padding: "8px",
                backgroundColor: "#fff3cd",
                borderRadius: "4px",
                border: "1px solid #ffeaa7",
                fontSize: "11px",
                color: "#856404",
                textAlign: "center"
              }}>
                📊 Daily Report will include gunning analysis
              </div>
            )} */}
          </div>

          {infoBoxContent}
        </div>

        {/* Footer */}
        <div className="footer-buttons">
          <button
            className="footer-btn"
            disabled={buttonStates.footer.disabled}
          >
            {"<"}
          </button>
          <button
            className="footer-btn"
            onClick={handleDialogOpen}
            disabled={buttonStates.footer.disabled}
          >
            📁
          </button>
          <button
            className="footer-btn"
            disabled={buttonStates.footer.disabled}
          >
            {">"}
          </button>
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