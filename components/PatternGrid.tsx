import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Pattern, PatternClip } from '../types';
import { patternToBlocks, PatternBlock } from '../services/patternMutator';
import { PATTERN_LIBRARY } from '../services/sampleLibrary';

const PATTERN_COLORS = ['#ff4d4d', '#ffcc00', '#00ccff', '#9bbc0f'];
const CHANNEL_NAMES: Record<number, string> = { 1: "Melodie", 2: "Puls", 3: "Bas", 4: "Percussie" };

interface NoteBlockProps {
    block: PatternBlock;
    ch: number;
    isSelected: boolean;
    isMoving: boolean;
    isResizing: boolean;
    onResizeStart: (e: React.PointerEvent) => void;
}

const NoteBlock: React.FC<NoteBlockProps> = ({ block, ch, isSelected, isMoving, isResizing, onResizeStart }) => {
    const color = PATTERN_COLORS[ch-1];
    
    // Dynamic positioning using percentages (100% / 32 steps per bank)
    const stepPercent = 100 / 32;
    const leftPercent = block.step * stepPercent;
    const widthPercent = block.length * stepPercent;

    return (
        <div 
            className={`
                absolute top-1 bottom-1 rounded-md shadow-md border-t border-white/20 select-none z-10 overflow-hidden cursor-grab active:cursor-grabbing touch-none
                ${isSelected ? 'brightness-125 shadow-[0_0_0_2px_white] z-20' : 'opacity-90'}
                ${isMoving ? 'opacity-40 border-2 border-dashed border-white pointer-events-none' : ''}
                ${isResizing ? 'ring-2 ring-white z-30' : ''}
            `}
            style={{ 
                left: `${leftPercent}%`, 
                width: `calc(${widthPercent}% - 1px)`, // Subtract 1px gap
                backgroundColor: color 
            }}
        >
            <div className="px-1 text-[10px] font-mono font-black text-black/70 truncate mt-0.5 pointer-events-none">
                {block.pitch}
            </div>
            
            {/* Resize Handle Area */}
            <div 
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white/20 z-40 transition-colors"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onResizeStart(e);
                }}
            />
        </div>
    );
};

