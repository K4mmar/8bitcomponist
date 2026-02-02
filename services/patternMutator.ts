
import { TrackerRow, Pattern } from '../types';
import { pitchToIndex, indexToPitch } from './trackerUtils';

export interface PatternBlock extends TrackerRow {
    length: number;
    channel: number;
}

export const patternToBlocks = (pattern: Pattern): PatternBlock[] => {
    const blocks: PatternBlock[] = [];
    [1, 2, 3, 4].forEach(chNum => {
        const ch = chNum as 1|2|3|4;
        const rows = [...(pattern.channels[ch] || [])].sort((a, b) => a.step - b.step);
        rows.forEach((row) => {
            if (row.pitch === 'OFF' || row.pitch === '---') return;
            
            const nextNote = rows.find(r => r.step > row.step && r.pitch !== '---');
            
            let length = 1;
            if (ch !== 4) {
                length = nextNote ? nextNote.step - row.step : 64 - row.step;
            } else {
                if (nextNote && nextNote.pitch === 'OFF') {
                    length = nextNote.step - row.step;
                } else {
                    length = 1;
                }
            }
            blocks.push({ ...row, channel: ch, length: Math.max(1, length) });
        });
    });
    return blocks;
};

const compileBlocksToPattern = (blocks: PatternBlock[], originalPattern: Pattern): Pattern => {
    const newChannels: Pattern['channels'] = { 1: [], 2: [], 3: [], 4: [] };
    [1, 2, 3, 4].forEach(chNum => {
        const ch = chNum as 1|2|3|4;
        const chBlocks = blocks.filter(b => b.channel === ch).sort((a, b) => a.step - b.step);
        const rows: TrackerRow[] = [];
        
        chBlocks.forEach((block, i) => {
            if (block.step < 0 || block.step >= 64) return;
            rows.push({ ...block });
            
            const end = block.step + block.length;
            const nextBlock = chBlocks[i + 1];
            if (end < 64 && (!nextBlock || nextBlock.step > end)) {
                rows.push({
                    id: `off-${block.id}-${Date.now()}`,
                    step: end,
                    pitch: 'OFF',
                    instrument: '---',
                    volume: 0,
                    dutyCycle: '0.5'
                });
            }
        });
        newChannels[ch] = rows.sort((a,b) => a.step - b.step);
    });
    return { ...originalPattern, id: originalPattern.id, channels: newChannels };
};

export const applyMoveOperation = (
    pattern: Pattern,
    selectedNoteIds: Set<string>,
    delta: { ch: number, step: number },
    isCopy: boolean,
    selectedCells?: Set<string> // Parameter kept for interface compatibility, but logic relies on calculated destination
): { newPattern: Pattern } => {
    const allBlocks = patternToBlocks(pattern);
    const movingBlocks: PatternBlock[] = [];
    const staticBlocks: PatternBlock[] = [];

    // 1. Separation Phase: Identify Moving vs Static blocks
    allBlocks.forEach(block => {
        if (selectedNoteIds.has(block.id)) {
            // If copying, the original stays in place as a static block
            if (isCopy) {
                staticBlocks.push({ ...block, id: `cp-${block.id}-${Date.now()}` });
            }

            // Calculate new position for the moving block
            const newCh = block.channel + delta.ch;
            const newStep = block.step + delta.step;
            
            // Boundary Clamping
            const clampedCh = Math.min(4, Math.max(1, newCh));
            const clampedStep = Math.min(63, Math.max(0, newStep));
            
            // Adjust length if it hits the end of grid (64)
            const adjustedLength = Math.min(block.length, 64 - clampedStep);

            // Add to moving list if valid
            if (adjustedLength > 0) {
                movingBlocks.push({ 
                    ...block, 
                    channel: clampedCh, 
                    step: clampedStep, 
                    length: adjustedLength 
                });
            }
        } else {
            staticBlocks.push(block);
        }
    });

    // 2. Kill Zone Calculation based on DESTINATION
    // We determine which steps are occupied by the incoming moving blocks.
    const killZone = new Set<string>();
    movingBlocks.forEach(mb => {
        for(let i = 0; i < mb.length; i++) {
            killZone.add(`${mb.channel}-${mb.step + i}`);
        }
    });

    // 3. Filtering Phase
    // Remove any static blocks that collide with the kill zone (Overwriting logic)
    const filteredStaticBlocks = staticBlocks.filter(sb => {
        for(let i = 0; i < sb.length; i++) {
            if (killZone.has(`${sb.channel}-${sb.step + i}`)) {
                return false; // Collision: This block is overwritten
            }
        }
        return true;
    });

    // 4. Compilation
    const finalBlocks = [...filteredStaticBlocks, ...movingBlocks];
    return { newPattern: compileBlocksToPattern(finalBlocks, pattern) };
};

