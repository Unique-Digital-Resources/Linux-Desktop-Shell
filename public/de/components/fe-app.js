/**
 * fe-app.js — <fe-app> Aether Files web component.
 *
 * A self-contained Material-You file manager ported verbatim from
 * FileExplorer.html. The original <style> block (1428 lines, with the
 * mechanical :root -> :host and html, body -> :host substitutions) and
 * the original <body> inner HTML (the .app shell + toast container) are
 * injected into an open shadow root; the original IIFE is ported into
 * _init(), scoped to self._root.
 *
 * Porting rules applied (see /home/z/my-project/de-analysis/PORTING-GUIDE.md):
 *  - document.getElementById/querySelector/querySelectorAll  -> $(...) / $$(...)
 *  - document.body.appendChild(menu|backdrop|panel)          -> self._root.appendChild(...)
 *  - document.documentElement.style.setProperty('--sidebar-w', ...)
 *                                                            -> self.style.setProperty(...)
 *  - lucide.createIcons()                                    -> renderIcons(self._root)
 *  - document keydown: guarded by self._focused (focusin/focusout on host)
 *  - document click (outside-click): uses e.composedPath() to detect
 *    clicks inside .context-menu across the shadow boundary
 *  - drag/drop + sidebar resize: mousedown on shadow elements,
 *    mousemove/mouseup on document (pointer leaves shadow during drag)
 *
 * The mock filesystem, all state, and every function from the original
 * script are reproduced verbatim.
 */
import { renderIcons } from '../core/icons.js';
import { escapeHtml } from '../core/utils.js';
import { onTheme, themeService } from '../services/theme-service.js';
import { commands } from '../core/command-registry.js';

