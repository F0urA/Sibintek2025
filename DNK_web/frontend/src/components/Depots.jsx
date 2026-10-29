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
  Box
} from '@mui/material';
import { Satellite as SatelliteIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import api from '../services/api';

function Depots() {
  const [depots, setDepots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadDepots();
  }, []);

  const loadDepots = async () => {
    try {
      const response = await api.get('/depots');
      setDepots(response.data);
    } catch (error) {
      console.error('Error loading depots:', error);
    }
  };

  return (
    <>
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      
      <AppBar position="static">
        <Toolbar>
          <SatelliteIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Космические Базы
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
            Список космических баз и хранилищ ресурсов
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
                <TableCell>Название</TableCell>
                <TableCell>Координаты</TableCell>
                <TableCell>Вместимость</TableCell>
                <TableCell>Текущий запас</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {depots.map((depot) => (
                <TableRow key={depot.id}>
                  <TableCell>{depot.id}</TableCell>
                  <TableCell sx={{ color: '#e0e6f0', fontWeight: 500 }}>{depot.name}</TableCell>
                  <TableCell>{depot.location}</TableCell>
                  <TableCell>{depot.capacity}</TableCell>
                  <TableCell sx={{ color: '#00d9ff' }}>{depot.current_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}

export default Depots;
