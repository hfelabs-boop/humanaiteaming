import React, { useEffect, useState } from 'react';

interface MissionCountdownProps {
  seconds: number;
  onDone: () => void;
}

/** Short "3-2-1" overlay shown before the scored mission starts. */
const MissionCountdown: React.FC<MissionCountdownProps> = ({ seconds, onDone }) => {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      const done = setTimeout(onDone, 500);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => setCount(c => c - 1), 800);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <div className="absolute inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none" data-testid="mission-countdown">
      <div className="text-[11px] font-bold tracking-[0.35em] text-blue-400 mb-4">PHASE 3 · LIVE MISSION</div>
      <div key={count} className="text-8xl font-extrabold font-mono text-white animate-in zoom-in-50 fade-in duration-300">
        {count > 0 ? count : 'GO'}
      </div>
      <div className="mt-4 text-sm text-slate-400">Failsafe armed · Recording session</div>
    </div>
  );
};

export default MissionCountdown;
