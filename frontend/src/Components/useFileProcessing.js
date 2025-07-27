import { useRef } from "react";
import { parseCSV } from "../Components/utils";

const useFileProcessing = ({
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
  // 🔧 CONDITIONAL: Only use activeScreen when explicitly provided
  activeScreen = null,
}) => {
  const cycleIntervalRef = useRef(null);

  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleFolderChange = async (e) => {
    const fileList = Array.from(e.target.files);
    setFiles(fileList);
    setGlobalDataRange({ min: Infinity, max: -Infinity, isInitialized: false });
    setFileDataCache(new Map());
    setPreviewScenes(new Map());

    if (fileList.length > 0) {
      setLoading(true);
      let globalMin = Infinity;
      let globalMax = -Infinity;
      const cache = new Map();

      for (const file of fileList) {
        try {
          const content = await readFileAsText(file);
          
          // 🔧 CONDITIONAL: Only apply Gunning parsing if explicitly on Gunning screen
          let parseOptions = undefined; // Default to no options (original behavior)
          
          if (activeScreen === 'Gunning') {
            // Only use Gunning-specific options when actually on Gunning screen
            parseOptions = {
              screen: 'Gunning',
              forGunning: true
            };
            console.log(`📊 Using Gunning parsing for ${file.name}`);
          } else {
            console.log(`📊 Using standard parsing for ${file.name} (screen: ${activeScreen || 'default'})`);
          }
          
          // 🔧 FIXED: Call parseCSV conditionally
          const { points, minThickness, maxThickness } = parseOptions 
            ? parseCSV(content, parseOptions)  // Gunning mode
            : parseCSV(content);               // Standard mode (original behavior)
          
          globalMin = Math.min(globalMin, minThickness);
          globalMax = Math.max(globalMax, maxThickness);
          cache.set(file.name, { 
            points, 
            minThickness, 
            maxThickness,
            // 🆕 TRACK: Remember which parsing mode was used
            parsedWith: activeScreen === 'Gunning' ? 'Gunning' : 'Standard',
            timestamp: Date.now()
          });
          
        } catch (error) {
          console.error(`Error parsing file ${file.name}:`, error);
        }
      }

      setGlobalDataRange({
        min: globalMin,
        max: globalMax,
        isInitialized: true,
      });
      setFileDataCache(cache);
      setSelectedFile(fileList[0]);
      setLoading(false);
    }
  };

  // 🆕 SAFE: Re-parse files ONLY when switching TO Gunning screen from another screen
  const handleScreenSpecificReparse = async (newScreen) => {
    // 🔧 CRITICAL: Only re-parse if switching TO Gunning AND files exist AND not already parsed with Gunning
    if (newScreen === 'Gunning' && files.length > 0) {
      
      // Check if files are already parsed with Gunning format
      const firstFile = files[0];
      const existingData = fileDataCache.get(firstFile.name);
      
      if (existingData?.parsedWith === 'Gunning') {
        console.log("📊 Files already parsed with Gunning format, skipping re-parse");
        return; // Skip re-parsing if already in Gunning format
      }
      
      console.log("🔄 Re-parsing files for Gunning screen compatibility...");
      
      setLoading(true);
      let globalMin = Infinity;
      let globalMax = -Infinity;
      const cache = new Map();

      for (const file of files) {
        try {
          const content = await readFileAsText(file);
          
          // 🔧 GUNNING: Parse with Gunning-specific options
          const parseOptions = {
            screen: 'Gunning',
            forGunning: true
          };
          
          const { points, minThickness, maxThickness } = parseCSV(content, parseOptions);
          
          globalMin = Math.min(globalMin, minThickness);
          globalMax = Math.max(globalMax, maxThickness);
          cache.set(file.name, { 
            points, 
            minThickness, 
            maxThickness,
            parsedWith: 'Gunning', // Mark as Gunning-parsed
            timestamp: Date.now()
          });
          
          console.log(`🔧 Re-parsed ${file.name} for Gunning: ${points.length} points`);
          
        } catch (error) {
          console.error(`Error re-parsing file ${file.name} for Gunning:`, error);
          // 🔧 FALLBACK: Keep original data if re-parsing fails
          const originalData = fileDataCache.get(file.name);
          if (originalData) {
            cache.set(file.name, originalData);
          }
        }
      }

      setGlobalDataRange({
        min: globalMin,
        max: globalMax,
        isInitialized: true,
      });
      setFileDataCache(cache);
      setLoading(false);
      
      console.log("✅ Files re-parsed for Gunning screen compatibility");
    }
  };

  // 🆕 SAFE: Re-parse files when switching AWAY from Gunning back to standard screens
  const handleStandardReparse = async (newScreen) => {
    // 🔧 CRITICAL: Only re-parse if switching FROM Gunning to another screen
    if (newScreen !== 'Gunning' && files.length > 0) {
      
      // Check if files are currently parsed with Gunning format
      const firstFile = files[0];
      const existingData = fileDataCache.get(firstFile.name);
      
      if (existingData?.parsedWith !== 'Gunning') {
        console.log("📊 Files already in standard format, skipping re-parse");
        return; // Skip if not currently in Gunning format
      }
      
      console.log("🔄 Re-parsing files back to standard format...");
      
      setLoading(true);
      let globalMin = Infinity;
      let globalMax = -Infinity;
      const cache = new Map();

      for (const file of files) {
        try {
          const content = await readFileAsText(file);
          
          // 🔧 STANDARD: Parse with original/standard logic (no options)
          const { points, minThickness, maxThickness } = parseCSV(content);
          
          globalMin = Math.min(globalMin, minThickness);
          globalMax = Math.max(globalMax, maxThickness);
          cache.set(file.name, { 
            points, 
            minThickness, 
            maxThickness,
            parsedWith: 'Standard', // Mark as standard-parsed
            timestamp: Date.now()
          });
          
          console.log(`🔧 Re-parsed ${file.name} to standard: ${points.length} points`);
          
        } catch (error) {
          console.error(`Error re-parsing file ${file.name} to standard:`, error);
        }
      }

      setGlobalDataRange({
        min: globalMin,
        max: globalMax,
        isInitialized: true,
      });
      setFileDataCache(cache);
      setLoading(false);
      
      console.log("✅ Files re-parsed back to standard format");
    }
  };

  // 🆕 SMART: Combined screen change handler
  const handleScreenChange = async (newScreen, previousScreen) => {
    console.log(`🔄 Screen changing from ${previousScreen || 'unknown'} to ${newScreen}`);
    
    if (newScreen === 'Gunning' && previousScreen !== 'Gunning') {
      // Switching TO Gunning screen
      await handleScreenSpecificReparse(newScreen);
    } else if (newScreen !== 'Gunning' && previousScreen === 'Gunning') {
      // Switching FROM Gunning screen
      await handleStandardReparse(newScreen);
    }
    // If staying within non-Gunning screens or staying in Gunning, do nothing
  };

  const handleStartCycle = () => {
    if (
      !window.confirm(
        "Ensure the furnace vault is open and no objects block the robot's path. Continue?"
      )
    )
      return;

    setIsCycling(true);
    setIsUiDisabled(true);
    setProgress(0);
    let currentProgress = 0;

    cycleIntervalRef.current = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(cycleIntervalRef.current);
        setIsCycling(false);
        setIsUiDisabled(false);
        setProgress(0);
        alert("3D reconstruction completed. You can now set this scan as a template.");
        if (files.length > 0) {
          setSelectedFile(files[0]);
        }
      }
    }, 300);
  };

  const handleStopCycle = () => {
    if (cycleIntervalRef.current) {
      clearInterval(cycleIntervalRef.current);
    }
    setIsCycling(false);
    setIsUiDisabled(false);
    setProgress(0);
    alert("Cycle stopped. Press 'Reset Cycle' to return the robot to its initial position.");
  };

  const handleResetCycle = () => {
    if (
      !window.confirm(
        "Ensure no obstacles are in the robot's path. Return to initial position?"
      )
    )
      return;

    alert("Robot returning to initial position.");
  };

  const handleSetTemplate = () => {
    if (!selectedFile || !fileDataCache.has(selectedFile.name)) {
      alert("Select a scan file first.");
      return;
    }
    if (!window.confirm(`Set "${selectedFile.name}" as the reference template?`))
      return;

    setIsUiDisabled(true);
    setTimeout(() => {
      const { points, minThickness, maxThickness } = fileDataCache.get(selectedFile.name);
      setTemplateData({ name: selectedFile.name, points, minThickness, maxThickness });
      setIsUiDisabled(false);
      alert(`Template "${selectedFile.name}" set successfully.`);
    }, 2000);
  };

  const handleResetAlarms = () => {
    const alarmsPersist = Math.random() > 0.8;
    if (alarmsPersist) {
      alert("Alarms could not be reset. Please contact maintenance service.");
      setAlarmState({ robot: true, variator: true });
    } else {
      setAlarmState({ robot: false, variator: false });
      alert("Alarms reset successfully.");
    }
  };

  return {
    handleFolderChange,
    handleStartCycle,
    handleStopCycle,
    handleResetCycle,
    handleSetTemplate,
    handleResetAlarms,
    // 🆕 ENHANCED: Export both specific and combined functions
    handleScreenSpecificReparse,
    handleStandardReparse,
    handleScreenChange, // 🔧 RECOMMENDED: Use this for screen transitions
  };
};

export default useFileProcessing;