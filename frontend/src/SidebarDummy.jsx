// Sidebar.js
import React, { useState } from 'react';
import {
  Play,
  RefreshCw,
  BellOff,
  Monitor,
  BarChart2,
  Settings,
  FileText,
  Download,
} from 'lucide-react';
import { FaRegFolderOpen } from 'react-icons/fa'; // Import the new folder icon
import './Sidebar.css'; // Add this line to import the CSS

const Sidebar = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectBy, setSelectBy] = useState('Initial date');
  const [campaignNumber, setCampaignNumber] = useState('7');
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const initialDates = [27, 28, 4];
  const finalDates = [28, 4, 27];

  const handleDialogOpen = () => setIsDialogOpen(true);
  const handleDialogClose = () => setIsDialogOpen(false);

  const renderCalendar = () => {
    const highlightedDates = selectBy === 'Initial date' ? initialDates : finalDates;
    const highlightClass = selectBy === 'Initial date' ? 'highlight-green' : 'highlight-orange';

    return (
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="calendar-header">{day}</div>
        ))}
        {daysInMonth.map((day) => (
          <div
            key={day}
            className={`calendar-day ${highlightedDates.includes(day) ? highlightClass : ''} ${
              selectedDate === day ? 'selected-day' : ''
            }`}
            onClick={() => setSelectedDate(day)}
          >
            {day}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-content-scrollable"> {/* Added scrollable container */}
        <div className="main-content">
          <div>
            <h3 className="section-title">Cycle</h3>
            <div className="button-group">
              <button className="btn">
                <Play size={16} /> Start
              </button>
              <button className="btn">
                <RefreshCw size={16} /> Template
              </button>
              <button className="btn">
                <BellOff size={16} /> Reset Alarm
              </button>
            </div>
            <div className="indicator-grid">
              <div className="dot red" />
              <div className="dot green" />
              <div className="dot gray" />
              <div className="dot red" />
              <div className="dot green" />
              <div className="dot gray" />
            </div>
          </div>

          <div>
            <h3 className="section-title">Screens</h3>
            <div className="button-group">
              <button className="btn">
                <Monitor size={16} /> 3D View
              </button>
              <button className="btn">
                <BarChart2 size={16} /> Analysis
              </button>
              <button className="btn">
                <Settings size={16} /> Gunning
              </button>
            </div>
          </div>

          <div>
            <h3 className="section-title">Actions</h3>
            <div className="button-group">
              <button className="btn">
                <FileText size={16} /> Create Report
              </button>
              <button className="btn">
                <Download size={16} /> Download Images
              </button>
            </div>
          </div>

          <div className="info-box">
            <h3>Measurement Info</h3>
            <p>Campaign: 2023-09-27</p>
            <p>No. of Casts: -</p>
            <p>Date: 2023-09-27 06:13</p>
          </div>

        </div>



              <div className="footer-buttons">
        <button className="footer-btn">{'<'}</button>
        {/* Existing folder button */}
        <button className="footer-btn" onClick={handleDialogOpen}>
          📁
        </button>
        {/* New folder button added */}
        {/* <button className="footer-btn" onClick={handleDialogOpen}>
          <FaRegFolderOpen size={16} /> {/* Using FaRegFolderOpen icon */}
        {/* </button>  */}
        <button className="footer-btn">{'>'}</button>
      </div>
      </div> {/* End of scrollable content */}



      {isDialogOpen && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <div className="dialog-header">
              <h2>Cycle Selection</h2>
              <button onClick={handleDialogClose}>✕</button>
            </div>

            <div className="select-group">
              <label>Select by:</label>
              <select value={selectBy} onChange={(e) => setSelectBy(e.target.value)}>
                <option>Initial date</option>
                <option>Final date</option>
                <option>Campaign number</option>
              </select>
            </div>

            {selectBy === 'Campaign number' ? (
              <div className="input-group">
                <label>Enter campaign number:</label>
                <input
                  type="text"
                  value={campaignNumber}
                  onChange={(e) => setCampaignNumber(e.target.value)}
                />
                <button className="search-btn">Search</button>
              </div>
            ) : (
              <div className="calendar-container">
                <div className="calendar-section">
                  <div className="calendar-month">September, 2023</div>
                  {renderCalendar()}
                </div>
                <div className="history-section">
                  <h3>
                    {selectBy === 'Initial date'
                      ? 'History - 27/09/2023'
                      : 'History - 05/09/2023'}
                  </h3>
                  <ul>
                    {selectBy === 'Initial date' ? (
                      <>
                        <li>2023.09.27 08:44</li>
                        <li>2023.09.27 08:45</li>
                        <li>2023.09.27 08:46</li>
                        <li>2023.09.27 08:47</li>
                        <li>2023.09.27 08:49</li>
                        <li>2023.09.27 08:50</li>
                        <li>2023.09.27 08:51</li>
                        <li>2023.09.27 08:53</li>
                      </>
                    ) : (
                      <>
                        <li>2023.08.28 09:10</li>
                        <li>2023.09.05 12:04</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <div className="dialog-footer">
              <button onClick={handleDialogClose}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;