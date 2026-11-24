import { GarmentCategory, ProductColorway } from '../types';

const imageCache = new Map<string, Promise<HTMLImageElement>>();
const renderedCache = new Map<string, string>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(src);
  if (existing) return existing;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic pseudo-random noise for authentic acid-wash / vintage grain.
 */
function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Sculpt a photorealistic short-sleeve boxy streetwear t-shirt directly
 * from the 3D-shaded heavyweight hoodie render (keeps real cloth folds & lighting,
 * crops hood into a 3D shaded thick mock-rib crew neck, and crops sleeves at elbow).
 */
function applyTeeSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // 1. Mask out hood above collar + lower forearms below elbow-length boxy short sleeves
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  // Clean boxy short-sleeve t-shirt silhouette tightly hugging hoodie-tech.jpg torso & upper arms
  ctx.moveTo(w * 0.365, h * 0.22);
  // Crew neck curve (dips cleanly at center front)
  ctx.quadraticCurveTo(w * 0.505, h * 0.285, w * 0.635, h * 0.22);
  // Right drop-shoulder down to boxy short sleeve opening
  ctx.quadraticCurveTo(w * 0.725, h * 0.255, w * 0.77, h * 0.365);
  ctx.lineTo(w * 0.805, h * 0.545);
  // Angled right short-sleeve hem back to armpit
  ctx.quadraticCurveTo(w * 0.75, h * 0.575, w * 0.70, h * 0.535);
  // Right torso straight down to clean boxy hem
  ctx.lineTo(w * 0.715, h * 0.88);
  ctx.quadraticCurveTo(w * 0.51, h * 0.905, w * 0.305, h * 0.88);
  // Left torso up to armpit
  ctx.lineTo(w * 0.32, h * 0.545);
  // Left short-sleeve opening
  ctx.quadraticCurveTo(w * 0.255, h * 0.585, w * 0.195, h * 0.555);
  ctx.lineTo(w * 0.23, h * 0.365);
  // Left drop-shoulder back to crew neck
  ctx.quadraticCurveTo(w * 0.275, h * 0.25, w * 0.365, h * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Render realistic 3D shaded dark inner collar cavity + thick mock-rib collar band
  ctx.save();
  // Back inner neck shadow
  ctx.beginPath();
  ctx.moveTo(w * 0.365, h * 0.218);
  ctx.quadraticCurveTo(w * 0.50, h * 0.195, w * 0.635, h * 0.218);
  ctx.quadraticCurveTo(w * 0.50, h * 0.285, w * 0.365, h * 0.218);
  ctx.closePath();
  const neckGrad = ctx.createLinearGradient(0, h * 0.19, 0, h * 0.28);
  neckGrad.addColorStop(0, '#14151a');
  neckGrad.addColorStop(0.55, '#07070a');
  neckGrad.addColorStop(1, '#1a1b22');
  ctx.fillStyle = neckGrad;
  ctx.fill();

  // Thick heavyweight mock-rib front collar band
  ctx.beginPath();
  ctx.moveTo(w * 0.358, h * 0.216);
  ctx.quadraticCurveTo(w * 0.50, h * 0.298, w * 0.642, h * 0.216);
  ctx.lineWidth = w * 0.028;
  ctx.lineCap = 'round';
  const ribGrad = ctx.createLinearGradient(w * 0.35, 0, w * 0.65, 0);
  ribGrad.addColorStop(0, 'rgba(62,64,74,0.95)');
  ribGrad.addColorStop(0.5, 'rgba(92,95,108,0.95)');
  ribGrad.addColorStop(1, 'rgba(48,50,58,0.95)');
  ctx.strokeStyle = ribGrad;
  ctx.stroke();

  // Crisp double-needle sleeve cuff & bottom hem stitch shading
  ctx.globalCompositeOperation = 'source-atop';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 3]);
  // Right sleeve hem stitch
  ctx.beginPath();
  ctx.moveTo(w * 0.71, h * 0.528);
  ctx.quadraticCurveTo(w * 0.78, h * 0.57, w * 0.855, h * 0.538);
  ctx.stroke();
  // Left sleeve hem stitch
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.548);
  ctx.quadraticCurveTo(w * 0.23, h * 0.58, w * 0.31, h * 0.538);
  ctx.stroke();
  // Bottom hem double stitch
  ctx.beginPath();
  ctx.moveTo(w * 0.29, h * 0.872);
  ctx.quadraticCurveTo(w * 0.51, h * 0.895, w * 0.73, h * 0.872);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw crisp streetwear design artwork, zippers, straps, panels, and textures
 * clipped strictly onto the garment pixels (source-atop) so every one of the 40
 * designs looks genuinely distinct and wraps naturally into the garment!
 */
