// Neon Harbor's editor: wires the page to the renderer in cover.js. Photos are read from the person's own
// machine (file picker or drag and drop) and never leave it; the samples in app/samples/ are the starting
// pictures. The preview canvas is kept at the chosen export size, so the PNG the Export button saves is the
// very canvas on screen. A ?shot= query (shots.js) sets up one fixed scene for the maker's screenshots.

import { drawCover, CAPTION_THEMES, captionThemeById } from './cover.js';
import { LAYOUTS, layoutById, panelBox, pointInPanel } from './layouts.js';
import { GRADES } from './grades.js';
import { parseShotQuery, SHOT_SIZES } from './shots.js';

const MAX_PANELS = 6;
const EXPORT_SIZES = [
  { id: 'square', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: 'landscape', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
];
// When one photo fills several panels, these crops keep the panels from looking like copies of each other.
const FILL_CROPS = [
  { panX: 0, panY: 0.12, zoom: 1 },
  { panX: 0.08, panY: -0.04, zoom: 1.2 },
  { panX: -0.07, panY: 0.05, zoom: 1.1 },
  { panX: 0.05, panY: 0.07, zoom: 1.3 },
  { panX: -0.05, panY: -0.06, zoom: 1.15 },
  { panX: 0, panY: 0.09, zoom: 1.25 },
];

const state = {
  layout: 'quad',
  grade: 'vice',
  panels: Array.from({ length: MAX_PANELS }, () => ({ photo: null, label: '', panX: 0, panY: 0, zoom: 1 })),
  caption: { lines: ['NEON', 'HARBOR'], subtitle: 'One night in the city', theme: 'sunset', position: 'bottom' },
  decor: { sun: true, palms: true, skyline: false },
};
let exportSize = EXPORT_SIZES[1];
let selectedPanel = 0;
const photoTray = [];

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const status = $('status');

/** Loads an image from a URL, resolving once it can be drawn. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** The polygons of the current layout at the canvas's size. */
function currentPolygons() {
  return layoutById(state.layout).panels(canvas.width, canvas.height);
}

/** Repaints the preview canvas (which is also the export canvas). */
function redraw() {
  if (canvas.width !== exportSize.w || canvas.height !== exportSize.h) {
    canvas.width = exportSize.w;
    canvas.height = exportSize.h;
  }
  drawCover(ctx, state, canvas.width, canvas.height);
}

/** Puts a tray photo into a panel, with a fresh crop. */
function assignPhoto(entry, panelIndex, crop = FILL_CROPS[0]) {
  const panel = state.panels[panelIndex];
  panel.photo = entry.img;
  panel.label = entry.label;
  panel.panX = crop.panX;
  panel.panY = crop.panY;
  panel.zoom = crop.zoom;
}

/** Puts one photo in every panel of the current layout, each with its own crop from FILL_CROPS. */
function spreadPhoto(entry) {
  const count = layoutById(state.layout).panels(100, 100).length;
  for (let i = 0; i < count; i++) assignPhoto(entry, i, FILL_CROPS[i % FILL_CROPS.length]);
}

/** Adds a loaded image to the tray and renders its thumbnail button. */
function addToTray(img, label, url) {
  const entry = { img, label, url };
  photoTray.push(entry);
  const button = document.createElement('button');
  button.type = 'button';
  button.title = `${label} — put it in the selected panel`;
  const thumb = document.createElement('img');
  thumb.src = url;
  thumb.alt = label;
  button.appendChild(thumb);
  button.addEventListener('click', () => {
    assignPhoto(entry, selectedPanel);
    const count = currentPolygons().length;
    const empty = state.panels.findIndex((panel, i) => i < count && !panel.photo);
    if (empty >= 0) selectedPanel = empty;
    renderPanelList();
    syncZoom();
    redraw();
  });
  $('photo-tray').appendChild(button);
  return entry;
}

/** Loads one of the bundled samples into the tray. */
async function loadSample(name) {
  const url = `samples/${name}.jpg`;
  const img = await loadImage(url);
  return addToTray(img, name, url);
}

/** Rebuilds the panel list for the current layout, marking the selected panel and each panel's photo. */
function renderPanelList() {
  const list = $('panel-list');
  list.textContent = '';
  const count = currentPolygons().length;
  for (let i = 0; i < count; i++) {
    const panel = state.panels[i];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = i === selectedPanel ? 'selected' : '';
    const name = document.createElement('span');
    name.textContent = `Panel ${i + 1}`;
    const fill = document.createElement('span');
    fill.className = 'fill';
    fill.textContent = panel.photo ? panel.label : 'empty';
    button.append(name, fill);
    button.addEventListener('click', () => {
      selectedPanel = i;
      renderPanelList();
      syncZoom();
    });
    list.appendChild(button);
  }
}

/** Points the zoom slider at the selected panel's zoom. */
function syncZoom() {
  $('panel-zoom').value = state.panels[selectedPanel].zoom;
}

/** Builds a radio-style picker: one button per option, the current one marked active. */
function buildPicker(element, options, currentId, onPick) {
  element.textContent = '';
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.label ?? option.name;
    button.className = option.id === currentId ? 'active' : '';
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', option.id === currentId ? 'true' : 'false');
    button.addEventListener('click', () => onPick(option));
    element.appendChild(button);
  }
}

