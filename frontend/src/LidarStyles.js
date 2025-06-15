// src/styles/lidarStyles.js
const existingLidarStyles = {
  container: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#1a1a1a",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: "hidden",
  },
  sidebar: {
    width: "220px",
    backgroundColor: "#2d2d2d",
    borderRight: "1px solid #404040",
    display: "flex",
    flexDirection: "column",
    color: "white",
  },
  header: {
    padding: "15px",
    borderBottom: "1px solid #404040",
    fontWeight: "bold",
    fontSize: "14px",
    color: "#cccccc",
  },
  folderUpload: {
    padding: "15px",
    borderBottom: "1px solid #404040",
  },
  folderLabel: {
    display: "block",
    padding: "8px 12px",
    backgroundColor: "#007acc",
    color: "white",
    borderRadius: "4px",
    cursor: "pointer",
    textAlign: "center",
    fontSize: "12px",
    fontWeight: "500",
  },
  controls: {
    padding: "15px",
    borderBottom: "1px solid #404040",
  },
  controlLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "11px",
    color: "#cccccc",
    cursor: "pointer",
  },
  fileList: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
  },
  fileItem: (isSelected) => ({
    padding: "8px",
    margin: "2px 0",
    backgroundColor: isSelected ? "#007acc" : "#3d3d3d",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "11px",
    color: "white",
    border: isSelected ? "1px solid #0099ff" : "1px solid transparent",
    wordBreak: "break-all",
  }),
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#1a1a1a",
    height: "100vh",
    width: "100vh",
  },
  visualization: {
    flex: 1,
    margin: "10px",
    backgroundColor: "#000000",
    borderRadius: "6px",
    border: "1px solid #404040",
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  canvasContainer: {
    width: "100%",
    flex: 1,
  },
  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#cccccc",
    fontSize: "14px",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: "12px 20px",
    borderRadius: "4px",
  },
  noFileMessage: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#666666",
    fontSize: "16px",
    textAlign: "center",
  },
  gradientScale: {
    padding: "15px",
    borderTop: "1px solid #404040",
    backgroundColor: "#1a1a1a",
    display: "flex",
    justifyContent: "center",
  },
  thumbnailsContainer: {
    height: "100px",
    margin: "0 10px 10px 10px",
    backgroundColor: "#2d2d2d",
    borderRadius: "6px",
    border: "1px solid #404040",
    display: "flex",
    alignItems: "center",
    padding: "10px",
    overflowX: "auto",
    gap: "8px",
  },
  thumbnailItem: (isSelected) => ({
    minWidth: "80px",
    height: "80px",
    backgroundColor: "#000000",
    borderRadius: "4px",
    border: isSelected ? "2px solid #007acc" : "1px solid #404040",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
  }),
  thumbnailLabel: {
    position: "absolute",
    bottom: "2px",
    left: "2px",
    right: "2px",
    fontSize: "9px",
    color: "white",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: "1px 3px",
    borderRadius: "2px",
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
};

const additionalLidarStyles = {
  // Update the sidebar style to accommodate new content
  sidebar: {
    ...existingLidarStyles.sidebar, // Keep your existing sidebar styles
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    overflowY: 'auto', // Add scroll if content is too long
  },

  sidebarMainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flex: 1,
    paddingBottom: '12px'
  },

  sectionStyle: {
    marginBottom: '12px'
  },

  headingStyle: {
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '6px',
    color: '#333',
    paddingLeft: '2px'
  },

  buttonContainerStyle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },

  buttonStyle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#ffffff',
    padding: '4px 8px',
    border: '1px solid #d0d0d0',
    cursor: 'pointer',
    width: '100%',
    fontSize: '12px',
    color: '#333',
    textAlign: 'left',
    transition: 'background-color 0.2s',
    boxSizing: 'border-box'
  },

  ledContainerStyle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginTop: '6px',
    border: '1px solid #ccc',
    padding: '6px',
    backgroundColor: '#fff'
  },

  ledRowStyle: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center'
  },

  ledStyle: {
    width: '16px',
    height: '16px',
    border: '1px solid #999'
  },

  measurementInfoStyle: {
    backgroundColor: 'white',
    border: '1px solid #ccc',
    padding: '8px',
    fontSize: '11px'
  },

  measurementHeadingStyle: {
    fontWeight: 'bold',
    fontSize: '12px',
    marginBottom: '6px',
    color: '#333'
  },

  measurementTextStyle: {
    margin: '2px 0',
    color: '#555'
  },

  footerStyle: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    border: '1px solid #ccc',
    padding: '8px',
    backgroundColor: '#fff'
  },

  footerButtonStyle: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px'
  },

   container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: 'Arial, sans-serif'
  },

  // Header styles (contains original sidebar content)
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#f8f9fa',
    borderBottom: '1px solid #e0e0e0',
    minHeight: '60px',
    flexShrink: 0
  },

  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333'
  },

  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1,
    justifyContent: 'flex-end'
  },

  // Content area with sidebar and main content
  contentArea: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },

  // Original folder upload styles
  folderUpload: {
    // Keep your existing folderUpload styles
  },

  folderLabel: {
    // Keep your existing folderLabel styles
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },

  // Controls styles
  controls: {
    display: 'flex',
    alignItems: 'center'
  },

  controlLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '12px',
    color: '#333'
  },

  // Header file list (horizontal layout)
  headerFileList: {
    display: 'flex',
    gap: '8px',
    maxWidth: '400px',
    overflowX: 'auto',
    padding: '4px'
  },

  headerFileItem: (isSelected) => ({
    padding: '4px 8px',
    backgroundColor: isSelected ? '#007bff' : '#ffffff',
    color: isSelected ? 'white' : '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    minWidth: 'fit-content'
  }),

  // Main content area (updated to work with sidebar)
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },

  visualization: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },

  canvasContainer: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },

  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '4px'
  },

  noFileMessage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#666',
    fontSize: '16px'
  },

  gradientScale: {
    position: 'absolute',
    top: '10px',
    right: '10px'
  },

  thumbnailsContainer: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e0e0e0',
    overflowX: 'auto',
    flexShrink: 0
  },

  thumbnailItem: (isSelected) => ({
    width: '120px',
    height: '80px',
    border: isSelected ? '2px solid #007bff' : '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: 'white',
    position: 'relative',
    flexShrink: 0
  }),

  thumbnailLabel: {
    position: 'absolute',
    bottom: '2px',
    left: '2px',
    right: '2px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '2px',
    textAlign: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis'
  }
};

// Merge with your existing lidarStyles
const lidarStyles = {
  ...existingLidarStyles,
  ...additionalLidarStyles
};

export default lidarStyles;
