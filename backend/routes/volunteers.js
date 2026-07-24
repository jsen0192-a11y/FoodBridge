const express = require('express');
const router = express.Router();
const { getAvailableVolunteers, updateAvailability } = require('../controllers/volunteerController');
const { protect } = require('../middleware/auth');

router.get('/available', protect, getAvailableVolunteers);
router.put('/availability', protect, updateAvailability);

module.exports = router;
