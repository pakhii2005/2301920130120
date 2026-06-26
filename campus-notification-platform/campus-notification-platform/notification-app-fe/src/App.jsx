import React, { useState, useEffect } from 'react';

export default function NotificationDashboard() {
  const [notifications, setNotifications] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [loadingState, setLoadingState] = useState(true);
  const [networkError, setNetworkError] = useState(null);

  // Core Evaluation Service Endpoint
const FEED_API_URI = 'http://localhost:5001/api/v1/notifications';
  useEffect(() => {
    async function pullNotificationFeed() {
      try {
        setLoadingState(true);
        const feedback = await fetch(FEED_API_URI);
        if (!feedback.ok) {
          throw new Error(`Server returned faulty status code: ${feedback.status}`);
        }
        const dataPayload = await feedback.json();
        
        // Base mapping to ensure clean field properties
        const normalizedFeed = (dataPayload.notifications || []).map(item => ({
          uuid: item.ID || Math.random().toString(36).substring(2),
          category: item.Type || 'Event',
          title: item.Title || 'System Alert',
          content: item.Message || '',
          timestamp: item.Timestamp || new Date().toISOString(),
          isRead: false // UI initial state parameter
        }));

        setNotifications(normalizedFeed);
      } catch (err) {
        setNetworkError(err.message);
      } finally {
        setLoadingState(false);
      }
    }

    pullNotificationFeed();
  }, []);

  // Filter actions computation
  const filteredCollection = notifications.filter(item => 
    selectedFilter === 'All' ? true : item.category === selectedFilter
  );

  // Dynamically compute unread items count
  const totalUnreadCount = notifications.filter(item => !item.isRead).length;

  const toggleReadStatus = (targetUuid) => {
    setNotifications(prevItems => 
      prevItems.map(item => 
        item.uuid === targetUuid ? { ...item, isRead: !item.isRead } : item
      )
    );
  };

  if (loadingState) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', fontFamily: 'sans-serif' }}>
        <p style={{ fontSize: '1.25rem', color: '#4b5563' }}>Loading current notification matrix streams...</p>
      </div>
    );
  }

  if (networkError) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: '8px', fontFamily: 'sans-serif' }}>
        <h3 style={{ color: '#b91c1c', marginTop: 0 }}>System Connection Fault</h3>
        <p style={{ color: '#7f1d1d' }}>{networkError}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      
      {/* Header Container Area */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', margin: 0, color: '#111827' }}>Campus Hub Notification Center</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0' }}>Stay updated with real-time academic feeds</p>
        </div>
        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '20px', padding: '0.5rem 1rem', color: '#1e40af', fontWeight: '600', fontSize: '0.875rem' }}>
          Active Unread Items: {totalUnreadCount}
        </div>
      </header>

      {/* Filter Control Section */}
      <nav style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {['All', 'Placement', 'Result', 'Event'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedFilter(type)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              backgroundColor: selectedFilter === type ? '#2563eb' : '#ffffff',
              color: selectedFilter === type ? '#ffffff' : '#374151'
            }}
          >
            {type}
          </button>
        ))}
      </nav>

      {/* Main Feed Container Section */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredCollection.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed #e5e7eb', borderRadius: '8px', color: '#6b7280' }}>
            No notifications found matching the selected category filter criteria.
          </div>
        ) : (
          filteredCollection.map(item => (
            <section 
              key={item.uuid}
              style={{
                padding: '1.25rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: item.isRead ? '#f9fafb' : '#ffffff',
                borderLeft: item.isRead ? '4px solid #d1d5db' : 
                             item.category === 'Placement' ? '4px solid #db2777' : 
                             item.category === 'Result' ? '4px solid #9333ea' : '4px solid #ea580c',
                opacity: item.isRead ? 0.75 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '1.5rem'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: item.category === 'Placement' ? '#fce7f3' : item.category === 'Result' ? '#f3e8ff' : '#ffedd5',
                    color: item.category === 'Placement' ? '#9d174d' : item.category === 'Result' ? '#6b21a8' : '#9a3412'
                  }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: '0 0 0.5rem 0', color: item.isRead ? '#4b5563' : '#111827' }}>
                  {item.title}
                </h2>
                <p style={{ fontSize: '0.925rem', margin: 0, color: '#4b5563', lineHeight: '1.4' }}>
                  {item.content}
                </p>
              </div>

              <button
                onClick={() => toggleReadStatus(item.uuid)}
                style={{
                  flexShrink: 0,
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #d1d5db',
                  backgroundColor: item.isRead ? '#ffffff' : '#f3f4f6',
                  color: '#374151'
                }}
              >
                {item.isRead ? 'Mark Unread' : 'Mark Read'}
              </button>
            </section>
          ))
        )}
      </main>
    </div>
  );
}