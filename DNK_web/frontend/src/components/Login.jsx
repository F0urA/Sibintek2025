import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Tabs,
  Tab,
  MenuItem
} from '@mui/material';
import { Rocket as RocketIcon } from '@mui/icons-material';
import api from '../services/api';

function Login({ setIsAuthenticated }) {
  const [tabValue, setTabValue] = useState(0);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('operator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      setIsAuthenticated(true);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка авторизации');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      await api.post('/auth/register', {
        username,
        password,
        role,
        full_name: fullName,
        contact
      });
      setSuccess('Регистрация успешна! Теперь вы можете войти.');
      setTabValue(0);
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, position: 'relative', zIndex: 1 }}>
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)',
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.5)',
          }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <RocketIcon 
            sx={{ 
              fontSize: 64, 
              color: '#00d9ff',
              filter: 'drop-shadow(0 0 15px rgba(0, 217, 255, 0.6))',
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-10px)' },
              }
            }} 
          />
        </Box>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(0, 217, 255, 0.3)',
          }}
        >
          SWS
        </Typography>
        <Typography 
          variant="h6" 
          gutterBottom 
          align="center" 
          color="textSecondary"
          sx={{ mb: 3 }}
        >
          Space Web System
        </Typography>
        
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          centered
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              color: '#a8b5c7',
              '&.Mui-selected': {
                color: '#00d9ff',
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#00d9ff',
              boxShadow: '0 0 10px rgba(0, 217, 255, 0.5)',
            }
          }}
        >
          <Tab label="Вход" />
          <Tab label="Регистрация" />
        </Tabs>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              backgroundColor: 'rgba(211, 47, 47, 0.1)',
              border: '1px solid rgba(211, 47, 47, 0.3)',
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 2,
              backgroundColor: 'rgba(46, 125, 50, 0.1)',
              border: '1px solid rgba(46, 125, 50, 0.3)',
            }}
          >
            {success}
          </Alert>
        )}

        {tabValue === 0 ? (
          <Box component="form" onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Логин"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3,
                height: 48,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)',
                boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #66e3ff 0%, #d699ff 100%)',
                  boxShadow: '0 0 30px rgba(0, 217, 255, 0.6)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Войти в систему
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleRegister}>
            <TextField
              fullWidth
              label="Логин"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            />
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="Минимум 6 символов"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            />
            <TextField
              fullWidth
              label="Полное имя"
              variant="outlined"
              margin="normal"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            />
            <TextField
              fullWidth
              label="Контакт"
              variant="outlined"
              margin="normal"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+7..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            />
            <TextField
              fullWidth
              select
              label="Роль"
              variant="outlined"
              margin="normal"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#00d9ff',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d9ff',
                    boxShadow: '0 0 10px rgba(0, 217, 255, 0.3)',
                  },
                },
              }}
            >
              <MenuItem value="operator">Оператор</MenuItem>
              <MenuItem value="pilot">Пилот</MenuItem>
              <MenuItem value="dispatcher">Диспетчер</MenuItem>
            </TextField>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3,
                height: 48,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)',
                boxShadow: '0 0 20px rgba(0, 217, 255, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #66e3ff 0%, #d699ff 100%)',
                  boxShadow: '0 0 30px rgba(0, 217, 255, 0.6)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Зарегистрироваться
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default Login;