export const PatternGrid: React.FC<any> = ({
  activePattern, selection, isPlaying, currentStep, onDoubleClick, patterns, onPatternsChange, gridRef, onDropAsset, customClips
}) => {
  const { 
    selectedNoteIds, setSelectedNoteIds, isDragging, dragDelta, startDrag, updateDrag, commitDrag,
    isResizing, startResize, updateResize, commitResize, currentResizeLength, resizeOrigin,
    selectedCells, isSelecting, startSelection, updateSelection, selectColumnRange, setSelectedCells
  } = selection;

  const [dragOverCoords, setDragOverCoords] = useState<{ch: number, step: number} | null>(null);

  const getCoordsFromPixels = useCallback((clientX: number, clientY: number) => {
    const rows = document.querySelectorAll('[data-bank-row]');
    for (const row of Array.from(rows)) {
        const rect = row.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
            const ch = parseInt(row.getAttribute('data-ch') || '1');
            const startStep = parseInt(row.getAttribute('data-start-step') || '0');
            const gridArea = row.querySelector('[data-grid-area]');
            if (!gridArea) continue;
            
            const areaRect = gridArea.getBoundingClientRect();
            // Calculate dynamic step width based on current container width
            const stepWidth = areaRect.width / 32;
            
            const xRel = clientX - areaRect.left;
            const localStep = Math.floor(xRel / stepWidth);
            const finalStep = startStep + Math.min(31, Math.max(0, localStep));
            return { ch, step: finalStep };
        }
    }
    return null;
  }, []);

  // Separate dedicated handler for Double Click to avoid conflict with Drag logic
  const handleDoubleClick = (e: React.MouseEvent) => {
    const coords = getCoordsFromPixels(e.clientX, e.clientY);
    if (!coords) return;

    const target = e.target as HTMLElement;
    const noteEl = target.closest('[data-note-id]');

    // Ensure the clicked element is strictly selected before opening editor
    if (noteEl) {
        const noteId = noteEl.getAttribute('data-note-id')!;
        setSelectedNoteIds(new Set([noteId]));
    } else {
        // If clicking empty space, ensure the cursor selection is set there
        startSelection(coords.ch, coords.step);
    }

    // Call parent handler to open editor
    onDoubleClick(coords.ch, coords.step);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const coords = getCoordsFromPixels(e.clientX, e.clientY);
    
    // Als we op de achtergrond van de scroll area klikken maar niet op een rij
    if (!coords) {
        setSelectedCells(new Set());
        return;
    }

    const isMulti = e.ctrlKey || e.metaKey;
    const target = e.target as HTMLElement;
    const noteEl = target.closest('[data-note-id]');
    
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (noteEl) {
        // Dragging (indien enkele klik op noot) - Pass isMulti for toggling
        const noteId = noteEl.getAttribute('data-note-id')!;
        startDrag(coords.ch, coords.step, noteId, isMulti);
    } else {
        // Selectie start (indien klik op lege ruimte)
        startSelection(coords.ch, coords.step);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSelecting && !isDragging && !isResizing) return;
    const coords = getCoordsFromPixels(e.clientX, e.clientY);
    if (!coords) return;

    if (isSelecting) updateSelection(coords.ch, coords.step);
    else if (isDragging) updateDrag(coords.ch, coords.step);
    else if (isResizing) updateResize(coords.ch, coords.step);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) commitDrag(e.altKey || e.ctrlKey || e.metaKey);
    if (isResizing) commitResize();
  };

  // --- External Drag & Drop Handlers (Library to Grid) ---
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.types.includes('text/plain')) {
          e.dataTransfer.dropEffect = 'copy';
          const coords = getCoordsFromPixels(e.clientX, e.clientY);
          setDragOverCoords(coords);
      }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      // Basic check: if we leave the main grid container, clear ghosts
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOverCoords(null);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const coords = getCoordsFromPixels(e.clientX, e.clientY);
      setDragOverCoords(null);
      
      if (coords && onDropAsset) {
          const data = e.dataTransfer.getData('text/plain');
          if (data && data.startsWith('clip:')) {
              onDropAsset(coords.ch, coords.step, data);
          }
      }
  };

  const viewBlocks = useMemo(() => {
      if (!activePattern) return [];
      const blocks = patternToBlocks(activePattern);
      
      // 1. Internal Dragging Logic
      if (isDragging && dragDelta) {
          const combinedBlocks: any[] = [];
          blocks.forEach(b => {
              if (selectedNoteIds.has(b.id)) {
                  // Keep Original (Source)
                  combinedBlocks.push(b);

                  // Add Ghost (Target)
                  const newCh = Math.min(4, Math.max(1, b.channel + dragDelta.ch));
                  const newStep = Math.min(63, Math.max(0, b.step + dragDelta.step));
                  combinedBlocks.push({ 
                      ...b, 
                      id: `ghost-${b.id}`, // Unique ID for key
                      channel: newCh, 
                      step: newStep, 
                      isMoving: true 
                  });
              } else {
                  combinedBlocks.push(b);
              }
          });
          return combinedBlocks;
      }

      // 2. Resizing Logic
      if (isResizing && resizeOrigin && currentResizeLength !== null) {
          return blocks.map(b => {
              if (b.channel === resizeOrigin.ch && b.step === resizeOrigin.step) {
                  return { ...b, length: currentResizeLength, isResizing: true };
              }
              return b;
          });
      }

      // 3. External Clip Ghosting Logic
      if (selection.draggedClipId && dragOverCoords) {
          const allClips = [...PATTERN_LIBRARY, ...(customClips || [])];
          const clip = allClips.find(c => c.id === selection.draggedClipId);
          if (clip) {
              const ghostBlocks: any[] = [...blocks];
              Object.entries(clip.channels).forEach(([chStr, rows]) => {
                  const ch = parseInt(chStr);
                  (rows as any[]).forEach(r => {
                      if (r.pitch && r.pitch !== 'OFF') {
                          // Note: We use the clip's original channel because current dropAsset logic
                          // forces the clip's defined channels. The ghost must match the result.
                          // However, we shift the STEP based on mouse hover.
                          const targetStep = dragOverCoords.step + (r.step || 0);
                          if (targetStep < 64) {
                              ghostBlocks.push({
                                  id: `ext-ghost-${ch}-${targetStep}`,
                                  step: targetStep,
                                  channel: ch,
                                  pitch: r.pitch,
                                  length: 1, // Simplified length for preview
                                  isMoving: true
                              });
                          }
                      }
                  });
              });
              return ghostBlocks;
          }
      }

      return blocks;
  }, [activePattern, isDragging, dragDelta, selectedNoteIds, isResizing, resizeOrigin, currentResizeLength, selection.draggedClipId, dragOverCoords, customClips]);

  const renderBank = (startStep: number) => (
      <div className="flex flex-col mb-8 bg-[#0a0a0a] rounded-lg overflow-hidden border border-white/5 select-none w-full">
        <div className="h-10 flex border-b border-[#222] bg-[#111]">
          <div className="w-[96px] border-r border-[#222] flex items-center justify-center bg-[#161616] shrink-0">
             <span className="text-[10px] font-black uppercase text-gray-500">{startStep === 0 ? 'BANK A' : 'BANK B'}</span>
          </div>
          <div className="flex flex-1 bg-[#0d0d0d]">
            {[...Array(32)].map((_, i) => {
                const step = startStep + i;
                const isInRange = selection.selectedRange && step >= selection.selectedRange.startStep && step <= selection.selectedRange.endStep;
                return (
                    <div 
                        key={i} 
                        className={`flex-1 min-w-0 border-r border-[#1a1a1a] flex items-center justify-center cursor-pointer transition-colors
                            ${isInRange ? 'bg-[#9bbc0f]/20' : 'hover:bg-white/5'}
                        `}
                        onPointerDown={(e) => { e.stopPropagation(); selectColumnRange(step, step); }}
                        onPointerMove={(e) => { if (e.buttons === 1) selectColumnRange(selection.selectionAnchor?.step ?? step, step); }}
                    >
                       <span className={`text-[9px] font-bold ${isInRange ? 'text-[#9bbc0f]' : 'text-gray-700'}`}>
                           {step + 1}
                       </span>
                    </div>
                );
            })}
          </div>
        </div>

        {[1, 2, 3, 4].map(chNum => (
            <div 
                key={chNum} 
                data-bank-row="true"
                data-ch={chNum}
                data-start-step={startStep}
                className="h-14 flex border-b border-[#1a1a1a] relative bg-[#080808]"
            >
              <div className="w-[96px] border-r border-[#222] flex flex-col items-center justify-center bg-[#0d0d0d] shrink-0 z-20">
                <span className="text-[9px] font-bold uppercase text-gray-300">{CHANNEL_NAMES[chNum]}</span>
              </div>
              
              <div className="relative h-full flex flex-1" data-grid-area="true">
                 <div className="flex h-full absolute inset-0 z-0 w-full">
                    {[...Array(32)].map((_, i) => {
                        const step = startStep + i;
                        
                        // Calculate Selection Highlight
                        let isSelected = false;
                        if (isDragging && dragDelta) {
                            // Check if this is the target position (ghost)
                            const srcCh = chNum - dragDelta.ch;
                            const srcStep = step - dragDelta.step;
                            const isGhostTarget = selectedCells.has(`${srcCh}-${srcStep}`);
                            
                            // Check if this is the original position
                            const isOriginalSource = selectedCells.has(`${chNum}-${step}`);
                            
                            isSelected = isGhostTarget || isOriginalSource;
                        } else {
                            isSelected = selectedCells.has(`${chNum}-${step}`);
                        }

                        const isCurrentStep = Math.floor(currentStep) === step && isPlaying;
                        return (
                            <div 
                                key={i} 
                                className={`flex-1 min-w-0 border-r border-[#1a1a1a] h-full transition-colors relative
                                    ${isSelected ? 'bg-white/10' : ''} 
                                    ${isCurrentStep ? 'bg-[#9bbc0f]/15' : ''}
                                    ${step % 4 === 0 && !isSelected ? 'bg-white/[0.02]' : ''}
                                `}
                            >
                                {isSelected && <div className="absolute inset-0 border border-white/20 pointer-events-none" />}
                            </div>
                        );
                    })}
                 </div>

                 <div className="absolute inset-0 pointer-events-none z-10 w-full">
                    {viewBlocks
                        .filter(b => b.channel === chNum && b.step >= startStep && b.step < startStep + 32)
                        .map(block => (
                            <div 
                                key={block.id} 
                                data-note-id={block.id} 
                                className="contents pointer-events-auto"
                            >
                                <NoteBlock 
                                    block={{...block, step: block.step - startStep}}
                                    ch={chNum}
                                    isSelected={selectedNoteIds.has(block.id)}
                                    isMoving={!!(block as any).isMoving}
                                    isResizing={!!(block as any).isResizing}
                                    onResizeStart={(e) => startResize(chNum, block.step, block.id)}
                                />
                            </div>
                        ))
                    }
                 </div>
              </div>
            </div>
        ))}
      </div>
  );

  return (
    <div 
        ref={gridRef}
        className="flex-1 overflow-auto p-8 pb-32 bg-[#080808] custom-scrollbar touch-none" 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
       {renderBank(0)}
       {renderBank(32)}
    </div>
  );
};