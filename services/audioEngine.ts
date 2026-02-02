
import { Note } from '../types';

class AudioEngine {
  public ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  
  // Channel Busses
  private channelNodes: { gain: GainNode, analyser: AnalyserNode }[] = [];
  
  private dutyWaves: Record<number, PeriodicWave> = {};
  private activeNodes: (OscillatorNode | AudioBufferSourceNode | GainNode | StereoPannerNode)[] = [];

  private init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.analyser = this.ctx.createAnalyser();
    this.delayNode = this.ctx.createDelay();
    this.delayGain = this.ctx.createGain();

    this.analyser.fftSize = 256;
    this.masterGain.gain.value = 0.5;

    // Compressor Settings
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.002;
    this.compressor.release.value = 0.05;

    this.delayNode.delayTime.value = 0.12; 
    this.delayGain.gain.value = 0.15; 

    // Connect Master
    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Delay Loop
    this.masterGain.connect(this.delayNode);
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.compressor); 
    
    // Create Channel Busses (1-4)
    this.channelNodes = [];
    for(let i=0; i<4; i++) {
        const chGain = this.ctx.createGain();
        const chAnalyser = this.ctx.createAnalyser();
        chAnalyser.fftSize = 256; // Fast enough for scopes
        
        // Chain: ChannelGain -> ChannelAnalyser -> MasterGain
        chGain.connect(chAnalyser);
        chAnalyser.connect(this.masterGain);
        
        this.channelNodes.push({ gain: chGain, analyser: chAnalyser });
    }

    // Pre-calculate pulse waves
    this.dutyWaves[0.125] = this.createPulseWave(0.125);
    this.dutyWaves[0.25] = this.createPulseWave(0.25);
    this.dutyWaves[0.5] = this.createPulseWave(0.5);
  }

  getAnalyser(): AnalyserNode | null {
    this.init();
    return this.analyser;
  }

  // New method for Mixer Visuals
  getChannelAnalysers(): AnalyserNode[] {
      this.init();
      return this.channelNodes.map(n => n.analyser);
  }

  // Update Mixer State (Volume, Mute, Solo)
  setMixerState(configs: Record<number, { mute: boolean, volume: number, solo?: boolean }>) {
      if (!this.ctx || this.channelNodes.length === 0) return;
      
      const anySolo = Object.values(configs).some(c => c.solo);

      for (let i = 0; i < 4; i++) {
          const chNum = i + 1;
          const config = configs[chNum];
          const node = this.channelNodes[i];
          
          if (!config || !node) continue;

          // Logic:
          // 1. If ANY channel is soloed, mute all non-soloed channels.
          // 2. If NO channel is soloed, check individual mute state.
          let targetGain = config.volume; // Default to fader volume (0.0 - 1.0)

          if (anySolo) {
              if (!config.solo) targetGain = 0;
          } else {
              if (config.mute) targetGain = 0;
          }

          // Smooth transition to prevent clicks
          const now = this.ctx.currentTime;
          node.gain.gain.cancelScheduledValues(now);
          node.gain.gain.setTargetAtTime(targetGain, now, 0.02);
      }
  }

  private createPulseWave(duty: number): PeriodicWave {
    const terms = 64; 
    const real = new Float32Array(terms);
    const imag = new Float32Array(terms);
    for (let n = 1; n < terms; n++) {
      imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    }
    return this.ctx!.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private createWaveRAMBuffer(type: string) {
    if (!this.ctx) return null;
    const bufferSize = 32;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const SCALING = 0.8; 

    for (let i = 0; i < bufferSize; i++) {
      let val = 0;
      if (type === 'TRIANGLE') {
        val = i < 16 ? i : (31 - i);
        val = (val / 15) * 2 - 1;
      } else if (type === 'SAW') {
        val = i / 31;
        val = val * 2 - 1;
      } else if (type === 'SINE') {
        val = Math.sin((i / 31) * Math.PI * 2);
      } else {
        val = i < 16 ? 1 : -1;
      }
      const quantized = Math.round((val + 1) * 7.5) / 7.5 - 1;
      data[i] = quantized * SCALING;
    }
    return buffer;
  }

  private createNoiseBuffer(isMetallic: boolean) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 1.0; 
    const buffer = this.ctx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    const HIGH_VAL = 0.5;
    const LOW_VAL = -0.5;

    let register = 0x7FFF; 
    for (let i = 0; i < data.length; i++) {
      const bit = (register ^ (register >> 1)) & 1;
      register = (register >> 1) | (bit << 14);
      if (isMetallic) { 
        register = (register & ~(1 << 6)) | (bit << 6);
      }
      data[i] = (register & 1) ? HIGH_VAL : LOW_VAL;
    }
    return buffer;
  }

  private applyHardwareEnvelope(gainNode: GainNode, targetVol: number, decaySetting: number, startTime: number, duration: number, isNoise: boolean) {
    if (!this.ctx) return;
    const maxVol = (targetVol / 15); 
    const attackTime = isNoise ? 0 : 0.003;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(maxVol, startTime + attackTime);
    
    if (decaySetting === 0) {
        gainNode.gain.setValueAtTime(maxVol, startTime + duration - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    } else {
        const decayFactor = 16 - decaySetting; 
        const timeConstant = isNoise ? 0.015 : 0.04;
        const decayDuration = decayFactor * timeConstant; 
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + attackTime + decayDuration);
    }
  }

  playNote(note: Note, scheduledStartTime: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const startTime = scheduledStartTime;
    const chIndex = note.channel - 1;
    
    // Safety check for channel existence
    if (!this.channelNodes[chIndex]) return;

    // 1. Panning & Gain
    let panVal = note.panning ?? (note.channel === 1 ? -0.2 : (note.channel === 2 ? 0.2 : 0));
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = panVal;
    
    // IMPORTANT: Connect Panner to Channel Bus Gain instead of Master
    panner.connect(this.channelNodes[chIndex].gain);

    const gainNode = this.ctx.createGain();
    gainNode.connect(panner);

    // 2. Source Generation
    let sourceNode: OscillatorNode | AudioBufferSourceNode;
    let tuningParam: AudioParam;
    let isBufferSource = false;
    let baseFreqForBuffer = 1;
    let isNoise = false;

    if (note.channel === 4) {
      isNoise = true;
      const isMetallic = note.dutyCycle === 0.125;
      const buffer = this.createNoiseBuffer(isMetallic);
      if (!buffer) return;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      sourceNode = noise;
      tuningParam = noise.playbackRate;
      isBufferSource = true;
      baseFreqForBuffer = 500; 

    } else if (note.channel === 3) {
      const type = note.dutyCycle === 0.25 ? 'SAW' : (note.dutyCycle === 0.5 ? 'SQUARE' : 'TRIANGLE');
      const buffer = this.createWaveRAMBuffer(type);
      if (!buffer) return;

      const waveSource = this.ctx.createBufferSource();
      waveSource.buffer = buffer;
      waveSource.loop = true;
      sourceNode = waveSource;
      tuningParam = waveSource.playbackRate;
      isBufferSource = true;
      baseFreqForBuffer = this.ctx.sampleRate / 32;

    } else {
      const osc = this.ctx.createOscillator();
      
      // SAFEGUARD: Ensure duty cycle is one of the pre-calculated ones
      const requestedDuty = note.dutyCycle || 0.5;
      const wave = this.dutyWaves[requestedDuty];
      
      if (wave) {
          osc.setPeriodicWave(wave);
      } else {
          // Fallback if specific wave not found (e.g. invalid duty)
          const fallbackWave = this.dutyWaves[0.5];
          if (fallbackWave) {
              osc.setPeriodicWave(fallbackWave);
          } else {
              osc.type = 'square'; // Last resort
          }
      }
      
      sourceNode = osc;
      tuningParam = osc.frequency;
      isBufferSource = false;
    }

    // 3. Tuning
    const getTunedValue = (freq: number) => isBufferSource ? freq / baseFreqForBuffer : freq;
    tuningParam.setValueAtTime(getTunedValue(note.frequency), startTime);

    if (note.vibrato) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 6;
      const depth = isBufferSource ? (note.vibrato * 3) / baseFreqForBuffer : note.vibrato * 3;
      lfoGain.gain.value = depth;
      lfo.connect(lfoGain);
      lfoGain.connect(tuningParam);
      lfo.start(startTime);
      lfo.stop(startTime + note.duration);
      this.activeNodes.push(lfo, lfoGain);
    }

    if (note.arpeggio && note.arpeggio.length > 0) {
      const arpSpeed = 0.03; 
      const steps = Math.ceil(note.duration / arpSpeed);
      for(let i=0; i<steps; i++) {
          const interval = note.arpeggio[i % note.arpeggio.length];
          const arpFreq = note.frequency * Math.pow(2, interval / 12);
          tuningParam.setValueAtTime(getTunedValue(arpFreq), startTime + (i * arpSpeed));
      }
    }

    if (note.slide) {
      tuningParam.exponentialRampToValueAtTime(getTunedValue(note.slide), startTime + note.duration);
    }

    // 4. Envelope
    this.applyHardwareEnvelope(gainNode, note.volume * 15, note.decay || 0, startTime, note.duration, isNoise);

    sourceNode.connect(gainNode);
    sourceNode.start(startTime);
    sourceNode.stop(startTime + note.duration + 0.1);
    
    this.activeNodes.push(sourceNode, gainNode, panner);
  }

  playTrack(notes: Note[], logicalDuration: number, targetStartTime?: number): { startTime: number, endTime: number } {
    this.init();
    if (!this.ctx) return { startTime: 0, endTime: 0 };
    if (!targetStartTime) this.stopAllActiveNodes();
    
    const scheduleStartTime = targetStartTime || (this.ctx.currentTime + 0.05);
    
    notes.forEach(note => this.playNote(note, scheduleStartTime + note.time));
    return { startTime: scheduleStartTime, endTime: scheduleStartTime + logicalDuration };
  }

  private stopAllActiveNodes() {
    const now = this.ctx?.currentTime || 0;
    this.activeNodes.forEach(node => { 
        try { 
            if (node instanceof GainNode) {
                node.gain.cancelScheduledValues(now);
                node.gain.setTargetAtTime(0, now, 0.01);
                setTimeout(() => { try { node.disconnect(); } catch(e) {} }, 50);
            } else if (node instanceof StereoPannerNode) {
                setTimeout(() => { try { node.disconnect(); } catch(e) {} }, 50);
            } else {
                (node as any).stop(now + 0.02); 
                setTimeout(() => { try { node.disconnect(); } catch(e) {} }, 50);
            }
        } catch(e) {} 
    });
    this.activeNodes = [];
  }

  stopAll() {
    this.stopAllActiveNodes();
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }
}

export const audioEngine = new AudioEngine();
