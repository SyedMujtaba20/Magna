import React, { useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const CampaignReportScreen = ({ campaignInfo, thicknessGraphs }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const savedLang = localStorage.getItem("language") || "en";
    i18n.changeLanguage(savedLang);
  }, []);

  const chartStyle = { marginBottom: 40 };
  const areas = ["Bricks", "Slag Line", "Slopes"];

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 {t("report.title")}</h2>
      <p>{t("report.start")}: {campaignInfo.startDate}</p>
      <p>{t("report.duration", { days: campaignInfo.daysPassed })}</p>
      <hr />

      {areas.map((area) => (
        <div key={area} style={chartStyle}>
          <h3>{t(`report.areaTitle`, { area })}</h3>
          <LineChart width={600} height={250} data={thicknessGraphs[area]}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="day" />
            <YAxis label={{ value: "mm", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="thickness" stroke="#8884d8" />
          </LineChart>
        </div>
      ))}
    </div>
  );
};

export default CampaignReportScreen;
