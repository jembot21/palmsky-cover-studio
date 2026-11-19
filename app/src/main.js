import { LAYOUTS, GRADES, layoutRects, createState, renderCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
let state = createState();
const photos = [null, null, null];
let selectedPanel = 0;
let aspect = { w: 1080, h: 1350 };
let exactCanvas = false;
let drag = null;
const undoStack = [];
const redoStack = [];
const clone = (value) => JSON.parse(JSON.stringify(value));
let committedState;
let shotSlot = 0;
const loadVersions = [0, 0, 0];
// History stores small image keys; decoded images remain local and reusable.
const photoLibrary = new Map();
let photoSerial = 0;
const query = new URLSearchParams(location.search);
const isShot = query.has('shot');
let stagingShot = isShot;

function loadedPhotoIndices() {
  return photos.flatMap((photo, index) => photo ? [index] : []);
}

function rememberPhoto(slot, image) {
  const key = ++photoSerial;
  photoLibrary.set(key, image);
  if (!state.photoSlots) state.photoSlots = [null, null, null];
  state.photoSlots[slot] = key;
  photos[slot] = image;
}

function restorePhotos() {
  if (!state.photoSlots) return;
  state.photoSlots.forEach((key, slot) => {
    photos[slot] = photoLibrary.get(key) || null;
  });
}

function ensurePanels() {
  const count = layoutRects(canvas.width, canvas.height, state.layout).length;
  const loaded = loadedPhotoIndices();
  if (!Array.isArray(state.panels)) state.panels = [];
  for (let i = 0; i < count; i += 1) {
    state.panels[i] = {
      photo: loaded.length ? loaded[i % loaded.length] : 0,
      dx: 0, dy: 0, scale: 1, ...state.panels[i],
    };
  }
  selectedPanel = Math.max(0, Math.min(selectedPanel, count - 1));
  return count;
}

function syncPanelControls() {
  const count = ensurePanels();
  const panel = state.panels[selectedPanel];
  $('panelInfo').textContent = (selectedPanel + 1) + ' / ' + count + ' · Slot ' + (panel.photo + 1);
  $('zoom').value = panel.scale;
  $('zoom').setAttribute('aria-valuetext', Number(panel.scale).toFixed(2) + ' times');
  $('swapPhoto').disabled = loadedPhotoIndices().length < 2;
}

function syncHistory() {
  $('undo').disabled = !undoStack.length;
  $('redo').disabled = !redoStack.length;
}

function syncControls() {
  for (const key of ['layout', 'grade', 'caption', 'subtitle', 'heat', 'badge']) {
    $(key).value = state[key];
  }
  $('ink').checked = state.ink;
  $('aspect').value = aspect.w + 'x' + aspect.h;
  syncPanelControls();
  syncAspectButtons();
  syncHistory();
}

function syncAspectButtons() {
  document.querySelectorAll('.exportBtn').forEach((button) => {
    const selected = Number(button.dataset.w) === aspect.w && Number(button.dataset.h) === aspect.h;
    button.setAttribute('aria-pressed', String(selected));
  });
}

function commitState() {
  ensurePanels();
  const next = clone(state);
  if (committedState && JSON.stringify(next) !== JSON.stringify(committedState)) {
    undoStack.push(clone(committedState));
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }
  committedState = next;
  syncHistory();
}

function render() {
  const ratio = exactCanvas ? 1 : 900 / Math.max(aspect.w, aspect.h);
  const w = Math.round(aspect.w * ratio);
  const h = Math.round(aspect.h * ratio);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ensurePanels();
  renderCover(ctx, w, h, state, photos);
  const availableHeight = 'min(76vh, calc(100dvh - 200px))';
  canvas.parentElement.style.setProperty('--canvas-display-width',
    'calc(' + availableHeight + ' * ' + (w / h) + ')');
  $('previewSize').textContent = aspect.w + ' × ' + aspect.h + ' / PREVIEW';
  syncAspectButtons();
  syncPanelControls();
}

function setAspect(w, h, exact = false) {
  aspect = { w, h };
  exactCanvas = exact;
  $('aspect').value = w + 'x' + h;
  render();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load this image.'));
    image.src = url;
  });
}

