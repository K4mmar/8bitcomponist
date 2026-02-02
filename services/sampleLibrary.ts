
import { PatternClip } from '../types';

export const PATTERN_LIBRARY: PatternClip[] = [
  // =========================================================================
  // --- DRUMS (HIGH FIDELITY) ---
  // Focus: Stereo Hi-Hats, Volume Dynamics, Noise Shaping
  // =========================================================================

  { 
    id: 'drum_basic_rock', 
    name: 'BASIC ROCK 4/4', 
    category: 'DRUMS', 
    channels: { 4: [
      { step: 0, pitch: 'C-2', volume: 15, instrument: 'KICK' }, 
      { step: 4, pitch: 'C-5', volume: 12, instrument: 'SNARE', decay: 8 }, 
      { step: 8, pitch: 'C-2', volume: 15, instrument: 'KICK' }, 
      { step: 12, pitch: 'C-5', volume: 12, instrument: 'SNARE', decay: 8 },
      // Closed Hats with low volume ghost notes
      { step: 2, pitch: 'C-6', volume: 6, decay: 12 }, { step: 6, pitch: 'C-6', volume: 6, decay: 12 }, 
      { step: 10, pitch: 'C-6', volume: 6, decay: 12 }, { step: 14, pitch: 'C-6', volume: 8, decay: 12 } // Accent
    ]} 
  },
  { 
    id: 'drum_stereo_disco', 
    name: 'STEREO DISCO', 
    category: 'DRUMS', 
    channels: { 4: [
      { step: 0, pitch: 'C-2', volume: 15 }, { step: 4, pitch: 'C-5', volume: 12 }, 
      { step: 8, pitch: 'C-2', volume: 15 }, { step: 12, pitch: 'C-5', volume: 12 },
      // Panning Hats (Left / Right movement)
      { step: 2, pitch: 'C-6', volume: 8, panning: -0.5, decay: 14 }, 
      { step: 6, pitch: 'C-6', volume: 8, panning: 0.5, decay: 14 },
      { step: 10, pitch: 'C-6', volume: 8, panning: -0.5, decay: 14 }, 
      { step: 14, pitch: 'G-6', volume: 6, panning: 0.5, decay: 10 } // Open Hat
    ]} 
  },
  { 
    id: 'drum_amen_break', 
    name: 'JUNGLE BREAK', 
    category: 'DRUMS', 
    channels: { 4: [
      { step: 0, pitch: 'C-2', volume: 15 }, { step: 4, pitch: 'C-5', volume: 12 }, 
      { step: 6, pitch: 'C-2', volume: 10 }, { step: 9, pitch: 'C-5', volume: 10 }, 
      { step: 11, pitch: 'C-2', volume: 8 }, { step: 14, pitch: 'C-5', volume: 12 },
      { step: 15, pitch: 'C-6', volume: 6 } // Ghost shuffle
    ]} 
  },
  { 
    id: 'drum_trap_hihats', 
    name: 'TRAP ROLLS', 
    category: 'DRUMS', 
    channels: { 4: [
      { step: 0, pitch: 'C-1', volume: 15, decay: 4 }, // Long 808 Kick
      { step: 8, pitch: 'C-5', volume: 14, decay: 6, panning: 0.2 }, // Crisp Snare
      // Fast Hat Rolls with panning
      { step: 0, pitch: 'C-6', volume: 8, panning: -0.3 }, { step: 2, pitch: 'C-6', volume: 8, panning: 0.3 },
      { step: 4, pitch: 'C-6', volume: 8, panning: -0.3 }, { step: 5, pitch: 'C-6', volume: 6, panning: 0 }, { step: 6, pitch: 'C-6', volume: 6, panning: 0 },
      { step: 7, pitch: 'C-6', volume: 5, panning: 0.3 }
    ]} 
  },
  { 
    id: 'drum_motorik', 
    name: 'MOTORIK BEAT', 
    category: 'DRUMS', 
    channels: { 4: [
      { step: 0, pitch: 'C-2', volume: 14 }, { step: 2, pitch: 'C-2', volume: 10 }, 
      { step: 4, pitch: 'C-5', volume: 12 }, { step: 6, pitch: 'C-2', volume: 10 },
      { step: 8, pitch: 'C-2', volume: 14 }, { step: 10, pitch: 'C-2', volume: 10 }, 
      { step: 12, pitch: 'C-5', volume: 12 }, { step: 14, pitch: 'C-2', volume: 10 }
    ]} 
  },
  { id: 'drum_fill_snare', name: 'SNARE BUILD', category: 'DRUMS', channels: { 4: [
    { step: 0, pitch: 'C-4', volume: 6 }, { step: 2, pitch: 'C-4', volume: 7 }, 
    { step: 4, pitch: 'C-4', volume: 8 }, { step: 6, pitch: 'C-4', volume: 9 },
    { step: 8, pitch: 'C-4', volume: 10 }, { step: 10, pitch: 'C-4', volume: 11 }, 
    { step: 12, pitch: 'C-4', volume: 13 }, { step: 14, pitch: 'C-4', volume: 15, decay: 15 }
  ]} },
  { id: 'drum_fill_toms', name: 'TOM RUN', category: 'DRUMS', channels: { 4: [
    { step: 0, pitch: 'G-3', volume: 14, decay: 2 }, { step: 2, pitch: 'G-3', volume: 12 }, 
    { step: 4, pitch: 'E-3', volume: 14, decay: 2 }, { step: 6, pitch: 'E-3', volume: 12 },
    { step: 8, pitch: 'C-3', volume: 14, decay: 2 }, { step: 10, pitch: 'C-3', volume: 12 }, 
    { step: 12, pitch: 'A-2', volume: 15, decay: 5 }, { step: 14, pitch: 'C-5', volume: 15, decay: 10 } // Crash
  ]} },
  { id: 'drum_intro_count', name: 'INTRO COUNT', category: 'DRUMS', channels: { 4: [
    { step: 0, pitch: 'C-6', volume: 15, decay: 15 }, 
    { step: 4, pitch: 'C-6', volume: 15, decay: 15 }, 
    { step: 8, pitch: 'C-6', volume: 15, decay: 15 }, 
    { step: 12, pitch: 'C-6', volume: 15, decay: 15 }
  ]} },

  // =========================================================================
  // --- BASS (WAVE RAM & PULSE) ---
  // Focus: Slides, Duty Cycle Switching, Staccato
  // =========================================================================

  { 
    id: 'bass_offbeat_saw', 
    name: 'OFFBEAT SAW', 
    category: 'BASS', 
    channels: { 3: [
      { step: 2, pitch: 'C-2', volume: 14, dutyCycle: "0.25", decay: 5 }, 
      { step: 6, pitch: 'C-2', volume: 14, dutyCycle: "0.25", decay: 5 },
      { step: 10, pitch: 'C-2', volume: 14, dutyCycle: "0.25", decay: 5 }, 
      { step: 14, pitch: 'C-2', volume: 14, dutyCycle: "0.25", decay: 5 },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'bass_octave_slap', 
    name: 'OCTAVE FUNK', 
    category: 'BASS', 
    channels: { 3: [
      { step: 0, pitch: 'C-2', volume: 15, decay: 8 }, 
      { step: 2, pitch: 'C-3', volume: 12, decay: 12 }, // Slap
      { step: 4, pitch: 'C-2', volume: 10, decay: 5 }, 
      { step: 6, pitch: 'C-3', volume: 12, decay: 12 }, // Slap
      { step: 8, pitch: 'F-2', volume: 15, decay: 8 }, 
      { step: 10, pitch: 'F-3', volume: 12, decay: 12 },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'bass_acid_slide', 
    name: 'ACID SLIDE', 
    category: 'BASS', 
    channels: { 3: [
      { step: 0, pitch: 'C-2', volume: 15, dutyCycle: "0.25", decay: 8 },
      { step: 4, pitch: 'C-3', volume: 14, dutyCycle: "0.25", effect: 'SLIDE', slide: 'C-2' },
      { step: 8, pitch: 'C-2', volume: 15, dutyCycle: "0.25", decay: 8 },
      { step: 12, pitch: 'G-2', volume: 14, dutyCycle: "0.25", effect: 'SLIDE', slide: 'C-2' },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'bass_walking_tri', 
    name: 'WALKING JAZZ', 
    category: 'BASS', 
    channels: { 3: [
      { step: 0, pitch: 'C-2', volume: 13, dutyCycle: "0.125" }, 
      { step: 4, pitch: 'E-2', volume: 13, dutyCycle: "0.125" },
      { step: 8, pitch: 'G-2', volume: 13, dutyCycle: "0.125" }, 
      { step: 12, pitch: 'A-2', volume: 13, dutyCycle: "0.125" },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'bass_dub_sub', 
    name: 'DUB SUB DROP', 
    category: 'BASS', 
    channels: { 3: [
      { step: 0, pitch: 'C-2', volume: 15, dutyCycle: "0.5", effect: 'SLIDE', slide: 'C-1' }, // Square wave for sub
      { step: 8, pitch: 'OFF', volume: 0 }
    ]} 
  },
  { 
    id: 'bass_cyber_pump', 
    name: 'CYBER PUMP', 
    category: 'BASS', 
    channels: { 3: [
      { step: 0, pitch: 'C-2', volume: 15, dutyCycle: "0.25" }, 
      { step: 2, pitch: 'C-2', volume: 15, dutyCycle: "0.25" },
      { step: 4, pitch: 'OFF', volume: 0 }, 
      { step: 8, pitch: 'F-2', volume: 15, dutyCycle: "0.25" }, 
      { step: 10, pitch: 'F-2', volume: 15, dutyCycle: "0.25" },
      { step: 12, pitch: 'OFF', volume: 0 }
    ]} 
  },

  // =========================================================================
  // --- LEAD & ARPS (CH 1 & 2) ---
  // Focus: Panning, Arpeggio Effect, Vibrato, Echo Simulation
  // =========================================================================

  { 
    id: 'lead_heroic_intro', 
    name: 'HEROIC INTRO', 
    category: 'LEAD', 
    channels: { 1: [
      { step: 0, pitch: 'C-4', volume: 12, dutyCycle: "0.5", panning: -0.2 }, 
      { step: 3, pitch: 'C-4', volume: 12, dutyCycle: "0.5", panning: -0.2 },
      { step: 6, pitch: 'G-4', volume: 15, dutyCycle: "0.25", panning: 0 }, 
      { step: 12, pitch: 'C-5', volume: 15, dutyCycle: "0.25", panning: 0.2, effect: 'VIBRATO' },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'lead_echo_plucks', 
    name: 'ECHO PLUCKS', 
    category: 'LEAD', 
    channels: { 
      1: [{ step: 0, pitch: 'C-5', volume: 14, decay: 12, panning: -0.5 }, { step: 8, pitch: 'E-5', volume: 14, decay: 12, panning: -0.5 }, { step: 16, pitch: 'OFF' }],
      2: [{ step: 2, pitch: 'C-5', volume: 8, decay: 12, panning: 0.5 }, { step: 10, pitch: 'E-5', volume: 8, decay: 12, panning: 0.5 }, { step: 16, pitch: 'OFF' }]
    } 
  },
  { 
    id: 'lead_slide_whistle', 
    name: 'SLIDE UP FX', 
    category: 'LEAD', 
    channels: { 1: [
      { step: 0, pitch: 'C-4', volume: 12, effect: 'SLIDE', slide: 'C-6', decay: 0 }
      // Removed explicit OFF to let auto-cutoff handle it at step 1
    ]} 
  },
  { 
    id: 'lead_mega_run', 
    name: 'ACTION RUN', 
    category: 'LEAD', 
    channels: { 1: [
      { step: 0, pitch: 'C-4', volume: 14, dutyCycle: "0.25" }, { step: 1, pitch: 'OFF' },
      { step: 2, pitch: 'D-4', volume: 14, dutyCycle: "0.25" }, { step: 3, pitch: 'OFF' },
      { step: 4, pitch: 'D#4', volume: 14, dutyCycle: "0.25" }, { step: 5, pitch: 'OFF' },
      { step: 6, pitch: 'G-4', volume: 14, dutyCycle: "0.25" }, { step: 7, pitch: 'OFF' },
      { step: 8, pitch: 'A#4', volume: 14, dutyCycle: "0.25" }, { step: 9, pitch: 'OFF' },
      { step: 10, pitch: 'C-5', volume: 14, dutyCycle: "0.25" }, { step: 11, pitch: 'OFF' },
      { step: 12, pitch: 'OFF' } // Hard stop
    ]} 
  },
  { 
    id: 'arp_glassy_c', 
    name: 'GLASSY ARP C', 
    category: 'LEAD', 
    channels: { 2: [
      { step: 0, pitch: 'C-5', volume: 12, dutyCycle: "0.5", decay: 12, effect: 'ARPEGGIO', arpNotes: '0,4,7', panning: 0.4 },
      { step: 8, pitch: 'G-4', volume: 12, dutyCycle: "0.5", decay: 12, effect: 'ARPEGGIO', arpNotes: '0,4,7', panning: -0.4 },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'arp_minor_fast', 
    name: 'MINOR RUSH', 
    category: 'LEAD', 
    channels: { 2: [
      { step: 0, pitch: 'A-4', volume: 11, effect: 'ARPEGGIO', arpNotes: '0,3,7' },
      { step: 4, pitch: 'C-5', volume: 11, effect: 'ARPEGGIO', arpNotes: '0,3,7' },
      { step: 8, pitch: 'E-5', volume: 11, effect: 'ARPEGGIO', arpNotes: '0,3,7' },
      { step: 12, pitch: 'A-5', volume: 11, effect: 'ARPEGGIO', arpNotes: '0,3,7' },
      { step: 16, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'lead_staccato_flute', 
    name: 'STACCATO FLUTE', 
    category: 'LEAD', 
    channels: { 1: [
      { step: 0, pitch: 'C-5', volume: 12, decay: 10, dutyCycle: "0.5" },
      { step: 2, pitch: 'B-4', volume: 10, decay: 10, dutyCycle: "0.5" },
      { step: 4, pitch: 'A-4', volume: 12, decay: 10, dutyCycle: "0.5" },
      { step: 6, pitch: 'G-4', volume: 10, decay: 10, dutyCycle: "0.5" },
      { step: 8, pitch: 'OFF' }
    ]} 
  },
  { 
    id: 'lead_pulse_width', 
    name: 'PULSE WIDTH FX', 
    category: 'LEAD', 
    channels: { 1: [
      { step: 0, pitch: 'C-4', volume: 13, dutyCycle: "0.125" },
      { step: 4, pitch: 'C-4', volume: 13, dutyCycle: "0.25" },
      { step: 8, pitch: 'C-4', volume: 13, dutyCycle: "0.5" },
      { step: 12, pitch: 'C-4', volume: 13, dutyCycle: "0.125" },
      { step: 16, pitch: 'OFF' }
    ]} 
  },

  // =========================================================================
  // --- GAME SFX (Channel 1, 2 or 4) ---
  // =========================================================================

  { 
    id: 'sfx_coin', 
    name: 'SFX: COIN', 
    category: 'COMBO', 
    channels: { 
      2: [{ step: 0, pitch: 'B-5', volume: 12, decay: 10 }, { step: 1, pitch: 'E-6', volume: 14, decay: 8 }] 
    } 
  },
  { 
    id: 'sfx_jump', 
    name: 'SFX: JUMP', 
    category: 'COMBO', 
    channels: { 
      1: [{ step: 0, pitch: 'C-3', volume: 12, effect: 'SLIDE', slide: 'C-5', dutyCycle: "0.5", decay: 4 }] 
    } 
  },
  { 
    id: 'sfx_laser', 
    name: 'SFX: LASER', 
    category: 'COMBO', 
    channels: { 
      1: [{ step: 0, pitch: 'C-6', volume: 14, effect: 'SLIDE', slide: 'C-3', dutyCycle: "0.25", decay: 6 }] 
    } 
  },
  { 
    id: 'sfx_powerup', 
    name: 'SFX: POWER UP', 
    category: 'COMBO', 
    channels: { 
      1: [
        { step: 0, pitch: 'C-4', volume: 12, decay: 12, effect: 'ARPEGGIO', arpNotes: '0,4,7' },
        { step: 2, pitch: 'D-4', volume: 12, decay: 12, effect: 'ARPEGGIO', arpNotes: '0,4,7' },
        { step: 4, pitch: 'E-4', volume: 12, decay: 12, effect: 'ARPEGGIO', arpNotes: '0,4,7' },
        { step: 6, pitch: 'G-4', volume: 14, decay: 6, effect: 'ARPEGGIO', arpNotes: '0,4,7' },
        { step: 10, pitch: 'OFF' }
      ] 
    } 
  },
  { 
    id: 'sfx_explosion', 
    name: 'SFX: EXPLOSION', 
    category: 'COMBO', 
    channels: { 
      4: [{ step: 0, pitch: 'C-1', volume: 15, decay: 1 }] 
    } 
  },

  // =========================================================================
  // --- COMBOS (Full Layers) ---
  // =========================================================================

  { 
    id: 'combo_dungeon', 
    name: 'DUNGEON THEME', 
    category: 'COMBO', 
    channels: { 
      1: [{ step: 0, pitch: 'C-5', volume: 10, dutyCycle: "0.5", decay: 0 }, { step: 8, pitch: 'C-5', volume: 10, dutyCycle: "0.5", decay: 0 }, { step: 16, pitch: 'OFF' }],
      2: [{ step: 0, pitch: 'C-4', volume: 8, dutyCycle: "0.5", effect: 'ARPEGGIO', arpNotes: '0,3,6' }, { step: 16, pitch: 'OFF' }], 
      3: [{ step: 0, pitch: 'C-2', volume: 14, dutyCycle: "0.125" }, { step: 8, pitch: 'G-1', volume: 14, dutyCycle: "0.125" }, { step: 16, pitch: 'OFF' }],
      4: [{ step: 0, pitch: 'C-2', volume: 12 }, { step: 8, pitch: 'C-2', volume: 12 }]
    } 
  },
  { 
    id: 'combo_happy_loop', 
    name: 'HAPPY LOOP', 
    category: 'COMBO', 
    channels: { 
      1: [{ step: 0, pitch: 'E-5', volume: 12 }, { step: 2, pitch: 'C-5', volume: 12 }, { step: 4, pitch: 'G-4', volume: 12 }, { step: 8, pitch: 'OFF' }],
      3: [{ step: 0, pitch: 'C-2', volume: 15, decay: 10 }, { step: 4, pitch: 'G-1', volume: 15, decay: 10 }, { step: 8, pitch: 'OFF' }],
      4: [{ step: 0, pitch: 'C-2', volume: 14 }, { step: 4, pitch: 'C-5', volume: 10 }]
    } 
  }
];
