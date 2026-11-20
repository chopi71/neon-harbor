// Deterministic screenshot scenes. A `?shot=` query describes one fixed cover or editor setup, so the maker's
// screenshots (shots.json lists them) always show the same scene:
//   ?shot=cover&photo=pier,boulevard&caption=NEON|HARBOR&subtitle=ONE%20NIGHT&layout=quad&grade=vice&size=1080x1350
//   ?shot=editor&photo=boulevard&caption=PALM%20CITY&layout=duo&grade=golden
// `photo` names samples in app/samples/ (no extension), comma-separated in panel order; a single name fills
// every panel. `caption` splits its lines on |. `size` is WxH or square | portrait | landscape. `decor` lists
// the switched-on decorations (sun, palms, skyline); without it, sun and palms are on. window.__shotReady is
// set once the scene is painted.

export const SHOT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1920, 1080],
};

/** Parses a shot query into a scene description, or returns null when the URL names no shot. */
export function parseShotQuery(params) {
  const mode = params.get('shot');
  if (mode !== 'cover' && mode !== 'editor') return null;
  let size = SHOT_SIZES[params.get('size')] ?? null;
  const raw = params.get('size') ?? '';
  const match = /^(\d+)x(\d+)$/.exec(raw);
  if (match) size = [Number(match[1]), Number(match[2])];
  const photos = (params.get('photo') ?? 'pier')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  const decorParam = params.get('decor');
  const decor = decorParam
    ? {
        sun: decorParam.split(',').includes('sun'),
        palms: decorParam.split(',').includes('palms'),
        skyline: decorParam.split(',').includes('skyline'),
      }
    : { sun: true, palms: true, skyline: false };
  return {
    mode,
    size,
    photos,
    layout: params.get('layout') ?? 'quad',
    grade: params.get('grade') ?? 'vice',
    theme: params.get('theme') ?? 'sunset',
    position: params.get('position') === 'top' ? 'top' : 'bottom',
    captionLines: (params.get('caption') ?? 'Neon Harbor').split('|'),
    subtitle: params.get('subtitle') ?? '',
    decor,
  };
}
