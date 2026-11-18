import React from 'react';
import { GameStats, SessionAnalytics, TrainingState } from '../types';
import { TRAINING_DRILLS, drillDurationSec } from '../training';
import { Download, FileText, X, Clock, Target, AlertTriangle, Zap, RotateCcw, MousePointer2, Users, Bot, GraduationCap } from 'lucide-react';

interface ReportModalProps {
  stats: GameStats;
  analytics: SessionAnalytics;
  operatorId: string;
  endTime: number;
  training: TrainingState | null;
  onClose: () => void;
  onDownloadTxt: () => void;
  onDownloadCsv: () => void;
  onRestart: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ stats, analytics, operatorId, endTime, training, onClose, onDownloadTxt, onDownloadCsv, onRestart }) => {
  const getRatio = (hits: number, misses: number) => {
    const total = hits + misses;
    if (total === 0) return 0;
    return Math.round((hits / total) * 100);
  };

  const calculateAverage = (arr: number[]) => {
    if (arr.length === 0) return 0;
    return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0);
  };

  const durationSec = ((endTime - analytics.startTime) / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="max-w-5xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
           <div>
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                 <FileText className="text-blue-500" /> MISSION DEBRIEF
              </h2>
              <p className="text-slate-400 text-xs font-mono mt-1">
                {operatorId ? `OPERATOR: ${operatorId} · ` : ''}SESSION ID: {analytics.startTime}
              </p>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors" aria-label="Close report">
              <X size={24} />
           </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
            
            {/* High Level Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Time */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                        <Clock size={14} /> Total Duration
                    </div>
                    <div className="text-3xl font-mono text-white mb-2">{durationSec}s</div>
                    <p className="text-[10px] text-slate-500 leading-tight">Total time elapsed from mission start to finish.</p>
                </div>

                {/* Manual Accuracy */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><MousePointer2 size={48}/></div>
                    <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                        <Target size={14} /> Manual Accuracy
                    </div>
                    <div className={`text-3xl font-mono ${getRatio(stats.humanHits, stats.humanMisses) >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {getRatio(stats.humanHits, stats.humanMisses)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1 mb-2">{stats.humanHits} Hit / {stats.humanMisses} Miss</div>
                    <p className="text-[10px] text-slate-500 leading-tight">Click precision in standard manual control mode.</p>
                </div>

                {/* Teaming Accuracy */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Users size={48}/></div>
                    <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                        <Target size={14} /> Teaming Accuracy
                    </div>
                    <div className={`text-3xl font-mono ${getRatio(stats.teamingHits, stats.teamingMisses) >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {getRatio(stats.teamingHits, stats.teamingMisses)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1 mb-2">{stats.teamingHits} Correct / {stats.teamingMisses} Error</div>
                    <p className="text-[10px] text-slate-500 leading-tight">Cognitive task precision (Odd/Even) during AI collaboration.</p>
                </div>

                {/* AI Accuracy */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Bot size={48}/></div>
                    <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                        <Target size={14} /> AI Accuracy
                    </div>
                    <div className={`text-3xl font-mono ${getRatio(stats.aiHits, stats.aiMisses) >= 90 ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {getRatio(stats.aiHits, stats.aiMisses)}%
                    </div>
                    <div className="text-xs text-slate-500 mt-1 mb-2">{stats.aiHits} Hit / {stats.aiMisses} Miss</div>
                    <p className="text-[10px] text-slate-500 leading-tight">Autonomous agent performance when executing tasks independently.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Teaming Performance Deep Dive */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative">
                     <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 rounded-l-xl"></div>
                     <h3 className="text-sm font-bold text-yellow-500 mb-6 flex items-center gap-2 uppercase tracking-wider">
                        <Users size={16} /> Human Performance on Teaming Tasks
                     </h3>
                     
                     <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-slate-300 text-sm font-bold block">Decision Ratio</span>
                                <span className="text-[10px] text-slate-500">Correct actions vs Errors committed</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-mono text-white">{stats.teamingHits}:{stats.teamingMisses}</span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div 
                                className="bg-green-500 h-full" 
                                style={{ width: `${getRatio(stats.teamingHits, stats.teamingMisses)}%` }}
                            />
                            <div 
                                className="bg-red-500 h-full" 
                                style={{ width: `${100 - getRatio(stats.teamingHits, stats.teamingMisses)}%` }}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <div>
                                <span className="text-slate-300 text-sm font-bold block">Cognitive Response Time</span>
                                <span className="text-[10px] text-slate-500">Avg time to verify Odd/Even protocol</span>
                            </div>
                            <div className="text-right">
                                <span className="text-2xl font-mono text-yellow-400">{calculateAverage(analytics.rtNeutralizationTeaming)} <span className="text-sm text-slate-500">ms</span></span>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Reaction Latency Breakdown */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2 uppercase tracking-wider">
                        <Zap size={16} className="text-blue-500"/> Global Response Latency
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                            <div>
                                <span className="text-slate-400 text-sm block">Operator Detection (Dwell)</span>
                                <span className="text-[10px] text-slate-600">Time to gaze-lock a target</span>
                            </div>
                            <span className="font-mono text-white">{calculateAverage(analytics.rtDetectionManual)} ms</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                            <div>
                                <span className="text-slate-400 text-sm block">Operator Neutralization</span>
                                <span className="text-[10px] text-slate-600">Manual click reaction speed</span>
                            </div>
                            <span className="font-mono text-white">{calculateAverage(analytics.rtNeutralizationManual)} ms</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-950 rounded border border-slate-800">
                            <div>
                                <span className="text-slate-400 text-sm block">Autonomous System</span>
                                <span className="text-[10px] text-slate-600">AI execution speed</span>
                            </div>
                            <span className="font-mono text-blue-400">{calculateAverage(analytics.rtNeutralizationAi)} ms</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Integrity */}
            <div>
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle size={16} className="text-red-500"/> Sensor Integrity
                </h3>
                <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-red-900/10 rounded border border-red-900/30 flex justify-between items-center">
                        <div>
                            <span className="text-slate-300 font-bold block text-sm">Out of Bounds</span>
                            <span className="text-[10px] text-slate-500">Face left safe zone</span>
                        </div>
                        <span className="text-2xl font-mono text-red-400">{analytics.outOfBoundsCount}</span>
                     </div>
                     <div className="p-4 bg-red-900/10 rounded border border-red-900/30 flex justify-between items-center">
                        <div>
                            <span className="text-slate-300 font-bold block text-sm">Distractions</span>
                            <span className="text-[10px] text-slate-500">Attention drift detected</span>
                        </div>
                        <span className="text-2xl font-mono text-red-400">{analytics.distractionCount}</span>
                     </div>
                </div>
            </div>

            {/* Training */}
            <div>
                <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <GraduationCap size={16} className="text-emerald-500"/> Pre-Mission Training
                </h3>
                {training ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {training.results.map((r, i) => (
                            <div key={r.id} className="p-3 bg-slate-950 rounded border border-slate-800 flex justify-between items-center text-xs">
                                <span className={r.status === 'complete' ? 'text-slate-200' : 'text-slate-500'}>{TRAINING_DRILLS[i].title}</span>
                                <span className={`font-mono ${r.status === 'complete' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {r.status === 'complete' ? `${drillDurationSec(r)}s` : r.status.toUpperCase()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-slate-500">Training was skipped for this session.</p>
                )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex flex-col sm:flex-row gap-4">
            <button 
                onClick={onDownloadTxt}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
                <FileText size={18} /> DOWNLOAD SUMMARY (.TXT)
            </button>
            <button 
                onClick={onDownloadCsv}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
                <Download size={18} /> DOWNLOAD EVENT LOG (.CSV)
            </button>
            <button 
                onClick={onRestart}
                title="Restart mission"
                aria-label="Restart mission"
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-6 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-600"
            >
                <RotateCcw size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
