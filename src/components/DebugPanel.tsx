import React, { useState } from 'react';
import { Settings2, X, ChevronUp, ChevronDown, Video, VideoOff, Target, Eye, Users, Hand, Scan, ShieldAlert, Volume2, Activity } from 'lucide-react';
import { GameConfig, AppMode, OscillatorType } from '../types';

interface DebugPanelProps {
  config: GameConfig;
  setConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ config, setConfig, currentMode, setMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const update = (key: keyof GameConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateAudio = (key: keyof GameConfig['audio'], value: any) => {
    setConfig(prev => ({ 
        ...prev, 
        audio: { ...prev.audio, [key]: value } 
    }));
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-slate-800 p-2 rounded-full border border-slate-600 hover:bg-slate-700 transition-colors shadow-lg"
      >
        <Settings2 size={20} className="text-slate-300" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-72 bg-slate-900/95 backdrop-blur border border-slate-600 rounded-lg shadow-2xl p-4 text-xs">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <Settings2 size={14} /> System Parameters
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {/* Mode Override */}
        <div className="space-y-2">
            <label className="block text-slate-400 font-bold">FORCE MODE (DEBUG)</label>
            <div className="grid grid-cols-3 gap-1">
                <button 
                    onClick={() => setMode(AppMode.MANUAL)} 
                    className={`px-2 py-1 rounded text-center border ${currentMode === AppMode.MANUAL ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                >MANUAL</button>
                <button 
                    onClick={() => setMode(AppMode.TEAMING)} 
                    className={`px-2 py-1 rounded text-center border ${currentMode === AppMode.TEAMING ? 'bg-yellow-600 border-yellow-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                >TEAMING</button>
                <button 
                    onClick={() => setMode(AppMode.AI_AUTONOMY)} 
                    className={`px-2 py-1 rounded text-center border ${currentMode === AppMode.AI_AUTONOMY ? 'bg-red-600 border-red-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                >AUTO</button>
            </div>
        </div>

        <hr className="border-slate-700" />

        {/* Audio Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
              <label className="text-slate-400 font-bold flex items-center gap-2"><Volume2 size={12}/> AUDIO WARNING</label>
              <input 
                type="checkbox"
                checked={config.audio.enabled}
                onChange={(e) => updateAudio('enabled', e.target.checked)}
                className="accent-blue-500"
              />
          </div>

          {config.audio.enabled && (
            <div className="pl-4 border-l-2 border-slate-700 space-y-3">
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500">
                        <span>FREQUENCY</span>
                        <span className="font-mono text-slate-300">{config.audio.frequency}Hz</span>
                    </div>
                    <input 
                        type="range" min="100" max="1000" step="10"
                        value={config.audio.frequency}
                        onChange={(e) => updateAudio('frequency', parseInt(e.target.value))}
                        className="w-full"
                    />
                </div>

                <div className="space-y-1">
                    <span className="block text-[10px] text-slate-500">WAVEFORM</span>
                    <div className="grid grid-cols-4 gap-1">
                        {(['sawtooth', 'square', 'sine', 'triangle'] as OscillatorType[]).map(t => (
                            <button
                                key={t}
                                onClick={() => updateAudio('type', t)}
                                className={`px-1 py-1 rounded text-[9px] uppercase border ${config.audio.type === t ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}
                            >
                                {t.substr(0,3)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[10px] flex items-center gap-2"><Activity size={10}/> LOOP ALARM</span>
                    <input 
                        type="checkbox"
                        checked={config.audio.loop}
                        onChange={(e) => updateAudio('loop', e.target.checked)}
                        className="accent-blue-500"
                    />
                </div>
            </div>
          )}
        </div>

        <hr className="border-slate-700" />

        {/* Visual Settings */}
        <div className="space-y-2">
          <label className="block text-slate-400 font-bold">VISUAL FEEDBACK</label>
          
          <div className="flex items-center justify-between">
             <span className="text-slate-300 flex items-center gap-2"><Video size={12}/> Camera Feed</span>
             <input 
               type="checkbox"
               checked={config.showCameraFeed}
               onChange={(e) => update('showCameraFeed', e.target.checked)}
               className="accent-blue-500"
             />
          </div>

          <div className="flex items-center justify-between">
             <span className="text-slate-300 flex items-center gap-2"><Settings2 size={12}/> Debug Overlay</span>
             <input 
               type="checkbox"
               checked={config.showDebugOverlay}
               onChange={(e) => update('showDebugOverlay', e.target.checked)}
               className="accent-blue-500"
             />
          </div>

          <div className="space-y-1 pt-2">
             <label className="block text-slate-500 text-[10px] flex items-center gap-2"><Scan size={10}/> TRACKING BOX SIZE</label>
             <div className="flex items-center gap-2">
                 <input 
                     type="range" min="0.2" max="0.9" step="0.05"
                     value={config.safeZoneScale}
                     onChange={(e) => update('safeZoneScale', parseFloat(e.target.value))}
                     className="flex-1"
                 />
                 <span className="w-8 text-right font-mono text-slate-300">{(config.safeZoneScale * 100).toFixed(0)}%</span>
             </div>
          </div>
          
           <div className="flex items-center justify-between pt-2">
             <span className="text-slate-300 flex items-center gap-2"><Eye size={12}/> Attention Check</span>
             <input 
               type="checkbox"
               checked={config.enableAttentionCheck}
               onChange={(e) => update('enableAttentionCheck', e.target.checked)}
               className="accent-blue-500"
             />
          </div>

          {config.enableAttentionCheck && (
            <div className="pl-4 border-l-2 border-slate-700 space-y-1">
                <label className="block text-slate-500 text-[10px]">DRIFT SENSITIVITY (YAW)</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="range" min="0.1" max="1.0" step="0.05"
                        value={config.attentionSensitivity}
                        onChange={(e) => update('attentionSensitivity', parseFloat(e.target.value))}
                        className="flex-1"
                    />
                    <span className="w-8 text-right font-mono text-slate-300">{config.attentionSensitivity.toFixed(2)}</span>
                </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
             <span className="text-slate-300 flex items-center gap-2"><Target size={12}/> AI Target Color</span>
             <input 
               type="color"
               value={config.aiTargetColor}
               onChange={(e) => update('aiTargetColor', e.target.value)}
               className="w-6 h-6 rounded cursor-pointer bg-transparent"
             />
          </div>

          <div className="flex items-center justify-between mt-2">
             <span className="text-slate-300 flex items-center gap-2"><Target size={12}/> Crosshair Color</span>
             <input 
               type="color"
               value={config.teamingCrosshairColor}
               onChange={(e) => update('teamingCrosshairColor', e.target.value)}
               className="w-6 h-6 rounded cursor-pointer bg-transparent"
             />
          </div>
        </div>
        
        <hr className="border-slate-700" />
        
        {/* Protocol Settings */}
        <div className="space-y-2">
           <label className="block text-slate-400 font-bold">PROTOCOL LOGIC</label>
           <div className="flex items-center justify-between">
             <span className="text-slate-300 flex items-center gap-2 text-[10px]"><ShieldAlert size={12}/> HANDSHAKE ON DISTRACT</span>
             <input 
               type="checkbox"
               checked={config.handshakeOnDistraction}
               onChange={(e) => update('handshakeOnDistraction', e.target.checked)}
               className="accent-red-500"
             />
          </div>
        </div>

        <hr className="border-slate-700" />

        {/* Gameplay Settings */}
        <div className="space-y-2">
          <label className="block text-slate-400 font-bold">AI AGENTS (TEAMING)</label>
          <div className="flex items-center gap-2">
             <Users size={12} className="text-slate-400"/>
             <input 
               type="range" min="1" max="5" step="1"
               value={config.aiAgentCount}
               onChange={(e) => update('aiAgentCount', parseInt(e.target.value))}
               className="flex-1"
             />
             <span className="w-8 text-right font-mono text-slate-300">{config.aiAgentCount}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-400 font-bold">TARGET DENSITY</label>
          <div className="flex items-center gap-2">
             <input 
               type="range" min="5" max="50" step="1"
               value={config.entityCount}
               onChange={(e) => update('entityCount', parseInt(e.target.value))}
               className="flex-1"
             />
             <span className="w-8 text-right font-mono text-slate-300">{config.entityCount}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-400 font-bold">TARGET LIFESPAN (MS)</label>
          <div className="flex items-center gap-2">
             <span className="text-slate-500">Min</span>
             <input 
               type="number" 
               value={config.minLifespan}
               onChange={(e) => update('minLifespan', parseInt(e.target.value))}
               className="w-16 bg-slate-800 border border-slate-700 rounded px-1"
             />
             <span className="text-slate-500">Max</span>
             <input 
               type="number" 
               value={config.maxLifespan}
               onChange={(e) => update('maxLifespan', parseInt(e.target.value))}
               className="w-16 bg-slate-800 border border-slate-700 rounded px-1"
             />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-slate-400 font-bold">RESPAWN INTERVAL (MS)</label>
          <div className="flex items-center gap-2">
             <input 
               type="range" min="0" max="5000" step="100"
               value={config.spawnInterval}
               onChange={(e) => update('spawnInterval', parseInt(e.target.value))}
               className="flex-1"
             />
             <span className="w-8 text-right font-mono text-slate-300">{(config.spawnInterval / 1000).toFixed(1)}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
