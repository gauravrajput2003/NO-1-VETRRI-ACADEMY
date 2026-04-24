import { useEffect, useRef, useState } from 'react';

/**
 * Secure video player — no download, no right-click
 * Used for: class recordings, training videos, study material videos
 */
export default function VideoPlayer({
  src,
  className = '',
  onTimeUpdate,
  onEnded,
  autoPlay = false,
  title = '',
}) {
  const videoRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Disable right-click
    const preventCtx = (e) => e.preventDefault();
    video.addEventListener('contextmenu', preventCtx);

    // Block keyboard shortcuts for download
    const preventKeys = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'a'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    video.addEventListener('keydown', preventKeys);

    return () => {
      video.removeEventListener('contextmenu', preventCtx);
      video.removeEventListener('keydown', preventKeys);
    };
  }, []);

  if (!src) return null;

  return (
    <div className={`relative rounded-xl overflow-hidden bg-black ${className}`}>
      {error ? (
        <div className="flex items-center justify-center h-48 text-white/40 text-sm">
          ⚠️ Video failed to load. Please try again.
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay={autoPlay}
          controlsList="nodownload noremoteplayback nofullscreen-download"
          disablePictureInPicture={false}
          onContextMenu={(e) => e.preventDefault()}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          onError={() => setError(true)}
          className="w-full h-full"
          playsInline
          title={title}
        />
      )}
      {/* Invisible overlay in top-right to block download button area (browser-specific) */}
      <div
        className="absolute top-0 right-0 w-12 h-8 z-10"
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      />
    </div>
  );
}
