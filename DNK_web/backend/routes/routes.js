const express = require('express');
const router = express.Router();
const { Route, Truck, User, OilDepot } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

router.post('/', authenticateToken, requireRole('dispatcher', 'admin'), async (req, res) => {
  try {
    const {
      truck_id,
      driver_id,
      depot_from,
      depot_to,
      azs_destination,
      fuel_type,
      volume,
      notes
    } = req.body;

    if (!truck_id || !driver_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const route = await Route.create({
      truck_id,
      driver_id,
      depot_from,
      depot_to,
      azs_destination,
      fuel_type,
      volume,
      notes,
      status: 'planned',
      departure_time: new Date()
    });

    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, driver_id, date_from, date_to } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (driver_id) {
      where.driver_id = driver_id;
    }

    if (date_from || date_to) {
      where.departure_time = {};
      if (date_from) where.departure_time[Op.gte] = date_from;
      if (date_to) where.departure_time[Op.lte] = date_to;
    }

    const routes = await Route.findAll({
      where,
      include: [
        { model: Truck, as: 'truck' },
        { model: User, as: 'driver', attributes: ['id', 'username', 'full_name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id, {
      include: [
        { model: Truck, as: 'truck' },
        { model: User, as: 'driver', attributes: ['id', 'username', 'full_name'] },
        { model: OilDepot, as: 'depotFrom' },
        { model: OilDepot, as: 'depotTo' }
      ]
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireRole('dispatcher', 'admin'), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const {
      status,
      fuel_type,
      volume,
      azs_destination,
      notes
    } = req.body;

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (fuel_type !== undefined) updateData.fuel_type = fuel_type;
    if (volume !== undefined) updateData.volume = volume;
    if (azs_destination !== undefined) updateData.azs_destination = azs_destination;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'completed') {
      updateData.arrival_time = new Date();
    }

    await route.update(updateData);

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', authenticateToken, requireRole('driver', 'dispatcher', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (req.user.role === 'driver' && route.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await route.update({ status });

    if (status === 'completed') {
      await route.update({ arrival_time: new Date() });
    }

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/gps', authenticateToken, requireRole('driver', 'admin'), async (req, res) => {
  try {
    const { lat, lon, timestamp } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing GPS coordinates' });
    }

    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    if (req.user.role === 'driver' && route.driver_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let coordinates = [];
    if (route.gps_coordinates) {
      try {
        coordinates = JSON.parse(route.gps_coordinates);
      } catch (e) {
        coordinates = [];
      }
    }

    coordinates.push({ lat, lon, timestamp: timestamp || new Date() });

    await route.update({
      gps_coordinates: JSON.stringify(coordinates)
    });

    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/gps', authenticateToken, async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    let gps_data = [];
    if (route.gps_coordinates) {
      try {
        gps_data = JSON.parse(route.gps_coordinates);
      } catch (e) {
        gps_data = [];
      }
    }

    res.json({
      route_id: route.id,
      gps_data: gps_data,
      notes: route.notes 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.id);

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    await route.destroy();

    res.json({ message: 'Route deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
