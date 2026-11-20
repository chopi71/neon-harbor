// Panel geometry for the cover layouts. A layout turns a canvas size into an array of polygons, one per panel,
// each polygon an array of [x, y] points in canvas pixels. Neighbouring panels share their edges exactly, so the
// white keylines the renderer strokes between panels land precisely on the seams, like the angled cuts of a
// game cover.

/** The point where the line through (ax, ay)-(bx, by) crosses the line through (cx, cy)-(dx, dy). */
function lineCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  return [ax + t * (bx - ax), ay + t * (by - ay)];
}

/** The axis-aligned bounding box of a polygon, as { x, y, w, h }. */
export function panelBox(poly) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** True when the point (x, y) falls inside the polygon (ray casting). */
export function pointInPanel(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero Single',
    panels(w, h) {
      return [[[0, 0], [w, 0], [w, h], [0, h]]];
    },
  },
  {
    id: 'duo',
    name: 'Duo Split',
    panels(w, h) {
      const top = [0.58 * w, 0];
      const bottom = [0.42 * w, h];
      return [
        [[0, 0], top, bottom, [0, h]],
        [top, [w, 0], [w, h], bottom],
      ];
    },
  },
  {
    id: 'quad',
    name: 'Classic Quad',
    panels(w, h) {
      const vTop = [0.56 * w, 0];
      const vBottom = [0.46 * w, h];
      const hLeft = [0, 0.46 * h];
      const hRight = [w, 0.54 * h];
      const c = lineCross(...vTop, ...vBottom, ...hLeft, ...hRight);
      return [
        [[0, 0], vTop, c, hLeft],
        [vTop, [w, 0], hRight, c],
        [hLeft, c, vBottom, [0, h]],
        [c, hRight, [w, h], vBottom],
      ];
    },
  },
  {
    id: 'six',
    name: 'Six-Panel Grid',
    panels(w, h) {
      const v1Top = [0.36 * w, 0];
      const v1Bottom = [0.32 * w, h];
      const v2Top = [0.68 * w, 0];
      const v2Bottom = [0.64 * w, h];
      const hLeft = [0, 0.52 * h];
      const hRight = [w, 0.48 * h];
      const p1 = lineCross(...v1Top, ...v1Bottom, ...hLeft, ...hRight);
      const p2 = lineCross(...v2Top, ...v2Bottom, ...hLeft, ...hRight);
      return [
        [[0, 0], v1Top, p1, hLeft],
        [v1Top, v2Top, p2, p1],
        [v2Top, [w, 0], hRight, p2],
        [hLeft, p1, v1Bottom, [0, h]],
        [p1, p2, v2Bottom, v1Bottom],
        [p2, hRight, [w, h], v2Bottom],
      ];
    },
  },
  {
    id: 'strip',
    name: 'Hero + Trio',
    panels(w, h) {
      // The hero's foot edge slants from (0, 0.64h) up to (w, 0.60h); the trio below it splits along two
      // near-vertical lines that start on that edge.
      const edgeY = (fx) => 0.64 * h - 0.04 * h * fx;
      const e1 = [0.34 * w, edgeY(0.34)];
      const e2 = [0.67 * w, edgeY(0.67)];
      return [
        [[0, 0], [w, 0], [w, edgeY(1)], [0, edgeY(0)]],
        [[0, edgeY(0)], e1, [0.32 * w, h], [0, h]],
        [e1, e2, [0.65 * w, h], [0.32 * w, h]],
        [e2, [w, edgeY(1)], [w, h], [0.65 * w, h]],
      ];
    },
  },
];

/** The layout with this id, or the first layout when the id is unknown. */
export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}
