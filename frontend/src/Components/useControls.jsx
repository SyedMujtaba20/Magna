import { useRef } from "react";
import { createSimpleControls } from "./threeUtils"; // ✅ Add this at the top


const useControls = (isUiDisabled) => {
  const mainCanvasRef = useRef(null);
  const containerRef = useRef(null);


  // Zoom will only work if you have access to the actual controls and camera
  const zoomIn = () => {
    // Must be handled through controls object in render loop
    console.warn("zoomIn should be handled via controls.setDistance in your render loop.");
  };

  const zoomOut = () => {
    console.warn("zoomOut should be handled via controls.setDistance in your render loop.");
  };

  return { mainCanvasRef, containerRef, zoomIn, zoomOut, createSimpleControls };
};

export default useControls;
