/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VstSettings } from "./types";

/**
 * Creates an artificial impulse response buffer to simulate classic studio reverb offline
 * without requiring any external file downloads.
 */
export function createReverbImpulseResponse(ctx: BaseAudioContext, duration = 1.5, decay = 2.0): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  
  for (let i = 0; i < length; i++) {
    // Generate exponential white noise decay
    const percent = i / length;
    const factor = Math.exp(-percent * decay);
    
    left[i] = (Math.random() * 2 - 1) * factor;
    right[i] = (Math.random() * 2 - 1) * factor;
  }
  
  return impulse;
}

/**
 * Generates an asymmetric warm tube distortion curve for dynamic harmonic saturation.
 */
export function makeWarmTubeCurve(amount: number): Float32Array {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const k = amount / 100; // Map 0-100 to 0-1
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Sigmoidal saturation with mild asymmetry to mimic classic triode valves
    const clean = x;
    const distorted = Math.tanh(x * (1 + k * 1.5));
    curve[i] = clean * (1 - k * 0.4) + distorted * (k * 0.4);
  }
  return curve;
}

export class StudioAudioEngine {
  public ctx: AudioContext | null = null;
  public sourceNode: MediaElementAudioSourceNode | AudioBufferSourceNode | null = null;
  
  // VST Node Pipeline
  public preampGain: GainNode | null = null;
  public eqLow: BiquadFilterNode | null = null;
  public eqMid: BiquadFilterNode | null = null;
  public eqHigh: BiquadFilterNode | null = null;
  public notchFilter: BiquadFilterNode | null = null;
  public notchFilter2: BiquadFilterNode | null = null;
  public notchFilter3: BiquadFilterNode | null = null;
  public notchFilter4: BiquadFilterNode | null = null;
  public delayNode: DelayNode | null = null;
  public delayFeedback: GainNode | null = null;
  public delayWet: GainNode | null = null;
  
  public reverbConvolver: ConvolverNode | null = null;
  public reverbWet: GainNode | null = null;
  
  public dryRoute: GainNode | null = null;
  public masterGain: GainNode | null = null;
  
  // Master Suite Nodes
  public masterSaturation: WaveShaperNode | null = null;
  public masterCompressor: DynamicsCompressorNode | null = null;
  
  // Mid/Side Stereo Matrix Nodes
  public msSplitter: ChannelSplitterNode | null = null;
  public msMerger: ChannelMergerNode | null = null;
  public msLToMid: GainNode | null = null;
  public msRToMid: GainNode | null = null;
  public msLToSide: GainNode | null = null;
  public msRToSide: GainNode | null = null;
  public msMidBus: GainNode | null = null;
  public msSideBus: GainNode | null = null;
  public msMidToL: GainNode | null = null;
  public msMidToR: GainNode | null = null;
  public msSideToL: GainNode | null = null;
  public msSideToR: GainNode | null = null;

  public masterLimiterDrive: GainNode | null = null;
  public masterLimiter: DynamicsCompressorNode | null = null;

  public analyser: AnalyserNode | null = null;

  constructor() {
    // Lazy loaded initialization
  }

