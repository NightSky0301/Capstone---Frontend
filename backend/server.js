require('dotenv').config();
const db = require('./db');
const express = require('express');
const app = express();
const cors = require('cors');

// Stop immediately if required settings are missing from .env
if (!process.env.JWT_SECRET || !process.env.CLIENT_ORIGIN) {
  console.error('Missing JWT_SECRET or CLIENT_ORIGIN in .env. Server not started.');
  process.exit(1);
}

// Only our React app is allowed to call this API from a browser
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

// Import routes
const authRoutes = require('./src/routes/auth');

// use routes
app.use('/api', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});