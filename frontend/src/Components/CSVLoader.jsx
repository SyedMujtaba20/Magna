// CSVLoader.jsx
import React from "react";
import { parseThicknessCSV } from "./utils"; // Use the function I provided

const CSVLoader = ({ files, setFileDataCache }) => {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const bricks = parseThicknessCSV(text);

      // Simulate your fileDataCache structure
      setFileDataCache((prev) => new Map(prev).set(file.name, { points: bricks }));

      console.log(`[CSVLoader] Loaded file: ${file.name}`, bricks);
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: "10px", backgroundColor: "#222", color: "#fff" }}>
      <input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
    </div>
  );
};

export default CSVLoader;