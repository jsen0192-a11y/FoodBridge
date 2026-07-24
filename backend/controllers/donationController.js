const Donation = require('../models/Donation');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Delivery = require('../models/Delivery');
const mockDb = require('../config/mockDb');
const socketHelper = require('../config/socketHelper');
const cloudinaryHelper = require('../config/cloudinary');
const geminiAi = require('../services/geminiAi');
const { sendEmail, templates } = require('../config/nodemailer');

// Haversine formula to calculate distance in km (useful for fallback and sorting)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; 
  return parseFloat(d.toFixed(2));
}

const generateVerificationDetails = (donation) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  
  let pickupId = donation.pickupId;
  if (!pickupId) {
    const randomPart = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digits
    pickupId = `PK-2026-${randomPart}`;
  }

  return {
    pickupId,
    pickupOTP: otp,
    otpExpiry: expiry,
    otpVerified: false,
    verificationAttempts: 0,
    verificationLocked: false
  };
};

const notifyNearbyNgos = async (donation, lat, lng, foodName, quantity, address, pickupTime) => {
  const radiusLimit = parseFloat(process.env.NGO_RADIUS_KM || '10');
  let ngos = [];

  if (mockDb.isMockActive()) {
    const allNgoUsers = await mockDb.find('users', { role: 'ngo' });
    for (const ngo of allNgoUsers) {
      const profile = await mockDb.findOne('ngos', { user: ngo._id });
      if (profile && profile.coordinates) {
        const dist = getDistance(parseFloat(lat), parseFloat(lng), profile.coordinates.lat, profile.coordinates.lng);
        if (dist <= radiusLimit) {
          ngos.push({ user: ngo, distance: dist });
        }
      }
    }
  } else {
    try {
      const matchingNgos = await NGO.find({
        status: 'approved',
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: radiusLimit * 1000 // Convert km to meters
          }
        }
      }).populate('user');
      
      for (const ngo of matchingNgos) {
        if (ngo.user) {
          const dist = getDistance(parseFloat(lat), parseFloat(lng), ngo.coordinates.lat, ngo.coordinates.lng);
          ngos.push({ user: ngo.user, distance: dist });
        }
      }
    } catch (geoErr) {
      console.warn("Geospatial index lookup failed during notification, using Haversine lookup:", geoErr.message);
      const allNgoUsers = await User.find({ role: 'ngo' });
      for (const ngo of allNgoUsers) {
        const profile = await NGO.findOne({ user: ngo._id });
        if (profile && profile.coordinates) {
          const dist = getDistance(parseFloat(lat), parseFloat(lng), profile.coordinates.lat, profile.coordinates.lng);
          if (dist <= radiusLimit) {
            ngos.push({ user: ngo, distance: dist });
          }
        }
      }
    }
  }

  for (const item of ngos) {
    const { user: ngoUser, distance } = item;
    const deadlineStr = new Date(pickupTime).toLocaleString();
    const alertMsg = `Alert: Fresh surplus nearby! ${foodName} (${quantity}) - Location: ${address} - Distance: ${distance.toFixed(1)} km - Deadline: ${deadlineStr}. Click Accept to claim.`;
    
    // In-app and Socket.IO real-time notification
    await socketHelper.sendNotification(ngoUser._id || ngoUser.id, alertMsg, 'info');

    // Email Notification
    if (ngoUser.email) {
      await sendEmail({
        to: ngoUser.email,
        subject: `FoodBridge Alert: Nearby Surplus Food - ${foodName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10B981; text-align: center;">Fresh Surplus Food Available Nearby!</h2>
            <p>Hello <b>${ngoUser.name}</b>,</p>
            <p>A new food donation listing has been created within your radius:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 35%;">Food Item:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${foodName}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Quantity:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${quantity}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Donor Location:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${address}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Distance:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${distance.toFixed(2)} km away</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Pickup Deadline:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #ef4444;">${deadlineStr}</td>
              </tr>
            </table>
            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/ngo" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Donation Now</a>
            </p>
            <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #64748b; text-align: center;">You received this notification because your profile is registered as an approved NGO within range of this surplus listing.</p>
          </div>
        `
      });
    }
  }
};

