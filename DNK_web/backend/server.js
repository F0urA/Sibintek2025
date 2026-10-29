const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { sequelize } = require('./models');
const { initBucket } = require('./config/minio');

const authRoutes = require('./routes/auth');
const depotsRoutes = require('./routes/depots');
const operationsRoutes = require('./routes/operations');
const routesRoutes = require('./routes/routes');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'DWS Backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/depots', depotsRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/routes', routesRoutes);
app.use('/api/reports', reportsRoutes);

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    await initBucket();
    logger.info('MinIO initialized successfully');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`DWS Backend server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
