import React from 'react';
import { CheckCircle2, ChevronsRight, GraduationCap, Info, Loader2, LogOut, ShieldOff, SkipForward } from 'lucide-react';
import { AppMode, TrainingState } from '../types';
import { TRAINING_DRILLS } from '../training';
import { TrackerStatus } from './WebcamTracker';

interface TrainingCoachProps {
  training: TrainingState;
  mode: AppMode;
  magnetAssist: boolean;
  trackerStatus: TrackerStatus;
  onSkipDrill: () => void;
  onExitTraining: () => void;
  onBypassSensors: () => void;
}

type Hint = { text: string; tone: 'info' | 'action' | 'warn' };

const getHint = (
  drillId: string,
  mode: AppMode,
  magnet: boolean,
  status: TrackerStatus,
): Hint | null => {
  switch (drillId) {
    case 'SENSOR':
      if (status === 'TRACKING') return { text: 'Locked — hold steady…', tone: 'info' };
      if (status === 'INITIALIZING') return { text: 'Starting camera and face detector…', tone: 'info' };
      if (status === 'NO_PERMISSION') return { text: 'Camera unavailable. Allow camera access and retry, or bypass the sensors.', tone: 'warn' };
      if (status === 'OUT_OF_BOUNDS') return { text: 'Move your face into the dashed safe zone.', tone: 'action' };
      if (status === 'DISTRACTED') return { text: 'Face the screen directly.', tone: 'action' };
      return { text: 'Searching for your face — sit centred in front of the camera.', tone: 'action' };
    case 'MANUAL':
      if (mode !== AppMode.MANUAL) return { text: 'Press M to take manual control.', tone: 'action' };
      if (magnet) return { text: 'Magnet assist is on — press N to disengage for this drill.', tone: 'action' };
      return null;
    case 'MAGNET':
      if (mode !== AppMode.MANUAL) return { text: 'Press M to take manual control.', tone: 'action' };
      if (!magnet) return { text: 'Press N to engage magnet assist.', tone: 'action' };
      return null;
    case 'TEAMING':
      if (mode !== AppMode.TEAMING) return { text: 'Press T to enter Teaming mode.', tone: 'action' };
      return { text: 'Q = odd · W = even. Wait for the yellow crosshair.', tone: 'info' };
    case 'AUTONOMY':
      if (mode !== AppMode.AI_AUTONOMY) return { text: 'Press A to delegate to the AI.', tone: 'action' };
      return { text: 'Hands off — the AI is engaging.', tone: 'info' };
    case 'HANDSHAKE':
      if (mode === AppMode.AI_AUTONOMY) return { text: 'Simulated sensor loss: AI in control. Re-detection in a moment…', tone: 'info' };
      if (mode === AppMode.TRANSITION_RECOVERY) return { text: 'Handshake open — choose a protocol in the panel above.', tone: 'action' };
      return { text: 'Press A to hand control back to the AI; the handshake will follow.', tone: 'action' };
    default:
      return null;
  }
};

const TrainingCoach: React.FC<TrainingCoachProps> = ({
  training, mode, magnetAssist, trackerStatus, onSkipDrill, onExitTraining, onBypassSensors,
}) => {
  const drill = TRAINING_DRILLS[training.index];
  const pct = Math.min(100, (training.progress / drill.target) * 100);
  const hint = training.justCompleted ? null : getHint(drill.id, mode, magnetAssist, trackerStatus);
  const progressLabel = drill.id === 'SENSOR'
    ? `${training.progress.toFixed(1)} / ${drill.target.toFixed(1)}`
    : `${Math.floor(training.progress)} / ${drill.target}`;

  return (
    <div
      className="w-80 bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.12)] overflow-hidden pointer-events-auto animate-in fade-in slide-in-from-right-4"
      data-testid="training-coach"
    >
      <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400 flex items-center gap-2">
          <GraduationCap size={14} /> TRAINING · DRILL {training.index + 1}/{TRAINING_DRILLS.length}
        </span>
        <div className="flex gap-1">
          {training.results.map((r, i) => (
            <span
              key={r.id}
              title={TRAINING_DRILLS[i].title}
              className={`h-1.5 rounded-full transition-all ${
                i === training.index ? 'w-4 bg-emerald-400'
                  : r.status === 'complete' ? 'w-1.5 bg-emerald-600'
                  : r.status === 'skipped' ? 'w-1.5 bg-slate-500'
                  : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3" key={drill.id}>
        <div className="animate-in fade-in duration-300">
          <h3 className="text-lg font-bold text-white leading-tight">{drill.title}</h3>
          <p className="text-sm text-emerald-300 mt-1">{drill.objective}</p>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
            <span>PROGRESS</span>
            <span data-testid="drill-progress">{progressLabel} {drill.unit}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${training.justCompleted ? 'bg-emerald-400' : 'bg-emerald-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {training.justCompleted ? (
          <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 rounded-lg px-3 py-3 text-emerald-300 font-bold text-sm animate-in zoom-in-95">
            <CheckCircle2 size={18} /> DRILL COMPLETE
            <Loader2 size={14} className="ml-auto animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            <ol className="space-y-1.5 text-xs text-slate-300 list-decimal pl-4 marker:text-slate-500">
              {drill.instructions.map((ins, i) => <li key={i} className="leading-snug">{ins}</li>)}
            </ol>

            {drill.keys.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {drill.keys.map(k => (
                  <kbd key={k} className="bg-slate-800 border border-slate-600 border-b-2 rounded px-2 py-0.5 text-[11px] font-bold text-white">{k}</kbd>
                ))}
              </div>
            )}

            {hint && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${
                  hint.tone === 'action' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-200'
                    : hint.tone === 'warn' ? 'bg-red-500/10 border-red-500/40 text-red-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}
                data-testid="drill-hint"
              >
                {hint.tone === 'action' ? <ChevronsRight size={14} className="shrink-0 mt-0.5" /> : <Info size={14} className="shrink-0 mt-0.5" />}
                <span>{hint.text}</span>
              </div>
            )}
          </>
        )}

        {drill.id === 'SENSOR' && !training.justCompleted && (
          <button
            onClick={onBypassSensors}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg py-2 text-xs font-bold text-slate-300"
          >
            <ShieldOff size={14} /> BYPASS SENSORS (NO CAMERA)
          </button>
        )}

        <p className="text-[10px] text-slate-500 leading-snug">
          Automatic failsafe takeovers are suspended during training. Scores here do not count toward your mission.
        </p>
      </div>

      <div className="px-4 py-2 border-t border-slate-800 flex justify-between">
        <button
          onClick={onSkipDrill}
          disabled={training.justCompleted}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white disabled:opacity-40"
        >
          <SkipForward size={12} /> SKIP DRILL
        </button>
        <button onClick={onExitTraining} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white">
          <LogOut size={12} /> END TRAINING
        </button>
      </div>
    </div>
  );
};

export default TrainingCoach;
