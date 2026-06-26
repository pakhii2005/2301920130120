import React, { useState, useEffect } from 'react';
import './App.css';

const FEED_API_URI = 'http://localhost:5001/api/v1/notifications';
const STREAM_API_URI = 'http://localhost:5001/api/v1/notifications/stream';

function App() {
  const [notifications, setNotifications] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch data from backend
  useEffect(() => {
    fetchNotifications();
  }, [activeCategory]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const categoryParam = activeCategory !== 'All' ? `?category=${activeCategory}` : '';
      const response = await fetch(`${FEED_API_URI}${categoryParam}`);
      
      if (!response.ok) {
        throw new Error(`Failed to pull data feeds. Status: ${response.status}`);
      }
      
      const payload = await response.json();
      
      // Resilient extraction for both cache and database response schemas
      if (payload.notifications) {
        setNotifications(payload.notifications);
      } else if (payload.data && Array.isArray(payload.data)) {
        setNotifications(payload.data);
      } else {
        setNotifications([]);
      }
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Real-time stream listener
  useEffect(() => {
    const liveStream = new EventSource(STREAM_API_URI);

    liveStream.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (parsedData.type === 'NEW_NOTIFICATION') {
          const newAlert = parsedData.data;
          setNotifications((prev) => {
            if (activeCategory !== 'All' && newAlert.Type.toLowerCase() !== activeCategory.toLowerCase()) {
              return prev;
            }
            return [newAlert, ...prev];
          });
        }
      } catch (parseErr) {
        console.error("Stream sync error:", parseErr);
      }
    };

    return () => liveStream.close();
  }, [activeCategory]);

  // 3. Acknowledge function
  const handleAcknowledge = async (id) => {
    try {
      const response = await fetch(`${FEED_API_URI}/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(item => item.ID === id ? { ...item, isRead: true } : item)
        );
      }
    } catch (err) {
      console.error("Failed to acknowledge:", err);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Campus Hub Notification Center</h1>
      </header>

      <div className="filter-tabs">
        {['All', 'Placement', 'Result', 'Event'].map((category) => (
          <button
            key={category}
            className={`tab-btn ${activeCategory === category ? 'active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <main className="dashboard-view">
        {loading && <div className="state-message">Syncing data...</div>}
        {error && <div className="state-message error">System Error: {error}</div>}
        
        {!loading && !error && (
          <div className="notification-list">
            {notifications.map((item) => (
              <div 
                key={item.ID} 
                className={`notification-card ${item.Type.toLowerCase()} ${item.isRead ? 'read' : 'unread'}`}
              >
                <div className="card-badge">{item.Type}</div>
                <div className="card-content">
                  <h3>{item.Title}</h3>
                  <p>{item.Message}</p>
                  <span className="timestamp">{new Date(item.Timestamp).toLocaleTimeString()}</span>
                </div>
                {!item.isRead && (
                  <button className="ack-btn" onClick={() => handleAcknowledge(item.ID)}>✓</button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;