/**
 * tf-widget.js — <tf-widget>
 *
 * A Responsive Transformer Widget. Renders the widget `data-id` in the form
 * appropriate for its `data-container` (bar | popup | desktop | greeter) via
 * the widget-service registry. The same widget id produces different layout/
 * content in each container (responsive transformation).
 *
 * Draggable: when data-draggable is set, the host is HTML5-draggable and
 * dragstart carries {id, from} so container drop-zones can move/add it.
 */
import { WIDGETS, widgetService, onWidgets } from '../services/widget-service.js';

const CSS = `<style>
  :host { display: block; }
  * { box-sizing: border-box; }

  /* shared */
  .tf { font-family: inherit; color: var(--text-1); }
  .tf .ico { color: var(--accent); }

  /* ============ CLOCK ============ */
  .tf-clock.bar { display: flex; align-items: center; height: 100%; padding: 0 8px; font-variant-numeric: tabular-nums; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; }
  .tf-clock.bar .t { color: var(--text-1); }
  .tf-clock.pop { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; }
  .tf-clock.pop .t { font-size: 28px; font-weight: 300; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
  .tf-clock.pop .d { font-size: 10.5px; color: var(--text-3); }
  .tf-clock.desk { display: flex; flex-direction: column; gap: 6px; }
  .tf-clock.desk .t { font-size: 64px; font-weight: 200; letter-spacing: 0.03em; font-variant-numeric: tabular-nums; line-height: 1; }
  .tf-clock.desk .d { font-size: 13px; color: var(--text-2); }
  .tf-clock.desk .s { height: 3px; background: var(--tint-2); border-radius: 2px; overflow: hidden; margin-top: 4px; }
  .tf-clock.desk .s i { display: block; height: 100%; background: var(--accent); animation: tf-clock-sec 60s linear infinite; }
  @keyframes tf-clock-sec { from { width: 0%; } to { width: 100%; } }
  .tf-clock.gr { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .tf-clock.gr .t { font-size: 48px; font-weight: 200; font-variant-numeric: tabular-nums; }
  .tf-clock.gr .g { font-size: 13px; color: var(--text-2); }

  /* ============ MUSIC ============ */
  /* bar form: a rotating vinyl disk wrapped by a radial progress ring */
  .tf-music.bar { display: flex; align-items: center; justify-content: center; height: 100%; padding: 0 4px; }
  .tf-music.bar .disk { position: relative; width: 30px; height: 30px; display: grid; place-items: center; }
  .tf-music.bar .disk-art {
    width: 22px; height: 22px; border-radius: 50%;
    background: radial-gradient(circle at 50% 50%, var(--accent) 0 18%, #1a1622 18% 24%, var(--accent) 24% 26%, #14111c 26%);
    display: grid; place-items: center; color: var(--text-1);
    animation: tf-music-spin 4s linear infinite;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
  }
  .tf-music.bar .disk-art svg { width: 11px; height: 11px; opacity: 0.85; }
  .tf-music.bar .ring { position: absolute; inset: 0; width: 30px; height: 30px; transform: rotate(-90deg); }
  .tf-music.bar .ring .track { fill: none; stroke: var(--tint-3); stroke-width: 2; }
  .tf-music.bar .ring .prog { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round;
    stroke-dasharray: 100.5; stroke-dashoffset: 65; animation: tf-music-radial 214s linear infinite; }
  @keyframes tf-music-spin { to { transform: rotate(360deg); } }
  @keyframes tf-music-radial { from { stroke-dashoffset: 100.5; } to { stroke-dashoffset: 0; } }
  /* shared player body (bento / desktop / popup) */
  .tf-music.player { display: flex; gap: 14px; align-items: center; }
  .tf-music.player .art {
    width: 56px; height: 56px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
    display: grid; place-items: center; color: #fff;
    box-shadow: 0 4px 14px var(--accent-glow);
  }
  .tf-music.player .art svg { width: 26px; height: 26px; }
  .tf-music.player .info { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .tf-music.player .n { font-size: 13px; font-weight: 600; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tf-music.player .a { font-size: 11px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tf-music.player .pg { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .tf-music.player .pg i { display: block; height: 4px; border-radius: 2px; background: var(--tint-3); flex: 1; position: relative; overflow: hidden; }
  .tf-music.player .pg i::after { content: ''; position: absolute; inset: 0; width: 32%; background: var(--accent); border-radius: 2px; animation: tf-music-pg 214s linear infinite; }
  .tf-music.player .pg span { font-size: 9.5px; color: var(--text-4); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tf-music.player .ctl { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
  .tf-music.player .ctl button {
    width: 24px; height: 24px; border-radius: 50%; background: var(--tint-2); border: none;
    color: var(--text-2); font-size: 10px; cursor: pointer; display: grid; place-items: center; transition: background var(--d-fast);
  }
  .tf-music.player .ctl button:hover { background: var(--tint-3); color: var(--text-1); }
  .tf-music.player .ctl button.play { background: var(--accent); color: #fff; width: 28px; height: 28px; font-size: 11px; }
  .tf-music.player .ctl button.play:hover { background: var(--accent-strong); }
  @keyframes tf-music-pg { from { transform: translateX(-100%); } to { transform: translateX(285%); } }
  .tf-music.player.desk { gap: 18px; }
  .tf-music.player.desk .art { width: 84px; height: 84px; border-radius: 16px; }
  .tf-music.player.desk .art svg { width: 38px; height: 38px; }
  .tf-music.player.desk .n { font-size: 16px; }
  .tf-music.player.desk .a { font-size: 12px; }
  .tf-music.player.desk .ctl button { width: 30px; height: 30px; }
  .tf-music.player.desk .ctl button.play { width: 36px; height: 36px; }
  /* volume slider (desktop music) — reflects the volume setting */
  .tf-music.player.desk .vol { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .tf-music.player.desk .vol .vlabel { font-size: 10px; color: var(--text-4); }
  .tf-music.player.desk .vol .vval { font-size: 10px; color: var(--text-3); font-variant-numeric: tabular-nums; min-width: 30px; }
  .tf-music.player.desk .vol .vol-slider { -webkit-appearance: none; appearance: none; width: 80px; height: 4px; border-radius: 2px; background: var(--tint-3); outline: none; cursor: pointer; }
  .tf-music.player.desk .vol .vol-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); cursor: pointer; }
  .tf-music.player.desk .vol .vol-slider::-moz-range-thumb { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); cursor: pointer; border: none; }
  /* shuffle/repeat active state */
  .tf-music.player .ctl button.shuf.active, .tf-music.player .ctl button.rep.active { background: var(--accent); color: #fff; }
  .tf-music.gr { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); }
  .tf-music.gr .ico { width: 16px; height: 16px; color: var(--accent); }
  .tf-music.gr .ico svg { width: 16px; height: 16px; }

  /* ============ WEATHER ============ */
  .tf-wx.bar { display: flex; align-items: center; gap: 4px; height: 100%; padding: 0 8px; font-size: 12px; font-variant-numeric: tabular-nums; }
  .tf-wx.bar .i { font-size: 14px; }
  .tf-wx.pop { display: flex; flex-direction: column; gap: 4px; padding: 8px; align-items: center; }
  .tf-wx.pop .loc { font-size: 11px; color: var(--text-3); }
  .tf-wx.pop .big { display: flex; align-items: center; gap: 6px; }
  .tf-wx.pop .big .i { font-size: 22px; }
  .tf-wx.pop .big .t { font-size: 26px; font-weight: 300; }
  .tf-wx.pop .cond { font-size: 10.5px; color: var(--text-3); }
  .tf-wx.desk { display: flex; flex-direction: column; gap: 8px; }
  .tf-wx.desk .loc { font-size: 14px; color: var(--text-2); }
  .tf-wx.desk .big { display: flex; align-items: center; gap: 10px; }
  .tf-wx.desk .big .i { font-size: 40px; }
  .tf-wx.desk .big .t { font-size: 48px; font-weight: 200; }
  .tf-wx.desk .cond { font-size: 12px; color: var(--text-3); }
  .tf-wx.desk .fc { display: flex; gap: 10px; margin-top: 6px; }
  .tf-wx.desk .fc div { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--text-3); }
  .tf-wx.desk .fc b { color: var(--text-1); font-weight: 500; }
  .tf-wx.gr { display: flex; align-items: center; gap: 6px; font-size: 14px; }
  .tf-wx.gr .i { font-size: 18px; }
  .tf-wx.gr .l { font-size: 11px; color: var(--text-3); }

  /* ============ SYSTEM ============ */
  .tf-sys.bar { display: flex; align-items: center; gap: 8px; height: 100%; padding: 0 8px; }
  .tf-sys.bar .m { display: flex; flex-direction: column; gap: 2px; min-width: 34px; }
  .tf-sys.bar .m span { font-size: 8px; color: var(--text-4); letter-spacing: 0.04em; }
  .tf-sys.bar .m i { display: block; height: 3px; border-radius: 2px; background: var(--tint-3); position: relative; overflow: hidden; }
  .tf-sys.bar .m i::after { content: ''; position: absolute; inset: 0; width: var(--p); background: var(--accent); }
  .tf-sys.pop { display: flex; flex-direction: column; gap: 5px; padding: 8px; min-width: 130px; }
  .tf-sys.pop .row { display: flex; justify-content: space-between; font-size: 11px; }
  .tf-sys.pop .row span { color: var(--text-3); }
  .tf-sys.pop .row b { color: var(--text-1); font-weight: 500; font-variant-numeric: tabular-nums; }
  .tf-sys.desk { display: flex; flex-direction: column; gap: 10px; }
  .tf-sys.desk .row { display: flex; align-items: center; gap: 10px; }
  .tf-sys.desk .row span { font-size: 12px; color: var(--text-3); width: 42px; }
  .tf-sys.desk .row b { font-size: 13px; font-weight: 500; width: 60px; font-variant-numeric: tabular-nums; }
  .tf-sys.desk .row i { flex: 1; height: 6px; border-radius: 3px; background: var(--tint-3); position: relative; overflow: hidden; }
  .tf-sys.desk .row i::after { content: ''; position: absolute; inset: 0; width: var(--p); background: var(--accent); border-radius: 3px; }

  /* ============ AI ============ */
  .tf-ai.bar { display: flex; align-items: center; gap: 6px; height: 100%; padding: 0 10px; border-radius: 999px; background: var(--tint-2); border: 1px solid var(--border-1); }
  .tf-ai.bar .ico { font-size: 13px; }
  .tf-ai.bar input { background: transparent; border: none; outline: none; color: var(--text-1); font-size: 11px; width: 80px; }
  .tf-ai.bar input::placeholder { color: var(--text-3); }
  .tf-ai.pop { display: flex; flex-direction: column; gap: 8px; padding: 8px; }
  .tf-ai.pop .h { font-size: 11px; color: var(--text-3); display: flex; align-items: center; gap: 5px; }
  .tf-ai.pop input { background: var(--tint-2); border: 1px solid var(--border-1); border-radius: 8px; padding: 8px 10px; color: var(--text-1); font-size: 12px; outline: none; width: 180px; }
  .tf-ai.desk { display: flex; flex-direction: column; gap: 10px; }
  .tf-ai.desk .h { font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .tf-ai.desk .h .ico { font-size: 16px; }
  .tf-ai.desk .h .model { font-size: 10px; font-weight: 400; color: var(--accent); background: var(--tint-2); padding: 2px 6px; border-radius: var(--r-xs); margin-left: auto; }
  .tf-ai.desk input { background: var(--tint-2); border: 1px solid var(--border-1); border-radius: 10px; padding: 12px 14px; color: var(--text-1); font-size: 14px; outline: none; }
  .tf-ai.desk .sug { display: flex; flex-wrap: wrap; gap: 6px; }
  .tf-ai.desk .sug button { background: var(--tint-2); border: 1px solid var(--border-1); border-radius: 999px; padding: 5px 11px; font-size: 11px; color: var(--text-2); cursor: pointer; }
  .tf-ai.gr { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-2); }
  .tf-ai.gr .ico { font-size: 16px; }

  /* draggable affordance */
  :host([data-draggable]) { cursor: grab; }
  :host([data-draggable]):active { cursor: grabbing; }
</style>`;

