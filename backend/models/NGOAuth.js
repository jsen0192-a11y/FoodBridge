const mongoose = require('mongoose');

const NGOAuthSchema = new mongoose.Schema({
  ngoName: { 
    type: String, 
    required: true 
  },
  regNo: { 
    type: String, 
    required: true, 
    unique: true 
  },
  contactPerson: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  securityPin: { 
    type: String, 
    required: true 
  } // 6 digits PIN
}, {
  timestamps: true
});

module.exports = mongoose.model('NGOAuth', NGOAuthSchema);
