/**
 * Campus Notification Platform - Optimized High-Performance Dashboard
 * Styling Paradigm: Strictly Material UI Core Engine Components
 * Middleware Rule: Extensive custom logging integration applied.
 */
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Box, 
  AppBar, 
  Toolbar, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StarIcon from '@mui/icons-material/Star';
import axios from 'axios';
import { AppLogger } from './services/logger';

const WEIGHT_MATRIX = { 'Placement': 3, 'Result': 2, 'Event': 1 };
const ENDPOINT_URL = 'http://42.224.186.213/evaluation-service/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [masterNotifications, setMasterNotifications] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    // Edge-Case Mitigation: Instantiate AbortController to handle abrupt view unmounts safely
    const infrastructureAbortController = new AbortController();
    
    const streamIngressPipeline = async () => {
      try {
        AppLogger.info('AppInit', 'Triggering target notification pipeline fetch.');
        setLoading(true);
        
        const requestPayload = await axios.get(ENDPOINT_URL, {
          signal: infrastructureAbortController.signal
        });
        
        if (requestPayload.data && Array.isArray(requestPayload.data.notifications)) {
          setMasterNotifications(requestPayload.data.notifications);
          AppLogger.success('AppInit', `Successfully structuralized ${requestPayload.data.notifications.length} notices.`);
        } else {
          throw new Error('Data validation exception: Invalid schema return contract.');
        }
      } catch (err) {
        if (axios.isCancel(err)) {
          AppLogger.warn('AppInit', 'Data fetch routine gracefully aborted via component cleanup.');
        } else {
          AppLogger.error('AppInit', 'Exception caught while processing API ingestion.', err);
          setErrorStatus(err.message || 'Failed to pull live server records.');
        }
      } finally {
        setLoading(false);
      }
    };

    streamIngressPipeline();

    // Cleanup phase tracking closure to ensure no stray memory bindings remain active
    return () => {
      AppLogger.info('AppCleanup', 'Executing pipeline abort connection cleanup.');
      infrastructureAbortController.abort();
    };
  }, []);

  const filteredDataset = masterNotifications.filter(item => {
    if (categoryFilter === 'All') return true;
    return item.Type === categoryFilter;
  });

  const calculatedPriorityInbox = [...masterNotifications]
    .sort((a, b) => {
      const weightA = WEIGHT_MATRIX[a.Type] || 0;
      const weightB = WEIGHT_MATRIX[b.Type] || 0;
      if (weightA === weightB) {
        return new Date(b.Timestamp) - new Date(a.Timestamp);
      }
      return weightB - weightA;
    })
    .slice(0, 10);

  return (
    <Box sx={{ flexGrow: 1, backgroundColor: '#f4f6f9', minHeight: '100vh' }}>
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar sx={{ backgroundColor: '#1a237e' }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: '700', letterSpacing: '0.5px' }}>
            🎓 Campus Announcement & Alerts Portal
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, index) => {
              AppLogger.info('NavigationUI', `Switched view mode pointer to tab: ${index}`);
              setActiveTab(index);
            }} 
            textColor="primary"
            indicatorColor="primary"
            centered
          >
            <Tab icon={<DashboardIcon />} label="Main Stream Dashboard" sx={{ fontWeight: '600' }} />
            <Tab icon={<StarIcon />} label="Priority Inbox (Top 10)" sx={{ fontWeight: '600' }} />
          </Tabs>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
            <CircularProgress size={45} thickness={4.5} />
          </Box>
        )}

        {errorStatus && (
          <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: 2 }}>{errorStatus}</Alert>
        )}

        {!loading && !errorStatus && (
          <Box>
            {activeTab === 0 && (
              <Box>
                <FormControl fullWidth size="medium" sx={{ mb: 3, backgroundColor: '#fff', borderRadius: 1 }}>
                  <InputLabel id="category-filter-label">Filter Announcement Type</InputLabel>
                  <Select
                    labelId="category-filter-label"
                    value={categoryFilter}
                    label="Filter Announcement Type"
                    onChange={(e) => {
                      AppLogger.info('FilterUI', `User modified category focus to: ${e.target.value}`);
                      setCategoryFilter(e.target.value);
                    }}
                  >
                    <MenuItem value="All">All Notifications</MenuItem>
                    <MenuItem value="Placement">Placements Only</MenuItem>
                    <MenuItem value="Result">Academic Results</MenuItem>
                    <MenuItem value="Event">Campus Events</MenuItem>
                  </Select>
                </FormControl>

                {filteredDataset.length === 0 ? (
                  <Typography align="center" color="textSecondary" sx={{ py: 6, fontStyle: 'italic' }}>
                    No matching notices found in this sector.
                  </Typography>
                ) : (
                  filteredDataset.map((item) => <NotificationCard key={item.ID} record={item} />)
                )}
              </Box>
            )}

            {activeTab === 1 && (
              <Box>
                <Alert severity="info" color="primary" sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}>
                  Sorted algorithmically by target classification weight hierarchy and publication sequence.
                </Alert>
                {calculatedPriorityInbox.map((item) => <NotificationCard key={item.ID} record={item} isPriority />)}
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}

function NotificationCard({ record, isPriority }) {
  const getBadgeColor = (type) => {
    switch(type) {
      case 'Placement': return '#e1f5fe';
      case 'Result': return '#e8f5e9';
      case 'Event': return '#fff3e0';
      default: return '#f5f5f5';
    }
  };

  const getTextColor = (type) => {
    switch(type) {
      case 'Placement': return '#0288d1';
      case 'Result': return '#2e7d32';
      case 'Event': return '#ef6c00';
      default: return '#757575';
    }
  };

  return (
    <Box sx={{
      p: 3,
      mb: 2.5,
      borderRadius: 2,
      backgroundColor: '#ffffff',
      boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
      borderLeft: `6px solid ${isPriority ? '#d32f2f' : getTextColor(record.Type)}`,
      transition: 'all 0.2s ease-in-out',
      '&:hover': { 
        transform: 'translateY(-2px)',
        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)'
      }
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{
          px: 1.8,
          py: 0.4,
          borderRadius: 1.5,
          fontSize: '0.7rem',
          fontWeight: '700',
          letterSpacing: '0.8px',
          backgroundColor: getBadgeColor(record.Type),
          color: getTextColor(record.Type)
        }}>
          {record.Type.toUpperCase()}
        </Box>
        <Typography variant="caption" sx={{ color: '#90a4ae', fontWeight: 500 }}>
          {new Date(record.Timestamp).toLocaleString()}
        </Typography>
      </Box>
      <Typography variant="body1" sx={{ color: '#2c3e50', fontWeight: 500, lineHeight: 1.5 }}>
        {record.Message}
      </Typography>
    </Box>
  );
}