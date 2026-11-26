/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { pipeline, env } from "@huggingface/transformers";

// Allow fetching Open Whisper ONNX weights on first run and caching locally in browser Cache API
env.allowLocalModels = false;
env.useBrowserCache = true;

let cachedModelId: string | null = null;
let transcriberPromise: Promise<any> | null = null;

async function getTranscriber(modelId: string, onProgress: (info: any) => void) {
  if (transcriberPromise && cachedModelId === modelId) {
    return transcriberPromise;
  }

  cachedModelId = modelId;

  // Prefer WebGPU if available on device, otherwise fall back cleanly to WASM
  let device: "webgpu" | "wasm" = "wasm";
  try {
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      const adapter = await (navigator as any).gpu?.requestAdapter?.();
      if (adapter) {
        device = "webgpu";
      }
    }
  } catch {
    device = "wasm";
  }

  const createPipeline = async (targetDevice: "webgpu" | "wasm") => {
    return pipeline("automatic-speech-recognition", modelId, {
      device: targetDevice,
      dtype: targetDevice === "webgpu"
        ? { encoder_model: "fp32", decoder_model_merged: "q4" }
        : "q8",
      progress_callback: (data: any) => {
        onProgress(data);
      }
    });
  };

  transcriberPromise = createPipeline(device).catch(async (err) => {
    if (device === "webgpu") {
      // Graceful automatic fallback to universal WASM runtime
      return createPipeline("wasm");
    }
    transcriberPromise = null;
    cachedModelId = null;
    throw err;
  });

  return transcriberPromise;
}

self.addEventListener("message", async (event: MessageEvent) => {
  const { type, audio, modelId, duration } = event.data || {};
  if (type !== "transcribe") return;

  try {
    self.postMessage({
      status: "loading",
      progress: 0,
      message: `Initializing Open Whisper (${modelId.split("/").pop()}) on device...`
    });

    const transcriber = await getTranscriber(modelId, (progressData: any) => {
      if (progressData?.status === "progress") {
        const pct = typeof progressData.progress === "number" ? Math.round(progressData.progress) : 0;
        self.postMessage({
          status: "loading",
          progress: pct,
          file: progressData.file || "",
          message: `Caching Open Whisper weights (${pct}%)...`
        });
      } else if (progressData?.status === "ready") {
        self.postMessage({
          status: "transcribing",
          progress: 100,
          message: "Model cached on device. Transcribing & aligning lyric timestamps..."
        });
      }
    });

    self.postMessage({
      status: "transcribing",
      progress: 100,
      message: "Running on-device Open Whisper transcription..."
    });

    const isEnglishOnly = modelId.endsWith(".en");
    const output = await transcriber(audio as Float32Array, {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      ...(isEnglishOnly ? {} : { task: "transcribe" })
    });

    const rawChunks: Array<{ timestamp?: [number | null, number | null]; text?: string }> = Array.isArray(output?.chunks)
      ? output.chunks
      : [];

    const totalDuration = typeof duration === "number" && Number.isFinite(duration) ? duration : 180;

    const lines = rawChunks
      .map((chunk, idx) => {
        const cleaned = (chunk.text || "").trim();
        if (!cleaned) return null;
        const start = typeof chunk.timestamp?.[0] === "number" ? Math.max(0, chunk.timestamp[0]) : 0;
        const rawEnd = chunk.timestamp?.[1];
        const nextStart = rawChunks[idx + 1]?.timestamp?.[0];
        const end =
          typeof rawEnd === "number" && rawEnd > start
            ? rawEnd
            : typeof nextStart === "number" && nextStart > start
              ? nextStart
              : Math.min(totalDuration, start + 3.5);

        return {
          id: `wh-${idx}-${Date.now()}`,
          start: Number(start.toFixed(2)),
          end: Number(Math.max(start + 0.35, end).toFixed(2)),
          text: cleaned
        };
      })
      .filter(Boolean);

    // Fallback if model returned full text without chunk splits
    if (lines.length === 0 && typeof output?.text === "string" && output.text.trim()) {
      lines.push({
        id: `wh-0-${Date.now()}`,
        start: 0,
        end: Math.min(totalDuration, 6),
        text: output.text.trim()
      });
    }

    self.postMessage({
      status: "complete",
      lines,
      fullText: output?.text || ""
    });
  } catch (err: any) {
    self.postMessage({
      status: "error",
      error: err?.message || String(err) || "Open Whisper failed to run on this device."
    });
  }
});
