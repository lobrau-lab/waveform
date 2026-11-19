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
    case VisualPreset.SECURITY_CAM_87:
      drawSecurityCam87(opt);
      break;
    case VisualPreset.ENDOSKELETON_BLUEPRINT:
      drawEndoskeletonBlueprint(opt);
      break;
    case VisualPreset.LIMINAL_ARCADE_HALL:
      drawLiminalArcadeHall(opt);
      break;
    case VisualPreset.SPRINGLOCK_MECHANISM:
      drawSpringlockMechanism(opt);
      break;
    case VisualPreset.VHS_SIGNAL_HAUNT:
      drawVhsSignalHaunt(opt);
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
    const layerAlpha = params.layerOpacity ?? 0.45;
    params.enabledLayers.forEach((layerPreset) => {
      // Don't draw the master preset twice as a layer
      if (layerPreset !== params.preset) {
        ctx.save();
        ctx.globalAlpha = layerAlpha;
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

// Deterministic pseudo-random helper for consistent analog flicker & static
function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Helper to parse hex color into RGB tuple for atmospheric alpha tinting
function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  if (!hex || !hex.startsWith("#")) return fallback;
  const clean = hex.slice(1);
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || fallback[0],
      parseInt(clean[1] + clean[1], 16) || fallback[1],
      parseInt(clean[2] + clean[2], 16) || fallback[2]
    ];
  }
  if (clean.length >= 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || fallback[0],
      parseInt(clean.slice(2, 4), 16) || fallback[1],
      parseInt(clean.slice(4, 6), 16) || fallback[2]
    ];
  }
  return fallback;
}

/**
 * 1. SECURITY CAM '87 (LIMINAL HALL)
 * FNAF-inspired 1987 night-shift CCTV hallway monitor with flickering fluorescent tube,
 * checkered tiles, hanging party stars, lurking animatronic silhouette, and VHS static bursts.
 */
