/**
 * de-placeholder-app.js — <de-placeholder-app>
 *
 * Concept placeholder for any non-files app. Reads data-app-id, resolves
 * name/icon via data/apps.js, and — because it stands in for a real app —
 * exposes TEST buttons that drive the window-client system: one per in-app
 * state (notification / success / error / warning / downloading) plus a
 * "New Client" button that opens another window of the same app (so the dock
 * doughnut shows multiple slices).
 *
 * Inherits design tokens from <de-shell>.
 */
import { renderIcons } from '../core/icons.js';
import { getApp } from '../data/apps.js';
import { commands } from '../core/command-registry.js';

const CSS = `<style>
  :host {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; width: 100%; height: 100%; padding: 32px;
    color: var(--text-2); overflow: auto;
    background: transparent;
  }
  .placeholder { display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 560px; text-align: center; }
  .placeholder-icon { width: 56px; height: 56px; color: var(--accent); }
  .placeholder-icon svg { width: 56px; height: 56px; }
  .placeholder-name { font-size: 22px; font-weight: 600; color: var(--text-1); }
  .placeholder-tag { font-size: 11.5px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.02em; color: var(--text-4); }
  .test-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); margin-top: 4px; }
  .state-row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
  .state-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 999px; font-size: 12px; font-weight: 500;
    color: var(--text-1); cursor: pointer;
    background: var(--tint-2); border: 1px solid var(--border-2);
    transition: background var(--d-fast), border-color var(--d-fast), transform 0.08s;
  }
  .state-btn:hover { background: var(--tint-3); border-color: var(--border-3); }
  .state-btn:active { transform: scale(0.95); }
  .state-btn .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .state-btn svg { width: 14px; height: 14px; }
  /* color-coded dots matching the doughnut state colors */
  .state-btn.s-notification .dot { background: var(--info); }
  .state-btn.s-success .dot { background: var(--success); }
  .state-btn.s-error .dot { background: var(--error); }
  .state-btn.s-warning .dot { background: var(--warning); }
  .state-btn.s-downloading .dot { background: var(--downloading); }
  .new-client {
    margin-top: 6px;
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 18px; border-radius: 999px; font-size: 12.5px; font-weight: 600;
    color: var(--accent-on); cursor: pointer;
    background: var(--accent); border: 1px solid var(--accent);
    transition: background var(--d-fast), transform 0.08s;
  }
  .new-client:hover { background: var(--accent-strong); }
  .new-client:active { transform: scale(0.95); }
  .new-client svg { width: 14px; height: 14px; }
</style>`;

const HTML = (name, icon) => `
<div class="placeholder">
  <i class="placeholder-icon" data-lucide="${icon || 'app-window'}"></i>
  <div class="placeholder-name">${name}</div>
  <div class="placeholder-tag">Concept — this app is part of the desktop demo.</div>

  <div class="test-label">Window-client states</div>
  <div class="state-row">
    <button class="state-btn s-notification" data-state="notification"><span class="dot"></span>Notification</button>
    <button class="state-btn s-success" data-state="success"><span class="dot"></span>Success</button>
    <button class="state-btn s-error" data-state="error"><span class="dot"></span>Error</button>
    <button class="state-btn s-warning" data-state="warning"><span class="dot"></span>Warning</button>
    <button class="state-btn s-downloading" data-state="downloading"><span class="dot"></span>Downloading</button>
  </div>
  <button class="new-client" id="newClientBtn"><i data-lucide="plus"></i>New Client</button>
</div>`;

class DePlaceholderApp extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    const id = this.dataset.appId || 'app';
    const app = getApp(id);
    const name = (app && app.name) || id.charAt(0).toUpperCase() + id.slice(1);
    const icon = (app && app.icon) || 'app-window';
    root.innerHTML = CSS + HTML(name, icon);
    this._root = root;
    requestAnimationFrame(() => this._init());
  }

  _init() {
    renderIcons(this._root);
    const appId = this.dataset.appId;
    // each client owns its own state: set it on THIS window only (not broadcast
    // to every window of the app) so each doughnut slice reflects its client.
    const winId = this.closest('de-app-window')?.dataset.windowId;
    this._root.querySelectorAll('.state-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const state = btn.dataset.state;
        const duration = state === 'downloading' ? 3200 : 2600;
        commands.execute('window.setAppState', { id: winId, state, duration });
      });
    });
    // new client → open another window of the same app
    const nc = this._root.getElementById('newClientBtn');
    if (nc) nc.addEventListener('click', () => {
      commands.execute('window.open', { appId, forceNew: true });
    });
  }
}

customElements.define('de-placeholder-app', DePlaceholderApp);
export default DePlaceholderApp;
