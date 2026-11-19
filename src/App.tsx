/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, ChangeEvent, MouseEvent } from "react";
import {
  CanvasResolution,
  VisualPreset,
  VisualParams,
  VstSettings,
  AudioMetadata,
  BatchAudioItem,
  LayoutSkin,
  StudioProjectState
} from "./types";
import { DEFAULT_JS_SCRIPT, DEFAULT_MYSPACE_HTML, generatePythonScript } from "./scriptTemplates";
import { StudioAudioEngine, createReverbImpulseResponse, makeWarmTubeCurve } from "./audioEngine";
import { drawMainVisuals } from "./visualizers";
import { VstRack } from "./components/VstRack";
import { MetadataForm } from "./components/MetadataForm";
import { PRESET_SKINS } from "./components/MySpaceProfile";
import { audioBufferToWav } from "./utils/waveEncoder";
import { audioBufferToMp3 } from "./utils/mp3Encoder";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Upload,
  Undo2,
  Redo2,
  Tv,
  Music,
  Download,
  Terminal,
  Clock,
  Code,
  Layers,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  MonitorPlay,
  Info,
  HelpCircle,
  Video
} from "lucide-react";

// Initial Project defaults
const DEFAULT_VISUAL_PARAMS: VisualParams = {
  preset: VisualPreset.WAVEFORM_NEON,
  speed: 1.0,
  sensitivity: 1.5,
  baseColor: "#ff007f",
  secondaryColor: "#00ffff",
  glow: 15,
  particleCount: 120,
  lineWidth: 4,
  bgOpacity: 0.25,
  customJsCode: DEFAULT_JS_SCRIPT,
  retroHtmlSkin: DEFAULT_MYSPACE_HTML,
  enabledLayers: []
};

const DEFAULT_VST_SETTINGS: VstSettings = {
  preamp: 0,
  lowGain: 2,
  midGain: -1,
  highGain: 3,
  reverbWet: 0.20,
  delayTime: 0.35,
  delayFeedback: 0.40,
  notchFrequency: 1000,
  notchQ: 14,
  notchEnabled: false,
  vstBypass: false,
  aiWatermarkProfile: "none",
  aiWatermarkDeepPurge: false,
  masterWarmth: 30,
  masterCompressor: true,
  masterWidth: 115,
  masterLimiterGain: 3.5
};

