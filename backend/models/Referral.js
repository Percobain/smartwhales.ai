const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: String,
    required: true,
    lowercase: true
  },
  referee: {
    type: String,
    required: true,
    lowercase: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'completed'
  }
});

// Create compound index for efficient lookup
referralSchema.index({ referrer: 1, referee: 1 }, { unique: true });

module.exports = mongoose.model('Referral', referralSchema);