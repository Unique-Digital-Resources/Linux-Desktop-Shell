/**
 * widget-settings-ui.js — shared settings rendering for widget settings popups.
 *
 * Both the desktop panel settings popup (de-shell.js) and the bar widget
 * popover inline-settings (de-dock.js) use buildSettingsSection() to render
 * the common + widget-specific settings rows. The WIDGET_SETTINGS_CSS string
 * is injected into each component's shadow DOM so the .sp-* classes work in
 * both scopes.
 */
import { widgetService } from '../services/widget-service.js';

/** CSS for the settings UI (.sp-* classes). Inject this into any shadow DOM
 *  that hosts a settings section. Uses class-based selectors (not scoped to a
 *  specific element) so it works in both the shell's popup and the dock's
 *  inline popover. */
export const WIDGET_SETTINGS_CSS = `
  .sp-section { padding: 4px 0; }
  .sp-section + .sp-section { border-top: 1px solid var(--border-1); margin-top: 4px; padding-top: 8px; }
  .sp-label { font-size: 9px; font-weight: 600; color: var(--text-4); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .sp-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 0; font-size: 11px; color: var(--text-2); }
  .sp-row span { flex-shrink: 0; }
  /* toggle switch (compact pill) */
  .sp-toggle {
    width: 28px; height: 16px; border-radius: 999px; background: var(--tint-3); position: relative;
    cursor: pointer; transition: background var(--d-fast); flex-shrink: 0;
  }
  .sp-toggle::after {
    content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%;
    background: var(--text-1); transition: transform var(--d-fast);
  }
  .sp-toggle.on { background: var(--accent); }
  .sp-toggle.on::after { transform: translateX(12px); }
  /* slider row */
  .sp-row.sp-slider { flex-direction: column; align-items: stretch; gap: 2px; }
  .sp-slider-top { display: flex; justify-content: space-between; align-items: center; }
  .sp-slider-val { font-size: 10px; color: var(--text-3); font-variant-numeric: tabular-nums; }
  .sp-row input[type="range"] {
    -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px;
    background: var(--tint-3); outline: none; cursor: pointer;
  }
  .sp-row input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none; width: 12px; height: 12px; border-radius: 50%;
    background: var(--accent); cursor: pointer; box-shadow: 0 0 4px var(--accent-glow);
  }
  .sp-row input[type="range"]::-moz-range-thumb {
    width: 12px; height: 12px; border-radius: 50%; background: var(--accent); cursor: pointer; border: none;
  }
  /* select + text inputs */
  .sp-row select, .sp-row input[type="text"] {
    background: var(--tint-2); border: 1px solid var(--border-1); border-radius: var(--r-xs);
    color: var(--text-1); font-size: 11px; padding: 3px 6px; outline: none; cursor: pointer;
    font-family: inherit; flex-shrink: 0; min-width: 90px;
  }
  .sp-row select:focus, .sp-row input[type="text"]:focus { border-color: var(--border-3); }
`;

/** Build a settings section (label + rows) as a DOM element. Each row is
 *  rendered based on the setting type: toggle, slider, select, or text.
 *  Changes call widgetService.setSetting(id, key, value) which emits → the
 *  widget re-renders with the new setting applied.
 *  @param {string} label section label (e.g. "Common", "Clock")
 *  @param {Array} schemaRows the setting definitions for this section
 *  @param {string} id the widget id
 *  @returns {HTMLElement} the section DOM element */
export function buildSettingsSection(label, schemaRows, id) {
  const settings = widgetService.getSettings(id);
  const sec = document.createElement('div');
  sec.className = 'sp-section';
  const lbl = document.createElement('div');
  lbl.className = 'sp-label';
  lbl.textContent = label;
  sec.appendChild(lbl);
  for (const s of schemaRows) {
    const row = buildSettingRow(s, id, settings);
    if (row) sec.appendChild(row);
  }
  return sec;
}

function buildSettingRow(s, id, settings) {
  const row = document.createElement('div');
  row.className = 'sp-row' + (s.type === 'slider' ? ' sp-slider' : '');
  if (s.type === 'slider') {
    const top = document.createElement('div');
    top.className = 'sp-slider-top';
    const span = document.createElement('span');
    span.textContent = s.label;
    const val = document.createElement('span');
    val.className = 'sp-slider-val';
    const suffix = (s.key === 'opacity') ? '%' : '';
    val.textContent = settings[s.key] + suffix;
    top.appendChild(span);
    top.appendChild(val);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = s.min;
    input.max = s.max;
    input.value = settings[s.key];
    input.addEventListener('input', () => {
      val.textContent = input.value + suffix;
      widgetService.setSetting(id, s.key, Number(input.value));
    });
    row.appendChild(top);
    row.appendChild(input);
  } else if (s.type === 'toggle') {
    const span = document.createElement('span');
    span.textContent = s.label;
    const tog = document.createElement('div');
    tog.className = 'sp-toggle' + (settings[s.key] ? ' on' : '');
    tog.addEventListener('click', () => {
      const next = !settings[s.key];
      widgetService.setSetting(id, s.key, next);
      tog.classList.toggle('on', next);
    });
    row.appendChild(span);
    row.appendChild(tog);
  } else if (s.type === 'select') {
    const span = document.createElement('span');
    span.textContent = s.label;
    const sel = document.createElement('select');
    for (const [v, l] of s.options) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = l;
      if (settings[s.key] === v) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => widgetService.setSetting(id, s.key, sel.value));
    row.appendChild(span);
    row.appendChild(sel);
  } else if (s.type === 'text') {
    const span = document.createElement('span');
    span.textContent = s.label;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = settings[s.key] || '';
    inp.addEventListener('change', () => widgetService.setSetting(id, s.key, inp.value));
    row.appendChild(span);
    row.appendChild(inp);
  } else {
    return null;
  }
  return row;
}
