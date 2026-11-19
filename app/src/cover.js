export const LAYOUTS = [
  { id: 'nine', name: 'Nine Lives', panels: 9 },
  { id: 'hero-six', name: 'Hero Six', panels: 6 },
  { id: 'hero-three', name: 'Hero Three', panels: 4 },
  { id: 'quad', name: 'Quad', panels: 4 },
  { id: 'duet', name: 'Duet', panels: 2 },
  { id: 'snapshots', name: 'Snapshots', panels: 3 },
  { id: 'full', name: 'Full Bleed', panels: 1 },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset' },
  { id: 'neon', name: 'Neon Harbor' },
  { id: 'golden', name: 'Golden Hour' },
  { id: 'noir', name: 'Night Noir' },
  { id: 'palm', name: 'Palm Green' },
];

const PALETTES = {
  sunset: ['#1b1035', '#d6336c', '#ff9e4f', '#ffe8c9'],
  neon: ['#062a33', '#12b5a5', '#ff5da2', '#eafcff'],
  golden: ['#241505', '#b96a1b', '#ffb84d', '#fff3d6'],
  noir: ['#0a0a0a', '#454545', '#b4b4b4', '#f5f5f5'],
  palm: ['#04231c', '#0e7a5f', '#7fd069', '#f4ffd8'],
};
const lutCache = new Map();

export function createState() {
  return {
    layout: 'nine',
    grade: 'sunset',
    ink: false,
    caption: 'PALMSKY HEAT',
    subtitle: 'Neon Harbor Nights',
    heat: 4,
    badge: 'LAUNCH WEEK',
    panels: [],
    seed: 7,
  };
}

export function layoutRects(W, H, layoutId) {
  const gutter = Math.max(2, W * 0.006);
  const rect = (x, y, w, h) => ({
    x: x + gutter / 2,
    y: y + gutter / 2,
    w: Math.max(1, w - gutter),
    h: Math.max(1, h - gutter),
  });
  const grid = (x, y, w, h, columns, rows) => {
    const cells = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        cells.push(rect(
          x + (w * column) / columns,
          y + (h * row) / rows,
          w / columns,
          h / rows,
        ));
      }
    }
    return cells;
  };
  switch (layoutId) {
    case 'hero-six': {
      const split = W * 0.55;
      const right = W - split;
      const top = H * 0.34;
      return [
        rect(0, 0, split, H),
        rect(split, 0, right, top),
        ...grid(split, top, right, H - top, 2, 2),
      ];
    }
    case 'hero-three': {
      const split = H * 0.58;
      return [rect(0, 0, W, split), ...grid(0, split, W, H - split, 3, 1)];
    }
    case 'quad':
      return grid(0, 0, W, H, 2, 2);
    case 'duet':
      return grid(0, 0, W, H, 2, 1);
    case 'snapshots':
      return [
        rect(W * 0.06, H * 0.20, W * 0.42, H * 0.42),
        rect(W * 0.50, H * 0.28, W * 0.43, H * 0.44),
        rect(W * 0.22, H * 0.54, W * 0.50, H * 0.39),
      ];
    case 'full':
      return [rect(0, 0, W, H)];
    case 'nine':
    default:
      return grid(0, 0, W, H, 3, 3);
  }
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hexRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function makeLut(grade) {
  const key = PALETTES[grade] ? grade : 'sunset';
  if (lutCache.has(key)) return lutCache.get(key);
  const stops = PALETTES[key].map(hexRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let value = 0; value < 256; value += 1) {
    const input = value / 255;
    const tone = key === 'noir'
      ? input * input * (3 - 2 * input)
      : Math.max(0, Math.min(1, (input - 0.5) * 1.12 + 0.5));
    const position = tone * (stops.length - 1);
    const segment = Math.min(stops.length - 2, Math.floor(position));
    const mix = position - segment;
    for (let channel = 0; channel < 3; channel += 1) {
      const palette = stops[segment][channel]
        + (stops[segment + 1][channel] - stops[segment][channel]) * mix;
      const grey = palette * 0.299 + palette * 0.587 + palette * 0.114;
      lut[value * 3 + channel] = grey + (palette - grey) * 1.18;
    }
  }
  lutCache.set(key, lut);
  return lut;
}

