const express = require('express');
const router = express.Router();
const { Operation, Route, OilDepot, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');
const { minioClient, BUCKET_NAME } = require('../config/minio');

router.get('/depot/:id', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const where = { depot_id: req.params.id };

    if (date_from || date_to) {
      where.timestamp = {};
      if (date_from) where.timestamp[Op.gte] = date_from;
      if (date_to) where.timestamp[Op.lte] = date_to;
    }

    const operations = await Operation.findAll({
      where,
      order: [['timestamp', 'DESC']]
    });

    const depot = await OilDepot.findByPk(req.params.id);

    if (!depot) {
      return res.status(404).json({ error: 'Depot not found' });
    }

    const summary = {
      depot: depot,
      total_received: operations
        .filter(op => op.operation_type === 'receive')
        .reduce((sum, op) => sum + op.volume, 0),
      total_dispatched: operations
        .filter(op => op.operation_type === 'dispatch')
        .reduce((sum, op) => sum + op.volume, 0),
      operations_count: operations.length,
      operations: operations
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/routes', authenticateToken, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    const where = {};

    if (date_from || date_to) {
      where.departure_time = {};
      if (date_from) where.departure_time[Op.gte] = date_from;
      if (date_to) where.departure_time[Op.lte] = date_to;
    }

    const routes = await Route.findAll({
      where,
      include: [
        { model: User, as: 'driver', attributes: ['id', 'username', 'full_name'] }
      ]
    });

    const summary = {
      total_routes: routes.length,
      total_volume: routes.reduce((sum, r) => sum + (r.volume || 0), 0),
      by_status: {
        planned: routes.filter(r => r.status === 'planned').length,
        in_progress: routes.filter(r => r.status === 'in_progress').length,
        completed: routes.filter(r => r.status === 'completed').length,
        cancelled: routes.filter(r => r.status === 'cancelled').length
      },
      routes: routes
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/export', authenticateToken, requireRole('admin', 'dispatcher'), async (req, res) => {
  try {
    const { type, format, date_from, date_to } = req.body;

    if (!type || !format) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let data;

    if (type === 'operations') {
      const where = {};
      if (date_from || date_to) {
        where.timestamp = {};
        if (date_from) where.timestamp[Op.gte] = date_from;
        if (date_to) where.timestamp[Op.lte] = date_to;
      }
      data = await Operation.findAll({ where });
    } else if (type === 'routes') {
      const where = {};
      if (date_from || date_to) {
        where.departure_time = {};
        if (date_from) where.departure_time[Op.gte] = date_from;
        if (date_to) where.departure_time[Op.lte] = date_to;
      }
      data = await Route.findAll({ where });
    } else {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found for report' });
    }

    const timestamp = Date.now();
    const filename = `report_${type}_${timestamp}.${format}`;
    let content;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      const headers = Object.keys(data[0].dataValues).join(',');
      const rows = data.map(item => Object.values(item.dataValues).join(','));
      content = [headers, ...rows].join('\n');
    } else {
      return res.status(400).json({ error: 'Invalid format' });
    }

    const buffer = Buffer.from(content);
    await minioClient.putObject(
      BUCKET_NAME,
      filename,
      buffer,
      buffer.length,
      { 'Content-Type': format === 'json' ? 'application/json' : 'text/csv' }
    );

    const downloadUrl = await minioClient.presignedGetObject(
      BUCKET_NAME,
      filename,
      24 * 60 * 60
    );

    res.json({
      filename,
      download_url: downloadUrl,
      size: buffer.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const stream = minioClient.listObjects(BUCKET_NAME, '', true);
    const objects = [];

    stream.on('data', obj => objects.push(obj));
    stream.on('end', () => res.json(objects));
    stream.on('error', err => res.status(500).json({ error: err.message }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
