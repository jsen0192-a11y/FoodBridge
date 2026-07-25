const protect = async (req, res, next) => {
  // Bypassed: Set a dummy user to satisfy downstream controller logic
  req.user = {
    _id: 'anonymous',
    id: 'anonymous',
    name: 'Anonymous User',
    email: 'anonymous@foodbridge.org',
    role: 'admin'
  };
  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Bypassed: Allow all routes
    next();
  };
};

module.exports = { protect, authorize };
