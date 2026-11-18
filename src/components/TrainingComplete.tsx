import React from 'react';
import { CheckCircle2, MinusCircle, RotateCcw, Rocket, Trophy } from 'lucide-react';
import { TrainingState } from '../types';
import { TRAINING_DRILLS, drillDurationSec } from '../training';

interface TrainingCompleteProps {
  training: TrainingState;
  onBeginMission: () => void;
  onRepeatTraining: () => void;
}

const TrainingComplete: React.FC<TrainingCompleteProps> = ({ training, onBeginMission, onRepeatTraining }) => {
  const completed = training.results.filter(r => r.status === 'complete').length;
  const allDone = completed === TRAINING_DRILLS.length;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label="Training complete">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 text-center border-b border-slate-800 bg-gradient-to-b from-emerald-500/10 to-transparent">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/10 border border-emerald-500/40 mb-3">
            <Trophy size={28} className="text-emerald-400" />
          </div>
          <div className="text-[10px] font-bold tracking-[0.25em] text-emerald-400">PHASE 2 · TRAINING</div>
          <h2 className="text-2xl font-bold text-white mt-1">{allDone ? 'Training Complete' : 'Training Ended'}</h2>
          <p className="text-sm text-slate-400 mt-1">
            {completed} of {TRAINING_DRILLS.length} drills completed. {allDone ? 'You are cleared for the live mission.' : 'You can repeat training or proceed.'}
          </p>
        </div>

        <ul className="p-4 space-y-1.5">
          {training.results.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-800 text-sm">
              {r.status === 'complete'
                ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                : <MinusCircle size={16} className="text-slate-500 shrink-0" />}
              <span className={r.status === 'complete' ? 'text-white' : 'text-slate-500'}>{TRAINING_DRILLS[i].title}</span>
              <span className="ml-auto font-mono text-[11px] text-slate-500">
                {r.status === 'complete' ? `${drillDurationSec(r)}s` : r.status.toUpperCase()}
                {r.errors > 0 && <span className="text-red-400"> · {r.errors} err</span>}
              </span>
            </li>
          ))}
        </ul>

        <div className="p-4 bg-slate-800/40 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          In the mission, the failsafe is live: looking away or leaving the safe zone hands control to the AI. Stats and reaction
          times are recorded for your debrief.
        </div>

        <div className="p-6 flex gap-3">
          <button
            onClick={onRepeatTraining}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> REPEAT
          </button>
          <button
            onClick={onBeginMission}
            autoFocus
            className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/30"
          >
            <Rocket size={16} /> BEGIN MISSION
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingComplete;
