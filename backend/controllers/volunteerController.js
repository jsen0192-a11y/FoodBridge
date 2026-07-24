const User = require('../models/User');
const Volunteer = require('../models/Volunteer');
const mockDb = require('../config/mockDb');

exports.getAvailableVolunteers = async (req, res) => {
  try {
    let volunteers = [];
    if (mockDb.isMockActive()) {
      const volProfiles = await mockDb.find('volunteers', { isAvailable: true });
      for (const profile of volProfiles) {
        const user = await mockDb.findById('users', profile.user);
        if (user) {
          volunteers.push({
            _id: user._id,
            id: user._id,
            name: user.name,
            phone: user.phone,
            vehicleType: profile.vehicleType,
            isAvailable: profile.isAvailable
          });
        }
      }
    } else {
      const profiles = await Volunteer.find({ isAvailable: true }).populate('user');
      volunteers = profiles.map(p => ({
        _id: p.user._id,
        name: p.user.name,
        phone: p.user.phone,
        vehicleType: p.vehicleType,
        isAvailable: p.isAvailable
      }));
    }

    res.json(volunteers);
  } catch (error) {
    console.error("Get volunteers error:", error);
    res.status(500).json({ message: 'Server error fetching volunteers' });
  }
};

exports.updateAvailability = async (req, res) => {
  const { isAvailable } = req.body;
  try {
    if (mockDb.isMockActive()) {
      const profile = await mockDb.findOne('volunteers', { user: req.user._id });
      if (profile) {
        await mockDb.findByIdAndUpdate('volunteers', profile._id, { isAvailable });
      }
    } else {
      const profile = await Volunteer.findOne({ user: req.user._id });
      if (profile) {
        profile.isAvailable = isAvailable;
        await profile.save();
      }
    }
    res.json({ message: "Availability updated successfully", isAvailable });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
