
import { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { Pattern, TrackerRow, Sample, CompositionSettings, PatternClip, ProjectState, SavedProjectMeta } from '../types';
import { generateAIPatterns, generateCustomClips, suggestBassline as suggestBasslineAI } from '../services/geminiService';
import { PATTERN_LIBRARY } from '../services/sampleLibrary';
import { DEMO_PROJECT_DATA } from '../services/demoData';

const initialState: ProjectState = {
  patterns: [],
  arrangement: [],
  bpm: 140,
  activePatternId: null,
  samples: [],
  customClips: [],
  history: [],
};

const INDEX_KEY = 'vgm_saves_index';
const SAVE_PREFIX = 'vgm_save_';
const DEMO_ID = 'demo_8bit_v2'; 

export const getDefaultProjectName = () => {
    const date = new Date().toLocaleDateString('nl-NL').replace(/\//g, '-');
    return `VGM ${date}`;
};

export function useProject() {
  const [state, setState] = useState<ProjectState>(initialState);
  const [isComposing, setIsComposing] = useState(false);
  const [aiProgress, setAiProgress] = useState<string>("");
  const [streamingLog, setStreamingLog] = useState<string>(""); // New state for stream text
  const [isGeneratingClip, setIsGeneratingClip] = useState(false);
  
  const [savedProjects, setSavedProjects] = useState<SavedProjectMeta[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Mixer State
  const [channelConfigs, setChannelConfigs] = useState<Record<number, { dutyCycle: string, mute: boolean, solo: boolean, volume: number }>>({
    1: { dutyCycle: "0.5", mute: false, solo: false, volume: 1.0 },
    2: { dutyCycle: "0.25", mute: false, solo: false, volume: 1.0 },
    3: { dutyCycle: "0.5", mute: false, solo: false, volume: 1.0 },
    4: { dutyCycle: "0.5", mute: false, solo: false, volume: 1.0 },
  });

  const toggleMute = useCallback((ch: number) => {
      setChannelConfigs(prev => {
          const cfg = prev[ch];
          const newMute = !cfg.mute;
          return {
              ...prev,
              [ch]: { 
                  ...cfg, 
                  mute: newMute,
                  solo: newMute ? false : cfg.solo 
              }
          };
      });
  }, []);

  const toggleSolo = useCallback((ch: number) => {
      setChannelConfigs(prev => {
          const cfg = prev[ch];
          const newSolo = !cfg.solo;
          return {
              ...prev,
              [ch]: { 
                  ...cfg, 
                  solo: newSolo,
                  mute: newSolo ? false : cfg.mute 
              }
          };
      });
  }, []);

  const setChannelVolume = useCallback((ch: number, vol: number) => {
      setChannelConfigs(prev => {
          const cfg = prev[ch];
          let newMute = cfg.mute;
          let newSolo = cfg.solo;

          if (vol <= 0.001) { 
              newMute = true;
              newSolo = false; 
          } else if (cfg.volume <= 0.001 && vol > 0.001) {
              newMute = false;
          }

          return {
              ...prev,
              [ch]: { ...cfg, volume: vol, mute: newMute, solo: newSolo }
          };
      });
  }, []);

  useEffect(() => {
    try {
        const rawIndex = localStorage.getItem(INDEX_KEY);
        let index: SavedProjectMeta[] = rawIndex ? JSON.parse(rawIndex) : [];
        
        const hasDemo = index.find(p => p.id === DEMO_ID);
        
        if (!hasDemo) {
            const demoState: ProjectState = {
                ...initialState,
                ...DEMO_PROJECT_DATA,
                history: []
            } as ProjectState; 

            localStorage.setItem(`${SAVE_PREFIX}${DEMO_ID}`, JSON.stringify(demoState));
            
            const demoMeta: SavedProjectMeta = {
                id: DEMO_ID,
                name: "Demo: 8-Bit Adventure",
                date: Date.now(),
                previewBpm: DEMO_PROJECT_DATA.bpm || 160,
                isDemo: true
            };
            
            index = index.filter(p => p.id !== 'demo_8bit_adv');
            index = [demoMeta, ...index];
            localStorage.setItem(INDEX_KEY, JSON.stringify(index));
        }

        setSavedProjects(index);
    } catch (e) { console.error("Could not load save index", e); }
  }, []);

  const updateState = useCallback((updater: (prevState: ProjectState) => Omit<ProjectState, 'history'>, trackHistory = true) => {
    setState(prevState => {
      const newState = updater(prevState);
      if (trackHistory && prevState.history.length < 50) {
        const snapshot = {
          patterns: prevState.patterns,
          arrangement: prevState.arrangement,
          bpm: prevState.bpm,
          customClips: prevState.customClips
        };
        const newHistory = [snapshot, ...prevState.history];
        return { ...newState, history: newHistory };
      }
      return { ...newState, history: trackHistory ? prevState.history : [] };
    });
  }, []);

  const setPatterns = (patterns: Pattern[]) => updateState(s => ({ ...s, patterns }));
  const setBpm = (bpm: number) => updateState(s => ({...s, bpm}));
  const setActivePatternId = (id: string | null) => setState(s => ({...s, activePatternId: id}));

  const addPattern = useCallback(() => {
    updateState(s => {
      const newId = `pat-${Math.random().toString(36).substr(2, 9)}`;
      const newPattern: Pattern = {
        id: newId,
        name: `PATTERN ${s.patterns.length + 1}`,
        channels: { 1: [], 2: [], 3: [], 4: [] }
      };
      return { ...s, patterns: [...s.patterns, newPattern], activePatternId: newId };
    });
  }, [updateState]);

  const copyPattern = useCallback((id: string) => {
    updateState(s => {
      const source = s.patterns.find(p => p.id === id);
      if (!source) return s;
      const newId = `pat-${Math.random().toString(36).substr(2, 9)}`;
      const newPattern: Pattern = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} COPY`
      };
      return { ...s, patterns: [...s.patterns, newPattern], activePatternId: newId };
    });
  }, [updateState]);

  const renamePattern = useCallback((id: string, newName: string) => {
    updateState(s => ({
      ...s,
      patterns: s.patterns.map(p => p.id === id ? { ...p, name: newName.toUpperCase() } : p)
    }));
  }, [updateState]);

  const deletePattern = useCallback((id: string) => {
    updateState(s => {
      const newPatterns = s.patterns.filter(p => p.id !== id);
      const newArrangement = s.arrangement.filter(pId => pId !== id);
      let newActiveId = s.activePatternId;
      if (newActiveId === id) {
        newActiveId = newPatterns.length > 0 ? newPatterns[0].id : null;
      }
      return {
        ...s,
        patterns: newPatterns,
        arrangement: newArrangement,
        activePatternId: newActiveId
      };
    });
  }, [updateState]);

  const startNew = useCallback(() => {
      const newId = `pat-start`;
      const newPattern: Pattern = {
        id: newId,
        name: `PATTERN 1`,
        channels: { 1: [], 2: [], 3: [], 4: [] }
      };
      setState({ ...initialState, patterns: [newPattern], activePatternId: newId, history: [] });
  }, []);
  
  const addPatternToTimeline = (id: string) => updateState(s => ({ ...s, arrangement: [...s.arrangement, id]}));
  const removePatternFromTimeline = (index: number) => updateState(s => ({...s, arrangement: s.arrangement.filter((_, i) => i !== index)}));

  const reorderArrangement = useCallback((startIndex: number, endIndex: number) => {
    updateState(s => {
      const result = Array.from(s.arrangement);
      const [removed] = result.splice(startIndex, 1);
      let finalIndex = endIndex;
      if (startIndex < endIndex) finalIndex = endIndex - 1;
      result.splice(finalIndex, 0, removed);
      return { ...s, arrangement: result };
    });
  }, [updateState]);

  const insertPatternInTimeline = useCallback((patternId: string, index: number) => {
    updateState(s => {
      const newArrangement = [...s.arrangement];
      newArrangement.splice(index, 0, patternId);
      return { ...s, arrangement: newArrangement };
    });
  }, [updateState]);

  const dropAsset = useCallback((ch: number, step: number, rawData: string) => {
    updateState(s => {
      const activePattern = s.patterns.find(p => p.id === s.activePatternId);
      if (!activePattern) return s;
      const newChannels = { ...activePattern.channels };

      if (rawData.startsWith('clip:')) {
        const clipId = rawData.replace('clip:', '');
        const allClips = [...PATTERN_LIBRARY, ...s.customClips];
        const clip = allClips.find(c => c.id === clipId);
        
        if (clip) {
          let maxClipStep = 0;
          (Object.values(clip.channels) as Partial<TrackerRow>[][]).forEach(rows => {
              rows.forEach(r => { if ((r.step || 0) > maxClipStep) maxClipStep = r.step || 0; });
          });
          
          const clipLength = maxClipStep + 1;

          Object.entries(clip.channels).forEach(([clipCh, clipRows]) => {
            const srcCh = parseInt(clipCh);
            const targetCh = srcCh as 1|2|3|4; 

            if (targetCh >= 1 && targetCh <= 4) {
                let existingRows = [...(newChannels[targetCh] || [])];
                existingRows = existingRows.filter(r => r.step < step || r.step >= step + clipLength);

                (clipRows as Partial<TrackerRow>[]).forEach(cr => {
                  const targetStep = step + cr.step!;
                  if (targetStep < 64) {
                    const finalRow: TrackerRow = {
                      id: Math.random().toString(36).substr(2, 9),
                      step: targetStep,
                      pitch: cr.pitch || 'C-4',
                      instrument: cr.instrument || (targetCh === 3 ? "SUB" : (targetCh === 4 ? "KICK" : "LEAD")),
                      volume: cr.volume ?? 12,
                      dutyCycle: cr.dutyCycle || (targetCh === 2 ? "0.25" : "0.5") as any,
                      effect: cr.effect || 'NONE',
                      arpNotes: cr.arpNotes,
                      decay: cr.decay,
                      panning: cr.panning,
                      slide: cr.slide 
                    };
                    existingRows.push(finalRow);

                    const cutOffStep = targetStep + 1;
                    const hasNextNoteInClip = (clipRows as Partial<TrackerRow>[]).some(r => r.step === cr.step! + 1);
                    
                    if (cutOffStep < 64 && !hasNextNoteInClip) {
                        const alreadyHasEntry = existingRows.some(r => r.step === cutOffStep);
                        if (!alreadyHasEntry) {
                            existingRows.push({
                                id: Math.random().toString(36).substr(2, 9),
                                step: cutOffStep,
                                pitch: 'OFF',
                                instrument: '---',
                                volume: 0,
                                dutyCycle: '0.5'
                            } as TrackerRow);
                        }
                    }
                  }
                });

                if (clipLength > 1) {
                    const endStep = step + clipLength;
                    if (endStep < 64) {
                        const hasNoteAtEnd = existingRows.some(r => r.step === endStep);
                        if (!hasNoteAtEnd) {
                            existingRows.push({
                                id: Math.random().toString(36).substr(2, 9),
                                step: endStep,
                                pitch: 'OFF',
                                instrument: '---',
                                volume: 0,
                                dutyCycle: '0.5'
                            } as TrackerRow);
                        }
                    }
                }

                newChannels[targetCh] = existingRows.sort((a,b) => a.step - b.step);
            }
          });
        }
      }
      const newPatterns = s.patterns.map(p => p.id === s.activePatternId ? { ...p, channels: newChannels } : p);
      return { ...s, patterns: newPatterns };
    });
  }, [updateState]);

  const checkNameCollision = useCallback((name: string) => {
      return savedProjects.find(p => p.name.toLowerCase() === name.toLowerCase());
  }, [savedProjects]);

  const saveToBrowser = useCallback((name: string, overwriteId?: string, specificState?: ProjectState) => {
    const stateToSave = specificState || state;
    const { history, ...saveState } = stateToSave;
    const finalName = name || getDefaultProjectName();

    try {
        const id = overwriteId || Date.now().toString();
        if (id === DEMO_ID) {
            alert("Je kunt de demo niet overschrijven. Sla op als een nieuw project.");
            return false;
        }

        const saveKey = `${SAVE_PREFIX}${id}`;
        localStorage.setItem(saveKey, JSON.stringify(saveState));
        
        let newIndex = [...savedProjects];
        if (overwriteId) {
            newIndex = newIndex.map(p => p.id === id ? { ...p, name: finalName, date: Date.now(), previewBpm: stateToSave.bpm } : p);
        } else {
            const newMeta: SavedProjectMeta = { id, name: finalName, date: Date.now(), previewBpm: stateToSave.bpm };
            newIndex = [newMeta, ...newIndex];
        }
        
        setSavedProjects(newIndex);
        localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
        return true;
    } catch (e) {
        console.error("Failed to save to browser", e);
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
             alert("Opslag vol! Verwijder oude projecten om ruimte te maken.");
        }
        return false;
    }
  }, [state, savedProjects]);

  const loadFromBrowser = useCallback((id: string) => {
    try {
        const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`);
        if (!raw) return false;
        
        const data = JSON.parse(raw);
        setState(s => ({
            ...s,
            bpm: data.bpm || 140,
            patterns: data.patterns || [],
            arrangement: data.arrangement || [],
            customClips: data.customClips || [],
            activePatternId: data.patterns?.[0]?.id || null,
            history: []
        }));
        return true;
    } catch (e) {
        console.error("Failed to load from browser", e);
        return false;
    }
  }, []);

  const deleteLocalSave = useCallback((id: string) => {
      try {
          if (id === DEMO_ID) {
              alert("Je kunt het demo project niet verwijderen.");
              return;
          }
          localStorage.removeItem(`${SAVE_PREFIX}${id}`);
          const newIndex = savedProjects.filter(p => p.id !== id);
          setSavedProjects(newIndex);
          localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
      } catch(e) { console.error("Error deleting save", e); }
  }, [savedProjects]);

  const renameSavedProject = useCallback((id: string, newName: string) => {
      try {
          if (id === DEMO_ID) return; // Cannot rename demo
          const newIndex = savedProjects.map(p => p.id === id ? { ...p, name: newName } : p);
          setSavedProjects(newIndex);
          localStorage.setItem(INDEX_KEY, JSON.stringify(newIndex));
      } catch (e) { console.error("Error renaming project", e); }
  }, [savedProjects]);

  const importProjectToLibrary = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const defaultName = file.name.replace('.json', '');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.patterns) throw new Error("Invalid project file");
        const importedState: ProjectState = {
            ...initialState,
            bpm: data.bpm || 140,
            patterns: data.patterns || [],
            arrangement: data.arrangement || [],
            customClips: data.customClips || [],
            activePatternId: data.patterns?.[0]?.id || null,
            history: []
        };
        saveToBrowser(defaultName, undefined, importedState);
        alert("Project geïmporteerd in Bibliotheek!");
      } catch (err) { 
          console.error(err);
          alert("Fout bij lezen bestand."); 
      }
    };
    reader.readAsText(file);
  }, [saveToBrowser]);

  const exportProject = useCallback((name?: string) => {
    const { history, ...exportableState } = state;
    const data = JSON.stringify(exportableState, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name || getDefaultProjectName()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const exportSavedProject = useCallback((id: string, name: string) => {
      try {
        const raw = localStorage.getItem(`${SAVE_PREFIX}${id}`);
        if (!raw) return;
        const blob = new Blob([raw], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch(e) { console.error("Export failed", e); }
  }, []);

  const cancelAI = useCallback(() => {
     if (abortControllerRef.current) {
         abortControllerRef.current.abort();
         abortControllerRef.current = null;
     }
     setIsComposing(false);
     setAiProgress("");
     setStreamingLog("");
  }, []);

  const composeWithAI = useCallback(async (settings: CompositionSettings): Promise<boolean> => {
    setIsComposing(true);
    setAiProgress("Verbinding maken met Gemini...");
    setStreamingLog(""); // Reset log
    abortControllerRef.current = new AbortController();

    try {
      // Pass setStreamingLog as callback
      const result = await generateAIPatterns(settings, abortControllerRef.current.signal, (text) => {
          setStreamingLog(text);
          // Keep scrolling to bottom of log handled in UI
      });
      
      setAiProgress("Project Laden...");
      // Short delay to let user see "Finished" state if desired, but we usually jump straight to editor
      
      setState(s => ({
          ...s,
          bpm: result.bpm,
          patterns: result.patterns,
          arrangement: result.arrangement,
          activePatternId: result.patterns?.[0]?.id || null,
          history: []
      }));
      return true;
    } catch (e: any) {
        if (e.message === 'Aborted' || e.name === 'AbortError') console.log("AI Generation Cancelled by User");
        else alert("AI Generation Failed: " + (e.message || "Unknown error"));
        return false;
    }
    finally { 
        setIsComposing(false); 
        setAiProgress("");
        setStreamingLog("");
        abortControllerRef.current = null;
    }
  }, []);

  const generateNewClips = useCallback(async (prompt: string, channels: number[], length: number) => {
    setIsGeneratingClip(true);
    try {
      const newClips = await generateCustomClips(prompt, channels, length);
      setState(s => ({ ...s, customClips: [...s.customClips, ...newClips] }));
    } catch (e) { console.error(e); }
    finally { setIsGeneratingClip(false); }
  }, []);

  const deleteCustomClip = useCallback((id: string) => {
    updateState(s => ({ ...s, customClips: s.customClips.filter(c => c.id !== id) }));
  }, [updateState]);

  const suggestBassline = useCallback(async (melodyRows: TrackerRow[]) => {
    setIsComposing(true);
    setAiProgress("Baslijn Genereren...");
    try {
      const suggestedRows = await suggestBasslineAI(melodyRows);
      updateState(s => {
        if (!s.activePatternId) return s;
        return {
          ...s,
          patterns: s.patterns.map(p => p.id === s.activePatternId ? {
            ...p,
            channels: { ...p.channels, 3: suggestedRows.map((r, i) => ({ ...r, id: r.id || `suggested-${i}-${Date.now()}`, step: r.step !== undefined ? r.step : i, instrument: (r.instrument as any) || "SUB", volume: r.volume ?? 12, dutyCycle: (r.dutyCycle as any) || "0.5" } as TrackerRow)) }
          } : p)
        };
      });
    } catch (e) { console.error("AI Bassline suggestion failed:", e); } finally { setIsComposing(false); setAiProgress(""); }
  }, [updateState]);
  
  const undo = useCallback(() => {
    setState(prevState => {
      if (prevState.history.length === 0) return prevState;
      const [lastState, ...restOfHistory] = prevState.history;
      return { ...prevState, ...lastState, history: restOfHistory };
    });
  }, []);

  return {
    state,
    isComposing,
    aiProgress,
    streamingLog, // Exposed
    cancelAI,
    isGeneratingClip,
    channelConfigs,
    hasProjectData: state.patterns.length > 0,
    savedProjects,
    setPatterns,
    setBpm,
    setActivePatternId,
    addPattern,
    copyPattern,
    renamePattern,
    deletePattern,
    startNew,
    addPatternToTimeline,
    removePatternFromTimeline,
    reorderArrangement,
    insertPatternInTimeline,
    dropAsset,
    importProject: importProjectToLibrary,
    exportProject,
    exportSavedProject,
    saveToBrowser,
    checkNameCollision,
    loadFromBrowser,
    deleteLocalSave,
    renameSavedProject,
    composeWithAI,
    generateNewClips,
    deleteCustomClip,
    suggestBassline,
    undo,
    toggleMute,
    toggleSolo,
    setChannelVolume
  };
}
