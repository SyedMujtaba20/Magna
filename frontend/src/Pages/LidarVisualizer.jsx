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
  // Core state management
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

  // 🆕 NEW: ThicknessScreen data management for comprehensive analysis
  const [thicknessData, setThicknessData] = useState({
    cellSelections: new Map(), // Store cell selections by zone-profile key
    pointSelections: new Map(), // Store point selections by coordinate key
    gridAnalysis: new Map(), // Store grid analysis by file name
    comprehensiveAnalysis: null, // Latest comprehensive analysis
    campaignTrends: [], // Campaign-level thickness trends
    exportHistory: [], // History of data exports from ThicknessScreen
    lastUpdated: null,
    statistics: {
      totalCells: 0,
      averageThickness: 0,
      criticalAreas: 0,
      wornAreas: 0
    }
  });

  // 🆕 NEW: Combined data state for unified reporting
  const [combinedAnalysisData, setCombinedAnalysisData] = useState({
    thickness: null,
    gunning: null,
    integrated: null,
    lastSync: null
  });

  const previewCanvasRefs = useRef(new Map());
  const { language } = useContext(LanguageContext);
  const { t } = useTranslation();

  // Debug activeScreen changes
  useEffect(() => {
    console.log("Active screen changed:", activeScreen);
  }, [activeScreen]);

  // 🆕 NEW: Debug thickness data changes
  useEffect(() => {
    console.log('📊 ThicknessScreen data updated for LiDAR integration:', {
      cellSelectionsCount: thicknessData.cellSelections.size,
      pointSelectionsCount: thicknessData.pointSelections.size,
      gridAnalysisCount: thicknessData.gridAnalysis.size,
      hasComprehensiveAnalysis: !!thicknessData.comprehensiveAnalysis,
      lastUpdated: thicknessData.lastUpdated
    });
  }, [thicknessData]);

  // 🆕 NEW: Debug gunning data changes
  useEffect(() => {
    console.log('🔧 Gunning data updated for Daily Report:', gunningData);
  }, [gunningData]);

  // 🆕 NEW: Sync combined analysis when either thickness or gunning data changes
  useEffect(() => {
    const syncCombinedData = () => {
      const integrated = {
        timestamp: new Date().toISOString(),
        source: 'LiDAR_Integration',
        thickness: {
          hasData: !!thicknessData.comprehensiveAnalysis,
          cellSelections: thicknessData.cellSelections.size,
          statistics: thicknessData.statistics,
          trends: thicknessData.campaignTrends
        },
        gunning: {
          hasData: !!(gunningData.bricks || gunningData.slagLine || gunningData.screed),
          sectionsAnalyzed: Object.keys(gunningData).filter(key => 
            key !== 'screenshots' && gunningData[key]
          ).length,
          repairAreas: Object.values(gunningData).reduce((total, section) => {
            return total + (section?.repairProposal?.areas?.length || 0);
          }, 0)
        },
        recommendations: [],
        alerts: []
      };

      // Generate integrated recommendations
      if (integrated.thickness.hasData && integrated.gunning.hasData) {
        integrated.recommendations.push({
          type: 'cross_analysis',
          priority: 'high',
          message: 'Thickness and gunning analysis available for comprehensive repair planning'
        });
      }

      // Generate alerts based on critical areas
      if (integrated.thickness.statistics.criticalAreas > 0) {
        integrated.alerts.push({
          type: 'thickness_critical',
          severity: 'high',
          count: integrated.thickness.statistics.criticalAreas,
          message: `${integrated.thickness.statistics.criticalAreas} areas below critical thickness threshold`
        });
      }

      setCombinedAnalysisData(prev => ({
        ...prev,
        thickness: thicknessData.comprehensiveAnalysis,
        gunning: gunningData,
        integrated,
        lastSync: new Date().toISOString()
      }));
    };

    if (thicknessData.comprehensiveAnalysis || Object.values(gunningData).some(val => val)) {
      syncCombinedData();
    }
  }, [thicknessData.comprehensiveAnalysis, gunningData]);

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

  // 🆕 NEW: Handle thickness data exports from ThicknessScreen
  const handleThicknessDataExport = useCallback((exportData) => {
    console.log(`📈 Received thickness data from ThicknessScreen:`, exportData);
    
    setThicknessData(prev => {
      const updated = { ...prev };
      
      switch (exportData.type) {
        case 'cellSelection':
          const cellKey = `${exportData.cellData.zone}-${exportData.cellData.profile}`;
          updated.cellSelections.set(cellKey, {
            ...exportData.cellData,
            exportedAt: exportData.timestamp,
            fileName: exportData.fileName
          });
          break;
          
        case 'pointSelection':
          const pointKey = exportData.pointData.position?.join(',') || `${exportData.pointData.index}`;
          updated.pointSelections.set(pointKey, {
            ...exportData.pointData,
            exportedAt: exportData.timestamp,
            fileName: exportData.fileName
          });
          break;
          
        case 'gridSummary':
          updated.gridAnalysis.set(exportData.fileName, {
            ...exportData,
            processedAt: exportData.timestamp
          });
          break;
          
        case 'comprehensiveThicknessAnalysis':
          updated.comprehensiveAnalysis = exportData;
          updated.campaignTrends = exportData.thicknessEvolution || [];
          updated.statistics = {
            totalCells: exportData.zoneAnalysis?.reduce((sum, zone) => 
              sum + (zone.evolution?.length || 0), 0) || 0,
            averageThickness: exportData.zoneAnalysis?.reduce((sum, zone) => {
              const avgThickness = zone.evolution?.reduce((zSum, data) => 
                zSum + data.averageThickness, 0) / (zone.evolution?.length || 1);
              return sum + avgThickness;
            }, 0) / (exportData.zoneAnalysis?.length || 1) || 0,
            criticalAreas: exportData.criticalAreas?.length || 0,
            wornAreas: exportData.criticalAreas?.filter(area => area.severity === 'critical')?.length || 0
          };
          break;
          
        default:
          console.log('Unknown thickness export type:', exportData.type);
      }
      
      // Add to export history
      updated.exportHistory.push({
        ...exportData,
        id: Date.now(),
        receivedAt: new Date().toISOString()
      });
      
      // Keep only last 50 exports
      if (updated.exportHistory.length > 50) {
        updated.exportHistory = updated.exportHistory.slice(-50);
      }
      
      updated.lastUpdated = new Date().toISOString();
      
      return updated;
    });
  }, []);

  // 🆕 NEW: Handle thickness analysis results from ThicknessScreen
  const handleThicknessAnalysis = useCallback((analysisData) => {
    console.log(`🔬 Received thickness analysis from ThicknessScreen:`, analysisData);
    
    setThicknessData(prev => ({
      ...prev,
      comprehensiveAnalysis: {
        ...analysisData,
        receivedAt: new Date().toISOString(),
        source: 'ThicknessScreen'
      },
      lastUpdated: new Date().toISOString()
    }));
  }, []);

  // 🆕 NEW: Handle campaign data updates from ThicknessScreen
  const handleCampaignDataUpdate = useCallback((campaignData) => {
    console.log(`📊 Received campaign data from ThicknessScreen:`, campaignData);
    
    setThicknessData(prev => ({
      ...prev,
      campaignTrends: prev.campaignTrends.concat([{
        ...campaignData,
        receivedAt: new Date().toISOString()
      }]),
      lastUpdated: new Date().toISOString()
    }));

    // Update campaign info if needed
    if (campaignData.fileName && campaignData.timestamp) {
      setCampaignInfo(prev => ({
        ...prev,
        endDate: new Date(campaignData.timestamp).toISOString().split('T')[0]
      }));
    }
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

  // 🆕 NEW: Check if thickness data exists
  const hasThicknessData = useMemo(() => {
    return !!(thicknessData.comprehensiveAnalysis || 
              thicknessData.cellSelections.size > 0 || 
              thicknessData.gridAnalysis.size > 0);
  }, [thicknessData]);

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

  // 🆕 NEW: Transform thickness data for Daily Report format
  const thicknessRepairProposals = useMemo(() => {
    const proposals = {};
    
    if (thicknessData.comprehensiveAnalysis?.criticalAreas) {
      const criticalByZone = thicknessData.comprehensiveAnalysis.criticalAreas.reduce((acc, area) => {
        if (!acc[area.zone]) acc[area.zone] = [];
        acc[area.zone].push(area);
        return acc;
      }, {});

      Object.entries(criticalByZone).forEach(([zone, areas]) => {
        const avgThickness = areas.reduce((sum, area) => sum + area.thickness, 0) / areas.length;
        proposals[zone] = `Thickness Analysis: ${areas.length} critical areas detected. ` +
          `Average thickness: ${avgThickness.toFixed(1)}cm. Immediate attention required.`;
      });
    }
    
    return proposals;
  }, [thicknessData.comprehensiveAnalysis]);

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

  // 🔄 UPDATED: Enhanced thickness table data with both gunning and thickness analysis
  const thicknessTableData = useMemo(() => {
    const baseData = {
      Bricks: [85, 82, 80],
      "Slag Line": [60, 62, 58],
      Screed: [70, 65, 68], // Changed from "Slopes" to "Screed" to match gunning
    };

    // Add thickness analysis data if available
    if (hasThicknessData && thicknessData.comprehensiveAnalysis?.zoneAnalysis) {
      thicknessData.comprehensiveAnalysis.zoneAnalysis.forEach(zone => {
        const zoneName = zone.zone === 'Initial bricks' ? 'Bricks' : 
                        zone.zone === 'Slag line' ? 'Slag Line' : 
                        zone.zone === 'Slopes' ? 'Screed' : zone.zone;
        
        if (baseData[zoneName] && zone.evolution?.length > 0) {
          const latestThickness = zone.evolution[zone.evolution.length - 1].averageThickness;
          baseData[zoneName] = [latestThickness.toFixed(1), ...baseData[zoneName].slice(1)];
          baseData[zoneName].push(`Trend: ${zone.trend > 0 ? '+' : ''}${zone.trend.toFixed(1)}cm`);
        }
      });
    }

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
  }, [hasGunningData, gunningData, hasThicknessData, thicknessData.comprehensiveAnalysis]);

  // 🔄 UPDATED: Enhanced repair proposals with both gunning and thickness data
  const repairProposals = useMemo(() => {
    const baseProposals = {
      Bricks: t("dailyReport.repairProposals.bricks"),
      "Slag Line": t("dailyReport.repairProposals.slagline"),
      Screed: t("dailyReport.repairProposals.slopes"), // Using slopes translation for now
    };

    // Combine thickness and gunning proposals
    const combinedProposals = { ...baseProposals };

    // Add thickness analysis proposals
    if (hasThicknessData) {
      Object.entries(thicknessRepairProposals).forEach(([zone, proposal]) => {
        if (combinedProposals[zone]) {
          combinedProposals[zone] = `${proposal} | ${combinedProposals[zone]}`;
        } else {
          combinedProposals[zone] = proposal;
        }
      });
    }

    // Add gunning proposals
    if (hasGunningData) {
      Object.entries(gunningRepairProposals).forEach(([zone, proposal]) => {
        if (combinedProposals[zone]) {
          combinedProposals[zone] = `${combinedProposals[zone]} | ${proposal}`;
        } else {
          combinedProposals[zone] = proposal;
        }
      });
    }

    return combinedProposals;
  }, [t, hasGunningData, gunningRepairProposals, hasThicknessData, thicknessRepairProposals]);

  // 🔄 UPDATED: Enhanced thickness graphs with real data from ThicknessScreen
  const thicknessGraphs = useMemo(() => {
    const defaultGraphs = {
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

    // Use real thickness data if available
    if (hasThicknessData && thicknessData.comprehensiveAnalysis?.zoneAnalysis) {
      const realGraphs = {};
      
      thicknessData.comprehensiveAnalysis.zoneAnalysis.forEach(zone => {
        const zoneName = zone.zone === 'Initial bricks' ? 'Bricks' : 
                        zone.zone === 'Slag line' ? 'Slag Line' : 
                        zone.zone === 'Slopes' ? 'Screed' : zone.zone;
        
        if (zone.evolution && zone.evolution.length > 0) {
          realGraphs[zoneName] = zone.evolution.map((data, index) => ({
            day: `File ${index + 1}`,
            thickness: data.averageThickness,
            fileName: data.fileName,
            date: data.date
          }));
        }
      });

      return Object.keys(realGraphs).length > 0 ? realGraphs : defaultGraphs;
    }

    return defaultGraphs;
  }, [hasThicknessData, thicknessData.comprehensiveAnalysis]);

  const handleScreenChange = useCallback((screen) => {
    setActiveScreen(screen);
    setWearRange("all");
    setViewMode("3D");
    setSelectedArea(null);
  }, []);

  // 🔄 UPDATED: Sidebar props with both gunning and thickness status
  // const sidebarProps = useMemo(
  //   () => ({
  //     onStartCycle: handleStartCycle,
  //     onStopCycle: handleStopCycle,
  //     onResetCycle: handleResetCycle,
  //     onSetTemplate: handleSetTemplate,
  //     onResetAlarms: handleResetAlarms,
  //     onScreenChange: handleScreenChange,
  //     isCycling,
  //     progress,
  //     isUiDisabled,
  //     templateData,
  //     alarmState,
  //     selectedFile,
  //     selectedFurnace,
  //     setSelectedFurnace: setSelectedFurnace || (() => {}),
  //     onCreateReportClick: () => setIsReportDialogOpen(true),
  //     // 🆕 NEW: Gunning data status for sidebar info
  //     gunningData: hasGunningData ? gunningData : null,
  //     // 🆕 NEW: Thickness data status for sidebar info
  //     thicknessData: hasThicknessData ? thicknessData : null,
  //     // 🆕 NEW: Combined analysis status
  //     combinedAnalysisData: combinedAnalysisData,
  //   }),
  //   [
  //     handleStartCycle,
  //     handleStopCycle,
  //     handleResetCycle,
  //     handleSetTemplate,
  //     handleResetAlarms,
  //     handleScreenChange,
  //     isCycling,
  //     progress,
  //     isUiDisabled,
  //     templateData,
  //     alarmState,
  //     selectedFile,
  //     selectedFurnace,
  //     hasGunningData,
  //     gunningData,
  //     hasThicknessData,
  //     thicknessData,
  //     combinedAnalysisData,
  //   ]
  // );
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
    // 🆕 NEW: Pass activeScreen for intelligent download detection
    activeScreen: activeScreen,
    // 🆕 NEW: Gunning data status for sidebar info and download
    gunningData: hasGunningData ? gunningData : null,
    // 🆕 NEW: Thickness data status for sidebar info and download
    thicknessData: hasThicknessData ? thicknessData : null,
    // 🆕 NEW: Combined analysis status
    combinedAnalysisData: combinedAnalysisData,
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
    activeScreen, // 🆕 ADD this dependency
    hasGunningData,
    gunningData,
    hasThicknessData,
    thicknessData,
    combinedAnalysisData,
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

  // 🔄 UPDATED: Enhanced renderScreenContent with both gunning and thickness integration
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
            <ThicknessesScreen 
              {...screenProps}
              // 🆕 NEW: Pass thickness-specific props for LiDAR integration
              onDataExport={handleThicknessDataExport}
              onThicknessAnalysis={handleThicknessAnalysis}
              onCampaignDataUpdate={handleCampaignDataUpdate}
            />
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
              // 🆕 NEW: Pass thickness data for cross-analysis
              thicknessData={hasThicknessData ? thicknessData : null}
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
              // 🆕 NEW: Pass thickness data to Daily Report
              thicknessData={hasThicknessData ? thicknessData : null}
              hasThicknessAnalysis={hasThicknessData}
              // 🆕 NEW: Pass combined analysis data
              combinedAnalysisData={combinedAnalysisData}
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
              // 🆕 NEW: Pass thickness data to Campaign Report
              thicknessData={hasThicknessData ? thicknessData : null}
              // 🆕 NEW: Pass combined analysis for comprehensive campaign insights
              combinedAnalysisData={combinedAnalysisData}
              // 🆕 NEW: Pass file data cache for campaign analysis
              fileDataCache={fileDataCache}
              files={files}
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
    // 🆕 NEW: Thickness dependencies for integration
    handleThicknessDataExport,
    handleThicknessAnalysis,
    handleCampaignDataUpdate,
    thicknessData,
    hasThicknessData,
    combinedAnalysisData,
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

  // 🆕 NEW: Enhanced analytics panel for debugging and monitoring
  const analyticsPanel = useMemo(() => {
    if (!hasThicknessData && !hasGunningData) return null;

    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "11px",
          maxWidth: "300px",
          zIndex: 1000,
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
          🔬 LiDAR Integration Analytics
        </div>
        
        {hasThicknessData && (
          <div style={{ marginBottom: "6px" }}>
            📊 Thickness: {thicknessData.cellSelections.size} cells, 
            {thicknessData.pointSelections.size} points, 
            {thicknessData.statistics.criticalAreas} critical
          </div>
        )}
        
        {hasGunningData && (
          <div style={{ marginBottom: "6px" }}>
            🔧 Gunning: {Object.keys(gunningData).filter(k => k !== 'screenshots' && gunningData[k]).length} sections analyzed
          </div>
        )}
        
        {combinedAnalysisData.lastSync && (
          <div style={{ fontSize: "10px", color: "#ccc" }}>
            Last sync: {new Date(combinedAnalysisData.lastSync).toLocaleTimeString()}
          </div>
        )}
        
        {combinedAnalysisData.integrated?.alerts?.length > 0 && (
          <div style={{ marginTop: "6px", color: "#ff6b6b" }}>
            ⚠️ {combinedAnalysisData.integrated.alerts.length} alerts
          </div>
        )}
        
        {combinedAnalysisData.integrated?.recommendations?.length > 0 && (
          <div style={{ marginTop: "4px", color: "#4ecdc4" }}>
            💡 {combinedAnalysisData.integrated.recommendations.length} recommendations
          </div>
        )}
      </div>
    );
  }, [hasThicknessData, hasGunningData, thicknessData, gunningData, combinedAnalysisData]);

  // 🆕 NEW: Data export functionality for external systems
  const exportCombinedData = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      source: 'LiDAR_Visualizer',
      campaign: campaignInfo,
      files: files.map(f => f.name),
      selectedFile: selectedFile?.name,
      analysis: {
        thickness: hasThicknessData ? {
          comprehensiveAnalysis: thicknessData.comprehensiveAnalysis,
          statistics: thicknessData.statistics,
          cellSelections: Array.from(thicknessData.cellSelections.entries()),
          campaignTrends: thicknessData.campaignTrends
        } : null,
        gunning: hasGunningData ? {
          bricks: gunningData.bricks,
          slagLine: gunningData.slagLine,
          screed: gunningData.screed
        } : null,
        combined: combinedAnalysisData.integrated
      },
      reports: {
        thicknessTableData,
        repairProposals,
        thicknessGraphs
      }
    };

    // Create download
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lidar_analysis_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📤 Combined LiDAR data exported:', exportData);
  }, [
    campaignInfo, 
    files, 
    selectedFile, 
    hasThicknessData, 
    thicknessData, 
    hasGunningData, 
    gunningData, 
    combinedAnalysisData,
    thicknessTableData,
    repairProposals,
    thicknessGraphs
  ]);

  // 🆕 NEW: Real-time data monitoring and alerts
  useEffect(() => {
    if (combinedAnalysisData.integrated?.alerts?.length > 0) {
      const criticalAlerts = combinedAnalysisData.integrated.alerts.filter(
        alert => alert.severity === 'high'
      );
      
      if (criticalAlerts.length > 0) {
        console.warn('🚨 Critical alerts detected:', criticalAlerts);
        // Here you could trigger notifications, email alerts, etc.
      }
    }
  }, [combinedAnalysisData.integrated?.alerts]);

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
                
                {/* 🆕 NEW: Export button for combined data */}
                {(hasThicknessData || hasGunningData) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={exportCombinedData}
                      style={{
                        backgroundColor: "#10B981",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      title="Export combined LiDAR analysis data"
                    >
                      📤 Export Analysis
                    </button>
                  </div>
                )}
              </div>
              {gradientScaleElement}
            </div>
          )}
          {renderScreenContent}
          {thumbnailViewerElement}
          
          {/* 🔄 UPDATED: Report dialog now includes both gunning and thickness data status */}
          <ReportDialog
            isOpen={isReportDialogOpen}
            onClose={() => setIsReportDialogOpen(false)}
            onDailyReport={() => {
              console.log("Switching to DailyReport with combined data:", {
                hasGunningData,
                hasThicknessData,
                combinedAnalysis: !!combinedAnalysisData.integrated
              });
              setActiveScreen("DailyReport");
              setIsReportDialogOpen(false);
            }}
            onCampaignReport={() => {
              console.log("Switching to CampaignReport with enhanced data:", {
                hasThicknessData,
                thicknessGraphsCount: Object.keys(thicknessGraphs).length,
                campaignTrendsCount: thicknessData.campaignTrends.length
              });
              setActiveScreen("CampaignReport");
              setIsReportDialogOpen(false);
            }}
            // 🆕 NEW: Pass both gunning and thickness status to report dialog
            hasGunningData={hasGunningData}
            hasThicknessData={hasThicknessData}
            combinedAnalysisData={combinedAnalysisData}
          />
          
          {/* 🆕 NEW: Analytics panel for monitoring data integration */}
          {analyticsPanel}
        </div>
      </div>
    </div>
  );
};

export default LidarVisualizer;