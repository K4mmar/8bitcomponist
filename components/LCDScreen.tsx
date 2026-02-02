
import React from 'react';

interface LCDScreenProps {
  title: string;
  status: string;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const LCDScreen: React.FC<LCDScreenProps> = ({ title, status, isPlaying }) => {
  return (
    <div className="w-full h-10 bg-[#111] border-b border-[#222] flex items-center px-4 gap-4 select-none justify-between">
      {/* Status Text Area */}
      <div className="flex flex-col w-48 shrink-0">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] text-[#9bbc0f] font-black uppercase tracking-widest truncate">{title}</span>
            <span className={`text-[8px] font-bold ${isPlaying ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                {isPlaying ? '● LIVE' : '○ STANDBY'}
            </span>
          </div>
          <div className="w-full h-1 bg-[#222] rounded-full overflow-hidden mt-1">
             <div className={`h-full bg-[#9bbc0f] transition-all duration-300 ${isPlaying ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
          </div>
      </div>

      {/* Center Spacer / Decoration */}
      <div className="flex-1 flex justify-center items-center opacity-20">
          <div className="h-1 w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,#333_4px,#333_5px)]" />
      </div>

      {/* Info Stats */}
      <div className="flex gap-4 text-[9px] font-mono text-gray-500 shrink-0">
         <div>CPU <span className="text-gray-300">12%</span></div>
         <div>MEM <span className="text-gray-300">64K</span></div>
         <div className="text-[#9bbc0f] font-bold uppercase">{status}</div>
      </div>
    </div>
  );
};

export default LCDScreen;
