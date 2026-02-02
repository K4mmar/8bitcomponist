
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Pattern, CompositionSettings, Sample, PatternClip, SavedProjectMeta } from '../types';
import { getDefaultProjectName } from '../hooks/useProject';
import { rowToNote, pitchToIndex, indexToPitch } from '../services/trackerUtils';
import { audioEngine } from '../services/audioEngine';
import { useSelection } from '../hooks/useSelection';
import Sidebar from './Sidebar';
import AssetBrowser from './AssetBrowser';
import Header from './Header';
import AcademyOverlay from './AcademyOverlay';
import SoundTestModule from './SoundTestModule';
import MixerStrip from './MixerStrip';
import EditorContainer from './EditorContainer';
import { patternToBlocks } from '../services/patternMutator';

interface MainLayoutProps {
  bpm: number;
  patterns: Pattern[];
  arrangement: string[];
  activePatternId: string | null;
  samples: Sample[];
  customClips: PatternClip[];
  historyCount: number;
  isComposing: boolean;
  isGeneratingClip: boolean;
  aiSettings: CompositionSettings;
  channelConfigs: any;
  startWithAcademy?: boolean;

  onBpmChange: (bpm: number) => void;
  onPatternsChange: (p: Pattern[]) => void;
  onActivePatternChange: (id: string | null) => void;
  onAddPattern: () => void;
  onCopyPattern: (id: string) => void;
  onRenamePattern: (id: string, name: string) => void;
  onDeletePattern: (id: string) => void;
  onAddPatternToTimeline: (patternId: string) => void;
  onRemovePatternFromTimeline: (index: number) => void;
  onReorderArrangement: (startIndex: number, endIndex: number) => void;
  onInsertPatternInTimeline: (patternId: string, index: number) => void;
  onExport: (name?: string) => void;
  onSaveBrowser: (name: string, overwriteId?: string) => void;
  checkNameCollision?: (name: string) => SavedProjectMeta | undefined;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportClick: () => void;
  onUndo: () => void;
  onSuggestBassline: (melodyRows: any[]) => void;
  onHumanizeDrums: (drumRows: any[]) => void;
  onAiSettingsChange: (settings: CompositionSettings) => void;
  onDropAsset: (ch: number, step: number, rawData: string) => void;
  onGenerateClips: (prompt: string, channels: number[], length: number) => void;
  onDeleteCustomClip: (id: string) => void;
  onNewProject: () => void;
  
  onToggleMute?: (ch: number) => void;
  onToggleSolo?: (ch: number) => void;
  onSetVolume?: (ch: number, vol: number) => void;

  playbackMode: 'PATTERN' | 'SONG';
  isPlaying: boolean;
  currentStep: number;
  currentArrIdx: number;
  isFollowMode: boolean;
  isLoopingPattern: boolean;
  analyser: AnalyserNode | null;

