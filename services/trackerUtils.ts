
import { TrackerRow, Note, PITCH_TO_FREQ } from '../types';
import { getFrequencyForPitch, detectInstrumentType, INSTRUMENT_DEFS, HARDWARE_DEFS } from './musicalFramework';

/**
 * Normalizes pitch strings to internal format (e.g. "C4" -> "C-4", "Eb3" -> "D#3")
 */
export const normalizePitch = (pitch: string | any): string => {
  if (!pitch) return '---';
  
  // Ensure we are working with a string, even if input is number/object
  const pStr = String(pitch);

  if (pStr === '---' || pStr === 'OFF') return pStr;
  
  let p = pStr.trim().toUpperCase();
  
  // Enharmonic Conversion
  const flats: Record<string, string> = { 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#', 'BB': 'A#' };
  for (const [flat, sharp] of Object.entries(flats)) {
      if (p.startsWith(flat)) { p = sharp + p.substring(2); break; }
  }

  p = p.replace(/-/g, '');
  const match = p.match(/^([A-G])(#?)(\d)$/);
  
  if (match) {
      return match[2] === '#' ? `${match[1]}#${match[3]}` : `${match[1]}-${match[3]}`;
  }

  if (PITCH_TO_FREQ[p]) return p;
  if (p.length === 2) return `${p[0]}-${p[1]}`;
  return 'C-4'; 
};

// SORTED KEYS for Index Math
export const SORTED_PITCHES = Object.keys(PITCH_TO_FREQ).sort((a, b) => PITCH_TO_FREQ[a] - PITCH_TO_FREQ[b]);

export const pitchToIndex = (pitch: string): number => {
    return SORTED_PITCHES.indexOf(normalizePitch(pitch));
};

export const indexToPitch = (index: number): string => {
    if (index < 0) return SORTED_PITCHES[0];
    if (index >= SORTED_PITCHES.length) return SORTED_PITCHES[SORTED_PITCHES.length - 1];
    return SORTED_PITCHES[Math.floor(index)];
};

/**
 * Generates an accessible label based on the centralized framework.
 */
export const getFriendlyLabel = (row: TrackerRow, ch: number): string => {
  if (!row.pitch || row.pitch === '---') return 'Leeg';
  if (row.pitch === 'OFF') return 'Stop';

  if (ch === 4) {
      const type = detectInstrumentType(ch, row.pitch, row.dutyCycle);
      switch(type) {
          case 'KICK': return 'Kick Drum';
          case 'SNARE': return 'Snare Drum';
          case 'HAT': return 'Hi-Hat / Metal';
          default: return 'Percussie';
      }
  }

  if (ch === 3) return 'Bas Golf';
  return 'Puls Golf';
};

/**
 * Converts a TrackerRow to a playable Note using the Musical Framework.
 * Pure function: Data IN -> Note OUT. No side effects.
 */
export const rowToNote = (
  row: TrackerRow, 
  ch: number, 
  startTime: number, 
  duration: number,
  channelDefaults: any
): Note | null => {
  if (!row.pitch || row.pitch === '---' || row.pitch === 'OFF') return null;

  const normalizedPitch = normalizePitch(row.pitch);
  
  // 1. Get Frequency from Framework
  const freq = getFrequencyForPitch(normalizedPitch, ch);
  if (!freq) return null;

  // 2. Determine Duty Cycle (Priority: Row > Instrument Def > Default)
  let duty = row.dutyCycle;
  if (!duty) {
      // Fallback logic if row is empty (shouldn't happen often in strict mode)
      if (ch === 4) {
          const type = detectInstrumentType(ch, normalizedPitch, "0.5");
          duty = INSTRUMENT_DEFS[type]?.duty as any || "0.5";
      } else {
          duty = channelDefaults[ch]?.dutyCycle || "0.5";
      }
  }

  // 3. Effects Parsing
  let arpOffsets: number[] | undefined = undefined;
  if (row.effect === 'ARPEGGIO') {
    const notesStr = row.arpNotes || "4,7"; 
    arpOffsets = notesStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
  }

  let slideFreq: number | undefined = undefined;
  if (row.effect === 'SLIDE') {
    if (row.slide) {
      const targetPitch = normalizePitch(row.slide);
      slideFreq = getFrequencyForPitch(targetPitch, ch) || undefined;
    } else {
      // Auto-slide fallback
      slideFreq = freq * 2; 
    }
  }

  return {
    frequency: freq,
    duration: duration,
    time: startTime,
    channel: ch as 1 | 2 | 3 | 4,
    volume: (row.volume ?? 12) / 15,
    dutyCycle: parseFloat(duty) as any,
    vibrato: row.effect === 'VIBRATO' ? 6 : undefined,
    slide: slideFreq,
    arpeggio: arpOffsets,
    decay: row.decay,
    panning: row.panning
  };
};

export const formatPitchString = (note: string, octave: number): string => {
  return note.length === 1 ? `${note}-${octave}` : `${note}${octave}`;
};
