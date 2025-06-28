export const getColorForThickness = (thickness, minThickness, maxThickness, useCustomRange = false, customRange = {}) => {
  const min = useCustomRange ? (customRange.min || 0) : minThickness;
  const max = useCustomRange ? (customRange.max || 10) : maxThickness;
  
  if (max <= min) return { r: 0, g: 1, b: 0 }; // Default green
  
  const normalized = Math.max(0, Math.min(1, (thickness - min) / (max - min)));
  
  // Color gradient: Blue (low) -> Green (medium) -> Yellow -> Red (high)
  if (normalized < 0.25) {
    // Blue to Cyan
    const t = normalized * 4;
    return { r: 0, g: t, b: 1 };
  } else if (normalized < 0.5) {
    // Cyan to Green
    const t = (normalized - 0.25) * 4;
    return { r: 0, g: 1, b: 1 - t };
  } else if (normalized < 0.75) {
    // Green to Yellow
    const t = (normalized - 0.5) * 4;
    return { r: t, g: 1, b: 0 };
  } else {
    // Yellow to Red
    const t = (normalized - 0.75) * 4;
    return { r: 1, g: 1 - t, b: 0 };
  }
};