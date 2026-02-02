
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from '../services/audioEngine';
import { Sliders, Activity } from 'lucide-react';

interface MixerStripProps {
  channelConfigs: Record<number, { mute: boolean, solo: boolean, volume: number }>;
  onToggleMute: (ch: number) => void;
  onToggleSolo: (ch: number) => void;
  onSetVolume: (ch: number, vol: number) => void;
}

const CHANNEL_COLORS = ['#ff4d4d', '#ffcc00', '#00ccff', '#9bbc0f'];
const CHANNEL_NAMES = ['LEAD', 'PULSE', 'BASS', 'NOISE'];

// Custom Vertical Fader Component for precise control
const Fader = ({ value, onChange, color }: { value: number, onChange: (v: number) => void, color: string }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  
  const updateValueFromMouse = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const height = rect.height;
    const bottom = rect.bottom;
    // Calculate 0-1 value based on pixels from bottom
    const rawVal = (bottom - clientY) / height;
    onChange(Math.max(0, Math.min(1, rawVal)));
  }, [onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    updateValueFromMouse(e.clientY);
    
    const handleMouseMove = (mv: MouseEvent) => {
        mv.preventDefault();
        updateValueFromMouse(mv.clientY);
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex-1 w-full flex justify-center py-2 relative group cursor-ns-resize" ref={trackRef} onMouseDown={handleMouseDown}>
       {/* Touch/Click Target (Invisible but wide) */}
       <div className="absolute inset-0 z-10" />

       {/* Visual Track */}
       <div className="w-1.5 h-full bg-[#050505] rounded-full shadow-[inset_0_0_2px_rgba(255,255,255,0.1)] relative overflow-hidden pointer-events-none">
          {/* LED Fill */}
          <div 
            className="absolute bottom-0 left-0 right-0 w-full transition-all duration-75 ease-out"
            style={{ 
                height: `${value * 100}%`,
                backgroundColor: color,
                opacity: 0.6,
                boxShadow: `0 0 10px ${color}`
            }}
          />
       </div>

       {/* Fader Cap */}
       <div 
          className="absolute left-1/2 -translate-x-1/2 w-10 h-5 bg-gradient-to-b from-[#444] to-[#1a1a1a] border border-[#555] rounded shadow-[0_3px_5px_black] pointer-events-none flex items-center justify-center z-20 transition-all group-hover:border-[#888]"
          style={{ bottom: `calc(${value * 100}% - 10px)` }}
       >
          <div className="w-6 h-[2px] bg-black/50" />
          {/* Indicator Light on Cap */}
          <div className="absolute right-1 top-1 w-1 h-1 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }} />
       </div>
    </div>
  );
};

