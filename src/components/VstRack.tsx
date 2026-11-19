/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { VstSettings } from "../types";
import { Sliders, ToggleLeft, ToggleRight, Radio, ShieldAlert } from "lucide-react";

interface VstRackProps {
  settings: VstSettings;
  onChangeSettings: (settings: VstSettings) => void;
}

export const VstRack: React.FC<VstRackProps> = ({ settings, onChangeSettings }) => {
  const updateField = (field: keyof VstSettings, value: any) => {
    onChangeSettings({
      ...settings,
      [field]: value
    });
  };

  return (
    <div id="vst-rack" className="bg-[#0E0E11] border border-[#2A2A2E] rounded-lg p-5 text-gray-200">
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#2A2A2E] mb-5 gap-3">
        <h3 className="font-bold flex items-center gap-2 text-sm text-cyan-400 font-mono tracking-widest uppercase">
          <Sliders size={18} /> Studio VST Processing Rack
        </h3>
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400">VST Chain Power:</span>
          <button
            onClick={() => updateField("vstBypass", !settings.vstBypass)}
            className={`px-3 py-1 text-xs font-mono font-bold rounded flex items-center gap-1.5 border transition-all cursor-pointer ${
              settings.vstBypass
                ? "bg-red-950/45 text-red-400 border-red-900/50"
                : "bg-cyan-950/45 text-cyan-400 border-cyan-900/50"
            }`}
          >
            {settings.vstBypass ? "BYPASSED (RAW AUDIO)" : "VST CONNECTED"}
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-12 gap-6 ${settings.vstBypass ? "opacity-40 pointer-events-none" : ""}`}>
        
        {/* EQ Faders System (Dynamic SVG space) */}
        <div id="paragraphic-eq-system" className="md:col-span-12 lg:col-span-4 bg-[#050507] p-4 rounded-lg border border-[#1A1A1E] flex flex-col justify-between">
          <div className="text-xs font-mono font-bold text-gray-400 border-b border-[#1A1A1E] pb-2 mb-3 flex justify-between items-center">
            <span>⚙️ MULTIBAND PARAGRAPHIC EQ (ACTIVE RESCUE ENV)</span>
            <span className="text-[10px] text-cyan-400 font-normal">REALTIME FILTERS</span>
          </div>

          {/* Upgraded Native SVG Paragraphic EQ Response Curve Graph */}
          <div className="mb-4 bg-black/85 border border-[#1E1E24] rounded p-2.5 relative select-none">
            <div className="absolute top-1 left-2 text-[8px] font-mono text-gray-500 font-semibold uppercase">dB Envelope (Gain)</div>
            <div className="absolute top-1 right-2 text-[8px] font-mono text-cyan-500">Logarithmic (20Hz - 20kHz)</div>
            
            <svg viewBox="0 0 320 80" width="100%" height="80" className="opacity-95">
              {/* Grid lines */}
              <line x1="0" y1="40" x2="320" y2="40" stroke="#1c1d24" strokeDasharray="3,3" /> {/* 0dB line */}
              <line x1="0" y1="14" x2="320" y2="14" stroke="#121217" strokeDasharray="1,6" /> {/* +8dB line */}
              <line x1="0" y1="66" x2="320" y2="66" stroke="#121217" strokeDasharray="1,6" /> {/* -8dB line */}

              {/* Logarithmic Frequency Grid Vertical Lines */}
              <line x1="75" y1="0" x2="75" y2="80" stroke="#17181F" />
              <text x="78" y="76" fill="#4B5563" fontSize="6px" fontFamily="monospace">100Hz</text>

              <line x1="181" y1="0" x2="181" y2="80" stroke="#17181F" />
              <text x="184" y="76" fill="#4B5563" fontSize="6px" fontFamily="monospace">1kHz</text>

              <line x1="287" y1="0" x2="287" y2="80" stroke="#17181F" />
              <text x="290" y="76" fill="#4B5563" fontSize="6px" fontFamily="monospace">10kHz</text>

              {/* Combined EQ Response Curve Path Plotting */}
              {(() => {
                const getCombinedGain = (f: number, low: number, mid: number, high: number): number => {
                  const xLow = Math.log10(f / 250);
                  const lowVal = low / (1 + Math.exp(xLow / 1.3));

                  const xMid = Math.log10(f / 1000);
                  const midVal = mid * Math.exp(-Math.pow(xMid / 0.5, 2));

                  const xHigh = Math.log10(f / 4000);
                  const highVal = high * (1 - 1 / (1 + Math.exp(xHigh / 1.3)));

                  return lowVal + midVal + highVal;
                };

                const svgW = 320;
                const svgH = 80;
                const points = [];
                for (let x = 0; x <= svgW; x += 4) {
                  const logF = Math.log10(20) + (x / svgW) * (Math.log10(20000) - Math.log10(20));
                  const freq = Math.pow(10, logF);
                  const gain = getCombinedGain(freq, settings.lowGain, settings.midGain, settings.highGain);
                  const yVal = (svgH / 2) - (gain / 12) * (svgH * 0.38);
                  points.push(`${x},${yVal}`);
                }
                const pathD = `M ${points.join(" L ")}`;
                return (
                  <>
                    <path d={pathD} fill="none" stroke="rgba(34, 211, 238, 0.12)" strokeWidth="8" strokeLinecap="round" />
                    <path d={pathD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
                  </>
                );
              })()}
            </svg>
            <div className="flex justify-between items-center px-1 text-[8px] font-mono text-gray-500 mt-1">
              <span>+12dB</span>
              <span className="text-cyan-500/80">FLAT FREQUENCY RESPONSE (0dB)</span>
              <span>-12dB</span>
            </div>
          </div>

          <div className="flex justify-around items-center h-48 pb-1">
            {/* Low Band slider */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-gray-400 font-semibold mb-1">
                {settings.lowGain > 0 ? `+${settings.lowGain}` : settings.lowGain} dB
              </span>

              {/* Vertical Rotated track */}
              <div className="h-28 w-8 flex items-center justify-center relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  className="cursor-pointer accent-cyan-400"
                  style={{
                    transform: "rotate(-90deg)",
                    width: "110px",
                    height: "4px",
                    background: "#15171E",
                    outline: "none"
                  }}
                  value={settings.lowGain}
                  onChange={(e) => updateField("lowGain", parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-1.5 mt-2 mb-1">
                <button
                  type="button"
                  onClick={() => updateField("lowGain", Math.max(-12, settings.lowGain - 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateField("lowGain", Math.min(12, settings.lowGain + 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  +
                </button>
              </div>

              <span className="text-[10px] font-bold font-mono text-cyan-400">BASS</span>
              <span className="text-[8px] font-mono text-gray-500">250Hz</span>
            </div>

            {/* Mid Band slider */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-gray-400 font-semibold mb-1">
                {settings.midGain > 0 ? `+${settings.midGain}` : settings.midGain} dB
              </span>

              <div className="h-28 w-8 flex items-center justify-center relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  className="cursor-pointer accent-cyan-400"
                  style={{
                    transform: "rotate(-90deg)",
                    width: "110px",
                    height: "4px",
                    background: "#15171E",
                    outline: "none"
                  }}
                  value={settings.midGain}
                  onChange={(e) => updateField("midGain", parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-1.5 mt-2 mb-1">
                <button
                  type="button"
                  onClick={() => updateField("midGain", Math.max(-12, settings.midGain - 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateField("midGain", Math.min(12, settings.midGain + 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  +
                </button>
              </div>

              <span className="text-[10px] font-bold font-mono text-cyan-400">MID</span>
              <span className="text-[8px] font-mono text-gray-500">1.0kHz</span>
            </div>

            {/* High Band slider */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-gray-400 font-semibold mb-1">
                {settings.highGain > 0 ? `+${settings.highGain}` : settings.highGain} dB
              </span>

              <div className="h-28 w-8 flex items-center justify-center relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  className="cursor-pointer accent-cyan-400"
                  style={{
                    transform: "rotate(-90deg)",
                    width: "110px",
                    height: "4px",
                    background: "#15171E",
                    outline: "none"
                  }}
                  value={settings.highGain}
                  onChange={(e) => updateField("highGain", parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-1.5 mt-2 mb-1">
                <button
                  type="button"
                  onClick={() => updateField("highGain", Math.max(-12, settings.highGain - 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateField("highGain", Math.min(12, settings.highGain + 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-cyan-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  +
                </button>
              </div>

              <span className="text-[10px] font-bold font-mono text-cyan-400">TREBLE</span>
              <span className="text-[8px] font-mono text-gray-500">4.0kHz</span>
            </div>

            {/* Active Preamp Tube Volume */}
            <div className="flex flex-col items-center border-l border-gray-800 pl-4">
              <span className="text-[10px] font-mono text-orange-400 font-semibold mb-1">
                {settings.preamp > 0 ? `+${settings.preamp}` : settings.preamp} dB
              </span>

              <div className="h-28 w-8 flex items-center justify-center relative">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="1"
                  className="cursor-pointer accent-orange-400"
                  style={{
                    transform: "rotate(-90deg)",
                    width: "110px",
                    height: "4px",
                    background: "#15171E",
                    outline: "none"
                  }}
                  value={settings.preamp}
                  onChange={(e) => updateField("preamp", parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-1.5 mt-2 mb-1">
                <button
                  type="button"
                  onClick={() => updateField("preamp", Math.max(-12, settings.preamp - 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-orange-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateField("preamp", Math.min(12, settings.preamp + 1))}
                  className="w-4 h-4 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-orange-400 flex items-center justify-center hover:bg-gray-800 text-[10px] cursor-pointer"
                >
                  +
                </button>
              </div>

              <span className="text-[10px] font-bold font-mono text-orange-400">GAIN</span>
              <span className="text-[8px] font-mono text-gray-500">Pre-Amp</span>
            </div>
          </div>
        </div>

        {/* Temporal Echo & Reverb System (4 columns) */}
        <div className="md:col-span-12 lg:col-span-4 space-y-4">
          
          {/* Echo System */}
          <div className="bg-[#050507] p-4 rounded-lg border border-[#1A1A1E]">
            <div className="text-xs font-mono font-bold text-gray-400 mb-2 pb-1 border-b border-[#1A1A1E] flex justify-between">
              <span>🎚️ ECHO / ANALOG DELAY CONTROLLER</span>
              <span className="text-cyan-400 tracking-wider">TAPEFADE v2</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-gray-400">Delay Time:</span>
                  <span className="text-cyan-400 font-bold">{Math.floor(settings.delayTime * 1000)} ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={settings.delayTime}
                  onChange={(e) => updateField("delayTime", parseFloat(e.target.value))}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-gray-400">Feedback:</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.delayFeedback * 100)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.90"
                  step="0.05"
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={settings.delayFeedback}
                  onChange={(e) => updateField("delayFeedback", parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Reverb System */}
          <div className="bg-[#050507] p-4 rounded-lg border border-[#1A1A1E]">
            <div className="text-xs font-mono font-bold text-gray-400 mb-2 pb-1 border-b border-[#1A1A1E] flex justify-between">
              <span>❄️ CONVOLUTION REVERB (SYNTHETIC IMPULSE RESPONSE)</span>
              <span className="text-cyan-400">STUDIO LOBBY</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-gray-400">Reverb Mix (Wet):</span>
                  <span className="text-cyan-400 font-bold">{Math.round(settings.reverbWet * 100)} %</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={settings.reverbWet}
                  onChange={(e) => updateField("reverbWet", parseFloat(e.target.value))}
                />
              </div>

              <div className="bg-[#111114] border border-[#2A2A2E] p-2 rounded text-center min-w-[100px]">
                <span className="block text-[8px] font-mono text-gray-400">DECAY TIME</span>
                <span className="text-xs font-mono font-bold text-cyan-400">1.8 Seconds</span>
              </div>
            </div>
          </div>

        </div>

        {/* Analog Mastering & Gain Maximizer (4 columns) */}
        <div className="md:col-span-12 lg:col-span-4 space-y-4">
          <div className="bg-[#050507] p-4 rounded-lg border border-[#1A1A1E] h-full flex flex-col justify-between">
            <div className="text-xs font-mono font-bold text-gray-400 mb-2 pb-1 border-b border-[#1A1A1E] flex justify-between">
              <span>🔊 ANALOG MASTERING & LOUDNESS SUITE</span>
              <span className="text-pink-500 tracking-wider font-extrabold uppercase animate-pulse">Master Out</span>
            </div>

            <div className="space-y-4">
              {/* Saturator Warmth */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-gray-400">🔥 Tube Warmth (Saturation):</span>
                  <span className="text-orange-400 font-bold">{settings.masterWarmth !== undefined ? settings.masterWarmth : 30}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full accent-orange-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={settings.masterWarmth !== undefined ? settings.masterWarmth : 30}
                  onChange={(e) => updateField("masterWarmth", parseInt(e.target.value))}
                />
              </div>

              {/* Stereo Width */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-gray-400">🌐 Mid/Side Stereo Width:</span>
                  <span className="text-cyan-400 font-bold">{settings.masterWidth !== undefined ? settings.masterWidth : 115}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={settings.masterWidth !== undefined ? settings.masterWidth : 115}
                  onChange={(e) => updateField("masterWidth", parseInt(e.target.value))}
                />
              </div>

              {/* Glue Compressor Bypass */}
              <div className="flex items-center justify-between bg-[#0E0E12] p-2 rounded-md border border-[#1A1A1E]">
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wide">💼 Master Glue Compressor</span>
                  <span className="text-[8px] text-gray-500">Auto dynamic stabilizer</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateField("masterCompressor", settings.masterCompressor === undefined ? false : !settings.masterCompressor)}
                  className={`px-2.5 py-1 rounded font-mono text-[9px] font-bold border transition-colors cursor-pointer ${
                    (settings.masterCompressor !== false)
                      ? "bg-cyan-950/50 border-cyan-500 text-cyan-400"
                      : "bg-black text-gray-500 border-gray-800"
                  }`}
                >
                  {settings.masterCompressor !== false ? "STABILIZED" : "BYPASSED"}
                </button>
              </div>

              {/* Limiter Output Gain Driver */}
              <div>
                <div className="flex justify-between text-[11px] font-mono mb-1">
                  <span className="text-gray-400">⚡ Bricked Peak Drive (Loudness Boost):</span>
                  <span className="text-pink-500 font-bold">+{settings.masterLimiterGain !== undefined ? settings.masterLimiterGain : 3.5} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12.0"
                  step="0.5"
                  className="w-full accent-pink-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none"
                  value={settings.masterLimiterGain !== undefined ? settings.masterLimiterGain : 3.5}
                  onChange={(e) => updateField("masterLimiterGain", parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Micro-visualization status badge */}
            <div className="mt-3.5 bg-pink-950/10 border border-pink-500/20 rounded p-1.5 flex items-center justify-between text-[9px] font-mono text-gray-400">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping" /> AUTO LOUDNESS BOOST ACTIVE</span>
              <span className="text-pink-400 font-semibold">-1.0dB CEIL PROTECTION</span>
            </div>
          </div>
        </div>

      </div>

      {/* AUDIO WATERMARK REMOVERS - REAL NOTCH FILTER */}
      <div className={`mt-5 p-4 rounded-lg border ${settings.notchEnabled && !settings.vstBypass ? "bg-orange-950/20 border-orange-500/35" : "bg-[#050507] border-[#1A1A1E]"} transition-all`}>
        <div className="flex flex-wrap items-center justify-between pb-2 mb-3 border-b border-[#1A1A1E] gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className={settings.notchEnabled && !settings.vstBypass ? "text-orange-400" : "text-gray-400"} />
            <span className="font-bold text-xs font-mono text-gray-200">🎛️ SPECIALIST AI WATERMARK REMOVER (CASCADED CLEANER)</span>
          </div>

          <button
            onClick={() => updateField("notchEnabled", !settings.notchEnabled)}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 cursor-pointer border transition-colors ${
              settings.notchEnabled && !settings.vstBypass
                ? "bg-orange-600 border-orange-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {settings.notchEnabled && !settings.vstBypass ? "ACTIVE CASCADE DE-WATERMARKING" : "ENABLE WATERMARK FILTER"}
          </button>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed mb-4">
          Tired of annoying voice tag watermarks ("AudioJungle", "Your preview", high beeps) or digital AI pilot signatures overlaid in high-fidelity generate tracks? 
          Activate this highly precise **Biquad Cascaded Notch System**. Choose one of the pre-modeled AI vendor decoders below to auto-mute proprietary hums/clicks on export, or dial in your own custom frequency cascade.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-gray-400">Notch Frequency Cut-off:</span>
              <span className={settings.notchEnabled && !settings.vstBypass ? "text-orange-400 font-bold" : "text-gray-400"}>
                {(settings.aiWatermarkProfile || "none") !== "none" ? "Preset Controlled" : `${settings.notchFrequency} Hz`}
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="8000"
              step="20"
              className="w-full accent-orange-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none disabled:opacity-30"
              disabled={!settings.notchEnabled || settings.vstBypass || ((settings.aiWatermarkProfile || "none") !== "none")}
              value={settings.notchFrequency}
              onChange={(e) => updateField("notchFrequency", parseInt(e.target.value))}
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-gray-400">Filter Narrowness (Q Factor):</span>
              <span className={settings.notchEnabled && !settings.vstBypass ? "text-orange-400 font-bold" : "text-gray-400"}>
                {(settings.aiWatermarkProfile || "none") !== "none" ? "Preset Controlled" : `Q = ${settings.notchQ} (Narrow)`}
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              step="1"
              className="w-full accent-orange-400 cursor-pointer h-1.5 bg-gray-800 rounded-lg appearance-none disabled:opacity-30"
              disabled={!settings.notchEnabled || settings.vstBypass || ((settings.aiWatermarkProfile || "none") !== "none")}
              value={settings.notchQ}
              onChange={(e) => updateField("notchQ", parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Targeted AI Watermark Purge Profiles */}
        <div className="mt-4 border-t border-[#1A1A1E] pt-4">
          <label className="text-[9px] font-mono font-bold text-orange-400 uppercase tracking-widest block mb-2">
            Targeted Decoupling Purge Profile
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {[
              { id: "none", label: "⚙️ Custom Notch", desc: "Manual dial narrow band filter." },
              { id: "suno_udio", label: "🎵 Suno/Udio", desc: "Mutes high ultrasonic AI tags (12k-19.5kHz)." },
              { id: "elevenlabs", label: "🎙️ ElevenLabs", desc: "Attenuates voice whine hum (16k, 12k, 8k, 45Hz)." },
              { id: "vocal_tag", label: "🗣️ Vocal Tag", desc: "Mutes vocal tags (500Hz, 1k, 2k, 3k Hz)." },
              { id: "harmonic_hum", label: "⚡ AC Hum Shield", desc: "Harmonic hum filter (50Hz, 60Hz and overtones)." }
            ].map((p) => {
              const isActive = (settings.aiWatermarkProfile || "none") === p.id;
              return (
                <button
                  key={p.id}
                  disabled={!settings.notchEnabled || settings.vstBypass}
                  type="button"
                  onClick={() => updateField("aiWatermarkProfile", p.id)}
                  className={`p-2 rounded text-left transition-all border ${
                    isActive && settings.notchEnabled && !settings.vstBypass
                      ? "bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.15)]"
                      : "bg-[#09090c] border-[#18181c] text-gray-400 hover:border-gray-800 disabled:opacity-20 cursor-pointer"
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold block">{p.label}</span>
                  <span className="text-[8px] text-gray-500 leading-tight block mt-1">{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deep Purge dynamic harmonics card */}
        {((settings.aiWatermarkProfile || "none") === "none") && (
          <div className="mt-4 pt-3 border-t border-[#1A1A1E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#08080a] p-3 rounded border border-orange-950/5">
            <div className="flex-1">
              <span className="text-[10px] font-mono text-orange-400 font-bold block uppercase tracking-wide">⚡ CASCADE HARMONIC DEEP PURGE</span>
              <span className="text-[8px] text-gray-400 block mt-0.5 leading-relaxed">
                Dynamically cascades 3 auxiliary notch filters at integer harmonics (2x, 3x, and 4x multiples) of your dialed frequency. Ideal for removing stubborn tone-whistles without affecting vocal clarity.
              </span>
            </div>
            <button
              disabled={!settings.notchEnabled || settings.vstBypass}
              type="button"
              onClick={() => updateField("aiWatermarkDeepPurge", !settings.aiWatermarkDeepPurge)}
              className={`px-3 py-1.5 rounded font-mono text-[9px] font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                settings.aiWatermarkDeepPurge && settings.notchEnabled && !settings.vstBypass
                  ? "bg-orange-600/25 border-orange-500 text-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.1)]"
                  : "bg-black/40 border-gray-800 text-gray-500 hover:text-gray-400"
              }`}
            >
              {settings.aiWatermarkDeepPurge ? "✔ CASCADING ON" : "✖ CASCADING OFF"}
            </button>
          </div>
        )}

        {/* Live EQ Notch response graph diagnostics */}
        {settings.notchEnabled && !settings.vstBypass ? (
          <div className="mt-3 text-[10px] font-mono text-gray-400 bg-black/60 p-3 rounded flex flex-col md:flex-row md:items-center justify-between gap-2 border border-orange-900/10">
            <div className="flex flex-col">
              <span className="text-orange-400 font-bold uppercase tracking-wider mb-0.5">✔ Active Realtime Purger Status</span>
              <span className="text-[9px] text-gray-300 leading-normal">
                {(() => {
                  const profile = settings.aiWatermarkProfile || "none";
                  const deepPurge = settings.aiWatermarkDeepPurge || false;

                  if (profile === "suno_udio") {
                    return `Suno / Udio High-Freq Purge active: Ultrasonic notches applied at 19.5kHz, 18kHz, 15.75kHz, 12kHz to block inaudible watermark sweeps.`;
                  } else if (profile === "elevenlabs") {
                    return `ElevenLabs speech de-whine active: Cascaded notches at 16kHz, 12kHz, 8kHz and extreme sub-rumble 45Hz filters engaged.`;
                  } else if (profile === "vocal_tag") {
                    return `Broadband Vocal tag suppression engaged: Muting vocal range preview formants around 500Hz, 1.0kHz, 2.0kHz, 3.0kHz with broad Q attenuation curves.`;
                  } else if (profile === "harmonic_hum") {
                    return `AC Power Hum filter engaged: Suppressing 50Hz, 60Hz and their primary 2nd-order harmonics (100Hz, 120Hz).`;
                  } else {
                    return deepPurge
                      ? `Custom Multi-Harmonic Cascade active: Attenuating fundamental ${settings.notchFrequency}Hz with Q=${settings.notchQ}, plus active integer overtones at ${Math.min(21000, settings.notchFrequency * 2)}Hz, ${Math.min(21000, settings.notchFrequency * 3)}Hz, and ${Math.min(21000, settings.notchFrequency * 4)}Hz.`
                      : `Custom Single-Frequency Notch active: Narrow peak attenuation of -36dB centered at ${settings.notchFrequency}Hz with Q factor of ${settings.notchQ}.`;
                  }
                })()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse border border-orange-400" />
              <span className="text-[9px] uppercase font-bold text-orange-400 tracking-wider">Clean Export Safe</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
