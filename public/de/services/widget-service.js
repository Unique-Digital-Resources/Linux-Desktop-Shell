/**
 * widget-service.js — Responsive Transformer Widgets.
 *
 * A "widget" is a unit (Clock, Music, Weather, System stats, AI capsule) that
 * has a DIFFERENT representation depending on which container it lives in:
 *   'bar'     — compact, inline in the dock
 *   'popup'   — card form (e.g. inside the launcher's Widgets tab)
 *   'desktop' — a large floating panel on the desktop
 *   'greeter' — a form for the login screen
 * Each widget's render(container) returns container-appropriate HTML; an
 * optional init(el, container) wires live behavior (e.g. the clock ticks).
 *
 * Placements are per-container lists of widget ids (a widget may appear in
 * several containers at once). move/add/remove mutate placements and notify.
 *
 * NOTE: app buttons are NOT widgets — they stay as app launchers.
 */
import { bus } from '../core/event-bus.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmtTime(d) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
function fmtSec(d) { return String(d.getSeconds()).padStart(2, '0'); }

/** format time according to clock settings (format24, showSeconds) */
function fmtTimeSettings(d, s) {
  const format24 = !s || s.format24 !== false;
  const showSeconds = s && s.showSeconds === true;
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  if (format24) {
    let t = `${String(h).padStart(2, '0')}:${m}`;
    if (showSeconds) t += `:${sec}`;
    return t;
  }
  const h12 = h % 12 || 12;
  let t = `${h12}:${m}`;
  if (showSeconds) t += `:${sec}`;
  t += ` ${h >= 12 ? 'PM' : 'AM'}`;
  return t;
}

/** each widget: id, name, icon, render(container)→html, optional init/uninit,
 *  optional settingsSchema (widget-specific settings for the settings popup). */
