export const handleMouseDown = (e, canvasRef, cameraRef, dataBounds, setDraggingLine, verticalSlice, horizontalSlice, isUiDisabled) => {
  if (isUiDisabled || !canvasRef.current) return;
  
  const rect = canvasRef.current.getBoundingClientRect();
  const camera = cameraRef.current;
  if (!camera) return;
  
  const frustumSize = Math.max(
    Math.abs(dataBounds.maxX - dataBounds.minX),
    Math.abs(dataBounds.maxZ - dataBounds.minZ)
  ) * 1.2;
  
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * frustumSize;
  const z = ((e.clientY - rect.top) / rect.height - 0.5) * frustumSize;

  const tolerance = frustumSize * 0.02; // 2% of frustum size
  const nearVertical = Math.abs(x - verticalSlice) < tolerance;
  const nearHorizontal = Math.abs(z - horizontalSlice) < tolerance;

  if (nearVertical) {
    setDraggingLine("vertical");
    canvasRef.current.style.cursor = 'ew-resize';
  } else if (nearHorizontal) {
    setDraggingLine("horizontal");
    canvasRef.current.style.cursor = 'ns-resize';
  }
};

export const handleMouseMove = (e, canvasRef, dataBounds, draggingLine, isUiDisabled, setHorizontalSlice, setVerticalSlice, horizontalSlice, verticalSlice) => {
  if (!canvasRef.current) return;
  
  const rect = canvasRef.current.getBoundingClientRect();
  const frustumSize = Math.max(
    Math.abs(dataBounds.maxX - dataBounds.minX),
    Math.abs(dataBounds.maxZ - dataBounds.minZ)
  ) * 1.2;
  
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * frustumSize;
  const z = ((e.clientY - rect.top) / rect.height - 0.5) * frustumSize;
  
  if (!draggingLine && !isUiDisabled) {
    const tolerance = frustumSize * 0.02;
    const nearVertical = Math.abs(x - verticalSlice) < tolerance;
    const nearHorizontal = Math.abs(z - horizontalSlice) < tolerance;

    canvasRef.current.style.cursor = nearVertical ? 'ew-resize' : nearHorizontal ? 'ns-resize' : 'default';
  }

  if (!draggingLine || isUiDisabled) return;
  
  const clampedX = Math.max(dataBounds.minX, Math.min(dataBounds.maxX, x));
  const clampedZ = Math.max(dataBounds.minZ, Math.min(dataBounds.maxZ, z));

  if (draggingLine === "horizontal") {
    setHorizontalSlice(clampedZ);
  } else if (draggingLine === "vertical") {
    setVerticalSlice(clampedX);
  }
};

export const handleMouseUp = (setDraggingLine, canvasRef) => {
  setDraggingLine(null);
  if (canvasRef.current) {
    canvasRef.current.style.cursor = 'default';
  }
};

export const handleMouseLeave = (setDraggingLine, canvasRef) => {
  setDraggingLine(null);
  if (canvasRef.current) {
    canvasRef.current.style.cursor = 'default';
  }
};