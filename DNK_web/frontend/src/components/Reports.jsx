import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Alert
} from '@mui/material';
import { 
  Assessment as AssessmentIcon, 
  ArrowBack as ArrowBackIcon, 
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import api from '../services/api';

function Reports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [reportType, setReportType] = useState('operations');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadReports();
  }, [reportType]);

  const loadReports = async () => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (reportType === 'operations') {
        response = await api.get('/operations');
      } else {
        response = await api.get('/routes');
      }
      setReports(response.data);
    } catch (err) {
      setError('Ошибка загрузки данных: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (report) => {
    setCurrentReport({ ...report });
    setEditDialog(true);
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    try {
      const endpoint = reportType === 'operations' ? '/operations' : '/routes';
      await api.put(`${endpoint}/${currentReport.id}`, currentReport);
      setSuccess('Запись успешно обновлена');
      setEditDialog(false);
      loadReports();
    } catch (err) {
      setError('Ошибка сохранения: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleExport = async (format) => {
    setError('');
    try {
      const response = await api.post('/reports/export', {
        type: reportType,
        format: format,
        date_from: dateFrom,
        date_to: dateTo
      });
      window.open(response.data.download_url, '_blank');
      setSuccess('Отчет успешно экспортирован');
    } catch (err) {
      setError('Ошибка экспорта: ' + (err.response?.data?.error || err.message));
    }
  };

  const renderOperationsTable = () => (
    <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(10, 14, 39, 0.7)' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>ID</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Тип</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Объем</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Топливо</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Транспорт</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Дата</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.id}</TableCell>
              <TableCell>
                <Chip 
                  label={report.operation_type === 'receive' ? 'Приём' : 'Отгрузка'}
                  color={report.operation_type === 'receive' ? 'success' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.volume} т</TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.fuel_type}</TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.transport_type}</TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>
                {new Date(report.timestamp).toLocaleString('ru-RU')}
              </TableCell>
              <TableCell>
                <IconButton 
                  onClick={() => handleEdit(report)}
                  sx={{ 
                    color: '#00d9ff',
                    '&:hover': { color: '#66e3ff' }
                  }}
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderRoutesTable = () => (
    <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(10, 14, 39, 0.7)' }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>ID</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Статус</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Объем</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Топливо</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Назначение</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Отправление</TableCell>
            <TableCell sx={{ color: '#00d9ff', fontWeight: 600 }}>Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.id}</TableCell>
              <TableCell>
                <Chip 
                  label={report.status}
                  color={
                    report.status === 'completed' ? 'success' :
                    report.status === 'in_progress' ? 'info' :
                    report.status === 'cancelled' ? 'error' : 'default'
                  }
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.volume} т</TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.fuel_type}</TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>{report.azs_destination}</TableCell>
              <TableCell sx={{ color: '#a8b5c7' }}>
                {report.departure_time ? new Date(report.departure_time).toLocaleString('ru-RU') : '-'}
              </TableCell>
              <TableCell>
                <IconButton 
                  onClick={() => handleEdit(report)}
                  sx={{ 
                    color: '#00d9ff',
                    '&:hover': { color: '#66e3ff' }
                  }}
                >
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderEditDialog = () => {
    if (!currentReport) return null;

    return (
      <Dialog 
        open={editDialog} 
        onClose={() => setEditDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(10, 14, 39, 0.95)',
            backgroundImage: 'none',
            border: '1px solid rgba(0, 217, 255, 0.3)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#00d9ff', borderBottom: '1px solid rgba(0, 217, 255, 0.2)' }}>
          Редактирование записи #{currentReport.id}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {reportType === 'operations' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Тип операции"
                value={currentReport.operation_type || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, operation_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="receive">Приём</MenuItem>
                <MenuItem value="dispatch">Отгрузка</MenuItem>
              </TextField>
              <TextField
                label="Объем (т)"
                type="number"
                value={currentReport.volume || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, volume: parseFloat(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Тип топлива"
                value={currentReport.fuel_type || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, fuel_type: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="Тип транспорта"
                value={currentReport.transport_type || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, transport_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="shuttle">Шаттл</MenuItem>
                <MenuItem value="spaceship">Космический корабль</MenuItem>
              </TextField>
              <TextField
                label="Источник/Назначение"
                value={currentReport.source_destination || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, source_destination: e.target.value })}
                fullWidth
              />
              <TextField
                label="Примечания"
                value={currentReport.notes || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                select
                label="Статус"
                value={currentReport.status || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, status: e.target.value })}
                fullWidth
              >
                <MenuItem value="planned">Запланирован</MenuItem>
                <MenuItem value="in_progress">В процессе</MenuItem>
                <MenuItem value="completed">Завершен</MenuItem>
                <MenuItem value="cancelled">Отменен</MenuItem>
              </TextField>
              <TextField
                label="Объем (т)"
                type="number"
                value={currentReport.volume || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, volume: parseFloat(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Тип топлива"
                value={currentReport.fuel_type || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, fuel_type: e.target.value })}
                fullWidth
              />
              <TextField
                label="Назначение"
                value={currentReport.azs_destination || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, azs_destination: e.target.value })}
                fullWidth
              />
              <TextField
                label="Примечания"
                value={currentReport.notes || ''}
                onChange={(e) => setCurrentReport({ ...currentReport, notes: e.target.value })}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(0, 217, 255, 0.2)', p: 2 }}>
          <Button 
            onClick={() => setEditDialog(false)}
            startIcon={<CancelIcon />}
            sx={{ color: '#a8b5c7' }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              background: 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)',
              '&:hover': {
                background: 'linear-gradient(90deg, #66e3ff 0%, #d699ff 100%)',
              }
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <>
      <div className="space-station space-station-1"></div>
      <div className="space-station space-station-2"></div>
      
      <AppBar position="static">
        <Toolbar>
          <AssessmentIcon sx={{ mr: 2, fontSize: 32 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Галактические Отчёты
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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Paper 
          sx={{ 
            p: 3,
            mb: 3,
            backgroundColor: 'rgba(10, 14, 39, 0.7)',
          }}
          className="glow-effect"
        >
          <Typography 
            variant="h5" 
            gutterBottom
            sx={{ 
              textShadow: '0 0 15px rgba(179, 102, 255, 0.5)',
              color: '#b366ff',
              fontWeight: 700,
              mb: 3
            }}
          >
            Управление отчётами
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Button
              variant={reportType === 'operations' ? 'contained' : 'outlined'}
              onClick={() => setReportType('operations')}
              sx={{
                borderColor: '#00d9ff',
                color: reportType === 'operations' ? '#fff' : '#00d9ff',
                background: reportType === 'operations' ? 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)' : 'transparent',
              }}
            >
              Операции
            </Button>
            <Button
              variant={reportType === 'routes' ? 'contained' : 'outlined'}
              onClick={() => setReportType('routes')}
              sx={{
                borderColor: '#00d9ff',
                color: reportType === 'routes' ? '#fff' : '#00d9ff',
                background: reportType === 'routes' ? 'linear-gradient(90deg, #00d9ff 0%, #b366ff 100%)' : 'transparent',
              }}
            >
              Маршруты
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('json')}
              sx={{ borderColor: '#b366ff', color: '#b366ff' }}
            >
              JSON
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('csv')}
              sx={{ borderColor: '#b366ff', color: '#b366ff' }}
            >
              CSV
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="Дата от"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Дата до"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
          </Box>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Загрузка данных...</Typography>
          </Paper>
        ) : reports.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography>Нет данных для отображения</Typography>
          </Paper>
        ) : (
          reportType === 'operations' ? renderOperationsTable() : renderRoutesTable()
        )}

        {renderEditDialog()}
      </Container>
    </>
  );
}

export default Reports;
