import React, { useState } from 'react';
import { FolderOpen, Upload, Save, Edit, Download, Trash2, ChevronRight, Clock, Check, X, AlertTriangle, ArrowLeft, Star } from 'lucide-react';
import { SavedProjectMeta } from '../types';
import { getDefaultProjectName } from '../hooks/useProject';

interface StartMenuSaveLoadProps {
  onClose: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveBrowser: (name: string, overwriteId?: string) => void;
  checkNameCollision?: (name: string) => SavedProjectMeta | undefined;
  onLoadBrowser: (id: string) => void;
  onDeleteSave?: (id: string) => void;
  onDownloadSave?: (id: string, name: string) => void;
  onRenameSave?: (id: string, newName: string) => void;
  onNewProject: () => void;
  savedProjects?: SavedProjectMeta[];
  hasActiveProject: boolean;
  setPendingAction: (action: 'NEW' | null) => void;
  pendingAction: 'NEW' | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const StartMenuSaveLoad: React.FC<StartMenuSaveLoadProps> = (props) => {
  const [newProjectName, setNewProjectName] = useState(getDefaultProjectName());
  const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; name: string; existingId: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleLocalSave = () => {
      const name = newProjectName.trim() || getDefaultProjectName();
      
      if (props.checkNameCollision) {
          const existing = props.checkNameCollision(name);
          if (existing) {
              setConflictModal({ isOpen: true, name, existingId: existing.id });
              return;
          }
      }
      
      props.onSaveBrowser(name);
      
      if (props.pendingAction === 'NEW') {
          props.onNewProject();
          props.setPendingAction(null);
      }
  };

  const handleOverwrite = () => {
      if (conflictModal) {
          props.onSaveBrowser(conflictModal.name, conflictModal.existingId);
          setConflictModal(null);
          if (props.pendingAction === 'NEW') {
              props.onNewProject();
              props.setPendingAction(null);
          }
      }
  };

  const handleSaveAsNew = () => {
      if (conflictModal) {
          let finalName = `${conflictModal.name} (Kopie)`;
          
          // Als we checkNameCollision hebben, zoeken we een unieke naam
          if (props.checkNameCollision) {
              let counter = 2;
              while (props.checkNameCollision(finalName)) {
                  finalName = `${conflictModal.name} (Kopie ${counter})`;
                  counter++;
              }
          }

          props.onSaveBrowser(finalName);
          setConflictModal(null);
          
          if (props.pendingAction === 'NEW') {
              props.onNewProject();
              props.setPendingAction(null);
          }
      }
  };

  const handleStartRename = (id: string, currentName: string) => {
      setRenamingId(id);
      setRenameValue(currentName);
  };

  const handleCommitRename = () => {
      if (renamingId && props.onRenameSave && renameValue.trim()) {
          props.onRenameSave(renamingId, renameValue.trim());
      }
      setRenamingId(null);
  };

  return (
     <div className="bg-[#111] p-6 rounded-3xl border border-[#333] shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-300 h-[600px]">
        <div className="flex justify-between items-start mb-6 shrink-0">
            <div>
                <button onClick={props.onClose} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase mb-4"><ArrowLeft size={16}/> Terug</button>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter border-l-8 border-purple-500 pl-6">Project Beheer</h2>
            </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden bg-[#161616] rounded-2xl border border-[#333]">
            
            {/* IMPORT HEADER */}
            <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                    <FolderOpen size={20} className="text-[#9bbc0f]" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">Bibliotheek</span>
                </div>
                <button onClick={() => props.fileInputRef.current?.click()} className="bg-[#333] hover:bg-[#9bbc0f] hover:text-black text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase transition-all flex items-center gap-2 shadow-lg relative">
                    <Upload size={14}/> Importeer Bestand
                </button>
            </div>

            {/* ACTIVE PROJECT SAVE */}
            {props.hasActiveProject && (
                <div className="p-4 border-b border-[#333] bg-[#1a1a1a] flex flex-col gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-[#9bbc0f]">
                        <Save size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">Huidig Project Opslaan</span>
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Project naam..." 
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="flex-1 bg-[#080808] border border-[#333] rounded px-3 py-2 text-xs text-white focus:border-[#9bbc0f] outline-none font-mono"
                        />
                        <button 
                            onClick={handleLocalSave} 
                            disabled={!newProjectName.trim()}
                            className="bg-[#9bbc0f] text-black px-4 py-2 rounded font-black text-[10px] uppercase hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Opslaan
                        </button>
                    </div>
                </div>
            )}

            {/* LIST */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {!props.savedProjects || props.savedProjects.length === 0 ? (
                    <div className="text-center py-20 text-sm text-gray-600 italic">
                        Je bibliotheek is leeg. Importeer een bestand of start een nieuw project.
                    </div>
                ) : (
                    props.savedProjects.map((proj) => {
                        const isDemo = proj.isDemo;
                        return (
                        <div key={proj.id} className={`p-4 rounded-xl border group flex justify-between items-center transition-all hover:shadow-lg hover:translate-x-1 ${isDemo ? 'bg-[#1a1a1a] border-amber-900/50 hover:border-amber-500/50' : 'bg-[#1a1a1a] border-[#222] hover:border-[#444] hover:bg-[#222]'}`}>
                            <div className="min-w-0 flex-1 mr-4">
                                {renamingId === proj.id ? (
                                    <div className="flex items-center gap-2 mb-1">
                                        <input 
                                            type="text" 
                                            value={renameValue} 
                                            onChange={e => setRenameValue(e.target.value)}
                                            className="bg-black/50 border border-blue-500 rounded text-sm font-bold text-white px-2 py-1 w-full outline-none"
                                            autoFocus
                                        />
                                        <button onClick={handleCommitRename} className="text-[#9bbc0f] hover:text-white"><Check size={16}/></button>
                                        <button onClick={() => setRenamingId(null)} className="text-red-500 hover:text-white"><X size={16}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mb-1">
                                        {isDemo && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                        <div className={`text-sm font-bold truncate ${isDemo ? 'text-amber-500' : 'text-white'}`}>{proj.name}</div>
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-500 flex items-center gap-3">
                                    <span className="flex items-center gap-1"><Clock size={12}/> {new Date(proj.date).toLocaleDateString()} {new Date(proj.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <span className="bg-[#000] px-2 py-0.5 rounded text-[9px] text-gray-400 font-mono">{proj.previewBpm} BPM</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {!isDemo && renamingId !== proj.id && (
                                    <button 
                                        onClick={() => handleStartRename(proj.id, proj.name)}
                                        className="p-3 bg-[#222] text-gray-400 border border-[#333] rounded-lg hover:bg-white hover:text-black transition-colors"
                                        title="Hernoemen"
                                    >
                                        <Edit size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => props.onDownloadSave?.(proj.id, proj.name)}
                                    className="p-3 bg-blue-900/20 text-blue-500 border border-blue-900/30 rounded-lg hover:bg-blue-500 hover:text-white transition-colors group/dl"
                                    title="Downloaden"
                                >
                                    <Download size={16} />
                                </button>
                                {!isDemo && (
                                    <button 
                                        onClick={() => props.onDeleteSave?.(proj.id)}
                                        className="p-3 bg-red-900/20 text-red-500 border border-red-900/30 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                        title="Verwijderen"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button 
                                    onClick={() => { props.onLoadBrowser(proj.id); props.onClose(); }}
                                    className="p-3 bg-[#9bbc0f] text-black border border-[#8bac0f] rounded-lg hover:bg-white transition-all shadow-lg"
                                    title="Laden"
                                >
                                    <ChevronRight size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>

        {/* OVERWRITE MODAL */}
        {conflictModal && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 rounded-3xl animate-in fade-in duration-200">
                <div className="bg-[#1a1a1a] border-2 border-orange-500 p-8 rounded-2xl shadow-2xl max-w-md w-full">
                    <div className="flex items-center gap-3 text-orange-500 mb-4">
                        <AlertTriangle size={32} />
                        <h3 className="text-xl font-black uppercase">Project Bestaat Al</h3>
                    </div>
                    <p className="text-sm text-gray-300 mb-6">
                        Een project met de naam <span className="font-bold text-white">"{conflictModal.name}"</span> bestaat al in je lokale bibliotheek. Wat wil je doen?
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                        <button onClick={handleOverwrite} className="w-full py-3 bg-orange-500 text-black font-black uppercase rounded-lg hover:bg-orange-400 transition-colors">
                            Overschrijven (Update)
                        </button>
                        <button onClick={handleSaveAsNew} className="w-full py-3 bg-[#333] text-white font-black uppercase rounded-lg hover:bg-[#444] transition-colors border border-gray-600">
                            Als Nieuw Opslaan (Kopie)
                        </button>
                        <button onClick={() => setConflictModal(null)} className="w-full py-2 text-xs text-gray-500 font-bold uppercase hover:text-white mt-2">
                            Annuleren
                        </button>
                    </div>
                </div>
            </div>
        )}
     </div>
  );
};

export default StartMenuSaveLoad;