function drawSecurityCam87({ ctx, width, height, freqData, timeData, time, params }: DrawOptions) {
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[24] || 0) / 255;
  const trebleVal = (freqData[85] || 0) / 255;
  const avgAmp = freqData.reduce((s, v) => s + v, 0) / freqData.length / 255;
  const sens = params.sensitivity;
  const spd = params.speed;

  const [br, bg, bb] = hexToRgb(params.baseColor, [125, 255, 155]);
  const [sr, sg, sb] = hexToRgb(params.secondaryColor, [255, 175, 45]);

  // Subtle CCTV security camera horizontal pan
  const panOffset = Math.sin(time * 0.00035 * spd) * (width * 0.055);
  const glitchShakeX = bassVal * sens > 0.85 ? (pseudoRand(Math.floor(time / 35)) - 0.5) * 14 : 0;
  const vx = width * 0.5 + panOffset + glitchShakeX;
  const vy = height * 0.44;

  // Flickering overhead fluorescent tube intensity
  const flickerTick = Math.floor(time / 70);
  const flickerDrop = pseudoRand(flickerTick) > 0.84 - trebleVal * 0.18 ? 0.25 : 1.0;
  const lightLevel = Math.min(1.15, (0.52 + bassVal * 0.35 * sens) * flickerDrop);

  // Dark night-vision green-tinted void base
  const bgGrad = ctx.createRadialGradient(vx, vy, 10, vx, vy, Math.max(width, height) * 0.85);
  bgGrad.addColorStop(0, `rgba(${Math.round(br * 0.18)}, ${Math.round(bg * 0.22)}, ${Math.round(bb * 0.18)}, ${0.42 * lightLevel})`);
  bgGrad.addColorStop(0.55, "rgba(8, 12, 10, 0.72)");
  bgGrad.addColorStop(1, "rgba(2, 3, 4, 0.92)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Perspective corridor opening dimensions at far end
  const farW = width * 0.22;
  const farH = height * 0.36;
  const farL = vx - farW / 2;
  const farR = vx + farW / 2;
  const farT = vy - farH / 2;
  const farB = vy + farH / 2;

  // Ceiling, walls, and floor perspective planes
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.22 * lightLevel})`;
  ctx.lineWidth = Math.max(1, params.lineWidth * 0.35);

  // Left & Right walls subtle shading
  ctx.fillStyle = `rgba(18, 22, 20, ${0.45 * lightLevel})`;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(farL, farT); ctx.lineTo(farL, farB); ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, 0); ctx.lineTo(farR, farT); ctx.lineTo(farR, farB); ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Iconic 80s Pizzeria checkered wall trim stripe along left and right walls
  const stripeTopFrac = 0.56;
  const stripeBotFrac = 0.65;
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const t0 = i / segs;
    const t1 = (i + 1) / segs;
    // Perspective depth interpolation
    const p0 = Math.pow(t0, 1.55);
    const p1 = Math.pow(t1, 1.55);

    const lx0 = farL * (1 - p0);
    const lx1 = farL * (1 - p1);
    const lTop0 = farT + (farB - farT) * stripeTopFrac + (height * stripeTopFrac - (farT + (farB - farT) * stripeTopFrac)) * p0;
    const lTop1 = farT + (farB - farT) * stripeTopFrac + (height * stripeTopFrac - (farT + (farB - farT) * stripeTopFrac)) * p1;
    const lBot0 = farT + (farB - farT) * stripeBotFrac + (height * stripeBotFrac - (farT + (farB - farT) * stripeBotFrac)) * p0;
    const lBot1 = farT + (farB - farT) * stripeBotFrac + (height * stripeBotFrac - (farT + (farB - farT) * stripeBotFrac)) * p1;

    // Alternating red/black/white checkered wall border
    ctx.fillStyle = i % 2 === 0
      ? `rgba(${Math.min(255, sr)}, ${Math.round(sg * 0.35)}, ${Math.round(sb * 0.3)}, ${0.32 * lightLevel})`
      : `rgba(215, 225, 215, ${0.14 * lightLevel})`;
    ctx.beginPath();
    ctx.moveTo(lx0, lTop0); ctx.lineTo(lx1, lTop1); ctx.lineTo(lx1, lBot1); ctx.lineTo(lx0, lBot0);
    ctx.closePath();
    ctx.fill();

    const rx0 = farR + (width - farR) * p0;
    const rx1 = farR + (width - farR) * p1;
    ctx.beginPath();
    ctx.moveTo(rx0, lTop0); ctx.lineTo(rx1, lTop1); ctx.lineTo(rx1, lBot1); ctx.lineTo(rx0, lBot0);
    ctx.closePath();
    ctx.fill();
  }

  // Perspective checkered tile floor
  const floorRows = 10;
  const floorCols = 8;
  for (let r = 0; r < floorRows; r++) {
    const d0 = Math.pow(r / floorRows, 1.65);
    const d1 = Math.pow((r + 1) / floorRows, 1.65);
    const y0 = farB + (height - farB) * d0;
    const y1 = farB + (height - farB) * d1;
    const left0 = farL * (1 - d0);
    const right0 = farR + (width - farR) * d0;
    const left1 = farL * (1 - d1);
    const right1 = farR + (width - farR) * d1;

    for (let c = 0; c < floorCols; c++) {
      const cf0 = c / floorCols;
      const cf1 = (c + 1) / floorCols;
      const isLight = (r + c) % 2 === 0;
      const distFade = 0.08 + d0 * 0.24;
      ctx.fillStyle = isLight
        ? `rgba(210, 225, 210, ${distFade * lightLevel})`
        : `rgba(12, 16, 15, ${0.75})`;
      ctx.beginPath();
      ctx.moveTo(left0 + (right0 - left0) * cf0, y0);
      ctx.lineTo(left0 + (right0 - left0) * cf1, y0);
      ctx.lineTo(left1 + (right1 - left1) * cf1, y1);
      ctx.lineTo(left1 + (right1 - left1) * cf0, y1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Corridor corner lines
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.28 * lightLevel})`;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(farL, farT);
  ctx.moveTo(width, 0); ctx.lineTo(farR, farT);
  ctx.moveTo(0, height); ctx.lineTo(farL, farB);
  ctx.moveTo(width, height); ctx.lineTo(farR, farB);
  ctx.strokeRect(farL, farT, farW, farH);
  ctx.stroke();

  // Far dark doorway alcove
  ctx.fillStyle = "rgba(2, 3, 4, 0.94)";
  ctx.fillRect(farL + 2, farT + 2, farW - 4, farH - 4);

  // Hanging cardboard party stars swaying on thin wires
  const stars = [
    { x: vx - farW * 0.85, y: farT * 0.55, s: Math.min(width, height) * 0.032, phase: 0.4 },
    { x: vx + farW * 0.92, y: farT * 0.48, s: Math.min(width, height) * 0.038, phase: 2.1 },
    { x: vx - farW * 0.35, y: farT * 0.82, s: Math.min(width, height) * 0.022, phase: 4.0 },
    { x: vx + farW * 0.42, y: farT * 0.78, s: Math.min(width, height) * 0.024, phase: 5.2 }
  ];
  stars.forEach((st) => {
    const sway = Math.sin(time * 0.0012 * spd + st.phase) * (8 + midVal * 12);
    const sx = st.x + sway;
    ctx.strokeStyle = `rgba(180, 195, 185, ${0.22 * lightLevel})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(st.x, 0);
    ctx.lineTo(sx, st.y);
    ctx.stroke();

    // 5-point party star cutout
    ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, ${0.32 * lightLevel})`;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const ang = (p * Math.PI) / 5 - Math.PI / 2;
      const rad = p % 2 === 0 ? st.s : st.s * 0.42;
      const px = sx + Math.cos(ang) * rad;
      const py = st.y + Math.sin(ang) * rad;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });

  // Overhead flickering fluorescent light fixture + volumetric light cone
  const lampW = farW * 0.75;
  const lampY = farT * 0.34;
  ctx.save();
  ctx.shadowBlur = params.glow * 1.4 * lightLevel;
  ctx.shadowColor = `rgb(${br}, ${bg}, ${bb})`;
  ctx.fillStyle = `rgba(220, 255, 235, ${0.85 * lightLevel})`;
  ctx.fillRect(vx - lampW / 2, lampY, lampW, 6);
  ctx.restore();

  const coneGrad = ctx.createLinearGradient(vx, lampY, vx, farB + (height - farB) * 0.55);
  coneGrad.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, ${0.2 * lightLevel})`);
  coneGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(vx - lampW * 0.6, lampY + 6);
  ctx.lineTo(vx + lampW * 0.6, lampY + 6);
  ctx.lineTo(vx + farW * 1.5, farB + (height - farB) * 0.55);
  ctx.lineTo(vx - farW * 1.5, farB + (height - farB) * 0.55);
  ctx.closePath();
  ctx.fill();

  // Lurking Animatronic Silhouette at the end of the hall!
  // Steps subtly closer/twitches during heavy bass transients
  const lurkPhase = Math.sin(time * 0.0005 * spd);
  const twitchTick = Math.floor(time / 180);
  const headTwitch = bassVal * sens > 0.55 ? (pseudoRand(twitchTick) - 0.5) * 0.35 : Math.sin(time * 0.001) * 0.05;
  const figScale = 0.85 + Math.max(0, lurkPhase) * 0.28 + bassVal * 0.25 * sens;
  const figX = vx + Math.sin(time * 0.00025 * spd) * (farW * 0.16);
  const figBaseY = farB + (height - farB) * (0.04 + Math.max(0, lurkPhase) * 0.06);
  const headR = Math.min(farW, farH) * 0.21 * figScale;
  const headY = figBaseY - headR * 3.1;

  ctx.save();
  // Broad mechanical torso & jointed shoulders
  ctx.fillStyle = "rgba(6, 7, 9, 0.96)";
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.22 * lightLevel + bassVal * 0.18})`;
  ctx.lineWidth = 1.2;

  // Torso silhouette
  ctx.beginPath();
  ctx.ellipse(figX, headY + headR * 2.15, headR * 1.28, headR * 1.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Left & right cylindrical shoulder/arm joints
  ctx.beginPath();
  ctx.ellipse(figX - headR * 1.45, headY + headR * 1.85, headR * 0.42, headR * 0.95, 0.15, 0, Math.PI * 2);
  ctx.ellipse(figX + headR * 1.45, headY + headR * 1.85, headR * 0.42, headR * 0.95, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Articulated Animatronic Head with uncanny tilt
  ctx.translate(figX, headY);
  ctx.rotate(headTwitch);

  // Rounded mechanical ears
  ctx.beginPath();
  ctx.arc(-headR * 0.82, -headR * 0.82, headR * 0.36, 0, Math.PI * 2);
  ctx.arc(headR * 0.82, -headR * 0.82, headR * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Upper cranium
  ctx.beginPath();
  ctx.ellipse(0, -headR * 0.08, headR * 0.96, headR * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hinged jaw opening slightly with mid/bass frequencies
  const jawDrop = headR * (0.12 + midVal * 0.34 * sens);
  ctx.beginPath();
  ctx.roundRect(-headR * 0.62, headR * 0.35 + jawDrop * 0.4, headR * 1.24, headR * 0.56, 6);
  ctx.fill();
  ctx.stroke();

  // Metallic lower teeth glint when jaw opens
  if (jawDrop > headR * 0.18) {
    ctx.fillStyle = `rgba(210, 225, 220, ${0.42 * lightLevel})`;
    const teethCount = 6;
    const tw = (headR * 0.9) / teethCount;
    for (let t = 0; t < teethCount; t++) {
      ctx.fillRect(-headR * 0.45 + t * tw + 1, headR * 0.36 + jawDrop * 0.35, tw - 2.5, headR * 0.16);
    }
  }

  // Hollow dark eye sockets
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(-headR * 0.34, -headR * 0.14, headR * 0.22, headR * 0.25, 0, 0, Math.PI * 2);
  ctx.ellipse(headR * 0.34, -headR * 0.14, headR * 0.22, headR * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pinpoint uncanny glowing white/amber optical eyes reacting to audio
  const eyePulse = Math.min(1, 0.35 + bassVal * 0.95 * sens + (flickerDrop < 0.5 ? 0.55 : 0));
  const pupilShiftX = Math.sin(time * 0.002) * headR * 0.04;
  ctx.shadowBlur = Math.max(8, params.glow * 0.9);
  ctx.shadowColor = `rgb(${sr}, ${sg}, ${sb})`;
  ctx.fillStyle = `rgba(255, 252, 240, ${eyePulse})`;
  const pupilR = Math.max(1.8, headR * (0.065 + trebleVal * 0.035));
  ctx.beginPath();
  ctx.arc(-headR * 0.34 + pupilShiftX, -headR * 0.14, pupilR, 0, Math.PI * 2);
  ctx.arc(headR * 0.34 + pupilShiftX, -headR * 0.14, pupilR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Faint magnetic audio-interference waveform near bottom of CCTV feed
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.32)`;
  ctx.lineWidth = Math.max(1, params.lineWidth * 0.3);
  ctx.beginPath();
  const waveYBase = height - 48;
  const waveStep = Math.max(1, Math.floor(timeData.length / 120));
  for (let i = 0; i < timeData.length; i += waveStep) {
    const x = (i / timeData.length) * width;
    const norm = (timeData[i] - 128) / 128;
    const y = waveYBase + norm * 24 * sens;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // VHS horizontal tracking tear bars & transient snow static
  const tearY = ((time * 0.09 * spd) % (height + 80)) - 40;
  ctx.fillStyle = `rgba(220, 255, 235, ${0.06 + bassVal * 0.09})`;
  ctx.fillRect(0, tearY, width, 4 + bassVal * 10);

  const staticDensity = Math.floor(45 + (bassVal * sens > 0.55 ? 240 * bassVal : 35 * trebleVal));
  for (let i = 0; i < staticDensity; i++) {
    const sx = pseudoRand(time * 0.03 + i * 1.7) * width;
    const sy = pseudoRand(time * 0.07 + i * 3.1) * height;
    const sw = 2 + pseudoRand(i * 5.3) * (bassVal > 0.55 ? 36 : 12);
    const sa = 0.05 + pseudoRand(i + time * 0.01) * 0.22;
    ctx.fillStyle = `rgba(220, 240, 225, ${sa})`;
    ctx.fillRect(sx, sy, sw, 1.5);
  }

  // Fine CRT scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1.5);
  }

  // Authentic 1987 Security Monitor HUD Overlay
  const pad = Math.max(24, Math.min(width, height) * 0.04);
  const bracketLen = 28;
  ctx.strokeStyle = "rgba(235, 245, 235, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(pad, pad + bracketLen); ctx.lineTo(pad, pad); ctx.lineTo(pad + bracketLen, pad);
  // Top-right
  ctx.moveTo(width - pad - bracketLen, pad); ctx.lineTo(width - pad, pad); ctx.lineTo(width - pad, pad + bracketLen);
  // Bottom-left
  ctx.moveTo(pad, height - pad - bracketLen); ctx.lineTo(pad, height - pad); ctx.lineTo(pad + bracketLen, height - pad);
  // Bottom-right
  ctx.moveTo(width - pad - bracketLen, height - pad); ctx.lineTo(width - pad, height - pad); ctx.lineTo(width - pad, height - pad - bracketLen);
  ctx.stroke();

  const fontSize = Math.max(11, Math.min(16, Math.floor(width * 0.014)));
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;

  // Blinking REC dot & camera label
  const recBlink = Math.floor(time / 550) % 2 === 0;
  if (recBlink) {
    ctx.fillStyle = "#ff2e2e";
    ctx.beginPath();
    ctx.arc(pad + 18, pad + 22, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(240, 250, 240, 0.9)";
  ctx.textAlign = "left";
  ctx.fillText("REC  CAM 04B — WEST HALL", pad + 32, pad + 27);

  // Night shift clock (12 AM to 6 AM cycle)
  const shiftMinutes = Math.floor((time * 0.015 * spd) % 360);
  const hourNum = Math.floor(shiftMinutes / 60);
  const displayHour = hourNum === 0 ? 12 : hourNum;
  const displayMin = String(shiftMinutes % 60).padStart(2, "0");
  ctx.textAlign = "right";
  ctx.fillText(`${displayHour}:${displayMin} AM`, width - pad - 12, pad + 27);
  ctx.font = `${Math.max(10, fontSize - 2)}px 'Courier New', monospace`;
  ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.8)`;
  ctx.fillText("NIGHT 4 // 11-13-1987", width - pad - 12, pad + 46);

  // Bottom-left power & audio load usage meter
  ctx.textAlign = "left";
  const powerPct = Math.max(4, Math.floor(99 - ((time * 0.002 * spd) % 95)));
  ctx.fillStyle = powerPct < 20 ? "#ff4444" : "rgba(235, 245, 235, 0.85)";
  ctx.fillText(`POWER LEFT: ${powerPct}%`, pad + 14, height - pad - 34);

  const usageBars = Math.min(5, Math.max(1, Math.ceil(avgAmp * 5.5 * sens)));
  ctx.fillStyle = "rgba(235, 245, 235, 0.75)";
  ctx.fillText("USAGE:", pad + 14, height - pad - 14);
  for (let u = 0; u < 5; u++) {
    ctx.fillStyle = u < usageBars
      ? (u >= 4 ? "#ff3333" : u >= 2 ? "#facc15" : "#4ade80")
      : "rgba(255, 255, 255, 0.14)";
    ctx.fillRect(pad + 78 + u * 16, height - pad - 24, 12, 12);
  }

  // CRT radial dark bezel vignette
  const vig = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.72)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "left";
}

/**
 * 2. ANIMATRONIC BLUEPRINT (SISTER LAB)
 * Clandestine 1980s underground robotics CAD blueprint schematic with articulated
 * split faceplates opening on audio peaks to reveal the endoskeleton and optical servos.
 */
function drawEndoskeletonBlueprint({ ctx, width, height, freqData, timeData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height * 0.48;
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[28] || 0) / 255;
  const trebleVal = (freqData[92] || 0) / 255;
  const avgAmp = freqData.reduce((s, v) => s + v, 0) / freqData.length / 255;
  const sens = params.sensitivity;
  const spd = params.speed;

  const baseColor = params.baseColor || "#38bdf8";
  const secColor = params.secondaryColor || "#e0f2fe";
  const [br, bg, bb] = hexToRgb(baseColor, [56, 189, 248]);
  const [sr, sg, sb] = hexToRgb(secColor, [224, 242, 254]);

  // Occasional amber voltage-drop fault glitch on heavy peak
  const faultFlash = avgAmp * sens > 0.72 && Math.floor(time / 90) % 3 === 0;

  // Deep blueprint Prussian-indigo tint wash
  ctx.fillStyle = faultFlash ? "rgba(38, 16, 6, 0.38)" : "rgba(4, 15, 36, 0.42)";
  ctx.fillRect(0, 0, width, height);

  // 1. Engineering CAD Blueprint Graph Grid
  const minorGrid = 24;
  const majorGrid = 120;
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.08)`;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let x = 0; x < width; x += minorGrid) {
    ctx.moveTo(x, 0); ctx.lineTo(x, height);
  }
  for (let y = 0; y < height; y += minorGrid) {
    ctx.moveTo(0, y); ctx.lineTo(width, y);
  }
  ctx.stroke();

  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.18)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < width; x += majorGrid) {
    ctx.moveTo(x, 0); ctx.lineTo(x, height);
  }
  for (let y = 0; y < height; y += majorGrid) {
    ctx.moveTo(0, y); ctx.lineTo(width, y);
  }
  ctx.stroke();

  // Outer blueprint engineering border frame
  const m = 20;
  ctx.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, 0.42)`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(m, m, width - m * 2, height - m * 2);
  ctx.strokeRect(m + 5, m + 5, width - (m + 5) * 2, height - (m + 5) * 2);

  // 2. Central Articulated Animatronic Endoskeleton & Split Faceplates
  const scale = Math.min(width, height) * 0.28;
  // Faceplates split open in sync with bass + slow eerie breathing
  const splitAmount = Math.min(1.0, Math.max(0, (Math.sin(time * 0.0011 * spd) * 0.25 + 0.25) + bassVal * 0.85 * sens));
  const openOffset = splitAmount * scale * 0.36;
  const jawOpen = (0.08 + midVal * 0.42 * sens) * scale;

  ctx.save();
  ctx.translate(cx, cy);

  // Outer reference measurement circle & degree ticks
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.26)`;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, scale * 1.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let a = 0; a < 36; a++) {
    const ang = (a / 36) * Math.PI * 2 + time * 0.00015 * spd;
    const r0 = scale * 1.18;
    const r1 = scale * (a % 3 === 0 ? 1.26 : 1.22);
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.stroke();
  }

  // Inner Endoskeleton Skull & Tangled Hydraulic Wiring (revealed as faceplates split!)
  ctx.shadowBlur = params.glow * 0.8;
  ctx.shadowColor = faultFlash ? "#ff8800" : baseColor;
  ctx.strokeStyle = faultFlash ? "#ffaa33" : baseColor;
  ctx.lineWidth = Math.max(1.2, params.lineWidth * 0.45);

  // Neck hydraulic pistons & ribbed cables
  for (let p = -2; p <= 2; p++) {
    const px = p * scale * 0.16;
    ctx.beginPath();
    ctx.moveTo(px, scale * 0.62);
    ctx.lineTo(px * 1.2, scale * 1.15);
    ctx.stroke();
  }
  // Chest audio speaker grille below head
  ctx.beginPath();
  ctx.arc(0, scale * 1.02, scale * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  for (let r = 1; r <= 3; r++) {
    ctx.beginPath();
    ctx.arc(0, scale * 1.02, scale * (0.06 * r + bassVal * 0.04 * sens), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, ${0.65 - r * 0.15})`;
    ctx.stroke();
  }

  // Inner Endo-Cranium Wireframe
  ctx.strokeStyle = faultFlash ? "#ff8822" : `rgba(${br}, ${bg}, ${bb}, 0.9)`;
  ctx.lineWidth = Math.max(1.5, params.lineWidth * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, -scale * 0.06, scale * 0.58, scale * 0.68, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Horizontal & vertical structural endoskeleton struts
  ctx.beginPath();
  ctx.moveTo(-scale * 0.56, -scale * 0.12); ctx.lineTo(scale * 0.56, -scale * 0.12);
  ctx.moveTo(0, -scale * 0.72); ctx.lineTo(0, scale * 0.62);
  ctx.stroke();

  // Tangled coiled servo wires behind faceplates
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.48)`;
  ctx.lineWidth = 1.2;
  for (let w = 0; w < 5; w++) {
    const wy = -scale * 0.35 + w * scale * 0.16;
    ctx.beginPath();
    ctx.moveTo(-scale * 0.48, wy);
    ctx.bezierCurveTo(
      -scale * 0.18, wy + Math.sin(time * 0.003 * spd + w) * 14,
      scale * 0.18, wy - Math.cos(time * 0.003 * spd + w) * 14,
      scale * 0.48, wy
    );
    ctx.stroke();
  }

  // Dual Optical Servo Eyes (rotating mechanical irises)
  const eyeOffsetX = scale * 0.25;
  const eyeY = -scale * 0.14;
  const eyeR = scale * 0.14;
  [-1, 1].forEach((dir) => {
    const ex = dir * eyeOffsetX;
    ctx.strokeStyle = secColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating optical aperture ticks
    const irisSpin = time * 0.002 * spd * dir;
    for (let k = 0; k < 6; k++) {
      const a = irisSpin + (k / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(a) * eyeR * 0.45, eyeY + Math.sin(a) * eyeR * 0.45);
      ctx.lineTo(ex + Math.cos(a) * eyeR * 0.92, eyeY + Math.sin(a) * eyeR * 0.92);
      ctx.stroke();
    }

    // Glowing dilating pinpoint core
    ctx.fillStyle = faultFlash ? "#ff3333" : secColor;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR * (0.22 + trebleVal * 0.22 * sens), 0, Math.PI * 2);
    ctx.fill();
  });

  // Endoskeleton Upper & Lower Hinged Teeth
  const teethW = scale * 0.62;
  const teethCount = 8;
  const toothStep = teethW / teethCount;
  ctx.strokeStyle = secColor;
  ctx.lineWidth = 1.2;
  for (let t = 0; t < teethCount; t++) {
    const tx = -teethW / 2 + t * toothStep;
    ctx.strokeRect(tx + 2, scale * 0.24, toothStep - 4, scale * 0.11);
    ctx.strokeRect(tx + 2, scale * 0.36 + jawOpen * 0.45, toothStep - 4, scale * 0.11);
  }

  // 4 Articulated Split Faceplate Quadrants (Slide & Swing Outward on Audio!)
  ctx.strokeStyle = faultFlash ? "#ffd27d" : secColor;
  ctx.fillStyle = faultFlash ? "rgba(80, 35, 10, 0.32)" : `rgba(${br}, ${bg}, ${bb}, 0.14)`;
  ctx.lineWidth = Math.max(1.8, params.lineWidth * 0.55);

  const quadrants = [
    { sx: -1, sy: -1, rot: -splitAmount * 0.22 }, // Upper-Left Brow Plate
    { sx: 1, sy: -1, rot: splitAmount * 0.22 },   // Upper-Right Brow Plate
    { sx: -1, sy: 1, rot: splitAmount * 0.16 },   // Lower-Left Cheek Plate
    { sx: 1, sy: 1, rot: -splitAmount * 0.16 }    // Lower-Right Cheek Plate
  ];

  quadrants.forEach(({ sx, sy, rot }) => {
    ctx.save();
    ctx.translate(sx * openOffset, sy * openOffset * 0.65);
    ctx.rotate(rot);

    // Linkage arm back to inner skull
    ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-sx * openOffset * 0.85, -sy * openOffset * 0.55);
    ctx.stroke();

    // Quadrant outer faceplate shell arc
    ctx.strokeStyle = faultFlash ? "#ffd27d" : secColor;
    ctx.lineWidth = Math.max(1.8, params.lineWidth * 0.55);
    ctx.beginPath();
    if (sy < 0) {
      // Upper faceplate shell + mechanical ear mount
      ctx.moveTo(0, -scale * 0.84);
      ctx.quadraticCurveTo(sx * scale * 0.85, -scale * 0.82, sx * scale * 0.82, -scale * 0.04);
      ctx.lineTo(sx * scale * 0.04, -scale * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mechanical ear ring on top corner
      ctx.beginPath();
      ctx.arc(sx * scale * 0.66, -scale * 0.72, scale * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Lower cheek faceplate shell
      ctx.moveTo(sx * scale * 0.04, scale * 0.04);
      ctx.lineTo(sx * scale * 0.82, scale * 0.04);
      ctx.quadraticCurveTo(sx * scale * 0.86, scale * 0.62, sx * scale * 0.42, scale * 0.76 + jawOpen * 0.25);
      ctx.lineTo(sx * scale * 0.04, scale * 0.72 + jawOpen * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Iconic round animatronic cheek rosy circle schematic
      ctx.beginPath();
      ctx.arc(sx * scale * 0.52, scale * 0.24, scale * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  // Technical Callout Leader Lines
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, 0.55)`;
  ctx.fillStyle = secColor;
  ctx.lineWidth = 1;
  ctx.font = "bold 10px 'Courier New', monospace";

  const callouts = [
    { px: -scale * 0.65 - openOffset, py: -scale * 0.48, lx: -scale * 1.48, ly: -scale * 0.68, align: "right" as CanvasTextAlign, label: `FACEPLATE SERVO: ${(splitAmount * 100).toFixed(0)}%` },
    { px: scale * 0.65 + openOffset, py: -scale * 0.22, lx: scale * 1.48, ly: -scale * 0.42, align: "left" as CanvasTextAlign, label: `OPTICAL GAIN: ${(trebleVal * 100).toFixed(0)} LX` },
    { px: -scale * 0.45, py: scale * 0.46, lx: -scale * 1.48, ly: scale * 0.56, align: "right" as CanvasTextAlign, label: `JAW TORQUE: ${(12.4 + midVal * 28).toFixed(1)} NM` },
    { px: scale * 0.22, py: scale * 1.02, lx: scale * 1.48, ly: scale * 0.92, align: "left" as CanvasTextAlign, label: `VOICE LURE: ${(220 + bassVal * 640).toFixed(0)} HZ` }
  ];

  callouts.forEach((c) => {
    if (cx + c.lx > 35 && cx + c.lx < width - 35) {
      ctx.beginPath();
      ctx.moveTo(c.px, c.py);
      ctx.lineTo(c.lx * 0.82, c.ly);
      ctx.lineTo(c.lx, c.ly);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c.px, c.py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = c.align;
      ctx.fillText(c.label, c.lx + (c.align === "left" ? 6 : -6), c.ly + 3);
    }
  });
  ctx.restore();

  // 3. Side Schematic Diagnostics (Voice-Box Waveform & Servo Spectrum)
  const boxW = Math.min(200, width * 0.19);
  const boxH = Math.min(92, height * 0.15);
  const boxY = height - m - boxH - 28;
  const leftBoxX = m + 18;
  const rightBoxX = width - m - boxW - 18;

  if (width > 560) {
    // Left box: Voice Mimic Waveform
    ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.5)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(leftBoxX, boxY, boxW, boxH);
    ctx.fillStyle = secColor;
    ctx.font = "bold 9px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("AUDIO LURE // VOICE MIMIC", leftBoxX + 6, boxY - 6);

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < boxW; x += 2) {
      const idx = Math.floor((x / boxW) * timeData.length);
      const y = boxY + boxH / 2 + ((timeData[idx] - 128) / 128) * (boxH * 0.42) * sens;
      if (x === 0) ctx.moveTo(leftBoxX + x, y);
      else ctx.lineTo(leftBoxX + x, y);
    }
    ctx.stroke();

    // Right box: Actuator Pressure Spectrum
    ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.5)`;
    ctx.strokeRect(rightBoxX, boxY, boxW, boxH);
    ctx.fillStyle = secColor;
    ctx.textAlign = "right";
    ctx.fillText("SERVO ACTUATOR HARMONICS", rightBoxX + boxW - 6, boxY - 6);

    const bars = 18;
    const bw = (boxW - 12) / bars;
    for (let b = 0; b < bars; b++) {
      const fv = (freqData[b * 3] || 0) / 255;
      const bh = Math.min(boxH - 8, fv * boxH * 0.85 * sens);
      ctx.fillStyle = b % 2 === 0 ? baseColor : secColor;
      ctx.fillRect(rightBoxX + 6 + b * bw, boxY + boxH - 4 - bh, Math.max(2, bw - 3), bh);
    }
  }

  // 4. Blueprint Header Title Block & Vertical Scanner Sweep
  ctx.textAlign = "left";
  ctx.fillStyle = secColor;
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillText("UNIT: ENDO-05 // SUBTERRANEAN ROBOTICS ARCHIVE (1985)", m + 16, m + 24);
  ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.85)`;
  ctx.font = "10px 'Courier New', monospace";
  ctx.fillText(`CONTAINMENT: ${faultFlash ? "VOLTAGE SURGE DETECTED" : "LOCKED"}  |  SHELL SPLIT: ${(splitAmount * 100).toFixed(1)}%`, m + 16, m + 40);

  // Blueprint drafting light sweep bar
  const sweepY = ((time * 0.08 * spd) % (height - m * 2)) + m;
  const sweepGrad = ctx.createLinearGradient(0, sweepY - 35, 0, sweepY + 35);
  sweepGrad.addColorStop(0, "rgba(56, 189, 248, 0)");
  sweepGrad.addColorStop(0.5, `rgba(${br}, ${bg}, ${bb}, 0.14)`);
  sweepGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(m, sweepY - 35, width - m * 2, 70);
  ctx.textAlign = "left";
}

