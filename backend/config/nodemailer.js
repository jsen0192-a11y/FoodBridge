const nodemailer = require('nodemailer');

const isConfigured = 
  process.env.SMTP_HOST && 
  process.env.SMTP_PORT && 
  process.env.SMTP_USER && 
  process.env.SMTP_PASS;

let transporter = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log("📨 Nodemailer SMTP transport active");
} else {
  console.log("⚠️ SMTP mail settings not configured. Mail outputs printed to console.");
}

const sendEmail = async ({ to, subject, text, html }) => {
  if (isConfigured && transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"FoodBridge Foundation" <no-reply@foodbridge.org>',
        to,
        subject,
        text,
        html
      });
      console.log(`✉️ Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ SMTP send fail: ${error.message}`);
    }
  }

  // Fallback Console Logger
  console.log(`\n==================================================`);
  console.log(`📨 MOCK EMAIL DELIVERED`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text:    ${text || 'N/A'}`);
  console.log(`---------------- HTML Content --------------------`);
  // Strip tags briefly for cleaner console output
  console.log(html ? html.replace(/<[^>]*>/g, ' ').substring(0, 300) + '...' : 'N/A');
  console.log(`==================================================\n`);
  return { mockSent: true };
};

// HTML Email template generators
const templates = {
  welcome(name) {
    return {
      subject: "Welcome to FoodBridge! 🥗",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #10B981; text-align: center;">Welcome to FoodBridge, ${name}!</h2>
          <p>Thank you for joining our mission to connect food surplus with distribution networks and reduce hunger.</p>
          <p>Please log in to your dashboard to complete your account setup and register your locations.</p>
          <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #64748b; text-align: center;">© 2026 FoodBridge Foundation. All rights reserved.</p>
        </div>
      `
    };
  },

  otp(code) {
    return {
      subject: "FoodBridge Account Verification OTP 🔐",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #10B981; text-align: center;">Verify Your Account</h2>
          <p>Please use the following 6-digit One-Time Password (OTP) to finalize your login registration:</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0f172a; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #ef4444; font-size: 12px; text-align: center;">This code is valid for 15 minutes only.</p>
          <hr style="border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
          <p style="font-size: 12px; color: #64748b; text-align: center;">© 2026 FoodBridge Foundation. All rights reserved.</p>
        </div>
      `
    };
  },

  resetPassword(link) {
    return {
      subject: "FoodBridge Password Reset Request 🔑",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #10B981; text-align: center;">Reset Your Password</h2>
          <p>We received a request to reset your password. Click the button below to establish new credentials:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${link}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 12px; color: #64748b;">If the button doesn't work, copy-paste this link: <br/> ${link}</p>
          <p style="color: #64748b; font-size: 11px;">If you did not request a password change, you can ignore this mail safely.</p>
        </div>
      `
    };
  },

  donationAccepted(foodName, ngoName) {
    return {
      subject: `Donation Accepted: ${foodName} ✔`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h3 style="color: #10B981;">Good News! Your donation was claimed.</h3>
          <p>Your listing of <b>"${foodName}"</b> has been accepted by NGO: <b>${ngoName}</b>.</p>
          <p>A volunteer will be dispatched shortly to pick up the food from your location.</p>
        </div>
      `
    };
  }
};

module.exports = { sendEmail, templates };
