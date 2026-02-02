
import { TrackerRow } from "../types";
import { normalizePitch } from "./trackerUtils";

// Helper for ID generation - Simple alphanumeric only
const generateId = () => Math.random().toString(36).substr(2, 9);

// NEW COMPACT INTERFACE
export interface CompactNoteAI {
    s: number;        // step (0-63)
    p: string;        // Pitch
    l?: number;       // Length (steps)
    v?: number;       // Volume
    d?: string;       // Duty/Type
    dec?: number;     // Decay (0-15)
    fx?: string;      // Effect
    a?: string;       // Arp Intervals
    sl?: string;      // Slide Target
}

/**
 * DE BESCHERMLAAG (PROTECTION LAYER) V3.3
 * Optimized for Compact Grid Format (Step-based) with fallback for verbose keys
 * Now supports advanced params: decay, slide target
 * FIX: Enhanced lookahead to ignore empty notes when calculating cutoff
 */
export const translateMusicalToTracker = (notes: any[], channel: 1|2|3|4): TrackerRow[] => {
    console.log(`[Protection] Translating Channel ${channel}... Input items:`, notes?.length);
    
    const rows: TrackerRow[] = [];
    const occupiedSteps = new Set<number>();

    // 1. Veiligheid: Als notes undefined is, return lege array
    if (!Array.isArray(notes)) {
        console.warn(`[Protection] Channel ${channel} received non-array input:`, notes);
        return [];
    }

    // 2. Sorteer input op stap (Defensive check for 's' vs 'step')
    const sortedNotes = [...notes].sort((a, b) => ((a.s ?? a.step) || 0) - ((b.s ?? b.step) || 0));

    sortedNotes.forEach(n => {
        // A. Validatie: Stap moet 0-63 zijn
        const step = Math.floor((n.s ?? n.step) ?? -1);
        
        if (step < 0 || step > 63) return;

        // B. Pitch Normalisatie
        const rawPitch = n.p ?? n.pitch;
        let safePitch = normalizePitch(rawPitch);
        
        if (!safePitch || safePitch === '---') return; 

        // C. Instrument Defaults
        let instrument = "LEAD";
        if (channel === 4) instrument = "KICK"; 
        if (channel === 3) instrument = "SUB";

        // FALLBACKS for other properties
        const vol = (n.v ?? n.volume) ?? 12;
        const duty = (n.d ?? n.duty) || "0.5";
        const effect = (n.fx ?? n.effect) || "NONE";
        
        // Advanced Params
        const decay = (n.dec ?? n.decay) ?? 0;
        const arpNotes = (n.a ?? n.arpNotes) || undefined;
        let slideTarget = (n.sl ?? n.slide) || undefined;

        // Slide cleanup
        if (effect === 'SLIDE' && slideTarget) {
            slideTarget = normalizePitch(slideTarget);
        }

        // D. Noot Toevoegen
        rows.push({
            id: generateId(),
            step: step,
            pitch: safePitch,
            instrument: instrument as any,
            volume: Math.min(15, Math.max(0, vol)),
            dutyCycle: duty as any,
            effect: effect as any,
            arpNotes: arpNotes,
            decay: Math.min(15, Math.max(0, decay)),
            slide: slideTarget,
            panning: 0,
        });
        occupiedSteps.add(step);

        // E. Duur Verwerking (Auto-Cutoff)
        const lenVal = n.l ?? n.length;
        const length = Math.max(1, Math.floor(lenVal ?? 1)); 
        const stopStep = step + length;

        if (stopStep < 64 && !occupiedSteps.has(stopStep)) {
            // Check of er al een NIEUWE noot start op de stop-tijd
            // FIX: We moeten zeker weten dat die 'andere noot' ook echt een GELDIGE noot is (geen '---')
            const noteStartsAtStop = sortedNotes.some(other => {
                const s = Math.floor((other.s ?? other.step));
                if (s !== stopStep) return false;
                
                // Valideer de pitch van de toekomstige noot
                const p = normalizePitch(other.p ?? other.pitch);
                return p !== '---'; // Als het '---' is, telt het niet als onderbreking -> dus wij moeten OFF plaatsen
            });

            if (!noteStartsAtStop) {
                rows.push({
                    id: generateId(),
                    step: stopStep,
                    pitch: "OFF",
                    instrument: "---",
                    volume: 0,
                    dutyCycle: "0.5"
                });
                occupiedSteps.add(stopStep);
            }
        }
    });

    console.log(`[Protection] Channel ${channel} Result: ${rows.length} rows generated.`);
    return rows.sort((a, b) => a.step - b.step);
};
