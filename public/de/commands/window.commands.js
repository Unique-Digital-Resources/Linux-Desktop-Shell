/**
 * window.commands.js — window-management commands.
 */
import { commands } from '../core/command-registry.js';
import windowService from '../services/window-service.js';
import { getApp } from '../data/apps.js';
import notify from '../services/notification-service.js';

export function registerWindowCommands() {
  commands.registerAll({
    /** open an app in a new (or focused) window
     * @param {{appId:string, title?:string, icon?:string, path?:string}} args
     */
    'window.open'(args) {
      if (!args || !args.appId) return;
      const app = getApp(args.appId);
      const title = args.title || (app && app.name) || args.appId;
      const icon = args.icon || (app && app.icon);
      // each app decides whether its window shows the chrome titlebar
      // (default true). Apps with their own top bar set titlebar: false.
      const titlebar = args.titlebar !== undefined ? args.titlebar : (app ? app.titlebar !== false : true);
      const w = windowService.open(args.appId, { title, icon, titlebar, forceNew: !!args.forceNew });
      // pass path through for file-explorer app
      if (args.path && w.el) {
        w.el.dataset.openPath = args.path;
      }
      return w;
    },

    /** @param {{id:string}} args */
    'window.close'(args) { if (args?.id) windowService.close(args.id); },
    'window.closeByApp'(args) { if (args?.appId) windowService.closeByApp(args.appId); },
    'window.focus'(args) { if (args?.id) windowService.focus(args.id); },
    'window.minimize'(args) { if (args?.id) windowService.minimize(args.id); },
    'window.toggleMaximize'(args) { if (args?.id) windowService.toggleMaximize(args.id); },
    'window.closeAll'() { windowService.closeAll(); },

    /** @param {{mode:'horizontal'|'vertical'|'floating'}} args */
    'window.setLayoutMode'(args) { if (args?.mode) windowService.setLayoutMode(args.mode); },
    /** cycle horizontal → vertical → floating → horizontal */
    'window.cycleLayoutMode'() { windowService.cycleLayoutMode(); },

    /** @param {{id:string, x:number, y:number}} args — commit a floating drag */
    'window.move'(args) { if (args?.id) windowService.move(args.id, args.x, args.y); },
    /** @param {{id:string, x:number, y:number, w:number, h:number}} args — commit a floating resize */
    'window.resize'(args) { if (args?.id) windowService.resize(args.id, args.x, args.y, args.w, args.h); },

    /**
     * Set a window-client notification state on one window (drives the dock
     * app-button doughnut color). Auto-clears after `duration`ms.
     * @param {{id:string, state:'notification'|'success'|'error'|'warning', duration?:number}} args
     */
    'window.setAppState'(args) { if (args?.id) windowService.setAppState(args.id, args.state, args.duration); },
    /**
     * Broadcast an app notification state to every window of `appId` in the
     * active workspace (apps call this when they show a toast).
     * @param {{appId:string, state:'notification'|'success'|'error'|'warning', duration?:number}} args
     */
    'window.notifyByApp'(args) { if (args?.appId) windowService.notifyByApp(args.appId, args.state, args.duration); },
    'window.clearAppState'(args) { if (args?.id) windowService.clearAppState(args.id); },
    /** @param {{list:{id:string,ratio:number}[]}} args — adjust tiling tile ratios (divider drag) */
    'window.setTileRatios'(args) { if (Array.isArray(args?.list)) windowService.setTileRatios(args.list); },
  });
}

export default registerWindowCommands;
