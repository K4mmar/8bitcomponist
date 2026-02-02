
export type ViewMode = 'START' | 'EDITOR' | 'MOBILE_STUDIO';

export interface TrackerRow {
  id: string; // Verplicht voor stabiele tracking
  step: number;
  pitch: string; 
  instrument: "LEAD" | "PLUCK" | "SUB" | "KICK" | "SNARE" | "HAT" | "SAMPLE" | "---";
  sampleId?: string; 
  volume: number; 
  dutyCycle: "0.125" | "0.25" | "0.5";
  slide?: string;
  effect?: "NONE" | "SLIDE" | "VIBRATO" | "ARPEGGIO";
  arpNotes?: string; 
  decay?: number; 
  panning?: number; // -1 (Left) to 1 (Right)
}

export interface Sample {
  id: string;
  name: string;
  url: string;
  buffer?: AudioBuffer;
}

export interface PatternClip {
  id: string;
  name: string;
  category: 'DRUMS' | 'BASS' | 'LEAD' | 'COMBO' | 'AI';
  channels: {
    [key: number]: Partial<TrackerRow>[];
  };
}

export interface Pattern {
  id: string;
  name: string;
  channels: {
    1: TrackerRow[];
    2: TrackerRow[];
    3: TrackerRow[];
    4: TrackerRow[];
  };
}

export interface Note {
  frequency: number;
  duration: number;
  time: number;
  channel: 1 | 2 | 3 | 4;
  volume: number;
  dutyCycle?: 0.125 | 0.25 | 0.5;
  slide?: number;
  vibrato?: number;
  arpeggio?: number[];
  decay?: number;
  sampleBuffer?: AudioBuffer;
  panning?: number;
}

export type MusicGenre = 'ACTION' | 'RPG' | 'HORROR' | 'PUZZLE' | 'RACING';
export type EnergyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type MusicContext = 'INTRO_THEME' | 'BOSS_BATTLE' | 'OVERWORLD' | 'VICTORY' | 'DUNGEON';
export type MusicEmotion = 'HEROIC' | 'TENSE' | 'SAD' | 'HAPPY' | 'MYSTERIOUS' | 'AGGRESSIVE';
export type MusicStructure = 'LOOP_SHORT' | 'LOOP_COMPLEX' | 'SONG_FULL';
export type MusicTonality = 'MAJOR' | 'MINOR' | 'MODAL_DARK' | 'MODAL_BRIGHT';

export interface CompositionSettings {
  genre: MusicGenre;
  emotion: MusicEmotion;
  structure: MusicStructure;
  tonality: MusicTonality;
  energy: EnergyLevel;
}

export interface ProjectState {
  patterns: Pattern[];
  arrangement: string[];
  bpm: number;
  activePatternId: string | null;
  samples: Sample[];
  customClips: PatternClip[];
  history: Omit<ProjectState, 'history' | 'activePatternId' | 'samples'>[];
}

export interface SavedProjectMeta {
  id: string;
  name: string;
  date: number; // Timestamp
  previewBpm: number;
  isDemo?: boolean;
}

export const GameBoyPalette = {
  LIGHTEST: '#9bbc0f',
  LIGHT: '#8bac0f',
  DARK: '#306230',
  DARKEST: '#0f380f'
};

export const MUSICAL_KEYS: Record<string, string> = {
  'z': 'C-4', 's': 'C#4', 'x': 'D-4', 'd': 'D#4', 'c': 'E-4', 'v': 'F-4', 'g': 'F#4', 'b': 'G-4', 'h': 'G#4', 'n': 'A-4', 'j': 'A#4', 'm': 'B-4', ',': 'C-5',
  'q': 'C-5', '2': 'C#5', 'w': 'D-5', '3': 'D#5', 'e': 'E-5', 'r': 'F-5', '5': 'F#5', 't': 'G-5', '6': 'G#5', 'y': 'A-5', '7': 'A#5', 'u': 'B-5', 'i': 'C-6'
};

export const KEYBOARD_MAP = {
  PITCH_DOWN: 'Shift+ArrowDown',
  PITCH_UP: 'Shift+ArrowUp',
  OCTAVE_DOWN: '[',
  OCTAVE_UP: ']',
  VOL_UP: '+',
  VOL_UP_NUM: 'Add',
  VOL_UP_ALT: '=', 
  VOL_DOWN: '-',
  VOL_DOWN_NUM: 'Subtract',
  SILENCE: '0',
  CLEAR: 'Delete',
  CLEAR_ALT: '.',
  CLEAR_BACKSPACE: 'Backspace', 
  DUTY_CYCLE: 'Shift+D',
  SLIDE: 'Shift+S',
  VIBRATO: 'Shift+V',
  ARPEGGIO: 'Shift+A'
};

export const PITCH_TO_FREQ: Record<string, number> = {
  'C-1': 32.70, 'C#1': 34.65, 'D-1': 36.71, 'D#1': 38.89, 'E-1': 41.20, 'F-1': 43.65, 'F#1': 46.25, 'G-1': 49.00, 'G#1': 51.91, 'A-1': 55.00, 'A#1': 58.27, 'B-1': 61.74,
  'C-2': 65.41, 'C#2': 69.30, 'D-2': 73.42, 'D#2': 77.78, 'E-2': 82.41, 'F-2': 87.31, 'F#2': 92.50, 'G-2': 98.00, 'G#2': 103.83, 'A-2': 110.00, 'A#2': 116.54, 'B-2': 123.47,
  'C-3': 130.81, 'C#3': 138.59, 'D-3': 146.83, 'D#3': 155.56, 'E-3': 164.81, 'F-3': 174.61, 'F#3': 185.00, 'G-3': 196.00, 'G#3': 207.65, 'A-3': 220.00, 'A#3': 233.08, 'B-3': 246.94,
  'C-4': 261.63, 'C#4': 277.18, 'D-4': 293.66, 'D#4': 311.13, 'E-4': 329.63, 'F-4': 349.23, 'F#4': 369.99, 'G-4': 392.00, 'G#4': 415.30, 'A-4': 440.00, 'A#4': 466.16, 'B-4': 493.88,
  'C-5': 523.25, 'C#5': 554.37, 'D-5': 587.33, 'D#5': 622.25, 'E-5': 659.25, 'F-5': 698.46, 'F#5': 739.99, 'G-5': 783.99, 'G#5': 830.61, 'A-5': 880.00, 'A#5': 932.33, 'B-5': 987.77,
  'C-6': 1046.50, 'C#6': 1108.73, 'D-6': 1174.66, 'D#6': 1244.51, 'E-6': 1318.51, 'F-6': 1396.91, 'F#6': 1479.98, 'G-6': 1567.98, 'G#6': 1661.22, 'A-6': 1760.00, 'A#6': 1864.66, 'B-6': 1975.53,
  'C-7': 2093.00, 'C#7': 2217.46, 'D-7': 2349.32, 'D#7': 2489.02, 'E-7': 2637.02, 'F-7': 2793.83, 'F#7': 2959.96, 'G-7': 3135.96, 'G#7': 3322.44, 'A-7': 3520.00, 'A#7': 3729.31, 'B-7': 3951.07
};
