/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VisualParams, VisualPreset } from "./types";

interface DrawOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  freqData: Uint8Array;
  timeData: Uint8Array;
  time: number;
  params: VisualParams;
  prevParams?: VisualParams | null;
  progress?: number;
}

// Stored compiled user functions to avoid eval overhead on every frame
let cachedUserFunc: Function | null = null;
let cachedCodeString = "";

export function drawPreset(preset: VisualPreset, options: DrawOptions, currentParams: VisualParams) {
  const opt = { ...options, params: currentParams };
  const { ctx } = options;

  // Apply Glow
  if (currentParams.glow > 0) {
    ctx.shadowBlur = currentParams.glow;
    ctx.shadowColor = currentParams.baseColor;
  } else {
    ctx.shadowBlur = 0;
  }

  // Choose routine based on Selected Preset
  switch (preset) {
    case VisualPreset.WAVEFORM_NEON:
      drawNeonWaveform(opt);
      break;
    case VisualPreset.SPECTRUM_BARS:
      drawSpectrumBars(opt);
      break;
    case VisualPreset.COSMIC_TUNNEL:
      drawCosmicTunnel(opt);
      break;
    case VisualPreset.GEOCITIES_STARS:
      drawGeocitiesStars(opt);
      break;
    case VisualPreset.ORBITAL_VORTEX:
      drawOrbitalVortex(opt);
      break;
    case VisualPreset.MYSPACE_DISCO:
      drawMySpaceDisco(opt);
      break;
    case VisualPreset.FRACTAL_MANDALA:
      drawFractalMandala(opt);
      break;
    case VisualPreset.CYBER_GRID_MATRIX:
      drawCyberGridMatrix(opt);
      break;
    case VisualPreset.FLUID_LIQUID_SWARM:
      drawFluidLiquidSwarm(opt);
      break;
    case VisualPreset.PLAYSTATION_SOUNDSCOPE:
      drawPlayStationSoundScope(opt);
      break;
    case VisualPreset.SUPER_SCIENCE_80S:
      drawSuperScience80s(opt);
      break;
    case VisualPreset.CUSTOM_JS:
      drawCustomJs(opt);
      break;
    default:
      drawNeonWaveform(opt);
  }
}

export function drawMainVisuals(options: DrawOptions) {
  const { ctx, width, height, params, prevParams, progress = 1 } = options;

  // Apply motion-blur trails by clearing with an alpha opacity
  const alpha = params.bgOpacity ?? 0.3;
  ctx.fillStyle = `rgba(10, 10, 12, ${alpha})`;
  ctx.fillRect(0, 0, width, height);

  // 1. Draw any active background layers first!
  if (params.enabledLayers && params.enabledLayers.length > 0) {
    params.enabledLayers.forEach((layerPreset) => {
      // Don't draw the master preset twice as a layer
      if (layerPreset !== params.preset) {
        ctx.save();
        ctx.globalAlpha = 0.45; // Blend background layers elegantly in the background
        drawPreset(layerPreset, options, params);
        ctx.restore();
      }
    });
  }

  // 2. Draw master preset with transitions
  if (prevParams && progress < 1) {
    // Draw previous preset fading out
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    drawPreset(prevParams.preset, options, prevParams);
    ctx.restore();

    // Draw new preset fading in
    ctx.save();
    ctx.globalAlpha = progress;
    drawPreset(params.preset, options, params);
    ctx.restore();
  } else {
    // Standard single rendering
    ctx.save();
    drawPreset(params.preset, options, params);
    ctx.restore();
  }

  // Reset shadow for performance down the road
  ctx.shadowBlur = 0;
}