function buildPickers() {
  buildPicker($('layout-picker'), LAYOUTS, state.layout, (option) => {
    state.layout = option.id;
    selectedPanel = Math.min(selectedPanel, currentPolygons().length - 1);
    buildPickers();
    renderPanelList();
    redraw();
  });
  buildPicker($('grade-picker'), GRADES, state.grade, (option) => {
    state.grade = option.id;
    buildPickers();
    redraw();
  });
  buildPicker($('theme-picker'), CAPTION_THEMES, state.caption.theme, (option) => {
    state.caption.theme = option.id;
    buildPickers();
    redraw();
  });
  buildPicker($('size-picker'), EXPORT_SIZES, exportSize.id, (option) => {
    exportSize = option;
    buildPickers();
    redraw();
  });
  $('position-top').className = state.caption.position === 'top' ? 'chip active' : 'chip';
  $('position-bottom').className = state.caption.position === 'bottom' ? 'chip active' : 'chip';
}

/** Reads the caption fields into the state. */
function readCaption() {
  state.caption.lines = $('caption-lines').value.split('\n');
  state.caption.subtitle = $('caption-subtitle').value;
}

/** Adds user files (from the picker or a drop) to the tray and into the first panels that need a photo. */
async function takeFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const entry = addToTray(img, file.name.replace(/\.[^.]+$/, ''), url);
      const count = currentPolygons().length;
      const target = state.panels.findIndex((panel, i) => i < count && !panel.photo);
      assignPhoto(entry, target >= 0 ? target : selectedPanel);
    } catch {
      status.textContent = `Could not read ${file.name}`;
    }
  }
  renderPanelList();
  redraw();
}