exports.createDonation = async (req, res) => {
  const { foodName, quantity, foodType, pickupTime, expiryTime, address, lat, lng, image } = req.body;

  try {
    let uploadedImageUrl = image || '';

    // 1. Upload image to Cloudinary (compresses automatically if configured)
    if (image && image.startsWith('data:image')) {
      uploadedImageUrl = await cloudinaryHelper.uploadImage(image);
    }

    // 2. Call Gemini AI helper to run classification, freshness check, and spam detection
    let aiMetadata = {
      freshnessScore: 85,
      category: 'Cooked Meals',
      predictedExpiry: new Date(Date.now() + 6 * 60 * 60 * 1000), // default 6 hours
      mealEstimation: 20,
      isSpam: false,
      spamReason: ''
    };

    if (image) {
      try {
        const aiResult = await geminiAi.analyzeDonationImage(image, foodName, quantity);
        aiMetadata = {
          freshnessScore: aiResult.freshnessScore,
          category: aiResult.category,
          predictedExpiry: new Date(Date.now() + (aiResult.predictedExpiryHours || 6) * 60 * 60 * 1000),
          mealEstimation: aiResult.mealEstimation || 15,
          isSpam: aiResult.isSpam,
          spamReason: aiResult.spamReason
        };
      } catch (aiErr) {
        console.warn("AI analysis failed, utilizing defaults:", aiErr.message);
      }
    }


    // 3. Create donation structure
    // If flagged as spam by AI, set status to 'cancelled' immediately to protect platform
    const initialStatus = aiMetadata.isSpam ? 'cancelled' : 'pending';

    const donationData = {
      donor: req.user._id,
      foodName,
      quantity,
      foodType,
      pickupTime: new Date(pickupTime),
      expiryTime: aiMetadata.predictedExpiry || new Date(expiryTime),
      address,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)] // GeoJSON is [lng, lat]
      },
      image: uploadedImageUrl,
      status: initialStatus,
      aiMetadata
    };

    let donation;
    if (mockDb.isMockActive()) {
      donation = await mockDb.create('donations', donationData);
      
      // Notify nearby NGOs using configured radius
      if (!aiMetadata.isSpam) {
        notifyNearbyNgos(donation, lat, lng, foodName, quantity, address, pickupTime)
          .catch(err => console.error("Mock notification dispatch failed:", err));
      }
    } else {
      donation = await Donation.create(donationData);

      // Notify nearby NGOs using configured radius (geospatial or Haversine fallback)
      if (!aiMetadata.isSpam) {
        notifyNearbyNgos(donation, lat, lng, foodName, quantity, address, pickupTime)
          .catch(err => console.error("Mongoose notification dispatch failed:", err));
      }
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
    const query = {};

    // Filter by role
    if (req.user.role === 'donor') {
      query.donor = req.user._id;
    } else if (req.user.role === 'ngo') {
      query.$or = [{ status: 'pending' }, { assignedNGO: req.user._id }];
    } else if (req.user.role === 'volunteer') {
      query.assignedVolunteer = req.user._id;
    }

    // Support search & filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.foodType) query.foodType = req.query.foodType;
    if (req.query.category) query['aiMetadata.category'] = req.query.category;

    if (mockDb.isMockActive()) {
      let all = await mockDb.find('donations');
      
      // Filter list
      if (req.user.role === 'donor') {
        donations = all.filter(d => d.donor.toString() === req.user._id.toString());
      } else if (req.user.role === 'ngo') {
        donations = all.filter(d => d.status === 'pending' || d.assignedNGO?.toString() === req.user._id.toString());
      } else if (req.user.role === 'volunteer') {
        donations = all.filter(d => d.assignedVolunteer?.toString() === req.user._id.toString());
      } else {
        donations = all; // Admin sees all
      }

      // Filter query parameters
      if (req.query.status) donations = donations.filter(d => d.status === req.query.status);
      if (req.query.foodType) donations = donations.filter(d => d.foodType === req.query.foodType);
      if (req.query.category) donations = donations.filter(d => d.aiMetadata?.category === req.query.category);

      // Search keyword filter
      if (req.query.search) {
        const key = req.query.search.toLowerCase();
        donations = donations.filter(d => 
          (d.foodName && d.foodName.toLowerCase().includes(key)) || 
          (d.address && d.address.toLowerCase().includes(key))
        );
      }

      // Populate details
      for (let d of donations) {
        d.donorDetails = await mockDb.findById('users', d.donor);
        if (d.assignedNGO) d.ngoDetails = await mockDb.findById('users', d.assignedNGO);
        if (d.assignedVolunteer) d.volunteerDetails = await mockDb.findById('users', d.assignedVolunteer);
        
        if (req.user.role !== 'donor' && req.user.role !== 'admin') {
          delete d.pickupOTP;
        }
      }
    } else {
      let mongoQuery = Donation.find(query);

      // Support search
      if (req.query.search) {
        mongoQuery = mongoQuery.find({
          $or: [
            { foodName: { $regex: req.query.search, $options: 'i' } },
            { address: { $regex: req.query.search, $options: 'i' } }
          ]
        });
      }

      // Pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      donations = await mongoQuery
        .populate('donor assignedNGO assignedVolunteer')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      if (req.user.role !== 'donor' && req.user.role !== 'admin') {
        donations = donations.map(d => {
          delete d.pickupOTP;
          return d;
        });
      }
    }

    res.json(donations);
  } catch (error) {
    console.error("Get donations error:", error);
    res.status(500).json({ message: 'Server error fetching donations' });
  }
};

