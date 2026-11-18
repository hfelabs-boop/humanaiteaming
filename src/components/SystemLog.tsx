import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  id: number;
  text: string;
  type: 'info' | 'warning' | 'success' | 'system';
  timestamp: number;
}

interface SystemLogProps {
  logs: LogEntry[];
}

const SystemLog: React.FC<SystemLogProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="absolute bottom-4 left-16 w-80 pointer-events-none z-40 animate-in slide-in-from-left-10 fade-in duration-500">
       <div className="bg-slate-900/90 border border-slate-700 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-slate-800/80 px-3 py-1.5 border-b border-slate-700 flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  System Log
              </span>
              <span className="text-[9px] font-mono text-slate-600">V.2.4.0</span>
          </div>

          {/* Log Area */}
          <div className="p-2 h-32 overflow-y-auto custom-scrollbar font-mono text-[10px] flex flex-col gap-1.5">
             {logs.length === 0 && (
                 <div className="text-slate-600 italic text-center mt-4">System ready...</div>
             )}
             {logs.map((log) => (
                <div key={log.id} className="flex gap-2 leading-tight opacity-90 hover:opacity-100 transition-opacity">
                   <span className="text-slate-600 shrink-0">
                       [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                   </span>
                   <span className={`break-words ${
                       log.type === 'warning' ? 'text-red-400 font-bold' : 
                       log.type === 'success' ? 'text-green-400' : 
                       log.type === 'system' ? 'text-blue-400 font-bold' : 'text-slate-300'
                   }`}>
                       {log.type === 'system' && '> '}
                       {log.text}
                   </span>
                </div>
             ))}
             <div ref={endRef} />
          </div>
       </div>
    </div>
  );
};

export default SystemLog;
