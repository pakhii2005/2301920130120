
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppLogger } from './services/logger';

// Instantiating a clean, custom Material UI theme configuration
const campusPortalTheme = createTheme({
  palette: {
    primary: {
      main: '#1a237e', // Deep Navy Blue
      light: '#534bae',
      dark: '#00003f'
    },
    secondary: {
      main: '#d32f2f', // Priority crimson accent
    },
    background: {
      default: '#f4f6f9'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: 'none' } // Prevents standard loud button styles
  }
});

AppLogger.info('Bootstrap', 'Initializing client DOM mounting configuration.');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={campusPortalTheme}>
      {/* CssBaseline guarantees standard cross-browser reset formatting */}
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);