function wireControls() {
  $('photo-files').addEventListener('change', (event) => takeFiles([...event.target.files]));
  const drop = $('drop-zone');
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('dragging');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('dragging');
    takeFiles([...event.dataTransfer.files]);
  });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      const entry = await loadSample(button.dataset.sample);
      assignPhoto(entry, selectedPanel);
      renderPanelList();
      redraw();
    });
  });
  $('panel-zoom').addEventListener('input', (event) => {
    state.panels[selectedPanel].zoom = Number(event.target.value);
    redraw();
  });
  $('one-photo-everywhere').addEventListener('click', () => {
    const entry = photoTray.find((candidate) => candidate.img === state.panels[selectedPanel].photo) ?? photoTray[0];
    if (!entry) return;
    spreadPhoto(entry);
    renderPanelList();
    redraw();
  });
  $('reset-crop').addEventListener('click', () => {
    const panel = state.panels[selectedPanel];
    panel.panX = 0;
    panel.panY = 0;
    panel.zoom = 1;
    syncZoom();
    redraw();
  });
  for (const key of ['sun', 'palms', 'skyline']) {
    const box = $(`decor-${key}`);
    box.checked = state.decor[key];
    box.addEventListener('change', () => {
      state.decor[key] = box.checked;
      redraw();
    });
  }
  $('caption-lines').addEventListener('input', () => {
    readCaption();
    redraw();
  });
  $('caption-subtitle').addEventListener('input', () => {
    readCaption();
    redraw();
  });
  $('position-top').addEventListener('click', () => {
    state.caption.position = 'top';
    buildPickers();
    redraw();
  });
  $('position-bottom').addEventListener('click', () => {
    state.caption.position = 'bottom';
    buildPickers();
    redraw();
  });
  $('export-png').addEventListener('click', async () => {
    await document.fonts.load('700 80px "Neon Harbor Display"');
    redraw();
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-harbor-${exportSize.w}x${exportSize.h}.png`;
      a.click();
      status.textContent = `Saved ${a.download}`;
    }, 'image/png');
  });
  // Dragging pans the photo under the pointer; the wheel zooms it.
  let drag = null;
  const canvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height),
    ];
  };
  canvas.addEventListener('pointerdown', (event) => {
    const [x, y] = canvasPoint(event);
    const index = currentPolygons().findIndex((poly) => pointInPanel(poly, x, y));
    if (index < 0) return;
    selectedPanel = index;
    renderPanelList();
    syncZoom();
    drag = { panel: index, x, y };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const [x, y] = canvasPoint(event);
    const box = panelBox(currentPolygons()[drag.panel]);
    const panel = state.panels[drag.panel];
    panel.panX = Math.max(-0.45, Math.min(0.45, panel.panX + (x - drag.x) / box.w));
    panel.panY = Math.max(-0.45, Math.min(0.45, panel.panY + (y - drag.y) / box.h));
    drag.x = x;
    drag.y = y;
    redraw();
  });
  canvas.addEventListener('pointerup', () => {
    drag = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const [x, y] = canvasPoint(event);
    const index = currentPolygons().findIndex((poly) => pointInPanel(poly, x, y));
    if (index < 0) return;
    const panel = state.panels[index];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (event.deltaY < 0 ? 1.07 : 0.93)));
    if (index === selectedPanel) syncZoom();
    redraw();
  }, { passive: false });
}

/** Sets up the fixed scene a ?shot= query names, for the maker's screenshots. */
async function applyShot(shot) {
  state.layout = shot.layout;
  state.grade = shot.grade;
  state.caption = {
    lines: shot.captionLines,
    subtitle: shot.subtitle,
    theme: shot.theme,
    position: shot.position,
  };
  state.decor = shot.decor;
  if (shot.size) {
    exportSize = { id: 'shot', label: 'Shot', w: shot.size[0], h: shot.size[1] };
  } else if (shot.mode === 'cover') {
    exportSize = { id: 'square', label: 'Square', ...{ w: SHOT_SIZES.square[0], h: SHOT_SIZES.square[1] } };
  }
  if (shot.mode === 'cover') document.body.classList.add('shot-cover');
  const entries = [];
  for (const name of shot.photos) entries.push(await loadSample(name));
  const count = currentPolygons().length;
  if (entries.length === 1) {
    spreadPhoto(entries[0]);
  } else {
    for (let i = 0; i < count; i++) assignPhoto(entries[i % entries.length], i, FILL_CROPS[i % FILL_CROPS.length]);
  }
  $('caption-lines').value = state.caption.lines.join('\n');
  $('caption-subtitle').value = state.caption.subtitle;
  for (const key of ['sun', 'palms', 'skyline']) $(`decor-${key}`).checked = state.decor[key];
}

/** The editor's opening scene: the three samples in a Classic Quad, Boulevard in the hero corner. */
async function loadDefaults() {
  const boulevard = await loadSample('boulevard');
  const pier = await loadSample('pier');
  const harbor = await loadSample('harbor');
  assignPhoto(boulevard, 0);
  assignPhoto(pier, 1);
  assignPhoto(harbor, 2);
  assignPhoto(boulevard, 3, { panX: -0.06, panY: 0.04, zoom: 1.35 });
}

const shot = parseShotQuery(new URLSearchParams(location.search));
wireControls();
buildPickers();
await document.fonts.load('700 80px "Neon Harbor Display"');
if (shot) {
  await applyShot(shot);
} else {
  await loadDefaults();
}
buildPickers();
renderPanelList();
syncZoom();
redraw();
if (shot) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
