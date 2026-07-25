const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  donorName: {
    type: String,
    required: true
  },
  organisationName: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    required: true
  },
  foodName: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'General'
  },
  quantity: {
    type: String,
    required: true
  },
  peopleServed: {
    type: Number,
    required: true
  },
  pickupAddress: {
    type: String,
    required: true
  },
  pickupTime: {
    type: Date,
    required: true
  },
  expiryTime: {
    type: Date,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  acceptedBy: {
    type: String,
    default: ''
  },
  
  // Backward compatibility fields for routing/socket events
  donor: {
    type: String,
    default: 'anonymous'
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number] } // [lng, lat]
  }
}, {
  timestamps: true
});

// Configure Indexes
DonationSchema.index({ location: '2dsphere' });
DonationSchema.index({ status: 1 });

module.exports = mongoose.model('Donation', DonationSchema);
