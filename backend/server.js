const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const trackingRoutes = require('./routes/tracking');
const referralRoutes = require('./routes/referral');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
require('./config/db');

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: ['https://smartwhalesai-fe.vercel.app', 'http://localhost:3000', 'http://localhost:5173'], // Removed trailing slash from production URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Added 'OPTIONS'
  allowedHeaders: ['Content-Type', 'Authorization'],
})); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request body

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Routes
app.use('/api/tracking', trackingRoutes);
app.use('/api/referral', referralRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});