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
  TextField,
  Box,
  Chip
} from '@mui/material';
import { Rocket as RocketIcon, ArrowBack as ArrowBackIcon, Search as SearchIcon } from '@mui/icons-material';
import api from '../services/api';

function Operations() {
  const [operations, setOperations] = useState([]);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadOperations();
  }, []);

  const loadOperations = async (searchFilter = '') => {
    try {
      const response = await api.get('/operations', {
        params: searchFilter ? { source_destination: searchFilter } : {}
      });
      setOperations(response.data);
    } catch (error) {
      console.error('Error loading operations:', error);
    }
  };

  const handleSearch = () => {
    loadOperations(filter);
  };

  return (
    <>
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      
      <AppBar position="static">
        <Toolbar>
          <RocketIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Космические Операции
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
              textShadow: '0 0 15px rgba(179, 102, 255, 0.5)',
              color: '#b366ff'
            }}
          >
            Журнал операций по перемещению ресурсов
          </Typography>
        </Box>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <TextField
            label="Поиск по источнику/назначению"
            variant="outlined"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#b366ff',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#b366ff',
                  boxShadow: '0 0 10px rgba(179, 102, 255, 0.3)',
                },
              },
            }}
          />
          <Button 
            variant="contained" 
            onClick={handleSearch}
            color="secondary"
            startIcon={<SearchIcon />}
            sx={{ minWidth: 120 }}
          >
            Поиск
          </Button>
        </Box>
        <TableContainer 
          component={Paper}
          sx={{
            '& .MuiTableCell-head': {
              backgroundColor: 'rgba(179, 102, 255, 0.1)',
              color: '#b366ff',
              fontWeight: 600,
              borderBottom: '2px solid rgba(179, 102, 255, 0.3)',
            },
            '& .MuiTableRow-root:hover': {
              backgroundColor: 'rgba(179, 102, 255, 0.05)',
              transition: 'all 0.3s ease',
            },
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Тип операции</TableCell>
                <TableCell>Космическая база</TableCell>
                <TableCell>Объём</TableCell>
                <TableCell>Источник/Назначение</TableCell>
                <TableCell>Дата и время</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell>{op.id}</TableCell>
                  <TableCell>
                    <Chip 
                      label={op.operation_type === 'receive' ? 'Приём' : 'Отгрузка'}
                      color={op.operation_type === 'receive' ? 'primary' : 'secondary'}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        boxShadow: op.operation_type === 'receive' 
                          ? '0 0 10px rgba(0, 217, 255, 0.3)' 
                          : '0 0 10px rgba(179, 102, 255, 0.3)',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#e0e6f0' }}>{op.depot_id}</TableCell>
                  <TableCell sx={{ color: '#00d9ff', fontWeight: 500 }}>{op.volume}</TableCell>
                  <TableCell>{op.source_destination}</TableCell>
                  <TableCell>{new Date(op.timestamp).toLocaleString('ru-RU')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}

export default Operations;
