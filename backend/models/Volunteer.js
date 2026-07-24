const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleType: {
    type: String, // e.g. "motorcycle", "car", "van", "walk"
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Automatically approve volunteers by default, or admin verifies
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Volunteer', VolunteerSchema);
