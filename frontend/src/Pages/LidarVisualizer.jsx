import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useContext,
} from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import Sidebar from "./SidebarDummy";
import GradientScale from "../Components/GradientScale";
import ThumbnailViewer from "../Components/ThumbnailViewer";
import ThicknessesScreen from "../Components/ThicknessesScreen";
import ProfilesScreen from "../Components/ProfilesScreen";
import ComparisonScreen from "../Components/ComparisonScreen";
import GunningScreen from "../Components/GunningScreen";
import DailyReportScreen from "../Components/DailyReportScreen";
import CampaignReportScreen from "../Components/CampaignReportScreen";
import ErrorBoundary from "../Components/ErrorBoundary";
import ThreeSceneManager from "../Components/ThreeSceneManager";
import Header from "../Components/Header";
import Toolbar3DView from "../Components/Toolbar3DView";
import ReportDialog from "../Components/ReportDialog";
import useFileProcessing from "../Components/useFileProcessing";
import useControls from "../Components/useControls";
import styles from "./LidarStyles";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { LanguageContext } from "../Components/LanguageContext";
import WearRangeTopbar from "../Components/WearRangeTopbar";

// Memoized zoom button styles to prevent recreation
const zoomButtonStyle = {
  backgroundColor: "#3B82F6",
  color: "white",
  border: "none",
  borderRadius: "4px",
  padding: "6px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const zoomPanelStyle = {
  position: "absolute",
  bottom: "10px",
  right: "10px",
  display: "flex",
  gap: "8px",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  padding: "8px",
  borderRadius: "6px",
  opacity: 1,
};