async function loadSamplePhoto(name, slot = Number($('slot').value), record = true) {
  if (!/^[a-z0-9-]+$/i.test(name)) throw new Error('Unknown sample name.');
  const version = ++loadVersions[slot];
  const image = await loadImage('./samples/' + name + '.jpg');
  if (version !== loadVersions[slot]) return image;
  rememberPhoto(slot, image);
  if (record) commitState();
  render();
  return image;
}

async function loadSample(name) {
  // Reserve the slot before awaiting: runShot loads its samples concurrently.
  const slot = stagingShot ? shotSlot++ % photos.length : Number($('slot').value);
  return loadSamplePhoto(name, slot, !stagingShot);
}

async function onPhotoChange(event) {
  const input = event.currentTarget;
  const file = input.files[0];
  if (!file) return;
  const slot = Number(input.dataset.slot);
  const version = ++loadVersions[slot];
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (version !== loadVersions[slot]) return;
    rememberPhoto(slot, image);
    $('slot').value = slot;
    commitState();
    render();
    $('status').textContent = 'Photo ' + (slot + 1) + ' loaded. Ready to create.';
  } catch {
    $('status').textContent = 'Could not open that photo. Try a JPG, PNG or WebP.';
  } finally {
    URL.revokeObjectURL(url);
    input.value = '';
  }
}

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height,
  };
}

function hitPanel(point) {
  const rects = layoutRects(canvas.width, canvas.height, state.layout);
  // Later snapshot panels paint over earlier panels.
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w &&
        point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

function onCanvasPointerDown(event) {
  if (event.button !== 0 || drag) return;
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (hit < 0) return;
  commitState();
  selectedPanel = hit;
  syncPanelControls();
  const panel = state.panels[hit];
  drag = { id: event.pointerId, point, dx: panel.dx, dy: panel.dy,
    rect: layoutRects(canvas.width, canvas.height, state.layout)[hit] };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
}

function onCanvasPointerMove(event) {
  if (!drag || drag.id !== event.pointerId) return;
  const point = canvasPoint(event);
  const clamp = (value) => Math.max(-1, Math.min(1, value));
  const panel = state.panels[selectedPanel];
  panel.dx = clamp(drag.dx - 2 * (point.x - drag.point.x) / drag.rect.w);
  panel.dy = clamp(drag.dy - 2 * (point.y - drag.point.y) / drag.rect.h);
  render();
}

function finishPanelDrag(event) {
  if (!drag || drag.id !== event.pointerId) return;
  if (event.type === 'pointercancel') {
    Object.assign(state.panels[selectedPanel], { dx: drag.dx, dy: drag.dy });
  } else {
    commitState();
  }
  drag = null;
  canvas.classList.remove('dragging');
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  render();
}

function restoreHistory(from, to) {
  commitState();
  if (!from.length) return;
  to.push(clone(state));
  if (to.length > 50) to.shift();
  state = from.pop();
  restorePhotos();
  committedState = clone(state);
  syncControls();
  render();
}

async function exportPng(w, h) {
  commitState();
  setAspect(w, h);
  const buttons = [...document.querySelectorAll('.exportBtn')];
  buttons.forEach((button) => { button.disabled = true; });
  $('status').textContent = 'Rendering ' + w + '×' + h + ' PNG…';
  const snapshot = clone(state);
  const images = photos.slice();
  try {
    await document.fonts.ready;
    const output = document.createElement('canvas');
    output.width = w;
    output.height = h;
    renderCover(output.getContext('2d'), w, h, snapshot, images);
    const blob = await new Promise((resolve, reject) => {
      output.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed.')), 'image/png');
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'palmsky-cover-' + w + 'x' + h + '.png';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    $('status').textContent = 'Exported ' + w + '×' + h + ' PNG';
  } catch {
    $('status').textContent = 'Export failed. Please try again.';
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function bindControls() {
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener('change', onPhotoChange);
  });
  document.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await loadSample(button.dataset.sample);
        $('status').textContent = 'Sample loaded into slot ' + (Number($('slot').value) + 1) + '.';
      } catch {
        $('status').textContent = 'That sample could not be loaded.';
      }
    });
  });
  for (const key of ['caption', 'subtitle', 'badge']) {
    $(key).addEventListener('input', () => { state[key] = $(key).value; render(); });
    $(key).addEventListener('change', commitState);
  }
  for (const key of ['layout', 'grade', 'heat', 'ink']) {
    $(key).addEventListener('change', () => {
      state[key] = key === 'ink' ? $(key).checked : key === 'heat' ? Number($(key).value) : $(key).value;
      commitState();
      render();
    });
  }
  $('zoom').addEventListener('input', () => {
    state.panels[selectedPanel].scale = Number($('zoom').value);
    render();
  });
  $('zoom').addEventListener('change', commitState);
  $('swapPhoto').addEventListener('click', () => {
    const loaded = loadedPhotoIndices();
    if (!loaded.length) return;
    const panel = state.panels[selectedPanel];
    panel.photo = loaded[(loaded.indexOf(panel.photo) + 1) % loaded.length];
    commitState();
    render();
  });
  $('resetPanel').addEventListener('click', () => {
    const loaded = loadedPhotoIndices();
    state.panels[selectedPanel] = {
      photo: loaded.length ? loaded[selectedPanel % loaded.length] : 0,
      dx: 0, dy: 0, scale: 1,
    };
    commitState();
    render();
  });
  $('aspect').addEventListener('change', () => {
    const [w, h] = $('aspect').value.split('x').map(Number);
    setAspect(w, h);
  });
  $('undo').addEventListener('click', () => restoreHistory(undoStack, redoStack));
  $('redo').addEventListener('click', () => restoreHistory(redoStack, undoStack));
  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement &&
        (target.isContentEditable || target.matches('input, textarea, select'))) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'z') {
      event.preventDefault();
      restoreHistory(event.shiftKey ? redoStack : undoStack, event.shiftKey ? undoStack : redoStack);
    } else if (key === 'y' && !event.shiftKey) {
      event.preventDefault();
      restoreHistory(redoStack, undoStack);
    }
  });
  document.querySelectorAll('.exportBtn').forEach((button) => {
    button.addEventListener('click', () => exportPng(Number(button.dataset.w), Number(button.dataset.h)));
  });
  canvas.addEventListener('pointerdown', onCanvasPointerDown);
  canvas.addEventListener('pointermove', onCanvasPointerMove);
  canvas.addEventListener('pointerup', finishPanelDrag);
  canvas.addEventListener('pointercancel', finishPanelDrag);
}

