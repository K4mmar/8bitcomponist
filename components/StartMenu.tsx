
import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, GraduationCap, ArrowLeft, ChevronRight, Save, FolderOpen, Settings, Music, Bluetooth, RotateCcw, Check, Film, Terminal, Smartphone } from 'lucide-react';
import { CompositionSettings, GameBoyPalette, SavedProjectMeta } from '../types';
import { useStartMenuAudio } from '../hooks/useStartMenuAudio';
import GameBoySVG from './GameBoySVG';
import StartMenuSaveLoad from './StartMenu_SaveLoad';

interface StartMenuProps {
  onNewProject: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onSaveBrowser: (name: string, overwriteId?: string) => void;
  checkNameCollision?: (name: string) => SavedProjectMeta | undefined;
  onLoadBrowser: (id: string) => void;
  onDeleteSave?: (id: string) => void;
  onDownloadSave?: (id: string, name: string) => void;
  onRenameSave?: (id: string, newName: string) => void;
  savedProjects?: SavedProjectMeta[];
  hasLocalSave: boolean;
  hasActiveProject: boolean;
  onResume: () => void;
  onCompose: (settings: CompositionSettings) => void;
  onOpenAcademy: () => void;
  isComposing: boolean;
  aiProgress?: string;
  streamingLog?: string;
  onCancelAI?: () => void;
  aiSettings: CompositionSettings;
  onAiSettingsChange: (s: CompositionSettings) => void;
  latencyMs: number;
  onLatencyChange: (ms: number) => void;
  skipIntro?: boolean;
  onToggleSkipIntro: (skip: boolean) => void;
  onToggleMobileMode: (enable: boolean) => void;
}

type MenuState = 'MAIN' | 'AI_SETUP' | 'SETTINGS' | 'SAVE_LOAD' | 'NEW_CONFIRM';
type BootState = 'WAIT' | 'POWER_ON' | 'SCROLLING' | 'PING' | 'SLIDING' | 'DONE';

