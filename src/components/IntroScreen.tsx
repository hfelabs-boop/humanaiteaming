import React, { useState } from 'react';
import { BookOpen, Bot, ChevronRight, GraduationCap, MousePointer2, Rocket, ShieldCheck, Users, Video, Crosshair } from 'lucide-react';

interface IntroScreenProps {
  operatorId: string;
  onOperatorIdChange: (id: string) => void;
  onStartTutorial: () => void;
  onStartTraining: () => void;
  onStartMission: () => void;
}

const modes = [
  {
    icon: MousePointer2,
    name: 'MANUAL',
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    text: 'You find, dwell on and fire on targets with the mouse.',
  },
  {
    icon: Users,
    name: 'TEAMING',
    color: 'text-yellow-400',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/5',
    text: 'The AI acquires targets. You authorise each engagement.',
  },
  {
    icon: Bot,
    name: 'AUTONOMY',
    color: 'text-red-400',
    border: 'border-red-500/30',
    bg: 'bg-red-500/5',
    text: 'The AI hunts and fires on its own — also the failsafe.',
  },
];

const phases = [
  { n: 1, label: 'Tutorial', detail: '6 short briefing cards', icon: BookOpen },
  { n: 2, label: 'Training', detail: '6 guided drills, no score', icon: GraduationCap },
  { n: 3, label: 'Mission', detail: 'Scored session + debrief', icon: Rocket },
];

const IntroScreen: React.FC<IntroScreenProps> = ({ operatorId, onOperatorIdChange, onStartTutorial, onStartTraining, onStartMission }) => {
  const [showSkip, setShowSkip] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 grid-backdrop overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="relative min-h-full flex items-center justify-center p-6">
        <div className="max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Title */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.3em] text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
              <Crosshair size={12} /> HUMAN–AUTONOMY TEAMING TESTBED
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white">
              Sentinel<span className="text-blue-500">Track</span> AI
            </h1>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Track and neutralise hostile contacts alongside an autonomous agent. The system watches your presence and
              attention — and hands control to the AI the moment you look away.
            </p>
          </div>

          {/* Modes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {modes.map(m => (
              <div key={m.name} className={`rounded-xl border ${m.border} ${m.bg} p-5`}>
                <div className="flex items-center gap-2 mb-2">
                  <m.icon size={18} className={m.color} />
                  <span className={`font-bold tracking-widest text-sm ${m.color}`}>{m.name}</span>
                </div>
                <p className="text-sm text-slate-400 leading-snug">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Session setup */}
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
              <div className="space-y-5">
                <div>
                  <label htmlFor="operator-id" className="block text-[10px] font-bold tracking-widest text-slate-400 mb-2">
                    OPERATOR ID <span className="text-slate-600 font-normal">(optional — appears in your reports)</span>
                  </label>
                  <input
                    id="operator-id"
                    value={operatorId}
                    onChange={e => onOperatorIdChange(e.target.value.replace(/[^\w-]/g, '').slice(0, 24))}
                    placeholder="e.g. P-014"
                    className="w-full md:w-72 bg-slate-950 border border-slate-700 focus:border-blue-500 focus:outline-none rounded-lg px-4 py-2.5 font-mono text-white placeholder:text-slate-600"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {phases.map((p, i) => (
                    <React.Fragment key={p.n}>
                      <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 text-[11px] font-bold flex items-center justify-center text-slate-300">
                          {p.n}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{p.label}</div>
                          <div className="text-[10px] text-slate-500">{p.detail}</div>
                        </div>
                      </div>
                      {i < phases.length - 1 && <ChevronRight size={16} className="text-slate-700 self-center hidden sm:block" />}
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-start gap-3 text-[11px] text-slate-500 leading-relaxed">
                  <Video size={14} className="shrink-0 mt-0.5 text-slate-400" />
                  <span>
                    The camera is used for face presence and head-direction checks only. Frames are processed locally in your
                    browser and are never recorded or transmitted. No camera? You can bypass the sensors during training.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:w-64">
                <button
                  onClick={onStartTutorial}
                  autoFocus
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all"
                >
                  <BookOpen size={18} /> START TUTORIAL
                </button>
                {!showSkip ? (
                  <button onClick={() => setShowSkip(true)} className="text-xs text-slate-500 hover:text-slate-300 font-bold py-2">
                    Experienced operator? Skip ahead
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <button
                      onClick={onStartTraining}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <GraduationCap size={16} /> SKIP TO TRAINING
                    </button>
                    <button
                      onClick={onStartMission}
                      className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
                    >
                      <Rocket size={16} /> SKIP TO MISSION
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600 mt-1">
                  <ShieldCheck size={12} /> Training results are not scored
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