async function bootEditor() {
  for (const [id, values] of [['layout', LAYOUTS], ['grade', GRADES]]) {
    if (!$(id).options.length) {
      values.forEach(({ id: value, name }) => $(id).add(new Option(name, value)));
    }
  }
  syncControls();
  // Canvas-only fonts must be requested explicitly before fonts.ready settles.
  await Promise.all([
    document.fonts.load('16px Anton'),
    document.fonts.load('16px Pacifico'),
    document.fonts.load('16px "Bebas Neue"'),
  ]);
  await document.fonts.ready;
  if (isShot) {
    const api = {
      loadSample,
      setState(partial) {
        const { photos: images, ...settings } = partial;
        if (Array.isArray(images)) {
          for (let slot = 0; slot < photos.length; slot += 1) {
            rememberPhoto(slot, images[slot] || null);
          }
          state.panels = [];
        }
        Object.assign(state, settings);
        syncControls();
      },
      render,
      ready() {},
      setCanvas(w, h) { setAspect(w, h, true); },
    };
    await runShot(query.get('shot'), query, api);
    stagingShot = false;
  } else {
    await Promise.allSettled([
      loadSamplePhoto('boulevard', 0, false),
      loadSamplePhoto('pier', 1, false),
      loadSamplePhoto('extra-1', 2, false),
    ]);
    state.panels = [];
    render();
    syncControls();
    $('status').textContent = 'Studio ready. Your photos stay on this device.';
  }
  committedState = clone(state);
  bindControls();
}

bootEditor().catch(() => {
  $('status').textContent = 'The studio could not start. Reload to try again.';
});
