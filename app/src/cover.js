// The cover renderer: draws a whole cover onto a 2D context at any size, from the editor's state. The same
// function paints the on-screen preview and the exported PNG, so what the maker sees is exactly what they
// share. A cover is: photos clipped into the layout's angled panels with the grade's filter, the grade's wash
// and vignette over everything, white keylines on the seams, the optional sun / palms / skyline art, and the
// caption in the shipped display font with an outline and a drop shadow.
//
// The state it reads:
//   {
//     layout: a layout id from layouts.js, grade: a grade id from grades.js,
//     panels: [{ photo: an Image or null, panX, panY: crop offsets as fractions of the panel box, zoom }],
//     caption: { lines: [up to 3 strings], subtitle, theme: a CAPTION_THEMES id, position: 'top' | 'bottom' },
//     decor: { sun, palms, skyline: booleans },
//   }

import { layoutById, panelBox } from './layouts.js';
import { gradeById } from './grades.js';
import { drawPalm, drawSkyline, drawSunDisc } from './decor.js';

export const DISPLAY_FONT = '"Neon Harbor Display", "DejaVu Sans", sans-serif';

export const CAPTION_THEMES = [
  {
    id: 'sunset',
    name: 'Sunset',
    fill: [[0, '#ffe259'], [0.55, '#ffa751'], [1, '#ff2975']],
    stroke: '#20042e',
    shadow: 'rgba(20, 0, 30, 0.55)',
    glow: null,
    subtitle: '#ffffff',
  },
  {
    id: 'chrome',
    name: 'Chrome',
    fill: [[0, '#ffffff'], [0.5, '#d7dee8'], [1, '#8fa3b8']],
    stroke: '#101018',
    shadow: 'rgba(255, 45, 140, 0.45)',
    glow: null,
    subtitle: '#ffe9f4',
  },
  {
    id: 'neon',
    name: 'Neon',
    fill: [[0, '#c8fcff'], [1, '#2fd8ff']],
    stroke: '#160a2e',
    shadow: 'rgba(10, 0, 40, 0.6)',
    glow: 'rgba(255, 47, 179, 0.8)',
    subtitle: '#aefcff',
  },
];

/** The caption theme with this id, or the first theme when the id is unknown. */
export function captionThemeById(id) {
  return CAPTION_THEMES.find((theme) => theme.id === id) ?? CAPTION_THEMES[0];
}

/** Traces a polygon as the current path. */
function tracePanel(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

/**
 * Draws one panel: the photo cover-fitted into the polygon's bounding box (scaled by the panel's zoom, shifted
 * by its pan), clipped to the polygon, with the grade's filter on. An empty panel gets a printed placeholder.
 */
function drawPanel(ctx, poly, panel, grade) {
  const box = panelBox(poly);
  ctx.save();
  tracePanel(ctx, poly);
  ctx.clip();
  const photo = panel?.photo ?? null;
  if (photo) {
    ctx.filter = grade.filter;
    const scale = Math.max(box.w / photo.naturalWidth, box.h / photo.naturalHeight) * (panel.zoom || 1);
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    // Pan is a fraction of the panel box, but it is clamped to the photo's real slack: however the maker
    // drags, the photo always covers its panel and never bares the background at an edge.
    const slackX = Math.max(0, (dw - box.w) / 2);
    const slackY = Math.max(0, (dh - box.h) / 2);
    const shiftX = Math.max(-slackX, Math.min(slackX, (panel.panX || 0) * box.w));
    const shiftY = Math.max(-slackY, Math.min(slackY, (panel.panY || 0) * box.h));
    const dx = box.x + (box.w - dw) / 2 + shiftX;
    const dy = box.y + (box.h - dh) / 2 + shiftY;
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const fill = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    fill.addColorStop(0, '#3a1454');
    fill.addColorStop(1, '#7a1042');
    ctx.fillStyle = fill;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.max(13, Math.min(box.w, box.h) * 0.09);
    ctx.font = `700 ${size}px ${DISPLAY_FONT}`;
    ctx.fillText('YOUR PHOTO', box.x + box.w / 2, box.y + box.h / 2, box.w * 0.86);
  }
  ctx.restore();
}

/** The grade's translucent wash and vignette over the whole cover, unifying panels shot in different light. */
function drawGradeWash(ctx, grade, w, h) {
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  for (const [offset, color] of grade.wash) wash.addColorStop(offset, color);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  if (grade.vignette > 0) {
    const radius = Math.max(w, h) * 0.78;
    const shade = ctx.createRadialGradient(w / 2, h / 2, radius * 0.42, w / 2, h / 2, radius);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, `rgba(0, 0, 0, ${grade.vignette * 0.55})`);
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }
}

