/**
 * notification-service.js — toast notifications for the desktop.
 * Subscribers (e.g. the shell's toast layer) render the queue.
 */
import { bus } from '../core/event-bus.js';
import { uid } from '../core/utils.js';

const listeners = new Set();
export function onNotifications(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(payload) { for (const fn of listeners) fn(payload); bus.emit('notification', payload); }

export const notify = {
  push({ title = '', body = '', type = 'info', timeout = 4000, icon } = {}) {
    const n = { id: uid('n'), title, body, type, icon, ts: Date.now() };
    emit({ kind: 'push', notification: n });
    if (timeout > 0) setTimeout(() => this.dismiss(n.id), timeout);
    return n;
  },
  success(title, body, opts = {}) { return this.push({ title, body, type: 'success', ...opts }); },
  error(title, body, opts = {}) { return this.push({ title, body, type: 'error', ...opts }); },
  info(title, body, opts = {}) { return this.push({ title, body, type: 'info', ...opts }); },
  dismiss(id) { emit({ kind: 'dismiss', id }); },
};

export default notify;
