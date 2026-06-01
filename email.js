const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || '587');
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const fromName = process.env.SMTP_FROM_NAME || 'RemindPro';
const fromEmail = process.env.SMTP_FROM_EMAIL || user;

let transporter = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
} else {
  console.warn('WARNING: SMTP not configured. Emails will be logged to console only.');
}

async function sendEmail(to, subject, text) {
  if (!transporter) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject} | Body: ${text.substring(0, 80)}...`);
    return { success: true };
  }
  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text
    });
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail };
