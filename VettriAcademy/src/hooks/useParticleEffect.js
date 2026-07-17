import { useCallback, useRef, useState } from 'react';

const MAX_CONCURRENT_BURSTS = 2;

export default function useParticleEffect() {
  const [bursts, setBursts] = useState([]);
  const idRef = useRef(0);

  const triggerParticles = useCallback((x, y, options = {}) => {
    const id = `${Date.now()}-${idRef.current++}`;
    const next = {
      id,
      x,
      y,
      count: options.count ?? 16,
      colors: options.colors,
      size: options.size ?? 'medium',
      durationMs: options.durationMs,
    };

    setBursts((prev) => {
      if (prev.length >= MAX_CONCURRENT_BURSTS) {
        return prev;
      }
      return [...prev, next];
    });
  }, []);

  const removeParticles = useCallback((id) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clearAllParticles = useCallback(() => {
    setBursts([]);
  }, []);

  return { bursts, triggerParticles, removeParticles, clearAllParticles };
}
