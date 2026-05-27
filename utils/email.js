const nodemailer = require('nodemailer');

// ─── Create Transporter ───────────────────────────────────────────────────────
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const FROM = process.env.EMAIL_FROM || 'No.1 Vettri Academy <contactus@no1vettriacademy.com>';

// ─── Generic Send ─────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, text }) => {
  // Email system temporarily disabled by user request
  console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
  return;
};

// ─── Welcome Email ────────────────────────────────────────────────────────────
const sendWelcomeEmail = async (user) => {
  if (!user.email) return;
  await sendMail({
    to: user.email,
    subject: '🎓 Welcome to No.1 Vettri Academy!',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px;">
        <h1 style="color:#F5A623;margin-bottom:8px;">No.1 Vettri Academy</h1>
        <h2>Welcome, ${user.name}! 🎉</h2>
        <p>Your account has been created successfully.</p>
        <p>Role: <strong>${user.role}</strong></p>
        <p>Login using your mobile number: <strong>${user.mobile}</strong></p>
        <hr style="border-color:#ffffff20;margin:24px 0;">
        <p style="color:#ffffff80;font-size:13px;">Tamil Nadu, India | +91 9047758389</p>
      </div>
    `,
  });
};

// ─── Fee Reminder ─────────────────────────────────────────────────────────────
const sendFeeReminder = async (student, feeRecord) => {
  if (!student.email) return;
  await sendMail({
    to: student.email,
    subject: '📢 Fee Payment Reminder — No.1 Vettri Academy',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px;">
        <h1 style="color:#F5A623;">No.1 Vettri Academy</h1>
        <h2>Fee Payment Reminder</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>Your fee payment of <strong>₹${feeRecord.amount}</strong> for <strong>${feeRecord.month}</strong> is ${feeRecord.status}.</p>
        <p>Due Date: <strong>${new Date(feeRecord.dueDate).toLocaleDateString('en-IN')}</strong></p>
        <p>Please contact admin to clear your dues.</p>
        <hr style="border-color:#ffffff20;margin:24px 0;">
        <p style="color:#ffffff80;font-size:13px;">Tamil Nadu, India | +91 9047758389</p>
      </div>
    `,
  });
};

// ─── Leave Status Email ───────────────────────────────────────────────────────
const sendLeaveStatusEmail = async (user, leave) => {
  if (!user.email) return;
  const approved = leave.status === 'approved';
  await sendMail({
    to: user.email,
    subject: `Leave Application ${approved ? 'Approved ✅' : 'Rejected ❌'} — No.1 Vettri Academy`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px;">
        <h1 style="color:#F5A623;">No.1 Vettri Academy</h1>
        <h2>Leave Application ${approved ? 'Approved' : 'Rejected'}</h2>
        <p>Dear <strong>${user.name}</strong>,</p>
        <p>Your leave application from <strong>${new Date(leave.fromDate).toLocaleDateString('en-IN')}</strong> to <strong>${new Date(leave.toDate).toLocaleDateString('en-IN')}</strong> has been <strong style="color:${approved ? '#22c55e' : '#ef4444'}">${leave.status}</strong>.</p>
        ${leave.adminComment ? `<p>Admin Comment: <em>${leave.adminComment}</em></p>` : ''}
        <hr style="border-color:#ffffff20;margin:24px 0;">
        <p style="color:#ffffff80;font-size:13px;">Tamil Nadu, India | +91 9047758389</p>
      </div>
    `,
  });
};

// ─── Demo Booking Confirmation ────────────────────────────────────────────────
const sendDemoConfirmation = async (booking) => {
  if (!booking.email) return;
  await sendMail({
    to: booking.email,
    subject: '✅ Demo Class Confirmed — No.1 Vettri Academy',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px;">
        <h1 style="color:#F5A623;">No.1 Vettri Academy</h1>
        <h2>Your Demo Class is Confirmed! 🎉</h2>
        <p>Dear <strong>${booking.name}</strong>,</p>
        <p>Your free demo class has been confirmed.</p>
        ${booking.demoLink ? `<p>Join Link: <a href="${booking.demoLink}" style="color:#F5A623;">${booking.demoLink}</a></p>` : ''}
        <p>Date: <strong>${booking.preferredDate ? new Date(booking.preferredDate).toLocaleDateString('en-IN') : 'TBD'}</strong></p>
        <p>Time: <strong>${booking.preferredTime || 'TBD'}</strong></p>
        <hr style="border-color:#ffffff20;margin:24px 0;">
        <p style="color:#ffffff80;font-size:13px;">Tamil Nadu, India | +91 9047758389</p>
      </div>
    `,
  });
};

// ─── Absent Alert ─────────────────────────────────────────────────────────────
const sendAbsentAlert = async (student, className) => {
  if (!student.email) return;
  await sendMail({
    to: student.email,
    subject: '⚠️ Class Absence Notice — No.1 Vettri Academy',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0A1628;color:#fff;padding:32px;border-radius:12px;">
        <h1 style="color:#F5A623;">No.1 Vettri Academy</h1>
        <h2>Absence Recorded</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>You were marked absent for the class: <strong>${className}</strong>.</p>
        <p>Please ensure regular attendance. If you have any concerns, contact your teacher or admin.</p>
        <hr style="border-color:#ffffff20;margin:24px 0;">
        <p style="color:#ffffff80;font-size:13px;">Tamil Nadu, India | +91 9047758389</p>
      </div>
    `,
  });
};

module.exports = {
  sendWelcomeEmail,
  sendFeeReminder,
  sendLeaveStatusEmail,
  sendDemoConfirmation,
  sendAbsentAlert,
  sendMail,
};
