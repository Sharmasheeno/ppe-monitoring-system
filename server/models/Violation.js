const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  violationType: {
    type: String,
    required: true,
    // enum: ['No Hard Hat', 'No Vest', 'Person', 'Unknown'], // Removing strict enum for flexibility
  },
  // Alias for 'type' to match AI engine payload if needed, or handle in controller
  type: { type: String },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  imageUrl: {
    type: String,
    required: true, // URL to the saved image
  },
  confidence: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    default: 'Site Camera 1',
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    default: 'Pending Review',
  },
  workerId: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('Violation', ViolationSchema);
