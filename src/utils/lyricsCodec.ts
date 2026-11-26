/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimedLyricLine } from "../types";

/**
 * Resample any decoded AudioBuffer into 16,000 Hz mono Float32Array PCM,
 * which is the exact waveform format required by Open Whisper models.
 */
export async function resampleAudioBufferTo16kMono(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const targetSampleRate = 16000;
  const targetLength = Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate));

  const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  const mono = rendered.getChannelData(0);
  // Copy into a standalone transferable Float32Array
  return new Float32Array(mono);
}

export function formatLrcTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const hundredths = Math.floor((safe - Math.floor(safe)) * 100);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function formatSrtTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function exportLyricsToLrc(lines: TimedLyricLine[]): string {
  return lines
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((line) => `[${formatLrcTime(line.start)}]${line.text}`)
    .join("\n");
}

export function exportLyricsToSrt(lines: TimedLyricLine[]): string {
  return lines
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((line, index) => {
      const end = Math.max(line.end, line.start + 0.5);
      return `${index + 1}\n${formatSrtTime(line.start)} --> ${formatSrtTime(end)}\n${line.text}\n`;
    })
    .join("\n");
}

export function parseLrcOrSrt(rawText: string): TimedLyricLine[] {
  const text = rawText.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  // Detect SRT format (`00:00:01,200 --> 00:00:04,500`)
  if (text.includes("-->")) {
    const blocks = text.split(/\n\s*\n/);
    const result: TimedLyricLine[] = [];
    const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

    blocks.forEach((block, idx) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const timeLineIdx = lines.findIndex((l) => timeRegex.test(l));
      if (timeLineIdx === -1) return;
      const match = lines[timeLineIdx].match(timeRegex);
      if (!match) return;

      const start =
        parseInt(match[1], 10) * 3600 +
        parseInt(match[2], 10) * 60 +
        parseInt(match[3], 10) +
        parseInt(match[4].padEnd(3, "0"), 10) / 1000;
      const end =
        parseInt(match[5], 10) * 3600 +
        parseInt(match[6], 10) * 60 +
        parseInt(match[7], 10) +
        parseInt(match[8].padEnd(3, "0"), 10) / 1000;

      const lyricText = lines.slice(timeLineIdx + 1).join(" ").trim();
      if (lyricText) {
        result.push({
          id: `srt-${idx}-${Date.now()}`,
          start,
          end: Math.max(end, start + 0.5),
          text: lyricText
        });
      }
    });
    return result.sort((a, b) => a.start - b.start);
  }

  // Parse LRC format (`[mm:ss.xx] Lyric text`)
  const lrcLines = text.split("\n");
  const parsed: Array<{ start: number; text: string }> = [];
  const lrcTagRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  lrcLines.forEach((rawLine) => {
    const matches = [...rawLine.matchAll(lrcTagRegex)];
    const lyricText = rawLine.replace(lrcTagRegex, "").trim();
    if (!lyricText || matches.length === 0) return;

    matches.forEach((m) => {
      const mins = parseInt(m[1], 10);
      const secs = parseInt(m[2], 10);
      const fracRaw = m[3] || "0";
      const frac = fracRaw.length === 3 ? parseInt(fracRaw, 10) / 1000 : parseInt(fracRaw, 10) / 100;
      parsed.push({
        start: mins * 60 + secs + frac,
        text: lyricText
      });
    });
  });

  parsed.sort((a, b) => a.start - b.start);

  return parsed.map((entry, idx) => {
    const nextStart = parsed[idx + 1]?.start;
    const end = nextStart && nextStart > entry.start ? Math.min(nextStart, entry.start + 6) : entry.start + 3.5;
    return {
      id: `lrc-${idx}-${Date.now()}`,
      start: entry.start,
      end: Math.max(entry.start + 0.4, end),
      text: entry.text
    };
  });
}
