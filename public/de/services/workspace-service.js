/**
 * workspace-service.js — virtual desktops (workspaces).
 *
 * Nine workspaces; each owns its own theme, light/dark mode, windowing layout,
 * and set of open windows. Switching workspaces swaps all of these at once.
 *
 * window-service and theme-service delegate to the ACTIVE workspace's fields,
 * so the rest of the system (shell, dock, components) reads them unchanged.
 * Window ELEMENTS persist across switches (the shell hides inactive-workspace
 * windows instead of destroying them), so an app's in-window state survives a
 * workspace round-trip.
 */
import { bus } from '../core/event-bus.js';

const DEFAULTS = { theme: 'Midnight', mode: 'dark', layoutMode: 'floating' };

const workspaces = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  theme: DEFAULTS.theme,
  mode: DEFAULTS.mode,
  layoutMode: DEFAULTS.layoutMode,
  windows: [],
  focusedId: null,
  zTop: 10,
}));

let activeId = 1;

const wsListeners = new Set();
const winListeners = new Set();
const themeListeners = new Set();

export function onWorkspacesChange(fn) { return _sub(wsListeners, fn); }
export function onWindowsChange(fn) { return _sub(winListeners, fn); }
export function onTheme(fn) { return _sub(themeListeners, fn); }

function _sub(set, fn) { set.add(fn); return () => set.delete(fn); }

function emitWin() { for (const fn of winListeners) fn(workspaceService.active); bus.emit('windows.change', workspaceService.active); }
function emitTheme() { for (const fn of themeListeners) fn({ theme: workspaceService.active.theme, mode: workspaceService.active.mode }); bus.emit('theme.change', { theme: workspaceService.active.theme, mode: workspaceService.active.mode }); }
function emitWs() { for (const fn of wsListeners) fn({ workspaces, activeId }); bus.emit('workspaces.change', { workspaces, activeId }); }

/** notify after a window/layout change in the active workspace */
export function notifyWindows() { emitWin(); }
/** notify after a theme/mode change in the active workspace */
export function notifyTheme() { emitTheme(); }

export const workspaceService = {
  get workspaces() { return workspaces; },
  get activeId() { return activeId; },
  get active() { return workspaces[activeId - 1]; },

  /** switch to a different workspace (swaps theme/mode/layout/windows at once) */
  switchTo(id) {
    if (id < 1 || id > 9 || id === activeId) return;
    activeId = id;
    emitWin();   // shell re-renders windows (hides old, shows new)
    emitTheme(); // shell re-applies theme + wallpaper
    emitWs();    // dock updates the active dot
  },

  /** notify all three subscriber groups (used by window/theme mutations) */
  notifyAll() { emitWin(); emitTheme(); emitWs(); },
};

export default workspaceService;
