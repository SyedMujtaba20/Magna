const express = require('express');
const router = express.Router();
const { User } = require('../models');

// GET all users
router.get('/', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

// GET single user
router.get('/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (user) res.json(user);
  else res.status(404).send('User not found');
});

// POST create user
router.post('/', async (req, res) => {
  const newUser = await User.create(req.body);
  res.status(201).json(newUser);
});

// PUT update user
router.put('/:id', async (req, res) => {
  const updated = await User.update(req.body, { where: { user_id: req.params.id } });
  res.json({ updated });
});

// DELETE user
router.delete('/:id', async (req, res) => {
  await User.destroy({ where: { user_id: req.params.id } });
  res.status(204).send();
});

module.exports = router;
