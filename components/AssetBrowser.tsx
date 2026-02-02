
import React, { useState, useEffect } from 'react';
import { Sparkles, Send, Speaker, Trash2, X, LayoutGrid, Headphones } from 'lucide-react';
import { PatternClip } from '../types';
import { PATTERN_LIBRARY } from '../services/sampleLibrary';

interface AssetBrowserProps {
  isOpen: boolean; // Kept for API compatibility, but effectively ignored if embedded logic is used
  onClose: () => void;
  customClips?: PatternClip[];
  isGeneratingClip?: boolean;
  onPreviewClip?: (clip: PatternClip) => void;
  onAssetDragStart?: (id: string) => void;
  onGenerateClips?: (prompt: string, channels: number[], length: number) => void;
  onDeleteCustomClip?: (id: string) => void;
  onOpenSoundTest?: () => void;
}

const getClipColor = (clip: PatternClip) => {
  switch (clip.category) {
    case 'DRUMS': return 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500';
    case 'BASS': return 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500';
    case 'LEAD': return 'border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10 hover:border-yellow-500';
    case 'COMBO': return 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500';
    case 'AI': return 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]';
    default: return 'border-gray-500/30 hover:border-gray-500';
  }
};

const AssetBrowser: React.FC<AssetBrowserProps> = (props) => {
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
    setSelectedChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch].sort());
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', `clip:${id}`);
    e.dataTransfer.effectAllowed = 'copy';
    if (props.onAssetDragStart) props.onAssetDragStart(id);
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

  // Note: Removed the "if (!props.isOpen) return null;" check to make it always visible in the dock layout
  // We can control visibility via CSS or parent conditional rendering if needed.

  return (
    <div className="bg-[#111] flex flex-col h-full w-full">
      
      {/* Top Bar: Controls & AI Input */}
      <div className="flex items-center p-3 gap-3 border-b border-[#222] h-14 shrink-0 bg-[#181818]">
          <div className="flex items-center gap-2 text-gray-400 shrink-0">
             <LayoutGrid size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Bibliotheek</span>
          </div>

          <div className="h-6 w-[1px] bg-[#333]" />

          {/* Sound Test Button */}
          {props.onOpenSoundTest && (
            <button 
                onClick={props.onOpenSoundTest}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#222] hover:bg-[#9bbc0f] hover:text-black text-gray-400 rounded text-[9px] font-black uppercase transition-all group"
                title="Open Sound Test Module"
            >
                <Headphones size={12} className="group-hover:animate-bounce" />
            </button>
          )}

          <div className="h-6 w-[1px] bg-[#333]" />

          {/* Categories - Compact */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar mask-gradient-right flex-1">
               {['ALL', 'AI', 'DRUMS', 'BASS', 'LEAD', 'COMBO'].map(cat => (
                 <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)} 
                    className={`px-3 py-1.5 rounded text-[9px] font-black uppercase transition-all whitespace-nowrap border
                        ${activeCategory === cat 
                            ? (cat === 'AI' ? 'bg-amber-500 text-black border-amber-600' : 'bg-[#e0e0e0] text-black border-white') 
                            : 'bg-[#1a1a1a] border-[#333] text-gray-500 hover:text-gray-300'}
                    `}
                 >
                    {cat === 'AI' && <Sparkles size={10} className="inline mr-1" />}
                    {cat}
                 </button>
               ))}
          </div>
      </div>

      {/* AI Quick Gen Bar (Sub-header) */}
      <div className="p-2 border-b border-[#222] bg-[#141414]">
          <form onSubmit={handleGenerate} className="flex items-center gap-2 bg-[#080808] p-1 pr-2 rounded border border-[#222] group focus-within:border-amber-500/50 transition-colors w-full">
               <div className="p-1.5 bg-[#1a1a1a] rounded text-amber-500"><Sparkles size={12}/></div>
               <input 
                  type="text" 
                  placeholder="Beschrijf een nieuwe clip..."
                  value={clipPrompt}
                  onChange={e => setClipPrompt(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] text-white flex-1 placeholder:text-gray-700 min-w-0"
               />
               
               <div className="flex items-center gap-2 border-l border-[#222] pl-2 shrink-0">
                   <div className="flex gap-0.5">
                     {[1, 2, 3, 4].map(ch => (
                       <button type="button" key={ch} onClick={() => toggleChannel(ch)} className={`w-4 h-4 rounded text-[8px] font-bold ${selectedChannels.includes(ch) ? 'bg-amber-500 text-black' : 'bg-[#222] text-gray-600'}`}>{ch}</button>
                     ))}
                   </div>
                   <button 
                    type="submit" 
                    disabled={props.isGeneratingClip || !clipPrompt.trim()}
                    className="p-1.5 rounded bg-[#1a1a1a] hover:bg-amber-500 hover:text-black text-gray-500 transition-colors disabled:opacity-30"
                   >
                     {props.isGeneratingClip ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send size={12}/>}
                   </button>
               </div>
          </form>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#0c0c0c] p-3 overflow-y-auto custom-scrollbar">
         {filteredLibrary.length === 0 ? (
             <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-700 font-bold uppercase italic p-8">
                Geen clips in deze categorie.
             </div>
         ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredLibrary.map(clip => {
                    const colorClass = getClipColor(clip);
                    const isUserClip = clip.category === 'AI' || props.customClips?.some(c => c.id === clip.id);
                    return (
                        <div 
                        key={clip.id} 
                        draggable="true" 
                        onDragStart={(e) => handleDragStart(e, clip.id)}
                        onClick={() => props.onPreviewClip?.(clip)}
                        className={`group p-2 rounded-lg border-l-4 bg-[#141414] cursor-grab active:cursor-grabbing transition-all hover:translate-y-[-2px] hover:shadow-lg relative flex flex-col justify-between h-20 ${colorClass}`}
                        >
                            <div>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[9px] font-black uppercase truncate max-w-[85%] ${isUserClip ? 'text-amber-500' : 'text-gray-300'}`}>
                                        {clip.name}
                                    </span>
                                    {isUserClip && props.onDeleteCustomClip && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); props.onDeleteCustomClip!(clip.id); }}
                                            className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={10} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    {[1,2,3,4].map(ch => (
                                        <div key={ch} className={`h-1 flex-1 rounded-full ${clip.channels[ch] ? (isUserClip ? 'bg-amber-500/50' : 'bg-gray-500/50') : 'bg-[#222]'}`} />
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <span className="text-[8px] font-mono text-gray-600">{getClipLength(clip)}</span>
                                <Speaker size={12} className="text-gray-600 group-hover:text-white" />
                            </div>
                        </div>
                    );
                })}
            </div>
         )}
      </div>
    </div>
  );
};

export default AssetBrowser;
