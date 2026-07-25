const express = require('express');
const router = express.Router();
const { 
  createDonation, 
  getDonations, 
  getNearbyDonations, 
  acceptDonation, 
  rejectDonation,
  ngoRegister,
  ngoLogin,
  requestVolunteer, 
  verifyDeliveryCode,
  exportDonationsCSV,
  getDonationTracking,
  verifyPickupOtp,
  regeneratePickupOtp,
  getPickupDetails
} = require('../controllers/donationController');
const { protect, authorize } = require('../middleware/auth');

// NGO Specific auth endpoints
router.post('/ngo/auth/register', ngoRegister);
router.post('/ngo/auth/login', ngoLogin);

// Define specific routes first to avoid clashes with parameters
router.get('/report/csv', protect, authorize('admin'), exportDonationsCSV);
router.get('/nearby', protect, authorize('ngo'), getNearbyDonations);
router.get('/:id/tracking', protect, getDonationTracking);
router.post('/:id/pickup/otp', protect, regeneratePickupOtp);
router.post('/:id/pickup/verify', protect, verifyPickupOtp);
router.get('/:id/pickup', protect, getPickupDetails);


router.post('/', protect, authorize('donor'), createDonation);
router.get('/', protect, getDonations);
router.put('/:id/accept', protect, authorize('ngo'), acceptDonation);
router.put('/:id/reject', protect, authorize('ngo'), rejectDonation);
router.put('/:id/assign-volunteer', protect, authorize('ngo'), requestVolunteer);
router.post('/:id/verify-code', protect, verifyDeliveryCode);

module.exports = router;
