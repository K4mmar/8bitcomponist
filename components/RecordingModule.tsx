import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Square, Trash2, X, Play, ChevronRight, Binary, Zap, Eraser, MoveRight, ChevronDown, ChevronUp, Activity, Waves, TrendingUp, Music, Settings2, Volume2, TrendingDown } from 'lucide-react';
import { MUSICAL_KEYS, PITCH_TO_FREQ, TrackerRow, KEYBOARD_MAP } from '../types';
import { audioEngine } from '../services/audioEngine';

interface RecordingModuleProps {
  bpm: number;
  onCommit: (rows: TrackerRow[]) => void;
  onClose: () => void;
  channelNum: number;
  latencyOverride?: number;
}

type RecMode = 'LIVE' | 'STEP';
type RecEffect = "NONE" | "SLIDE" | "VIBRATO" | "ARPEGGIO";

interface RecordedStep extends Partial<TrackerRow> {
  pitch: string;
}

const WaveformIcon: React.FC<{ type: string, active: boolean }> = ({ type, active }) => {
    return (
        <svg viewBox="0 0 40 20" className={`w-12 h-6 ${active ? 'text-[#9bbc0f]' : 'text-gray-700'}`} fill="none" stroke="currentColor" strokeWidth="2" style={{ imageRendering: 'pixelated' }}>
            {type === 'TRIANGLE' && <path d="M0 20 L5 15 L10 10 L15 5 L20 0 L25 5 L30 10 L35 15 L40 20" strokeLinecap="square" />}
            {type === 'SAW' && <path d="M0 20 L10 15 L20 10 L30 5 L40 0 V20" strokeLinecap="square" />}
            {type === 'SQUARE' && <path d="M0 20 V0 H20 V20 H40" strokeLinecap="square" />}
        </svg>
    );
};

