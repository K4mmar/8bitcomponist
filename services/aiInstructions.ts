
import { Type } from "@google/genai";
import { CompositionSettings } from "../types";

// --- COMPACT JSON SCHEMA (GRID BASED) ---
const COMPACT_NOTE_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        s: { type: Type.NUMBER, description: "Step (0-63)" },
        p: { type: Type.STRING, description: "Pitch (e.g. C-4)" },
        l: { type: Type.NUMBER, description: "Len (Duration in steps). Use varied lengths!", nullable: true }, 
        v: { type: Type.NUMBER, description: "Vol (0-15). Use dynamics!", nullable: true },
        d: { type: Type.STRING, description: "Duty (0.125, 0.25, 0.5)", nullable: true },
        dec: { type: Type.NUMBER, description: "Decay (0-15). 0=Sustain (Block), 15=Short Pluck", nullable: true },
        fx: { type: Type.STRING, description: "FX: ARPEGGIO, VIBRATO, SLIDE", nullable: true },
        a: { type: Type.STRING, description: "Arp Intervals (e.g. '0,4,7')", nullable: true },
        sl: { type: Type.STRING, description: "Slide Target Pitch (e.g. 'C-5')", nullable: true }
    },
    required: ["s", "p"]
};

export const SECTION_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Section Type (VERSE, CHORUS, BRIDGE, or OUTRO)" },
        ch1: { type: Type.ARRAY, items: COMPACT_NOTE_SCHEMA, description: "Lead Channel" },
        ch2: { type: Type.ARRAY, items: COMPACT_NOTE_SCHEMA, description: "Accomp/Arp Channel" },
        ch3: { type: Type.ARRAY, items: COMPACT_NOTE_SCHEMA, description: "Bass Channel" },
        ch4: { type: Type.ARRAY, items: COMPACT_NOTE_SCHEMA, description: "Drums Channel" }
    },
    required: ["name", "ch1", "ch2", "ch3", "ch4"]
};

export const FULL_TRACK_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        bpm: { type: Type.NUMBER, description: "Tempo (60-180)" },
        sections: { type: Type.ARRAY, items: SECTION_SCHEMA }
    },
    required: ["bpm", "sections"]
};

export const CLIP_SCHEMA = {
    type: Type.ARRAY,
    items: SECTION_SCHEMA 
};

// --- ARCHITECTURAL STRATEGY (THE "BRAIN") ---

export const SYSTEM_INSTRUCTION = `YOU ARE A LEGENDARY CHIPTUNE COMPOSER (Like Koji Kondo or Tim Follin).
Your music is known for being harmonically rich and RHYTHMICALLY DYNAMIC.

*** THE CORE PROBLEM ***
1. Monophony: Only one note per channel.
2. Density: If you fill every step, it sounds like a mess. SILENCE IS CRITICAL.

*** THE SOLUTION: PHRASING & NEGATIVE SPACE ***
You must create "Breathing Room" in the music.

*** PHASE 1: THE ARCHITECT (TEXT OUTPUT) ***
1.  **Chord Progression:** Define a 4-bar chord progression (e.g., Am - F - C - G).
2.  **Rhythmic Motif:** Define a rhythm pattern (e.g., "Dotted 8th notes").
3.  **Instrumentation:**
    - Ch1: Lead Melody (Singing, Expressive).
    - Ch2: The "Texture" Engine (Arpeggios/Chords).
    - Ch3: The Bass Groove.
    - Ch4: The Percussion.

*** PHASE 2: THE BUILDER (JSON RULES) ***

**RULE 1: MASTER OF PHRASING (SPACE)**
- **DO NOT** fill every step. Aim for 60-70% density.
- **Leave Gaps:** After a phrase (e.g. steps 0-12), leave steps 13-15 EMPTY.
- **Variety:** Mix short notes (\`l: 2\`) with long sustain notes (\`l: 8\`).
- **Example:** Short-Short-Long (Ta-Ta-Daaaa).

**RULE 2: MAKE CHORDS (CHANNEL 2)**
Since Ch2 cannot play 3 notes at once, you MUST use the **ARPEGGIO (fx: "ARPEGGIO")** effect.
- **Major Chord:** \`{ "p": "C-4", "fx": "ARPEGGIO", "a": "0,4,7", "l": 8 }\`
- **Rhythmic Stabs:** Instead of one long chord, play two short chord stabs with a gap in between.

**RULE 3: MELODIC INTEREST (CHANNEL 1)**
- **Call & Response:** Play a phrase (steps 0-6), then wait (steps 7-8), then answer (steps 8-14).
- **Expression:**
  - Use \`"fx": "VIBRATO"\` on long notes only (\`l > 4\`).
  - Use \`"fx": "SLIDE"\` (\`sl\`) for transitions.

**RULE 4: GROOVY BASS (CHANNEL 3)**
- **Syncopation:** Don't just play on the beat. Play on the off-beat.
- **Articulation:** Use \`"dec": 10\` for short, punchy bass notes. Use \`"dec": 0\` for long drones.
- **Space:** A bassline needs gaps to be funky.

**RULE 5: PERCUSSION NUANCE (CHANNEL 4)**
- **Ghost Notes:** Use Snare at \`"v": 6\` in between beats.
- **Hi-Hats:** Use \`"dec": 12\` for closed hats, \`"dec": 5\` for open hats.

**REQUIRED JSON STRUCTURE EXAMPLE:**
\`\`\`json
{
  "bpm": 140,
  "sections": [
    {
      "name": "CHORUS",
      "ch1": [ 
        {"s": 0, "p": "C-5", "l": 2, "v": 15}, // Short
        {"s": 4, "p": "E-5", "l": 2, "v": 14}, // Short
        {"s": 8, "p": "G-5", "l": 8, "fx": "VIBRATO"} // Long resolve
        // GAP at step 16!
      ],
      "ch2": [ 
        {"s": 0, "p": "C-4", "l": 4, "fx": "ARPEGGIO", "a": "0,4,7"}, 
        {"s": 8, "p": "C-4", "l": 4, "fx": "ARPEGGIO", "a": "0,4,7"} 
        // Rythmic Chords with gaps
      ],
      "ch3": [ 
        {"s": 0, "p": "C-2", "l": 2}, 
        {"s": 3, "p": "C-3", "l": 1}, // Syncopated octave
        {"s": 8, "p": "G-1", "l": 4} 
      ],
      "ch4": [ 
        {"s": 0, "p": "C-2"}, {"s": 4, "p": "C-5", "v": 12}, 
        {"s": 7, "p": "C-5", "v": 6} 
      ]
    }
  ]
}
\`\`\`
`;

