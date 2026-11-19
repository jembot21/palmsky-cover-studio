import {
    LAYOUTS as compositions, GRADES as palettes, layoutRects as measurePanels,
    createState as freshDesign, renderCover as paintCover,
} from './cover.js';
import { runShot as captureCover } from './shots.js';

const byId = (token) => document.getElementById(token);
const surface = byId('coverCanvas');
const brush = surface.getContext('2d');
const selectors = {
    layout: 'layoutSelect', grade: 'gradeSelect', caption: 'captionInput',
    subtitle: 'subtitleInput', heat: 'heatInput', badge: 'badgeInput',
};
const exportActions = () => document.querySelectorAll('.export-action');
const notify = (message) => { byId('statusNote').textContent = message; };
const copyDesign = (design) => JSON.parse(JSON.stringify(design));
const ratioLabel = ({ w: width, h: height }) => width + 'x' + height;
const activeRectangles = () => measurePanels(surface.width, surface.height, designNow.layout);
const currentSlot = () => Number(byId('slotSelect').value);

let designNow = freshDesign();
let dimensions = { w: 1080, h: 1350 };
let fullResolution = false;
let focusIndex = 0;
let panGesture = null;
let savedDesign;
const past = [];
const future = [];

// Snapshots keep references by number so the decoded bitmaps can be shared.
const displayedImages = [null, null, null];
const decodedBank = new Map();
const requestEpochs = [0, 0, 0];
let nextImageNumber = 0;
const parameters = new URLSearchParams(location.search);
const captureMode = parameters.has('shot');
let reservingCaptureSlots = captureMode;
let captureCursor = 0;

function occupiedSlots() {
    const occupied = [];
    displayedImages.forEach((bitmap, position) => {
        if (bitmap) occupied.push(position);
    });
    return occupied;
}

function baseCrop(position, occupied) {
    return {
        photo: occupied.length === 0 ? 0 : occupied[position % occupied.length],
        dx: 0,
        dy: 0,
        scale: 1,
    };
}

function prepareCrops() {
    const total = activeRectangles().length;
    const occupied = occupiedSlots();
    if (!Array.isArray(designNow.panels)) designNow.panels = [];
    for (let position = 0; position < total; ++position) {
        designNow.panels[position] = {
            ...baseCrop(position, occupied),
            ...designNow.panels[position],
        };
    }
    focusIndex = Math.max(0, Math.min(total - 1, focusIndex));
    return total;
}

function refreshCropFields() {
    const total = prepareCrops();
    const crop = designNow.panels[focusIndex];
    const slider = byId('zoomSlider');
    byId('panelDetails').textContent =
        [focusIndex + 1, total].join(' / ') + ' · Slot ' + (crop.photo + 1);
    slider.value = crop.scale;
    slider.setAttribute('aria-valuetext', Number(crop.scale).toFixed(2) + ' times');
    byId('swapButton').disabled = occupiedSlots().length < 2;
}

function highlightSize() {
    for (const action of exportActions()) {
        const { w: width, h: height } = action.dataset;
        const matchesPreview = dimensions.w === Number(width) && dimensions.h === Number(height);
        action.setAttribute('aria-pressed', String(matchesPreview));
    }
}

function refreshHistoryActions() {
    byId('undoButton').disabled = past.length === 0;
    byId('redoButton').disabled = future.length === 0;
}

function refreshEditorFields() {
    Object.entries(selectors).forEach(([property, token]) => {
        byId(token).value = designNow[property];
    });
    byId('inkToggle').checked = designNow.ink;
    byId('ratioSelect').value = ratioLabel(dimensions);
    refreshCropFields();
    highlightSize();
    refreshHistoryActions();
}

