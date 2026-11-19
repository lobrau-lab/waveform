/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let libLoader: Promise<any> | null = null;
let Mp3EncoderConstructor: any = null;

class MPEGMode {
  private _ordinal: number;
  constructor(ordinal: number) {
    this._ordinal = ordinal;
  }
  public ordinal(): number {
    return this._ordinal;
  }
  static STEREO = new MPEGMode(0);
  static JOINT_STEREO = new MPEGMode(1);
  static DUAL_CHANNEL = new MPEGMode(2);
  static MONO = new MPEGMode(3);
  static NOT_SET = new MPEGMode(4);
}

/**
 * Preloads LameJS and defines all necessary globals in a safe order
 * before importing the main module, ensuring ESM/CJS compatibility in Vite.
 */
export async function preloadLame(): Promise<any> {
  if (libLoader) return libLoader;

  libLoader = (async () => {
    const g = (typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : {}) as any;

    // Define MPEGMode globally
    g.MPEGMode = MPEGMode;

    try {
      // Load Lame.js and assign to Lame globally before index.js executes
      const LameModule = await import("lamejs/src/js/Lame.js");
      g.Lame = LameModule.default || LameModule;

      // Load LameInternalFlags and LameGlobalFlags and assign globally
      const LameInternalFlagsModule = await import("lamejs/src/js/LameInternalFlags.js");
      g.LameInternalFlags = LameInternalFlagsModule.default || LameInternalFlagsModule;

      const LameGlobalFlagsModule = await import("lamejs/src/js/LameGlobalFlags.js");
      g.LameGlobalFlags = LameGlobalFlagsModule.default || LameGlobalFlagsModule;

      // Import index.js dynamically now that all globals are in place
      const lamejsModule = await import("lamejs");
      const lamejs = lamejsModule.default || lamejsModule;

      Mp3EncoderConstructor = lamejs.Mp3Encoder || (lamejs as any).default?.Mp3Encoder;
      if (!Mp3EncoderConstructor) {
        throw new Error("LameJS MP3 Encoder constructor not found on the imported module.");
      }
      return Mp3EncoderConstructor;
    } catch (err) {
      console.error("Failed to dynamically load and bootstrap lamejs encoder:", err);
      throw err;
    }
  })();

  return libLoader;
}

// Start preloading immediately on module import so it is ready early
if (typeof window !== "undefined") {
  preloadLame().catch(() => {});
}

/**
 * Encodes an AudioBuffer into an MP3 file asynchronously in-browser.
 */
export async function audioBufferToMp3(buffer: AudioBuffer, kbps = 128): Promise<Blob> {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  
  // Resolve Mp3Encoder constructor robustly via loader
  const EncoderClass = await preloadLame();
  if (!EncoderClass) {
    throw new Error("LameJS MP3 Encoder is not loaded or supported in this runtime environment.");
  }

  // Mp3Encoder class from lamejs
  const mp3encoder = new EncoderClass(numChannels, sampleRate, kbps);
  const mp3Data: any[] = [];
  
  const sampleBlockSize = 1152;
  const length = buffer.length;
  
  if (numChannels === 2) {
    const leftFloat = buffer.getChannelData(0);
    const rightFloat = buffer.getChannelData(1);
    
    // Convert Float32Array to Int16Array
    const leftInt16 = new Int16Array(length);
    const rightInt16 = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const l = Math.max(-1, Math.min(1, leftFloat[i]));
      leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
      
      const r = Math.max(-1, Math.min(1, rightFloat[i]));
      rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
    }
    
    for (let i = 0; i < length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  } else {
    const monoFloat = buffer.getChannelData(0);
    const monoInt16 = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const m = Math.max(-1, Math.min(1, monoFloat[i]));
      monoInt16[i] = m < 0 ? m * 0x8000 : m * 0x7FFF;
    }
    
    for (let i = 0; i < length; i += sampleBlockSize) {
      const chunk = monoInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  }
  
  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Int8Array(mp3buf));
  }
  
  return new Blob(mp3Data, { type: "audio/mp3" });
}
