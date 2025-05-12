const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  trackedAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  eventType: {
    type: String,
    enum: ['input', 'track'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    chainId: String,
    userAgent: String,
    ip: String
  }
});

// Create compound index for efficient queries
trackingSchema.index({ walletAddress: 1, trackedAddress: 1, eventType: 1 });

module.exports = mongoose.model('Tracking', trackingSchema);