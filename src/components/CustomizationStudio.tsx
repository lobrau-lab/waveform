/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, ChangeEvent } from "react";
import {
  VisualParams,
  PostFxSettings,
  CustomOverlaySettings,
  BackdropSettings,
  SavedStudioPreset,
  LayerBlendMode,
  MirrorSymmetryMode,
  OverlayPosition,
  OverlayFontStyle
} from "../types";
import {
  Sliders,
  Image as ImageIcon,
  Type,
  Save,
  Trash2,
  Download,
  Upload,
  Shuffle,
  RotateCcw,
  Sparkles,
  Check
} from "lucide-react";

export const DEFAULT_POST_FX: PostFxSettings = {
  scanlines: 0,
  grain: 0,
  vignette: 0.25,
  glitchShift: 0,
  beatZoom: 0.15,
  mirrorMode: "none",
  blendMode: "source-over"
};

export const DEFAULT_OVERLAY_TEXT: CustomOverlaySettings = {
  enabled: false,
  title: "",
  subtitle: "",
  position: "bottom-left",
  fontStyle: "mono",
  fontSize: 38,
  opacity: 0.9,
  audioReactive: true
};

export const DEFAULT_BACKDROP: BackdropSettings = {
  imageUrl: "",
  opacity: 0.35,
  blur: 4,
  audioPulse: true
};

interface CustomizationStudioProps {
  section: "postfx" | "branding" | "vault";
  visualParams: VisualParams;
  coverArtUrl: string;
  trackTitle: string;
  trackArtist: string;
  savedPresets: SavedStudioPreset[];
  onChangeVisualParams: (next: VisualParams) => void;
  onSaveCustomPreset: (name: string) => void;
  onLoadCustomPreset: (preset: SavedStudioPreset) => void;
  onDeleteCustomPreset: (id: string) => void;
  onExportPresetPack: () => void;
  onImportPresetPack: (e: ChangeEvent<HTMLInputElement>) => void;
  onMutateLook: () => void;
}