const RecordingModule: React.FC<RecordingModuleProps> = ({ bpm: projectBpm, onCommit, onClose, channelNum, latencyOverride }) => {
  const [mode, setMode] = useState<RecMode>('LIVE');
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<Map<number, RecordedStep>>(new Map());
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [playbackPos, setPlaybackPos] = useState(-1);
  const [stepCursor, setStepCursor] = useState(0);
  const [countdownTick, setCountdownTick] = useState(-1);
  
  // Settings
  const [recVolume, setRecVolume] = useState(12);
  const [recDecay, setRecDecay] = useState(0);
  const [recDuty, setRecDuty] = useState<"0.125" | "0.25" | "0.5">("0.5");
  const [recEffect, setRecEffect] = useState<RecEffect>("NONE");
  const [recArpNotes, setRecArpNotes] = useState("4,7");
  const [stepJump, setStepJump] = useState(1);
  const [recSpeedMult, setRecSpeedMult] = useState(1.0);
  const [latencyMs, setLatencyMs] = useState(() => {
    if (latencyOverride !== undefined) return latencyOverride;
    const saved = localStorage.getItem('vgm_bt_latency');
    return saved ? parseInt(saved) : 150;
  });

  // Effect to sync prop latency if it changes
  useEffect(() => {
    if (latencyOverride !== undefined) {
      setLatencyMs(latencyOverride);
    }
  }, [latencyOverride]);

  const stateRef = useRef({
    mode, stepCursor, isRecording, isCountingDown, recVolume, recDecay, recDuty, recEffect, recArpNotes, stepJump, latencyMs, projectBpm, recSpeedMult
  });

  useEffect(() => {
    stateRef.current = { 
      mode, stepCursor, isRecording, isCountingDown, recVolume, recDecay, recDuty, recEffect, recArpNotes, stepJump, latencyMs, projectBpm, recSpeedMult 
    };
  }, [mode, stepCursor, isRecording, isCountingDown, recVolume, recDecay, recDuty, recEffect, recArpNotes, stepJump, latencyMs, projectBpm, recSpeedMult]);

  const recordedNotesRef = useRef<Map<number, RecordedStep>>(new Map());
  const recordingStartTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const scheduledTicksRef = useRef<OscillatorNode[]>([]);
  
  const lastTickRef = useRef(-1);
  const lastStepRef = useRef(-1);

  const effectiveBpm = projectBpm * recSpeedMult;
  const stepDuration = (60 / effectiveBpm) / 4;
  const beatDuration = stepDuration * 4;

  const playTick = useCallback((time: number, isHigh: boolean) => {
    if (!audioEngine.ctx) return;
    const osc = audioEngine.ctx.createOscillator();
    const gain = audioEngine.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isHigh ? 1600 : 800, time);
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(audioEngine.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
    scheduledTicksRef.current.push(osc);
  }, []);

  const playNotePreview = useCallback((pitch: string) => {
    const s = stateRef.current;
    const freq = PITCH_TO_FREQ[pitch];
    if (freq) {
      audioEngine.resume();
      let arpArray: number[] | undefined = undefined;
      if (s.recEffect === 'ARPEGGIO') {
        arpArray = s.recArpNotes.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      }

      audioEngine.playNote({
        frequency: freq,
        duration: 0.2,
        time: 0,
        channel: channelNum as any,
        volume: s.recVolume / 15,
        dutyCycle: parseFloat(s.recDuty) as any,
        decay: s.recDecay,
        arpeggio: arpArray,
        vibrato: s.recEffect === 'VIBRATO' ? 6 : undefined,
        slide: s.recEffect === 'SLIDE' ? freq * 1.5 : undefined 
      }, audioEngine.ctx!.currentTime);
    }
  }, [channelNum]);

  const stopRecording = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setIsRecording(false);
    setIsCountingDown(false);
    setCountdownTick(-1);
    setPlaybackPos(-1);
    lastTickRef.current = -1;
    lastStepRef.current = -1;
    recordingStartTimeRef.current = null;
    scheduledTicksRef.current.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch(e) {} });
    scheduledTicksRef.current = [];
  }, []);

  const startLiveRecording = useCallback(() => {
    audioEngine.resume();
    if (!audioEngine.ctx) return;
    const s = stateRef.current;
    const now = audioEngine.ctx.currentTime;
    const effBpm = s.projectBpm * s.recSpeedMult;
    const sDur = (60 / effBpm) / 4;
    const bDur = sDur * 4;
    const preRoll = 4 * bDur;
    const startTime = now + 0.1;
    const recordingStart = startTime + preRoll;
    
    recordingStartTimeRef.current = recordingStart;
    setIsCountingDown(true);
    setRecordedNotes(new Map());
    recordedNotesRef.current = new Map();
    lastTickRef.current = -1;
    lastStepRef.current = -1;

    for (let i = 0; i < 4; i++) playTick(startTime + (i * bDur), i === 0);
    for (let i = 0; i < 16; i++) playTick(recordingStart + (i * bDur), i % 4 === 0);

    const updateLoop = () => {
      if (!audioEngine.ctx) return;
      const cur = audioEngine.ctx.currentTime;
      if (cur < recordingStart) {
        const elapsed = cur - startTime;
        const tick = Math.floor(elapsed / bDur);
        if (tick !== lastTickRef.current) { lastTickRef.current = tick; setCountdownTick(tick); }
      } else {
        setIsRecording(prev => { if (!prev) return true; return prev; });
        setIsCountingDown(false);
        const elapsed = cur - recordingStart;
        const currentStepIdx = Math.floor(elapsed / sDur);
        if (currentStepIdx >= 64) { stopRecording(); return; }
        if (currentStepIdx !== lastStepRef.current) { lastStepRef.current = currentStepIdx; setPlaybackPos(currentStepIdx); }
      }
      rafRef.current = requestAnimationFrame(updateLoop);
    };
    rafRef.current = requestAnimationFrame(updateLoop);
  }, [playTick, stopRecording]);

  const handleNoteIn = useCallback((pitch: string) => {
    
    // --- HARDWARE RESTRICTIONS (KEYBOARD INPUT) ---
    if (channelNum === 4 && !pitch.startsWith('C-')) return;
    if (channelNum === 3) {
        const octave = parseInt(pitch.slice(-1));
        if (octave > 6) return;
    }
    // ---------------------------------------------

    const s = stateRef.current;
    playNotePreview(pitch);
    setActiveKeys(prev => new Set(prev).add(pitch));

    const stepData: RecordedStep = {
      pitch,
      volume: s.recVolume,
      decay: s.recDecay,
      dutyCycle: s.recDuty,
      effect: s.recEffect,
      arpNotes: s.recEffect === 'ARPEGGIO' ? s.recArpNotes : undefined,
      instrument: channelNum === 3 ? "SUB" : (channelNum === 4 ? "KICK" : "LEAD"),
    };

    if (s.mode === 'STEP') {
      recordedNotesRef.current.set(s.stepCursor, stepData);
      setRecordedNotes(new Map(recordedNotesRef.current));
      setStepCursor(prev => (prev + s.stepJump) % 64);
      return;
    }

    if ((s.isRecording || s.isCountingDown) && recordingStartTimeRef.current !== null && audioEngine.ctx) {
      const compensation = s.latencyMs / 1000;
      const elapsed = (audioEngine.ctx.currentTime - recordingStartTimeRef.current) - compensation;
      const effBpm = s.projectBpm * s.recSpeedMult;
      const sDur = (60 / effBpm) / 4;
      const step = Math.floor((elapsed + 0.120) / sDur);
      
      if (step >= 0 && step < 64) {
        recordedNotesRef.current.set(step, stepData);
        setRecordedNotes(new Map(recordedNotesRef.current));
      }
    }
  }, [playNotePreview, channelNum]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.repeat) return;

      const pitch = MUSICAL_KEYS[e.key.toLowerCase()];
      if (pitch) {
        e.preventDefault();
        handleNoteIn(pitch);
        return;
      }

      const s = stateRef.current;
      if (s.mode === 'STEP') {
        if (e.key === 'ArrowRight') { e.preventDefault(); setStepCursor(prev => (prev + 1) % 64); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); setStepCursor(prev => (prev - 1 + 64) % 64); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setStepCursor(prev => (prev + 8) % 64); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setStepCursor(prev => (prev - 8 + 64) % 64); return; }
        if (e.key === 'Tab' || e.key === 'Enter') { 
          e.preventDefault(); 
          setStepCursor(prev => (prev + s.stepJump) % 64); 
          return; 
        }
        if (e.key === KEYBOARD_MAP.SILENCE || e.key === KEYBOARD_MAP.CLEAR || e.key === KEYBOARD_MAP.CLEAR_BACKSPACE) {
           e.preventDefault();
           recordedNotesRef.current.delete(s.stepCursor);
           setRecordedNotes(new Map(recordedNotesRef.current));
           setStepCursor(prev => (prev + s.stepJump) % 64);
           return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (s.mode === 'LIVE') {
          if (s.isRecording || s.isCountingDown) stopRecording();
          else startLiveRecording();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const pitch = MUSICAL_KEYS[e.key.toLowerCase()];
      if (pitch) {
        setActiveKeys(prev => {
          const next = new Set(prev);
          next.delete(pitch);
          return next;
        });
      }
    };

    const onBlur = () => setActiveKeys(new Set());

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      stopRecording();
    };
  }, [handleNoteIn, startLiveRecording, stopRecording]);

  const handleCommit = () => {
    const fullRows: TrackerRow[] = [];
    for (let i = 0; i < 64; i++) {
      const data = recordedNotes.get(i);
      if (data) {
        const rowData = { ...data, step: i } as TrackerRow;
        if (rowData.effect === 'SLIDE') {
          const octave = parseInt(rowData.pitch.slice(-1)) || 4;
          const note = rowData.pitch.slice(0, 2);
          rowData.slide = `${note}${Math.min(octave + 1, 7)}`;
        }
        fullRows.push(rowData);
      } else {
        fullRows.push({ 
          step: i, pitch: '---', instrument: '---', volume: 0, dutyCycle: "0.5" 
        } as TrackerRow);
      }
    }
    onCommit(fullRows);
    onClose();
  };

  const whiteKeys = ['C-4', 'D-4', 'E-4', 'F-4', 'G-4', 'A-4', 'B-4', 'C-5', 'D-5', 'E-5', 'F-5', 'G-5', 'A-5', 'B-5', 'C-6'];

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-[#0f0f0f] border-4 border-[#2a2a2a] w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1)] flex flex-col relative h-[92vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#222] flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-5">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_20px_red]' : (isCountingDown ? 'bg-yellow-500 shadow-[0_0_15px_yellow]' : 'bg-gray-800')}`} />
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Binary size={18} className="text-[#9bbc0f]" /> 
                OPNAME MODULE <span className="text-[#9bbc0f]/50">KANAAL {channelNum}</span>
              </h2>
              <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">
                Huidige BPM: <span className="text-white">{Math.round(effectiveBpm)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex bg-black p-1 rounded-xl border border-[#333]">
            <button onClick={() => setMode('LIVE')} className={`px-8 py-2 text-[10px] font-black rounded-lg transition-all ${mode === 'LIVE' ? 'bg-[#9bbc0f] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>LIVE OPN</button>
            <button onClick={() => setMode('STEP')} className={`px-8 py-2 text-[10px] font-black rounded-lg transition-all ${mode === 'STEP' ? 'bg-[#9bbc0f] text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}>STAP BEW</button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-all hover:rotate-90 duration-300"><X size={26} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Dynamische Hardware Config */}
          <div className="w-72 border-r border-[#222] p-6 space-y-8 bg-black/40 overflow-y-auto custom-scrollbar">
             
             {/* HARDWARE ENGINE CONFIG (Matches CellEditorMenu) */}
             <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                   <Settings2 size={14} className="text-blue-400" />
                   <label className="text-[10px] text-white font-black uppercase tracking-widest block">Hardware Config</label>
                </div>

                <div className="space-y-5">
                   {/* PULSE OPTIONS (CH 1 & 2) */}
                   {(channelNum === 1 || channelNum === 2) && (
                      <div className="space-y-3">
                         <label className="text-[9px] text-gray-600 font-black uppercase italic">Duty Cycle (Klankkleur)</label>
                         <div className="flex gap-1.5">
                            {["0.125", "0.25", "0.5"].map(d => (
                               <button 
                                  key={d} 
                                  onClick={() => setRecDuty(d as any)}
                                  className={`flex-1 py-3 text-[10px] font-black rounded-lg border transition-all ${recDuty === d ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-lg' : 'bg-black border-[#222] text-gray-600 hover:text-white'}`}
                               >
                                  {(parseFloat(d)*100).toFixed(1)}%
                               </button>
                            ))}
                         </div>
                      </div>
                   )}

                   {/* WAVE RAM OPTIONS (CH 3) */}
                   {channelNum === 3 && (
                      <div className="space-y-3">
                         <label className="text-[9px] text-gray-600 font-black uppercase italic">WAVEFORM (GOLFVORM)</label>
                         <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "0.125", name: "TRIANGLE", icon: "TRIANGLE" },
                              { id: "0.25", name: "SAWTOOTH", icon: "SAW" },
                              { id: "0.5", name: "SQUARE", icon: "SQUARE" }
                            ].map(w => (
                              <button 
                                 key={w.id}
                                 onClick={() => setRecDuty(w.id as any)}
                                 className={`p-3 rounded-xl border flex flex-col items-center gap-3 transition-all ${recDuty === w.id ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-lg' : 'bg-black border-[#222] text-gray-500 hover:text-white'}`}
                              >
                                 <WaveformIcon type={w.icon} active={recDuty === w.id} />
                                 <span className="text-[8px] font-black">{w.name}</span>
                              </button>
                            ))}
                         </div>
                      </div>
                   )}

                   {/* NOISE LFSR OPTIONS (CH 4) */}
                   {channelNum === 4 && (
                      <div className="space-y-3">
                         <label className="text-[9px] text-gray-600 font-black uppercase italic">LFSR Counter Mode</label>
                         <div className="flex flex-col gap-2">
                            <button 
                               onClick={() => setRecDuty("0.5")}
                               className={`w-full py-3 text-[10px] font-black rounded-lg border transition-all ${recDuty !== "0.125" ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-lg' : 'bg-black border-[#222] text-gray-600'}`}
                            >
                               ZACHT (15-bit)
                            </button>
                            <button 
                               onClick={() => setRecDuty("0.125")}
                               className={`w-full py-3 text-[10px] font-black rounded-lg border transition-all ${recDuty === "0.125" ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-lg' : 'bg-black border-[#222] text-gray-600'}`}
                            >
                               METAAL (7-bit)
                            </button>
                         </div>
                      </div>
                   )}

                   {/* Common Envelopes */}
                   <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black italic"><span className="text-gray-400 flex items-center gap-1"><Volume2 size={12} className="text-[#ffcc00]"/> START VOL</span><span className="text-[#ffcc00]">{recVolume.toString(16).toUpperCase()}</span></div>
                        <input type="range" min="0" max="15" value={recVolume} onChange={e => setRecVolume(parseInt(e.target.value))} className="w-full h-1.5 bg-[#1a1a1a] accent-[#ffcc00] appearance-none rounded-full" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black italic"><span className="text-gray-400 flex items-center gap-1"><TrendingDown size={12} className="text-red-500"/> VERVAL</span><span className="text-red-500">{recDecay.toString(16).toUpperCase()}</span></div>
                        <input type="range" min="0" max="15" value={recDecay} onChange={e => setRecDecay(parseInt(e.target.value))} className="w-full h-1.5 bg-[#1a1a1a] accent-red-500 appearance-none rounded-full" />
                      </div>
                   </div>
                </div>
             </div>

             {/* FX ENGINE BLOCK (Identiek aan CellEditorMenu) */}
             <div className="space-y-4 p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
                <label className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-2">
                  <Waves size={14} /> FX ENGINE
                </label>
                <div className="grid grid-cols-2 gap-2">
                   {[
                     { id: 'NONE', label: 'GEEN', icon: <Zap size={12}/>, disabled: false },
                     { id: 'SLIDE', label: 'SLIDE', icon: <TrendingUp size={12}/>, disabled: channelNum !== 1 },
                     { id: 'VIBRATO', label: 'VIBRA', icon: <Activity size={12}/>, disabled: channelNum === 4 },
                     { id: 'ARPEGGIO', label: 'ARP', icon: <Music size={12}/>, disabled: channelNum === 4 },
                   ].map(fx => (
                     <button 
                        key={fx.id}
                        disabled={fx.disabled}
                        onClick={() => setRecEffect(fx.id as RecEffect)}
                        className={`py-3 px-2 text-[9px] font-black rounded-lg border flex items-center justify-center gap-2 transition-all 
                          ${fx.disabled ? 'opacity-10 grayscale cursor-not-allowed border-dashed border-[#333]' : ''}
                          ${recEffect === fx.id ? 'bg-purple-500 border-purple-500 text-black shadow-lg' : 'bg-black border-[#222] text-gray-500 hover:text-white'}`}
                     >
                       {fx.icon} {fx.label}
                     </button>
                   ))}
                </div>
                
                {recEffect === 'ARPEGGIO' && (
                  <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                     <label className="text-[8px] text-purple-300/60 font-black uppercase">Intervallen (bv 4,7)</label>
                     <input 
                       type="text" 
                       value={recArpNotes}
                       onChange={e => setRecArpNotes(e.target.value)}
                       className="w-full bg-black border border-purple-500/30 rounded-lg p-2 text-xs font-mono text-white outline-none focus:border-purple-500"
                       placeholder="4,7"
                     />
                  </div>
                )}
             </div>

             {/* Step Jump Settings */}
             {mode === 'STEP' && (
               <div className="space-y-4 p-4 bg-[#9bbc0f]/5 border border-[#9bbc0f]/20 rounded-2xl">
                 <label className="text-[10px] text-[#9bbc0f] font-black uppercase tracking-widest flex items-center gap-2">
                   <MoveRight size={14} /> SPRONG
                 </label>
                 <div className="grid grid-cols-4 gap-1">
                   {[1, 2, 4, 8].map(j => (
                     <button key={j} onClick={() => setStepJump(j)} className={`py-2 text-[10px] font-black rounded-lg border transition-all ${stepJump === j ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-md' : 'bg-black border-[#222] text-gray-500'}`}>{j}</button>
                   ))}
                 </div>
               </div>
             )}
          </div>

          {/* Grid Area */}
          <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
             <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
                <div className="grid grid-cols-8 gap-4 relative z-20">
                   {[...Array(64)].map((_, i) => {
                      const data = recordedNotes.get(i);
                      const isCurrent = (mode === 'LIVE' ? playbackPos : stepCursor) === i;
                      const isBeat = i % 4 === 0;
                      
                      return (
                        <div 
                          key={i} 
                          onClick={() => mode === 'STEP' && setStepCursor(i)}
                          className={`h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative
                            ${isCurrent ? 'border-[#9bbc0f] shadow-[0_0_20px_rgba(155,188,15,0.4)] z-30 scale-110 bg-[#9bbc0f]/10' : 'border-[#1a1a1a]'}
                            ${data ? 'bg-[#9bbc0f] border-[#9bbc0f]' : 'hover:bg-white/[0.04]'}
                            ${isBeat && !data && !isCurrent ? 'bg-white/[0.02]' : ''}
                          `}
                        >
                           <span className={`text-[10px] font-black ${data ? 'text-black' : (isCurrent ? 'text-[#9bbc0f]' : 'text-gray-800')}`}>
                             {data?.pitch || (i + 1).toString().padStart(2, '0')}
                           </span>
                           {data?.effect && data.effect !== 'NONE' && (
                             <div className="absolute top-1 right-1">
                               {data.effect === 'ARPEGGIO' && <Music size={8} className="text-black/60" />}
                               {data.effect === 'VIBRATO' && <Activity size={8} className="text-black/60" />}
                               {data.effect === 'SLIDE' && <TrendingUp size={8} className="text-black/60" />}
                             </div>
                           )}
                        </div>
                      );
                   })}
                </div>
             </div>
             
             {/* Virtual Piano */}
             <div className="h-48 bg-[#080808] border-t border-[#222] flex flex-col items-center justify-center p-4 gap-4">
                <div className="flex justify-center gap-1.5 w-full h-24">
                  {whiteKeys.map(k => (
                    <div 
                      key={k} 
                      onMouseDown={(e) => { e.preventDefault(); handleNoteIn(k); }}
                      onMouseUp={() => setActiveKeys(prev => { const n = new Set(prev); n.delete(k); return n; })}
                      onMouseLeave={() => setActiveKeys(prev => { const n = new Set(prev); n.delete(k); return n; })}
                      className={`w-12 rounded-b-2xl border-x border-b border-black flex items-end justify-center pb-4 transition-all cursor-pointer active:scale-95 shadow-xl ${activeKeys.has(k) ? 'bg-[#9bbc0f] translate-y-2 h-24' : 'bg-white h-20 hover:bg-gray-100'}`}
                    >
                       <span className="text-[8px] text-black/30 font-black tracking-tighter">{k}</span>
                    </div>
                  ))}
                </div>
                {mode === 'STEP' && (
                  <div className="flex gap-4">
                    <button onClick={() => setStepCursor(prev => (prev + stepJump) % 64)} className="px-6 py-2 bg-[#222] border border-[#333] text-white rounded-lg text-[9px] font-black flex items-center gap-2 hover:bg-[#333] transition-all uppercase tracking-widest"><MoveRight size={14} /> SLA OVER ({stepJump})</button>
                    <button onClick={() => { recordedNotesRef.current.delete(stepCursor); setRecordedNotes(new Map(recordedNotesRef.current)); setStepCursor(prev => (prev + stepJump) % 64); }} className="px-6 py-2 bg-red-900/20 border border-red-500/30 text-red-500 rounded-lg text-[9px] font-black flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all uppercase tracking-widest"><Eraser size={14} /> WIS + SPRONG</button>
                    <div className="flex bg-black border border-[#222] rounded-lg overflow-hidden">
                       <button onClick={() => setStepCursor(prev => (prev - 1 + 64) % 64)} className="p-2 hover:bg-white/10 text-gray-400"><ChevronUp size={14}/></button>
                       <button onClick={() => setStepCursor(prev => (prev + 1) % 64)} className="p-2 hover:bg-white/10 text-gray-400 border-l border-[#222]"><ChevronDown size={14}/></button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-black/80 border-t border-[#222] flex justify-between items-center">
           <div className="flex gap-4">
              {mode === 'LIVE' && (
                <button 
                  onClick={() => isRecording || isCountingDown ? stopRecording() : startLiveRecording()} 
                  className={`px-16 py-6 rounded-2xl font-black text-sm flex items-center gap-5 transition-all transform active:scale-95 shadow-2xl tracking-[0.2em] ${isRecording || isCountingDown ? 'bg-white text-black' : 'bg-red-600 text-white hover:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.4)]'}`}
                >
                   {isRecording || isCountingDown ? <Square size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
                   {isCountingDown ? `WACHT... ${4 - countdownTick}` : (isRecording ? 'STOP' : 'START OPNAME')}
                </button>
              )}
           </div>
           
           <div className="flex items-center gap-8">
              <button 
                disabled={recordedNotes.size === 0 || isRecording || isCountingDown}
                onClick={handleCommit}
                className="px-16 py-6 bg-[#9bbc0f] text-black font-black rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.3)] hover:translate-y-[-2px] hover:shadow-[0_12px_0_rgba(0,0,0,0.3)] disabled:opacity-10 transition-all flex items-center gap-5 text-sm tracking-widest border-2 border-black/10"
              >
                OPSLAAN & OVERSCHRIJVEN <ChevronRight size={24} strokeWidth={3} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingModule;