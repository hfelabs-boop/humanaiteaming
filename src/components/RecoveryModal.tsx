import React, { useEffect, useState } from 'react';
import { CONFIG } from '../constants';
import { Users, User, MousePointer2 } from 'lucide-react';

interface RecoveryModalProps {
  onConfirm: () => void;
  onReject: () => void;
  onTeaming: () => void;
}

const RecoveryModal: React.FC<RecoveryModalProps> = ({ onConfirm, onReject, onTeaming }) => {
  const [countdown, setCountdown] = useState(CONFIG.RECOVERY_TIME_SEC);

  useEffect(() => {
    if (countdown <= 0) {
      onConfirm();
      return;
    }
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, onConfirm]);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-slate-600 p-6 rounded-xl shadow-2xl backdrop-blur-sm text-center z-[80] animate-in fade-in slide-in-from-top-4 duration-300 w-96">
      <h2 className="text-xl font-bold text-white mb-1">Face Detected</h2>
      <p className="text-slate-400 text-xs mb-4">Select Protocol</p>
      
      <div className="text-4xl font-mono font-bold text-blue-500 mb-6">
        {countdown}
      </div>

      <div className="space-y-2">
        <button 
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors"
        >
          <MousePointer2 size={16} />
          TAKE MANUAL CONTROL
        </button>

        <button 
          onClick={onTeaming}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-bold transition-colors group"
        >
          <Users size={16} />
          INITIATE TEAMING MODE
        </button>
        <p className="text-[10px] text-yellow-500/80 pb-2">
            AI tracks targets. YOU click to fire.
        </p>

        <button 
          onClick={onReject}
          className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition-colors"
        >
          REJECT (STAY AUTONOMOUS)
        </button>
      </div>
    </div>
  );
};

export default RecoveryModal;