/**
 * 3. LIMINAL PARTY CORRIDOR
 * Uncanny infinite perspective 1980s backrooms / empty pizzeria arcade corridor.
 * Drifting forward past darkened party rooms, swaying triangular banners, buzzing ceiling lights,
 * volumetric dust cones, and faint glowing eyes watching from passing doorways.
 */
function drawLiminalArcadeHall({ ctx, width, height, freqData, time, params }: DrawOptions) {
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[26] || 0) / 255;
  const trebleVal = (freqData[90] || 0) / 255;
  const sens = params.sensitivity;
  const spd = params.speed;

  const [br, bg, bb] = hexToRgb(params.baseColor, [230, 200, 110]);
  const [sr, sg, sb] = hexToRgb(params.secondaryColor, [255, 85, 51]);

  // Subtle floating camera bob & claustrophobic bass breathing
  const camSwayX = Math.sin(time * 0.0007 * spd) * width * 0.03;
  const camBobY = Math.sin(time * 0.0014 * spd) * height * 0.015;
  const vx = width * 0.5 + camSwayX;
  const vy = height * 0.48 + camBobY;

  // Deep hazy liminal sodium fog backdrop
  const fogGrad = ctx.createRadialGradient(vx, vy, 12, vx, vy, Math.max(width, height) * 0.72);
  fogGrad.addColorStop(0, `rgba(${Math.round(br * 0.35)}, ${Math.round(bg * 0.32)}, ${Math.round(bb * 0.2)}, 0.45)`);
  fogGrad.addColorStop(0.45, "rgba(18, 16, 12, 0.72)");
  fogGrad.addColorStop(1, "rgba(5, 5, 7, 0.94)");
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, 0, width, height);

  // Endless receding rectangular corridor slices
  const sliceCount = 14;
  const travel = (time * 0.00042 * spd) % 1;
  const hallAspectW = width * (0.58 + bassVal * 0.06 * sens);
  const hallAspectH = height * (0.56 - bassVal * 0.03 * sens);

  // Draw slices from farthest (i = sliceCount) to nearest (i = 0)
  for (let i = sliceCount; i >= 1; i--) {
    const zNear = Math.max(0.04, (i - 1 + (1 - travel)) / sliceCount);
    const zFar = Math.max(0.04, (i + (1 - travel)) / sliceCount);

    const s0 = 1 / (zFar * 3.8);
    const s1 = 1 / (zNear * 3.8);
    const w0 = hallAspectW * s0;
    const h0 = hallAspectH * s0;
    const w1 = hallAspectW * s1;
    const h1 = hallAspectH * s1;

    const fade = Math.min(1, Math.max(0.04, 1 - zFar * 0.92));
    const segIdx = Math.floor(time * 0.00042 * spd) + i;
    const lampFlicker = pseudoRand(Math.floor(time / 95) + segIdx * 7) > 0.88 - trebleVal * 0.14 ? 0.32 : 1.0;

    // Floor strip (alternating checkered / arcade carpet tone)
    ctx.fillStyle = segIdx % 2 === 0
      ? `rgba(${Math.round(br * 0.24)}, ${Math.round(bg * 0.21)}, ${Math.round(bb * 0.16)}, ${0.55 * fade})`
      : `rgba(22, 20, 26, ${0.72 * fade})`;
    ctx.beginPath();
    ctx.moveTo(vx - w0, vy + h0);
    ctx.lineTo(vx + w0, vy + h0);
    ctx.lineTo(vx + w1, vy + h1);
    ctx.lineTo(vx - w1, vy + h1);
    ctx.closePath();
    ctx.fill();

    // Retro 80s arcade floor speckles / geometric carpet chevrons
    if (segIdx % 2 === 0 && fade > 0.2) {
      const midY = (vy + h0 + vy + h1) * 0.5;
      const midW = (w0 + w1) * 0.42;
      ctx.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, ${0.28 * fade})`;
      ctx.lineWidth = Math.max(1, 2.2 * fade);
      ctx.beginPath();
      ctx.moveTo(vx - midW, midY);
      ctx.lineTo(vx - midW * 0.5, midY - (h1 - h0) * 0.18);
      ctx.lineTo(vx, midY);
      ctx.lineTo(vx + midW * 0.5, midY - (h1 - h0) * 0.18);
      ctx.lineTo(vx + midW, midY);
      ctx.stroke();
    }

    // Left & Right Walls with wainscot seam
    ctx.fillStyle = `rgba(${Math.round(br * 0.2)}, ${Math.round(bg * 0.19)}, ${Math.round(bb * 0.14)}, ${0.42 * fade * lampFlicker})`;
    // Left wall
    ctx.beginPath();
    ctx.moveTo(vx - w0, vy - h0); ctx.lineTo(vx - w1, vy - h1); ctx.lineTo(vx - w1, vy + h1); ctx.lineTo(vx - w0, vy + h0);
    ctx.closePath();
    ctx.fill();
    // Right wall
    ctx.beginPath();
    ctx.moveTo(vx + w0, vy - h0); ctx.lineTo(vx + w1, vy - h1); ctx.lineTo(vx + w1, vy + h1); ctx.lineTo(vx + w0, vy + h0);
    ctx.closePath();
    ctx.fill();

    // Passing dark recessed Party Room Doorways on alternating sides
    if (segIdx % 3 === 0) {
      const side = segIdx % 6 === 0 ? -1 : 1;
      const dx0 = vx + side * (w0 + (w1 - w0) * 0.22);
      const dx1 = vx + side * (w0 + (w1 - w0) * 0.78);
      const dTop0 = vy - h0 * 0.42 + (vy - h1 * 0.42 - (vy - h0 * 0.42)) * 0.22;
      const dTop1 = vy - h0 * 0.42 + (vy - h1 * 0.42 - (vy - h0 * 0.42)) * 0.78;
      const dBot0 = vy + h0 + (vy + h1 - (vy + h0)) * 0.22;
      const dBot1 = vy + h0 + (vy + h1 - (vy + h0)) * 0.78;

      ctx.fillStyle = `rgba(3, 3, 5, ${0.9 * fade})`;
      ctx.beginPath();
      ctx.moveTo(dx0, dTop0); ctx.lineTo(dx1, dTop1); ctx.lineTo(dx1, dBot1); ctx.lineTo(dx0, dBot0);
      ctx.closePath();
      ctx.fill();

      // Occasional eerie pair of glowing eyes watching from inside a dark doorway!
      if (segIdx % 9 === 0 && trebleVal * sens > 0.28 && fade > 0.25 && fade < 0.85) {
        const ex = (dx0 + dx1) * 0.5;
        const ey = (dTop0 + dBot0) * 0.44;
        const sep = Math.max(3, Math.abs(dx1 - dx0) * 0.16);
        ctx.fillStyle = `rgba(255, 250, 220, ${0.85 * fade})`;
        ctx.beginPath();
        ctx.arc(ex - sep * 0.5, ey, Math.max(1.5, 3 * fade), 0, Math.PI * 2);
        ctx.arc(ex + sep * 0.5, ey, Math.max(1.5, 3 * fade), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Ceiling fluorescent light fixture every 2nd slice + volumetric downward haze
    if (segIdx % 2 === 1) {
      const lw0 = w0 * 0.36;
      const lw1 = w1 * 0.36;
      const ly0 = vy - h0;
      const ly1 = vy - h1;

      ctx.fillStyle = `rgba(${Math.min(255, br + 40)}, ${Math.min(255, bg + 40)}, ${Math.min(255, bb + 20)}, ${0.72 * fade * lampFlicker})`;
      ctx.beginPath();
      ctx.moveTo(vx - lw0, ly0); ctx.lineTo(vx + lw0, ly0); ctx.lineTo(vx + lw1, ly1); ctx.lineTo(vx - lw1, ly1);
      ctx.closePath();
      ctx.fill();

      // Volumetric light cone
      const volGrad = ctx.createLinearGradient(vx, ly1, vx, vy + h1);
      volGrad.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, ${0.14 * fade * lampFlicker})`);
      volGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = volGrad;
      ctx.beginPath();
      ctx.moveTo(vx - lw1, ly1);
      ctx.lineTo(vx + lw1, ly1);
      ctx.lineTo(vx + w1 * 0.78, vy + h1);
      ctx.lineTo(vx - w1 * 0.78, vy + h1);
      ctx.closePath();
      ctx.fill();
    }

    // Hanging triangular party pennant bunting across the upper corridor
    if (segIdx % 2 === 0 && fade > 0.12) {
      const ropeY = vy - h0 * 0.72;
      const sag = h0 * (0.14 + midVal * 0.08 * sens);
      ctx.strokeStyle = `rgba(220, 215, 200, ${0.25 * fade})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(vx - w0, ropeY);
      ctx.quadraticCurveTo(vx, ropeY + sag, vx + w0, ropeY);
      ctx.stroke();

      const flags = 7;
      for (let f = 0; f < flags; f++) {
        const ft = (f + 0.5) / flags;
        const fx = (vx - w0) + (w0 * 2) * ft;
        const fy = ropeY + 4 * sag * ft * (1 - ft);
        const fSize = Math.max(4, w0 * 0.12);
        const sway = Math.sin(time * 0.002 * spd + f + segIdx) * fSize * 0.25;
        ctx.fillStyle = f % 2 === 0
          ? `rgba(${sr}, ${sg}, ${sb}, ${0.42 * fade})`
          : `rgba(${br}, ${bg}, ${bb}, ${0.38 * fade})`;
        ctx.beginPath();
        ctx.moveTo(fx - fSize * 0.55, fy);
        ctx.lineTo(fx + fSize * 0.55, fy);
        ctx.lineTo(fx + sway, fy + fSize * 1.35);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Frame rib outline
    ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.2 * fade})`;
    ctx.lineWidth = Math.max(0.8, params.lineWidth * 0.28 * fade);
    ctx.strokeRect(vx - w0, vy - h0, w0 * 2, h0 * 2);
  }

  // Distant flickering glowing EXIT sign hovering near vanishing point
  const exitFlicker = pseudoRand(Math.floor(time / 130)) > 0.2 ? 1 : 0.25;
  const exitW = Math.max(28, width * 0.036);
  const exitH = Math.max(12, exitW * 0.42);
  ctx.save();
  ctx.shadowBlur = Math.max(10, params.glow) * exitFlicker;
  ctx.shadowColor = `rgb(${sr}, ${sg}, ${sb})`;
  ctx.fillStyle = `rgba(${sr}, ${Math.round(sg * 0.25)}, ${Math.round(sb * 0.25)}, ${0.75 * exitFlicker})`;
  ctx.fillRect(vx - exitW / 2, vy - hallAspectH * 0.24, exitW, exitH);
  ctx.fillStyle = `rgba(255, 235, 225, ${0.9 * exitFlicker})`;
  ctx.font = `bold ${Math.max(8, Math.floor(exitH * 0.72))}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("EXIT", vx, vy - hallAspectH * 0.24 + exitH * 0.78);
  ctx.restore();

  // Floating atmospheric dust motes drifting through light beams
  const moteCount = Math.min(80, Math.max(30, Math.floor((params.particleCount || 80) * 0.5)));
  for (let m = 0; m < moteCount; m++) {
    const mx = ((pseudoRand(m * 11.3) * width + time * 0.015 * spd * (m % 2 === 0 ? 1 : -0.7)) % width + width) % width;
    const my = ((pseudoRand(m * 19.7) * height - time * 0.012 * spd) % height + height) % height;
    const mr = 1 + pseudoRand(m * 5.1) * (2.2 + bassVal * 1.5);
    ctx.fillStyle = `rgba(${Math.min(255, br + 40)}, ${Math.min(255, bg + 40)}, ${Math.min(255, bb + 20)}, ${0.14 + trebleVal * 0.25})`;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle camcorder vignette & scanlines
  const vig = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.28, width / 2, height / 2, Math.max(width, height) * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(2, 2, 4, 0.78)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "left";
}

// Helper for crisp mechanical gear drawing inside Springlock Mechanism
function drawToothedGear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerR: number,
  innerR: number,
  teeth: number,
  angle: number,
  strokeStyle: string,
  fillStyle: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.48;
    const a3 = a0 + step * 0.70;
    const x0 = Math.cos(a0) * innerR;
    const y0 = Math.sin(a0) * innerR;
    if (i === 0) ctx.moveTo(x0, y0);
    else ctx.lineTo(x0, y0);
    ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR);
    ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR);
    ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Inner hub & spokes
  ctx.beginPath();
  ctx.arc(0, 0, innerR * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  for (let s = 0; s < 4; s++) {
    const sa = (s / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(sa) * innerR * 0.42, Math.sin(sa) * innerR * 0.42);
    ctx.lineTo(Math.cos(sa) * innerR * 0.85, Math.sin(sa) * innerR * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 4. SPRINGLOCK ENDOSKELETON CORE
 * Claustrophobic close-up inside an 1980s animatronic chest cavity with interlocking brass/steel gears,
 * compressing helical springlock coils, snapping metallic rib-clamps, and sparking conduits.
 */
function drawSpringlockMechanism({ ctx, width, height, freqData, timeData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height / 2;
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[25] || 0) / 255;
  const trebleVal = (freqData[95] || 0) / 255;
  const avgAmp = freqData.reduce((s, v) => s + v, 0) / freqData.length / 255;
  const sens = params.sensitivity;
  const spd = params.speed;

  const baseColor = params.baseColor || "#f97316";
  const secColor = params.secondaryColor || "#38bdf8";
  const [br, bg, bb] = hexToRgb(baseColor, [249, 115, 22]);
  const [sr, sg, sb] = hexToRgb(secColor, [56, 189, 248]);

  const minDim = Math.min(width, height);
  // Subtle metallic recoil rattle on bass strikes
  const rattleX = bassVal * sens > 0.6 ? (pseudoRand(Math.floor(time / 30)) - 0.5) * 8 : 0;
  const rattleY = bassVal * sens > 0.6 ? (pseudoRand(Math.floor(time / 30) + 19) - 0.5) * 8 : 0;

  // Oily dark metallic interior wash
  const bgGrad = ctx.createRadialGradient(cx, cy, minDim * 0.08, cx, cy, Math.max(width, height) * 0.72);
  bgGrad.addColorStop(0, `rgba(${Math.round(br * 0.24)}, ${Math.round(bg * 0.16)}, ${Math.round(bb * 0.08)}, 0.45)`);
  bgGrad.addColorStop(0.6, "rgba(12, 11, 13, 0.72)");
  bgGrad.addColorStop(1, "rgba(3, 3, 5, 0.94)");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(rattleX, rattleY);

  // 1. Background Interlocking Gear Train
  const baseSpin = time * 0.0007 * spd + bassVal * 0.18 * sens;
  const gears = [
    { x: cx - minDim * 0.34, y: cy - minDim * 0.26, r: minDim * 0.18, teeth: 14, dir: 1 },
    { x: cx + minDim * 0.34, y: cy - minDim * 0.26, r: minDim * 0.18, teeth: 14, dir: -1 },
    { x: cx - minDim * 0.38, y: cy + minDim * 0.28, r: minDim * 0.21, teeth: 16, dir: -0.85 },
    { x: cx + minDim * 0.38, y: cy + minDim * 0.28, r: minDim * 0.21, teeth: 16, dir: 0.85 },
    { x: cx, y: cy - minDim * 0.36, r: minDim * 0.13, teeth: 10, dir: -1.4 },
    { x: cx, y: cy + minDim * 0.36, r: minDim * 0.13, teeth: 10, dir: 1.4 }
  ];

  gears.forEach((g) => {
    drawToothedGear(
      ctx,
      g.x,
      g.y,
      g.r,
      g.r * 0.82,
      g.teeth,
      baseSpin * g.dir,
      `rgba(${br}, ${bg}, ${bb}, 0.42)`,
      "rgba(20, 18, 22, 0.75)"
    );
  });

  // 2. Left & Right Springlock Helical Coils + Articulated Snap-Clamp Ribs
  const clampSnap = Math.min(1, bassVal * 0.9 * sens);
  const ribCount = 5;
  [-1, 1].forEach((side) => {
    const anchorX = cx + side * width * 0.44;
    const tipBaseX = cx + side * (minDim * 0.28 - clampSnap * minDim * 0.09);

    // Vertical hydraulic guide rail
    ctx.strokeStyle = "rgba(140, 145, 155, 0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(anchorX, cy - minDim * 0.38);
    ctx.lineTo(anchorX, cy + minDim * 0.38);
    ctx.stroke();

    for (let r = 0; r < ribCount; r++) {
      const frac = (r / (ribCount - 1)) - 0.5; // -0.5 to 0.5
      const ry = cy + frac * minDim * 0.62;
      const ribCurve = Math.cos(frac * Math.PI) * minDim * 0.05;
      const tipX = tipBaseX - side * ribCurve;

      // Helical compressed springlock coil between rail and rib clamp
      ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.55 + clampSnap * 0.35})`;
      ctx.lineWidth = Math.max(1.5, params.lineWidth * 0.45);
      ctx.beginPath();
      const coils = 9;
      for (let c = 0; c <= coils; c++) {
        const t = c / coils;
        const sx = anchorX + (tipX - anchorX) * (t * 0.62);
        const sy = ry + (c % 2 === 0 ? -1 : 1) * (10 + clampSnap * 5);
        if (c === 0) ctx.moveTo(anchorX, ry);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // Heavy steel clamp jaw pointing inward toward central core
      ctx.fillStyle = "rgba(32, 30, 36, 0.9)";
      ctx.strokeStyle = `rgba(${sr}, ${sg}, ${sb}, ${0.4 + clampSnap * 0.45})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(anchorX + (tipX - anchorX) * 0.6, ry - 11);
      ctx.lineTo(tipX, ry - 4);
      ctx.lineTo(tipX - side * 10, ry);
      ctx.lineTo(tipX, ry + 4);
      ctx.lineTo(anchorX + (tipX - anchorX) * 0.6, ry + 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });

  // 3. Central Pneumatic Servo Core & Mechanical Aperture
  const coreR = minDim * (0.19 + bassVal * 0.045 * sens);
  // Outer steel bezel with frequency pressure ticks
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.78)`;
  ctx.lineWidth = Math.max(2, params.lineWidth * 0.6);
  ctx.beginPath();
  ctx.arc(cx, cy, coreR * 1.24, 0, Math.PI * 2);
  ctx.stroke();

  const ticks = 48;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2 - time * 0.0004 * spd;
    const fv = (freqData[Math.floor((i / ticks) * freqData.length * 0.4)] || 0) / 255;
    const len = 6 + fv * minDim * 0.065 * sens;
    ctx.strokeStyle = fv > 0.55 ? secColor : baseColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * coreR * 1.04, cy + Math.sin(a) * coreR * 1.04);
    ctx.lineTo(cx + Math.cos(a) * (coreR * 1.04 + len), cy + Math.sin(a) * (coreR * 1.04 + len));
    ctx.stroke();
  }

  // Mechanical iris shutter blades inside core
  ctx.fillStyle = "rgba(8, 9, 12, 0.94)";
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  const blades = 8;
  const aperture = 0.35 + midVal * 0.45 * sens;
  ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, 0.65)`;
  ctx.lineWidth = 1.6;
  for (let b = 0; b < blades; b++) {
    const a0 = (b / blades) * Math.PI * 2 + time * 0.0008 * spd;
    const a1 = a0 + 0.85;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * coreR, cy + Math.sin(a0) * coreR);
    ctx.lineTo(cx + Math.cos(a1) * (coreR * aperture), cy + Math.sin(a1) * (coreR * aperture));
    ctx.stroke();
  }

  // Circular trapped-heartbeat timeData oscilloscope inside aperture
  ctx.save();
  ctx.shadowBlur = params.glow * 1.1;
  ctx.shadowColor = secColor;
  ctx.strokeStyle = secColor;
  ctx.lineWidth = Math.max(1.5, params.lineWidth * 0.45);
  ctx.beginPath();
  const ringPts = 96;
  for (let i = 0; i <= ringPts; i++) {
    const ang = (i / ringPts) * Math.PI * 2;
    const tIdx = Math.floor((i / ringPts) * timeData.length) % timeData.length;
    const norm = (timeData[tIdx] - 128) / 128;
    const rad = coreR * 0.56 + norm * coreR * 0.38 * sens;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // 4. Short-Circuit Electrical Arcs jumping between springlock conduits on treble/peak surges
  if (trebleVal * sens > 0.35 || avgAmp * sens > 0.5) {
    const arcCount = trebleVal * sens > 0.65 ? 4 : 2;
    ctx.save();
    ctx.shadowBlur = Math.max(12, params.glow * 1.2);
    ctx.shadowColor = secColor;
    ctx.strokeStyle = "#e0f7ff";
    ctx.lineWidth = 1.6;
    for (let a = 0; a < arcCount; a++) {
      const startAng = pseudoRand(Math.floor(time / 45) + a * 13) * Math.PI * 2;
      const endAng = startAng + (pseudoRand(a * 7 + Math.floor(time / 60)) - 0.5) * 1.4;
      const x0 = cx + Math.cos(startAng) * coreR * 1.05;
      const y0 = cy + Math.sin(startAng) * coreR * 1.05;
      const x1 = cx + Math.cos(endAng) * minDim * 0.42;
      const y1 = cy + Math.sin(endAng) * minDim * 0.42;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const jx = (pseudoRand(time * 0.1 + s * 5 + a) - 0.5) * 28;
        const jy = (pseudoRand(time * 0.1 + s * 9 + a) - 0.5) * 28;
        ctx.lineTo(x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy);
      }
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();

  // Industrial Stencil Warnings
  const pad = 24;
  ctx.font = "bold 10px 'Courier New', monospace";
  ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, 0.85)`;
  ctx.textAlign = "left";
  ctx.fillText("CAUTION: SPRINGLOCK COMPRESSION CORE // DO NOT BREATHE ON LOCKS", pad, pad + 12);
  ctx.fillStyle = clampSnap > 0.68 ? "#ff3b30" : `rgba(${sr}, ${sg}, ${sb}, 0.8)`;
  ctx.fillText(`LOCK TENSION: ${(420 + clampSnap * 580).toFixed(0)} PSI  |  MOISTURE RISK: ${clampSnap > 0.68 ? "CRITICAL" : "ELEVATED"}`, pad, height - pad);
  ctx.textAlign = "left";
}

