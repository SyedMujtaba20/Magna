
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
          const { points, minThickness, maxThickness } = parseCSV(content);
          globalMin = Math.min(globalMin, minThickness);
          globalMax = Math.max(globalMax, maxThickness);
          cache.set(file.name, { points, minThickness, maxThickness });
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
  };
};

export default useFileProcessing;