export const CustomizationStudio: React.FC<CustomizationStudioProps> = ({
  section,
  visualParams,
  coverArtUrl,
  trackTitle,
  trackArtist,
  savedPresets,
  onChangeVisualParams,
  onSaveCustomPreset,
  onLoadCustomPreset,
  onDeleteCustomPreset,
  onExportPresetPack,
  onImportPresetPack,
  onMutateLook
}) => {
  const [presetNameInput, setPresetNameInput] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const postFx: PostFxSettings = { ...DEFAULT_POST_FX, ...(visualParams.postFx || {}) };
  const overlayText: CustomOverlaySettings = { ...DEFAULT_OVERLAY_TEXT, ...(visualParams.overlayText || {}) };
  const backdrop: BackdropSettings = { ...DEFAULT_BACKDROP, ...(visualParams.backdrop || {}) };

  const updatePostFx = (patch: Partial<PostFxSettings>) => {
    onChangeVisualParams({
      ...visualParams,
      postFx: { ...postFx, ...patch }
    });
  };

  const updateOverlay = (patch: Partial<CustomOverlaySettings>) => {
    onChangeVisualParams({
      ...visualParams,
      overlayText: { ...overlayText, ...patch }
    });
  };

  const updateBackdrop = (patch: Partial<BackdropSettings>) => {
    onChangeVisualParams({
      ...visualParams,
      backdrop: { ...backdrop, ...patch }
    });
  };

  const handleBackdropUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateBackdrop({ imageUrl: reader.result, opacity: Math.max(0.35, backdrop.opacity) });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveClick = () => {
    const trimmed = presetNameInput.trim() || `${visualParams.preset} Rig`;
    onSaveCustomPreset(trimmed);
    setPresetNameInput("");
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1600);
  };

  if (section === "postfx") {
    return (
      <div className="space-y-4">
        <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-800 pb-3">
            <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase">
              <Sliders size={16} /> Global Analog Post-FX &amp; Optics Rack
            </h3>
            <button
              type="button"
              onClick={() => updatePostFx(DEFAULT_POST_FX)}
              className="flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Reset FX
            </button>
          </div>

          {/* 1-Click FX Quick Profiles */}
          <div className="mb-5">
            <span className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Quick FX Rack Profiles</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  name: "Clean Digital",
                  fx: { scanlines: 0, grain: 0, vignette: 0.15, glitchShift: 0, beatZoom: 0.1, mirrorMode: "none" as MirrorSymmetryMode }
                },
                {
                  name: "1987 CCTV Tape",
                  fx: { scanlines: 0.65, grain: 0.55, vignette: 0.72, glitchShift: 0.25, beatZoom: 0.15, mirrorMode: "none" as MirrorSymmetryMode }
                },
                {
                  name: "Corrupted VHS",
                  fx: { scanlines: 0.8, grain: 0.85, vignette: 0.85, glitchShift: 0.8, beatZoom: 0.5, mirrorMode: "none" as MirrorSymmetryMode }
                },
                {
                  name: "Quad Mirror",
                  fx: { scanlines: 0.2, grain: 0.15, vignette: 0.45, glitchShift: 0.15, beatZoom: 0.45, mirrorMode: "quad" as MirrorSymmetryMode }
                }
              ].map((profile) => (
                <button
                  key={profile.name}
                  type="button"
                  onClick={() => updatePostFx(profile.fx)}
                  className="px-2.5 py-2 rounded border border-gray-800 bg-black/40 hover:border-yellow-500/60 hover:text-yellow-400 text-[10px] font-mono text-gray-300 transition-colors cursor-pointer text-center"
                >
                  {profile.name}
                </button>
              ))}
            </div>
          </div>

          {/* FX Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>CRT Scanline Intensity:</span>
                <span className="text-yellow-500 font-bold">{Math.round(postFx.scanlines * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={postFx.scanlines}
                onChange={(e) => updatePostFx({ scanlines: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>Analog Grain / VHS Static:</span>
                <span className="text-yellow-500 font-bold">{Math.round(postFx.grain * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={postFx.grain}
                onChange={(e) => updatePostFx({ grain: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>Chromatic Glitch &amp; Tear:</span>
                <span className="text-yellow-500 font-bold">{Math.round(postFx.glitchShift * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={postFx.glitchShift}
                onChange={(e) => updatePostFx({ glitchShift: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>CRT Edge Vignette:</span>
                <span className="text-yellow-500 font-bold">{Math.round(postFx.vignette * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={postFx.vignette}
                onChange={(e) => updatePostFx({ vignette: parseFloat(e.target.value) })}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>Beat Camera Zoom &amp; Impact Shake:</span>
                <span className="text-yellow-500 font-bold">{Math.round(postFx.beatZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={postFx.beatZoom}
                onChange={(e) => updatePostFx({ beatZoom: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Symmetry & Layer Blend Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-800">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Mirror / Kaleidoscope Symmetry</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: "none", label: "Off" },
                  { id: "horizontal", label: "Mirror X" },
                  { id: "quad", label: "Quad 4x" }
                ] as Array<{ id: MirrorSymmetryMode; label: string }>).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updatePostFx({ mirrorMode: opt.id })}
                    className={`py-2 px-2 rounded text-[10px] font-mono border cursor-pointer transition-colors ${
                      postFx.mirrorMode === opt.id
                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 font-bold"
                        : "bg-black/40 border-gray-800 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase mb-2">Background Layer Blend Mode</label>
              <select
                value={postFx.blendMode}
                onChange={(e) => updatePostFx({ blendMode: e.target.value as LayerBlendMode })}
                className="w-full bg-[#09090d] border border-gray-800 rounded px-2.5 py-2 text-xs font-mono text-cyan-400 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
              >
                <option value="source-over">Normal (Alpha Blend)</option>
                <option value="screen">Screen (Brighten / Phosphor)</option>
                <option value="lighter">Additive (Neon Light)</option>
                <option value="overlay">Overlay (High Contrast)</option>
                <option value="difference">Difference (Surreal Invert)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (section === "branding") {
    return (
      <div className="space-y-4">
        {/* Custom Backdrop Image Studio */}
        <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
            <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase">
              <ImageIcon size={16} /> Custom Stage Backdrop Image
            </h3>
            {backdrop.imageUrl && (
              <button
                type="button"
                onClick={() => updateBackdrop({ imageUrl: "" })}
                className="text-[10px] font-mono text-red-400 hover:text-red-300 cursor-pointer"
              >
                Remove Backdrop
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="file"
              id="backdropImageUpload"
              accept="image/*"
              className="hidden"
              onChange={handleBackdropUpload}
            />
            <label
              htmlFor="backdropImageUpload"
              className="px-3 py-2 rounded border border-gray-700 bg-black/50 hover:border-yellow-500 text-xs font-mono text-gray-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Upload size={13} /> Upload Image
            </label>

            {coverArtUrl && (
              <button
                type="button"
                onClick={() => updateBackdrop({ imageUrl: coverArtUrl, opacity: Math.max(0.35, backdrop.opacity) })}
                className="px-3 py-2 rounded border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-900/30 text-xs font-mono text-cyan-300 cursor-pointer transition-colors"
              >
                Use Track Cover Art
              </button>
            )}

            <span className="text-[10px] font-mono text-gray-500">
              {backdrop.imageUrl ? "Custom backdrop active behind visualizers" : "No backdrop image set"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>Backdrop Opacity:</span>
                <span className="text-yellow-500 font-bold">{Math.round(backdrop.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={backdrop.opacity}
                onChange={(e) => updateBackdrop({ opacity: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                <span>Backdrop Blur:</span>
                <span className="text-yellow-500 font-bold">{backdrop.blur} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                value={backdrop.blur}
                onChange={(e) => updateBackdrop({ blur: parseInt(e.target.value) })}
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between bg-black/35 border border-gray-800 rounded px-3 py-2">
              <span className="text-xs font-mono text-gray-300">Audio-Reactive Bass Zoom Pulse</span>
              <button
                type="button"
                onClick={() => updateBackdrop({ audioPulse: !backdrop.audioPulse })}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  backdrop.audioPulse ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400"
                }`}
              >
                {backdrop.audioPulse ? "Enabled" : "Off"}
              </button>
            </div>
          </div>
        </div>

        {/* Custom Canvas Typography Overlay Studio */}
        <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
            <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase">
              <Type size={16} /> Custom Canvas Title Overlay
            </h3>
            <button
              type="button"
              onClick={() => updateOverlay({ enabled: !overlayText.enabled })}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                overlayText.enabled ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400"
              }`}
            >
              {overlayText.enabled ? "Overlay Active" : "Overlay Off"}
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Primary Title Text</label>
                <input
                  type="text"
                  placeholder="e.g. TAPE #87 — MIDNIGHT SHIFT"
                  value={overlayText.title}
                  onChange={(e) => updateOverlay({ title: e.target.value, enabled: true })}
                  className="w-full bg-[#09090d] border border-gray-800 rounded px-3 py-2 text-xs font-mono text-gray-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Subtitle / Credit Line</label>
                <input
                  type="text"
                  placeholder="e.g. PRODUCED IN SOUNDSCAPE STUDIO"
                  value={overlayText.subtitle}
                  onChange={(e) => updateOverlay({ subtitle: e.target.value, enabled: true })}
                  className="w-full bg-[#09090d] border border-gray-800 rounded px-3 py-2 text-xs font-mono text-gray-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  updateOverlay({
                    enabled: true,
                    title: trackTitle || "Untitled SoundScape",
                    subtitle: trackArtist || "Independent Creator"
                  })
                }
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                Sync From Track Metadata
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Screen Position</label>
                <select
                  value={overlayText.position}
                  onChange={(e) => updateOverlay({ position: e.target.value as OverlayPosition })}
                  className="w-full bg-[#09090d] border border-gray-800 rounded px-2.5 py-2 text-xs font-mono text-gray-200 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="center">Center Stage</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Typography Style</label>
                <select
                  value={overlayText.fontStyle}
                  onChange={(e) => updateOverlay({ fontStyle: e.target.value as OverlayFontStyle })}
                  className="w-full bg-[#09090d] border border-gray-800 rounded px-2.5 py-2 text-xs font-mono text-gray-200 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                >
                  <option value="mono">Monospace Studio</option>
                  <option value="display">Bold Display Sans</option>
                  <option value="serif">Editorial Classic Serif</option>
                  <option value="terminal">Glitch CRT Terminal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                  <span>Title Font Size:</span>
                  <span className="text-yellow-500 font-bold">{overlayText.fontSize} px</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="72"
                  step="2"
                  className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={overlayText.fontSize}
                  onChange={(e) => updateOverlay({ fontSize: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1 text-gray-300 tabular-nums">
                  <span>Text Opacity:</span>
                  <span className="text-yellow-500 font-bold">{Math.round(overlayText.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="1"
                  step="0.05"
                  className="w-full accent-yellow-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={overlayText.opacity}
                  onChange={(e) => updateOverlay({ opacity: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/35 border border-gray-800 rounded px-3 py-2">
              <span className="text-xs font-mono text-gray-300">Audio-Reactive Text Pulse &amp; Glow</span>
              <button
                type="button"
                onClick={() => updateOverlay({ audioReactive: !overlayText.audioReactive })}
                className={`px-3 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                  overlayText.audioReactive ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400"
                }`}
              >
                {overlayText.audioReactive ? "Reactive On" : "Static"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // section === "vault"
  return (
    <div className="space-y-4">
      <div className="bg-[#101116] border border-[#1f2937] rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-gray-800 pb-3">
          <h3 className="font-bold flex items-center gap-2 text-sm text-yellow-500 font-mono tracking-widest uppercase">
            <Save size={16} /> Custom Studio Preset Vault
          </h3>
          <button
            type="button"
            onClick={onMutateLook}
            className="px-3 py-1.5 rounded bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/35 text-cyan-300 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Shuffle size={12} /> Mutate Random Look
          </button>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
          Save your current combination of procedural preset, background layers, Post-FX optics, colors, VST rack, and studio skin into your local vault — or export and share entire preset packs as JSON.
        </p>

        {/* Save new preset row */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveClick();
            }}
            placeholder="Name your custom studio setup..."
            className="flex-1 bg-[#09090d] border border-gray-800 rounded px-3 py-2 text-xs font-mono text-gray-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSaveClick}
            className="px-4 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            {justSaved ? <Check size={14} /> : <Save size={14} />}
            {justSaved ? "Saved!" : "Save Rig"}
          </button>
        </div>

        {/* Export / Import JSON actions */}
        <div className="flex flex-wrap items-center gap-2 pb-4 mb-4 border-b border-gray-800">
          <button
            type="button"
            onClick={onExportPresetPack}
            className="px-3 py-1.5 rounded border border-gray-700 bg-black/40 hover:border-gray-500 text-[11px] font-mono text-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download size={12} /> Export Preset Pack (.json)
          </button>

          <input
            type="file"
            id="importPresetPackInput"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportPresetPack}
          />
          <label
            htmlFor="importPresetPackInput"
            className="px-3 py-1.5 rounded border border-gray-700 bg-black/40 hover:border-gray-500 text-[11px] font-mono text-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload size={12} /> Import Preset Pack (.json)
          </label>
        </div>

        {/* Saved Presets List */}
        {savedPresets.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-gray-800 bg-black/30 text-center">
            <Sparkles size={20} className="mx-auto text-gray-600 mb-2" />
            <p className="text-xs font-mono text-gray-400">No saved custom rigs yet</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Dial in a visual preset, layers, and Post-FX above, then click Save Rig to store it here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {savedPresets.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border border-gray-800 bg-black/40 hover:border-gray-600 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: item.visualParams.baseColor }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-sm -ml-0.5"
                        style={{ backgroundColor: item.visualParams.secondaryColor }}
                      />
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-200 truncate">{item.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-gray-500 mt-0.5 truncate">
                    {item.visualParams.preset}
                    {item.visualParams.enabledLayers && item.visualParams.enabledLayers.length > 0
                      ? ` · +${item.visualParams.enabledLayers.length} layer(s)`
                      : ""}
                    {" · "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onLoadCustomPreset(item)}
                    className="px-2.5 py-1 rounded bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/35 text-cyan-300 text-[10px] font-mono font-bold cursor-pointer transition-colors"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomPreset(item.id)}
                    className="p-1.5 rounded text-red-400 hover:bg-red-950/40 cursor-pointer transition-colors"
                    title="Delete preset"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
