/**
 * desktop-tools.js — snapping, alignment & distribution for desktop widgets.
 *
 * - snapToGrid(value, grid): round to the nearest grid point.
 * - findSnapGuides(panel, others, threshold): find edge/center alignments with
 *   other panels → returns {v: [x-coords], h: [y-coords]} for guide lines.
 * - alignWidgets(panels, alignment): align selected panels (left/centerH/right/
 *   top/centerV/bottom).
 * - distributeWidgets(panels, axis): equalize spacing between selected panels
 *   ('h' = horizontal, 'v' = vertical).
 */

export const GRID = 20;
export const SNAP_THRESHOLD = 6;

/** round a value to the nearest grid increment */
export function snapToGrid(v, grid = GRID) {
  return Math.round(v / grid) * grid;
}

/**
 * Find snap guides for a panel against other panels.
 * @param {{left,top,w,h}} panel the panel being dragged
 * @param {Array<{left,top,w,h}>} others the other panels
 * @param {number} threshold snap distance (px)
 * @returns {{v:number[], h:number[], dx:number, dy:number}} vertical/horizontal
 *   guide positions + the snap offset to apply
 */
export function findSnapGuides(panel, others, threshold = SNAP_THRESHOLD) {
  const guides = { v: [], h: [], dx: 0, dy: 0 };
  const pEdges = {
    left: panel.left, right: panel.left + panel.w,
    centerX: panel.left + panel.w / 2,
    top: panel.top, bottom: panel.top + panel.h,
    centerY: panel.top + panel.h / 2,
  };
  let bestDx = threshold + 1, bestDy = threshold + 1;
  for (const o of others) {
    const oEdges = {
      left: o.left, right: o.left + o.w,
      centerX: o.left + o.w / 2,
      top: o.top, bottom: o.top + o.h,
      centerY: o.top + o.h / 2,
    };
    // vertical alignment (snap x)
    for (const pk of ['left', 'right', 'centerX']) {
      for (const ok of ['left', 'right', 'centerX']) {
        const d = oEdges[ok] - pEdges[pk];
        if (Math.abs(d) < Math.abs(bestDx)) { bestDx = d; guides.v = [oEdges[ok]]; }
        else if (Math.abs(d) === Math.abs(bestDx) && d !== 0) { guides.v.push(oEdges[ok]); }
      }
    }
    // horizontal alignment (snap y)
    for (const pk of ['top', 'bottom', 'centerY']) {
      for (const ok of ['top', 'bottom', 'centerY']) {
        const d = oEdges[ok] - pEdges[pk];
        if (Math.abs(d) < Math.abs(bestDy)) { bestDy = d; guides.h = [oEdges[ok]]; }
        else if (Math.abs(d) === Math.abs(bestDy) && d !== 0) { guides.h.push(oEdges[ok]); }
      }
    }
  }
  if (Math.abs(bestDx) <= threshold) guides.dx = bestDx;
  if (Math.abs(bestDy) <= threshold) guides.dy = bestDy;
  return guides;
}

/**
 * Find snap guides for a RESIZE — only checks the panel edge(s) being resized
 * (not all edges like findSnapGuides does for drag). This ensures the snap
 * offset and guide positions correspond to the actual moving edge, not a
 * static edge on the opposite side.
 * @param {{left,top,w,h}} panel the panel being resized (current geometry)
 * @param {Array<{left,top,w,h}>} others the other panels
 * @param {string} dir resize direction ('n','s','e','w','ne','nw','se','sw')
 * @param {number} threshold snap distance (px)
 * @returns {{v:number[], h:number[], dx:number, dy:number}}
 */