const StartMenu: React.FC<StartMenuProps> = (props) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [menuView, setMenuView] = useState<MenuState>('MAIN');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'NEW' | null>(null);
  const [bootState, setBootState] = useState<BootState>(props.skipIntro ? 'DONE' : 'WAIT');
  
  // Audio Logic Hook
  const audio = useStartMenuAudio();

  // Auto-scroll logic for terminal
  useEffect(() => {
      if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
  }, [props.streamingLog]);

  // Auto-start music if skipping intro (returning from editor or saved preference)
  useEffect(() => {
      if (props.skipIntro && bootState === 'DONE') {
          audio.initAudio().then(() => {
              audio.startMenuMusic();
          });
      }
  }, []);

  // Trigger Sequence Logic (Manual Start required for Audio)
  const startBootSequence = async () => {
      if (bootState !== 'WAIT') return;

      // 1. Visual Feedback Immediately (Prevent "Dead Click" feeling)
      setBootState('POWER_ON'); // Battery LED On instantly

      // 2. Initialize Audio (Async)
      // Even if this takes a moment or fails, the visual sequence has started.
      try {
          await audio.initAudio();
      } catch (e) {
          console.warn("Audio init failed during boot, proceeding silently.");
      }

      // 3. Continue Animation Steps
      setTimeout(() => setBootState('SCROLLING'), 800); // Logo drops
      
      setTimeout(() => {
          setBootState('PING'); // Logo Hits Middle
          audio.triggerBootSound();
      }, 2800);

      setTimeout(() => setBootState('SLIDING'), 3800); // Move Left
      setTimeout(() => {
          setBootState('DONE');
          audio.startMenuMusic();
      }, 4800); // Show Menu & Start Music
  };

  const handleExit = () => {
      audio.stopMenuMusic();
  };

  const handleNewProjectRequest = () => {
      if (props.hasActiveProject) {
          setMenuView('NEW_CONFIRM');
      } else {
          handleExit();
          props.onNewProject();
      }
  };

  const handleImmediateSkip = (isChecked: boolean) => {
      props.onToggleSkipIntro(isChecked);
      
      if (isChecked && bootState !== 'DONE') {
          // Initialize audio context on click (user interaction)
          audio.initAudio().then(() => {
              setBootState('DONE');
              audio.startMenuMusic();
          });
      }
  };

  // Wrapper for navigation functions to stop music
  const wrapNav = (fn: () => void) => {
      return () => {
          handleExit();
          fn();
      }
  };

  // --- SUB COMPONENTS (Helpers) ---
  
  const MenuItem = ({ label, desc, icon: Icon, onClick, danger = false, disabled = false }: any) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        onMouseEnter={() => setHoveredItem(label)}
        onMouseLeave={() => setHoveredItem(null)}
        className={`group flex items-center gap-4 border p-6 rounded-2xl transition-all shadow-xl w-full text-left relative overflow-hidden
            ${disabled ? 'opacity-30 cursor-not-allowed border-[#222] bg-[#111]' : 
              danger ? 'border-red-900/50 bg-red-900/10 hover:border-red-500 hover:bg-red-900/20' : 
              'border-[#222] bg-[#121212] hover:border-[#9bbc0f] hover:translate-y-[-2px]'}
        `}
    >
        <div className={`absolute right-0 top-0 bottom-0 w-1 transition-all ${disabled ? 'bg-transparent' : danger ? 'bg-red-900 group-hover:bg-red-500' : 'bg-[#222] group-hover:bg-[#9bbc0f]'}`} />
        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0
            ${disabled ? 'bg-[#222] text-gray-600' : danger ? 'bg-[#222] text-red-500 group-hover:bg-red-500 group-hover:text-white' : 'bg-[#1a1a1a] text-gray-400 group-hover:bg-[#9bbc0f] group-hover:text-black'}
        `}>
            <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
            <h3 className={`font-black uppercase tracking-wide text-sm truncate ${disabled ? 'text-gray-600' : danger ? 'text-red-400 group-hover:text-red-100' : 'text-white'}`}>{label}</h3>
            <p className="text-[10px] text-gray-500 uppercase font-bold truncate mt-1">{desc}</p>
        </div>
    </button>
  );

  // Screen Content Rendering
  const renderScreenContent = () => {
    if (bootState !== 'DONE' && bootState !== 'SLIDING') {
        if (bootState === 'WAIT') {
            return (
                <div className="w-full h-full flex items-center justify-center animate-pulse">
                    <span className="text-[12px] font-black tracking-widest text-[#0f380f]">► CLICK START</span>
                </div>
            );
        }
        return (
            <div className="relative w-full h-full flex flex-col items-center overflow-hidden">
                <div 
                    className={`absolute text-[18px] font-black uppercase tracking-wider text-[#303095] px-2 py-1 transition-all duration-[2000ms] ease-linear
                        ${(bootState === 'POWER_ON') ? '-top-10 opacity-0' : 'top-[40%] opacity-100'}
                    `}
                    style={{ fontFamily: 'sans-serif', fontStyle: 'italic' }}
                >
                    Nintendo<sup className="text-[8px]">®</sup>
                </div>
            </div>
        );
    }

    if (props.isComposing) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full space-y-4">
                <div className="flex gap-1 items-end h-8">
                    {[0.5, 0.7, 0.6, 0.8].map((d, i) => (
                        <div key={i} className="w-2 bg-[#0f380f]" style={{ height: '50%', animation: `bounce ${d}s infinite` }}/>
                    ))}
                </div>
                <div className="text-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest animate-pulse mb-2">GEMINI AI</h3>
                    <div className="border-t-2 border-[#0f380f] w-full my-1"/>
                    <p className="text-[9px] font-bold uppercase leading-relaxed max-w-[140px]">{props.aiProgress || "INITIALISEREN..."}</p>
                </div>
            </div>
        );
    }

    // Default Screen States
    switch (menuView) {
        case 'MAIN':
            return (
                <div className="flex flex-col items-center justify-between h-full py-2 w-full animate-in fade-in duration-500">
                    <div className="text-center w-full border-b-2 border-[#0f380f]/20 pb-1">
                        <div className="text-[18px] font-black leading-none">VGM</div>
                        <div className="text-[7px] font-bold tracking-[0.2em]">ARCHITECT</div>
                    </div>
                    <div className="flex flex-col items-center justify-center flex-1 w-full">
                        {hoveredItem ? (
                             <>
                                <div className="text-[10px] font-black uppercase mb-1">{hoveredItem}</div>
                                <div className="text-[8px] text-center opacity-70 px-2">Selecteer een optie in het menu</div>
                             </>
                        ) : (
                             <>
                                <div className="text-[32px] animate-bounce">♪</div>
                                <div className="text-[8px] font-bold mt-2">KLAAR VOOR GEBRUIK</div>
                             </>
                        )}
                    </div>
                    {props.hasActiveProject && <div className="text-[8px] bg-[#0f380f] text-[#9bbc0f] px-2 rounded">PROJECT ACTIEF</div>}
                </div>
            );
        case 'AI_SETUP': return <div className="flex flex-col items-center justify-center h-full"><Sparkles size={24} className="mb-2"/><div className="text-[10px] font-black uppercase">AI ARCHITECT</div></div>;
        case 'SETTINGS': return <div className="flex flex-col items-center justify-center h-full"><Settings size={24} className="mb-2"/><div className="text-[10px] font-black uppercase">INSTELLINGEN</div></div>;
        case 'SAVE_LOAD': return <div className="flex flex-col items-center justify-center h-full"><Save size={24} className="mb-2"/><div className="text-[10px] font-black uppercase">BEHEER</div></div>;
        case 'NEW_CONFIRM': return <div className="flex flex-col items-center justify-center h-full bg-[#0f380f] text-[#9bbc0f]"><div className="text-[10px] font-black uppercase animate-pulse">LET OP!</div></div>;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#080808] flex items-center justify-center font-mono overflow-hidden relative selection:bg-[#9bbc0f] selection:text-black">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `radial-gradient(${GameBoyPalette.LIGHTEST} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => { handleExit(); props.onImport(e); e.target.value = ''; }} 
        accept=".json" 
        className="hidden" 
      />

      <div className="flex flex-col md:flex-row w-full max-w-7xl h-[90vh] gap-8 px-8 items-center justify-center relative">
        
        {/* Visual */}
        <div 
            className={`flex flex-col items-center justify-center shrink-0 relative z-20 transition-all duration-1000 ease-in-out
                ${bootState === 'DONE' ? 'md:mr-8' : 'md:mr-0'}
                ${(bootState === 'WAIT' || bootState === 'POWER_ON' || bootState === 'SCROLLING' || bootState === 'PING') ? 'translate-x-[25vw] scale-110' : 'translate-x-0 scale-100'}
            `}
        >
            <GameBoySVG 
                scale={0.7} 
                className={`transition-transform duration-500 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${bootState === 'DONE' ? 'hover:-translate-y-2' : ''} ${bootState === 'WAIT' ? 'hover:scale-105 active:scale-95 cursor-pointer' : ''}`}
                screenContent={renderScreenContent()}
                ledOn={bootState !== 'WAIT'}
                onClick={bootState === 'WAIT' ? startBootSequence : undefined}
            />
            
            <div className={`mt-6 transition-all duration-1000 ${bootState !== 'SLIDING' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                    <div className={`w-4 h-4 border border-[#333] rounded flex items-center justify-center transition-colors ${props.skipIntro ? 'bg-[#9bbc0f] border-[#9bbc0f]' : 'bg-[#111] group-hover:border-[#666]'}`}>
                        {props.skipIntro && <Check size={12} className="text-black" strokeWidth={4} />}
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={!!props.skipIntro} 
                        onChange={(e) => handleImmediateSkip(e.target.checked)} 
                    />
                    <span className="text-[10px] font-bold text-gray-600 uppercase group-hover:text-gray-400 transition-colors">Animatie Overslaan</span>
                </label>
            </div>
        </div>

        {/* Dashboard / Menu */}
        <div 
            className={`flex-1 w-full relative z-10 flex flex-col transition-all duration-1000 ease-in-out
                ${(bootState === 'WAIT' || bootState === 'POWER_ON' || bootState === 'SCROLLING' || bootState === 'PING') ? 'opacity-0 translate-x-20 pointer-events-none' : 'opacity-100 translate-x-0'}
            `}
        >
            <div className="mb-8 flex items-end gap-4 border-b-4 border-[#222] pb-4">
                <div>
                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter">VGM Architect</h1>
                    <p className="text-[#9bbc0f] text-xs font-bold tracking-[0.4em] mt-2 uppercase">Audio Workstation v17.0</p>
                </div>
            </div>

            {/* MAIN MENU */}
            {menuView === 'MAIN' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 content-start">
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-6">
                        <MenuItem label="Verder Gaan" desc="Hervat huidige sessie" icon={Play} onClick={wrapNav(props.onResume)} disabled={!props.hasActiveProject} />
                        <MenuItem label="Nieuw Project" desc="Start met leeg canvas" icon={RotateCcw} onClick={handleNewProjectRequest} />
                    </div>
                    <div className="h-px bg-[#222] col-span-1 md:col-span-2 my-2" />
                    <MenuItem label="Project Beheer" desc="Laden, Import & Export" icon={FolderOpen} onClick={() => setMenuView('SAVE_LOAD')} />
                    <MenuItem label="AI Architect" desc="Genereer met Gemini" icon={Sparkles} onClick={() => setMenuView('AI_SETUP')} />
                    <MenuItem label="Instellingen" desc="Audio & Systeem" icon={Settings} onClick={() => setMenuView('SETTINGS')} />
                    <MenuItem label="Academie" desc="Leren Componeren" icon={GraduationCap} onClick={wrapNav(props.onOpenAcademy)} />
                </div>
            )}

            {/* AI SETUP */}
            {menuView === 'AI_SETUP' && (
                <div className="bg-[#111] p-8 rounded-3xl border border-[#333] shadow-2xl relative animate-in zoom-in-95 duration-300">
                    <button onClick={() => setMenuView('MAIN')} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase mb-6"><ArrowLeft size={16}/> Terug naar Menu</button>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 border-l-8 border-[#9bbc0f] pl-6">AI Generator</h2>
                    
                    {!props.isComposing ? (
                        <div className="space-y-6 max-w-2xl">
                            
                            <div className="grid grid-cols-2 gap-6">
                                {/* Structure Selection */}
                                <div>
                                    <label className="text-xs text-[#9bbc0f] font-black uppercase tracking-widest block mb-3">Structuur</label>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => props.onAiSettingsChange({...props.aiSettings, structure: 'LOOP_SHORT'})} className={`py-3 px-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.structure === 'LOOP_SHORT' ? 'bg-[#222] border-[#9bbc0f] text-white shadow-lg' : 'bg-black border-[#333] text-gray-500'}`}>
                                            Loop (Kort)
                                        </button>
                                        <button onClick={() => props.onAiSettingsChange({...props.aiSettings, structure: 'SONG_FULL'})} className={`py-3 px-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.structure === 'SONG_FULL' ? 'bg-[#222] border-[#9bbc0f] text-white shadow-lg' : 'bg-black border-[#333] text-gray-500'}`}>
                                            Volledig (Lang)
                                        </button>
                                    </div>
                                </div>

                                {/* Tonality Selection */}
                                <div>
                                    <label className="text-xs text-[#9bbc0f] font-black uppercase tracking-widest block mb-3">Toonsoort</label>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => props.onAiSettingsChange({...props.aiSettings, tonality: 'MAJOR'})} className={`py-2 px-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.tonality === 'MAJOR' ? 'bg-white text-black border-white' : 'bg-black border-[#333] text-gray-500'}`}>
                                            Majeur (Blij)
                                        </button>
                                        <button onClick={() => props.onAiSettingsChange({...props.aiSettings, tonality: 'MINOR'})} className={`py-2 px-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.tonality === 'MINOR' ? 'bg-white text-black border-white' : 'bg-black border-[#333] text-gray-500'}`}>
                                            Mineur (Droef)
                                        </button>
                                        <button onClick={() => props.onAiSettingsChange({...props.aiSettings, tonality: 'MODAL_DARK'})} className={`py-2 px-4 text-xs font-bold uppercase rounded-lg border text-left transition-all ${props.aiSettings.tonality === 'MODAL_DARK' ? 'bg-white text-black border-white' : 'bg-black border-[#333] text-gray-500'}`}>
                                            Duister (Spannend)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-[#222]">
                                <label className="text-xs text-[#9bbc0f] font-black uppercase tracking-widest">Kies een Genre</label>
                                <div className="grid grid-cols-4 gap-4">
                                {['ACTION', 'RPG', 'HORROR', 'RACING'].map((g) => (
                                    <button key={g} onClick={() => props.onAiSettingsChange({...props.aiSettings, genre: g as any})} className={`py-3 text-xs font-black uppercase rounded-xl border-2 transition-all ${props.aiSettings.genre === g ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-black border-[#333] text-gray-500 hover:text-gray-300 hover:border-gray-500'}`}>{g}</button>
                                ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs text-[#9bbc0f] font-black uppercase tracking-widest">Bepaal de Sfeer</label>
                                <select value={props.aiSettings.emotion} onChange={(e) => props.onAiSettingsChange({...props.aiSettings, emotion: e.target.value as any})} className="w-full bg-black border-2 border-[#333] text-white text-sm p-4 rounded-xl appearance-none outline-none focus:border-[#9bbc0f] hover:border-gray-500 transition-colors">
                                    <option value="HEROIC">Heroïsch & Snel</option>
                                    <option value="TENSE">Spannend & Gevaarlijk</option>
                                    <option value="SAD">Melancholisch</option>
                                    <option value="MYSTERIOUS">Mysterieus</option>
                                    <option value="AGGRESSIVE">Agressief</option>
                                    <option value="HAPPY">Vrolijk & Energiek</option>
                                </select>
                            </div>

                            <button onClick={() => { handleExit(); props.onCompose(props.aiSettings); }} className="w-full py-6 bg-[#9bbc0f] text-black font-black uppercase text-lg rounded-xl shadow-[0_10px_20px_rgba(155,188,15,0.2)] hover:scale-[1.02] hover:bg-white transition-all flex items-center justify-center gap-3">
                                <Sparkles size={20} fill="black" /> Start Generator <ChevronRight size={24}/>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-[400px]">
                            {/* TERMINAL OUTPUT */}
                            <div className="flex-1 bg-black border-2 border-[#333] rounded-xl p-4 font-mono text-xs overflow-y-auto custom-scrollbar shadow-inner relative flex flex-col mb-6" ref={logContainerRef}>
                                <div className="flex items-center gap-2 mb-4 border-b border-[#333] pb-2 sticky top-0 bg-black z-10">
                                    <Terminal size={14} className="text-[#9bbc0f]" />
                                    <span className="text-[#9bbc0f] font-bold uppercase">Gemini Core Stream</span>
                                    <div className="ml-auto w-2 h-2 bg-[#9bbc0f] rounded-full animate-pulse" />
                                </div>
                                
                                <div className="text-green-500/80 whitespace-pre-wrap leading-relaxed pb-4">
                                    {props.streamingLog || "Connection established. Waiting for token stream..."}
                                    <span className="inline-block w-2 h-4 bg-green-500 ml-1 animate-pulse align-middle" />
                                </div>
                            </div>

                            <button onClick={props.onCancelAI} className="text-red-500 text-xs font-black uppercase border border-red-900 px-6 py-3 rounded-lg hover:bg-red-900/20 hover:text-white transition-colors self-center">Annuleren</button>
                        </div>
                    )}
                </div>
            )}

            {/* SETTINGS */}
            {menuView === 'SETTINGS' && (
                 <div className="bg-[#111] p-8 rounded-3xl border border-[#333] shadow-2xl relative animate-in zoom-in-95 duration-300">
                    <button onClick={() => setMenuView('MAIN')} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase mb-6"><ArrowLeft size={16}/> Terug naar Menu</button>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 border-l-8 border-blue-500 pl-6">Systeem Voorkeuren</h2>
                    
                    <div className="space-y-8 max-w-2xl">
                       <div className="space-y-4 bg-[#1a1a1a] p-6 rounded-2xl border border-[#333]">
                           <div className="flex items-center gap-3 text-[#9bbc0f] mb-2">
                              <Bluetooth size={24} />
                              <h3 className="font-black uppercase text-sm">Bluetooth Audio Latency</h3>
                           </div>
                           <p className="text-xs text-gray-500 font-medium">Pas dit aan als de cursor niet synchroon loopt met het geluid.</p>
                           <div className="flex items-center gap-4">
                               <input type="range" min="0" max="500" step="10" value={props.latencyMs} onChange={(e) => props.onLatencyChange(parseInt(e.target.value))} className="flex-1 h-3 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#9bbc0f]"/>
                               <div className="bg-black px-3 py-1 rounded text-[#9bbc0f] font-mono font-bold text-xs">{props.latencyMs} ms</div>
                           </div>
                       </div>

                       <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <Smartphone size={20} className="text-gray-400" />
                                <div>
                                    <h3 className="font-black uppercase text-xs">Pocket Mode</h3>
                                    <p className="text-[10px] text-gray-500">Mobiele weergave activeren</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { handleExit(); props.onToggleMobileMode(true); }}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 bg-[#333]`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 translate-x-0`} />
                            </button>
                        </div>

                       <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <Film size={20} className="text-gray-400" />
                                <div>
                                    <h3 className="font-black uppercase text-xs">Intro Animatie</h3>
                                    <p className="text-[10px] text-gray-500">Overslaan bij opstarten</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => props.onToggleSkipIntro(!props.skipIntro)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${props.skipIntro ? 'bg-[#9bbc0f]' : 'bg-[#333]'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${props.skipIntro ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                       <div className="bg-black p-6 rounded-2xl border border-[#333] flex items-center justify-between">
                            <div className="flex items-center gap-3 text-gray-400">
                                <Music size={20} />
                                <div>
                                    <h3 className="font-black uppercase text-xs text-white">Audio Engine</h3>
                                    <p className="text-[10px]">Web Audio API • 44.1kHz / 48kHz</p>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono">v17.0.0</div>
                        </div>
                    </div>
                 </div>
            )}

            {/* SAVE / LOAD */}
            {menuView === 'SAVE_LOAD' && (
                 <StartMenuSaveLoad 
                    onClose={() => { setMenuView('MAIN'); setPendingAction(null); }}
                    onImport={props.onImport}
                    onSaveBrowser={props.onSaveBrowser}
                    checkNameCollision={props.checkNameCollision}
                    onLoadBrowser={(id) => { handleExit(); props.onLoadBrowser(id); setMenuView('MAIN'); }}
                    onDeleteSave={props.onDeleteSave}
                    onDownloadSave={props.onDownloadSave}
                    onRenameSave={props.onRenameSave}
                    onNewProject={() => { handleExit(); props.onNewProject(); setMenuView('MAIN'); }}
                    savedProjects={props.savedProjects}
                    hasActiveProject={props.hasActiveProject}
                    setPendingAction={setPendingAction}
                    pendingAction={pendingAction}
                    fileInputRef={fileInputRef}
                 />
            )}

            {/* CONFIRM NEW PROJECT */}
            {menuView === 'NEW_CONFIRM' && (
                 <div className="flex items-center justify-center h-full">
                    <div className="bg-[#111] p-8 rounded-3xl border-2 border-red-500/50 max-w-md w-full text-center shadow-[0_0_100px_rgba(220,38,38,0.2)]">
                        <h2 className="text-3xl font-black text-red-500 uppercase tracking-tighter mb-4">Let op!</h2>
                        <p className="text-sm text-gray-400 font-bold mb-8">Er is een project actief. Niet opgeslagen wijzigingen gaan verloren als je een nieuw project start.</p>
                        
                        <div className="space-y-3">
                            <button onClick={() => { setPendingAction('NEW'); setMenuView('SAVE_LOAD'); }} className="w-full py-4 bg-[#9bbc0f] text-black font-black uppercase rounded-xl hover:bg-white shadow-lg transition-transform hover:scale-[1.02]">
                                Eerst Opslaan
                            </button>
                            <button onClick={() => { handleExit(); props.onNewProject(); setMenuView('MAIN'); }} className="w-full py-4 bg-[#222] text-white font-black uppercase rounded-xl hover:bg-red-900 hover:text-red-100 border border-[#333] hover:border-red-500 transition-colors">
                                Wissen & Starten
                            </button>
                            <button onClick={() => setMenuView('MAIN')} className="w-full py-2 text-gray-500 text-xs font-black uppercase hover:text-white mt-4">
                                Annuleren
                            </button>
                        </div>
                    </div>
                 </div>
            )}

        </div>
      </div>
      
      <div className="absolute bottom-4 text-center w-full opacity-50 pointer-events-none">
         <div className="text-[9px] text-gray-600 font-black tracking-[0.3em] uppercase">Built with Gemini • Web Audio API • React</div>
      </div>
    </div>
  );
};

export default StartMenu;
