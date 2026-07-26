const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Notification = require('../models/Notification');
const SalaryTransaction = require('../models/SalaryTransaction');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Printable component definitions — used for "select which components to include" on slips/reports
const EARNING_FIELDS = [
  { key: 'baseSalary', label: 'Base Salary' },
  { key: 'groupTuitionSalary', label: 'Group Tuition Salary' },
  { key: 'individualTuitionSalary', label: 'Individual Tuition Salary' },
  { key: 'hourlyTuitionSalary', label: 'Hourly Tuition Salary' },
  { key: 'weeklyTuitionSalary', label: 'Weekly Tuition Salary' },
  { key: 'performanceBonus', label: 'Performance Bonus' },
  { key: 'specialAllowance', label: 'Special Allowance' },
];

const DEDUCTION_FIELDS = [
  { key: 'providentFund', label: 'Provident Fund' },
  { key: 'taxDeduction', label: 'Tax Deduction' },
  { key: 'otherDeductions', label: 'Other Deductions' },
  { key: 'attendanceDeductionAmount', label: 'Attendance Deduction' },
];

const parseComponents = (raw) => {
  if (!raw) return null; // null = include everything (backward compatible default)
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
};

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

  const groupTuitionSalary = toNumber(overrides.groupTuitionSalary ?? config.groupTuitionSalary);
  const individualTuitionSalary = toNumber(overrides.individualTuitionSalary ?? config.individualTuitionSalary);
  const hourlyTuitionSalary = toNumber(overrides.hourlyTuitionSalary ?? config.hourlyTuitionSalary);
  const weeklyTuitionSalary = toNumber(overrides.weeklyTuitionSalary ?? config.weeklyTuitionSalary);

  const baseSalary = toNumber(overrides.baseSalary ?? config.baseSalary);
  const performanceBonus = toNumber(overrides.performanceBonus ?? config.performanceBonus);
  const specialAllowance = toNumber(overrides.specialAllowance ?? config.specialAllowance);
  const providentFund = toNumber(overrides.providentFund ?? config.providentFund);
  const taxDeduction = toNumber(overrides.taxDeduction ?? config.taxDeduction);
  const otherDeductions = toNumber(overrides.otherDeductions ?? config.otherDeductions);

  const grossSalary = baseSalary + performanceBonus + specialAllowance
    + groupTuitionSalary + individualTuitionSalary + hourlyTuitionSalary + weeklyTuitionSalary;
  const totalDeductions = providentFund + taxDeduction + otherDeductions + attendanceDeductionAmount;
  const netSalary = Math.max(grossSalary - totalDeductions, 0);

  return {
    groupTuitionSalary,
    individualTuitionSalary,
    hourlyTuitionSalary,
    weeklyTuitionSalary,
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
    groupTuitionSalary: record.groupTuitionSalary || 0,
    individualTuitionSalary: record.individualTuitionSalary || 0,
    hourlyTuitionSalary: record.hourlyTuitionSalary || 0,
    weeklyTuitionSalary: record.weeklyTuitionSalary || 0,
    baseSalary: record.baseSalary,
    performanceBonus: record.performanceBonus,
    specialAllowance: record.specialAllowance,
    grossSalary: record.grossSalary,
    providentFund: record.providentFund,
    taxDeduction: record.taxDeduction,
    otherDeductions: record.otherDeductions,
    attendanceDeductionAmount: record.attendanceDeductionAmount || 0,
    totalDeductions: record.totalDeductions,
    netSalary: record.netSalary,
    paymentStatus: record.paymentStatus,
    paidDate: record.paidDate || null,
    paidAmount: record.paidAmount || 0,
    paymentMethod: record.paymentMethod || '',
    transactionId: record.transactionId || '',
    processingDate: record.processingDate || null,
    salaryDate: record.salaryDate || null,
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
          groupTuitionSalary: toNumber(req.body.groupTuitionSalary),
          individualTuitionSalary: toNumber(req.body.individualTuitionSalary),
          hourlyTuitionSalary: toNumber(req.body.hourlyTuitionSalary),
          weeklyTuitionSalary: toNumber(req.body.weeklyTuitionSalary),
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
          // Salary Configuration effective date — when this config was set / takes effect
          effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : null,
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
        payments: tx?.payments || [],
        processedByName: tx?.processedByName || '',
        processedAt: tx?.processedAt || null,
        processingDate: tx?.processingDate || null,
        salaryDate: tx?.salaryDate || null,
        effectiveDate: teacher.salary?.effectiveDate || null,
        salarySlipGenerated: Boolean(tx?.salarySlipGenerated),
        salarySlipUrl: tx?.salarySlipUrl || createSlipUrl(teacher._id, context.monthYear),
      };
    });

    const summary = rows.reduce((acc, row) => {
      acc.totalPayroll += row.netSalary;
      if (row.paymentStatus === 'paid') {
        acc.alreadyPaid += row.paidAmount || row.netSalary;
        acc.paidCount += 1;
      } else if (row.paymentStatus === 'partial') {
        acc.alreadyPaid += row.paidAmount;
        acc.pending += Math.max(row.netSalary - row.paidAmount, 0);
        acc.pendingCount += 1;
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
    const {
      teacherId, month, year, paymentDate, transactionId, notes, paymentMethod,
      processedByName, payingAmount, proofImage, remarks, processingDate, salaryDate,
    } = req.body;
    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found.' });
    }

    const context = getMonthContext(month, year);
    const breakdown = buildSalaryBreakdown(teacher, req.body);
    const paidDate = paymentDate ? new Date(paymentDate) : new Date();
    const procDate = processingDate ? new Date(processingDate) : new Date();
    const salDate = salaryDate ? new Date(salaryDate) : paidDate;
    const slipUrl = createSlipUrl(teacher._id, context.monthYear);

    let transaction = await SalaryTransaction.findOne({ teacherId: teacher._id, monthYear: context.monthYear });
    if (!transaction) {
      transaction = new SalaryTransaction({ teacherId: teacher._id, teacherName: teacher.displayName || teacher.name, teacherEmail: teacher.email || '', month: context.month, year: context.year, monthYear: context.monthYear });
    }

    transaction.teacherName = teacher.displayName || teacher.name;
    transaction.teacherEmail = teacher.email || '';
    transaction.groupTuitionSalary = breakdown.groupTuitionSalary;
    transaction.individualTuitionSalary = breakdown.individualTuitionSalary;
    transaction.hourlyTuitionSalary = breakdown.hourlyTuitionSalary;
    transaction.weeklyTuitionSalary = breakdown.weeklyTuitionSalary;
    transaction.baseSalary = breakdown.baseSalary;
    transaction.performanceBonus = breakdown.performanceBonus;
    transaction.specialAllowance = breakdown.specialAllowance;
    transaction.grossSalary = breakdown.grossSalary;
    transaction.providentFund = breakdown.providentFund;
    transaction.taxDeduction = breakdown.taxDeduction;
    transaction.otherDeductions = breakdown.otherDeductions;
    transaction.attendanceDeductionAmount = breakdown.attendanceDeductionAmount;
    transaction.totalDeductions = breakdown.totalDeductions;
    transaction.netSalary = breakdown.netSalary;
    transaction.processingDate = procDate;
    transaction.salaryDate = salDate;

    const newlyPaying = toNumber(payingAmount, breakdown.netSalary);

    if (newlyPaying > 0) {
      if (!Array.isArray(transaction.payments)) {
        transaction.payments = [];
      }
      transaction.payments.push({
        amount: newlyPaying,
        method: paymentMethod || 'Cash',
        transactionId: transactionId || '',
        proofImage: proofImage || '',
        remarks: remarks || '',
        paidAt: paidDate,
        processingDate: procDate,
        salaryDate: salDate,
      });
    }

    if (!Array.isArray(transaction.payments)) {
      transaction.payments = [];
    }
    const totalPaid = transaction.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    transaction.paidAmount = totalPaid;
    transaction.paidDate = paidDate;
    transaction.paymentMethod = paymentMethod || (transaction.payments.length > 0 ? transaction.payments[transaction.payments.length - 1].method : 'Cash');
    transaction.transactionId = transactionId || (transaction.payments.length > 0 ? transaction.payments[transaction.payments.length - 1].transactionId : '');

    if (totalPaid >= breakdown.netSalary) {
      transaction.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      transaction.paymentStatus = 'partial';
    } else {
      transaction.paymentStatus = 'pending';
    }

    transaction.processedBy = req.user?._id || null;
    transaction.processedByName = req.user?.name || req.user?.displayName || processedByName || '';
    transaction.processedAt = new Date();
    transaction.salarySlipGenerated = true;
    transaction.salarySlipUrl = slipUrl;
    transaction.notes = notes || transaction.notes || '';
    transaction.remarks = remarks || transaction.remarks || '';
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
      message: `Your salary payment for ${context.monthYear} of ₹${newlyPaying} has been processed. Total Paid: ₹${totalPaid}/${breakdown.netSalary}.`,
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
    const { month, year, salaryDate } = req.body;
    const context = getMonthContext(month, year);
    const teachers = await User.find({ role: 'teacher', isActive: true });
    let processed = 0;
    let failed = 0;
    const now = new Date();
    const salDate = salaryDate ? new Date(salaryDate) : now;

    for (const teacher of teachers) {
      try {
        const existing = await SalaryTransaction.findOne({ teacherId: teacher._id, monthYear: context.monthYear });
        if (existing?.paymentStatus === 'paid') continue;

        const breakdown = buildSalaryBreakdown(teacher, req.body);
        const slipUrl = createSlipUrl(teacher._id, context.monthYear);
        const transaction = existing || new SalaryTransaction({ teacherId: teacher._id, teacherName: teacher.displayName || teacher.name, teacherEmail: teacher.email || '', month: context.month, year: context.year, monthYear: context.monthYear });

        transaction.teacherName = teacher.displayName || teacher.name;
        transaction.teacherEmail = teacher.email || '';
        transaction.groupTuitionSalary = breakdown.groupTuitionSalary;
        transaction.individualTuitionSalary = breakdown.individualTuitionSalary;
        transaction.hourlyTuitionSalary = breakdown.hourlyTuitionSalary;
        transaction.weeklyTuitionSalary = breakdown.weeklyTuitionSalary;
        transaction.baseSalary = breakdown.baseSalary;
        transaction.performanceBonus = breakdown.performanceBonus;
        transaction.specialAllowance = breakdown.specialAllowance;
        transaction.grossSalary = breakdown.grossSalary;
        transaction.providentFund = breakdown.providentFund;
        transaction.taxDeduction = breakdown.taxDeduction;
        transaction.otherDeductions = breakdown.otherDeductions;
        transaction.attendanceDeductionAmount = breakdown.attendanceDeductionAmount;
        transaction.totalDeductions = breakdown.totalDeductions;
        transaction.netSalary = breakdown.netSalary;
        transaction.paymentStatus = 'paid';
        transaction.paidDate = now;
        transaction.paidAmount = breakdown.netSalary;
        transaction.paymentMethod = teacher.salary?.paymentMode || 'bank_transfer';
        transaction.processingDate = now;
        transaction.salaryDate = salDate;
        transaction.processedBy = req.user?._id || null;
        transaction.processedByName = req.user?.name || req.user?.displayName || '';
        transaction.processedAt = now;
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

    const selectedKeys = parseComponents(req.query.components);
    const earningsToShow = selectedKeys ? EARNING_FIELDS.filter((f) => selectedKeys.includes(f.key)) : EARNING_FIELDS;
    const deductionsToShow = selectedKeys ? DEDUCTION_FIELDS.filter((f) => selectedKeys.includes(f.key)) : DEDUCTION_FIELDS;

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
    doc.text(`Processing Date: ${transaction.processingDate ? new Date(transaction.processingDate).toLocaleDateString('en-IN') : '-'}`);
    doc.text(`Salary Date: ${transaction.salaryDate ? new Date(transaction.salaryDate).toLocaleDateString('en-IN') : '-'}`);
    doc.moveDown();

    if (earningsToShow.length) {
      doc.fontSize(13).text('Earnings', { underline: true });
      doc.fontSize(11);
      earningsToShow.forEach((f) => {
        doc.text(`${f.label}: ₹${transaction[f.key] || 0}`);
      });
      doc.text(`Gross Salary: ₹${transaction.grossSalary || 0}`);
      doc.moveDown();
    }

    if (deductionsToShow.length) {
      doc.fontSize(13).text('Deductions', { underline: true });
      doc.fontSize(11);
      deductionsToShow.forEach((f) => {
        doc.text(`${f.label}: ₹${transaction[f.key] || 0}`);
      });
      doc.text(`Total Deductions: ₹${transaction.totalDeductions || 0}`);
      doc.moveDown();
    }

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

const editSalaryPayment = async (req, res) => {
  try {
    const { transactionId, paymentId } = req.params;
    const { amount, method, transactionId: txnId, remarks, paidAt, processingDate, salaryDate } = req.body;

    const transaction = await SalaryTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Salary transaction not found.' });
    }

    const payment = transaction.payments.id(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (amount !== undefined) payment.amount = toNumber(amount, payment.amount);
    if (method !== undefined) payment.method = method;
    if (txnId !== undefined) payment.transactionId = txnId;
    if (remarks !== undefined) payment.remarks = remarks;
    if (paidAt) payment.paidAt = new Date(paidAt);
    if (processingDate) payment.processingDate = new Date(processingDate);
    if (salaryDate) payment.salaryDate = new Date(salaryDate);

    const totalPaid = transaction.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    transaction.paidAmount = totalPaid;

    if (transaction.payments.length) {
      const last = transaction.payments[transaction.payments.length - 1];
      transaction.paidDate = last.paidAt;
      transaction.paymentMethod = last.method;
      transaction.transactionId = last.transactionId;
      transaction.processingDate = last.processingDate;
      transaction.salaryDate = last.salaryDate;
    }

    if (totalPaid >= transaction.netSalary && totalPaid > 0) {
      transaction.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      transaction.paymentStatus = 'partial';
    } else {
      transaction.paymentStatus = 'pending';
    }

    await transaction.save();

    const teacher = await User.findById(transaction.teacherId);
    if (teacher) {
      await upsertTeacherSalaryHistory(teacher, { ...transaction.toObject(), salarySlipUrl: transaction.salarySlipUrl });
    }

    res.status(200).json({ success: true, message: 'Payment record updated', transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteSalaryPayment = async (req, res) => {
  try {
    const { transactionId, paymentId } = req.params;
    const transaction = await SalaryTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Salary transaction not found.' });
    }

    const payment = transaction.payments.id(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    transaction.payments.pull({ _id: paymentId });

    const totalPaid = transaction.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    transaction.paidAmount = totalPaid;

    if (transaction.payments.length) {
      const last = transaction.payments[transaction.payments.length - 1];
      transaction.paidDate = last.paidAt;
      transaction.paymentMethod = last.method;
      transaction.transactionId = last.transactionId;
      transaction.processingDate = last.processingDate;
      transaction.salaryDate = last.salaryDate;
    } else {
      transaction.paidDate = null;
      transaction.transactionId = '';
    }

    if (totalPaid >= transaction.netSalary && totalPaid > 0) {
      transaction.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      transaction.paymentStatus = 'partial';
    } else {
      transaction.paymentStatus = 'pending';
    }

    await transaction.save();

    const teacher = await User.findById(transaction.teacherId);
    if (teacher) {
      await upsertTeacherSalaryHistory(teacher, { ...transaction.toObject(), salarySlipUrl: transaction.salarySlipUrl });
    }

    res.status(200).json({ success: true, message: 'Payment record removed', transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const downloadAllSalariesReport = async (req, res) => {
  try {
    const { monthYear } = req.params;
    const transactions = await SalaryTransaction.find({ monthYear }).sort({ teacherName: 1 });

    if (!transactions.length) {
      return res.status(404).json({ success: false, message: 'No salary records found for this month.' });
    }

    const selectedKeys = parseComponents(req.query.components);
    const earningsToShow = selectedKeys ? EARNING_FIELDS.filter((f) => selectedKeys.includes(f.key)) : EARNING_FIELDS;
    const deductionsToShow = selectedKeys ? DEDUCTION_FIELDS.filter((f) => selectedKeys.includes(f.key)) : DEDUCTION_FIELDS;

    const summary = transactions.reduce((acc, tx) => {
      acc.totalPayroll += tx.netSalary || 0;
      acc.totalPaid += tx.paidAmount || 0;
      if (tx.paymentStatus === 'paid') acc.paidCount += 1;
      else acc.pendingCount += 1;
      return acc;
    }, { totalPayroll: 0, totalPaid: 0, paidCount: 0, pendingCount: 0 });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="salary-report-${monthYear.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).text('NO.1 VETTRI ACADEMY', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(16).text('SALARY REPORT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).text(`For Month: ${monthYear}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(13).text('Summary', { underline: true });
    doc.fontSize(11).text(`Total Teachers: ${transactions.length}`);
    doc.text(`Total Payroll: Rs. ${summary.totalPayroll}`);
    doc.text(`Total Paid: Rs. ${summary.totalPaid}`);
    doc.text(`Total Pending: Rs. ${Math.max(summary.totalPayroll - summary.totalPaid, 0)}`);
    doc.text(`Teachers Paid: ${summary.paidCount}`);
    doc.text(`Teachers Pending: ${summary.pendingCount}`);
    doc.moveDown();

    doc.fontSize(13).text('Teacher-wise Breakdown', { underline: true });
    doc.moveDown(0.5);

    transactions.forEach((tx, idx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 200) {
        doc.addPage();
      }

      doc.fontSize(12).text(`${idx + 1}. ${tx.teacherName}`, { underline: true });
      doc.fontSize(10);
      doc.text(`Email: ${tx.teacherEmail || '-'}`);
      doc.text(`Processing Date: ${tx.processingDate ? new Date(tx.processingDate).toLocaleDateString('en-IN') : '-'}   Salary Date: ${tx.salaryDate ? new Date(tx.salaryDate).toLocaleDateString('en-IN') : '-'}`);

      if (earningsToShow.length) {
        doc.text(earningsToShow.map((f) => `${f.label}: Rs. ${tx[f.key] || 0}`).join('   '));
        doc.text(`Gross Salary: Rs. ${tx.grossSalary || 0}`);
      }

      if (deductionsToShow.length) {
        doc.text(deductionsToShow.map((f) => `${f.label}: Rs. ${tx[f.key] || 0}`).join('   '));
        doc.text(`Total Deductions: Rs. ${tx.totalDeductions || 0}`);
      }

      doc.font('Helvetica-Bold').text(`Net Salary: Rs. ${tx.netSalary || 0}`);
      doc.font('Helvetica');
      doc.text(`Status: ${tx.paymentStatus?.toUpperCase() || 'PENDING'}   Paid: Rs. ${tx.paidAmount || 0}`);
      doc.text(`Method: ${tx.paymentMethod || '-'}   Txn ID: ${tx.transactionId || '-'}`);
      doc.moveDown(0.5);
      doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#cccccc').stroke();
      doc.moveDown(0.5);
    });

    doc.fontSize(9).fillColor('gray').text(`Generated On: ${new Date().toLocaleDateString('en-IN')}`, { align: 'right' });
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
  editSalaryPayment,
  deleteSalaryPayment,
  downloadAllSalariesReport,
};