import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Rocket as RocketIcon,
  Satellite as SatelliteIcon,
  LocalShipping as ShippingIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import api from '../services/api';

function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      {}
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      <div className="space-station space-station-3"></div>
      
      <AppBar position="static">
        <Toolbar>
          <RocketIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            SWS - Space Web System
          </Typography>
          <Typography sx={{ mr: 2 }}>
            {user?.full_name || user?.username} ({user?.role})
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              border: '1px solid rgba(0, 217, 255, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                borderColor: '#00d9ff',
              }
            }}
          >
            Выход
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, position: 'relative', zIndex: 1 }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            textAlign: 'center',
            mb: 4,
            textShadow: '0 0 20px rgba(0, 217, 255, 0.5)',
            background: 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Космическая Панель Управления
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card className="glow-effect">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SatelliteIcon sx={{ fontSize: 40, color: '#00d9ff', mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Космические Базы
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Управление космическими базами и хранилищами ресурсов
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => navigate('/depots')}
                  variant="contained"
                  startIcon={<SatelliteIcon />}
                >
                  Перейти к базам
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card className="glow-effect">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <RocketIcon sx={{ fontSize: 40, color: '#b366ff', mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Операции
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Приём и отгрузка космических ресурсов
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => navigate('/operations')}
                  variant="contained"
                  color="secondary"
                  startIcon={<RocketIcon />}
                >
                  Перейти к операциям
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card className="glow-effect">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ShippingIcon sx={{ fontSize: 40, color: '#00d9ff', mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Космические Маршруты
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Управление маршрутами транспортных кораблей
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => navigate('/routes')}
                  variant="contained"
                  startIcon={<ShippingIcon />}
                >
                  Перейти к маршрутам
                </Button>
              </CardActions>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card className="glow-effect">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: '#b366ff', mr: 2 }} />
                  <Typography variant="h5" component="div">
                    Отчёты
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Формирование и экспорт галактических отчётов
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => navigate('/reports')}
                  variant="contained"
                  color="secondary"
                  startIcon={<AssessmentIcon />}
                >
                  Перейти к отчётам
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default Dashboard;
