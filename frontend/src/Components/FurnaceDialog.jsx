import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const FurnaceDialog = ({ isOpen, onClose }) => {
  const [furnaces, setFurnaces] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [scans, setScans] = useState([]);
  const [selectedFurnace, setSelectedFurnace] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newFurnaceName, setNewFurnaceName] = useState("");
  const [showAddFurnace, setShowAddFurnace] = useState(false);

  const handleAddFurnace = async () => {
    if (!newFurnaceName.trim()) return setError("Furnace name is required");
    try {
      setIsLoading(true);
      const res = await axios.post(`${API_BASE}/api/furnaces`, {
        name: newFurnaceName,
        geometry: null, // or pass valid GeoJSON geometry if available
      });
      setNewFurnaceName("");
      setShowAddFurnace(false);
      fetchFurnaces(); // Refresh list
    } catch (err) {
      console.error("Failed to add furnace:", err);
      setError("Failed to add furnace");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log("Dialog opened, selectedFurnace:", selectedFurnace);
      resetDialog();
      fetchFurnaces();
    }
  }, [isOpen]);

  const resetDialog = () => {
    setSelectedFurnace(null);
    setSelectedCampaign(null);
    setCampaigns([]);
    setScans([]);
    setFile(null);
    setError(null);
  };

  const fetchFurnaces = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`${API_BASE}/api/furnaces`);
      console.log("Furnaces data:", res.data);
      setFurnaces(res.data);
    } catch (err) {
      console.error("Error fetching furnaces:", err);
      setError("Failed to fetch furnaces");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCampaigns = async (furnaceId) => {
    try {
      setSelectedFurnace(furnaceId);
      setSelectedCampaign(null);
      setScans([]);
      setIsLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/campaigns?furnace_id=${furnaceId}`
      );
      setCampaigns(res.data);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Failed to fetch campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScans = async (campaignId) => {
    try {
      setSelectedCampaign(campaignId);
      setIsLoading(true);
      const res = await axios.get(
        `${API_BASE}/api/scans?campaign_id=${campaignId}`
      );
      setScans(res.data);
    } catch (err) {
      console.error("Error fetching scans:", err);
      setError("Failed to fetch scans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const uploadScan = async () => {
    if (!file || !selectedCampaign) {
      return setError("Please select a file and campaign first");
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("campaign_id", selectedCampaign);

      await axios.post(`${API_BASE}/api/scans/upload`, formData);
      alert("Scan uploaded!");
      fetchScans(selectedCampaign);
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to upload scan");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  return "";
  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        {isLoading && <div>Loading...</div>}
        {error && <div style={{ color: "#ef4444" }}>{error}</div>}

        {/* Step 1 - Furnaces */}
        {!selectedFurnace && (
          <>
            <h2>📁 Select a Furnace</h2>
            {furnaces.length > 0 ? (
              <ul>
                {furnaces.map((f) => (
                  <li
                    key={f.furnace_id}
                    onClick={() => fetchCampaigns(f.furnace_id)}
                  >
                    {f.name || "Unnamed Furnace"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No furnaces available</p>
            )}

            {showAddFurnace ? (
              <div style={{ marginTop: "1rem" }}>
                <input
                  type="text"
                  value={newFurnaceName}
                  onChange={(e) => setNewFurnaceName(e.target.value)}
                  placeholder="Enter Furnace Name"
                />
                <button onClick={handleAddFurnace}>✅ Save</button>
                <button onClick={() => setShowAddFurnace(false)}>
                  ❌ Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAddFurnace(true)}>
                ➕ Add Furnace
              </button>
            )}
          </>
        )}

        {/* Step 2 - Campaigns */}
        {selectedFurnace && !selectedCampaign && (
          <>
            <h3>📊 Campaigns</h3>
            <ul>
              {campaigns.map((c) => (
                <li
                  key={c.campaign_id}
                  onClick={() => fetchScans(c.campaign_id)}
                >
                  {c.name || "Unnamed Campaign"}
                </li>
              ))}
            </ul>
            <button onClick={() => alert("Add Campaign logic")}>
              ➕ Add Campaign
            </button>
            <button onClick={resetDialog}>🔙 Back to Furnaces</button>
          </>
        )}

        {/* Step 3 - Scans */}
        {selectedCampaign && (
          <>
            <h4>📈 Scans</h4>
            <ul>
              {scans.map((s) => (
                <li key={s.scan_id}>{s.scan_name}</li>
              ))}
            </ul>
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <button onClick={uploadScan}>⬆️ Upload Scan</button>
            <button onClick={() => setSelectedCampaign(null)}>
              🔙 Back to Campaigns
            </button>
          </>
        )}

        <button onClick={onClose}>❌ Close</button>
      </div>
    </div>
  );
};

export default FurnaceDialog;