  onPlaybackModeChange: (mode: 'PATTERN' | 'SONG') => void;
  onCurrentArrIdxChange: (index: number) => void;
  onPlay: () => void;
  onPlaySelection: (range: { startStep: number, endStep: number }) => void;
  onStop: () => void;
  onFollowModeToggle: () => void;
  onLoopToggle: () => void;
  onBackToMenu: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const [isAcademyOpen, setIsAcademyOpen] = useState(!!props.startWithAcademy);
  const [isAssetBrowserOpen, setIsAssetBrowserOpen] = useState(true); 
  const [isSoundTestOpen, setIsSoundTestOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [academyHighlight, setAcademyHighlight] = useState<{ id: string; type: 'SELECT' | 'EDIT' } | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [filenameInput, setFilenameInput] = useState('');
  const [conflictModal, setConflictModal] = useState<{ isOpen: boolean; name: string; existingId: string } | null>(null);
  
  // 2-State Bottom Panel: Closed vs Open
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  const activePattern = props.patterns.find(p => p.id === props.activePatternId);
  const selection = useSelection(activePattern, props.currentStep, props.onPatternsChange, props.patterns, props.activePatternId, props.customClips);

  // Dialog Handlers
  const handleOpenSave = () => { setFilenameInput(getDefaultProjectName()); setSaveModalOpen(true); };
  const handleOpenExport = () => { setFilenameInput(getDefaultProjectName()); setExportModalOpen(true); };
  
  // Transpose with Preview Logic
  const handleTranspose = useCallback((semis: number) => {
      // 1. Play Preview Sound of the FIRST selected note
      if (selection.selectedCells.size > 0 && activePattern) {
          const blocks = patternToBlocks(activePattern);
          
          // Find first selected cell (time-based)
          const cells = Array.from(selection.selectedCells as Set<string>);
          cells.sort((a, b) => {
              const [ca, sa] = a.split('-').map(Number);
              const [cb, sb] = b.split('-').map(Number);
              return sa - sb || ca - cb;
          });
          
          const firstCell = cells[0];
          const [ch, step] = firstCell.split('-').map(Number);
          
          // Find actual block data
          const block = blocks.find(b => b.channel === ch && b.step === step);
          
          if (block && block.pitch !== 'OFF' && block.pitch !== '---') {
              const currentIdx = pitchToIndex(block.pitch);
              if (currentIdx !== -1) {
                  const newIdx = currentIdx + semis;
                  const newPitch = indexToPitch(newIdx);
                  
                  // Play modified note
                  const tempRow = { ...block, pitch: newPitch };
                  const note = rowToNote(tempRow, ch, 0, 0.4, props.channelConfigs);
                  if (note) {
                      audioEngine.resume();
                      audioEngine.playNote(note, audioEngine.ctx!.currentTime + 0.01);
                  }
              }
          }
      }

      // 2. Perform Actual Transpose
      selection.transposeSelection(semis);
  }, [selection, activePattern, props.channelConfigs]);

  // Preview Logic for Browser
  const handlePreviewClip = (clip: PatternClip) => {
    audioEngine.stopAll();
    audioEngine.resume();
    
    const stepDur = (60 / props.bpm) / 4;
    const notes: any[] = [];
    let maxStep = 0;

    Object.entries(clip.channels).forEach(([chStr, rows]) => {
        const ch = parseInt(chStr) as 1|2|3|4;
        (rows as any[]).forEach((r: any) => {
             if ((r.step || 0) > maxStep) maxStep = r.step || 0;
             const tempRow = {
                 id: `prev-${ch}-${r.step}`,
                 step: r.step || 0,
                 pitch: r.pitch || 'C-4',
                 instrument: r.instrument || 'LEAD',
                 volume: r.volume ?? 12,
                 dutyCycle: r.dutyCycle || '0.5',
                 effect: r.effect, arpNotes: r.arpNotes, decay: r.decay, panning: r.panning, slide: r.slide
             };
             const note = rowToNote(tempRow as any, ch, (r.step || 0) * stepDur, stepDur, props.channelConfigs);
             if (note) notes.push(note);
        });
    });
    audioEngine.playTrack(notes, (maxStep + 1) * stepDur);
  };

  const getGridContainerClass = () => {
      if (isBottomPanelOpen) {
          return 'h-[55vh] min-h-[300px] overflow-hidden relative shrink-0 transition-all duration-300 ease-in-out border-b border-[#222] mb-2'; 
      }
      return 'flex-1 overflow-hidden relative transition-all duration-300 ease-in-out';
  };

  const getBottomPanelHeightClass = () => {
      return isBottomPanelOpen ? 'flex-1 min-h-0' : 'h-8';
  };

  return (
    <div className="h-screen w-screen bg-[#080808] text-[#e0e0e0] font-mono flex select-none overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={props.onImport} accept=".json" className="hidden" />
      
      {/* GLOBAL MODALS */}
      {isSoundTestOpen && (
        <SoundTestModule isOpen={isSoundTestOpen} onClose={() => setIsSoundTestOpen(false)} customClips={props.customClips} bpm={props.bpm} channelConfigs={props.channelConfigs} />
      )}
      {isAcademyOpen && (
        <AcademyOverlay 
          onClose={() => setIsAcademyOpen(false)} 
          onLoadExample={() => {}} 
          onHighlightCell={setAcademyHighlight}
          activePattern={activePattern}
          selectedCells={selection.selectedCells}
          isPlaying={props.isPlaying}
          isEditorOpen={isEditorOpen}
          onClearSelection={() => selection.setSelectedCells?.(new Set())}
        />
      )}

      {/* LEFT SIDEBAR */}
      <Sidebar 
          patterns={props.patterns} arrangement={props.arrangement} activePatternId={props.activePatternId} playbackMode={props.playbackMode} 
          currentArrIdx={props.currentArrIdx} historyCount={props.historyCount} bpm={props.bpm} 
          onBpmChange={props.onBpmChange} onUndo={props.onUndo} onAddPattern={props.onAddPattern} onCopyPattern={props.onCopyPattern} 
          onRenamePattern={props.onRenamePattern} onDeletePattern={props.onDeletePattern} onAddPatternToTimeline={props.onAddPatternToTimeline} 
          onRemovePatternFromTimeline={props.onRemovePatternFromTimeline} onReorderArrangement={props.onReorderArrangement} 
          onInsertPatternInTimeline={props.onInsertPatternInTimeline} 
          onActivePatternChange={id => { props.onActivePatternChange(id); props.onPlaybackModeChange('PATTERN'); }}
          onCurrentArrIdxChange={idx => { props.onCurrentArrIdxChange(idx); props.onPlaybackModeChange('SONG'); const patternId = props.arrangement[idx]; if (patternId && patternId !== props.activePatternId) props.onActivePatternChange(patternId); }}
          channelConfigs={props.channelConfigs} onToggleMute={()=>{}} onToggleSolo={()=>{}} onSetVolume={()=>{}}
      />

      <main className="flex-1 flex flex-col bg-[#080808] relative overflow-hidden min-w-0">
          
          {/* HEADER */}
          <Header 
            isPlaying={props.isPlaying} playbackMode={props.playbackMode} selection={selection} 
            isComposing={props.isComposing}
            isAssetBrowserOpen={isAssetBrowserOpen} onToggleLibrary={() => setIsAssetBrowserOpen(prev => !prev)}
            onPlay={() => selection.selectedRange ? props.onPlaySelection(selection.selectedRange) : props.onPlay()} 
            onStop={props.onStop} onOpenSystemMenu={props.onBackToMenu} onSave={handleOpenSave} onExport={handleOpenExport} 
            bpm={props.bpm} onBpmChange={props.onBpmChange}
            onEditSelected={() => setIsEditorOpen(true)} 
            onTranspose={handleTranspose} // New prop for audio preview
          />

          {/* EDITOR AREA */}
          <div className={getGridContainerClass()} ref={gridContainerRef}>
            <EditorContainer 
                activePattern={activePattern}
                activePatternId={props.activePatternId}
                patterns={props.patterns}
                customClips={props.customClips}
                channelConfigs={props.channelConfigs}
                bpm={props.bpm}
                selection={selection}
                isPlaying={props.isPlaying}
                currentStep={props.currentStep}
                isSoundTestOpen={isSoundTestOpen}
                isEditorOpen={isEditorOpen}
                onOpenEditor={() => setIsEditorOpen(true)}
                onCloseEditor={() => setIsEditorOpen(false)}
                onPatternsChange={props.onPatternsChange}
                onPlay={props.onPlay}
                onStop={props.onStop}
                onPlaySelection={props.onPlaySelection}
                onUndo={props.onUndo}
                onDropAsset={props.onDropAsset}
                gridContainerRef={gridContainerRef}
                highlightedCell={academyHighlight}
            />
          </div>

          {/* BOTTOM PANEL (Browser / Mixer) */}
          <div className={`flex flex-col border-t border-[#222] bg-[#0c0c0c] shrink-0 transition-all duration-300 ease-in-out ${getBottomPanelHeightClass()}`}>
              <div 
                className="h-8 bg-[#111] border-b border-[#222] flex items-center justify-between px-4 cursor-pointer hover:bg-[#1a1a1a] group shrink-0" 
                onClick={() => setIsBottomPanelOpen(prev => !prev)}
                title={isBottomPanelOpen ? "Minimaliseren" : "Maximaliseren (Beschikbare Ruimte)"}
              >
                  <div className="w-6" /> 
                  <div className={`w-24 h-1 rounded-full transition-colors ${isBottomPanelOpen ? 'bg-[#9bbc0f] shadow-[0_0_10px_#9bbc0f]' : 'bg-[#333] group-hover:bg-[#555]'}`} />
                  <div className="flex items-center gap-2 text-gray-500 group-hover:text-white transition-colors">
                     {isBottomPanelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>
              </div>
              
              {isBottomPanelOpen && (
                  <div className="flex-1 flex overflow-hidden">
                      <div className="w-1/2 border-r border-[#222] flex flex-col overflow-hidden">
                          <AssetBrowser 
                            onClose={() => setIsAssetBrowserOpen(false)} customClips={props.customClips} isGeneratingClip={props.isGeneratingClip} 
                            onPreviewClip={handlePreviewClip} onAssetDragStart={selection.setDraggedClipId} onGenerateClips={props.onGenerateClips} 
                            onDeleteCustomClip={props.onDeleteCustomClip} onOpenSoundTest={() => setIsSoundTestOpen(true)} isOpen={isAssetBrowserOpen}
                          />
                      </div>
                      <div className="w-1/2 flex flex-col overflow-hidden">
                          <MixerStrip channelConfigs={props.channelConfigs} onToggleMute={props.onToggleMute!} onToggleSolo={props.onToggleSolo!} onSetVolume={props.onSetVolume!} />
                      </div>
                  </div>
              )}
          </div>
      </main>
    </div>
  );
};

export default MainLayout;
