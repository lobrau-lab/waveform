#!/usr/bin/env python3
"""
SoundScape Studio - Pinokio Python Bridge & Static Web Server
=============================================================
Serves the compiled SoundScape Studio Vite web app (dist/) AND exposes
local Python API bindings for GPU-accelerated OpenAI Whisper transcription,
offline DSP mastering, OpenCV+FFmpeg MP4 rendering, and frontend rebuilds.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from dataclasses import asdict
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from soundscape_bindings import (
    SoundScapeEngine,
    VisualConfig,
    VstConfig,
    lyrics_to_lrc,
    lyrics_to_srt,
)

PROJECT_ROOT = Path(__file__).resolve().parent
DIST_DIR = PROJECT_ROOT / "dist"
engine = SoundScapeEngine(project_root=PROJECT_ROOT)

app = FastAPI(
    title="SoundScape Studio Pinokio Python Bridge",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/python/health")
async def python_health():
    info = engine.detect_hardware()
    info["pinokio_mode"] = True
    info["bridge"] = "soundscape-pinokio-python"
    return JSONResponse(info)


@app.post("/api/python/build")
async def trigger_frontend_build(install_deps: bool = Form(False)):
    try:
        result = engine.build_frontend(install_deps=install_deps)
        return JSONResponse(result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/python/whisper/transcribe")
async def whisper_transcribe(
    audio: UploadFile = File(...),
    model: str = Form("base"),
    language: Optional[str] = Form(None),
):
    suffix = Path(audio.filename or "track.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        lines = engine.transcribe_lyrics(
            tmp_path,
            model_name=model,
            language=language or None,
        )
        hw = engine.detect_hardware()
        return JSONResponse(
            {
                "model": engine.normalize_whisper_model_name(model),
                "device": hw["device"],
                "gpu_name": hw["gpu_name"],
                "lines": [asdict(l) for l in lines],
                "lrc": lyrics_to_lrc(lines),
                "srt": lyrics_to_srt(lines),
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)


@app.post("/api/python/render")
async def render_mp4(
    audio: UploadFile = File(...),
    visual_params_json: str = Form("{}"),
    vst_settings_json: str = Form("{}"),
    resolution: str = Form("16:9"),
    fps: int = Form(30),
    auto_whisper: bool = Form(False),
    whisper_model: str = Form("base"),
):
    suffix = Path(audio.filename or "track.wav").suffix or ".wav"
    tmp_dir = Path(tempfile.mkdtemp(prefix="soundscape_pinokio_"))
    input_path = tmp_dir / f"input{suffix}"
    output_path = tmp_dir / "soundscape_pinokio_master.mp4"

    with open(input_path, "wb") as f:
        f.write(await audio.read())

    try:
        visual_raw = json.loads(visual_params_json or "{}")
        vst_raw = json.loads(vst_settings_json or "{}")

        vcfg = VisualConfig.from_frontend_payload(visual_raw, resolution=resolution, fps=fps)
        acfg = VstConfig(
            preamp_db=float(vst_raw.get("preamp", 0.0)),
            low_gain_db=float(vst_raw.get("lowGain", 0.0)),
            mid_gain_db=float(vst_raw.get("midGain", 0.0)),
            high_gain_db=float(vst_raw.get("highGain", 0.0)),
            notch_enabled=bool(vst_raw.get("notchEnabled", False)),
            notch_frequency=float(vst_raw.get("notchFrequency", 1000.0)),
            notch_q=float(vst_raw.get("notchQ", 14.0)),
            master_warmth=float(vst_raw.get("masterWarmth", 30.0)),
            master_compressor=bool(vst_raw.get("masterCompressor", True)),
            master_limiter_gain=float(vst_raw.get("masterLimiterGain", 3.5)),
        )

        engine.render_video(
            input_path,
            output_path,
            visual=vcfg,
            vst=acfg,
            auto_whisper=auto_whisper,
            whisper_model=whisper_model,
        )
        return FileResponse(
            path=str(output_path),
            media_type="video/mp4",
            filename="soundscape_pinokio_render.mp4",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# Serve compiled Vite frontend when built inside Pinokio
if DIST_DIR.exists():
    assets_dir = DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = DIST_DIR / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        index_html = DIST_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))
        raise HTTPException(status_code=404, detail="Frontend dist/index.html not built yet.")


def main() -> None:
    parser = argparse.ArgumentParser(description="SoundScape Studio Pinokio Bridge Server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "7860")))
    parser.add_argument("--auto-build", action="store_true", help="Build frontend automatically if dist/ is missing")
    args = parser.parse_args()

    if args.auto_build and not (DIST_DIR / "index.html").exists():
        print("-> dist/ not found; building SoundScape Studio frontend via Python bindings...")
        engine.build_frontend(install_deps=not (PROJECT_ROOT / "node_modules").exists())

    # Standard Pinokio URL announcement line matched by start.js
    print(f"Running on local URL: http://{args.host}:{args.port}", flush=True)
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
