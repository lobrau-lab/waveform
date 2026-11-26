#!/usr/bin/env python3
"""
SoundScape Studio - Python Bindings & Pinokio Build SDK
=======================================================
Programmatic Python bindings for building, transcribing, mastering, and
rendering SoundScape Studio projects inside Pinokio or standalone Python.

Usage:
    from soundscape_bindings import SoundScapeEngine, VisualConfig, VstConfig

    engine = SoundScapeEngine()
    engine.build_frontend()
    lyrics = engine.transcribe_lyrics("song.mp3", model_name="base")
    engine.render_video("song.mp3", "output.mp4", visual=VisualConfig(lyrics=lyrics))
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple


@dataclass
class StrobeConfig:
    enabled: bool = False
    intensity: float = 0.65
    threshold: float = 0.42


@dataclass
class PostFxConfig:
    scanlines: float = 0.0
    grain: float = 0.0
    vignette: float = 0.25
    glitch_shift: float = 0.0
    beat_zoom: float = 0.15
    strobe: StrobeConfig = field(default_factory=StrobeConfig)


@dataclass
class LyricLine:
    start: float
    end: float
    text: str


@dataclass
class VstConfig:
    preamp_db: float = 0.0
    low_gain_db: float = 0.0
    mid_gain_db: float = 0.0
    high_gain_db: float = 0.0
    notch_enabled: bool = False
    notch_frequency: float = 1000.0
    notch_q: float = 14.0
    master_warmth: float = 30.0
    master_compressor: bool = True
    master_limiter_gain: float = 3.5


@dataclass
class VisualConfig:
    preset: str = "Neon Waves"
    speed: float = 1.0
    sensitivity: float = 1.5
    base_color: str = "#ff007f"
    secondary_color: str = "#00ffff"
    glow: float = 15.0
    line_width: int = 4
    width: int = 1920
    height: int = 1080
    fps: int = 30
    post_fx: PostFxConfig = field(default_factory=PostFxConfig)
    lyrics: List[LyricLine] = field(default_factory=list)
    lyrics_enabled: bool = True
    lyrics_position: str = "bottom"  # bottom | center | top
    lyrics_offset_sec: float = 0.0

    @classmethod
    def from_frontend_payload(
        cls,
        visual_params: Dict[str, Any],
        resolution: str = "16:9",
        fps: int = 30,
    ) -> "VisualConfig":
        w, h = 1920, 1080
        res_upper = (resolution or "").upper()
        if "9:16" in res_upper or "TIKTOK" in res_upper:
            w, h = 1080, 1920
        elif "1:1" in res_upper or "INSTAGRAM" in res_upper:
            w, h = 1080, 1080
        elif "21:9" in res_upper or "CINEMATIC" in res_upper:
            w, h = 2560, 1080

        pfx = visual_params.get("postFx") or {}
        lyr_cfg = visual_params.get("lyrics") or {}
        raw_lines = lyr_cfg.get("lines") or []
        parsed_lines = [
            LyricLine(
                start=float(line.get("start", 0.0)),
                end=float(line.get("end", 0.0)),
                text=str(line.get("text", "")).strip(),
            )
            for line in raw_lines
            if str(line.get("text", "")).strip()
        ]

        return cls(
            preset=str(visual_params.get("preset", "Neon Waves")),
            speed=float(visual_params.get("speed", 1.0)),
            sensitivity=float(visual_params.get("sensitivity", 1.5)),
            base_color=str(visual_params.get("baseColor", "#ff007f")),
            secondary_color=str(visual_params.get("secondaryColor", "#00ffff")),
            glow=float(visual_params.get("glow", 15.0)),
            line_width=int(visual_params.get("lineWidth", 4)),
            width=w,
            height=h,
            fps=int(fps),
            post_fx=PostFxConfig(
                scanlines=float(pfx.get("scanlines", 0.0)),
                grain=float(pfx.get("grain", 0.0)),
                vignette=float(pfx.get("vignette", 0.25)),
                glitch_shift=float(pfx.get("glitchShift", 0.0)),
                beat_zoom=float(pfx.get("beatZoom", 0.15)),
                strobe=StrobeConfig(
                    enabled=bool(pfx.get("strobeEnabled", False)),
                    intensity=float(pfx.get("strobeIntensity", 0.65)),
                    threshold=float(pfx.get("strobeThreshold", 0.42)),
                ),
            ),
            lyrics=parsed_lines,
            lyrics_enabled=bool(lyr_cfg.get("enabled", True)),
            lyrics_position=str(lyr_cfg.get("position", "bottom")),
            lyrics_offset_sec=float(lyr_cfg.get("offsetSec", 0.0)),
        )


def format_lrc_timestamp(seconds: float) -> str:
    safe = max(0.0, float(seconds))
    mins = int(safe // 60)
    secs = int(safe % 60)
    cs = int(round((safe - int(safe)) * 100))
    if cs >= 100:
        secs += 1
        cs = 0
    return f"{mins:02d}:{secs:02d}.{cs:02d}"


def lyrics_to_lrc(lines: List[LyricLine]) -> str:
    return "\n".join(f"[{format_lrc_timestamp(l.start)}]{l.text}" for l in lines)


def _format_srt_timestamp(seconds: float) -> str:
    safe = max(0.0, float(seconds))
    hrs = int(safe // 3600)
    mins = int((safe % 3600) // 60)
    secs = int(safe % 60)
    ms = int(round((safe - int(safe)) * 1000))
    if ms >= 1000:
        secs += 1
        ms = 0
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def lyrics_to_srt(lines: List[LyricLine]) -> str:
    blocks = []
    for idx, line in enumerate(lines, start=1):
        blocks.append(
            f"{idx}\n{_format_srt_timestamp(line.start)} --> {_format_srt_timestamp(line.end)}\n{line.text}"
        )
    return "\n\n".join(blocks)


def _hex_to_bgr(hex_str: str) -> Tuple[int, int, int]:
    cleaned = (hex_str or "#ffffff").lstrip("#")
    if len(cleaned) != 6:
        return (255, 255, 255)
    r = int(cleaned[0:2], 16)
    g = int(cleaned[2:4], 16)
    b = int(cleaned[4:6], 16)
    return (b, g, r)


class SoundScapeEngine:
    """High-level Python bindings for building and running SoundScape Studio in Pinokio."""

    def __init__(self, project_root: Optional[str | Path] = None) -> None:
        self.project_root = Path(project_root or Path(__file__).resolve().parent)
        self._whisper_cache: Dict[str, Any] = {}

    def detect_hardware(self) -> Dict[str, Any]:
        device = "cpu"
        gpu_name = None
        torch_version = None
        try:
            import torch

            torch_version = getattr(torch, "__version__", None)
            if torch.cuda.is_available():
                device = "cuda"
                gpu_name = torch.cuda.get_device_name(0)
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                device = "mps"
                gpu_name = "Apple Silicon MPS"
        except Exception:
            pass

        def _has_module(name: str) -> bool:
            try:
                __import__(name)
                return True
            except Exception:
                return False

        dist_index = self.project_root / "dist" / "index.html"
        return {
            "device": device,
            "gpu_name": gpu_name,
            "torch_version": torch_version,
            "whisper_available": _has_module("whisper"),
            "cv2_available": _has_module("cv2"),
            "librosa_available": _has_module("librosa"),
            "ffmpeg_available": shutil.which("ffmpeg") is not None,
            "node_available": shutil.which("node") is not None,
            "npm_available": shutil.which("npm") is not None,
            "dist_built": dist_index.exists(),
            "project_root": str(self.project_root),
            "python_version": sys.version.split()[0],
        }

    def build_frontend(self, install_deps: bool = False) -> Dict[str, Any]:
        """Build the React + Vite frontend bundle from Python (for Pinokio workflows)."""
        npm_bin = shutil.which("npm") or ("npm.cmd" if os.name == "nt" else None)
        if not npm_bin:
            raise RuntimeError("npm was not found in PATH. Ensure Node.js is installed in Pinokio.")

        logs: List[str] = []
        node_modules = self.project_root / "node_modules"
        if install_deps or not node_modules.exists():
            proc = subprocess.run(
                [npm_bin, "install"],
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                check=False,
            )
            logs.append(proc.stdout + proc.stderr)
            if proc.returncode != 0:
                raise RuntimeError(f"npm install failed:\n{proc.stderr or proc.stdout}")

        build_proc = subprocess.run(
            [npm_bin, "run", "build"],
            cwd=str(self.project_root),
            capture_output=True,
            text=True,
            check=False,
        )
        logs.append(build_proc.stdout + build_proc.stderr)
        if build_proc.returncode != 0:
            raise RuntimeError(f"npm run build failed:\n{build_proc.stderr or build_proc.stdout}")

        dist_dir = self.project_root / "dist"
        return {
            "ok": (dist_dir / "index.html").exists(),
            "dist_dir": str(dist_dir),
            "log": "\n".join(logs)[-4000:],
        }

    def normalize_whisper_model_name(self, model_name: str) -> str:
        """Map ONNX/HuggingFace Whisper IDs from the web UI to native openai-whisper model names."""
        raw = (model_name or "base").strip().lower()
        mapping = {
            "onnx-community/whisper-tiny.en": "tiny.en",
            "onnx-community/whisper-tiny": "tiny",
            "onnx-community/whisper-base.en": "base.en",
            "onnx-community/whisper-base": "base",
            "onnx-community/whisper-small.en": "small.en",
            "onnx-community/whisper-small": "small",
        }
        return mapping.get(raw, raw)

    def transcribe_lyrics(
        self,
        audio_path: str | Path,
        model_name: str = "base",
        language: Optional[str] = None,
        device: Optional[str] = None,
    ) -> List[LyricLine]:
        """Run native OpenAI Whisper transcription on GPU/MPS/CPU and return timed LyricLines."""
        try:
            import whisper
        except ImportError as exc:
            raise RuntimeError(
                "openai-whisper is not installed in this Python environment. "
                "Run: pip install openai-whisper"
            ) from exc

        hw = self.detect_hardware()
        target_device = device or hw["device"]
        # Whisper on MPS can occasionally hit sparse op issues; fallback safely if needed
        resolved_model = self.normalize_whisper_model_name(model_name)
        cache_key = f"{resolved_model}:{target_device}"

        if cache_key not in self._whisper_cache:
            try:
                self._whisper_cache[cache_key] = whisper.load_model(resolved_model, device=target_device)
            except Exception:
                target_device = "cpu"
                cache_key = f"{resolved_model}:cpu"
                self._whisper_cache[cache_key] = whisper.load_model(resolved_model, device="cpu")

        model = self._whisper_cache[cache_key]
        options: Dict[str, Any] = {
            "fp16": target_device == "cuda",
            "verbose": False,
        }
        if language:
            options["language"] = language

        result = model.transcribe(str(audio_path), **options)
        lines: List[LyricLine] = []
        for seg in result.get("segments", []):
            text = (seg.get("text") or "").strip()
            if text:
                start = round(float(seg.get("start", 0.0)), 3)
                end = round(max(start + 0.35, float(seg.get("end", start + 2.5))), 3)
                lines.append(LyricLine(start=start, end=end, text=text))
        return lines

    def process_audio_dsp(
        self,
        audio_path: str | Path,
        vst: Optional[VstConfig] = None,
        output_wav_path: Optional[str | Path] = None,
        sample_rate: int = 44100,
    ) -> Tuple[Any, int, Optional[Path]]:
        """Apply VST watermark notch filter, preamp, analog warmth saturation, and brickwall limiter."""
        import librosa
        import numpy as np
        import soundfile as sf
        from scipy.signal import iirnotch, lfilter

        cfg = vst or VstConfig()
        y, sr = librosa.load(str(audio_path), sr=sample_rate, mono=False)

        if cfg.notch_enabled and 20.0 < cfg.notch_frequency < (sr / 2.0 - 10.0):
            b, a = iirnotch(cfg.notch_frequency, max(0.5, cfg.notch_q), sr)
            if y.ndim > 1:
                for ch in range(y.shape[0]):
                    y[ch] = lfilter(b, a, y[ch])
            else:
                y = lfilter(b, a, y)

        # Preamp + limiter makeup
        gain_db = cfg.preamp_db + (cfg.master_limiter_gain * 0.35 if cfg.master_compressor else 0.0)
        y = y * (10.0 ** (gain_db / 20.0))

        # Subtle analog tube warmth saturation
        if cfg.master_warmth > 0:
            drive = 1.0 + (cfg.master_warmth / 100.0) * 1.4
            y = np.tanh(y * drive) / np.tanh(drive)

        # Soft peak limiter to -0.3 dBFS
        peak = float(np.max(np.abs(y))) if y.size else 1.0
        ceiling = 0.966
        if peak > ceiling:
            y = y * (ceiling / peak)

        saved_path: Optional[Path] = None
        if output_wav_path:
            saved_path = Path(output_wav_path)
            sf.write(str(saved_path), y.T if y.ndim > 1 else y, sr)

        return y, sr, saved_path

    def render_video(
        self,
        audio_path: str | Path,
        output_path: str | Path,
        visual: Optional[VisualConfig] = None,
        vst: Optional[VstConfig] = None,
        auto_whisper: bool = False,
        whisper_model: str = "base",
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ) -> Path:
        """Render a full high-definition MP4 music visualizer with strobe FX & Whisper timed lyrics."""
        import cv2
        import librosa
        import numpy as np
        import soundfile as sf

        vcfg = visual or VisualConfig()
        acfg = vst or VstConfig()

        y, sr, _ = self.process_audio_dsp(audio_path, acfg)
        timed_lyrics = list(vcfg.lyrics)
        if auto_whisper and not timed_lyrics:
            timed_lyrics = self.transcribe_lyrics(audio_path, model_name=whisper_model)

        y_mono = librosa.to_mono(y) if y.ndim > 1 else y
        stft = np.abs(librosa.stft(y_mono, n_fft=1024, hop_length=512))
        times = librosa.frames_to_time(np.arange(stft.shape[1]), sr=sr, hop_length=512)

        fps = max(12, int(vcfg.fps))
        duration = len(y_mono) / float(sr)
        total_frames = max(1, int(duration * fps))
        width, height = int(vcfg.width), int(vcfg.height)

        out_path = Path(output_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)

        bgr_primary = _hex_to_bgr(vcfg.base_color)
        bgr_secondary = _hex_to_bgr(vcfg.secondary_color)

        with tempfile.TemporaryDirectory(prefix="soundscape_render_") as tmp_dir:
            raw_video_path = Path(tmp_dir) / "visuals_only.mp4"
            temp_wav_path = Path(tmp_dir) / "master_audio.wav"
            sf.write(str(temp_wav_path), y.T if y.ndim > 1 else y, sr)

            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(raw_video_path), fourcc, fps, (width, height))
            if not writer.isOpened():
                raise RuntimeError("OpenCV VideoWriter failed to open MP4 encoder.")

            strobe_env = 0.0
            num_bars = 48

            for frame_idx in range(total_frames):
                t = frame_idx / float(fps)
                stft_idx = min(stft.shape[1] - 1, int(np.searchsorted(times, t)))
                spectrum = stft[:, stft_idx]

                chunk_size = max(1, len(spectrum) // num_bars)
                bars = np.array(
                    [np.mean(spectrum[b * chunk_size : (b + 1) * chunk_size]) for b in range(num_bars)],
                    dtype=np.float32,
                )
                bars_scaled = np.clip(bars * (vcfg.sensitivity * 6.5), 0.0, 1.0)
                high_level_norm = float(np.mean(bars_scaled[int(num_bars * 0.55) :]))

                frame = np.zeros((height, width, 3), dtype=np.uint8)
                preset_lower = vcfg.preset.lower()

                if "bar" in preset_lower or "equalizer" in preset_lower:
                    bar_w = max(2, width // num_bars)
                    for i in range(num_bars):
                        h_val = int(bars_scaled[i] * height * 0.72)
                        color = bgr_primary if i % 2 == 0 else bgr_secondary
                        cv2.rectangle(
                            frame,
                            (i * bar_w, height),
                            ((i + 1) * bar_w - 2, height - h_val),
                            color,
                            -1,
                        )
                elif "tunnel" in preset_lower or "star" in preset_lower or "corridor" in preset_lower:
                    cx, cy = width // 2, height // 2
                    pulse = int(float(np.mean(bars_scaled)) * 120)
                    for r in range(45, min(width, height) // 2, 42):
                        cv2.circle(frame, (cx, cy), r + pulse, bgr_secondary, 2)
                    for i in range(10):
                        ang = (i / 10.0) * 2.0 * np.pi + (frame_idx * 0.045 * vcfg.speed)
                        ex = int(cx + np.cos(ang) * (min(width, height) // 2))
                        ey = int(cy + np.sin(ang) * (min(width, height) // 2))
                        cv2.line(frame, (cx, cy), (ex, ey), bgr_primary, 2)
                else:
                    cy = height // 2
                    pts = []
                    step = max(2, width // 320)
                    for x in range(0, width, step):
                        amp_idx = min(num_bars - 1, int((x / float(width)) * num_bars))
                        offset = int(
                            bars_scaled[amp_idx]
                            * (height * 0.24)
                            * np.sin(x * 0.012 + frame_idx * 0.12 * vcfg.speed)
                        )
                        pts.append((x, cy + offset))
                    for i in range(len(pts) - 1):
                        cv2.line(frame, pts[i], pts[i + 1], bgr_primary, max(1, vcfg.line_width))

                # Glow bloom
                if vcfg.glow > 0:
                    k = max(3, int(vcfg.glow * 1.4) | 1)
                    blurred = cv2.GaussianBlur(frame, (k, k), 0)
                    frame = cv2.addWeighted(frame, 0.85, blurred, 0.45, 0)

                # Scanlines
                if vcfg.post_fx.scanlines > 0.05:
                    alpha_sl = min(0.65, vcfg.post_fx.scanlines * 0.5)
                    frame[::4, :, :] = (frame[::4, :, :].astype(np.float32) * (1.0 - alpha_sl)).astype(np.uint8)

                # Global High-Frequency Strobe Flash (mirrors CustomizationStudio strobe)
                strobe = vcfg.post_fx.strobe
                if strobe.enabled and strobe.intensity > 0:
                    if high_level_norm >= strobe.threshold:
                        overshoot = (high_level_norm - strobe.threshold) / max(0.08, 1.0 - strobe.threshold)
                        strobe_env = max(strobe_env, min(1.0, 0.45 + overshoot * 0.75))
                    else:
                        strobe_env *= 0.68
                    if strobe_env > 0.02:
                        flash_alpha = min(0.92, strobe_env * strobe.intensity * 0.9)
                        white = np.full_like(frame, 255)
                        frame = cv2.addWeighted(frame, 1.0 - flash_alpha * 0.45, white, flash_alpha, 0)

                # Open Whisper Timed Lyrics Burn-In
                if vcfg.lyrics_enabled and timed_lyrics:
                    sync_t = t + vcfg.lyrics_offset_sec
                    for line in timed_lyrics:
                        if line.start <= sync_t <= line.end:
                            font_scale = max(0.7, width / 1400.0)
                            (tw, th), _ = cv2.getTextSize(line.text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, 2)
                            tx = max(28, (width - tw) // 2)
                            if vcfg.lyrics_position == "top":
                                ty = int(height * 0.14)
                            elif vcfg.lyrics_position == "center":
                                ty = int(height * 0.52)
                            else:
                                ty = int(height * 0.88)
                            cv2.rectangle(
                                frame,
                                (tx - 18, ty - th - 14),
                                (tx + tw + 18, ty + 14),
                                (10, 12, 18),
                                -1,
                            )
                            cv2.putText(
                                frame,
                                line.text,
                                (tx, ty),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                font_scale,
                                (255, 255, 255),
                                2,
                                cv2.LINE_AA,
                            )
                            break

                writer.write(frame)
                if progress_callback and frame_idx % max(1, fps) == 0:
                    progress_callback(frame_idx, total_frames)

            writer.release()

            ffmpeg_bin = shutil.which("ffmpeg")
            if ffmpeg_bin:
                mux_cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-i",
                    str(raw_video_path),
                    "-i",
                    str(temp_wav_path),
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "256k",
                    "-shortest",
                    str(out_path),
                ]
                proc = subprocess.run(mux_cmd, capture_output=True, text=True, check=False)
                if proc.returncode != 0:
                    # Fallback to stream copy if libx264 is unavailable
                    fallback_cmd = [
                        ffmpeg_bin,
                        "-y",
                        "-i",
                        str(raw_video_path),
                        "-i",
                        str(temp_wav_path),
                        "-c:v",
                        "copy",
                        "-c:a",
                        "aac",
                        "-b:a",
                        "256k",
                        str(out_path),
                    ]
                    subprocess.run(fallback_cmd, check=True)
            else:
                shutil.copyfile(raw_video_path, out_path)

        return out_path


def _cli() -> None:
    parser = argparse.ArgumentParser(description="SoundScape Studio Python Bindings CLI (Pinokio Ready)")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("info", help="Inspect GPU, Whisper, FFmpeg, and frontend build readiness")

    p_build = sub.add_parser("build", help="Install/build the React + Vite frontend bundle")
    p_build.add_argument("--install", action="store_true", help="Run npm install before npm run build")

    p_tx = sub.add_parser("transcribe", help="Transcribe timed lyrics using local OpenAI Whisper")
    p_tx.add_argument("audio", help="Input audio file path")
    p_tx.add_argument("--model", default="base", help="Whisper model (tiny.en, base, small, medium, large-v3)")
    p_tx.add_argument("--format", choices=["json", "lrc", "srt"], default="lrc")

    p_ren = sub.add_parser("render", help="Render an MP4 visualizer video via Python bindings")
    p_ren.add_argument("audio", help="Input audio file path")
    p_ren.add_argument("-o", "--output", default="soundscape_render.mp4", help="Output MP4 path")
    p_ren.add_argument("--preset", default="Neon Waves", help="Visualizer preset name")
    p_ren.add_argument("--strobe", action="store_true", help="Enable global high-frequency strobe")
    p_ren.add_argument("--strobe-intensity", type=float, default=0.65)
    p_ren.add_argument("--whisper", action="store_true", help="Auto-transcribe and burn in timed Whisper lyrics")
    p_ren.add_argument("--whisper-model", default="base")

    args = parser.parse_args()
    engine = SoundScapeEngine()

    if args.command == "info":
        print(json.dumps(engine.detect_hardware(), indent=2))
    elif args.command == "build":
        res = engine.build_frontend(install_deps=args.install)
        print(json.dumps(res, indent=2))
    elif args.command == "transcribe":
        lines = engine.transcribe_lyrics(args.audio, model_name=args.model)
        if args.format == "lrc":
            print(lyrics_to_lrc(lines))
        elif args.format == "srt":
            print(lyrics_to_srt(lines))
        else:
            print(json.dumps([asdict(l) for l in lines], indent=2))
    elif args.command == "render":
        vcfg = VisualConfig(
            preset=args.preset,
            post_fx=PostFxConfig(
                strobe=StrobeConfig(enabled=args.strobe, intensity=args.strobe_intensity)
            ),
        )
        out = engine.render_video(
            args.audio,
            args.output,
            visual=vcfg,
            auto_whisper=args.whisper,
            whisper_model=args.whisper_model,
        )
        print(f"Rendered: {out}")


if __name__ == "__main__":
    _cli()