function drawDesignDetails(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  _category: GarmentCategory,
  designId: string,
  accentHex: string
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';

  const drawMetallicZipper = (x: number, yStart: number, yEnd: number, withRing = false) => {
    // Dark seam backing
    ctx.strokeStyle = 'rgba(8, 8, 12, 0.85)';
    ctx.lineWidth = w * 0.022;
    ctx.beginPath();
    ctx.moveTo(x, yStart);
    ctx.lineTo(x, yEnd);
    ctx.stroke();

    // Metallic zipper teeth
    ctx.strokeStyle = 'rgba(226, 232, 245, 0.88)';
    ctx.lineWidth = w * 0.009;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, yStart);
    ctx.lineTo(x, yEnd);
    ctx.stroke();
    ctx.setLineDash([]);

    // Zip pull / O-ring
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(x - w * 0.011, yStart + h * 0.03, w * 0.022, h * 0.032);
    if (withRing) {
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, yStart + h * 0.075, w * 0.022, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawCyberSigil = (cx: number, cy: number, scale: number, strokeCol = 'rgba(235, 242, 255, 0.85)') => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = strokeCol;
    ctx.shadowColor = accentHex;
    ctx.shadowBlur = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Sharp symmetrical cyber-sigilism blade artwork
    for (const dir of [-1, 1]) {
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.bezierCurveTo(dir * 18, -14, dir * 56, -24, dir * 92, -6);
      ctx.bezierCurveTo(dir * 52, 6, dir * 32, 16, dir * 64, 34);
      ctx.bezierCurveTo(dir * 26, 20, dir * 12, 34, 0, 56);
      ctx.stroke();

      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(dir * 12, -26);
      ctx.quadraticCurveTo(dir * 46, -42, dir * 74, -30);
      ctx.moveTo(dir * 16, 8);
      ctx.quadraticCurveTo(dir * 44, 4, dir * 78, 16);
      ctx.stroke();
    }
    // Central diamond core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 16);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawAcidWash = (intensity = 0.24) => {
    for (let k = 0; k < 28; k++) {
      const rx = hash2d(k, 1.3) * w;
      const ry = hash2d(k, 7.9) * h;
      const rad = w * (0.08 + hash2d(k, 3.7) * 0.16);
      const grad = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
      grad.addColorStop(0, `rgba(225, 228, 240, ${intensity})`);
      grad.addColorStop(1, 'rgba(225, 228, 240, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(rx - rad, ry - rad, rad * 2, rad * 2);
    }
  };

  const drawStencilText = (text: string, x: number, y: number, sizePx: number, color = 'rgba(244,244,252,0.86)', angle = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `700 ${sizePx}px "Anton", Impact, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  const drawTacticalStraps = (yMid: number) => {
    // Matte webbing chest harness + silver Fidlock buckle
    ctx.strokeStyle = 'rgba(12, 12, 16, 0.92)';
    ctx.lineWidth = w * 0.042;
    ctx.beginPath();
    ctx.moveTo(w * 0.26, yMid);
    ctx.lineTo(w * 0.74, yMid);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(w * 0.26, yMid - w * 0.015);
    ctx.lineTo(w * 0.74, yMid - w * 0.015);
    ctx.moveTo(w * 0.26, yMid + w * 0.015);
    ctx.lineTo(w * 0.74, yMid + w * 0.015);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical shoulder straps
    ctx.strokeStyle = 'rgba(14, 14, 18, 0.85)';
    ctx.lineWidth = w * 0.032;
    ctx.beginPath();
    ctx.moveTo(w * 0.37, h * 0.24);
    ctx.lineTo(w * 0.39, yMid);
    ctx.moveTo(w * 0.63, h * 0.24);
    ctx.lineTo(w * 0.61, yMid);
    ctx.stroke();

    // Central Fidlock buckle
    ctx.fillStyle = '#18181f';
    ctx.strokeStyle = 'rgba(210, 215, 230, 0.75)';
    ctx.lineWidth = 2;
    ctx.fillRect(w * 0.455, yMid - h * 0.03, w * 0.09, h * 0.06);
    ctx.strokeRect(w * 0.455, yMid - h * 0.03, w * 0.09, h * 0.06);
  };

  // =========================================================================
  // DESIGN-SPECIFIC ARTWORK & TAILORING FOR ALL 40 UNIQUE PIECES
  // =========================================================================
  switch (designId) {
    // --- JACKETS ---
    case 'jacket-01':
    case 'jacket-02':
    case 'jacket-03':
      break; // Flagship pure photorealistic studio renders!

    case 'jacket-04': {
      // APEX-04 LEATHER MOTO RACER: bold white/silver chest racing stripes + angled pocket zips
      ctx.fillStyle = 'rgba(240, 244, 255, 0.82)';
      ctx.fillRect(w * 0.28, h * 0.38, w * 0.44, h * 0.022);
      ctx.fillStyle = accentHex;
      ctx.fillRect(w * 0.28, h * 0.412, w * 0.44, h * 0.012);
      drawStencilText('APEX // 04', w * 0.50, h * 0.34, w * 0.048, 'rgba(245,245,252,0.9)');
      drawMetallicZipper(w * 0.50, h * 0.24, h * 0.84, true);
      break;
    }
    case 'jacket-05': {
      // STRATOS-05 TECH VARSITY: gothic S crest + double varsity hem & cuff stripes
      drawStencilText('S', w * 0.60, h * 0.42, w * 0.14, 'rgba(248,248,255,0.9)');
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3;
      ctx.strokeRect(w * 0.545, h * 0.35, w * 0.11, h * 0.14);
      ctx.fillStyle = 'rgba(245, 245, 255, 0.78)';
      ctx.fillRect(w * 0.28, h * 0.78, w * 0.44, h * 0.014);
      ctx.fillRect(w * 0.28, h * 0.808, w * 0.44, h * 0.014);
      break;
    }
    case 'jacket-06': {
      // GHOST-06 UTILITY FIELD: tactical straps + military spec stencil
      drawTacticalStraps(h * 0.49);
      drawStencilText('UNIT-06 // FIELD', w * 0.39, h * 0.36, w * 0.032, 'rgba(235,240,255,0.82)');
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(w * 0.55, h * 0.33, w * 0.12, h * 0.07);
      break;
    }
    case 'jacket-07': {
      // NOVA-07 PHANTOM PUFFER: bold vertical racing stripe + patch
      ctx.fillStyle = 'rgba(12, 12, 18, 0.55)';
      ctx.fillRect(0, 0, w, h); // Matte stealth coat over chrome
      ctx.fillStyle = accentHex;
      ctx.fillRect(w * 0.57, h * 0.20, w * 0.032, h * 0.64);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillRect(w * 0.61, h * 0.20, w * 0.012, h * 0.64);
      drawStencilText('07', w * 0.39, h * 0.44, w * 0.09, 'rgba(255,255,255,0.86)');
      break;
    }
    case 'jacket-08': {
      // PRISM-08 ACID DENIM ARMOR: heavy vintage wash + cyber sigil chest
      drawAcidWash(0.32);
      drawCyberSigil(w * 0.50, h * 0.47, w / 560, 'rgba(240,245,255,0.82)');
      break;
    }
    case 'jacket-09': {
      // ZERO-09 CROSS-ZIP ANORAK: dramatic diagonal waterproof zip + reflective chevron
      ctx.strokeStyle = 'rgba(235, 240, 255, 0.9)';
      ctx.lineWidth = w * 0.012;
      ctx.beginPath();
      ctx.moveTo(w * 0.38, h * 0.25);
      ctx.lineTo(w * 0.66, h * 0.78);
      ctx.stroke();
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.48);
      ctx.lineTo(w * 0.50, h * 0.38);
      ctx.lineTo(w * 0.72, h * 0.48);
      ctx.stroke();
      drawStencilText('ZERO-09', w * 0.39, h * 0.62, w * 0.038, 'rgba(255,255,255,0.78)');
      break;
    }
    case 'jacket-10': {
      // TITAN-10 QUILTED CYBER: diamond-quilted geometric grid + "010" chest print
      ctx.strokeStyle = 'rgba(10, 10, 14, 0.55)';
      ctx.lineWidth = 2.5;
      for (let d = -h; d < w + h; d += w * 0.075) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + h, h);
        ctx.moveTo(d + h, 0);
        ctx.lineTo(d, h);
        ctx.stroke();
      }
      drawStencilText('TITAN // 10', w * 0.50, h * 0.46, w * 0.052, 'rgba(245,245,255,0.88)');
      break;
    }

    // --- HOODIES ---
    case 'hoodie-01':
      break; // Clean sculpted luxury tech hoodie

    case 'hoodie-02': {
      // PHANTOM-02 HEAVY ZIP: acid wash + bold full-length silver metal zipper + raw stitch
      drawAcidWash(0.24);
      drawMetallicZipper(w * 0.515, h * 0.27, h * 0.89, true);
      ctx.strokeStyle = 'rgba(245,245,255,0.34)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(w * 0.32, h * 0.25);
      ctx.lineTo(w * 0.37, h * 0.88);
      ctx.moveTo(w * 0.70, h * 0.25);
      ctx.lineTo(w * 0.66, h * 0.88);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'hoodie-03': {
      // CYBER-03 SIGIL GRAPHIC: chrome cyber-sigil artwork across chest
      drawCyberSigil(w * 0.51, h * 0.46, w / 460);
      break;
    }
    case 'hoodie-04': {
      // NEXUS-04 TACTICAL STRAP: webbing chest harness + coordinates
      drawTacticalStraps(h * 0.47);
      drawStencilText('NEXUS // 04', w * 0.51, h * 0.36, w * 0.042, 'rgba(240,242,255,0.85)');
      break;
    }
    case 'hoodie-05': {
      // ECLIPSE-05 BOXY CROPPED: architectural arched logo + crisp wide boxy stripe
      drawStencilText('SYNTH ERA', w * 0.515, h * 0.42, w * 0.072, 'rgba(245,245,255,0.9)');
      drawStencilText('DROP 01 · ARMOR', w * 0.515, h * 0.49, w * 0.028, accentHex);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(w * 0.28, h * 0.78, w * 0.46, h * 0.045);
      break;
    }
    case 'hoodie-06': {
      // VORTEX-06 COLORBLOCK: diagonal contrast split panel + 3M glowing piping
      ctx.fillStyle = 'rgba(10, 10, 16, 0.58)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(w, h * 0.34);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.lineTo(w, h * 0.34);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'hoodie-07': {
      // KINETIC-07 HALF-ZIP ANORAK: half-zip + horizontal front storm pouch
      drawMetallicZipper(w * 0.515, h * 0.26, h * 0.48, true);
      ctx.fillStyle = 'rgba(12, 12, 18, 0.68)';
      ctx.strokeStyle = 'rgba(220, 225, 240, 0.5)';
      ctx.lineWidth = 2;
      ctx.fillRect(w * 0.36, h * 0.51, w * 0.31, h * 0.14);
      ctx.strokeRect(w * 0.36, h * 0.51, w * 0.31, h * 0.14);
      drawStencilText('KINETIC-07', w * 0.515, h * 0.58, w * 0.032, 'rgba(240,244,255,0.85)');
      break;
    }
    case 'hoodie-08': {
      // NOIR-08 ACID DISTRESSED: grunge spray wash + purple brush "ARMOR"
      drawAcidWash(0.32);
      ctx.save();
      ctx.font = `400 ${w * 0.105}px "Sedgwick Ave Display", cursive`;
      ctx.textAlign = 'center';
      ctx.fillStyle = accentHex;
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 14;
      ctx.fillText('Armor', w * 0.52, h * 0.49);
      ctx.shadowBlur = 0;
      ctx.font = `400 ${w * 0.032}px "Rock Salt", cursive`;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText('CREATED FOR YOU', w * 0.52, h * 0.56);
      ctx.restore();
      break;
    }
    case 'hoodie-09': {
      // SIGNAL-09 TOKYO PUFF: bold geometric poster grid + 09 emblem
      ctx.strokeStyle = 'rgba(245, 245, 255, 0.78)';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(w * 0.37, h * 0.36, w * 0.29, h * 0.26);
      ctx.fillStyle = accentHex;
      ctx.fillRect(w * 0.37, h * 0.36, w * 0.29, h * 0.048);
      drawStencilText('09', w * 0.515, h * 0.495, w * 0.135, 'rgba(250,250,255,0.92)');
      drawStencilText('SIGNAL TOKYO', w * 0.515, h * 0.59, w * 0.028, 'rgba(235,235,248,0.85)');
      break;
    }
    case 'hoodie-10': {
      // AURA-10 CHROME FLAME: sleeve graphic stripes + center chrome star
      ctx.strokeStyle = 'rgba(240, 244, 255, 0.84)';
      ctx.lineWidth = 4;
      for (let s = 0; s < 3; s++) {
        const yOff = h * (0.42 + s * 0.075);
        ctx.beginPath();
        ctx.moveTo(w * 0.18, yOff);
        ctx.lineTo(w * 0.30, yOff + h * 0.03);
        ctx.moveTo(w * 0.82, yOff);
        ctx.lineTo(w * 0.70, yOff + h * 0.03);
        ctx.stroke();
      }
      drawCyberSigil(w * 0.515, h * 0.44, w / 640, '#ffffff');
      break;
    }

    // --- PANTS / PANTALON ---
    case 'pants-01':
      break; // Clean flagship ballistic cargo

    case 'pants-02': {
      // DRIFT-02 PARACHUTE WIDE: articulated knee volume tucks + bungee toggle stripes
      ctx.strokeStyle = 'rgba(245,245,255,0.65)';
      ctx.lineWidth = 2.4;
      for (const y of [0.51, 0.56, 0.82]) {
        ctx.beginPath();
        ctx.moveTo(w * 0.28, h * y);
        ctx.lineTo(w * 0.47, h * y);
        ctx.moveTo(w * 0.53, h * y);
        ctx.lineTo(w * 0.72, h * y);
        ctx.stroke();
      }
      drawStencilText('DRIFT', w * 0.62, h * 0.40, w * 0.042, 'rgba(240,244,255,0.82)');
      break;
    }
    case 'pants-03': {
      // OBSIDIAN-03 STACKED FLARE DENIM: heavy acid wash + bold contrast vertical center seam
      drawAcidWash(0.34);
      ctx.strokeStyle = 'rgba(248, 248, 255, 0.72)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(w * 0.39, h * 0.16);
      ctx.lineTo(w * 0.37, h * 0.88);
      ctx.moveTo(w * 0.61, h * 0.16);
      ctx.lineTo(w * 0.63, h * 0.88);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    }
    case 'pants-04': {
      // TACTIC-04 BONDAGE STRAP: cross-leg black straps with silver buckles + SPEC-04
      ctx.strokeStyle = '#09090d';
      ctx.lineWidth = w * 0.045;
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.44);
      ctx.lineTo(w * 0.72, h * 0.58);
      ctx.moveTo(w * 0.28, h * 0.62);
      ctx.lineTo(w * 0.72, h * 0.46);
      ctx.stroke();
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.28, h * 0.44);
      ctx.lineTo(w * 0.72, h * 0.58);
      ctx.stroke();
      drawStencilText('SPEC-04', w * 0.62, h * 0.32, w * 0.036, '#ffffff');
      break;
    }
    case 'pants-05': {
      // MONO-05 CHROME SIGIL DENIM: cyber-sigil artwork across knees
      drawCyberSigil(w * 0.38, h * 0.54, w / 860, 'rgba(245,248,255,0.9)');
      drawCyberSigil(w * 0.62, h * 0.54, w / 860, 'rgba(245,248,255,0.9)');
      break;
    }
    case 'pants-06': {
      // PULSE-06 SIDE-ZIP TRACK: twin metallic outer track stripes + reflective glow
      ctx.strokeStyle = 'rgba(245, 248, 255, 0.92)';
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.32, h * 0.16);
      ctx.lineTo(w * 0.33, h * 0.87);
      ctx.moveTo(w * 0.68, h * 0.16);
      ctx.lineTo(w * 0.67, h * 0.87);
      ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'pants-07': {
      // GRIT-07 DOUBLE-KNEE CARPENTER: contrast knee armor patches + white contrast stitch
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = 'rgba(248, 248, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.fillRect(w * 0.31, h * 0.44, w * 0.15, h * 0.22);
      ctx.strokeRect(w * 0.31, h * 0.44, w * 0.15, h * 0.22);
      ctx.fillRect(w * 0.54, h * 0.44, w * 0.15, h * 0.22);
      ctx.strokeRect(w * 0.54, h * 0.44, w * 0.15, h * 0.22);
      ctx.setLineDash([]);
      break;
    }
    case 'pants-08': {
      // SHADOW-08 GRAPHIC CARGO: bold vertical SYNTH // 08 down left leg
      drawStencilText('SYNTH // 08', w * 0.62, h * 0.52, w * 0.056, 'rgba(248,248,255,0.9)', Math.PI / 2);
      ctx.fillStyle = accentHex;
      ctx.fillRect(w * 0.33, h * 0.36, w * 0.11, h * 0.015);
      break;
    }
    case 'pants-09': {
      // RAW-09 MOTO BIKER DENIM: accordion knee ribs + diagonal thigh zippers
      drawAcidWash(0.22);
      ctx.strokeStyle = 'rgba(240, 244, 255, 0.72)';
      ctx.lineWidth = 2.6;
      for (let r = 0; r < 5; r++) {
        const yy = h * (0.49 + r * 0.025);
        ctx.beginPath();
        ctx.moveTo(w * 0.32, yy);
        ctx.lineTo(w * 0.45, yy);
        ctx.moveTo(w * 0.55, yy);
        ctx.lineTo(w * 0.68, yy);
        ctx.stroke();
      }
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.33, h * 0.31);
      ctx.lineTo(w * 0.44, h * 0.36);
      ctx.moveTo(w * 0.67, h * 0.31);
      ctx.lineTo(w * 0.56, h * 0.36);
      ctx.stroke();
      break;
    }
    case 'pants-10': {
      // FLUX-10 SPLICED PANEL: dual-tone left/right colorblock architectural pants
      ctx.fillStyle = 'rgba(8, 8, 12, 0.52)';
      ctx.fillRect(0, 0, w * 0.5, h);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.50, h * 0.12);
      ctx.lineTo(w * 0.50, h * 0.48);
      ctx.stroke();
      drawStencilText('10', w * 0.39, h * 0.68, w * 0.068, 'rgba(248,248,255,0.85)');
      break;
    }

    // --- SHORT-SLEEVE T-SHIRTS (NOS KOM) ---
    case 'tee-01': {
      // SIGIL-01 ACID-WASH CYBER TEE
      drawAcidWash(0.28);
      drawCyberSigil(w * 0.51, h * 0.49, w / 430);
      break;
    }
    case 'tee-02': {
      // CORE-02 MINIMAL HEAVY TEE: sleek minimal collar mark + woven chest hem tag
      drawStencilText('SYNTH', w * 0.51, h * 0.36, w * 0.032, 'rgba(245,245,255,0.78)');
      ctx.fillStyle = accentHex;
      ctx.fillRect(w * 0.62, h * 0.80, w * 0.055, h * 0.024);
      break;
    }
    case 'tee-03': {
      // CHROME-03 3D EMBLEM TEE: sculptural chrome starburst & SYNTH ERA
      ctx.save();
      ctx.translate(w * 0.51, h * 0.48);
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3.2;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const len = a % 2 === 0 ? w * 0.14 : w * 0.08;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.055, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      drawStencilText('CHROME-03', w * 0.51, h * 0.67, w * 0.036, 'rgba(245,245,255,0.85)');
      break;
    }
    case 'tee-04': {
      // MESH-04 MOTO JERSEY: racing stripe + bold "04" + sleeve chevrons
      ctx.fillStyle = accentHex;
      ctx.fillRect(w * 0.25, h * 0.36, w * 0.52, h * 0.025);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillRect(w * 0.25, h * 0.395, w * 0.52, h * 0.012);
      drawStencilText('04', w * 0.51, h * 0.54, w * 0.18, 'rgba(248,248,255,0.92)');
      drawStencilText('SYNTH RACING', w * 0.51, h * 0.68, w * 0.032, 'rgba(235,238,255,0.82)');
      break;
    }
    case 'tee-05': {
      // RAW-05 INSIDE-OUT SEAM TEE: contrast white overlock stitching lines
      drawAcidWash(0.2);
      ctx.strokeStyle = 'rgba(248, 248, 255, 0.78)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(w * 0.33, h * 0.25);
      ctx.lineTo(w * 0.33, h * 0.88);
      ctx.moveTo(w * 0.69, h * 0.25);
      ctx.lineTo(w * 0.69, h * 0.88);
      ctx.moveTo(w * 0.28, h * 0.45);
      ctx.lineTo(w * 0.74, h * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);
      drawStencilText('RAW // 05', w * 0.51, h * 0.40, w * 0.038, 'rgba(245,245,255,0.85)');
      break;
    }
    case 'tee-06': {
      // POCKET-06 TACTICAL UTILITY TEE: 3D zippered chest pocket + D-ring
      ctx.fillStyle = 'rgba(12, 12, 18, 0.76)';
      ctx.strokeStyle = 'rgba(235, 240, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.fillRect(w * 0.54, h * 0.39, w * 0.135, h * 0.145);
      ctx.strokeRect(w * 0.54, h * 0.39, w * 0.135, h * 0.145);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.55, h * 0.425);
      ctx.lineTo(w * 0.665, h * 0.425);
      ctx.stroke();
      drawStencilText('SPEC-06', w * 0.41, h * 0.45, w * 0.034, 'rgba(240,242,255,0.82)');
      break;
    }
    case 'tee-07': {
      // VAPOR-07 SPRAY-FADE GRAFFITI TEE
      drawAcidWash(0.28);
      ctx.save();
      ctx.font = `400 ${w * 0.11}px "Sedgwick Ave Display", cursive`;
      ctx.textAlign = 'center';
      ctx.fillStyle = accentHex;
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 16;
      ctx.fillText('Modern', w * 0.51, h * 0.48);
      ctx.fillText('Armor', w * 0.51, h * 0.60);
      ctx.restore();
      break;
    }
    case 'tee-08': {
      // ZIP-08 QUARTER-ZIP POLO TECH TEE
      drawMetallicZipper(w * 0.51, h * 0.25, h * 0.47, true);
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.16, h * 0.53);
      ctx.lineTo(w * 0.30, h * 0.53);
      ctx.moveTo(w * 0.72, h * 0.53);
      ctx.lineTo(w * 0.85, h * 0.53);
      ctx.stroke();
      break;
    }
    case 'tee-09': {
      // SLICE-09 GEOMETRIC PANEL BLOCK TEE
      ctx.fillStyle = 'rgba(10, 10, 16, 0.56)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.64);
      ctx.lineTo(w, h * 0.34);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = accentHex;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.64);
      ctx.lineTo(w, h * 0.34);
      ctx.stroke();
      ctx.shadowBlur = 0;
      drawStencilText('SLICE // 09', w * 0.44, h * 0.74, w * 0.04, 'rgba(245,245,255,0.85)');
      break;
    }
    case 'tee-10': {
      // SCULPT-10 ARMOR CONTOUR TEE: anatomical futuristic chest lines
      ctx.strokeStyle = 'rgba(240, 244, 255, 0.82)';
      ctx.lineWidth = 2.4;
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(w * (0.51 + dir * 0.14), h * 0.30);
        ctx.quadraticCurveTo(w * (0.51 + dir * 0.05), h * 0.50, w * (0.51 + dir * 0.12), h * 0.82);
        ctx.stroke();
      }
      ctx.strokeStyle = accentHex;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(w * 0.37, h * 0.45);
      ctx.lineTo(w * 0.51, h * 0.51);
      ctx.lineTo(w * 0.65, h * 0.45);
      ctx.stroke();
      drawStencilText('10', w * 0.51, h * 0.42, w * 0.052, '#ffffff');
      break;
    }
    default:
      break;
  }

  ctx.restore();
}

/**
 * Full Studio Pipeline:
 * 1. Load real 3D studio render base
 * 2. Sculpt silhouette (e.g., short-sleeve boxy t-shirt)
 * 3. Knock out pure black studio background AND recolor garment fabric pixels
 *    to the exact selected dye colorway while preserving folds & highlights
 * 4. Composite bespoke streetwear artwork, zippers, straps & details cleanly onto fabric
 */
export async function renderStudioGarment(
  src: string,
  category: GarmentCategory,
  designId: string,
  colorway: ProductColorway
): Promise<string> {
  const cacheKey = `${src}::${category}::${designId}::${colorway.id}`;
  const cached = renderedCache.get(cacheKey);
  if (cached) return cached;

  const img = await loadImage(src);
  const maxDim = 520;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 520, img.naturalHeight || 520));
  const w = Math.max(1, Math.round((img.naturalWidth || 520) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 520) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;

  ctx.drawImage(img, 0, 0, w, h);

  // Silhouette sculpting for short-sleeve T-Shirts
  if (category === 'tshirts') {
    applyTeeSilhouette(ctx, w, h);
  }

  // Pixel-accurate background removal + real photorealistic dye recoloring
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const isRecolor = colorway.mode === 'recolor' && Boolean(colorway.dyeRgb);
  const [tr, tg, tb] = colorway.dyeRgb || [255, 255, 255];
  const gamma = colorway.gamma ?? 0.62;
  const isLightDye = (tr + tg + tb) / 3 > 170;

  // Sample true studio backdrop level from corners to guarantee 100% clean alpha cutout
  let bgLevel = 0.04;
  const sampleCoords = [
    [4, 4],
    [w - 5, 4],
    [4, h - 5],
    [w - 5, h - 5],
    [Math.floor(w * 0.5), 4],
    [4, Math.floor(h * 0.5)],
  ];
  for (const [sx, sy] of sampleCoords) {
    const idx = (sy * w + sx) * 4;
    if (data[idx + 3] > 20) {
      const cMax = Math.max(data[idx], data[idx + 1], data[idx + 2]) / 255;
      if (cMax > bgLevel && cMax < 0.18) bgLevel = cMax;
    }
  }
  const cutLow = bgLevel + 0.022;
  const cutHigh = bgLevel + 0.075;

  // Adaptive garment luminance range so dark charcoal fabrics recolor vibrantly
  let maxLum = 0.42;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 20) continue;
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    if (lum > maxLum && lum < 0.90) maxLum = lum;
  }
  const lumRange = Math.max(0.28, maxLum - cutLow);

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const maxC = Math.max(r, g, b) / 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Adaptive studio background knockout (zero box edge & zero graphic bleed!)
    const alphaFactor = smoothstep(cutLow, cutHigh, maxC);
    if (alphaFactor < 0.08) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = Math.round(a * alphaFactor);

    if (!isRecolor) continue;

    const normL = Math.max(0, Math.min(1, (lum - cutLow) / lumRange));
    const shapedL = Math.pow(normL, gamma);
    const specular = smoothstep(0.68, 0.97, lum);

    const shadeMul = isLightDye
      ? 0.28 + shapedL * 0.92
      : 0.18 + shapedL * 1.24;

    let outR = tr * shadeMul;
    let outG = tg * shadeMul;
    let outB = tb * shadeMul;

    const specMix = specular * (isLightDye ? 0.38 : 0.58);
    outR = outR * (1 - specMix) + 252 * specMix;
    outG = outG * (1 - specMix) + 252 * specMix;
    outB = outB * (1 - specMix) + 255 * specMix;

    data[i] = clamp255(outR);
    data[i + 1] = clamp255(outG);
    data[i + 2] = clamp255(outB);
  }

  ctx.putImageData(imgData, 0, 0);

  // Composite streetwear graphics, hardware, zippers, washes & details on top of dyed fabric!
  drawDesignDetails(ctx, w, h, category, designId, colorway.glowHex);

  const url = canvas.toDataURL('image/png');
  renderedCache.set(cacheKey, url);
  return url;
}

export function getCachedStudioGarment(
  src: string,
  category: GarmentCategory,
  designId: string,
  colorway: ProductColorway
): string | undefined {
  return renderedCache.get(`${src}::${category}::${designId}::${colorway.id}`);
}

const trimmedImageCache = new Map<string, Promise<HTMLCanvasElement>>();

/**
 * Returns a tightly cropped, alpha-transparent offscreen canvas of the garment
 * (zero empty outer padding) so AR body-tracking maps garment width & shoulders
 * 1:1 to real MediaPipe pose landmarks.
 */
export async function renderTrimmedGarmentCanvas(
  src: string,
  category: GarmentCategory,
  designId: string,
  colorway: ProductColorway
): Promise<HTMLCanvasElement> {
  const key = `trim::${src}::${category}::${designId}::${colorway.id}`;
  const existing = trimmedImageCache.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const dataUrl = await renderStudioGarment(src, category, designId, colorway);
    const img = await loadImage(dataUrl);
    const w = img.naturalWidth || 520;
    const h = img.naturalHeight || 520;

    const temp = document.createElement('canvas');
    temp.width = w;
    temp.height = h;
    const tctx = temp.getContext('2d', { willReadFrequently: true })!;
    tctx.drawImage(img, 0, 0, w, h);

    const pixels = tctx.getImageData(0, 0, w, h).data;
    let minX = w;
    let minY = h;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = pixels[(y * w + x) * 4 + 3];
        if (alpha > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) {
      return temp;
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const trimmed = document.createElement('canvas');
    trimmed.width = cropW;
    trimmed.height = cropH;
    const outCtx = trimmed.getContext('2d')!;
    outCtx.drawImage(temp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return trimmed;
  })();

  trimmedImageCache.set(key, promise);
  return promise;
}

/**
 * Generates a crisp VTON-ready garment reference image centered on a clean
 * soft-white studio background (#f5f5f7) so Generative AI Virtual Try-On models
 * (Leffa / IDM-VTON) segment every fold, graphic, and sleeve with maximum accuracy.
 */
export async function renderVtonReferenceDataUrl(
  src: string,
  category: GarmentCategory,
  designId: string,
  colorway: ProductColorway
): Promise<string> {
  const trimmed = await renderTrimmedGarmentCanvas(src, category, designId, colorway);
  const outW = 768;
  const outH = 1024;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d')!;

  // Clean soft-white studio background expected by VITON-HD & DressCode AI models
  ctx.fillStyle = '#f5f5f7';
  ctx.fillRect(0, 0, outW, outH);

  const maxGarmentW = outW * 0.78;
  const maxGarmentH = outH * 0.78;
  const scale = Math.min(maxGarmentW / trimmed.width, maxGarmentH / trimmed.height);
  const dw = trimmed.width * scale;
  const dh = trimmed.height * scale;
  const dx = (outW - dw) * 0.5;
  const dy = (outH - dh) * 0.5;

  ctx.drawImage(trimmed, dx, dy, dw, dh);
  return canvas.toDataURL('image/jpeg', 0.92);
}


