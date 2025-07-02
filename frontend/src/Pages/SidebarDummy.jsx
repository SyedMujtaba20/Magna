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

  // Memoized info box content
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
      </div>
    ),
    [templateData, t]
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

          {/* Actions */}
          <div>
            <h3 className="section-title">{t("actions")}</h3>
            <div className="button-group">
              <button
                className="btn"
                onClick={onCreateReportClick}
                disabled={buttonStates.action.disabled}
              >
                <FileText size={16} /> {t("report.create")}
              </button>
              <button className="btn" disabled={buttonStates.action.disabled}>
                <Download size={16} /> {t("report.downloadImages")}
              </button>
            </div>
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