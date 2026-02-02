
import React, { useState, useCallback, useEffect } from "react";
import { CompositionSettings, ViewMode } from "./types";
import { useProject } from './hooks/useProject';
import { usePlayback } from './hooks/usePlayback';
import MainLayout from "./components/MainLayout";
import StartMenu from "./components/StartMenu";
import MobileStudio from "./components/MobileStudio";

const App: React.FC = () => {
  // DETECT DEVICE TYPE ON INIT
  // Strict separation: If width <= 768px, we assume Mobile and skip the Desktop environment entirely.
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
      const checkMobile = () => {
          setIsMobileDevice(window.innerWidth <= 768);
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [view, setView] = useState<ViewMode>('START');
  const [startWithAcademy, setStartWithAcademy] = useState(false);
  const [isFollowMode, setIsFollowMode] = useState(true);
  
  // Force view to Mobile Studio immediately if on mobile device
  useEffect(() => {
      if (isMobileDevice) {
          setView('MOBILE_STUDIO');
      }
  }, [isMobileDevice]);
  
  // Initialize from LocalStorage to respect user preference on reload
  // On Mobile, we ALWAYS skip the intro animation regardless of setting.
  const [skipStartAnim, setSkipStartAnim] = useState(() => {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) return true;
      try {
        return localStorage.getItem('vgm_skip_intro') === 'true';
      } catch (e) {
        return false;
      }
  });
  
  const project = useProject();
  const playback = usePlayback(project.state, project.channelConfigs);
  
  const [latencyMs, setLatencyMs] = useState(() => {
    try {
      const saved = localStorage.getItem('vgm_bt_latency');
      return saved ? parseInt(saved) : 150;
    } catch(e) {
      return 150;
    }
  });

  const handleLatencyChange = (ms: number) => {
    setLatencyMs(ms);
    try {
      localStorage.setItem('vgm_bt_latency', ms.toString());
    } catch(e) {
      console.warn("Could not save latency preference");
    }
  };

  // Persist the skip setting
  const handleSkipSettingChange = (skip: boolean) => {
      setSkipStartAnim(skip);
      try {
        localStorage.setItem('vgm_skip_intro', skip.toString());
      } catch(e) {
        console.warn("Could not save skip intro preference");
      }
  };

  const [aiSettings, setAiSettings] = useState<CompositionSettings>({
    genre: 'ACTION',
    emotion: 'HEROIC',
    energy: 'HIGH',
    structure: 'SONG_FULL', // Default
    tonality: 'MINOR'       // Default
  });

  useEffect(() => {
    if (playback.isPlaying && isFollowMode && playback.playbackMode === 'SONG') {
      const newPatternId = project.state.arrangement[playback.currentArrIdx];
      if (newPatternId && newPatternId !== project.state.activePatternId) {
        project.setActivePatternId(newPatternId);
      }
    }
  }, [playback.currentArrIdx, playback.isPlaying, isFollowMode, playback.playbackMode, project.state.arrangement, project.state.activePatternId, project.setActivePatternId]);

  const handleStartNewProject = useCallback(() => {
    project.startNew();
    setStartWithAcademy(false);
    setSkipStartAnim(true); // Skip animation for this session navigation
    setView('EDITOR');
  }, [project]);

  const handleStartAcademy = useCallback(() => {
    project.startNew();
    setStartWithAcademy(true);
    setSkipStartAnim(true); // Skip animation for this session navigation
    setView('EDITOR');
  }, [project]);

  // Toggle between Mobile and Desktop modes
  const handleToggleMobileMode = useCallback((enable: boolean) => {
      playback.stop();
      setSkipStartAnim(true); // Always skip animation when switching modes manually
      
      if (enable) {
          // If no project loaded, start new one
          if (!project.hasProjectData) {
              project.startNew();
          }
          setView('MOBILE_STUDIO');
      } else {
          setView('START');
      }
  }, [project, playback]);

  const handleImportProject = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    project.importProject(e);
  }, [project]);
  
  const handleLoadBrowser = useCallback((id: string) => {
     if (project.loadFromBrowser(id)) {
         setSkipStartAnim(true);
         // If we are in mobile mode (detected), stay in mobile studio after load
         // otherwise go to editor
         setView(isMobileDevice ? 'MOBILE_STUDIO' : 'EDITOR');
     }
  }, [project, isMobileDevice]);

  const handleComposeWithAI = useCallback(async (settings: CompositionSettings) => {
    const success = await project.composeWithAI(settings);
    // If composing from mobile view, stay there, otherwise go to editor
    if (success && view !== 'MOBILE_STUDIO') {
      setSkipStartAnim(true);
      setView('EDITOR');
    }
  }, [project, view]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // --- MOBILE STUDIO VIEW ---
  if (view === 'MOBILE_STUDIO') {
      return (
          <MobileStudio 
            isNativeMobile={isMobileDevice} // Pass detected device state
            onBack={() => { 
                playback.stop(); 
                setView('START'); 
            }}
            isPlaying={playback.isPlaying}
            onPlay={playback.play}
            onStop={playback.stop}
            onPause={playback.pause} 
            onCompose={handleComposeWithAI}
            isComposing={project.isComposing}
            currentSongName={project.savedProjects.find(p => JSON.stringify(project.state).length === JSON.stringify(p).length)?.name || "Mijn Compositie"}
            onSave={(name) => project.saveToBrowser(name)}
            onExport={project.exportProject}
            onImport={handleImportProject}
            onNewProject={project.startNew}
            aiSettings={aiSettings}
            onAiSettingsChange={setAiSettings}
            bpm={project.state.bpm}
            // Timeline Props
            patterns={project.state.patterns}
            arrangement={project.state.arrangement}
            currentArrIdx={playback.currentArrIdx}
            streamingLog={project.streamingLog}
            // Mode Switching
            onToggleMobileMode={handleToggleMobileMode}
          />
      );
  }

  // --- DESKTOP START MENU ---
  if (view === 'START') {
    return (
      <StartMenu 
        onNewProject={handleStartNewProject} 
        onImport={handleImportProject} 
        onExport={project.exportProject}
        onSaveBrowser={project.saveToBrowser}
        checkNameCollision={project.checkNameCollision}
        onLoadBrowser={handleLoadBrowser}
        onDeleteSave={project.deleteLocalSave}
        onDownloadSave={project.exportSavedProject}
        onRenameSave={project.renameSavedProject}
        savedProjects={project.savedProjects}
        hasLocalSave={project.savedProjects.length > 0}
        hasActiveProject={project.hasProjectData}
        onResume={() => setView('EDITOR')}
        onCompose={handleComposeWithAI} 
        onOpenAcademy={handleStartAcademy}
        isComposing={project.isComposing} 
        aiProgress={project.aiProgress}
        streamingLog={project.streamingLog}
        onCancelAI={project.cancelAI}
        aiSettings={aiSettings} 
        onAiSettingsChange={setAiSettings}
        latencyMs={latencyMs}
        onLatencyChange={handleLatencyChange}
        skipIntro={skipStartAnim}
        onToggleSkipIntro={handleSkipSettingChange}
        onToggleMobileMode={handleToggleMobileMode}
      />
    );
  }

  // --- DESKTOP MAIN EDITOR ---
  return (
    <MainLayout 
      bpm={project.state.bpm} patterns={project.state.patterns} arrangement={project.state.arrangement} 
      activePatternId={project.state.activePatternId} samples={project.state.samples} customClips={project.state.customClips}
      historyCount={project.state.history.length} isComposing={project.isComposing} isGeneratingClip={project.isGeneratingClip} aiSettings={aiSettings}
      startWithAcademy={startWithAcademy}
      onBpmChange={project.setBpm} onPatternsChange={project.setPatterns} onActivePatternChange={project.setActivePatternId}
      onAddPattern={project.addPattern} onCopyPattern={project.copyPattern} onRenamePattern={project.renamePattern}
      onDeletePattern={project.deletePattern} onAddPatternToTimeline={project.addPatternToTimeline} onRemovePatternFromTimeline={project.removePatternFromTimeline}
      onReorderArrangement={project.reorderArrangement} onInsertPatternInTimeline={project.insertPatternInTimeline}
      onExport={project.exportProject} 
      onSaveBrowser={project.saveToBrowser}
      checkNameCollision={project.checkNameCollision}
      onImport={handleImportProject} onImportClick={() => fileInputRef.current?.click()} onUndo={project.undo} onSuggestBassline={project.suggestBassline}
      onHumanizeDrums={() => {}} onAiSettingsChange={setAiSettings} onDropAsset={project.dropAsset} onGenerateClips={project.generateNewClips}
      onDeleteCustomClip={project.deleteCustomClip}
      onNewProject={handleStartNewProject}
      
      // Mixer
      channelConfigs={project.channelConfigs}
      onToggleMute={project.toggleMute}
      onToggleSolo={project.toggleSolo}
      onSetVolume={project.setChannelVolume}
      
      playbackMode={playback.playbackMode} isPlaying={playback.isPlaying} currentStep={playback.currentStep} currentArrIdx={playback.currentArrIdx}
      isFollowMode={isFollowMode} isLoopingPattern={playback.isLooping} analyser={playback.analyser}
      onPlaybackModeChange={playback.setPlaybackMode} onCurrentArrIdxChange={playback.setCurrentArrIdx} onPlay={playback.play}
      onPlaySelection={playback.playSelection} onStop={playback.stop} onFollowModeToggle={() => setIsFollowMode(f => !f)} onLoopToggle={playback.toggleLoop}
      onBackToMenu={() => { playback.stop(); setView('START'); }}
    />
  );
};

export default App;
