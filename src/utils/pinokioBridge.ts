/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pinokioJsRaw from "../../pinokio.js?raw";
import installJsRaw from "../../install.js?raw";
import startJsRaw from "../../start.js?raw";
import torchJsRaw from "../../torch.js?raw";
import updateJsRaw from "../../update.js?raw";
import resetJsRaw from "../../reset.js?raw";
import requirementsTxtRaw from "../../requirements.txt?raw";
import soundscapeBindingsPyRaw from "../../soundscape_bindings.py?raw";
import pinokioServerPyRaw from "../../pinokio_server.py?raw";

import {
  CanvasResolution,
  TimedLyricLine,
  VisualParams,
  VstSettings,
  WhisperModelId
} from "../types";

export interface PinokioBridgeHealth {
  device: "cuda" | "mps" | "cpu" | string;
  gpu_name: string | null;
  torch_version: string | null;
  whisper_available: boolean;
  cv2_available: boolean;
  librosa_available: boolean;
  ffmpeg_available: boolean;
  node_available: boolean;
  npm_available: boolean;
  dist_built: boolean;
  project_root: string;
  python_version: string;
  pinokio_mode?: boolean;
  bridge?: string;
}

export interface PinokioBundleFile {
  filename: string;
  category: "pinokio" | "python";
  description: string;
  content: string;
}

export function getPinokioBundleFiles(): PinokioBundleFile[] {
  return [
    {
      filename: "pinokio.js",
      category: "pinokio",
      description: "Pinokio sidebar menu & lifecycle controller",
      content: pinokioJsRaw
    },
    {
      filename: "install.js",
      category: "pinokio",
      description: "Installs PyTorch, Python bindings, Whisper & builds Vite dist/",
      content: installJsRaw
    },
    {
      filename: "start.js",
      category: "pinokio",
      description: "Launches pinokio_server.py daemon & attaches webview URL",
      content: startJsRaw
    },
    {
      filename: "torch.js",
      category: "pinokio",
      description: "GPU-aware PyTorch installer (CUDA / MPS / ROCm / CPU)",
      content: torchJsRaw
    },
    {
      filename: "soundscape_bindings.py",
      category: "python",
      description: "Core Python SDK (build_frontend, Whisper, DSP, OpenCV+FFmpeg)",
      content: soundscapeBindingsPyRaw
    },
    {
      filename: "pinokio_server.py",
      category: "python",
      description: "FastAPI local bridge & static web server for Pinokio",
      content: pinokioServerPyRaw
    },
    {
      filename: "requirements.txt",
      category: "python",
      description: "Python package dependencies for Pinokio venv",
      content: requirementsTxtRaw
    },
    {
      filename: "update.js",
      category: "pinokio",
      description: "Git pull, dependency sync, and frontend rebuild script",
      content: updateJsRaw
    },
    {
      filename: "reset.js",
      category: "pinokio",
      description: "Cleans env/ and dist/ directories for a fresh install",
      content: resetJsRaw
    }
  ];
}

function normalizeBaseUrl(baseUrl?: string): string {
  const trimmed = (baseUrl || "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/+$/, "");
}

export async function probePinokioBridge(baseUrl?: string): Promise<PinokioBridgeHealth | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);
  try {
    const endpoint = `${normalizeBaseUrl(baseUrl)}/api/python/health`;
    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PinokioBridgeHealth;
    if (!data || data.bridge !== "soundscape-pinokio-python") return null;
    return data;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function transcribeViaPinokioPython(
  audioBlob: Blob,
  filename: string,
  modelId: WhisperModelId | string,
  baseUrl?: string
): Promise<{
  lines: TimedLyricLine[];
  device: string;
  gpuName: string | null;
  model: string;
}> {
  const form = new FormData();
  form.append("audio", audioBlob, filename || "track.wav");
  form.append("model", modelId);

  const endpoint = `${normalizeBaseUrl(baseUrl)}/api/python/whisper/transcribe`;
  const res = await fetch(endpoint, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Python Whisper transcription failed.");
    throw new Error(errText || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const lines: TimedLyricLine[] = Array.isArray(data.lines)
    ? data.lines.map((l: { start: number; end: number; text: string }, idx: number) => ({
        id: `py-whisper-${idx}-${Date.now()}`,
        start: Number(l.start || 0),
        end: Number(l.end || 0),
        text: String(l.text || "").trim()
      }))
    : [];

  return {
    lines,
    device: String(data.device || "cpu"),
    gpuName: data.gpu_name ? String(data.gpu_name) : null,
    model: String(data.model || modelId)
  };
}

export async function renderViaPinokioPython(
  audioBlob: Blob,
  filename: string,
  visualParams: VisualParams,
  vstSettings: VstSettings,
  resolution: CanvasResolution,
  fps: number,
  autoWhisper: boolean,
  baseUrl?: string
): Promise<Blob> {
  const form = new FormData();
  form.append("audio", audioBlob, filename || "track.wav");
  form.append("visual_params_json", JSON.stringify(visualParams));
  form.append("vst_settings_json", JSON.stringify(vstSettings));
  form.append("resolution", resolution);
  form.append("fps", String(fps));
  form.append("auto_whisper", autoWhisper ? "true" : "false");
  form.append("whisper_model", visualParams.lyrics?.modelId || "base");

  const endpoint = `${normalizeBaseUrl(baseUrl)}/api/python/render`;
  const res = await fetch(endpoint, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Python MP4 render failed.");
    throw new Error(errText || `HTTP ${res.status}`);
  }

  return await res.blob();
}

export async function triggerPinokioFrontendBuild(
  installDeps: boolean,
  baseUrl?: string
): Promise<{ ok: boolean; dist_dir: string; log: string }> {
  const form = new FormData();
  form.append("install_deps", installDeps ? "true" : "false");

  const endpoint = `${normalizeBaseUrl(baseUrl)}/api/python/build`;
  const res = await fetch(endpoint, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Frontend build failed.");
    throw new Error(errText || `HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Generates a self-extracting Python bootstrap script that writes all Pinokio
 * launcher scripts + Python bindings into the current SoundScape Studio directory.
 */
export function generatePinokioBootstrapperPy(): string {
  const files = getPinokioBundleFiles();
  const payload = Object.fromEntries(files.map((f) => [f.filename, f.content]));
  const serialized = JSON.stringify(payload, null, 2);

  return `#!/usr/bin/env python3
"""
SoundScape Studio - Pinokio Python Bindings Bootstrapper
========================================================
Run this script inside your SoundScape Studio project folder to install all
Pinokio launcher scripts (pinokio.js, install.js, start.js, torch.js, update.js,
reset.js) and Python bindings (soundscape_bindings.py, pinokio_server.py,
requirements.txt) in one step.

Usage:
    python setup_pinokio_app.py
    python soundscape_bindings.py build --install
"""

import json
from pathlib import Path

FILES = json.loads(r'''${serialized.replace(/'''/g, "\\'\\'\\'")}''')


def main() -> None:
    root = Path.cwd()
    for filename, content in FILES.items():
        target = root / filename
        target.write_text(content, encoding="utf-8")
        print(f"  [OK] Wrote {target}")
    print("\\nAll Pinokio scripts & Python bindings are ready!")
    print("Next step: Open this folder in Pinokio and click 'Install', or run:")
    print("  python soundscape_bindings.py build --install")
    print("  python pinokio_server.py --port 7860")


if __name__ == "__main__":
    main()
`;
}