// --- MUSIC THEORY ENGINE ---

const THEORY_KIT = {
    SCALES: [
        { name: "C Minor (Dramatic)", root: "C", notes: ["C", "D", "D#", "F", "G", "G#", "A#"] },
        { name: "D Dorian (Groovy)", root: "D", notes: ["D", "E", "F", "G", "A", "B", "C"] },
        { name: "A Minor (Classic)", root: "A", notes: ["A", "B", "C", "D", "E", "F", "G"] },
        { name: "F Lydian (Dreamy)", root: "F", notes: ["F", "G", "A", "B", "C", "D", "E"] },
        { name: "E Phrygian (Dark)", root: "E", notes: ["E", "F", "G", "A", "B", "C", "D"] }
    ]
};

// --- PROMPT GENERATORS ---

export const generateTrackPrompt = (settings: CompositionSettings): string => {
    const scale = THEORY_KIT.SCALES[Math.floor(Math.random() * THEORY_KIT.SCALES.length)];
    
    // Map structure setting to instructions
    let structureInstr = "Structure: Verse -> Chorus -> Bridge -> Outro";
    if (settings.structure === 'LOOP_SHORT') structureInstr = "Structure: Create a single, perfectly looping 4-bar pattern (repetition is key).";
    if (settings.structure === 'LOOP_COMPLEX') structureInstr = "Structure: Create a complex 8-bar loop with A and B sections.";

    // Map tonality
    let tonalityInstr = "Key: Mix of Major/Minor";
    if (settings.tonality === 'MAJOR') tonalityInstr = "Key: MAJOR (Happy, Heroic, Bright). Use I-IV-V progressions.";
    if (settings.tonality === 'MINOR') tonalityInstr = "Key: MINOR (Sad, Serious, Dark). Focus on i-VI-VII progressions.";
    if (settings.tonality === 'MODAL_DARK') tonalityInstr = "Key: PHRYGIAN or LOCRIAN (Evil, Boss Battle, Tension).";
    
    return `TASK: COMPOSE A COMPLEX, RHYTHMIC 8-BIT TRACK.

    CONTEXT:
    - Genre: ${settings.genre}
    - Mood: ${settings.emotion}
    - Energy: ${settings.energy}
    - ${structureInstr}
    - ${tonalityInstr}
    - Grid: 64 Steps per section.

    INSTRUCTIONS:
    1. **Architect Phase:** Define the Chord Progression first based on the requested KEY.
    2. **Builder Phase:**
       - **Channel 1 (Lead):** PHRASING IS KEY. Use short notes AND long notes. Leave gaps.
       - **Channel 2 (Harmony):** Use "ARPEGGIO" stabs. Rhythmic chords.
       - **Channel 3 (Bass):** Funky, syncopated lines using octaves. Don't fill every step.
       - **Channel 4 (Drums):** Solid beat with ghost notes.
    
    CRITICAL: 
    - **NEGATIVE SPACE:** Do not fill the grid 100%. Let the music breathe.
    - **Use the 'l' (length) parameter.** Mix staccato (l:2) and legato (l:8).
    `;
};

export const generateClipPrompt = (prompt: string, channels: number[], length: number): string => {
    return `Create a musical phrase (Length: ${length} steps). 
    Prompt: ${prompt}. 
    Active Channels: ${channels.join(',')}. 
    
    RULES:
    - Mix short and long notes.
    - Leave gaps (silence).
    - If Channel 2 is active, use ARPEGGIO to make it a chord.
    - If Channel 3 is active, make it a groovy bassline.
    - Focus on syncopation (off-beat notes).`;
};
