const express = require('express');
const router = express.Router();
const { 
  createDonation, 
  getDonations, 
  getNearbyDonations, 
  acceptDonation, 
  requestVolunteer, 
  verifyDeliveryCode,
  exportDonationsCSV
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');

// Define specific routes first to avoid clashes with parameters
router.get('/report/csv', protect, authorize('admin'), exportDonationsCSV);
router.get('/nearby', protect, authorize('ngo'), getNearbyDonations);

router.post('/', protect, authorize('donor'), createDonation);
router.get('/', protect, getDonations);
router.put('/:id/accept', protect, authorize('ngo'), acceptDonation);
router.put('/:id/assign-volunteer', protect, authorize('ngo'), requestVolunteer);
router.post('/:id/verify-code', protect, verifyDeliveryCode);

module.exports = router;
