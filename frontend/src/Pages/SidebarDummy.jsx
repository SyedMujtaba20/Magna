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
  // 🆕 NEW: Active screen prop to determine what to capture
  activeScreen,
  // 🆕 NEW: Gunning data prop for Daily Report integration
  gunningData,
  // 🆕 NEW: Thickness data prop for Campaign Report integration
  thicknessData,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentActiveScreen, setCurrentActiveScreen] = useState("3DView");
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

  // Update local active screen state
  useEffect(() => {
    if (activeScreen) {
      setCurrentActiveScreen(activeScreen);
    }
  }, [activeScreen]);

  const isOperator = user.role === "operator";

  useEffect(() => {
    // const savedLang = localStorage.getItem("language") || "en";
    // i18n.changeLanguage(savedLang);
  }, [language]);

  // 🆕 NEW: Check if gunning data exists for Daily Report enhancement
  const hasGunningData = useMemo(() => {
    return !!(gunningData?.bricks || gunningData?.slagLine || gunningData?.screed);
  }, [gunningData]);

  // 🆕 NEW: Check if thickness data exists for Campaign Report enhancement
  const hasThicknessData = useMemo(() => {
    return !!(thicknessData?.comprehensiveAnalysis || thicknessData?.statistics);
  }, [thicknessData]);

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

  // 🆕 NEW: Enhanced image download functionality
  const handleDownloadImages = useCallback(async () => {
    console.log(`📸 [Sidebar] Downloading images for ${currentActiveScreen} screen`);
    
    try {
      if (currentActiveScreen === "DailyReport") {
        await downloadDailyReportImages();
      } else if (currentActiveScreen === "CampaignReport") {
        await downloadCampaignReportImages();
      } else {
        // For other screens, capture the main content area
        await downloadGenericScreenshot();
      }
    } catch (error) {
      console.error('Error downloading images:', error);
      alert('Failed to download images. Please try again.');
    }
  }, [currentActiveScreen]);

  // 🆕 NEW: Download Daily Report images and data
  const downloadDailyReportImages = useCallback(async () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const images = [];
    
    try {
      // 1. Capture full page screenshot
      const fullPageImage = await captureScreenshot('daily-report-content', `daily_report_full_${timestamp}`);
      if (fullPageImage) images.push(fullPageImage);

      // 2. Capture individual section screenshots if gunning data exists
      if (hasGunningData) {
        // Capture gunning analysis screenshots for each section
        const sections = ['bricks', 'slagLine', 'screed'];
        for (const section of sections) {
          if (gunningData[section]?.repairProposal) {
            const sectionElement = document.querySelector(`[data-section="${section}"]`);
            if (sectionElement) {
              const sectionImage = await captureElementScreenshot(
                sectionElement, 
                `daily_report_${section}_${timestamp}`
              );
              if (sectionImage) images.push(sectionImage);
            }
          }
        }

        // 3. Download gunning analysis data as JSON
        await downloadGunningDataAsJson(timestamp);
      }

      // 4. Capture thickness table
      const tableElement = document.querySelector('table');
      if (tableElement) {
        const tableImage = await captureElementScreenshot(
          tableElement, 
          `daily_report_thickness_table_${timestamp}`
        );
        if (tableImage) images.push(tableImage);
      }

      console.log(`✅ Downloaded ${images.length} images for Daily Report`);
      
    } catch (error) {
      console.error('Error capturing Daily Report images:', error);
      throw error;
    }
  }, [hasGunningData, gunningData]);

  // 🆕 NEW: Download Campaign Report images and data
  const downloadCampaignReportImages = useCallback(async () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const images = [];
    
    try {
      // 1. Capture full page screenshot
      const fullPageImage = await captureScreenshot('campaign-report-content', `campaign_report_full_${timestamp}`);
      if (fullPageImage) images.push(fullPageImage);

      // 2. Capture individual charts
      const chartContainers = document.querySelectorAll('.recharts-wrapper');
      for (let i = 0; i < chartContainers.length; i++) {
        const chartImage = await captureElementScreenshot(
          chartContainers[i], 
          `campaign_chart_${i + 1}_${timestamp}`
        );
        if (chartImage) images.push(chartImage);
      }

      // 3. Capture statistics dashboard
      const statsGrid = document.querySelector('[style*="grid-template-columns"]');
      if (statsGrid) {
        const statsImage = await captureElementScreenshot(
          statsGrid, 
          `campaign_statistics_${timestamp}`
        );
        if (statsImage) images.push(statsImage);
      }

      // 4. Download thickness analysis data as JSON
      if (hasThicknessData) {
        await downloadThicknessDataAsJson(timestamp);
      }

      console.log(`✅ Downloaded ${images.length} images for Campaign Report`);
      
    } catch (error) {
      console.error('Error capturing Campaign Report images:', error);
      throw error;
    }
  }, [hasThicknessData, thicknessData]);

  // 🆕 NEW: Generic screenshot for other screens
  const downloadGenericScreenshot = useCallback(async () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    try {
      // Try to find main content area
      const mainContent = document.querySelector('.main-content') || 
                         document.querySelector('[class*="content"]') || 
                         document.querySelector('main') ||
                         document.body;
      
      if (mainContent) {
        await captureElementScreenshot(
          mainContent, 
          `${currentActiveScreen.toLowerCase()}_screenshot_${timestamp}`
        );
        console.log(`✅ Downloaded screenshot for ${currentActiveScreen}`);
      }
    } catch (error) {
      console.error('Error capturing generic screenshot:', error);
      throw error;
    }
  }, [currentActiveScreen]);

  // 🆕 NEW: Helper function to capture screenshot of specific element
  const captureElementScreenshot = useCallback(async (element, filename) => {
    try {
      // Use html2canvas if available, otherwise try canvas API
      if (window.html2canvas) {
        const canvas = await window.html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true,
          allowTaint: true
        });
        
        // Convert to blob and download
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${filename}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png');
        
        return true;
      } else {
        // Fallback: Try to get canvas elements directly
        const canvases = element.querySelectorAll('canvas');
        if (canvases.length > 0) {
          canvases.forEach((canvas, index) => {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}_canvas_${index + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          });
          return true;
        }
        
        console.warn('html2canvas not available and no canvas elements found');
        return false;
      }
    } catch (error) {
      console.error('Error capturing element screenshot:', error);
      return false;
    }
  }, []);

  // 🆕 NEW: Helper function to capture screenshot by element ID/selector
  const captureScreenshot = useCallback(async (selector, filename) => {
    const element = document.getElementById(selector) || document.querySelector(`.${selector}`);
    if (element) {
      return await captureElementScreenshot(element, filename);
    } else {
      console.warn(`Element not found: ${selector}`);
      return false;
    }
  }, [captureElementScreenshot]);

  // 🆕 NEW: Download gunning data as JSON
  const downloadGunningDataAsJson = useCallback(async (timestamp) => {
    try {
      const gunningExport = {
        timestamp: new Date().toISOString(),
        source: 'DailyReport_GunningAnalysis',
        data: gunningData,
        summary: {
          sectionsAnalyzed: Object.keys(gunningData).filter(k => k !== 'screenshots' && gunningData[k]),
          totalRepairAreas: totalRepairAreas,
          totalCost: Object.values(gunningData).reduce((sum, section) => 
            sum + (section?.repairProposal?.total?.cost || 0), 0
          )
        }
      };

      const blob = new Blob([JSON.stringify(gunningExport, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gunning_analysis_data_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Downloaded gunning analysis data');
    } catch (error) {
      console.error('Error downloading gunning data:', error);
    }
  }, [gunningData, totalRepairAreas]);

  // 🆕 NEW: Download thickness data as JSON
  const downloadThicknessDataAsJson = useCallback(async (timestamp) => {
    try {
      const thicknessExport = {
        timestamp: new Date().toISOString(),
        source: 'CampaignReport_ThicknessAnalysis',
        data: thicknessData,
        summary: {
          hasComprehensiveAnalysis: !!thicknessData.comprehensiveAnalysis,
          totalCells: thicknessData.statistics?.totalCells || 0,
          criticalAreas: thicknessData.statistics?.criticalAreas || 0,
          averageThickness: thicknessData.statistics?.averageThickness || 0
        }
      };

      const blob = new Blob([JSON.stringify(thicknessExport, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thickness_analysis_data_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Downloaded thickness analysis data');
    } catch (error) {
      console.error('Error downloading thickness data:', error);
    }
  }, [thicknessData]);

  // Memoized handlers
  const handleDialogOpen = useCallback(() => setIsDialogOpen(true), []);
  const handleDialogClose = useCallback(() => setIsDialogOpen(false), []);

  const handleScreenChange = useCallback(
    (screen) => {
      setCurrentActiveScreen(screen);
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

  // 🔄 UPDATED: Enhanced info box content with download status
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
        
        {/* 🆕 NEW: Download capability indicator */}
        {(currentActiveScreen === "DailyReport" || currentActiveScreen === "CampaignReport") && (
          <div style={{
            marginTop: "12px",
            padding: "8px",
            backgroundColor: "#e3f2fd",
            borderRadius: "6px",
            border: "1px solid #2196f3"
          }}>
            <p style={{ 
              fontSize: "11px", 
              margin: "0", 
              color: "#1565c0",
              fontWeight: "bold"
            }}>
              📸 Image Download Available
            </p>
            <div style={{ fontSize: "10px", color: "#1565c0", marginTop: "2px" }}>
              {currentActiveScreen === "DailyReport" ? "Screenshots + Gunning Data" : "Charts + Analysis Data"}
            </div>
          </div>
        )}
      </div>
    ),
    [templateData, t, currentActiveScreen]
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
                  className={`btn ${currentActiveScreen === key ? "active" : ""}`}
                  onClick={onClick || (() => handleScreenChange(key))}
                  disabled={buttonStates.screen.disabled}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* 🔄 UPDATED: Enhanced Actions section with intelligent download */}
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
              
              {/* 🔄 UPDATED: Enhanced Download Images button using simplified approach */}
              <button 
                className="btn" 
                onClick={() => {
                  if (currentActiveScreen === "DailyReport" && hasGunningData) {
                    // Download gunning images for Daily Report
                    downloadGunningImages(gunningData?.screenshots || {});
                  } else if (currentActiveScreen === "CampaignReport") {
                    // Download campaign report data and screenshots
                    handleDownloadImages();
                  } else {
                    // Generic download for other screens
                    handleDownloadImages();
                  }
                }}
                disabled={buttonStates.action.disabled}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                title={
                  currentActiveScreen === "DailyReport" ? "Download Daily Report gunning images and data" :
                  currentActiveScreen === "CampaignReport" ? "Download Campaign Report charts and analysis data" :
                  `Download ${currentActiveScreen} screenshot`
                }
              >
                <Download size={16} /> 
                {currentActiveScreen === "DailyReport" || currentActiveScreen === "CampaignReport" 
                  ? "Download Report Images" 
                  : t("report.downloadImages")
                }
                
                {/* 🆕 NEW: Enhanced download indicator */}
                {(currentActiveScreen === "DailyReport" && hasGunningData) || 
                 (currentActiveScreen === "CampaignReport" && hasThicknessData) ? (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#007bff',
                    borderRadius: '50%',
                    border: '1px solid white'
                  }} />
                ) : null}
              </button>
            </div>

            {/* 🆕 NEW: Download status indicator */}
            {(currentActiveScreen === "DailyReport" || currentActiveScreen === "CampaignReport") && (
              <div style={{
                marginTop: "8px",
                padding: "6px 8px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                border: "1px solid #dee2e6",
                fontSize: "10px",
                color: "#495057",
                textAlign: "center"
              }}>
                📸 {currentActiveScreen === "DailyReport" ? 
                  `Gunning Images${hasGunningData ? ' + Data' : ''} available` : 
                  `Charts${hasThicknessData ? ' + Data' : ''} available`
                }
              </div>
            )}
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

// 🆕 NEW: Download gunning images function (from your existing code)
export const downloadGunningImages = (gunningWearImages) => {
  console.log('📸 [Sidebar] Downloading gunning images:', gunningWearImages);
  
  const sections = ["bricks", "slagLine", "screed"];
  let downloadCount = 0;
  
  sections.forEach((section) => {
    const imageObj = gunningWearImages[section];
    const dataUrl = imageObj?.dataUrl;
    if (dataUrl) {
      const link = document.createElement("a");
      link.href = dataUrl.replace("image/png", "image/jpeg"); // Optional: convert MIME to JPEG if needed
      link.download = `${section}_gunning_analysis.jpg`; // Filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      downloadCount++;
      console.log(`✅ Downloaded gunning image for ${section}`);
    } else {
      console.log(`⚠️ No image data available for ${section}`);
    }
  });
  
  if (downloadCount > 0) {
    console.log(`🎉 Successfully downloaded ${downloadCount} gunning images`);
    alert(`Downloaded ${downloadCount} gunning analysis images!`);
  } else {
    console.log('❌ No gunning images were available for download');
    alert('No gunning images available for download. Please run gunning analysis first.');
  }
};

export default Sidebar;