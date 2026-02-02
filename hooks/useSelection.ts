import { useState, useCallback, useMemo, useEffect } from 'react';
import { TrackerRow, Pattern, PatternClip } from '../types';
import { applyMoveOperation, applyResizeOperation, applyPasteOperation, applyReverseOperation, applyInterpolateOperation, applyRandomizeOperation, patternToBlocks, PatternBlock } from '../services/patternMutator';
import { pitchToIndex, indexToPitch } from '../services/trackerUtils';

export function useSelection(
  activePattern: Pattern | undefined,
  currentStep: number,
  onPatternsChange: (p: Pattern[]) => void,
  patterns: Pattern[],
  activePatternId: string | null,
  customClips: PatternClip[] = []
) {
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<{ch: number, step: number} | null>(null);
  const [selectionCurrent, setSelectionCurrent] = useState<{ch: number, step: number} | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState<{ch: number, step: number} | null>(null);
  const [dragDelta, setDragDelta] = useState<{ch: number, step: number} | null>(null);
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeOrigin, setResizeOrigin] = useState<{ch: number, step: number, initialLength: number} | null>(null);
  const [currentResizeLength, setCurrentResizeLength] = useState<number | null>(null);

  const [isCopyKeyActive, setIsCopyKeyActive] = useState(false);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);

  // Clipboard State
  const [clipboard, setClipboard] = useState<{ blocks: PatternBlock[], originStep: number, originCh: number } | null>(null);

  const selectedCells = useMemo(() => {
    const cells = new Set<string>();
    
    // Explicitly selected note IDs
    if (activePattern) {
        [1, 2, 3, 4].forEach(chNum => {
            const ch = chNum as 1|2|3|4;
            if (activePattern.channels && activePattern.channels[ch]) {
                activePattern.channels[ch].forEach(row => {
                    if (selectedNoteIds.has(row.id)) {
                        // For a note, we might want to highlight all steps it occupies
                        // but for standard selection ch-step is usually enough
                        cells.add(`${ch}-${row.step}`);
                    }
                });
            }
        });
    }

    // Area selection (box)
    if (selectionAnchor && selectionCurrent) {
        const minCh = Math.min(selectionAnchor.ch, selectionCurrent.ch);
        const maxCh = Math.max(selectionAnchor.ch, selectionCurrent.ch);
        const minStep = Math.min(selectionAnchor.step, selectionCurrent.step);
        const maxStep = Math.max(selectionAnchor.step, selectionCurrent.step);
        for (let c = minCh; c <= maxCh; c++) {
            for (let s = minStep; s <= maxStep; s++) {
                cells.add(`${c}-${s}`);
            }
        }
    }
    return cells;
  }, [selectedNoteIds, activePattern, selectionAnchor, selectionCurrent]);

  const selectedRange = useMemo(() => {
    if (selectedCells.size === 0) return null;
    const steps = Array.from(selectedCells).map((c: string) => parseInt(c.split('-')[1]));
    return { startStep: Math.min(...steps), endStep: Math.max(...steps) };
  }, [selectedCells]);

  const startSelection = useCallback((ch: number, step: number) => {
    setIsSelecting(true);
    setSelectedNoteIds(new Set());
    setSelectionAnchor({ ch, step });
    setSelectionCurrent({ ch, step });
  }, []);

  const updateSelection = useCallback((ch: number, step: number) => {
    if (isSelecting) setSelectionCurrent({ ch, step });
  }, [isSelecting]);

  const selectColumnRange = useCallback((startStep: number, endStep: number) => {
      setIsSelecting(true);
      setSelectedNoteIds(new Set());
      setSelectionAnchor({ ch: 1, step: startStep });
      setSelectionCurrent({ ch: 4, step: endStep });
  }, []);

  const startDrag = useCallback((ch: number, step: number, noteId: string, isMulti: boolean = false) => {
    if (isMulti) {
        // Toggle selection logic
        setSelectedNoteIds(prev => {
            const next = new Set(prev);
            if (next.has(noteId)) {
                next.delete(noteId);
            } else {
                next.add(noteId);
            }
            return next;
        });
        // We clear box selection when doing specific note toggling to avoid confusion
        setSelectionAnchor(null);
        setSelectionCurrent(null);
    } else {
        // Standard Drag Logic
        if (!selectedNoteIds.has(noteId)) {
            // If the note isn't in selectedNoteIds, check if it's in a box selection
            const isInBox = selectedCells.has(`${ch}-${step}`);
            if (!isInBox) {
                // If not in box, clear everything and select just this note
                setSelectedNoteIds(new Set([noteId]));
                setSelectionAnchor(null);
                setSelectionCurrent(null);
            } else {
                // It's in a box, but maybe not in NoteIds yet. 
                // We should ensure all notes in the box are in NoteIds for moving
                if (activePattern) {
                    const allBlocks = patternToBlocks(activePattern);
                    const idsInBox = allBlocks
                        .filter(b => selectedCells.has(`${b.channel}-${b.step}`))
                        .map(b => b.id);
                    setSelectedNoteIds(new Set(idsInBox));
                }
            }
        }
    }
    
    setIsDragging(true);
    setDragOrigin({ ch, step });
    setDragDelta({ ch: 0, step: 0 });
  }, [selectedNoteIds, selectedCells, activePattern]);

  const updateDrag = useCallback((targetCh: number, targetStep: number) => {
    if (isDragging && dragOrigin) {
        setDragDelta({ ch: targetCh - dragOrigin.ch, step: targetStep - dragOrigin.step });
    }
  }, [isDragging, dragOrigin]);

  const commitDrag = useCallback((copy: boolean) => {
    if (!activePatternId || !isDragging || !dragDelta) {
        setIsDragging(false);
        setDragOrigin(null);
        setDragDelta(null);
        return;
    }

    const currentNoteIds = new Set<string>(selectedNoteIds);
    // If we were dragging a box without explicit NoteIds, populate them now
    if (currentNoteIds.size === 0 && activePattern) {
        patternToBlocks(activePattern).forEach(b => {
            if (selectedCells.has(`${b.channel}-${b.step}`)) currentNoteIds.add(b.id);
        });
    }

    const newPatterns = patterns.map(p => {
        if (p.id !== activePatternId) return p;
        const result = applyMoveOperation(p, currentNoteIds, dragDelta, copy, selectedCells);
        return result.newPattern;
    });

    onPatternsChange(newPatterns);

    // Update selection box coordinates to follow the drag
    if (selectionAnchor && selectionCurrent) {
        setSelectionAnchor(prev => prev ? ({
            ch: Math.min(4, Math.max(1, prev.ch + dragDelta.ch)),
            step: Math.min(63, Math.max(0, prev.step + dragDelta.step))
        }) : null);
        setSelectionCurrent(prev => prev ? ({
            ch: Math.min(4, Math.max(1, prev.ch + dragDelta.ch)),
            step: Math.min(63, Math.max(0, prev.step + dragDelta.step))
        }) : null);
    }

    setIsDragging(false);
    setDragOrigin(null);
    setDragDelta(null);
  }, [activePatternId, patterns, isDragging, dragDelta, selectedNoteIds, selectedCells, activePattern, onPatternsChange, selectionAnchor, selectionCurrent]);

  const startResize = useCallback((ch: number, step: number, noteId: string) => {
      const blocks = activePattern ? patternToBlocks(activePattern) : [];
      const block = blocks.find(b => b.id === noteId);
      if (block) {
          setIsResizing(true);
          setResizeOrigin({ ch, step: block.step, initialLength: block.length });
          setCurrentResizeLength(block.length);
      }
  }, [activePattern]);

  const updateResize = useCallback((targetCh: number, targetStep: number) => {
      if (isResizing && resizeOrigin) {
          const newLen = Math.max(1, targetStep - resizeOrigin.step + 1);
          setCurrentResizeLength(newLen);
      }
  }, [isResizing, resizeOrigin]);

  const commitResize = useCallback(() => {
      if (activePatternId && isResizing && resizeOrigin && currentResizeLength !== null) {
          const newPatterns = patterns.map(p => {
              if (p.id !== activePatternId) return p;
              return applyResizeOperation(p, resizeOrigin.ch as any, resizeOrigin.step, currentResizeLength);
          });
          onPatternsChange(newPatterns);
      }
      setIsResizing(false);
      setResizeOrigin(null);
      setCurrentResizeLength(null);
  }, [activePatternId, patterns, isResizing, resizeOrigin, currentResizeLength, onPatternsChange]);

  const deleteSelection = useCallback(() => {
      if (!activePatternId || !activePattern) return;
      const newPatterns = patterns.map(p => {
        if (p.id !== activePatternId) return p;
        const newChannels = { ...p.channels };
        [1,2,3,4].forEach(chNum => {
            const ch = chNum as 1|2|3|4;
            newChannels[ch] = newChannels[ch].filter(row => 
                !selectedNoteIds.has(row.id) && !selectedCells.has(`${ch}-${row.step}`)
            );
        });
        return { ...p, channels: newChannels };
      });
      onPatternsChange(newPatterns);
      setSelectedNoteIds(new Set());
      setSelectionAnchor(null);
      setSelectionCurrent(null);
  }, [activePatternId, activePattern, selectedNoteIds, selectedCells, patterns, onPatternsChange]);

  const moveSelection = useCallback((deltaCh: number, deltaStep: number) => {
    if (!activePatternId || !activePattern) return;
    
    const noteIdsToMove = new Set<string>(selectedNoteIds);
    patternToBlocks(activePattern).forEach(b => {
        if (selectedCells.has(`${b.channel}-${b.step}`)) noteIdsToMove.add(b.id);
    });

    if (noteIdsToMove.size > 0) {
        const newPatterns = patterns.map(p => {
            if (p.id !== activePatternId) return p;
            return applyMoveOperation(p, noteIdsToMove, { ch: deltaCh, step: deltaStep }, isCopyKeyActive, selectedCells).newPattern;
        });
        onPatternsChange(newPatterns);
        
        // Update selection box
        if (selectionAnchor && selectionCurrent) {
             setSelectionAnchor(prev => prev ? ({
                ch: Math.min(4, Math.max(1, prev.ch + deltaCh)),
                step: Math.min(63, Math.max(0, prev.step + deltaStep))
            }) : null);
            setSelectionCurrent(prev => prev ? ({
                ch: Math.min(4, Math.max(1, prev.ch + deltaCh)),
                step: Math.min(63, Math.max(0, prev.step + deltaStep))
            }) : null);
        }

    } else if (selectionAnchor) {
        // Just moving the cursor without notes
        setSelectionAnchor(prev => prev ? ({
            ch: Math.min(4, Math.max(1, prev.ch + deltaCh)),
            step: Math.min(63, Math.max(0, prev.step + deltaStep))
        }) : null);
        setSelectionCurrent(null);
    }
  }, [selectedNoteIds, selectedCells, activePattern, activePatternId, patterns, onPatternsChange, isCopyKeyActive, selectionAnchor, selectionCurrent]);

  const copySelection = useCallback(() => {
      if (!activePattern) return;
      
      // Determine bounding box of selection
      let minCh = 5, maxCh = 0, minStep = 64, maxStep = -1;
      
      const processCell = (ch: number, step: number) => {
          if (ch < minCh) minCh = ch;
          if (ch > maxCh) maxCh = ch;
          if (step < minStep) minStep = step;
          if (step > maxStep) maxStep = step;
      };

      if (selectedCells.size > 0) {
          selectedCells.forEach(cell => {
              const [c, s] = cell.split('-').map(Number);
              processCell(c, s);
          });
      } else if (selectedNoteIds.size > 0) {
          patternToBlocks(activePattern).forEach(b => {
              if (selectedNoteIds.has(b.id)) {
                  processCell(b.channel, b.step);
                  processCell(b.channel, b.step + b.length - 1);
              }
          });
      }

      if (maxCh === 0) return; // No selection

      const blocks: PatternBlock[] = [];
      const visualBlocks = patternToBlocks(activePattern);

      for (let ch = minCh; ch <= maxCh; ch++) {
          const chBlocks = visualBlocks.filter(b => b.channel === ch);
          
          for (let s = minStep; s <= maxStep; s++) {
              if (selectedCells.size > 0 && !selectedCells.has(`${ch}-${s}`)) {
                  // If we are in box selection mode, only copy explicitly selected cells
                  continue; 
              }

              // Check if a block starts here
              const blockHere = chBlocks.find(b => b.step === s);
              
              if (blockHere) {
                  blocks.push(blockHere);
              } else {
                  // Treat any non-starting step as an EMPTY_CELL for clipboard purposes.
                  // This includes gaps, silence, AND sustain tails of previous notes.
                  // This ensures that when we paste, we fully overwrite the target area with the exact "shape" of the selection.
                  blocks.push({
                      id: `empty-${ch}-${s}-${Date.now()}`,
                      step: s,
                      channel: ch,
                      length: 1,
                      pitch: "EMPTY_CELL",
                      instrument: "---",
                      volume: 0,
                      dutyCycle: "0.5"
                  });
              }
          }
      }
      
      setClipboard({ blocks, originStep: minStep, originCh: minCh });
  }, [activePattern, selectedNoteIds, selectedCells]);

  const cutSelection = useCallback(() => {
      copySelection();
      deleteSelection();
  }, [copySelection, deleteSelection]);

  const pasteSelection = useCallback(() => {
      if (!clipboard || !activePatternId) return;
      
      let targetStep = selectionAnchor ? selectionAnchor.step : 0;
      let targetCh = selectionAnchor ? selectionAnchor.ch : 1;
      
      const newPatterns = patterns.map(p => {
          if (p.id !== activePatternId) return p;
          return applyPasteOperation(p, clipboard.blocks, targetStep, targetCh, clipboard.originStep, clipboard.originCh);
      });

      onPatternsChange(newPatterns);
  }, [clipboard, activePatternId, patterns, selectionAnchor, onPatternsChange]);

  const transposeSelection = useCallback((semis: number) => {
    if (!activePatternId || !activePattern) return;
    
    // Identify which notes to transpose
    const noteIdsToTranspose = new Set(selectedNoteIds);
    patternToBlocks(activePattern).forEach(b => {
        if (selectedCells.has(`${b.channel}-${b.step}`)) noteIdsToTranspose.add(b.id);
    });

    if (noteIdsToTranspose.size === 0) return;

    const newPatterns = patterns.map(p => {
        if (p.id !== activePatternId) return p;
        const newChannels = { ...p.channels };
        [1,2,3,4].forEach(chNum => {
            const ch = chNum as 1|2|3|4;
            newChannels[ch] = newChannels[ch].map(row => {
                if (!noteIdsToTranspose.has(row.id)) return row;
                
                // Perform transposition
                if (row.pitch === '---' || row.pitch === 'OFF') return row;
                
                const currentIndex = pitchToIndex(row.pitch);
                if (currentIndex === -1) return row; // Invalid pitch
                
                const newIndex = currentIndex + semis;
                const newPitch = indexToPitch(newIndex);
                
                return { ...row, pitch: newPitch }; 
            });
        });
        return { ...p, channels: newChannels };
    });
    onPatternsChange(newPatterns);
  }, [activePatternId, activePattern, selectedNoteIds, selectedCells, patterns, onPatternsChange]);

  // --- NEW OPERATIONS WRAPPERS ---

  const reverseSelection = useCallback(() => {
      if (!activePatternId || selectedCells.size === 0) return;
      
      const newPatterns = patterns.map(p => {
          if (p.id !== activePatternId) return p;
          return applyReverseOperation(p, selectedCells);
      });
      onPatternsChange(newPatterns);
  }, [activePatternId, selectedCells, patterns, onPatternsChange]);

  const interpolateSelection = useCallback(() => {
      if (!activePatternId || selectedCells.size === 0) return;
      
      const newPatterns = patterns.map(p => {
          if (p.id !== activePatternId) return p;
          return applyInterpolateOperation(p, selectedCells);
      });
      onPatternsChange(newPatterns);
  }, [activePatternId, selectedCells, patterns, onPatternsChange]);

  const randomizeSelection = useCallback((type: 'VOLUME' | 'PANNING' | 'BOTH') => {
      if (!activePatternId || selectedCells.size === 0) return;
      
      const newPatterns = patterns.map(p => {
          if (p.id !== activePatternId) return p;
          return applyRandomizeOperation(p, selectedCells, type);
      });
      onPatternsChange(newPatterns);
  }, [activePatternId, selectedCells, patterns, onPatternsChange]);

  const setSelectedCells = useCallback((cells: Set<string>) => {
      if (cells.size === 0) {
          setSelectedNoteIds(new Set());
          setSelectionAnchor(null);
          setSelectionCurrent(null);
      }
  }, []);

  useEffect(() => {
    const handleGlobalUp = () => {
        setIsSelecting(false);
        if (isResizing) commitResize();
    };
    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [isResizing, commitResize]);

  return useMemo(() => ({
    selectedNoteIds, setSelectedNoteIds,
    selectedCells,
    isDragging, startDrag, updateDrag, commitDrag, dragDelta,
    isResizing, startResize, updateResize, commitResize, currentResizeLength, resizeOrigin,
    isSelecting, startSelection, updateSelection, selectColumnRange,
    selectionAnchor, selectionCurrent,
    draggedClipId, setDraggedClipId,
    deleteSelection,
    isCopyKeyActive, setIsCopyKeyActive,
    selectedRange,
    setSelectedCells,
    moveSelection,
    copySelection,
    cutSelection,
    pasteSelection,
    transposeSelection,
    reverseSelection,
    interpolateSelection,
    randomizeSelection,
  }), [
    selectedNoteIds, selectedCells, isDragging, dragDelta, isResizing, currentResizeLength, resizeOrigin,
    isSelecting, selectionAnchor, selectionCurrent, draggedClipId, isCopyKeyActive, selectedRange,
    startDrag, updateDrag, commitDrag, startResize, updateResize, commitResize, startSelection, updateSelection, 
    selectColumnRange, deleteSelection, setSelectedCells, moveSelection, copySelection, cutSelection, pasteSelection, transposeSelection,
    reverseSelection, interpolateSelection, randomizeSelection
  ]);
}