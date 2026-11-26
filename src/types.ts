/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CanvasResolution {
  YOUTUBE_16_9 = "16:9 (1920x1080)",
  TIKTOK_9_16 = "9:16 (1080x1920)",
  INSTAGRAM_1_1 = "1:1 (1080x1080)",
  CINEMATIC_21_9 = "21:9 (2560x1080)",
}

export enum VisualPreset {
  WAVEFORM_NEON = "Neon Waveform",
  SPECTRUM_BARS = "Equalizer Bars",
  COSMIC_TUNNEL = "Retro Space Tunnel",
  GEOCITIES_STARS = "Retro Starfield",
  ORBITAL_VORTEX = "Orbital Vortex",
  MYSPACE_DISCO = "MySpace Retro Disco",
  FRACTAL_MANDALA = "Sacred Fractal Mandala",
  CYBER_GRID_MATRIX = "Cyber Grid Matrix",
  FLUID_LIQUID_SWARM = "Liquid Flow Field Swarm",
  PLAYSTATION_SOUNDSCOPE = "PS1 Retro SoundScope",
  SUPER_SCIENCE_80S = "1980's Super Science",
  SECURITY_CAM_87 = "Security Cam '87 (Liminal Hall)",
  ENDOSKELETON_BLUEPRINT = "Animatronic Blueprint (Sister Lab)",
  LIMINAL_ARCADE_HALL = "Liminal Party Corridor",
  SPRINGLOCK_MECHANISM = "Springlock Endoskeleton Core",
  VHS_SIGNAL_HAUNT = "Analog VHS Signal Haunt",
  CUSTOM_JS = "Custom JavaScript Script",
}

export type LayerBlendMode = "source-over" | "screen" | "lighter" | "overlay" | "difference";
export type MirrorSymmetryMode = "none" | "horizontal" | "quad";
export type OverlayPosition = "top-left" | "top-center" | "center" | "bottom-left" | "bottom-center";
export type OverlayFontStyle = "mono" | "display" | "serif" | "terminal";

export interface PostFxSettings {
  scanlines: number;          // 0 - 1
  grain: number;              // 0 - 1
  vignette: number;           // 0 - 1
  glitchShift: number;        // 0 - 1
  beatZoom: number;           // 0 - 1
  mirrorMode: MirrorSymmetryMode;
  blendMode: LayerBlendMode;
}

export interface CustomOverlaySettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  position: OverlayPosition;
  fontStyle: OverlayFontStyle;
  fontSize: number;           // 16 - 72
  opacity: number;            // 0.1 - 1
  audioReactive: boolean;
}

export interface BackdropSettings {
  imageUrl: string;
  opacity: number;            // 0 - 1
  blur: number;               // 0 - 24 px
  audioPulse: boolean;
}

export interface VisualParams {
  preset: VisualPreset;
  speed: number;        // scale 0.1 - 3
  sensitivity: number;  // scale 0.5 - 5
  baseColor: string;
  secondaryColor: string;
  glow: number;         // 0 - 50 px blur
  particleCount: number; // 50 - 500
  lineWidth: number;     // 1 - 15
  bgOpacity: number;     // 0 - 1 (for trailing motion blur)
  customJsCode: string;  // user scripting
  retroHtmlSkin: string; // custom MySpace style HTML code
  enabledLayers?: VisualPreset[]; // overlay visual layers drawn behind/with the active preset
  layerOpacity?: number; // 0.1 - 0.9 opacity for background layers
  postFx?: PostFxSettings;
  overlayText?: CustomOverlaySettings;
  backdrop?: BackdropSettings;
}

export interface SavedStudioPreset {
  id: string;
  name: string;
  createdAt: string;
  visualParams: VisualParams;
  vstSettings: VstSettings;
  resolution: CanvasResolution;
  skinId: string;
}

export interface VstSettings {
  preamp: number;       // gain in dB: -12 to +12
  lowGain: number;      // -12 to +12 dB
  midGain: number;      // -12 to +12 dB
  highGain: number;     // -12 to +12 dB
  reverbWet: number;    // 0 to 1
  delayTime: number;    // 0 to 1s
  delayFeedback: number;// 0 to 0.95
  // Audio Watermark notch filter parameters
  notchFrequency: number; // 20 - 20000 Hz (common voice tag / bleep)
  notchQ: number;         // 1 - 50 (wide or ultra narrow sharp filter)
  notchEnabled: boolean;
  vstBypass: boolean;
  // Enhanced AI Watermark Purge
  aiWatermarkProfile?: string; // e.g. "none" | "suno_udio" | "elevenlabs" | "vocal_tag" | "harmonic_hum" | "custom_notch"
  aiWatermarkDeepPurge?: boolean; // dynamic multi-harmonic cascaded filters
  // Dynamic Analog-Modelled Master Rack
  masterWarmth?: number;       // Tube saturation amount: 0 to 100%
  masterCompressor?: boolean;  // Dynamic range glue (on/off)
  masterWidth?: number;        // Mid/Side stereo width: 0% (mono) to 200% (super-wide), 100% = normal
  masterLimiterGain?: number;  // Brickwall safety limiter output boost: 0 to 12 dB
}

export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  comment: string;
  coverArtUrl: string; // base64 or object url
}

export interface BatchAudioItem {
  id: string;
  fileName: string;
  fileSize: number;
  audioUrl: string;
  audioBlob: Blob;
  metadata: AudioMetadata;
  status: "pending" | "processing" | "completed" | "error";
  progress: number;
  vstSettings: VstSettings;
  visualParams: VisualParams;
}

export interface LayoutSkin {
  name: string;
  id: string;
  primaryBg: string;
  panelBg: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  customCss: string; // MySpace style visual customizations
}

export interface StudioProjectState {
  visualParams: VisualParams;
  vstSettings: VstSettings;
  metadata: AudioMetadata;
  selectedResolution: CanvasResolution;
  skinId: string;
}
