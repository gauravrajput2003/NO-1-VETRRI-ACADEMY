const FROM = process.env.EMAIL_FROM || 'No.1 Vettri Academy <contactus@no1vettriacademy.com>';

// ─── Generic Send ─────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, text }) => {
  // Email system temporarily disabled by user request
  console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
  return;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Enquiry notifications use HTTPS, which works on Render's Free web services.
const sendEnquiryEmail = async (enquiry) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const submittedAt = new Date(enquiry.createdAt || Date.now()).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
  }) + ' IST';
  const fields = [
    ['Student name', enquiry.name],
    ['Phone', enquiry.phone],
    ['Email', enquiry.email],
    ['Grade', enquiry.grade],
    ['Course interested in', enquiry.course],
    ['Message', enquiry.message],
    ['Submitted', submittedAt],
  ];
  const display = (value) => String(value ?? '').trim() || '—';
  const rows = fields.map(([label, value], index) => `
    <tr style="background:${index % 2 ? '#f7faf9' : '#ffffff'};">
      <th scope="row" style="padding:13px 16px;text-align:left;vertical-align:top;width:38%;font-size:13px;color:#516b69;border-bottom:1px solid #e6eeeb;">${escapeHtml(label)}</th>
      <td style="padding:13px 16px;vertical-align:top;font-size:14px;font-weight:600;color:#123735;border-bottom:1px solid #e6eeeb;word-break:break-word;">${escapeHtml(display(value)).replace(/\r?\n/g, '<br>')}</td>
    </tr>`).join('');

  const mail = {
    from: `No.1 Vettri Academy <${process.env.RESEND_FROM_EMAIL || 'notifications@no1vettriacademy.com'}>`,
    to: ['vettrieducationalinstitutions@gmail.com'],
    subject: 'New website enquiry — No.1 Vettri Academy',
    text: fields.map(([label, value]) => `${label}: ${display(value)}`).join('\n'),
    html: `<div style="margin:0;padding:28px 12px;background:#edf5f2;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:auto;overflow:hidden;border-radius:16px;background:#ffffff;border:1px solid #dbe8e3;">
        <div style="padding:24px 28px;background:#103b3a;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e7b85b;">No.1 Vettri Academy</div>
          <h1 style="margin:8px 0 0;font-size:23px;line-height:1.3;">New website enquiry</h1>
        </div>
        <div style="padding:24px 20px;">
          <p style="margin:0 8px 18px;color:#516b69;font-size:14px;">A student has submitted the enquiry form. Their details are below.</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed;">${rows}</table>
        </div>
      </div>
    </div>`,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mail),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Resend API error ${response.status}: ${detail}`);
  }
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
  sendEnquiryEmail,
};
