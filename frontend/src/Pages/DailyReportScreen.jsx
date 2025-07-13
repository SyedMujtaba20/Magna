import React, { useMemo,useEffect  } from "react";
import { useTranslation } from "react-i18next";

const DailyReportScreen = ({
  campaignInfo = {},
  wearImage,
  thicknessTableData = {},
  repairProposals = {},
}) => {
  const { t } = useTranslation();

  // Memoize table rendering
  const tableContent = useMemo(() => {
    const headers = Object.keys(thicknessTableData || {});
    if (headers.length === 0) return <p className="text-gray-600">{t("dailyReport.noData")}</p>;

    const numRows = thicknessTableData[headers[0]]?.length || 0;
    const rows = Array.from({ length: numRows }).map((_, index) => (
      <tr key={index}>
        {headers.map((header) => (
          <td
            key={header}
            className="px-4 py-2 border border-gray-200 text-right"
          >
            {thicknessTableData[header]?.[index] ?? "-"}
          </td>
        ))}
      </tr>
    ));

    return (
      <table className="w-full border-collapse bg-white rounded-md shadow-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-2 bg-blue-500 text-white text-left"
              >
                {t(`dailyReport.${header.toLowerCase().replace(/\s+/g, "")}`, header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  }, [thicknessTableData, t]);

  // Memoize repair proposals
  const repairProposalsContent = useMemo(() => {
    const entries = Object.entries(repairProposals || {});
    if (entries.length === 0) return <p className="text-gray-600">{t("dailyReport.noProposals")}</p>;

    return entries.map(([key, value]) => (
      <div key={key} className="mb-2 text-sm">
        <strong>{t(`dailyReport.${key.toLowerCase().replace(/\s+/g, "")}`, key)}:</strong>{" "}
        {value || t("dailyReport.noProposal")}
      </div>
    ));
  }, [repairProposals, t]);

  return (
    <div className="p-5 bg-gray-100 rounded-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">{t("dailyReport.title")}</h2>

      <div className="flex flex-col gap-5">
        {/* Campaign Info */}
        <div className="text-sm">
          <p>
            <strong>{t("dailyReport.campaign")}:</strong>{" "}
            {campaignInfo.campaignName || t("dailyReport.noCampaign")}
          </p>
          <p>
            <strong>{t("dailyReport.date")}:</strong>{" "}
            {campaignInfo.startDate || t("dailyReport.noDate")}
          </p>
        </div>

        {/* Wear Image */}
        {wearImage && (
          <div className="max-w-full text-center">
            <img
              src={wearImage}
              alt={t("dailyReport.wearImage")}
              className="max-w-full rounded-md"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/assets/fallback-image.png";
              }}
            />
          </div>
        )}

        {/* Thickness Table */}
        <div className="mt-5">
          <h3 className="text-lg font-semibold mb-2">{t("dailyReport.thicknessTable")}</h3>
          {tableContent}
        </div>

        {/* Repair Proposals */}
        <div className="mt-5">
          <h3 className="text-lg font-semibold mb-2">{t("dailyReport.repairProposals")}</h3>
          {repairProposalsContent}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DailyReportScreen);