const CSS = `<style>
:host {
  /* Light-mode surfaces are slightly translucent so the desktop's glassmorphic
     window surface reads through (the <de-app-window> provides backdrop-blur). */
  --bg-sidebar: rgba(255, 255, 255, 0.90);
  --bg-tabbar: rgba(240, 237, 232, 0.90);
  --bg-workspace: rgba(251, 250, 248, 0.82);
  --bg-statusbar: rgba(240, 237, 232, 0.92);
  --bg-elevated: rgba(255, 255, 255, 0.94);
  --bg-elevated-2: rgba(237, 233, 227, 0.94);
  --bg-group: rgba(0, 0, 0, 0.05);
  --bg-hover: rgba(0, 0, 0, 0.045);
  --bg-active: rgba(0, 0, 0, 0.075);
  /* accent-derived tints come from the DE accent (see --accent below) so the
     file explorer follows the active desktop theme automatically. */
  --bg-selected: color-mix(in srgb, var(--accent) 10%, transparent);
  --bg-selected-hover: color-mix(in srgb, var(--accent) 15%, transparent);

  --border: rgba(0, 0, 0, 0.065);
  --border-strong: rgba(0, 0, 0, 0.11);
  --border-accent: color-mix(in srgb, var(--accent) 35%, transparent);

  --text-primary: #1C1B1F;
  --text-secondary: #49454F;
  --text-muted: #79747E;
  --text-faint: #A8A2AD;

  /* Inherit the desktop's accent (set on <de-shell> as --accent-strong).
     Falls back to a neutral purple when running standalone. */
  --accent: var(--accent-strong, #6c4cd6);
  --accent-hover: color-mix(in srgb, var(--accent) 82%, #000);
  --accent-active: color-mix(in srgb, var(--accent) 70%, #000);
  --accent-soft: color-mix(in srgb, var(--accent) 9%, transparent);
  --accent-on: #FFFFFF;

  --success: #1F7A4D;
  --warning: #B2651C;
  --error: #B3261E;
  --info: #00639B;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  --tr-fast: 100ms cubic-bezier(0.4, 0, 0.2, 1);
  --tr-base: 180ms cubic-bezier(0.4, 0, 0.2, 1);
  --tr-slow: 260ms cubic-bezier(0.4, 0, 0.2, 1);

  --shadow-pop: 0 4px 16px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.04);
  --shadow-dialog: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.06);

  --sidebar-w: 264px;
  --font-sans: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
}

/* Dark mode — surfaces become translucent so the desktop's glassmorphic window
   (backdrop-blurred wallpaper) reads through; text/borders invert; the accent
   (inherited from the DE) and its color-mix tints stay the same. Toggled by
   the .dark class (driven by theme-service). */
:host(.dark) {
  --bg-sidebar: rgba(22, 19, 31, 0.65);
  --bg-tabbar: rgba(15, 13, 22, 0.65);
  --bg-workspace: rgba(26, 22, 34, 0.42);
  --bg-statusbar: rgba(15, 13, 22, 0.72);
  --bg-elevated: rgba(40, 35, 56, 0.68);
  --bg-elevated-2: rgba(52, 46, 70, 0.76);
  --bg-group: rgba(255, 255, 255, 0.05);
  --bg-hover: rgba(255, 255, 255, 0.055);
  --bg-active: rgba(255, 255, 255, 0.09);

  --border: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);

  --text-primary: #f0ecff;
  --text-secondary: #c5bfd8;
  --text-muted: #837ca0;
  --text-faint: #5a547a;

  --shadow-pop: 0 4px 16px rgba(0, 0, 0, 0.40), 0 2px 6px rgba(0, 0, 0, 0.22);
  --shadow-dialog: 0 12px 40px rgba(0, 0, 0, 0.55), 0 4px 12px rgba(0, 0, 0, 0.30);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

:host {
  height: 100%;
  overflow: hidden;
  /* transparent so the <de-app-window> glass surface (translucent +
     backdrop-blur) reads through the file explorer's tinted surfaces */
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.4;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  user-select: none;
  /* smooth surface/token swap when the desktop light/dark mode changes */
  transition: background-color var(--tr-base) var(--ease, ease),
              color var(--tr-base) var(--ease, ease);
}

button { font-family: inherit; color: inherit; background: none; border: none; cursor: pointer; }
input { font-family: inherit; }

/* ===== App layout =====
   NOTE: original used height:100vh / width:100vw because the file explorer
   was a full-page app. Inside a <de-app-window> we must fill the window
   container instead, so 100% / 100%. Visual fidelity inside the window is
   preserved (the app simply fills its host). */
.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  height: 100%;
  width: 100%;
}

/* ===== Glass surfaces =====
   Each main surface is a translucent glass panel that blurs the desktop
   wallpaper behind it (the <de-app-window> base is transparent for the FE,
   so these backdrop-filters see straight through to the wallpaper). */
.sidebar, .workspace, .content, .toolbar, .action-bar, .statusbar,
.tab-strip, .widget-box {
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  backdrop-filter: blur(22px) saturate(160%);
}

/* ===== Sidebar ===== */
.sidebar {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.sidebar-header {
  padding: 16px 16px 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  height: 56px;
  flex-shrink: 0;
}

.brand-mark {
  width: 28px; height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-active) 100%);
  display: grid; place-items: center;
  color: #FFFFFF;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: -0.02em;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--accent) 30%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.brand-name {
  font-weight: 600;
  font-size: 14px;
  letter-spacing: -0.005em;
  color: var(--text-primary);
}
.brand-name .dim { color: var(--text-muted); font-weight: 400; }

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 6px 16px;
}

.nav-section { margin-bottom: 8px; }

.nav-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 10px 12px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  margin: 2px 6px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  height: 38px;
  transition: background var(--tr-fast), color var(--tr-fast);
}

.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item:hover .icon { color: var(--text-secondary); }

.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.nav-item.active .icon { color: var(--accent); }

.nav-item .icon {
  width: 18px; height: 18px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color var(--tr-fast);
}

.nav-item .label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== Directory tree ===== */
.tree-node { position: relative; }

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  margin: 2px 6px;
  border-radius: var(--radius-md);
  cursor: pointer;
  height: 36px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background var(--tr-fast), color var(--tr-fast);
}

.tree-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.tree-item.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.tree-item.active .tree-icon { color: var(--accent); }

.tree-arrow {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--text-muted);
  border-radius: 5px;
  transition: transform var(--tr-base), color var(--tr-fast), background var(--tr-fast);
}
.tree-arrow:hover { background: var(--bg-active); color: var(--text-secondary); }
.tree-arrow.expanded { transform: rotate(90deg); }
.tree-arrow svg { width: 12px; height: 12px; }
.tree-arrow.empty { visibility: hidden; }

.tree-icon {
  width: 18px; height: 18px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: color var(--tr-fast);
}
.tree-item:hover .tree-icon { color: var(--text-secondary); }

.tree-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-children {
  overflow: hidden;
  max-height: 0;
  transition: max-height var(--tr-slow);
}
.tree-children.expanded { max-height: 5000px; }

/* ===== Storage items ===== */
.storage-item {
  padding: 10px 12px;
  margin: 2px 6px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--tr-fast);
}
.storage-item:hover { background: var(--bg-hover); }

.storage-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.storage-item .icon {
  width: 16px; height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.storage-item .name {
  flex: 1;
  font-size: 12.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.storage-item .status-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--success);
  flex-shrink: 0;
}
.storage-item .status-dot.syncing {
  background: var(--warning);
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.storage-bar {
  height: 4px;
  background: var(--bg-elevated-2);
  border-radius: 2px;
  overflow: hidden;
}
.storage-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width var(--tr-slow);
}
.storage-bar-fill.warn { background: var(--warning); }
.storage-bar-fill.danger { background: var(--error); }

.storage-meta {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
  color: var(--text-muted);
  margin-top: 5px;
  font-variant-numeric: tabular-nums;
}

/* ===== Resize handle ===== */
.sidebar-resize {
  position: absolute;
  right: -2px;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
  transition: background var(--tr-fast);
}
.sidebar-resize:hover,
.sidebar-resizing {
  background: color-mix(in srgb, var(--accent) 25%, transparent);
}
.sidebar-resizing { background: color-mix(in srgb, var(--accent) 40%, transparent); }

/* ===== Workspace ===== */
.workspace {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-workspace);
  min-width: 0;
}

/* ===== Tab strip ===== */
.tab-strip {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  /* right padding reserves room for the floating window controls
     (close/min/max) that the windowing system renders at the top-right
     corner when an app opts out of the chrome titlebar. */
  padding: 0 62px 0 10px;
  height: 44px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-tabbar);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.tab-strip::-webkit-scrollbar { display: none; }

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 8px 0 14px;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12.5px;
  white-space: nowrap;
  position: relative;
  min-width: 130px;
  max-width: 220px;
  transition: background var(--tr-fast), color var(--tr-fast);
  border: 1px solid transparent;
  border-bottom: none;
}
.tab:hover {
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-secondary);
}
.tab.active {
  background: var(--bg-workspace);
  color: var(--text-primary);
  border-color: var(--border);
}
.tab.active::after {
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--accent);
  border-radius: 0 0 3px 3px;
}
.tab .icon {
  width: 15px; height: 15px;
  flex-shrink: 0;
  color: var(--text-faint);
}
.tab.active .icon { color: var(--accent); }
.tab-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-close {
  width: 20px; height: 20px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  opacity: 0;
  transition: opacity var(--tr-fast), background var(--tr-fast);
  color: var(--text-muted);
  flex-shrink: 0;
}
.tab:hover .tab-close, .tab.active .tab-close { opacity: 0.6; }
.tab-close:hover { background: var(--bg-active); color: var(--text-primary); opacity: 1; }
.tab-close svg { width: 12px; height: 12px; }

.tab-new {
  width: 36px; height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  flex-shrink: 0;
  margin-left: 6px;
  align-self: center;
}
.tab-new:hover { background: var(--bg-hover); color: var(--text-primary); }
.tab-new svg { width: 16px; height: 16px; }

/* ===== Toolbar ===== */
.toolbar {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--bg-workspace);
  box-sizing: border-box;
}

.btn-group {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-group);
  padding: 3px;
  border-radius: var(--radius-md);
  height: 42px;
  box-sizing: border-box;
}

.btn-icon {
  width: 36px; height: 36px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: background var(--tr-fast), color var(--tr-fast);
  flex-shrink: 0;
}
.btn-icon:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.btn-icon:active:not(:disabled) { background: var(--bg-active); }
.btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
.btn-icon svg { width: 18px; height: 18px; }

/* ===== Directory Bar (Breadcrumb + Actions) ===== */
.dir-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin: 0 4px;
  height: 42px;
  background: var(--bg-group);
  border-radius: var(--radius-md);
  padding: 3px;
  box-sizing: border-box;
}

.breadcrumb {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1px;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  padding: 0 6px;
}
.breadcrumb::-webkit-scrollbar { display: none; }

.crumb {
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--tr-fast), color var(--tr-fast);
  flex-shrink: 0;
}
.crumb:hover { background: var(--bg-hover); color: var(--text-primary); }
.crumb.current { color: var(--text-primary); font-weight: 500; }
.crumb-sep {
  color: var(--text-faint);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.crumb-sep svg { width: 14px; height: 14px; }

.dir-actions {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-group);
  padding: 3px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  box-sizing: border-box;
}
.dir-actions .btn-icon {
  width: 32px;
  height: 32px;
}
.dir-actions .btn-icon svg {
  width: 16px;
  height: 16px;
}

/* ===== Search ===== */
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: var(--bg-group);
  border-radius: var(--radius-md);
  height: 42px;
  padding: 3px;
  box-sizing: border-box;
}
.search-icon {
  position: absolute;
  left: 15px;
  color: var(--text-muted);
  pointer-events: none;
  display: flex;
}
.search-icon svg { width: 16px; height: 16px; }
.search-input {
  width: 240px;
  height: 36px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 0 16px 0 38px;
  color: var(--text-primary);
  font-size: 13px;
  transition: all var(--tr-fast);
}
.search-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-elevated);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}
.search-input::placeholder { color: var(--text-muted); }

/* ===== Action bar (Auto-hides) ===== */
.action-bar {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-workspace);
  flex-shrink: 0;
  overflow: hidden;
  transition: height 0.25s ease, opacity 0.2s ease, border-bottom-color 0.2s ease, padding 0.25s ease, min-height 0.25s ease;
  box-sizing: border-box;
}
.action-bar.hidden {
  height: 0;
  min-height: 0;
  opacity: 0;
  border-bottom-color: transparent;
  padding-top: 0;
  padding-bottom: 0;
  pointer-events: none;
}

.selection-info {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
  padding-right: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
}
.selection-info .count {
  color: var(--accent);
  font-weight: 600;
}
.selection-info .dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--text-faint);
}

/* ===== Content ===== */
.content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: var(--bg-workspace);
  min-height: 0;
}

.content-scroll {
  height: 100%;
  overflow: auto;
  padding: 12px;
}

/* ============================================================
   Home View — Win11 inspired widgets
   ============================================================ */
.home-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 4px 20px;
}

/* Widget container */
.widget-box {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.025);
  transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
}
.widget-box:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.05), 0 12px 28px rgba(0,0,0,0.07);
  border-color: var(--border-strong);
}

/* Always-visible header (icon + title + subtitle) */
.widget-header {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px 16px 10px;
  position: relative;
}
.widget-header-icon {
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: var(--accent-soft);
  display: grid;
  place-items: center;
  color: var(--accent);
  flex-shrink: 0;
}
.widget-header-icon svg { width: 16px; height: 16px; }
.widget-header-text { flex: 1; min-width: 0; }
.widget-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  letter-spacing: -0.005em;
  line-height: 1.25;
}
.widget-subtitle {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 400;
  margin-top: 2px;
}

/* Auto-hide top action bar (top-right, floats over header) */
.widget-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 2px;
  background: var(--bg-elevated);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 3px;
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  transform-origin: top right;
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  z-index: 10;
}
.widget-box:hover .widget-actions {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
.widget-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  transition: background var(--tr-fast), color var(--tr-fast);
}
.widget-action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.widget-action-btn.danger:hover {
  background: rgba(179, 38, 30, 0.1);
  color: var(--error);
}
.widget-action-btn svg { width: 14px; height: 14px; }

.widget-body {
  padding: 4px 12px 14px;
}

/* ===== Masonry Gallery Widget ===== */
.masonry-gallery.vertical {
  column-count: 5;
  column-gap: 8px;
}
@media (max-width: 1100px) { .masonry-gallery.vertical { column-count: 4; } }
@media (max-width: 880px)  { .masonry-gallery.vertical { column-count: 3; } }
@media (max-width: 600px)  { .masonry-gallery.vertical { column-count: 2; } }

.masonry-gallery.vertical .masonry-item {
  width: 100%;
  display: block;
  margin-bottom: 8px;
  break-inside: avoid;
}

.masonry-gallery.horizontal {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 8px;
  padding: 2px 2px 6px;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}
.masonry-gallery.horizontal::-webkit-scrollbar { height: 8px; }
.masonry-gallery.horizontal .masonry-item {
  flex: 0 0 auto;
  width: 200px;
  height: 260px;
  scroll-snap-align: start;
}

.masonry-item {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border-radius: 10px;
  background: var(--bg-elevated-2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.masonry-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
}
.masonry-item img {
  width: 100%;
  display: block;
  transition: transform 0.35s ease;
}
.masonry-gallery.vertical .masonry-item img {
  height: auto; /* Preserve aspect ratio in vertical layout */
}
.masonry-gallery.horizontal .masonry-item img {
  height: 100%; /* Cover fixed height in horizontal layout */
  object-fit: cover;
}
.masonry-item:hover img {
  transform: scale(1.06);
}
.masonry-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 18px 10px 8px;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 10%, transparent);
  color: #FFF;
  font-size: 11.5px;
  font-weight: 500;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.masonry-item:hover .masonry-name {
  opacity: 1;
}

/* Empty widgets state */
.widgets-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  gap: 10px;
  color: var(--text-muted);
}
.widgets-empty svg { width: 40px; height: 40px; opacity: 0.3; }

/* ===== Grid view ===== */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 2px;
}

.file-item {
  border-radius: var(--radius-md);
  padding: 12px 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: default;
  position: relative;
  transition: background var(--tr-fast);
  text-align: center;
}
.file-item:hover { background: var(--bg-hover); }
.file-item.selected { background: var(--bg-selected); }
.file-item.selected:hover { background: var(--bg-selected-hover); }

.file-icon-wrap {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  position: relative;
  flex-shrink: 0;
}
.file-icon-wrap svg { width: 48px; height: 48px; }

.file-name {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.35;
  word-break: break-word;
  max-width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.file-item.selected .file-name { color: var(--text-primary); }

.file-meta {
  font-size: 10px;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

/* ===== File checkbox ===== */
.file-checkbox {
  position: absolute;
  top: 6px;
  left: 6px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1.5px solid var(--border-strong);
  background: var(--bg-elevated);
  opacity: 0;
  transition: opacity var(--tr-fast);
  display: grid;
  place-items: center;
  z-index: 1;
}
.file-item:hover .file-checkbox, .file-item.selected .file-checkbox { opacity: 1; }
.file-checkbox.checked {
  background: var(--accent);
  border-color: var(--accent);
}
.file-checkbox.checked::after {
  content: '';
  width: 8px; height: 5px;
  border-left: 2px solid #FFFFFF;
  border-bottom: 2px solid #FFFFFF;
  transform: rotate(-45deg) translate(0.5px, -1px);
}

/* ===== List view ===== */
.file-list {
  display: flex;
  flex-direction: column;
}

.list-header {
  display: grid;
  grid-template-columns: 1fr 100px 120px 140px 32px;
  gap: 10px;
  padding: 8px 14px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  border-bottom: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: sticky;
  top: -12px;
  background: var(--bg-workspace);
  z-index: 1;
  margin-bottom: 2px;
}

.list-header .col {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  user-select: none;
}
.list-header .col:hover { color: var(--text-secondary); }
.list-header .col.sorted { color: var(--accent); }
.list-header .col svg { width: 13px; height: 13px; }
.list-header .col.size { justify-content: flex-end; }

.list-row {
  display: grid;
  grid-template-columns: 1fr 100px 120px 140px 32px;
  gap: 10px;
  padding: 0 14px;
  height: 40px;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: default;
  transition: background var(--tr-fast);
}
.list-row:hover { background: var(--bg-hover); }
.list-row.selected { background: var(--bg-selected); }
.list-row.selected:hover { background: var(--bg-selected-hover); }

.list-row .name-col {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  min-width: 0;
}
.list-row .name-col .file-icon-wrap {
  width: 20px; height: 20px;
}
.list-row .name-col .file-icon-wrap svg {
  width: 18px; height: 18px;
}
.list-row .name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
}
.list-row .size-col,
.list-row .type-col,
.list-row .date-col {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.list-row .size-col { text-align: right; }

.file-list.compact .list-row { height: 30px; font-size: 12px; }
.file-list.compact .list-row .name-col { gap: 8px; }
.file-list.compact .list-row .name-col .file-icon-wrap { width: 16px; height: 16px; }
.file-list.compact .list-row .name-col .file-icon-wrap svg { width: 14px; height: 14px; }

/* ===== File type colors ===== */
.icon-folder { color: var(--accent); }
.icon-image { color: #9C27B0; }
.icon-video { color: #EF6C00; }
.icon-audio { color: #00897B; }
.icon-pdf { color: #D32F2F; }
.icon-doc { color: #1976D2; }
.icon-sheet { color: #2E7D32; }
.icon-archive { color: #F57F17; }
.icon-code { color: #00897B; }
.icon-app { color: #C62828; }
.icon-text { color: #5F6368; }
.icon-generic { color: #9AA0A6; }

/* ===== Empty state ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-muted);
  padding: 40px 20px;
}
.empty-state svg { width: 48px; height: 48px; opacity: 0.25; color: var(--text-muted); }
.empty-state .title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}
.empty-state .desc { font-size: 12.5px; color: var(--text-muted); }

/* ===== Status bar ===== */
.statusbar {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-tabbar);
  font-size: 12px;
  color: var(--text-muted);
  gap: 12px;
  flex-shrink: 0;
}
.status-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.status-item svg { width: 13px; height: 13px; color: var(--text-faint); }
.status-divider {
  width: 1px;
  height: 22px;
  background: var(--border-strong);
}
.status-spacer { flex: 1; }
.status-accent { color: var(--accent); font-weight: 600; }
.status-muted { color: var(--text-muted); }

.status-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-group);
  padding: 4px;
  border-radius: var(--radius-md);
  height: 42px;
}

.view-segmented {
  display: flex;
  background: var(--bg-group);
  border-radius: var(--radius-sm);
  padding: 2px;
  height: 34px;
}
.seg-btn {
  width: 34px;
  display: grid;
  place-items: center;
  border-radius: 5px;
  color: var(--text-muted);
  transition: all var(--tr-fast);
}
.seg-btn:hover { color: var(--text-secondary); }
.seg-btn.active {
  background: var(--bg-elevated);
  color: var(--accent);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.seg-btn svg { width: 16px; height: 16px; }

.sort-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated-2);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  transition: all var(--tr-fast);
}
.sort-btn:hover { background: var(--bg-elevated); color: var(--text-primary); }
.sort-btn svg { width: 14px; height: 14px; }
.sort-btn .chev { color: var(--text-faint); }

/* ===== Context menu ===== */
.context-menu {
  position: fixed;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  padding: 6px;
  min-width: 220px;
  box-shadow: var(--shadow-pop);
  z-index: 1000;
  font-size: 13px;
  animation: menuIn var(--tr-fast);
}
@keyframes menuIn {
  from { opacity: 0; transform: scale(0.96) translateY(-3px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  height: 36px;
  position: relative;
}
.menu-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.menu-item.disabled { opacity: 0.35; pointer-events: none; }
.menu-item .icon, .menu-item svg.lucide {
  width: 17px; height: 17px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.menu-item:hover .icon, .menu-item:hover svg.lucide { color: var(--accent); }
.menu-item .label { flex: 1; }
.menu-item .shortcut {
  font-size: 11px;
  color: var(--text-faint);
  font-family: var(--font-mono);
}
.menu-item.danger, .menu-item.danger .icon { color: var(--error); }
.menu-item.danger:hover .icon { color: var(--error); }

.menu-arrow { width: 14px; height: 14px; color: var(--text-muted); }

.menu-separator {
  height: 1px;
  background: var(--border);
  margin: 4px 4px;
}

.menu-section-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 8px 12px 4px;
}

/* ===== Dialog ===== */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(3px);
  z-index: 2000;
  display: grid;
  place-items: center;
  animation: fadeIn var(--tr-base);
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.dialog {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 22px 24px 18px;
  min-width: 420px;
  max-width: 500px;
  box-shadow: var(--shadow-dialog);
  animation: dialogIn var(--tr-base);
}
@keyframes dialogIn {
  from { opacity: 0; transform: scale(0.95) translateY(-6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.dialog-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
}
.dialog-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.45;
}
.dialog-input {
  width: 100%;
  height: 38px;
  background: var(--bg-elevated-2);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 0 14px;
  color: var(--text-primary);
  font-size: 13px;
  margin-bottom: 18px;
  transition: border-color var(--tr-fast), background var(--tr-fast);
}
.dialog-input:focus { outline: none; border-color: var(--accent); background: var(--bg-elevated); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  height: 36px;
  padding: 0 18px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  transition: background var(--tr-fast), transform var(--tr-fast);
  border: none;
}
.btn:active { transform: translateY(0.5px); }
.btn-secondary {
  background: var(--bg-elevated-2);
  color: var(--text-secondary);
}
.btn-secondary:hover { background: var(--bg-hover); color: var(--text-primary); }
.btn-primary {
  background: var(--accent);
  color: var(--accent-on);
  font-weight: 600;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-danger {
  background: var(--error);
  color: #FFFFFF;
  font-weight: 600;
}
.btn-danger:hover { background: #9B2018; }

/* ===== Properties panel ===== */
.properties-panel {
  position: fixed;
  right: 16px;
  top: 110px;
  width: 290px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  z-index: 100;
  overflow: hidden;
  animation: dialogIn var(--tr-base);
}

.properties-header {
  padding: 14px 16px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
}
.properties-header .icon-wrap {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--bg-elevated-2);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}
.properties-header .icon-wrap svg { width: 22px; height: 22px; }
.properties-header .name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 170px;
}
.properties-header .type {
  font-size: 12px;
  color: var(--text-muted);
}
.properties-close {
  margin-left: auto;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  flex-shrink: 0;
}
.properties-close:hover { background: var(--bg-hover); color: var(--text-primary); }
.properties-close svg { width: 15px; height: 15px; }

.properties-body { padding: 10px 16px 14px; }
.prop-row {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 12px;
  gap: 12px;
}
.prop-row .key { color: var(--text-muted); }
.prop-row .val {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
  text-align: right;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prop-preview {
  width: 100%;
  height: 140px;
  background: var(--bg-elevated-2);
  border-radius: var(--radius-md);
  margin-bottom: 10px;
  display: grid;
  place-items: center;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--border);
}
.prop-preview svg { width: 48px; height: 48px; }

/* ===== Toast ===== */
.toast-container {
  position: fixed;
  bottom: 64px;
  right: 16px;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}
.toast {
  background: #322F35;
  border: none;
  border-radius: var(--radius-md);
  padding: 11px 16px;
  font-size: 12.5px;
  color: #F5F3F0;
  box-shadow: var(--shadow-pop);
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 240px;
  max-width: 360px;
  animation: toastIn var(--tr-base);
}
@keyframes toastIn {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
.toast .icon { width: 16px; height: 16px; flex-shrink: 0; }
.toast.success .icon { color: #7DD3A8; }
.toast.error .icon { color: #EF8A8A; }
.toast.info .icon { color: #7DC3FF; }

/* ===== Scrollbars ===== */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.20); background-clip: padding-box; }
::-webkit-scrollbar-corner { background: transparent; }

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
  }
}

/* ===== Responsive ===== */
@media (max-width: 880px) {
  .app { grid-template-columns: 220px 1fr; }
  .search-input { width: 160px; }
  .search-input:focus { width: 220px; }
}

@media (max-width: 680px) {
  .app { grid-template-columns: 60px 1fr; }
  .nav-item .label, .nav-section-title, .storage-item .name,
  .storage-bar, .storage-meta, .tree-label, .brand-name { display: none; }
  .nav-item { justify-content: center; }
  .sidebar-header { justify-content: center; padding: 16px 8px 10px; }
  .search-input { width: 120px; }
  .search-input:focus { width: 160px; }
}
</style>`;

