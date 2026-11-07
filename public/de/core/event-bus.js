/**
 * event-bus.js — tiny synchronous pub/sub for cross-component notifications.
 * Components subscribe to topics; services / commands publish events.
 * (Synchronous, single-process — no IPC.)
 */

class EventBus {
  constructor() {
    this._subs = new Map(); // topic → Set<fn>
  }

  on(topic, fn) {
    if (!this._subs.has(topic)) this._subs.set(topic, new Set());
    this._subs.get(topic).add(fn);
    return () => this.off(topic, fn);
  }

  off(topic, fn) {
    const set = this._subs.get(topic);
    if (set) set.delete(fn);
  }

  emit(topic, payload) {
    const set = this._subs.get(topic);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { console.error('[event-bus]', topic, e); }
    }
  }

  clear() { this._subs.clear(); }
}

export const bus = new EventBus();
export default bus;
