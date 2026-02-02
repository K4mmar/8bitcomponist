
import { useRef, useEffect, useCallback } from 'react';

// --- BOOT SOUND SYNTHESIS (Authentic GB "Bling") ---
const playBootSound = (ctx: AudioContext) => {
    try {
        const t = ctx.currentTime;
        
        // Voice 1: Main Root (Slide Up)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(1046.5, t); 
        osc1.frequency.exponentialRampToValueAtTime(2093.0, t + 0.1); 
        
        gain1.gain.setValueAtTime(0.1, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.8);

        // Voice 2: Harmony (Major 3rd above, Slide Up)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(1318.5, t);
        osc2.frequency.exponentialRampToValueAtTime(2637.0, t + 0.1);
        
        gain2.gain.setValueAtTime(0.1, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.8);

    } catch (e) {
        console.error("Boot sound failed", e);
    }
};

export const useStartMenuAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  const isMusicPlayingRef = useRef(false);

  // Initialize Audio Context (Silent unlock)
  const initAudio = useCallback(async () => {
      try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;

          await ctx.resume();
          
          // Play silent burst to guarantee engine is awake
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.001; 
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(0.01);
          
          return ctx;
      } catch(e) { 
          console.error("Audio unlock failed", e); 
          return null;
      }
  }, []);

  const triggerBootSound = useCallback(() => {
      if (audioCtxRef.current) {
          playBootSound(audioCtxRef.current);
      }
  }, []);

  // --- MENU MUSIC SEQUENCER ---
  const startMenuMusic = useCallback(() => {
      if (isMusicPlayingRef.current || !audioCtxRef.current) return;
      
      const ctx = audioCtxRef.current;
      isMusicPlayingRef.current = true;
      
      let step = 0;
      const bpm = 110;
      const stepTime = 60 / bpm / 4; // 16th notes
      const sequenceLength = 32;
      
      const playStep = () => {
          if (!isMusicPlayingRef.current) return;
          const t = ctx.currentTime;
          const s = step % sequenceLength;

          // Bass Line (Cmaj7 -> Fmaj7)
          if (s % 4 === 0) { 
              const oscBass = ctx.createOscillator();
              const gainBass = ctx.createGain();
              oscBass.type = 'triangle';
              
              let freq = 130.81; // C3
              if (s >= 16) freq = 174.61; // F3
              
              oscBass.frequency.setValueAtTime(freq, t);
              gainBass.gain.setValueAtTime(0.05, t);
              gainBass.gain.linearRampToValueAtTime(0, t + 0.3);
              
              oscBass.connect(gainBass);
              gainBass.connect(ctx.destination);
              oscBass.start(t);
              oscBass.stop(t + 0.3);
          }

          // Arpeggio Melody
          const oscMelody = ctx.createOscillator();
          const gainMelody = ctx.createGain();
          oscMelody.type = 'square';
          
          let note = 0;
          const arpBase = s >= 16 ? 349.23 : 261.63; // F4 or C4 base
          const intervals = [1, 1.25, 1.5, 2]; 
          const intervalIdx = s % 4;
          
          if (s % 2 === 0) { 
              note = arpBase * intervals[intervalIdx];
              if (s === 30) note = 523.25; // High C variation

              oscMelody.frequency.setValueAtTime(note, t);
              gainMelody.gain.setValueAtTime(0.02, t); 
              gainMelody.gain.exponentialRampToValueAtTime(0.001, t + 0.1); 

              oscMelody.connect(gainMelody);
              gainMelody.connect(ctx.destination);
              oscMelody.start(t);
              oscMelody.stop(t + 0.15);
          }

          step++;
      };

      musicIntervalRef.current = window.setInterval(playStep, stepTime * 1000);
  }, []);

  const stopMenuMusic = useCallback(() => {
      isMusicPlayingRef.current = false;
      if (musicIntervalRef.current) {
          clearInterval(musicIntervalRef.current);
          musicIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
      }
  }, []);

  // Auto cleanup
  useEffect(() => {
      return () => stopMenuMusic();
  }, [stopMenuMusic]);

  return {
      initAudio,
      triggerBootSound,
      startMenuMusic,
      stopMenuMusic
  };
};
