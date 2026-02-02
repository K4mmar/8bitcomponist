
import { PITCH_TO_FREQ } from '../types';

/**
 * VGM ARCHITECT - CORE FRAMEWORK
 * Dit bestand is de "Single Source of Truth" voor de audio-fysica.
 * Zowel de Editor, de AudioEngine als de AI moeten zich aan deze definities houden.
 */

// 1. Hardware Constraints & Defaults
export const HARDWARE_DEFS = {
  PULSE_DUTY_OPTIONS: ["0.125", "0.25", "0.5"] as const,
  WAVE_FORMS: ["TRIANGLE", "SAWTOOTH", "SQUARE"] as const,
  NOISE_MODES: {
    SOFT: "0.5",   // 15-bit LFSR (White Noise)
    METAL: "0.125" // 7-bit LFSR (Periodic/Metallic Noise)
  },
  DEFAULT_VOLUME: 12,
  MAX_VOLUME: 15
};

// 2. Instrument Definitions (Channel 4 specific)
// Aangepast voor betere perceptie van 'Kick' vs 'Hat'
export const INSTRUMENT_DEFS: Record<string, { pitch: string, decay: number, duty: string, channel: number }> = {
  'KICK':  { pitch: 'C-2', decay: 10, duty: HARDWARE_DEFS.NOISE_MODES.SOFT, channel: 4 },
  'SNARE': { pitch: 'C-4', decay: 6,  duty: HARDWARE_DEFS.NOISE_MODES.SOFT, channel: 4 },
  'HAT':   { pitch: 'C-7', decay: 14, duty: HARDWARE_DEFS.NOISE_MODES.METAL, channel: 4 }, // Hogere pitch voor scherpere 'tik'
  
  // Melodic defaults
  'BASS':  { pitch: 'C-2', decay: 0,  duty: "0.5", channel: 3 }, 
  'LEAD':  { pitch: 'C-5', decay: 0,  duty: "0.5", channel: 1 }
};

// 3. Frequency Logic
// Noise Channel (4) frequenties exponentieel gemapt om het bereik van de Game Boy dividers na te bootsen.
// Deze tabel wordt nu gebruikt als fallback of voor AI 'buckets', maar de slider gebruikt directe frequenties.
export const NOISE_FREQUENCIES: Record<number, number> = {
    1: 44,    // Sub Rumble
    2: 110,   // Body Kick
    3: 220,   // Low Snare / Tom
    4: 550,   // Snare Body / Noise Burst
    5: 1800,  // Crunch / Lo-Fi Hat
    6: 6000,  // Closed Hat / Shaker (Metal)
    7: 14000  // Open Hat / Cymbal / Tick (Metal)
};

/**
 * Berekent de frequentie voor een gegeven noot en kanaal.
 */
export const getFrequencyForPitch = (pitch: string, channel: number): number | null => {
    if (!pitch || pitch === '---' || pitch === 'OFF') return null;

    if (channel === 4) {
        // BELANGRIJK: We kijken EERST of het een specifieke noot is (voor de slider).
        // Hierdoor werkt de 'Noise Clock Divider' slider weer traploos per halve toon.
        if (PITCH_TO_FREQ[pitch]) {
            return PITCH_TO_FREQ[pitch];
        }

        // Fallback naar octaaf buckets als het een onbekende noot is (bv gegenereerd door oude AI code)
        const octave = parseInt(pitch.slice(-1));
        const mappedFreq = NOISE_FREQUENCIES[octave];
        if (mappedFreq) return mappedFreq;
        
        return 1000;
    }

    // Melodische kanalen
    return PITCH_TO_FREQ[pitch] || null;
};

/**
 * Bepaalt intelligent het instrument type op basis van settings.
 */
export const detectInstrumentType = (ch: number, pitch: string, duty: string): string => {
    if (ch !== 4) return 'NOTE';
    
    const octave = parseInt(pitch.slice(-1)) || 4;
    
    // Metal modus is bijna altijd een Hat of Cymbal
    if (duty === HARDWARE_DEFS.NOISE_MODES.METAL) return 'HAT';
    
    if (octave <= 2) return 'KICK';
    if (octave >= 6) return 'HAT'; // Soft noise op hoge pitch klinkt als shaker/hat
    return 'SNARE';
};
