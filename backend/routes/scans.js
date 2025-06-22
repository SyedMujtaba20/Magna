const express = require('express');
const router = express.Router();
const { Scan } = require('../models');

// GET all scans OR scans by campaign_id
router.get('/', async (req, res) => {
  try {
    const { campaign_id } = req.query;
    let scans;

    if (campaign_id) {
      scans = await Scan.findAll({ where: { campaign_id } });
    } else {
      scans = await Scan.findAll();
    }

    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scans' });
  }
});

// GET a single scan
router.get('/:id', async (req, res) => {
  try {
    const scan = await Scan.findByPk(req.params.id);
    if (scan) res.json(scan);
    else res.status(404).json({ error: 'Scan not found' });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching scan' });
  }
});

// POST create scan
router.post('/', async (req, res) => {
  try {
    const scan = await Scan.create(req.body);
    res.status(201).json(scan);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create scan', details: err.message });
  }
});

// PUT update scan
router.put('/:id', async (req, res) => {
  try {
    const [updated] = await Scan.update(req.body, {
      where: { scan_id: req.params.id }
    });
    updated
      ? res.json({ message: 'Scan updated' })
      : res.status(404).json({ error: 'Scan not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update scan' });
  }
});

// DELETE scan
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Scan.destroy({
      where: { scan_id: req.params.id }
    });
    deleted
      ? res.status(204).send()
      : res.status(404).json({ error: 'Scan not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete scan' });
  }
});

module.exports = router;
