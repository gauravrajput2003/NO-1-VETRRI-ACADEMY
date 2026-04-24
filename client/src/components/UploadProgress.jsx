/**
 * UploadProgress — Reusable recording/file upload progress component
 * Shows 0–100% progress bar with "Do not close" warning
 * For large files (>300MB), shows HandBrake compression advice
 */
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiUploadCloud } from 'react-icons/fi';

export default function UploadProgress({
  progress = 0,       // 0–100
  fileName,
  fileSize,           // bytes
  isUploading = false,
  isDone = false,
  error,
}) {
  const MB = 1024 * 1024;
  const fileSizeMB = fileSize ? (fileSize / MB).toFixed(1) : null;
  const isLargeFile = fileSize && fileSize > 300 * MB;

  if (!isUploading && !isDone && !error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 p-4 space-y-3 bg-white/5"
    >
      {/* Large file warning */}
      {isLargeFile && isUploading && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <FiAlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={16} />
          <p className="text-amber-300 text-xs leading-relaxed">
            <span className="font-semibold">Large file detected ({fileSizeMB}MB).</span> For faster uploads, 
            compress using <span className="underline">HandBrake</span> (free software) before uploading. 
            Record in 720p for best results.
          </p>
        </div>
      )}

      {/* File info */}
      {fileName && (
        <div className="flex items-center gap-2">
          <FiUploadCloud size={16} className="text-gold flex-shrink-0" />
          <span className="text-white/60 text-xs truncate max-w-xs">{fileName}</span>
          {fileSizeMB && <span className="text-white/40 text-xs ml-auto flex-shrink-0">{fileSizeMB} MB</span>}
        </div>
      )}

      {/* Progress bar */}
      {isUploading && (
        <>
          <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #F5A623, #f97316)',
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gold">{progress}% uploaded</p>
            <p className="text-xs text-white/40 animate-pulse">⚠️ Do not close this window</p>
          </div>
        </>
      )}

      {/* Done state */}
      {isDone && (
        <div className="flex items-center gap-2 text-green-400">
          <FiCheckCircle size={16} />
          <span className="text-sm font-semibold">Upload complete! Students will see the recording shortly.</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400">
          <FiAlertTriangle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </motion.div>
  );
}
