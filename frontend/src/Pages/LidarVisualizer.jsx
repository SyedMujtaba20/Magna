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
import ErrorBoundary from "../Components/ErrorBoundary";
import ThreeSceneManager from "../Components/ThreeSceneManager";
import Header from "../Components/Header";
import Toolbar3DView from "../Components/Toolbar3DView";
import useFileProcessing from "../Components/useFileProcessing";
import useControls from "../Components/useControls";
import styles from "./LidarStyles";
import ReportDialog from "../Components/ReportDialog";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { LanguageContext } from "../Components/LanguageContext";

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

  const previewCanvasRefs = useRef(new Map());
  const { language } = useContext(LanguageContext);
  const { t } = useTranslation();

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

  // Memoized screen change handler
  const handleScreenChange = useCallback((screen) => {
    setActiveScreen(screen);
    setWearRange("all");
    setViewMode("3D");
    setSelectedArea(null);
  }, []);

  // Memoized common props objects
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
      setSelectedFurnace,
      onCreateReportClick: () => setIsReportDialogOpen(true),
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

  // Memoized conditional renders
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
            <GunningScreen {...screenProps} />
          </ErrorBoundary>
        );
      case "DailyReport":
        return (
          <DailyReportScreen
            campaignInfo={campaignInfo}
            wearImage={"/assets/wear-image.png"} // Example
            thicknessTableData={{
              Bricks: [85, 82, 80],
              "Slag Line": [60, 62, 58],
              Slopes: [70, 65, 68],
            }}
            repairProposals={{
              Bricks: "Apply Gunnite C2",
              "Slag Line": "Moderate patching needed",
              Slopes: "No repair needed",
            }}
          />
        );

      case "CampaignReport":
        return (
          <CampaignReportScreen
            campaignInfo={campaignInfo}
            thicknessGraphs={{
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
              Slopes: [
                { day: "Day 1", thickness: 70 },
                { day: "Day 5", thickness: 68 },
                { day: "Day 10", thickness: 66 },
              ],
            }}
          />
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
  ]);

  // Memoized loading and no-file messages
  const loadingElement = useMemo(
    () => (loading ? <div style={styles.loading}>Loading...</div> : null),
    [loading]
  );

  const noFileElement = useMemo(
    () =>
      !selectedFile && files.length === 0 ? (
        <div style={styles.noFileMessage}>
          <div style={{ marginBottom: "10px", fontSize: "18px" }}>📁</div>
          <div>
            {t("lidar.selectFolder")}
            {/* 
            Select a folder to load LiDAR data */}
          </div>
        </div>
      ) : null,
    [selectedFile, files.length]
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
      files.length,
      activeScreen,
      files,
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
              <div ref={containerRef} style={styles.canvasContainer}>
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

          <ReportDialog
            isOpen={isReportDialogOpen}
            onClose={() => setIsReportDialogOpen(false)}
            onDailyReport={() => {
              setActiveScreen("DailyReport");
              setIsReportDialogOpen(false);
            }}
            onCampaignReport={() => {
              setActiveScreen("CampaignReport");
              setIsReportDialogOpen(false);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LidarVisualizer;
