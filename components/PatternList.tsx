
import React, { useState, useRef, useEffect } from 'react';
import { Music, RotateCcw, Plus, Edit, Copy, ListPlus, Trash2, MoreHorizontal } from 'lucide-react';
import { Pattern } from '../types';

interface PatternListProps {
  patterns: Pattern[];
  activePatternId: string | null;
  isPatternMode: boolean;
  historyCount: number;
  onUndo: () => void;
  onAddPattern: () => void;
  onActivePatternChange: (id: string) => void;
  onRenamePattern: (id: string, name: string) => void;
  onCopyPattern: (id: string) => void;
  onDeletePattern: (id: string) => void;
  onAddPatternToTimeline: (id: string) => void;
}

const PatternList: React.FC<PatternListProps> = (props) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; patternId: string; } | null>(null);
  const [renamingPatternId, setRenamingPatternId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (renamingPatternId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingPatternId]);

  const handlePatternDragStart = (e: React.DragEvent, patternId: string) => {
    e.dataTransfer.setData('application/vgm-pattern', patternId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleContextMenu = (e: React.MouseEvent, patternId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, patternId });
  };

  const handleRenameStart = (pattern: Pattern) => {
    setRenamingPatternId(pattern.id);
    setRenameValue(pattern.name);
    setContextMenu(null);
  };

  const handleRenameCommit = () => {
    if (renamingPatternId && renameValue.trim()) props.onRenamePattern(renamingPatternId, renameValue);
    setRenamingPatternId(null);
  };

  return (
    <div className={`flex flex-col h-full ${props.isPatternMode ? 'bg-[#161616]' : ''}`}>
      {contextMenu && (
        <div style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[9999] bg-[#1a1a1a] border border-[#333] rounded-lg shadow-2xl w-48 text-xs font-medium p-1 animate-in fade-in zoom-in-95 duration-100">
          <button onClick={() => handleRenameStart(props.patterns.find(p => p.id === contextMenu.patternId)!)} className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2a2a] text-gray-200 rounded-sm"><Edit size={14}/> Hernoemen</button>
          <button onClick={() => { props.onCopyPattern(contextMenu.patternId); setContextMenu(null); }} className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2a2a] text-gray-200 rounded-sm"><Copy size={14}/> Kopiëren</button>
          <button onClick={() => { props.onAddPatternToTimeline(contextMenu.patternId); setContextMenu(null); }} className="w-full flex items-center gap-2 p-2 hover:bg-[#2a2a2a] text-gray-200 rounded-sm"><ListPlus size={14}/> Aan Tijdlijn</button>
          <div className="h-[1px] bg-[#333] my-1" />
          <button onClick={() => { props.onDeletePattern(contextMenu.patternId); setContextMenu(null); }} className="w-full flex items-center gap-2 p-2 text-red-400 hover:bg-red-500/10 rounded-sm"><Trash2 size={14}/> Verwijderen</button>
        </div>
      )}

      <div className={`p-3 px-4 flex justify-between items-center select-none shrink-0 border-l-4 ${props.isPatternMode ? 'border-l-[#9bbc0f] bg-[#1a1a1a]' : 'border-l-transparent'}`}>
        <h3 className={`text-[11px] font-bold uppercase flex items-center gap-2 ${props.isPatternMode ? 'text-[#9bbc0f]' : 'text-gray-400'}`}><Music size={14} /> Patronen</h3>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); props.onUndo(); }} disabled={props.historyCount === 0} title="Ongedaan maken" className="p-1 hover:text-white text-gray-600 disabled:opacity-20 transition-colors"><RotateCcw size={14}/></button>
          <button onClick={(e) => { e.stopPropagation(); props.onAddPattern(); }} title="Nieuw patroon" className="p-1 text-[#9bbc0f] hover:bg-[#9bbc0f]/10 rounded transition-colors"><Plus size={16}/></button>
        </div>
      </div>
      
      <div className="px-2 pb-2 overflow-y-auto custom-scrollbar flex-1">
        {props.patterns.map(p => (
          <div 
            key={p.id} 
            draggable="true" 
            onDragStart={(e) => handlePatternDragStart(e, p.id)}
            onClick={() => props.onActivePatternChange(p.id)} 
            onDoubleClick={() => handleRenameStart(p)} 
            onContextMenu={(e) => handleContextMenu(e, p.id)}
            className={`flex items-center justify-between p-2 rounded-md mb-1 text-xs font-medium cursor-grab active:cursor-grabbing border transition-all group ${props.activePatternId === p.id && props.isPatternMode ? 'bg-[#9bbc0f]/10 border-[#9bbc0f]/30 text-[#9bbc0f]' : 'bg-[#181818] border-transparent hover:border-[#333] text-gray-400 hover:text-gray-200'}`}
          >
            {renamingPatternId === p.id ? (
                <input ref={renameInputRef} type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={handleRenameCommit} onKeyDown={e => e.key === 'Enter' ? handleRenameCommit() : (e.key === 'Escape' && setRenamingPatternId(null))} className="bg-black/50 text-white w-full outline-none px-1 py-0.5 rounded" />
            ) : (
                <>
                <span className="truncate flex-1 font-mono">{p.name}</span>
                <MoreHorizontal size={14} className="opacity-0 group-hover:opacity-50" />
                </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatternList;