function redrawPreview() {
    const shrink = fullResolution ? 1 : 900 / Math.max(dimensions.w, dimensions.h);
    const pixelWidth = Math.round(dimensions.w * shrink);
    const pixelHeight = Math.round(dimensions.h * shrink);
    if (pixelWidth !== surface.width) surface.width = pixelWidth;
    if (pixelHeight !== surface.height) surface.height = pixelHeight;
    prepareCrops();
    paintCover(brush, pixelWidth, pixelHeight, designNow, displayedImages);
    surface.parentElement.style.setProperty(
        '--preview-span', 'calc(min(76vh, calc(100dvh - 200px)) * ' + pixelWidth / pixelHeight + ')',
    );
    byId('previewNote').textContent = [dimensions.w, dimensions.h].join(' × ') + ' / PREVIEW';
    highlightSize();
    refreshCropFields();
}

function chooseDimensions(width, height, nativePixels = false) {
    dimensions = { w: width, h: height };
    fullResolution = nativePixels;
    byId('ratioSelect').value = ratioLabel(dimensions);
    redrawPreview();
}

function stashBitmap(position, bitmap) {
    const reference = ++nextImageNumber;
    decodedBank.set(reference, bitmap);
    if (!designNow.photoSlots) designNow.photoSlots = [null, null, null];
    designNow.photoSlots[position] = reference;
    displayedImages[position] = bitmap;
}

function appendSnapshot(trail, design) {
    trail.push(copyDesign(design));
    if (trail.length > 50) trail.shift();
}

function saveCheckpoint() {
    prepareCrops();
    const candidate = copyDesign(designNow);
    if (savedDesign && JSON.stringify(savedDesign) !== JSON.stringify(candidate)) {
        appendSnapshot(past, savedDesign);
        future.length = 0;
    }
    savedDesign = candidate;
    refreshHistoryActions();
}

function travelHistory(source, destination) {
    saveCheckpoint();
    if (source.length === 0) return;
    appendSnapshot(destination, designNow);
    designNow = source.pop();
    designNow.photoSlots?.forEach((reference, position) => {
        displayedImages[position] = decodedBank.get(reference) || null;
    });
    savedDesign = copyDesign(designNow);
    refreshEditorFields();
    redrawPreview();
}

function navigateByKey(keypress) {
    const origin = keypress.target;
    if (origin instanceof HTMLElement &&
        (origin.isContentEditable || origin.matches('input, textarea, select'))) return;
    if (keypress.altKey || (!keypress.ctrlKey && !keypress.metaKey)) return;
    const letter = keypress.key.toLowerCase();
    if (letter === 'z' && !keypress.shiftKey) {
        keypress.preventDefault();
        travelHistory(past, future);
    } else if (letter === 'z' || (letter === 'y' && !keypress.shiftKey)) {
        keypress.preventDefault();
        travelHistory(future, past);
    }
}

function decodeBitmap(sourceUrl) {
    return new Promise((accept, fail) => {
        const bitmap = new Image();
        bitmap.onload = () => accept(bitmap);
        bitmap.onerror = () => fail(new Error('Could not load this image.'));
        bitmap.src = sourceUrl;
    });
}

async function installSample(sampleName, position = currentSlot(), withHistory = true) {
    if (!/^[a-z0-9-]+$/i.test(sampleName)) throw new Error('Unknown sample name.');
    const requestNumber = ++requestEpochs[position];
    const bitmap = await decodeBitmap('./samples/' + sampleName + '.jpg');
    if (requestEpochs[position] === requestNumber) {
        stashBitmap(position, bitmap);
        if (withHistory) saveCheckpoint();
        redrawPreview();
    }
    return bitmap;
}

async function selectSample(sampleName) {
    // Assign capture slots in request order even when images decode out of order.
    const position = reservingCaptureSlots ? captureCursor++ % displayedImages.length : currentSlot();
    return installSample(sampleName, position, !reservingCaptureSlots);
}

async function importLocalPhoto(change) {
    const picker = change.currentTarget;
    const pickedFile = picker.files[0];
    if (!pickedFile) return;
    const position = Number(picker.dataset.slot);
    const requestNumber = ++requestEpochs[position];
    const localUrl = URL.createObjectURL(pickedFile);
    try {
        const bitmap = await decodeBitmap(localUrl);
        if (requestEpochs[position] !== requestNumber) return;
        stashBitmap(position, bitmap);
        byId('slotSelect').value = position;
        saveCheckpoint();
        redrawPreview();
        notify('Photo ' + (position + 1) + ' loaded. Ready to create.');
    } catch {
        notify('Could not open that photo. Try a JPG, PNG or WebP.');
    } finally {
        URL.revokeObjectURL(localUrl);
        picker.value = '';
    }
}

