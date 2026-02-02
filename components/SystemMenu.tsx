
import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Download, RefreshCw, X, Settings, Keyboard, FileJson, Bluetooth, LogOut, Play, ChevronRight, AlertTriangle, Check } from 'lucide-react';

interface SystemMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNew: () => void;
  onImport: () => void;
  onExit: () => void;
  latencyMs: number;
  onLatencyChange: (ms: number) => void;
}

const SystemMenu: React.FC<SystemMenuProps> = ({ 
  isOpen, onClose, onSave, onLoad, onNew, onImport, onExit, latencyMs, onLatencyChange 
}) => {
  const [activeTab, setActiveTab] = useState<'PROJECT' | 'SETTINGS' | 'HELP'>('PROJECT');
  const [confirmAction, setConfirmAction] = useState<'NEW' | 'EXIT' | null>(null);

  // Reset confirm state als tab verandert of menu sluit
  useEffect(() => {
    setConfirmAction(null);
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const handleNewProjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmAction === 'NEW') {
      onNew();
      onClose();
      setConfirmAction(null);
    } else {
      setConfirmAction('NEW');
    }
  };

  const handleExitClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmAction === 'EXIT') {
      onExit();
      // Geen onClose() hier nodig, component unmount
    } else {
      setConfirmAction('EXIT');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setConfirmAction(null)}>
      <div className="bg-[#111] border-4 border-[#333] w-full max-w-2xl rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-[#222] p-4 flex justify-between items-center border-b border-[#333] shrink-0">
           <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
             <h2 className="text-[#9bbc0f] font-black uppercase tracking-widest text-lg">Systeem Gepauzeerd</h2>
           </div>
           <button onClick={onClose} className="text-gray-500 hover:text-white transition-transform hover:rotate-90"><X size={24}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#333] shrink-0 bg-[#0f0f0f]">
           {['PROJECT', 'SETTINGS', 'HELP'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-[#1a1a1a] transition-colors relative ${activeTab === tab ? 'bg-[#1a1a1a] text-white' : 'text-gray-600'}`}
              >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#9bbc0f]" />}
              </button>
           ))}
        </div>

        {/* Content */}
        <div className="p-8 bg-[#0c0c0c] overflow-y-auto custom-scrollbar flex-1">
           
           {activeTab === 'PROJECT' && (
             <div className="grid grid-cols-2 gap-4">
                {/* SAVE */}
                <button 
                  type="button"
                  onClick={() => { onSave(); onClose(); }} 
                  className="bg-[#1a1a1a] border border-[#333] p-6 rounded hover:bg-[#9bbc0f] hover:text-black group transition-all hover:-translate-y-1 text-left relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Save size={64} /></div>
                   <Download size={32} className="mb-4 text-gray-500 group-hover:text-black" />
                   <div className="font-black uppercase text-xs">Opslaan / Export</div>
                   <div className="text-[9px] text-gray-600 group-hover:text-black/60 font-bold mt-1">Download project (.JSON)</div>
                </button>

                {/* LOAD */}
                <button 
                  type="button"
                  onClick={() => { onImport(); onClose(); }} 
                  className="bg-[#1a1a1a] border border-[#333] p-6 rounded hover:bg-purple-600 hover:text-white group transition-all hover:-translate-y-1 text-left relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><FolderOpen size={64} /></div>
                   <FolderOpen size={32} className="mb-4 text-gray-500 group-hover:text-white" />
                   <div className="font-black uppercase text-xs">Laden / Import</div>
                   <div className="text-[9px] text-gray-600 group-hover:text-white/60 font-bold mt-1">Open bestand (.JSON)</div>
                </button>

                {/* RESET (NEW PROJECT) */}
                <button 
                  type="button"
                  onClick={handleNewProjectClick} 
                  className={`border p-6 rounded group transition-all hover:-translate-y-1 text-left relative overflow-hidden
                    ${confirmAction === 'NEW' 
                      ? 'bg-red-900 border-red-500 text-white animate-pulse' 
                      : 'bg-[#1a1a1a] border-[#333] hover:bg-orange-600 hover:text-white'}
                  `}
                >
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      {confirmAction === 'NEW' ? <AlertTriangle size={64} /> : <RefreshCw size={64} />}
                   </div>
                   
                   {confirmAction === 'NEW' ? (
                     <>
                        <AlertTriangle size={32} className="mb-4 text-red-400" />
                        <div className="font-black uppercase text-xs text-red-400">ZEKER WETEN?</div>
                        <div className="text-[9px] text-red-300 font-bold mt-1">Klik nogmaals om alles te wissen</div>
                     </>
                   ) : (
                     <>
                        <RefreshCw size={32} className="mb-4 text-gray-500 group-hover:text-white" />
                        <div className="font-black uppercase text-xs">Nieuw Project</div>
                        <div className="text-[9px] text-gray-600 group-hover:text-white/60 font-bold mt-1">Canvas wissen</div>
                     </>
                   )}
                </button>

                {/* EXIT */}
                <button 
                  type="button"
                  onClick={handleExitClick} 
                  className={`border p-6 rounded group transition-all hover:-translate-y-1 text-left relative overflow-hidden
                    ${confirmAction === 'EXIT' 
                      ? 'bg-red-900 border-red-500 text-white animate-pulse' 
                      : 'bg-[#1a1a1a] border-[#333] hover:bg-red-600 hover:text-white'}
                  `}
                >
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      {confirmAction === 'EXIT' ? <AlertTriangle size={64} /> : <LogOut size={64} />}
                   </div>

                   {confirmAction === 'EXIT' ? (
                     <>
                        <AlertTriangle size={32} className="mb-4 text-red-400" />
                        <div className="font-black uppercase text-xs text-red-400">AFSLUITEN?</div>
                        <div className="text-[9px] text-red-300 font-bold mt-1">Klik nogmaals voor titelscherm</div>
                     </>
                   ) : (
                     <>
                        <LogOut size={32} className="mb-4 text-gray-500 group-hover:text-white" />
                        <div className="font-black uppercase text-xs">Naar Titelscherm</div>
                        <div className="text-[9px] text-gray-600 group-hover:text-white/60 font-bold mt-1">Sluit editor af</div>
                     </>
                   )}
                </button>
             </div>
           )}

           {activeTab === 'SETTINGS' && (
             <div className="space-y-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-2 text-[#9bbc0f]">
                      <Bluetooth size={20} />
                      <h3 className="font-black uppercase text-sm">Bluetooth Audio Vertraging</h3>
                   </div>
                   <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                     Gebruik je een draadloze koptelefoon? Verhoog deze waarde als de cursor niet gelijk loopt met het geluid tijdens het opnemen.
                   </p>
                   
                   <div className="flex items-center gap-4 bg-[#080808] p-4 rounded-lg border border-[#222]">
                      <input 
                        type="range" min="0" max="500" step="10" 
                        value={latencyMs}
                        onChange={(e) => onLatencyChange(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#9bbc0f]"
                      />
                      <span className="w-20 text-right font-mono text-[#9bbc0f] font-bold">{latencyMs} ms</span>
                   </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-[#222]">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Settings size={20} />
                      <h3 className="font-black uppercase text-sm">Systeem Info</h3>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#080808] p-3 rounded border border-[#222]">
                        <div className="text-[8px] text-gray-500 uppercase font-bold">Versie</div>
                        <div className="text-xs text-white font-mono">17.0 (Stable)</div>
                      </div>
                      <div className="bg-[#080808] p-3 rounded border border-[#222]">
                        <div className="text-[8px] text-gray-500 uppercase font-bold">Sample Rate</div>
                        <div className="text-xs text-white font-mono">{new (window.AudioContext || (window as any).webkitAudioContext)().sampleRate} Hz</div>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'HELP' && (
             <div className="space-y-4">
                <h3 className="font-black uppercase text-sm text-gray-400 mb-4 flex items-center gap-2"><Keyboard size={16}/> Sneltoetsen Overzicht</h3>
                <div className="bg-[#080808] p-4 rounded-lg border border-[#222] grid grid-cols-2 gap-x-8 gap-y-3 text-[10px] font-mono text-gray-500">
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>SPATIE</span> <span className="text-[#9bbc0f]">Start / Stop</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>Z - M / Q - U</span> <span className="text-white">Muzieknoten</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>PIJLTOETSEN</span> <span className="text-white">Navigatie</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>DELETE</span> <span className="text-white">Selectie Wissen</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>CTRL + Z</span> <span className="text-white">Ongedaan maken</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>SHIFT + SLEEP</span> <span className="text-white">Multi Selectie</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>DUBBEL KLIK</span> <span className="text-white">Cel Editor</span></div>
                   <div className="flex justify-between border-b border-[#222] pb-1"><span>SHIFT + S/V/A</span> <span className="text-purple-400">Effecten</span></div>
                </div>
             </div>
           )}

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-[#333] bg-[#1a1a1a] shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-[#9bbc0f] hover:bg-[#8bac0f] text-black font-black uppercase tracking-[0.2em] rounded-lg shadow-lg hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Play size={18} fill="currentColor" /> Verder Componeren
          </button>
        </div>

      </div>
    </div>
  );
};

export default SystemMenu;
