const { sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('Running database migrations...');

    const sql = fs.readFileSync(
      path.join(__dirname, 'init.sql'),
      'utf8'
    );

    await sequelize.query(sql);

    logger.info('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
