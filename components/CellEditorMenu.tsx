import React, { useState, useEffect, useMemo } from 'react';
import { X, Volume2, Music, Zap, Layers, TrendingDown, ChevronRight, Speaker, Info, Activity, Star, Waves, AudioLines, Settings2, TrendingUp, MoveHorizontal, CheckCircle2, Minus, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { TrackerRow, PITCH_TO_FREQ, KEYBOARD_MAP } from '../types';
import { getFriendlyLabel, normalizePitch, pitchToIndex, indexToPitch } from '../services/trackerUtils';

interface CellEditorMenuProps {
  selectedRows: { row: TrackerRow, ch: number }[]; // Nieuw: Multi-row support
  onUpdate: (field: keyof TrackerRow, value: any) => void;
  onPreview: (overrides?: Partial<TrackerRow>) => void;
  onClose: () => void;
}

const ALL_PITCHES = Object.keys(PITCH_TO_FREQ).sort((a, b) => PITCH_TO_FREQ[a] - PITCH_TO_FREQ[b]);

const WaveformIcon: React.FC<{ type: string, active: boolean }> = ({ type, active }) => {
    return (
        <svg viewBox="0 0 40 20" className={`w-12 h-6 ${active ? 'text-[#9bbc0f]' : 'text-gray-700'}`} fill="none" stroke="currentColor" strokeWidth="2" style={{ imageRendering: 'pixelated' }}>
            {type === 'TRIANGLE' && <path d="M0 20 L5 15 L10 10 L15 5 L20 0 L25 5 L30 10 L35 15 L40 20" strokeLinecap="square" />}
            {type === 'SAW' && <path d="M0 20 L10 15 L20 10 L30 5 L40 0 V20" strokeLinecap="square" />}
            {type === 'SQUARE' && <path d="M0 20 V0 H20 V20 H40" strokeLinecap="square" />}
        </svg>
    );
};

const CellEditorMenu: React.FC<CellEditorMenuProps> = ({ selectedRows, onUpdate, onPreview, onClose }) => {
  const [showHelp, setShowHelp] = useState(false);
  
  // ANALYSEER SELECTIE
  const uniqueChannels = useMemo(() => Array.from(new Set(selectedRows.map(r => r.ch))), [selectedRows]);
  const isMultiSelection = selectedRows.length > 1;
  const isMixedChannels = uniqueChannels.length > 1;
  const mainCh = uniqueChannels.length === 1 ? uniqueChannels[0] : null; // null if mixed

  // Helper om common value te vinden (of null als mixed)
  const getCommonValue = (key: keyof TrackerRow) => {
      if (selectedRows.length === 0) return null;
      const firstVal = selectedRows[0].row[key];
      const allSame = selectedRows.every(r => r.row[key] === firstVal);
      return allSame ? firstVal : null;
  };

  const commonPitch = getCommonValue('pitch') as string | null | undefined;
  const commonVolume = getCommonValue('volume') as number | null | undefined;
  const commonDecay = getCommonValue('decay') as number | null | undefined;
  const commonPanning = getCommonValue('panning') as number | null | undefined;
  const commonDuty = getCommonValue('dutyCycle') as string | null | undefined;
  const commonEffect = getCommonValue('effect') as string | null | undefined;
  const commonArp = getCommonValue('arpNotes') as string | null | undefined;

  // Friendly Label Logic
  const titleLabel = isMultiSelection 
      ? `${selectedRows.length} NOTEN GESELECTEERD`
      : (selectedRows[0] ? getFriendlyLabel(selectedRows[0].row, selectedRows[0].ch) : 'Leeg Slot');

  // Available Pitches logic (Specific for Channel 4 restrictions)
  const availablePitches = useMemo(() => {
    if (isMixedChannels || !mainCh) return ALL_PITCHES;
    
    // Channel 4 (Noise) uses "C" notes as dividers for the LFSR clock
    if (mainCh === 4) {
        const range = [];
        for (let oct = 1; oct <= 8; oct++) range.push(`C-${oct}`);
        return range;
    }
    // Channel 3 (Wave) sounds broken above Octave 6 usually
    if (mainCh === 3) return ALL_PITCHES.filter(p => parseInt(p.slice(-1)) <= 6);
    
    // Melodic Channels (1 & 2)
    return ALL_PITCHES.filter(p => parseInt(p.slice(-1)) >= 1 && parseInt(p.slice(-1)) <= 7);
  }, [mainCh, isMixedChannels]);

  const currentPitchIndex = useMemo(() => {
    if (!commonPitch || commonPitch === '---' || commonPitch === 'OFF') return -1;
    const normalized = normalizePitch(commonPitch as string);
    const idx = availablePitches.indexOf(normalized);
    // Fallback: if actual pitch is not in restricted list (e.g. imported data), match closest or show 0
    return idx === -1 ? 0 : idx;
  }, [commonPitch, availablePitches]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    const newPitch = availablePitches[idx];
    if (newPitch) {
      onUpdate('pitch', newPitch);
      onPreview({ pitch: newPitch });
    }
  };

  const shiftPitch = (steps: number) => {
    if (!commonPitch || commonPitch === '---' || commonPitch === 'OFF') return;
    
    // We shift based on the RESTRICTED list index
    const currentIdx = availablePitches.indexOf(normalizePitch(commonPitch));
    if (currentIdx === -1) return;
    
    const newIdx = Math.max(0, Math.min(availablePitches.length - 1, currentIdx + steps));
    const newPitch = availablePitches[newIdx];
    
    onUpdate('pitch', newPitch);
    onPreview({ pitch: newPitch });
  };

  const handleEffectSelect = (effectId: string) => {
    onUpdate('effect', effectId);
    
    const previewData: Partial<TrackerRow> = { effect: effectId as any };
    if (effectId === 'ARPEGGIO' && !commonArp) {
      onUpdate('arpNotes', '4,7');
      previewData.arpNotes = '4,7';
    }
    onPreview(previewData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className="bg-[#121212] border-4 border-[#333] w-full max-w-xl shadow-[0_0_80px_rgba(0,0,0,1)] rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="p-6 border-b border-[#222] flex justify-between items-center bg-gradient-to-r from-[#1a1a1a] to-black">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
               <div className={`w-2 h-2 rounded-full shadow-[0_0_10px_#9bbc0f] ${isMultiSelection ? 'bg-blue-500 shadow-blue-500' : 'bg-[#9bbc0f]'}`}></div>
               <span className="text-[9px] text-[#9bbc0f] font-black uppercase tracking-widest">
                  {isMixedChannels ? 'GEMENGDE KANALEN' : `KANAAL ${mainCh} MODE`}
               </span>
            </div>
            <h2 className="text-2xl text-white font-black uppercase tracking-tight truncate">{titleLabel}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHelp(!showHelp)} className={`p-2.5 rounded-xl transition-all ${showHelp ? 'bg-[#9bbc0f] text-black' : 'bg-[#222] text-gray-400 hover:text-white'}`}>
              <Info size={20} />
            </button>
            <button onClick={onClose} className="p-2.5 bg-[#222] rounded-xl text-gray-400 hover:text-white transition-all"><X size={24} /></button>
          </div>
        </div>

        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* FREQUENTIE SECTIE (ALLEEN ZICHTBAAR ALS ENKELE SELECTIE OF SINGLE CHANNEL) */}
          {!isMixedChannels && (
              <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2">
                    <Music size={14} className="text-[#9bbc0f]" /> 
                    {mainCh === 4 ? 'NOISE FREQUENCY (CRUNCH)' : 'OSCILLATOR PITCH'}
                  </label>
                  <div className="px-4 py-2 bg-black rounded-xl border border-[#333] min-w-[100px] text-center shadow-lg">
                    <span className={`text-3xl font-black italic tracking-tighter ${commonPitch === null ? 'text-gray-600' : 'text-white'}`}>
                      {commonPitch === null ? 'MIX' : (commonPitch === '---' ? '---' : (commonPitch === 'OFF' ? 'OFF' : normalizePitch(commonPitch as string)))}
                    </span>
                  </div>
                </div>
                
                {/* Control Group */}
                <div className="flex items-center gap-4">
                    {/* Pitch Buttons (Adaptive based on channel type) */}
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-1">
                            <button onClick={() => shiftPitch(12)} className="p-2 bg-[#222] hover:bg-[#333] rounded text-gray-400 hover:text-white border border-[#333]" title="+ Octaaf"><ChevronUp size={12}/></button>
                            <button onClick={() => shiftPitch(1)} className="p-2 bg-[#222] hover:bg-[#333] rounded text-gray-400 hover:text-white border border-[#333]" title="+ Stap"><Plus size={12}/></button>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => shiftPitch(-12)} className="p-2 bg-[#222] hover:bg-[#333] rounded text-gray-400 hover:text-white border border-[#333]" title="- Octaaf"><ChevronDown size={12}/></button>
                            <button onClick={() => shiftPitch(-1)} className="p-2 bg-[#222] hover:bg-[#333] rounded text-gray-400 hover:text-white border border-[#333]" title="- Stap"><Minus size={12}/></button>
                        </div>
                    </div>

                    {/* Slider */}
                    <input 
                    type="range" min="0" max={availablePitches.length - 1} step="1"
                    value={currentPitchIndex === -1 ? 0 : currentPitchIndex}
                    onChange={handleSliderChange}
                    disabled={commonPitch === null && isMultiSelection}
                    className={`flex-1 h-4 bg-[#222] rounded-full appearance-none border-2 border-black shadow-inner ${commonPitch === null ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer accent-[#9bbc0f]'}`}
                    />
                </div>
              </div>
          )}

          {/* GLOBAL PROPERTIES (Altijd beschikbaar) */}
          <div className="grid grid-cols-2 gap-6">
             {/* INITIAL VOLUME */}
             <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2">
                      <Volume2 size={14} className="text-[#ffcc00]" /> START VOLUME
                   </label>
                   <span className="text-xl font-black text-[#ffcc00]">{commonVolume !== null && commonVolume !== undefined ? (commonVolume as number).toString(16).toUpperCase() : 'MIX'}</span>
                </div>
                <input 
                   type="range" min="0" max="15" step="1" 
                   value={commonVolume ?? 12} 
                   onChange={e => { onUpdate('volume', parseInt(e.target.value)); onPreview({ volume: parseInt(e.target.value) }); }}
                   className="w-full h-2 bg-[#222] rounded-full appearance-none cursor-pointer accent-[#ffcc00] border border-black"
                />
             </div>

             {/* HARDWARE ENVELOPE */}
             <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-500" /> VERVAL (DECAY)
                   </label>
                   <span className="text-xl font-black text-red-500">{commonDecay !== null ? (commonDecay || 0).toString(16).toUpperCase() : 'MIX'}</span>
                </div>
                <input 
                   type="range" min="0" max="15" step="1" 
                   value={commonDecay ?? 0} 
                   onChange={e => { onUpdate('decay', parseInt(e.target.value)); onPreview({ decay: parseInt(e.target.value) }); }}
                   className="w-full h-2 bg-[#222] rounded-full appearance-none cursor-pointer accent-red-500 border border-black"
                />
             </div>
          </div>

          {/* PANNING (Stereo) */}
          <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                  <label className="text-[10px] text-gray-500 font-black uppercase flex items-center gap-2">
                    <MoveHorizontal size={14} className="text-blue-400" /> STEREO PANNING
                  </label>
                  <span className="text-xs font-black text-blue-400">
                    {commonPanning !== null && commonPanning !== undefined ? (commonPanning < 0 ? `L ${Math.abs(Math.round(commonPanning * 10))}` : (commonPanning > 0 ? `R ${Math.round(commonPanning * 10)}` : 'CENTER')) : 'GEMENGD'}
                  </span>
              </div>
              <input 
                  type="range" min="-1" max="1" step="0.1" 
                  value={commonPanning ?? 0} 
                  onChange={e => { onUpdate('panning', parseFloat(e.target.value)); onPreview({ panning: parseFloat(e.target.value) }); }}
                  className="w-full h-2 bg-[#222] rounded-full appearance-none cursor-pointer accent-blue-400 border border-black"
              />
              <div className="flex justify-between text-[8px] text-gray-600 font-bold uppercase">
                  <span>Links</span>
                  <span>Midden</span>
                  <span>Rechts</span>
              </div>
          </div>

          {/* HARDWARE ENGINE CONFIG (Alleen tonen als kanalen compatibel zijn) */}
          {/* Compatible Groups: [1,2] (Pulse), [3] (Wave), [4] (Noise) */}
          {(!isMixedChannels || (uniqueChannels.every(c => c === 1 || c === 2))) && (
            <div className="bg-black/60 p-6 rounded-2xl border border-[#333] space-y-6">
               <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings2 size={16} className="text-blue-400" />
                  <h3 className="text-[10px] text-white font-black uppercase tracking-widest">Hardware Register Instellingen</h3>
               </div>

               {/* CH 1 & 2: PULSE */}
               {(uniqueChannels.every(c => c === 1 || c === 2)) && (
                  <div className="space-y-4">
                    <label className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Duty Cycle (Klankkleur)</label>
                    <div className="flex gap-1.5">
                      {["0.125", "0.25", "0.5"].map(d => (
                        <button 
                          key={d} 
                          onClick={() => { onUpdate('dutyCycle', d); onPreview({ dutyCycle: d as any }); }}
                          className={`flex-1 py-3 text-[10px] font-black rounded-lg border transition-all ${commonDuty === d ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-lg shadow-[#9bbc0f]/20' : 'bg-black border-[#222] text-gray-600 hover:text-white'}`}
                        >
                          {(parseFloat(d)*100).toFixed(1)}%
                        </button>
                      ))}
                    </div>
                  </div>
               )}

               {/* CH 3: WAVE RAM */}
               {mainCh === 3 && (
                  <div className="space-y-5">
                     <label className="text-[9px] text-gray-600 font-black uppercase tracking-widest">WAVEFORM (GOLFVORM)</label>
                     <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: "0.125", name: "TRIANGLE", icon: "TRIANGLE" },
                          { id: "0.25", name: "SAWTOOTH", icon: "SAW" },
                          { id: "0.5", name: "SQUARE", icon: "SQUARE" }
                        ].map(w => (
                          <button 
                             key={w.id}
                             onClick={() => { onUpdate('dutyCycle', w.id); onPreview({ dutyCycle: w.id as any }); }}
                             className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${commonDuty === w.id ? 'bg-[#9bbc0f] border-[#9bbc0f] text-black shadow-xl shadow-[#9bbc0f]/20' : 'bg-black border-[#222] text-gray-500 hover:text-white'}`}
                          >
                             <WaveformIcon type={w.icon} active={commonDuty === w.id} />
                             <span className="text-[9px] font-black">{w.name}</span>
                          </button>
                        ))}
                     </div>
                  </div>
               )}

               {/* CH 4: LFSR NOISE */}
               {mainCh === 4 && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center bg-black p-4 rounded-xl border border-white/5">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] text-white font-black uppercase italic">LFSR Counter Mode</span>
                           <span className="text-[8px] text-gray-500 font-bold uppercase">Metaal (7-bit) vs Zacht (15-bit)</span>
                        </div>
                        <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-white/5">
                           <button 
                              onClick={() => { onUpdate('dutyCycle', "0.5"); onPreview({ dutyCycle: "0.5" }); }}
                              className={`px-6 py-2 text-[9px] font-black rounded-md transition-all ${commonDuty !== "0.125" ? 'bg-[#9bbc0f] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}
                           >
                              ZACHT
                           </button>
                           <button 
                              onClick={() => { onUpdate('dutyCycle', "0.125"); onPreview({ dutyCycle: "0.125" }); }}
                              className={`px-6 py-2 text-[9px] font-black rounded-md transition-all ${commonDuty === "0.125" ? 'bg-[#9bbc0f] text-black shadow-lg' : 'text-gray-600 hover:text-white'}`}
                           >
                              METAAL
                           </button>
                        </div>
                     </div>
                  </div>
               )}
            </div>
          )}

          {/* FX ENGINE BLOCK */}
          <div className="space-y-4 p-6 bg-purple-900/10 border border-purple-500/20 rounded-2xl">
              <label className="text-[10px] text-purple-400 font-black uppercase tracking-widest flex items-center gap-2">
                <Waves size={14} /> FX ENGINE
              </label>
              <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'NONE', label: 'GEEN', icon: <Zap size={12}/>, disabled: false },
                    { id: 'SLIDE', label: 'SLIDE (SWEEP)', icon: <TrendingUp size={12}/>, disabled: isMixedChannels || mainCh !== 1 }, // Strictly Ch 1
                    { id: 'VIBRATO', label: 'VIBRATO', icon: <Activity size={12}/>, disabled: uniqueChannels.includes(4) }, // No vibra on drums
                    { id: 'ARPEGGIO', label: 'ARPEGGIO', icon: <Music size={12}/>, disabled: uniqueChannels.includes(4) }, // No arp on drums
                  ].map(fx => (
                    <button 
                      key={fx.id}
                      disabled={fx.disabled}
                      onClick={() => handleEffectSelect(fx.id)}
                      className={`py-3 px-2 text-[9px] font-black rounded-lg border flex items-center justify-center gap-2 transition-all 
                        ${fx.disabled ? 'opacity-10 grayscale cursor-not-allowed border-dashed border-[#333]' : ''}
                        ${commonEffect === fx.id ? 'bg-purple-500 border-purple-500 text-black shadow-lg' : 'bg-black border-[#222] text-gray-500 hover:text-white'}`}
                    >
                      {fx.icon} {fx.label}
                    </button>
                  ))}
              </div>
              
              {commonEffect === 'ARPEGGIO' && (
                <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                    <label className="text-[8px] text-purple-300/60 font-black uppercase">Intervallen (bv 4,7)</label>
                    <input 
                      type="text" 
                      value={commonArp as string || ""}
                      onChange={e => onUpdate('arpNotes', e.target.value)}
                      className="w-full bg-black border border-purple-500/30 rounded-lg p-2 text-xs font-mono text-white outline-none focus:border-purple-500"
                      placeholder="4,7"
                    />
                </div>
              )}
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="bg-[#0c0c0c] p-6 border-t border-[#222] flex gap-4">
          <button 
            onClick={() => onPreview()}
            className="px-6 py-4 bg-[#222] border border-[#333] hover:bg-[#333] rounded-xl text-white transition-all flex items-center gap-2 group"
          >
            <Speaker size={20} className="group-hover:animate-pulse" />
            <span className="text-[9px] font-black uppercase">VOORBEELD</span>
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-[#9bbc0f] text-black py-4 text-[12px] font-black rounded-xl border-b-4 border-black/40 hover:brightness-105 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-2"
          >
            {isMultiSelection ? `BATCH UITVOEREN (${selectedRows.length})` : 'TOEPASSEN OP TRACKER'} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CellEditorMenu;