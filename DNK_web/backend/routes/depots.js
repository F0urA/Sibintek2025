const express = require('express');
const router = express.Router();
const { OilDepot, Tank } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');


router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, location, capacity } = req.body;

    if (!name || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const depot = await OilDepot.create({
      name,
      location,
      capacity,
      created_by: req.user.id
    });

    res.status(201).json(depot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/', authenticateToken, async (req, res) => {
  try {
    const depots = await OilDepot.findAll({
      include: [{
        model: Tank,
        as: 'tanks'
      }]
    });

    res.json(depots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const depot = await OilDepot.findByPk(req.params.id, {
      include: [{
        model: Tank,
        as: 'tanks'
      }]
    });

    if (!depot) {
      return res.status(404).json({ error: 'Depot not found' });
    }

    res.json(depot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, location, capacity } = req.body;

    const depot = await OilDepot.findByPk(req.params.id);

    if (!depot) {
      return res.status(404).json({ error: 'Depot not found' });
    }

    await depot.update({ name, location, capacity });

    res.json(depot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/:id/tanks', authenticateToken, requireRole('admin', 'operator'), async (req, res) => {
  try {
    const { tank_number, fuel_type, capacity, notes } = req.body;

    if (!tank_number || !fuel_type || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validFuelTypes = ['Hydrogen', 'Helium-3', 'Antimatter', 'Plasma'];
    if (!validFuelTypes.includes(fuel_type)) {
      return res.status(400).json({ error: 'Invalid fuel type' });
    }

    const tank = await Tank.create({
      depot_id: req.params.id,
      tank_number,
      fuel_type,
      capacity,
      notes
    });

    res.status(201).json(tank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/tanks/:id', authenticateToken, async (req, res) => {
  try {
    const tank = await Tank.findByPk(req.params.id);

    if (!tank) {
      return res.status(404).json({ error: 'Tank not found' });
    }

    res.json(tank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/tanks/:id', authenticateToken, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const { current_level, notes } = req.body;

    const tank = await Tank.findByPk(req.params.id);

    if (!tank) {
      return res.status(404).json({ error: 'Tank not found' });
    }

    await tank.update({
      current_level,
      notes,
      last_updated: new Date()
    });

    res.json(tank);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
