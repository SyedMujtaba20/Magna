import React, { memo, useMemo, useCallback } from "react";
import UploadControls from "../Components/UploadControls";
import styles from "../Pages/LidarStyles";

const Header = memo(({
  files,
  setFiles,
  selectedFile,
  setSelectedFile,
  handleFolderChange,
  useGlobalScaling,
  setUseGlobalScaling,
  isUiDisabled,
}) => {
  // Memoize file list to prevent unnecessary re-renders
  const fileList = useMemo(() => {
  
    return files.map((file, index) => ({
      id: `${file.name}-${index}`,
      name: file.name,
      file: file,
      isSelected: selectedFile === file
    }));
  }, [files, selectedFile]);

  // Memoized click handler
  const handleFileClick = useCallback((file) => {
    if (!isUiDisabled) {
      setSelectedFile(file);
    }
  }, [isUiDisabled, setSelectedFile]);

  return (
    <div
      style={{
        ...styles.header,
        background: "linear-gradient(90deg, #87ceeb, #9370db)",
      }}
    >
      <div style={styles.headerTitle}>LiDAR Viewer</div>
      <div style={styles.headerControls}>
        <UploadControls
          files={files}
          setFiles={setFiles}
          handleFolderChange={handleFolderChange}
          useGlobalScaling={useGlobalScaling}
          setUseGlobalScaling={setUseGlobalScaling}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />

        <div style={styles.headerFileList}>
          {fileList.map((fileItem) => (
            <FileItem
              key={fileItem.id}
              fileItem={fileItem}
              onFileClick={handleFileClick}
              isUiDisabled={isUiDisabled}
              styles={styles}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

// Memoized file item component to prevent unnecessary re-renders
const FileItem = memo(({ fileItem, onFileClick, isUiDisabled, styles }) => {
  const handleClick = useCallback(() => {
    onFileClick(fileItem.file);
  }, [onFileClick, fileItem.file]);

  return (
    <div
      onClick={handleClick}
      style={{
        ...styles.headerFileItem(fileItem.isSelected),
        opacity: isUiDisabled ? 0.5 : 1,
        cursor: isUiDisabled ? "not-allowed" : "pointer",
      }}
    >
      {fileItem.name}
    </div>
  );
});

Header.displayName = 'Header';
FileItem.displayName = 'FileItem';

export default Header;