function drawNeonWaveform({ ctx, width, height, timeData, params }: DrawOptions) {
  const amp = params.sensitivity;
  const centerY = height / 2;

  ctx.strokeStyle = params.baseColor;
  ctx.lineWidth = params.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Drawing double waveforms for neon offset
  for (let offset = -4; offset <= 4; offset += 8) {
    ctx.beginPath();
    ctx.strokeStyle = offset < 0 ? params.baseColor : params.secondaryColor;

    for (let i = 0; i < timeData.length; i++) {
      const x = (i / timeData.length) * width;
      // Normal byte value is 0-255 (128 is center)
      const normalized = (timeData[i] - 128) / 128; // -1 to 1
      const y = centerY + normalized * (height * 0.35) * amp + offset;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  // Center core glowing line
  ctx.beginPath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, params.lineWidth / 2);
  for (let i = 0; i < timeData.length; i++) {
    const x = (i / timeData.length) * width;
    const normalized = (timeData[i] - 128) / 128;
    const y = centerY + normalized * (height * 0.35) * amp;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawSpectrumBars({ ctx, width, height, freqData, params }: DrawOptions) {
  const barsCount = Math.min(params.particleCount || 60, freqData.length);
  const barWidth = width / barsCount;
  const multiplier = params.sensitivity * 1.5;

  for (let i = 0; i < barsCount; i++) {
    const val = freqData[i] || 0;
    const barHeight = (val / 255) * height * 0.8 * multiplier;

    // Gradient between primary and secondary
    const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
    grad.addColorStop(0, params.baseColor);
    grad.addColorStop(1, params.secondaryColor);

    ctx.fillStyle = grad;
    const x = i * barWidth;
    const y = height - barHeight;
    const w = barWidth - 2;

    ctx.fillRect(x, y, w, barHeight);

    // Peak Indicator Dot
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, Math.max(0, y - 6), w, 3);
  }
}

// Persistent space coordinates for tunnel & starfields
let tunnelStars: Array<{ x: number; y: number; z: number; color: string }> = [];
let geocitiesStars: Array<{ x: number; y: number; z: number; color: string }> = [];

function initTunnelStars(count: number, colors: string[]) {
  tunnelStars = [];
  for (let i = 0; i < count; i++) {
    tunnelStars.push({
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      z: Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function initGeocitiesStars(count: number, colors: string[]) {
  geocitiesStars = [];
  for (let i = 0; i < count; i++) {
    geocitiesStars.push({
      x: Math.random() * 2000 - 1000,
      y: Math.random() * 2000 - 1000,
      z: Math.random() * 2000,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

function drawCosmicTunnel({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
  const pulse = (avg / 255) * params.sensitivity;

  const maxStars = params.particleCount || 150;
  if (tunnelStars.length === 0 || tunnelStars.length !== maxStars) {
    initTunnelStars(maxStars, [params.baseColor, params.secondaryColor, "#ffffff"]);
  }

  const cx = width / 2;
  const cy = height / 2;

  // Draw concentric expanding circles based on low frequency index
  const bassVal = freqData[4] || 0;
  const ringsCount = 6;
  ctx.lineWidth = params.lineWidth;
  
  for (let r = 0; r < ringsCount; r++) {
    const ringRadius = ((time * 0.05 * params.speed + r * 120) % (width * 0.5)) + (bassVal * 0.4 * params.sensitivity);
    ctx.strokeStyle = r % 2 === 0 ? params.baseColor : params.secondaryColor;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, ringRadius), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw star lines flying forward
  ctx.lineWidth = 1.5;
  for (const s of tunnelStars) {
    // Dynamic forward motion speed based on music tempo / amp
    s.z -= params.speed * 4 * (1 + pulse);

    if (s.z <= 0) {
      s.z = 2000;
      s.x = Math.random() * 2000 - 1000;
      s.y = Math.random() * 2000 - 1000;
    }

    const px = (s.x / s.z) * width + cx;
    const py = (s.y / s.z) * height + cy;
    
    // Previous position for length trailing lines
    const prevZ = s.z + 40;
    const prevX = (s.x / prevZ) * width + cx;
    const prevY = (s.y / prevZ) * height + cy;

    if (px >= 0 && px < width && py >= 0 && py < height) {
      ctx.strokeStyle = s.color;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(px, py);
      ctx.stroke();
    }
  }
}

function drawGeocitiesStars({ ctx, width, height, freqData, params }: DrawOptions) {
  const maxStars = params.particleCount || 100;
  if (geocitiesStars.length === 0 || geocitiesStars.length !== maxStars) {
    initGeocitiesStars(maxStars, ["#ff00ff", "#00ffff", "#ffff00", "#ffffff", params.baseColor, params.secondaryColor]);
  }

  const cx = width / 2;
  const cy = height / 2;
  const bassFactor = (freqData[2] || 0) / 255;

  ctx.shadowBlur = params.glow * 1.5;
  
  for (const s of geocitiesStars) {
    s.z -= params.speed * 8 * (1 + bassFactor * params.sensitivity);

    if (s.z <= 0) {
      s.z = 2000;
      s.x = Math.random() * 2000 - 1000;
      s.y = Math.random() * 2000 - 1000;
    }

    const size = (1 - s.z / 2000) * 12 * params.sensitivity;
    const px = (s.x / s.z) * width + cx;
    const py = (s.y / s.z) * height + cy;

    if (px >= 0 && px < width && py >= 0 && py < height) {
      ctx.fillStyle = s.color;
      
      // Draw actual 4-point Geocities sparkle stars!
      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.lineTo(px + size / 2, py - size / 4);
      ctx.lineTo(px + size, py);
      ctx.lineTo(px + size / 2, py + size / 4);
      ctx.lineTo(px, py + size);
      ctx.lineTo(px - size / 2, py + size / 4);
      ctx.lineTo(px - size, py);
      ctx.lineTo(px - size / 2, py - size / 4);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawOrbitalVortex({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height / 2;
  const bands = 120;
  
  ctx.strokeStyle = params.baseColor;
  ctx.lineWidth = params.lineWidth;
  
  ctx.beginPath();
  for (let i = 0; i < bands; i++) {
    const angle = (i / bands) * Math.PI * 2 * 3 + (time * 0.0005 * params.speed);
    const dataIdx = Math.floor((i / bands) * freqData.length * 0.5);
    const amp = (freqData[dataIdx] || 0) / 255;
    
    const spiralRadius = 40 + (i * 1.5) + amp * 180 * params.sensitivity;
    const x = cx + Math.cos(angle) * spiralRadius;
    const y = cy + Math.sin(angle) * spiralRadius;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = params.secondaryColor;
  ctx.stroke();

  // Floating orbiting glowing particle nodes
  ctx.fillStyle = params.baseColor;
  const particles = 16;
  for (let j = 0; j < particles; j++) {
    const orbitAngle = (j / particles) * Math.PI * 2 + (time * 0.001 * params.speed);
    const bass = (freqData[Math.floor(j * 3)] || 0) / 255;
    const dist = 180 + bass * 120 * params.sensitivity;
    
    ctx.beginPath();
    ctx.arc(cx + Math.cos(orbitAngle) * dist, cy + Math.sin(orbitAngle) * dist, 8 + bass * 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMySpaceDisco({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height / 2;
  const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
  const pulse = avg / 255; // 0 - 1

  // Draw retro disco colored grids matching MySpace developer layout styles
  const colCount = 8;
  const rowCount = 6;
  const gridW = width / colCount;
  const gridH = height / rowCount;

  ctx.globalAlpha = 0.25 + (pulse * 0.5 * params.sensitivity);
  ctx.fillStyle = params.baseColor;

  for (let c = 0; c < colCount; c++) {
    for (let r = 0; r < rowCount; r++) {
      // flash cubes asynchronously depending on audio indexes
      const binIdx = Math.floor((c * colCount + r) % freqData.length);
      const val = freqData[binIdx] || 0;
      
      if (val > 150) {
        ctx.fillStyle = c % 2 === r % 2 ? params.baseColor : params.secondaryColor;
        ctx.fillRect(c * gridW + 4, r * gridH + 4, gridW - 8, gridH - 8);
      }
    }
  }
  ctx.globalAlpha = 1.0;

  // Giant glowing spinning record or CD in center
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = params.lineWidth;
  ctx.beginPath();
  ctx.arc(cx, cy, 120 + pulse * 45 * params.sensitivity, 0, Math.PI * 2);
  ctx.stroke();

  // Draw CD label lines
  ctx.strokeStyle = params.secondaryColor;
  for (let l = 0; l < 4; l++) {
    const rayAngle = (l / 4) * Math.PI * 2 + (time * 0.002 * params.speed);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rayAngle) * 30, cy + Math.sin(rayAngle) * 30);
    ctx.lineTo(cx + Math.cos(rayAngle) * (120 + pulse * 45 * params.sensitivity), cy + Math.sin(rayAngle) * (120 + pulse * 45 * params.sensitivity));
    ctx.stroke();
  }

  // Draw center hole
  ctx.fillStyle = "rgba(10, 10, 12, 1)";
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
}

function drawCustomJs({ ctx, width, height, freqData, time, params }: DrawOptions) {
  // If compiled script has changed, compile it safely once and cache it.
  const code = params.customJsCode || "";
  if (code !== cachedCodeString || !cachedUserFunc) {
    try {
      cachedCodeString = code;
      // We safely wrap custom user code inside a Function context
      cachedUserFunc = new Function("ctx", "width", "height", "audioData", "time", "params", `
        try {
          ${code}
        } catch (scriptErr) {
          console.error("User script runtime exception:", scriptErr);
          // Standard placeholder fallback on exception:
          ctx.font = "14px monospace";
          ctx.fillStyle = "#ff5555";
          ctx.fillText("Script Error: " + scriptErr.message, 20, 40);
        }
      `);
    } catch (compileErr: any) {
      // Draw syntax / compilation errors clearly in outer frame
      ctx.font = "14px monospace";
      ctx.fillStyle = "#ff5555";
      ctx.fillText("Compilation Error: " + compileErr.message, 20, 40);
      cachedUserFunc = null;
    }
  }

  if (cachedUserFunc) {
    try {
      cachedUserFunc(ctx, width, height, freqData, time, params);
    } catch (e: any) {
      ctx.font = "14px monospace";
      ctx.fillStyle = "#ff5555";
      ctx.fillText("Runtime Error: " + e.message, 20, 40);
    }
  }
}

function drawFractalMandala({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height / 2;
  // Get aggregate values for pulsing
  const lowSum = (freqData[0] || 0) + (freqData[1] || 0) + (freqData[2] || 0) + (freqData[3] || 0);
  const pulse = (lowSum / 1020) * params.sensitivity;
  const baseRadius = Math.min(width, height) * 0.23 * (1 + pulse * 0.35);

  ctx.lineWidth = params.lineWidth;
  ctx.strokeStyle = params.baseColor;
  ctx.lineCap = "round";

  // Draw core sacred geometry concentric circles
  const layers = 5;
  for (let l = 1; l <= layers; l++) {
    const r = baseRadius * (l / layers);
    const rotation = (time * 0.0003 * params.speed * (l % 2 === 0 ? 1 : -1));
    const segments = 6 + l * 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      ctx.beginPath();
      ctx.arc(x, y, r * 0.45 * (1 + pulse * 0.22), 0, Math.PI * 2);
      ctx.strokeStyle = i % 2 === 0 ? params.baseColor : params.secondaryColor;
      ctx.stroke();

      // Translucent inner chords
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x, y);
      ctx.strokeStyle = `${params.secondaryColor}25`;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw glowing outer lotus ring
  ctx.beginPath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, params.lineWidth / 2);
  const ringPoints = 64;
  for (let i = 0; i <= ringPoints; i++) {
    const angle = (i / ringPoints) * Math.PI * 2 + (time * 0.0001 * params.speed);
    const audioIdx = Math.floor((i / ringPoints) * freqData.length * 0.4);
    const audioVal = (freqData[audioIdx] || 0) / 255;
    const r = baseRadius * 1.05 + audioVal * 45 * params.sensitivity;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

let matrixChars: Array<{ x: number; y: number; speed: number; val: string; color: string }> = [];

function drawCyberGridMatrix({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height * 0.55; // Horizon
  const bassFactor = (freqData[2] || 0) / 255;
  const highFactor = (freqData[120] || 0) / 255;

  ctx.shadowBlur = 0; // Clear shadows for grid lines to boost performance

  // Draw neon horizon sunset glow
  const gradient = ctx.createLinearGradient(0, cy - 120, 0, cy);
  gradient.addColorStop(0, "rgba(10, 10, 12, 0)");
  gradient.addColorStop(1, `${params.secondaryColor}28`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, cy - 120, width, 120);

  // Draw perspective floor grid
  ctx.lineWidth = params.lineWidth / 2.2;
  ctx.strokeStyle = params.baseColor;

  const verticalLines = 24;
  for (let i = 0; i <= verticalLines; i++) {
    const xLower = (i / verticalLines) * width;
    const xUpper = cx + (xLower - cx) * 0.15; // perspective focus point
    ctx.beginPath();
    ctx.moveTo(xUpper, cy);
    ctx.lineTo(xLower, height);
    ctx.stroke();
  }

  const horizLines = 14;
  const offset = (time * 0.0012 * params.speed) % 1.0;
  for (let i = 0; i < horizLines; i++) {
    const ratio = Math.pow((i + offset) / horizLines, 2.2); // exponential vertical spacing
    const y = cy + ratio * (height - cy);

    ctx.strokeStyle = params.baseColor;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw a synthetic 3D wireframe sun on the horizon
  ctx.beginPath();
  ctx.arc(cx, cy - 5, 55 + bassFactor * 22 * params.sensitivity, Math.PI, 0); // half circle sun
  ctx.strokeStyle = params.secondaryColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Draw sun scanning slices
  for (let s = 1; s < 5; s++) {
    const sliceY = cy - 5 - s * 12;
    if (sliceY > cy - 55) {
      ctx.beginPath();
      ctx.moveTo(cx - 75, sliceY);
      ctx.lineTo(cx + 75, sliceY);
      ctx.strokeStyle = "#0a0a0c"; // background color slices
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  // Render cyber digital particles/binary code streams in the background
  const charSpacing = 32;
  const cols = Math.floor(width / charSpacing);
  if (matrixChars.length === 0 || matrixChars.length < cols) {
    matrixChars = [];
    for (let c = 0; c < cols; c++) {
      matrixChars.push({
        x: c * charSpacing + 12,
        y: Math.random() * cy,
        speed: 1 + Math.random() * 1.8,
        val: Math.random() > 0.5 ? "1" : "0",
        color: Math.random() > 0.5 ? params.baseColor : params.secondaryColor,
      });
    }
  }

  ctx.font = "bold 9px monospace";
  for (const mc of matrixChars) {
    // Falls relative to tempo speed
    mc.y += mc.speed * params.speed * (1 + highFactor * 3.5);
    if (mc.y > cy) {
      mc.y = 0;
      mc.val = Math.random() > 0.5 ? "1" : "0";
    }

    if (Math.random() < 0.05) {
      mc.val = Math.random() > 0.5 ? "1" : "0";
    }

    ctx.fillStyle = mc.color;
    ctx.fillText(mc.val, mc.x, mc.y);
  }
}

interface SwarmPart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  angle: number;
}

let swarmParts: SwarmPart[] = [];

function drawFluidLiquidSwarm({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const maxCount = params.particleCount || 150;
  if (swarmParts.length === 0 || swarmParts.length !== maxCount) {
    swarmParts = [];
    const colors = [params.baseColor, params.secondaryColor, "#ffffff", "#00ffff", "#ff00ff"];
    for (let i = 0; i < maxCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      swarmParts.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * (Math.random() * 2 + 0.5),
        vy: Math.sin(angle) * (Math.random() * 2 + 0.5),
        color: colors[i % colors.length],
        size: Math.random() * 3.5 + 1.2,
        angle: angle,
      });
    }
  }

  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[40] || 0) / 255;
  
  // Update and draw each particle in flow field
  ctx.lineWidth = params.lineWidth / 1.5;
  for (let i = 0; i < swarmParts.length; i++) {
    const p = swarmParts[i];
    
    // Mathematical flow field coordinates using sine waves and time
    const fieldAngle = Math.sin(p.x * 0.0045 + time * 0.0002) * Math.cos(p.y * 0.0045 + time * 0.00015) * Math.PI * 3.2;
    
    // Pull velocity vectors towards flow field directions with sensitivity and speed factor
    const force = 0.12 * params.speed;
    p.vx += Math.cos(fieldAngle) * force;
    p.vy += Math.sin(fieldAngle) * force;
    
    // Add audio-transient turbulence
    if (i % 3 === 0) {
      p.vx += (Math.random() - 0.5) * bassVal * params.sensitivity * 1.8;
      p.vy += (Math.random() - 0.5) * bassVal * params.sensitivity * 1.8;
    }
    
    // Speed limit
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const maxSpd = 4.2 * (1 + midVal * params.speed);
    if (spd > maxSpd) {
      p.vx = (p.vx / spd) * maxSpd;
      p.vy = (p.vy / spd) * maxSpd;
    }
    
    // Shift position
    p.x += p.vx;
    p.y += p.vy;
    
    // Wraparound bounds
    if (p.x < -20) p.x = width + 20;
    if (p.x > width + 20) p.x = -20;
    if (p.y < -20) p.y = height + 20;
    if (p.y > height + 20) p.y = -20;
    
    // Draw particle
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1 + bassVal * 1.6), 0, Math.PI * 2);
    ctx.fill();

    // Occasional constellation lines
    if (i < swarmParts.length - 1 && i % 4 === 0) {
      const nextP = swarmParts[i + 1];
      const distSq = (p.x - nextP.x) * (p.x - nextP.x) + (p.y - nextP.y) * (p.y - nextP.y);
      if (distSq < 1600) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nextP.x, nextP.y);
        ctx.strokeStyle = `${p.color}40`; // semitransparent lines
        ctx.stroke();
      }
    }
  }
}

interface PSStar {
  x: number;
  y: number;
  z: number;
  color: string;
  speedMultiplier: number;
}
let psStars: PSStar[] = [];

function drawPlayStationSoundScope({ ctx, width, height, freqData, timeData, time, params }: DrawOptions) {
  // 1. Initializations
  const maxStars = params.particleCount || 120;
  if (psStars.length === 0 || psStars.length !== maxStars) {
    const colors = [
      "#00e1ff", // Turquoise PS neon
      "#ff00a0", // PS magenta
      "#0044ff", // PS blue
      "#ffff00", // Yellow accent
      "#a000ff", // Purple
      "#ffffff"  // White sparks
    ];
    psStars = [];
    for (let i = 0; i < maxStars; i++) {
      psStars.push({
        x: Math.random() * 2000 - 1000,
        y: Math.random() * 2000 - 1000,
        z: Math.random() * 2000,
        color: colors[i % colors.length],
        speedMultiplier: Math.random() * 1.6 + 0.4
      });
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[30] || 0) / 255;
  const trebleVal = (freqData[100] || 0) / 255;

  // Clear or background trail overlay (drawn by drawMainVisuals)
  // We can draw a subtle background color splash based on base/treble to give a deep CD player universe glow
  const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(width, height) * 0.7);
  gradient.addColorStop(0, `rgba(10, 15, 45, 0.35)`);
  gradient.addColorStop(1, `rgba(5, 5, 12, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Draw 3D Shifting Starfield
  for (const s of psStars) {
    s.z -= params.speed * 12 * (1 + bassVal * params.sensitivity) * s.speedMultiplier;
    if (s.z <= 0) {
      s.z = 2000;
      s.x = Math.random() * 2000 - 1000;
      s.y = Math.random() * 2000 - 1000;
    }

    const px = (s.x / s.z) * width + cx;
    const py = (s.y / s.z) * height + cy;
    const size = (1 - s.z / 2000) * 8 * params.sensitivity;

    if (px >= 0 && px < width && py >= 0 && py < height) {
      ctx.fillStyle = s.color;
      // Authentic PS1 sparkles
      if (s.z < 500) {
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      } else {
        ctx.fillRect(px, py, Math.max(1, size / 2), Math.max(1, size / 2));
      }
    }
  }

  // 3. Shifting 3D perspective grid lines
  ctx.strokeStyle = `${params.baseColor || "#00e1ff"}18`;
  ctx.lineWidth = params.lineWidth / 2;
  const linesCount = 12;
  for (let i = 0; i < linesCount; i++) {
    const angle = (i / linesCount) * Math.PI * 2 + (time * 0.0001 * params.speed);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    const length = Math.max(width, height) * 1.2;
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
    ctx.stroke();
  }

  // Concentric ripple rings pushing outwards
  const ringSpacing = 160;
  const numRings = 6;
  const maxDist = Math.max(width, height) * 0.8;
  const ringOffset = (time * 0.08 * params.speed) % ringSpacing;

  for (let i = 0; i < numRings; i++) {
    const r = (i * ringSpacing + ringOffset) % maxDist;
    const alpha = (1 - r / maxDist) * 0.35;
    ctx.strokeStyle = `${params.secondaryColor || "#ff00a0"}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
    ctx.beginPath();
    const sides = 8;
    for (let s = 0; s <= sides; s++) {
      const angle = (s / sides) * Math.PI * 2;
      const freqIndex = Math.floor((s / sides) * freqData.length * 0.3);
      const audioRipple = ((freqData[freqIndex] || 0) / 255) * 30 * params.sensitivity;
      const finalR = r + audioRipple;
      const rx = cx + Math.cos(angle) * finalR;
      const ry = cy + Math.sin(angle) * finalR;
      if (s === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.stroke();
  }

  // 4. Draw Center Rotating 3D Dual-Cage Crystal (Octahedron + Cube Core)
  const baseScale = Math.min(width, height) * 0.22;
  const finalScale = baseScale * (1.0 + bassVal * 0.45 * params.sensitivity);

  const rotX = time * 0.0008 * params.speed;
  const rotY = time * 0.0006 * params.speed;
  const rotZ = time * 0.0010 * params.speed;

  const projectPoint = (x: number, y: number, z: number) => {
    const cx_Rot = Math.cos(rotX), sx = Math.sin(rotX);
    const cy_Rot = Math.cos(rotY), sy = Math.sin(rotY);
    const cz_Rot = Math.cos(rotZ), sz = Math.sin(rotZ);

    // X-axis Rotation
    const rx1 = x;
    const ry1 = y * cx_Rot - z * sx;
    const rz1 = y * sx + z * cx_Rot;

    // Y-axis Rotation
    const rx2 = rx1 * cy_Rot + rz1 * sy;
    const ry2 = ry1;
    const rz2 = -rx1 * sy + rz1 * cy_Rot;

    // Z-axis Rotation
    const rx3 = rx2 * cz_Rot - ry2 * sz;
    const ry3 = rx2 * sz + ry2 * cz_Rot;
    const rz3 = rz2;

    const px = cx + rx3 * finalScale;
    const py = cy + ry3 * finalScale;
    return { x: px, y: py, depth: rz3 };
  };

  const octVertices = [
    { x: 0, y: 1.25, z: 0 },   // 0: top apex
    { x: 1, y: 0, z: 1 },      // 1: front-right mid
    { x: -1, y: 0, z: 1 },     // 2: front-left mid
    { x: -1, y: 0, z: -1 },    // 3: back-left mid
    { x: 1, y: 0, z: -1 },     // 4: back-right mid
    { x: 0, y: -1.25, z: 0 }   // 5: bottom apex
  ];

  const octFaces = [
    [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], // top pyramid
    [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]  // bottom pyramid
  ];

  const projectedOct = octVertices.map(v => projectPoint(v.x, v.y, v.z));

  const octFaceData = octFaces.map((faceIndices, idx) => {
    const pts = faceIndices.map(i => projectedOct[i]);
    const avgDepth = (pts[0].depth + pts[1].depth + pts[2].depth) / 3;
    return { faceIndices, pts, avgDepth, idx };
  });

  // Sort back-to-front for retro overlapping Painter's Algorithm
  octFaceData.sort((a, b) => b.avgDepth - a.avgDepth);

  // Draw the Octahedron faces!
  octFaceData.forEach(f => {
    ctx.beginPath();
    ctx.moveTo(f.pts[0].x, f.pts[0].y);
    ctx.lineTo(f.pts[1].x, f.pts[1].y);
    ctx.lineTo(f.pts[2].x, f.pts[2].y);
    ctx.closePath();

    const faceHue = (time * 0.05 + f.idx * 30) % 360;
    ctx.fillStyle = `hsla(${faceHue}, 80%, 45%, ${0.15 + midVal * 0.25})`;
    ctx.fill();

    ctx.strokeStyle = `hsla(${faceHue}, 100%, 75%, ${0.4 + trebleVal * 0.5})`;
    ctx.lineWidth = params.lineWidth;
    ctx.stroke();
  });

  // Inverse counter-spinning inner Cube core
  const rotCubeX = -time * 0.0012 * params.speed;
  const rotCubeY = -time * 0.0009 * params.speed;
  const rotCubeZ = -time * 0.0016 * params.speed;

  const projectCubePoint = (x: number, y: number, z: number) => {
    const cx_Rot = Math.cos(rotCubeX), sx = Math.sin(rotCubeX);
    const cy_Rot = Math.cos(rotCubeY), sy = Math.sin(rotCubeY);
    const cz_Rot = Math.cos(rotCubeZ), sz = Math.sin(rotCubeZ);

    const rx1 = x;
    const ry1 = y * cx_Rot - z * sx;
    const rz1 = y * sx + z * cx_Rot;

    const rx2 = rx1 * cy_Rot + rz1 * sy;
    const ry2 = ry1;
    const rz2 = -rx1 * sy + rz1 * cy_Rot;

    const rx3 = rx2 * cz_Rot - ry2 * sz;
    const ry3 = rx2 * sz + ry2 * cz_Rot;

    const px = cx + rx3 * finalScale * 0.42;
    const py = cy + ry3 * finalScale * 0.42;
    return { x: px, y: py, depth: rz2 };
  };

  const cubeVertices = [
    { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
    { x: -1, y: -1, z: 1 },  { x: 1, y: -1, z: 1 },  { x: 1, y: 1, z: 1 },  { x: -1, y: 1, z: 1 }
  ];

  const cubeEdges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];

  const projectedCube = cubeVertices.map(v => projectCubePoint(v.x, v.y, v.z));

  ctx.strokeStyle = params.secondaryColor || "#ff00a0";
  ctx.lineWidth = Math.max(1, params.lineWidth / 1.5);
  cubeEdges.forEach(edge => {
    const p1 = projectedCube[edge[0]];
    const p2 = projectedCube[edge[1]];
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  });

  // Symmetrical Oscilloscope dial wave wraps
  const leftX = width * 0.16;
  const rightX = width * 0.84;
  const dialY = height * 0.5;
  const dialRadius = Math.min(width, height) * 0.11;

  ctx.strokeStyle = `${params.baseColor || "#00e1ff"}25`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(leftX, dialY, dialRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rightX, dialY, dialRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Left Wave Dial (Oscilloscope)
  ctx.strokeStyle = params.baseColor || "#00e1ff";
  ctx.lineWidth = params.lineWidth / 1.2;
  ctx.beginPath();
  for (let idx = 0; idx < timeData.length; idx += 4) {
    const angle = (idx / timeData.length) * Math.PI * 2;
    const waveVal = (timeData[idx] - 128) / 128;
    const r = dialRadius + waveVal * dialRadius * 0.3 * params.sensitivity;
    const x = leftX + Math.cos(angle) * r;
    const y = dialY + Math.sin(angle) * r;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Right Frequency Dial (Spectral graph)
  ctx.strokeStyle = params.secondaryColor || "#ff00a0";
  ctx.beginPath();
  for (let idx = 0; idx < freqData.length; idx += 8) {
    const angle = (idx / freqData.length) * Math.PI * 2;
    const spectralVal = (freqData[idx] || 0) / 255;
    const r = dialRadius + spectralVal * dialRadius * 0.35 * params.sensitivity;
    const x = rightX + Math.cos(angle) * r;
    const y = dialY + Math.sin(angle) * r;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // 5. Authentic BIOS SoundScope HUD Displays
  ctx.font = "bold 9px 'Courier New', 'JetBrains Mono', monospace";
  ctx.fillStyle = "#d8d8d8";

  // Four boundary crosshair reticles
  const m = 22;
  ctx.strokeStyle = "rgba(216, 216, 216, 0.25)";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(m, m + 10); ctx.lineTo(m, m); ctx.lineTo(m + 10, m);
  ctx.moveTo(width - m, m + 10); ctx.lineTo(width - m, m); ctx.lineTo(width - m - 10, m);
  ctx.moveTo(m, height - m - 10); ctx.lineTo(m, height - m); ctx.lineTo(m + 10, height - m);
  ctx.moveTo(width - m, height - m - 10); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m - 10, height - m);
  ctx.stroke();

  // Labels
  ctx.fillText("💿 PSX SOUNDSCOPE CD-ROM", m + 8, m + 15);
  ctx.fillStyle = params.baseColor || "#00e1ff";
  ctx.fillText("SYSTEM STATUS: EX-MODE HIGH-FIDELITY", m + 8, m + 28);
  ctx.fillStyle = "rgba(216, 216, 216, 0.6)";
  ctx.fillText("DISC TYPE: CD-DA (COMPACT DISC AUDIO)", m + 8, m + 41);

  ctx.textAlign = "right";
  ctx.fillText("CHANNELS: L / R DUAL DIRECT", width - m - 8, m + 15);
  ctx.fillStyle = params.secondaryColor || "#ff00a0";
  ctx.fillText("DE-EMPHASIS: AUTO FILTERS ACTIVE", width - m - 8, m + 28);
  ctx.fillStyle = "rgba(216, 216, 216, 0.6)";
  ctx.fillText("SAMPLING RATE: 44.1 kHz  16-BIT", width - m - 8, m + 41);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(216, 216, 216, 0.4)";
  ctx.fillText("MEM CARD 1: CONNECTED (SLOT 1)", m + 8, height * 0.32);
  ctx.fillText("BLOCK_01: EX_VstRack (SAVED)", m + 8, height * 0.35);
  ctx.fillText("BLOCK_02: EX_SkinConfig (SAVED)", m + 8, height * 0.38);

  ctx.textAlign = "right";
  const notchLabel = (params as any).notchEnabled ? "CASCADING NOTCH: ON" : "CASCADING NOTCH: OFF";
  ctx.fillText("MEM CARD 2: CONNECTED (SLOT 2)", width - m - 8, height * 0.32);
  ctx.fillText(notchLabel, width - m - 8, height * 0.35);
  ctx.fillText("DSP REVERB: ACTIVE", width - m - 8, height * 0.38);

  // Bottom Playing Track panel
  const elapsedSec = Math.floor(time / 1000) % 272; // default simulated loop time-point
  const minutes = Math.floor(elapsedSec / 60);
  const seconds = elapsedSec % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`PLAY ▶  [ ${formattedTime} / 04:32 ]  TRACK 04  SINGLE-DA_RVR`, width / 2, height - m - 32);

  // CD progress line
  const barWidth = Math.max(160, width * 0.4);
  const barHeight = 8;
  const barX = cx - barWidth / 2;
  const barY = height - m - 22;

  ctx.strokeStyle = "rgba(216, 216, 216, 0.25)";
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  const progressRatio = elapsedSec / 272;
  ctx.fillStyle = params.baseColor || "#00e1ff";
  ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * progressRatio, barHeight - 4);

  ctx.textAlign = "left";
}

function drawSuperScience80s({ ctx, width, height, freqData, timeData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height / 2;
  
  // Calculate aggregate audio characteristics
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[25] || 0) / 255;
  const trebleVal = (freqData[90] || 0) / 255;
  const avgAmp = freqData.reduce((sum, val) => sum + val, 0) / freqData.length / 255;

  // Set laboratory colors
  const baseColor = params.baseColor || "#00ff66";
  const secondaryColor = params.secondaryColor || "#00f0ff";

  // CRT Glass Radial Glow
  const radialGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.75);
  radialGrad.addColorStop(0, "rgba(5, 20, 10, 0.25)");
  radialGrad.addColorStop(1, "rgba(2, 5, 2, 0)");
  ctx.fillStyle = radialGrad;
  ctx.fillRect(0, 0, width, height);

  // 1. Polar coordinate calibration grid (rings + radial spokes)
  ctx.strokeStyle = `${baseColor}15`;
  ctx.lineWidth = 1;
  const gridLines = 18;
  for (let i = 0; i < gridLines; i++) {
    const r = (i * 45 + time * 0.03 * params.speed) % (Math.max(width, height) * 0.6);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + (time * 0.0001 * params.speed);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * width, cy + Math.sin(angle) * height);
    ctx.stroke();
  }

  // 2. Vector Laser Oscilloscope Waves (Left and Right laboratory monitors)
  const panelW = Math.max(150, width * 0.22);
  const panelH = Math.max(100, height * 0.18);
  const leftPanelX = width * 0.15 - panelW / 2;
  const rightPanelX = width * 0.85 - panelW / 2;
  const panelY = height * 0.75 - panelH / 2;

  // Draw panel boxes
  ctx.strokeStyle = `${secondaryColor}40`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(leftPanelX, panelY, panelW, panelH);
  ctx.strokeRect(rightPanelX, panelY, panelW, panelH);
  
  // Grid lines inside panels
  ctx.strokeStyle = `${secondaryColor}10`;
  ctx.lineWidth = 0.5;
  for (let gx = 10; gx < panelW; gx += 20) {
    ctx.beginPath(); ctx.moveTo(leftPanelX + gx, panelY); ctx.lineTo(leftPanelX + gx, panelY + panelH); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightPanelX + gx, panelY); ctx.lineTo(rightPanelX + gx, panelY + panelH); ctx.stroke();
  }
  for (let gy = 10; gy < panelH; gy += 20) {
    ctx.beginPath(); ctx.moveTo(leftPanelX, panelY + gy); ctx.lineTo(leftPanelX + panelW, panelY + gy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightPanelX, panelY + gy); ctx.lineTo(rightPanelX + panelW, panelY + gy); ctx.stroke();
  }

  // Draw real waveform on left panel (timeData)
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = params.lineWidth / 1.5;
  ctx.beginPath();
  const stepL = timeData.length / panelW;
  for (let x = 0; x < panelW; x++) {
    const dataIdx = Math.floor(x * stepL);
    const waveY = ((timeData[dataIdx] - 128) / 128) * (panelH * 0.4) * params.sensitivity;
    if (x === 0) {
      ctx.moveTo(leftPanelX, panelY + panelH / 2 + waveY);
    } else {
      ctx.lineTo(leftPanelX + x, panelY + panelH / 2 + waveY);
    }
  }
  ctx.stroke();

  // Draw bar equalizer on right panel (freqData)
  ctx.fillStyle = secondaryColor;
  const barW = Math.max(2, panelW / 24);
  const stepR = Math.floor(freqData.length * 0.5 / 24);
  for (let b = 0; b < 24; b++) {
    const freqIdx = b * stepR;
    const fVal = (freqData[freqIdx] || 0) / 255;
    const bH = fVal * panelH * 0.8 * params.sensitivity;
    ctx.fillRect(rightPanelX + b * (barW + 2) + 4, panelY + panelH - bH - 4, barW, bH);
  }

  // 3. Central Glowing Bohr Atom & Quantum Molecule Engine
  const atomRadius = Math.min(width, height) * 0.16 * (1 + bassVal * 0.3 * params.sensitivity);
  
  // Center nucleus (multiple pulsing spheres / energy core)
  ctx.fillStyle = baseColor;
  ctx.shadowBlur = params.glow * 1.5;
  ctx.shadowColor = baseColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 14 + bassVal * 12 * params.sensitivity, 0, Math.PI * 2);
  ctx.fill();
  
  // Symmetrical sub-nucleons surrounding the core
  const nucleons = 6;
  ctx.fillStyle = secondaryColor;
  for (let n = 0; n < nucleons; n++) {
    const nAngle = (n / nucleons) * Math.PI * 2 + (time * 0.001 * params.speed);
    const nx = cx + Math.cos(nAngle) * (20 + bassVal * 8);
    const ny = cy + Math.sin(nAngle) * (20 + bassVal * 8);
    ctx.beginPath();
    ctx.arc(nx, ny, 6 + trebleVal * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Orbiting electrons on inclined 3D vector rings
  ctx.shadowBlur = params.glow;
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = params.lineWidth;
  
  const rings = 3;
  for (let r = 0; r < rings; r++) {
    const tilt = (r / rings) * Math.PI + (time * 0.0002 * params.speed);
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, atomRadius, atomRadius * 0.3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = r === 0 ? baseColor : r === 1 ? secondaryColor : "#ffffff";
    ctx.stroke();
    
    const ePhase = (time * 0.0018 * params.speed * (1.2 - r * 0.1) + r * Math.PI * 0.6) % (Math.PI * 2);
    const ex = Math.cos(ePhase) * atomRadius;
    const ey = Math.sin(ePhase) * (atomRadius * 0.3);
    
    ctx.fillStyle = r === 0 ? "#ffffff" : r === 1 ? baseColor : secondaryColor;
    ctx.beginPath();
    ctx.arc(ex, ey, 7 + midVal * 6 * params.sensitivity, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  // 4. Laboratory Science HUD Displays & Calibration Scales
  ctx.font = "bold 9px 'Courier New', 'JetBrains Mono', monospace";
  ctx.fillStyle = baseColor;
  const m = 22;

  // Crosshair brackets in center frame
  ctx.strokeStyle = `${baseColor}30`;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 100, cy - 100, 200, 200);
  ctx.beginPath();
  ctx.moveTo(cx - 110, cy); ctx.lineTo(cx - 90, cy);
  ctx.moveTo(cx + 90, cy); ctx.lineTo(cx + 110, cy);
  ctx.moveTo(cx, cy - 110); ctx.lineTo(cx, cy - 90);
  ctx.moveTo(cx, cy + 90); ctx.lineTo(cx, cy + 110);
  ctx.stroke();

  // Simulated vertical bar scales
  const scaleH = 120;
  const scaleY = cy - scaleH / 2;
  const leftScaleX = leftPanelX - 18;
  const rightScaleX = rightPanelX + panelW + 18;

  ctx.strokeStyle = `${baseColor}40`;
  ctx.beginPath();
  ctx.moveTo(leftScaleX, scaleY); ctx.lineTo(leftScaleX, scaleY + scaleH);
  ctx.moveTo(rightScaleX, scaleY); ctx.lineTo(rightScaleX, scaleY + scaleH);
  ctx.stroke();

  for (let dy = 0; dy <= scaleH; dy += 15) {
    ctx.beginPath(); ctx.moveTo(leftScaleX, scaleY + dy); ctx.lineTo(leftScaleX - 4, scaleY + dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightScaleX, scaleY + dy); ctx.lineTo(rightScaleX + 4, scaleY + dy); ctx.stroke();
  }

  const pointerL = scaleY + scaleH - (bassVal * scaleH);
  ctx.fillStyle = secondaryColor;
  ctx.beginPath();
  ctx.moveTo(leftScaleX - 8, pointerL - 4);
  ctx.lineTo(leftScaleX - 2, pointerL);
  ctx.lineTo(leftScaleX - 8, pointerL + 4);
  ctx.closePath();
  ctx.fill();

  const pointerR = scaleY + scaleH - (trebleVal * scaleH);
  ctx.beginPath();
  ctx.moveTo(rightScaleX + 8, pointerR - 4);
  ctx.lineTo(rightScaleX + 2, pointerR);
  ctx.lineTo(rightScaleX + 8, pointerR + 4);
  ctx.closePath();
  ctx.fill();

  // 5. Aesthetic HUD Text Readouts
  ctx.textAlign = "left";
  ctx.fillStyle = secondaryColor;
  ctx.fillText("☣️ SUPER SCIENCE CORP // SYS_80s_OS v3.82", m + 6, m + 14);
  
  ctx.fillStyle = baseColor;
  ctx.fillText("DECAY STABILITY  : " + (98.42 - midVal * 3).toFixed(2) + "%", m + 6, m + 27);
  ctx.fillText("BEAM COIL GAIN   : " + (params.sensitivity * 10).toFixed(1) + " dB", m + 6, m + 40);
  ctx.fillText("RESONATOR STATUS : " + (avgAmp > 0.4 ? "▲ HIGH FIELD OVERDRIVE" : "● RESONATING STABLE"), m + 6, m + 53);

  if (avgAmp > 0.55 && Math.floor(time / 200) % 2 === 0) {
    ctx.fillStyle = "#ff3333";
    ctx.fillText("⚡ WARNING: ISOTOPE COIL SATURATION!", m + 6, m + 68);
  }

  ctx.textAlign = "right";
  ctx.fillStyle = baseColor;
  ctx.fillText("THERMAL VENT TEMP: " + (42.5 + bassVal * 15 * params.sensitivity).toFixed(1) + " °C", width - m - 6, m + 14);
  ctx.fillText("ACCELERATION FREQ: " + (1420 + trebleVal * 450).toFixed(0) + " MHz", width - m - 6, m + 27);
  ctx.fillStyle = secondaryColor;
  ctx.fillText("CALIBRATION MODE : VECTOR GRID ANALYZER", width - m - 6, m + 40);
  ctx.fillText("SCAN RATE SYNCH  : CRT VERT_ROLL_ON", width - m - 6, m + 53);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  const speedScaleText = `CYCLES: ${(time * 0.0001 * params.speed).toFixed(4)} RAD/S | COIL: ${params.speed.toFixed(2)}x`;
  ctx.fillText(speedScaleText, width / 2, height - m - 30);

  // 6. Immersive CRT Phosphor Rolling Bar and Scanline Pattern Overlay
  ctx.lineWidth = 1;
  const scanlineCount = Math.floor(height / 4);
  ctx.strokeStyle = "rgba(10, 30, 10, 0.035)";
  for (let i = 0; i < scanlineCount; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 4);
    ctx.lineTo(width, i * 4);
    ctx.stroke();
  }

  const rollY = (time * 0.15) % (height + 200) - 100;
  const rollGrad = ctx.createLinearGradient(0, rollY - 100, 0, rollY + 100);
  rollGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  rollGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.02)");
  rollGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = rollGrad;
  ctx.fillRect(0, rollY - 100, width, 200);

  ctx.textAlign = "left";
}

