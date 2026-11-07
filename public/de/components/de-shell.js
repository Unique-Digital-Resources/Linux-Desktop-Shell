/**
 * de-shell.js — <de-shell>
 *
 * The orchestrating host. Shadow tree contains: wallpaper, <de-music-widget>,
 * a windows layer, <de-dock>, <de-launcher>, <de-quicksettings>, <de-calendar>.
 *
 * This is the ONLY component that owns the design tokens (the original
 * :root {…} block is ported to :host {…}). Light-mode overrides become
 * :host(.light). The html/body reset becomes :host. Children components inherit
 * the tokens via custom-property inheritance across the shadow boundary.
 *
 * Subscriptions:
 *   - window-service.onWindowsChange  → re-render <de-app-window> instances
 *   - theme-service.onTheme           → write --accent-* on this.style, toggle
 *                                       .light class, apply wallpaper image
 *   - bus 'ui.popover'                → delegate to child popover components
 *
 * For each open window the shell creates a <de-app-window data-window-id=…
 * title=… icon=…> containing <fe-app> (appId==='files') or
 * <de-placeholder-app data-app-id=…>. Minimized windows get display:none.
 * Focused window gets the .focused class; z-index applied from window.z.
 */
import { renderIcons } from '../core/icons.js';
import { commands } from '../core/command-registry.js';
import { bus } from '../core/event-bus.js';
import { onWindowsChange, windowService } from '../services/window-service.js';
import { onTheme, themeService } from '../services/theme-service.js';
import { workspaceService, onWorkspacesChange } from '../services/workspace-service.js';
import { widgetService, onWidgets } from '../services/widget-service.js';
import { makeResizable } from '../core/resizable.js';
import { startWidgetDrag } from '../core/widget-drag.js';
import { snapToGrid, findSnapGuides, findResizeSnapGuides, alignWidgets, distributeWidgets, GRID, SNAP_THRESHOLD } from '../core/desktop-tools.js';
import { buildSettingsSection, WIDGET_SETTINGS_CSS } from '../core/widget-settings-ui.js';
import './tf-widget.js';
import './de-app-window.js';
import './de-placeholder-app.js';
import './de-dock.js';
import './de-launcher.js';
import './de-quicksettings.js';
import './de-calendar.js';

const CSS = `<style>
  /* ═══ DESIGN TOKENS (port of :root) ═══ */
  :host {
    --accent:        #b4a0ff;
    --accent-strong: #8b6fff;
    --accent-light:  #d4c8ff;
    --accent-glow:   rgba(180,160,255,0.35);

    --tint-1: rgba(180,160,255,0.045);
    --tint-2: rgba(180,160,255,0.08);
    --tint-3: rgba(180,160,255,0.14);
    --tint-4: rgba(180,160,255,0.22);
    --tint-5: rgba(180,160,255,0.30);

    --text-1: #f0ecff;
    --text-2: #c5bfd8;
    --text-3: #837ca0;
    --text-4: #5a547a;

    --surface-bar:   rgba(14, 10, 28, 0.65);
    --surface-pop:   rgba(20, 14, 36, 0.85);
    --surface-deep:  rgba(24, 18, 42, 0.96);

    --border-1: rgba(180,160,255,0.08);
    --border-2: rgba(180,160,255,0.15);
    --border-3: rgba(180,160,255,0.28);

    /* window-client / notification status colors (theme-aware) */
    --client-opened:    #f0ecff;   /* visible window: white */
    --client-collapsed: #837ca0;  /* minimized window: gray */
    --info:    #5ab0ff;            /* notification: blue */
    --success: #6ad1b3;           /* success: green */
    --error:   #f0857a;           /* error: red */
    --warning: #e8c46a;          /* warning: yellow */
    --downloading: #4fd8e8;      /* downloading: cyan (progress arc) */

    --r-xs: 5px;  --r-sm: 7px;  --r-md: 9px;  --r-lg: 11px;
    --r-xl: 13px; --r-2xl: 16px; --r-3xl: 20px; --r-pill: 999px;

    --el-1: 0 1px 2px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.10);
    --el-2: 0 4px 14px rgba(0,0,0,0.26), 0 1px 4px rgba(0,0,0,0.14);
    --el-3: 0 14px 40px rgba(0,0,0,0.40), 0 3px 10px rgba(0,0,0,0.20);
    --el-4: 0 28px 64px rgba(0,0,0,0.52), 0 6px 18px rgba(0,0,0,0.28);

    --ease:      cubic-bezier(0.32, 0.72, 0, 1);
    --ease-soft: cubic-bezier(0.16, 1, 0.3, 1);
    --d-fast: 0.13s; --d-med: 0.20s; --d-slow: 0.30s;

    --bar-h: 48px;
    --icon-sm: 15px; --icon-md: 17px; --icon-lg: 22px;
    --stroke: 1.75;

    /* html, body reset */
    display: block;
    width: 100%; height: 100%; overflow: hidden;
    position: fixed; inset: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--text-1); user-select: none;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
    background: #06040f; font-size: 14px;
    transition: background 0.4s var(--ease);
  }

  /* Light Mode Overrides */
  :host(.light) {
    --accent:        #6549e0;
    --accent-strong: #5034cc;
    --accent-light:  #7760ea;
    --accent-glow:   rgba(101, 73, 224, 0.25);

    --tint-1: rgba(101, 73, 224, 0.04);
    --tint-2: rgba(101, 73, 224, 0.08);
    --tint-3: rgba(101, 73, 224, 0.14);
    --tint-4: rgba(101, 73, 224, 0.22);
    --tint-5: rgba(101, 73, 224, 0.30);

    --text-1: #1a1530;
    --text-2: #45405e;
    --text-3: #6a6585;
    --text-4: #9a95b0;

    --surface-bar:   rgba(245, 245, 252, 0.65);
    --surface-pop:   rgba(250, 250, 255, 0.88);
    --surface-deep:  rgba(255, 255, 255, 0.98);

    --border-1: rgba(50, 30, 100, 0.06);
    --border-2: rgba(50, 30, 100, 0.12);
    --border-3: rgba(101, 73, 224, 0.3);

    /* status colors invert for light mode so they read on light surfaces */
    --client-opened:    #1a1530;
    --client-collapsed: #6a6585;
    --info:    #1f6feb;
    --success: #1f7a4d;
    --error:   #b3261e;
    --warning: #b2651c;
    --downloading: #00838f;

    background: #f0f0f7;
  }

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :host button { font-family: inherit; color: inherit; border: none; background: none; cursor: pointer; }
  :host input { font-family: inherit; color: inherit; }
  :host img { display: block; }
  :host ::selection { background: var(--tint-4); }

  .desktop { position: fixed; inset: 0; overflow: hidden; }

  /* ═══ WALLPAPER ═══ */
  .wallpaper {
    position: absolute; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 70% 55% at 22% 28%, rgba(95, 65, 180, 0.22), transparent 65%),
      radial-gradient(ellipse 55% 75% at 82% 78%, rgba(50, 35, 120, 0.28), transparent 60%),
      linear-gradient(160deg, #07051a 0%, #120d2c 45%, #080614 100%);
    transition: background 0.4s var(--ease);
  }
  :host(.light) .wallpaper {
    background:
      radial-gradient(ellipse 70% 55% at 22% 28%, rgba(180, 160, 255, 0.35), transparent 65%),
      radial-gradient(ellipse 55% 75% at 82% 78%, rgba(120, 100, 200, 0.25), transparent 60%),
      linear-gradient(160deg, #e8e6f5 0%, #d8d4ef 45%, #f0f0f8 100%);
  }
  .wallpaper img {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0;
    transition: opacity 0.5s var(--ease);
  }
  .wallpaper::after {
    content: ''; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 90% 60% at 20% 25%, rgba(80, 55, 160, 0.10), transparent 60%),
      radial-gradient(ellipse 80% 70% at 85% 80%, rgba(35, 25, 85, 0.12), transparent 60%),
      linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 25%, transparent 70%, rgba(0,0,0,0.25) 100%);
    pointer-events: none;
  }
  :host(.light) .wallpaper::after {
    background:
      radial-gradient(ellipse 90% 60% at 20% 25%, rgba(180, 160, 255, 0.20), transparent 60%),
      radial-gradient(ellipse 80% 70% at 85% 80%, rgba(120, 100, 200, 0.15), transparent 60%),
      linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 25%, transparent 70%, rgba(255,255,255,0.15) 100%);
  }

  #windows-layer { position: absolute; inset: 0; z-index: 12; pointer-events: none; }
  /* desktop-form transformer widgets: floating glass panels on the desktop */
  #desktop-widgets { position: absolute; inset: 0; z-index: 11; pointer-events: none; }
  #desktop-widgets .dw-panel {
    position: absolute; pointer-events: auto;
    background: var(--surface-pop); border: 1px solid var(--border-2); border-radius: var(--r-2xl);
    backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%);
    box-shadow: var(--el-3), inset 0 1px 0 rgba(255,255,255,0.05);
    padding: 18px; cursor: grab;
  }
  #desktop-widgets .dw-panel:active { cursor: grabbing; }
  /* ── compact mode: the panel becomes a small box showing the BAR form of the
     widget (visual as it is in the bar). No padding, tight radius, bar height. ── */
  #desktop-widgets .dw-panel.compact {
    padding: 4px 6px; border-radius: var(--r-lg);
    background: var(--surface-bar);
    box-shadow: var(--el-2), inset 0 1px 0 rgba(255,255,255,0.05);
  }
  #desktop-widgets .dw-panel.compact tf-widget { display: flex; align-items: center; height: 34px; }
  /* ── the three auto-hide control buttons (close, settings, compact-toggle).
     All share the .dw-btn base; the .dw-close/.dw-settings/.dw-compact classes
     add their own icon. They appear on panel hover (opacity 0 → 1). ── */
  #desktop-widgets .dw-btn {
    position: absolute; width: 22px; height: 22px; border-radius: 50%;
    display: grid; place-items: center; font-size: 13px; color: var(--text-4); cursor: pointer;
    opacity: 0; transition: opacity var(--d-fast), background var(--d-fast), color var(--d-fast);
    z-index: 12; background: transparent; pointer-events: auto;
  }
  #desktop-widgets .dw-panel:hover .dw-btn { opacity: 1; }
  #desktop-widgets .dw-btn:hover { color: var(--text-1); background: var(--tint-3); }
  #desktop-widgets .dw-btn svg, #desktop-widgets .dw-btn i { width: 13px; height: 13px; }
  /* ── NON-COMPACT button layout: three buttons in a row at the top-right ── */
  #desktop-widgets .dw-panel:not(.compact) .dw-close    { top: 6px; right: 8px; }
  #desktop-widgets .dw-panel:not(.compact) .dw-settings { top: 6px; right: 32px; }
  #desktop-widgets .dw-panel:not(.compact) .dw-compact  { top: 6px; right: 56px; }
  /* ── COMPACT button layout: smart positioning at three different borders of
     the small box so they don't overlap. close = top-right corner (outside),
     settings = top-left corner (outside), compact = bottom-right corner (outside). ── */
  #desktop-widgets .dw-panel.compact .dw-close    { top: -10px; right: -10px; }
  #desktop-widgets .dw-panel.compact .dw-settings { top: -10px; left: -10px; }
  #desktop-widgets .dw-panel.compact .dw-compact  { bottom: -10px; right: -10px; }
  /* the compact toggle button is "active" when compact mode is on */
  #desktop-widgets .dw-compact.active { color: var(--accent); background: var(--tint-3); }
  #desktop-widgets .dw-compact.active:hover { color: var(--accent-strong); background: var(--tint-4); }
  #desktop-widgets .dw-close:hover { color: var(--error); background: var(--tint-3); }
  #desktop-widgets .dw-panel.selected { outline: 2px solid var(--accent); outline-offset: 2px; }
  /* a desktop panel being DRAGGED onto another container (bar) is faded so the
     user can tell the source is "picked up" while an outline preview shows where
     it will land. (Pure in-desktop moves keep the panel solid and follow cursor.) */
  #desktop-widgets .dw-panel.dragging { opacity: 0.3; }
  /* ── widget settings popup: a floating card anchored near the settings button.
     Shows common settings (opacity, always-on-top) + the widget's own unique
     settings (format, volume, location, etc.). Joins the popup system so opening
     it closes other popovers (launcher, quicksettings, calendar, etc.). The
     row-level .sp-* styles come from the shared WIDGET_SETTINGS_CSS injected
     below; this block only adds the popup container + header styles. ── */
  #widget-settings-popup {
    position: absolute; z-index: 210; pointer-events: auto; display: none;
    flex-direction: column; gap: 0;
    background: var(--surface-pop); border: 1px solid var(--border-2); border-radius: var(--r-xl);
    backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
    box-shadow: var(--el-3), inset 0 1px 0 rgba(255,255,255,0.05);
    padding: 12px; min-width: 220px; max-width: 280px;
    opacity: 0; transform: scale(0.96); transform-origin: bottom center;
    transition: opacity var(--d-fast) var(--ease), transform var(--d-fast) var(--ease);
  }
  #widget-settings-popup.visible { display: flex; opacity: 1; transform: scale(1); }
  #widget-settings-popup .sp-head {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border-1);
  }
  #widget-settings-popup .sp-title { font-size: 11px; font-weight: 600; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 6px; }
  #widget-settings-popup .sp-title svg, #widget-settings-popup .sp-title i { width: 13px; height: 13px; color: var(--accent); }
  #widget-settings-popup .sp-close { width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; color: var(--text-4); cursor: pointer; }
  #widget-settings-popup .sp-close:hover { color: var(--text-1); background: var(--tint-3); }
  /* grid overlay (Ctrl+drag / Ctrl+resize) — rebuilt from scratch as an SVG dot
     field: a dense grid of MINOR dots (every 10px, subtle) with MAJOR dots only
     at the 20px intersection corners (bright accent). SVG gives crisp circles
     (no blurry radial-gradient halos). z-index is BELOW the dock so the grid
     stays behind the bar; the overlay is also clipped (bottom: 84px) so it
     never extends into the dock strip. */
  #grid-overlay {
    position: absolute; left: 0; right: 0; top: 0; bottom: 84px;
    z-index: 10; pointer-events: none; display: none; overflow: hidden;
  }
  #grid-overlay.visible { display: block; }
  #grid-overlay svg { display: block; width: 100%; height: 100%; }
  /* snap guides (Shift+drag / Shift+resize). z-index is below the dock (so
     guides stay behind the bar) and the overlay is clipped to exclude the dock
     strip. DRAG guides are full-screen red lines; RESIZE guides are SHORT
     accent-colored gizmos limited to the panel's resizing edge (via the
     .guide-resize class + inline top/height/left/width). */
  #snap-guides {
    position: absolute; left: 0; right: 0; top: 0; bottom: 84px;
    z-index: 14; pointer-events: none; display: none; overflow: hidden;
  }
  #snap-guides.visible { display: block; }
  #snap-guides .guide-v { position: absolute; top: 0; bottom: 0; width: 1px; background: #ff5f56; }
  #snap-guides .guide-h { position: absolute; left: 0; right: 0; height: 1px; background: #ff5f56; }
  /* resize-side gizmo: short accent line on the resizing edge only */
  #snap-guides .guide-resize.guide-v,
  #snap-guides .guide-resize.guide-h {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent-glow);
  }
  /* selection rectangle (drag-select on empty desktop) */
  #selection-rect {
    position: absolute; z-index: 99; pointer-events: none; display: none;
    border: 1px solid var(--accent); background: var(--tint-2); border-radius: 2px;
  }
  #selection-rect.visible { display: block; }
  /* outline preview shown while dragging a widget ONTO the desktop (from the
     palette, the bar, or another desktop position). A sized dashed rectangle
     that follows the cursor — NOT the actual widget. Its size matches the
     widget's desktop-form dimensions (persisted geometry if any, else default). */
  #desktop-drop-preview {
    position: absolute; z-index: 90; pointer-events: none; display: none;
    border: 1.5px dashed var(--accent);
    background: var(--tint-2);
    border-radius: var(--r-md);
    box-shadow: 0 0 14px var(--accent-glow), inset 0 0 0 1px rgba(255,255,255,0.04);
  }
  #desktop-drop-preview.visible { display: block; }
  /* widget context menu */
  #widget-context-menu {
    position: absolute; z-index: 200; pointer-events: auto; display: none;
    background: var(--surface-pop); border: 1px solid var(--border-2); border-radius: var(--r-md);
    backdrop-filter: blur(24px) saturate(180%); box-shadow: var(--el-3); padding: 4px; min-width: 160px;
    font-size: 12px;
  }
  #widget-context-menu.visible { display: block; }
  #widget-context-menu .cm-group { padding: 2px 0; }
  #widget-context-menu .cm-label { font-size: 9px; font-weight: 600; color: var(--text-4); text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 10px 2px; }
  #widget-context-menu .cm-item { padding: 5px 10px; border-radius: var(--r-xs); color: var(--text-2); cursor: pointer; display: flex; align-items: center; gap: 8px; }
  #widget-context-menu .cm-item:hover { background: var(--tint-3); color: var(--text-1); }
  #widget-context-menu .cm-sep { height: 1px; background: var(--border-1); margin: 4px 6px; }
  /* se-corner resize handle (music widget panel) */
  #desktop-widgets .dw-resize {
    position: absolute; right: 2px; bottom: 2px; width: 16px; height: 16px; cursor: nwse-resize;
    z-index: 5; opacity: 0.5; transition: opacity var(--d-fast);
  }
  #desktop-widgets .dw-resize:hover { opacity: 1; }
  #desktop-widgets .dw-resize::after {
    content: ''; position: absolute; right: 3px; bottom: 3px; width: 8px; height: 8px;
    border-right: 2px solid var(--accent); border-bottom: 2px solid var(--accent); border-radius: 0 0 3px 0;
  }
  /* draggable dividers between tiled windows (horizontal/vertical layouts).
     The windows layer is pointer-events:none, but dividers re-enable it so the
     user can grab them. */
  .tile-divider {
    position: absolute; z-index: 100;
    pointer-events: auto;
    display: flex; align-items: center; justify-content: center;
  }
  .tile-divider::after {
    content: '';
    background: var(--border-2);
    border-radius: 2px;
    transition: background var(--d-fast), box-shadow var(--d-fast);
  }
  .tile-divider.h { cursor: ew-resize; }
  .tile-divider.h::after { width: 2px; height: 60%; }
  .tile-divider.v { cursor: ns-resize; }
  .tile-divider.v::after { height: 2px; width: 60%; }
  .tile-divider:hover::after { background: var(--accent); box-shadow: 0 0 6px var(--accent-glow); }
  .tile-divider:active::after { background: var(--accent-strong); }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-3); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
  /* shared widget-settings row styles (.sp-section, .sp-row, .sp-toggle, etc.) */
  ${WIDGET_SETTINGS_CSS}
</style>`;