export const WIDGETS = {
  clock: {
    id: 'clock', name: 'Clock', icon: 'clock',
    render(c, s = {}) {
      const t = fmtTimeSettings(new Date(), s);
      const d = new Date();
      const showDate = s.showDate !== false;
      const dateStr = `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
      const dateShort = `${DAYS[d.getDay()]} · ${d.getDate()} ${MONTHS_LONG[d.getMonth()].slice(0,3)}`;
      if (c === 'bar') return `<div class="tf tf-clock bar"><span class="t">${t}</span></div>`;
      if (c === 'desktop') return `<div class="tf tf-clock desk"><div class="t">${t}</div>${showDate ? `<div class="d">${dateStr}</div><div class="s"><i></i></div>` : ''}</div>`;
      if (c === 'greeter') return `<div class="tf tf-clock gr"><div class="t">${t}</div><div class="g">Welcome back</div></div>`;
      return `<div class="tf tf-clock pop"><div class="t">${t}</div>${showDate ? `<div class="d">${dateShort}</div>` : ''}</div>`;
    },
    init(el, c, s = {}) {
      const tick = () => {
        const t = el.querySelector('.t');
        if (t) t.textContent = fmtTimeSettings(new Date(), s);
        if (c === 'desktop' && s.showDate !== false) {
          const ds = el.querySelector('.d');
          const d = new Date();
          if (ds) ds.textContent = `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
        }
      };
      el._tfClock = setInterval(tick, 1000);
    },
    uninit(el) { if (el._tfClock) clearInterval(el._tfClock); el._tfClock = null; },
    settingsSchema: [
      { key: 'format24', label: '24-hour format', type: 'toggle', default: true },
      { key: 'showSeconds', label: 'Show seconds', type: 'toggle', default: false },
      { key: 'showDate', label: 'Show date', type: 'toggle', default: true },
    ],
  },

  music: {
    id: 'music', name: 'Music', icon: 'music',
    render(c, s = {}) {
      const ART = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
      const volume = s.volume != null ? s.volume : 65;
      const shuffle = s.shuffle === true;
      const repeat = s.repeat || 'off';
      const SHUFFLE_ICO = shuffle ? '🔀' : '';
      const REPEAT_ICO = repeat !== 'off' ? (repeat === 'one' ? '🔁' : '🔁') : '';
      if (c === 'bar') {
        return `<div class="tf tf-music bar"><div class="disk"><div class="disk-art">${ART}</div><svg class="ring" viewBox="0 0 36 36"><circle class="track" cx="18" cy="18" r="16"/><circle class="prog" cx="18" cy="18" r="16" style="stroke-dashoffset: ${100.5 - (volume / 100) * 100.5}"/></svg></div></div>`;
      }
      if (c === 'greeter') return `<div class="tf tf-music gr"><span class="ico">${ART}</span><span class="n">Outro · M83</span></div>`;
      const ctl = `<div class="ctl">${SHUFFLE_ICO ? `<button class="shuf${shuffle ? ' active' : ''}" title="Shuffle">${SHUFFLE_ICO}</button>` : ''}<button class="prev">‹‹</button><button class="play">▶</button><button class="next">››</button>${REPEAT_ICO ? `<button class="rep${repeat !== 'off' ? ' active' : ''}" title="Repeat ${repeat}">${REPEAT_ICO}</button>` : ''}</div>`;
      const volBar = `<div class="vol"><span class="vlabel">Vol</span><input type="range" min="0" max="100" value="${volume}" class="vol-slider" /><span class="vval">${volume}%</span></div>`;
      if (c === 'desktop') return `<div class="tf tf-music player desk"><div class="art">${ART}</div><div class="info"><div class="n">Outro</div><div class="a">M83 — Hurry Up, We're Dreaming</div><div class="pg"><i></i><span>1:14 / 3:54</span></div>${ctl}${volBar}</div></div>`;
      if (c === 'bento') return `<div class="tf tf-music player bento"><div class="art">${ART}</div><div class="info"><div class="n">Outro</div><div class="a">M83</div><div class="pg"><i></i></div>${ctl}</div></div>`;
      return `<div class="tf tf-music player pop"><div class="art">${ART}</div><div class="info"><div class="n">Outro</div><div class="a">M83 — Hurry Up, We're Dreaming</div><div class="pg"><i></i></div>${ctl}</div></div>`;
    },
    settingsSchema: [
      { key: 'volume', label: 'Volume', type: 'slider', min: 0, max: 100, default: 65 },
      { key: 'shuffle', label: 'Shuffle', type: 'toggle', default: false },
      { key: 'repeat', label: 'Repeat', type: 'select', options: [['off','Off'],['all','All'],['one','One']], default: 'off' },
    ],
  },

  weather: {
    id: 'weather', name: 'Weather', icon: 'cloud-sun',
    render(c, s = {}) {
      const loc = s.location || 'Reykjavik';
      const units = s.units === 'F' ? 'F' : 'C';
      const showForecast = s.showForecast !== false;
      const tempC = 18;
      const temp = units === 'F' ? Math.round(tempC * 9 / 5 + 32) : tempC;
      const fcTemps = [16, 15, 14, 13].map((t) => units === 'F' ? Math.round(t * 9 / 5 + 32) : t);
      if (c === 'bar') return `<div class="tf tf-wx bar"><span class="i">⛅</span><span class="t">${temp}°</span></div>`;
      if (c === 'desktop') return `<div class="tf tf-wx desk"><div class="loc">${loc}</div><div class="big"><span class="i">⛅</span><span class="t">${temp}°</span></div><div class="cond">Partly Cloudy · 5 km/h · 41% humidity</div>${showForecast ? `<div class="fc">${['Mon','Tue','Wed','Thu'].map((x,i)=>`<div><span>${x}</span><b>${fcTemps[i]}°</b></div>`).join('')}</div>` : ''}</div>`;
      if (c === 'greeter') return `<div class="tf tf-wx gr"><span class="i">⛅</span><span class="t">${temp}°</span><span class="l">${loc}</span></div>`;
      return `<div class="tf tf-wx pop"><div class="loc">${loc}</div><div class="big"><span class="i">⛅</span><span class="t">${temp}°</span></div><div class="cond">Partly Cloudy</div></div>`;
    },
    settingsSchema: [
      { key: 'location', label: 'Location', type: 'text', default: 'Reykjavik' },
      { key: 'units', label: 'Units', type: 'select', options: [['C','Celsius'],['F','Fahrenheit']], default: 'C' },
      { key: 'showForecast', label: 'Show forecast', type: 'toggle', default: true },
    ],
  },

  system: {
    id: 'system', name: 'System', icon: 'activity',
    render(c, s = {}) {
      if (c === 'greeter') return '';
      const showCPU = s.showCPU !== false;
      const showRAM = s.showRAM !== false;
      const showDisk = s.showDisk !== false;
      const showNet = s.showNet !== false;
      if (c === 'bar') {
        const metrics = [];
        if (showCPU) metrics.push(`<div class="m"><span>CPU</span><i style="--p:34%"></i></div>`);
        if (showRAM) metrics.push(`<div class="m"><span>RAM</span><i style="--p:62%"></i></div>`);
        return `<div class="tf tf-sys bar">${metrics.join('')}</div>`;
      }
      if (c === 'desktop') {
        const rows = [];
        if (showCPU) rows.push(`<div class="row"><span>CPU</span><b>34%</b><i style="--p:34%"></i></div>`);
        if (showRAM) rows.push(`<div class="row"><span>RAM</span><b>62%</b><i style="--p:62%"></i></div>`);
        if (showDisk) rows.push(`<div class="row"><span>Disk</span><b>48%</b><i style="--p:48%"></i></div>`);
        if (showNet) rows.push(`<div class="row"><span>Net</span><b>1.2 MB/s</b><i style="--p:22%"></i></div>`);
        return `<div class="tf tf-sys desk">${rows.join('')}</div>`;
      }
      const rows = [];
      if (showCPU) rows.push(`<div class="row"><span>CPU</span><b>34%</b></div>`);
      if (showRAM) rows.push(`<div class="row"><span>RAM</span><b>62%</b></div>`);
      if (showDisk) rows.push(`<div class="row"><span>Disk</span><b>48%</b></div>`);
      if (showNet) rows.push(`<div class="row"><span>Net</span><b>1.2 MB/s</b></div>`);
      return `<div class="tf tf-sys pop">${rows.join('')}</div>`;
    },
    settingsSchema: [
      { key: 'showCPU', label: 'Show CPU', type: 'toggle', default: true },
      { key: 'showRAM', label: 'Show RAM', type: 'toggle', default: true },
      { key: 'showDisk', label: 'Show Disk', type: 'toggle', default: true },
      { key: 'showNet', label: 'Show Network', type: 'toggle', default: true },
    ],
  },

  ai: {
    id: 'ai', name: 'AI', icon: 'bot',
    render(c, s = {}) {
      const model = s.model || 'glm-4';
      const showSuggestions = s.showSuggestions !== false;
      const modelLabel = model === 'glm-4' ? 'GLM-4' : 'GLM-4 Flash';
      if (c === 'bar') return `<div class="tf tf-ai bar"><span class="ico">✦</span><input placeholder="Ask ${modelLabel}…" /></div>`;
      if (c === 'desktop') return `<div class="tf tf-ai desk"><div class="h"><span class="ico">✦</span> AI Assistant <span class="model">${modelLabel}</span></div><input placeholder="Ask anything…" />${showSuggestions ? `<div class="sug">${['Summarize','Write code','Weather','Time'].map(x=>`<button>${x}</button>`).join('')}</div>` : ''}</div>`;
      if (c === 'greeter') return `<div class="tf tf-ai gr"><span class="ico">✦</span><span>Ask AI…</span></div>`;
      return `<div class="tf tf-ai pop"><div class="h"><span class="ico">✦</span> AI <span class="model">${modelLabel}</span></div><input placeholder="Ask anything…" /></div>`;
    },
    settingsSchema: [
      { key: 'model', label: 'Model', type: 'select', options: [['glm-4','GLM-4'],['glm-4-flash','GLM-4 Flash']], default: 'glm-4' },
      { key: 'showSuggestions', label: 'Show suggestions', type: 'toggle', default: true },
    ],
  },
};

