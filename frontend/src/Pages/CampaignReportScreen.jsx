import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

const CampaignReportScreen = ({ campaignInfo = {}, thicknessGraphs = {} }) => {
  const { t } = useTranslation();

  // Memoize chart data for each category
  const chartData = useMemo(() => {
    return Object.keys(thicknessGraphs).map((key) => ({
      type: "line",
      data: {
        labels: thicknessGraphs[key].map((data) => data.day),
        datasets: [
          {
            label: t(`campaignReport.${key.toLowerCase().replace(/\s+/g, "")}`),
            data: thicknessGraphs[key].map((data) => data.thickness),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
            labels: { color: "#333" },
          },
          title: {
            display: true,
            text: t(`campaignReport.${key.toLowerCase().replace(/\s+/g, "")}`),
            color: "#333",
            font: { size: 16 },
          },
        },
        scales: {
          x: {
            title: { display: true, text: t("campaignReport.day"), color: "#333" },
            ticks: { color: "#333" },
          },
          y: {
            title: { display: true, text: t("campaignReport.thickness"), color: "#333" },
            ticks: { color: "#333" },
            suggestedMin: 0,
          },
        },
      },
    }));
  }, [thicknessGraphs, t]);

  return (
    <div className="p-5 bg-gray-100 rounded-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">{t("campaignReport.title")}</h2>
      <div className="flex flex-col gap-5">
        <div className="text-sm">
          <p>
            <strong>{t("campaignReport.campaign")}</strong>{" "}
            {campaignInfo.campaignName || t("campaignReport.noCampaign")}
          </p>
          <p>
            <strong>{t("campaignReport.startDate")}</strong>{" "}
            {campaignInfo.startDate || t("campaignReport.noDate")}
          </p>
          <p>
            <strong>{t("campaignReport.endDate")}</strong>{" "}
            {campaignInfo.endDate || t("campaignReport.noDate")}
          </p>
        </div>
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {thicknessGraphs && Object.keys(thicknessGraphs).length > 0 ? (
            chartData.map((chart, index) => (
              <div
                key={index}
                className="bg-white p-2 rounded-md shadow-sm"
              >
                ```chartjs
                {chart}
                ```
              </div>
            ))
          ) : (
            <div className="text-center text-gray-600 p-5">
              {t("campaignReport.noData")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(CampaignReportScreen);