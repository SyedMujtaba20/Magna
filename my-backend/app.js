const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('morgan');
const furnaceRoutes = require('./routes/furnace');

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/furnace', furnaceRoutes);

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: error.message || 'Internal server error' });
});

module.exports = app;
