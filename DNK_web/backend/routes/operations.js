const express = require('express');
const router = express.Router();
const { Operation, OilDepot, Tank, User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sequelize } = require('../models');

router.post('/receive', authenticateToken, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const {
      depot_id,
      tank_id,
      fuel_type,
      volume,
      source_destination,
      transport_type,
      notes,
      document_reference
    } = req.body;

    if (!depot_id || !tank_id || !volume) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const operation = await Operation.create({
      operation_type: 'receive',
      depot_id,
      tank_id,
      fuel_type,
      volume,
      source_destination,
      transport_type,
      operator_id: req.user.id,
      notes,
      document_reference
    });

    const tank = await Tank.findByPk(tank_id);
    if (tank) {
      await tank.update({
        current_level: tank.current_level + parseFloat(volume),
        last_updated: new Date()
      });
    }

    res.status(201).json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/dispatch', authenticateToken, requireRole('operator', 'dispatcher', 'admin'), async (req, res) => {
  try {
    const {
      depot_id,
      tank_id,
      fuel_type,
      volume,
      source_destination,
      transport_type,
      notes,
      document_reference
    } = req.body;

    if (!depot_id || !tank_id || !volume) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const operation = await Operation.create({
      operation_type: 'dispatch',
      depot_id,
      tank_id,
      fuel_type,
      volume,
      source_destination,
      transport_type,
      operator_id: req.user.id,
      notes,
      document_reference
    });

    const tank = await Tank.findByPk(tank_id);
    if (tank) {
      await tank.update({
        current_level: tank.current_level - parseFloat(volume),
        last_updated: new Date()
      });
    }

    res.status(201).json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { depot_id, source_destination, date_from, date_to } = req.query;

    let query = `
      SELECT o.*, u.username as operator_name
      FROM operations o
      LEFT JOIN "Users" u ON o.operator_id = u.id
      WHERE 1=1
    `;

    if (depot_id) {
      query += ` AND o.depot_id = ${depot_id}`;
    }

    if (source_destination) {
      query += ` AND o.source_destination LIKE '%${source_destination}%'`;
    }

    if (date_from) {
      query += ` AND o.timestamp >= '${date_from}'`;
    }

    if (date_to) {
      query += ` AND o.timestamp <= '${date_to}'`;
    }

    query += ` ORDER BY o.timestamp DESC`;

    const [results] = await sequelize.query(query);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const operation = await Operation.findByPk(req.params.id, {
      include: [
        { model: OilDepot, as: 'depot' },
        { model: Tank, as: 'tank' },
        { model: User, as: 'operator', attributes: ['id', 'username', 'full_name'] }
      ]
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, requireRole('operator', 'admin'), async (req, res) => {
  try {
    const operation = await Operation.findByPk(req.params.id);

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    const {
      operation_type,
      fuel_type,
      volume,
      source_destination,
      transport_type,
      notes,
      document_reference
    } = req.body;

    await operation.update({
      operation_type,
      fuel_type,
      volume,
      source_destination,
      transport_type,
      notes,
      document_reference
    });

    res.json(operation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const operation = await Operation.findByPk(req.params.id);

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    await operation.destroy();

    res.json({ message: 'Operation deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
