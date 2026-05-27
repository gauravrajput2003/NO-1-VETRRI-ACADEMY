const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Notification = require('../models/Notification');
const SalaryTransaction = require('../models/SalaryTransaction');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getMonthContext = (month, year) => {
  const now = new Date();
  const monthNumber = month ? MONTH_NAMES.findIndex((name) => name.toLowerCase() === String(month).toLowerCase()) + 1 : now.getMonth() + 1;
  const normalizedMonth = monthNumber > 0 ? monthNumber : now.getMonth() + 1;
  const normalizedYear = Number(year) || now.getFullYear();
  const monthName = MONTH_NAMES[normalizedMonth - 1];
  return {
    month: monthName,
    year: normalizedYear,
    monthNumber: normalizedMonth,
    monthYear: `${monthName} ${normalizedYear}`,
  };
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildSalaryBreakdown = (teacher, overrides = {}) => {
  const config = teacher.salary || {};
  const attendanceDeduction = overrides.attendanceDeduction ?? config.attendanceDeduction ?? false;
  const daysInMonth = toNumber(overrides.daysInMonth ?? config.daysInMonth, 26);
  const daysPresent = toNumber(overrides.daysPresent ?? config.daysPresent, daysInMonth);
  const deductionPerDay = toNumber(overrides.deductionPerDay ?? config.deductionPerDay, 0);
  const absenceCount = Math.max(daysInMonth - daysPresent, 0);
  const attendanceDeductionAmount = attendanceDeduction ? absenceCount * deductionPerDay : 0;

  const baseSalary = toNumber(overrides.baseSalary ?? config.baseSalary);
  const performanceBonus = toNumber(overrides.performanceBonus ?? config.performanceBonus);
  const specialAllowance = toNumber(overrides.specialAllowance ?? config.specialAllowance);
  const providentFund = toNumber(overrides.providentFund ?? config.providentFund);
  const taxDeduction = toNumber(overrides.taxDeduction ?? config.taxDeduction);
  const otherDeductions = toNumber(overrides.otherDeductions ?? config.otherDeductions);

  const grossSalary = baseSalary + performanceBonus + specialAllowance;
  const totalDeductions = providentFund + taxDeduction + otherDeductions + attendanceDeductionAmount;
  const netSalary = Math.max(grossSalary - totalDeductions, 0);

  return {
    baseSalary,
    performanceBonus,
    specialAllowance,
    grossSalary,
    providentFund,
    taxDeduction,
    otherDeductions,
    attendanceDeductionAmount,
    totalDeductions,
    netSalary,
    daysInMonth,
    daysPresent,
    absenceCount,
    deductionPerDay,
    attendanceDeduction,
  };
};

const upsertTeacherSalaryHistory = async (teacher, record) => {
  const salaryHistory = Array.isArray(teacher.salaryHistory) ? teacher.salaryHistory : [];
  const idx = salaryHistory.findIndex((entry) => entry.monthYear === record.monthYear);
  const payload = {
    month: record.month,
    year: record.year,
    monthYear: record.monthYear,
    baseSalary: record.baseSalary,
    performanceBonus: record.performanceBonus,
    specialAllowance: record.specialAllowance,
    grossSalary: record.grossSalary,
    providentFund: record.providentFund,
    taxDeduction: record.taxDeduction,
    otherDeductions: record.otherDeductions,
    totalDeductions: record.totalDeductions,
    netSalary: record.netSalary,
    paymentStatus: record.paymentStatus,
    paidDate: record.paidDate || null,
    paidAmount: record.paidAmount || 0,
    paymentMethod: record.paymentMethod || '',
    transactionId: record.transactionId || '',
    recordedBy: record.processedBy || null,
    recordedAt: record.processedAt || new Date(),
    notes: record.notes || '',
    salarySlipGenerated: Boolean(record.salarySlipGenerated),
    salarySlipUrl: record.salarySlipUrl || '',
    processedAt: record.processedAt || new Date(),
    remarks: record.remarks || '',
  };

  if (idx >= 0) {
    const existing = typeof salaryHistory[idx]?.toObject === 'function' ? salaryHistory[idx].toObject() : salaryHistory[idx];
    salaryHistory[idx] = { ...existing, ...payload };
  } else {
    salaryHistory.unshift(payload);
  }

  teacher.salaryHistory = salaryHistory;
  await teacher.save();
};

const createSlipUrl = (teacherId, monthYear) => `/api/teacher/salary/${teacherId}/${encodeURIComponent(monthYear)}/slip`;

const setTeacherSalaryConfig = async (req, res) => {
  try {
    const teacher = await User.findOneAndUpdate(
      { _id: req.params.teacherId, role: 'teacher' },
      {
        salary: {
          baseSalary: toNumber(req.body.baseSalary),
          performanceBonus: toNumber(req.body.performanceBonus),
          specialAllowance: toNumber(req.body.specialAllowance),
          providentFund: toNumber(req.body.providentFund),
          taxDeduction: toNumber(req.body.taxDeduction),
          otherDeductions: toNumber(req.body.otherDeductions),
          bankAccount: req.body.bankAccount || '',
          bankName: req.body.bankName || '',
          ifscCode: req.body.ifscCode || '',
          accountHolder: req.body.accountHolder || '',
          paymentMode: req.body.paymentMode || 'bank_transfer',
          attendanceDeduction: Boolean(req.body.attendanceDeduction),
          daysInMonth: toNumber(req.body.daysInMonth, 26),
          daysPresent: toNumber(req.body.daysPresent, 26),
          deductionPerDay: toNumber(req.body.deductionPerDay),
          paidLeaveBalance: toNumber(req.body.paidLeaveBalance, 12),
          casualLeaveBalance: toNumber(req.body.casualLeaveBalance, 5),
          medicalLeaveBalance: toNumber(req.body.medicalLeaveBalance, 10),
        },
      },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    res.status(200).json({ success: true, message: 'Salary configuration updated', teacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminSalaryDashboard = async (req, res) => {
  try {
    const { month, year } = req.query;
    const context = getMonthContext(month, year);
    const teachers = await User.find({ role: 'teacher', isActive: true })
      .select('-password -refreshToken')
      .sort({ name: 1 });

    const transactions = await SalaryTransaction.find({ monthYear: context.monthYear });
    const txMap = new Map(transactions.map((tx) => [tx.teacherId.toString(), tx]));

    const rows = teachers.map((teacher) => {
      const breakdown = buildSalaryBreakdown(teacher);
      const tx = txMap.get(teacher._id.toString());
      return {
        _id: tx?._id || teacher._id,
        teacherId: teacher._id,
        teacherName: teacher.displayName || teacher.name,
        teacherEmail: teacher.email || '',
        teacherMobile: teacher.mobile || '',
        month: context.month,
        year: context.year,
        monthYear: context.monthYear,
        ...breakdown,
        paymentStatus: tx?.paymentStatus || 'pending',
        paidDate: tx?.paidDate || null,
        paidAmount: tx?.paidAmount || 0,
        paymentMethod: tx?.paymentMethod || teacher.salary?.paymentMode || 'bank_transfer',
        transactionId: tx?.transactionId || '',
        processedByName: tx?.processedByName || '',
        processedAt: tx?.processedAt || null,
        salarySlipGenerated: Boolean(tx?.salarySlipGenerated),
        salarySlipUrl: tx?.salarySlipUrl || createSlipUrl(teacher._id, context.monthYear),
      };
    });

    const summary = rows.reduce((acc, row) => {
      acc.totalPayroll += row.netSalary;
      if (row.paymentStatus === 'paid') {
        acc.alreadyPaid += row.paidAmount || row.netSalary;
        acc.paidCount += 1;
      } else {
        acc.pending += row.netSalary;
        acc.pendingCount += 1;
      }
      acc.totalTeachers += 1;
      return acc;
    }, { totalPayroll: 0, alreadyPaid: 0, pending: 0, paidCount: 0, pendingCount: 0, totalTeachers: 0 });

    res.status(200).json({ success: true, month: context.month, year: context.year, monthYear: context.monthYear, teachers: rows, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const processSalary = async (req, res) => {
  try {
    const { teacherId, month, year, paymentDate, transactionId, notes, paymentMethod, processedByName } = req.body;
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const context = getMonthContext(month, year);
    const breakdown = buildSalaryBreakdown(teacher, req.body);
    const paidDate = paymentDate ? new Date(paymentDate) : new Date();
    const slipUrl = createSlipUrl(teacher._id, context.monthYear);

    let transaction = await SalaryTransaction.findOne({ teacherId: teacher._id, monthYear: context.monthYear });
    if (!transaction) {
      transaction = new SalaryTransaction({ teacherId: teacher._id, teacherName: teacher.displayName || teacher.name, teacherEmail: teacher.email || '', month: context.month, year: context.year, monthYear: context.monthYear });
    }

    transaction.teacherName = teacher.displayName || teacher.name;
    transaction.teacherEmail = teacher.email || '';
    transaction.baseSalary = breakdown.baseSalary;
    transaction.performanceBonus = breakdown.performanceBonus;
    transaction.specialAllowance = breakdown.specialAllowance;
    transaction.grossSalary = breakdown.grossSalary;
    transaction.providentFund = breakdown.providentFund;
    transaction.taxDeduction = breakdown.taxDeduction;
    transaction.otherDeductions = breakdown.otherDeductions;
    transaction.totalDeductions = breakdown.totalDeductions;
    transaction.netSalary = breakdown.netSalary;
    transaction.paymentStatus = req.body.paymentStatus || 'paid';
    transaction.paidDate = paidDate;
    transaction.paidAmount = breakdown.netSalary;
    transaction.paymentMethod = paymentMethod || teacher.salary?.paymentMode || 'bank_transfer';
    transaction.transactionId = transactionId || transaction.transactionId || '';
    transaction.processedBy = req.user?._id || null;
    transaction.processedByName = req.user?.name || req.user?.displayName || processedByName || '';
    transaction.processedAt = new Date();
    transaction.salarySlipGenerated = true;
    transaction.salarySlipUrl = slipUrl;
    transaction.notes = notes || transaction.notes || '';
    transaction.remarks = req.body.remarks || transaction.remarks || '';
    await transaction.save();

    await upsertTeacherSalaryHistory(teacher, {
      ...transaction.toObject(),
      salarySlipUrl: slipUrl,
    });

    const io = req.app.get('io');
    const notification = await Notification.create({
      recipient: teacher._id,
      sender: req.user?._id,
      type: 'salary_paid',
      title: 'Salary Processed',
      message: `Your salary for ${context.monthYear} has been processed and credited. Net salary: ₹${breakdown.netSalary}.`,
      link: '/teacher/salary',
      data: {
        monthYear: context.monthYear,
        netSalary: breakdown.netSalary,
        salaryTransactionId: transaction._id,
      },
    });

    io?.to(`user:${teacher._id}`).emit('notification:new', notification);
    io?.to(`user:${teacher._id}`).emit('salary:processed', { salaryTransactionId: transaction._id, monthYear: context.monthYear, netSalary: breakdown.netSalary });

    res.status(201).json({ success: true, message: 'Salary processed', transaction, salarySlipUrl: slipUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const processAllSalaries = async (req, res) => {
  try {
    const { month, year } = req.body;
    const context = getMonthContext(month, year);
    const teachers = await User.find({ role: 'teacher', isActive: true });
    let processed = 0;
    let failed = 0;

    for (const teacher of teachers) {
      try {
        const existing = await SalaryTransaction.findOne({ teacherId: teacher._id, monthYear: context.monthYear });
        if (existing?.paymentStatus === 'paid') continue;

        const breakdown = buildSalaryBreakdown(teacher, req.body);
        const slipUrl = createSlipUrl(teacher._id, context.monthYear);
        const transaction = existing || new SalaryTransaction({ teacherId: teacher._id, teacherName: teacher.displayName || teacher.name, teacherEmail: teacher.email || '', month: context.month, year: context.year, monthYear: context.monthYear });

        transaction.teacherName = teacher.displayName || teacher.name;
        transaction.teacherEmail = teacher.email || '';
        transaction.baseSalary = breakdown.baseSalary;
        transaction.performanceBonus = breakdown.performanceBonus;
        transaction.specialAllowance = breakdown.specialAllowance;
        transaction.grossSalary = breakdown.grossSalary;
        transaction.providentFund = breakdown.providentFund;
        transaction.taxDeduction = breakdown.taxDeduction;
        transaction.otherDeductions = breakdown.otherDeductions;
        transaction.totalDeductions = breakdown.totalDeductions;
        transaction.netSalary = breakdown.netSalary;
        transaction.paymentStatus = 'paid';
        transaction.paidDate = new Date();
        transaction.paidAmount = breakdown.netSalary;
        transaction.paymentMethod = teacher.salary?.paymentMode || 'bank_transfer';
        transaction.processedBy = req.user?._id || null;
        transaction.processedByName = req.user?.name || req.user?.displayName || '';
        transaction.processedAt = new Date();
        transaction.salarySlipGenerated = true;
        transaction.salarySlipUrl = slipUrl;
        transaction.notes = 'Bulk salary processing';
        await transaction.save();
        await upsertTeacherSalaryHistory(teacher, { ...transaction.toObject(), salarySlipUrl: slipUrl });

        processed += 1;
      } catch (innerError) {
        failed += 1;
      }
    }

    res.status(200).json({ success: true, processed, failed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSalaryReports = async (req, res) => {
  try {
    const { period = 'monthly', fromDate, toDate } = req.query;
    const query = {};
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    const transactions = await SalaryTransaction.find(query).sort({ createdAt: -1 });
    const summary = transactions.reduce((acc, tx) => {
      acc.totalPayroll += tx.netSalary || 0;
      acc.totalPaid += tx.paidAmount || 0;
      acc.count += 1;
      acc.paymentStatus[tx.paymentStatus] = (acc.paymentStatus[tx.paymentStatus] || 0) + 1;
      return acc;
    }, { totalPayroll: 0, totalPaid: 0, count: 0, paymentStatus: {} });

    const distribution = transactions.reduce((acc, tx) => {
      const salary = tx.netSalary || 0;
      if (salary < 20000) acc['<20K'] += 1;
      else if (salary < 25000) acc['20K-25K'] += 1;
      else if (salary < 30000) acc['25K-30K'] += 1;
      else acc['30K+'] += 1;
      return acc;
    }, { '<20K': 0, '20K-25K': 0, '25K-30K': 0, '30K+': 0 });

    res.status(200).json({ success: true, period, reports: { ...summary, distribution, transactions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTeacherCurrentMonthSalary = async (req, res) => {
  try {
    const teacher = await User.findById(req.user._id).select('-password -refreshToken');
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const context = getMonthContext(req.query.month, req.query.year);
    let transaction = await SalaryTransaction.findOne({ teacherId: teacher._id, monthYear: context.monthYear });
    if (!transaction) {
      const breakdown = buildSalaryBreakdown(teacher);
      transaction = new SalaryTransaction({
        teacherId: teacher._id,
        teacherName: teacher.displayName || teacher.name,
        teacherEmail: teacher.email || '',
        month: context.month,
        year: context.year,
        monthYear: context.monthYear,
        ...breakdown,
        paymentStatus: 'pending',
        paymentMethod: teacher.salary?.paymentMode || 'bank_transfer',
        salarySlipGenerated: false,
        salarySlipUrl: createSlipUrl(teacher._id, context.monthYear),
      });
    }

    res.status(200).json({ success: true, salary: transaction, salaryConfig: teacher.salary || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTeacherSalaryHistory = async (req, res) => {
  try {
    const teacher = await User.findById(req.user._id).select('-password -refreshToken');
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const history = Array.isArray(teacher.salaryHistory) ? teacher.salaryHistory.slice(0, 12) : [];
    res.status(200).json({ success: true, salaryHistory: history, salaryConfig: teacher.salary || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const downloadSalarySlip = async (req, res) => {
  try {
    const { monthYear } = req.params;
    const teacherId = req.params.teacherId || req.user._id;
    const teacher = await User.findById(teacherId).select('-password -refreshToken');
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const transaction = await SalaryTransaction.findOne({ teacherId: teacher._id, monthYear });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Salary record not found.' });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="salary-slip-${monthYear.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text('NO.1 VETTRI ACADEMY', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(16).text('SALARY SLIP', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`For Month: ${transaction.monthYear}`);
    doc.text(`Teacher Name: ${transaction.teacherName}`);
    doc.text(`Teacher Email: ${transaction.teacherEmail || '-'}`);
    doc.text(`Designation: Teacher`);
    doc.moveDown();

    doc.fontSize(13).text('Earnings', { underline: true });
    doc.fontSize(11).text(`Base Salary: ₹${transaction.baseSalary || 0}`);
    doc.text(`Performance Bonus: ₹${transaction.performanceBonus || 0}`);
    doc.text(`Special Allowance: ₹${transaction.specialAllowance || 0}`);
    doc.text(`Gross Salary: ₹${transaction.grossSalary || 0}`);
    doc.moveDown();

    doc.fontSize(13).text('Deductions', { underline: true });
    doc.fontSize(11).text(`Provident Fund: ₹${transaction.providentFund || 0}`);
    doc.text(`Tax Deduction: ₹${transaction.taxDeduction || 0}`);
    doc.text(`Other Deductions: ₹${transaction.otherDeductions || 0}`);
    doc.text(`Total Deductions: ₹${transaction.totalDeductions || 0}`);
    doc.moveDown();

    doc.fontSize(14).text(`Net Salary: ₹${transaction.netSalary || 0}`, { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(`Payment Status: ${transaction.paymentStatus || 'pending'}`);
    doc.text(`Payment Method: ${transaction.paymentMethod || '-'}`);
    doc.text(`Paid Date: ${transaction.paidDate ? new Date(transaction.paidDate).toLocaleDateString('en-IN') : '-'}`);
    doc.text(`Transaction ID: ${transaction.transactionId || '-'}`);
    doc.text(`Processed By: ${transaction.processedByName || '-'}`);
    doc.text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`);

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  setTeacherSalaryConfig,
  getAdminSalaryDashboard,
  processSalary,
  processAllSalaries,
  getSalaryReports,
  getTeacherCurrentMonthSalary,
  getTeacherSalaryHistory,
  downloadSalarySlip,
};