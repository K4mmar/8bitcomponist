
import { useState, useCallback, useRef, useEffect } from 'react';
import { ProjectState, Note } from '../types';
import { audioEngine } from '../services/audioEngine';
import { rowToNote } from '../services/trackerUtils';

type PlaybackMode = 'PATTERN' | 'SONG';

type PlaybackTarget = 
  | { type: 'SONG', startArrIdx: number }
  | { type: 'PATTERN' }
  | { type: 'SELECTION', range: { startStep: number, endStep: number } };

export function usePlayback(projectState: ProjectState, channelConfigs: any) {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('SONG');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentArrIdx, setCurrentArrIdx] = useState(0);
  const [isLooping, setIsLooping] = useState(false); // Default to FALSE per request
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [playbackTarget, setPlaybackTarget] = useState<PlaybackTarget | null>(null);

  const playbackRef = useRef<number | null>(null);
  const lastScheduledEndTimeRef = useRef<number>(0);

  const stateRef = useRef({ ...projectState, isPlaying, isLooping, currentArrIdx, playbackMode });
  useEffect(() => {
    stateRef.current = { ...projectState, isPlaying, isLooping, currentArrIdx, playbackMode };
  }, [projectState, isPlaying, isLooping, currentArrIdx, playbackMode]);
  
  const targetRef = useRef(playbackTarget);
  useEffect(() => { targetRef.current = playbackTarget }, [playbackTarget]);

  // Sync Mixer State to AudioEngine on every change
  useEffect(() => {
      audioEngine.setMixerState(channelConfigs);
  }, [channelConfigs]);

  const stop = useCallback(() => {
    audioEngine.stopAll();
    setIsPlaying(false);
    if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    playbackRef.current = null;
    lastScheduledEndTimeRef.current = 0;
    setCurrentStep(0);
    setCurrentArrIdx(0); // Reset position on full stop
    setPlaybackTarget(null);
  }, []);

  const pause = useCallback(() => {
    audioEngine.stopAll();
    setIsPlaying(false);
    if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    playbackRef.current = null;
    lastScheduledEndTimeRef.current = 0;
    // Do NOT reset currentArrIdx or CurrentStep
  }, []);
  
  const executePlayback = useCallback((target: PlaybackTarget, targetStartTime?: number) => {
    const state = stateRef.current;
    let playbackList: string[] = [];
    let range: { startStep: number, endStep: number } | null = null;
    let startArrIdx = 0;

    switch (target.type) {
        case 'SONG':
            playbackList = state.arrangement.slice(target.startArrIdx);
            startArrIdx = target.startArrIdx;
            break;
        case 'PATTERN':
            if (!state.activePatternId) { stop(); return; }
            playbackList = [state.activePatternId];
            break;
        case 'SELECTION':
            if (!state.activePatternId) { stop(); return; }
            playbackList = [state.activePatternId];
            range = target.range;
            break;
    }
    
    if (playbackList.length === 0) { stop(); return; }

    audioEngine.resume();
    // Re-apply mixer state on resume to be sure
    audioEngine.setMixerState(channelConfigs);
    
    if (!analyser) setAnalyser(audioEngine.getAnalyser());
    setIsPlaying(true);
    
    const stepDur = (60 / state.bpm) / 4;
    const allNotes: Note[] = [];
    let logicalDuration = 0;

    playbackList.forEach((pId) => {
        const p = state.patterns.find(pat => pat.id === pId);
        if (p) {
            const startStep = range ? range.startStep : 0;
            const endStep = range ? range.endStep : 63;
            
            for (let ch = 1; ch <= 4; ch++) {
                const channelRows = p.channels[ch as 1|2|3|4] || [];
                // Sorteer rijen om zeker te zijn van de volgorde voor duur-berekening
                const sortedRows = [...channelRows].sort((a, b) => a.step - b.step);

                sortedRows.forEach((row, index) => {
                    // Alleen verwerken als de rij binnen het afspeelbereik valt
                    if (row.step >= startStep && row.step <= endStep) {
                        
                        // Bepaal de duur door te kijken naar de volgende noot in de lijst
                        const nextRow = sortedRows[index + 1];
                        let durationSteps;

                        if (nextRow) {
                            durationSteps = nextRow.step - row.step;
                        } else {
                            // Geen volgende noot in dit patroon? Speel door tot het einde van het patroon (64 steps)
                            durationSteps = 64 - row.step;
                        }

                        const noteTime = logicalDuration + ((row.step - startStep) * stepDur);
                        
                        const note = rowToNote(row, ch, noteTime, durationSteps * stepDur, channelConfigs);
                        
                        if (note) allNotes.push(note);
                    }
                });
            }
            logicalDuration += (endStep - startStep + 1) * stepDur;
        }
    });

    const { startTime, endTime } = audioEngine.playTrack(allNotes, logicalDuration, targetStartTime);
    lastScheduledEndTimeRef.current = endTime;

    const updateVisuals = () => {
        if (!stateRef.current.isPlaying) return;
        const now = audioEngine.ctx!.currentTime;

        if (now >= lastScheduledEndTimeRef.current - 0.05) {
            if (stateRef.current.isLooping) {
                const currentTarget = targetRef.current;
                if (currentTarget) {
                    let nextTarget = currentTarget;
                    if (currentTarget.type === 'SONG') {
                        // Song loops always restart from the beginning of the arrangement.
                        nextTarget = { type: 'SONG', startArrIdx: 0 };
                    }
                    executePlayback(nextTarget, lastScheduledEndTimeRef.current);
                } else {
                    stop();
                }
            } else {
                stop();
            }
            return;
        }

        const elapsed = Math.max(0, now - startTime);
        const step = elapsed / stepDur;

        switch (target.type) {
            case 'SONG': {
                const globalStep = (startArrIdx * 64) + step;
                setCurrentArrIdx(Math.floor(globalStep / 64));
                setCurrentStep(globalStep % 64);
                break;
            }
            case 'PATTERN': {
                setCurrentStep(step % 64);
                break;
            }
            case 'SELECTION': {
                setCurrentStep(target.range.startStep + step);
                break;
            }
        }
        
        playbackRef.current = requestAnimationFrame(updateVisuals);
    };

    if (playbackRef.current) cancelAnimationFrame(playbackRef.current);
    playbackRef.current = requestAnimationFrame(updateVisuals);

  }, [channelConfigs, stop, analyser]);

  const play = useCallback(() => {
    const { playbackMode, currentArrIdx, arrangement } = stateRef.current;
    
    // Smart Fallback: If in SONG mode but arrangement is empty, play PATTERN
    let effectiveMode = playbackMode;
    if (playbackMode === 'SONG' && arrangement.length === 0) {
        effectiveMode = 'PATTERN';
        // Also update state so UI reflects it
        setPlaybackMode('PATTERN'); 
    }

    const target: PlaybackTarget = effectiveMode === 'SONG' 
      ? { type: 'SONG', startArrIdx: currentArrIdx }
      : { type: 'PATTERN' };
      
    setPlaybackTarget(target);
    executePlayback(target);
  }, [executePlayback]);

  const playSelection = useCallback((range: { startStep: number, endStep: number }) => {
    setPlaybackMode('PATTERN');
    const target: PlaybackTarget = { type: 'SELECTION', range };
    setPlaybackTarget(target);
    executePlayback(target);
  }, [executePlayback]);

  return {
    playbackMode, setPlaybackMode,
    isPlaying,
    currentStep,
    currentArrIdx, setCurrentArrIdx,
    isLooping, toggleLoop: () => setIsLooping(l => !l),
    analyser,
    play,
    playSelection,
    stop,
    pause // New export
  };
}
