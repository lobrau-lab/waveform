/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VisualParams, VstSettings, CanvasResolution } from "./types";

export const DEFAULT_JS_SCRIPT = `/**
 * SoundScape Custom Visualizer Script (ES6 JavaScript Draw Loop)
 * Write your own drawing logic here!
 * 
 * Available variables in context:
 * - ctx: CanvasRenderingContext2D
 * - width, height: numbers (canvas dimensions)
 * - audioData: Uint8Array (frequency spectrum data, values 0-255)
 * - time: number (elapsed time in milliseconds)
 * - params: VisualParams object (speed, sensitivity, colors, glow, etc.)
 */

// Draw an elegant pulsing cosmic eye in the center
const avgAudio = audioData.reduce((a, b) => a + b, 0) / audioData.length;
const bassFactor = (audioData[2] || 0) / 255; // sub-bass freq
const highFactor = (audioData[120] || 0) / 255; // treble freq

ctx.shadowBlur = params.glow;
ctx.shadowColor = params.baseColor;

// Radial pulse circle
ctx.fillStyle = params.baseColor;
ctx.beginPath();
const baseRadius = Math.min(width, height) * 0.15;
const pulseRadius = baseRadius + (avgAudio * 1.2 * params.sensitivity);
ctx.arc(width / 2, height / 2, pulseRadius, 0, Math.PI * 2);
ctx.fill();

// Geometric space rings
ctx.strokeStyle = params.secondaryColor;
ctx.lineWidth = params.lineWidth;
ctx.beginPath();
const outerRing = pulseRadius + 60 + Math.sin(time * 0.005) * 20;
ctx.arc(width / 2, height / 2, outerRing, 0, Math.PI * 2);
ctx.stroke();

// Frequency star rays shooting outward
const rayCount = 64;
ctx.strokeStyle = params.secondaryColor + "cc";
ctx.lineWidth = 2;
for (let i = 0; i < rayCount; i++) {
  const angle = (i / rayCount) * Math.PI * 2 + (time * 0.0002 * params.speed);
  const dataIdx = Math.floor((i / rayCount) * audioData.length * 0.6);
  const val = (audioData[dataIdx] || 0) / 255;
  const rayLen = 50 + val * 250 * params.sensitivity;
  
  const startX = width / 2 + Math.cos(angle) * pulseRadius;
  const startY = height / 2 + Math.sin(angle) * pulseRadius;
  const endX = width / 2 + Math.cos(angle) * (pulseRadius + rayLen);
  const endY = width / 2 + Math.sin(angle) * (pulseRadius + rayLen);
  
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
}
`;

export const DEFAULT_MYSPACE_HTML = `<div class="myspace-profile-container font-sans text-orange-200">
  <div class="header-banner p-4 text-center border-b-2 border-orange-500 bg-black/60">
    <h1 class="text-2xl font-bold tracking-widest text-orange-400">⚡ WELCOME TO MY SOUNDSTAGE ⚡</h1>
    <p class="text-xs text-orange-300 mt-1">"Tom is my only real friend, but you are a close second."</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
    <!-- About / Profile Stats -->
    <div class="col-span-1 p-3 bg-black/80 border border-orange-600 rounded">
      <h3 class="font-bold border-b border-orange-500 pb-1 mb-2 text-orange-400 font-mono">MySpace Contact</h3>
      <div class="text-xs space-y-1">
        <p><span class="text-orange-500 font-semibold">Mood:</span> Creative 🎧</p>
        <p><span class="text-orange-500 font-semibold">Render Mode:</span> Real-Time Studio</p>
        <p><span class="text-orange-500 font-semibold">Script Engine:</span> Pure Sandbox v1.0</p>
        <p><span class="text-orange-500 font-semibold">Custom VSTs:</span> Multi-band EQ + Delay Rack</p>
      </div>
    </div>

    <!-- Center Bio -->
    <div class="col-span-1 md:col-span-2 p-3 bg-black/80 border border-orange-600 rounded">
      <h3 class="font-bold border-b border-orange-500 pb-1 mb-2 text-orange-400 font-mono">My Studio Blurb</h3>
      <p class="text-xs leading-relaxed text-gray-300">
        Playing with audio decibels, visual loops, and retro pixel Shaders. Drag and drop any 
        audio, configure the notch filters to remove watermarks, adjust slider parameters in real-time, 
        and download ready-to-use high fidelity videos with a custom script file!
      </p>
    </div>
  </div>
</div>`;

