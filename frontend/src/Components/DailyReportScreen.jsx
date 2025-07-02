import React from "react";

const DailyReportScreen = ({ campaignInfo, wearImage, thicknessTableData, repairProposals }) => {
  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <section>
        <h2>📅 Daily Report</h2>
        <p>Campaign Start: {campaignInfo.startDate}</p>
        <p>Days Passed: {campaignInfo.daysPassed}</p>
        <p>Campaign #: {campaignInfo.number}</p>
        <p>Casting Date: {campaignInfo.castingDate}</p>
        <p>Castings: {campaignInfo.castCount}</p>
      </section>

      {/* Page 1 - Wear Image + Thickness Table */}
      <hr />
      <section>
        <h3>Wear Visualization</h3>
        <img src={wearImage} alt="Furnace Wear View" style={{ maxWidth: "100%", border: "1px solid #ccc" }} />

        <h3>🧱 Remaining Thickness (mm)</h3>
        <table border="1" cellPadding="8" style={{ width: "100%", marginTop: 10 }}>
          <thead>
            <tr>
              <th>Section</th>
              <th>Brick 1</th>
              <th>Brick 2</th>
              <th>Brick 3</th>
              {/* Add more if needed */}
            </tr>
          </thead>
          <tbody>
            {["Bricks", "Slag Line", "Slopes"].map((section) => (
              <tr key={section}>
                <td>{section}</td>
                {thicknessTableData[section]?.map((value, idx) => (
                  <td key={idx}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Page 2 - Repair Proposal */}
      <hr />
      <section>
        <h3>🛠️ Repair Proposal</h3>
        {["Bricks", "Slag Line", "Slopes"].map((area) => (
          <div key={area} style={{ marginBottom: 10 }}>
            <strong>{area}</strong>: {repairProposals[area]}
          </div>
        ))}
      </section>
    </div>
  );
};

export default DailyReportScreen;
