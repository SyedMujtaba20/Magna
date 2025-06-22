import React from "react";

const GradientScale = () => {
  const gradientStops = [
    { distance: "1.00m", color: "#0000FF" },
    { distance: "2.20m", color: "#00BFFF" },
    { distance: "3.40m", color: "#00FF00" },
    { distance: "4.60m", color: "#FFFF00" },
    { distance: "5.80m", color: "#FF0000" },
    { distance: "7.00m", color: "#FFC0CB" },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "15px",
        color: "white",
        fontSize: "12px",
      }}
    >
      <span style={{ color: "#cccccc", fontWeight: "500" }}>
        Thickness Scale:
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: `linear-gradient(to right, ${gradientStops
            .map((stop) => stop.color)
            .join(", ")})`,
          height: "20px",
          width: "300px",
          borderRadius: "10px",
          border: "1px solid #404040",
          position: "relative",
        }}
      >
        {gradientStops.map((stop, index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${(index / (gradientStops.length - 1)) * 100}%`,
              transform: "translateX(-50%)",
              bottom: "-25px",
              fontSize: "10px",
              color: "#cccccc",
              whiteSpace: "nowrap",
            }}
          >
            {stop.distance}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GradientScale;