/**
 * 5. ANALOG VHS SIGNAL HAUNT
 * Haunted 1980s VHS training tape / midnight CRT raster broadcast.
 * Uses horizontal CRT scanline modulation (Rutt-Etra style) to materialize an eerie,
 * hollow-eyed animatronic visage & audio-reactive hinged jaw out of magnetic snow and RGB ghosting.
 */
function drawVhsSignalHaunt({ ctx, width, height, freqData, timeData, time, params }: DrawOptions) {
  const cx = width / 2;
  const cy = height * 0.5;
  const bassVal = (freqData[2] || 0) / 255;
  const midVal = (freqData[22] || 0) / 255;
  const trebleVal = (freqData[88] || 0) / 255;
  const avgAmp = freqData.reduce((s, v) => s + v, 0) / freqData.length / 255;
  const sens = params.sensitivity;
  const spd = params.speed;

  const [br, bg, bb] = hexToRgb(params.baseColor, [225, 235, 255]);
  const [sr, sg, sb] = hexToRgb(params.secondaryColor, [255, 42, 85]);

  // Subliminal static inversion flash on rare heavy peak
  const peakFlash = bassVal * sens > 0.92 && pseudoRand(Math.floor(time / 65)) > 0.72;
  ctx.fillStyle = peakFlash ? "rgba(210, 215, 225, 0.22)" : "rgba(6, 7, 11, 0.55)";
  ctx.fillRect(0, 0, width, height);

  // Travelling VHS magnetic tracking crease Y position
  const creaseY = ((time * 0.14 * spd) % (height + 160)) - 80;
  const rgbShift = 3 + bassVal * 16 * sens;
  const visagePresence = Math.min(1.0, 0.28 + avgAmp * 1.45 * sens + Math.sin(time * 0.0008 * spd) * 0.12);
  const headScale = Math.min(width, height) * 0.30;
  const jawOpen = 0.06 + midVal * 0.34 * sens;

  // Evaluate procedural height/mask luminance of the haunting animatronic visage at normalized (nx, ny)
  const evalVisage = (nx: number, ny: number): { lum: number; isEyePin: boolean } => {
    // Rounded animatronic ears
    const leftEar = Math.hypot((nx + 0.62) / 0.28, (ny + 0.72) / 0.28);
    const rightEar = Math.hypot((nx - 0.62) / 0.28, (ny + 0.72) / 0.28);
    // Cranium + lower snout/jaw
    const headDist = Math.hypot(nx / 0.78, (ny + 0.08) / 0.74);
    const jawDist = Math.hypot(nx / 0.56, (ny - (0.48 + jawOpen * 0.65)) / 0.38);

    const insideShell = headDist < 1.0 || leftEar < 1.0 || rightEar < 1.0 || jawDist < 1.0;
    if (!insideShell) return { lum: 0, isEyePin: false };

    // Base domed shading
    let lum = Math.max(0, 1 - Math.min(headDist, leftEar * 1.15, rightEar * 1.15, jawDist * 1.1) * 0.78);

    // Sunken hollow eye sockets (pitch black voids)
    const eyeL = Math.hypot((nx + 0.29) / 0.19, (ny + 0.16) / 0.20);
    const eyeR = Math.hypot((nx - 0.29) / 0.19, (ny + 0.16) / 0.20);
    if (eyeL < 1.0 || eyeR < 1.0) {
      // Tiny jittering pinpoint pupils staring out of the dark sockets
      const jitterX = (pseudoRand(Math.floor(time / 120)) - 0.5) * 0.04;
      const pinL = Math.hypot(nx + 0.29 + jitterX, ny + 0.16);
      const pinR = Math.hypot(nx - 0.29 + jitterX, ny + 0.16);
      if (pinL < 0.055 || pinR < 0.055) {
        return { lum: 1.35, isEyePin: true };
      }
      return { lum: 0.03, isEyePin: false };
    }

    // Dark hollow triangular nose cavity
    if (Math.abs(nx) < 0.11 && ny > 0.02 && ny < 0.16) {
      return { lum: 0.06, isEyePin: false };
    }

    // Wide gaping hinged animatronic mouth cavity opening with vocal/mid audio
    const mouthTop = 0.26;
    const mouthBot = 0.36 + jawOpen * 0.85;
    if (Math.abs(nx) < 0.44 && ny > mouthTop && ny < mouthBot) {
      // Faint periodic endo-teeth glints along mouth rim
      const toothBand = Math.abs(ny - (mouthTop + 0.045)) < 0.035 || Math.abs(ny - (mouthBot - 0.045)) < 0.035;
      if (toothBand && Math.sin(nx * 36) > 0.15) {
        return { lum: 0.85, isEyePin: false };
      }
      return { lum: 0.04, isEyePin: false };
    }

    return { lum, isEyePin: false };
  };

  // 1. Rutt-Etra CRT Scanline Visage (displaced horizontal raster lines)
  const scanLines = 78;
  const xSamples = 86;
  const lineSpacing = height / scanLines;

  // Draw subtle chromatic ghost pass first (red/secondary channel offset) + main phosphor pass
  const passes = [
    { offset: -rgbShift, color: `rgba(${sr}, ${Math.round(sg * 0.35)}, ${Math.round(sb * 0.45)}, ${0.42 * visagePresence})`, widthScale: 0.9 },
    { offset: rgbShift * 0.7, color: `rgba(60, 220, 255, ${0.32 * visagePresence})`, widthScale: 0.85 },
    { offset: 0, color: `rgba(${br}, ${bg}, ${bb}, ${0.88 * visagePresence})`, widthScale: 1.0 }
  ];

  passes.forEach((pass, pIdx) => {
    ctx.strokeStyle = pass.color;
    ctx.lineWidth = Math.max(1, params.lineWidth * 0.34 * pass.widthScale);

    for (let row = 0; row < scanLines; row++) {
      const baseY = row * lineSpacing + lineSpacing * 0.5;
      const creaseDist = Math.abs(baseY - creaseY);
      const creaseWarp = creaseDist < 26 ? Math.sin((creaseDist / 26) * Math.PI) * (18 + bassVal * 35) : 0;

      // Audio waveform modulation per scanline
      const waveIdx = Math.floor((row / scanLines) * timeData.length);
      const rowWave = ((timeData[waveIdx] - 128) / 128) * 14 * sens;

      ctx.beginPath();
      for (let col = 0; col <= xSamples; col++) {
        const px = (col / xSamples) * width;
        const nx = (px - cx) / headScale;
        const ny = (baseY - cy) / headScale;
        const { lum, isEyePin } = evalVisage(nx, ny);

        // Static grain jitter
        const noise = (pseudoRand(row * 17.1 + col * 3.7 + Math.floor(time / 45)) - 0.5) * (3 + trebleVal * 10);
        const displacement = -lum * (14 + bassVal * 18 * sens) + (isEyePin ? -8 : 0);

        const drawX = px + pass.offset + creaseWarp;
        const drawY = baseY + displacement * visagePresence + rowWave * (lum > 0.1 ? 0.5 : 0.15) + noise;

        if (col === 0) ctx.moveTo(drawX, drawY);
        else ctx.lineTo(drawX, drawY);
      }
      ctx.stroke();

      // Extra piercing white pinpoint glow on eyes during main pass
      if (pIdx === 2) {
        const ny = (baseY - cy) / headScale;
        if (Math.abs(ny + 0.16) < 0.045) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.55 + bassVal * 0.8)})`;
          const exL = cx - 0.29 * headScale + creaseWarp;
          const exR = cx + 0.29 * headScale + creaseWarp;
          ctx.fillRect(exL - 4, baseY - 2, 8, 4);
          ctx.fillRect(exR - 4, baseY - 2, 8, 4);
        }
      }
    }
  });

  // 2. Magnetic Tape Dropout Streaks & Head-Switching Noise Bar at bottom
  const dropoutCount = Math.floor(8 + trebleVal * 26 * sens);
  for (let d = 0; d < dropoutCount; d++) {
    const dx = pseudoRand(time * 0.04 + d * 11.1) * width;
    const dy = pseudoRand(time * 0.06 + d * 7.3) * height;
    const dw = 14 + pseudoRand(d * 5.7) * 90;
    ctx.fillStyle = d % 3 === 0 ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(dx, dy, dw, 2);
  }

  // Bottom VHS head-switching static band
  const headNoiseH = 14;
  for (let i = 0; i < 40; i++) {
    const sx = pseudoRand(i * 4.3 + Math.floor(time / 35)) * width;
    const sy = height - headNoiseH + pseudoRand(i * 9.1 + time * 0.01) * headNoiseH;
    ctx.fillStyle = `rgba(235, 240, 255, ${0.15 + pseudoRand(i + time) * 0.35})`;
    ctx.fillRect(sx, sy, 18 + pseudoRand(i) * 45, 2);
  }

  // 3. Authentic 1980s VCR On-Screen Display (OSD)
  const pad = Math.max(26, width * 0.04);
  const osdJitterX = bassVal * sens > 0.7 ? (pseudoRand(Math.floor(time / 50)) - 0.5) * 6 : 0;
  const fontSize = Math.max(13, Math.min(20, Math.floor(width * 0.018)));
  ctx.font = `bold ${fontSize}px 'Courier New', monospace`;

  ctx.save();
  ctx.shadowBlur = 6;
  ctx.shadowColor = "rgba(255, 255, 255, 0.55)";
  ctx.fillStyle = "rgba(242, 248, 255, 0.92)";
  ctx.textAlign = "left";
  ctx.fillText("PLAY ►", pad + osdJitterX, pad + fontSize);
  ctx.font = `bold ${Math.max(11, fontSize - 4)}px 'Courier New', monospace`;
  ctx.fillText("SP  TAPE #87 — TRAINING ARCHIVE", pad + osdJitterX, pad + fontSize * 2.1);

  ctx.textAlign = "right";
  const secTotal = Math.floor(time / 1000);
  const hh = String(Math.floor(secTotal / 3600)).padStart(1, "0");
  const mm = String(Math.floor((secTotal % 3600) / 60)).padStart(2, "0");
  const ss = String(secTotal % 60).padStart(2, "0");
  ctx.fillText(`SLP  ${hh}:${mm}:${ss}`, width - pad + osdJitterX, height - pad - 12);

  // Tracking indicator flashes during audio peaks
  if (bassVal * sens > 0.52) {
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(${sr}, ${sg}, ${sb}, 0.92)`;
    ctx.fillText("AUTO TRACKING  [ ▌▌▌▌░░ ]", cx + osdJitterX, height - pad - 12);
  }
  ctx.restore();

  // Dark CRT tube edge vignette
  const vig = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.34, cx, cy, Math.max(width, height) * 0.78);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "left";
}