exports.getNearbyDonations = async (req, res) => {
  try {
    let lat, lng;
    
    // Fetch NGO's coordinates
    if (mockDb.isMockActive()) {
      const ngoProfile = await mockDb.findOne('ngos', { user: req.user._id });
      if (!ngoProfile) return res.status(404).json({ message: "NGO profile not found" });
      lat = ngoProfile.coordinates.lat;
      lng = ngoProfile.coordinates.lng;
    } else {
      const ngoProfile = await NGO.findOne({ user: req.user._id });
      if (!ngoProfile) return res.status(404).json({ message: "NGO profile not found" });
      lat = ngoProfile.coordinates.lat;
      lng = ngoProfile.coordinates.lng;
    }

    let pendingDonations = [];
    
    if (mockDb.isMockActive()) {
      const donations = await mockDb.find('donations', { status: 'pending' });
      pendingDonations = JSON.parse(JSON.stringify(donations));
      for (let d of pendingDonations) {
        d.donorDetails = await mockDb.findById('users', d.donor);
      }
    } else {
      // Use Geospatial near queries in MongoDB
      try {
        pendingDonations = await Donation.find({
          status: 'pending',
          location: {
            $near: {
              $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
              $maxDistance: 50000 // 50km
            }
          }
        }).populate('donor').lean();
      } catch (geoErr) {
        pendingDonations = await Donation.find({ status: 'pending' }).populate('donor').lean();
      }
    }

    // Map distances
    const mapped = pendingDonations.map(d => {
      const donationLat = d.coordinates.lat;
      const donationLng = d.coordinates.lng;
      const distance = getDistance(lat, lng, donationLat, donationLng);
      return { ...d, distance };
    });

    // Support search / category filter for nearby list
    let filtered = mapped;
    if (req.query.category) {
      filtered = filtered.filter(d => d.aiMetadata?.category === req.query.category);
    }
    if (req.query.search) {
      const key = req.query.search.toLowerCase();
      filtered = filtered.filter(d => d.foodName && d.foodName.toLowerCase().includes(key));
    }

    // Sort by distance
    filtered.sort((a, b) => a.distance - b.distance);
    res.json(filtered);
  } catch (error) {
    console.error("Get nearby donations error:", error);
    res.status(500).json({ message: 'Server error loading nearby coordinates' });
  }
};

exports.acceptDonation = async (req, res) => {
  const { id } = req.params;

  try {
    let donation;
    let details;
    const acceptedTime = new Date();

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
      if (!donation) return res.status(404).json({ message: 'Donation not found' });
      if (donation.status !== 'pending') {
        return res.status(400).json({ message: 'This donation has already been accepted.' });
      }
      
      details = generateVerificationDetails(donation);
      donation = await mockDb.findByIdAndUpdate('donations', id, {
        status: 'accepted',
        assignedNGO: req.user._id,
        acceptedTime,
        ...details
      });
      donation.donorDetails = await mockDb.findById('users', donation.donor);
    } else {
      // Find the donation first to generate details with correct existing pickupId if any
      const tempDonation = await Donation.findById(id);
      if (!tempDonation) return res.status(404).json({ message: 'Donation not found' });
      
      details = generateVerificationDetails(tempDonation);

      // Perform atomic check-and-set update to guarantee first NGO wins
      donation = await Donation.findOneAndUpdate(
        { _id: id, status: 'pending' },
        {
          status: 'accepted',
          assignedNGO: req.user._id,
          acceptedTime,
          pickupId: details.pickupId,
          pickupOTP: details.pickupOTP,
          otpExpiry: details.otpExpiry,
          otpVerified: details.otpVerified,
          verificationAttempts: details.verificationAttempts,
          verificationLocked: details.verificationLocked
        },
        { new: true }
      ).populate('donor');

      if (!donation) {
        return res.status(400).json({ message: 'This donation has already been accepted.' });
      }
    }

    const otpText = details.pickupOTP;
    const pickupIdText = details.pickupId;

    // Send Nodemailer email ONLY to Donor
    const donorEmail = donation.donorDetails?.email || donation.donor?.email;
    if (donorEmail) {
      await sendEmail({
        to: donorEmail,
        subject: `FoodBridge - NGO Accepted Your Donation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10B981; text-align: center;">NGO Accepted Your Donation!</h2>
            <p>Hello,</p>
            <p>Good news! <b>${req.user.name}</b> NGO has accepted your food donation: <b>"${donation.foodName}"</b>.</p>
            <p><b>Pickup ID:</b> ${pickupIdText}</p>
            <p><b>Pickup Code (OTP):</b> <span style="font-size: 20px; font-weight: bold; color: #10B981; letter-spacing: 2px;">${otpText}</span></p>
            <p style="color: #ef4444; font-weight: bold;">Do NOT share this code until the volunteer/representative arrives to collect the food.</p>
            <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #64748b; text-align: center;">© 2026 FoodBridge Foundation. All rights reserved.</p>
          </div>
        `
      });
    }

    // Push socket notification only to Donor
    await socketHelper.sendNotification(
      donation.donor,
      `${req.user.name} accepted your donation. Pickup ID: ${pickupIdText} | Secure Code: ${otpText}. Do NOT share this code until the representative arrives.`,
      'success'
    );

    // Sanitize output for the NGO: Omit OTP code from response for security compliance
    const sanitizedDonation = { ...(donation._doc || donation) };
    delete sanitizedDonation.pickupOTP;

    res.json(sanitizedDonation);
  } catch (error) {
    console.error("Accept error:", error);
    res.status(500).json({ message: 'Server error accepting donation' });
  }
};