function drawPlaceholder(ctx, x, y, w, h, seed) {
  const sky = ctx.createLinearGradient(x, y, x + w * 0.15, y + h);
  sky.addColorStop(0, '#211348');
  sky.addColorStop(0.48, '#d83b83');
  sky.addColorStop(0.76, '#ff9c55');
  sky.addColorStop(1, '#271746');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255, 205, 156, 0.72)';
  ctx.beginPath();
  ctx.arc(x + w * 0.72, y + h * 0.31, Math.min(w, h) * 0.115, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(15, 13, 39, 0.78)';
  ctx.fillRect(x, y + h * 0.76, w, h * 0.24);
  const sway = ((seed * 37) % 13) / 100;
  const trunkX = x + w * (0.22 + sway);
  ctx.strokeStyle = '#160f2d';
  ctx.lineWidth = Math.max(2, w * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(trunkX, y + h * 0.87);
  ctx.quadraticCurveTo(trunkX + w * 0.03, y + h * 0.49, trunkX + w * 0.09, y + h * 0.30);
  ctx.stroke();
  const crownX = trunkX + w * 0.09;
  const crownY = y + h * 0.30;
  ctx.lineWidth = Math.max(1.5, w * 0.019);
  for (let leaf = 0; leaf < 7; leaf += 1) {
    const angle = Math.PI + (Math.PI * leaf) / 6;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + Math.cos(angle) * w * 0.13,
      crownY + Math.sin(angle) * h * 0.16,
      crownX + Math.cos(angle) * w * 0.25,
      crownY + Math.sin(angle) * h * 0.24,
    );
    ctx.stroke();
  }
}

function drawPhoto(ctx, photo, rect, panel, grade, ink, seed) {
  const { x, y, w, h } = rect;
  if (!photo || !(photo.naturalWidth || photo.width) || !(photo.naturalHeight || photo.height)) {
    drawPlaceholder(ctx, x, y, w, h, seed);
    return;
  }
  const sw = photo.naturalWidth || photo.width;
  const sh = photo.naturalHeight || photo.height;
  const fit = Math.max(w / sw, h / sh);
  const scale = fit * Math.max(1, Number(panel.scale) || 1);
  const dw = sw * scale;
  const dh = sh * scale;
  const overflowX = Math.max(0, dw - w);
  const overflowY = Math.max(0, dh - h);
  const dx = Math.max(-1, Math.min(1, Number(panel.dx) || 0));
  const dy = Math.max(-1, Math.min(1, Number(panel.dy) || 0));
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.ceil(w));
  off.height = Math.max(1, Math.ceil(h));
  const offCtx = off.getContext('2d', { willReadFrequently: true });
  offCtx.drawImage(photo, (off.width - dw) / 2 - (overflowX * dx) / 2,
    (off.height - dh) / 2 - (overflowY * dy) / 2, dw, dh);
  try {
    const image = offCtx.getImageData(0, 0, off.width, off.height);
    const pixels = image.data;
    const lut = makeLut(grade);
    for (let index = 0; index < pixels.length; index += 4) {
      let luminance = Math.round(
        pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114,
      );
      if (ink) luminance = Math.round((luminance / 255) * 5) * 51;
      pixels[index] = lut[luminance * 3];
      pixels[index + 1] = lut[luminance * 3 + 1];
      pixels[index + 2] = lut[luminance * 3 + 2];
    }
    offCtx.putImageData(image, 0, 0);
  } catch {
    const tint = ctx.createLinearGradient(x, y, x + w, y + h);
    tint.addColorStop(0, 'rgba(214, 51, 108, 0.24)');
    tint.addColorStop(1, 'rgba(255, 158, 79, 0.30)');
    offCtx.fillStyle = tint;
    offCtx.fillRect(0, 0, off.width, off.height);
  }
  ctx.drawImage(off, x, y, w, h);
}

function drawKeyline(ctx, rect, W) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.94)';
  ctx.lineWidth = Math.max(1, W * 0.0035);
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(14, 7, 30, 0.8)';
  ctx.lineWidth = Math.max(1, W * 0.001);
  ctx.strokeRect(x + W * 0.004, y + W * 0.004, w - W * 0.008, h - W * 0.008);
  ctx.restore();
}

function spacedText(ctx, text, x, y, spacing) {
  let cursor = x;
  for (const character of text) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + spacing;
  }
}

