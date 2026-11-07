/**
 * theme-service.js — desktop theme state, now workspace-aware.
 *
 * Theme + light/dark mode are stored per-workspace in workspace-service; this
 * module is the thin facade (getters + setTheme/toggleMode/setMode/apply) that
 * the rest of the system reads unchanged.
 */
import { workspaceService, notifyTheme, onTheme } from './workspace-service.js';

export const themeService = {
  get state() { const a = workspaceService.active; return { theme: a.theme, mode: a.mode }; },
  get theme() { return workspaceService.active.theme; },
  get mode() { return workspaceService.active.mode; },

  setTheme(name) { workspaceService.active.theme = name; notifyTheme(); },
  toggleMode() { const a = workspaceService.active; a.mode = a.mode === 'dark' ? 'light' : 'dark'; notifyTheme(); },
  setMode(mode) { workspaceService.active.mode = mode; notifyTheme(); },
  apply({ theme, mode } = {}) {
    const a = workspaceService.active;
    if (theme) a.theme = theme;
    if (mode) a.mode = mode;
    notifyTheme();
  },
};

export { onTheme };
export default themeService;
