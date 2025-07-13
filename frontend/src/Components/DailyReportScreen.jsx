import React from "react";

const DailyReportScreen = ({ 
  campaignInfo, 
  wearImage, 
  thicknessTableData, 
  repairProposals,
  // 🆕 NEW: Gunning data integration props
  gunningData = null,
  gunningWearImages = {},
  hasGunningAnalysis = false
}) => {
  // 🆕 NEW: Calculate gunning summary statistics
  const gunningSummary = React.useMemo(() => {
    if (!hasGunningAnalysis || !gunningData) return null;

    let totalAreas = 0;
    let totalCost = 0;
    let totalVolume = 0;
    let totalWeight = 0;
    const sectionsAnalyzed = [];

    if (gunningData.bricks?.repairProposal) {
      totalAreas += gunningData.bricks.repairProposal.areas.length;
      totalCost += gunningData.bricks.repairProposal.total.cost;
      totalVolume += gunningData.bricks.repairProposal.total.volume;
      totalWeight += gunningData.bricks.repairProposal.total.weight;
      sectionsAnalyzed.push('Bricks');
    }
    if (gunningData.slagLine?.repairProposal) {
      totalAreas += gunningData.slagLine.repairProposal.areas.length;
      totalCost += gunningData.slagLine.repairProposal.total.cost;
      totalVolume += gunningData.slagLine.repairProposal.total.volume;
      totalWeight += gunningData.slagLine.repairProposal.total.weight;
      sectionsAnalyzed.push('Slag Line');
    }
    if (gunningData.screed?.repairProposal) {
      totalAreas += gunningData.screed.repairProposal.areas.length;
      totalCost += gunningData.screed.repairProposal.total.cost;
      totalVolume += gunningData.screed.repairProposal.total.volume;
      totalWeight += gunningData.screed.repairProposal.total.weight;
      sectionsAnalyzed.push('Screed');
    }

    return {
      sectionsAnalyzed,
      totalAreas,
      totalCost,
      totalVolume,
      totalWeight
    };
  }, [hasGunningAnalysis, gunningData]);

  // 🆕 NEW: Helper function to get section-specific data
  const getSectionData = (sectionName) => {
    const sectionKey = sectionName === "Slag Line" ? "slagLine" : sectionName.toLowerCase();
    const sectionData = gunningData?.[sectionKey];
    
    return {
      hasData: !!sectionData,
      wornPoints: sectionData?.wornPoints?.length || 0,
      repairAreas: sectionData?.repairProposal?.areas?.length || 0,
      totalCost: sectionData?.repairProposal?.total?.cost || 0,
      totalVolume: sectionData?.repairProposal?.total?.volume || 0,
      totalWeight: sectionData?.repairProposal?.total?.weight || 0,
      material: sectionData?.repairProposal?.total?.material || 'N/A',
      parameters: sectionData?.repairProposal?.parameters || null,
      screenshot: gunningWearImages[sectionKey] || null
    };
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif', overflowY:"auto" }}>
      {/* Header */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          color: '#333', 
          borderBottom: '2px solid #007bff', 
          paddingBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📅 Daily Report
          {/* 🆕 NEW: Gunning enhancement badge */}
          {hasGunningAnalysis && (
            <span style={{
              backgroundColor: '#28a745',
              color: 'white',
              fontSize: '12px',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: 'bold'
            }}>
              + GUNNING ANALYSIS
            </span>
          )}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
          <p><strong>Campaign Start:</strong> {campaignInfo.startDate}</p>
          <p><strong>Days Passed:</strong> {campaignInfo.daysPassed}</p>
          <p><strong>Campaign #:</strong> {campaignInfo.number}</p>
          <p><strong>Casting Date:</strong> {campaignInfo.castingDate}</p>
          <p><strong>Castings:</strong> {campaignInfo.castCount}</p>
        </div>
      </section>

      {/* 🆕 NEW: Gunning Analysis Executive Summary */}
      {hasGunningAnalysis && gunningSummary && (
        <section style={{ 
          marginBottom: '24px',
          backgroundColor: '#f8f9fa',
          border: '2px solid #28a745',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h3 style={{ 
            color: '#155724', 
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🔧 Gunning Analysis Executive Summary
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div>
              <strong>Sections Analyzed:</strong> {gunningSummary.sectionsAnalyzed.join(', ')}
            </div>
            <div>
              <strong>Repair Areas:</strong> {gunningSummary.totalAreas}
            </div>
            <div>
              <strong>Total Volume:</strong> {gunningSummary.totalVolume.toFixed(3)} m³
            </div>
            <div>
              <strong>Total Weight:</strong> {gunningSummary.totalWeight.toFixed(1)} kg
            </div>
          </div>
          <div style={{
            backgroundColor: '#155724',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            💰 Total Estimated Repair Cost: ${gunningSummary.totalCost.toFixed(0)} USD
          </div>
        </section>
      )}

      {/* 🆕 NEW: Section-by-Section Analysis with Data + Screenshots */}
      {hasGunningAnalysis && (
        <>
          <hr style={{ margin: '24px 0', border: '1px solid #ddd' }} />
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#333', marginBottom: '20px' }}>📊 Section-by-Section Analysis</h3>
            
            {["Bricks", "Slag Line", "Screed"].map((sectionName) => {
              const sectionData = getSectionData(sectionName);
              const sectionColor = {
                "Bricks": "#FF4444",
                "Slag Line": "#FF8800", 
                "Screed": "#8844FF"
              }[sectionName];

              return (
                <div key={sectionName} style={{
                  marginBottom: '32px',
                  border: `2px solid ${sectionColor}`,
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {/* Section Header */}
                  <div style={{
                    backgroundColor: sectionColor,
                    color: 'white',
                    padding: '12px 16px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🔧 {sectionName} Analysis
                    {sectionData.hasData && (
                      <span style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px'
                      }}>
                        {sectionData.repairAreas} Areas Found
                      </span>
                    )}
                  </div>

                  {/* Content: Data on Left, Screenshot on Right */}
                  <div style={{ display: 'flex', minHeight: '400px' }}>
                    {/* Left Side - Data Information */}
                    <div style={{ 
                      flex: 1, 
                      padding: '20px',
                      backgroundColor: '#fafafa'
                    }}>
                      {sectionData.hasData ? (
                        <>
                          {/* Key Metrics */}
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ 
                              margin: '0 0 12px 0', 
                              color: sectionColor,
                              fontSize: '14px'
                            }}>
                              📊 Key Metrics
                            </h4>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr', 
                              gap: '8px',
                              fontSize: '13px'
                            }}>
                              <div><strong>Worn Points:</strong> {sectionData.wornPoints}</div>
                              <div><strong>Repair Areas:</strong> {sectionData.repairAreas}</div>
                              <div><strong>Volume:</strong> {sectionData.totalVolume.toFixed(3)} m³</div>
                              <div><strong>Weight:</strong> {sectionData.totalWeight.toFixed(1)} kg</div>
                            </div>
                          </div>

                          {/* Cost Analysis */}
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ 
                              margin: '0 0 12px 0', 
                              color: sectionColor,
                              fontSize: '14px'
                            }}>
                              💰 Cost Analysis
                            </h4>
                            <div style={{
                              backgroundColor: '#fff',
                              padding: '12px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}>
                              <div style={{ fontSize: '18px', fontWeight: 'bold', color: sectionColor }}>
                                ${sectionData.totalCost.toFixed(0)} USD
                              </div>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                Material: {sectionData.material}
                              </div>
                            </div>
                          </div>

                          {/* Analysis Parameters */}
                          {sectionData.parameters && (
                            <div style={{ marginBottom: '20px' }}>
                              <h4 style={{ 
                                margin: '0 0 12px 0', 
                                color: sectionColor,
                                fontSize: '14px'
                              }}>
                                ⚙️ Analysis Parameters
                              </h4>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                <div>• Wear Threshold: {sectionData.parameters.wearThreshold}cm</div>
                                <div>• Distance Between Areas: {sectionData.parameters.distanceBetweenAreas}m</div>
                                <div>• Minimum Area Size: {sectionData.parameters.minimumAreaSize} points</div>
                              </div>
                            </div>
                          )}

                          {/* Repair Recommendation */}
                          <div>
                            <h4 style={{ 
                              margin: '0 0 12px 0', 
                              color: sectionColor,
                              fontSize: '14px'
                            }}>
                              🛠️ Repair Recommendation
                            </h4>
                            <div style={{
                              backgroundColor: '#fff',
                              padding: '12px',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              fontSize: '13px',
                              lineHeight: '1.4'
                            }}>
                              {repairProposals[sectionName] || 'No specific recommendations available.'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: '#666',
                          fontSize: '14px',
                          textAlign: 'center'
                        }}>
                          <div>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                            <div><strong>No Gunning Analysis Available</strong></div>
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                              Run gunning analysis for this section to see detailed data
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side - Screenshot */}
                    <div style={{ 
                      flex: 1, 
                      padding: '20px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 12px 0', 
                        color: sectionColor,
                        fontSize: '14px'
                      }}>
                        📸 Analysis Visualization
                      </h4>
                      
                      {sectionData.screenshot ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <img 
                            src={sectionData.screenshot} 
                            alt={`${sectionName} Gunning Analysis Visualization`}
                            style={{ 
                              width: '100%',
                              height: '300px',
                              objectFit: 'contain',
                              border: `2px solid ${sectionColor}`,
                              borderRadius: '4px',
                              backgroundColor: '#000'
                            }} 
                          />
                          <div style={{
                            marginTop: '12px',
                            fontSize: '11px',
                            color: '#666',
                            textAlign: 'center'
                          }}>
                            🔘 Grey: Healthy furnace areas<br/>
                            🔴 Red: Areas requiring gunning repair
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '2px dashed #ccc',
                          borderRadius: '4px',
                          color: '#666',
                          fontSize: '14px',
                          textAlign: 'center',
                          backgroundColor: '#fff'
                        }}>
                          <div>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
                            <div><strong>No Screenshot Available</strong></div>
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                              Capture a screenshot during gunning analysis<br/>
                              to include visualization in reports
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      {/* Standard Thickness Table (Compact Version) */}
      <hr style={{ margin: '24px 0', border: '1px solid #ddd' }} />
      <section style={{ marginBottom: '24px' }}>
        <h3 style={{ color: '#333', marginBottom: '12px' }}>🧱 Traditional Thickness Measurements</h3>
        <table border="1" cellPadding="8" style={{ 
          width: "100%", 
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Section</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Measurement 1</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Measurement 2</th>
              <th style={{ textAlign: 'center', padding: '8px' }}>Measurement 3</th>
            </tr>
          </thead>
          <tbody>
            {["Bricks", "Slag Line", "Screed"].map((section) => (
              <tr key={section}>
                <td style={{ fontWeight: 'bold', padding: '8px' }}>{section}</td>
                {thicknessTableData[section]?.slice(0, 3).map((value, idx) => (
                  <td key={idx} style={{ textAlign: 'center', padding: '8px' }}>{value}</td>
                ))}
                {/* Fill empty cells if less than 3 measurements */}
                {Array.from({ length: Math.max(0, 3 - (thicknessTableData[section]?.length || 0)) }, (_, idx) => (
                  <td key={`empty-${idx}`} style={{ textAlign: 'center', padding: '8px' }}>-</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 🆕 NEW: Technical Appendix for Gunning Data */}
      {hasGunningAnalysis && (
        <>
          <hr style={{ margin: '24px 0', border: '1px solid #ddd' }} />
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#333', marginBottom: '16px' }}>📋 Technical Appendix</h3>
            <div style={{ 
              fontSize: '12px', 
              color: '#666',
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Analysis Configuration:</div>
              {Object.entries(gunningData).map(([sectionKey, sectionData]) => {
                if (!sectionData?.repairProposal?.parameters) return null;
                const sectionName = sectionKey === 'slagLine' ? 'Slag Line' : 
                                  sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1);
                return (
                  <div key={sectionKey} style={{ marginBottom: '4px' }}>
                    <strong>{sectionName}:</strong> 
                    {` Threshold: ${sectionData.repairProposal.parameters.wearThreshold}cm, `}
                    {`Distance: ${sectionData.repairProposal.parameters.distanceBetweenAreas}m, `}
                    {`Min Area: ${sectionData.repairProposal.parameters.minimumAreaSize} points`}
                  </div>
                );
              })}
              <div style={{ marginTop: '12px', fontStyle: 'italic', borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                Report generated on {new Date().toLocaleString()} with LIDAR Furnace Analysis System v2.0
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default DailyReportScreen;