// Original decorative elements drawn on the canvas over the panels: a sliced retro sun disc, palm silhouettes
// and a city skyline strip. All are plain canvas paths in a near-black violet ink, so they sit over any photo
// like the printed art on a poster. The skyline uses a fixed-seed generator, so every render of the same cover
// is identical.

const INK = 'rgba(10, 4, 24, 0.88)';

/** A small deterministic random generator (mulberry32), so decorative details never change between renders. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A retro sun disc: a warm gradient circle whose lower half is cut by widening horizontal gaps. The disc is
 * composed on its own canvas first, so the gaps punch through to whatever the cover already shows.
 */
export function drawSunDisc(ctx, cx, cy, r) {
  const disc = document.createElement('canvas');
  disc.width = Math.ceil(r * 2);
  disc.height = Math.ceil(r * 2);
  const d = disc.getContext('2d');
  const gradient = d.createLinearGradient(0, 0, 0, r * 2);
  gradient.addColorStop(0, '#ffe259');
  gradient.addColorStop(0.55, '#ffa751');
  gradient.addColorStop(1, '#ff2975');
  d.fillStyle = gradient;
  d.beginPath();
  d.arc(r, r, r, 0, Math.PI * 2);
  d.fill();
  d.globalCompositeOperation = 'destination-out';
  let y = r * 1.08;
  let gap = r * 0.03;
  while (y < r * 2) {
    d.fillRect(0, y, r * 2, gap);
    y += gap + r * 0.16;
    gap *= 1.45;
  }
  ctx.drawImage(disc, cx - r, cy - r);
}

/**
 * A palm silhouette: a tapered curved trunk rising from (x, y) to a crown s pixels above it, with six fronds
 * fanning out and drooping. flip leans the tree the other way.
 */
export function drawPalm(ctx, x, y, s, flip = 1) {
  const lean = 0.24 * s * flip;
  const topX = x + lean;
  const topY = y - s;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  // Trunk: three strokes of shrinking width along the lean, reading as one tapered curve.
  for (const [from, to, width] of [[0, 0.45, 0.075], [0.4, 0.75, 0.05], [0.7, 1, 0.028]]) {
    ctx.beginPath();
    ctx.lineWidth = width * s;
    const bend = (t) => [x + lean * t * t, y - s * t];
    const [x0, y0] = bend(from);
    const [xc, yc] = bend((from + to) / 2);
    const [x1, y1] = bend(to);
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(xc, yc, x1, y1);
    ctx.stroke();
  }
  // Fronds: quadratic strokes fanning from the crown, each tip drooping below its control point.
  const fronds = [
    [-168, 0.62], [-138, 0.78], [-104, 0.86], [-70, 0.84], [-38, 0.74], [-12, 0.58],
  ];
  for (const [degrees, length] of fronds) {
    const a = (degrees * Math.PI) / 180;
    const reach = length * s;
    const endX = topX + Math.cos(a) * reach * flip;
    const endY = topY + Math.sin(a) * reach * 0.5 + length * s * 0.34;
    const midX = topX + Math.cos(a) * reach * 0.5 * flip;
    const midY = topY + Math.sin(a) * reach * 0.62;
    ctx.beginPath();
    ctx.lineWidth = 0.032 * s;
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }
  // A pair of coconuts at the crown.
  ctx.beginPath();
  ctx.arc(topX - 0.03 * s * flip, topY + 0.03 * s, 0.035 * s, 0, Math.PI * 2);
  ctx.arc(topX + 0.045 * s * flip, topY + 0.045 * s, 0.03 * s, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A skyline strip standing on the baseline y and rising up to maxHeight: seeded buildings in ink with a few
 * warm lit windows. Drawn along the foot of the cover.
 */
export function drawSkyline(ctx, w, baselineY, maxHeight) {
  const rand = seededRandom(20261120);
  ctx.fillStyle = INK;
  let x = -8;
  const tops = [];
  while (x < w) {
    const bw = 0.03 * w + rand() * 0.05 * w;
    const bh = maxHeight * (0.35 + rand() * 0.65);
    ctx.fillRect(x, baselineY - bh, bw, bh);
    if (rand() < 0.45) {
      const aw = bw * 0.34;
      ctx.fillRect(x + (bw - aw) / 2, baselineY - bh - maxHeight * 0.1, aw, maxHeight * 0.1);
    }
    tops.push([x, baselineY - bh, bw, bh]);
    x += bw + 2 + rand() * 6;
  }
  // Lit windows, kept sparse so the strip stays a silhouette.
  ctx.fillStyle = 'rgba(255, 196, 92, 0.85)';
  for (const [bx, by, bw, bh] of tops) {
    const count = Math.floor(rand() * 5);
    for (let i = 0; i < count; i++) {
      const wx = bx + 4 + rand() * Math.max(2, bw - 10);
      const wy = by + 5 + rand() * Math.max(2, bh - 12);
      ctx.fillRect(wx, wy, 3.2, 4.4);
    }
  }
}
