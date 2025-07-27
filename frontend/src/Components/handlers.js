export const handleScreenSwitchWithAutoSave = (newScreen, {
  activeScreen,
  parameters,
  repairProposal,
  wornPoints,
  processedPoints,
  sectionCounts,
  selectedFile,
  selectedFurnace,
  viewMode,
  onDataUpdate,
  captureCurrentScreenshot,
  setActiveScreen,
}) => {
  if (repairProposal?.areas?.length > 0 && onDataUpdate) {
    const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
    const autoSaveData = {
      section: activeScreen,
      parameters: { ...parameters },
      repairProposal: { ...repairProposal },
      wornPoints: [...wornPoints],
      processedPoints: [...processedPoints],
      sectionCounts: { ...sectionCounts },
      timestamp: Date.now(),
      autoSaved: true,
      viewMode: viewMode,
      fileInfo: {
        name: selectedFile?.name || 'unknown',
        furnace: selectedFurnace?.furnace_id || 'unknown'
      }
    };

    const screenshot = captureCurrentScreenshot(activeScreen, viewMode);
    onDataUpdate(sectionKey, autoSaveData, screenshot);
    console.log(`🔄 Auto-saved data for ${activeScreen} before switching to ${newScreen}`);
  }

  setActiveScreen(newScreen);
};

export const handleParameterChange = (setParameters, param, value) => {
  console.log(`🔧 Parameter changing: ${param} = ${value}`);
  setParameters((prev) => {
    const newParams = { ...prev, [param]: value };
    console.log("🔄 New parameters:", newParams);
    return newParams;
  });
};

export const handleAcceptParameters = ({
  parameters,
  activeScreen,
  repairProposal,
  wornPoints,
  processedPoints,
  sectionCounts,
  selectedFile,
  selectedFurnace,
  viewMode,
  onDataUpdate,
  onCaptureScreenshot,
  captureCurrentScreenshot,
  canvasRef, // Added
  canvas2DRef, // Added
  rendererRef, // Added
  cameraRef, // Added
  sceneRef, // Added
}) => {
  console.log("✅ Parameters accepted and applied:", parameters);

  const sectionKey = activeScreen === "Slag Line" ? "slagLine" : activeScreen.toLowerCase();
  const captureData = {
    section: activeScreen,
    parameters: { ...parameters },
    repairProposal: { ...repairProposal },
    wornPoints: [...wornPoints],
    processedPoints: [...processedPoints],
    sectionCounts: { ...sectionCounts },
    timestamp: Date.now(),
    viewMode: viewMode,
    fileInfo: {
      name: selectedFile?.name || 'unknown',
      furnace: selectedFurnace?.furnace_id || 'unknown'
    }
  };

  let screenshot = null;
  if (onCaptureScreenshot && (viewMode === "3D" ? canvasRef : canvas2DRef)) {
    screenshot = onCaptureScreenshot(
      viewMode === "3D" ? canvasRef : canvas2DRef,
      `${activeScreen.toLowerCase()}_${viewMode.toLowerCase()}_analysis`
    );
  } else {
    screenshot = captureCurrentScreenshot(activeScreen, viewMode, canvasRef, canvas2DRef, rendererRef, cameraRef, sceneRef);
  }

  if (screenshot && screenshot.dataUrl) {
    console.log('📸 Screenshot captured for data save');
  } else {
    console.warn('⚠️ Screenshot capture failed during data save');
  }

  if (onDataUpdate) {
    onDataUpdate(sectionKey, captureData, screenshot);
    console.log(`📊 Data sent to parent for ${activeScreen}:`, sectionKey);
  }

  const message = `✅ Parameters Applied & Data Captured!\n\n` +
    `New Settings Active:\n` +
    `• Wear Threshold: ${parameters.wearThreshold}cm\n` +
    `• Distance Between Areas: ${parameters.distanceBetweenAreas}m\n` +
    `• Minimum Area Size: ${parameters.minimumAreaSize} points\n` +
    `• Repair Material: ${parameters.repairMaterial}\n` +
    `• View Mode: ${viewMode}\n\n` +
    `📊 Analysis Results:\n` +
    `• Section: ${activeScreen}\n` +
    `• Repair Areas: ${repairProposal.areas.length}\n` +
    `• Worn Points: ${wornPoints.length}\n` +
    `• Total Cost: ${repairProposal.total?.cost?.toFixed(0) || 0}\n\n` +
    `${screenshot ? '📸 Screenshot captured!' : '⚠️ Screenshot capture failed'}\n` +
    `🔄 Data ready for gunning report generation!`;

  alert(message);
};

export const handleVisualizationModeToggle = (setProcessingState) => {
  setProcessingState((prev) => ({
    ...prev,
    visualizationMode: prev.visualizationMode === "all" ? "filtered" : "all",
  }));
};

export const handleViewModeToggle = (setViewMode) => {
  setViewMode(prev => prev === "3D" ? "2D" : "3D");
};

export const captureCurrentScreenshot = (activeScreen, viewMode, canvasRef, canvas2DRef, rendererRef, cameraRef, sceneRef) => {
  const canvas = viewMode === "2D" ? canvas2DRef.current : canvasRef.current;
  if (!canvas) {
    console.warn('❌ Canvas not available for screenshot');
    return null;
  }

  try {
    if (viewMode === "3D" && rendererRef.current && cameraRef.current && sceneRef.current) {
      console.log('🎨 Forcing 3D render before screenshot...');
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    const dataUrl = canvas.toDataURL('image/png');
    
    if (dataUrl === 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==') {
      console.warn('⚠️ Screenshot appears to be blank');
      return null;
    }

    console.log(`✅ ${viewMode} Screenshot captured successfully`);
    return {
      dataUrl,
      filename: `${activeScreen.toLowerCase()}_${viewMode.toLowerCase()}_analysis_${Date.now()}.png`,
      timestamp: Date.now(),
      section: activeScreen,
      viewMode: viewMode
    };
  } catch (error) {
    console.error('❌ Screenshot capture failed:', error);
    return null;
  }
};

export const captureAlternativeScreenshot = (activeScreen, viewMode, canvasRef, canvas2DRef, rendererRef, cameraRef, sceneRef) => {
  const canvas = viewMode === "2D" ? canvas2DRef.current : canvasRef.current;
  if (!canvas) return null;

  try {
    if (viewMode === "3D" && rendererRef.current && cameraRef.current && sceneRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    const screenshotCanvas = document.createElement('canvas');
    const ctx = screenshotCanvas.getContext('2d');
    screenshotCanvas.width = canvas.width;
    screenshotCanvas.height = canvas.height;

    ctx.drawImage(canvas, 0, 0);
    
    const dataUrl = screenshotCanvas.toDataURL('image/png');
    
    return {
    //   dataUrl',
      dataUrl,
      timestamp: Date.now(),
      filename: `${activeScreen.toLowerCase()}_${viewMode.toLowerCase()}_analysis_${Date.now()}.png`,
      timestamp: Date.now(),
      section: activeScreen,
      viewMode,
    };
  } catch (error) {
    console.error('❌ Alternative screenshot method failed:', error);
    return null;
  }
};