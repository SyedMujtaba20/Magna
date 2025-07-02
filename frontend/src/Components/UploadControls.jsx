import React, { useState, useRef, useEffect } from "react";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import styles from "./styles";
import { useTranslation } from "react-i18next";
import i18n from "i18next";


const UploadControls = ({
  files,
  setFiles,
  handleFolderChange,
  useGlobalScaling,
  setUseGlobalScaling,
  selectedFile,
  setSelectedFile,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [availableFiles, setAvailableFiles] = useState([]);
  const fileInputRef = useRef(null);
    const { t } = useTranslation();
  
    useEffect(() => {
      const savedLang = localStorage.getItem("language") || "en";
      i18n.changeLanguage(savedLang);
    }, []);

  useEffect(() => {
    if (files.length > 0) {
      const names = files.map((file) => file.name);
      setAvailableFiles(names);

      // Auto-select first file if none selected
      if (!selectedFile || !names.includes(selectedFile.name)) {
        const firstFile = files[0];
        setSelectedFile(firstFile);
      }
    }
  }, [files]);

  const handleUploadToBackend = async () => {
    if (files.length === 0) {
      setUploadStatus("error");
      setUploadMessage("No files selected for upload");
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setUploadMessage("");

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/furnace/upload-files", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        setUploadStatus("success");
        setUploadMessage(
          `Successfully uploaded ${result.totalFiles} files. Processed ${result.results.length} campaigns.`
        );
      } else {
        setUploadStatus("error");
        setUploadMessage(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("error");
      setUploadMessage("Network error during upload");
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage("");
      }, 5000);
    }
  };

  const UploadStatus = () => {
    if (!uploadStatus) return null;
    const isSuccess = uploadStatus === "success";
    const Icon = isSuccess ? CheckCircle : AlertCircle;
    const color = isSuccess ? "#10B981" : "#EF4444";

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          backgroundColor: isSuccess ? "#065F46" : "#7F1D1D",
          color: color,
          borderRadius: "6px",
          fontSize: "14px",
          maxWidth: "300px",
        }}
      >
        <Icon size={16} />
        <span>{uploadMessage}</span>
      </div>
    );
  };

  return (
    <>
      <div style={styles.folderUpload}>
        <label style={styles.folderLabel}>
          {/* Select Folder */}
          {t("common.selectFolder")}
          <input
            ref={fileInputRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            accept=".csv,.txt"
            onChange={handleFolderChange}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {/* {files.length > 0 && (
        <button
          onClick={handleUploadToBackend}
          disabled={uploading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            backgroundColor: uploading ? "#374151" : "#3B82F6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            transition: "background-color 0.2s",
          }}
        >
          <Upload size={16} />
          {uploading ? "Uploading..." : `Upload ${files.length} Files`}
        </button>
      )} */}

      <UploadStatus />

      {availableFiles.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <label style={{ color: "#fff", marginRight: "10px" }}>
            {t("common.selectFile")}:
          </label>
          <select
            value={selectedFile?.name || ""}
            onChange={(e) => {
              const file = files.find((f) => f.name === e.target.value);
              setSelectedFile(file);
            }}
            style={{
              padding: "6px",
              borderRadius: "4px",
              border: "1px solid #ccc",
              backgroundColor: "#fff",
            }}
          >
            <option value="">-- Choose File --</option>
            {availableFiles.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={styles.controls}>
        <label style={styles.controlLabel}>
          <input
            type="checkbox"
            checked={useGlobalScaling}
            onChange={(e) => setUseGlobalScaling(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
        {t("visual.globalScaling")}
        </label>
      </div>
    </>
  );
};

export default UploadControls;
