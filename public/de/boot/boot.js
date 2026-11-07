/**
 * boot.js — the boot orchestrator.
 *
 * Owns the root mount point and decides which top-level component is shown:
 *   - no user / locked  → <dm-greeter>   (login OR lock screen)
 *   - user && !locked   → <de-shell>     (desktop)
 *
 * The greeter dispatches `session.login`; the shell dispatches `session.lock`/
 * `session.logout`; this orchestrator reacts to session-service state changes
 * and swaps the mounted component. This keeps the greeter and shell decoupled
 * from each other — they only talk through the command system.
 */
import sessionService, { onSessionChange } from '../services/session-service.js';

/** @param {HTMLElement} root */
export function startBoot(root) {
  if (!root) throw new Error('startBoot: root element required');

  let mounted = null; // 'greeter' | 'shell'

  function decide(s) {
    if (s.user && !s.locked) return 'shell';
    return 'greeter'; // logged-out OR locked → greeter acts as login/lock screen
  }

  function render() {
    const next = decide(sessionService.state);
    if (next === mounted) return;
    // tear down
    root.innerHTML = '';
    // mount
    const el = document.createElement(next === 'shell' ? 'de-shell' : 'dm-greeter');
    root.appendChild(el);
    mounted = next;
  }

  onSessionChange(render);
  // initial render
  render();
}