const HTML = `<div class="app">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <div class="brand-mark">A</div>
      <div class="brand-name">Aether <span class="dim">Files</span></div>
    </div>
    <div class="sidebar-scroll" id="sidebarScroll"></div>
    <div class="sidebar-resize" id="sidebarResize"></div>
  </aside>

  <main class="workspace">
    <div class="tab-strip" id="tabStrip"></div>

    <div class="toolbar">
      <div class="btn-group">
        <button class="btn-icon" id="backBtn" title="Back"><i data-lucide="arrow-left"></i></button>
        <button class="btn-icon" id="forwardBtn" title="Forward"><i data-lucide="arrow-right"></i></button>
        <button class="btn-icon" id="upBtn" title="Up one level"><i data-lucide="arrow-up"></i></button>
        <button class="btn-icon" id="refreshBtn" title="Refresh"><i data-lucide="refresh-cw"></i></button>
      </div>
      <div class="dir-bar-wrap">
        <div class="breadcrumb" id="breadcrumb"></div>
        <div class="btn-group dir-actions">
          <button class="btn-icon" id="newFolderBtn" title="New folder"><i data-lucide="folder-plus"></i></button>
          <button class="btn-icon" id="newFileBtn" title="New file"><i data-lucide="file-plus"></i></button>
          <button class="btn-icon" id="pasteBtn" title="Paste" disabled><i data-lucide="clipboard-paste"></i></button>
        </div>
      </div>
      <div class="search-wrap">
        <span class="search-icon"><i data-lucide="search"></i></span>
        <input type="text" class="search-input" id="searchInput" placeholder="Search current folder">
      </div>
    </div>

    <div class="action-bar hidden" id="actionBar">
      <div class="btn-group">
        <button class="btn-icon" id="copyBtn" title="Copy" disabled><i data-lucide="copy"></i></button>
        <button class="btn-icon" id="cutBtn" title="Cut" disabled><i data-lucide="scissors"></i></button>
        <button class="btn-icon" id="renameBtn" title="Rename" disabled><i data-lucide="pencil-line"></i></button>
        <button class="btn-icon" id="deleteBtn" title="Move to trash" disabled><i data-lucide="trash-2"></i></button>
      </div>
      <div class="btn-group">
        <button class="btn-icon" id="moreMenuBtn" title="More actions"><i data-lucide="ellipsis"></i></button>
      </div>
      <div class="selection-info" id="selectionInfo"></div>
    </div>

    <div class="content">
      <div class="content-scroll" id="contentScroll"></div>
    </div>

    <div class="statusbar" id="statusbar"></div>
  </main>
</div>

<div class="toast-container" id="toastContainer"></div>

`;

