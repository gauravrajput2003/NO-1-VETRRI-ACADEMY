const { sendNotification } = require('./notificationService');

// Notification failures must not turn an already saved payment into an API error.
async function notifyFeeRecord({ fee, req, action = 'updated' }) {
  try {
    const studentId = fee.student?._id || fee.student;
    if (!studentId) return;
    const type = { paid: 'fee_paid', partial: 'fee_partial', overdue: 'fee_overdue' }[fee.status] || 'fee_reminder';
    await sendNotification({
      recipientId: studentId, senderId: req.user?._id, type,
      title: action === 'created' ? 'Fee Record Added' : 'Fee Status Updated',
      message: `Your fee record for ${fee.month} ${fee.year}: ₹${fee.amount}, status ${fee.status}.`,
      link: '/student/fees', referenceId: fee._id, referenceType: 'FeesRecord',
      data: { feeId: String(fee._id), status: fee.status, action }, io: req.app.get('io'),
    });
  } catch (error) { console.error('[Fee Notification] Failed:', error.name); }
}

async function notifySalaryRecord({ transaction, req, action }) {
  try {
    const teacherId = transaction.teacherId?._id || transaction.teacherId;
    if (!teacherId) return;
    const titles = { processed: 'Salary Processed', updated: 'Salary Payment Updated', removed: 'Salary Payment Record Removed' };
    await sendNotification({
      recipientId: teacherId, senderId: req.user?._id,
      // Retain the existing app's salary route for all payment-record changes.
      type: 'salary_paid', title: titles[action],
      message: `Your salary record for ${transaction.monthYear} was ${action}. Recorded paid total: ₹${transaction.paidAmount} of ₹${transaction.netSalary}.`,
      link: '/teacher/salary', referenceId: transaction._id, referenceType: 'SalaryTransaction',
      data: { monthYear: transaction.monthYear, salaryTransactionId: String(transaction._id), action }, io: req.app.get('io'),
    });
  } catch (error) { console.error('[Salary Notification] Failed:', error.name); }
}

module.exports = { notifyFeeRecord, notifySalaryRecord };