const MixerStrip: React.FC<MixerStripProps> = ({ channelConfigs, onToggleMute, onToggleSolo, onSetVolume }) => {
  const channelCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const masterCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const draw = () => {
      const channelAnalysers = audioEngine.getChannelAnalysers();
      const masterAnalyser = audioEngine.getAnalyser();

      // 1. Draw Channel Scopes
      if (channelAnalysers.length > 0) {
          channelAnalysers.forEach((analyser, i) => {
            const canvas = channelCanvasRefs.current[i];
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = '#080808';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Center Line
            ctx.strokeStyle = '#222';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height/2);
            ctx.lineTo(canvas.width, canvas.height/2);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.strokeStyle = CHANNEL_COLORS[i];
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let j = 0; j < bufferLength; j++) {
              const v = dataArray[j] / 128.0;
              const y = v * (canvas.height / 2);
              if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
              x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
          });
      }

      // 2. Draw Master Visualizer (Spectrum)
      if (masterAnalyser && masterCanvasRef.current) {
          const canvas = masterCanvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              const bufferLength = masterAnalyser.frequencyBinCount;
              const dataArray = new Uint8Array(bufferLength);
              masterAnalyser.getByteFrequencyData(dataArray);

              ctx.fillStyle = '#080808';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              const barWidth = 4;
              const gap = 1;
              const bars = Math.floor(canvas.width / (barWidth + gap));
              
              // Draw Bars
              for (let i = 0; i < bars; i++) {
                // Logarithmic mapping for better visual
                const logIndex = Math.floor(Math.pow(i / bars, 1.5) * (bufferLength * 0.7));
                const value = dataArray[logIndex] || 0;
                
                const percent = value / 255;
                const height = percent * canvas.height;
                
                // Coloring (Green -> Yellow -> Red)
                const hue = 100 + (percent * 60); 
                let color = `hsl(${100 - (percent * 100)}, 70%, 50%)`; // Green to Red
                if (percent < 0.5) color = '#306230';
                else if (percent < 0.8) color = '#8bac0f';
                else color = '#9bbc0f';

                ctx.fillStyle = color;
                ctx.fillRect(i * (barWidth + gap), canvas.height - height, barWidth, height);
              }
          }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#121212] border-l border-[#222]">
      {/* Header */}
      <div className="p-3 border-b border-[#222] bg-[#181818] h-10 flex items-center gap-2 shrink-0">
         <Sliders size={14} className="text-[#9bbc0f]" />
         <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Mixer Console</span>
      </div>

      <div className="flex flex-1 p-4 gap-4 min-h-0 overflow-hidden">
          
          {/* Faders Section (Left) */}
          <div className="flex justify-between gap-2 shrink-0 h-full">
            {[1, 2, 3, 4].map(ch => {
                const config = channelConfigs[ch];
                return (
                <div key={ch} className="flex flex-col items-center gap-2 w-16 bg-[#0a0a0a] border border-[#222] rounded-lg p-1.5 py-2 shadow-inner h-full">
                    
                    {/* Small Scope */}
                    <div className="w-full h-8 bg-black border border-[#222] rounded overflow-hidden shrink-0">
                        <canvas ref={(el) => { channelCanvasRefs.current[ch-1] = el; }} width={64} height={32} className="w-full h-full" />
                    </div>

                    {/* Custom Fader */}
                    <Fader 
                        value={config?.volume ?? 1}
                        onChange={(val) => onSetVolume(ch, val)}
                        color={CHANNEL_COLORS[ch-1]}
                    />

                    {/* Controls */}
                    <div className="flex flex-col gap-1 w-full shrink-0">
                        <button 
                            onClick={() => onToggleMute(ch)}
                            className={`h-5 w-full text-[8px] font-black border rounded flex items-center justify-center transition-all ${config?.mute ? 'bg-red-900/50 border-red-500 text-red-500 shadow-[0_0_8px_rgba(220,38,38,0.4)]' : 'bg-[#1a1a1a] border-[#333] text-gray-600 hover:text-gray-400'}`}
                        >
                            MUTE
                        </button>
                        <button 
                            onClick={() => onToggleSolo(ch)}
                            className={`h-5 w-full text-[8px] font-black border rounded flex items-center justify-center transition-all ${config?.solo ? 'bg-yellow-900/50 border-yellow-500 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'bg-[#1a1a1a] border-[#333] text-gray-600 hover:text-gray-400'}`}
                        >
                            SOLO
                        </button>
                    </div>
                    
                    <div className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-1">{CHANNEL_NAMES[ch-1]}</div>
                </div>
                );
            })}
          </div>

          {/* Master Visualizer Section (Right) */}
          <div className="flex-1 flex flex-col bg-[#0a0a0a] border border-[#222] rounded-lg overflow-hidden relative shadow-inner h-full">
             <div className="absolute top-2 right-2 text-[8px] font-black text-[#444] flex items-center gap-1 z-10 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
                MASTER <Activity size={10}/>
             </div>
             <canvas ref={masterCanvasRef} width={300} height={200} className="w-full h-full opacity-80" />
             
             {/* Grid & Scanlines */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] pointer-events-none bg-[length:100%_2px,3px_100%]" />
             <div className="absolute inset-0 bg-[linear-gradient(transparent_95%,rgba(50,50,50,0.3)_95%),linear-gradient(90deg,transparent_95%,rgba(50,50,50,0.3)_95%)] bg-[length:20px_20px] pointer-events-none opacity-50" />
          </div>

      </div>
    </div>
  );
};

export default MixerStrip;
