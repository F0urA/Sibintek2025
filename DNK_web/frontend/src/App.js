import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './styles/App.css';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Depots from './components/Depots';
import Operations from './components/Operations';
import RoutesList from './components/Routes';
import Reports from './components/Reports';
import SpaceBackground from './components/SpaceBackground';


const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d9ff', 
      light: '#66e3ff',
      dark: '#0095b3',
    },
    secondary: {
      main: '#b366ff', 
      light: '#d699ff',
      dark: '#8033cc',
    },
    background: {
      default: '#0a0e27', 
      paper: 'rgba(15, 25, 50, 0.8)', 
    },
    text: {
      primary: '#e0e6f0',
      secondary: '#a8b5c7',
    },
  },
  typography: {
    fontFamily: '"Orbitron", "Roboto", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '0.03em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0.02em',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, rgba(15, 25, 50, 0.95) 0%, rgba(20, 35, 70, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          transition: 'all 0.3s ease',
          '&:hover': {
            border: '1px solid rgba(0, 217, 255, 0.5)',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(90deg, rgba(10, 14, 39, 0.95) 0%, rgba(20, 30, 60, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '2px solid rgba(0, 217, 255, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 0.3s ease',
        },
        contained: {
          boxShadow: '0 0 15px rgba(0, 217, 255, 0.4)',
          '&:hover': {
            boxShadow: '0 0 25px rgba(0, 217, 255, 0.6)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, rgba(15, 25, 50, 0.9) 0%, rgba(20, 35, 70, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
        },
      },
    },
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const PrivateRoute = ({ children }) => {
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SpaceBackground />
      <Router>
        <Routes>
          <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/depots"
            element={
              <PrivateRoute>
                <Depots />
              </PrivateRoute>
            }
          />
          <Route
            path="/operations"
            element={
              <PrivateRoute>
                <Operations />
              </PrivateRoute>
            }
          />
          <Route
            path="/routes"
            element={
              <PrivateRoute>
                <RoutesList />
              </PrivateRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <Reports />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
