/**
 * exportUtils.js — Print, PDF (jsPDF), and Excel (xlsx) export utilities
 * Used by ALL attendance tables across all dashboards.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Academy Header (for PDF) ─────────────────────────────────────────────────
const addAcademyHeader = (doc, title, dateRange, generatedBy) => {
  // Background header bar
  doc.setFillColor(10, 22, 40); // #0A1628 navy
  doc.rect(0, 0, 220, 45, 'F');

  doc.setTextColor(245, 166, 35); // gold
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('No.1 Vettri Academy', 14, 14);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Tamil Nadu, India  |  +91 9047758389', 14, 22);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 33);

  if (dateRange) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${dateRange}`, 14, 41);
  }

  // Right side metadata
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  doc.text(`Generated: ${now}`, 150, 33);
  if (generatedBy) doc.text(`By: ${generatedBy}`, 150, 40);

  // Reset colors for body
  doc.setTextColor(0, 0, 0);
};

// ─── PDF Export ───────────────────────────────────────────────────────────────
export const exportToPDF = ({ rows, columns, title, dateRange, generatedBy, filename, colorRows = false }) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

  addAcademyHeader(doc, title, dateRange, generatedBy);

  // Color-coded row fill (for monthly summary: green/yellow/red)
  const didDrawCell = colorRows
    ? ({ row, cell }) => {
        if (row.section === 'body') {
          const pct = parseFloat(row.raw?.['Attendance %'] || row.raw?.attendancePercent || 100);
          if (pct < 75) {
            doc.setFillColor(254, 226, 226); // red-100
          } else if (pct < 85) {
            doc.setFillColor(254, 249, 195); // yellow-100
          } else {
            doc.setFillColor(220, 252, 231); // green-100
          }
        }
      }
    : undefined;

  autoTable(doc, {
    head: [columns],
    body: rows.map((row) => columns.map((col) => row[col] ?? '')),
    startY: 50,
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: {
      fillColor: [10, 22, 40],
      textColor: [245, 166, 35],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    didDrawCell,
    margin: { top: 50, left: 10, right: 10 },
  });

  // Page numbers
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
  }

  const fname = filename || `vettri-attendance-${Date.now()}.pdf`;
  doc.save(fname);
};

// ─── Two-Section PDF (Login + Class Attendance) ───────────────────────────────
export const exportTwoSectionPDF = ({ loginRows, loginColumns, classRows, classColumns, dateRange, generatedBy }) => {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

  addAcademyHeader(doc, 'Full Attendance Report', dateRange, generatedBy);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 22, 40);
  doc.text('Section 1 — Login Attendance', 14, 55);

  autoTable(doc, {
    head: [loginColumns],
    body: loginRows.map((row) => loginColumns.map((col) => row[col] ?? '')),
    startY: 60,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [10, 22, 40], textColor: [245, 166, 35] },
  });

  // Page break
  doc.addPage();
  addAcademyHeader(doc, 'Full Attendance Report (continued)', dateRange, generatedBy);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 22, 40);
  doc.text('Section 2 — Class Attendance', 14, 55);

  autoTable(doc, {
    head: [classColumns],
    body: classRows.map((row) => classColumns.map((col) => row[col] ?? '')),
    startY: 60,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [10, 22, 40], textColor: [245, 166, 35] },
  });

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });
  }

  doc.save(`vettri-full-attendance-${Date.now()}.pdf`);
};

// ─── Excel/CSV Export ─────────────────────────────────────────────────────────
export const exportToExcel = ({ rows, sheetName = 'Attendance', filename }) => {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fname = (filename || `vettri-attendance-${Date.now()}`) + '.xlsx';
  XLSX.writeFile(wb, fname);
};

// ─── Print ────────────────────────────────────────────────────────────────────
export const triggerPrint = () => {
  window.print();
};

// ─── Attendance export buttons component helper ───────────────────────────────
export const getAttendanceExportHandlers = ({
  rows,
  columns,
  title,
  dateRange,
  generatedBy,
  filename,
  colorRows = false,
}) => ({
  onPrint: () => triggerPrint(),
  onPDF: () => exportToPDF({ rows, columns, title, dateRange, generatedBy, filename, colorRows }),
  onExcel: () => exportToExcel({ rows, sheetName: 'Attendance', filename }),
});