export function generatePythonScript(params: VisualParams, vst: VstSettings, resolution: CanvasResolution): string {
  let w = 1920, h = 1080;
  if (resolution === CanvasResolution.TIKTOK_9_16) {
    w = 1080; h = 1920;
  } else if (resolution === CanvasResolution.INSTAGRAM_1_1) {
    w = 1080; h = 1080;
  } else if (resolution === CanvasResolution.CINEMATIC_21_9) {
    w = 2560; h = 1080;
  }

  return `#!/usr/bin/env python3
"""
SoundScape Studio - Local High Fidelity Python Render Engine
=============================================================
This python3 script reads your audio file, performs FFT (Fourier analysis),
applies the custom VST notch watermark filters and EQ settings, and renders
a high-quality MP4 music video visualizer at the specified resolution (${w}x${h})
using OpenCV (cv2) and numpy.

Compatible with Windows, macOS, and Linux.

Prerequisites:
    pip install numpy opencv-python soundfile librosa matplotlib openai-whisper
"""

import os
import sys
import numpy as np
import cv2
import soundfile as sf
import librosa
from scipy.signal import iirnotch, lfilter

def transcribe_whisper_lyrics(audio_path, model_name="base"):
    try:
        import whisper
        print(f"-> Running Open Whisper ({model_name}) on-device lyric recognition...")
        model = whisper.load_model(model_name)
        result = model.transcribe(audio_path, word_timestamps=False)
        segments = []
        for seg in result.get("segments", []):
            text = (seg.get("text") or "").strip()
            if text:
                segments.append((float(seg["start"]), float(seg["end"]), text))
        print(f"-> Transcribed {len(segments)} timed lyric segments via Open Whisper.")
        return segments
    except Exception as exc:
        print(f"-> Open Whisper skipped ({exc}). Install with: pip install openai-whisper")
        return []

def apply_studio_filters(audio_path, sample_rate=44100):
    print("-> Loading audio file with librosa...")
    y, sr = librosa.load(audio_path, sr=sample_rate, mono=False)
    
    # 1. Apply Notch Filter if watermark removal is enabled
    # Configured Notch: ${vst.notchEnabled ? vst.notchFrequency : 'Disabled'} Hz (Q=${vst.notchQ})
    if ${vst.notchEnabled ? "True" : "False"}:
        print(f"-> Applying Notch filter for watermark removal at {vst.notchFrequency} Hz...")
        b, a = iirnotch(${vst.notchFrequency}, ${vst.notchQ}, sr)
        if len(y.shape) > 1:
            y[0] = lfilter(b, a, y[0])
            y[1] = lfilter(b, a, y[1])
        else:
            y = lfilter(b, a, y)

    # 2. Simple preamp & 3-band EQ filter simulation (represented offline)
    preamp_linear = 10 ** (${vst.preamp} / 20.0)
    print(f"-> Applying Preamp gain of {preamp_linear:.2f}x...")
    y = y * preamp_linear
    return y, sr

def render_video(audio_path, output_path="visualizer_render.mp4"):
    y, sr = apply_studio_filters(audio_path)
    timed_lyrics = transcribe_whisper_lyrics(audio_path)
    
    # Analyze beat times and frequency spectrum
    print("-> Analyzing frequency bins and spectrogram...")
    # Get mono track for analytics
    y_mono = librosa.to_mono(y) if len(y.shape) > 1 else y
    stft = np.abs(librosa.stft(y_mono, n_fft=1024, hop_length=512))
    times = librosa.frames_to_time(np.arange(stft.shape[1]), sr=sr, hop_length=512)
    
    # Match frames to audio
    fps = 30
    duration = len(y_mono) / sr
    total_frames = int(duration * fps)
    print(f"-> Target Duration: {duration:.2f} seconds ({total_frames} frames)")

    width, height = ${w}, ${h}
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    video = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    preset = "${params.preset}"
    base_color_hex = "${params.baseColor}"
    sec_color_hex = "${params.secondaryColor}"

    def hex_to_bgr(hex_str):
        h = hex_str.lstrip('#')
        rgb = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
        return (rgb[2], rgb[1], rgb[0]) # OpenCV uses BGR

    bgr_primary = hex_to_bgr(base_color_hex)
    bgr_secondary = hex_to_bgr(sec_color_hex)

    print(f"-> Rendering video using preset: {preset}...")
    for frame_idx in range(total_frames):
        # Determine audio time and find closest audio spectrum index
        t = frame_idx / fps
        stft_idx = min(stft.shape[1] - 1, np.searchsorted(times, t))
        spectrum = stft[:, stft_idx]
        
        # Aggregate audio bands
        num_bars = 40
        bars_data = np.zeros(num_bars)
        chunk_size = len(spectrum) // num_bars
        for b in range(num_bars):
            bars_data[b] = np.mean(spectrum[b*chunk_size : (b+1)*chunk_size])
        
        # Max scale
        bars_scaled = np.clip(bars_data * ${params.sensitivity * 8.0}, 0, 1.0)

        # Create blank canvas
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        # Draw visuals
        # Preset Rendering Logic
        if preset == "Equalizer Bars":
            bar_width = width // num_bars
            for i in range(num_bars):
                val = bars_scaled[i]
                h_val = int(val * height * 0.7)
                cv2.rectangle(
                    frame, 
                    (i * bar_width, height), 
                    ((i+1)*bar_width - 2, height - h_val), 
                    bgr_primary if i % 2 == 0 else bgr_secondary, 
                    -1
                )
        elif preset == "Retro Space Tunnel" or preset == "Retro Starfield":
            # Space Tunnel procedural simulation
            center_x, center_y = width // 2, height // 2
            avg_amp = np.mean(bars_scaled)
            pulse = int(avg_amp * 100)
            for r in range(50, min(width, height) // 2, 40):
                circle_rad = r + pulse
                cv2.circle(frame, (center_x, center_y), circle_rad, bgr_secondary, 2)
            for i in range(8):
                angle = (i / 8) * 2 * np.pi + (frame_idx * 0.05 * ${params.speed})
                end_x = int(center_x + np.cos(angle) * (min(width, height) // 2))
                end_y = int(center_y + np.sin(angle) * (min(width, height) // 2))
                cv2.line(frame, (center_x, center_y), (end_x, end_y), bgr_primary, 1)
        else: # Default neon waves or orbiting spectrum particles
            center_y = height // 2
            points = []
            avg_amp = np.mean(bars_scaled)
            for i in range(width):
                amp_idx = int((i / width) * num_bars)
                offset = int(bars_scaled[amp_idx] * 200 * np.sin(i * 0.01 + frame_idx * 0.1 * ${params.speed}))
                points.append((i, center_y + offset))
            
            for i in range(len(points) - 1):
                cv2.line(frame, points[i], points[i+1], bgr_primary, int(${params.lineWidth}))

        # Glow post-process filter simulation (low pass blur)
        if ${params.glow > 0 ? "True" : "False"}:
            blur_size = int(${params.glow * 1.5}) | 1 # Odd number
            blurred = cv2.GaussianBlur(frame, (blur_size, blur_size), 0)
            frame = cv2.addWeighted(frame, 0.8, blurred, 0.4, 0)

        # Global High-Frequency Strobe Flash (mirrors highLevel peak strobe)
        high_level_norm = float(np.mean(bars_scaled[int(num_bars * 0.55):]))
        if ${params.postFx?.strobeEnabled ? "True" : "False"} and high_level_norm >= ${params.postFx?.strobeThreshold ?? 0.42}:
            flash_strength = min(0.9, float(${params.postFx?.strobeIntensity ?? 0.65}) * 0.85)
            white_layer = np.full_like(frame, 255)
            frame = cv2.addWeighted(frame, 1.0 - flash_strength * 0.5, white_layer, flash_strength, 0)

        # Render Open Whisper Properly Timed Lyrics at current timestamp t
        for l_start, l_end, l_text in timed_lyrics:
            if l_start <= t <= l_end:
                text_size, _ = cv2.getTextSize(l_text, cv2.FONT_HERSHEY_SIMPLEX, 1.1, 2)
                tx = max(30, (width - text_size[0]) // 2)
                ty = int(height * 0.88)
                cv2.rectangle(frame, (tx - 16, ty - text_size[1] - 12), (tx + text_size[0] + 16, ty + 14), (0, 0, 0), -1)
                cv2.putText(frame, l_text, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (255, 255, 255), 2, cv2.LINE_AA)
                break

        # Draw metadata watermarks or overlays (Optional info display in corner)
        cv2.putText(
            frame, 
            "STUDIO RENDER", 
            (30, 50), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            1, 
            (255, 255, 255), 
            2, 
            cv2.LINE_AA
        )

        video.write(frame)
        if frame_idx % 100 == 0:
            print(f" -> Rendering Frame {frame_idx}/{total_frames} ({int(frame_idx/total_frames*100)}%)")

    video.release()
    print("-> Video visuals completed successfully!")
    print("-> Mixing high fidelity processed audio into final mp4 file...")
    
    # We write temporary audio and invoke ffmpeg if available
    temp_wav_path = "temp_studio_audio.wav"
    sf.write(temp_wav_path, y.T, sr)
    
    # Attempt absolute muxing via system shell call
    cmd = f'ffmpeg -y -i "{output_path}" -i "{temp_wav_path}" -c:v copy -c:a aac -b:a 256k "final_{output_path}"'
    os.system(cmd)
    
    # Cleanup temp
    if os.path.exists(temp_wav_path):
        os.remove(temp_wav_path)
        
    print(f"-> SUCCESS! Render complete. Saved file as: final_{output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python render_visualizer.py <path_to_audio_file>")
        sys.exit(1)
    render_video(sys.argv[1])
`;
}
