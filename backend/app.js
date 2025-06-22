const express = require('express');
const app = express();

// Middleware
app.use(express.json());
const cors = require('cors');
app.use(cors());

// Routers
const userRoutes = require('./routes/users');
const furnaceRoutes = require('./routes/furnace');
const campaignRoutes = require('./routes/campaigns');
const scanRoutes = require('./routes/scans');

app.use('/api/users', userRoutes);
app.use('/api/furnaces', furnaceRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/scans', scanRoutes);

module.exports = app; // ✅ THIS IS IMPORTANT
