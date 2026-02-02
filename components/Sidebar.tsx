
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Music } from 'lucide-react';
import { Pattern } from '../types';
import PatternList from './PatternList';
import Timeline from './Timeline';

interface SidebarProps {
  patterns: Pattern[];
  arrangement: string[];
  activePatternId: string | null;
  playbackMode: string;
  currentArrIdx: number;
  historyCount: number;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onUndo: () => void;
  onAddPattern: () => void;
  onCopyPattern: (id: string) => void;
  onRenamePattern: (id: string, name: string) => void;
  onDeletePattern: (id: string) => void;
  onAddPatternToTimeline: (patternId: string) => void;
  onRemovePatternFromTimeline: (index: number) => void;
  onReorderArrangement: (startIndex: number, endIndex: number) => void;
  onInsertPatternInTimeline: (patternId: string, index: number) => void;
  onActivePatternChange: (id: string) => void;
  onCurrentArrIdxChange: (idx: number) => void;
  
  // Mixer Props (Deprecated in sidebar, kept for interface compatibility if needed upstream, but unused here)
  channelConfigs: any;
  onToggleMute: (ch: number) => void;
  onToggleSolo: (ch: number) => void;
  onSetVolume: (ch: number, vol: number) => void;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const [expanded, setExpanded] = useState({ patterns: true, timeline: true });

  useEffect(() => {
    if (!props.activePatternId && props.patterns.length > 0) {
      props.onActivePatternChange(props.patterns[0].id);
    }
  }, [props.activePatternId, props.patterns, props.onActivePatternChange]);

  const toggleSection = (section: keyof typeof expanded) => setExpanded(prev => ({ ...prev, [section]: !prev[section] }));

  const isPatternMode = props.playbackMode === 'PATTERN';
  const isSongMode = props.playbackMode === 'SONG';

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-[#222] flex flex-col shrink-0 h-full font-sans text-sm z-30" onMouseDown={e => e.stopPropagation()}>
      
      {/* BRANDING HEADER */}
      <div className="h-16 flex items-center px-4 border-b border-[#222] bg-[#050505]">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#9bbc0f] rounded flex items-center justify-center shadow-[0_0_10px_rgba(155,188,15,0.2)]">
                <Music size={18} className="text-[#0f380f]" />
            </div>
            <div className="leading-tight">
                <div className="text-white font-black uppercase text-xs tracking-wider">VGM Architect</div>
                <div className="text-[#666] text-[9px] font-bold uppercase tracking-[0.2em]">Workstation</div>
            </div>
        </div>
      </div>
      
      {/* Pattern List */}
      <div className={`flex flex-col min-h-0 border-b border-[#222] transition-[flex-grow] duration-300 ease-in-out ${expanded.patterns ? 'flex-[0.5]' : 'flex-none'}`}>
        <div className="flex items-center justify-between pr-2 bg-[#121212] hover:bg-[#1a1a1a]" onClick={() => toggleSection('patterns')}>
           <div className="absolute right-4 z-10 cursor-pointer pointer-events-none">
                {expanded.patterns ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
           </div>
        </div>
        
        {expanded.patterns && (
            <PatternList 
                patterns={props.patterns}
                activePatternId={props.activePatternId}
                isPatternMode={isPatternMode}
                historyCount={props.historyCount}
                onUndo={props.onUndo}
                onAddPattern={props.onAddPattern}
                onActivePatternChange={props.onActivePatternChange}
                onRenamePattern={props.onRenamePattern}
                onCopyPattern={props.onCopyPattern}
                onDeletePattern={props.onDeletePattern}
                onAddPatternToTimeline={props.onAddPatternToTimeline}
            />
        )}
        
        {!expanded.patterns && (
            <div className="p-3 px-4 flex justify-between items-center cursor-pointer bg-[#121212]" onClick={() => toggleSection('patterns')}>
                <span className="text-[10px] font-bold text-gray-500">PATRONEN</span>
                <ChevronRight size={14} className="text-gray-600" />
            </div>
        )}
      </div>

      {/* Timeline */}
      <div className={`flex flex-col min-h-0 border-t border-[#222] transition-[flex-grow] duration-300 ease-in-out ${expanded.timeline ? 'flex-[0.5]' : 'flex-none'}`}>
         {expanded.timeline && (
            <Timeline 
                arrangement={props.arrangement}
                patterns={props.patterns}
                currentArrIdx={props.currentArrIdx}
                isSongMode={isSongMode}
                onCurrentArrIdxChange={props.onCurrentArrIdxChange}
                onRemovePatternFromTimeline={props.onRemovePatternFromTimeline}
                onReorderArrangement={props.onReorderArrangement}
                onInsertPatternInTimeline={props.onInsertPatternInTimeline}
                onAddPatternToTimeline={props.onAddPatternToTimeline}
            />
         )}

         {!expanded.timeline && (
            <div className="p-3 px-4 flex justify-between items-center cursor-pointer bg-[#121212]" onClick={() => toggleSection('timeline')}>
                <span className="text-[10px] font-bold text-gray-500">TIJDLIJN</span>
                <ChevronRight size={14} className="text-gray-600" />
            </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
