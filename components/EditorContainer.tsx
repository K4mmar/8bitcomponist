
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pattern, TrackerRow, PatternClip, MUSICAL_KEYS, Note } from '../types';
import { rowToNote } from '../services/trackerUtils';
import { audioEngine } from '../services/audioEngine';
import { PatternGrid } from './PatternGrid';
import CellEditorMenu from './CellEditorMenu';
import RecordingModule from './RecordingModule';
import { patternToBlocks, PatternBlock } from '../services/patternMutator';

interface EditorContainerProps {
  // Data
  activePattern: Pattern | undefined;
  activePatternId: string | null;
  patterns: Pattern[];
  customClips: PatternClip[];
  channelConfigs: any;
  bpm: number;
  
  // State from Parent
  selection: any; // ReturnType<typeof useSelection>
  isPlaying: boolean;
  currentStep: number;
  isSoundTestOpen: boolean;
  
  // Editor State Props
  isEditorOpen: boolean;
  onOpenEditor: () => void;
  onCloseEditor: () => void;
  
  // Actions
  onPatternsChange: (p: Pattern[]) => void;
  onPlay: () => void;
  onStop: () => void;
  onPlaySelection: (range: { startStep: number, endStep: number }) => void;
  onUndo: () => void;
  onDropAsset: (ch: number, step: number, rawData: string) => void;
  
  // External Refs
  gridContainerRef: React.RefObject<HTMLDivElement>;
  
  // UI Overlays
  highlightedCell: { id: string; type: 'SELECT' | 'EDIT' } | null;
}

