import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot, MousePointer2, Users, Play, ChevronRight, ChevronLeft, Scan, Lock, ShieldAlert,
  Activity, Eye, Magnet, Crosshair, Keyboard, GraduationCap, Rocket, X,
} from 'lucide-react';
import { COLORS } from '../constants';
import { EntityType } from '../types';

interface TutorialModalProps {
  /** 'intro' = first-run tutorial that leads into training; 'help' = reference opened with H. */
  mode?: 'intro' | 'help';
  onClose: () => void;
  /** Intro mode only: jump straight to the live mission, skipping training. */
  onSkipToMission?: () => void;
}

const Key: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex min-w-[1.75rem] justify-center bg-slate-800 px-2 py-1 rounded text-white text-xs font-bold border border-slate-600 border-b-2">
    {children}
  </kbd>
);

const TutorialModal: React.FC<TutorialModalProps> = ({ onClose, onSkipToMission, mode = 'intro' }) => {
  const [step, setStep] = useState(0);
  const [animState, setAnimState] = useState(0); // Manual engagement demo: 0 approach, 1 dwell, 2 locked, 3 neutralised

  useEffect(() => {
    if (step !== 2) return;
    setAnimState(0);
    const timer = setInterval(() => setAnimState(prev => (prev + 1) % 4), 1500);
    return () => clearInterval(timer);
  }, [step]);

  const tutorialSteps = [
    {
      title: 'THE OPERATING FIELD',
      icon: <Crosshair className="text-blue-500" size={24} />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            Your sector is filled with moving contacts. Only <strong className="text-blue-400">BLUE</strong> contacts are
            hostile targets. Everything else is a distractor.
          </p>
          <div className="grid grid-cols-4 gap-3 bg-black/40 p-4 rounded-lg border border-slate-700">
            {[
              { type: EntityType.TARGET_PRIMARY, label: 'TARGET', note: 'Engage', ring: true },
              { type: EntityType.DISTRACTOR_A, label: 'NEUTRAL', note: 'Ignore' },
              { type: EntityType.DISTRACTOR_B, label: 'NEUTRAL', note: 'Ignore' },
              { type: EntityType.DISTRACTOR_C, label: 'NEUTRAL', note: 'Ignore' },
            ].map((e, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS[e.type] }}>
                  {e.ring && <div className="w-6 h-6 rounded-full border-2 border-white/50" />}
                </div>
                <span className={`text-[10px] font-bold ${e.ring ? 'text-blue-400' : 'text-slate-500'}`}>{e.label}</span>
                <span className={`text-[10px] ${e.ring ? 'text-green-400' : 'text-slate-600'}`}>{e.note}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded border border-slate-700">
            Contacts fade out when their lifespan runs down. A blue target that expires before it is neutralised counts as a
            <strong className="text-red-400"> MISS</strong>. Once a target is <strong className="text-green-400">DETECTED</strong> it stays on the field until resolved.
          </p>
        </div>
      ),
    },
    {
      title: 'OPERATOR MONITORING',
      icon: <Activity className="text-blue-500" size={24} />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">SentinelTrack AI monitors your status through the camera feed.</p>
          <p className="text-slate-400 text-sm">
            It tracks your <strong>presence</strong> inside a safe zone and <strong>attention shifts based on head/gaze direction</strong>.
            It does not control the cursor. Video is processed locally in your browser and is never recorded or uploaded.
          </p>
          <div className="bg-black/50 p-6 rounded-lg border border-slate-700 flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded border-2 border-slate-600 flex items-center justify-center mb-2 mx-auto relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/20 to-transparent animate-scan" />
                <Scan size={32} className="text-slate-500" />
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Camera Feed</span>
            </div>
            <div className="h-px w-12 bg-slate-700" />
            <div className="text-center">
              <div className="w-16 h-16 rounded border-2 border-green-500/50 bg-green-500/10 flex items-center justify-center mb-2 mx-auto">
                <Lock size={32} className="text-green-500" />
              </div>
              <span className="text-[10px] uppercase font-bold text-green-500">Operator Locked</span>
            </div>
          </div>
          <p className="text-center text-xs text-yellow-500/80 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
            If the system loses your face, it automatically delegates the mission to <strong>Autonomous Mode</strong>.
          </p>
        </div>
      ),
    },
    {
      title: 'MANUAL ENGAGEMENT',
      icon: <MousePointer2 className="text-blue-500" size={24} />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            In <strong className="text-blue-400">MANUAL MODE</strong> you engage with the <strong>mouse cursor</strong>.
          </p>
          <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 flex justify-center items-center h-48 relative overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                className={`w-16 h-16 rounded-full transition-all duration-300 flex items-center justify-center
                  ${animState === 3 ? 'scale-150 opacity-0 bg-red-500' : 'bg-blue-600'}
                  ${animState === 2 ? 'ring-4 ring-green-500 ring-offset-4 ring-offset-slate-950' : ''}`}
              >
                {animState === 2 && <span className="text-[10px] font-bold text-white">LOCKED</span>}
              </div>
              {animState === 1 && (
                <div className="absolute w-24 h-24 rounded-full border-4 border-blue-400 border-t-transparent animate-spin" />
              )}
              <div
                className={`absolute transition-all duration-700 ease-in-out
                  ${animState === 0 ? 'translate-x-20 translate-y-20' : 'translate-x-4 translate-y-4'}
                  ${animState === 3 ? 'opacity-0' : 'opacity-100'}`}
              >
                <MousePointer2 size={32} className={`text-white drop-shadow-lg ${animState === 2 ? 'scale-75' : ''}`} fill="currentColor" />
              </div>
              <div className="absolute bottom-0 text-center w-full">
                <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900/80 px-2 py-1 rounded">
                  {animState === 0 && '1. HOVER'}
                  {animState === 1 && '2. DWELL (HOLD STILL)'}
                  {animState === 2 && <span className="text-green-400">3. DETECTED — CLICK TO FIRE</span>}
                  {animState === 3 && <span className="text-red-400">4. NEUTRALISED</span>}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded border border-slate-700">
            <div className="p-2 bg-cyan-500/20 rounded border border-cyan-500/40">
              <Magnet size={18} className="text-cyan-400" />
            </div>
            <div>
              <span className="text-xs font-bold text-cyan-400 block">MAGNET ASSIST</span>
              <span className="text-[11px] text-slate-400">Press <Key>N</Key> to toggle cursor snap onto nearby targets.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'TEAMING PROTOCOL',
      icon: <Users className="text-yellow-500" size={24} />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            In <strong className="text-yellow-500">TEAMING MODE</strong> the AI scanner acquires targets, but every engagement
            requires human authorisation.
          </p>
          <div className="bg-slate-950 p-6 rounded border border-slate-800 flex items-center justify-center gap-10">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-black/70 absolute" />
              <div className="absolute inset-0 border-2 border-yellow-400 border-b-transparent border-l-transparent rounded-full animate-spin-slow" />
              <div className="absolute w-full h-px bg-yellow-400/60" />
              <div className="absolute h-full w-px bg-yellow-400/60" />
              <span className="relative z-10 font-mono font-bold text-2xl text-white drop-shadow-lg">24</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Key>Q</Key>
                <span className="text-xs text-slate-400">= <strong className="text-white">ODD</strong> number</span>
              </div>
              <div className="flex items-center gap-2">
                <Key>W</Key>
                <span className="text-xs text-slate-400">= <strong className="text-white">EVEN</strong> number</span>
              </div>
              <span className="text-[10px] text-green-400">24 is even → press W</span>
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-500">
            The magenta <span className="text-fuchsia-400 font-bold">SENTINEL</span> crosshair is the AI scanner. The rotating
            <span className="text-yellow-400 font-bold"> yellow</span> crosshair marks the target awaiting your verification.
          </p>
        </div>
      ),
    },
    {
      title: 'AUTONOMY & HANDSHAKE',
      icon: <Bot className="text-red-500" size={24} />,
      content: (
        <div className="space-y-4">
          <p className="text-slate-300">
            You can delegate the mission to <strong className="text-red-400">AUTONOMOUS MODE</strong> at any time with <Key>A</Key>.
          </p>
          <div className="bg-red-900/10 p-4 rounded-lg border border-red-500/30 flex items-center gap-4">
            <ShieldAlert className="text-red-500 shrink-0" size={32} />
            <div className="text-xs text-red-200">
              <strong>FAILSAFE:</strong> if your face leaves the safe zone or your attention drifts away from the screen, the AI
              takes over automatically.
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded border border-slate-700">
              <Eye size={14} className="text-slate-400" />
              <span className="text-xs font-mono text-white">GAZE LOST</span>
            </div>
            <ChevronRight className="text-slate-600" size={16} />
            <div className="flex items-center gap-2 px-3 py-2 bg-red-900/50 rounded border border-red-500">
              <Bot size={14} className="text-red-400" />
              <span className="text-xs font-mono text-white">AI TAKEOVER</span>
            </div>
            <ChevronRight className="text-slate-600" size={16} />
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-900/40 rounded border border-yellow-500">
              <Scan size={14} className="text-yellow-400" />
              <span className="text-xs font-mono text-white">HANDSHAKE</span>
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-500">
            When you are re-detected, a 5-second handshake lets you take manual control, start teaming, or leave the AI in charge.
            If you do nothing, control returns to you.
          </p>
        </div>
      ),
    },
    {
      title: 'CONTROLS REFERENCE',
      icon: <Keyboard className="text-slate-300" size={24} />,
      content: (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ['M', 'Manual control'],
            ['T', 'Teaming mode'],
            ['A', 'Delegate to AI'],
            ['N', 'Magnet assist (manual)'],
            ['Q / W', 'Odd / Even (teaming)'],
            ['1 – 5', 'Number of AI agents'],
            ['H / ?', 'Open this reference'],
            ['Esc', 'Pause / resume'],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between gap-3 bg-slate-800/40 border border-slate-800 rounded px-3 py-2">
              <span className="text-slate-300">{label}</span>
              <Key>{k}</Key>
            </div>
          ))}
          <p className="col-span-2 text-[11px] text-slate-500 mt-2">
            The gear icon (bottom-left) opens System Parameters: camera feed, safe-zone size, attention sensitivity, audio alarm,
            target density and more. Use <strong className="text-green-400">FINISH</strong> to end the mission and open the debrief.
          </p>
        </div>
      ),
    },
  ];

  const last = tutorialSteps.length - 1;
  const nextStep = useCallback(() => setStep(s => Math.min(s + 1, last)), [last]);
  const prevStep = useCallback(() => setStep(s => Math.max(s - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
      else if (e.key === 'Enter') {
        if (step < last) nextStep();
        else onClose();
      } else if (e.key === 'Escape' && mode === 'help') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextStep, prevStep, step, last, onClose, mode]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-label="Tutorial">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 pt-4 flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400">
            {mode === 'intro' ? 'PHASE 1 · TUTORIAL' : 'OPERATOR REFERENCE'}
          </span>
          {mode === 'help' && (
            <button onClick={onClose} className="text-slate-500 hover:text-white" aria-label="Close help">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="px-6 pb-4 pt-2 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            {tutorialSteps[step].icon}
            <span className="tracking-wide">{tutorialSteps[step].title}</span>
          </h2>
          <div className="text-xs font-mono text-slate-500">
            STEP {step + 1} / {tutorialSteps.length}
          </div>
        </div>

        <div className="p-8 min-h-[340px] flex flex-col justify-center" key={step}>
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">{tutorialSteps[step].content}</div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-800/30 flex justify-between items-center gap-4">
          {step > 0 ? (
            <button onClick={prevStep} className="flex items-center gap-2 text-slate-400 hover:text-white px-4 py-2 rounded transition-colors">
              <ChevronLeft size={16} /> BACK
            </button>
          ) : mode === 'intro' ? (
            <button onClick={onClose} className="text-slate-500 hover:text-white px-2 text-xs font-bold">
              SKIP TO TRAINING
            </button>
          ) : (
            <span className="w-16" />
          )}

          <div className="flex gap-2">
            {tutorialSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === step ? 'bg-blue-500 w-6' : 'bg-slate-700 w-2 hover:bg-slate-500'}`}
              />
            ))}
          </div>

          {step < last ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all"
            >
              NEXT <ChevronRight size={16} />
            </button>
          ) : mode === 'intro' ? (
            <div className="flex items-center gap-3">
              {onSkipToMission && (
                <button onClick={onSkipToMission} className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-bold">
                  <Rocket size={14} /> MISSION
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all"
              >
                <GraduationCap size={16} /> BEGIN TRAINING
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all"
            >
              RESUME <Play size={16} fill="currentColor" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
