const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema({
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodName: {
    type: String,
    required: true
  },
  quantity: {
    type: String, 
    required: true
  },
  foodType: {
    type: String,
    enum: ['veg', 'non-veg'],
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
  address: {
    type: String,
    required: true
  },
  // Backward compatible coordinates
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  // GeoJSON coordinate matching structure for MongoDB geospatial indexes
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  image: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'picked_up', 'delivered', 'cancelled'],
    default: 'pending'
  },
  assignedNGO: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acceptedTime: {
    type: Date,
    default: null
  },
  assignedVolunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Pickup verification fields
  pickupId: {
    type: String,
    default: ''
  },
  pickupOTP: {
    type: String,
    default: ''
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  otpVerified: {
    type: Boolean,
    default: false
  },
  otpVerifiedAt: {
    type: Date,
    default: null
  },
  assignedVehicle: {
    type: String,
    default: ''
  },
  driverName: {
    type: String,
    default: ''
  },
  driverPhone: {
    type: String,
    default: ''
  },
  verificationAttempts: {
    type: Number,
    default: 0
  },
  verificationLocked: {
    type: Boolean,
    default: false
  },
  verificationLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  verificationIp: {
    type: String,
    default: ''
  },
  // AI Metrics (Gemini classification data)
  aiMetadata: {
    freshnessScore: { type: Number, default: null },
    category: { type: String, default: 'General' },
    predictedExpiry: { type: Date, default: null },
    isSpam: { type: Boolean, default: false },
    spamReason: { type: String, default: '' }
  }
}, {
  timestamps: true
});

// Configure Indexes
DonationSchema.index({ location: '2dsphere' });
DonationSchema.index({ status: 1 });
DonationSchema.index({ donor: 1 });
DonationSchema.index({ assignedNGO: 1 });
DonationSchema.index({ assignedVolunteer: 1 });

module.exports = mongoose.model('Donation', DonationSchema);
