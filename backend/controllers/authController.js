const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
const mockDb = require('../config/mockDb');
const socketHelper = require('../config/socketHelper');
const { sendEmail, templates } = require('../config/nodemailer');
const { logAction } = require('../services/logger');


const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_foodbridge_jwt_key_12345', {
    expiresIn: '1d'
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecret_foodbridge_jwt_key_12345', {
    expiresIn: '7d'
  });
};

exports.register = async (req, res) => {
  const { name, email, password, phone, role, ngoDetails, volunteerDetails } = req.body;

  try {
    // 1. Check if user exists
    let existingUser;
    if (mockDb.isMockActive()) {
      existingUser = await mockDb.findOne('users', { email });
    } else {
      existingUser = await User.findOne({ email });
    }

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Generate Verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 4. Create User
    let user;
    const userData = {
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      isVerified: role === 'donor' || role === 'admin' ? false : true,
      isEmailVerified: false,
      emailOtp: otp,
      otpExpires
    };

    if (mockDb.isMockActive()) {
      user = await mockDb.create('users', userData);
    } else {
      user = await User.create(userData);
    }

    // 5. Create specific roles
    if (role === 'ngo' && ngoDetails) {
      const { regNo, address, lat, lng, contactPerson } = ngoDetails;
      if (mockDb.isMockActive()) {
        await mockDb.create('ngos', {
          user: user._id,
          regNo,
          address,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
          contactPerson,
          status: 'pending'
        });
      } else {
        await NGO.create({
          user: user._id,
          regNo,
          address,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
          contactPerson,
          status: 'pending'
        });
      }
    } else if (role === 'volunteer' && volunteerDetails) {
      const { vehicleType } = volunteerDetails;
      if (mockDb.isMockActive()) {
        await mockDb.create('volunteers', {
          user: user._id,
          vehicleType,
          isAvailable: true,
          status: 'approved'
        });
      } else {
        await Volunteer.create({
          user: user._id,
          vehicleType,
          isAvailable: true,
          status: 'approved'
        });
      }
    }

    // Send Welcome & OTP Verification Emails
    const welcome = templates.welcome(name);
    await sendEmail({ to: email, subject: welcome.subject, html: welcome.html });

    const otpMail = templates.otp(otp);
    await sendEmail({ to: email, subject: otpMail.subject, html: otpMail.html });

    // Send notification to admin list
    const adminMessage = `New ${role} registration pending email verify: ${name}`;
    if (mockDb.isMockActive()) {
      const admins = await mockDb.find('users', { role: 'admin' });
      for (const admin of admins) {
        await socketHelper.sendNotification(admin._id, adminMessage, 'info');
      }
    } else {
      const admins = await User.find({ role: 'admin' });
      for (const admin of admins) {
        await socketHelper.sendNotification(admin._id, adminMessage, 'info');
      }
    }

    await logAction(null, email, 'USER_REGISTER', `Registered name: ${name} as role: ${role}`, req);

    res.status(201).json({
      message: 'Registration successful! Verification OTP sent to email.',
      email,
      needsVerification: true
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    let user;
    if (mockDb.isMockActive()) {
      user = await mockDb.findOne('users', { email });
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      if (user.emailOtp !== otp || new Date() > new Date(user.otpExpires)) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      user = await mockDb.findByIdAndUpdate('users', user._id, {
        isEmailVerified: true,
        emailOtp: null,
        otpExpires: null
      });
    } else {
      user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.emailOtp !== otp || new Date() > user.otpExpires) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      user.isEmailVerified = true;
      user.emailOtp = null;
      user.otpExpires = null;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    if (mockDb.isMockActive()) {
      await mockDb.findByIdAndUpdate('users', user._id, { refreshToken });
    } else {
      user.refreshToken = refreshToken;
      await user.save();
    }

    await logAction(user._id, user.email, 'USER_VERIFY_EMAIL', `Successfully verified email with OTP`, req);

    res.json({

      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: 'Server verification error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user;
    if (mockDb.isMockActive()) {
      user = await mockDb.findOne('users', { email });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Re-trigger OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

      if (mockDb.isMockActive()) {
        await mockDb.findByIdAndUpdate('users', user._id, { emailOtp: otp, otpExpires });
      } else {
        user.emailOtp = otp;
        user.otpExpires = otpExpires;
        await user.save();
      }

      const otpMail = templates.otp(otp);
      await sendEmail({ to: email, subject: otpMail.subject, html: otpMail.html });

      return res.status(401).json({
        message: 'Email address not verified. A new OTP has been dispatched.',
        email,
        needsVerification: true
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    if (mockDb.isMockActive()) {
      await mockDb.findByIdAndUpdate('users', user._id, { refreshToken });
    } else {
      user.refreshToken = refreshToken;
      await user.save();
    }

    await logAction(user._id, user.email, 'USER_LOGIN', `Successful login`, req);

    res.json({

      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh Token required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'supersecret_foodbridge_jwt_key_12345');
    
    let user;
    if (mockDb.isMockActive()) {
      user = await mockDb.findById('users', decoded.id);
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'Invalid Refresh Token' });
    }

    const newAccessToken = generateAccessToken(user._id);
    await logAction(user._id, user.email, 'TOKEN_REFRESH', `Refreshed access token`, req);
    res.json({ token: newAccessToken });

  } catch (err) {
    return res.status(403).json({ message: 'Invalid Refresh Token' });
  }
};

exports.googleSignIn = async (req, res) => {
  const { name, email, googleId, avatar, role, ngoDetails, volunteerDetails } = req.body;

  try {
    let user;
    if (mockDb.isMockActive()) {
      user = await mockDb.findOne('users', { email });
    } else {
      user = await User.findOne({ email });
    }

    if (user) {
      const accessToken = generateAccessToken(user._id);
      const refresh = generateRefreshToken(user._id);
      
      if (mockDb.isMockActive()) {
        await mockDb.findByIdAndUpdate('users', user._id, { isEmailVerified: true, refreshToken: refresh });
      } else {
        user.isEmailVerified = true;
        user.refreshToken = refresh;
        await user.save();
      }

      await logAction(user._id, user.email, 'GOOGLE_LOGIN', `Successful Google Login`, req);

      return res.json({

        token: accessToken,
        refreshToken: refresh,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          isEmailVerified: true
        }
      });
    }

    // Google signup requires role selected
    if (!role) {
      return res.status(202).json({
        message: 'Google profile fetched. Please select a user role to complete registration.',
        email,
        name,
        googleId,
        avatar
      });
    }

    const salt = await bcrypt.genSalt(10);
    const mockPassword = await bcrypt.hash(googleId || 'google_auth_placeholder', salt);

    const userData = {
      name,
      email,
      password: mockPassword,
      phone: req.body.phone || 'N/A',
      role,
      avatar: avatar || '',
      isVerified: role === 'donor' || role === 'admin' ? false : true,
      isEmailVerified: true
    };

    if (mockDb.isMockActive()) {
      user = await mockDb.create('users', userData);
    } else {
      user = await User.create(userData);
    }

    if (role === 'ngo' && ngoDetails) {
      const { regNo, address, lat, lng, contactPerson } = ngoDetails;
      if (mockDb.isMockActive()) {
        await mockDb.create('ngos', {
          user: user._id,
          regNo,
          address,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
          contactPerson,
          status: 'pending'
        });
      } else {
        await NGO.create({
          user: user._id,
          regNo,
          address,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
          contactPerson,
          status: 'pending'
        });
      }
    } else if (role === 'volunteer' && volunteerDetails) {
      const { vehicleType } = volunteerDetails;
      if (mockDb.isMockActive()) {
        await mockDb.create('volunteers', {
          user: user._id,
          vehicleType,
          isAvailable: true,
          status: 'approved'
        });
      } else {
        await Volunteer.create({
          user: user._id,
          vehicleType,
          isAvailable: true,
          status: 'approved'
        });
      }
    }

    const accessToken = generateAccessToken(user._id);
    const refresh = generateRefreshToken(user._id);

    if (mockDb.isMockActive()) {
      await mockDb.findByIdAndUpdate('users', user._id, { refreshToken: refresh });
    } else {
      user.refreshToken = refresh;
      await user.save();
    }

    await logAction(user._id, user.email, 'GOOGLE_REGISTER', `Registered via Google as role: ${role}`, req);

    res.status(201).json({

      token: accessToken,
      refreshToken: refresh,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        isEmailVerified: true
      }
    });
  } catch (error) {
    console.error("Google signin error:", error);
    res.status(500).json({ message: 'Google login server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    let user;
    if (mockDb.isMockActive()) {
      user = await mockDb.findOne('users', { email });
    } else {
      user = await User.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecret_foodbridge_jwt_key_12345', {
      expiresIn: '1h'
    });

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    const resetMail = templates.resetPassword(resetLink);
    await sendEmail({ to: email, subject: resetMail.subject, html: resetMail.html });

    await logAction(user._id, email, 'FORGOT_PASSWORD_REQUEST', `Requested password reset link`, req);

    res.json({ message: 'Password reset link sent to your registered email.' });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_foodbridge_jwt_key_12345');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (mockDb.isMockActive()) {
      const user = await mockDb.findById('users', decoded.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      await mockDb.findByIdAndUpdate('users', decoded.id, { password: hashedPassword });
    } else {
      const user = await User.findById(decoded.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      user.password = hashedPassword;
      await user.save();
    }

    await logAction(decoded.id, null, 'PASSWORD_RESET', `Password successfully updated`, req);

    res.json({ message: 'Password successfully updated. Please log in.' });

  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired reset token' });
  }
};

exports.getMe = async (req, res) => {
  try {
    let profile = null;
    if (req.user.role === 'ngo') {
      if (mockDb.isMockActive()) {
        profile = await mockDb.findOne('ngos', { user: req.user._id });
      } else {
        profile = await NGO.findOne({ user: req.user._id });
      }
    } else if (req.user.role === 'volunteer') {
      if (mockDb.isMockActive()) {
        profile = await mockDb.findOne('volunteers', { user: req.user._id });
      } else {
        profile = await Volunteer.findOne({ user: req.user._id });
      }
    }
    res.json({ user: req.user, profile });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user details' });
  }
};