export function findResizeSnapGuides(panel, others, dir, threshold = SNAP_THRESHOLD) {
  const hasE = dir.includes('e'), hasW = dir.includes('w');
  const hasN = dir.includes('n'), hasS = dir.includes('s');
  const guides = { v: [], h: [], dx: 0, dy: 0 };
  const pEdges = {
    left: panel.left, right: panel.left + panel.w,
    centerX: panel.left + panel.w / 2,
    top: panel.top, bottom: panel.top + panel.h,
    centerY: panel.top + panel.h / 2,
  };
  // which PANEL edges are moving (and thus relevant for snapping)?
  const pVertKeys = [];
  if (hasE) pVertKeys.push('right');
  if (hasW) pVertKeys.push('left');
  const pHorzKeys = [];
  if (hasS) pHorzKeys.push('bottom');
  if (hasN) pHorzKeys.push('top');

  let bestDx = threshold + 1, bestDy = threshold + 1;
  for (const o of others) {
    const oEdges = {
      left: o.left, right: o.left + o.w,
      centerX: o.left + o.w / 2,
      top: o.top, bottom: o.top + o.h,
      centerY: o.top + o.h / 2,
    };
    // vertical alignment (snap x) — only check the resizing panel edge(s)
    for (const pk of pVertKeys) {
      for (const ok of ['left', 'right', 'centerX']) {
        const d = oEdges[ok] - pEdges[pk];
        if (Math.abs(d) < Math.abs(bestDx)) { bestDx = d; guides.v = [oEdges[ok]]; }
        else if (Math.abs(d) === Math.abs(bestDx) && d !== 0) { guides.v.push(oEdges[ok]); }
      }
    }
    // horizontal alignment (snap y) — only check the resizing panel edge(s)
    for (const pk of pHorzKeys) {
      for (const ok of ['top', 'bottom', 'centerY']) {
        const d = oEdges[ok] - pEdges[pk];
        if (Math.abs(d) < Math.abs(bestDy)) { bestDy = d; guides.h = [oEdges[ok]]; }
        else if (Math.abs(d) === Math.abs(bestDy) && d !== 0) { guides.h.push(oEdges[ok]); }
      }
    }
  }
  if (Math.abs(bestDx) <= threshold) guides.dx = bestDx;
  if (Math.abs(bestDy) <= threshold) guides.dy = bestDy;
  return guides;
}

/**
 * Align selected panels.
 * @param {Array<{left,top,w,h}>} panels
 * @param {'left'|'centerH'|'right'|'top'|'centerV'|'bottom'} alignment
 * @returns {Array<{left,top}>} new positions for each panel
 */
export function alignWidgets(panels, alignment) {
  if (panels.length < 2) return panels.map(p => ({ left: p.left, top: p.top }));
  const result = panels.map(p => ({ left: p.left, top: p.top }));
  switch (alignment) {
    case 'left': { const v = Math.min(...panels.map(p => p.left)); result.forEach(r => r.left = v); break; }
    case 'right': { const v = Math.max(...panels.map(p => p.left + p.w)); result.forEach((r, i) => r.left = v - panels[i].w); break; }
    case 'centerH': { const v = panels.reduce((s, p) => s + p.left + p.w / 2, 0) / panels.length; result.forEach((r, i) => r.left = v - panels[i].w / 2); break; }
    case 'top': { const v = Math.min(...panels.map(p => p.top)); result.forEach(r => r.top = v); break; }
    case 'bottom': { const v = Math.max(...panels.map(p => p.top + p.h)); result.forEach((r, i) => r.top = v - panels[i].h); break; }
    case 'centerV': { const v = panels.reduce((s, p) => s + p.top + p.h / 2, 0) / panels.length; result.forEach((r, i) => r.top = v - panels[i].h / 2); break; }
  }
  return result;
}

/**
 * Distribute selected panels with equal spacing.
 * @param {Array<{left,top,w,h}>} panels (sorted by position along the axis)
 * @param {'h'|'v'} axis
 * @returns {Array<{left,top}>} new positions
 */
export function distributeWidgets(panels, axis) {
  if (panels.length < 3) return panels.map(p => ({ left: p.left, top: p.top }));
  const sorted = panels.map((p, i) => ({ p, i })).sort((a, b) =>
    axis === 'h' ? (a.p.left - b.p.left) : (a.p.top - b.p.top));
  const result = panels.map(p => ({ left: p.left, top: p.top }));
  if (axis === 'h') {
    const first = sorted[0].p, last = sorted[sorted.length - 1].p;
    const totalW = sorted.reduce((s, x) => s + x.p.w, 0);
    const gap = (last.left + last.w - first.left - totalW) / (sorted.length - 1);
    let cursor = first.left;
    for (const x of sorted) { result[x.i].left = cursor; cursor += x.p.w + gap; }
  } else {
    const first = sorted[0].p, last = sorted[sorted.length - 1].p;
    const totalH = sorted.reduce((s, x) => s + x.p.h, 0);
    const gap = (last.top + last.h - first.top - totalH) / (sorted.length - 1);
    let cursor = first.top;
    for (const x of sorted) { result[x.i].top = cursor; cursor += x.p.h + gap; }
  }
  return result;
}