/** Common settings shared by ALL desktop widgets (shown in every widget's
 *  settings popup alongside the widget's own unique settings). */
export const COMMON_SETTINGS = [
  { key: 'opacity', label: 'Opacity', type: 'slider', min: 30, max: 100, default: 100, group: 'common' },
  { key: 'alwaysOnTop', label: 'Always on top', type: 'toggle', default: false, group: 'common' },
];

const WIDGET_IDS = Object.keys(WIDGETS);

// per-container placement lists. All start EMPTY — the user drags widgets from
// the bento grid onto the bar (a single restricted slot) or the desktop.
const placements = {
  bar: [],
  popup: [],
  desktop: [],
  greeter: [],
};

const listeners = new Set();
export function onWidgets(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn({ placements }); bus.emit('widgets.change', { placements }); }

// per-widget desktop panel geometry {w,h,left,top} (so resize AND move persist)
const desktopSizes = {};
// per-widget bento grid span {col, row} (for resizable bento cards, e.g. music)
const bentoSpans = { music: { col: 2, row: 1 } };
// per-widget compact-mode flag (desktop panel shows bar-form in a small box)
const compactModes = {};
// per-widget setting values {key: value} (initialized from schema defaults on
// first access). Both common + widget-specific settings live in the same map.
const widgetSettings = {};