const HTML = `
<div class="desktop">
  <div class="wallpaper">
    <img id="wallpaperImg" src="" alt="" onerror="this.style.opacity='0'">
  </div>
  <!-- desktop-form transformer widgets (floating panels) -->
  <div id="desktop-widgets"></div>
  <!-- sized outline preview shown while dragging a widget onto the desktop -->
  <div id="desktop-drop-preview"></div>
  <!-- snapping/selection overlays -->
  <div id="grid-overlay"></div>
  <div id="snap-guides"></div>
  <div id="selection-rect"></div>
  <div id="widget-context-menu"></div>
  <!-- widget settings popup (common + unique settings per desktop widget) -->
  <div id="widget-settings-popup"></div>
  <div id="windows-layer"></div>
  <de-dock></de-dock>
  <de-launcher></de-launcher>
  <de-quicksettings></de-quicksettings>
  <de-calendar></de-calendar>
</div>`;

// Theme data model (verbatim from original)
const THEMES = {
  Midnight: {
    dark: { url: 'https://images.pexels.com/photos/31622977/pexels-photo-31622977.jpeg', bg: '#24283b', text: '#f0ecff', dots: ['#7aa2f7', '#bb9af7', '#c0caf5', '#8b6fff'] },
    light: { url: 'https://images.pexels.com/photos/31622978/pexels-photo-31622978.jpeg', bg: '#e6e6fa', text: '#1a1530', dots: ['#7aa2f7', '#bb9af7', '#8b6fff', '#c0caf5'] },
    accent: '#8b6fff'
  },
  Cyberpunk: {
    dark: { url: 'https://images.pexels.com/photos/38184044/pexels-photo-38184044.jpeg', bg: '#1a0b1a', text: '#ffffff', dots: ['#ff0055', '#00e5ff', '#ffffff', '#ff007a'] },
    light: { url: 'https://images.pexels.com/photos/38184045/pexels-photo-38184045.jpeg', bg: '#ffe6f0', text: '#1a0b1a', dots: ['#ff0055', '#00e5ff', '#ff007a', '#ffffff'] },
    accent: '#ff007a'
  },
  Sunny: {
    dark: { url: '', bg: '#333333', text: '#fdfcdc', dots: ['#ffb703', '#fb8500', '#fdfcdc', '#ffb703'] },
    light: { url: '', bg: '#fdfcdc', text: '#333333', dots: ['#ffb703', '#fb8500', '#333333', '#ffb703'] },
    accent: '#ffb703'
  }
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

class DeShell extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    requestAnimationFrame(() => this._init());
  }

  _init() {
    this._initIcons = () => renderIcons(this._root);
    this._initIcons();

    // child refs
    this._dock = this._root.querySelector('de-dock');
    this._launcher = this._root.querySelector('de-launcher');
    this._qs = this._root.querySelector('de-quicksettings');
    this._cal = this._root.querySelector('de-calendar');
    this._windowsLayer = this._root.getElementById('windows-layer');
    this._desktopWidgets = this._root.getElementById('desktop-widgets');
    this._desktopDropPreview = this._root.getElementById('desktop-drop-preview');
    this._gridOverlay = this._root.getElementById('grid-overlay');
    this._snapGuides = this._root.getElementById('snap-guides');
    this._selectionRect = this._root.getElementById('selection-rect');
    this._contextMenu = this._root.getElementById('widget-context-menu');
    this._settingsPopup = this._root.getElementById('widget-settings-popup');
    this._selectedWidgets = new Set(); // selected desktop widget ids
    this._widgetZTop = 10; // z-order counter for desktop widgets

    // desktop-form transformer widgets (floating panels)
    this._renderDesktopWidgets();
    this._unsubDesktopWidgets = onWidgets(() => this._renderDesktopWidgets());
    // desktop is a drop target for widgets (drag from the bento grid or the bar)
    this._wireDesktopDrop();
    // desktop selection rectangle (drag on empty desktop) + context menu close
    this._wireDesktopSelection();

    // subscribe to window-service
    this._unsubWindows = onWindowsChange((state) => this._renderWindows(state));
    this._renderWindows(windowService.state);

    // re-render windows on viewport resize so tiling tiles recompute
    this._resizeHandler = () => this._renderWindows(windowService.state);
    window.addEventListener('resize', this._resizeHandler);

    // subscribe to theme-service
    this._unsubTheme = onTheme((state) => this._applyTheme(state));
    this._applyTheme(themeService.state);

    // subscribe to ui.popover bus
    this._unsubBus = bus.on('ui.popover', (payload) => this._handlePopover(payload));

    // escape closes any open popover
    this._keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (this._anyOpen()) commands.execute('ui.closeAllPopovers');
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // late icon refresh (CDN may load late)
    setTimeout(() => this._initIcons(), 50);
  }

  _anyOpen() {
    return (
      (this._launcher && this._launcher.isOpen()) ||
      (this._qs && this._qs.isOpen()) ||
      (this._cal && this._cal.isOpen()) ||
      (this._dock && this._dock.isThemePopupOpen()) ||
      (this._dock && this._dock.isWidgetPopoverOpen()) ||
      this.isSettingsPopupOpen()
    );
  }

  _renderWindows(state) {
    const layer = this._windowsLayer;
    if (!layer) return;
    // track only <de-app-window> elements (NOT tile-dividers) by windowId
    const existing = new Map();
    Array.from(layer.children).forEach((el) => {
      if (el.dataset.windowId) existing.set(el.dataset.windowId, el);
    });

    const area = this._tilingArea();
    const activeWs = workspaceService.activeId;
    const layout = state.layoutMode;

    // tiles are computed only for the ACTIVE workspace's non-minimized windows
    const activeWindows = state.windows.filter((w) => !w.minimized);
    const tiling = (layout === 'horizontal' || layout === 'vertical');
    const tiles = tiling ? this._computeTiles(activeWindows, area, layout) : null;
    let tileIdx = 0;

    // iterate ALL windows (across every workspace) so elements persist on switch
    for (const w of windowService.allWindows) {
      let el = existing.get(w.id);
      if (!el) {
        el = document.createElement('de-app-window');
        el.dataset.windowId = w.id;
        el.dataset.appId = w.appId;
        if (w.titlebar === false) el.setAttribute('data-notitlebar', '');
        el.setAttribute('title', w.title || w.appId);
        if (w.icon) el.setAttribute('icon', w.icon);
        if (w.appId === 'files') {
          el.appendChild(document.createElement('fe-app'));
        } else {
          const ph = document.createElement('de-placeholder-app');
          ph.dataset.appId = w.appId;
          el.appendChild(ph);
        }
        layer.appendChild(el);
      } else {
        existing.delete(w.id);
        el.setAttribute('title', w.title || w.appId);
        if (w.icon) el.setAttribute('icon', w.icon);
      }

      const inActiveWs = (w.workspaceId === activeWs);
      // hide windows that belong to other workspaces (element is kept alive)
      if (!inActiveWs) {
        el.style.display = 'none';
        continue;
      }

      el.style.zIndex = String(w.z);
      el.classList.toggle('focused', state.focusedId === w.id);
      el.setAttribute('data-layout', layout);
      if (w.maximized) el.setAttribute('data-maximized', '');
      else el.removeAttribute('data-maximized');
      el.style.display = w.minimized ? 'none' : '';

      let r;
      if (w.maximized) {
        r = { x: area.x, y: area.y, w: area.w, h: area.h };
      } else if (tiling) {
        if (w.minimized) { r = null; }
        else { r = tiles[tileIdx] || { x: area.x, y: area.y, w: area.w, h: area.h }; tileIdx++; }
      } else {
        r = { x: w.x ?? 80, y: w.y ?? 24, w: w.w ?? 1000, h: w.h ?? 620 };
      }
      if (r) {
        el.style.setProperty('--win-x', r.x + 'px');
        el.style.setProperty('--win-y', r.y + 'px');
        el.style.setProperty('--win-w', r.w + 'px');
        el.style.setProperty('--win-h', r.h + 'px');
      }
    }

    // remove <de-app-window> elements whose windows no longer exist anywhere
    for (const [, el] of existing) el.remove();

    // draggable dividers between adjacent tiles (horizontal / vertical only)
    this._renderTilingDividers(tiling ? tiles : [], activeWindows, layout, area);

    // mark active app on dock (active workspace only)
    if (this._dock) {
      const focused = state.windows.find((w) => w.id === state.focusedId);
      if (focused) this._dock.setActiveApp(focused.appId);
      else this._dock.clearActiveApp();
    }
  }

  /** the area above the dock where tiled windows live */
  _tilingArea() {
    const vw = window.innerWidth, vh = window.innerHeight;
    return { x: 8, y: 8, w: vw - 16, h: vh - 8 - 84 }; // 84 = dock + gap
  }

  /**
   * Tiling tiles using each window's tileRatio (so dragging a divider resizes
   * adjacent tiles). 'horizontal' = one row of N columns; 'vertical' = one
   * column of N rows; small gaps between tiles.
   */
  _computeTiles(windows, area, layout) {
    if (!windows.length) return [];
    const gap = 6;
    const ratios = windows.map((w) => w.tileRatio || 1);
    const sumR = ratios.reduce((a, b) => a + b, 0) || 1;
    const tiles = [];
    if (layout === 'horizontal') {
      const usableW = area.w - (windows.length - 1) * gap;
      let cursor = area.x;
      windows.forEach((w, i) => {
        const tw = usableW * (ratios[i] / sumR);
        tiles.push({ x: cursor, y: area.y, w: tw, h: area.h });
        cursor += tw + gap;
      });
    } else { // vertical
      const usableH = area.h - (windows.length - 1) * gap;
      let cursor = area.y;
      windows.forEach((w, i) => {
        const th = usableH * (ratios[i] / sumR);
        tiles.push({ x: area.x, y: cursor, w: area.w, h: th });
        cursor += th + gap;
      });
    }
    return tiles;
  }

  /**
   * Render / update draggable dividers between adjacent tiles. Dividers are
   * diffed by data-key (a|b) so they persist across re-renders (e.g. while
   * dragging one, the ratios change and tiles recompute, but the divider
   * element stays and just repositions).
   */
  _renderTilingDividers(tiles, activeWindows, layout, area) {
    const layer = this._windowsLayer;
    if (!layer) return;
    const existing = new Map();
    layer.querySelectorAll('.tile-divider').forEach((d) => existing.set(d.dataset.key, d));
    const wanted = new Set();

    for (let i = 0; i < activeWindows.length - 1; i++) {
      const a = activeWindows[i], b = activeWindows[i + 1];
      const key = a.id + '|' + b.id;
      wanted.add(key);
      let div = existing.get(key);
      if (!div) {
        div = document.createElement('div');
        div.dataset.key = key;
        div.dataset.a = a.id;
        div.dataset.b = b.id;
        this._wireDivider(div);
        layer.appendChild(div);
      }
      div.className = 'tile-divider ' + (layout === 'horizontal' ? 'h' : 'v');
      const ta = tiles[i];
      const gap = 6;
      if (layout === 'horizontal') {
        div.style.left = (ta.x + ta.w + gap / 2 - 4) + 'px';
        div.style.top = ta.y + 'px';
        div.style.width = '8px';
        div.style.height = ta.h + 'px';
      } else {
        div.style.top = (ta.y + ta.h + gap / 2 - 4) + 'px';
        div.style.left = ta.x + 'px';
        div.style.width = ta.w + 'px';
        div.style.height = '8px';
      }
    }
    for (const [key, div] of existing) if (!wanted.has(key)) div.remove();
  }

  /** wire a tile-divider drag → adjust the two adjacent windows' tileRatios */
  _wireDivider(div) {
    div.style.position = 'absolute';
    div.style.zIndex = '100';
    div.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const isH = div.classList.contains('h');
      const aId = div.dataset.a, bId = div.dataset.b;
      const ws = workspaceService.active;
      const wa = ws.windows.find((w) => w.id === aId);
      const wb = ws.windows.find((w) => w.id === bId);
      if (!wa || !wb) return;
      const ra0 = wa.tileRatio || 1, rb0 = wb.tileRatio || 1;
      const sumR = ra0 + rb0;
      const area = this._tilingArea();
      const nVis = ws.windows.filter((w) => !w.minimized).length;
      const usable = (isH ? area.w : area.h) - (nVis - 1) * 6;
      const startX = e.clientX, startY = e.clientY;
      const onMove = (ev) => {
        const d = isH ? (ev.clientX - startX) : (ev.clientY - startY);
        const delta = (d / usable) * sumR;
        let na = ra0 + delta, nb = rb0 - delta;
        const minR = 0.15 * sumR;
        if (na < minR) { na = minR; nb = sumR - minR; }
        if (nb < minR) { nb = minR; na = sumR - minR; }
        commands.execute('window.setTileRatios', { list: [{ id: aId, ratio: na }, { id: bId, ratio: nb }] });
      };
      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  /** render the desktop-placed transformer widgets as floating glass panels.
   *  Each panel has three auto-hide buttons (close, settings, compact-toggle).
   *  In COMPACT mode the panel shrinks to a small box showing the widget's BAR
   *  form (visual as it is in the bar), resize handles are removed, and the three
   *  buttons position themselves at three different borders of the small box.
   *  Common settings (opacity, always-on-top) are applied to the panel element. */
  _renderDesktopWidgets() {
    const layer = this._desktopWidgets;
    if (!layer) return;
    layer.innerHTML = '';
    const ids = widgetService.listContainer('desktop');
    const vw = window.innerWidth, vh = window.innerHeight;
    ids.forEach((id, i) => {
      const panel = document.createElement('div');
      const isCompact = widgetService.getCompactMode(id);
      panel.className = 'dw-panel' + (isCompact ? ' compact' : '');
      panel.dataset.widgetId = id;
      const g = widgetService.getDesktopSize(id);
      // ── position + size ──
      if (isCompact) {
        // compact: size to the bar form (bar width × bar height + small padding)
        const bw = widgetService.getBarWidth(id);
        const left = (g && g.left != null) ? g.left : (vw - bw - 16 - i * 12);
        const top = (g && g.top != null) ? g.top : (16 + i * 12);
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        panel.style.width = (bw + 12) + 'px';   // bar width + horizontal padding
        panel.style.height = '42px';             // bar height (34) + vertical padding
      } else if (g && g.left != null) {
        // persisted geometry (size + position from a prior move/resize)
        panel.style.left = g.left + 'px'; panel.style.top = g.top + 'px';
        panel.style.width = g.w + 'px'; panel.style.height = g.h + 'px';
      } else {
        // first placement: cascade in the upper-right area
        const w0 = g ? g.w : 320;
        panel.style.left = (vw - w0 - 16 - i * 12) + 'px';
        panel.style.top = (16 + i * 12) + 'px';
        if (g) { panel.style.width = g.w + 'px'; panel.style.height = g.h + 'px'; }
      }
      panel.style.maxHeight = (vh - 120) + 'px';
      // compact panels need overflow:visible so the auto-hide buttons (positioned
      // outside the small box at -10px corners) aren't clipped
      panel.style.overflow = isCompact ? 'visible' : 'auto';
      // ── the widget itself: bar form in compact mode, desktop form otherwise ──
      const w = document.createElement('tf-widget');
      w.setAttribute('data-id', id);
      w.setAttribute('data-container', isCompact ? 'bar' : 'desktop');
      panel.appendChild(w);
      // ── resize handles (only in non-compact mode) ──
      if (!isCompact) {
        makeResizable(panel, {
          minW: 200, minH: 100,
          onChange: () => widgetService.setDesktopSize(id, panel.offsetWidth, panel.offsetHeight, panel.offsetLeft, panel.offsetTop),
          snap: (geom, ev, dir) => this._snapResize(geom, ev, dir, panel),
          onStart: () => { this._closeWidgetSettings(); this._hideContextMenu(); },
          onEnd: () => { this._hideGrid(); this._hideGuides(); },
        });
      }
      // ── the three auto-hide control buttons ──
      // 1. close (×) — removes the widget from the desktop
      const close = document.createElement('div');
      close.className = 'dw-btn dw-close';
      close.innerHTML = '×';
      close.title = 'Remove widget';
      close.addEventListener('click', (ev) => { ev.stopPropagation(); widgetService.removeFromContainer(id, 'desktop'); });
      panel.appendChild(close);
      // 2. settings (⚙) — opens the settings popup (common + unique settings)
      const settings = document.createElement('div');
      settings.className = 'dw-btn dw-settings';
      settings.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
      settings.title = 'Widget settings';
      settings.addEventListener('click', (ev) => { ev.stopPropagation(); this._openWidgetSettings(panel, id, settings); });
      panel.appendChild(settings);
      // 3. compact toggle (▢) — switches between full desktop form and bar-form box
      const compact = document.createElement('div');
      compact.className = 'dw-btn dw-compact' + (isCompact ? ' active' : '');
      compact.innerHTML = isCompact
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
      compact.title = isCompact ? 'Expand to full widget' : 'Compact mode';
      compact.addEventListener('click', (ev) => {
        ev.stopPropagation();
        widgetService.setCompactMode(id, !isCompact);
      });
      panel.appendChild(compact);
      // ── apply common settings (opacity, always-on-top) ──
      this._applyWidgetSettings(panel, id);
      // ── wire drag/move/context-menu ──
      this._wirePanelMove(panel, id);
      layer.appendChild(panel);
    });
  }

  /** apply common settings (opacity, always-on-top) to a desktop panel */
  _applyWidgetSettings(panel, id) {
    const s = widgetService.getSettings(id);
    panel.style.opacity = String((s.opacity ?? 100) / 100);
    if (s.alwaysOnTop) panel.style.zIndex = String(++this._widgetZTop);
    // else: leave zIndex as-is (don't clobber the selection z-order)
  }

  /** wire a desktop panel's body drag with Ctrl grid-snap + Shift widget-snap +
   *  multi-selection (Ctrl+click) + context menu (right-click) + drag-to-bar.
   *  The overBar check runs CONTINUOUSLY during a move so the user can drag a
   *  desktop panel DOWN into the bar to dock it (not just when the drag starts
   *  over the bar). */
  _wirePanelMove(panel, id) {
    panel.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.rz-handle, .dw-btn, button, input, a, select')) return;
      if (e.button === 2) return; // right-click handled by contextmenu
      e.preventDefault();
      // close any open settings popup / context menu when starting a drag
      this._closeWidgetSettings();
      this._hideContextMenu();
      const sx = e.clientX, sy = e.clientY;
      const startLeft = panel.offsetLeft, startTop = panel.offsetTop;
      const isCompact = panel.classList.contains('compact');
      const vw = window.innerWidth, vh = window.innerHeight;
      const dockEl = this._root.querySelector('de-dock');
      const dockContainer = dockEl && dockEl.shadowRoot && dockEl.shadowRoot.getElementById('dock-container');
      const overBar = (y) => { if (!dockContainer) return false; const r = dockContainer.getBoundingClientRect(); return y >= r.top - 10 && y <= r.bottom + 10; };
      let mode = 'idle';
      const ctrlAtDown = e.ctrlKey || e.metaKey;

      const enterWidgetDrag = () => {
        // switch from in-desktop move → cross-container widget drag (drop on bar)
        mode = 'widget';
        panel.classList.add('dragging');
        // restore the panel to its start position so it doesn't visually jump
        // (the bar/desktop outline preview will show where it will land)
        panel.style.left = startLeft + 'px';
        panel.style.top = startTop + 'px';
        this._hideGrid(); this._hideGuides();
        startWidgetDrag(id, 'desktop');
      };

      const move = (ev) => {
        if (mode === 'idle') {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
          // if the drag STARTS over the bar, go straight to widget-drag mode
          if (overBar(ev.clientY)) { enterWidgetDrag(); return; }
          mode = 'move';
          if (!ctrlAtDown) this._clearSelection();
          this._selectOnly(panel, id);
        }
        // CONTINUOUS check: if a desktop move drags the cursor INTO the bar,
        // switch to widget-drag mode so the user can drop it on the bar
        if (mode === 'move' && overBar(ev.clientY)) { enterWidgetDrag(); return; }
        if (mode !== 'move') return;
        let nx = startLeft + (ev.clientX - sx);
        let ny = startTop + (ev.clientY - sy);
        // Ctrl → grid snap + show dot grid
        if (ev.ctrlKey || ev.metaKey) {
          this._showGrid();
          nx = snapToGrid(nx); ny = snapToGrid(ny);
        } else this._hideGrid();
        // Shift → snap to other widgets + show guides
        if (ev.shiftKey) {
          const others = this._getOtherPanels(panel);
          const g = findSnapGuides({ left: nx, top: ny, w: panel.offsetWidth, h: panel.offsetHeight }, others);
          nx += g.dx; ny += g.dy;
          this._showGuides(g);
        } else this._hideGuides();
        nx = Math.max(4, Math.min(vw - panel.offsetWidth - 4, nx));
        ny = Math.max(4, Math.min(vh - 100, ny));
        panel.style.left = nx + 'px';
        panel.style.top = ny + 'px';
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        panel.classList.remove('dragging');
        this._hideGrid(); this._hideGuides();
        if (mode === 'move') {
          if (isCompact) {
            // COMPACT MODE: only persist the POSITION (left, top). The panel's
            // current offsetWidth/offsetHeight are the compact bar-form size
            // (e.g. 64×42), NOT the full desktop size. Preserve the original
            // desktop w/h so toggling compact off restores the correct dimensions.
            const g = widgetService.getDesktopSize(id);
            const dw = g ? g.w : 280;
            const dh = g ? g.h : 180;
            widgetService.setDesktopSize(id, dw, dh, panel.offsetLeft, panel.offsetTop);
          } else {
            widgetService.setDesktopSize(id, panel.offsetWidth, panel.offsetHeight, panel.offsetLeft, panel.offsetTop);
          }
        }
        if (mode === 'idle') { // click without drag
          if (ctrlAtDown) this._toggleSelection(panel, id);
          else { this._clearSelection(); this._selectOnly(panel, id); }
        }
        // mode === 'widget' → the widget-drag bus handler takes over (drop on bar/desktop)
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
    // right-click → context menu (align/distribute/sizing)
    panel.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!panel.classList.contains('selected')) { this._clearSelection(); this._selectOnly(panel, id); }
      this._showContextMenu(e.clientX, e.clientY);
    });
  }

  // --- grid / guides ---
  /** Show the dot-grid overlay. Builds the SVG dot field once (on first show)
   *  using two patterns: a MINOR dot every 10px (subtle, border-3 color) and a
   *  MAJOR dot every 20px (bright accent) drawn on top at the intersection
   *  corners of the sub-grid. SVG gives crisp circles (no blurry gradient
   *  halos). CSS variables in the fill keep the dots theme-aware. */
  _showGrid() {
    if (!this._gridOverlay) return;
    this._gridOverlay.classList.add('visible');
    if (this._gridBuilt) return;
    this._gridOverlay.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <pattern id="grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="0.6" style="fill: var(--border-3)"/>
          </pattern>
          <pattern id="grid-major" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="0" cy="0" r="2" style="fill: var(--accent-strong)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-minor)"/>
        <rect width="100%" height="100%" fill="url(#grid-major)"/>
      </svg>`;
    this._gridBuilt = true;
  }
  _hideGrid() { if (this._gridOverlay) this._gridOverlay.classList.remove('visible'); }
  /** DRAG guides: full-height/width red lines at each snap position. */
  _showGuides(g) {
    const el = this._snapGuides; if (!el) return;
    el.innerHTML = '';
    el.classList.add('visible');
    for (const x of g.v) { const d = document.createElement('div'); d.className = 'guide-v'; d.style.left = x + 'px'; el.appendChild(d); }
    for (const y of g.h) { const d = document.createElement('div'); d.className = 'guide-h'; d.style.top = y + 'px'; el.appendChild(d); }
  }
  /** RESIZE guides: SHORT accent-colored gizmos limited to the panel's resizing
   *  edge only (not full-screen crosshairs). Vertical guides span the panel's
   *  height; horizontal guides span the panel's width. This makes it clear which
   *  edge is being aligned without cluttering the whole desktop. */
  _showResizeGuides(g, geom, dir) {
    const el = this._snapGuides; if (!el) return;
    el.innerHTML = '';
    el.classList.add('visible');
    const hasE = dir.includes('e'), hasW = dir.includes('w');
    const hasN = dir.includes('n'), hasS = dir.includes('s');
    if (hasE || hasW) {
      for (const x of g.v) {
        const d = document.createElement('div');
        d.className = 'guide-v guide-resize';
        d.style.left = x + 'px';
        d.style.top = geom.y + 'px';
        d.style.height = geom.h + 'px';
        d.style.bottom = 'auto';
        el.appendChild(d);
      }
    }
    if (hasN || hasS) {
      for (const y of g.h) {
        const d = document.createElement('div');
        d.className = 'guide-h guide-resize';
        d.style.top = y + 'px';
        d.style.left = geom.x + 'px';
        d.style.width = geom.w + 'px';
        d.style.right = 'auto';
        el.appendChild(d);
      }
    }
  }
  _hideGuides() { if (this._snapGuides) { this._snapGuides.classList.remove('visible'); this._snapGuides.innerHTML = ''; } }

  /** snap a resize to the grid (Ctrl) or other widgets (Shift).
   *  Direction-aware: only the edge(s) being resized are snapped, and only
   *  SHORT gizmos on the resizing side(s) are shown (not full-screen crosshairs). */
  _snapResize({ x, y, w, h }, ev, dir, panel) {
    const hasE = dir.includes('e'), hasW = dir.includes('w');
    const hasN = dir.includes('n'), hasS = dir.includes('s');
    if (ev.ctrlKey || ev.metaKey) {
      this._showGrid();
      // snap each resizing edge to the grid (the opposite edge stays put)
      if (hasE) w = snapToGrid(x + w) - x;
      if (hasS) h = snapToGrid(y + h) - y;
      if (hasW) { const sx = snapToGrid(x); w += x - sx; x = sx; }
      if (hasN) { const sy = snapToGrid(y); h += y - sy; y = sy; }
    } else this._hideGrid();
    if (ev.shiftKey) {
      const others = this._getOtherPanels(panel);
      // use the resize-specific snap finder: only checks the MOVING edge(s),
      // so the snap offset + guide position correspond to the actual resizing
      // edge (not a static edge on the opposite side)
      const g = findResizeSnapGuides({ left: x, top: y, w, h }, others, dir);
      // apply the snap offset to the edge(s) being resized (not the opposite)
      if (hasW) { x += g.dx; w -= g.dx; }
      else if (hasE) { w += g.dx; }
      if (hasN) { y += g.dy; h -= g.dy; }
      else if (hasS) { h += g.dy; }
      // SHORT edge gizmos: only on the resizing side(s), spanning the panel's
      // current edge (not full-screen crosshairs)
      this._showResizeGuides(g, { x, y, w, h }, dir);
    } else this._hideGuides();
    return { x, y, w: Math.max(200, w), h: Math.max(100, h) };
  }

  // --- selection ---
  _getOtherPanels(exclude) {
    return Array.from(this._desktopWidgets.children)
      .filter((p) => p !== exclude)
      .map((p) => ({ left: p.offsetLeft, top: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight }));
  }
  _selectOnly(panel, id) {
    this._clearSelection();
    panel.classList.add('selected');
    this._selectedWidgets.add(id);
    // raise to top z-order so the last-selected widget sits above the others
    panel.style.zIndex = String(++this._widgetZTop);
  }
  _toggleSelection(panel, id) {
    if (panel.classList.contains('selected')) { panel.classList.remove('selected'); this._selectedWidgets.delete(id); }
    else {
      panel.classList.add('selected');
      this._selectedWidgets.add(id);
      // raise to top z-order so the most-recently-selected widget is on top
      panel.style.zIndex = String(++this._widgetZTop);
    }
  }
  _clearSelection() {
    this._desktopWidgets.querySelectorAll('.dw-panel.selected').forEach((p) => p.classList.remove('selected'));
    this._selectedWidgets.clear();
  }

  // --- context menu (align / distribute) ---
  _showContextMenu(x, y) {
    const cm = this._contextMenu; if (!cm) return;
    const n = this._selectedWidgets.size;
    const items = [
      { label: 'Align Left', fn: () => this._applyAlign('left') },
      { label: 'Align Center H', fn: () => this._applyAlign('centerH') },
      { label: 'Align Right', fn: () => this._applyAlign('right') },
      { label: 'Align Top', fn: () => this._applyAlign('top') },
      { label: 'Align Center V', fn: () => this._applyAlign('centerV') },
      { label: 'Align Bottom', fn: () => this._applyAlign('bottom') },
      { sep: true },
      { label: 'Distribute Horizontally', fn: () => this._applyDistribute('h') },
      { label: 'Distribute Vertically', fn: () => this._applyDistribute('v') },
      { sep: true },
      { label: 'Match Width', fn: () => this._applySizing('w') },
      { label: 'Match Height', fn: () => this._applySizing('h') },
      { label: 'Equal Size', fn: () => this._applySizing('wh') },
    ];
    cm.innerHTML = '';
    const lbl = document.createElement('div'); lbl.className = 'cm-label'; lbl.textContent = `${n} selected`;
    cm.appendChild(lbl);
    const grp = document.createElement('div'); grp.className = 'cm-group';
    for (const it of items) {
      if (it.sep) { const s = document.createElement('div'); s.className = 'cm-sep'; grp.appendChild(s); continue; }
      const d = document.createElement('div'); d.className = 'cm-item'; d.textContent = it.label;
      d.addEventListener('click', () => { it.fn(); this._hideContextMenu(); });
      grp.appendChild(d);
    }
    cm.appendChild(grp);
    cm.style.left = x + 'px'; cm.style.top = y + 'px';
    cm.classList.add('visible');
  }
  _hideContextMenu() { if (this._contextMenu) this._contextMenu.classList.remove('visible'); }

  // ── widget settings popup (common + unique settings) ──
  /** open the settings popup for widget `id`, anchored above the settings button.
   *  Renders common settings (opacity, always-on-top) + the widget's own unique
   *  settings (format, volume, location, etc.). Joins the popup system so opening
   *  it closes other popovers. */
  _openWidgetSettings(panel, id, anchorEl) {
    const pop = this._settingsPopup; if (!pop) return;
    const def = widgetService.widgets[id];
    if (!def) return;
    // toggle: if already open for this widget, close
    if (this._settingsWidgetId === id && pop.classList.contains('visible')) {
      this._closeWidgetSettings();
      return;
    }
    // join the popup system: close other popovers (launcher, qs, cal, theme, widget)
    bus.emit('ui.popover', { which: 'settings', action: 'open' });
    this._settingsWidgetId = id;
    const schema = widgetService.getSettingsSchema(id);
    // build popup content
    pop.innerHTML = '';
    // header
    const head = document.createElement('div');
    head.className = 'sp-head';
    head.innerHTML = `<span class="sp-title"><i data-lucide="${def.icon}"></i>${def.name} settings</span><span class="sp-close" title="Close">×</span>`;
    head.querySelector('.sp-close').addEventListener('click', () => this._closeWidgetSettings());
    pop.appendChild(head);
    // common settings section
    const commonSchema = schema.filter((s) => s.group === 'common');
    if (commonSchema.length) pop.appendChild(buildSettingsSection('Common', commonSchema, id));
    // widget-specific settings section
    const uniqueSchema = schema.filter((s) => s.group !== 'common');
    if (uniqueSchema.length) pop.appendChild(buildSettingsSection(def.name, uniqueSchema, id));
    // position above the anchor (settings button)
    const r = anchorEl.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let left = r.left + r.width / 2 - (pr.width || 220) / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - (pr.width || 220) - 8));
    let top = r.top - 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    pop.style.transformOrigin = 'bottom center';
    pop.classList.add('visible');
    requestAnimationFrame(() => {
      const actualH = pop.offsetHeight;
      if (top - actualH < 8) {
        pop.style.top = (r.bottom + 8) + 'px';
        pop.style.transformOrigin = 'top center';
      } else {
        pop.style.top = (top - actualH) + 'px';
      }
    });
    renderIcons(this._root);
  }
  _closeWidgetSettings() {
    if (!this._settingsPopup) return;
    this._settingsPopup.classList.remove('visible');
    this._settingsWidgetId = null;
  }
  isSettingsPopupOpen() { return !!this._settingsPopup && this._settingsPopup.classList.contains('visible'); }

  _getSelectedPanels() {
    return Array.from(this._desktopWidgets.querySelectorAll('.dw-panel.selected'))
      .map((p) => ({ el: p, id: p.querySelector('tf-widget')?.dataset.id, left: p.offsetLeft, top: p.offsetTop, w: p.offsetWidth, h: p.offsetHeight }));
  }
  _applyAlign(alignment) {
    const panels = this._getSelectedPanels(); if (panels.length < 2) return;
    const result = alignWidgets(panels, alignment);
    panels.forEach((p, i) => {
      p.el.style.left = result[i].left + 'px'; p.el.style.top = result[i].top + 'px';
      widgetService.setDesktopSize(p.id, p.w, p.h, result[i].left, result[i].top);
    });
  }
  _applyDistribute(axis) {
    const panels = this._getSelectedPanels(); if (panels.length < 3) return;
    const result = distributeWidgets(panels, axis);
    panels.forEach((p, i) => {
      p.el.style.left = result[i].left + 'px'; p.el.style.top = result[i].top + 'px';
      widgetService.setDesktopSize(p.id, p.w, p.h, result[i].left, result[i].top);
    });
  }
  /** match width/height/equal-size of selected panels to the first selected */
  _applySizing(mode) {
    const panels = this._getSelectedPanels(); if (panels.length < 2) return;
    const ref = panels[0];
    panels.forEach((p) => {
      const nw = (mode === 'w' || mode === 'wh') ? ref.w : p.w;
      const nh = (mode === 'h' || mode === 'wh') ? ref.h : p.h;
      p.el.style.width = nw + 'px'; p.el.style.height = nh + 'px';
      widgetService.setDesktopSize(p.id, nw, nh, p.left, p.top);
    });
  }

  /** drag-select rectangle on empty desktop. Selection is LIVE: as the rectangle
   *  is dragged, the panels overlapping it are selected immediately (not after
   *  release). Shift/Ctrl at pointerdown makes the drag ADDITIVE (keeps the
   *  existing selection and adds newly swept panels to it). */
  _wireDesktopSelection() {
    const desktop = this._root.querySelector('.desktop');
    const rect = this._selectionRect;
    if (!desktop || !rect) return;
    desktop.addEventListener('pointerdown', (e) => {
      // only start selection on truly empty desktop (not on panels, dock, popovers)
      if (e.target.closest('.dw-panel, de-dock, de-launcher, de-quicksettings, de-calendar, #widget-context-menu, .tile-divider, #widget-popover, .rz-handle')) return;
      if (e.button !== 0) return; // left button only
      e.preventDefault(); // stop native text/image drag so the rectangle stays smooth
      const sx = e.clientX, sy = e.clientY;
      const additive = e.shiftKey || e.ctrlKey || e.metaKey;
      // snapshot the existing selection so additive drags can keep it as a base
      const startSel = additive ? new Set(this._selectedWidgets) : new Set();
      let dragging = false;
      const move = (ev) => {
        if (!dragging) {
          // tiny threshold so a simple click doesn't trigger a 1px rectangle
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 2) return;
          dragging = true;
          rect.classList.add('visible');
        }
        const x = Math.min(sx, ev.clientX), y = Math.min(sy, ev.clientY);
        const w = Math.abs(ev.clientX - sx), h = Math.abs(ev.clientY - sy);
        rect.style.left = x + 'px'; rect.style.top = y + 'px';
        rect.style.width = w + 'px'; rect.style.height = h + 'px';
        // LIVE selection: hit-test every panel against the current rectangle and
        // update the selected set immediately while dragging.
        this._liveSelectRect(x, y, w, h, startSel);
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        rect.classList.remove('visible');
        rect.style.width = '0'; rect.style.height = '0';
        // simple click on empty desktop (no drag) → clear selection unless additive
        if (!dragging && !additive) this._clearSelection();
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
    // close context menu + settings popup on outside click
    document.addEventListener('click', (e) => {
      if (this._contextMenu?.classList.contains('visible') && !e.composedPath().includes(this._contextMenu)) this._hideContextMenu();
      if (this._settingsPopup?.classList.contains('visible') && !e.composedPath().includes(this._settingsPopup)) this._closeWidgetSettings();
    });
  }

  /** live hit-test: select every desktop panel overlapping the rectangle. The
   *  `base` set is the selection to preserve (additive drag) — panels NOT in the
   *  rectangle keep their base selection state. Panels that just became selected
   *  (transitioned from unselected → selected) are raised to the top z-order so
   *  the most-recently-swept panel sits above the others, matching the
   *  click-selection z-order behavior. */
  _liveSelectRect(x, y, w, h, base) {
    const next = new Set(base);
    this._desktopWidgets.querySelectorAll('.dw-panel').forEach((p) => {
      const px = p.offsetLeft, py = p.offsetTop, pw = p.offsetWidth, ph = p.offsetHeight;
      const overlaps = px < x + w && px + pw > x && py < y + h && py + ph > y;
      if (overlaps) {
        const id = p.querySelector('tf-widget')?.dataset.id;
        if (id) next.add(id);
      }
    });
    // apply diff: toggle 'selected' on each panel to match `next`. Raise z-index
    // of any panel that just transitioned unselected → selected.
    this._desktopWidgets.querySelectorAll('.dw-panel').forEach((p) => {
      const id = p.querySelector('tf-widget')?.dataset.id;
      const wasSel = p.classList.contains('selected');
      const isSel = next.has(id);
      p.classList.toggle('selected', isSel);
      if (!wasSel && isSel) p.style.zIndex = String(++this._widgetZTop);
    });
    this._selectedWidgets = next;
  }

  /** make the desktop background a drop target for the pointer-based widget drag
   *  (bus-coordinated). Instead of a full-desktop hover overlay, shows a SIZED
   *  dashed outline preview that follows the cursor — its dimensions match the
   *  widget's desktop-form (persisted geometry if any, else default for that
   *  widget kind) — so the user sees exactly where & how big the panel will land. */
  _wireDesktopDrop() {
    const desktop = this._root.querySelector('.desktop');
    const preview = this._desktopDropPreview;
    if (!desktop || !preview) return;
    // the drop area = the desktop excluding the dock strip (bottom 84px) so a
    // drop near the dock doesn't accidentally target the desktop.
    const overDesktop = (x, y) => {
      const r = desktop.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom - 84;
    };
    this._unsubDeskDragMove = bus.on('widget.dragmove', ({ x, y, id }) => {
      if (!id || !overDesktop(x, y)) {
        preview.classList.remove('visible');
        return;
      }
      const size = widgetService.getDesktopPreviewSize(id);
      // center the preview on the cursor, clamped to the desktop bounds
      const nx = Math.max(4, Math.min(window.innerWidth - size.w - 4, x - size.w / 2));
      const ny = Math.max(4, Math.min(window.innerHeight - 100, y - size.h / 2));
      preview.style.left = nx + 'px';
      preview.style.top = ny + 'px';
      preview.style.width = size.w + 'px';
      preview.style.height = size.h + 'px';
      preview.classList.add('visible');
    });
    this._unsubDeskDragEnd = bus.on('widget.dragend', ({ x, y, id, from }) => {
      preview.classList.remove('visible');
      if (overDesktop(x, y)) {
        if (from === 'palette') {
          // pre-set the desktop geometry so the new panel lands at the cursor
          // (where the outline preview was), instead of the default cascade.
          const size = widgetService.getDesktopPreviewSize(id);
          const nx = Math.max(4, Math.min(window.innerWidth - size.w - 4, x - size.w / 2));
          const ny = Math.max(4, Math.min(window.innerHeight - 100, y - size.h / 2));
          widgetService.setDesktopSize(id, size.w, size.h, nx, ny);
          widgetService.addToContainer(id, 'desktop');
        }
        else if (from === 'bar') widgetService.moveWidget(id, 'bar', 'desktop');
        else if (from === 'desktop') {
          // reposition the desktop panel to the drop point (drag-to-move via the
          // widget-drag preview — same UX as dragging to the bar)
          const tw = this._desktopWidgets.querySelector(`tf-widget[data-id="${id}"]`);
          const panel = tw && tw.closest('.dw-panel');
          if (panel) {
            const w = panel.offsetWidth, h = panel.offsetHeight;
            const nx = Math.max(4, Math.min(window.innerWidth - w - 4, x - w / 2));
            const ny = Math.max(4, Math.min(window.innerHeight - 100, y - h / 2));
            panel.style.left = nx + 'px';
            panel.style.top = ny + 'px';
            widgetService.setDesktopSize(id, w, h, nx, ny);
          }
        }
      }
    });
  }

  _applyTheme(state) {
    const theme = THEMES[state.theme];
    if (!theme) return;
    const isLight = state.mode === 'light';
    // toggle light class on host
    this.classList.toggle('light', isLight);
    // write --accent-* on this.style so children inherit
    const accent = theme.accent;
    this.style.setProperty('--accent-strong', accent);
    const rgb = hexToRgb(accent);
    if (rgb) {
      this.style.setProperty('--accent', `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      this.style.setProperty('--accent-light', `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
      this.style.setProperty('--accent-glow', `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    }
    // wallpaper
    this._updateWallpaper(theme, isLight);
  }

  _updateWallpaper(theme, isLight) {
    const url = isLight ? theme.light.url : theme.dark.url;
    const img = this._root.getElementById('wallpaperImg');
    if (!img) return;
    if (url) {
      const temp = new Image();
      temp.onload = () => {
        img.src = url;
        img.style.opacity = '0.85';
      };
      temp.src = url;
    } else {
      img.style.opacity = '0';
    }
  }

  /** close every popover EXCEPT the one named `which` (null = close all) */
  _closeAllExcept(which) {
    if (which !== 'launcher' && this._launcher) this._launcher.close();
    if (which !== 'qs' && this._qs) this._qs.close();
    if (which !== 'cal' && this._cal) this._cal.close();
    if (which !== 'theme' && this._dock) this._dock.closeThemePopup();
    if (which !== 'widget' && this._dock) this._dock._closeWidgetPopover();
    if (which !== 'settings') this._closeWidgetSettings();
  }

  _handlePopover({ which, action, anchor } = {}) {
    if (action === 'closeAll') { this._closeAllExcept(null); return; }
    if (action === 'toggle') {
      const wasOpen = this._isOpen(which);
      this._closeAllExcept(which);
      if (!wasOpen) this._open(which, anchor);
    } else if (action === 'open') {
      this._closeAllExcept(which);
      this._open(which, anchor);
    } else if (action === 'close') {
      this._close(which);
    }
  }

  _isOpen(which) {
    if (which === 'launcher') return this._launcher && this._launcher.isOpen();
    if (which === 'qs') return this._qs && this._qs.isOpen();
    if (which === 'cal') return this._cal && this._cal.isOpen();
    if (which === 'theme') return this._dock && this._dock.isThemePopupOpen();
    if (which === 'widget') return this._dock && this._dock.isWidgetPopoverOpen();
    return false;
  }

  _open(which, anchor) {
    if (which === 'launcher' && this._launcher) this._launcher.open(anchor);
    else if (which === 'qs' && this._qs) this._qs.open(anchor);
    else if (which === 'cal' && this._cal) this._cal.open(anchor);
    else if (which === 'theme' && this._dock) this._dock.toggleThemePopup();
    // 'widget' is opened directly by the dock (which emits the bus event); the
    // shell just closes others via _closeAllExcept.
  }

  _close(which) {
    if (which === 'launcher' && this._launcher) this._launcher.close();
    else if (which === 'qs' && this._qs) this._qs.close();
    else if (which === 'cal' && this._cal) this._cal.close();
    else if (which === 'theme' && this._dock) this._dock.closeThemePopup();
    else if (which === 'widget' && this._dock) this._dock._closeWidgetPopover();
  }

  disconnectedCallback() {
    if (this._unsubWindows) this._unsubWindows();
    if (this._unsubTheme) this._unsubTheme();
    if (this._unsubBus) this._unsubBus();
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  }
}

customElements.define('de-shell', DeShell);
export default DeShell;