export const applyResizeOperation = (pattern: Pattern, ch: 1|2|3|4, startStep: number, newLength: number): Pattern => {
    const allBlocks = patternToBlocks(pattern);
    const targetIndex = allBlocks.findIndex(b => b.channel === ch && b.step === startStep);
    
    if (targetIndex === -1) return pattern;

    const target = { ...allBlocks[targetIndex] };
    target.length = Math.max(1, Math.min(64 - target.step, newLength));

    const targetRange = { start: target.step, end: target.step + target.length - 1 };

    const finalBlocks = allBlocks.filter((b, idx) => {
        if (idx === targetIndex) return false;
        if (b.channel !== ch) return true;

        const bStart = b.step;
        const bEnd = b.step + b.length - 1;
        const overlaps = targetRange.start <= bEnd && bStart <= targetRange.end;
        return !overlaps;
    });

    finalBlocks.push(target);
    return compileBlocksToPattern(finalBlocks, pattern);
};

export const applyPasteOperation = (
    pattern: Pattern,
    blocksToPaste: PatternBlock[],
    targetStep: number,
    targetCh: number,
    originStep: number,
    originCh: number
): Pattern => {
    const existingBlocks = patternToBlocks(pattern);
    const deltaStep = targetStep - originStep;
    const deltaCh = targetCh - originCh;

    const shiftedBlocks = blocksToPaste.map(b => ({
        ...b,
        id: `p-${Math.random().toString(36).substr(2, 5)}-${Date.now()}`,
        step: b.step + deltaStep,
        channel: b.channel + deltaCh
    })).filter(b => b.step >= 0 && b.step < 64 && b.channel >= 1 && b.channel <= 4);

    if (shiftedBlocks.length === 0) return pattern;

    const finalBlocks = existingBlocks.filter(eb => {
        return !shiftedBlocks.some(sb => {
            if (sb.channel !== eb.channel) return false;
            const sStart = sb.step;
            const sEnd = sb.step + (sb.pitch === "EMPTY_CELL" ? 0 : sb.length - 1);
            const eStart = eb.step;
            const eEnd = eb.step + eb.length - 1;
            return sStart <= eEnd && eStart <= sEnd;
        });
    });

    const realBlocksToAdd = shiftedBlocks.filter(b => b.pitch !== "EMPTY_CELL");
    finalBlocks.push(...realBlocksToAdd);
    return compileBlocksToPattern(finalBlocks, pattern);
};

// --- NIEUWE OPERATIES ---

export const applyReverseOperation = (
    pattern: Pattern, 
    selectedCells: Set<string>
): Pattern => {
    // We werken per kanaal en per rij selectie
    const newChannels = { ...pattern.channels };
    
    // Bepaal de bounds van de selectie
    let minStep = 64, maxStep = -1;
    const selectedRowsByChannel: Record<number, TrackerRow[]> = { 1: [], 2: [], 3: [], 4: [] };

    // Verzamel geselecteerde rijen en bepaal range
    [1, 2, 3, 4].forEach(chNum => {
        const ch = chNum as 1|2|3|4;
        newChannels[ch].forEach(row => {
            if (selectedCells.has(`${ch}-${row.step}`)) {
                if (row.step < minStep) minStep = row.step;
                if (row.step > maxStep) maxStep = row.step;
                selectedRowsByChannel[ch].push(row);
            }
        });
    });

    if (maxStep === -1) return pattern; // Geen selectie

    // Voer reverse uit
    [1, 2, 3, 4].forEach(chNum => {
        const ch = chNum as 1|2|3|4;
        const rows = selectedRowsByChannel[ch];
        if (rows.length === 0) return;

        // Verwijder originele rijen uit kanaal data
        newChannels[ch] = newChannels[ch].filter(r => !selectedCells.has(`${ch}-${r.step}`));

        // Maak nieuwe reversed rijen
        rows.forEach(row => {
            const offset = row.step - minStep;
            const newStep = maxStep - offset;
            
            newChannels[ch].push({
                ...row,
                id: `rev-${row.id}-${Date.now()}`,
                step: newStep
            });
        });
        
        newChannels[ch].sort((a,b) => a.step - b.step);
    });

    return { ...pattern, channels: newChannels };
};

