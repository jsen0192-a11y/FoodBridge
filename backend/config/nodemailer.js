const sendEmail = async ({ to, subject, text, html }) => {
  console.log(`\n==================================================`);
  console.log(`📨 EMAIL SENDING BYPASSED (DISABLED GLOBALLY)`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`==================================================\n`);
  return { disabled: true };
};

const templates = {
  welcome: () => ({ subject: '', html: '' }),
  otp: () => ({ subject: '', html: '' }),
  resetPassword: () => ({ subject: '', html: '' }),
  donationAccepted: () => ({ subject: '', html: '' })
};

module.exports = { sendEmail, templates };