/** White keylines on every panel seam and around the cover's edge, as wide as the classic printed covers. */
function drawKeylines(ctx, polys, w, h) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(4, Math.min(14, w * 0.0075));
  ctx.lineJoin = 'round';
  for (const poly of polys) {
    tracePanel(ctx, poly);
    ctx.stroke();
  }
}

/**
 * The caption: up to three stacked title lines in the display font, fitted to the cover's width, each with a
 * thick outline, a gradient fill and a soft shadow, plus a letter-spaced subtitle under them. The block hugs
 * the top or the foot of the cover as the state's position says.
 */
function drawCaption(ctx, caption, w, h) {
  const lines = (caption.lines ?? []).map((line) => line.trim().toUpperCase()).filter(Boolean).slice(0, 3);
  const subtitle = (caption.subtitle ?? '').trim().toUpperCase();
  if (!lines.length && !subtitle) return;
  const theme = captionThemeById(caption.theme);
  let size = h * 0.118;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => {
    ctx.font = `700 ${size}px ${DISPLAY_FONT}`;
  };
  setFont();
  if (lines.length) {
    const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
    if (widest > w * 0.92) {
      size *= (w * 0.92) / widest;
      setFont();
    }
  }
  const lineHeight = size * 0.96;
  const subSize = size * 0.3;
  const titleHeight = lines.length ? size * 0.8 + (lines.length - 1) * lineHeight : 0;
  const blockHeight = titleHeight + (subtitle ? subSize * 1.55 : 0);
  const blockTop = caption.position === 'top' ? h * 0.045 : h * 0.955 - blockHeight;
  // Title lines, top first.
  const fill = ctx.createLinearGradient(0, blockTop, 0, blockTop + Math.max(titleHeight, 1));
  for (const [offset, color] of theme.fill) fill.addColorStop(offset, color);
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  let baseline = blockTop + size * 0.8;
  for (const line of lines) {
    if (theme.glow) {
      ctx.save();
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = size * 0.4;
      ctx.fillStyle = fill;
      ctx.fillText(line, w / 2, baseline);
      ctx.restore();
    }
    ctx.shadowColor = theme.shadow;
    ctx.shadowBlur = size * 0.2;
    ctx.shadowOffsetY = size * 0.045;
    ctx.strokeStyle = theme.stroke;
    ctx.lineWidth = size * 0.17;
    ctx.strokeText(line, w / 2, baseline);
    ctx.fillStyle = fill;
    ctx.fillText(line, w / 2, baseline);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    baseline += lineHeight;
  }
  if (subtitle) {
    ctx.font = `700 ${subSize}px ${DISPLAY_FONT}`;
    try {
      ctx.letterSpacing = `${Math.round(subSize * 0.3)}px`;
    } catch {
      // Older engines have no letterSpacing; the subtitle still reads fine without it.
    }
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.3;
    ctx.shadowOffsetY = subSize * 0.08;
    ctx.fillStyle = theme.subtitle;
    ctx.fillText(subtitle, w / 2, blockTop + titleHeight + subSize * 1.35, w * 0.94);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    try {
      ctx.letterSpacing = '0px';
    } catch {
      // Nothing to reset where the property is unsupported.
    }
  }
}

/** Draws the whole cover described by `state` onto `ctx` at `w` by `h` pixels. */
export function drawCover(ctx, state, w, h) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);
  const polys = layout.panels(w, h);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  polys.forEach((poly, i) => drawPanel(ctx, poly, state.panels[i], grade));
  drawGradeWash(ctx, grade, w, h);
  drawKeylines(ctx, polys, w, h);
  if (state.decor.sun) {
    // The disc sits on the cover's vertical centre line, opposite the caption, so it crowns the composition
    // instead of landing on a face in a corner panel.
    const r = Math.min(w, h) * 0.15;
    const cy = state.caption.position === 'top' ? h * 0.79 : h * 0.17;
    drawSunDisc(ctx, w * 0.5, cy, r);
  }
  if (state.decor.skyline) drawSkyline(ctx, w, h, h * 0.085);
  if (state.decor.palms) {
    drawPalm(ctx, w * 0.045, h * 1.01, h * 0.36, 1);
    drawPalm(ctx, w * 0.955, h * 1.01, h * 0.4, -1);
  }
  drawCaption(ctx, state.caption, w, h);
}