// natural widths for each widget's BAR form (used to size the outline preview
// shown while dragging a widget onto the bar — instead of rendering the actual
// widget, we show a dashed rectangle of the same width).
const BAR_WIDTHS = { clock: 52, music: 38, weather: 58, system: 92, ai: 132 };
// default desktop panel sizes (used when no persisted geometry exists yet, e.g.
// dragging from the palette to the desktop — so the outline preview matches the
// size the panel will become once dropped).
const DESKTOP_DEFAULTS = {
  clock:   { w: 280, h: 180 },
  music:   { w: 360, h: 150 },
  weather: { w: 280, h: 220 },
  system:  { w: 260, h: 200 },
  ai:      { w: 320, h: 200 },
};

export const widgetService = {
  get widgets() { return WIDGETS; },
  get ids() { return WIDGET_IDS; },
  get placements() { return placements; },

  inContainer(container, id) { return (placements[container] || []).includes(id); },
  listContainer(container) { return (placements[container] || []).slice(); },

  /** add widget `id` to `container`. The BAR is a restricted single-slot:
   *  adding replaces any widget already there. */
  addToContainer(id, container) {
    if (!WIDGETS[id] || !placements[container] || placements[container].includes(id)) return;
    if (container === 'bar') placements[container].length = 0; // restricted: one widget
    placements[container].push(id);
    emit();
  },
  /** remove widget `id` from `container` */
  removeFromContainer(id, container) {
    if (!placements[container]) return;
    const i = placements[container].indexOf(id);
    if (i < 0) return;
    placements[container].splice(i, 1);
    emit();
  },
  /** move widget from one container to another (remove from src, add to dst) */
  moveWidget(id, from, to) {
    if (from === to) return;
    this.removeFromContainer(id, from);
    this.addToContainer(id, to);
  },

  // per-widget desktop panel geometry {w,h,left,top} — persists resize AND move
  getDesktopSize(id) { return desktopSizes[id] || null; },
  setDesktopSize(id, w, h, left, top) { desktopSizes[id] = { w, h, left, top }; emit(); },

  // natural bar-form width (for outline-preview sizing during a drag onto bar)
  getBarWidth(id) { return BAR_WIDTHS[id] || 50; },
  // desktop-form size for a widget (persisted geometry if any, else the default
  // for that widget kind). Used to size the outline preview during a drag onto
  // the desktop.
  getDesktopPreviewSize(id) {
    const persisted = desktopSizes[id];
    const def = DESKTOP_DEFAULTS[id] || { w: 280, h: 180 };
    return persisted
      ? { w: persisted.w, h: persisted.h }
      : { w: def.w, h: def.h };
  },

  // bento grid span {col, row} (resizable bento cards — any edge/corner)
  getBentoSpan(id) { return bentoSpans[id] || { col: 1, row: 1 }; },
  setBentoSpan(id, col, row) {
    const cur = bentoSpans[id] || { col: 1, row: 1 };
    bentoSpans[id] = { col: Math.max(1, Math.min(3, col || cur.col)), row: Math.max(1, Math.min(3, row || cur.row)) };
    emit();
  },

  // ── compact mode (desktop panel shows the bar form in a small box) ──
  getCompactMode(id) { return !!compactModes[id]; },
  setCompactMode(id, on) {
    compactModes[id] = !!on;
    emit();
  },

  // ── per-widget settings (common + widget-specific, unified in one map) ──
  /** return the full schema for a widget = common settings + the widget's own
   *  unique settings. Used by the settings popup to render all rows. */
  getSettingsSchema(id) {
    const def = WIDGETS[id];
    const unique = (def && def.settingsSchema) ? def.settingsSchema : [];
    return [...COMMON_SETTINGS, ...unique];
  },
  /** get a widget's current settings (initialized from schema defaults on first
   *  access so every setting always has a value). */
  getSettings(id) {
    if (!widgetSettings[id]) {
      const schema = this.getSettingsSchema(id);
      const init = {};
      for (const s of schema) init[s.key] = s.default;
      widgetSettings[id] = init;
    }
    return widgetSettings[id];
  },
  /** set a single setting value on a widget + emit so the panel re-renders. */
  setSetting(id, key, value) {
    if (!widgetSettings[id]) this.getSettings(id);
    widgetSettings[id][key] = value;
    emit();
  },
};

export default widgetService;
