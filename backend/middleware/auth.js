const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mockDb = require('../config/mockDb');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_foodbridge_jwt_key_12345');

      if (mockDb.isMockActive()) {
        const user = await mockDb.findById('users', decoded.id);
        if (!user) {
          return res.status(401).json({ message: 'Not authorized, user not found in mock database' });
        }
        req.user = user;
      } else {
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
          return res.status(401).json({ message: 'Not authorized, user not found' });
        }
        req.user = user;
      }
      return next();
    } catch (error) {
      console.error("JWT verification error:", error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role ${req.user ? req.user.role : 'none'} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorize };
