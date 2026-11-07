/**
 * de-app-window.js — <de-app-window>
 *
 * Dynamic window chrome for the desktop windowing system. Rendered by
 * <de-shell> for each open window. Position/size come from CSS vars
 * (--win-x/y/w/h) that the shell sets per the active layout:
 *
 *   - floating: each window has free x/y/w/h; the user can DRAG it by the
 *     titlebar (or the top-right drag-region for no-titlebar apps like the
 *     file explorer) and RESIZE it via 8 edge/corner handles. Mousedown
 *     anywhere on the window focuses it (raises z — last-active = on top).
 *   - tiling:   the shell sets a grid tile rect; no drag/resize.
 *
 * Attributes:
 *   title, icon, data-window-id, data-app-id, data-layout (floating|tiling),
 *   data-maximized, data-notitlebar.
 *
 * Inherits design tokens from <de-shell>.
 */
import { renderIcons } from '../core/icons.js';
import { commands } from '../core/command-registry.js';

const CSS = `<style>
  /* === base reset (scoped to THIS shadow root) === */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  button { font-family: inherit; color: inherit; border: none; background: none; cursor: pointer; }
  input { font-family: inherit; color: inherit; background: transparent; border: none; outline: none; }
  img { display: block; }
  svg { display: block; }

  :host { display: block; position: absolute; inset: 0; pointer-events: none; }

  /* The window is positioned/sized entirely via --win-x/y/w/h (set on the
     host by the shell). No transform/centering — the vars ARE the geometry. */
  .window {
    position: absolute;
    left: var(--win-x, 80px);
    top: var(--win-y, 24px);
    width: var(--win-w, 1000px);
    height: var(--win-h, 620px);
    z-index: 12;
    background: var(--surface-pop); border: 1px solid var(--border-2); border-radius: var(--r-xl);
    backdrop-filter: blur(36px) saturate(180%); -webkit-backdrop-filter: blur(36px) saturate(180%);
    box-shadow: var(--el-4), inset 0 1px 0 rgba(255,255,255,0.05);
    display: flex; flex-direction: column;
    opacity: 0; pointer-events: none; transform: scale(0.985);
    transition: opacity var(--d-med) var(--ease), transform var(--d-med) var(--ease);
    overflow: hidden;
  }
  .window.open { opacity: 1; pointer-events: auto; transform: scale(1); }

  /* File explorer: its own tinted translucent surfaces are the glass, so the
     window base is transparent (the desktop backdrop-blur reads through). */
  :host([data-app-id="files"]) .window { background: transparent; }

  /* Tiling: tighter radius + flush look. Maximized: square corners. */
  :host([data-layout="tiling"]) .window { border-radius: var(--r-md); box-shadow: var(--el-2); }
  :host([data-maximized]) .window { border-radius: var(--r-sm); }

  .titlebar {
    display: flex; align-items: center; gap: 10px; padding: 10px 14px;
    border-bottom: 1px solid var(--border-1); flex-shrink: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.025), transparent);
    cursor: grab;
  }
  .titlebar:active { cursor: grabbing; }
  .titlebar .title { flex: 1; display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--text-2); font-weight: 450; min-width: 0; }
  .titlebar .title img, .titlebar .title svg { width: 15px; height: 15px; flex-shrink: 0; }
  .titlebar .title #winTitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* No-titlebar apps (e.g. file explorer): the titlebar becomes a floating
     control cluster at the top-right; a separate drag-region covers the
     reserved top-right corner so the user can still move the window. */
  :host([data-notitlebar]) .titlebar {
    position: absolute; top: 0; right: 0; left: auto; bottom: auto;
    padding: 7px 8px; background: transparent; border: none; z-index: 50; cursor: default;
  }
  :host([data-notitlebar]) .titlebar .title { display: none; }
  :host([data-notitlebar]) .window-content { flex: 1; min-height: 0; height: 100%; }

  /* drag-region: only for no-titlebar floating windows. Sits behind the
     floating controls (z:40 < 50) so the controls still receive their clicks. */
  .drag-region { display: none; }
  :host([data-notitlebar][data-layout="floating"]) .drag-region {
    display: block; position: absolute; top: 0; right: 0;
    width: 72px; height: 44px; z-index: 40; cursor: grab;
  }
  :host([data-notitlebar][data-layout="floating"]) .drag-region:active { cursor: grabbing; }
  /* in tiling modes (horizontal/vertical), no drag affordance */
  :host([data-layout="horizontal"]) .drag-region,
  :host([data-layout="vertical"]) .drag-region,
  :host([data-layout="horizontal"]) .titlebar,
  :host([data-layout="vertical"]) .titlebar { cursor: default; }

  .win-controls { display: flex; gap: 7px; }
  .win-ctrl { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; transition: filter var(--d-fast); flex-shrink: 0; }
  .win-ctrl:hover { filter: brightness(1.18); }
  .win-ctrl.close { background: #ff5f57; } .win-ctrl.min { background: #febc2e; } .win-ctrl.max { background: #28c840; }

  .window-content { flex: 1; min-height: 0; display: block; position: relative; overflow: hidden; }
  .window-content .placeholder { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text-4); }
  .window-content .placeholder svg { width: 42px; height: 42px; stroke-width: 1.2; }
  .window-content .placeholder span { font-size: 11.5px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.02em; }

  /* === resize handles (floating mode only) === */
  .resize-handle { position: absolute; z-index: 60; display: none; }
  :host([data-layout="floating"]) .resize-handle { display: block; }
  .resize-handle[data-dir="n"]  { top: -3px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
  .resize-handle[data-dir="s"]  { bottom: -3px; left: 8px; right: 8px; height: 6px; cursor: ns-resize; }
  .resize-handle[data-dir="e"]  { right: -3px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
  .resize-handle[data-dir="w"]  { left: -3px; top: 8px; bottom: 8px; width: 6px; cursor: ew-resize; }
  .resize-handle[data-dir="ne"] { top: -3px; right: -3px; width: 14px; height: 14px; cursor: nesw-resize; }
  .resize-handle[data-dir="nw"] { top: -3px; left: -3px; width: 14px; height: 14px; cursor: nwse-resize; }
  .resize-handle[data-dir="se"] { bottom: -3px; right: -3px; width: 14px; height: 14px; cursor: nwse-resize; }
  .resize-handle[data-dir="sw"] { bottom: -3px; left: -3px; width: 14px; height: 14px; cursor: nesw-resize; }
  /* no top resize handles for no-titlebar apps (their own top bar lives there) */
  :host([data-notitlebar]) .resize-handle[data-dir="n"],
  :host([data-notitlebar]) .resize-handle[data-dir="ne"],
  :host([data-notitlebar]) .resize-handle[data-dir="nw"] { display: none; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-3); }

  @media (max-width: 780px) {
    .window { left: 8px !important; right: auto !important; top: var(--win-y, 8px) !important; width: calc(100vw - 16px) !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>`;

const HTML = `
<div class="window open" id="appWindow" role="dialog" aria-modal="true">
  <div class="titlebar">
    <div class="title">
      <span id="winIconSlot"></span>
      <span id="winTitle">Application</span>
    </div>
    <div class="win-controls">
      <button class="win-ctrl min" aria-label="Minimize"></button>
      <button class="win-ctrl max" aria-label="Maximize"></button>
      <button class="win-ctrl close" id="closeWindow" aria-label="Close"></button>
    </div>
  </div>
  <div class="drag-region" data-drag title="Drag window"></div>
  <div class="resize-handle" data-dir="n"></div>
  <div class="resize-handle" data-dir="s"></div>
  <div class="resize-handle" data-dir="e"></div>
  <div class="resize-handle" data-dir="w"></div>
  <div class="resize-handle" data-dir="ne"></div>
  <div class="resize-handle" data-dir="nw"></div>
  <div class="resize-handle" data-dir="se"></div>
  <div class="resize-handle" data-dir="sw"></div>
  <div class="window-content">
    <slot></slot>
  </div>
</div>`;

class DeAppWindow extends HTMLElement {
  static get observedAttributes() { return ['title', 'icon', 'data-maximized', 'data-layout']; }

  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    requestAnimationFrame(() => this._init());
  }

  _init() {
    this._applyTitle();
    this._applyIcon();
    renderIcons(this._root);

    const root = this._root;
    const id = () => this.dataset.windowId;
    const win = root.getElementById('appWindow');

    // window controls
    root.getElementById('closeWindow').addEventListener('click', (e) => {
      e.stopPropagation(); commands.execute('window.close', { id: id() });
    });
    root.querySelector('.win-ctrl.min').addEventListener('click', (e) => {
      e.stopPropagation(); commands.execute('window.minimize', { id: id() });
    });
    root.querySelector('.win-ctrl.max').addEventListener('click', (e) => {
      e.stopPropagation(); commands.execute('window.toggleMaximize', { id: id() });
    });

    // focus on any pointerdown inside the window (last-active = top z-order)
    win.addEventListener('pointerdown', () => {
      commands.execute('window.focus', { id: id() });
    }, true);

    // drag — titlebar (titlebar apps) and drag-region (no-titlebar apps)
    const startDrag = (e) => this._startDrag(e);
    root.querySelector('.titlebar').addEventListener('pointerdown', (e) => {
      // ignore presses on the window-control dots
      if (e.target.closest('.win-ctrl')) return;
      if (this.dataset.layout !== 'floating') return;
      if (this.hasAttribute('data-maximized')) return;
      if (this.hasAttribute('data-notitlebar')) return; // no-titlebar uses drag-region
      startDrag(e);
    });
    root.querySelector('.drag-region').addEventListener('pointerdown', (e) => {
      if (this.dataset.layout !== 'floating') return;
      if (this.hasAttribute('data-maximized')) return;
      startDrag(e);
    });

    // resize handles
    for (const h of root.querySelectorAll('.resize-handle')) {
      h.addEventListener('pointerdown', (e) => {
        if (this.dataset.layout !== 'floating') return;
        if (this.hasAttribute('data-maximized')) return;
        this._startResize(e, h.dataset.dir);
      });
    }
  }

  /** read the current window geometry from the CSS vars on the host */
  _geom() {
    const cs = getComputedStyle(this);
    const v = (p) => parseFloat(cs.getPropertyValue(p)) || 0;
    return { x: v('--win-x'), y: v('--win-y'), w: v('--win-w') || 800, h: v('--win-h') || 500 };
  }

  _startDrag(e) {
    e.preventDefault(); e.stopPropagation();
    const id = this.dataset.windowId;
    commands.execute('window.focus', { id });
    const { x, y } = this._geom();
    const startX = e.clientX, startY = e.clientY;
    const vw = window.innerWidth, vh = window.innerHeight;
    const wWidth = this._geom().w;
    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let nx = x + dx, ny = y + dy;
      // keep at least 120px of the window visible horizontally + titlebar on screen
      nx = Math.max(-(wWidth - 120), Math.min(vw - 120, nx));
      ny = Math.max(0, Math.min(vh - 92, ny));
      this.style.setProperty('--win-x', nx + 'px');
      this.style.setProperty('--win-y', ny + 'px');
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      const g = this._geom();
      commands.execute('window.move', { id, x: g.x, y: g.y });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  _startResize(e, dir) {
    e.preventDefault(); e.stopPropagation();
    const id = this.dataset.windowId;
    commands.execute('window.focus', { id });
    const g0 = this._geom();
    const startX = e.clientX, startY = e.clientY;
    const minW = 360, minH = 280;
    const vw = window.innerWidth, vh = window.innerHeight;
    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let { x: nx, y: ny, w: nw, h: nh } = g0;
      if (dir.includes('e')) nw = Math.max(minW, g0.w + dx);
      if (dir.includes('s')) nh = Math.max(minH, g0.h + dy);
      if (dir.includes('w')) { nw = Math.max(minW, g0.w - dx); nx = g0.x + (g0.w - nw); }
      if (dir.includes('n')) { nh = Math.max(minH, g0.h - dy); ny = g0.y + (g0.h - nh); }
      // keep within the dock clearance (don't resize below the dock)
      ny = Math.max(0, ny);
      if (ny + nh > vh - 84) nh = (vh - 84) - ny;
      if (nx + nw > vw - 4) nw = (vw - 4) - nx;
      this.style.setProperty('--win-x', nx + 'px');
      this.style.setProperty('--win-y', ny + 'px');
      this.style.setProperty('--win-w', nw + 'px');
      this.style.setProperty('--win-h', nh + 'px');
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      const g = this._geom();
      commands.execute('window.resize', { id, x: g.x, y: g.y, w: g.w, h: g.h });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  attributeChangedCallback(name) {
    if (!this._root) return;
    if (name === 'title') this._applyTitle();
    else if (name === 'icon') this._applyIcon();
  }

  _applyTitle() {
    const el = this._root.getElementById('winTitle');
    if (el) el.textContent = this.getAttribute('title') || 'Application';
  }

  _applyIcon() {
    const slot = this._root.getElementById('winIconSlot');
    if (!slot) return;
    slot.innerHTML = '';
    const icon = this.getAttribute('icon');
    if (!icon) return;
    if (/^https?:\/\//.test(icon) || icon.startsWith('/')) {
      const img = document.createElement('img');
      img.src = icon; img.alt = '';
      img.onerror = () => { img.style.display = 'none'; };
      slot.appendChild(img);
    } else {
      const i = document.createElement('i');
      i.setAttribute('data-lucide', icon);
      slot.appendChild(i);
      renderIcons(this._root);
    }
  }
}

customElements.define('de-app-window', DeAppWindow);
export default DeAppWindow;