function pointerInPreview(pointer) {
    const frame = surface.getBoundingClientRect();
    return {
        x: ((pointer.clientX - frame.left) * surface.width) / frame.width,
        y: ((pointer.clientY - frame.top) * surface.height) / frame.height,
    };
}

function startPan(pointer) {
    if (panGesture || pointer.button !== 0) return;
    const anchor = pointerInPreview(pointer);
    // Search back to front to pick the topmost panel where frames overlap.
    const rectangles = activeRectangles();
    const targetIndex = rectangles.findLastIndex((box) =>
        anchor.x >= box.x && anchor.x <= box.x + box.w &&
        anchor.y >= box.y && anchor.y <= box.y + box.h);
    if (targetIndex === -1) return;
    saveCheckpoint();
    focusIndex = targetIndex;
    refreshCropFields();
    const { dx: startX, dy: startY } = designNow.panels[targetIndex];
    panGesture = {
        pointerKey: pointer.pointerId, anchor, startX, startY,
        box: activeRectangles()[targetIndex],
    };
    surface.setPointerCapture(pointer.pointerId);
    surface.classList.add('pan-active');
}

function movePan(pointer) {
    if (!panGesture || pointer.pointerId !== panGesture.pointerKey) return;
    const cursor = pointerInPreview(pointer);
    const { anchor, startX, startY, box } = panGesture;
    const bound = (offset) => Math.max(-1, Math.min(1, offset));
    Object.assign(designNow.panels[focusIndex], {
        dx: bound(startX - 2 * (cursor.x - anchor.x) / box.w),
        dy: bound(startY - 2 * (cursor.y - anchor.y) / box.h),
    });
    redrawPreview();
}

function closePan(pointer) {
    if (!panGesture || pointer.pointerId !== panGesture.pointerKey) return;
    if (pointer.type !== 'pointercancel') {
        saveCheckpoint();
    } else {
        Object.assign(designNow.panels[focusIndex], { dx: panGesture.startX, dy: panGesture.startY });
    }
    panGesture = null;
    surface.classList.remove('pan-active');
    if (surface.hasPointerCapture(pointer.pointerId)) surface.releasePointerCapture(pointer.pointerId);
    redrawPreview();
}

async function downloadCover(width, height) {
    saveCheckpoint();
    chooseDimensions(width, height);
    const actions = [...exportActions()];
    const sizeText = width + '×' + height;
    for (const action of actions) action.disabled = true;
    notify('Rendering ' + sizeText + ' PNG…');
    const exportDesign = copyDesign(designNow);
    const exportImages = displayedImages.slice();
    try {
        await document.fonts.ready;
        const sheet = document.createElement('canvas');
        sheet.width = width;
        sheet.height = height;
        paintCover(sheet.getContext('2d'), width, height, exportDesign, exportImages);
        const png = await new Promise((accept, fail) => {
            sheet.toBlob((encoded) => {
                if (encoded) accept(encoded);
                else fail(new Error('PNG export failed.'));
            }, 'image/png');
        });
        const downloadUrl = URL.createObjectURL(png);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = 'palmsky-cover-' + ratioLabel({ w: width, h: height }) + '.png';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
        notify('Exported ' + sizeText + ' PNG');
    } catch {
        notify('Export failed. Please try again.');
    } finally {
        for (const action of actions) action.disabled = false;
    }
}

