/**
 * system.commands.js — session + power + theme commands.
 * Registered into the global command registry at boot.
 */
import { commands } from '../core/command-registry.js';
import { bus } from '../core/event-bus.js';
import sessionService from '../services/session-service.js';
import themeService from '../services/theme-service.js';
import notify from '../services/notification-service.js';

export function registerSystemCommands() {
  commands.registerAll({
    /** @param {{user:any, session?:string}} args */
    'session.login'(args) {
      sessionService.login(args.user, args.session);
      notify.success('Welcome', `Signed in as ${args.user?.name || 'user'}`, { timeout: 2500 });
    },

    'session.lock'() {
      sessionService.lock();
      bus.emit('system.locked');
    },

    'session.unlock'() {
      sessionService.unlock();
      bus.emit('system.unlocked');
    },

    'session.logout'() {
      sessionService.logout();
      bus.emit('system.loggedout');
    },

    'system.shutdown'() { bus.emit('system.power', { action: 'shutdown' }); sessionService.powerOff(); },
    'system.restart'() { bus.emit('system.power', { action: 'restart' }); sessionService.powerOff(); },
    'system.suspend'() { bus.emit('system.power', { action: 'suspend' }); sessionService.powerOff(); },
    'system.resume'() { sessionService.resume(); bus.emit('system.resume'); },

    /** @param {{theme?:string, mode?:string}} args */
    'theme.set'(args) {
      if (args.theme) themeService.setTheme(args.theme);
      if (args.mode) themeService.setMode(args.mode);
    },
    'theme.toggleMode'() { themeService.toggleMode(); },
    'theme.apply'(args) { themeService.apply(args); },

    'session.setSession'({ id } = {}) {
      if (id) sessionService.setSession(id);
    },
  });
}

export default registerSystemCommands;
