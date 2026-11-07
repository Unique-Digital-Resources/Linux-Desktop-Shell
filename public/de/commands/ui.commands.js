/**
 * ui.commands.js — shell UI commands (popovers, search, theme popups).
 *
 * The shell owns the popover DOM; these commands emit events on the bus that
 * the shell listens for. This keeps the command layer as the single entry
 * point while the shell keeps single-responsibility for its own chrome.
 */
import { commands } from '../core/command-registry.js';
import { bus } from '../core/event-bus.js';

export function registerUiCommands() {
  commands.registerAll({
    /** @param {{anchor:HTMLElement}} args */
    'ui.toggleLauncher'(args) { bus.emit('ui.popover', { which: 'launcher', action: 'toggle', anchor: args?.anchor }); },
    'ui.openLauncher'(args) { bus.emit('ui.popover', { which: 'launcher', action: 'open', anchor: args?.anchor }); },
    'ui.closeLauncher'() { bus.emit('ui.popover', { which: 'launcher', action: 'close' }); },

    'ui.toggleQuickSettings'(args) { bus.emit('ui.popover', { which: 'qs', action: 'toggle', anchor: args?.anchor }); },
    'ui.toggleCalendar'(args) { bus.emit('ui.popover', { which: 'cal', action: 'toggle', anchor: args?.anchor }); },
    'ui.closeAllPopovers'() { bus.emit('ui.popover', { action: 'closeAll' }); },

    'ui.toggleThemePopup'(args) { bus.emit('ui.popover', { which: 'theme', action: 'toggle', anchor: args?.anchor }); },

    'ui.openApp'(args) { bus.emit('ui.openApp', args); /* forwarded to window.open via shell */ },
  });
}

export default registerUiCommands;