const LidarVisualizer = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFurnace, setSelectedFurnace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataStats, setDataStats] = useState({
    min: 0,
    max: 10,
    dataMin: 0,
    dataMax: 10,
  });
  const [globalDataRange, setGlobalDataRange] = useState({
    min: Infinity,
    max: -Infinity,
    isInitialized: false,
  });
  const [useGlobalScaling, setUseGlobalScaling] = useState(true);
  const [fileDataCache, setFileDataCache] = useState(new Map());
  const [previewScenes, setPreviewScenes] = useState(new Map());
  const [isCycling, setIsCycling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [templateData, setTemplateData] = useState(null);
  const [profileMode, setProfileMode] = useState("all");
  const [alarmState, setAlarmState] = useState({
    robot: false,
    variator: false,
  });
  const [isUiDisabled, setIsUiDisabled] = useState(false);
  const [activeScreen, setActiveScreen] = useState("3DView");
  const [wearRange, setWearRange] = useState("all");
  const [viewMode, setViewMode] = useState("3D");
  const [showTemplate, setShowTemplate] = useState(true);
  const [showFurnace, setShowFurnace] = useState(true);
  const [selectedArea, setSelectedArea] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lensMode, setLensMode] = useState("normal");
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [campaignInfo, setCampaignInfo] = useState({
    campaignName: "2023-09-27",
    startDate: "2023-09-27",
    endDate: "2023-09-27",
  });

  // 🆕 NEW: Gunning data management for Daily Report integration
  const [gunningData, setGunningData] = useState({
    bricks: null,
    slagLine: null,
    screed: null,
    screenshots: {
      bricks: null,
      slagLine: null, 
      screed: null
    }
  });

  const previewCanvasRefs = useRef(new Map());
  const { language } = useContext(LanguageContext);
  const { t } = useTranslation();

  // Debug activeScreen changes
  useEffect(() => {
    console.log("Active screen changed:", activeScreen);
  }, [activeScreen]);

  // 🆕 NEW: Debug gunning data changes
  useEffect(() => {
    console.log('🔧 Gunning data updated for Daily Report:', gunningData);
  }, [gunningData]);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language]);

  const { mainCanvasRef, containerRef, zoomIn, zoomOut } =
    useControls(isUiDisabled);

  const {
    handleFolderChange,
    handleSetTemplate,
    handleStartCycle,
    handleStopCycle,
    handleResetCycle,
    handleResetAlarms,
  } = useFileProcessing({
    files,
    setFiles,
    setSelectedFile,
    setGlobalDataRange,
    setFileDataCache,
    setPreviewScenes,
    setLoading,
    setIsCycling,
    setIsUiDisabled,
    setProgress,
    setTemplateData,
    setAlarmState,
    selectedFile,
    fileDataCache,
  });

  // 🆕 NEW: Handle gunning data updates from GunningScreen
  const handleGunningDataUpdate = useCallback((section, data, screenshot = null) => {
    console.log(`📊 Updating gunning data for Daily Report - ${section}:`, data);
    
    setGunningData(prev => ({
      ...prev,
      [section]: {
        ...data,
        timestamp: Date.now(),
        section: section
      },
      screenshots: {
        ...prev.screenshots,
        [section]: screenshot
      }
    }));
  }, []);

  // 🆕 NEW: Generate canvas screenshot for Daily Report
  const captureCanvasScreenshot = useCallback((canvasRef, filename) => {
    if (!canvasRef?.current) return null;
    
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      return {
        dataUrl,
        filename: `${filename}_${Date.now()}.png`,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to capture screenshot for Daily Report:', error);
      return null;
    }
  }, []);

  // 🆕 NEW: Check if gunning data exists for Daily Report
  const hasGunningData = useMemo(() => {
    return !!(gunningData.bricks || gunningData.slagLine || gunningData.screed);
  }, [gunningData]);

  // 🆕 NEW: Transform gunning data for Daily Report format
  const gunningRepairProposals = useMemo(() => {
    const proposals = {};
    
    if (gunningData.bricks?.repairProposal) {
      proposals.Bricks = `Gunning Analysis: ${gunningData.bricks.repairProposal.areas.length} repair areas identified. ` +
        `Total cost: $${gunningData.bricks.repairProposal.total.cost.toFixed(0)}. ` +
        `Material: ${gunningData.bricks.repairProposal.total.material}.`;
    }
    
    if (gunningData.slagLine?.repairProposal) {
      proposals["Slag Line"] = `Gunning Analysis: ${gunningData.slagLine.repairProposal.areas.length} repair areas identified. ` +
        `Total cost: $${gunningData.slagLine.repairProposal.total.cost.toFixed(0)}. ` +
        `Material: ${gunningData.slagLine.repairProposal.total.material}.`;
    }
    
    if (gunningData.screed?.repairProposal) {
      proposals.Screed = `Gunning Analysis: ${gunningData.screed.repairProposal.areas.length} repair areas identified. ` +
        `Total cost: $${gunningData.screed.repairProposal.total.cost.toFixed(0)}. ` +
        `Material: ${gunningData.screed.repairProposal.total.material}.`;
    }
    
    return proposals;
  }, [gunningData]);

  // 🆕 NEW: Create wear images from gunning screenshots
  const gunningWearImages = useMemo(() => {
    const images = {};
    
    if (gunningData.screenshots.bricks) {
      images.bricks = gunningData.screenshots.bricks.dataUrl;
    }
    if (gunningData.screenshots.slagLine) {
      images.slagLine = gunningData.screenshots.slagLine.dataUrl;
    }
    if (gunningData.screenshots.screed) {
      images.screed = gunningData.screenshots.screed.dataUrl;
    }
    
    return images;
  }, [gunningData.screenshots]);

  // 🔄 UPDATED: Enhanced thickness table data with gunning analysis
  const thicknessTableData = useMemo(() => {
    const baseData = {
      Bricks: [85, 82, 80],
      "Slag Line": [60, 62, 58],
      Screed: [70, 65, 68], // Changed from "Slopes" to "Screed" to match gunning
    };

    // Add gunning analysis data if available
    if (hasGunningData) {
      if (gunningData.bricks?.wornPoints) {
        baseData.Bricks.push(`Gunning: ${gunningData.bricks.wornPoints.length} worn points`);
      }
      if (gunningData.slagLine?.wornPoints) {
        baseData["Slag Line"].push(`Gunning: ${gunningData.slagLine.wornPoints.length} worn points`);
      }
      if (gunningData.screed?.wornPoints) {
        baseData.Screed.push(`Gunning: ${gunningData.screed.wornPoints.length} worn points`);
      }
    }

    return baseData;
  }, [hasGunningData, gunningData]);

  // 🔄 UPDATED: Enhanced repair proposals with gunning data
  const repairProposals = useMemo(() => {
    const baseProposals = {
      Bricks: t("dailyReport.repairProposals.bricks"),
      "Slag Line": t("dailyReport.repairProposals.slagline"),
      Screed: t("dailyReport.repairProposals.slopes"), // Using slopes translation for now
    };

    // Override with gunning data if available
    if (hasGunningData) {
      return {
        ...baseProposals,
        ...gunningRepairProposals
      };
    }

    return baseProposals;
  }, [t, hasGunningData, gunningRepairProposals]);

  const thicknessGraphs = useMemo(() => {
    return {
      Bricks: [
        { day: "Day 1", thickness: 90 },
        { day: "Day 5", thickness: 85 },
        { day: "Day 10", thickness: 80 },
      ],
      "Slag Line": [
        { day: "Day 1", thickness: 65 },
        { day: "Day 5", thickness: 63 },
        { day: "Day 10", thickness: 60 },
      ],
      Screed: [
        { day: "Day 1", thickness: 70 },
        { day: "Day 5", thickness: 68 },
        { day: "Day 10", thickness: 66 },
      ],
    };
  }, []);

  const handleScreenChange = useCallback((screen) => {
    setActiveScreen(screen);
    setWearRange("all");
    setViewMode("3D");
    setSelectedArea(null);
  }, []);

  // 🔄 UPDATED: Sidebar props with gunning status for Daily Report
  const sidebarProps = useMemo(
    () => ({
      onStartCycle: handleStartCycle,
      onStopCycle: handleStopCycle,
      onResetCycle: handleResetCycle,
      onSetTemplate: handleSetTemplate,
      onResetAlarms: handleResetAlarms,
      onScreenChange: handleScreenChange,
      isCycling,
      progress,
      isUiDisabled,
      templateData,
      alarmState,
      selectedFile,
      selectedFurnace,
      setSelectedFurnace: setSelectedFurnace || (() => {}),
      onCreateReportClick: () => setIsReportDialogOpen(true),
      // 🆕 NEW: Gunning data status for sidebar info
      gunningData: hasGunningData ? gunningData : null,
    }),
    [
      handleStartCycle,
      handleStopCycle,
      handleResetCycle,
      handleSetTemplate,
      handleResetAlarms,
      handleScreenChange,
      isCycling,
      progress,
      isUiDisabled,
      templateData,
      alarmState,
      selectedFile,
      selectedFurnace,
      hasGunningData,
      gunningData,
    ]
  );

  const threeSceneProps = useMemo(
    () => ({
      mainCanvasRef,
      containerRef,
      selectedFile,
      fileDataCache,
      useGlobalScaling,
      globalDataRange,
      wearRange,
      viewMode,
      profileMode,
      showTemplate,
      showFurnace,
      selectedFurnace,
      activeScreen,
      templateData,
      setDataStats,
      isUiDisabled,
      selectedArea,
      zoomLevel,
      lensMode,
    }),
    [
      mainCanvasRef,
      containerRef,
      selectedFile,
      fileDataCache,
      useGlobalScaling,
      globalDataRange,
      wearRange,
      viewMode,
      profileMode,
      showTemplate,
      showFurnace,
      selectedFurnace,
      activeScreen,
      templateData,
      isUiDisabled,
      selectedArea,
      zoomLevel,
      lensMode,
    ]
  );

  const toolbarProps = useMemo(
    () => ({
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
      zoomLevel,
      setZoomLevel,
      lensMode,
      setLensMode,
    }),
    [
      wearRange,
      viewMode,
      showTemplate,
      showFurnace,
      selectedArea,
      isUiDisabled,
      templateData,
      zoomLevel,
      lensMode,
    ]
  );

  // 🔄 UPDATED: Enhanced renderScreenContent with gunning integration
  const renderScreenContent = useMemo(() => {
    const screenProps = {
      fileDataCache,
      selectedFile,
      selectedFurnace,
      isUiDisabled,
      files,
    };

    switch (activeScreen) {
      case "Thicknesses":
        return (
          <ErrorBoundary>
            <ThicknessesScreen {...screenProps} />
          </ErrorBoundary>
        );
      case "Profiles":
        return (
          <ErrorBoundary>
            <ProfilesScreen {...screenProps} />
          </ErrorBoundary>
        );
      case "Comparison":
        return (
          <ErrorBoundary>
            <ComparisonScreen
              files={files}
              templateData={templateData}
              setActiveScreen={setActiveScreen}
              {...screenProps}
            />
          </ErrorBoundary>
        );
      case "Gunning":
        return (
          <ErrorBoundary>
            <GunningScreen 
              {...screenProps}
              // 🆕 NEW: Pass gunning-specific props for Daily Report integration
              onDataUpdate={handleGunningDataUpdate}
              onCaptureScreenshot={captureCanvasScreenshot}
              currentGunningData={gunningData}
            />
          </ErrorBoundary>
        );
      case "DailyReport":
        return (
          <ErrorBoundary>
            <DailyReportScreen
              campaignInfo={campaignInfo}
              wearImage="/assets/wear-image.png"
              thicknessTableData={thicknessTableData}
              repairProposals={repairProposals}
              // 🆕 NEW: Pass gunning data to Daily Report
              gunningData={hasGunningData ? gunningData : null}
              gunningWearImages={gunningWearImages}
              hasGunningAnalysis={hasGunningData}
            />
          </ErrorBoundary>
        );
      case "CampaignReport":
        return (
          <ErrorBoundary>
            <CampaignReportScreen
              campaignInfo={campaignInfo}
              thicknessGraphs={thicknessGraphs}
              // 🆕 NEW: Pass gunning data to Campaign Report if needed
              gunningData={hasGunningData ? gunningData : null}
            />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  }, [
    activeScreen,
    fileDataCache,
    selectedFile,
    selectedFurnace,
    isUiDisabled,
    files,
    templateData,
    campaignInfo,
    thicknessTableData,
    repairProposals,
    thicknessGraphs,
    // 🆕 NEW: Gunning dependencies for Daily Report
    handleGunningDataUpdate,
    captureCanvasScreenshot,
    gunningData,
    hasGunningData,
    gunningWearImages,
  ]);

  const loadingElement = useMemo(
    () => (loading ? <div style={styles.loading}>Loading...</div> : null),
    [loading]
  );

  const noFileElement = useMemo(
    () =>
      !selectedFile && files.length === 0 ? (
        <div style={styles.noFileMessage}>
          <div style={{ marginBottom: "10px", fontSize: "18px" }}>📁</div>
          <div>{t("lidar.selectFolder")}</div>
        </div>
      ) : null,
    [selectedFile, files.length, t]
  );

  const gradientScaleElement = useMemo(
    () =>
      selectedFile ? (
        <div style={styles.gradientScale}>
          <GradientScale />
        </div>
      ) : null,
    [selectedFile]
  );

  const thumbnailViewerElement = useMemo(
    () =>
      files.length > 0 && activeScreen === "3DView" ? (
        <ThumbnailViewer
          files={files}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          previewCanvasRefs={previewCanvasRefs}
          fileDataCache={fileDataCache}
          useGlobalScaling={useGlobalScaling}
          globalDataRange={globalDataRange}
          disabled={isUiDisabled}
        />
      ) : null,
    [
      files,
      activeScreen,
      selectedFile,
      fileDataCache,
      useGlobalScaling,
      globalDataRange,
      isUiDisabled,
    ]
  );

  return (
    <div style={styles.container}>
      <Header
        files={files}
        setFiles={setFiles}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        handleFolderChange={handleFolderChange}
        useGlobalScaling={useGlobalScaling}
        setUseGlobalScaling={setUseGlobalScaling}
        isUiDisabled={isUiDisabled}
        selectedFurnace={selectedFurnace}
        setSelectedFurnace={setSelectedFurnace}
      />
      <div style={styles.contentArea}>
        <Sidebar {...sidebarProps} />
        <div style={styles.mainContent}>
          {activeScreen === "3DView" && (
            <div style={styles.visualization}>
              <WearRangeTopbar
                selectedArea={selectedArea}
                setSelectedArea={setSelectedArea}
                dataStats={dataStats}
                wearRange={wearRange}
                setWearRange={setWearRange}
                viewMode={viewMode}
                setViewMode={setViewMode}
                profileMode={profileMode}
                setProfileMode={setProfileMode}
                isUiDisabled={isUiDisabled}
                selectedFile={selectedFile}
                fileDataCache={fileDataCache}
                currentDate={campaignInfo.campaignName}
              />

              <div
                ref={containerRef}
                style={{
                  ...styles.canvasContainer,
                  marginTop: "60px",
                }}
              >
                <ThreeSceneManager {...threeSceneProps} />
                <Toolbar3DView {...toolbarProps} />
                {loadingElement}
                {noFileElement}
                <div style={zoomPanelStyle}>
                  <button
                    onClick={zoomIn}
                    disabled={isUiDisabled}
                    style={zoomButtonStyle}
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    onClick={zoomOut}
                    disabled={isUiDisabled}
                    style={zoomButtonStyle}
                  >
                    <ZoomOut size={16} />
                  </button>
                </div>
              </div>
              {gradientScaleElement}
            </div>
          )}
          {renderScreenContent}
          {thumbnailViewerElement}
          
          {/* 🔄 UPDATED: Report dialog now includes gunning data in Daily Report */}
          <ReportDialog
            isOpen={isReportDialogOpen}
            onClose={() => setIsReportDialogOpen(false)}
            onDailyReport={() => {
              console.log("Switching to DailyReport with gunning data:", hasGunningData);
              setActiveScreen("DailyReport");
              setIsReportDialogOpen(false);
            }}
            onCampaignReport={() => {
              console.log("Switching to CampaignReport");
              setActiveScreen("CampaignReport");
              setIsReportDialogOpen(false);
            }}
            // 🆕 NEW: Pass gunning status to report dialog
            hasGunningData={hasGunningData}
          />
        </div>
      </div>
    </div>
  );
};

export default LidarVisualizer;