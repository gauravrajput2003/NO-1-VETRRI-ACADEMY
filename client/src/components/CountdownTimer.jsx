import { useState, useEffect } from 'react';
import { FiClock } from 'react-icons/fi';

/**
 * CountdownTimer — Shows time until a scheduled class
 * Used on student class cards and teacher dashboard
 */
export default function CountdownTimer({ targetTime, className = '' }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const target = new Date(targetTime).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Starting now...');
        setIsPast(true);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const isUrgent = !isPast && timeLeft.includes('m') && !timeLeft.includes('h');

  return (
    <span className={`flex items-center gap-1.5 ${className} ${isUrgent ? 'text-amber-400 animate-pulse' : 'text-white/60'}`}>
      <FiClock size={13} />
      {isPast ? (
        <span className="text-green-400 font-semibold">Starting now!</span>
      ) : (
        <span className="tabular-nums">Starts in {timeLeft}</span>
      )}
    </span>
  );
}