function drawHalftone(ctx, W, top, bottom, seed) {
  const random = mulberry32(seed ^ 0x51ed270b);
  const step = Math.max(5, W * 0.018);
  for (let y = top; y < bottom; y += step) {
    for (let x = 0; x < W; x += step) {
      const ramp = (y - top) / Math.max(1, bottom - top);
      const radius = step * (0.045 + ramp * 0.13) * (0.55 + random() * 0.9);
      ctx.fillStyle = 'rgba(255,247,255,' + (0.09 + ramp * 0.12) + ')';
      ctx.beginPath();
      ctx.arc(x + step / 2, y + step / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function fitFont(ctx, text, maxWidth, startSize, family, spacing) {
  let size = startSize;
  while (size > 8) {
    ctx.font = size + 'px "' + family + '", "Arial Black", sans-serif';
    if (ctx.measureText(text).width + Math.max(0, text.length - 1) * (spacing || 0) <= maxWidth) break;
    size -= Math.max(1, startSize * 0.018);
  }
  return size;
}

function drawTitle(ctx, W, H, state, snapshots) {
  const top = snapshots ? H * 0.035 : H * 0.70;
  const blockHeight = snapshots ? H * 0.22 : H * 0.30;
  const shade = ctx.createLinearGradient(0, top, 0, top + blockHeight);
  shade.addColorStop(0, snapshots ? 'rgba(15,7,35,0.08)' : 'rgba(12,5,32,0)');
  shade.addColorStop(0.42, 'rgba(13,5,32,0.67)');
  shade.addColorStop(1, 'rgba(9,4,28,0.90)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, top, W, blockHeight);
  drawHalftone(ctx, W, top, top + blockHeight, Number(state.seed) || 0);

  const safe = W * 0.075;
  const issue = 'THE PALMSKY POST • LAUNCH WEEK • ISSUE 01';
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const issueSize = fitFont(ctx, issue, W - safe * 2, H * 0.027, 'Bebas Neue', W * 0.003);
  ctx.font = issueSize + 'px "Bebas Neue", "Arial Black", sans-serif';
  spacedText(ctx, issue, safe, top + blockHeight * 0.32, W * 0.003);

  const caption = String(state.caption == null ? '' : state.caption).trim().toUpperCase();
  const captionSize = fitFont(ctx, caption, W - safe * 2, H * 0.112, 'Anton', 0);
  ctx.font = captionSize + 'px "Anton", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const titleY = top + blockHeight * 0.70;
  const titleFill = ctx.createLinearGradient(0, titleY - captionSize, 0, titleY + captionSize * 0.15);
  titleFill.addColorStop(0, '#fffdf5');
  titleFill.addColorStop(0.56, '#ffd166');
  titleFill.addColorStop(1, '#ff5da2');
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, W * 0.006);
  ctx.strokeStyle = 'rgba(22,8,35,0.95)';
  ctx.strokeText(caption, W / 2 + W * 0.006, titleY + H * 0.008);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(1, W * 0.0018);
  ctx.strokeText(caption, W / 2, titleY);
  ctx.fillStyle = titleFill;
  ctx.fillText(caption, W / 2, titleY);

  const subtitle = String(state.subtitle == null ? '' : state.subtitle);
  if (subtitle) {
    const subtitleSize = fitFont(ctx, subtitle, W - safe * 2, H * 0.055, 'Pacifico', 0);
    ctx.font = subtitleSize + 'px "Pacifico", "Arial Black", sans-serif';
    ctx.fillStyle = '#ff72bd';
    ctx.shadowColor = 'rgba(255,47,163,0.85)';
    ctx.shadowBlur = W * 0.018;
    ctx.fillText(subtitle, W / 2, top + blockHeight * 0.94);
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function starPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawHeat(ctx, W, H, heat) {
  const count = Math.max(0, Math.min(5, Math.round(Number(heat) || 0)));
  const radius = W * 0.014;
  const gap = radius * 2.45;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = Math.max(10, W * 0.023) + 'px "Bebas Neue", "Arial Black", sans-serif';
  ctx.fillStyle = '#fff8e8';
  ctx.fillText('HEAT', W - W * 0.06 - gap * 5 - W * 0.012, H * 0.075);
  for (let index = 0; index < 5; index += 1) {
    const cx = W - W * 0.055 - gap * (4 - index);
    starPath(ctx, cx, H * 0.075, radius, radius * 0.45);
    ctx.lineWidth = Math.max(1, W * 0.0017);
    ctx.strokeStyle = '#fff8e8';
    ctx.fillStyle = index < count ? '#ffd166' : 'rgba(255,255,255,0.04)';
    if (index < count) ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawBadge(ctx, W, H, badge) {
  const text = String(badge == null ? '' : badge).trim();
  if (!text) return;
  ctx.save();
  ctx.translate(W * 0.17, H * 0.12);
  ctx.rotate(-Math.PI / 8);
  const upper = text.toUpperCase();
  const size = fitFont(ctx, upper, W * 0.28, W * 0.034, 'Bebas Neue', W * 0.002);
  ctx.font = size + 'px "Bebas Neue", "Arial Black", sans-serif';
  const width = Math.min(W * 0.31, ctx.measureText(upper).width + W * 0.065);
  const height = size * 1.65;
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-width / 2, -height / 2, width, height);
  ctx.strokeStyle = '#fff0ad';
  ctx.lineWidth = Math.max(1, W * 0.002);
  ctx.strokeRect(-width / 2, -height / 2, width, height);
  ctx.fillStyle = '#2a1538';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const spacing = W * 0.002;
  const textWidth = ctx.measureText(upper).width + Math.max(0, upper.length - 1) * spacing;
  spacedText(ctx, upper, -textWidth / 2, size * 0.05, spacing);
  ctx.restore();
}

function drawFrameAndTexture(ctx, W, H, seed) {
  const inset = W * 0.012;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  ctx.restore();

  const random = mulberry32(seed);
  const count = Math.round(9000 * ((W * H) / (1080 * 1080)));
  ctx.save();
  for (let dot = 0; dot < count; dot += 1) {
    const x = random() * W;
    const y = random() * H;
    const alpha = 0.025 + random() * 0.075;
    const size = W < 600 ? 0.65 : 1;
    ctx.fillStyle = random() < 0.48
      ? 'rgba(255,238,214,' + alpha + ')'
      : 'rgba(15,5,28,' + alpha + ')';
    ctx.fillRect(x, y, size, size);
  }
  const vignette = ctx.createRadialGradient(
    W * 0.5, H * 0.46, Math.min(W, H) * 0.22,
    W * 0.5, H * 0.5, Math.max(W, H) * 0.76,
  );
  vignette.addColorStop(0, 'rgba(10,0,20,0)');
  vignette.addColorStop(1, 'rgba(10,0,20,0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function renderCover(ctx, W, H, state, photos) {
  const current = { ...createState(), ...(state || {}) };
  const images = Array.isArray(photos) ? photos : [];
  const layoutId = LAYOUTS.some((layout) => layout.id === current.layout) ? current.layout : 'nine';
  const rects = layoutRects(W, H, layoutId);
  const seed = Number.isFinite(Number(current.seed)) ? Number(current.seed) : 7;
  ctx.save();
  ctx.fillStyle = '#100b2e';
  ctx.fillRect(0, 0, W, H);

  if (layoutId === 'snapshots') {
    drawPhoto(ctx, images[0], { x: 0, y: 0, w: W, h: H },
      { photo: 0, dx: 0, dy: 0, scale: 1 }, current.grade, current.ink, seed);
  }

  const panelStates = Array.isArray(current.panels) ? current.panels : [];
  rects.forEach((rect, index) => {
    const entry = panelStates[index] || { photo: index, dx: 0, dy: 0, scale: 1 };
    const preferred = Math.max(0, Math.floor(Number(entry.photo) || 0));
    const photoIndex = images.length ? preferred % images.length : -1;
    const photo = photoIndex < 0 ? null : images[photoIndex];
    if (layoutId === 'snapshots') {
      const angle = [-0.075, 0.06, -0.035][index];
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(angle);
      const captionPad = index === 2 ? W * 0.065 : W * 0.009;
      ctx.fillStyle = '#fffdf6';
      ctx.fillRect(-rect.w / 2 - W * 0.009, -rect.h / 2 - W * 0.009,
        rect.w + W * 0.018, rect.h + W * 0.018 + captionPad);
      drawPhoto(ctx, photo, { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h },
        entry, current.grade, current.ink, seed + index * 31);
      ctx.strokeStyle = 'rgba(255,255,255,0.94)';
      ctx.lineWidth = Math.max(1, W * 0.0035);
      ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(20,9,35,0.88)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      if (index === 2 && String(current.subtitle || '').trim()) {
        const caption = String(current.subtitle).trim().slice(0, 40);
        const size = fitFont(ctx, caption, rect.w * 0.84, W * 0.024, 'Pacifico', 0);
        ctx.font = size + 'px "Pacifico", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#c33b78';
        ctx.fillText(caption, 0, rect.h / 2 + W * 0.009 + captionPad / 2);
      }
      ctx.restore();
    } else {
      drawPhoto(ctx, photo, rect, entry, current.grade, current.ink, seed + index * 31);
      drawKeyline(ctx, rect, W);
    }
  });

  drawTitle(ctx, W, H, current, layoutId === 'snapshots');
  drawHeat(ctx, W, H, current.heat);
  drawBadge(ctx, W, H, current.badge);
  drawFrameAndTexture(ctx, W, H, seed >>> 0);
  ctx.restore();
}
