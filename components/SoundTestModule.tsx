
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Square, Music, Volume2, FastForward, Rewind, Disc } from 'lucide-react';
import { PatternClip, TrackerRow, GameBoyPalette } from '../types';
import { PATTERN_LIBRARY } from '../services/sampleLibrary';
import { audioEngine } from '../services/audioEngine';
import { rowToNote } from '../services/trackerUtils';

interface SoundTestModuleProps {
  isOpen: boolean;
  onClose: () => void;
  customClips: PatternClip[];
  bpm: number;
  channelConfigs: any;
}

const SoundTestModule: React.FC<SoundTestModuleProps> = ({ isOpen, onClose, customClips, bpm, channelConfigs }) => {
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChannels, setActiveChannels] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Combineer bibliotheek en custom clips
  const allClips = useMemo(() => {
    return [...customClips, ...PATTERN_LIBRARY].sort((a, b) => a.category.localeCompare(b.category));
  }, [customClips]);

  // Groepeer clips per categorie
  const categories = useMemo(() => {
    const cats: Record<string, PatternClip[]> = {};
    allClips.forEach(clip => {
      if (!cats[clip.category]) cats[clip.category] = [];
      cats[clip.category].push(clip);
    });
    return cats;
  }, [allClips]);

  // Selecteer de eerste clip bij openen
  useEffect(() => {
    if (isOpen && !selectedClipId && allClips.length > 0) {
      setSelectedClipId(allClips[0].id);
    }
  }, [isOpen, allClips, selectedClipId]);

  // Stop audio bij sluiten
  useEffect(() => {
    if (!isOpen) {
      stopClip();
    }
  }, [isOpen]);

  const playClip = () => {
    if (!selectedClipId) return;
    const clip = allClips.find(c => c.id === selectedClipId);
    if (!clip) return;

    audioEngine.resume();
    audioEngine.stopAll();

    const stepDur = (60 / bpm) / 4;
    const notesToPlay: any[] = [];
    const activeChs = new Set<number>();
    
    // Bereken max lengte voor loop
    let maxStep = 0;

    Object.entries(clip.channels).forEach(([chStr, rows]) => {
      const ch = parseInt(chStr) as 1|2|3|4;
      activeChs.add(ch);
      (rows as Partial<TrackerRow>[]).forEach(r => {
        if ((r.step || 0) > maxStep) maxStep = r.step || 0;
        // FIX: Added missing id property
        const fullRow: TrackerRow = { 
            id: `soundtest-${selectedClipId}-${ch}-${r.step}`,
            step: r.step!, 
            pitch: r.pitch || 'C-4', 
            instrument: r.instrument || 'LEAD', 
            volume: r.volume ?? 12, 
            dutyCycle: r.dutyCycle || '0.5', 
            effect: r.effect, 
            arpNotes: r.arpNotes, 
            decay: r.decay,
            panning: r.panning
        };
        const note = rowToNote(fullRow, ch, r.step! * stepDur, stepDur, channelConfigs);
        if (note) notesToPlay.push(note);
      });
    });

    // Visuele feedback
    setActiveChannels(Array.from(activeChs));
    setIsPlaying(true);

    // Audio afspelen (Loop simulatie via simpele herhaling of eenmalig lang genoeg)
    // Voor de demo spelen we hem 2x achter elkaar af om het loop-gevoel te geven
    const loopLen = (maxStep + 1) * stepDur;
    const doubledNotes = [
        ...notesToPlay,
        ...notesToPlay.map(n => ({ ...n, time: n.time + loopLen }))
    ];

    const { endTime } = audioEngine.playTrack(doubledNotes, loopLen * 2);

    // Auto stop visual state
    setTimeout(() => {
        if(isPlaying) setIsPlaying(false);
        setActiveChannels([]);
    }, (loopLen * 2 * 1000));
  };

  const stopClip = () => {
    audioEngine.stopAll();
    setIsPlaying(false);
    setActiveChannels([]);
  };

  const togglePlay = () => {
    if (isPlaying) stopClip();
    else playClip();
  };

  const handleSelect = (id: string) => {
    stopClip();
    setSelectedClipId(id);
  };

  // Simple Visualizer Animation
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const draw = () => {
        if (!ctx) return;
        ctx.fillStyle = '#0f380f';
        ctx.fillRect(0, 0, 300, 100);
        
        ctx.fillStyle = '#9bbc0f';
        const bars = 20;
        const width = 300 / bars;
        
        for(let i=0; i<bars; i++) {
            let height = 5;
            if (isPlaying) {
                // Fake visualizer based on active channels + randomness
                const boost = activeChannels.length > 0 ? 20 : 0;
                height = Math.random() * (30 + boost) + 10;
            }
            ctx.fillRect(i * width + 1, 50 - height/2, width - 2, height);
        }
        
        animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isOpen, isPlaying, activeChannels]);

  if (!isOpen) return null;

  const currentClip = allClips.find(c => c.id === selectedClipId);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#8bac0f] p-1 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,1)] max-w-4xl w-full flex flex-col h-[80vh] border-4 border-[#306230] relative overflow-hidden">
        
        {/* Retro CRT Effect Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />

        {/* Header */}
        <div className="bg-[#306230] p-4 flex justify-between items-center border-b-4 border-[#0f380f] text-[#9bbc0f]">
            <div className="flex items-center gap-3">
                <Music size={24} className="animate-pulse" />
                <h2 className="text-xl font-black uppercase tracking-[0.2em]">SOUND TEST MODE</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[#0f380f] rounded text-[#9bbc0f] transition-colors"><X size={24}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden bg-[#0f380f]">
            {/* Sidebar List */}
            <div className="w-1/3 border-r-4 border-[#306230] flex flex-col bg-[#0f380f] overflow-y-auto custom-scrollbar p-4 gap-6">
                {Object.entries(categories).map(([cat, clips]) => (
                    <div key={cat}>
                        <h3 className="text-[#306230] bg-[#8bac0f] px-2 py-1 text-[10px] font-black uppercase mb-2 rounded">{cat}</h3>
                        <div className="space-y-1">
                            {(clips as PatternClip[]).map(clip => (
                                <button 
                                    key={clip.id}
                                    onClick={() => handleSelect(clip.id)}
                                    className={`w-full text-left px-3 py-2 text-[10px] font-bold font-mono uppercase truncate transition-all border-l-4
                                        ${selectedClipId === clip.id 
                                            ? 'border-[#9bbc0f] bg-[#306230] text-[#9bbc0f] pl-4' 
                                            : 'border-transparent text-[#8bac0f] hover:bg-[#306230]/50'}
                                    `}
                                >
                                    {selectedClipId === clip.id && <span className="mr-2">▶</span>}
                                    {clip.name}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Visualizer Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Visualizer Canvas */}
                <div className="h-40 bg-[#0f380f] flex items-center justify-center border-b-4 border-[#306230] relative">
                    <canvas ref={canvasRef} width={300} height={50} className="w-full h-full opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {isPlaying ? (
                             <div className="flex gap-2">
                                <span className="w-4 h-16 bg-[#9bbc0f] animate-[bounce_0.5s_infinite]" />
                                <span className="w-4 h-16 bg-[#9bbc0f] animate-[bounce_0.6s_infinite]" />
                                <span className="w-4 h-16 bg-[#9bbc0f] animate-[bounce_0.4s_infinite]" />
                             </div>
                        ) : (
                             <span className="text-[#306230] font-black text-4xl uppercase opacity-20">Standby</span>
                        )}
                    </div>
                </div>

                {/* Info Deck */}
                <div className="flex-1 p-8 flex flex-col items-center justify-center gap-6">
                    <div className="text-center space-y-2">
                        <div className="text-[#8bac0f] text-[10px] uppercase font-bold tracking-widest">Geselecteerde Track</div>
                        <div className="text-[#9bbc0f] text-3xl font-black uppercase tracking-tighter drop-shadow-md">
                            {currentClip?.name || "---"}
                        </div>
                        <div className="flex justify-center gap-4 text-[#306230] font-mono text-xs mt-2">
                            <span>ID: {currentClip?.id.substring(0,6).toUpperCase()}</span>
                            <span>LEN: {currentClip ? (Object.values(currentClip.channels) as Partial<TrackerRow>[][])[0]?.length || 0 : 0}</span>
                        </div>
                    </div>

                    {/* Active Channels Indicators */}
                    <div className="flex gap-4">
                        {[1, 2, 3, 4].map(ch => (
                            <div key={ch} className={`w-12 h-16 border-4 rounded flex flex-col items-center justify-end p-1 transition-all duration-100
                                ${activeChannels.includes(ch) ? 'border-[#9bbc0f] bg-[#306230] translate-y-[-4px] shadow-[0_4px_0_rgba(0,0,0,0.5)]' : 'border-[#306230] bg-[#0f380f]'}
                            `}>
                                <div className={`w-full transition-all duration-75 ${activeChannels.includes(ch) ? 'h-full bg-[#9bbc0f]' : 'h-1 bg-[#306230]'}`} />
                                <span className={`text-[10px] font-black mt-1 ${activeChannels.includes(ch) ? 'text-[#9bbc0f]' : 'text-[#306230]'}`}>{ch}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls Footer */}
                <div className="bg-[#306230] p-6 flex justify-center items-center gap-8 border-t-4 border-[#0f380f]">
                    <button onClick={() => { /* Prev Logic */ }} className="text-[#0f380f] hover:text-[#9bbc0f] disabled:opacity-50"><Rewind size={32} fill="currentColor" /></button>
                    
                    <button 
                        onClick={togglePlay}
                        className={`w-20 h-20 rounded-full border-4 border-[#0f380f] flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 active:shadow-inner
                            ${isPlaying ? 'bg-[#9bbc0f] text-[#0f380f]' : 'bg-[#0f380f] text-[#9bbc0f]'}
                        `}
                    >
                        {isPlaying ? <Square size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>

                    <button onClick={() => { /* Next Logic */ }} className="text-[#0f380f] hover:text-[#9bbc0f] disabled:opacity-50"><FastForward size={32} fill="currentColor" /></button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SoundTestModule;