const EditorContainer: React.FC<EditorContainerProps> = ({
  activePattern, activePatternId, patterns, customClips, channelConfigs, bpm,
  selection, isPlaying, currentStep, isSoundTestOpen,
  isEditorOpen, onOpenEditor, onCloseEditor,
  onPatternsChange, onPlay, onStop, onPlaySelection, onUndo, onDropAsset,
  gridContainerRef, highlightedCell
}) => {
  const [recordingChannel, setRecordingChannel] = useState<number | null>(null);

  // --- LOGIC: Note Input & Keyboard Handling ---

  const handleGridKeyEdit = useCallback((key: string): boolean => {
    if (selection.selectedCells.size === 0 || !activePatternId) return false;
    const musicalNote = MUSICAL_KEYS[key.toLowerCase()];
    if (!musicalNote) return false;

    const selectionByChannel: Record<number, number[]> = {};
    selection.selectedCells.forEach((cellId: string) => {
        const [ch, step] = cellId.split('-').map(Number);
        if (!selectionByChannel[ch]) selectionByChannel[ch] = [];
        selectionByChannel[ch].push(step);
    });

    let hasValidUpdate = false;

    const newPatterns = patterns.map(p => {
         if (p.id !== activePatternId) return p;
         const newChannels = { ...p.channels };
         
         Object.entries(selectionByChannel).forEach(([chStr, steps]) => {
             const ch = parseInt(chStr) as 1|2|3|4;
             
             // --- HARDWARE RESTRICTIONS (KEYBOARD INPUT) ---
             // Channel 4 (Noise): Only C-notes allowed (Clock Dividers)
             if (ch === 4 && !musicalNote.startsWith('C-')) {
                 return; // Ignore invalid key for noise
             }
             // Channel 3 (Wave): Max Octave 6 (Hardware limit usually)
             if (ch === 3) {
                 const octave = parseInt(musicalNote.slice(-1));
                 if (octave > 6) return;
             }
             // ---------------------------------------------

             hasValidUpdate = true;
             steps.sort((a,b) => a - b);
             const startStep = steps[0];
             const endStep = steps[steps.length - 1]; 
             const isMelodic = ch !== 4; 

             let rows = [...(newChannels[ch] || [])];
             const baseInstrument = ch === 4 ? 'KICK' : (ch === 3 ? 'SUB' : 'LEAD');
             
             rows = rows.filter(r => r.step < startStep || r.step > endStep);

             const newNoteRow: TrackerRow = { 
                 id: Math.random().toString(36).substr(2, 9),
                 step: startStep, 
                 pitch: musicalNote, 
                 instrument: baseInstrument, 
                 volume: 12, 
                 dutyCycle: '0.5' 
             };
             
             // AUDIO PREVIEW: Play the note immediately
             const previewNote = rowToNote(newNoteRow, ch, 0, 0.4, channelConfigs);
             if (previewNote) {
                 audioEngine.resume();
                 audioEngine.playNote(previewNote, audioEngine.ctx!.currentTime + 0.01);
             }

             rows.push(newNoteRow);

             if (isMelodic) {
                 const stopStep = endStep + 1;
                 if (stopStep < 64) {
                     const existingAtStop = rows.find(r => r.step === stopStep);
                     if (!existingAtStop || existingAtStop.pitch === 'OFF' || existingAtStop.pitch === '---') {
                         rows = rows.filter(r => r.step !== stopStep);
                         rows.push({ 
                             id: Math.random().toString(36).substr(2, 9),
                             step: stopStep, 
                             pitch: 'OFF', 
                             instrument: '---', 
                             volume: 0, 
                             dutyCycle: '0.5' 
                         } as TrackerRow);
                     }
                 }
             }

             newChannels[ch] = rows.sort((a,b) => a.step - b.step);
         });
         return { ...p, channels: newChannels };
    });

    if (hasValidUpdate) {
        onPatternsChange(newPatterns);
    }
    
    // Always return true if it was a mapped musical key, even if rejected by restriction,
    // to prevent the browser from scrolling/acting on the keypress.
    return true; 
  }, [selection, activePatternId, patterns, onPatternsChange, channelConfigs]);

  // Global Keyboard Shortcuts for Editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmd = e.ctrlKey || e.metaKey;
      if (isCmd || e.altKey) selection.setIsCopyKeyActive?.(true);
      
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || isEditorOpen || recordingChannel !== null) return;
      
      // Clipboard Keys
      if (isCmd && e.key === 'z') { e.preventDefault(); onUndo(); return; }
      if (isCmd && e.key === 'c') { e.preventDefault(); selection.copySelection(); return; }
      if (isCmd && e.key === 'x') { e.preventDefault(); selection.cutSelection(); return; }
      if (isCmd && e.key === 'v') { e.preventDefault(); selection.pasteSelection(); return; }
      if (isCmd && e.key === 'd') { e.preventDefault(); selection.copySelection(); selection.pasteSelection(); return; }
      
      // Playback Control (Spacebar)
      if (e.code === 'Space') { 
          e.preventDefault(); 
          if (!isSoundTestOpen) { 
              if (isPlaying) {
                  onStop();
              } else {
                  if (selection.selectedRange) {
                      onPlaySelection(selection.selectedRange);
                  } else {
                      onPlay();
                  }
              }
          } 
          return; 
      }

      // Navigation & Deletion
      if (selection.selectedCells.size > 0 && !isSoundTestOpen) {
        if (!e.shiftKey && e.key === 'ArrowUp') { e.preventDefault(); selection.moveSelection(-1, 0); return; }
        if (!e.shiftKey && e.key === 'ArrowDown') { e.preventDefault(); selection.moveSelection(1, 0); return; }
        if (!e.shiftKey && e.key === 'ArrowLeft') { e.preventDefault(); selection.moveSelection(0, -1); return; }
        if (!e.shiftKey && e.key === 'ArrowRight') { e.preventDefault(); selection.moveSelection(0, 1); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); selection.deleteSelection(); return; }
        
        let keyId = e.key;
        const handled = handleGridKeyEdit(keyId);
        if (handled) e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { if (!e.altKey && !e.ctrlKey && !e.metaKey) selection.setIsCopyKeyActive?.(false); };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [isPlaying, onStop, onPlay, onPlaySelection, selection, isEditorOpen, handleGridKeyEdit, onUndo, recordingChannel, isSoundTestOpen]);

  // --- LOGIC: Batch Updates & Preview ---

  const selectedRows = React.useMemo(() => {
      if (!activePattern || selection.selectedCells.size === 0) return [];
      
      const blocks = patternToBlocks(activePattern);
      const stepToBlockMap = new Map<string, PatternBlock>();
      blocks.forEach(b => {
          for (let i = 0; i < b.length; i++) {
              stepToBlockMap.set(`${b.channel}-${b.step + i}`, b);
          }
      });

      const uniqueNoteIds = new Set<string>();
      const noteRows: { row: TrackerRow, ch: number }[] = [];
      const emptyRows: { row: TrackerRow, ch: number }[] = [];

      selection.selectedCells.forEach((cellId: string) => {
          const [ch, step] = cellId.split('-').map(Number);
          const block = stepToBlockMap.get(cellId);
          if (block) {
              if (!uniqueNoteIds.has(block.id)) {
                  uniqueNoteIds.add(block.id);
                  noteRows.push({ row: block, ch });
              }
          } else {
              emptyRows.push({ 
                  row: { id: `temp-${ch}-${step}`, step, pitch: 'C-4', instrument: ch === 4 ? 'KICK' : 'LEAD', volume: 12, dutyCycle: "0.5" }, 
                  ch 
              });
          }
      });

      return noteRows.length > 0 ? noteRows : emptyRows;
  }, [activePattern, selection.selectedCells]);

  const handleBatchUpdate = useCallback((field: keyof TrackerRow, value: any) => {
    if (!activePattern) return;
    
    const blocks = patternToBlocks(activePattern);
    const stepToBlockMap = new Map<string, PatternBlock>();
    blocks.forEach(b => {
        for (let i = 0; i < b.length; i++) {
            stepToBlockMap.set(`${b.channel}-${b.step + i}`, b);
        }
    });

    const targetNoteIds = new Set<string>();
    const targetEmptySteps: {ch: number, step: number}[] = [];

    selection.selectedCells.forEach((cellId: string) => {
        const [ch, step] = cellId.split('-').map(Number);
        const block = stepToBlockMap.get(cellId);
        if (block) targetNoteIds.add(block.id);
        else targetEmptySteps.push({ ch, step });
    });

    const isEditingNotes = targetNoteIds.size > 0;

    const newPatterns = patterns.map(p => {
      if (p.id !== activePatternId) return p;
      const newChannels = { ...p.channels };
      
      if (isEditingNotes) {
          [1,2,3,4].forEach(chNum => {
              const ch = chNum as 1|2|3|4;
              if (!newChannels[ch]) return;
              newChannels[ch] = newChannels[ch].map(row => {
                  if (targetNoteIds.has(row.id)) return { ...row, [field]: value };
                  return row;
              });
              if (field === 'pitch' && value === '---') {
                  newChannels[ch] = newChannels[ch].filter(r => !targetNoteIds.has(r.id));
              }
          });
      } else {
          targetEmptySteps.forEach(({ch, step}) => {
              const chNum = ch as 1|2|3|4;
              const rows = newChannels[chNum] || [];
              
              const newRow: TrackerRow = { 
                  id: Math.random().toString(36).substr(2, 9), 
                  step, pitch: 'C-4', instrument: ch === 4 ? 'KICK' : 'LEAD', 
                  volume: 12, dutyCycle: '0.5', [field]: value 
              };
              rows.push(newRow);

              // *** FIX: Auto-insert OFF for new notes ***
              // If we are setting a pitch (and it's not OFF), prevent it from sustaining forever
              // by inserting an OFF note at the next step if that slot is empty.
              const isPitchUpdate = field === 'pitch';
              const isNote = value !== 'OFF' && value !== '---';
              
              if (isPitchUpdate && isNote) {
                  const stopStep = step + 1;
                  if (stopStep < 64) {
                      const exists = rows.find(r => r.step === stopStep);
                      if (!exists) {
                          rows.push({
                              id: Math.random().toString(36).substr(2, 9), 
                              step: stopStep, pitch: 'OFF', instrument: '---', 
                              volume: 0, dutyCycle: '0.5' 
                          } as TrackerRow);
                      }
                  }
              }

              newChannels[chNum] = rows.sort((a, b) => a.step - b.step);
          });
      }
      return { ...p, channels: newChannels };
    });
    
    onPatternsChange(newPatterns);
  }, [activePatternId, patterns, onPatternsChange, selection.selectedCells, activePattern]);

  const handlePreviewNote = useCallback((overrides?: Partial<TrackerRow>) => {
    if (selectedRows.length === 0) return;
    const { row, ch } = selectedRows[0];
    const tempRow: TrackerRow = { ...row, ...overrides };
    if (!tempRow.pitch || tempRow.pitch === '---' || tempRow.pitch === 'OFF') tempRow.pitch = 'C-4';
    const note = rowToNote(tempRow, ch, 0, 0.4, channelConfigs);
    if (note) { audioEngine.resume(); audioEngine.playNote(note, audioEngine.ctx!.currentTime + 0.01); }
  }, [selectedRows, channelConfigs]);

  // External trigger for editor open (e.g. from Academy)
  useEffect(() => {
      if (highlightedCell?.type === 'EDIT') {
          // If needed, we could auto-open, but usually we just highlight
      }
  }, [highlightedCell]);

  return (
    <>
      {isEditorOpen && selectedRows.length > 0 && (
          <CellEditorMenu 
              selectedRows={selectedRows}
              onUpdate={handleBatchUpdate} 
              onPreview={handlePreviewNote} 
              onClose={onCloseEditor} 
          />
      )}

      {recordingChannel !== null && (
          <RecordingModule 
            bpm={bpm} 
            channelNum={recordingChannel} 
            onCommit={() => {}} // Could wire this up to add notes to pattern
            onClose={() => setRecordingChannel(null)} 
          />
      )}

      <PatternGrid 
          activePattern={activePattern} 
          selection={selection} 
          isPlaying={isPlaying} 
          currentStep={currentStep} 
          onDoubleClick={(ch: number, step: number) => { 
              onOpenEditor(); 
          }} 
          onOpenRecorder={(ch: number) => setRecordingChannel(ch)}
          onDropAsset={onDropAsset}
          customClips={customClips}
          highlightedCell={highlightedCell} 
          patterns={patterns} 
          onPatternsChange={onPatternsChange}
          gridRef={gridContainerRef}
      />
    </>
  );
};

export default EditorContainer;