  public init(audioElement: HTMLAudioElement) {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (err) {
        console.warn("AudioContext close error:", err);
      }
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    // Create Nodes
    this.sourceNode = this.ctx.createMediaElementSource(audioElement);
    this.preampGain = this.ctx.createGain();
    
    // 3-band Paragraphic EQ
    this.eqLow = this.ctx.createBiquadFilter();
    this.eqLow.type = "lowshelf";
    this.eqLow.frequency.value = 250; // Bass

    this.eqMid = this.ctx.createBiquadFilter();
    this.eqMid.type = "peaking";
    this.eqMid.Q.value = 1.0;
    this.eqMid.frequency.value = 1000; // Mids
    
    this.eqHigh = this.ctx.createBiquadFilter();
    this.eqHigh.type = "highshelf";
    this.eqHigh.frequency.value = 4000; // Treble

    // Notch Filter for watermark voice tags / high pitches
    this.notchFilter = this.ctx.createBiquadFilter();
    this.notchFilter.type = "notch";
    this.notchFilter.frequency.value = 1000;
    this.notchFilter.Q.value = 10.0;

    this.notchFilter2 = this.ctx.createBiquadFilter();
    this.notchFilter2.type = "notch";
    this.notchFilter2.frequency.value = 20;
    this.notchFilter2.Q.value = 0.001;

    this.notchFilter3 = this.ctx.createBiquadFilter();
    this.notchFilter3.type = "notch";
    this.notchFilter3.frequency.value = 20;
    this.notchFilter3.Q.value = 0.001;

    this.notchFilter4 = this.ctx.createBiquadFilter();
    this.notchFilter4.type = "notch";
    this.notchFilter4.frequency.value = 20;
    this.notchFilter4.Q.value = 0.001;

    // Echo / Delay System
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayFeedback = this.ctx.createGain();
    this.delayWet = this.ctx.createGain();

    // Reverb System (Convolution with synthetic impulse)
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = createReverbImpulseResponse(this.ctx);
    this.reverbWet = this.ctx.createGain();

    this.dryRoute = this.ctx.createGain();
    this.masterGain = this.ctx.createGain();
    
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    // Assemble VST Signal Chain:
    // Source -> Preamp -> EQ Low -> EQ Mid -> EQ High -> Notch 1 -> Notch 2 -> Notch 3 -> Notch 4 -> ... splits to effects & dry
    this.sourceNode.connect(this.preampGain);
    this.preampGain.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.notchFilter);
    this.notchFilter.connect(this.notchFilter2);
    this.notchFilter2.connect(this.notchFilter3);
    this.notchFilter3.connect(this.notchFilter4);

    // Split at Notch Filter 4
    // 1. Dry Path
    this.notchFilter4.connect(this.dryRoute);
    this.dryRoute.connect(this.masterGain);

