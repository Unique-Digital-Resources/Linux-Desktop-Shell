/**
 * command-registry.js — THE source of truth for all desktop functionality.
 *
 * Every meaningful action in the desktop flows through a command id, e.g.
 *   commands.execute('session.login', { user })
 *   commands.execute('window.open', { appId: 'files' })
 *   commands.execute('ui.toggleLauncher', { anchor })
 *
 * A command is registered as `{ id, run, canRun?, label?, icon? }`.
 * Components NEVER call services directly for cross-cutting actions — they
 * dispatch a command. This decouples callers from implementers and gives a
 * single auditable surface (the registry) for "what can this desktop do".
 */

class CommandRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this._cmds = new Map();
    this._beforeRun = new Set();
  }

  register(id, def) {
    if (this._cmds.has(id)) {
      console.warn(`[commands] overriding "${id}"`);
    }
    const entry = typeof def === 'function'
      ? { id, run: def }
      : { id, ...def };
    if (!entry.run) throw new Error(`command "${id}" has no run()`);
    this._cmds.set(id, entry);
    return entry;
  }

  /** register many at once: { id: fn | def } */
  registerAll(map) {
    for (const [id, def] of Object.entries(map)) this.register(id, def);
  }

  has(id) { return this._cmds.has(id); }

  canExecute(id, args) {
    const e = this._cmds.get(id);
    if (!e) return false;
    return e.canRun ? !!e.canRun(args) : true;
  }

  async execute(id, args) {
    const e = this._cmds.get(id);
    if (!e) {
      console.warn(`[commands] unknown command "${id}"`);
      return undefined;
    }
    for (const hook of this._beforeRun) {
      try { hook(id, args); } catch (err) { console.error('[commands] beforeRun hook error', err); }
    }
    try {
      return await e.run(args, id);
    } catch (err) {
      console.error(`[commands] "${id}" failed`, err);
      throw err;
    }
  }

  /** sync variant — only for commands known to be synchronous */
  executeSync(id, args) {
    const e = this._cmds.get(id);
    if (!e) { console.warn(`[commands] unknown command "${id}"`); return undefined; }
    return e.run(args, id);
  }

  list() {
    return Array.from(this._cmds.values()).map(({ id, label, icon }) => ({ id, label, icon }));
  }

  beforeRun(fn) { this._beforeRun.add(fn); return () => this._beforeRun.delete(fn); }
}

export const commands = new CommandRegistry();
export default commands;
