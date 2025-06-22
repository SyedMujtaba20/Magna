const express = require('express');
const router = express.Router();
const { Furnace } = require('../models');

// GET all furnaces
router.get('/', async (req, res) => {
  try {
    const furnaces = await Furnace.findAll();
    res.json(furnaces);
  } catch (err) {
    console.error('Error fetching furnaces:', err);
    res.status(500).json({ error: 'Failed to fetch furnaces' });
  }
});

// GET a single furnace by ID
router.get('/:id', async (req, res) => {
  try {
    const furnace = await Furnace.findByPk(req.params.id);
    if (furnace) res.json(furnace);
    else res.status(404).json({ error: 'Furnace not found' });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching furnace' });
  }
});

// POST /api/furnaces
router.post('/', async (req, res) => {
  try {
    const { name, geometry } = req.body;
    const furnace = await Furnace.create({ name, geometry });
    res.status(201).json(furnace);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create furnace', details: err.message });
  }
});


// PUT update furnace
router.put('/:id', async (req, res) => {
  try {
    const [updated] = await Furnace.update(req.body, {
      where: { furnace_id: req.params.id }
    });
    updated
      ? res.json({ message: 'Furnace updated' })
      : res.status(404).json({ error: 'Furnace not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update furnace' });
  }
});

// DELETE furnace
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Furnace.destroy({
      where: { furnace_id: req.params.id }
    });
    deleted
      ? res.status(204).send()
      : res.status(404).json({ error: 'Furnace not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete furnace' });
  }
});

module.exports = router;
