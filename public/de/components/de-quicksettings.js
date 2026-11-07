/**
 * de-quicksettings.js — <de-quicksettings>
 *
 * Quick-settings popover (Wi-Fi/BT/DND/Theme tiles + volume + brightness
 * sliders + battery footer). Ports the verbatim #qsPanel markup + the qs CSS
 * region + the base .popover rules + the .section-title rule + scrollbar rules.
 *
 * Methods: open(anchor), close(), toggle(anchor), isOpen(). The makeSlider
 * factory is ported verbatim and used for #volSlider and #brightSlider. The
 * volume onChange also emits 'qs.volume' on the bus so the dock can update its
 * tray icon (cross-component swap of the original document-level swap).
 *
 * Local 5s clock interval updates #qsDate.
 */
import { renderIcons, swapIcon } from '../core/icons.js';
import { bus } from '../core/event-bus.js';

const CSS = `<style>
  /* === base reset (scoped to THIS shadow root — CSS resets do not cross
     shadow boundaries, so every encapsulated component must declare its own) === */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  button { font-family: inherit; color: inherit; border: none; background: none; cursor: pointer; }
  input { font-family: inherit; color: inherit; background: transparent; border: none; outline: none; }
  img { display: block; }
  svg { display: block; }

  :host { display: block; }
  .popover {
    position: absolute; z-index: 20;
    background: var(--surface-pop); border: 1px solid var(--border-2); border-radius: var(--r-xl);
    backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
    box-shadow: var(--el-3), inset 0 1px 0 rgba(255,255,255,0.04);
    opacity: 0; pointer-events: none; transform: translateY(8px) scale(0.97);
    transform-origin: bottom center;
    transition: opacity var(--d-med) var(--ease), transform var(--d-med) var(--ease);
  }
  .popover.open { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }
  .section-title { font-size: 10.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.07em; padding: 0 4px; margin-bottom: 8px; }

  .qs-panel { width: 300px; padding: 14px; }
  .qs-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 4px; }
  .qs-date { font-size: 12px; font-weight: 500; color: var(--text-1); font-variant-numeric: tabular-nums; }
  .qs-settings-btn { width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); transition: all var(--d-fast); }
  .qs-settings-btn:hover { background: var(--tint-2); color: var(--text-1); }
  .qs-settings-btn svg { width: 15px; height: 15px; }

  .qs-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
  .qs-tile { display: flex; align-items: center; gap: 9px; padding: 10px 11px; border-radius: var(--r-lg); background: var(--tint-1); border: 1px solid var(--border-1); transition: all var(--d-fast) var(--ease); text-align: left; position: relative; }
  .qs-tile:hover { background: var(--tint-2); }
  .qs-tile.active { background: var(--tint-3); border-color: var(--border-3); }
  .qs-tile-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: var(--r-sm); background: var(--tint-2); color: var(--text-3); flex-shrink: 0; transition: all var(--d-fast); }
  .qs-tile.active .qs-tile-icon { background: var(--accent); color: #fff; box-shadow: 0 2px 6px var(--accent-glow); }
  .qs-tile-icon svg { width: 15px; height: 15px; stroke-width: 2; }
  .qs-tile-body { flex: 1; min-width: 0; }
  .qs-tile-label { font-size: 11.5px; font-weight: 500; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qs-tile.active .qs-tile-label { color: var(--text-1); }
  .qs-tile-sub { font-size: 10px; color: var(--text-4); margin-top: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qs-tile.active .qs-tile-sub { color: var(--text-3); }

  .qs-sliders { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .slider-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: var(--r-lg); transition: background var(--d-fast); }
  .slider-row:hover { background: var(--tint-1); }
  .slider-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-2); flex-shrink: 0; transition: all var(--d-fast); }
  .slider-icon:hover { background: var(--tint-2); color: var(--text-1); }
  .slider-icon svg { width: 16px; height: 16px; stroke-width: 1.85; }

  .slider { flex: 1; height: 5px; background: var(--tint-2); border-radius: 3px; position: relative; cursor: pointer; }
  .slider-fill { height: 100%; background: linear-gradient(90deg, var(--accent-strong), var(--accent)); border-radius: 3px; width: 60%; box-shadow: 0 0 6px var(--accent-glow); }
  .slider-thumb { position: absolute; width: 13px; height: 13px; background: #fff; border-radius: 50%; top: 50%; left: 60%; transform: translate(-50%, -50%); box-shadow: 0 1px 4px rgba(0,0,0,0.35), 0 0 0 1.5px rgba(180,160,255,0.3); pointer-events: none; transition: transform 0.1s, box-shadow var(--d-fast); }
  .slider:hover .slider-thumb { transform: translate(-50%, -50%) scale(1.18); box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 0 2px var(--accent-glow); }
  .slider-value { font-size: 11px; font-weight: 500; color: var(--text-2); min-width: 32px; text-align: right; font-variant-numeric: tabular-nums; }

  .qs-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 6px 2px; border-top: 1px solid var(--border-1); }
  .qs-battery { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--text-2); font-weight: 450; }
  .qs-battery svg { width: 16px; height: 16px; color: var(--text-2); }
  .qs-battery-time { color: var(--text-4); font-size: 10.5px; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-3); }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>`;

