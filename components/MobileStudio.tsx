
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Download, Upload, Sparkles, ChevronLeft, Terminal, Pause, SkipBack, Smartphone, Activity, Repeat, Music2, Gauge } from 'lucide-react';
import { CompositionSettings, Pattern } from '../types';
import { audioEngine } from '../services/audioEngine';

interface MobileStudioProps {
  isNativeMobile: boolean; // New prop to detect if we are truly on mobile
  onBack: () => void;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPause: () => void;
  onCompose: (settings: CompositionSettings) => void;
  isComposing: boolean;
  currentSongName: string;
  onSave: (name: string) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNewProject: () => void;
  aiSettings: CompositionSettings;
  onAiSettingsChange: (s: CompositionSettings) => void;
  bpm: number;
  patterns: Pattern[];
  arrangement: string[];
  currentArrIdx: number;
  streamingLog: string;
  onToggleMobileMode: (enable: boolean) => void;
}

type MobileView = 'HOME' | 'SETUP_AI' | 'GENERATING' | 'PLAYER';

const MobileStudio: React.FC<MobileStudioProps> = (props) => {
  const [view, setView] = useState<MobileView>('HOME');
  const [projectName, setProjectName] = useState(props.currentSongName);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-switch to GENERATING view when composing starts
  useEffect(() => {
      if (props.isComposing) {
          setView('GENERATING');
      } else if (view === 'GENERATING' && !props.isComposing) {
          // Finished composing
          setView('PLAYER');
      }
  }, [props.isComposing]);

  // Auto-scroll timeline in Player
  useEffect(() => {
      if (view === 'PLAYER' && timelineRef.current) {
          const activeEl = timelineRef.current.children[props.currentArrIdx] as HTMLElement;
          if (activeEl) {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
      }
  }, [props.currentArrIdx, view]);

  // Auto-scroll log in Generator
  useEffect(() => {
      if (view === 'GENERATING' && logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
      }
  }, [props.streamingLog, view]);

  // Visualizer Loop
  useEffect(() => {
    if (view !== 'PLAYER') return;

    const draw = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const analyser = audioEngine.getAnalyser();
        const bufferLength = analyser?.frequencyBinCount || 128;
        const dataArray = new Uint8Array(bufferLength);
        
        if (analyser) analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = '#0f380f';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const barWidth = (canvasRef.current.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvasRef.current.height;
            ctx.fillStyle = barHeight > canvasRef.current.height * 0.7 ? '#9bbc0f' : '#8bac0f';
            ctx.fillRect(x, canvasRef.current.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < canvasRef.current.height; i += 2) {
            ctx.fillRect(0, i, canvasRef.current.width, 1);
        }

        animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [view]);

  // --- SUB-VIEWS ---

  const renderHome = () => (
      <div className="flex flex-col h-full bg-[#080808] p-6 justify-center space-y-6">
          <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Pocket Studio</h1>
              <p className="text-[#9bbc0f] text-xs font-bold uppercase tracking-[0.4em]">VGM Architect Mobile</p>
          </div>

          <div className="space-y-4">
              {props.arrangement.length > 0 && (
                  <button onClick={() => setView('PLAYER')} className="w-full py-5 bg-[#9bbc0f] text-black rounded-xl font-black uppercase shadow-lg flex items-center justify-center gap-3">
                      <Play size={20} fill="black" /> Verder Spelen
                  </button>
              )}
              
              <button onClick={() => setView('SETUP_AI')} className="w-full py-5 bg-[#222] border border-[#333] text-white rounded-xl font-black uppercase shadow-lg flex items-center justify-center gap-3">
                  <Sparkles size={20} className="text-amber-500" /> Nieuw met AI
              </button>

              <button onClick={() => fileInputRef.current?.click()} className="w-full py-5 bg-[#222] border border-[#333] text-gray-300 rounded-xl font-black uppercase shadow-lg flex items-center justify-center gap-3">
                  <Upload size={20} /> Importeren
              </button>

              <button onClick={props.onExport} className="w-full py-5 bg-[#222] border border-[#333] text-gray-300 rounded-xl font-black uppercase shadow-lg flex items-center justify-center gap-3">
                  <Download size={20} /> Downloaden
              </button>

              {/* ONLY SHOW DESKTOP SWITCH IF NOT NATIVE MOBILE */}
              {!props.isNativeMobile && (
                  <button onClick={() => props.onToggleMobileMode(false)} className="w-full py-4 bg-[#111] border border-[#222] text-gray-500 hover:text-white rounded-xl font-bold uppercase text-xs flex items-center justify-center gap-3 mt-4">
                      <Smartphone size={16} /> Desktop Modus
                  </button>
              )}
          </div>
      </div>
  );

  const renderAiSetup = () => (
      <div className="flex flex-col h-full bg-[#080808] overflow-y-auto custom-scrollbar">
          <div className="p-6 sticky top-0 bg-[#080808] z-20 border-b border-[#222]">
            <button onClick={() => setView('HOME')} className="flex items-center gap-2 text-gray-500 font-bold uppercase text-xs mb-4"><ChevronLeft size={16}/> Terug</button>
            <h2 className="text-2xl font-black text-white uppercase flex items-center gap-3"><Sparkles className="text-amber-500"/> Componist</h2>
          </div>
          
          <div className="p-6 space-y-8 pb-32">
              
              {/* STRUCTUUR */}
              <div className="space-y-3">
                  <label className="text-xs font-black text-[#9bbc0f] uppercase tracking-widest flex items-center gap-2"><Repeat size={14}/> Structuur</label>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => props.onAiSettingsChange({...props.aiSettings, structure: 'LOOP_SHORT'})}
                        className={`p-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.structure === 'LOOP_SHORT' ? 'bg-[#222] border-[#9bbc0f] text-white shadow-[0_0_15px_rgba(155,188,15,0.2)]' : 'bg-[#111] border-[#333] text-gray-500'}`}
                      >
                        <div className="text-[10px] opacity-70 mb-1">KORT</div>
                        Simple Loop
                      </button>
                      <button 
                        onClick={() => props.onAiSettingsChange({...props.aiSettings, structure: 'SONG_FULL'})}
                        className={`p-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.structure === 'SONG_FULL' ? 'bg-[#222] border-[#9bbc0f] text-white shadow-[0_0_15px_rgba(155,188,15,0.2)]' : 'bg-[#111] border-[#333] text-gray-500'}`}
                      >
                        <div className="text-[10px] opacity-70 mb-1">LANG</div>
                        Volledig Lied
                      </button>
                  </div>
              </div>

              {/* TOONSOORT */}
              <div className="space-y-3">
                  <label className="text-xs font-black text-[#9bbc0f] uppercase tracking-widest flex items-center gap-2"><Music2 size={14}/> Toonsoort</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                      {[
                          { id: 'MAJOR', label: 'Majeur', desc: 'Vrolijk' },
                          { id: 'MINOR', label: 'Mineur', desc: 'Droevig' },
                          { id: 'MODAL_DARK', label: 'Duister', desc: 'Spannend' },
                      ].map(t => (
                          <button 
                            key={t.id} 
                            onClick={() => props.onAiSettingsChange({...props.aiSettings, tonality: t.id as any})}
                            className={`flex-1 min-w-[90px] p-3 text-xs font-bold uppercase rounded-lg border transition-all ${props.aiSettings.tonality === t.id ? 'bg-white text-black border-white' : 'bg-[#111] border-[#333] text-gray-500'}`}
                          >
                              {t.label}
                              <div className="text-[8px] font-normal mt-1 opacity-70">{t.desc}</div>
                          </button>
                      ))}
                  </div>
              </div>

              {/* GENRE */}
              <div className="space-y-3">
                  <label className="text-xs font-black text-[#9bbc0f] uppercase tracking-widest flex items-center gap-2"><Activity size={14}/> Genre</label>
                  <div className="grid grid-cols-2 gap-3">
                      {['ACTION', 'RPG', 'HORROR', 'RACING'].map(g => (
                          <button key={g} onClick={() => props.onAiSettingsChange({...props.aiSettings, genre: g as any})} className={`py-4 text-xs font-black uppercase rounded-lg border transition-all ${props.aiSettings.genre === g ? 'bg-[#9bbc0f] text-black border-[#9bbc0f]' : 'bg-[#111] border-[#333] text-gray-500'}`}>{g}</button>
                      ))}
                  </div>
              </div>

              {/* SFEER */}
              <div className="space-y-3">
                  <label className="text-xs font-black text-[#9bbc0f] uppercase tracking-widest">Sfeer</label>
                  <select 
                      value={props.aiSettings.emotion}
                      onChange={(e) => props.onAiSettingsChange({...props.aiSettings, emotion: e.target.value as any})}
                      className="w-full bg-[#111] border border-[#333] text-white p-4 rounded-lg text-sm font-bold outline-none appearance-none focus:border-[#9bbc0f]"
                  >
                      <option value="HEROIC">Heroïsch (Dapper)</option>
                      <option value="TENSE">Spannend (Gevaar)</option>
                      <option value="SAD">Melancholisch (Verdriet)</option>
                      <option value="HAPPY">Vrolijk (Blij)</option>
                      <option value="AGGRESSIVE">Agressief (Gevecht)</option>
                  </select>
              </div>

              {/* GENERATE BUTTON */}
              <button onClick={() => props.onCompose(props.aiSettings)} className="w-full py-5 bg-amber-500 text-black rounded-xl font-black uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)] mt-4 text-sm tracking-widest hover:scale-[1.02] transition-transform">
                  Genereer Muziek
              </button>
          </div>
      </div>
  );

  const renderGenerating = () => (
      <div className="flex flex-col h-full bg-black p-4 font-mono">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#333]">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"/>
              <span className="text-amber-500 font-bold uppercase text-xs tracking-widest">AI Architect Bezig...</span>
          </div>
          
          <div className="flex-1 bg-[#080808] border border-[#222] rounded-lg p-4 overflow-y-auto text-[10px] text-[#9bbc0f] leading-relaxed relative" ref={logRef}>
               <div className="absolute top-2 right-2 opacity-20"><Terminal size={24}/></div>
               <pre className="whitespace-pre-wrap font-mono">{props.streamingLog || "Initialiseren..."}</pre>
               <div className="w-2 h-4 bg-[#9bbc0f] inline-block animate-pulse ml-1"/>
          </div>
      </div>
  );

  const renderPlayer = () => (
      <div className="flex flex-col h-full bg-[#080808] relative">
          {/* Header */}
          <div className="h-16 border-b border-[#222] flex items-center justify-between px-4 bg-[#111] shrink-0">
              <button onClick={() => { props.onStop(); setView('HOME'); }} className="p-2 -ml-2 text-gray-500 hover:text-white"><ChevronLeft/></button>
              <div className="text-center">
                  <div className="text-[10px] text-[#9bbc0f] font-black uppercase tracking-widest">SPELER</div>
                  <div className="text-xs font-bold text-white truncate max-w-[200px]">{projectName}</div>
              </div>
              <div className="w-8" /> {/* Spacer for balance */}
          </div>

          {/* Visualizer Area */}
          <div className="flex-1 p-6 flex flex-col justify-center items-center relative min-h-0">
              <div className="w-full aspect-[4/3] max-h-[30vh] bg-[#0f380f] rounded-lg border-4 border-[#306230] shadow-[0_0_50px_rgba(155,188,15,0.1)] relative overflow-hidden mb-6">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none z-10" />
                  <canvas ref={canvasRef} width={300} height={200} className="w-full h-full opacity-80" />
                  <div className="absolute bottom-2 right-3 z-20 text-[8px] font-black text-[#8bac0f] font-mono">BPM {props.bpm}</div>
              </div>
          </div>

          {/* Timeline & Controls (Bottom) */}
          <div className="bg-[#111] border-t border-[#222] pb-8">
              
              {/* Timeline Strip */}
              <div className="h-16 border-b border-[#222] bg-[#0c0c0c] flex items-center overflow-x-auto no-scrollbar px-4 gap-2 snap-x" ref={timelineRef}>
                  {props.arrangement.map((patId, idx) => {
                      const isActive = idx === props.currentArrIdx;
                      const patName = props.patterns.find(p => p.id === patId)?.name || "???";
                      return (
                          <div 
                            key={idx} 
                            className={`shrink-0 w-24 h-10 rounded border flex items-center justify-center text-[9px] font-bold uppercase transition-all snap-center
                                ${isActive ? 'bg-[#9bbc0f] text-black border-[#9bbc0f] scale-105 shadow-lg' : 'bg-[#1a1a1a] text-gray-600 border-[#333]'}
                            `}
                          >
                              {patName}
                          </div>
                      );
                  })}
              </div>

              {/* Transport */}
              <div className="flex items-center justify-center gap-8 pt-6">
                  <button onClick={() => props.onStop()} className="p-4 rounded-full bg-[#1a1a1a] text-gray-500 border border-[#333] active:bg-[#222] active:text-white transition-all">
                      <SkipBack size={20} fill="currentColor" />
                  </button>

                  <button 
                      onClick={props.isPlaying ? props.onPause : props.onPlay}
                      className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border-4 
                          ${props.isPlaying 
                              ? 'bg-[#222] border-amber-500/50 text-amber-500' 
                              : 'bg-[#9bbc0f] border-[#8bac0f] text-[#0f380f] shadow-[0_0_30px_rgba(155,188,15,0.4)]'}
                      `}
                  >
                      {props.isPlaying ? <Pause size={32} fill="currentColor"/> : <Play size={32} fill="currentColor" className="ml-1"/>}
                  </button>

                  <button onClick={() => { props.onStop(); }} className="p-4 rounded-full bg-[#1a1a1a] text-red-900 border border-[#333] active:bg-[#222] active:text-red-500 transition-all">
                      <Square size={20} fill="currentColor" />
                  </button>
              </div>
          </div>
      </div>
  );

  // --- RENDER LOGIC ---
  
  // Internal Content (The App)
  const content = (
    <div className="w-full h-full flex flex-col relative bg-[#080808]">
        <input type="file" ref={fileInputRef} onChange={(e) => { props.onImport(e); setView('PLAYER'); }} className="hidden" accept=".json"/>
        
        {view === 'HOME' && renderHome()}
        {view === 'SETUP_AI' && renderAiSetup()}
        {view === 'GENERATING' && renderGenerating()}
        {view === 'PLAYER' && renderPlayer()}
    </div>
  );

  // If we are on a real mobile device, render full screen without frame
  if (props.isNativeMobile) {
      return (
          <div className="fixed inset-0 z-[100] bg-[#080808] text-[#e0e0e0] font-mono touch-none overflow-hidden">
              {content}
          </div>
      );
  }

  // If we are simulating on Desktop, render the Phone Frame
  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex items-center justify-center font-mono touch-none">
        <div className="w-[390px] h-[844px] max-h-[95vh] border-[14px] border-[#1a1a1a] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden bg-[#080808] flex flex-col text-[#e0e0e0]">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1a1a] rounded-b-2xl z-50 pointer-events-none"></div>
            {content}
        </div>
    </div>
  );
};

export default MobileStudio;