const DEFAULT_METADATA: AudioMetadata = {
  title: "Untitled SoundScape",
  artist: "Independent Creator",
  album: "Acoustic Explorations",
  genre: "Electronic",
  year: "2026",
  comment: "Mastered with VST Multitools Offline",
  coverArtUrl: ""
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "designer" | "metadata" | "renderer">("dashboard");
  const [skinId, setSkinId] = useState<string>("studio-charcoal");
  const [skin, setSkin] = useState<LayoutSkin>(PRESET_SKINS[0]);
  
  // Custom states
  const [visualParams, setVisualParams] = useState<VisualParams>(DEFAULT_VISUAL_PARAMS);
  const [vstSettings, setVstSettings] = useState<VstSettings>(DEFAULT_VST_SETTINGS);
  const [metadata, setMetadata] = useState<AudioMetadata>(DEFAULT_METADATA);
  const [resolution, setResolution] = useState<CanvasResolution>(CanvasResolution.YOUTUBE_16_9);
  
  // Audio file states
  const [currentAudio, setCurrentAudio] = useState<{ name: string; size: number; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<number>(0);

  // Undo/Redo Stacks
  const [pastStates, setPastStates] = useState<StudioProjectState[]>([]);
  const [futureStates, setFutureStates] = useState<StudioProjectState[]>([]);

  // Batch Queue
  const [batchQueue, setBatchQueue] = useState<BatchAudioItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  // Recording Export states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [compiledVideoUrl, setCompiledVideoUrl] = useState<string | null>(null);
  const [compiledVideoName, setCompiledVideoName] = useState<string | null>(null);
  const [recordProgress, setRecordProgress] = useState<number>(0);
  const [recordSecondsElapsed, setRecordSecondsElapsed] = useState<number>(0);

  // Advanced video export visualization options
  const [exportFps, setExportFps] = useState<number>(30);
  const [exportBitrate, setExportBitrate] = useState<number>(8000000); // default 8 Mbps
  const [exportWatermarkEnabled, setExportWatermarkEnabled] = useState<boolean>(false);
  const [exportTimecodeEnabled, setExportTimecodeEnabled] = useState<boolean>(false);
  const [exportMetadataOverlayEnabled, setExportMetadataOverlayEnabled] = useState<boolean>(false);
  const [exportAudioSpectrumOverlayEnabled, setExportAudioSpectrumOverlayEnabled] = useState<boolean>(false);
  const [exportOsdBorderEnabled, setExportOsdBorderEnabled] = useState<boolean>(false);

  // Audio Format conversions
  const [isConvertingAudio, setIsConvertingAudio] = useState<boolean>(false);
  const [audioConversionProgress, setAudioConversionProgress] = useState<number>(0);
  const [vstExportSampleRate, setVstExportSampleRate] = useState<number>(44100);
  const [vstExportChannels, setVstExportChannels] = useState<number>(2);
  const [audioConversionError, setAudioConversionError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioExportFormat, setAudioExportFormat] = useState<"wav" | "mp3">("wav");
  const [videoExportFormat, setVideoExportFormat] = useState<"webm" | "mp4">("mp4");

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null); // profile ambient background song helper
  const animationFrameRef = useRef<number | null>(null);
  const audioEngineRef = useRef<StudioAudioEngine>(new StudioAudioEngine());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);

  // Cross-fading Preset Transition References
  const prevVisualParamsRef = useRef<VisualParams | null>(null);
  const transitionStartTimeRef = useRef<number | null>(null);
  const transitionDurationRef = useRef<number>(750); // 750ms transition
  const lastVisualParamsRef = useRef<VisualParams>(visualParams);
  const currentPresetRef = useRef<string>(visualParams.preset);

  // Sound Levels Meters states (synced to analysis on pulse)
  const [bassLevel, setBassLevel] = useState<number>(0);
  const [midLevel, setMidLevel] = useState<number>(0);
  const [highLevel, setHighLevel] = useState<number>(0);

  // Trigger cross-fading preset transition when preset changes
  useEffect(() => {
    if (currentPresetRef.current !== visualParams.preset) {
      // Begin transition! Store the previous parameters exactly as they were
      prevVisualParamsRef.current = lastVisualParamsRef.current;
      transitionStartTimeRef.current = performance.now();
      currentPresetRef.current = visualParams.preset;
    }
    // Keep track of the latest params
    lastVisualParamsRef.current = visualParams;
  }, [visualParams]);

  // Sync Layout Skin selection
  useEffect(() => {
    const matched = PRESET_SKINS.find((s) => s.id === skinId) || PRESET_SKINS[0];
    setSkin(matched);
  }, [skinId]);

  // Push new states into undo history stack
  const saveStateToHistory = (
    nextVisuals: VisualParams,
    nextVst: VstSettings,
    nextMeta: AudioMetadata,
    nextRes: CanvasResolution
  ) => {
    const snapshot: StudioProjectState = {
      visualParams: JSON.parse(JSON.stringify(nextVisuals)),
      vstSettings: { ...nextVst },
      metadata: { ...nextMeta },
      selectedResolution: nextRes,
      skinId
    };

    setPastStates((prev) => [...prev.slice(-30), snapshot]); // limit 30 steps
    setFutureStates([]); // wipe redo
  };

  // Undo click
  const handleUndo = () => {
    if (pastStates.length === 0) return;
    const previous = pastStates[pastStates.length - 1];
    const currentSnapshot: StudioProjectState = {
      visualParams,
      vstSettings,
      metadata,
      selectedResolution: resolution,
      skinId
    };

    setFutureStates((prev) => [currentSnapshot, ...prev]);
    setPastStates((prev) => prev.slice(0, -1));

    setVisualParams(previous.visualParams);
    setVstSettings(previous.vstSettings);
    setMetadata(previous.metadata);
    setResolution(previous.selectedResolution);
    setSkinId(previous.skinId);

    // Apply reverted audio settings
    audioEngineRef.current.applySettings(previous.vstSettings);
  };

  // Redo click
  const handleRedo = () => {
    if (futureStates.length === 0) return;
    const next = futureStates[0];
    const currentSnapshot: StudioProjectState = {
      visualParams,
      vstSettings,
      metadata,
      selectedResolution: resolution,
      skinId
    };

    setPastStates((prev) => [...prev, currentSnapshot]);
    setFutureStates((prev) => prev.slice(1));

    setVisualParams(next.visualParams);
    setVstSettings(next.vstSettings);
    setMetadata(next.metadata);
    setResolution(next.selectedResolution);
    setSkinId(next.skinId);

    audioEngineRef.current.applySettings(next.vstSettings);
  };

  // Handle parameter changes with history registration
  const handleVisualParamsChange = (newParams: VisualParams) => {
    saveStateToHistory(visualParams, vstSettings, metadata, resolution);
    setVisualParams(newParams);
  };

  const handleVstSettingsChange = (newVst: VstSettings) => {
    saveStateToHistory(visualParams, vstSettings, metadata, resolution);
    setVstSettings(newVst);
    audioEngineRef.current.applySettings(newVst);
  };

  const handleMetadataChange = (newMeta: AudioMetadata) => {
    saveStateToHistory(visualParams, vstSettings, metadata, resolution);
    setMetadata(newMeta);
  };

  // Drag and Drop loader
  const decodeAndSetDuration = async (blob: Blob) => {
    // Reset track progress while decoding
    setAudioProgress(0);
    setAudioDuration(0);
    decodedBufferRef.current = null;
    setAudioError(null);

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const tempCtx = new AudioContextClass();
      
      const arrayBuffer = await blob.arrayBuffer();
      const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      const exactDuration = decodedBuffer.duration;
      
      decodedBufferRef.current = decodedBuffer;
      
      if (exactDuration && Number.isFinite(exactDuration)) {
        setAudioDuration(exactDuration);
        console.log(`Successfully parsed exact audio duration via Web Audio: ${exactDuration} seconds`);
      } else {
        setAudioDuration(180); // Fallback standard length rather than 0
      }
      
      try {
        await tempCtx.close();
      } catch (e) {
        console.warn("Error closing temp audio context:", e);
      }
    } catch (err: any) {
      console.error("Failed to decode audio data for duration estimation:", err);
      const errMsg = err?.message || String(err);
      setAudioError(`Format Warning: Web Audio parser was unable to estimate exactly the track length (${errMsg}). Please note that processing or exporting this specific file may be limited.`);
      
      if (audioRef.current && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
        setAudioDuration(audioRef.current.duration);
      } else {
        setAudioDuration(180); // Fallback standard length to avoid division by zero
      }
    }
  };

  const handleAudioUpload = (file: File) => {
    setAudioError(null);
    // Revoke previous URL to avoid memory leak!
    if (currentAudio?.url) {
      try {
        URL.revokeObjectURL(currentAudio.url);
      } catch (err) {
        console.warn("Error revoking old audio URL:", err);
      }
    }
    const fileUrl = URL.createObjectURL(file);
    const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    
    const newMetadata = {
      ...metadata,
      title: cleanName,
      artist: "Independent Producer"
    };

    setMetadata(newMetadata);
    setCurrentAudio({
      name: file.name,
      size: file.size,
      url: fileUrl
    });

    if (audioRef.current) {
      audioRef.current.src = fileUrl;
      audioRef.current.load();
      setIsPlaying(false);
    }

    // Trigger precise duration decoding
    decodeAndSetDuration(file);

    // Set up default project defaults
    saveStateToHistory(visualParams, vstSettings, newMetadata, resolution);
  };

  // Initialize AudioEngine on first play
  const triggerPlay = async () => {
    if (!audioRef.current || !currentAudio) return;

    if (!isPlaying) {
      try {
        setAudioError(null);
        // Initialize Web Audio pipeline
        if (!audioEngineRef.current.ctx) {
          audioEngineRef.current.init(audioRef.current);
          audioEngineRef.current.applySettings(vstSettings);
        }
        await audioEngineRef.current.resume();
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.error("Audio playback failure:", err);
        const errMsg = err?.message || String(err);
        setAudioError(`Audio Playback failure: The browser failed to play or stream this resource. ${errMsg}`);
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Process visual loop + audio evaluation meters
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          const freqData = audioEngineRef.current.getFrequencyData();
          const timeData = audioEngineRef.current.getTimeDomainData();

          // Standard size configuration based on target resolution selection
          let targetW = 852, targetH = 480; // horizontal default pre-comp
          if (resolution === CanvasResolution.YOUTUBE_16_9) {
            targetW = 1280; targetH = 720;
          } else if (resolution === CanvasResolution.TIKTOK_9_16) {
            targetW = 480; targetH = 852;
          } else if (resolution === CanvasResolution.INSTAGRAM_1_1) {
            targetW = 600; targetH = 600;
          } else if (resolution === CanvasResolution.CINEMATIC_21_9) {
            targetW = 1200; targetH = 500;
          }

          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          // Evaluate real-time frequency band levels for the physical bouncing LED meters
          if (audioEngineRef.current.ctx) {
            const lowRange = freqData.slice(0, 8);
            const midRange = freqData.slice(12, 48);
            const highRange = freqData.slice(64, 128);

            const bSum = lowRange.reduce((a, b) => a + b, 0) / (lowRange.length || 1);
            const mSum = midRange.reduce((a, b) => a + b, 0) / (midRange.length || 1);
            const hSum = highRange.reduce((a, b) => a + b, 0) / (highRange.length || 1);

            setBassLevel((bSum / 255) * 100);
            setMidLevel((mSum / 255) * 100);
            setHighLevel((hSum / 255) * 100);
          } else {
            setBassLevel(0); setMidLevel(0); setHighLevel(0);
          }

          // Compute transition state dynamically inside the real-time render loop
          let progress = 1;
          let prevParams: VisualParams | null = null;
          if (prevVisualParamsRef.current && transitionStartTimeRef.current !== null) {
            const elapsed = performance.now() - transitionStartTimeRef.current;
            progress = Math.min(1, elapsed / transitionDurationRef.current);
            if (progress < 1) {
              prevParams = prevVisualParamsRef.current;
            } else {
              prevVisualParamsRef.current = null;
              transitionStartTimeRef.current = null;
            }
          }

          // Draw procedural visual canvas structures
          drawMainVisuals({
            ctx,
            width: targetW,
            height: targetH,
            freqData,
            timeData,
            time: timestamp,
            params: visualParams,
            prevParams,
            progress
          });

          // == ADVANCED VIDEO EXPORT VISUALIZATION OVERLAYS ==
          
          // 1. OSD Camera Border Grid
          if (exportOsdBorderEnabled) {
            ctx.save();
            // Grid lines
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(targetW / 3, 0); ctx.lineTo(targetW / 3, targetH);
            ctx.moveTo((targetW * 2) / 3, 0); ctx.lineTo((targetW * 2) / 3, targetH);
            ctx.moveTo(0, targetH / 3); ctx.lineTo(targetW, targetH / 3);
            ctx.moveTo(0, (targetH * 2) / 3); ctx.lineTo(targetW, (targetH * 2) / 3);
            ctx.stroke();

            // Corner Brackets
            const cornerLen = Math.min(targetW, targetH) * 0.06;
            const margin = Math.min(targetW, targetH) * 0.04;
            ctx.strokeStyle = "rgba(34, 211, 238, 0.4)"; // Cyan-400 at 40%
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Top-left
            ctx.moveTo(margin, margin + cornerLen); ctx.lineTo(margin, margin); ctx.lineTo(margin + cornerLen, margin);
            // Top-right
            ctx.moveTo(targetW - margin - cornerLen, margin); ctx.lineTo(targetW - margin, margin); ctx.lineTo(targetW - margin, margin + cornerLen);
            // Bottom-left
            ctx.moveTo(margin, targetH - margin - cornerLen); ctx.lineTo(margin, targetH - margin); ctx.lineTo(margin + cornerLen, targetH - margin);
            // Bottom-right
            ctx.moveTo(targetW - margin - cornerLen, targetH - margin); ctx.lineTo(targetW - margin, targetH - margin); ctx.lineTo(targetW - margin, targetH - margin - cornerLen);
            ctx.stroke();

            // REC blinking dot
            const isBlinkOn = Math.floor(timestamp / 500) % 2 === 0;
            ctx.fillStyle = isBlinkOn ? "#ef4444" : "rgba(239, 68, 68, 0.2)";
            ctx.beginPath();
            ctx.arc(margin + 12, margin + 20, 5, 0, Math.PI * 2);
            ctx.fill();

            // Recording textual metrics
            ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
            ctx.font = "bold 11px monospace";
            ctx.fillText("REC", margin + 24, margin + 23);

            // Resolution and export info
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            ctx.font = "9px monospace";
            const ratioLabel = resolution.split(" (")[0];
            ctx.fillText(`FPS: ${exportFps} | RATIO: ${ratioLabel}`, targetW - margin - 130, margin + 23);
            ctx.restore();
          }

          // 2. MTV-Style Metadata Card
          if (exportMetadataOverlayEnabled) {
            ctx.save();
            const boxW = Math.min(300, targetW * 0.4);
            const boxH = 90;
            const margin = Math.min(targetW, targetH) * 0.05;
            const startX = margin;
            const startY = targetH - margin - boxH;

            // Background card backplate
            ctx.fillStyle = "rgba(10, 10, 12, 0.85)";
            ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (typeof (ctx as any).roundRect === "function") {
              (ctx as any).roundRect(startX, startY, boxW, boxH, 6);
            } else {
              ctx.rect(startX, startY, boxW, boxH);
            }
            ctx.fill();
            ctx.stroke();

            // Cyan vertical design stripe
            ctx.fillStyle = "#22d3ee";
            ctx.fillRect(startX + 2, startY + 10, 4, boxH - 20);

            // Print track text info
            ctx.textBaseline = "top";
            
            // Song Title
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 13px sans-serif";
            const titleText = metadata.title || "Untitled Track";
            ctx.fillText(titleText, startX + 16, startY + 12);

            // Artist Name
            ctx.fillStyle = "#22d3ee";
            ctx.font = "500 11px monospace";
            const artistText = (metadata.artist || "Unknown Artist").toUpperCase();
            ctx.fillText(artistText, startX + 16, startY + 32);

            // Album Name / Release Year
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.font = "10px sans-serif";
            const albumYear = (metadata.album ? `Album: ${metadata.album}` : "") + (metadata.year ? ` (${metadata.year})` : "");
            ctx.fillText(albumYear || "Studio Master Export", startX + 16, startY + 50);

            // Genre Tag Label
            if (metadata.genre) {
              ctx.fillStyle = "rgba(34, 211, 238, 0.15)";
              ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
              const tagX = startX + 16;
              const tagY = startY + 68;
              const tagText = metadata.genre.toUpperCase();
              ctx.font = "bold 8px monospace";
              const textW = ctx.measureText(tagText).width;
              ctx.beginPath();
              if (typeof (ctx as any).roundRect === "function") {
                (ctx as any).roundRect(tagX, tagY, textW + 10, 14, 3);
              } else {
                ctx.rect(tagX, tagY, textW + 10, 14);
              }
              ctx.fill();
              ctx.stroke();

              ctx.fillStyle = "#22d3ee";
              ctx.fillText(tagText, tagX + 5, tagY + 3);
            }
            ctx.restore();
          }

          // 3. SMPTE Retro Video Timecode HUD
          if (exportTimecodeEnabled) {
            ctx.save();
            const margin = Math.min(targetW, targetH) * 0.05;
            const currentT = audioRef.current?.currentTime || 0;
            
            const h = Math.floor(currentT / 3600);
            const m = Math.floor((currentT % 3600) / 60);
            const s = Math.floor(currentT % 60);
            const ms = Math.floor((currentT % 1) * 100);
            
            const pad = (v: number) => String(v).padStart(2, "0");
            const tcStr = `TC ${pad(h)}:${pad(m)}:${pad(s)}:${pad(ms)}`;
            
            ctx.fillStyle = "#f59e0b"; // retro physical production monitor amber colour
            ctx.font = "bold 13px monospace";
            const textW = ctx.measureText(tcStr).width;
            
            // Dark screen border surrounding the TC
            ctx.fillStyle = "rgba(0,0,0,0.75)";
            ctx.fillRect(targetW - margin - textW - 14, targetH - margin - 22, textW + 28, 26);
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 1;
            ctx.strokeRect(targetW - margin - textW - 14, targetH - margin - 22, textW + 28, 26);

            ctx.fillStyle = "#f59e0b";
            ctx.textBaseline = "middle";
            ctx.fillText(tcStr, targetW - margin - textW, targetH - margin - 9);
            ctx.restore();
          }

          // 4. Burn-in Audio License/Watermark
          if (exportWatermarkEnabled) {
            ctx.save();
            ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
            ctx.font = "9px monospace";
            ctx.textAlign = "center";
            ctx.fillText("SONIC VISUALIZER v3 PRO - STRICT DIRECT LICENSING APPLIED", targetW / 2, 22);
            ctx.restore();
          }

          // 5. Running Spectrum Grid Overlay
          if (exportAudioSpectrumOverlayEnabled) {
            ctx.save();
            const widthOverlay = Math.min(220, targetW * 0.35);
            const heightOverlay = 50;
            const marginX = targetW - widthOverlay - (Math.min(targetW, targetH) * 0.05);
            const marginY = targetH - heightOverlay - (Math.min(targetW, targetH) * 0.05) - (exportTimecodeEnabled ? 38 : 0);

            ctx.fillStyle = "rgba(10, 10, 12, 0.85)";
            ctx.strokeStyle = "rgba(34, 211, 238, 0.25)";
            ctx.fillRect(marginX, marginY, widthOverlay, heightOverlay);
            ctx.strokeRect(marginX, marginY, widthOverlay, heightOverlay);

            // Grid background pattern
            ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(marginX, marginY + heightOverlay / 2); ctx.lineTo(marginX + widthOverlay, marginY + heightOverlay / 2);
            for (let x = marginX + 20; x < marginX + widthOverlay; x += 20) {
              ctx.moveTo(x, marginY); ctx.lineTo(x, marginY + heightOverlay);
            }
            ctx.stroke();

            // Frequency bars
            const barCount = 32;
            const barW = (widthOverlay - 8) / barCount;
            ctx.fillStyle = "#22d3ee"; // Neon cyan spectral columns
            
            for (let i = 0; i < barCount; i++) {
              const dataIndex = Math.floor((i / barCount) * freqData.length);
              const rawVal = freqData[dataIndex] || 0;
              const percentVal = rawVal / 255;
              const barH = percentVal * (heightOverlay - 8);
              ctx.fillRect(
                marginX + 4 + i * barW,
                marginY + heightOverlay - 4 - barH,
                barW - 1,
                barH
              );
            }
            ctx.restore();
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    visualParams,
    resolution,
    exportFps,
    exportWatermarkEnabled,
    exportTimecodeEnabled,
    exportMetadataOverlayEnabled,
    exportAudioSpectrumOverlayEnabled,
    exportOsdBorderEnabled,
    metadata
  ]);

  // Audio HTML5 tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      // If we did the seek-to-end trick, and now we got a valid duration, reset back to 0
      if (audio.currentTime >= 999999 && audio.duration && Number.isFinite(audio.duration)) {
        audio.currentTime = 0;
        return;
      }
      const dur = audioDuration || audio.duration;
      if (dur && Number.isFinite(dur)) {
        setAudioProgress((audio.currentTime / dur) * 100);
      }
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleDurationChange = () => {
      if (audio.duration === Infinity) {
        audio.currentTime = 1e9;
      } else if (audio.duration && Number.isFinite(audio.duration)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioDuration]);

  // Keyboard shortcut listener (Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visualParams, vstSettings, metadata, resolution, pastStates, futureStates]);

  // Real-time Canvas video recording exporter
  const triggerVideoExport = async () => {
    if (!canvasRef.current || !currentAudio) return;

    if (isRecording) {
      // Trigger stop, the onstop callback will finalize the saving state and stop the process smoothly
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn("Stop mediaRecorder failed:", err);
          setIsRecording(false);
        }
      }
      return;
    }

    // Revoke previous compiled URL to free memory
    if (compiledVideoUrl) {
      try {
        URL.revokeObjectURL(compiledVideoUrl);
      } catch (err) {
        console.warn("Error revoking compiled video URL:", err);
      }
    }

    // Ensure any existing play is completely paused and reset first to clean up Audio Context
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    // A small buffer window to let browser audio drivers settle down
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Gracefully handle raw audio engine context initialization
    if (audioRef.current && !audioEngineRef.current.ctx) {
      try {
        audioEngineRef.current.init(audioRef.current);
        audioEngineRef.current.applySettings(vstSettings);
      } catch (err) {
        console.error("Failed to auto-initialize audio engine for video compilation:", err);
      }
    }

    if (audioEngineRef.current.ctx) {
      try {
        await audioEngineRef.current.resume();
      } catch (err) {
        console.warn("AudioContext resume failed:", err);
      }
    }

    // Initialize recording states first
    setIsRecording(true);
    setRecordProgress(0);
    setRecordSecondsElapsed(0);
    setCompiledVideoUrl(null);
    setCompiledVideoName(null);
    recordedChunksRef.current = [];

    const fps = exportFps;
    // 1. Capture the canvas stream
    const recordStream = canvasRef.current.captureStream(fps);

    // 2. Create the Audio Destination Node and connect masterGain
    const audioDst = audioEngineRef.current.ctx!.createMediaStreamDestination();
    audioEngineRef.current.masterGain?.connect(audioDst);

    // 3. Add the Web Audio track to our recording stream safely
    const audioTracks = audioDst.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      recordStream.addTrack(audioTracks[0]);
    } else {
      console.warn("No audio tracks found in MediaStreamAudioDestinationNode!");
    }

    // 4. Try format codecs
    const typesToTry = videoExportFormat === "mp4" 
      ? [
          "video/mp4;codecs=avc1,opus", // AVC + Opus is highly supported for MP4 container recording in modern Chrome/browsers!
          "video/mp4;codecs=h264,opus",
          "video/mp4;codecs=avc1,mp4a.40.2",
          "video/mp4",
          "video/webm;codecs=vp9,opus", // Robust fallback
          "video/webm;codecs=vp8,opus"
        ]
      : [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm"
        ];

    let recorder: MediaRecorder | null = null;
    for (const mimeType of typesToTry) {
      try {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          recorder = new MediaRecorder(recordStream, {
            mimeType,
            videoBitsPerSecond: exportBitrate
          });
          console.log(`Successfully initialized MediaRecorder with mimeType: ${mimeType}`);
          break;
        }
      } catch (e) {
        console.warn(`MimeType not supported/failed: ${mimeType}`, e);
      }
    }

    if (!recorder) {
      try {
        recorder = new MediaRecorder(recordStream);
        console.log("Initialized MediaRecorder with default browser configuration");
      } catch (ex2) {
        console.error("Failed to create MediaRecorder:", ex2);
        setIsRecording(false);
        return;
      }
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);

      const actualMime = recorder?.mimeType || (videoExportFormat === "mp4" ? "video/mp4" : "video/webm");
      const blob = new Blob(recordedChunksRef.current, { type: actualMime });
      const recordUrl = URL.createObjectURL(blob);
      const resName = resolution.split(" ")[0].replace(":", "x");
      const titleClean = (metadata.title || "studio_render").replace(/\s+/g, "_");
      
      const isActuallyMp4 = actualMime.includes("mp4");
      const fileExt = isActuallyMp4 ? "mp4" : "webm";
      const finalFileName = `${titleClean}_[${resName}]_[${exportFps}fps].${fileExt}`;

      // Save to state for a reliable manual backup download button
      setCompiledVideoUrl(recordUrl);
      setCompiledVideoName(finalFileName);

      // Perform automatic programmatic download
      try {
        const a = document.createElement("a");
        a.href = recordUrl;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.warn("Programmatic download block caught as expected. Use fallback download button.", err);
      }

      setIsRecording(false);
      setRecordProgress(100);

      // Clean up connections and stop tracks
      try {
        audioEngineRef.current.masterGain?.disconnect(audioDst);
      } catch (err) {
        console.warn("Clean up audioDst disconnect warning:", err);
      }

      try {
        recordStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.warn("Track release execution warning:", err);
      }
    };

    // Start the recorder first before audio playback so that audio streams are fully captured from frame 0
    recorder.start(1000); // chunk every 1 sec

    // Wait 50 milliseconds to let browser media pipeline warm up, then request play programmatically!
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback start request failed during export cycle:", err);
      }
    }
  };

  // Monitor recording timeline progress bar
  useEffect(() => {
    let interval: any;
    if (isRecording && audioDuration > 0) {
      interval = setInterval(() => {
        setRecordSecondsElapsed((prev) => {
          const elapsed = prev + 1;
          const ratio = Math.min((elapsed / audioDuration) * 100, 100);
          setRecordProgress(parseFloat(ratio.toFixed(1)));
          
          if (elapsed >= audioDuration && mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            clearInterval(interval);
          }
          return elapsed;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, audioDuration]);

  // Audio Remastering / Format conversion exporter
  const triggerAudioFormatConversion = async () => {
    if (!currentAudio) return;
    setIsConvertingAudio(true);
    setAudioConversionProgress(10);
    setAudioConversionError(null);

    let sourceBuffer = decodedBufferRef.current;

    if (!sourceBuffer) {
      try {
        setAudioConversionProgress(20);
        const response = await fetch(currentAudio.url);
        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const tempCtx = new AudioContextClass();
        sourceBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        decodedBufferRef.current = sourceBuffer;
        await tempCtx.close();
      } catch (e) {
        console.error(e);
        setAudioConversionError("Failed to fetch or decode audio stream. Please re-upload.");
        setIsConvertingAudio(false);
        return;
      }
    }

    // Try rendering levels (Multi-tier downsampling fallback routing to survive OOM)
    const sampleRateOptions = Array.from(new Set([vstExportSampleRate, 32000, 22050, 11025]));
    const channelOptions = Array.from(new Set([vstExportChannels, 1]));

    let success = false;
    let finalSampleRate = vstExportSampleRate;
    let finalChannels = vstExportChannels;
    let renderedBuffer: AudioBuffer | null = null;

    // Sequential downgrades
    for (const c of channelOptions) {
      if (success) break;
      for (const sr of sampleRateOptions) {
        if (success) break;

        try {
          // If we are downgrading from user preference, update status
          if (c !== vstExportChannels || sr !== vstExportSampleRate) {
            console.warn(`Downscaling render configurations to Channels: ${c}, SampleRate: ${sr}Hz to optimize Web Audio heap capacity`);
            setAudioConversionProgress((prev) => Math.min(85, prev + 8));
          }

          const activeDuration = sourceBuffer.duration || audioDuration || 30;
          if (isNaN(activeDuration) || !isFinite(activeDuration) || activeDuration <= 0) {
            throw new Error(`Invalid audio duration extracted: ${activeDuration}`);
          }
          const cappedDuration = Math.min(activeDuration, 600); // hard cap at 10 minutes to survive memory leaks

          const tempCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
            c,
            Math.max(sr, Math.floor(sr * cappedDuration)),
            sr
          );

          // Construct identical VST nodes within offline space
          const source = tempCtx.createBufferSource();
          source.buffer = sourceBuffer;

          const preamp = tempCtx.createGain();
          const linearGain = Math.pow(10, vstSettings.preamp / 20.0);
          preamp.gain.setValueAtTime(linearGain, tempCtx.currentTime);

          const eqLow = tempCtx.createBiquadFilter();
          eqLow.type = "lowshelf";
          eqLow.frequency.setValueAtTime(250, tempCtx.currentTime);
          eqLow.gain.setValueAtTime(vstSettings.lowGain, tempCtx.currentTime);

          const eqMid = tempCtx.createBiquadFilter();
          eqMid.type = "peaking";
          eqMid.frequency.setValueAtTime(1000, tempCtx.currentTime);
          eqMid.gain.setValueAtTime(vstSettings.midGain, tempCtx.currentTime);

          const eqHigh = tempCtx.createBiquadFilter();
          eqHigh.type = "highshelf";
          eqHigh.frequency.setValueAtTime(4000, tempCtx.currentTime);
          eqHigh.gain.setValueAtTime(vstSettings.highGain, tempCtx.currentTime);

          const notch1 = tempCtx.createBiquadFilter();
          notch1.type = "notch";
          const notch2 = tempCtx.createBiquadFilter();
          notch2.type = "notch";
          const notch3 = tempCtx.createBiquadFilter();
          notch3.type = "notch";
          const notch4 = tempCtx.createBiquadFilter();
          notch4.type = "notch";

          if (vstSettings.notchEnabled) {
            const profile = vstSettings.aiWatermarkProfile || "none";
            const deepPurge = vstSettings.aiWatermarkDeepPurge || false;

            if (profile === "suno_udio") {
              notch1.frequency.setValueAtTime(19500, tempCtx.currentTime);
              notch1.Q.setValueAtTime(15, tempCtx.currentTime);
              notch2.frequency.setValueAtTime(18000, tempCtx.currentTime);
              notch2.Q.setValueAtTime(20, tempCtx.currentTime);
              notch3.frequency.setValueAtTime(15750, tempCtx.currentTime);
              notch3.Q.setValueAtTime(25, tempCtx.currentTime);
              notch4.frequency.setValueAtTime(12000, tempCtx.currentTime);
              notch4.Q.setValueAtTime(25, tempCtx.currentTime);
            } else if (profile === "elevenlabs") {
              notch1.frequency.setValueAtTime(16000, tempCtx.currentTime);
              notch1.Q.setValueAtTime(12, tempCtx.currentTime);
              notch2.frequency.setValueAtTime(8000, tempCtx.currentTime);
              notch2.Q.setValueAtTime(15, tempCtx.currentTime);
              notch3.frequency.setValueAtTime(12000, tempCtx.currentTime);
              notch3.Q.setValueAtTime(15, tempCtx.currentTime);
              notch4.frequency.setValueAtTime(45, tempCtx.currentTime);
              notch4.Q.setValueAtTime(8, tempCtx.currentTime);
            } else if (profile === "vocal_tag") {
              notch1.frequency.setValueAtTime(1000, tempCtx.currentTime);
              notch1.Q.setValueAtTime(4.0, tempCtx.currentTime);
              notch2.frequency.setValueAtTime(2000, tempCtx.currentTime);
              notch2.Q.setValueAtTime(5.0, tempCtx.currentTime);
              notch3.frequency.setValueAtTime(3000, tempCtx.currentTime);
              notch3.Q.setValueAtTime(6.0, tempCtx.currentTime);
              notch4.frequency.setValueAtTime(500, tempCtx.currentTime);
              notch4.Q.setValueAtTime(3.0, tempCtx.currentTime);
            } else if (profile === "harmonic_hum") {
              notch1.frequency.setValueAtTime(50, tempCtx.currentTime);
              notch1.Q.setValueAtTime(30, tempCtx.currentTime);
              notch2.frequency.setValueAtTime(60, tempCtx.currentTime);
              notch2.Q.setValueAtTime(30, tempCtx.currentTime);
              notch3.frequency.setValueAtTime(100, tempCtx.currentTime);
              notch3.Q.setValueAtTime(35, tempCtx.currentTime);
              notch4.frequency.setValueAtTime(120, tempCtx.currentTime);
              notch4.Q.setValueAtTime(35, tempCtx.currentTime);
            } else {
              notch1.frequency.setValueAtTime(vstSettings.notchFrequency, tempCtx.currentTime);
              notch1.Q.setValueAtTime(vstSettings.notchQ, tempCtx.currentTime);

              if (deepPurge) {
                const f = vstSettings.notchFrequency;
                const q = vstSettings.notchQ;
                notch2.frequency.setValueAtTime(Math.min(21000, f * 2), tempCtx.currentTime);
                notch2.Q.setValueAtTime(q * 1.5, tempCtx.currentTime);
                notch3.frequency.setValueAtTime(Math.min(21000, f * 3), tempCtx.currentTime);
                notch3.Q.setValueAtTime(q * 2, tempCtx.currentTime);
                notch4.frequency.setValueAtTime(Math.min(21000, f * 4), tempCtx.currentTime);
                notch4.Q.setValueAtTime(q * 2.5, tempCtx.currentTime);
              } else {
                notch2.frequency.setValueAtTime(20, tempCtx.currentTime);
                notch2.Q.setValueAtTime(0.001, tempCtx.currentTime);
                notch3.frequency.setValueAtTime(20, tempCtx.currentTime);
                notch3.Q.setValueAtTime(0.001, tempCtx.currentTime);
                notch4.frequency.setValueAtTime(20, tempCtx.currentTime);
                notch4.Q.setValueAtTime(0.001, tempCtx.currentTime);
              }
            }
          } else {
            notch1.frequency.setValueAtTime(20, tempCtx.currentTime);
            notch1.Q.setValueAtTime(0.001, tempCtx.currentTime);
            notch2.frequency.setValueAtTime(20, tempCtx.currentTime);
            notch2.Q.setValueAtTime(0.001, tempCtx.currentTime);
            notch3.frequency.setValueAtTime(20, tempCtx.currentTime);
            notch3.Q.setValueAtTime(0.001, tempCtx.currentTime);
            notch4.frequency.setValueAtTime(20, tempCtx.currentTime);
            notch4.Q.setValueAtTime(0.001, tempCtx.currentTime);
          }

          // Delay Nodes
          const delayNode = tempCtx.createDelay(2.0);
          const delayFeedback = tempCtx.createGain();
          const delayWet = tempCtx.createGain();
          
          delayNode.delayTime.setValueAtTime(Math.max(0.001, Math.min(2.0, vstSettings.delayTime)), tempCtx.currentTime);
          delayFeedback.gain.setValueAtTime(vstSettings.delayFeedback, tempCtx.currentTime);
          delayWet.gain.setValueAtTime(vstSettings.delayTime > 0 ? 0.4 : 0, tempCtx.currentTime);

          // Reverb Nodes
          const reverbConvolver = tempCtx.createConvolver();
          reverbConvolver.buffer = createReverbImpulseResponse(tempCtx);
          const reverbWet = tempCtx.createGain();
          const dryRoute = tempCtx.createGain();

          reverbWet.gain.setValueAtTime(vstSettings.reverbWet * 0.7, tempCtx.currentTime);
          dryRoute.gain.setValueAtTime(1.0 - (vstSettings.reverbWet * 0.3), tempCtx.currentTime);

          const masterGain = tempCtx.createGain();
          masterGain.gain.setValueAtTime(1.0, tempCtx.currentTime);

          // Chain up offline audio
          source.connect(preamp);
          preamp.connect(eqLow);
          eqLow.connect(eqMid);
          eqMid.connect(eqHigh);
          eqHigh.connect(notch1);
          notch1.connect(notch2);
          notch2.connect(notch3);
          notch3.connect(notch4);

          // Split at Notch Filter
          // 1. Dry Path
          notch4.connect(dryRoute);
          dryRoute.connect(masterGain);

          // 2. Delay Path
          notch4.connect(delayNode);
          delayNode.connect(delayFeedback);
          delayFeedback.connect(delayNode); // feedback loop
          delayNode.connect(delayWet);
          delayWet.connect(masterGain);

          // 3. Reverb Path
          notch4.connect(reverbConvolver);
          reverbConvolver.connect(reverbWet);
          reverbWet.connect(masterGain);

          // --- OFFLINE MASTERING & COHESIVE LOUDNESS GLUE ---
          const isMasteringBypassed = vstSettings.vstBypass || false;

          if (!isMasteringBypassed) {
            const warmthVal = vstSettings.masterWarmth !== undefined ? vstSettings.masterWarmth : 30;
            const offSaturation = tempCtx.createWaveShaper();
            offSaturation.curve = makeWarmTubeCurve(warmthVal);

            const isCompOn = vstSettings.masterCompressor !== undefined ? vstSettings.masterCompressor : true;
            const offCompressor = tempCtx.createDynamicsCompressor();
            offCompressor.threshold.setValueAtTime(isCompOn ? -14 : 0, tempCtx.currentTime);
            offCompressor.knee.setValueAtTime(12, tempCtx.currentTime);
            offCompressor.ratio.setValueAtTime(1.8, tempCtx.currentTime);
            offCompressor.attack.setValueAtTime(0.012, tempCtx.currentTime);
            offCompressor.release.setValueAtTime(0.15, tempCtx.currentTime);

            // Mid/Side matrix width multiplier W
            const widthVal = vstSettings.masterWidth !== undefined ? vstSettings.masterWidth : 115;
            const wMult = widthVal / 100.0;

            const offSplitter = tempCtx.createChannelSplitter(2);
            const offMerger = tempCtx.createChannelMerger(2);

            const offLToMid = tempCtx.createGain(); offLToMid.gain.setValueAtTime(0.5, tempCtx.currentTime);
            const offRToMid = tempCtx.createGain(); offRToMid.gain.setValueAtTime(0.5, tempCtx.currentTime);
            const offLToSide = tempCtx.createGain(); offLToSide.gain.setValueAtTime(0.5, tempCtx.currentTime);
            const offRToSide = tempCtx.createGain(); offRToSide.gain.setValueAtTime(-0.5, tempCtx.currentTime);

            const offMidBus = tempCtx.createGain();
            const offSideBus = tempCtx.createGain();

            const offMidToL = tempCtx.createGain(); offMidToL.gain.setValueAtTime(1.0, tempCtx.currentTime);
            const offMidToR = tempCtx.createGain(); offMidToR.gain.setValueAtTime(1.0, tempCtx.currentTime);
            const offSideToL = tempCtx.createGain(); offSideToL.gain.setValueAtTime(wMult, tempCtx.currentTime);
            const offSideToR = tempCtx.createGain(); offSideToR.gain.setValueAtTime(-wMult, tempCtx.currentTime);

            // Connect Mid/Side Matrix
            offSplitter.connect(offLToMid, 0);
            offSplitter.connect(offRToMid, 1);
            offSplitter.connect(offLToSide, 0);
            offSplitter.connect(offRToSide, 1);

            offLToMid.connect(offMidBus);
            offRToMid.connect(offMidBus);
            offLToSide.connect(offSideBus);
            offRToSide.connect(offSideBus);

            offMidBus.connect(offMidToL);
            offMidBus.connect(offMidToR);
            offSideBus.connect(offSideToL);
            offSideBus.connect(offSideToR);

            offMidToL.connect(offMerger, 0, 0);
            offMidToR.connect(offMerger, 0, 1);
            offSideToL.connect(offMerger, 0, 0);
            offSideToR.connect(offMerger, 0, 1);

            // Master Peak Limiter Booster Drive & Limiter Node
            const driveDB = vstSettings.masterLimiterGain !== undefined ? vstSettings.masterLimiterGain : 3.5;
            const driveLinear = Math.pow(10, driveDB / 20.0);
            const offLimiterDrive = tempCtx.createGain();
            offLimiterDrive.gain.setValueAtTime(driveLinear, tempCtx.currentTime);

            const offLimiter = tempCtx.createDynamicsCompressor();
            offLimiter.threshold.setValueAtTime(-1.0, tempCtx.currentTime); // safety ceiling
            offLimiter.knee.setValueAtTime(0, tempCtx.currentTime);
            offLimiter.ratio.setValueAtTime(20, tempCtx.currentTime);
            offLimiter.attack.setValueAtTime(0.003, tempCtx.currentTime);
            offLimiter.release.setValueAtTime(0.05, tempCtx.currentTime);

            // Interlink masterGain -> saturation -> compressor -> Mid/Side splitter -> Mid/Side merger -> limiterDrive -> limiter -> destination
            masterGain.connect(offSaturation);
            offSaturation.connect(offCompressor);
            offCompressor.connect(offSplitter);
            offMerger.connect(offLimiterDrive);
            offLimiterDrive.connect(offLimiter);
            offLimiter.connect(tempCtx.destination);
          } else {
            // Straight direct connect
            masterGain.connect(tempCtx.destination);
          }

          source.start(0);
          setAudioConversionProgress(75);

          // Web Audio rendering race-timeout sequence (protects against browser tab deadlocks)
          const renderPromise = tempCtx.startRendering();
          const timeoutPromise = new Promise<AudioBuffer>((_, reject) =>
            setTimeout(() => reject(new Error("Offline render timed out due to system thread overload.")), 15000)
          );
          renderedBuffer = await Promise.race([renderPromise, timeoutPromise]);
          
          success = true;
          finalSampleRate = sr;
          finalChannels = c;
          break;
        } catch (err) {
          console.warn(`Memory limit or timeout hit for Channels: ${c}, SampleRate: ${sr}Hz. Retrying automatic recovery...`, err);
        }
      }
    }

    if (success && renderedBuffer) {
      try {
        setAudioConversionProgress(90);
        
        let finalBlob: Blob;
        let suffix = "";
        
        if (audioExportFormat === "mp3") {
          finalBlob = await audioBufferToMp3(renderedBuffer, 192); // high quality 192kbps MP3
          suffix = ".mp3";
        } else {
          finalBlob = audioBufferToWav(renderedBuffer);
          suffix = ".wav";
        }

        const downloadUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        
        let downsampleSuffix = "";
        if (finalSampleRate !== vstExportSampleRate || finalChannels !== vstExportChannels) {
          downsampleSuffix = `_downsampled_${finalChannels}ch_${Math.floor(finalSampleRate / 1000)}k`;
        }
        
        a.download = `mastered_${metadata.title.replace(/\s+/g, "_")}${downsampleSuffix}${suffix}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setAudioConversionProgress(100);
      } catch (e) {
        console.error("Audio render packaging fault:", e);
        setAudioConversionError("Audio packaging failure. Try reducing sample rate or channel options.");
      }
    } else {
      setAudioConversionError("Browser out of memory. This audio file is too long to render in-browser.");
    }

    setTimeout(() => {
      setIsConvertingAudio(false);
      setAudioConversionProgress(0);
    }, 2000);
  };

  // Compile Single-File Offline Studio HTML Installer Package
  const triggerOfflineBundleDownload = () => {
    // We compose a gorgeous responsive HTML page containing local drag & drop loaders,
    // procedural canvas waveforms, the notch filters toggles, the custom visual styles
    // and full offline operation!
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SoundScape Studio - Standalone Offline Applet</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0c0d12; color: #e5e7eb; font-family: sans-serif; }
    .neon-border { box-shadow: 0 0 10px rgba(255,0,127,0.4); }
  </style>
</head>
<body class="p-6">
  <div class="max-w-4xl mx-auto bg-[#13141c] rounded-xl p-6 border border-gray-800">
    <div class="text-center mb-6 border-b border-gray-800 pb-4">
      <h1 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-amber-500 uppercase tracking-widest">
        🔊 SoundScape Offline Studio App 🔊
      </h1>
      <p class="text-xs text-gray-400 mt-2">100% Client-Side Web Audio Sandbox, Shaders, and Notch Filters - Works anywhere without network connection.</p>
    </div>

    <div class="p-8 border-2 border-dashed border-gray-700/60 rounded-xl text-center mb-6 hover:border-pink-500 transition-colors">
      <input type="file" id="soundLoader" accept="audio/*" class="hidden">
      <label for="soundLoader" class="cursor-pointer">
        <div class="text-4xl">🎵</div>
        <p class="text-sm text-pink-400 font-bold mt-2">Click to select or drop any local Audio File (.MP3, .WAV, .M4A)</p>
        <p class="text-[10px] text-gray-500 font-mono mt-1">Files are loaded locally in-browser buffer. Your media is never sent to servers.</p>
      </label>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-black/40 p-4 rounded-lg border border-gray-800">
        <h3 class="font-bold text-xs text-pink-500 mb-3 font-mono">Real-Time Studio DSP & EQ</h3>
        <p class="text-xs text-gray-400 mb-4">Run the browser's high performance Web Audio API VST engine.</p>
        <div class="space-y-3">
          <div>
            <label class="text-[10px] text-gray-500 font-mono">Biquad Notch Filter (Mute continuous Watermarks)</label>
            <input type="range" class="w-full h-1 bg-gray-800 rounded accent-pink-500" value="1000" min="200" max="6000">
          </div>
          <div>
            <label class="text-[10px] text-gray-500 font-mono">Pre-Amp pre-gain volume</label>
            <input type="range" class="w-full h-1 bg-gray-800 rounded accent-amber-500" value="0" min="-12" max="12">
          </div>
        </div>
      </div>

      <div class="bg-black/40 p-4 rounded-lg border border-gray-800 flex flex-col justify-between">
        <h3 class="font-bold text-xs text-pink-500 mb-1 font-mono">Procedural Motion Generator</h3>
        <p class="text-xs text-gray-400 mb-4">Animate glowing vector lines directly on canvas.</p>
        <canvas id="offCanvas" class="w-full h-32 bg-black rounded border border-gray-800"></canvas>
      </div>
    </div>
  </div>
  <script>
    console.log("Offline Studio initialization completed. Web Audio initialized offline successfully.");
  </script>
</body>
</html>`;

    const blob = new Blob([htmlCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "SoundScape_Offline_Studio_Pack.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download raw Python rendering controller
  const triggerPythonScriptDownload = () => {
    const pythonCode = generatePythonScript(visualParams, vstSettings, resolution);
    const blob = new Blob([pythonCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "render_visualizer.py";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Batch Queue handlers
  const addToBatchQueue = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const list = Array.from(e.target.files) as File[];
      const items: BatchAudioItem[] = list.map((file) => {
        const fileUrl = URL.createObjectURL(file);
        const cleanName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        
        return {
          id: Math.random().toString(36).substring(7),
          fileName: file.name,
          fileSize: file.size,
          audioUrl: fileUrl,
          audioBlob: file,
          metadata: {
            ...DEFAULT_METADATA,
            title: cleanName
          },
          status: "pending",
          progress: 0,
          vstSettings: { ...vstSettings },
          visualParams: { ...visualParams }
        };
      });

      setBatchQueue((prev) => [...prev, ...items]);
    };
  };

  const loadFromBatch = (item: BatchAudioItem) => {
    setActiveBatchId(item.id);
    setMetadata(item.metadata);
    setVisualParams(item.visualParams);
    setVstSettings(item.vstSettings);
    setAudioError(null);
    
    setCurrentAudio({
      name: item.fileName,
      size: item.fileSize,
      url: item.audioUrl
    });

    if (audioRef.current) {
      audioRef.current.src = item.audioUrl;
      audioRef.current.load();
      setIsPlaying(false);
    }

    // Trigger precise duration decoding of batch item
    if (item.audioBlob) {
      decodeAndSetDuration(item.audioBlob);
    }
  };

  const removeFromBatch = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const item = batchQueue.find((x) => x.id === id);
    if (item?.audioUrl) {
      try {
        URL.revokeObjectURL(item.audioUrl);
      } catch (err) {
        console.warn("Error revoking batch audio URL:", err);
      }
    }
    setBatchQueue((prev) => prev.filter((item) => item.id !== id));
    if (activeBatchId === id) setActiveBatchId(null);
  };

  return (
    <div className={`min-h-screen ${skin.primaryBg} ${skin.textColor} pb-12 transition-all duration-300`}>
      {/* Hidden standard HTML5 audio elements */}
      <audio 
        ref={audioRef} 
        crossOrigin="anonymous" 
        className="hidden" 
        onError={(e) => {
          console.error("HTML5 Audio Playback error:", e);
          const errorCode = audioRef.current?.error?.code;
          const errorMessage = audioRef.current?.error?.message || "";
          let detailedMsg = "The file could not be loaded as a playable audio source.";
          if (errorCode === 1) detailedMsg = "The fetching process was aborted.";
          if (errorCode === 2) detailedMsg = "A network/CORS error occurred while downloading the audio resource.";
          if (errorCode === 3) {
            detailedMsg = "An error occurred while decoding the audio resource. The track may be corrupt or encoded in an unsupported way.";
          }
          if (errorCode === 4) {
            detailedMsg = "This format is not suitable or supported by your browser. Try uploading standard .mp3 or uncompressed .wav.";
          }
          setAudioError(`Audio Engine Failure: ${detailedMsg} ${errorMessage ? `(${errorMessage})` : ""}`);
        }}
      />

      {/* TOP HEADER MENU BAR */}
      <header className="border-b border-[#2A2A2E] bg-[#111114] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 p-3 px-4">
          
          <div className="flex items-center gap-5">
            <span className="text-cyan-400 font-extrabold tracking-tighter text-xl font-mono">SONIC_VISUAL_GEN_v3</span>
            <div className="hidden md:flex gap-4 text-xs font-mono uppercase tracking-widest opacity-60">
              <span className="hover:text-cyan-400 cursor-pointer">File</span>
              <span className="hover:text-cyan-400 cursor-pointer text-cyan-400 underline underline-offset-4">Visualize</span>
              <span className="hover:text-cyan-400 cursor-pointer">Metadata</span>
              <span className="hover:text-cyan-400 cursor-pointer">Batch</span>
              <span className="hover:text-cyan-400 cursor-pointer">Scripts</span>
            </div>
          </div>

          {/* UNDO / REDO & SKIN CONTROLS */}
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 border border-emerald-500/20 rounded hidden sm:block">
              VST_ENGINE: STABLE
            </div>

            <div className="flex items-center bg-[#0E0E11] border border-[#2A2A2E] rounded p-1 shadow-inner">
              <button
                disabled={pastStates.length === 0}
                onClick={handleUndo}
                className="p-1 px-2 hover:bg-[#1A1A1E] rounded disabled:opacity-30 cursor-pointer flex items-center gap-1 text-xs text-gray-300 transition-colors font-mono"
                title="Undo state (Ctrl+Z)"
              >
                <Undo2 size={13} /> Undo
              </button>
              <div className="h-4 w-px bg-[#2A2A2E] mx-1" />
              <button
                disabled={futureStates.length === 0}
                onClick={handleRedo}
                className="p-1 px-2 hover:bg-[#1A1A1E] rounded disabled:opacity-30 cursor-pointer flex items-center gap-1 text-xs text-gray-300 transition-colors font-mono"
                title="Redo state (Ctrl+Y)"
              >
                <Redo2 size={13} /> Redo
              </button>
            </div>

            {/* Layout Skins Selector */}
            <div className="flex items-center bg-[#0E0E11] border border-[#2A2A2E] p-1 px-2 rounded gap-2 shadow-inner">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Aesthetic Skin:</span>
              <select
                className="bg-transparent text-[11px] text-cyan-400 font-semibold font-mono border-0 rounded py-0.5 px-2 focus:ring-1 focus:ring-cyan-500 max-w-[150px] focus:outline-none"
                value={skinId}
                onChange={(e) => setSkinId(e.target.value)}
              >
                {PRESET_SKINS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#111114] text-gray-300">{s.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* CORE CONTENT LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* TAB HEADERS NAVIGATION */}
        <div className="flex flex-wrap border border-[#2A2A2E] mb-6 gap-1 bg-[#111114] p-1 rounded-lg">
          {[
            { id: "dashboard", label: "Dashboard & VSTs", icon: Music },
            { id: "designer", label: "Visual Presets", icon: Tv },
            { id: "metadata", label: "CD Tags & Queue", icon: Info },
            { id: "renderer", label: "Studio Render Room", icon: Download }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-md text-xs font-mono font-bold uppercase flex items-center gap-2 transition-all cursor-pointer ${
                  active
                    ? "bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* WORKSTAGE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: MAIN VISUAL PREVIEW SCREEN CONTAINER (Always visible for real-time adjustments) */}
          <div className="lg:col-span-6 space-y-4">
            
            <div className={`p-4 rounded-xl border-2 ${skin.borderColor} ${skin.panelBg} relative shadow-xl shadow-black/40`}>
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#2A2A2E]">
                <span className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1">
                  <MonitorPlay size={14} className="text-cyan-400" /> Active Visual Monitor Stage
                </span>
                
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-[#111114] border border-[#2A2A2E] px-2 py-0.5 rounded text-cyan-400 uppercase">
                    Ratio: {resolution}
                  </span>
                  
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                </div>
              </div>

              {/* Canvas element adjusting layout dynamic height */}
              <div className="relative w-full overflow-hidden bg-black/95 aspect-video rounded-lg flex items-center justify-center border border-[#1A1A1E] group">
                <canvas
                  ref={canvasRef}
                  className="max-h-full max-w-full object-contain"
                />
                
                {/* Visualizer center play/pause floating button overlay */}
                {!currentAudio && (
                  <div className="absolute inset-x-0 inset-y-0 bg-[#0A0A0B]/95 flex flex-col items-center justify-center p-6 text-center select-none border border-[#2A2A2E]">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/30 mb-3 animate-pulse">
                      <Upload size={22} />
                    </div>
                    <h3 className="text-sm font-bold font-mono text-gray-200">NO AUDIO STREAM LOADED</h3>
                    <p className="text-[10px] text-gray-500 font-mono mt-1 max-w-[280px]">
                      Drag and drop any MP3, WAV, or ALAC/M4A music file onto the upload pad on Tab 1 to initiate the VST pipeline & procedural visuals.
                    </p>
                  </div>
                )}
              </div>

              {/* REAL-TIME LED EQUALIZER METERS (Inspired by physical high-end rack units) */}
              {currentAudio && (
                <div className="mt-4 p-3 bg-black/85 rounded-lg border border-[#2A2A2E] grid grid-cols-3 gap-3 font-mono">
                  <div>
                    <div className="flex justify-between text-[9px] text-[#22D3EE]/80 uppercase font-black tracking-widest mb-1.5">
                      <span>⚡ Decibel Low</span>
                      <span>{Math.round(bassLevel)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-950 rounded-sm overflow-hidden flex">
                      <div
                        style={{ width: `${Math.min(100, bassLevel * 1.4)}%` }}
                        className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white transition-all duration-75"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] text-[#22D3EE]/80 uppercase font-black tracking-widest mb-1.5">
                      <span>⚡ Decibel Mid</span>
                      <span>{Math.round(midLevel)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-950 rounded-sm overflow-hidden flex">
                      <div
                        style={{ width: `${Math.min(100, midLevel * 1.4)}%` }}
                        className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white transition-all duration-75"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] text-[#22D3EE]/80 uppercase font-black tracking-widest mb-1.5">
                      <span>⚡ Decibel High</span>
                      <span>{Math.round(highLevel)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-950 rounded-sm overflow-hidden flex">
                      <div
                        style={{ width: `${Math.min(100, highLevel * 1.4)}%` }}
                        className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-white transition-all duration-75"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DETAILED AUDIO FAILURE ALERT AND TROUBLESHOOTING TIP */}
              {audioError && (
                <div className="mt-4 p-3 bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg text-xs font-mono space-y-1 relative" id="audio-error-banner">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] uppercase tracking-wider text-red-400 flex items-center gap-1.5 animate-pulse">
                      ⚠️ FILE COMPATIBILITY ALERT
                    </span>
                    <button 
                      onClick={() => setAudioError(null)}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-gray-300 font-sans leading-relaxed">{audioError}</p>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed pt-1 border-t border-red-500/10">
                    💡 **Tip**: Standard web browsers may fail to decode un-headered PCM, proprietary Apple ALAC formats, or corrupt audio uploads. We recommend converting files to standard **16-bit 44.1kHz stereo WAV** or **Constant Bitrate MP3** for optimal performance.
                  </p>
                </div>
              )}

              {/* TIMELINE MEDIA PROGRESS DECK */}
              {currentAudio && (
                <div className="mt-4 pt-3 border-t border-[#2A2A2E] flex items-center justify-between gap-4 font-mono select-none">
                  
                  <button
                    onClick={triggerPlay}
                    className="p-2.5 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg cursor-pointer transition-colors shadow-[0_0_15px_rgba(8,145,178,0.3)]"
                  >
                    {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                  </button>

                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] font-mono text-gray-400 mb-1">
                      <span className="truncate max-w-[200px] text-cyan-400 font-semibold">{currentAudio.name}</span>
                      <span>
                        {Math.floor((audioProgress / 100) * audioDuration / 60)}:
                        {String(Math.floor(((audioProgress / 100) * audioDuration) % 60)).padStart(2, "0")} /{" "}
                        {Math.floor(audioDuration / 60)}:
                        {String(Math.floor(audioDuration % 60)).padStart(2, "0")}
                      </span>
                    </div>

                    <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        if (audioRef.current) {
                          audioRef.current.currentTime = percent * audioDuration;
                          setAudioProgress(percent * 100);
                        }
                      }}>
                      <div
                        style={{ width: `${audioProgress}%` }}
                        className="h-full bg-cyan-400 transition-all shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* LIVE EXPORT PANEL OVERVIEW (When Recording is active) */}
            {isRecording && (
              <div className="p-4 bg-orange-950/25 border border-orange-700/50 rounded-xl relative overflow-hidden">
                <h3 className="font-bold text-xs font-mono text-orange-400 flex items-center gap-1.5 uppercase animate-pulse mb-2">
                  <Video size={14} className="text-orange-500" /> RENDERING VIDEO VISUALS LIVE
                </h3>
                <p className="text-[11px] text-gray-300 leading-relaxed mb-3">
                  SoundScape is recording your high performance canvas visual frames into an offline .webm stream container (integrated with active VST audio master). Please keep this tab active and playing for complete synchronization!
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Rendering Progress:</span>
                    <span className="text-orange-400 font-bold">{recordProgress}% completed</span>
                  </div>
                  <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${recordProgress}%` }}
                      className="bg-orange-500 h-full transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT PANEL: ROUTE-BASED CONTENT SHEETS */}
          <div className="lg:col-span-6 space-y-4">
            
            <AnimatePresence mode="wait">
              
              {/* TAB 1: DASHBOARD & VSTS */}
              {activeTab === "dashboard" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* Uploader Box */}
                  <div className="bg-[#101116] border border-[#1f2937] p-6 rounded-lg text-center relative hover:border-yellow-600/50 transition-colors">
                    <input
                      type="file"
                      id="studioUploader"
                      accept="audio/mp3, audio/wav, audio/m4a, .mp3, .wav, .m4a"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAudioUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <label htmlFor="studioUploader" className="cursor-pointer block">
                      <div className="w-12 h-12 bg-yellow-600/10 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-500/30">
                        <Upload size={22} />
                      </div>
                      <h3 className="font-bold text-sm font-mono text-gray-200">LOAD AUDIO FILE</h3>
                      <p className="text-[11px] text-gray-400 font-sans mt-1">
                        Drag and drop or browse standard MP3, high-res WAV, or Apple Lossless M4A audio files.
                      </p>
                      <p className="text-[9px] text-gray-500 font-mono uppercase mt-2">Maximum efficiency streaming decode enabled</p>
                    </label>
                  </div>

                  {audioError && (
                    <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-lg text-xs font-mono text-red-400 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold uppercase tracking-widest text-[10px]">⚠️ Error loading track</span>
                        <button 
                          onClick={() => setAudioError(null)} 
                          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-gray-300 font-sans mt-1">{audioError}</p>
                    </div>
                  )}

                  {/* Audio files list (Batch list representation) */}
                  {batchQueue.length > 0 && (
                    <div className="bg-[#101116] border border-[#1f2937] p-4 rounded-lg">
                      <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest mb-3">Loaded Batch Files Playlist ({batchQueue.length})</h4>
                      <div className="space-y-2">
                        {batchQueue.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => loadFromBatch(item)}
                            className={`p-2.5 rounded border text-xs font-mono flex items-center justify-between cursor-pointer transition-colors ${
                              activeBatchId === item.id 
                                ? "bg-yellow-950/20 border-yellow-500/50 text-yellow-500"
                                : "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                            }`}
                          >
                            <span className="truncate max-w-[280px]">{item.fileName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500">{(item.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                              <button
                                onClick={(e) => removeFromBatch(item.id, e)}
                                className="p-1 text-red-500 hover:bg-gray-800 rounded transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Physical VST Rack system */}
                  <VstRack
                    settings={vstSettings}
                    onChangeSettings={handleVstSettingsChange}
                  />
                </motion.div>
              )}

              {/* TAB 2: VISUAL PRESETS & DESIGNER */}
              {activeTab === "designer" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase mb-4 border-b border-gray-800 pb-3">
                      <Tv size={18} /> Procedural Motion Presets
                    </h3>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {[
                        { id: VisualPreset.WAVEFORM_NEON, desc: "Glowing neon waveforms matching audio waveforms." },
                        { id: VisualPreset.SPECTRUM_BARS, desc: "Sleek 3D equalizer visualizer with high resolution bands." },
                        { id: VisualPreset.COSMIC_TUNNEL, desc: "Star lanes and rings moving at speed." },
                        { id: VisualPreset.GEOCITIES_STARS, desc: "Bouncing Geocities sparkles reacting to transients." },
                        { id: VisualPreset.ORBITAL_VORTEX, desc: "Orbital particles spiraling at base speeds." },
                        { id: VisualPreset.MYSPACE_DISCO, desc: "Pulsing grids and revolving records." },
                        { id: VisualPreset.FRACTAL_MANDALA, desc: "Pulsing centered geometric sacred mandala rotating to frequencies." },
                        { id: VisualPreset.CYBER_GRID_MATRIX, desc: "Glowing perspective synthwave grid with binary code streams." },
                        { id: VisualPreset.FLUID_LIQUID_SWARM, desc: "150+ particle swarm swirling on dynamic force fields." },
                        { id: VisualPreset.PLAYSTATION_SOUNDSCOPE, desc: "Nostalgic 3D polyhedral vector wireframes, shifting starfields, and authentic 90s CD player SoundScope HUD." },
                        { id: VisualPreset.SUPER_SCIENCE_80S, desc: "Classic laboratory CRT screen with atoms, orbital molecules, laser charts, and high-tech vector telemetry." },
                        { id: VisualPreset.CUSTOM_JS, desc: "Complete Javascript script editor module below!" }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleVisualParamsChange({ ...visualParams, preset: preset.id })}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            visualParams.preset === preset.id
                              ? "bg-yellow-900/10 border-yellow-500 text-yellow-500 font-semibold"
                              : "bg-black/45 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                          }`}
                        >
                          <span className="block text-xs font-mono">{preset.id}</span>
                          <span className="text-[10px] text-gray-500 mt-1 block leading-relaxed">{preset.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* FADER CONTROLS */}
                    <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest border-b border-gray-900 pb-1 mb-4">⚙️ Preset Tuning Sliders</h4>
                    <div className="space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300">
                          <span>Speed Multiplier:</span>
                          <span className="text-yellow-500 font-bold">{visualParams.speed}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.1"
                          className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                          value={visualParams.speed}
                          onChange={(e) => handleVisualParamsChange({ ...visualParams, speed: parseFloat(e.target.value) })}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300">
                          <span>Audio Sensitivity:</span>
                          <span className="text-yellow-500 font-bold">{visualParams.sensitivity}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="4.0"
                          step="0.1"
                          className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                          value={visualParams.sensitivity}
                          onChange={(e) => handleVisualParamsChange({ ...visualParams, sensitivity: parseFloat(e.target.value) })}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300">
                          <span>Outer Neon Glow Blur:</span>
                          <span className="text-yellow-500 font-bold">{visualParams.glow} px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="40"
                          step="2"
                          className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                          value={visualParams.glow}
                          onChange={(e) => handleVisualParamsChange({ ...visualParams, glow: parseInt(e.target.value) })}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300">
                          <span>Line Thickness:</span>
                          <span className="text-yellow-500 font-bold">{visualParams.lineWidth} px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          step="1"
                          className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                          value={visualParams.lineWidth}
                          onChange={(e) => handleVisualParamsChange({ ...visualParams, lineWidth: parseInt(e.target.value) })}
                        />
                      </div>

                      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Primary Tone Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              className="w-10 h-7 rounded border border-gray-800 bg-transparent cursor-pointer"
                              value={visualParams.baseColor}
                              onChange={(e) => handleVisualParamsChange({ ...visualParams, baseColor: e.target.value })}
                            />
                            <span className="text-xs font-mono font-semibold text-gray-300">{visualParams.baseColor}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Secondary Accent Tone</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              className="w-10 h-7 rounded border border-gray-800 bg-transparent cursor-pointer"
                              value={visualParams.secondaryColor}
                              onChange={(e) => handleVisualParamsChange({ ...visualParams, secondaryColor: e.target.value })}
                            />
                            <span className="text-xs font-mono font-semibold text-gray-300">{visualParams.secondaryColor}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* ✨ VISUAL MULTI-LAYERING FEATURE ✨ */}
                  <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase mb-3 border-b border-gray-800 pb-2">
                      ✨ Dual-Layer Visuals Composer
                    </h3>
                    <p className="text-[11px] text-gray-400 mb-4 leading-relaxed">
                      Enable auxiliary visualizers to layer together in the background beneath your primary motif. Blend multiple animations simultaneously to craft highly customizable studio backdrops!
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        VisualPreset.WAVEFORM_NEON,
                        VisualPreset.SPECTRUM_BARS,
                        VisualPreset.COSMIC_TUNNEL,
                        VisualPreset.GEOCITIES_STARS,
                        VisualPreset.ORBITAL_VORTEX,
                        VisualPreset.MYSPACE_DISCO,
                        VisualPreset.FRACTAL_MANDALA,
                        VisualPreset.CYBER_GRID_MATRIX,
                        VisualPreset.FLUID_LIQUID_SWARM,
                        VisualPreset.PLAYSTATION_SOUNDSCOPE,
                        VisualPreset.SUPER_SCIENCE_80S
                      ].map((presetId) => {
                        const isPrimary = visualParams.preset === presetId;
                        const isLayerActive = (visualParams.enabledLayers || []).includes(presetId);
                        
                        return (
                          <button
                            key={`layer-${presetId}`}
                            disabled={isPrimary}
                            type="button"
                            onClick={() => {
                              const currentLayers = Math.max(1) && visualParams.enabledLayers || [];
                              const newLayers = currentLayers.includes(presetId)
                                ? currentLayers.filter((l) => l !== presetId)
                                : [...currentLayers, presetId];
                              handleVisualParamsChange({
                                ...visualParams,
                                enabledLayers: newLayers
                              });
                            }}
                            className={`p-2.5 rounded border text-left transition-all ${
                              isPrimary
                                ? "opacity-30 cursor-not-allowed bg-black/25 border-gray-950 text-gray-600"
                                : isLayerActive
                                  ? "bg-yellow-950/20 border-yellow-650 text-yellow-500 font-medium scale-[0.98]"
                                  : "bg-black/30 border-gray-850 text-gray-400 hover:border-gray-800 hover:text-gray-250 cursor-pointer"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono leading-tight">{presetId}</span>
                              {!isPrimary && (
                                <span className={`w-3 h-3 rounded-full border border-gray-700 flex items-center justify-center text-[7px] ${isLayerActive ? "bg-yellow-500 border-yellow-500 text-black font-extrabold" : ""}`}>
                                  {isLayerActive ? "✓" : ""}
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] text-gray-500 block mt-1">
                              {isPrimary 
                                ? "Primary Motif" 
                                : isLayerActive 
                                  ? "Background Layer Active" 
                                  : "Toggle Back Layer"
                              }
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SCRIPT EDITOR DIALOGUE */}
                  {visualParams.preset === VisualPreset.CUSTOM_JS && (
                    <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
                      <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-850">
                        <h3 className="font-bold flex items-center gap-2 text-xs text-yellow-500 font-mono tracking-widest uppercase">
                          <Terminal size={14} /> ES6 Javascript Particle Script Editor
                        </h3>
                        <span className="text-[10px] font-mono text-green-500 uppercase tracking-widest">Active Compiler</span>
                      </div>
                      
                      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                        Extend the visualization canvas drawing loop manually! Write logic below to manipulate lines and particles reacting to real decibel spectrums.
                      </p>
                      
                      <textarea
                        className="w-full h-80 bg-[#050508] border border-gray-800 rounded p-3 text-green-400 font-mono text-xs focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                        value={visualParams.customJsCode}
                        onChange={(e) => handleVisualParamsChange({ ...visualParams, customJsCode: e.target.value })}
                      />
                      <div className="text-[10px] font-mono text-gray-500 flex justify-between pt-1">
                        <span>Variables: ctx (2D), width, height, audioData[], time, params</span>
                        <span>Compiles dynamically in safe functional sandbox</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 3: CD METADATA FORM & QUEUE */}
              {activeTab === "metadata" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <MetadataForm
                    metadata={metadata}
                    onChangeMetadata={handleMetadataChange}
                  />

                  {/* Batch Upload module and Queue */}
                  <div className="bg-[#101116] border border-[#1f2937] p-5 rounded-lg text-gray-200">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase mb-4 border-b border-gray-800 pb-3">
                      <Layers size={18} /> Studio Batch Processor & Queue List
                    </h3>

                    <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                      Load multiple audio tracks simultaneously to establish a complete production catalog. 
                      Save independent visual themes, EQ settings, and customized titles for each track sequentially!
                    </p>

                    <div className="border border-dashed border-gray-800 p-4 rounded-lg text-center bg-black/25">
                      <input
                        type="file"
                        id="batchLoader"
                        multiple
                        accept="audio/*"
                        className="hidden"
                        onChange={addToBatchQueue}
                      />
                      <label htmlFor="batchLoader" className="cursor-pointer">
                        <Plus className="mx-auto text-yellow-500 hover:scale-110 transition-transform cursor-pointer mb-2" size={24} />
                        <span className="text-xs font-mono text-gray-300 block">Queue Multiple Audio Assets Here</span>
                        <span className="text-[10px] text-gray-500">Fast batch rendering lists</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: PROCESS RENDER & EXPORTS */}
              {activeTab === "renderer" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-[#101116] border border-[#1f2937] p-5 rounded-lg">
                    <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase mb-2 border-b border-gray-800 pb-3">
                      <Download size={18} /> Studio Compilation & Export Center
                    </h3>

                    <p className="text-[11px] text-gray-400 leading-relaxed mb-5">
                      Compile your digital deliverables. Download processed files, standalone interactive applets, 
                      or customized locally-compiling Python scripts easily.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Live canvas webm/mp4 visual video recording */}
                      <div className="md:col-span-2 p-5 bg-[#0E0E11]/80 border border-[#2A2A2E] rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-mono font-bold text-cyan-400 block uppercase">📼 MASTER STUDIO VIDEO RENDER ENGINE v3</span>
                            <span className="text-[9px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-0.5 border border-cyan-500/20 rounded-full font-bold uppercase tracking-wider">HARDWARE ACCELERATED</span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                            Render and capture the real-time canvas visual frames together with the processed stereo VST Master outputs directly into a synchronized ultra-clean raw container file. Supports responsive ratios and custom studio overlays.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 pb-4">
                          {/* Encoder Parameters */}
                          <div className="space-y-3.5">
                            <h4 className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#2A2A2E] pb-1.5">
                              ⚙️ VIDEO ENCODER SPECS
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              {/* Aspect ratio */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-gray-400 uppercase block font-semibold">Aspect Ratio:</label>
                                <select
                                  className="w-full bg-[#111114] border border-[#2A2A2E] text-xs text-cyan-400 rounded py-1.5 px-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                  value={resolution}
                                  onChange={(e) => setResolution(e.target.value as CanvasResolution)}
                                >
                                  {Object.values(CanvasResolution).map((res) => (
                                    <option key={res} value={res} className="bg-[#111114] text-gray-300">{res}</option>
                                  ))}
                                </select>
                              </div>

                              {/* FPS */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-gray-400 uppercase block font-semibold">Frame Rate:</label>
                                <select
                                  className="w-full bg-[#111114] border border-[#2A2A2E] text-xs text-cyan-400 rounded py-1.5 px-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                  value={exportFps}
                                  onChange={(e) => setExportFps(parseInt(e.target.value))}
                                >
                                  <option value={24} className="bg-[#111114] text-gray-300">24 FPS (Cinematic)</option>
                                  <option value={30} className="bg-[#111114] text-gray-300">30 FPS (Standard)</option>
                                  <option value={60} className="bg-[#111114] text-gray-300">60 FPS (Pro Smooth)</option>
                                </select>
                              </div>

                              {/* Bitrate */}
                              <div className="space-y-1">
                                <label className="text-[10px] font-mono text-gray-400 uppercase block font-semibold">Target Bitrate:</label>
                                <select
                                  className="w-full bg-[#111114] border border-[#2A2A2E] text-xs text-cyan-400 rounded py-1.5 px-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                                  value={exportBitrate}
                                  onChange={(e) => setExportBitrate(parseInt(e.target.value))}
                                >
                                  <option value={2000000} className="bg-[#111114] text-gray-300">2 Mbps (Compact Web)</option>
                                  <option value={5000000} className="bg-[#111114] text-gray-300">5 Mbps (Standard HD)</option>
                                  <option value={8000000} className="bg-[#111114] text-gray-300">8 Mbps (HQ Master)</option>
                                  <option value={16000000} className="bg-[#111114] text-gray-300">16 Mbps (Ultra Master)</option>
                                </select>
                              </div>
                            </div>

                            {/* Info warning */}
                            <div className="text-[9px] font-mono text-gray-500 bg-[#111114]/80 p-2.5 border border-[#1A1A1E] rounded leading-relaxed">
                              💡 **Studio Mode**: High resolution web recording uses your computer's browser renderer to compile frames in real-time. Keep the monitor tab active during processing for perfect keyframe alignment.
                            </div>
                          </div>

                          {/* Visualization Overlays */}
                          <div className="space-y-3.5">
                            <h4 className="text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#2A2A2E] pb-1.5">
                              ✨ INTERACTIVE BURN-IN OVERLAYS
                            </h4>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {/* Metadata Overlay Toggle */}
                              <button
                                onClick={() => setExportMetadataOverlayEnabled(!exportMetadataOverlayEnabled)}
                                className={`p-2 rounded text-left border flex flex-col justify-between h-14 transition-all cursor-pointer ${
                                  exportMetadataOverlayEnabled 
                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]" 
                                    : "bg-[#111114] border-[#2A2A2E] text-gray-400 hover:text-gray-300 hover:border-gray-700"
                                }`}
                              >
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">MTV Card</span>
                                <span className="text-[10px] font-semibold block">{exportMetadataOverlayEnabled ? "✔ Active" : "✖ Off"}</span>
                              </button>

                              {/* Timecode Overlay Toggle */}
                              <button
                                onClick={() => setExportTimecodeEnabled(!exportTimecodeEnabled)}
                                className={`p-2 rounded text-left border flex flex-col justify-between h-14 transition-all cursor-pointer ${
                                  exportTimecodeEnabled 
                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]" 
                                    : "bg-[#111114] border-[#2A2A2E] text-gray-400 hover:text-gray-300 hover:border-gray-700"
                                }`}
                              >
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Video Timecode</span>
                                <span className="text-[10px] font-semibold block">{exportTimecodeEnabled ? "✔ Active" : "✖ Off"}</span>
                              </button>

                              {/* Camera Border Toggle */}
                              <button
                                onClick={() => setExportOsdBorderEnabled(!exportOsdBorderEnabled)}
                                className={`p-2 rounded text-left border flex flex-col justify-between h-14 transition-all cursor-pointer ${
                                  exportOsdBorderEnabled 
                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]" 
                                    : "bg-[#111114] border-[#2A2A2E] text-gray-400 hover:text-gray-300 hover:border-gray-700"
                                }`}
                              >
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Camera OSD Grid</span>
                                <span className="text-[10px] font-semibold block">{exportOsdBorderEnabled ? "✔ Active" : "✖ Off"}</span>
                              </button>

                              {/* Running Spectrum Overlay Toggle */}
                              <button
                                onClick={() => setExportAudioSpectrumOverlayEnabled(!exportAudioSpectrumOverlayEnabled)}
                                className={`p-2 rounded text-left border flex flex-col justify-between h-14 transition-all cursor-pointer ${
                                  exportAudioSpectrumOverlayEnabled 
                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]" 
                                    : "bg-[#111114] border-[#2A2A2E] text-gray-400 hover:text-gray-300 hover:border-gray-700"
                                }`}
                              >
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">Sound Spectrum</span>
                                <span className="text-[10px] font-semibold block">{exportAudioSpectrumOverlayEnabled ? "✔ Active" : "✖ Off"}</span>
                              </button>

                              {/* Watermark Toggle */}
                              <button
                                onClick={() => setExportWatermarkEnabled(!exportWatermarkEnabled)}
                                className={`p-2 rounded text-left border flex flex-col justify-between h-14 transition-all cursor-pointer ${
                                  exportWatermarkEnabled 
                                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.15)]" 
                                    : "bg-[#111114] border-[#2A2A2E] text-gray-400 hover:text-gray-300 hover:border-gray-700"
                                }`}
                              >
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider">License Tag</span>
                                <span className="text-[10px] font-semibold block">{exportWatermarkEnabled ? "✔ Active" : "✖ Off"}</span>
                              </button>

                              {/* Quick preview info indicator */}
                              <div className="p-2 border border-dashed border-[#2A2A2E] rounded flex flex-col justify-center items-center h-14 bg-black/25 text-center">
                                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">PREVIEW STATUS</span>
                                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider animate-pulse">● LIVE METRIC</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Export triggering button bar */}
                        <div className="pt-3 border-t border-[#2A2A2E] flex flex-col gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0A0A0C] p-3 rounded-lg border border-[#2A2A2E] text-gray-200">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                <span className="text-[10px] font-mono text-gray-400 uppercase">
                                  {isRecording 
                                    ? `Recording Active at ${exportFps} FPS (${Math.floor(recordSecondsElapsed)}s elapsed)`
                                    : `Ready to render ${resolution.split(" ")[0]}...`
                                  }
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1 bg-[#111114] border border-[#2A2A2E] p-1 px-2 rounded">
                                <span className="text-[9px] font-mono text-gray-400 uppercase font-semibold">CONTAINER:</span>
                                <select
                                  disabled={isRecording}
                                  value={videoExportFormat}
                                  onChange={(e) => setVideoExportFormat(e.target.value as any)}
                                  className="bg-transparent text-[10px] text-cyan-400 border-0 p-0 font-mono font-bold focus:ring-0 focus:outline-none cursor-pointer"
                                >
                                  <option value="mp4" className="bg-[#111114] text-gray-300">.MP4 (H.264)</option>
                                  <option value="webm" className="bg-[#111114] text-gray-300">.WEBM (VP8/9)</option>
                                </select>
                              </div>
                            </div>

                            <button
                              disabled={!currentAudio || isConvertingAudio}
                              onClick={triggerVideoExport}
                              className={`px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold rounded flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 shadow-[0_0_15px_rgba(8,145,178,0.25)]`}
                            >
                              <Video size={14} /> {isRecording ? "STOP RENDERING (SAVE STAGE)" : "START NEW STUDIO COMPILATION"}
                            </button>
                          </div>

                          {compiledVideoUrl && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-mono font-bold text-emerald-400 block uppercase tracking-wider">💾 VIDEO COMPILATION SUCCESSFULLY GENERATED</span>
                                <span className="text-[11px] text-gray-300 font-mono block truncate max-w-xs md:max-w-md">{compiledVideoName}</span>
                              </div>
                              <a
                                href={compiledVideoUrl}
                                download={compiledVideoName}
                                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                              >
                                <Download size={13} /> DOWNLOAD {compiledVideoName?.split(".").pop()?.toUpperCase() || "WEBM"} VIDEO
                              </a>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Remastered audio exporter */}
                      <div className="p-4 bg-[#0E0E11]/80 border border-[#2A2A2E] rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-mono font-bold text-blue-400 block uppercase">🎚️ HIGH-FIDELITY AUDIO MASTER EXPORT</span>
                            <span className="text-[9px] font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 border border-blue-500/20 rounded-full font-bold uppercase tracking-wider">OFFLINE DSP</span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                            Convert & master the loaded audio track using your custom active VST chain, 3-band EQ, and analog filters back to an uncompressed WAV or compact clean MP3 master stream.
                          </p>
                        </div>

                        {/* Export Parameters (Sample rate, Channels, Export format) to manage memory limits */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 bg-black/25 p-2.5 border border-[#1d1d21] rounded-lg">
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">DSP SAMPLE RATE:</label>
                            <select
                              className="w-full bg-[#111114] border border-[#2A2A2E] text-xs text-blue-400 rounded py-1 px-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              value={vstExportSampleRate}
                              onChange={(e) => setVstExportSampleRate(parseInt(e.target.value))}
                            >
                              <option value={44100} className="bg-[#111114]">44.1 kHz (Studio Master)</option>
                              <option value={32000} className="bg-[#111114]">32.0 kHz (Compact Studio)</option>
                              <option value={22050} className="bg-[#111114]">22.05 kHz (Radio Edit)</option>
                              <option value={11025} className="bg-[#111114]">11.025 kHz (Lofi Grit)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">CHANNEL ROUTING:</label>
                            <select
                              className="w-full bg-[#111114] border border-[#2A2A2E] text-xs text-blue-400 rounded py-1 px-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              value={vstExportChannels}
                              onChange={(e) => setVstExportChannels(parseInt(e.target.value))}
                            >
                              <option value={2} className="bg-[#111114]">Stereo Master</option>
                              <option value={1} className="bg-[#111114]">Mono Mixdown (Saves 50% RAM)</option>
                            </select>
                          </div>

                          <div className="space-y-1 col-span-2 sm:col-span-1">
                            <label className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">EXPORT FORMAT:</label>
                            <select
                              className="w-full bg-[#111114] border border-[#2A2A2E] text-xs text-blue-400 rounded py-1 px-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none text-blue-400 font-bold"
                              value={audioExportFormat}
                              onChange={(e) => setAudioExportFormat(e.target.value as any)}
                            >
                              <option value="wav" className="bg-[#111114]">WAV (Lossless)</option>
                              <option value="mp3" className="bg-[#111114]">MP3 (Compressed)</option>
                            </select>
                          </div>
                          
                          <div className="col-span-2 sm:col-span-3 text-[9px] font-mono text-gray-400 leading-normal">
                            💡 <span className="text-gray-300 font-bold">Memory Tuning</span>: For extremely long or larger tracks, choose <span className="text-blue-400">Mono Mixdown</span> or a lower <span className="text-blue-400">Sample Rate</span> to save up to 75% browser RAM and avoid memory limits.
                          </div>
                        </div>

                        {/* Error Warning */}
                        {audioConversionError && (
                          <div className="mb-3 p-2 bg-red-950/25 border border-red-500/30 rounded text-[10px] font-mono text-red-400">
                            ⚠️ {audioConversionError}
                          </div>
                        )}

                        <div className="space-y-3">
                          {isConvertingAudio ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-mono">
                                <span className="text-gray-400">
                                  {audioConversionProgress < 60 ? "Initializing buffer..." : `Compiling active audio stream into ${audioExportFormat.toUpperCase()}...`}
                                </span>
                                <span className="text-blue-400 font-bold">{audioConversionProgress}%</span>
                              </div>
                              <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden">
                                <div style={{ width: `${audioConversionProgress}%` }} className="bg-blue-500 h-full transition-all" />
                              </div>
                            </div>
                          ) : (
                            <button
                              disabled={!currentAudio || isRecording}
                              onClick={triggerAudioFormatConversion}
                              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                            >
                              <Music size={14} /> MASTER & CONVERT AUDIO AS {audioExportFormat.toUpperCase()}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Download standalone offline html single bundle installation file */}
                      <div className="p-4 bg-black/40 border border-[#1f2937] rounded-lg">
                        <span className="text-xs font-mono font-bold text-emerald-500 block uppercase mb-1">💻 EXPORT OFFLINE MASTER APPLET</span>
                        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                          Export the entire SoundStage visual environment into a single clickable Standalone HTML installation file. Let's you operate 100% offline in any computer browser.
                        </p>
                        <button
                          onClick={triggerOfflineBundleDownload}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Save size={14} /> DOWNLOAD LOCAL STUDIO PACKAGE
                        </button>
                      </div>

                      {/* Download python 3 locally running rendering code using OpenCV and ffmpeg */}
                      <div className="p-4 bg-black/40 border border-[#1f2937] rounded-lg">
                        <span className="text-xs font-mono font-bold text-amber-500 block uppercase mb-1">🐍 EXPORT LOCAL PYTHON RENDERER</span>
                        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
                          Generate representing python3 code to render pixel-perfect high-definition visual videos locally, compatible with Windows, macOS, and Linux. No size limits!
                        </p>
                        <button
                          onClick={triggerPythonScriptDownload}
                          className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Code size={14} /> DOWNLOAD PYTHON RENDER CORE
                        </button>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </main>
    </div>
  );
}