function attachEditorEvents() {
    for (const picker of document.querySelectorAll('input[type="file"]')) {
        picker.addEventListener('change', importLocalPhoto);
    }
    for (const chip of document.querySelectorAll('[data-sample]')) {
        chip.addEventListener('click', async () => {
            try {
                await selectSample(chip.dataset.sample);
                notify('Sample loaded into slot ' + (currentSlot() + 1) + '.');
            } catch {
                notify('That sample could not be loaded.');
            }
        });
    }

    for (const field of ['caption', 'subtitle', 'badge']) {
        const entry = byId(selectors[field]);
        entry.addEventListener('input', () => {
            designNow[field] = entry.value;
            redrawPreview();
        });
        entry.addEventListener('change', saveCheckpoint);
    }
    const choiceReaders = [
        ['layout', byId(selectors.layout), (entry) => entry.value],
        ['grade', byId(selectors.grade), (entry) => entry.value],
        ['heat', byId(selectors.heat), (entry) => Number(entry.value)],
        ['ink', byId('inkToggle'), (entry) => entry.checked],
    ];
    for (const [field, entry, readChoice] of choiceReaders) {
        entry.addEventListener('change', () => {
            designNow[field] = readChoice(entry);
            saveCheckpoint();
            redrawPreview();
        });
    }

    const slider = byId('zoomSlider');
    slider.addEventListener('input', () => {
        designNow.panels[focusIndex].scale = Number(slider.value);
        redrawPreview();
    });
    slider.addEventListener('change', saveCheckpoint);
    byId('swapButton').addEventListener('click', () => {
        const occupied = occupiedSlots();
        if (occupied.length === 0) return;
        const crop = designNow.panels[focusIndex];
        const nextPosition = occupied.indexOf(crop.photo) + 1;
        crop.photo = occupied[nextPosition % occupied.length];
        saveCheckpoint();
        redrawPreview();
    });
    byId('panelResetButton').addEventListener('click', () => {
        designNow.panels[focusIndex] = baseCrop(focusIndex, occupiedSlots());
        saveCheckpoint();
        redrawPreview();
    });

    const ratioChoice = byId('ratioSelect');
    ratioChoice.addEventListener('change', () => {
        const [width, height] = ratioChoice.value.split('x');
        chooseDimensions(Number(width), Number(height));
    });
    byId('undoButton').addEventListener('click', () => travelHistory(past, future));
    byId('redoButton').addEventListener('click', () => travelHistory(future, past));
    document.addEventListener('keydown', navigateByKey);
    for (const action of exportActions()) {
        action.addEventListener('click', () => {
            downloadCover(Number(action.dataset.w), Number(action.dataset.h));
        });
    }
    for (const [signal, handler] of [
        ['pointerdown', startPan], ['pointermove', movePan],
        ['pointerup', closePan], ['pointercancel', closePan],
    ]) {
        surface.addEventListener(signal, handler);
    }
}

async function openStudio() {
    const menus = [[selectors.layout, compositions], [selectors.grade, palettes]];
    for (const [token, catalog] of menus) {
        const menu = byId(token);
        if (menu.options.length) continue;
        for (const option of catalog) menu.add(new Option(option.name, option.id));
    }
    refreshEditorFields();

    // The canvas fonts need explicit requests because some never appear in HTML.
    await Promise.all(['Anton', 'Pacifico', '"Bebas Neue"'].map(
        (family) => document.fonts.load('16px ' + family),
    ));
    await document.fonts.ready;

    if (captureMode) {
        const bridge = {
            loadSample: selectSample,
            setState(revision) {
                const { photos: replacements, ...edits } = revision;
                if (Array.isArray(replacements)) {
                    displayedImages.forEach((unused, position) => {
                        stashBitmap(position, replacements[position] || null);
                    });
                    designNow.panels = [];
                }
                Object.assign(designNow, edits);
                refreshEditorFields();
            },
            render: redrawPreview,
            ready() {},
            setCanvas(width, height) {
                chooseDimensions(width, height, true);
            },
        };
        await captureCover(parameters.get('shot'), parameters, bridge);
        reservingCaptureSlots = false;
    } else {
        await Promise.allSettled(['boulevard', 'pier', 'extra-1'].map(
            (sampleName, position) => installSample(sampleName, position, false),
        ));
        designNow.panels = [];
        redrawPreview();
        refreshEditorFields();
        notify('Studio ready. Your photos stay on this device.');
    }
    savedDesign = copyDesign(designNow);
    attachEditorEvents();
}

openStudio().catch(() => notify('The studio could not start. Reload to try again.'));
