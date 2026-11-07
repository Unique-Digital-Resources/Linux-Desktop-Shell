/**
 * de-music-widget.js — <de-music-widget>
 *
 * Top-right "now playing" pill. Ports the original .music-widget markup +
 * progress-fill CSS animation verbatim. No JS interaction required — the
 * progress bar is driven purely by the @keyframes progress animation.
 *
 * Inherits tokens from <de-shell>. The .music-widget element is positioned
 * absolute and resolves against the nearest positioned ancestor (de-shell host).
 */
const CSS = `<style>
  /* === base reset (scoped to THIS shadow root — CSS resets do not cross
     shadow boundaries, so every encapsulated component must declare its own) === */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  button { font-family: inherit; color: inherit; border: none; background: none; cursor: pointer; }
  input { font-family: inherit; color: inherit; background: transparent; border: none; outline: none; }
  img { display: block; }
  svg { display: block; }

  :host { display: block; }
  .music-widget {
    position: absolute; top: 20px; right: 20px; z-index: 5;
    display: flex; align-items: center; gap: 11px;
    padding: 9px 16px 9px 9px;
    background: var(--surface-bar);
    border: 1px solid var(--border-1);
    border-radius: var(--r-xl);
    backdrop-filter: blur(22px) saturate(180%);
    -webkit-backdrop-filter: blur(22px) saturate(180%);
    box-shadow: var(--el-2), inset 0 1px 0 rgba(255,255,255,0.04);
    min-width: 260px;
    animation: fadeDown 0.6s var(--ease-soft) 0.15s both;
  }
  @keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  .album-art {
    width: 42px; height: 42px; border-radius: var(--r-md); flex-shrink: 0;
    background: linear-gradient(135deg, #b4a0ff 0%, #7c5fff 50%, #4a2bd9 100%);
    display: grid; place-items: center; color: rgba(255,255,255,0.88);
    box-shadow: 0 3px 10px rgba(124,95,255,0.32), inset 0 1px 0 rgba(255,255,255,0.22);
  }
  .album-art svg { width: 19px; height: 19px; }
  .music-info { flex: 1; min-width: 0; }
  .track-name { font-size: 12.5px; font-weight: 500; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .artist-name { font-size: 10.5px; color: var(--text-3); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .progress-bar { margin-top: 5px; height: 2px; background: var(--tint-2); border-radius: 1px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 1px; background: linear-gradient(90deg, var(--accent-strong), var(--accent)); animation: progress 214s linear infinite; }
  @keyframes progress { from { width: 0%; } to { width: 100%; } }

  @media (max-width: 900px) { .music-widget { min-width: 230px; } }
  @media (max-width: 780px) { .music-widget { display: none; } }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>`;

const HTML = `
<aside class="music-widget">
  <div class="album-art">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
  </div>
  <div class="music-info">
    <div class="track-name">Outro</div>
    <div class="artist-name">M83 — Hurry Up, We're Dreaming</div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  </div>
</aside>`;

class DeMusicWidget extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    // No JS — progress animation is pure CSS.
  }
}

customElements.define('de-music-widget', DeMusicWidget);
export default DeMusicWidget;
