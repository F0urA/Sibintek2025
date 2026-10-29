import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box
} from '@mui/material';
import { LocalShipping as ShippingIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';

function RoutesList() {
  const [routes, setRoutes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const response = await api.get('/routes');
      setRoutes(response.data);
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'pending': 'default',
      'in_progress': 'primary',
      'completed': 'success',
      'cancelled': 'error',
    };
    return statusColors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      'pending': 'Ожидание',
      'in_progress': 'В пути',
      'completed': 'Завершён',
      'cancelled': 'Отменён',
    };
    return statusLabels[status] || status;
  };

  return (
    <>
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      
      <AppBar position="static">
        <Toolbar>
          <ShippingIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Космические Маршруты
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => navigate('/')}
            startIcon={<ArrowBackIcon />}
            sx={{ 
              border: '1px solid rgba(0, 217, 255, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
              }
            }}
          >
            Назад
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="h5" 
            sx={{ 
              textShadow: '0 0 15px rgba(0, 217, 255, 0.5)',
              color: '#00d9ff'
            }}
          >
            Маршруты транспортных космических кораблей
          </Typography>
        </Box>
        <TableContainer 
          component={Paper}
          sx={{
            '& .MuiTableCell-head': {
              backgroundColor: 'rgba(0, 217, 255, 0.1)',
              color: '#00d9ff',
              fontWeight: 600,
              borderBottom: '2px solid rgba(0, 217, 255, 0.3)',
            },
            '& .MuiTableRow-root:hover': {
              backgroundColor: 'rgba(0, 217, 255, 0.05)',
              transition: 'all 0.3s ease',
            },
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Пилот</TableCell>
                <TableCell>Назначение</TableCell>
                <TableCell>Объём груза</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Время старта</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>{route.id}</TableCell>
                  <TableCell sx={{ color: '#e0e6f0', fontWeight: 500 }}>
                    {route.driver?.full_name || route.driver?.username}
                  </TableCell>
                  <TableCell>{route.azs_destination}</TableCell>
                  <TableCell sx={{ color: '#00d9ff', fontWeight: 500 }}>{route.volume}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(route.status)}
                      color={getStatusColor(route.status)}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {route.departure_time ? new Date(route.departure_time).toLocaleString('ru-RU') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}

export default RoutesList;
