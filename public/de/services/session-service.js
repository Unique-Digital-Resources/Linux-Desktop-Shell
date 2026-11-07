/**
 * session-service.js — auth/session state for the desktop.
 * Single source of truth for "who is logged in" and the lock screen flow.
 */
import { bus } from '../core/event-bus.js';

/** @typedef {{ id:string, name:string, handle:string, avatar:string, auth:string, pw?:string, requiresUsername?:boolean, question?:string, answer?:string, steps?:any[] }} User */

const state = {
  /** @type {User|null} */
  user: null,
  locked: false,
  poweredOff: false,
  /** session id (e.g. hyprland) */
  session: 'hyprland',
};

const listeners = new Set();
export function onSessionChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(state); bus.emit('session.change', state); }

export const sessionService = {
  get state() { return state; },
  get user() { return state.user; },
  get isLoggedIn() { return !!state.user && !state.locked && !state.poweredOff; },
  get isLocked() { return state.locked; },
  get poweredOff() { return state.poweredOff; },
  get session() { return state.session; },

  /** @param {User} user */
  login(user, session = state.session) {
    state.user = user;
    state.session = session;
    state.locked = false;
    state.poweredOff = false;
    emit();
  },

  lock() {
    if (!state.user) return;
    state.locked = true;
    emit();
  },

  unlock() {
    state.locked = false;
    emit();
  },

  logout() {
    state.user = null;
    state.locked = false;
    state.poweredOff = false;
    emit();
  },

  powerOff() { state.poweredOff = true; emit(); },
  resume() { state.poweredOff = false; emit(); },

  setSession(id) { state.session = id; emit(); },
};

export default sessionService;
