const Donation = require('../models/Donation');
const mockDb = require('../config/mockDb');
const socketHelper = require('../config/socketHelper');
const NGOAuth = require('../models/NGOAuth');

exports.createDonation = async (req, res) => {
  const { 
    donorName, 
    organisationName, 
    phone, 
    foodName, 
    category, 
    quantity, 
    peopleServed, 
    pickupAddress, 
    pickupTime, 
    expiryTime, 
    latitude, 
    longitude, 
    image 
  } = req.body;

  try {
    const lat = parseFloat(latitude || 12.9716);
    const lng = parseFloat(longitude || 77.5946);

    const donationData = {
      donorName,
      organisationName: organisationName || '',
      phone,
      foodName,
      category: category || 'General',
      quantity,
      peopleServed: parseInt(peopleServed || 1),
      pickupAddress,
      pickupTime: new Date(pickupTime),
      expiryTime: new Date(expiryTime),
      latitude: lat,
      longitude: lng,
      image: image || '',
      status: 'pending',
      // Backward compatible coordinates
      coordinates: { lat, lng },
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    };

    let donation;
    if (mockDb.isMockActive()) {
      donation = await mockDb.create('donations', donationData);
    } else {
      donation = await Donation.create(donationData);
    }

    // Real-Time Socket Broadcast to all NGOs
    const socketPayload = {
      id: donation._id || donation.id,
      donationId: donation._id || donation.id,
      donorName,
      foodName,
      quantity,
      peopleServed,
      latitude: lat,
      longitude: lng,
      pickupAddress,
      pickupTime,
      expiryTime,
      status: 'pending'
    };

    // Emit global Socket notification
    const io = socketHelper.getIo ? socketHelper.getIo() : null;
    if (io) {
      io.emit('new_food_donation', socketPayload);
      console.log("⚡ Broadcasted new food donation event");
    }

    res.status(201).json(donation);
  } catch (error) {
    console.error("Create donation error:", error);
    res.status(500).json({ message: 'Server error creating donation' });
  }
};

exports.getDonations = async (req, res) => {
  try {
    let donations = [];
    if (mockDb.isMockActive()) {
      donations = await mockDb.find('donations');
    } else {
      donations = await Donation.find().sort({ createdAt: -1 });
    }
    res.json(donations);
  } catch (error) {
    console.error("Get donations error:", error);
    res.status(500).json({ message: 'Server error loading donations' });
  }
};

exports.acceptDonation = async (req, res) => {
  const { id } = req.params;
  const { acceptedBy } = req.body; // Passed from frontend NGO dashboard input/name

  try {
    let donation;
    const ngoName = acceptedBy || 'An NGO';

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
      if (!donation) return res.status(404).json({ message: 'Donation not found' });
      donation = await mockDb.findByIdAndUpdate('donations', id, {
        status: 'accepted',
        acceptedBy: ngoName
      });
    } else {
      donation = await Donation.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { status: 'accepted', acceptedBy: ngoName },
        { new: true }
      );
      if (!donation) {
        return res.status(400).json({ message: 'This donation has already been accepted.' });
      }
    }

    // Real-Time Socket Notification to Donor: "Your food donation has been accepted by an NGO."
    const io = socketHelper.getIo ? socketHelper.getIo() : null;
    if (io) {
      // Emit accepted status update to all clients to sync dashboards
      io.emit('donation_accepted_broadcast', {
        id: donation._id || donation.id,
        status: 'accepted',
        acceptedBy: ngoName
      });
      // Specific donor socket notification alert
      io.emit('donor_alert', {
        message: `Your food donation for "${donation.foodName}" has been accepted by ${ngoName}.`
      });
    }

    res.json(donation);
  } catch (error) {
    console.error("Accept error:", error);
    res.status(500).json({ message: 'Server error accepting donation' });
  }
};

// Reject Donation
exports.rejectDonation = async (req, res) => {
  const { id } = req.params;
  try {
    let donation;
    if (mockDb.isMockActive()) {
      donation = await mockDb.findByIdAndUpdate('donations', id, { status: 'rejected' });
    } else {
      donation = await Donation.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
    }

    // Emit accepted/rejected status updates to sync dashboards
    const io = socketHelper.getIo ? socketHelper.getIo() : null;
    if (io) {
      io.emit('donation_accepted_broadcast', {
        id,
        status: 'rejected'
      });
    }

    res.json({ message: 'Donation rejected successfully', donation });
  } catch (error) {
    console.error("Reject error:", error);
    res.status(500).json({ message: 'Server error rejecting donation' });
  }
};

// Dummies to prevent routes/middleware compiler crashes
exports.getNearbyDonations = async (req, res) => res.json([]);
exports.requestVolunteer = async (req, res) => res.json({ success: true });
exports.verifyDeliveryCode = async (req, res) => res.json({ success: true });
exports.exportDonationsCSV = async (req, res) => res.send('ID,Food,Status\n');
exports.getDonationTracking = async (req, res) => res.json({});
exports.verifyPickupOtp = async (req, res) => res.json({ success: true });
exports.regeneratePickupOtp = async (req, res) => res.json({ success: true });
exports.getPickupDetails = async (req, res) => res.json({});

// NGO Register
exports.ngoRegister = async (req, res) => {
  const { ngoName, regNo, contactPerson, phone, securityPin } = req.body;

  try {
    if (!ngoName || !regNo || !contactPerson || !phone || !securityPin) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (securityPin.length !== 6 || isNaN(securityPin)) {
      return res.status(400).json({ message: 'Security PIN must be exactly 6 digits.' });
    }

    const ngoData = { ngoName, regNo, contactPerson, phone, securityPin };

    let ngo;
    if (mockDb.isMockActive()) {
      const existing = await mockDb.findOne('ngo_auths', { regNo });
      if (existing) {
        return res.status(400).json({ message: 'NGO with this registration number already exists.' });
      }
      ngo = await mockDb.create('ngo_auths', ngoData);
    } else {
      const existing = await NGOAuth.findOne({ regNo });
      if (existing) {
        return res.status(400).json({ message: 'NGO with this registration number already exists.' });
      }
      ngo = await NGOAuth.create(ngoData);
    }

    res.status(201).json({ message: 'NGO Registered successfully!', ngo });
  } catch (err) {
    console.error("NGO Register error:", err);
    res.status(500).json({ message: 'Server error registering NGO' });
  }
};

// NGO Login (PIN Verification)
exports.ngoLogin = async (req, res) => {
  const { regNo, securityPin } = req.body;

  try {
    if (!regNo || !securityPin) {
      return res.status(400).json({ message: 'Registration Number and PIN are required.' });
    }

    let ngo;
    if (mockDb.isMockActive()) {
      ngo = await mockDb.findOne('ngo_auths', { regNo, securityPin });
    } else {
      ngo = await NGOAuth.findOne({ regNo, securityPin });
    }

    if (!ngo) {
      return res.status(400).json({ message: 'PIN Verification failed. Invalid registration number or 6-digit PIN.' });
    }

    res.json({ message: 'PIN Verification successful!', ngo });
  } catch (err) {
    console.error("NGO Login error:", err);
    res.status(500).json({ message: 'Server error during PIN verification' });
  }
};
