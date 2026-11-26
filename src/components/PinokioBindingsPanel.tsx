/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import {
  Check,
  Code,
  Copy,
  Cpu,
  Download,
  Hammer,
  RefreshCw,
  Terminal,
  Video
} from "lucide-react";
import {
  generatePinokioBootstrapperPy,
  getPinokioBundleFiles,
  PinokioBridgeHealth
} from "../utils/pinokioBridge";

interface PinokioBindingsPanelProps {
  bridgeUrl: string;
  bridgeHealth: PinokioBridgeHealth | null;
  isProbingBridge: boolean;
  isRenderingPython: boolean;
  isBuildingFrontend: boolean;
  hasAudioLoaded: boolean;
  onChangeBridgeUrl: (url: string) => void;
  onProbeBridge: () => void;
  onRenderViaPython: () => void;
  onBuildFrontendViaPython: () => void;
  onDownloadLegacyScript: () => void;
}

export const PinokioBindingsPanel: React.FC<PinokioBindingsPanelProps> = ({
  bridgeUrl,
  bridgeHealth,
  isProbingBridge,
  isRenderingPython,
  isBuildingFrontend,
  hasAudioLoaded,
  onChangeBridgeUrl,
  onProbeBridge,
  onRenderViaPython,
  onBuildFrontendViaPython,
  onDownloadLegacyScript
}) => {
  const bundleFiles = useMemo(() => getPinokioBundleFiles(), []);
  const [selectedFile, setSelectedFile] = useState<string>("soundscape_bindings.py");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const activeFileObj =
    bundleFiles.find((f) => f.filename === selectedFile) || bundleFiles[0];

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyFile = async () => {
    try {
      await navigator.clipboard.writeText(activeFileObj.content);
      setCopiedFile(activeFileObj.filename);
      window.setTimeout(() => setCopiedFile(null), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <div className="md:col-span-2 p-5 bg-[#0E0E11]/90 border border-[#2A2A2E] rounded-xl space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#2A2A2E] pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Terminal size={15} /> PINOKIO APP BUILDER &amp; PYTHON BINDINGS
          </span>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Ready-to-run Pinokio scripts (<code className="text-amber-300">pinokio.js</code>,{" "}
            <code className="text-amber-300">install.js</code>,{" "}
            <code className="text-amber-300">start.js</code>,{" "}
            <code className="text-amber-300">torch.js</code>) paired with{" "}
            <code className="text-cyan-300">soundscape_bindings.py</code> and the FastAPI{" "}
            <code className="text-cyan-300">pinokio_server.py</code> bridge for GPU-accelerated
            OpenAI Whisper, FFmpeg MP4 rendering, and programmatic Vite builds.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded border uppercase whitespace-nowrap ${
              bridgeHealth
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : "bg-gray-900 border-gray-700 text-gray-400"
            }`}
          >
            {bridgeHealth
              ? `PINOKIO PYTHON LIVE (${bridgeHealth.device.toUpperCase()})`
              : "STANDALONE BROWSER MODE"}
          </span>
        </div>
      </div>

      {/* Live Pinokio Bridge Connector + Hardware Readout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-black/40 border border-[#1f2937] rounded-lg p-3">
        <div className="lg:col-span-7 space-y-2">
          <label className="text-[10px] font-mono text-gray-400 uppercase font-semibold block">
            Local Pinokio Python Bridge Endpoint (blank = same origin inside Pinokio)
          </label>
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <input
              type="text"
              value={bridgeUrl}
              onChange={(e) => onChangeBridgeUrl(e.target.value)}
              placeholder="http://127.0.0.1:7860 (leave blank inside Pinokio)"
              className="flex-1 bg-[#111114] border border-[#2A2A2E] text-xs font-mono text-cyan-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              disabled={isProbingBridge}
              onClick={onProbeBridge}
              className="px-3 py-1.5 bg-[#191b22] hover:bg-[#232630] border border-[#2f3542] text-gray-200 text-xs font-mono font-bold rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw size={12} className={isProbingBridge ? "animate-spin" : ""} />
              {isProbingBridge ? "Probing..." : "Connect Bridge"}
            </button>
          </div>
          {bridgeHealth && (
            <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-mono text-gray-300">
              <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-300 flex items-center gap-1">
                <Cpu size={11} /> {bridgeHealth.gpu_name || bridgeHealth.device.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-gray-800 rounded">
                Python {bridgeHealth.python_version}
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-gray-800 rounded">
                Whisper: {bridgeHealth.whisper_available ? "Ready" : "Missing"}
              </span>
              <span className="px-2 py-0.5 bg-white/5 border border-gray-800 rounded">
                FFmpeg: {bridgeHealth.ffmpeg_available ? "Ready" : "Missing"}
              </span>
            </div>
          )}
        </div>

        {/* Direct Pinokio Python Actions */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2 border-t lg:border-t-0 lg:border-l border-[#1f2937] pt-3 lg:pt-0 lg:pl-3">
          <button
            type="button"
            disabled={!bridgeHealth || !hasAudioLoaded || isRenderingPython}
            onClick={onRenderViaPython}
            className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Video size={13} />
            {isRenderingPython
              ? "Rendering via Python + FFmpeg..."
              : "Render MP4 via Pinokio Python"}
          </button>
          <button
            type="button"
            disabled={!bridgeHealth || isBuildingFrontend}
            onClick={onBuildFrontendViaPython}
            className="w-full py-1.5 px-3 bg-[#171923] hover:bg-[#1f2332] border border-[#2d3448] disabled:opacity-40 text-cyan-300 text-[11px] font-mono font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Hammer size={12} />
            {isBuildingFrontend ? "Building Vite dist/..." : "Trigger Python Vite Build"}
          </button>
        </div>
      </div>

      {/* File Tabs & Code Inspector */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {bundleFiles.map((file) => {
            const isSelected = file.filename === activeFileObj.filename;
            return (
              <button
                key={file.filename}
                type="button"
                onClick={() => setSelectedFile(file.filename)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? file.category === "python"
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                      : "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-[#111114] border-[#26262c] text-gray-400 hover:text-gray-200 hover:border-gray-700"
                }`}
              >
                {file.filename}
              </button>
            );
          })}
        </div>

        <div className="bg-[#090a0d] border border-[#23252d] rounded-lg overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#121319] border-b border-[#23252d]">
            <div className="text-[11px] font-mono text-gray-300 flex items-center gap-2">
              <span className="font-bold text-amber-400">{activeFileObj.filename}</span>
              <span className="text-gray-500 hidden sm:inline">— {activeFileObj.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyFile}
                className="px-2.5 py-1 bg-[#1b1d26] hover:bg-[#252836] text-gray-200 text-[10px] font-mono rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                {copiedFile === activeFileObj.filename ? (
                  <>
                    <Check size={11} className="text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={11} /> Copy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile(activeFileObj.filename, activeFileObj.content)}
                className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Download size={11} /> Save File
              </button>
            </div>
          </div>
          <pre className="p-3 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-60 leading-relaxed">
            <code>{activeFileObj.content}</code>
          </pre>
        </div>
      </div>

      {/* Bottom Download Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2A2A2E]">
        <div className="text-[10px] font-mono text-gray-500">
          Pinokio Flow: Clone or drop files into <code className="text-gray-300">~/pinokio/api/soundscape-studio/</code> → Click Install → Start Studio.
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadTextFile("setup_pinokio_app.py", generatePinokioBootstrapperPy())
            }
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download size={13} /> Download All-in-One Pinokio Setup (.py)
          </button>
          <button
            type="button"
            onClick={onDownloadLegacyScript}
            className="px-3.5 py-2 bg-[#171923] hover:bg-[#222636] border border-[#2d3448] text-gray-200 text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Code size={13} /> Standalone render_visualizer.py
          </button>
        </div>
      </div>
    </div>
  );
};