const HTML = `
<div class="popover qs-panel" id="qsPanel">
  <div class="qs-header">
    <span class="qs-date" id="qsDate">—</span>
    <button class="qs-settings-btn" data-tip="Settings"><i data-lucide="settings"></i></button>
  </div>
  <div class="qs-tiles">
    <button class="qs-tile active" data-toggle="wifi">
      <div class="qs-tile-icon"><i data-lucide="wifi"></i></div>
      <div class="qs-tile-body"><div class="qs-tile-label">Wi-Fi</div><div class="qs-tile-sub">Aurora-5G</div></div>
    </button>
    <button class="qs-tile" data-toggle="bt">
      <div class="qs-tile-icon"><i data-lucide="bluetooth"></i></div>
      <div class="qs-tile-body"><div class="qs-tile-label">Bluetooth</div><div class="qs-tile-sub">Off</div></div>
    </button>
    <button class="qs-tile" data-toggle="dnd">
      <div class="qs-tile-icon"><i data-lucide="moon-star"></i></div>
      <div class="qs-tile-body"><div class="qs-tile-label">Do Not Disturb</div><div class="qs-tile-sub">Off</div></div>
    </button>
    <button class="qs-tile active" data-toggle="theme">
      <div class="qs-tile-icon"><i data-lucide="palette"></i></div>
      <div class="qs-tile-body"><div class="qs-tile-label">Dark Theme</div><div class="qs-tile-sub">On</div></div>
    </button>
  </div>
  <div class="qs-sliders">
    <div class="slider-row">
      <button class="slider-icon" id="muteBtn" aria-label="Mute"><i data-lucide="volume-2"></i></button>
      <div class="slider" id="volSlider" role="slider" aria-label="Volume" tabindex="0">
        <div class="slider-fill" id="volFill"></div><div class="slider-thumb" id="volThumb"></div>
      </div>
      <span class="slider-value" id="volValue">60%</span>
    </div>
    <div class="slider-row">
      <div class="slider-icon"><i data-lucide="sun"></i></div>
      <div class="slider" id="brightSlider" role="slider" aria-label="Brightness" tabindex="0">
        <div class="slider-fill" id="brightFill"></div><div class="slider-thumb" id="brightThumb"></div>
      </div>
      <span class="slider-value" id="brightValue">82%</span>
    </div>
  </div>
  <div class="qs-footer">
    <div class="qs-battery">
      <i data-lucide="battery-medium"></i><span>78%</span><span class="qs-battery-time">4h 22m</span>
    </div>
    <button class="qs-settings-btn" data-tip="Power"><i data-lucide="power"></i></button>
  </div>
</div>`;

const daysLong = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const monthsLong = ['January','February','March','April','May','June','July','August','September','October','November','December'];

