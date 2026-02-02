
import React, { useState, useEffect } from 'react';
import { Box, Sparkles, Send, Speaker, Trash2 } from 'lucide-react';
import { PatternClip } from '../types';
import { PATTERN_LIBRARY } from '../services/sampleLibrary';

interface LibraryPanelProps {
  customClips?: PatternClip[];
  isGeneratingClip?: boolean;
  onPreviewClip?: (clip: PatternClip) => void;
  onAssetDragStart?: (id: string) => void;
  onGenerateClips?: (prompt: string, channels: number[], length: number) => void;
  onDeleteCustomClip?: (id: string) => void;
}

const getClipColor = (clip: PatternClip) => {
  switch (clip.category) {
    case 'DRUMS': return 'hover:border-blue-500/50 hover:bg-blue-500/5';
    case 'BASS': return 'hover:border-green-500/50 hover:bg-green-500/5';
    case 'LEAD': return 'hover:border-yellow-500/50 hover:bg-yellow-500/5';
    case 'COMBO': return 'hover:border-purple-500/50 hover:bg-purple-500/5';
    case 'AI': return 'border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/5 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]';
    default: return 'hover:border-gray-500/50';
  }
};

const LibraryPanel: React.FC<LibraryPanelProps> = (props) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [clipPrompt, setClipPrompt] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<number[]>([1, 2, 3, 4]);
  const [selectedLength, setSelectedLength] = useState<number>(16);

  useEffect(() => {
    if (props.customClips && props.customClips.length > 0 && !props.isGeneratingClip) {
      setActiveCategory('AI');
    }
  }, [props.customClips?.length, props.isGeneratingClip]);

  const toggleChannel = (ch: number) => {
    setSelectedChannels(prev => 
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch].sort()
    );
  };

  const handleAssetDragStart = (e: React.DragEvent, type: 'sample' | 'clip', id: string) => {
    e.dataTransfer.setData('text/plain', `${type}:${id}`);
    e.dataTransfer.effectAllowed = 'copy';
    if (type === 'clip' && props.onAssetDragStart) {
      props.onAssetDragStart(id);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (clipPrompt.trim() && props.onGenerateClips && selectedChannels.length > 0) {
      props.onGenerateClips(clipPrompt, selectedChannels, selectedLength);
      setClipPrompt('');
    }
  };

  const getClipLength = (clip: PatternClip) => {
    let maxStep = 0;
    Object.values(clip.channels).forEach(rows => {
      rows.forEach(r => { if ((r.step || 0) > maxStep) maxStep = r.step || 0; });
    });
    if (maxStep < 4) return 4;
    if (maxStep < 8) return 8;
    if (maxStep < 16) return 16;
    if (maxStep < 32) return 32;
    return 64;
  };

  const allClips = [...PATTERN_LIBRARY, ...(props.customClips || [])];
  const filteredLibrary = activeCategory === 'ALL' 
    ? allClips 
    : allClips.filter(c => c.category === activeCategory);

  return (
    <aside className="w-80 bg-[#121212] border-l border-[#222] flex flex-col shrink-0 overflow-hidden font-sans text-sm z-30" onMouseDown={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-3 px-4 flex items-center bg-[#181818] border-b border-[#222] h-14 shrink-0">
          <h3 className="text-[11px] font-bold uppercase text-gray-400 flex items-center gap-2"><Box size={14} /> Bibliotheek & AI</h3>
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden bg-[#101010]">
            {/* AI Generator Box */}
            <div className="p-4 border-b border-[#222] bg-[#141414]">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-[9px] font-black uppercase text-[#9bbc0f]">Nieuwe Clip Genereren</span>
                 <Sparkles size={12} className="text-[#9bbc0f]" />
               </div>
               
               <form onSubmit={handleGenerate} className="relative group mb-3">
                  <textarea 
                    placeholder="Bv: Snelle arpeggio melodie of zware distorted bas..."
                    value={clipPrompt}
                    onChange={e => setClipPrompt(e.target.value)}
                    className="w-full h-16 bg-[#080808] border border-[#333] rounded-md p-2 text-xs text-gray-200 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-700 resize-none"
                  />
                  <button 
                    type="submit" 
                    disabled={props.isGeneratingClip || !clipPrompt.trim() || selectedChannels.length === 0}
                    className="absolute right-2 bottom-2 p-1.5 rounded bg-[#9bbc0f] text-black hover:bg-white disabled:opacity-30 transition-all shadow-lg"
                  >
                    {props.isGeneratingClip ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Send size={12}/>}
                  </button>
               </form>

               <div className="flex gap-2">
                   <div className="flex items-center gap-1 bg-[#080808] rounded p-1 border border-[#222]">
                     {[1, 2, 3, 4].map(ch => (
                       <button key={ch} onClick={() => toggleChannel(ch)} className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${selectedChannels.includes(ch) ? 'bg-[#9bbc0f] text-black' : 'text-gray-600 hover:text-white'}`}>{ch}</button>
                     ))}
                   </div>
                   <div className="flex items-center gap-1 bg-[#080808] rounded p-1 border border-[#222]">
                     {[8, 16, 32].map(len => (
                       <button key={len} onClick={() => setSelectedLength(len)} className={`px-2 h-6 rounded text-[9px] font-bold transition-all ${selectedLength === len ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-white'}`}>{len}</button>
                     ))}
                   </div>
               </div>
            </div>

            {/* Categories */}
            <div className="p-2 gap-2 flex flex-wrap border-b border-[#222] bg-[#0c0c0c]">
               {['ALL', 'AI', 'DRUMS', 'BASS', 'LEAD', 'COMBO'].map(cat => (
                 <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border flex-1 text-center
                        ${activeCategory === cat 
                            ? (cat === 'AI' ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'bg-purple-500/20 text-purple-400 border-purple-500/50') 
                            : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:bg-[#222] hover:text-gray-300'}
                    `}
                 >
                    {cat}
                 </button>
               ))}
            </div>

            {/* List */}
            <div className="p-3 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
               {filteredLibrary.length === 0 ? (
                 <div className="text-center py-12 text-xs text-gray-600 italic">Geen {activeCategory.toLowerCase()} clips gevonden.</div>
               ) : (
                 filteredLibrary.map(clip => {
                    const colorClass = getClipColor(clip);
                    const isUserClip = clip.category === 'AI' || props.customClips?.some(c => c.id === clip.id);
                    return (
                      <div 
                        key={clip.id} draggable="true" 
                        onDragStart={(e) => handleAssetDragStart(e, 'clip', clip.id)}
                        onClick={() => props.onPreviewClip?.(clip)}
                        className={`group relative p-3 rounded-lg border cursor-grab active:cursor-grabbing transition-all hover:brightness-125 bg-[#141414]/50 border-transparent hover:border-white/10 ${colorClass}`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold uppercase truncate flex items-center gap-1.5 text-gray-200 group-hover:text-white max-w-[80%]">
                            {isUserClip && <Sparkles size={10} className="text-amber-500" />}
                            {clip.name}
                          </span>
                          <Speaker size={12} className="opacity-0 group-hover:opacity-100 text-gray-400" />
                        </div>
                        <div className="flex justify-between items-center opacity-50">
                           <div className="flex gap-1">
                              {[1, 2, 3, 4].map(ch => (
                                <div key={ch} className={`w-1.5 h-1.5 rounded-sm ${clip.channels[ch] ? 'bg-current' : 'bg-white/10'}`} />
                              ))}
                           </div>
                           <span className="text-[9px] font-mono">{getClipLength(clip)} ST</span>
                        </div>
                        
                        {isUserClip && props.onDeleteCustomClip && (
                            <button onClick={(e) => { e.stopPropagation(); props.onDeleteCustomClip!(clip.id); }} className="absolute -top-1 -right-1 p-1.5 bg-red-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-lg">
                                <Trash2 size={10} />
                            </button>
                        )}
                      </div>
                    );
                 })
               )}
            </div>
          </div>
    </aside>
  );
};

export default LibraryPanel;
