
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Pattern, TrackerRow, CompositionSettings, PatternClip } from "../types";
import { normalizePitch } from "./trackerUtils";
import { SYSTEM_INSTRUCTION, FULL_TRACK_SCHEMA, CLIP_SCHEMA, generateTrackPrompt, generateClipPrompt } from "./aiInstructions";
import { translateMusicalToTracker } from "./protectionLayer";

// Helper for unique IDs locally needed for container objects
const generateId = () => Math.random().toString(36).substr(2, 9);

// Robust JSON parser that handles Markdown code blocks and mixed text
const parseAIResponse = (text: string) => {
    try {
        // Find JSON between code blocks if present (Standard Markdown)
        const jsonMatch = text.match(/```json([\s\S]*?)```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }
        
        // Fallback: Try to find the first '{' and last '}' if no markdown tags
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            const potentialJson = text.substring(firstBrace, lastBrace + 1);
            return JSON.parse(potentialJson);
        }

        // Last resort: try parsing the whole text
        return JSON.parse(text);
    } catch (e) {
        console.error("RAW AI RESPONSE FAILED PARSING. Text length:", text.length);
        throw new Error("AI produced invalid JSON format.");
    }
};

// Helper: Double a 32-step loop to 64 steps (optional, but good for tracker format)
const processLoop = (notes: any[]) => {
    if (!Array.isArray(notes)) return [];
    // Ensure notes are within 0-63 range
    return notes.filter(n => ((n.s ?? n.step) || 0) < 64);
};

export async function generateAIPatterns(
    settings: CompositionSettings, 
    signal?: AbortSignal,
    onStreamUpdate?: (text: string) => void
): Promise<{patterns: Pattern[], arrangement: string[], bpm: number}> {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    console.log("Requesting AI Composition (Flash 2.0 Model):", settings);
    
    // CHANGED: Reverted to gemini-2.0-flash per user request
    const responseStream = await ai.models.generateContentStream({
        model: "gemini-2.0-flash", 
        contents: generateTrackPrompt(settings),
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            // We do NOT enforce JSON mode here strictly because we want the text analysis first.
            // But we do hint the schema.
            responseMimeType: "text/plain", 
        },
    });

    let fullText = "";

    for await (const chunk of responseStream) {
        if (signal?.aborted) {
            throw new Error("Aborted by user");
        }
        const chunkText = chunk.text || "";
        fullText += chunkText;
        
        // Pass updates to UI so user sees the "Thinking..." or "Architect" phase
        if (onStreamUpdate) {
            onStreamUpdate(fullText);
        }
    }

    console.log("=== AI FULL RESPONSE ===", fullText);

    const data = parseAIResponse(fullText);
    console.log("=== AI PARSED JSON ===", data);
    
    if (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0) {
        throw new Error("AI response did not contain sections.");
    }

    const generatedPatterns: Pattern[] = [];
    const sectionIdMap: Record<string, string> = {};

    // 1. Process All Sections (Verse, Chorus, Bridge, Outro)
    data.sections.forEach((aiSection: any, index: number) => {
        const name = (aiSection.name || `SECTION ${index + 1}`).toUpperCase().substring(0, 15).replace(/[^A-Z0-9 ]/g, "");
        const id = `pat-${name.toLowerCase().replace(/\s/g, '-')}-${generateId()}`;
        
        const pattern: Pattern = {
            id: id,
            name: name,
            channels: {
                1: translateMusicalToTracker(processLoop(aiSection.ch1 || []), 1),
                2: translateMusicalToTracker(processLoop(aiSection.ch2 || []), 2),
                3: translateMusicalToTracker(processLoop(aiSection.ch3 || []), 3),
                4: translateMusicalToTracker(processLoop(aiSection.ch4 || []), 4)
            }
        };
        
        generatedPatterns.push(pattern);
        sectionIdMap[name] = id;
        
        // Fallback mapping if names vary
        if (index === 0) sectionIdMap['VERSE'] = id;
        if (index === 1) sectionIdMap['CHORUS'] = id;
        if (index === 2) sectionIdMap['BRIDGE'] = id;
        if (index === 3) sectionIdMap['OUTRO'] = id;
    });

    // 2. Generate Intro (Verse stripped of Drums/Lead)
    const versePattern = generatedPatterns[0];
    const introPatternId = `pat-intro-${generateId()}`;
    const introPattern: Pattern = {
        id: introPatternId,
        name: "INTRO",
        channels: {
            1: [], // No Lead
            2: versePattern.channels[2], // Keep Arp
            3: versePattern.channels[3], // Keep Bass
            4: [] // No Drums
        }
    };
    generatedPatterns.unshift(introPattern);

    // 3. Construct Arrangement
    // Structure: Intro -> Verse -> Chorus -> Verse -> Bridge -> Chorus -> Outro
    const verseId = sectionIdMap['VERSE'] || generatedPatterns[1].id;
    const chorusId = sectionIdMap['CHORUS'] || (generatedPatterns.length > 2 ? generatedPatterns[2].id : verseId);
    const bridgeId = sectionIdMap['BRIDGE'] || (generatedPatterns.length > 3 ? generatedPatterns[3].id : chorusId);
    const outroId = sectionIdMap['OUTRO'] || (generatedPatterns.length > 4 ? generatedPatterns[4].id : chorusId);

    const arrangement = [
        introPatternId,
        verseId,
        chorusId,
        verseId,
        bridgeId,
        chorusId,
        chorusId, // Double Chorus for energy
        outroId   // Final
    ];

    return { 
        patterns: generatedPatterns, 
        arrangement, 
        bpm: Math.min(240, Math.max(60, data.bpm || 140))
    };
  } catch (error: any) {
      if (error.message.includes("Aborted")) throw error;
      console.error("Gemini Generation Error:", error);
      throw new Error("AI Composer Failed: " + error.message);
  }
}

