export const getSliceData = (isHorizontal, slicePosition, furnacePoints, baselinePoints, tolerance = 2.0) => {
  if (furnacePoints.length === 0) return { current: [], baseline: [] };

  const currentMatching = [];
  const baselineMatching = [];
  const maxSlicePoints = 2000;
  
  // Get current data
  for (const point of furnacePoints) {
    const x = point.position?.[0] || point.x || 0;
    const z = point.position?.[2] || point.z || 0;
    const thickness = point.thickness || point.y || 0;
    
    const distanceFromSlice = isHorizontal ? 
      Math.abs(z - slicePosition) : 
      Math.abs(x - slicePosition);
    
    if (distanceFromSlice < tolerance) {
      currentMatching.push({ 
        x: isHorizontal ? x : z, 
        y: thickness,
        thickness: thickness
      });
      
      if (currentMatching.length >= maxSlicePoints) break;
    }
  }

  // Get baseline data
  for (const point of baselinePoints) {
    const x = point.position?.[0] || point.x || 0;
    const z = point.position?.[2] || point.z || 0;
    const thickness = point.thickness || point.y || 0;
    
    const distanceFromSlice = isHorizontal ? 
      Math.abs(z - slicePosition) : 
      Math.abs(x - slicePosition);
    
    if (distanceFromSlice < tolerance) {
      baselineMatching.push({ 
        x: isHorizontal ? x : z, 
        y: thickness,
        thickness: thickness
      });
      
      if (baselineMatching.length >= maxSlicePoints) break;
    }
  }

  return {
    current: currentMatching.sort((a, b) => a.x - b.x),
    baseline: baselineMatching.sort((a, b) => a.x - b.x)
  };
};

export const drawSliceProfile = (canvas, isHorizontal, slicePosition, furnacePoints, baselinePoints, dataBounds, getColorForThickness) => {
  if (!canvas) return;
  
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { current: currentData, baseline: baselineData } = getSliceData(isHorizontal, slicePosition, furnacePoints, baselinePoints);

  if (currentData.length === 0) {
    // Draw "No data" message
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No data at this slice position', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Get bounds for scaling (include both current and baseline)
  const allData = [...currentData, ...baselineData];
  const xMin = Math.min(...allData.map(p => p.x));
  const xMax = Math.max(...allData.map(p => p.x));
  const yMin = 0;
  const yMax = Math.max(...allData.map(p => p.y));
  
  const margin = 40;
  const plotWidth = canvas.width - 2 * margin;
  const plotHeight = canvas.height - 2 * margin;

  // Draw grid
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;
  
  // Vertical grid lines
  for (let i = 0; i <= 10; i++) {
    const x = margin + (i / 10) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, canvas.height - margin);
    ctx.stroke();
  }
  
  // Horizontal grid lines
  for (let i = 0; i <= 10; i++) {
    const y = margin + (i / 10) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(canvas.width - margin, y);
    ctx.stroke();
  }

  // Draw baseline (black line at y=0)
  const baselineY = canvas.height - margin;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, baselineY);
  ctx.lineTo(canvas.width - margin, baselineY);
  ctx.stroke();

  // Draw baseline/initial profile (black line)
  if (baselineData.length > 1) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    baselineData.forEach((point, i) => {
      const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
      const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    
    ctx.stroke();
  }

  // Draw current wear profile with multi-color gradient
  if (currentData.length > 1) {
    ctx.lineWidth = 3;
    
    for (let i = 0; i < currentData.length - 1; i++) {
      const point1 = currentData[i];
      const point2 = currentData[i + 1];
      
      const px1 = margin + ((point1.x - xMin) / (xMax - xMin || 1)) * plotWidth;
      const py1 = canvas.height - margin - ((point1.y - yMin) / (yMax - yMin || 1)) * plotHeight;
      const px2 = margin + ((point2.x - xMin) / (xMax - xMin || 1)) * plotWidth;
      const py2 = canvas.height - margin - ((point2.y - yMin) / (yMax - yMin || 1)) * plotHeight;
      
      // Color based on thickness
      const avgThickness = (point1.thickness + point2.thickness) / 2;
      const color = getColorForThickness(avgThickness, dataBounds.minY, dataBounds.maxY);
      const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
      
      ctx.strokeStyle = hexColor;
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();
    }
  }

  // Draw baseline points (black circles)
  baselineData.forEach(point => {
    const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
    const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw current points with color mapping
  currentData.forEach(point => {
    const px = margin + ((point.x - xMin) / (xMax - xMin || 1)) * plotWidth;
    const py = canvas.height - margin - ((point.y - yMin) / (yMax - yMin || 1)) * plotHeight;
    
    const color = getColorForThickness(point.thickness, dataBounds.minY, dataBounds.maxY);
    const hexColor = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    
    ctx.fillStyle = hexColor;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Draw axes labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(xMin.toFixed(1), margin, canvas.height - 5);
  ctx.textAlign = 'right';
  ctx.fillText(xMax.toFixed(1), canvas.width - margin, canvas.height - 5);
  ctx.textAlign = 'left';
  ctx.fillText(`${yMax.toFixed(1)}`, 5, margin + 5);
  ctx.fillText('0', 5, canvas.height - margin + 5);
  
  // Axis titles
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(isHorizontal ? 'X Position' : 'Z Position', canvas.width / 2, canvas.height - 5);
  
  ctx.save();
  ctx.translate(15, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Thickness', 0, 0);
  ctx.restore();
};