class FeApp extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return; // idempotent
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    this._focused = false;
    // Track focus so the document-level keydown handler only steals shortcuts
    // when this fe-app (or a descendant) actually has focus.
    this.addEventListener('focusin', () => { this._focused = true; });
    this.addEventListener('focusout', () => { this._focused = false; });
    // Theme compatibility: follow the desktop's light/dark mode so the file
    // explorer reads as part of the active shell theme. The accent itself is
    // inherited via --accent-strong (see the :host token block).
    const applyMode = (mode) => this.classList.toggle('dark', mode === 'dark');
    applyMode(themeService.state.mode);
    this._unsubTheme = onTheme((s) => applyMode(s.mode));
    // Wait a tick so layout is ready, then port-init.
    requestAnimationFrame(() => this._init());
  }

  disconnectedCallback() {
    if (this._unsubTheme) { this._unsubTheme(); this._unsubTheme = null; }
  }

  _init() {
    const self = this;
    const $ = (s, r = self._root) => r.querySelector(s);
    const $$ = (s, r = self._root) => Array.from(r.querySelectorAll(s));

    // ============================================================
    //  File System Data Model
    // ============================================================

    const TYPE_META = {
      folder:  { icon: 'folder',          class: 'icon-folder',  label: 'Folder' },
      image:   { icon: 'image',            class: 'icon-image',   label: 'Image' },
      video:   { icon: 'film',             class: 'icon-video',   label: 'Video' },
      audio:   { icon: 'music',            class: 'icon-audio',   label: 'Audio' },
      pdf:     { icon: 'file-text',        class: 'icon-pdf',     label: 'PDF document' },
      doc:     { icon: 'file-text',        class: 'icon-doc',     label: 'Document' },
      sheet:   { icon: 'file-spreadsheet', class: 'icon-sheet',   label: 'Spreadsheet' },
      archive: { icon: 'file-archive',     class: 'icon-archive', label: 'Archive' },
      code:    { icon: 'file-code-2',      class: 'icon-code',    label: 'Source code' },
      app:     { icon: 'app-window',       class: 'icon-app',     label: 'Application' },
      text:    { icon: 'file-text',        class: 'icon-text',    label: 'Text file' },
      generic: { icon: 'file',             class: 'icon-generic', label: 'File' },
    };

    let nextId = 1;
    const fsNodes = new Map();

    function createNode(data) {
      const id = data.id || ('n' + (nextId++));
      const node = {
        id,
        name: data.name,
        type: data.type || 'folder',
        parentId: data.parentId || null,
        children: (data.type === undefined || data.type === 'folder') ? (data.children || []) : null,
        size: data.size || 0,
        modified: data.modified || randomDate(),
        meta: data.meta || {},
        expanded: data.expanded || false,
      };
      fsNodes.set(id, node);
      return node;
    }

    function randomDate() {
      const days = Math.floor(Math.random() * 120);
      const d = new Date(Date.now() - days * 86400000 - Math.random() * 86400000);
      return d;
    }

    function getChildByName(parentId, name) {
      const parent = fsNodes.get(parentId);
      if (!parent || !parent.children) return null;
      for (const cid of parent.children) {
        const c = fsNodes.get(cid);
        if (c && c.name === name) return c;
      }
      return null;
    }

    function getPath(nodeId) {
      const parts = [];
      let n = fsNodes.get(nodeId);
      while (n) {
        parts.unshift({ id: n.id, name: n.name });
        n = n.parentId ? fsNodes.get(n.parentId) : null;
      }
      return parts;
    }

    function findNodeByPath(parts) {
      let cur = fsNodes.get('root');
      for (const p of parts) {
        if (!cur || !cur.children) return null;
        let found = null;
        for (const cid of cur.children) {
          const c = fsNodes.get(cid);
          if (c && c.name === p) { found = c; break; }
        }
        if (!found) return null;
        cur = found;
      }
      return cur ? cur.id : null;
    }

    function isAncestor(ancestorId, nodeId) {
      let n = fsNodes.get(nodeId);
      while (n && n.parentId) {
        if (n.parentId === ancestorId) return true;
        n = fsNodes.get(n.parentId);
      }
      return false;
    }

    function initFilesystem() {
      const root = createNode({ id: 'root', name: 'Computer', type: 'folder' });
      const home = createNode({ name: 'Home', type: 'folder', parentId: 'root', expanded: true });
      root.children.push(home.id);

      const dashboardNode = { id: 'dashboard', name: 'Dashboard', type: 'dashboard', parentId: null };
      fsNodes.set('dashboard', dashboardNode);

      const desktop   = createNode({ name: 'Desktop',   type: 'folder', parentId: home.id });
      const documents = createNode({ name: 'Documents', type: 'folder', parentId: home.id });
      const downloads = createNode({ name: 'Downloads', type: 'folder', parentId: home.id });
      const pictures  = createNode({ name: 'Pictures',  type: 'folder', parentId: home.id });
      const music     = createNode({ name: 'Music',     type: 'folder', parentId: home.id });
      const videos    = createNode({ name: 'Videos',    type: 'folder', parentId: home.id });
      const projects  = createNode({ name: 'Projects',  type: 'folder', parentId: home.id, expanded: true });
      const config    = createNode({ name: '.config',   type: 'folder', parentId: home.id });

      home.children.push(desktop.id, documents.id, downloads.id, pictures.id, music.id, videos.id, projects.id, config.id);

      // Documents
      const work = createNode({ name: 'Work', type: 'folder', parentId: documents.id });
      const personal = createNode({ name: 'Personal', type: 'folder', parentId: documents.id });
      const invoices = createNode({ name: 'Invoices', type: 'folder', parentId: documents.id });
      const q4Strategy = createNode({ name: 'Q4 Strategy', type: 'folder', parentId: work.id });
      work.children.push(q4Strategy.id);
      documents.children.push(work.id, personal.id, invoices.id);

      documents.children.push(
        createNode({ name: 'resume.pdf',            type: 'pdf',     size: 248000,   parentId: documents.id }).id,
        createNode({ name: 'budget-2024.ods',       type: 'sheet',   size: 89200,    parentId: documents.id }).id,
        createNode({ name: 'meeting-notes.md',      type: 'text',    size: 4800,     parentId: documents.id }).id,
        createNode({ name: 'thesis-draft.docx',     type: 'doc',     size: 1842000, parentId: documents.id }).id,
        createNode({ name: 'reading-list.txt',      type: 'text',    size: 1200,    parentId: documents.id }).id,
        createNode({ name: 'lease-agreement.pdf',   type: 'pdf',     size: 512000,  parentId: documents.id }).id,
      );

      personal.children.push(
        createNode({ name: 'journal.md',            type: 'text',    size: 18400,   parentId: personal.id }).id,
        createNode({ name: 'recipes.txt',           type: 'text',    size: 3200,    parentId: personal.id }).id,
        createNode({ name: 'trip-planning.ods',     type: 'sheet',   size: 42000,   parentId: personal.id }).id,
      );

      // Downloads
      downloads.children.push(
        createNode({ name: 'ubuntu-24.04.iso',          type: 'generic', size: 4900000000, parentId: downloads.id }).id,
        createNode({ name: 'firefox-installer.deb',     type: 'generic', size: 62000000,   parentId: downloads.id }).id,
        createNode({ name: 'project-archive.zip',       type: 'archive', size: 184000000,  parentId: downloads.id }).id,
        createNode({ name: 'wallpapers-pack.tar.gz',    type: 'archive', size: 92000000,   parentId: downloads.id }).id,
        createNode({ name: 'backup-2024-03.borg',       type: 'archive', size: 2400000000, parentId: downloads.id }).id,
        createNode({ name: 'sublime-text_build.deb',     type: 'generic', size: 12000000,   parentId: downloads.id }).id,
        createNode({ name: 'vim-config.tar.gz',         type: 'archive', size: 38000,      parentId: downloads.id }).id,
      );

      // Pictures
      const screenshots = createNode({ name: 'Screenshots', type: 'folder', parentId: pictures.id });
      const wallpapers  = createNode({ name: 'Wallpapers',   type: 'folder', parentId: pictures.id });
      const photos      = createNode({ name: 'Photos',       type: 'folder', parentId: pictures.id });
      pictures.children.push(screenshots.id, wallpapers.id, photos.id);

      pictures.children.push(
        createNode({ name: 'aurora-night.png',      type: 'image', size: 4800000, parentId: pictures.id, meta: { w: 3840, h: 2160 } }).id,
        createNode({ name: 'mountain-vista.jpg',     type: 'image', size: 3200000, parentId: pictures.id, meta: { w: 3840, h: 2160 } }).id,
        createNode({ name: 'portrait-001.jpg',       type: 'image', size: 2800000, parentId: pictures.id, meta: { w: 1080, h: 1620 } }).id,
      );

      screenshots.children.push(
        createNode({ name: 'screenshot-001.png', type: 'image', size: 380000, parentId: screenshots.id }).id,
        createNode({ name: 'screenshot-002.png', type: 'image', size: 420000, parentId: screenshots.id }).id,
        createNode({ name: 'screenshot-003.png', type: 'image', size: 510000, parentId: screenshots.id }).id,
        createNode({ name: 'screenshot-004.png', type: 'image', size: 460000, parentId: screenshots.id }).id,
      );

      wallpapers.children.push(
        createNode({ name: 'gradient-mist.jpg',  type: 'image', size: 1800000, parentId: wallpapers.id }).id,
        createNode({ name: 'minimal-dark.png',    type: 'image', size: 2100000, parentId: wallpapers.id }).id,
        createNode({ name: 'forest-calm.jpg',     type: 'image', size: 3400000, parentId: wallpapers.id }).id,
        createNode({ name: 'desert-dusk.jpg',     type: 'image', size: 2900000, parentId: wallpapers.id }).id,
      );

      // Music
      const playlists = createNode({ name: 'Playlists', type: 'folder', parentId: music.id });
      music.children.push(playlists.id);
      music.children.push(
        createNode({ name: 'ambient-mix.mp3',        type: 'audio', size: 8400000,  parentId: music.id }).id,
        createNode({ name: 'podcast-ep42.ogg',       type: 'audio', size: 32000000, parentId: music.id }).id,
        createNode({ name: 'live-recording.flac',    type: 'audio', size: 28000000, parentId: music.id }).id,
        createNode({ name: 'symphony-no9.flac',      type: 'audio', size: 42000000, parentId: music.id }).id,
      );

      // Videos
      videos.children.push(
        createNode({ name: 'conference-talk.mp4',  type: 'video', size: 480000000, parentId: videos.id }).id,
        createNode({ name: 'screen-recording.mkv', type: 'video', size: 184000000, parentId: videos.id }).id,
        createNode({ name: 'holiday-clip.mov',     type: 'video', size: 920000000, parentId: videos.id }).id,
      );

      // Projects
      const webApp  = createNode({ name: 'web-app',   type: 'folder', parentId: projects.id, expanded: true });
      const dotfiles = createNode({ name: 'dotfiles', type: 'folder', parentId: projects.id });
      const cliTool = createNode({ name: 'cli-tool', type: 'folder', parentId: projects.id });
      projects.children.push(webApp.id, dotfiles.id, cliTool.id);

      const srcDir = createNode({ name: 'src', type: 'folder', parentId: webApp.id, expanded: true });
      webApp.children.push(srcDir.id);
      webApp.children.push(
        createNode({ name: 'package.json',  type: 'code', size: 1200, parentId: webApp.id }).id,
        createNode({ name: 'README.md',     type: 'text', size: 3400, parentId: webApp.id }).id,
        createNode({ name: 'tsconfig.json', type: 'code', size: 580,  parentId: webApp.id }).id,
        createNode({ name: 'vite.config.ts', type: 'code', size: 820, parentId: webApp.id }).id,
      );
      srcDir.children.push(
        createNode({ name: 'index.ts',   type: 'code', size: 4200, parentId: srcDir.id }).id,
        createNode({ name: 'app.tsx',    type: 'code', size: 8900, parentId: srcDir.id }).id,
        createNode({ name: 'utils.ts',   type: 'code', size: 2100, parentId: srcDir.id }).id,
        createNode({ name: 'styles.css', type: 'code', size: 3400, parentId: srcDir.id }).id,
      );

      dotfiles.children.push(
        createNode({ name: '.bashrc',     type: 'code', size: 4200, parentId: dotfiles.id }).id,
        createNode({ name: '.gitconfig',  type: 'code', size: 320,  parentId: dotfiles.id }).id,
        createNode({ name: '.tmux.conf',  type: 'code', size: 1800, parentId: dotfiles.id }).id,
      );

      // Desktop
      desktop.children.push(
        createNode({ name: 'README.txt',       type: 'text', size: 480, parentId: desktop.id }).id,
        createNode({ name: 'project-links.url', type: 'generic', size: 120, parentId: desktop.id }).id,
        createNode({ name: 'screenshot.png',   type: 'image', size: 280000, parentId: desktop.id }).id,
      );

      // Config
      config.children.push(
        createNode({ name: 'nvim',  type: 'folder', parentId: config.id }).id,
        createNode({ name: 'fish',  type: 'folder', parentId: config.id }).id,
        createNode({ name: 'gitconfig', type: 'code', size: 320, parentId: config.id }).id,
      );

      // FIX: original returned the `home` node object, but every consumer of
      // state.homeId treats it as an id string (fsNodes.get(state.homeId),
      // data-node-id="${item.nodeId}", renderTreeNode(state.homeId, ...)).
      // Returning home.id makes the Home nav + directory tree actually work.
      return home.id;
    }

    // ============================================================
    //  Application State
    // ============================================================

    const state = {
      homeId: null,
      dashboardId: 'dashboard',
      tabs: [],
      activeTabId: null,
      clipboard: null,
      selection: new Set(),
      sortBy: 'name',
      sortDir: 'asc',
      viewMode: 'grid',
      searchQuery: '',
      sidebarWidth: 264,
      nextTabId: 1,
      widgets: {
        imageGallery: { visible: true, orientation: 'vertical' }
      }
    };

    // ============================================================
    //  Tab Management
    // ============================================================

    function createTab(nodeId) {
      const tabId = 't' + (state.nextTabId++);
      const tab = {
        id: tabId,
        nodeId: nodeId,
        history: [nodeId],
        historyIdx: 0,
        selectedIds: new Set(),
      };
      state.tabs.push(tab);
      state.activeTabId = tabId;
      return tab;
    }

    function getActiveTab() {
      return state.tabs.find(t => t.id === state.activeTabId);
    }

    function switchTab(tabId) {
      state.activeTabId = tabId;
      const tab = getActiveTab();
      if (tab) {
        state.selection = tab.selectedIds;
        state.searchQuery = '';
        $('#searchInput').value = '';
        renderAll();
      }
    }

    function closeTab(tabId) {
      const idx = state.tabs.findIndex(t => t.id === tabId);
      if (idx < 0) return;
      state.tabs.splice(idx, 1);
      if (state.tabs.length === 0) {
        createTab(state.dashboardId);
      } else if (state.activeTabId === tabId) {
        const newTab = state.tabs[Math.min(idx, state.tabs.length - 1)];
        state.activeTabId = newTab.id;
        state.selection = newTab.selectedIds;
      }
      renderAll();
    }

    function navigateTo(nodeId) {
      const tab = getActiveTab();
      if (!tab || tab.nodeId === nodeId) return;
      tab.history = tab.history.slice(0, tab.historyIdx + 1);
      tab.history.push(nodeId);
      tab.historyIdx = tab.history.length - 1;
      tab.nodeId = nodeId;
      tab.selectedIds = new Set();
      state.selection = tab.selectedIds;
      state.searchQuery = '';
      $('#searchInput').value = '';
      renderAll();
    }

    function goBack() {
      const tab = getActiveTab();
      if (!tab || tab.historyIdx <= 0) return;
      tab.historyIdx--;
      tab.nodeId = tab.history[tab.historyIdx];
      tab.selectedIds = new Set();
      state.selection = tab.selectedIds;
      renderAll();
    }

    function goForward() {
      const tab = getActiveTab();
      if (!tab || tab.historyIdx >= tab.history.length - 1) return;
      tab.historyIdx++;
      tab.nodeId = tab.history[tab.historyIdx];
      tab.selectedIds = new Set();
      state.selection = tab.selectedIds;
      renderAll();
    }

    function goUp() {
      const tab = getActiveTab();
      if (!tab) return;
      const node = fsNodes.get(tab.nodeId);
      if (node && node.parentId) {
        navigateTo(node.parentId);
      }
    }

    // ============================================================
    //  Sidebar Rendering
    // ============================================================

    function getSidebarSections() {
      return [
        { title: 'Favorites', items: [
          { icon: 'layout-dashboard', label: 'Dashboard', nodeId: state.dashboardId },
          { icon: 'clock',      label: 'Recent',    special: 'recent' },
          { icon: 'star',       label: 'Starred',   special: 'starred' },
          { icon: 'trash-2',    label: 'Trash',     special: 'trash' },
        ]},
        { title: 'Places', items: [
          { icon: 'house',      label: 'Home',      nodeId: state.homeId },
          { icon: 'monitor',    label: 'Desktop',   nodeId: findNodeByPath(['Home', 'Desktop']) },
          { icon: 'file-text',  label: 'Documents', nodeId: findNodeByPath(['Home', 'Documents']) },
          { icon: 'download',   label: 'Downloads', nodeId: findNodeByPath(['Home', 'Downloads']) },
          { icon: 'image',      label: 'Pictures',  nodeId: findNodeByPath(['Home', 'Pictures']) },
          { icon: 'music',      label: 'Music',     nodeId: findNodeByPath(['Home', 'Music']) },
          { icon: 'film',       label: 'Videos',    nodeId: findNodeByPath(['Home', 'Videos']) },
        ]},
      ];
    }

    function getStorageItems() {
      return [
        { id: 'local',     name: 'Local SSD',       icon: 'hard-drive',   used: 380,   total: 500,  status: 'success' },
        { id: 'home-vol',  name: 'home volume',     icon: 'database',     used: 124,   total: 200,  status: 'success' },
        { id: 'usb',       name: 'USB Drive',       icon: 'usb',           used: 12,    total: 64,   status: 'success' },
        { id: 'nas',       name: 'nas.lan',         icon: 'server',        used: 1800,  total: 4000, status: 'success' },
        { id: 'nextcloud', name: 'Nextcloud',       icon: 'cloud',         used: 18,    total: 50,   status: 'success' },
        { id: 'gdrive',    name: 'Google Drive',    icon: 'cloud',         used: 8.4,   total: 15,   status: 'syncing' },
      ];
    }

    function renderSidebar() {
      const root = $('#sidebarScroll');
      const tab = getActiveTab();
      const activeNodeId = tab ? tab.nodeId : null;

      let html = '';

      for (const section of getSidebarSections()) {
        html += `<div class="nav-section">`;
        html += `<div class="nav-section-title">${section.title}</div>`;
        for (const item of section.items) {
          const active = item.nodeId && item.nodeId === activeNodeId;
          html += `<div class="nav-item ${active ? 'active' : ''}" data-node-id="${item.nodeId || ''}" data-special="${item.special || ''}">
            <i data-lucide="${item.icon}" class="icon"></i>
            <span class="label">${item.label}</span>
          </div>`;
        }
        html += `</div>`;
      }

      // Directory tree
      html += `<div class="nav-section">
        <div class="nav-section-title">Directory Tree</div>
        <div id="treeRoot">${renderTreeNode(state.homeId, 0, activeNodeId)}</div>
      </div>`;

      // Storage
      html += `<div class="nav-section">
        <div class="nav-section-title">Storage & Network</div>`;
      for (const item of getStorageItems()) {
        const pct = (item.used / item.total) * 100;
        const fillColor = pct > 90 ? 'danger' : pct > 75 ? 'warn' : '';
        const usedLabel = item.total >= 1000 ? `${(item.used/1000).toFixed(1)} TB` : `${item.used} GB`;
        const totalLabel = item.total >= 1000 ? `${(item.total/1000).toFixed(0)} TB` : `${item.total} GB`;
        html += `<div class="storage-item" data-storage="${item.id}">
          <div class="storage-item-head">
            <i data-lucide="${item.icon}" class="icon"></i>
            <span class="name">${item.name}</span>
            <span class="status-dot ${item.status === 'syncing' ? 'syncing' : ''}"></span>
          </div>
          <div class="storage-bar"><div class="storage-bar-fill ${fillColor}" style="width:${pct}%"></div></div>
          <div class="storage-meta"><span>${usedLabel} of ${totalLabel}</span><span>${pct.toFixed(0)}%</span></div>
        </div>`;
      }
      html += `</div>`;

      root.innerHTML = html;

      root.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => {
          const nodeId = el.dataset.nodeId;
          const special = el.dataset.special;
          if (nodeId) {
            navigateTo(nodeId);
          } else if (special) {
            showToast(`${special.charAt(0).toUpperCase() + special.slice(1)} view is illustrative in this demo`, 'info');
          }
        });
      });

      root.querySelectorAll('.tree-arrow').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const nodeId = el.dataset.nodeId;
          const node = fsNodes.get(nodeId);
          if (node) {
            node.expanded = !node.expanded;
            renderSidebar();
          }
        });
      });

      root.querySelectorAll('.tree-item').forEach(el => {
        el.addEventListener('click', () => {
          const nodeId = el.dataset.nodeId;
          if (nodeId) navigateTo(nodeId);
        });
      });

      renderIcons(self._root);
    }

    function renderTreeNode(nodeId, depth, activeNodeId) {
      const node = fsNodes.get(nodeId);
      if (!node) return '';

      const hasChildren = node.children && node.children.length > 0 && node.children.some(cid => {
        const c = fsNodes.get(cid);
        return c && c.type === 'folder';
      });
      const isActive = nodeId === activeNodeId;
      const padLeft = 8 + depth * 18;

      let html = `<div class="tree-node">`;
      html += `<div class="tree-item ${isActive ? 'active' : ''}" data-node-id="${nodeId}" style="padding-left:${padLeft}px">`;
      html += `<span class="tree-arrow ${node.expanded ? 'expanded' : ''} ${hasChildren ? '' : 'empty'}" data-node-id="${nodeId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </span>`;
      html += `<i data-lucide="${node.expanded ? 'folder-open' : 'folder'}" class="tree-icon"></i>`;
      html += `<span class="tree-label">${escapeHtml(node.name)}</span>`;
      html += `</div>`;

      if (hasChildren && node.expanded) {
        html += `<div class="tree-children expanded">`;
        for (const cid of node.children) {
          const child = fsNodes.get(cid);
          if (child && child.type === 'folder') {
            html += renderTreeNode(cid, depth + 1, activeNodeId);
          }
        }
        html += `</div>`;
      }

      html += `</div>`;
      return html;
    }

    // ============================================================
    //  Breadcrumb
    // ============================================================

    function renderBreadcrumb() {
      const tab = getActiveTab();
      if (!tab) return;
      const path = getPath(tab.nodeId);
      const el = $('#breadcrumb');
      let html = '';
      path.forEach((p, i) => {
        if (i > 0) html += `<span class="crumb-sep"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></span>`;
        const current = i === path.length - 1;
        html += `<span class="crumb ${current ? 'current' : ''}" data-node-id="${p.id}">${escapeHtml(p.name)}</span>`;
      });
      el.innerHTML = html;
      el.querySelectorAll('.crumb').forEach(c => {
        c.addEventListener('click', () => {
          const id = c.dataset.nodeId;
          if (id) navigateTo(id);
        });
      });
    }

    // ============================================================
    //  Tab strip
    // ============================================================

    function renderTabs() {
      const strip = $('#tabStrip');
      let html = '';
      for (const tab of state.tabs) {
        const node = fsNodes.get(tab.nodeId);
        const name = node ? node.name : '?';
        const active = tab.id === state.activeTabId;

        let iconStr = 'file';
        if (node) {
          if (node.type === 'dashboard') iconStr = 'layout-dashboard';
          else if (node.type === 'folder') iconStr = 'folder';
        }

        html += `<div class="tab ${active ? 'active' : ''}" data-tab-id="${tab.id}" title="${escapeHtml(name)}">
          <i data-lucide="${iconStr}" class="icon"></i>
          <span class="tab-label">${escapeHtml(name)}</span>
          <span class="tab-close" data-tab-id="${tab.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </span>
        </div>`;
      }
      html += `<button class="tab-new" id="newTabBtn" title="New tab"><i data-lucide="plus"></i></button>`;
      strip.innerHTML = html;

      strip.querySelectorAll('.tab').forEach(t => {
        t.addEventListener('click', (e) => {
          if (e.target.closest('.tab-close')) return;
          switchTab(t.dataset.tabId);
        });
        t.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showTabContextMenu(e.clientX, e.clientY, t.dataset.tabId);
        });
      });
      strip.querySelectorAll('.tab-close').forEach(c => {
        c.addEventListener('click', (e) => {
          e.stopPropagation();
          closeTab(c.dataset.tabId);
        });
      });
      $('#newTabBtn').addEventListener('click', () => {
        const tab = getActiveTab();
        createTab(tab ? tab.nodeId : state.dashboardId);
        renderAll();
      });

      renderIcons(self._root);
    }

    // ============================================================
    //  Content rendering
    // ============================================================

    // Pre-defined actual images from Unsplash for the gallery
    const GALLERY_IMAGES = [
      { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=240&h=320&fit=crop', name: 'Mountain River' },
      { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=240&h=200&fit=crop', name: 'Snowy Peaks' },
      { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=240&h=280&fit=crop', name: 'Forest Cabin' },
      { src: 'https://images.unsplash.com/photo-1546587348-d12660c30c50?w=240&h=360&fit=crop', name: 'Waterfall' },
      { src: 'https://images.unsplash.com/photo-1433086966358-54859d0ed7df?w=240&h=240&fit=crop', name: 'Autumn Leaves' },
      { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=240&h=300&fit=crop', name: 'Lake Reflection' },
      { src: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=240&h=220&fit=crop', name: 'Desert Dunes' },
      { src: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=240&h=340&fit=crop', name: 'City Street' },
      { src: 'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=240&h=260&fit=crop', name: 'Coastal Cliffs' },
      { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=240&h=380&fit=crop', name: 'Sunset Rays' },
      { src: 'https://images.unsplash.com/photo-1475924156734-496f6ca7a043?w=240&h=210&fit=crop', name: 'Green Valley' },
      { src: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=240&h=290&fit=crop', name: 'Ocean Waves' },
      { src: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=240&h=250&fit=crop', name: 'Misty Forest' },
      { src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=240&h=330&fit=crop', name: 'Starry Night' }
    ];

    function renderContent() {
      const scroll = $('#contentScroll');
      const tab = getActiveTab();
      if (!tab) return;

      // Dashboard view shows widgets
      if (tab.nodeId === state.dashboardId && !state.searchQuery) {
        scroll.innerHTML = renderHomeView();
        wireHomeView();
        renderIcons(self._root);
        return;
      }

      const items = getCurrentItems();

      if (items.length === 0) {
        if (state.searchQuery) {
          scroll.innerHTML = `<div class="empty-state">
            <i data-lucide="search-x"></i>
            <div class="title">No results for "${escapeHtml(state.searchQuery)}"</div>
            <div class="desc">Try a different search term or clear the search</div>
          </div>`;
        } else {
          scroll.innerHTML = `<div class="empty-state">
            <i data-lucide="folder-open"></i>
            <div class="title">This folder is empty</div>
            <div class="desc">Create a new file or folder to get started</div>
          </div>`;
        }
        renderIcons(self._root);
        return;
      }

      if (state.viewMode === 'grid') {
        scroll.innerHTML = renderGrid(items);
      } else {
        scroll.innerHTML = renderList(items, state.viewMode === 'compact');
      }

      wireFileItems();
      renderIcons(self._root);
    }

    // ============================================================
    //  Home View — Widgets (Win11 inspired)
    // ============================================================

    function renderHomeView() {
      let html = `<div class="home-view">`;

      // ---------- Image Gallery Widget ----------
      if (state.widgets.imageGallery.visible) {
        const orient = state.widgets.imageGallery.orientation;
        const orientIcon = orient === 'vertical' ? 'rows-3' : 'columns-3';
        const orientLabel = orient === 'vertical' ? 'Switch to horizontal scroll' : 'Switch to vertical masonry';
        const orientSubtitle = orient === 'vertical'
          ? `${GALLERY_IMAGES.length} images · masonry layout`
          : `${GALLERY_IMAGES.length} images · horizontal scroll`;

        html += `
          <section class="widget-box" id="widget-gallery">
            <header class="widget-header">
              <div class="widget-header-icon"><i data-lucide="image"></i></div>
              <div class="widget-header-text">
                <div class="widget-title">Image Gallery</div>
                <div class="widget-subtitle">${orientSubtitle}</div>
              </div>
            </header>
            <div class="widget-actions">
              <button class="widget-action-btn" data-action="toggle-orientation" title="${orientLabel}">
                <i data-lucide="${orientIcon}"></i>
              </button>
              <button class="widget-action-btn" data-action="refresh-gallery" title="Refresh images">
                <i data-lucide="refresh-cw"></i>
              </button>
              <button class="widget-action-btn danger" data-action="close-gallery" title="Close widget">
                <i data-lucide="x"></i>
              </button>
            </div>
            <div class="widget-body">
              <div class="masonry-gallery ${orient}">
                ${GALLERY_IMAGES.map((img, i) => {
                  return `
                  <div class="masonry-item" data-index="${i}" title="${escapeHtml(img.name)}">
                    <img src="${img.src}" alt="${escapeHtml(img.name)}" loading="lazy">
                    <div class="masonry-name">${escapeHtml(img.name)}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </section>
        `;
      }

      // ---------- Empty state ----------
      if (!state.widgets.imageGallery.visible) {
        html += `
          <div class="widgets-empty">
            <i data-lucide="layout-grid"></i>
            <div style="font-size:14px;font-weight:500;color:var(--text-secondary);">No widgets active</div>
            <div style="font-size:12.5px;">Refresh the page to restore default widgets</div>
          </div>`;
      }

      html += `</div>`;
      return html;
    }

    function wireHomeView() {
      // Widget action buttons
      $$('.widget-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btn.dataset.action;
          switch (action) {
            case 'toggle-orientation':
              toggleGalleryOrientation();
              break;
            case 'refresh-gallery':
              showToast('Gallery refreshed', 'info');
              renderContent();
              break;
            case 'close-gallery':
              closeWidget('imageGallery');
              break;
          }
        });
      });

      // Click on masonry item -> open properties
      $$('.masonry-item').forEach(el => {
        el.addEventListener('click', () => {
          const index = el.dataset.index;
          const img = GALLERY_IMAGES[index];
          if (img) showToast(`Selected: ${img.name}`, 'info');
        });
        el.addEventListener('dblclick', () => {
          const index = el.dataset.index;
          const img = GALLERY_IMAGES[index];
          if (img) showToast(`Opening: ${img.name}`, 'info');
        });
      });
    }

    function toggleGalleryOrientation() {
      const w = state.widgets.imageGallery;
      w.orientation = w.orientation === 'vertical' ? 'horizontal' : 'vertical';
      renderContent();
      showToast(`Gallery: ${w.orientation === 'vertical' ? 'vertical masonry' : 'horizontal scroll'}`, 'info');
    }

    function closeWidget(name) {
      if (name === 'imageGallery') state.widgets.imageGallery.visible = false;
      renderContent();
    }

    function getCurrentItems() {
      const tab = getActiveTab();
      if (!tab || tab.nodeId === 'dashboard') return [];

      const node = fsNodes.get(tab.nodeId);
      if (!node || !node.children) return [];
      let items = node.children.map(cid => fsNodes.get(cid)).filter(Boolean);

      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        items = items.filter(it => it.name.toLowerCase().includes(q));
      }

      const dir = state.sortDir === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const aFolder = a.type === 'folder';
        const bFolder = b.type === 'folder';
        if (aFolder !== bFolder) return aFolder ? -1 : 1;
        let av, bv;
        switch (state.sortBy) {
          case 'name':
            av = a.name.toLowerCase(); bv = b.name.toLowerCase();
            return av < bv ? -1 * dir : (av > bv ? 1 * dir : 0);
          case 'size':
            av = a.size; bv = b.size;
            return (av - bv) * dir;
          case 'type':
            av = a.type; bv = b.type;
            return av < bv ? -1 * dir : (av > bv ? 1 * dir : 0);
          case 'modified':
            av = a.modified.getTime(); bv = b.modified.getTime();
            return (av - bv) * dir;
          default: return 0;
        }
      });

      return items;
    }

    function formatSize(bytes) {
      if (bytes === 0) return '—';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
      if (bytes < 1024 * 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
      return (bytes / 1024 / 1024 / 1024 / 1024).toFixed(2) + ' TB';
    }

    function formatDate(d) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.round((today - that) / 86400000);
      if (diffDays === 0) return 'Today, ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return diffDays + ' days ago';
      return d.toLocaleDateString([], {year: 'numeric', month: 'short', day: 'numeric'});
    }

    function getFileMeta(node) {
      return TYPE_META[node.type] || TYPE_META.generic;
    }

    function renderGrid(items) {
      let html = `<div class="file-grid">`;
      for (const it of items) {
        const meta = getFileMeta(it);
        const selected = state.selection.has(it.id);
        html += `<div class="file-item ${selected ? 'selected' : ''}" data-node-id="${it.id}">
          <div class="file-checkbox ${selected ? 'checked' : ''}"></div>
          <div class="file-icon-wrap">
            <i data-lucide="${meta.icon}" class="${meta.class}"></i>
          </div>
          <div class="file-name">${escapeHtml(it.name)}</div>
        </div>`;
      }
      html += `</div>`;
      return html;
    }

    function renderList(items, compact) {
      const sortIcon = state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down';
      let html = `<div class="file-list ${compact ? 'compact' : ''}">`;
      html += `<div class="list-header">
        <div class="col name ${state.sortBy === 'name' ? 'sorted' : ''}" data-sort="name">
          <span>Name</span>
          ${state.sortBy === 'name' ? `<i data-lucide="${sortIcon}"></i>` : ''}
        </div>
        <div class="col size ${state.sortBy === 'size' ? 'sorted' : ''}" data-sort="size">
          <span>Size</span>
          ${state.sortBy === 'size' ? `<i data-lucide="${sortIcon}"></i>` : ''}
        </div>
        <div class="col type ${state.sortBy === 'type' ? 'sorted' : ''}" data-sort="type">
          <span>Type</span>
          ${state.sortBy === 'type' ? `<i data-lucide="${sortIcon}"></i>` : ''}
        </div>
        <div class="col date ${state.sortBy === 'modified' ? 'sorted' : ''}" data-sort="modified">
          <span>Modified</span>
          ${state.sortBy === 'modified' ? `<i data-lucide="${sortIcon}"></i>` : ''}
        </div>
        <div></div>
      </div>`;

      for (const it of items) {
        const meta = getFileMeta(it);
        const selected = state.selection.has(it.id);
        const size = it.type === 'folder' ? '—' : formatSize(it.size);
        html += `<div class="list-row ${selected ? 'selected' : ''}" data-node-id="${it.id}">
          <div class="name-col">
            <div class="file-icon-wrap"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>
            <span class="name-text">${escapeHtml(it.name)}</span>
          </div>
          <div class="size-col">${size}</div>
          <div class="type-col">${meta.label}</div>
          <div class="date-col">${formatDate(it.modified)}</div>
          <div></div>
        </div>`;
      }
      html += `</div>`;
      return html;
    }

    function wireFileItems() {
      $$('.file-item, .list-row').forEach(el => {
        const nodeId = el.dataset.nodeId;

        el.addEventListener('click', (e) => {
          const isCheckbox = e.target.closest('.file-checkbox');

          if (isCheckbox) {
            e.stopPropagation();
            if (state.selection.has(nodeId)) state.selection.delete(nodeId);
            else state.selection.add(nodeId);
          } else if (e.ctrlKey || e.metaKey) {
            if (state.selection.has(nodeId)) state.selection.delete(nodeId);
            else state.selection.add(nodeId);
          } else if (e.shiftKey) {
            const items = getCurrentItems();
            const idx = items.findIndex(i => i.id === nodeId);
            if (idx >= 0 && state.selection.size > 0) {
              const lastSelected = Array.from(state.selection).pop();
              const lastIdx = items.findIndex(i => i.id === lastSelected);
              if (lastIdx >= 0) {
                const start = Math.min(idx, lastIdx);
                const end = Math.max(idx, lastIdx);
                for (let i = start; i <= end; i++) state.selection.add(items[i].id);
              }
            } else {
              state.selection.clear();
              state.selection.add(nodeId);
            }
          } else {
            state.selection.clear();
            state.selection.add(nodeId);
          }

          const tab = getActiveTab();
          if (tab) tab.selectedIds = state.selection;
          updateSelectionUI();
        });

        el.addEventListener('dblclick', () => {
          const node = fsNodes.get(nodeId);
          if (!node) return;
          if (node.type === 'folder') {
            navigateTo(nodeId);
          } else {
            showProperties(nodeId);
          }
        });

        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          if (!state.selection.has(nodeId)) {
            state.selection.clear();
            state.selection.add(nodeId);
            const tab = getActiveTab();
            if (tab) tab.selectedIds = state.selection;
            updateSelectionUI();
          }
          showFileContextMenu(e.clientX, e.clientY, nodeId);
        });
      });

      $$('.list-header .col').forEach(c => {
        c.addEventListener('click', () => {
          const sort = c.dataset.sort;
          if (!sort) return;
          if (state.sortBy === sort) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortBy = sort;
            state.sortDir = 'asc';
          }
          renderContent();
          renderStatusbar();
        });
      });
    }

    function updateSelectionUI() {
      $$('.file-item, .list-row').forEach(el => {
        const id = el.dataset.nodeId;
        const selected = state.selection.has(id);
        el.classList.toggle('selected', selected);
        const cb = el.querySelector('.file-checkbox');
        if (cb) cb.classList.toggle('checked', selected);
      });
      renderStatusbar();
      renderSelectionInfo();
      updateActionButtons();
    }

    function renderStatusbar() {
      const items = getCurrentItems();
      const totalSize = state.selection.size > 0
        ? Array.from(state.selection).map(id => fsNodes.get(id)).filter(Boolean).reduce((s, n) => s + (n.size || 0), 0)
        : 0;

      const tab = getActiveTab();
      let storageLabel = 'Local SSD · 120 GB free';
      if (tab) {
        const path = getPath(tab.nodeId);
        if (path.length > 1 && path[1].name === 'Home') storageLabel = 'home volume · 76 GB free';
        else if (tab.nodeId === 'dashboard') storageLabel = 'System Overview';
      }

      const sortLabels = { name: 'Name', size: 'Size', type: 'Type', modified: 'Modified' };
      const sortIcon = state.sortDir === 'asc' ? 'chevron-up' : 'chevron-down';

      const el = $('#statusbar');
      el.innerHTML = `
        <div class="status-left">
          <div class="status-item">
            <i data-lucide="${tab && tab.nodeId === 'dashboard' ? 'layout-dashboard' : 'folder'}"></i>
            <span>${tab && tab.nodeId === 'dashboard' ? 'Dashboard' : `${items.length} item${items.length !== 1 ? 's' : ''}`}</span>
          </div>
          ${state.selection.size > 0 ? `
            <div class="status-divider"></div>
            <div class="status-item">
              <span class="status-accent">${state.selection.size} selected</span>
              ${totalSize > 0 ? `<span class="status-muted">· ${formatSize(totalSize)}</span>` : ''}
            </div>
          ` : ''}
        </div>
        <div class="status-spacer"></div>
        <div class="status-right-group">
          <div class="view-segmented">
            <button class="seg-btn ${state.viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid view">
              <i data-lucide="grid-3x3"></i>
            </button>
            <button class="seg-btn ${state.viewMode === 'list' ? 'active' : ''}" data-view="list" title="List view">
              <i data-lucide="list"></i>
            </button>
            <button class="seg-btn ${state.viewMode === 'compact' ? 'active' : ''}" data-view="compact" title="Compact view">
              <i data-lucide="rows-3"></i>
            </button>
          </div>
          <button class="sort-btn" id="sortBtn">
            <i data-lucide="arrow-up-down"></i>
            <span>${sortLabels[state.sortBy]}</span>
            <i data-lucide="${sortIcon}" class="chev"></i>
          </button>
          <div class="status-divider"></div>
          <div class="status-item">
            <i data-lucide="hard-drive"></i>
            <span>${storageLabel}</span>
          </div>
        </div>
      `;

      el.querySelectorAll('.seg-btn').forEach(btn => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.view));
      });

      const sortBtn = $('#sortBtn');
      if (sortBtn) {
        sortBtn.addEventListener('click', () => {
          const rect = sortBtn.getBoundingClientRect();
          showSortMenu(rect.left, rect.top, true);
        });
      }

      renderIcons(self._root);
    }

    function renderSelectionInfo() {
      const el = $('#selectionInfo');
      if (state.selection.size === 0) {
        el.innerHTML = '';
      } else {
        el.innerHTML = `<span class="dot"></span><span class="count">${state.selection.size}</span><span>selected</span>`;
      }
    }

    function updateActionButtons() {
      const hasSelection = state.selection.size > 0;
      const hasClipboard = state.clipboard && state.clipboard.ids.length > 0;
      const tab = getActiveTab();
      const isDashboard = tab && tab.nodeId === 'dashboard';

      // Directory bar actions
      $('#pasteBtn').disabled = !hasClipboard || isDashboard;

      // Action bar buttons
      $('#copyBtn').disabled = !hasSelection;
      $('#cutBtn').disabled = !hasSelection;
      $('#renameBtn').disabled = state.selection.size !== 1;
      $('#deleteBtn').disabled = !hasSelection;

      // Auto-hide action bar
      const actionBar = $('#actionBar');
      if (hasSelection) {
        actionBar.classList.remove('hidden');
      } else {
        actionBar.classList.add('hidden');
      }
    }

    function updateNavButtons() {
      const tab = getActiveTab();
      if (!tab) return;
      $('#backBtn').disabled = tab.historyIdx <= 0;
      $('#forwardBtn').disabled = tab.historyIdx >= tab.history.length - 1;
      const node = fsNodes.get(tab.nodeId);
      $('#upBtn').disabled = !node || !node.parentId;
    }

    function setViewMode(mode) {
      state.viewMode = mode;
      renderContent();
      renderStatusbar();
    }

    function renderAll() {
      renderSidebar();
      renderTabs();
      renderBreadcrumb();
      renderContent();
      renderStatusbar();
      renderSelectionInfo();
      updateActionButtons();
      updateNavButtons();
    }

    // ============================================================
    //  Context menus
    // ============================================================

    function closeAllMenus() {
      $$('.context-menu').forEach(m => m.remove());
    }

    function positionMenu(menu, x, y, openAbove = false) {
      self._root.appendChild(menu);
      const rect = menu.getBoundingClientRect();
      let mx = Math.min(x, window.innerWidth - rect.width - 8);
      let my;
      if (openAbove) {
        my = y - rect.height;
        if (my < 8) my = 8;
      } else {
        my = Math.min(y, window.innerHeight - rect.height - 8);
        if (my < 8) my = 8;
      }
      if (mx < 8) mx = 8;
      menu.style.left = mx + 'px';
      menu.style.top = my + 'px';
    }

    function showFileContextMenu(x, y, nodeId) {
      closeAllMenus();
      const node = fsNodes.get(nodeId);
      if (!node) return;
      const isFolder = node.type === 'folder';
      const multi = state.selection.size > 1;

      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        ${multi ? `<div class="menu-section-label">${state.selection.size} items selected</div>` : ''}
        <div class="menu-item" data-action="open">
          <i data-lucide="${isFolder ? 'folder-open' : 'external-link'}" class="icon"></i>
          <span class="label">Open</span>
        </div>
        ${isFolder ? `
          <div class="menu-item" data-action="open-new-tab">
            <i data-lucide="square-arrow-out-up-right" class="icon"></i>
            <span class="label">Open in new tab</span>
          </div>
        ` : `
          <div class="menu-item" data-action="open-with">
            <i data-lucide="app-window" class="icon"></i>
            <span class="label">Open with…</span>
            <i data-lucide="chevron-right" class="menu-arrow"></i>
          </div>
        `}
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="copy">
          <i data-lucide="copy" class="icon"></i>
          <span class="label">Copy</span>
          <span class="shortcut">Ctrl+C</span>
        </div>
        <div class="menu-item" data-action="cut">
          <i data-lucide="scissors" class="icon"></i>
          <span class="label">Cut</span>
          <span class="shortcut">Ctrl+X</span>
        </div>
        <div class="menu-item ${multi ? 'disabled' : ''}" data-action="duplicate">
          <i data-lucide="copy-plus" class="icon"></i>
          <span class="label">Duplicate</span>
        </div>
        <div class="menu-item ${multi ? 'disabled' : ''}" data-action="rename">
          <i data-lucide="pencil-line" class="icon"></i>
          <span class="label">Rename…</span>
          <span class="shortcut">F2</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="properties">
          <i data-lucide="info" class="icon"></i>
          <span class="label">Properties</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item danger" data-action="trash">
          <i data-lucide="trash-2" class="icon"></i>
          <span class="label">Move to Trash</span>
          <span class="shortcut">Del</span>
        </div>
      `;

      positionMenu(menu, x, y);
      renderIcons(self._root);

      menu.querySelectorAll('.menu-item').forEach(mi => {
        mi.addEventListener('click', () => {
          if (mi.classList.contains('disabled')) return;
          const action = mi.dataset.action;
          closeAllMenus();
          handleFileAction(action, nodeId);
        });
      });
    }

    function handleFileAction(action, nodeId) {
      switch (action) {
        case 'open': {
          const node = fsNodes.get(nodeId);
          if (node) {
            if (node.type === 'folder') navigateTo(nodeId);
            else showProperties(nodeId);
          }
          break;
        }
        case 'open-new-tab':
          createTab(nodeId);
          renderAll();
          break;
        case 'open-with':
          showToast('Application picker is illustrative in this demo', 'info');
          break;
        case 'copy': copySelection(); break;
        case 'cut': cutSelection(); break;
        case 'rename':
          if (state.selection.size === 1) showRenameDialog(nodeId);
          break;
        case 'duplicate': duplicateNode(nodeId); break;
        case 'properties': showProperties(nodeId); break;
        case 'trash': trashSelection(); break;
      }
    }

    function showBackgroundContextMenu(x, y) {
      closeAllMenus();
      const tab = getActiveTab();
      const isDashboard = tab && tab.nodeId === 'dashboard';

      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="menu-item ${isDashboard ? 'disabled' : ''}" data-action="new-folder">
          <i data-lucide="folder-plus" class="icon"></i>
          <span class="label">New folder</span>
          <span class="shortcut">Ctrl+Shift+N</span>
        </div>
        <div class="menu-item ${isDashboard ? 'disabled' : ''}" data-action="new-file">
          <i data-lucide="file-plus" class="icon"></i>
          <span class="label">New file</span>
        </div>
        <div class="menu-item" data-action="import">
          <i data-lucide="upload" class="icon"></i>
          <span class="label">Import files…</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item ${(!state.clipboard || isDashboard) ? 'disabled' : ''}" data-action="paste">
          <i data-lucide="clipboard-paste" class="icon"></i>
          <span class="label">Paste</span>
          <span class="shortcut">Ctrl+V</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="select-all">
          <i data-lucide="square-mouse-pointer" class="icon"></i>
          <span class="label">Select all</span>
          <span class="shortcut">Ctrl+A</span>
        </div>
        <div class="menu-item" data-action="refresh">
          <i data-lucide="refresh-cw" class="icon"></i>
          <span class="label">Refresh</span>
          <span class="shortcut">F5</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="properties-folder">
          <i data-lucide="info" class="icon"></i>
          <span class="label">Properties</span>
        </div>
      `;

      positionMenu(menu, x, y);
      renderIcons(self._root);

      menu.querySelectorAll('.menu-item').forEach(mi => {
        mi.addEventListener('click', () => {
          if (mi.classList.contains('disabled')) return;
          const action = mi.dataset.action;
          closeAllMenus();
          switch (action) {
            case 'new-folder': showNewFolderDialog(); break;
            case 'new-file': showNewFileDialog(); break;
            case 'import': triggerFileImport(); break;
            case 'paste': pasteClipboard(); break;
            case 'select-all': selectAll(); break;
            case 'refresh':
              renderAll();
              showToast('Refreshed', 'info');
              break;
            case 'properties-folder':
              if (tab) showProperties(tab.nodeId);
              break;
          }
        });
      });
    }

    function showSortMenu(x, y, openAbove = false) {
      closeAllMenus();
      const options = [
        { key: 'name', label: 'Name' },
        { key: 'size', label: 'Size' },
        { key: 'type', label: 'Type' },
        { key: 'modified', label: 'Date modified' },
      ];
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `<div class="menu-section-label">Sort by</div>` +
        options.map(o => `
          <div class="menu-item" data-sort="${o.key}">
            <i data-lucide="${state.sortBy === o.key ? 'check' : 'circle'}" class="icon" style="${state.sortBy === o.key ? 'color:var(--accent)' : 'opacity:0'}"></i>
            <span class="label">${o.label}</span>
          </div>
        `).join('') +
        `<div class="menu-separator"></div>
        <div class="menu-section-label">Order</div>
        <div class="menu-item" data-dir="asc">
          <i data-lucide="${state.sortDir === 'asc' ? 'check' : 'circle'}" class="icon" style="${state.sortDir === 'asc' ? 'color:var(--accent)' : 'opacity:0'}"></i>
          <span class="label">Ascending</span>
        </div>
        <div class="menu-item" data-dir="desc">
          <i data-lucide="${state.sortDir === 'desc' ? 'check' : 'circle'}" class="icon" style="${state.sortDir === 'desc' ? 'color:var(--accent)' : 'opacity:0'}"></i>
          <span class="label">Descending</span>
        </div>`;
      positionMenu(menu, x, y, openAbove);
      renderIcons(self._root);

      menu.querySelectorAll('[data-sort]').forEach(mi => {
        mi.addEventListener('click', () => {
          state.sortBy = mi.dataset.sort;
          state.sortDir = 'asc';
          closeAllMenus();
          renderContent();
          renderStatusbar();
        });
      });
      menu.querySelectorAll('[data-dir]').forEach(mi => {
        mi.addEventListener('click', () => {
          state.sortDir = mi.dataset.dir;
          closeAllMenus();
          renderContent();
          renderStatusbar();
        });
      });
    }

    function showMoreMenu(x, y) {
      closeAllMenus();
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="menu-item" data-action="select-all">
          <i data-lucide="square-mouse-pointer" class="icon"></i>
          <span class="label">Select all</span>
          <span class="shortcut">Ctrl+A</span>
        </div>
        <div class="menu-item" data-action="invert">
          <i data-lucide="list-checks" class="icon"></i>
          <span class="label">Invert selection</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="terminal">
          <i data-lucide="terminal" class="icon"></i>
          <span class="label">Open terminal here</span>
        </div>
        <div class="menu-item" data-action="import">
          <i data-lucide="upload" class="icon"></i>
          <span class="label">Import files…</span>
        </div>
        <div class="menu-item" data-action="export">
          <i data-lucide="download" class="icon"></i>
          <span class="label">Export listing…</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="properties-folder">
          <i data-lucide="info" class="icon"></i>
          <span class="label">Folder properties</span>
        </div>
      `;
      positionMenu(menu, x, y);
      renderIcons(self._root);

      menu.querySelectorAll('.menu-item').forEach(mi => {
        mi.addEventListener('click', () => {
          const action = mi.dataset.action;
          closeAllMenus();
          switch (action) {
            case 'select-all': selectAll(); break;
            case 'invert': {
              const items = getCurrentItems();
              const newSel = new Set();
              items.forEach(it => { if (!state.selection.has(it.id)) newSel.add(it.id); });
              state.selection = newSel;
              const tab = getActiveTab();
              if (tab) tab.selectedIds = state.selection;
              updateSelectionUI();
              break;
            }
            case 'terminal': showToast('Terminal requires system integration not available in browser', 'info'); break;
            case 'import': triggerFileImport(); break;
            case 'export': showToast('Listing exported to clipboard', 'success'); break;
            case 'properties-folder':
              const tab = getActiveTab();
              if (tab) showProperties(tab.nodeId);
              break;
          }
        });
      });
    }

    function showTabContextMenu(x, y, tabId) {
      closeAllMenus();
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="menu-item" data-action="new-tab-right">
          <i data-lucide="plus" class="icon"></i>
          <span class="label">New tab to the right</span>
        </div>
        <div class="menu-item" data-action="duplicate-tab">
          <i data-lucide="copy" class="icon"></i>
          <span class="label">Duplicate this tab</span>
        </div>
        <div class="menu-separator"></div>
        <div class="menu-item" data-action="close">
          <i data-lucide="x" class="icon"></i>
          <span class="label">Close tab</span>
        </div>
        <div class="menu-item" data-action="close-others">
          <i data-lucide="square-x" class="icon"></i>
          <span class="label">Close other tabs</span>
        </div>
      `;
      positionMenu(menu, x, y);
      renderIcons(self._root);

      menu.querySelectorAll('.menu-item').forEach(mi => {
        mi.addEventListener('click', () => {
          const action = mi.dataset.action;
          closeAllMenus();
          const tab = state.tabs.find(t => t.id === tabId);
          if (!tab) return;
          switch (action) {
            case 'new-tab-right':
              createTab(tab.nodeId);
              renderAll();
              break;
            case 'duplicate-tab':
              const dup = createTab(tab.nodeId);
              state.activeTabId = dup.id;
              renderAll();
              break;
            case 'close':
              closeTab(tabId);
              break;
            case 'close-others':
              state.tabs = state.tabs.filter(t => t.id === tabId);
              state.activeTabId = tabId;
              renderAll();
              break;
          }
        });
      });
    }

    // ============================================================
    //  File operations
    // ============================================================

    function copySelection() {
      if (state.selection.size === 0) return;
      state.clipboard = { mode: 'copy', ids: Array.from(state.selection) };
      updateActionButtons();
      showToast(`Copied ${state.selection.size} item${state.selection.size > 1 ? 's' : ''}`, 'success');
    }

    function cutSelection() {
      if (state.selection.size === 0) return;
      state.clipboard = { mode: 'cut', ids: Array.from(state.selection) };
      updateActionButtons();
      showToast(`Cut ${state.selection.size} item${state.selection.size > 1 ? 's' : ''}`, 'success');
    }

    function pasteClipboard() {
      if (!state.clipboard) return;
      const tab = getActiveTab();
      if (!tab || tab.nodeId === 'dashboard') return;

      const dest = fsNodes.get(tab.nodeId);
      if (!dest || !dest.children) return;

      let count = 0;
      for (const id of state.clipboard.ids) {
        const node = fsNodes.get(id);
        if (!node) continue;
        if (state.clipboard.mode === 'cut' && (id === tab.nodeId || isAncestor(id, tab.nodeId))) continue;

        let newName = node.name;
        if (state.clipboard.mode === 'copy') {
          newName = getUniqueName(dest, node.name);
          cloneNodeTree(node, dest, newName);
        } else {
          const oldParent = fsNodes.get(node.parentId);
          if (oldParent) {
            const idx = oldParent.children.indexOf(id);
            if (idx >= 0) oldParent.children.splice(idx, 1);
          }
          node.parentId = dest.id;
          node.name = newName;
          dest.children.push(id);
        }
        count++;
      }

      if (state.clipboard.mode === 'cut') state.clipboard = null;
      state.selection.clear();
      renderAll();
      if (count > 0) showToast(`Pasted ${count} item${count > 1 ? 's' : ''}`, 'success');
    }

    function cloneNodeTree(node, parent, name) {
      const clone = createNode({
        name: name,
        type: node.type,
        parentId: parent.id,
        size: node.size,
        meta: { ...node.meta },
      });
      parent.children.push(clone.id);
      if (node.children) {
        for (const cid of node.children) {
          const child = fsNodes.get(cid);
          if (child) cloneNodeTree(child, clone, child.name);
        }
      }
      return clone;
    }

    function getUniqueName(parent, name) {
      if (!getChildByName(parent.id, name)) return name;
      const dot = name.lastIndexOf('.');
      const base = dot > 0 ? name.substring(0, dot) : name;
      const ext = dot > 0 ? name.substring(dot) : '';
      let i = 1;
      while (getChildByName(parent.id, `${base} (copy${i > 1 ? ' ' + i : ''})${ext}`)) i++;
      return `${base} (copy${i > 1 ? ' ' + i : ''})${ext}`;
    }

    function trashSelection() {
      if (state.selection.size === 0) return;
      const count = state.selection.size;

      if (count >= 3) {
        showConfirmDialog(
          `Move ${count} items to trash?`,
          `These ${count} items will be moved to the trash. You can restore them later from the Trash.`,
          () => doTrash()
        );
      } else {
        doTrash();
      }
    }

    function doTrash() {
      const tab = getActiveTab();
      if (!tab) return;
      const parent = fsNodes.get(tab.nodeId);
      if (!parent || !parent.children) return;

      const count = state.selection.size;
      for (const id of state.selection) {
        const idx = parent.children.indexOf(id);
        if (idx >= 0) parent.children.splice(idx, 1);
      }
      state.selection.clear();
      renderAll();
      showToast(`Moved ${count} item${count > 1 ? 's' : ''} to trash`, 'success');
    }

    function duplicateNode(nodeId) {
      const node = fsNodes.get(nodeId);
      if (!node || !node.parentId) return;
      const parent = fsNodes.get(node.parentId);
      if (!parent) return;
      const newName = getUniqueName(parent, node.name);
      cloneNodeTree(node, parent, newName);
      state.selection.clear();
      renderAll();
      showToast('Item duplicated', 'success');
    }

    function showRenameDialog(nodeId) {
      const node = fsNodes.get(nodeId);
      if (!node) return;
      showDialog({
        title: 'Rename item',
        desc: 'Enter a new name for this item.',
        input: { value: node.name, selectName: true },
        primaryLabel: 'Rename',
        onPrimary: (val) => {
          if (!val || val === node.name) return;
          const parent = fsNodes.get(node.parentId);
          if (parent && getChildByName(parent.id, val) && val !== node.name) {
            showToast('An item with this name already exists', 'error');
            return;
          }
          node.name = val;
          node.modified = new Date();
          renderAll();
          showToast('Renamed successfully', 'success');
        }
      });
    }

    function showNewFolderDialog() {
      const tab = getActiveTab();
      if (!tab || tab.nodeId === 'dashboard') {
        showToast('Cannot create folders on the Dashboard', 'info');
        return;
      }
      const parent = fsNodes.get(tab.nodeId);
      if (!parent) return;
      const name = getUniqueName(parent, 'New Folder');
      showDialog({
        title: 'New folder',
        desc: 'Enter a name for the new folder.',
        input: { value: name, selectName: true },
        primaryLabel: 'Create',
        onPrimary: (val) => {
          if (!val) return;
          if (getChildByName(parent.id, val)) {
            showToast('An item with this name already exists', 'error');
            return;
          }
          const node = createNode({ name: val, type: 'folder', parentId: parent.id });
          parent.children.push(node.id);
          parent.expanded = true;
          renderAll();
          showToast('Folder created', 'success');
        }
      });
    }

    function showNewFileDialog() {
      const tab = getActiveTab();
      if (!tab || tab.nodeId === 'dashboard') {
        showToast('Cannot create files on the Dashboard', 'info');
        return;
      }
      const parent = fsNodes.get(tab.nodeId);
      if (!parent) return;
      const name = getUniqueName(parent, 'untitled.txt');
      showDialog({
        title: 'New file',
        desc: 'Enter a name for the new file.',
        input: { value: name, selectName: true },
        primaryLabel: 'Create',
        onPrimary: (val) => {
          if (!val) return;
          if (getChildByName(parent.id, val)) {
            showToast('An item with this name already exists', 'error');
            return;
          }
          const node = createNode({ name: val, type: 'text', parentId: parent.id, size: 0 });
          parent.children.push(node.id);
          renderAll();
          showToast('File created', 'success');
        }
      });
    }

    // ============================================================
    //  Properties panel
    // ============================================================

    let propertiesPanelEl = null;

    function showProperties(nodeId) {
      const node = fsNodes.get(nodeId);
      if (!node || node.type === 'dashboard') return;

      if (propertiesPanelEl) propertiesPanelEl.remove();

      const meta = getFileMeta(node);
      const location = getPath(nodeId).slice(0, -1).map(p => p.name).join(' / ') || '/';

      let preview = `<div class="prop-preview"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>`;

      let rows = `
        <div class="prop-row"><span class="key">Type</span><span class="val">${meta.label}</span></div>
        <div class="prop-row"><span class="key">Location</span><span class="val" title="${escapeHtml(location)}">${escapeHtml(location)}</span></div>
        <div class="prop-row"><span class="key">Size</span><span class="val">${node.type === 'folder' ? '—' : formatSize(node.size)}</span></div>
        <div class="prop-row"><span class="key">Modified</span><span class="val">${formatDate(node.modified)}</span></div>
      `;

      if (node.type === 'image' && node.meta.w) {
        rows += `<div class="prop-row"><span class="key">Dimensions</span><span class="val">${node.meta.w} × ${node.meta.h}</span></div>`;
      }
      if (node.type === 'folder') {
        const childCount = node.children ? node.children.length : 0;
        rows += `<div class="prop-row"><span class="key">Items</span><span class="val">${childCount}</span></div>`;
      }

      const panel = document.createElement('div');
      panel.className = 'properties-panel';
      panel.innerHTML = `
        <div class="properties-header">
          <div class="icon-wrap"><i data-lucide="${meta.icon}" class="${meta.class}"></i></div>
          <div style="overflow:hidden;flex:1">
            <div class="name">${escapeHtml(node.name)}</div>
            <div class="type">${meta.label}</div>
          </div>
          <button class="properties-close" id="propClose">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="properties-body">
          ${preview}
          ${rows}
        </div>
      `;

      self._root.appendChild(panel);
      propertiesPanelEl = panel;
      renderIcons(self._root);

      $('#propClose').addEventListener('click', () => {
        panel.remove();
        propertiesPanelEl = null;
      });
    }

    // ============================================================
    //  Dialogs
    // ============================================================

    function showDialog({ title, desc, input, primaryLabel, onPrimary, danger }) {
      const backdrop = document.createElement('div');
      backdrop.className = 'dialog-backdrop';

      const inputHtml = input ? `<input type="text" class="dialog-input" id="dialogInput" value="${escapeHtml(input.value)}">` : '';

      backdrop.innerHTML = `
        <div class="dialog">
          <div class="dialog-title">${escapeHtml(title)}</div>
          ${desc ? `<div class="dialog-desc">${escapeHtml(desc)}</div>` : ''}
          ${inputHtml}
          <div class="dialog-actions">
            <button class="btn btn-secondary" id="dialogCancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="dialogPrimary">${escapeHtml(primaryLabel)}</button>
          </div>
        </div>
      `;

      self._root.appendChild(backdrop);
      renderIcons(self._root);

      const inputEl = $('#dialogInput');
      if (inputEl) {
        setTimeout(() => {
          inputEl.focus();
          if (input && input.selectName) {
            const dot = inputEl.value.lastIndexOf('.');
            if (dot > 0) inputEl.setSelectionRange(0, dot);
            else inputEl.select();
          } else {
            inputEl.select();
          }
        }, 30);

        inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const val = inputEl.value.trim();
            backdrop.remove();
            if (onPrimary) onPrimary(val);
          } else if (e.key === 'Escape') {
            backdrop.remove();
          }
        });
      }

      $('#dialogCancel').addEventListener('click', () => backdrop.remove());
      $('#dialogPrimary').addEventListener('click', () => {
        const val = inputEl ? inputEl.value.trim() : true;
        backdrop.remove();
        if (onPrimary) onPrimary(val);
      });

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.remove();
      });
    }

    function showConfirmDialog(title, desc, onConfirm) {
      showDialog({
        title, desc, primaryLabel: 'Move to Trash', danger: true, onPrimary: () => onConfirm()
      });
    }

    // ============================================================
    //  Toasts
    // ============================================================

    function showToast(message, type = 'info') {
      const container = $('#toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      const iconName = type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-circle' : 'info';
      toast.innerHTML = `<i data-lucide="${iconName}" class="icon"></i><span>${escapeHtml(message)}</span>`;
      container.appendChild(toast);
      renderIcons(self._root);
      // set this notification as THIS window's client state so the dock app
      // button's doughnut slice for this window reflects it (success=green,
      // error=red, info=blue/notification). Per-window, not broadcast.
      const state = type === 'success' ? 'success' : type === 'error' ? 'error' : 'notification';
      const winId = self.closest('de-app-window')?.dataset.windowId;
      try { commands.execute('window.setAppState', { id: winId, state }); } catch (e) { /* noop */ }
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(24px)';
        toast.style.transition = 'all 200ms';
        setTimeout(() => toast.remove(), 200);
      }, 2600);
    }

    // ============================================================
    //  Utilities
    // ============================================================

    function selectAll() {
      const items = getCurrentItems();
      state.selection.clear();
      items.forEach(it => state.selection.add(it.id));
      const tab = getActiveTab();
      if (tab) tab.selectedIds = state.selection;
      updateSelectionUI();
    }

    function triggerFileImport() {
      const tab = getActiveTab();
      if (!tab || tab.nodeId === 'dashboard') {
        showToast('Cannot import files directly to the Dashboard', 'info');
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = (e) => {
        const files = e.target.files;
        const parent = fsNodes.get(tab.nodeId);
        if (!parent) return;
        for (const f of files) {
          const ext = f.name.split('.').pop().toLowerCase();
          let type = 'generic';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) type = 'image';
          else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
          else if (['mp3', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) type = 'audio';
          else if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'borg'].includes(ext)) type = 'archive';
          else if (['js', 'ts', 'tsx', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml', 'css', 'html'].includes(ext)) type = 'code';
          else if (['txt', 'md', 'rst'].includes(ext)) type = 'text';
          else if (ext === 'pdf') type = 'pdf';
          else if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) type = 'doc';
          else if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) type = 'sheet';
          else if (['deb', 'rpm', 'appimage', 'snap'].includes(ext)) type = 'app';

          const node = createNode({
            name: f.name,
            type: type,
            size: f.size,
            parentId: parent.id,
          });
          parent.children.push(node.id);
        }
        renderAll();
        showToast(`Imported ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
      };
      input.click();
    }

    // ============================================================
    //  Event wiring
    // ============================================================

    function initEvents() {
      $('#backBtn').addEventListener('click', goBack);
      $('#forwardBtn').addEventListener('click', goForward);
      $('#upBtn').addEventListener('click', goUp);
      $('#refreshBtn').addEventListener('click', () => {
        renderAll();
        showToast('Refreshed', 'info');
      });

      $('#searchInput').addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderContent();
        renderStatusbar();
      });

      $('#newFolderBtn').addEventListener('click', showNewFolderDialog);
      $('#newFileBtn').addEventListener('click', showNewFileDialog);
      $('#pasteBtn').addEventListener('click', pasteClipboard);

      $('#copyBtn').addEventListener('click', copySelection);
      $('#cutBtn').addEventListener('click', cutSelection);
      $('#renameBtn').addEventListener('click', () => {
        if (state.selection.size === 1) showRenameDialog(Array.from(state.selection)[0]);
      });
      $('#deleteBtn').addEventListener('click', trashSelection);

      $('#moreMenuBtn').addEventListener('click', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        showMoreMenu(rect.left - 120, rect.bottom + 4);
      });

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (!self._focused) return;
        const ae = self._root.activeElement;
        const isInput = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
        if (isInput) {
          if (e.key === 'Escape' && ae.id === 'searchInput') {
            ae.value = '';
            state.searchQuery = '';
            renderContent();
            renderStatusbar();
            ae.blur();
          }
          return;
        }

        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'c': e.preventDefault(); copySelection(); break;
            case 'x': e.preventDefault(); cutSelection(); break;
            case 'v': e.preventDefault(); pasteClipboard(); break;
            case 'a': e.preventDefault(); selectAll(); break;
            case 't': e.preventDefault();
              const tab = getActiveTab();
              createTab(tab ? tab.nodeId : state.dashboardId);
              renderAll();
              break;
            case 'w': e.preventDefault();
              if (state.activeTabId) closeTab(state.activeTabId);
              break;
          }
        } else {
          switch (e.key) {
            case 'F2':
              e.preventDefault();
              if (state.selection.size === 1) showRenameDialog(Array.from(state.selection)[0]);
              break;
            case 'Delete':
              e.preventDefault();
              trashSelection();
              break;
            case 'Escape':
              if ($('.context-menu')) {
                closeAllMenus();
              } else if (propertiesPanelEl) {
                propertiesPanelEl.remove();
                propertiesPanelEl = null;
              } else if ($('.dialog-backdrop')) {
                $('.dialog-backdrop').remove();
              } else {
                state.selection.clear();
                const tab2 = getActiveTab();
                if (tab2) tab2.selectedIds = state.selection;
                updateSelectionUI();
              }
              break;
            case 'Enter':
              if (state.selection.size === 1 && !$('.dialog-backdrop')) {
                const id = Array.from(state.selection)[0];
                const node = fsNodes.get(id);
                if (node) {
                  if (node.type === 'folder') navigateTo(id);
                  else showProperties(id);
                }
              }
              break;
            case 'Backspace':
              if (!e.target.matches('input,textarea')) {
                e.preventDefault();
                goBack();
              }
              break;
          }
        }
      });

      document.addEventListener('click', (e) => {
        const _path = e.composedPath();
        const _insideMenu = _path.some(el => el.nodeType === 1 && el.classList && el.classList.contains('context-menu'));
        if (!_insideMenu) closeAllMenus();
      });

      $('#contentScroll').addEventListener('contextmenu', (e) => {
        if (e.target.closest('.file-item, .list-row, .list-header, .widget-box')) return;
        e.preventDefault();
        showBackgroundContextMenu(e.clientX, e.clientY);
      });

      // Sidebar resize
      const resizeHandle = $('#sidebarResize');
      let resizing = false;
      resizeHandle.addEventListener('mousedown', (e) => {
        resizing = true;
        resizeHandle.classList.add('sidebar-resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!resizing) return;
        const w = Math.max(220, Math.min(400, e.clientX));
        state.sidebarWidth = w;
        self.style.setProperty('--sidebar-w', w + 'px');
      });
      document.addEventListener('mouseup', () => {
        if (resizing) {
          resizing = false;
          resizeHandle.classList.remove('sidebar-resizing');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });

      window.addEventListener('resize', () => {
        closeAllMenus();
      });

      // Drag and drop file import
      const contentEl = $('#contentScroll');
      contentEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      });
      contentEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;
        const tab = getActiveTab();
        if (!tab || tab.nodeId === 'dashboard') {
          showToast('Cannot drop files directly to the Dashboard', 'info');
          return;
        }
        const parent = fsNodes.get(tab.nodeId);
        if (!parent) return;
        for (const f of files) {
          const ext = f.name.split('.').pop().toLowerCase();
          let type = 'generic';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) type = 'image';
          else if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) type = 'video';
          else if (['mp3', 'ogg', 'flac', 'wav', 'm4a'].includes(ext)) type = 'audio';
          else if (['zip', 'tar', 'gz', 'bz2', '7z', 'rar'].includes(ext)) type = 'archive';
          else if (['js', 'ts', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'rb', 'php', 'sh', 'json', 'yaml', 'yml', 'toml'].includes(ext)) type = 'code';
          else if (['txt', 'md', 'rst'].includes(ext)) type = 'text';
          else if (ext === 'pdf') type = 'pdf';

          const node = createNode({
            name: f.name,
            type: type,
            size: f.size,
            parentId: parent.id,
          });
          parent.children.push(node.id);
        }
        renderAll();
        showToast(`Dropped ${files.length} file${files.length > 1 ? 's' : ''}`, 'success');
      });

      self.style.setProperty('--sidebar-w', state.sidebarWidth + 'px');
    }

    // ============================================================
    //  Initialize
    // ============================================================

    function init() {
      state.homeId = initFilesystem();
      createTab(state.dashboardId); // Open directly to the Dashboard
      initEvents();
      state.viewMode = 'grid';
      renderAll();

      setTimeout(() => {
        showToast('Welcome to Aether Files', 'info');
      }, 400);
    }

    init();

  }
}

customElements.define('fe-app', FeApp);