    // 2. Delay Path
    this.notchFilter4.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode); // feedback loop
    this.delayNode.connect(this.delayWet);
    this.delayWet.connect(this.masterGain);

    // 3. Reverb Path
    this.notchFilter4.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWet);
    this.reverbWet.connect(this.masterGain);

    // Master Saturation (Warm Tube Waveshaper)
    this.masterSaturation = this.ctx.createWaveShaper();
    this.masterSaturation.curve = makeWarmTubeCurve(30);

    // Master Dynamic Range Glue Compressor
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
    this.masterCompressor.knee.setValueAtTime(12, this.ctx.currentTime);
    this.masterCompressor.ratio.setValueAtTime(1.8, this.ctx.currentTime);
    this.masterCompressor.attack.setValueAtTime(0.012, this.ctx.currentTime);
    this.masterCompressor.release.setValueAtTime(0.15, this.ctx.currentTime);

    // Master Mid/Side Stereo Matrix
    this.msSplitter = this.ctx.createChannelSplitter(2);
    this.msMerger = this.ctx.createChannelMerger(2);

    this.msLToMid = this.ctx.createGain(); this.msLToMid.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.msRToMid = this.ctx.createGain(); this.msRToMid.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.msLToSide = this.ctx.createGain(); this.msLToSide.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.msRToSide = this.ctx.createGain(); this.msRToSide.gain.setValueAtTime(-0.5, this.ctx.currentTime); // Phase inversion

    this.msMidBus = this.ctx.createGain();
    this.msSideBus = this.ctx.createGain();

    this.msMidToL = this.ctx.createGain(); this.msMidToL.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.msMidToR = this.ctx.createGain(); this.msMidToR.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.msSideToL = this.ctx.createGain(); this.msSideToL.gain.setValueAtTime(1.15, this.ctx.currentTime); // Initial 115% width
    this.msSideToR = this.ctx.createGain(); this.msSideToR.gain.setValueAtTime(-1.15, this.ctx.currentTime);

    // Splitter -> Mid/Side calculators
    this.msSplitter.connect(this.msLToMid, 0);
    this.msSplitter.connect(this.msRToMid, 1);
    this.msSplitter.connect(this.msLToSide, 0);
    this.msSplitter.connect(this.msRToSide, 1);

    // Sum calculations -> Busses
    this.msLToMid.connect(this.msMidBus);
    this.msRToMid.connect(this.msMidBus);
    this.msLToSide.connect(this.msSideBus);
    this.msRToSide.connect(this.msSideBus);

    // Mid/Side Busses -> Reconstructors
    this.msMidBus.connect(this.msMidToL);
    this.msMidBus.connect(this.msMidToR);
    this.msSideBus.connect(this.msSideToL);
    this.msSideBus.connect(this.msSideToR);

    // Reconstructors -> Merger
    this.msMidToL.connect(this.msMerger, 0, 0);
    this.msMidToR.connect(this.msMerger, 0, 1);
    this.msSideToL.connect(this.msMerger, 0, 0);
    this.msSideToR.connect(this.msMerger, 0, 1);

    // Master Peak safety limiter (Pre-driven dynamic ceiling)
    this.masterLimiterDrive = this.ctx.createGain();
    this.masterLimiterDrive.gain.setValueAtTime(Math.pow(10, 3.5 / 20.0), this.ctx.currentTime); // +3.5dB drive default

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-1.0, this.ctx.currentTime); // -1.0dB ceiling
    this.masterLimiter.knee.setValueAtTime(0, this.ctx.currentTime);
    this.masterLimiter.ratio.setValueAtTime(20, this.ctx.currentTime);
    this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime); // 3ms attack
    this.masterLimiter.release.setValueAtTime(0.05, this.ctx.currentTime); // 50ms release

    // Connect the Chain:
    // masterGain -> masterSaturation -> masterCompressor -> [msSplitter ... msMerger] -> masterLimiterDrive -> masterLimiter -> analyser -> destination
    this.masterGain.connect(this.masterSaturation);
    this.masterSaturation.connect(this.masterCompressor);
    this.masterCompressor.connect(this.msSplitter);
    this.msMerger.connect(this.masterLimiterDrive);
    this.masterLimiterDrive.connect(this.masterLimiter);
    this.masterLimiter.connect(this.analyser);
    
    this.analyser.connect(this.ctx.destination);
  }

  public applySettings(settings: VstSettings) {
    if (!this.ctx || !this.preampGain || !this.eqLow || !this.eqMid || !this.eqHigh || !this.notchFilter || !this.notchFilter2 || !this.notchFilter3 || !this.notchFilter4 || !this.delayNode || !this.delayFeedback || !this.delayWet || !this.reverbWet || !this.dryRoute) {
      return;
    }

    if (settings.vstBypass) {
      // Direct pass
      this.preampGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.eqLow.gain.setValueAtTime(0, this.ctx.currentTime);
      this.eqMid.gain.setValueAtTime(0, this.ctx.currentTime);
      this.eqHigh.gain.setValueAtTime(0, this.ctx.currentTime);
      
      this.notchFilter.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter.Q.setValueAtTime(0.001, this.ctx.currentTime);
      this.notchFilter2.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter2.Q.setValueAtTime(0.001, this.ctx.currentTime);
      this.notchFilter3.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter3.Q.setValueAtTime(0.001, this.ctx.currentTime);
      this.notchFilter4.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter4.Q.setValueAtTime(0.001, this.ctx.currentTime);
      
      this.delayWet.gain.setValueAtTime(0, this.ctx.currentTime);
      this.reverbWet.gain.setValueAtTime(0, this.ctx.currentTime);
      this.dryRoute.gain.setValueAtTime(1.0, this.ctx.currentTime);

      if (this.masterSaturation) {
        this.masterSaturation.curve = makeWarmTubeCurve(0);
      }
      if (this.masterCompressor) {
        this.masterCompressor.threshold.setValueAtTime(0, this.ctx.currentTime); // Neutral compression
      }
      if (this.msSideToL && this.msSideToR) {
        this.msSideToL.gain.setValueAtTime(1.0, this.ctx.currentTime); // Standard width
        this.msSideToR.gain.setValueAtTime(-1.0, this.ctx.currentTime);
      }
      if (this.masterLimiterDrive) {
        this.masterLimiterDrive.gain.setValueAtTime(1.0, this.ctx.currentTime); // Neutral drive
      }
      return;
    }

    // Apply linear Gain
    const linearGain = Math.pow(10, settings.preamp / 20.0);
    this.preampGain.gain.setValueAtTime(linearGain, this.ctx.currentTime);

    // Apply EQ Band Gains
    this.eqLow.gain.setValueAtTime(settings.lowGain, this.ctx.currentTime);
    this.eqMid.gain.setValueAtTime(settings.midGain, this.ctx.currentTime);
    this.eqHigh.gain.setValueAtTime(settings.highGain, this.ctx.currentTime);

    // Apply Notch filter (Audio Watermark isolator)
    if (settings.notchEnabled) {
      const profile = settings.aiWatermarkProfile || "none";
      const deepPurge = settings.aiWatermarkDeepPurge || false;

      if (profile === "suno_udio") {
        // High fidelity ultrasonic signatures & multi-band AI noise
        this.notchFilter.frequency.setValueAtTime(19500, this.ctx.currentTime);
        this.notchFilter.Q.setValueAtTime(15, this.ctx.currentTime);

        this.notchFilter2.frequency.setValueAtTime(18000, this.ctx.currentTime);
        this.notchFilter2.Q.setValueAtTime(20, this.ctx.currentTime);

        this.notchFilter3.frequency.setValueAtTime(15750, this.ctx.currentTime);
        this.notchFilter3.Q.setValueAtTime(25, this.ctx.currentTime);

        this.notchFilter4.frequency.setValueAtTime(12000, this.ctx.currentTime);
        this.notchFilter4.Q.setValueAtTime(25, this.ctx.currentTime);
      } else if (profile === "elevenlabs") {
        // High compression whine & sub frequency hum remover
        this.notchFilter.frequency.setValueAtTime(16000, this.ctx.currentTime);
        this.notchFilter.Q.setValueAtTime(12, this.ctx.currentTime);

        this.notchFilter2.frequency.setValueAtTime(8000, this.ctx.currentTime);
        this.notchFilter2.Q.setValueAtTime(15, this.ctx.currentTime);

        this.notchFilter3.frequency.setValueAtTime(12000, this.ctx.currentTime);
        this.notchFilter3.Q.setValueAtTime(15, this.ctx.currentTime);

        this.notchFilter4.frequency.setValueAtTime(45, this.ctx.currentTime);
        this.notchFilter4.Q.setValueAtTime(8, this.ctx.currentTime);
      } else if (profile === "vocal_tag") {
        // Broadband human spoken frequencies ("AudioJungle", "preview" etc)
        this.notchFilter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        this.notchFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

        this.notchFilter2.frequency.setValueAtTime(2000, this.ctx.currentTime);
        this.notchFilter2.Q.setValueAtTime(5.0, this.ctx.currentTime);

        this.notchFilter3.frequency.setValueAtTime(3000, this.ctx.currentTime);
        this.notchFilter3.Q.setValueAtTime(6.0, this.ctx.currentTime);

        this.notchFilter4.frequency.setValueAtTime(500, this.ctx.currentTime);
        this.notchFilter4.Q.setValueAtTime(3.0, this.ctx.currentTime);
      } else if (profile === "harmonic_hum") {
        // 50Hz/60Hz electricity hum + primary overtones
        this.notchFilter.frequency.setValueAtTime(50, this.ctx.currentTime);
        this.notchFilter.Q.setValueAtTime(30, this.ctx.currentTime);

        this.notchFilter2.frequency.setValueAtTime(60, this.ctx.currentTime);
        this.notchFilter2.Q.setValueAtTime(30, this.ctx.currentTime);

        this.notchFilter3.frequency.setValueAtTime(100, this.ctx.currentTime);
        this.notchFilter3.Q.setValueAtTime(35, this.ctx.currentTime);

        this.notchFilter4.frequency.setValueAtTime(120, this.ctx.currentTime);
        this.notchFilter4.Q.setValueAtTime(35, this.ctx.currentTime);
      } else {
        // Custom Notch or none
        this.notchFilter.frequency.setValueAtTime(settings.notchFrequency, this.ctx.currentTime);
        this.notchFilter.Q.setValueAtTime(settings.notchQ, this.ctx.currentTime);

        if (deepPurge) {
          // Dynamic CASCADE harmonic notch array (2x, 3x, 4x primary frequency harmonics)
          const f = settings.notchFrequency;
          const q = settings.notchQ;
          this.notchFilter2.frequency.setValueAtTime(Math.min(21000, f * 2), this.ctx.currentTime);
          this.notchFilter2.Q.setValueAtTime(q * 1.5, this.ctx.currentTime);

          this.notchFilter3.frequency.setValueAtTime(Math.min(21000, f * 3), this.ctx.currentTime);
          this.notchFilter3.Q.setValueAtTime(q * 2, this.ctx.currentTime);

          this.notchFilter4.frequency.setValueAtTime(Math.min(21000, f * 4), this.ctx.currentTime);
          this.notchFilter4.Q.setValueAtTime(q * 2.5, this.ctx.currentTime);
        } else {
          // No cascade, bypass other filters
          this.notchFilter2.frequency.setValueAtTime(20, this.ctx.currentTime);
          this.notchFilter2.Q.setValueAtTime(0.001, this.ctx.currentTime);

          this.notchFilter3.frequency.setValueAtTime(20, this.ctx.currentTime);
          this.notchFilter3.Q.setValueAtTime(0.001, this.ctx.currentTime);

          this.notchFilter4.frequency.setValueAtTime(20, this.ctx.currentTime);
          this.notchFilter4.Q.setValueAtTime(0.001, this.ctx.currentTime);
        }
      }
    } else {
      // Inactive
      this.notchFilter.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter.Q.setValueAtTime(0.001, this.ctx.currentTime);

      this.notchFilter2.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter2.Q.setValueAtTime(0.001, this.ctx.currentTime);

      this.notchFilter3.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter3.Q.setValueAtTime(0.001, this.ctx.currentTime);

      this.notchFilter4.frequency.setValueAtTime(20, this.ctx.currentTime);
      this.notchFilter4.Q.setValueAtTime(0.001, this.ctx.currentTime);
    }

    // Apply Delay (Echo) VST
    this.delayNode.delayTime.setValueAtTime(Math.max(0.001, Math.min(2.0, settings.delayTime)), this.ctx.currentTime);
    this.delayFeedback.gain.setValueAtTime(settings.delayFeedback, this.ctx.currentTime);
    this.delayWet.gain.setValueAtTime(settings.delayTime > 0 ? 0.4 : 0, this.ctx.currentTime);

    // Apply Convolution Reverb VST
    this.reverbWet.gain.setValueAtTime(settings.reverbWet * 0.7, this.ctx.currentTime);
    this.dryRoute.gain.setValueAtTime(1.0 - (settings.reverbWet * 0.3), this.ctx.currentTime);

    // Apply Analog-Modelled Master Rack Saturation Warmth
    const warmth = settings.masterWarmth !== undefined ? settings.masterWarmth : 30;
    if (this.masterSaturation) {
      this.masterSaturation.curve = makeWarmTubeCurve(warmth);
    }

    // Apply Compressor Glue (Dynamic Glue threshold value)
    if (this.masterCompressor) {
      const isCompOn = settings.masterCompressor !== undefined ? settings.masterCompressor : true;
      const compThreshold = isCompOn ? -14 : 0; // -14dB when active, 0dB when bypassed
      this.masterCompressor.threshold.setValueAtTime(compThreshold, this.ctx.currentTime);
    }

    // Apply Mid/Side Stereo Widening
    const rawWidth = settings.masterWidth !== undefined ? settings.masterWidth : 115;
    const widthMultiplier = rawWidth / 100.0;
    if (this.msSideToL && this.msSideToR) {
      this.msSideToL.gain.setValueAtTime(widthMultiplier, this.ctx.currentTime);
      this.msSideToR.gain.setValueAtTime(-widthMultiplier, this.ctx.currentTime);
    }

    // Apply Master Output Limiter Gain Boost
    const limiterGainDB = settings.masterLimiterGain !== undefined ? settings.masterLimiterGain : 3.5;
    if (this.masterLimiterDrive) {
      const limiterGainLinear = Math.pow(10, limiterGainDB / 20.0);
      this.masterLimiterDrive.gain.setValueAtTime(limiterGainLinear, this.ctx.currentTime);
    }
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(256);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(256);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    return dataArray;
  }

  public resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public close() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