export async function generateCustomClips(prompt: string, channels: number[], length: number): Promise<PatternClip[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", // Reverted to 2.0-flash
            contents: generateClipPrompt(prompt, channels, length),
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: CLIP_SCHEMA
            }
        });

        const rawText = response.text || "[]";
        console.log("=== CLIP RAW RESPONSE ===", rawText);
        const data = parseAIResponse(rawText);
        
        return data.map((c: any) => {
            return {
                id: generateId(),
                name: (c.name || "AI CLIP").replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase().substring(0, 12),
                category: 'AI',
                channels: {
                    1: translateMusicalToTracker(c.ch1 || [], 1),
                    2: translateMusicalToTracker(c.ch2 || [], 2),
                    3: translateMusicalToTracker(c.ch3 || [], 3),
                    4: translateMusicalToTracker(c.ch4 || [], 4)
                }
            };
        });
    } catch (error: any) {
        console.error("Clip Error:", error);
        throw error;
    }
}

export async function suggestBassline(melodyRows: TrackerRow[]): Promise<Partial<TrackerRow>[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash", // Reverted to 2.0-flash
            contents: `Create a bassline (Channel 3) for this melody. 
            Melody: ${JSON.stringify(melodyRows.map(r => ({s: r.step, p: r.pitch})))}.
            Return compact notes: {s, p, v}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            s: { type: Type.NUMBER },
                            p: { type: Type.STRING },
                            v: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });
        
        const raw = parseAIResponse(response.text || "[]");
        return raw.map((r: any) => ({
            id: generateId(),
            step: Math.min(63, Math.max(0, (r.s ?? r.step) || 0)),
            pitch: normalizePitch(r.p ?? r.pitch),
            instrument: "SUB",
            volume: (r.v ?? r.volume) ?? 14,
            dutyCycle: "0.5"
        }));
    } catch (error: any) {
        console.error("Bass Error:", error);
        throw error;
    }
}
