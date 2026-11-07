/**
 * window-service.js — open-window registry, now workspace-aware.
 *
 * State lives in workspace-service (one set of windows/layout/focus/z per
 * workspace). This module is the mutation API: open/close/focus/move/resize/
 * setLayoutMode. All operate on the ACTIVE workspace; focus/move/resize find
 * the window's owning workspace so they work even if it isn't active.
 *
 * Layout modes:
 *   - 'horizontal': windows tile side-by-side (one row of N columns).
 *   - 'vertical':   windows tile stacked (one column of N rows).
 *   - 'floating':   windows are free — draggable (titlebar) + resizable (8
 *                   handles); last-focused is on top (z-order).
 */
import { workspaceService, notifyWindows, onWindowsChange } from './workspace-service.js';

let _seq = 0;

function defaultSizeFor(appId) {
  if (appId === 'files') return { w: 1180, h: 720 };
  return { w: 1000, h: 620 };
}

/** find a window across all workspaces → {w, ws} */
function _find(id) {
  for (const ws of workspaceService.workspaces) {
    const w = ws.windows.find((x) => x.id === id);
    if (w) return { w, ws };
  }
  return null;
}

export const windowService = {
  get state() { return workspaceService.active; },
  get windows() { return workspaceService.active.windows; },
  /** ALL windows across every workspace (for the shell to render+hide inactive) */
  get allWindows() { return workspaceService.workspaces.flatMap((ws) => ws.windows); },
  get focusedId() { return workspaceService.active.focusedId; },
  get layoutMode() { return workspaceService.active.layoutMode; },

  open(appId, opts = {}) {
    const ws = workspaceService.active;
    // unless forceNew, focus an existing window of this app in this workspace
    if (!opts.forceNew) {
      const existing = ws.windows.find((w) => w.appId === appId && w.workspaceId === ws.id);
      if (existing) {
        existing.minimized = false;
        existing.z = ++ws.zTop;
        ws.focusedId = existing.id;
        notifyWindows();
        return existing;
      }
    }
    const id = `win_${++_seq}`;
    const dft = defaultSizeFor(appId);
    const n = ws.windows.length;
    const cascade = 26;
    const w = {
      id,
      appId,
      title: opts.title || appId,
      icon: opts.icon,
      titlebar: opts.titlebar !== false,
      workspaceId: ws.id,
      el: null,
      z: ++ws.zTop,
      minimized: false,
      maximized: false,
      // window-client state for the dock doughnut indicator:
      // clientState ('opened'|'collapsed') is derived from `minimized`;
      // appState (null|'notification'|'success'|'error'|'warning'|'downloading')
      // is set by apps and overrides the color. 'downloading' animates a
      // progress arc that fills its slice, then resolves to 'success'.
      appState: null,
      progress: 0,            // 0–100, used while appState === 'downloading'
      _appStateTimer: null,
      _downloadTimer: null,
      tileRatio: 1,           // relative width/height of this window's tile in a tiling layout
      x: opts.x ?? Math.max(8, 80 + (n % 6) * cascade),
      y: opts.y ?? Math.max(8, 24 + (n % 6) * cascade),
      w: opts.w ?? dft.w,
      h: opts.h ?? dft.h,
    };
    ws.windows.push(w);
    ws.focusedId = id;
    notifyWindows();
    return w;
  },

  close(id) {
    const found = _find(id);
    if (!found) return;
    const { w, ws } = found;
    const i = ws.windows.indexOf(w);
    ws.windows.splice(i, 1);
    if (ws.focusedId === id) {
      ws.focusedId = ws.windows.length ? ws.windows[ws.windows.length - 1].id : null;
      if (ws.focusedId) {
        const f = ws.windows.find((x) => x.id === ws.focusedId);
        if (f) f.z = ++ws.zTop;
      }
    }
    notifyWindows();
  },

  closeByApp(appId) {
    const ws = workspaceService.active;
    ws.windows.filter((w) => w.appId === appId).forEach((w) => this.close(w.id));
  },

  /** raise to top + focus (last-active = top z) */
  focus(id) {
    const found = _find(id);
    if (!found) return;
    const { w, ws } = found;
    w.minimized = false;
    w.z = ++ws.zTop;
    ws.focusedId = id;
    notifyWindows();
  },

  minimize(id) {
    const found = _find(id);
    if (!found) return;
    const { w, ws } = found;
    w.minimized = true;
    if (ws.focusedId === id) {
      const vis = ws.windows.filter((x) => !x.minimized);
      ws.focusedId = vis.length ? vis[vis.length - 1].id : null;
      if (ws.focusedId) {
        const f = ws.windows.find((x) => x.id === ws.focusedId);
        if (f) f.z = ++ws.zTop;
      }
    }
    notifyWindows();
  },

  toggleMaximize(id) {
    const found = _find(id);
    if (!found) return;
    const { w, ws } = found;
    w.maximized = !w.maximized;
    if (w.maximized) { w.z = ++ws.zTop; ws.focusedId = id; }
    notifyWindows();
  },

  // ---- floating-mode geometry (committed on drag/resize end) ----
  move(id, x, y) {
    const found = _find(id); if (!found) return;
    found.w.x = x; found.w.y = y;
  },
  resize(id, x, y, wv, hv) {
    const found = _find(id); if (!found) return;
    found.w.x = x; found.w.y = y; found.w.w = wv; found.w.h = hv;
  },

  // ---- window-client state (dock doughnut indicator) ----
  /** set the app notification state on a specific window; auto-clears after `duration`ms */
  setAppState(id, state, duration = 2600) {
    const found = _find(id); if (!found) return;
    const { w } = found;
    if (state === 'downloading') { this.startDownload(id, duration); return; }
    if (w._appStateTimer) { clearTimeout(w._appStateTimer); w._appStateTimer = null; }
    w.appState = state || null;
    if (w.appState && duration > 0) {
      w._appStateTimer = setTimeout(() => { w.appState = null; w._appStateTimer = null; notifyWindows(); }, duration);
    }
    notifyWindows();
  },
  /** set the app state on every window of `appId` in the active workspace (used by apps to broadcast a toast/notification) */
  notifyByApp(appId, state, duration = 2600) {
    const ws = workspaceService.active;
    const list = ws.windows.filter((w) => w.appId === appId);
    if (!list.length) return;
    if (state === 'downloading') { list.forEach((w) => this.startDownload(w.id, duration)); return; }
    list.forEach((w) => {
      if (w._appStateTimer) { clearTimeout(w._appStateTimer); w._appStateTimer = null; }
      w.appState = state || null;
      if (w.appState && duration > 0) {
        w._appStateTimer = setTimeout(() => { w.appState = null; w._appStateTimer = null; notifyWindows(); }, duration);
      }
    });
    notifyWindows();
  },
  /**
   * Start a download: appState='downloading' with a progress that animates 0→100
   * over `duration`ms (the dock doughnut renders the progress arc), then resolves
   * to 'success' for 2s, then clears.
   */
  startDownload(id, duration = 3000) {
    const found = _find(id); if (!found) return;
    const { w } = found;
    if (w._appStateTimer) { clearTimeout(w._appStateTimer); w._appStateTimer = null; }
    if (w._downloadTimer) { clearInterval(w._downloadTimer); w._downloadTimer = null; }
    w.appState = 'downloading';
    w.progress = 0;
    notifyWindows();
    const start = Date.now();
    w._downloadTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      w.progress = Math.min(100, (elapsed / duration) * 100);
      notifyWindows();
      if (w.progress >= 100) {
        clearInterval(w._downloadTimer); w._downloadTimer = null;
        w.appState = 'success'; w.progress = 0;
        notifyWindows();
        w._appStateTimer = setTimeout(() => { w.appState = null; w._appStateTimer = null; notifyWindows(); }, 2000);
      }
    }, 80);
  },
  clearAppState(id) {
    const found = _find(id); if (!found) return;
    const { w } = found;
    if (w._appStateTimer) { clearTimeout(w._appStateTimer); w._appStateTimer = null; }
    if (w._downloadTimer) { clearInterval(w._downloadTimer); w._downloadTimer = null; }
    w.appState = null; w.progress = 0;
    notifyWindows();
  },

  /**
   * Adjust the tile ratios of two adjacent tiling windows in one shot (used
   * while dragging a tiling divider). `list` = [{id, ratio}, …]; each window's
   * tileRatio is set and a single notification fires.
   */
  setTileRatios(list) {
    if (!Array.isArray(list)) return;
    for (const { id, ratio } of list) {
      const found = _find(id);
      if (found) found.w.tileRatio = Math.max(0.15, ratio);
    }
    notifyWindows();
  },

  // ---- layout mode (per-workspace) ----
  setLayoutMode(mode) {
    if (!['horizontal', 'vertical', 'floating'].includes(mode)) return;
    if (workspaceService.active.layoutMode === mode) return;
    workspaceService.active.layoutMode = mode;
    // ensure floating windows have sane geometry
    if (mode === 'floating') {
      const ws = workspaceService.active;
      ws.windows.forEach((w, i) => {
        if (w.w == null || w.h == null) {
          const dft = defaultSizeFor(w.appId);
          w.w = dft.w; w.h = dft.h;
          w.x = w.x ?? Math.max(8, 80 + (i % 6) * 26);
          w.y = w.y ?? Math.max(8, 24 + (i % 6) * 26);
        }
      });
    }
    notifyWindows();
  },
  /** cycle horizontal → vertical → floating → horizontal */
  cycleLayoutMode() {
    const cur = workspaceService.active.layoutMode;
    const next = cur === 'horizontal' ? 'vertical' : cur === 'vertical' ? 'floating' : 'horizontal';
    this.setLayoutMode(next);
  },

  bindElement(id, el) {
    const found = _find(id); if (found) found.w.el = el;
  },

  isOpen(appId) { return workspaceService.active.windows.some((w) => w.appId === appId); },

  closeAll() {
    const ws = workspaceService.active;
    ws.windows = []; ws.focusedId = null;
    notifyWindows();
  },
};

export { onWindowsChange };
export default windowService;