class DeQuickSettings extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    this._open = false;
    requestAnimationFrame(() => this._init());
  }

  _init() {
    renderIcons(this._root);
    this._popover = this._root.getElementById('qsPanel');

    // QS tile toggles
    this._root.querySelectorAll('.qs-tile').forEach((tile) => {
      tile.addEventListener('click', (e) => {
        e.stopPropagation();
        tile.classList.toggle('active');
        const sub = tile.querySelector('.qs-tile-sub');
        if (sub) {
          const key = tile.dataset.toggle;
          const isOn = tile.classList.contains('active');
          const subs = { wifi: isOn ? 'Aurora-5G' : 'Off', bt: isOn ? 'On' : 'Off', dnd: isOn ? 'On' : 'Off', theme: isOn ? 'On' : 'Off' };
          sub.textContent = subs[key] || (isOn ? 'On' : 'Off');
        }
      });
    });

    // Sliders
    this._volSlider = this._makeSlider(
      this._root.getElementById('volSlider'),
      this._root.getElementById('volFill'),
      this._root.getElementById('volThumb'),
      this._root.getElementById('volValue'),
      60,
      (v) => {
        const muteIcon = this._root.getElementById('muteBtn').querySelector('i, svg');
        const name = v === 0 ? 'volume-x' : (v < 35 ? 'volume-1' : 'volume-2');
        if (muteIcon) {
          swapIcon(muteIcon, name);
          renderIcons(this._root);
        }
        // cross-component: tell the dock to update its tray
        bus.emit('qs.volume', { value: v });
      }
    );

    this._brightSlider = this._makeSlider(
      this._root.getElementById('brightSlider'),
      this._root.getElementById('brightFill'),
      this._root.getElementById('brightThumb'),
      this._root.getElementById('brightValue'),
      82, null
    );

    this._lastVol = 60;
    this._root.getElementById('muteBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = this._volSlider.getVal();
      if (cur > 0) { this._lastVol = cur; this._volSlider.setVal(0); }
      else { this._volSlider.setVal(this._lastVol || 60); }
    });

    this._popover.addEventListener('click', (e) => e.stopPropagation());

    // outside-click
    this._outsideHandler = (e) => {
      if (this._open && !e.composedPath().includes(this)) this.close();
    };
    document.addEventListener('click', this._outsideHandler);

    // resize repositions
    this._resizeHandler = () => { if (this._open && this._anchor) this._position(this._anchor); };
    window.addEventListener('resize', this._resizeHandler);

    // escape closes
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this._open) this.close();
    };
    document.addEventListener('keydown', this._keyHandler);

    // clock
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 5000);
  }

  _updateClock() {
    const now = new Date();
    const el = this._root.getElementById('qsDate');
    if (el) el.textContent = `${daysLong[now.getDay()]}, ${now.getDate()} ${monthsLong[now.getMonth()]}`;
  }

  /** Verbatim port of the original makeSlider factory, scoped to this component. */
  _makeSlider(sliderEl, fillEl, thumbEl, valueEl, initial, onChange) {
    let value = initial;
    let dragging = false;
    function setVal(v, fire = true) {
      value = Math.max(0, Math.min(100, Math.round(v)));
      fillEl.style.width = value + '%';
      if (thumbEl) thumbEl.style.left = value + '%';
      if (valueEl) valueEl.textContent = value + '%';
      sliderEl.setAttribute('aria-valuenow', value);
      if (fire && onChange) onChange(value);
    }
    function fromEvent(clientX) {
      const r = sliderEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      setVal((x / r.width) * 100);
    }
    setVal(initial, false);
    sliderEl.addEventListener('mousedown', (e) => { dragging = true; fromEvent(e.clientX); e.preventDefault(); });
    sliderEl.addEventListener('touchstart', (e) => { dragging = true; fromEvent(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mousemove', (e) => { if (dragging) fromEvent(e.clientX); });
    document.addEventListener('touchmove', (e) => { if (dragging) fromEvent(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
    return { setVal, getVal: () => value };
  }

  isOpen() { return !!this._open; }

  _position(anchor) {
    const panel = this._popover;
    const tr = anchor.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    let left = tr.left + tr.width / 2 - pr.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - pr.width - 10));
    panel.style.left = left + 'px';
    panel.style.bottom = (window.innerHeight - tr.top + 10) + 'px';
    panel.style.right = 'auto';
    panel.style.top = 'auto';
  }

  open(anchor) {
    if (!this._popover) return;
    this._anchor = anchor;
    this._popover.classList.add('open');
    this._open = true;
    requestAnimationFrame(() => this._position(anchor));
  }

  close() {
    if (!this._popover) return;
    this._popover.classList.remove('open');
    this._open = false;
  }

  toggle(anchor) {
    if (this._open) this.close();
    else this.open(anchor);
  }
}

customElements.define('de-quicksettings', DeQuickSettings);
export default DeQuickSettings;
