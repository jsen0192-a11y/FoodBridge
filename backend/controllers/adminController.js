const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');
const mockDb = require('../config/mockDb');
const socketHelper = require('../config/socketHelper');

exports.getAnalytics = async (req, res) => {
  try {
    let totalDonations = 0;
    let deliveredDonations = [];
    let totalNgos = 0;
    let totalVolunteers = 0;
    let allDonations = [];
    let allUsers = [];
    let auditLogs = [];

    if (mockDb.isMockActive()) {
      allDonations = await mockDb.find('donations');
      allUsers = await mockDb.find('users');
      auditLogs = await mockDb.find('auditlogs');
      totalDonations = allDonations.length;
      deliveredDonations = allDonations.filter(d => d.status === 'delivered');
      
      const ngos = await mockDb.find('ngos', { status: 'approved' });
      totalNgos = ngos.length;
      
      const volunteers = await mockDb.find('volunteers');
      totalVolunteers = volunteers.length;
    } else {
      totalDonations = await Donation.countDocuments();
      deliveredDonations = await Donation.find({ status: 'delivered' }).lean();
      totalNgos = await NGO.countDocuments({ status: 'approved' });
      totalVolunteers = await Volunteer.countDocuments();
      allDonations = await Donation.find().lean();
      allUsers = await User.find().lean();
      auditLogs = await AuditLog.find().sort({ timestamp: -1 }).lean();
    }

    // 1. Calculate Meals Saved (using mealEstimation AI metrics)
    let totalMealsSaved = 0;
    deliveredDonations.forEach(d => {
      totalMealsSaved += (d.aiMetadata?.mealEstimation || 20);
    });

    // 2. Compute Restaurant Leaderboard (group by donor)
    const donorGroups = {};
    allDonations.forEach(d => {
      if (d.status === 'delivered') {
        const donorId = d.donor.toString();
        const meals = d.aiMetadata?.mealEstimation || 20;
        if (!donorGroups[donorId]) {
          donorGroups[donorId] = { meals: 0, count: 0 };
        }
        donorGroups[donorId].meals += meals;
        donorGroups[donorId].count += 1;
      }
    });

    const leaderboard = Object.keys(donorGroups).map(donorId => {
      const user = allUsers.find(u => u._id.toString() === donorId || u.id === donorId);
      return {
        donorId,
        name: user ? user.name : 'Partner Kitchen',
        mealsSaved: donorGroups[donorId].meals,
        donationsCount: donorGroups[donorId].count
      };
    }).sort((a, b) => b.mealsSaved - a.mealsSaved).slice(0, 5);

    // 3. Compute NGO Performance Metrics (claims and completions)
    const ngoGroups = {};
    allDonations.forEach(d => {
      if (d.assignedNGO) {
        const ngoId = d.assignedNGO.toString();
        if (!ngoGroups[ngoId]) {
          ngoGroups[ngoId] = { accepted: 0, completed: 0 };
        }
        ngoGroups[ngoId].accepted += 1;
        if (d.status === 'delivered') {
          ngoGroups[ngoId].completed += 1;
        }
      }
    });

    const ngoPerformance = Object.keys(ngoGroups).map(ngoId => {
      const user = allUsers.find(u => u._id.toString() === ngoId || u.id === ngoId);
      return {
        ngoId,
        name: user ? user.name : 'Welfare Agent',
        acceptedCount: ngoGroups[ngoId].accepted,
        completedCount: ngoGroups[ngoId].completed,
        ratio: ngoGroups[ngoId].accepted > 0 ? parseFloat((ngoGroups[ngoId].completed / ngoGroups[ngoId].accepted * 100).toFixed(1)) : 0
      };
    }).sort((a, b) => b.completedCount - a.completedCount);

    // 4. Compute Volunteer Performance Metrics
    const volGroups = {};
    allDonations.forEach(d => {
      if (d.assignedVolunteer) {
        const volId = d.assignedVolunteer.toString();
        if (!volGroups[volId]) {
          volGroups[volId] = { assigned: 0, completed: 0 };
        }
        volGroups[volId].assigned += 1;
        if (d.status === 'delivered') {
          volGroups[volId].completed += 1;
        }
      }
    });

    const volunteerPerformance = Object.keys(volGroups).map(volId => {
      const user = allUsers.find(u => u._id.toString() === volId || u.id === volId);
      return {
        volId,
        name: user ? user.name : 'Courier partner',
        assignedCount: volGroups[volId].assigned,
        completedCount: volGroups[volId].completed
      };
    }).sort((a, b) => b.completedCount - a.completedCount);

    // 5. Generate Heat Map coordinate weight matrices
    const heatMapData = allDonations.map(d => ({
      lat: d.coordinates.lat,
      lng: d.coordinates.lng,
      weight: d.aiMetadata?.mealEstimation || 20
    }));

    res.json({
      totalMealsSaved,
      totalDonations,
      activeNgos: totalNgos,
      activeVolunteers: totalVolunteers,
      donations: allDonations,
      leaderboard,
      ngoPerformance,
      volunteerPerformance,
      heatMapData,
      auditLogs
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    res.status(500).json({ message: 'Server error loading analytics' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    let users = [];
    if (mockDb.isMockActive()) {
      users = await mockDb.find('users');
      // Strip passwords
      users = users.map(u => {
        const { password, ...rest } = u;
        return rest;
      });
      // Attach details
      for (let u of users) {
        if (u.role === 'ngo') {
          u.ngoDetails = await mockDb.findOne('ngos', { user: u._id });
        }
      }
    } else {
      users = await User.find().select('-password').lean();
      for (let u of users) {
        if (u.role === 'ngo') {
          u.ngoDetails = await NGO.findOne({ user: u._id }).lean();
        }
      }
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

exports.verifyUser = async (req, res) => {
  const { id } = req.params; // user id
  const { status } = req.body; // 'approved' or 'rejected'

  try {
    let user;
    if (mockDb.isMockActive()) {
      user = await mockDb.findById('users', id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Update User verification status
      user = await mockDb.findByIdAndUpdate('users', id, { isVerified: status === 'approved' });

      // Update associated NGO if exists
      if (user.role === 'ngo') {
        const ngo = await mockDb.findOne('ngos', { user: id });
        if (ngo) {
          await mockDb.findByIdAndUpdate('ngos', ngo._id, { status });
        }
      }
    } else {
      user = await User.findById(id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      user.isVerified = status === 'approved';
      await user.save();

      if (user.role === 'ngo') {
        const ngo = await NGO.findOne({ user: id });
        if (ngo) {
          ngo.status = status;
          await ngo.save();
        }
      }
    }

    // Notify user of verification status change
    await socketHelper.sendNotification(
      id,
      `Your account verification has been: ${status.toUpperCase()} by the Admin.`,
      status === 'approved' ? 'success' : 'danger'
    );

    res.json({ message: `User status set to ${status}`, user });
  } catch (error) {
    console.error("Verify user error:", error);
    res.status(500).json({ message: 'Server error verifying user' });
  }
};
