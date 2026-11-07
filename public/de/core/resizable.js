/**
 * resizable.js — add 8 resize handles (n/s/e/w/ne/nw/se/sw) to an element so
 * it can be resized from ANY edge or corner via pointer drag.
 *
 * Used by the music widget's desktop panel + bento card (NOT the popup).
 * Desktop widgets are never draggable/movable — these handles only resize.
 */

const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/**
 * @param {HTMLElement} el the element to make resizable
 * @param {{minW?:number, minH?:number, onChange?:(w,h)=>void, snap?:(geom,ev,dir)=>geom, onStart?:()=>void, onEnd?:()=>void}} opts
 */
export function makeResizable(el, { minW = 220, minH = 120, onChange, snap, onStart, onEnd } = {}) {
  injectHandleStyles(el);
  for (const dir of DIRS) {
    const h = document.createElement('div');
    h.className = 'rz-handle rz-' + dir;
    h.dataset.dir = dir;
    h.draggable = false;
    h.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
    h.addEventListener('pointerdown', (e) => startResize(e, el, dir, minW, minH, onChange, snap, onStart, onEnd));
    el.appendChild(h);
  }
}

function startResize(e, el, dir, minW, minH, onChange, snap, onStart, onEnd) {
  e.preventDefault();
  e.stopPropagation();
  if (onStart) onStart();
  const rect = el.getBoundingClientRect();
  const startW = rect.width, startH = rect.height;
  const startLeft = rect.left, startTop = rect.top;
  const sx = e.clientX, sy = e.clientY;
  const move = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    let w = startW, h = startH, left = startLeft, top = startTop;
    if (dir.includes('e')) w = Math.max(minW, startW + dx);
    if (dir.includes('s')) h = Math.max(minH, startH + dy);
    if (dir.includes('w')) { w = Math.max(minW, startW - dx); left = startLeft + (startW - w); }
    if (dir.includes('n')) { h = Math.max(minH, startH - dy); top = startTop + (startH - h); }
    // apply snapping (Ctrl grid / Shift widget-snap) if a snap fn is provided
    if (snap) {
      const r = snap({ x: left, y: top, w, h }, ev, dir);
      w = r.w; h = r.h;
      if (dir.includes('w')) left = r.x;
      if (dir.includes('n')) top = r.y;
    }
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    if (dir.includes('w')) el.style.left = left + 'px';
    if (dir.includes('n')) el.style.top = top + 'px';
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    if (onChange) onChange(el.offsetWidth, el.offsetHeight);
    // always fire onEnd so the host can tear down any visible grid/guides,
    // even if the user released while Ctrl/Shift was still held.
    if (onEnd) onEnd();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

/**
 * Span-based resize for a grid cell (bento card): 8 handles where dragging an
 * edge/corner changes the cell's column/row span (snapped). Used by the music
 * bento card so it's resizable from any edge/corner within the grid.
 * @param {HTMLElement} el
 * @param {{get:()=>{col,row}, set:(col,row)=>void, cellW?:number, cellH?:number, maxCol?:number, maxRow?:number}} opts
 */
export function makeSpanResizable(el, { get, set, cellW = 120, cellH = 96, maxCol = 3, maxRow = 3 }) {
  injectHandleStyles(el);
  for (const dir of DIRS) {
    const h = document.createElement('div');
    h.className = 'rz-handle rz-' + dir;
    h.dataset.dir = dir;
    h.draggable = false;
    h.addEventListener('dragstart', (e) => { e.preventDefault(); e.stopPropagation(); });
    h.addEventListener('pointerdown', (e) => startSpan(e, el, dir, get, set, cellW, cellH, maxCol, maxRow));
    el.appendChild(h);
  }
}

function startSpan(e, el, dir, get, set, cellW, cellH, maxCol, maxRow) {
  e.preventDefault(); e.stopPropagation();
  const base = get();
  let last = { col: base.col, row: base.row };
  const sx = e.clientX, sy = e.clientY;
  const apply = (col, row) => {
    el.style.gridColumn = `span ${col}`;
    el.style.gridRow = `span ${row}`;
    last = { col, row };
  };
  const move = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    let col = base.col, row = base.row;
    if (dir.includes('e')) col = clampSpan(base.col + Math.round(dx / cellW), 1, maxCol);
    if (dir.includes('w')) col = clampSpan(base.col - Math.round(dx / cellW), 1, maxCol);
    if (dir.includes('s')) row = clampSpan(base.row + Math.round(dy / cellH), 1, maxRow);
    if (dir.includes('n')) row = clampSpan(base.row - Math.round(dy / cellH), 1, maxRow);
    apply(col, row); // live via direct style (no service emit → no re-render mid-drag)
  };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    set(last.col, last.row); // persist on pointerup
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

function clampSpan(v, min, max) { return Math.max(min, Math.min(max, v)); }

/** Inject the 8-handle CSS into the element's root node (shadow root or document)
 *  once per root, so handles are styled whether they live in light or shadow DOM. */
function injectHandleStyles(el) {
  const root = el.getRootNode();
  if (root.getElementById && root.getElementById('rz-handle-styles')) return;
  const s = document.createElement('style');
  s.id = 'rz-handle-styles';
  s.textContent = `
.rz-handle { position: absolute; z-index: 8; background: transparent; border: none; }
.rz-handle.rz-n  { top: -2px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.rz-handle.rz-s  { bottom: -2px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
.rz-handle.rz-e  { right: -2px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.rz-handle.rz-w  { left: -2px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
.rz-handle.rz-ne { top: -2px; right: -2px; width: 12px; height: 12px; cursor: nesw-resize; }
.rz-handle.rz-nw { top: -2px; left: -2px; width: 12px; height: 12px; cursor: nwse-resize; }
.rz-handle.rz-se { bottom: -2px; right: -2px; width: 12px; height: 12px; cursor: nwse-resize; }
.rz-handle.rz-sw { bottom: -2px; left: -2px; width: 12px; height: 12px; cursor: nesw-resize; }
`;
  (root === document ? document.head : root).appendChild(s);
}
