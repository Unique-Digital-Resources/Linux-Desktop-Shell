/**
 * de-calendar.js — <de-calendar>
 *
 * Calendar + weather popover. Ports the verbatim #calPop markup + the cal-pop
 * CSS region + the base .popover rules + the .section-title rule.
 *
 * Methods: open(anchor), close(), toggle(anchor), isOpen(). Position computed
 * above the anchor using getBoundingClientRect() (works across shadow
 * boundaries). Local state `calDate` drives renderCalendar().
 *
 * NOTE: the original source had two typos in renderCalendar: `${monthsLongonth]}`
 * and `monthsLongonth]` — both clearly missing the `[m` of `[month]`. Ported
 * here as `monthsLong[month]` so the calendar actually renders. Without this
 * fix the original is a SyntaxError and the calendar cannot function.
 */
import { renderIcons } from '../core/icons.js';

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

  .cal-pop { width: 460px; padding: 0; overflow: hidden; }
  .cal-split-layout { display: flex; align-items: stretch; height: 100%; }
  .cal-weather-side { width: 150px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; }
  .weather-icon-lg { color: var(--accent-light); margin-bottom: 4px; }
  .weather-icon-lg svg { width: 56px; height: 56px; }
  .cw-temp { font-size: 28px; font-weight: 600; color: var(--text-1); line-height: 1; }
  .cw-cond { font-size: 12px; color: var(--text-2); }
  .cw-loc { font-size: 11px; color: var(--text-3); }

  .cal-vertical-bar { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; border-left: 1px solid var(--border-1); border-right: 1px solid var(--border-1); gap: 6px; font-size: 10px; font-weight: 600; color: var(--text-3); font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
  .vbar-sep { width: 12px; height: 1px; background: var(--border-2); margin: 2px 0; }

  .cal-cal-side { flex: 1; padding: 16px; }
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding: 0 4px; }
  .cal-month { font-size: 12.5px; font-weight: 550; color: var(--text-1); }
  .cal-nav { display: flex; gap: 2px; }
  .cal-nav-btn { width: 26px; height: 26px; display: grid; place-items: center; border-radius: var(--r-xs); color: var(--text-3); transition: all var(--d-fast); }
  .cal-nav-btn:hover { background: var(--tint-2); color: var(--text-1); }
  .cal-nav-btn svg { width: 14px; height: 14px; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
  .cal-day-head { text-align: center; font-size: 10px; font-weight: 500; color: var(--text-4); padding: 4px 0; text-transform: uppercase; letter-spacing: 0.04em; }
  .cal-day { aspect-ratio: 1; display: grid; place-items: center; font-size: 11.5px; font-weight: 450; color: var(--text-2); border-radius: var(--r-sm); transition: all var(--d-fast); cursor: pointer; }
  .cal-day:hover:not(.empty) { background: var(--tint-2); }
  .cal-day.other { color: var(--text-4); }
  .cal-day.today { background: var(--accent); color: #fff; font-weight: 600; box-shadow: 0 2px 6px var(--accent-glow); }
  .cal-day.empty { cursor: default; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-3); }

  @media (max-width: 640px) {
    .cal-pop { width: 320px; }
    .cal-weather-side { display: none; }
    .cal-vertical-bar { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>`;

const HTML = `
<div class="popover cal-pop" id="calPop">
  <div class="cal-split-layout">
    <div class="cal-weather-side">
      <div class="weather-icon-lg"><i data-lucide="cloud-sun"></i></div>
      <div class="cw-temp">18°</div>
      <div class="cw-cond">Partly Cloudy</div>
      <div class="cw-loc">Reykjavík</div>
    </div>
    <div class="cal-vertical-bar" id="calVerticalBar">
      <!-- Populated by JS -->
    </div>
    <div class="cal-cal-side">
      <div class="cal-header">
        <span class="cal-month" id="calMonth">—</span>
        <div class="cal-nav">
          <button class="cal-nav-btn" id="calPrev" aria-label="Previous"><i data-lucide="chevron-left"></i></button>
          <button class="cal-nav-btn" id="calNext" aria-label="Next"><i data-lucide="chevron-right"></i></button>
        </div>
      </div>
      <div class="cal-grid" id="calGrid"></div>
    </div>
  </div>
</div>`;

const monthsLong = ['January','February','March','April','May','June','July','August','September','October','November','December'];

class DeCalendar extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    this._open = false;
    this.calDate = new Date();
    requestAnimationFrame(() => this._init());
  }

  _init() {
    renderIcons(this._root);
    this._popover = this._root.getElementById('calPop');

    this._root.getElementById('calPrev').addEventListener('click', (e) => {
      e.stopPropagation();
      this.calDate.setMonth(this.calDate.getMonth() - 1);
      this.renderCalendar();
    });
    this._root.getElementById('calNext').addEventListener('click', (e) => {
      e.stopPropagation();
      this.calDate.setMonth(this.calDate.getMonth() + 1);
      this.renderCalendar();
    });

    this._popover.addEventListener('click', (e) => e.stopPropagation());

    // outside-click (composed path works across shadow boundaries)
    this._outsideHandler = (e) => {
      if (this._open && !e.composedPath().includes(this)) this.close();
    };
    document.addEventListener('click', this._outsideHandler);

    // reposition on resize
    this._resizeHandler = () => { if (this._open && this._anchor) this._position(this._anchor); };
    window.addEventListener('resize', this._resizeHandler);

    // escape closes
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this._open) this.close();
    };
    document.addEventListener('keydown', this._keyHandler);

    this.renderCalendar();
  }

  renderCalendar() {
    if (!this._root) return;
    const year = this.calDate.getFullYear();
    const month = this.calDate.getMonth();
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    this._root.getElementById('calMonth').textContent = `${monthsLong[month]} ${year}`;

    // Vertical bar text
    const vbar = this._root.getElementById('calVerticalBar');
    vbar.innerHTML = '';
    const yearStr = String(year);
    for (let i = 0; i < yearStr.length; i++) {
      const span = document.createElement('span');
      span.textContent = yearStr[i];
      vbar.appendChild(span);
    }
    const sep = document.createElement('div');
    sep.className = 'vbar-sep';
    vbar.appendChild(sep);
    const monthInitials = monthsLong[month].substring(0, 3).toUpperCase();
    for (let i = 0; i < monthInitials.length; i++) {
      const span = document.createElement('span');
      span.textContent = monthInitials[i];
      vbar.appendChild(span);
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid = this._root.getElementById('calGrid');
    grid.innerHTML = '';
    ['S','M','T','W','T','F','S'].forEach((d) => {
      const el = document.createElement('div');
      el.className = 'cal-day-head';
      el.textContent = d;
      grid.appendChild(el);
    });
    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      grid.appendChild(el);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const el = document.createElement('button');
      el.className = 'cal-day';
      el.textContent = d;
      if (isCurrentMonth && d === today.getDate()) el.classList.add('today');
      grid.appendChild(el);
    }
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

customElements.define('de-calendar', DeCalendar);
export default DeCalendar;
