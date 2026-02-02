import React, { useState } from 'react';
import { 
  Play, Square, Menu, Save, Download, LayoutGrid, 
  Scissors, Copy, Clipboard, X, Trash2, 
  ArrowUp, ArrowDown, ArrowLeftRight, TrendingUp, Dice5,
  Music, Sparkles, FolderOpen, Settings, Info, Monitor, MousePointer2, Minus, Plus,
  FastForward, Rewind, SlidersHorizontal
} from 'lucide-react';
import { useSelection } from '../hooks/useSelection';

interface HeaderProps {
  isPlaying: boolean;
  isComposing: boolean;
  playbackMode: string;
  selection: ReturnType<typeof useSelection>;
  isAssetBrowserOpen: boolean;
  onToggleLibrary: () => void;
  onPlay: () => void;
  onStop: () => void;
  onOpenSystemMenu: () => void;
  onSave?: () => void;
  onExport?: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  onEditSelected?: () => void;
  onTranspose: (semis: number) => void;
}

// 'BEWERKEN' removed, merged into START
type Tab = 'START' | 'PROJECT' | 'BEELD';

const Header: React.FC<HeaderProps> = ({ 
  isPlaying, playbackMode, selection,
  isAssetBrowserOpen, onToggleLibrary,
  onPlay, onStop, onOpenSystemMenu, onSave, onExport,
  bpm, onBpmChange, onEditSelected, onTranspose
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('START');
  const hasSelection = selection.selectedCells.size > 0;

  const TabButton = ({ id, label }: { id: Tab, label: string }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`px-6 py-2 text-[10px] font-bold uppercase transition-all border-t-2 relative top-[1px]
            ${activeTab === id 
                ? 'bg-[#222] text-white border-[#9bbc0f] rounded-t-lg' 
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-[#111]'}
        `}
    >
        {label}
    </button>
  );

  const GroupLabel = ({ label }: { label: string }) => (
      <div className="absolute bottom-1 left-0 right-0 text-center pointer-events-none opacity-50">
          <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
      </div>
  );

  const Separator = () => <div className="w-px h-12 bg-[#333] mx-2 shrink-0" />;

  return (
    <div className="flex flex-col bg-[#111] border-b border-[#222] shrink-0 select-none z-50 shadow-2xl">
      
      {/* TOP BAR: TABS ONLY */}
      <div className="flex items-center px-4 bg-[#050505] border-b border-[#222] h-10 relative">
         <div className="flex gap-1 h-full items-end z-10">
            <button onClick={onOpenSystemMenu} className="px-5 py-2 text-[10px] font-black uppercase bg-[#9bbc0f] text-black rounded-t-lg border-t-2 border-[#9bbc0f] hover:brightness-110 mr-4 mb-[1px] shadow-[0_0_15px_rgba(155,188,15,0.3)]">
                BESTAND
            </button>
            <TabButton id="START" label="Start" />
            <TabButton id="PROJECT" label="Project" />
            <TabButton id="BEELD" label="Beeld" />
         </div>
         {/* Branding / Fill */}
         <div className="flex-1 text-right pr-4 opacity-20 text-[10px] font-black uppercase tracking-[0.5em] text-white hidden sm:block">
            VGM Workstation
         </div>
      </div>

      {/* RIBBON CONTENT AREA */}
      <div className="h-28 bg-[#222] flex items-center justify-between shadow-lg relative overflow-hidden">
         
         {/* LEFT: TOOLS (Scrollable if needed) */}
         <div className="flex items-center h-full px-4 gap-1 overflow-x-auto custom-scrollbar flex-1">
            
            {/* --- TAB: START --- */}
            {activeTab === 'START' && (
                <>
                    {/* CLIPBOARD */}
                    <div className="flex flex-col h-full justify-center px-2 relative group min-w-[120px]">
                        <div className="flex gap-2 mb-3">
                            <button onClick={selection.pasteSelection} className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-[#333] text-gray-300 active:scale-95 transition-all bg-[#2a2a2a] border border-[#333]" title="Plakken (Ctrl+V)">
                                <Clipboard size={22} className="mb-1 text-[#9bbc0f]"/>
                                <span className="text-[9px] font-bold">Plakken</span>
                            </button>
                            <div className="flex flex-col gap-1 justify-center">
                                <button onClick={selection.cutSelection} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#333] rounded text-[9px] font-bold text-gray-400 bg-[#2a2a2a] border border-[#333]"><Scissors size={10}/> Knip</button>
                                <button onClick={selection.copySelection} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#333] rounded text-[9px] font-bold text-gray-400 bg-[#2a2a2a] border border-[#333]"><Copy size={10}/> Kopie</button>
                            </div>
                        </div>
                        <GroupLabel label="Klembord" />
                    </div>

                    <Separator />

                    {/* SELECTIE */}
                    <div className="flex flex-col h-full justify-center px-2 relative min-w-[90px]">
                        <div className="flex flex-col gap-2 items-center justify-center h-16">
                            <div className="flex gap-1">
                                <button className="p-2 rounded bg-[#333] text-white border border-[#555] shadow-inner" title="Selectie Modus">
                                    <MousePointer2 size={16} />
                                </button>
                                <button onClick={() => selection.setSelectedCells(new Set())} className="p-2 rounded hover:bg-[#333] text-gray-400 disabled:opacity-30 bg-[#2a2a2a] border border-[#333]" disabled={!hasSelection} title="Deselecteren (Esc)">
                                    <X size={16} />
                                </button>
                            </div>
                            <span className="text-[9px] font-bold text-gray-500">Selectie</span>
                        </div>
                        <GroupLabel label="Cursor" />
                    </div>

                    <Separator />

                    {/* TRANSPONEREN */}
                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                            <button onClick={() => onTranspose(1)} className="flex items-center justify-center w-16 py-1 bg-[#2a2a2a] hover:bg-[#333] rounded text-gray-300 text-[9px] border border-[#333]" title="Halve toon omhoog">
                                <ArrowUp size={10} className="mr-1"/> Semi
                            </button>
                            <button onClick={() => onTranspose(12)} className="flex items-center justify-center w-16 py-1 bg-[#2a2a2a] hover:bg-[#333] rounded text-gray-300 text-[9px] border border-[#333]" title="Octaaf omhoog">
                                <ArrowUp size={10} strokeWidth={3} className="mr-1"/> Oct
                            </button>
                            <button onClick={() => onTranspose(-1)} className="flex items-center justify-center w-16 py-1 bg-[#2a2a2a] hover:bg-[#333] rounded text-gray-300 text-[9px] border border-[#333]" title="Halve toon omlaag">
                                <ArrowDown size={10} className="mr-1"/> Semi
                            </button>
                            <button onClick={() => onTranspose(-12)} className="flex items-center justify-center w-16 py-1 bg-[#2a2a2a] hover:bg-[#333] rounded text-gray-300 text-[9px] border border-[#333]" title="Octaaf omlaag">
                                <ArrowDown size={10} strokeWidth={3} className="mr-1"/> Oct
                            </button>
                        </div>
                        <GroupLabel label="Toonhoogte" />
                    </div>

                    <Separator />

                    {/* EIGENSCHAPPEN (PROPERTIES) */}
                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex items-center mb-3">
                            <button 
                                onClick={onEditSelected} 
                                disabled={!hasSelection}
                                className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-[#2a2a2a] hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-[#2a2a2a] text-blue-400 hover:text-blue-200 border border-[#333] hover:border-blue-500/50 transition-all shadow-inner" 
                                title="Eigenschappen Bewerken (Dubbelklik)"
                            >
                                <SlidersHorizontal size={24} className="mb-1" />
                                <span className="text-[9px] font-bold">OPTIES</span>
                            </button>
                        </div>
                        <GroupLabel label="Eigenschappen" />
                    </div>

                    <Separator />

                    {/* BEWERKEN (Delete) */}
                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex items-center mb-3">
                            <button onClick={selection.deleteSelection} className="flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-[#2a2a2a] hover:bg-red-900/30 text-red-400 hover:text-red-200 border border-[#333] hover:border-red-900/50 transition-all shadow-inner" title="Selectie wissen (Del)">
                                <Trash2 size={24} className="mb-1" />
                                <span className="text-[9px] font-bold">WIS</span>
                            </button>
                        </div>
                        <GroupLabel label="Acties" />
                    </div>

                    <Separator />

                    {/* TOOLS */}
                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex gap-2 mb-3">
                            <button 
                                onClick={selection.reverseSelection} 
                                disabled={!hasSelection}
                                className="flex flex-col items-center justify-center w-12 h-14 rounded hover:bg-[#333] text-gray-400 hover:text-blue-400 disabled:opacity-30 disabled:hover:text-gray-400 bg-[#2a2a2a] border border-[#333] pt-1"
                                title="Keer selectie om (Horizontaal)"
                            >
                                <ArrowLeftRight size={18} className="mb-1" />
                                <span className="text-[8px] font-bold">Omkeer</span>
                            </button>
                            <button 
                                onClick={selection.interpolateSelection} 
                                disabled={!hasSelection}
                                className="flex flex-col items-center justify-center w-12 h-14 rounded hover:bg-[#333] text-gray-400 hover:text-purple-400 disabled:opacity-30 disabled:hover:text-gray-400 bg-[#2a2a2a] border border-[#333] pt-1"
                                title="Vul gaten op (Interpolatie)"
                            >
                                <TrendingUp size={18} className="mb-1" />
                                <span className="text-[8px] font-bold">Tween</span>
                            </button>
                            <button 
                                onClick={() => selection.randomizeSelection('VOLUME')} 
                                disabled={!hasSelection}
                                className="flex flex-col items-center justify-center w-12 h-14 rounded hover:bg-[#333] text-gray-400 hover:text-yellow-400 disabled:opacity-30 disabled:hover:text-gray-400 bg-[#2a2a2a] border border-[#333] pt-1"
                                title="Random volume variatie"
                            >
                                <Dice5 size={18} className="mb-1" />
                                <span className="text-[8px] font-bold">Human</span>
                            </button>
                        </div>
                        <GroupLabel label="Bewerkingen" />
                    </div>
                </>
            )}

            {/* --- TAB: PROJECT --- */}
            {activeTab === 'PROJECT' && (
                <>
                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex gap-2 mb-3 items-center">
                            <button onClick={onSave} className="flex flex-col items-center justify-center w-16 h-14 rounded hover:bg-[#333] text-gray-300 bg-[#2a2a2a] border border-[#333]">
                                <Save size={20} className="mb-1 text-[#9bbc0f]" />
                                <span className="text-[9px] font-bold">Opslaan</span>
                            </button>
                            <button onClick={onOpenSystemMenu} className="flex flex-col items-center justify-center w-16 h-14 rounded hover:bg-[#333] text-gray-300 bg-[#2a2a2a] border border-[#333]">
                                <FolderOpen size={20} className="mb-1 text-blue-400" />
                                <span className="text-[9px] font-bold">Beheer</span>
                            </button>
                            <button onClick={onExport} className="flex flex-col items-center justify-center w-16 h-14 rounded hover:bg-[#333] text-gray-300 bg-[#2a2a2a] border border-[#333]">
                                <Download size={20} className="mb-1" />
                                <span className="text-[9px] font-bold">Export</span>
                            </button>
                        </div>
                        <GroupLabel label="Bestand" />
                    </div>

                    <Separator />

                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex items-center mb-3">
                            <button onClick={onOpenSystemMenu} className="flex flex-col items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-black hover:from-[#222] hover:to-[#111] text-amber-400 border border-amber-900/30 shadow-lg group">
                                <Sparkles size={22} className="mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-[9px] font-black uppercase tracking-wider">AI Composer</span>
                            </button>
                        </div>
                        <GroupLabel label="Generatief" />
                    </div>
                </>
            )}

            {/* --- TAB: BEELD --- */}
            {activeTab === 'BEELD' && (
                <>
                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex gap-2 mb-3 items-center">
                            <button 
                                onClick={onToggleLibrary}
                                className={`flex flex-col items-center justify-center w-20 h-14 rounded border transition-colors
                                    ${isAssetBrowserOpen ? 'bg-[#333] border-white/20 text-white shadow-inner' : 'hover:bg-[#333] border-[#333] bg-[#2a2a2a] text-gray-400'}
                                `}
                            >
                                <LayoutGrid size={20} className="mb-1" />
                                <span className="text-[9px] font-bold">Bibliotheek</span>
                            </button>
                            <button className="flex flex-col items-center justify-center w-20 h-14 rounded hover:bg-[#333] text-gray-400 border border-[#333] bg-[#2a2a2a]">
                                <Monitor size={20} className="mb-1" />
                                <span className="text-[9px] font-bold">Visualizer</span>
                            </button>
                        </div>
                        <GroupLabel label="Panelen" />
                    </div>

                    <Separator />

                    <div className="flex flex-col h-full justify-center px-2 relative">
                        <div className="flex gap-2 mb-3 items-center">
                            <button onClick={onOpenSystemMenu} className="flex flex-col items-center justify-center w-16 h-14 rounded hover:bg-[#333] text-gray-400 bg-[#2a2a2a] border border-[#333]">
                                <Settings size={20} className="mb-1" />
                                <span className="text-[9px] font-bold">Config</span>
                            </button>
                            <button className="flex flex-col items-center justify-center w-16 h-14 rounded hover:bg-[#333] text-gray-400 bg-[#2a2a2a] border border-[#333]">
                                <Info size={20} className="mb-1" />
                                <span className="text-[9px] font-bold">Help</span>
                            </button>
                        </div>
                        <GroupLabel label="Overig" />
                    </div>
                </>
            )}
         </div>

         {/* RIGHT: PERSISTENT TRANSPORT MODULE */}
         <div className="flex items-center px-6 gap-6 bg-[#151515] h-full border-l border-[#333] shadow-[-10px_0_20px_rgba(0,0,0,0.5)] z-20">
            
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={isPlaying ? onStop : onPlay} 
                    className={`w-14 h-14 flex items-center justify-center rounded-full transition-all shadow-xl hover:scale-105 active:scale-95 border-4
                        ${isPlaying 
                            ? 'bg-[#222] text-red-500 border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                            : 'bg-[#9bbc0f] text-[#0f380f] border-[#8bac0f] shadow-[0_0_20px_rgba(155,188,15,0.4)]'}
                    `}
                    title="Start / Stop (Spatie)"
                >
                    {isPlaying ? <Square size={20} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1"/>}
                </button>
            </div>

            {/* Tempo / Status Display */}
            <div className="flex flex-col gap-2">
                <div className="bg-[#050505] border border-[#333] rounded-lg p-2 px-3 flex items-center justify-between gap-4 w-32 shadow-inner">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Tempo</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onBpmChange(Math.max(60, bpm - 1))} className="text-gray-600 hover:text-white"><Minus size={10}/></button>
                        <span className="text-sm font-mono font-bold text-[#9bbc0f]">{bpm}</span>
                        <button onClick={() => onBpmChange(Math.min(240, bpm + 1))} className="text-gray-600 hover:text-white"><Plus size={10}/></button>
                    </div>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Header;