export const applyInterpolateOperation = (
    pattern: Pattern,
    selectedCells: Set<string>
): Pattern => {
    const newChannels = { ...pattern.channels };

    [1, 2, 3, 4].forEach(chNum => {
        const ch = chNum as 1|2|3|4;
        // Filter rows in selection and sort
        const rows = newChannels[ch].filter(r => selectedCells.has(`${ch}-${r.step}`)).sort((a, b) => a.step - b.step);
        
        if (rows.length < 2) return; // Need at least start and end

        // Remove existing rows between start and end that are in selection (to be overwritten)
        // Maar we behouden de 'keyframe' noten die we gebruiken voor interpolatie
        // Echter, 'Interpolate' vult normaal gaten.
        // Strategie: We interpoleren tussen ELK paar opeenvolgende geselecteerde noten.
        
        const generatedRows: TrackerRow[] = [];

        for (let i = 0; i < rows.length - 1; i++) {
            const startRow = rows[i];
            const endRow = rows[i+1];
            
            const stepSpan = endRow.step - startRow.step;
            if (stepSpan <= 1) continue; // Adjacent, no space to fill

            // Interpolate Values
            const startVol = startRow.volume;
            const endVol = endRow.volume;
            
            const startPitchIdx = startRow.pitch && startRow.pitch !== '---' && startRow.pitch !== 'OFF' ? pitchToIndex(startRow.pitch) : -1;
            const endPitchIdx = endRow.pitch && endRow.pitch !== '---' && endRow.pitch !== 'OFF' ? pitchToIndex(endRow.pitch) : -1;

            const startPan = startRow.panning ?? 0;
            const endPan = endRow.panning ?? 0;

            for (let s = 1; s < stepSpan; s++) {
                const fraction = s / stepSpan;
                const currentStep = startRow.step + s;

                // Check if there is already a note here that is NOT in selection?
                // For "Tween", we usually overwrite empty space.
                // Let's create a new row
                
                const newVol = Math.round(startVol + (endVol - startVol) * fraction);
                const newPan = parseFloat((startPan + (endPan - startPan) * fraction).toFixed(2));
                
                let newPitch = "---";
                if (startPitchIdx !== -1 && endPitchIdx !== -1) {
                    const newPitchIdx = Math.round(startPitchIdx + (endPitchIdx - startPitchIdx) * fraction);
                    newPitch = indexToPitch(newPitchIdx);
                } else if (startPitchIdx !== -1) {
                    newPitch = startRow.pitch; // Maintain pitch if target has none
                }

                generatedRows.push({
                    id: `tween-${ch}-${currentStep}-${Date.now()}`,
                    step: currentStep,
                    pitch: newPitch,
                    instrument: startRow.instrument, // Inherit instrument
                    volume: newVol,
                    panning: newPan,
                    dutyCycle: startRow.dutyCycle,
                    effect: 'NONE' // Clear effects on tweened notes usually
                });
            }
        }

        // Add generated rows to channel, replacing any existing ones at those steps
        const occupiedSteps = new Set(generatedRows.map(r => r.step));
        newChannels[ch] = newChannels[ch].filter(r => !occupiedSteps.has(r.step));
        newChannels[ch].push(...generatedRows);
        newChannels[ch].sort((a,b) => a.step - b.step);
    });

    return { ...pattern, channels: newChannels };
};

export const applyRandomizeOperation = (
    pattern: Pattern,
    selectedCells: Set<string>,
    type: 'VOLUME' | 'PANNING' | 'BOTH'
): Pattern => {
    const newChannels = { ...pattern.channels };

    [1, 2, 3, 4].forEach(chNum => {
        const ch = chNum as 1|2|3|4;
        newChannels[ch] = newChannels[ch].map(row => {
            if (selectedCells.has(`${ch}-${row.step}`) && row.pitch !== '---' && row.pitch !== 'OFF') {
                const newRow = { ...row };
                
                if (type === 'VOLUME' || type === 'BOTH') {
                    // Jitter +/- 2
                    const jitter = Math.floor(Math.random() * 5) - 2; 
                    newRow.volume = Math.max(1, Math.min(15, row.volume + jitter));
                }

                if (type === 'PANNING' || type === 'BOTH') {
                    // Jitter +/- 0.3
                    const currentPan = row.panning ?? 0;
                    const jitter = (Math.random() * 0.6) - 0.3;
                    newRow.panning = Math.max(-1, Math.min(1, parseFloat((currentPan + jitter).toFixed(2))));
                }

                return newRow;
            }
            return row;
        });
    });

    return { ...pattern, channels: newChannels };
};
