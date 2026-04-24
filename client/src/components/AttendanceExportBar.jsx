/**
 * AttendanceExportBar — Reusable export action bar for ALL attendance tables
 * Shows: Filter controls (left) + [Print] [PDF] [Excel] buttons (right)
 */
import { useState } from 'react';
import { FiPrinter, FiFileText, FiDownload } from 'react-icons/fi';
import { RiFileExcel2Line } from 'react-icons/ri';
import { exportToPDF, exportToExcel, triggerPrint } from '../utils/exportUtils';

export default function AttendanceExportBar({
  // Data for export
  rows = [],
  columns = [],
  title = 'Attendance Report',
  dateRange,
  generatedBy,
  filename,
  colorRows = false,
  // Optional extra buttons/filters on the left
  children,
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  const handlePDF = async () => {
    if (!rows.length) return;
    setPdfLoading(true);
    setTimeout(() => {
      exportToPDF({ rows, columns, title, dateRange, generatedBy, filename, colorRows });
      setPdfLoading(false);
    }, 100);
  };

  const handleExcel = () => {
    if (!rows.length) return;
    setExcelLoading(true);
    setTimeout(() => {
      exportToExcel({ rows, filename });
      setExcelLoading(false);
    }, 100);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
      {/* Left: Filter controls (passed as children) */}
      <div className="flex flex-wrap items-center gap-2">{children}</div>

      {/* Right: Export buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={triggerPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-lg transition-all"
          title="Print this table"
        >
          <FiPrinter size={14} />
          Print
        </button>

        <button
          onClick={handlePDF}
          disabled={pdfLoading || !rows.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-400/40 text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-40"
          title="Export as PDF"
        >
          <FiFileText size={14} />
          {pdfLoading ? 'Generating...' : 'PDF'}
        </button>

        <button
          onClick={handleExcel}
          disabled={excelLoading || !rows.length}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-green-500/40 text-green-400 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-40"
          title="Export as Excel"
        >
          <RiFileExcel2Line size={14} />
          {excelLoading ? 'Exporting...' : 'Excel'}
        </button>
      </div>
    </div>
  );
}
