function read(query, name) {
  if (query && typeof query.get === 'function') return query.get(name);
  if (query && Object.prototype.hasOwnProperty.call(query, name)) return query[name];
  return null;
}

function flag(value) {
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function numeric(value, fallback, min, max) {
  if (value == null || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

async function nextFrame() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

export async function runShot(shot, query, api) {
  const params = {
    layout: read(query, 'layout') || 'nine',
    grade: read(query, 'grade') || 'sunset',
    ink: flag(read(query, 'ink')),
    caption: read(query, 'caption') ?? 'Sunset Heist',
    subtitle: read(query, 'sub') ?? 'Neon Harbor Nights',
    heat: numeric(read(query, 'heat'), 4, 0, 5),
    badge: read(query, 'badge') ?? 'LAUNCH WEEK',
  };
  const requestedNames = read(query, 'photos');
  const legacyPhoto = read(query, 'photo');
  const names = requestedNames != null
    ? String(requestedNames).split(',').map((name) => name.trim()).filter(Boolean)
    : legacyPhoto
      ? [legacyPhoto]
      : ['boulevard', 'pier'];
  const loaded = await Promise.all(names.map(async (name) => {
    try {
      const image = await api.loadSample(name);
      return image ? { name, image } : null;
    } catch {
      return null;
    }
  }));
  const photos = loaded.filter(Boolean).map((entry) => entry.image);

  if (shot === 'cover') document.body.classList.add('cover-capture');
  const width = read(query, 'w');
  const height = read(query, 'h');
  if (width != null && height != null && typeof api.setCanvas === 'function') {
    const w = numeric(width, 0, 1, 8192);
    const h = numeric(height, 0, 1, 8192);
    if (w && h) api.setCanvas(Math.round(w), Math.round(h));
  }

  api.setState({ ...params, photos });
  await api.render();
  await nextFrame();
  await nextFrame();
  window.__shotReady = true;
  if (typeof api.ready === 'function') await api.ready();
}