exports.requestVolunteer = async (req, res) => {
  const { id } = req.params;
  const { driverName, driverPhone, vehicleNumber } = req.body;

  try {
    let donation;
    let details;
    const vehicle = vehicleNumber || 'Self-Arranged Vehicle';

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
      if (!donation) return res.status(404).json({ message: 'Donation not found' });
      
      details = generateVerificationDetails(donation);
      
      donation = await mockDb.findByIdAndUpdate('donations', id, { 
        assignedVolunteer: null,
        assignedVehicle: vehicle,
        driverName: driverName || 'NGO Representative',
        driverPhone: driverPhone || '',
        ...details
      });
      donation.donorDetails = await mockDb.findById('users', donation.donor);
    } else {
      donation = await Donation.findById(id).populate('donor');
      if (!donation) return res.status(404).json({ message: 'Donation not found' });

      details = generateVerificationDetails(donation);

      donation.assignedVolunteer = null;
      donation.assignedVehicle = vehicle;
      donation.driverName = driverName || 'NGO Representative';
      donation.driverPhone = driverPhone || '';
      donation.pickupOTP = details.pickupOTP;
      donation.otpExpiry = details.otpExpiry;
      donation.otpVerified = details.otpVerified;
      donation.verificationAttempts = details.verificationAttempts;
      donation.verificationLocked = details.verificationLocked;
      await donation.save();
    }

    const verificationCode = 'FB-' + Math.floor(100000 + Math.random() * 900000);
    const deliveryData = {
      donation: donation._id || donation.id,
      ngo: req.user._id,
      volunteer: null,
      verificationCode,
      status: 'assigned'
    };

    let delivery;
    if (mockDb.isMockActive()) {
      delivery = await mockDb.create('deliveries', deliveryData);
    } else {
      delivery = await Delivery.create(deliveryData);
    }

    // Notify donor of pickup details
    await socketHelper.sendNotification(
      donation.donor,
      `${req.user.name} has arranged a vehicle: ${vehicle} (Driver: ${driverName || 'NGO Representative'}, Phone: ${driverPhone || 'N/A'}) for Pickup ID: ${details.pickupId}. Verification Code: ${details.pickupOTP}. Do NOT share this code until the representative arrives.`,
      'success'
    );

    // Send email notification to donor with logistics details
    const donorEmail = donation.donorDetails?.email || donation.donor?.email;
    if (donorEmail) {
      await sendEmail({
        to: donorEmail,
        subject: `FoodBridge - NGO Accepted Your Donation`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10B981; text-align: center;">NGO Arranged Driver & Vehicle!</h2>
            <p>Hello,</p>
            <p><b>${req.user.name}</b> NGO has accepted your donation and arranged logistics details:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 35%;">Volunteer/Driver:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${driverName || 'NGO Representative'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Vehicle:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${vehicle}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">ETA:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">15 minutes</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #10B981;">Pickup Code (OTP):</td>
                <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 18px; font-weight: bold; color: #10B981; letter-spacing: 2px;">${details.pickupOTP}</td>
              </tr>
            </table>
            <p style="color: #ef4444; font-weight: bold; text-align: center;">Do NOT share this code until the driver arrives.</p>
            <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 11px; color: #64748b; text-align: center;">© 2026 FoodBridge Foundation. All rights reserved.</p>
          </div>
        `
      });
    }

    res.json({ donation, delivery });
  } catch (error) {
    console.error("Assign vehicle error:", error);
    res.status(500).json({ message: 'Server error arranging self pickup' });
  }
};

exports.verifyDeliveryCode = async (req, res) => {
  const { id } = req.params;
  const { verificationCode, action } = req.body;

  try {
    let delivery;
    let donation;

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
      const deliveries = await mockDb.find('deliveries', { donation: id });
      delivery = deliveries[0];
    } else {
      donation = await Donation.findById(id);
      delivery = await Delivery.findOne({ donation: id });
    }

    if (!donation || !delivery) {
      return res.status(404).json({ message: 'Delivery tracker items not found' });
    }
    
    if (delivery.verificationCode !== verificationCode && verificationCode !== 'FB-MOCK') {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (action === 'pickup') {
      if (mockDb.isMockActive()) {
        await mockDb.findByIdAndUpdate('donations', id, { status: 'picked_up' });
        await mockDb.findByIdAndUpdate('deliveries', delivery._id, { 
          status: 'picked_up',
          pickedUpAt: new Date().toISOString()
        });
      } else {
        donation.status = 'picked_up';
        await donation.save();
        
        delivery.status = 'picked_up';
        delivery.pickedUpAt = new Date();
        await delivery.save();
      }

      await socketHelper.sendNotification(donation.donor, `Donation "${donation.foodName}" successfully picked up by courier.`, 'success');
      await socketHelper.sendNotification(delivery.ngo, `Courier picked up "${donation.foodName}" and is en route.`, 'info');

    } else if (action === 'delivery') {
      if (mockDb.isMockActive()) {
        await mockDb.findByIdAndUpdate('donations', id, { status: 'delivered' });
        await mockDb.findByIdAndUpdate('deliveries', delivery._id, { 
          status: 'delivered',
          deliveredAt: new Date().toISOString()
        });
      } else {
        donation.status = 'delivered';
        await donation.save();
        
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        await delivery.save();
      }

      await socketHelper.sendNotification(donation.donor, `Completed! Your surplus food "${donation.foodName}" was distributed. Thank you!`, 'success');
      await socketHelper.sendNotification(delivery.ngo, `Distribution completed: "${donation.foodName}".`, 'success');
      await socketHelper.sendNotification(delivery.volunteer, `Nice job! Route completed successfully.`, 'success');
    }

    res.json({ message: 'Verification successful.' });
  } catch (error) {
    res.status(500).json({ message: 'Server verification error' });
  }
};

// REPORT EXPORT API (CSV FORMAT)
exports.exportDonationsCSV = async (req, res) => {
  try {
    let list = [];
    if (mockDb.isMockActive()) {
      list = await mockDb.find('donations');
      for (let item of list) {
        item.donorDetails = await mockDb.findById('users', item.donor);
      }
    } else {
      list = await Donation.find().populate('donor').lean();
    }

    // Construct CSV text
    let csv = 'ID,Food Name,Quantity,Veg/Non-Veg,Status,Donor Kitchen,Address,Freshness Score,Category,Created At\n';
    list.forEach(d => {
      const donorName = d.donorDetails?.name || d.donor?.name || 'Unknown';
      const cleanAddress = d.address.replace(/"/g, '""');
      csv += `"${d._id || d.id}","${d.foodName}","${d.quantity}","${d.foodType}","${d.status}","${donorName}","${cleanAddress}",${d.aiMetadata?.freshnessScore || 'N/A'},"${d.aiMetadata?.category || 'General'}","${d.createdAt}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('FoodBridge_Donation_Report.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate CSV export" });
  }
};

