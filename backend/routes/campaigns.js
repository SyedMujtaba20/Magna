const express = require('express');
const router = express.Router();
const { Campaign } = require('../models');

// GET all campaigns OR filter by furnace_id
router.get('/', async (req, res) => {
  try {
    const { furnace_id } = req.query;
    let campaigns;

    if (furnace_id) {
      campaigns = await Campaign.findAll({ where: { furnace_id } });
    } else {
      campaigns = await Campaign.findAll();
    }

    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET a single campaign by ID
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findByPk(req.params.id);
    if (campaign) res.json(campaign);
    else res.status(404).json({ error: 'Campaign not found' });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching campaign' });
  }
});

// POST create campaign
router.post('/', async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create campaign', details: err.message });
  }
});

// PUT update campaign
router.put('/:id', async (req, res) => {
  try {
    const [updated] = await Campaign.update(req.body, {
      where: { campaign_id: req.params.id }
    });
    updated
      ? res.json({ message: 'Campaign updated' })
      : res.status(404).json({ error: 'Campaign not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE campaign
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Campaign.destroy({
      where: { campaign_id: req.params.id }
    });
    deleted
      ? res.status(204).send()
      : res.status(404).json({ error: 'Campaign not found' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