class TfWidget extends HTMLElement {
  static get observedAttributes() { return ['data-id', 'data-container']; }

  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS;
    this._root = root;
    this._render();
    // re-render when placements/theme change (so live widgets stay fresh)
    this._unsub = onWidgets(() => this._render());
  }

  disconnectedCallback() {
    const def = this._def();
    if (def && def.uninit) def.uninit(this);
    if (this._unsub) this._unsub();
  }

  attributeChangedCallback() { this._render(); }

  _def() { return WIDGETS[this.dataset.id]; }

  _render() {
    if (!this._root) return;
    const def = this._def();
    const container = this.dataset.container || 'popup';
    if (def && def.uninit) def.uninit(this);
    // fetch the widget's current settings so render() can use them (functional
    // settings: clock format, weather location/units, system metrics, etc.)
    const settings = widgetService.getSettings(this.dataset.id);
    // empty container node then (re)build
    let html = '';
    if (def) html = def.render(container, settings);
    // keep only the <style>, replace the body
    this._root.innerHTML = CSS + html;
    if (def && def.init) def.init(this, container, settings);
    // make draggable in the palette/manager context
    if (this.hasAttribute('data-draggable')) {
      this.setAttribute('draggable', 'true');
      this.ondragstart = (e) => {
        e.dataTransfer.setData('text/tf-widget', JSON.stringify({ id: this.dataset.id, from: this.dataset.container }));
        e.dataTransfer.effectAllowed = 'move';
      };
    } else {
      this.removeAttribute('draggable');
      this.ondragstart = null;
    }
  }
}

customElements.define('tf-widget', TfWidget);
export default TfWidget;
