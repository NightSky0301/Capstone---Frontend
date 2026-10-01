const db = require('./db');

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Import routes

// use routes

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});