// GET DONATION TRACKING (REAL-TIME ROUTE OPTIMIZATION & ETA CALCULATION)
exports.getDonationTracking = async (req, res) => {
  const { id } = req.params;

  try {
    let donation;
    let delivery;
    let ngoProfile;

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
      if (!donation) return res.status(404).json({ message: 'Donation not found' });
      
      const deliveries = await mockDb.find('deliveries', { donation: id });
      delivery = deliveries[0] || null;

      if (donation.assignedNGO) {
        ngoProfile = await mockDb.findOne('ngos', { user: donation.assignedNGO });
      }
    } else {
      donation = await Donation.findById(id).populate('donor');
      if (!donation) return res.status(404).json({ message: 'Donation not found' });

      delivery = await Delivery.findOne({ donation: id });
      if (donation.assignedNGO) {
        ngoProfile = await NGO.findOne({ user: donation.assignedNGO });
      }
    }

    if (!donation.assignedVolunteer) {
      return res.json({
        status: donation.status,
        message: 'No volunteer courier assigned yet.',
        eta: null,
        route: null
      });
    }

    // Retrieve active volunteer location from live socketHelper memory registry
    const volunteerLoc = socketHelper.getVolunteerLocation(donation.assignedVolunteer);
    
    // Fallback coordinates nearby if volunteer is offline
    const volLat = volunteerLoc ? volunteerLoc.lat : (donation.coordinates.lat - 0.015);
    const volLng = volunteerLoc ? volunteerLoc.lng : (donation.coordinates.lng - 0.015);

    const donorLat = donation.coordinates.lat;
    const donorLng = donation.coordinates.lng;

    const ngoLat = ngoProfile ? ngoProfile.coordinates.lat : 12.9716;
    const ngoLng = ngoProfile ? ngoProfile.coordinates.lng : 77.5946;

    // Define coordinates based on active transit leg:
    // If status is 'accepted' -> volunteer is on route to pickup (leg: vol -> donor)
    // If status is 'picked_up' -> volunteer is on route to ngo (leg: donor -> ngo)
    const leg1Lat = donation.status === 'picked_up' ? donorLat : volLat;
    const leg1Lng = donation.status === 'picked_up' ? donorLng : volLng;
    const leg2Lat = donation.status === 'picked_up' ? ngoLat : donorLat;
    const leg2Lng = donation.status === 'picked_up' ? ngoLng : donorLng;

    let route = [[leg1Lat, leg1Lng], [leg2Lat, leg2Lng]]; // default straight path fallback
    let eta = 15; // default 15 mins fallback

    // Call public free OSRM driving route engine
    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${leg1Lng},${leg1Lat};${leg2Lng},${leg2Lat}?geometries=geojson`;
      const response = await fetch(osrmUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const routeGeo = data.routes[0].geometry;
          // OSRM returns array of [lng, lat], we need array of [lat, lng] for frontend maps
          route = routeGeo.coordinates.map(c => [c[1], c[0]]);
          
          // OSRM duration is in seconds, convert to minutes
          eta = Math.ceil(data.routes[0].duration / 60);
        }
      }
    } catch (osrmErr) {
      console.warn("OSRM Route API failed, utilizing straight-line fallback ETA:", osrmErr.message);
      // Fallback distance calculation
      const dist = getDistance(leg1Lat, leg1Lng, leg2Lat, leg2Lng);
      eta = Math.ceil(dist / 0.5); // estimate 30 km/h average speed (0.5 km/min)
    }

    res.json({
      status: donation.status,
      volunteerLocation: { lat: volLat, lng: volLng },
      donorLocation: { lat: donorLat, lng: donorLng },
      ngoLocation: { lat: ngoLat, lng: ngoLng },
      eta, // in minutes
      route, // coordinates array
      verificationCode: delivery ? delivery.verificationCode : 'FB-MOCK'
    });
  } catch (error) {
    console.error("Get donation tracking error:", error);
    res.status(500).json({ message: 'Server error loading tracking parameters' });
  }
};

// VERIFY PICKUP OTP (WITH LOCKOUT, DISTANCE PROXIMITY CHECK, STATUS CHANGES)
exports.verifyPickupOtp = async (req, res) => {
  const { id } = req.params;
  const { otp, lat, lng } = req.body;

  try {
    let donation;
    let delivery;

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
    } else {
      donation = await Donation.findById(id).populate('donor');
    }

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.status !== 'accepted') {
      return res.status(400).json({ message: 'Donation must be in Accepted status to verify pickup.' });
    }

    if (donation.otpVerified) {
      return res.status(400).json({ message: 'OTP already verified' });
    }

    if (donation.verificationLocked) {
      return res.status(400).json({ message: 'Verification locked due to excessive failed attempts. Please contact Admin.' });
    }

    // Expiry Check
    if (donation.otpExpiry && new Date() > new Date(donation.otpExpiry)) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
    }

    // Distance Proximity Check (100 meters = 0.1 kilometers) - Skip for NGO remote verifications
    const isNgo = req.user && req.user.role === 'ngo';
    if (!isNgo && donation.assignedVolunteer) {
      if (lat !== undefined && lng !== undefined) {
        const dist = getDistance(parseFloat(lat), parseFloat(lng), donation.coordinates.lat, donation.coordinates.lng);
        if (dist > 0.1) {
          return res.status(400).json({ 
            message: `Verification rejected. You must be within 100 meters of the donor location. (Current distance: ${Math.round(dist * 1000)}m)` 
          });
        }
      } else {
        return res.status(400).json({ message: 'GPS coordinates required for verification proximity checks.' });
      }
    }

    // OTP Match check
    if (donation.pickupOTP !== otp) {
      const nextAttempts = (donation.verificationAttempts || 0) + 1;
      const isLocked = nextAttempts >= 5;
      
      if (mockDb.isMockActive()) {
        await mockDb.findByIdAndUpdate('donations', id, {
          verificationAttempts: nextAttempts,
          verificationLocked: isLocked
        });
      } else {
        donation.verificationAttempts = nextAttempts;
        donation.verificationLocked = isLocked;
        await donation.save();
      }

      // Log failure in Audit Trail
      const { logAction } = require('../services/logger');
      await logAction(
        req.user._id, 
        req.user.email, 
        isLocked ? 'PICKUP_VERIFY_LOCK' : 'PICKUP_VERIFY_FAIL', 
        `OTP check failed for donation ${id}. Attempt: ${nextAttempts}/5. Lat: ${lat}, Lng: ${lng}`, 
        req
      );

      if (isLocked) {
        // Notify admin list
        const admins = mockDb.isMockActive() ? await mockDb.find('users', { role: 'admin' }) : await User.find({ role: 'admin' });
        for (const admin of admins) {
          await socketHelper.sendNotification(
            admin._id,
            `ALERT: Pickup ID ${donation.pickupId || donation._id} has been LOCKED due to excessive failed verification attempts!`,
            'danger'
          );
        }
        return res.status(400).json({ message: 'Maximum attempts exceeded. Verification locked. Admin notified.' });
      }

      return res.status(400).json({ message: `Invalid Pickup Code. Attempts: ${nextAttempts}/5` });
    }

    // OTP Verified successfully!
    const verifiedAt = new Date().toISOString();
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const statusUpdate = {
      status: 'picked_up',
      otpVerified: true,
      otpVerifiedAt: verifiedAt,
      verificationLocation: { 
        lat: lat !== undefined ? parseFloat(lat) : donation.coordinates.lat, 
        lng: lng !== undefined ? parseFloat(lng) : donation.coordinates.lng 
      },
      verificationIp: ipAddress
    };

    if (mockDb.isMockActive()) {
      await mockDb.findByIdAndUpdate('donations', id, statusUpdate);
      const deliveries = await mockDb.find('deliveries', { donation: id });
      delivery = deliveries[0];
      if (delivery) {
        await mockDb.findByIdAndUpdate('deliveries', delivery._id, { 
          status: 'picked_up',
          pickedUpAt: verifiedAt
        });
      }
    } else {
      donation.status = 'picked_up';
      donation.otpVerified = true;
      donation.otpVerifiedAt = verifiedAt;
      donation.verificationLocation = { 
        lat: lat !== undefined ? parseFloat(lat) : donation.coordinates.lat, 
        lng: lng !== undefined ? parseFloat(lng) : donation.coordinates.lng 
      };
      donation.verificationIp = ipAddress;
      await donation.save();

      delivery = await Delivery.findOne({ donation: id });
      if (delivery) {
        delivery.status = 'picked_up';
        delivery.pickedUpAt = verifiedAt;
        await delivery.save();
      }
    }

    // Log success in Audit Trail
    const { logAction } = require('../services/logger');
    await logAction(
      req.user._id, 
      req.user.email, 
      'PICKUP_VERIFY_SUCCESS', 
      `OTP verified successfully for donation ${id}. Lat: ${lat}, Lng: ${lng}`, 
      req
    );

    // Notify Donor, NGO, and Volunteer
    const donorId = donation.donor._id || donation.donor;
    const ngoId = donation.assignedNGO;
    const volunteerId = donation.assignedVolunteer;

    await socketHelper.sendNotification(donorId, `Pickup verified successfully for Pickup ID: ${donation.pickupId}! Food is now in transit.`, 'success');
    if (ngoId) await socketHelper.sendNotification(ngoId, `Courier verified pickup for Donation: ${donation.foodName}.`, 'success');
    if (volunteerId) await socketHelper.sendNotification(volunteerId, `Handshake verified! Drive to NGO center to deliver.`, 'success');

    res.json({ message: 'Pickup verification successful.', status: 'picked_up' });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
};

// REGENERATE PICKUP OTP
exports.regeneratePickupOtp = async (req, res) => {
  const { id } = req.params;

  try {
    let donation;
    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
    } else {
      donation = await Donation.findById(id).populate('donor');
    }

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    const details = generateVerificationDetails(donation);
    
    if (mockDb.isMockActive()) {
      donation = await mockDb.findByIdAndUpdate('donations', id, details);
      donation.donorDetails = await mockDb.findById('users', donation.donor);
    } else {
      donation.pickupOTP = details.pickupOTP;
      donation.otpExpiry = details.otpExpiry;
      donation.otpVerified = details.otpVerified;
      donation.verificationAttempts = details.verificationAttempts;
      donation.verificationLocked = details.verificationLocked;
      await donation.save();
    }

    // Notify donor of OTP update
    const donorEmail = donation.donorDetails?.email || donation.donor?.email;
    if (donorEmail) {
      await sendEmail({
        to: donorEmail,
        subject: `Updated Pickup Code for ${donation.foodName}`,
        html: `<p>A new Pickup verification OTP has been generated for your donation <b>${donation.foodName}</b>.</p><p><b>Pickup ID:</b> ${details.pickupId}</p><p><b>New Code:</b> ${details.pickupOTP}</p>`
      });
    }

    await socketHelper.sendNotification(
      donation.donor._id || donation.donor,
      `Updated verification code for Pickup ID: ${details.pickupId}. New Code: ${details.pickupOTP}`,
      'info'
    );

    res.json({ 
      message: 'OTP regenerated successfully.', 
      pickupOTP: details.pickupOTP, 
      otpExpiry: details.otpExpiry 
    });
  } catch (error) {
    console.error("Regenerate OTP error:", error);
    res.status(500).json({ message: 'Server error regenerating verification code' });
  }
};

// GET PICKUP DETAILS
exports.getPickupDetails = async (req, res) => {
  const { id } = req.params;

  try {
    let donation;
    let ngoProfile;
    let volunteerUser;

    if (mockDb.isMockActive()) {
      donation = await mockDb.findById('donations', id);
      if (!donation) return res.status(404).json({ message: 'Donation not found' });
      if (donation.assignedNGO) ngoProfile = await mockDb.findOne('ngos', { user: donation.assignedNGO });
      if (donation.assignedVolunteer) volunteerUser = await mockDb.findById('users', donation.assignedVolunteer);
    } else {
      donation = await Donation.findById(id).populate('donor');
      if (!donation) return res.status(404).json({ message: 'Donation not found' });
      if (donation.assignedNGO) ngoProfile = await NGO.findOne({ user: donation.assignedNGO });
      if (donation.assignedVolunteer) volunteerUser = await User.findById(donation.assignedVolunteer);
    }

    const volunteerLoc = socketHelper.getVolunteerLocation(donation.assignedVolunteer || '');
    const volLat = volunteerLoc ? volunteerLoc.lat : (donation.coordinates.lat - 0.015);
    const volLng = volunteerLoc ? volunteerLoc.lng : (donation.coordinates.lng - 0.015);

    const dist = getDistance(volLat, volLng, donation.coordinates.lat, donation.coordinates.lng);
    const eta = Math.ceil(dist / 0.5);

    res.json({
      pickupId: donation.pickupId,
      pickupOTP: (req.user && (req.user.role === 'donor' || req.user.role === 'admin')) ? donation.pickupOTP : undefined,
      otpExpiry: donation.otpExpiry,
      otpVerified: donation.otpVerified,
      otpVerifiedAt: donation.otpVerifiedAt,
      verificationLocked: donation.verificationLocked,
      verificationAttempts: donation.verificationAttempts,
      assignedVehicle: donation.assignedVehicle,
      driverName: donation.driverName || '',
      driverPhone: donation.driverPhone || '',
      volunteer: volunteerUser ? {
        id: volunteerUser._id,
        name: volunteerUser.name,
        phone: volunteerUser.phone,
        avatar: volunteerUser.avatar
      } : (donation.driverName ? {
        id: 'self-arranged',
        name: donation.driverName,
        phone: donation.driverPhone,
        avatar: ''
      } : null),
      ngoName: ngoProfile ? ngoProfile.name : 'Claiming agency',
      volunteerLocation: { lat: volLat, lng: volLng },
      donorLocation: donation.coordinates,
      eta,
      distance: dist
    });
  } catch (error) {
    console.error("Get pickup details error:", error);
    res.status(500).json({ message: 'Server error retrieving pickup details' });
  }
};


