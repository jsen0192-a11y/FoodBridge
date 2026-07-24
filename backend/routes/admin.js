const express = require('express');
const router = express.Router();
const { getAnalytics, getUsers, verifyUser } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.get('/analytics', protect, authorize('admin'), getAnalytics);
router.get('/users', protect, authorize('admin'), getUsers);
router.put('/users/:id/verify', protect, authorize('admin'), verifyUser);

module.exports = router;
