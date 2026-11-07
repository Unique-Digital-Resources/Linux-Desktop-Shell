/**
 * de-launcher.js — <de-launcher>
 *
 * Start-menu / launcher popover. Ports the verbatim #launcherPop markup +
 * the start-menu / settings / widgets CSS regions + the base .popover rules +
 * the .section-title rule + scrollbar rules.
 *
 * Methods: open(anchor), close(), toggle(anchor), isOpen(). Position computed
 * above the anchor (clamped to viewport) using getBoundingClientRect().
 *
 * Wiring:
 *   - .app-item[data-app] click → commands.execute('window.open', {appId}) then close()
 *   - .start-tab click → switch active pane
 *   - #searchInput filter → show/hide .app-group items by data-name
 *   - .settings-tab click → switch settings pane
 *   - .bar-side-tab click → local visual toggle
 *   - .config-row-check click → local visual toggle
 *   - .settings-toggle(#toggleBarConnection / #toggleBarInBox) → emit 'dock.config'
 *   - bar separation slider (#barSeparationSlider) → emit 'dock.config' {gap}
 *   - settings-theme-item click → local visual selection + updateThemeConfigValues
 *   - mode-tab click → local mode-content switching
 *
 * Settings→Bar config crosses into the dock's territory (a sibling component);
 * we use the bus event 'dock.config' that <de-dock> listens for.
 *
 * Local 5s clock interval updates #widgetTime/#widgetDate.
 */
import { renderIcons, swapIcon } from '../core/icons.js';
import { commands } from '../core/command-registry.js';
import { bus } from '../core/event-bus.js';
import { onTheme, themeService } from '../services/theme-service.js';
import { widgetService, onWidgets, WIDGETS } from '../services/widget-service.js';
import { makeSpanResizable } from '../core/resizable.js';
import { startWidgetDrag } from '../core/widget-drag.js';
import './tf-widget.js';

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

  .start-menu { width: 680px; height: 560px; padding: 0; display: flex; flex-direction: column; overflow: hidden; }
  .start-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border-1); flex-shrink: 0; }
  .start-tabs { display: flex; gap: 4px; }
  .start-tab { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--r-sm); font-size: 12px; font-weight: 500; color: var(--text-3); transition: all var(--d-fast); }
  .start-tab:hover { background: var(--tint-2); color: var(--text-1); }
  .start-tab.active { background: var(--tint-3); color: var(--text-1); box-shadow: inset 0 0 0 0.5px var(--border-2); }
  .start-tab svg { width: 14px; height: 14px; }

  .start-header .search-box { width: 220px; margin-bottom: 0; padding: 6px 10px; background: var(--tint-2); border: 1px solid var(--border-1); }
  .search-box { display: flex; align-items: center; gap: 8px; border-radius: var(--r-lg); transition: border-color var(--d-fast); }
  .search-box:focus-within { border-color: var(--border-3); }
  .search-box svg { width: 14px; height: 14px; color: var(--text-3); flex-shrink: 0; }
  .search-box input { flex: 1; background: transparent; border: none; outline: none; font-size: 12px; color: var(--text-1); }
  .search-box input::placeholder { color: var(--text-4); }

  .start-body { flex: 1; overflow-y: auto; padding: 14px; }
  .start-pane { display: none; height: 100%; }
  .start-pane.active { display: block; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .app-groups-container { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; align-items: start; }
  .app-group { background: var(--tint-1); border: 1px solid var(--border-1); border-radius: var(--r-lg); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .app-group.span-2 { grid-column: span 2; }
  .app-group.span-3 { grid-column: span 3; }
  .app-group-title { font-size: 10.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.07em; padding-left: 4px; }
  .app-group-items { display: grid; gap: 4px; }
  .app-group-items.layout-sq2 { grid-template-columns: repeat(2, 1fr); }
  .app-group-items.layout-h3 { grid-template-columns: repeat(3, 1fr); }
  .app-group-items.layout-v2 { grid-template-columns: 1fr; }

  .app-item { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 4px; border-radius: var(--r-md); transition: background var(--d-fast); text-align: center; }
  .app-item:hover { background: var(--tint-2); }
  .app-item img, .app-item svg { width: 28px; height: 28px; }
  .app-item span { font-size: 11px; font-weight: 450; color: var(--text-2); }
  .app-item-list { display: flex; flex-direction: row; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--r-sm); transition: background var(--d-fast); text-align: left; }
  .app-item-list:hover { background: var(--tint-2); }
  .app-item-list img, .app-item-list svg { width: 22px; height: 22px; }
  .app-item-list span { font-size: 12px; font-weight: 450; color: var(--text-2); }

  .start-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-top: 1px solid var(--border-1); flex-shrink: 0; gap: 10px; }
  .start-user-btn { display: flex; align-items: center; gap: 10px; padding: 6px 12px; border-radius: var(--r-md); background: rgba(0, 0, 0, 0.2); transition: background var(--d-fast); flex: 1; }
  .start-user-btn:hover { background: rgba(0, 0, 0, 0.3); }
  .start-user-btn img { width: 32px; height: 32px; border-radius: 50%; }
  .start-user-info { display: flex; flex-direction: column; }
  .start-user-name { font-size: 13px; font-weight: 500; color: var(--text-1); line-height: 1.2; }
  .start-user-sub { font-size: 10.5px; font-weight: 400; color: var(--text-3); }

  .start-power { width: 32px; height: 32px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); transition: all var(--d-fast); flex-shrink: 0; }
  .start-power:hover { background: var(--tint-2); color: var(--text-1); }
  .start-power svg { width: 16px; height: 16px; }

  .settings-layout { display: flex; height: 100%; gap: 16px; }
  .settings-nav { display: flex; flex-direction: column; gap: 2px; width: 160px; border-right: 1px solid var(--border-1); padding-right: 12px; flex-shrink: 0; }
  .settings-tab { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: var(--r-md); color: var(--text-3); font-size: 12px; transition: all var(--d-fast); text-align: left; }
  .settings-tab:hover { background: var(--tint-2); color: var(--text-1); }
  .settings-tab.active { background: var(--tint-3); color: var(--text-1); }
  .settings-tab svg { width: 14px; height: 14px; }

  .settings-content { flex: 1; overflow-y: auto; padding-right: 4px; }
  .settings-pane { display: none; flex-direction: column; gap: 14px; }
  .settings-pane.active { display: flex; animation: fadeIn 0.2s ease; }
  .settings-box { background: var(--tint-1); border: 1px solid var(--border-1); border-radius: var(--r-lg); padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  .settings-box-title { font-size: 13px; font-weight: 600; color: var(--text-1); }

  .theme-settings-layout { display: grid; grid-template-columns: 160px 1fr; gap: 16px; }
  .installed-themes-list { display: flex; flex-direction: column; gap: 4px; border-right: 1px solid var(--border-1); padding-right: 12px; }
  .settings-theme-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: var(--r-sm); cursor: pointer; transition: background var(--d-fast); }
  .settings-theme-item:hover { background: var(--tint-2); }
  .settings-theme-item.active { background: var(--tint-3); }

  /* Theme swatch plate — a 2×2 grid of the theme's accent dots.
     (These base rules were omitted from the original port, which made every
     swatch collapse to a single flat square — the dots never laid out.) */
  .color-plate-preview {
    width: 24px; height: 24px;
    border-radius: 6px;
    overflow: hidden;
    padding: 4px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 2px;
    border: 1px solid var(--border-2);
    flex-shrink: 0;
  }
  .dots-grid { display: contents; }
  .color-dot { border-radius: 2px; width: 100%; height: 100%; }
  .theme-short-name { font-size: 12px; font-weight: 500; color: var(--text-1); }
  .font-info-text { font-size: 10px; color: var(--text-3); font-family: 'JetBrains Mono', monospace; }
  .theme-separator { width: 1px; height: 14px; background: var(--border-2); }

  .settings-theme-item .color-plate-preview { width: 20px; height: 20px; padding: 3px; }
  .settings-theme-item .theme-short-name { font-size: 11.5px; }

  .theme-config { display: flex; flex-direction: column; gap: 12px; }
  .theme-wallpaper { width: 100%; height: 120px; object-fit: cover; border-radius: var(--r-md); border: 1px solid var(--border-1); background: var(--surface-deep); }
  .mode-tabs { display: flex; gap: 2px; padding: 3px; background: var(--tint-2); border-radius: var(--r-md); align-self: flex-start; }
  .mode-tab { padding: 5px 14px; border-radius: var(--r-sm); font-size: 11px; font-weight: 500; color: var(--text-3); display: flex; align-items: center; gap: 6px; transition: all var(--d-fast); }
  .mode-tab.active { background: var(--surface-pop); color: var(--text-1); box-shadow: var(--el-1); }
  .mode-tab svg { width: 12px; height: 12px; }

  .mode-content { display: none; flex-direction: column; gap: 12px; }
  .mode-content.active { display: flex; }
  .config-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-1); gap: 10px; }
  .config-row:last-child { border-bottom: none; }
  .config-label { font-size: 11.5px; color: var(--text-2); font-weight: 500; }
  .config-value { font-size: 11.5px; color: var(--text-1); font-weight: 400; display: flex; align-items: center; gap: 6px; }
  .config-value svg { width: 12px; height: 12px; color: var(--text-3); }
  .palette-display { display: flex; gap: 4px; }
  .palette-color { width: 18px; height: 18px; border-radius: 4px; border: 1px solid var(--border-2); }

  .bar-side-tabs { display: flex; gap: 2px; padding: 3px; background: var(--tint-2); border-radius: var(--r-md); width: fit-content; }
  .bar-side-tab { padding: 5px 14px; border-radius: var(--r-sm); font-size: 11px; font-weight: 500; color: var(--text-3); transition: all var(--d-fast); }
  .bar-side-tab.active { background: var(--surface-pop); color: var(--text-1); box-shadow: var(--el-1); }
  .bar-config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .config-group { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--surface-bar); border-radius: var(--r-md); border: 1px solid var(--border-1); }
  .config-group-title { font-size: 10.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 4px; }
  .mini-slider { flex: 1; height: 4px; background: var(--tint-2); border-radius: 2px; position: relative; margin: 0 10px; cursor: pointer; }
  .mini-slider-fill { height: 100%; background: var(--accent); border-radius: 2px; }
  .mini-slider-thumb { position: absolute; width: 10px; height: 10px; background: #fff; border-radius: 50%; top: 50%; left: 30%; transform: translate(-50%, -50%); box-shadow: 0 1px 2px rgba(0,0,0,0.2); pointer-events: none; }
  .mini-val { font-size: 11px; color: var(--text-3); width: 34px; text-align: right; font-variant-numeric: tabular-nums; }
  .settings-toggle { width: 32px; height: 18px; background: var(--tint-2); border-radius: 9px; position: relative; cursor: pointer; transition: background var(--d-fast); flex-shrink: 0; }
  .settings-toggle.active { background: var(--accent); }
  .settings-toggle-thumb { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: left var(--d-fast); box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  .settings-toggle.active .settings-toggle-thumb { left: 16px; }
  .config-row-check { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 11.5px; color: var(--text-3); cursor: pointer; transition: color var(--d-fast); }
  .config-row-check svg { width: 14px; height: 14px; color: var(--text-4); transition: var(--d-fast); }
  .config-row-check.active { color: var(--text-1); }
  .config-row-check.active svg { color: var(--accent); }

  .widgets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .widget { background: var(--tint-1); border: 1px solid var(--border-1); border-radius: var(--r-lg); padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .widget-head { font-size: 10.5px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.07em; }

  /* ===== Responsive Transformer Widgets — bento grid ===== */
  .tfm-intro { display: flex; flex-direction: column; gap: 3px; margin-bottom: 14px; }
  .tfm-intro-title { font-size: 14px; font-weight: 600; color: var(--text-1); }
  .tfm-intro-sub { font-size: 11.5px; color: var(--text-3); line-height: 1.4; }
  .tfm-intro-sub b { color: var(--text-1); font-weight: 600; }
  .bento-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: minmax(96px, auto); gap: 10px; }
  .bento-card {
    position: relative; background: var(--surface-pop); border: 1px solid var(--border-1);
    border-radius: var(--r-lg); padding: 12px; display: flex; flex-direction: column; gap: 8px;
    cursor: grab; transition: border-color var(--d-fast), transform 0.08s, box-shadow var(--d-fast);
    overflow: hidden; min-height: 96px;
  }
  .bento-card:hover { border-color: var(--accent); box-shadow: var(--el-2); }
  .bento-card:active { cursor: grabbing; transform: scale(0.98); }
  .bento-card.dragover { outline: 1.5px dashed var(--accent); }
  .bento-card .bento-label { display: flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; }
  .bento-card .bento-label svg { width: 13px; height: 13px; color: var(--accent); }
  .bento-card .bento-body { flex: 1; display: flex; align-items: center; justify-content: center; }
  .bento-card tf-widget { pointer-events: none; }
  /* se-corner resize handle (music bento card) — click cycles column span */
  .bento-resize {
    position: absolute; right: 4px; bottom: 4px; width: 14px; height: 14px; cursor: nwse-resize;
    opacity: 0.5; transition: opacity var(--d-fast); z-index: 2;
  }
  .bento-resize:hover { opacity: 1; }
  .bento-resize::after {
    content: ''; position: absolute; right: 1px; bottom: 1px; width: 8px; height: 8px;
    border-right: 2px solid var(--accent); border-bottom: 2px solid var(--accent); border-radius: 0 0 3px 0;
  }
  .widget-time .time-big { font-size: 36px; font-weight: 600; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
  .widget-time .date-big { font-size: 12px; color: var(--text-2); }
  .widget-weather .weather-body { display: flex; align-items: center; gap: 14px; }
  .weather-icon { color: var(--accent-light); }
  .weather-icon svg { width: 40px; height: 40px; }
  .weather-temp { font-size: 28px; font-weight: 600; line-height: 1; }
  .weather-cond { font-size: 12px; color: var(--text-2); margin-top: 4px; }
  .weather-loc { font-size: 10px; color: var(--text-4); margin-top: 2px; }
  .widget-stats { gap: 8px; }
  .stat-row { display: flex; align-items: center; gap: 10px; font-size: 11.5px; }
  .stat-label { width: 36px; color: var(--text-3); font-weight: 500; }
  .stat-bar { flex: 1; height: 5px; background: var(--tint-2); border-radius: 3px; overflow: hidden; }
  .stat-fill { height: 100%; background: var(--accent); border-radius: 3px; }
  .stat-val { width: 38px; text-align: right; color: var(--text-2); font-variant-numeric: tabular-nums; }
  .widget-proc { gap: 6px; }
  .proc-row { display: flex; justify-content: space-between; font-size: 11.5px; padding: 4px 0; border-bottom: 1px solid var(--border-1); }
  .widget-proc .proc-row:last-child { border-bottom: none; }
  .proc-row span:first-child { color: var(--text-2); }
  .proc-row span:last-child { color: var(--text-3); font-variant-numeric: tabular-nums; }
  .widget-music { grid-column: span 2; flex-direction: row; align-items: center; gap: 14px; }
  .wm-art { width: 48px; height: 48px; border-radius: var(--r-md); background: linear-gradient(135deg, #b4a0ff, #7c5fff); flex-shrink: 0; }
  .wm-info { flex: 1; min-width: 0; }
  .wm-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .wm-artist { font-size: 11px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .wm-controls { display: flex; gap: 4px; flex-shrink: 0; }
  .wm-btn { width: 34px; height: 34px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-2); transition: all var(--d-fast); }
  .wm-btn:hover { background: var(--tint-2); color: var(--text-1); }
  .wm-btn.play { background: var(--tint-3); color: var(--accent-light); }
  .wm-btn svg { width: 16px; height: 16px; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-3); }

  @media (max-width: 780px) {
    .start-menu { width: calc(100vw - 20px); height: calc(100vh - 100px); }
    .settings-layout { flex-direction: column; }
    .settings-nav { width: 100%; flex-direction: row; border-right: none; border-bottom: 1px solid var(--border-1); padding-right: 0; padding-bottom: 12px; overflow-x: auto; }
  }
  @media (max-width: 640px) {
    .app-groups-container { grid-template-columns: repeat(2, 1fr); }
    .app-group.span-2, .app-group.span-3 { grid-column: span 2; }
    .theme-settings-layout { grid-template-columns: 1fr; }
    .installed-themes-list { border-right: none; border-bottom: 1px solid var(--border-1); padding-right: 0; padding-bottom: 12px; }
    .bar-config-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 540px) {
    .widgets-grid { grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>`;

const HTML = `
<div class="popover start-menu" id="launcherPop">
  <div class="start-header">
    <div class="start-tabs">
      <button class="start-tab active" data-tab="apps"><i data-lucide="grid"></i> Apps</button>
      <button class="start-tab" data-tab="widgets"><i data-lucide="layout-dashboard"></i> Widgets</button>
      <button class="start-tab" data-tab="settings"><i data-lucide="settings"></i> Settings</button>
    </div>
    <div class="search-box">
      <i data-lucide="search"></i>
      <input type="text" id="searchInput" placeholder="Search..." autocomplete="off">
    </div>
  </div>
  <div class="start-body">
    <div class="start-pane active" id="pane-apps">
      <div class="app-groups-container">
        <!-- Row 1: Three 2x2 Squares -->
        <div class="app-group span-2">
          <div class="app-group-title">Internet</div>
          <div class="app-group-items layout-sq2">
            <button class="app-item" data-app="firefox" data-name="Firefox"><img src="https://cdn.simpleicons.org/firefox" alt=""><span>Firefox</span></button>
            <button class="app-item" data-app="discord" data-name="Discord"><img src="https://cdn.simpleicons.org/discord" alt=""><span>Discord</span></button>
            <button class="app-item" data-app="telegram" data-name="Telegram"><img src="https://cdn.simpleicons.org/telegram" alt=""><span>Telegram</span></button>
            <button class="app-item" data-app="slack" data-name="Slack"><img src="https://cdn.simpleicons.org/slack" alt=""><span>Slack</span></button>
          </div>
        </div>
        <div class="app-group span-2">
          <div class="app-group-title">Development</div>
          <div class="app-group-items layout-sq2">
            <button class="app-item" data-app="code" data-name="VS Code"><img src="https://cdn.simpleicons.org/vscode" alt=""><span>VS Code</span></button>
            <button class="app-item" data-app="terminal" data-name="Terminal"><i data-lucide="terminal-square"></i><span>Terminal</span></button>
            <button class="app-item" data-app="docker" data-name="Docker"><img src="https://cdn.simpleicons.org/docker" alt=""><span>Docker</span></button>
            <button class="app-item" data-app="github" data-name="GitHub"><img src="https://cdn.simpleicons.org/github" alt=""><span>GitHub</span></button>
          </div>
        </div>
        <div class="app-group span-2">
          <div class="app-group-title">Graphics</div>
          <div class="app-group-items layout-sq2">
            <button class="app-item" data-app="gimp" data-name="GIMP"><img src="https://cdn.simpleicons.org/gimp" alt=""><span>GIMP</span></button>
            <button class="app-item" data-app="inkscape" data-name="Inkscape"><img src="https://cdn.simpleicons.org/inkscape" alt=""><span>Inkscape</span></button>
            <button class="app-item" data-app="blender" data-name="Blender"><img src="https://cdn.simpleicons.org/blender" alt=""><span>Blender</span></button>
            <button class="app-item" data-app="figma" data-name="Figma"><img src="https://cdn.simpleicons.org/figma" alt=""><span>Figma</span></button>
          </div>
        </div>

        <!-- Row 2: Two 1x3 Horizontals -->
        <div class="app-group span-3">
          <div class="app-group-title">Office</div>
          <div class="app-group-items layout-h3">
            <button class="app-item" data-app="writer" data-name="Writer"><img src="https://cdn.simpleicons.org/libreofficewriter" alt=""><span>Writer</span></button>
            <button class="app-item" data-app="calc" data-name="Calc"><img src="https://cdn.simpleicons.org/libreofficecalc" alt=""><span>Calc</span></button>
            <button class="app-item" data-app="impress" data-name="Impress"><img src="https://cdn.simpleicons.org/libreofficeimpress" alt=""><span>Impress</span></button>
          </div>
        </div>
        <div class="app-group span-3">
          <div class="app-group-title">Media</div>
          <div class="app-group-items layout-h3">
            <button class="app-item" data-app="spotify" data-name="Spotify"><img src="https://cdn.simpleicons.org/spotify" alt=""><span>Spotify</span></button>
            <button class="app-item" data-app="obs" data-name="OBS"><img src="https://cdn.simpleicons.org/obsstudio" alt=""><span>OBS</span></button>
            <button class="app-item" data-app="vlc" data-name="VLC"><img src="https://cdn.simpleicons.org/vlc" alt=""><span>VLC</span></button>
          </div>
        </div>

        <!-- Row 3: Three 2x1 Verticals -->
        <div class="app-group span-2">
          <div class="app-group-title">System</div>
          <div class="app-group-items layout-v2">
            <button class="app-item app-item-list" data-app="settings" data-name="Settings"><i data-lucide="settings"></i><span>Settings</span></button>
            <button class="app-item app-item-list" data-app="files" data-name="Files"><i data-lucide="folder"></i><span>Files</span></button>
          </div>
        </div>
        <div class="app-group span-2">
          <div class="app-group-title">Utilities</div>
          <div class="app-group-items layout-v2">
            <button class="app-item app-item-list" data-app="calc_app" data-name="Calculator"><i data-lucide="calculator"></i><span>Calculator</span></button>
            <button class="app-item app-item-list" data-app="text_editor" data-name="Text Editor"><i data-lucide="file-text"></i><span>Text Editor</span></button>
          </div>
        </div>
        <div class="app-group span-2">
          <div class="app-group-title">Notes</div>
          <div class="app-group-items layout-v2">
            <button class="app-item app-item-list" data-app="obsidian" data-name="Obsidian"><img src="https://cdn.simpleicons.org/obsidian" alt=""><span>Obsidian</span></button>
            <button class="app-item app-item-list" data-app="notion" data-name="Notion"><img src="https://cdn.simpleicons.org/notion" alt=""><span>Notion</span></button>
          </div>
        </div>
      </div>
    </div>
    <div class="start-pane" id="pane-widgets">
      <!-- Responsive Transformer Widgets: a bento grid of widget cards. Drag a
           card onto the dock bar (compact form) or the desktop (floating panel).
           In the bar, click a widget to expand it; drag it to the desktop to float. -->
      <div class="tfm-intro">
        <span class="tfm-intro-title">Responsive Transformer Widgets</span>
        <span class="tfm-intro-sub">Drag a widget onto the <b>bar</b> (compact) or the <b>desktop</b> (floating panel). In the bar, click a widget to expand it; drag it to the desktop to float it.</span>
      </div>
      <div class="bento-grid" id="bentoGrid"></div>
    </div>
    <div class="start-pane" id="pane-settings">
      <div class="settings-layout">
        <div class="settings-nav">
          <button class="settings-tab active" data-settings-tab="looks"><i data-lucide="palette"></i> Looks & Feel</button>
          <button class="settings-tab" data-settings-tab="system"><i data-lucide="cpu"></i> System</button>
          <button class="settings-tab" data-settings-tab="network"><i data-lucide="wifi"></i> Network</button>
          <button class="settings-tab" data-settings-tab="accounts"><i data-lucide="user"></i> Accounts</button>
        </div>
        <div class="settings-content">
          <div class="settings-pane active" id="settings-pane-looks">
            <div class="settings-box">
              <div class="settings-box-title">Appearance & Themes</div>
              <div class="theme-settings-layout">
                <div class="installed-themes-list" id="settingsThemeList">
                  <!-- Populated by JS -->
                </div>
                <div class="theme-config" id="themeConfigArea">
                   <!-- Populated by JS -->
                </div>
              </div>
            </div>
            <div class="settings-box">
              <div class="settings-box-title">Shell Bar Configuration</div>
              <div class="bar-side-tabs">
                <button class="bar-side-tab" data-side="top">Top</button>
                <button class="bar-side-tab active" data-side="bottom">Bottom</button>
                <button class="bar-side-tab" data-side="left">Left</button>
                <button class="bar-side-tab" data-side="right">Right</button>
              </div>
              <div class="bar-config-grid">
                <div class="config-group">
                  <div class="config-group-title">Overriding</div>
                  <div class="config-row">
                    <span class="config-label">Layer Mode</span>
                    <span class="config-value">Bounding <i data-lucide="chevron-right"></i></span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Auto Hide</span>
                    <div class="settings-toggle"><div class="settings-toggle-thumb"></div></div>
                  </div>
                </div>
                
                <div class="config-group">
                  <div class="config-group-title">Dimensions</div>
                  <div class="config-row">
                    <span class="config-label">Height</span>
                    <div class="mini-slider"><div class="mini-slider-fill" style="width: 20%"></div><div class="mini-slider-thumb" style="left: 20%"></div></div>
                    <span class="mini-val">48px</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Width</span>
                    <div class="mini-slider"><div class="mini-slider-fill" style="width: 80%"></div><div class="mini-slider-thumb" style="left: 80%"></div></div>
                    <span class="mini-val">80%</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Margin Left</span>
                    <div class="mini-slider"><div class="mini-slider-fill" style="width: 10%"></div><div class="mini-slider-thumb" style="left: 10%"></div></div>
                    <span class="mini-val">16px</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Margin Right</span>
                    <div class="mini-slider"><div class="mini-slider-fill" style="width: 10%"></div><div class="mini-slider-thumb" style="left: 10%"></div></div>
                    <span class="mini-val">16px</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Edge Distance</span>
                    <div class="mini-slider"><div class="mini-slider-fill" style="width: 5%"></div><div class="mini-slider-thumb" style="left: 5%"></div></div>
                    <span class="mini-val">16px</span>
                  </div>
                </div>
                
                <div class="config-group">
                  <div class="config-group-title">Parenting & Layout</div>
                  <div class="config-row">
                    <span class="config-label">Items Connected</span>
                    <div class="settings-toggle active" id="toggleBarConnection"><div class="settings-toggle-thumb"></div></div>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Items In Box</span>
                    <div class="settings-toggle active" id="toggleBarInBox"><div class="settings-toggle-thumb"></div></div>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Separation</span>
                    <div class="mini-slider" id="barSeparationSlider"><div class="mini-slider-fill" id="barSeparationFill" style="width: 30%"></div><div class="mini-slider-thumb" id="barSeparationThumb" style="left: 30%"></div></div>
                    <span class="mini-val" id="barSeparationVal">6px</span>
                  </div>
                  <div class="config-row">
                    <span class="config-label">Alignment</span>
                    <span class="config-value">Center <i data-lucide="chevron-right"></i></span>
                  </div>
                </div>
                
                <div class="config-group">
                  <div class="config-group-title">Bar Items</div>
                  <div class="config-row-check active"><i data-lucide="check"></i> Start Menu & AI</div>
                  <div class="config-row-check active"><i data-lucide="check"></i> Pinned Apps & Groups</div>
                  <div class="config-row-check active"><i data-lucide="check"></i> Workspace Widget</div>
                  <div class="config-row-check active"><i data-lucide="check"></i> Device States</div>
                  <div class="config-row-check active"><i data-lucide="check"></i> Globe State (Clock)</div>
                </div>
              </div>
            </div>
            <div class="settings-box">
              <div class="settings-box-title">Window Behavior</div>
              <div class="config-row">
                <span class="config-label">Focus Mode</span>
                <span class="config-value">Click to focus <i data-lucide="chevron-right"></i></span>
              </div>
              <div class="config-row">
                <span class="config-label">Titlebar Actions</span>
                <span class="config-value">Double click to maximize <i data-lucide="chevron-right"></i></span>
              </div>
            </div>
          </div>
          <div class="settings-pane" id="settings-pane-system">
            <div class="settings-box">
              <div class="settings-box-title">Hardware Info</div>
              <div class="config-row"><span class="config-label">CPU</span><span class="config-value">AMD Ryzen 7 5800X</span></div>
              <div class="config-row"><span class="config-label">Memory</span><span class="config-value">16 GB DDR4</span></div>
              <div class="config-row"><span class="config-label">Graphics</span><span class="config-value">NVIDIA RTX 3070</span></div>
            </div>
            <div class="settings-box">
              <div class="settings-box-title">Power Management</div>
              <div class="config-row"><span class="config-label">Power Mode</span><span class="config-value">Balanced <i data-lucide="chevron-right"></i></span></div>
              <div class="config-row"><span class="config-label">Screen Timeout</span><span class="config-value">15 minutes <i data-lucide="chevron-right"></i></span></div>
            </div>
          </div>
          <div class="settings-pane" id="settings-pane-network">
            <div class="settings-box">
              <div class="settings-box-title">Wi-Fi</div>
              <div class="config-row"><span class="config-label">Status</span><span class="config-value">Connected to Aurora-5G</span></div>
              <div class="config-row"><span class="config-label">IP Address</span><span class="config-value">192.168.1.42</span></div>
              <div class="config-row"><span class="config-label">MAC Address</span><span class="config-value">3C:52:82:1F:9A:2B</span></div>
            </div>
          </div>
          <div class="settings-pane" id="settings-pane-accounts">
            <div class="settings-box">
              <div class="settings-box-title">User Info</div>
              <div class="config-row"><span class="config-label">Name</span><span class="config-value">kai</span></div>
              <div class="config-row"><span class="config-label">Account Type</span><span class="config-value">Administrator</span></div>
              <div class="config-row"><span class="config-label">Login Shell</span><span class="config-value">/bin/zsh</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="start-footer">
    <button class="start-user-btn">
      <img src="https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Felix" alt="">
      <div class="start-user-info">
        <span class="start-user-name">kai</span>
        <span class="start-user-sub">Administrator</span>
      </div>
    </button>
    <button class="start-power" data-tip="Power"><i data-lucide="power"></i></button>
  </div>
</div>`;

// Theme data model (verbatim from original)
const THEMES = {
  Midnight: {
    dark: { url: 'https://images.pexels.com/photos/31622977/pexels-photo-31622977.jpeg', bg: '#24283b', text: '#f0ecff', dots: ['#7aa2f7', '#bb9af7', '#c0caf5', '#8b6fff'] },
    light: { url: 'https://images.pexels.com/photos/31622978/pexels-photo-31622978.jpeg', bg: '#e6e6fa', text: '#1a1530', dots: ['#7aa2f7', '#bb9af7', '#8b6fff', '#c0caf5'] },
    accent: '#8b6fff'
  },
  Cyberpunk: {
    dark: { url: 'https://images.pexels.com/photos/38184044/pexels-photo-38184044.jpeg', bg: '#1a0b1a', text: '#ffffff', dots: ['#ff0055', '#00e5ff', '#ffffff', '#ff007a'] },
    light: { url: 'https://images.pexels.com/photos/38184045/pexels-photo-38184045.jpeg', bg: '#ffe6f0', text: '#1a0b1a', dots: ['#ff0055', '#00e5ff', '#ff007a', '#ffffff'] },
    accent: '#ff007a'
  },
  Sunny: {
    dark: { url: '', bg: '#333333', text: '#fdfcdc', dots: ['#ffb703', '#fb8500', '#fdfcdc', '#ffb703'] },
    light: { url: '', bg: '#fdfcdc', text: '#333333', dots: ['#ffb703', '#fb8500', '#333333', '#ffb703'] },
    accent: '#ffb703'
  }
};

const daysLong = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const monthsLong = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

class DeLauncher extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    this._open = false;
    requestAnimationFrame(() => this._init());
  }

  _init() {
    this._popover = this._root.getElementById('launcherPop');
    this._initIcons = () => renderIcons(this._root);
    this._initIcons();

    // Start tabs
    this._root.querySelectorAll('.start-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this._root.querySelectorAll('.start-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        this._root.querySelectorAll('.start-pane').forEach((p) => p.classList.remove('active'));
        this._root.getElementById('pane-' + target).classList.add('active');
      });
    });

    // ===== Responsive Transformer Widgets manager (Widgets tab) =====
    this._renderWidgetManager();
    this._unsubWidgets = onWidgets(() => this._renderWidgetManager());

    // Settings tabs
    this._root.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this._root.querySelectorAll('.settings-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.settingsTab;
        this._root.querySelectorAll('.settings-pane').forEach((p) => p.classList.remove('active'));
        this._root.getElementById('settings-pane-' + target).classList.add('active');
      });
    });

    // Bar side tabs
    this._root.querySelectorAll('.bar-side-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this._root.querySelectorAll('.bar-side-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });

    // Config row checkboxes
    this._root.querySelectorAll('.config-row-check').forEach((row) => {
      row.addEventListener('click', () => {
        row.classList.toggle('active');
      });
    });

    // Settings toggles (Items Connected / Items In Box / Auto Hide)
    this._root.querySelectorAll('.settings-toggle').forEach((toggle) => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle.classList.toggle('active');
        if (toggle.id === 'toggleBarConnection') {
          bus.emit('dock.config', { disconnected: !toggle.classList.contains('active') });
        }
        if (toggle.id === 'toggleBarInBox') {
          bus.emit('dock.config', { inBox: toggle.classList.contains('active') });
        }
      });
    });

    // Bar separation slider → emit gap
    this._makeMiniSlider(
      this._root.getElementById('barSeparationSlider'),
      this._root.getElementById('barSeparationFill'),
      this._root.getElementById('barSeparationThumb'),
      this._root.getElementById('barSeparationVal'),
      30,
      (v) => {
        const px = Math.round(v / 100 * 20); // 0 to 20px
        this._root.getElementById('barSeparationVal').textContent = `${px}px`;
        bus.emit('dock.config', { gap: px });
      }
    );

    // Search filter
    const searchInput = this._root.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      this._root.querySelectorAll('#pane-apps .app-group').forEach((group) => {
        let visibleCount = 0;
        group.querySelectorAll('.app-item').forEach((item) => {
          const match = item.dataset.name.toLowerCase().includes(q);
          item.style.display = match ? '' : 'none';
          if (match) visibleCount++;
        });
        group.style.display = visibleCount > 0 ? '' : 'none';
      });
    });
    searchInput.addEventListener('click', (e) => e.stopPropagation());

    // App item click → open a NEW window of the app (forceNew) so launching
    // the same app twice creates two clients (the dock doughnut then shows 2
    // slices). The dock's own app-icon click instead focuses the existing one.
    this._root.querySelectorAll('.app-item[data-app]').forEach((item) => {
      item.addEventListener('click', () => {
        commands.execute('window.open', { appId: item.dataset.app, forceNew: true });
        this.close();
        searchInput.value = '';
        this._root.querySelectorAll('.app-item').forEach((i) => (i.style.display = ''));
        this._root.querySelectorAll('.app-group').forEach((g) => (g.style.display = ''));
      });
    });

    // Outside click
    this._outsideHandler = (e) => {
      if (this._open && !e.composedPath().includes(this)) this.close();
    };
    document.addEventListener('click', this._outsideHandler);

    // Resize repositions
    this._resizeHandler = () => { if (this._open && this._anchor) this._position(this._anchor); };
    window.addEventListener('resize', this._resizeHandler);

    // Escape closes
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this._open) this.close();
    };
    document.addEventListener('keydown', this._keyHandler);

    // Click inside popover doesn't bubble to outside handler
    this._popover.addEventListener('click', (e) => e.stopPropagation());

    // Theme config (settings pane) — render based on current theme
    this._unsubTheme = onTheme(() => this._renderThemeSettings());
    this._renderThemeSettings();

    // Widgets pane clock
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 5000);
  }

  _updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const t = this._root.getElementById('widgetTime');
    const d = this._root.getElementById('widgetDate');
    if (t) t.textContent = `${h}:${m}`;
    if (d) d.textContent = `${daysLong[now.getDay()]}, ${now.getDate()} ${monthsLong[now.getMonth()]}`;
  }

  _renderThemeSettings() {
    const isLight = themeService.mode === 'light';
    const currentTheme = themeService.theme;

    // Populate settings theme list
    const settingsList = this._root.getElementById('settingsThemeList');
    if (settingsList) {
      settingsList.innerHTML = '';
      Object.keys(THEMES).forEach((name) => {
        const t = THEMES[name];
        const tMode = isLight ? t.light : t.dark;
        const item = document.createElement('div');
        item.className = 'settings-theme-item' + (name === currentTheme ? ' active' : '');
        item.dataset.theme = name;
        item.innerHTML = `
          <div class="color-plate-preview" style="background-color: ${tMode.bg};">
            <div class="dots-grid">
              ${tMode.dots.map((d) => `<div class="color-dot" style="background-color: ${d};"></div>`).join('')}
            </div>
          </div>
          <span class="theme-short-name">${name}</span>
        `;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          // NOTE: in the original, selecting a theme in settings does NOT change
          // the actual active theme — it's a local visual preview only.
          settingsList.querySelectorAll('.settings-theme-item').forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
          this._updateThemeConfigValues(name);
        });
        settingsList.appendChild(item);
      });
    }

    this._updateThemeConfigValues(currentTheme);
  }

  _updateThemeConfigValues(themeName) {
    const configArea = this._root.getElementById('themeConfigArea');
    if (!configArea) return;
    const theme = THEMES[themeName];
    if (!theme) return;
    const isLight = themeService.mode === 'light';

    configArea.innerHTML = `
      <div class="mode-tabs">
        <button class="mode-tab ${!isLight ? 'active' : ''}" data-mode="dark"><i data-lucide="moon"></i> Dark</button>
        <button class="mode-tab ${isLight ? 'active' : ''}" data-mode="light"><i data-lucide="sun"></i> Light</button>
      </div>
      <div class="mode-content ${!isLight ? 'active' : ''}" id="mode-content-dark">
        ${this._generateModeContent(theme.dark)}
      </div>
      <div class="mode-content ${isLight ? 'active' : ''}" id="mode-content-light">
        ${this._generateModeContent(theme.light)}
      </div>
    `;

    configArea.querySelectorAll('.mode-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        configArea.querySelectorAll('.mode-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        configArea.querySelectorAll('.mode-content').forEach((c) => c.classList.remove('active'));
        configArea.querySelector('#mode-content-' + mode).classList.add('active');
      });
    });

    this._initIcons();
  }

  _generateModeContent(modeData) {
    return `
      <img src="${modeData.url || ''}" alt="Wallpaper" class="theme-wallpaper" onerror="this.style.opacity='0'">
      <div class="config-row">
        <span class="config-label">Font Family</span>
        <span class="config-value"><i data-lucide="type"></i> Inter</span>
      </div>
      <div class="config-row">
        <span class="config-label">Font Size</span>
        <span class="config-value">14px</span>
      </div>
      <div class="config-row">
        <span class="config-label">Base Color</span>
        <span class="config-value">
          <div class="palette-display">
            <div class="palette-color" style="background-color: ${modeData.bg};"></div>
            <div class="palette-color" style="background-color: ${modeData.text};"></div>
          </div>
        </span>
      </div>
      <div class="config-row">
        <span class="config-label">Accent Palette</span>
        <span class="config-value">
          <div class="palette-display">
            ${modeData.dots.map((d) => `<div class="palette-color" style="background-color: ${d};"></div>`).join('')}
          </div>
        </span>
      </div>
    `;
  }

  /** Mini slider factory (matches the original makeSlider semantics). */
  _makeMiniSlider(sliderEl, fillEl, thumbEl, valueEl, initial, onChange) {
    let value = initial;
    let dragging = false;
    const setVal = (v, fire = true) => {
      value = Math.max(0, Math.min(100, Math.round(v)));
      fillEl.style.width = value + '%';
      if (thumbEl) thumbEl.style.left = value + '%';
      if (valueEl) valueEl.textContent = value + '%';
      if (fire && onChange) onChange(value);
    };
    const fromEvent = (clientX) => {
      const r = sliderEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width, clientX - r.left));
      setVal((x / r.width) * 100);
    };
    setVal(initial, false);
    sliderEl.addEventListener('mousedown', (e) => { dragging = true; fromEvent(e.clientX); e.preventDefault(); });
    sliderEl.addEventListener('touchstart', (e) => { dragging = true; fromEvent(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mousemove', (e) => { if (dragging) fromEvent(e.clientX); });
    document.addEventListener('touchmove', (e) => { if (dragging) fromEvent(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
    return { setVal, getVal: () => value };
  }

  // ===== Responsive Transformer Widgets — bento grid =====
  /** render the bento grid of all widgets as draggable cards. The music card
   *  uses the 'bento' (full-player) form, spans columns, and has a resize
   *  handle that cycles its column span (1 → 2 → 3 → 1). */
  _renderWidgetManager() {
    const grid = this._root.getElementById('bentoGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (const id of widgetService.ids) {
      const def = WIDGETS[id];
      if (!def) continue;
      const card = document.createElement('div');
      card.className = 'bento-card';
      card.title = `Drag ${def.name} onto the bar or desktop`;
      // pointer-based drag (not HTML5) — starts a ghost + bus events so the bar
      // slot / desktop can show a placement preview and accept the drop.
      card.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.rz-handle')) return; // don't drag from a resize handle
        e.preventDefault();
        startWidgetDrag(id, 'palette');
      });
      // ALL cards: bento form + col/row span + 8 resize handles (any edge/corner)
      const span = widgetService.getBentoSpan(id);
      if (span.col > 1) card.style.gridColumn = `span ${span.col}`;
      if (span.row > 1) card.style.gridRow = `span ${span.row}`;
      makeSpanResizable(card, {
        get: () => widgetService.getBentoSpan(id),
        set: (col, row) => widgetService.setBentoSpan(id, col, row),
        cellW: 130, cellH: 110, maxCol: 3, maxRow: 3,
      });
      const label = document.createElement('div');
      label.className = 'bento-label';
      label.innerHTML = `<i data-lucide="${def.icon}"></i>${def.name}`;
      card.appendChild(label);
      const body = document.createElement('div');
      body.className = 'bento-body';
      const w = document.createElement('tf-widget');
      w.setAttribute('data-id', id);
      w.setAttribute('data-container', 'bento');
      body.appendChild(w);
      card.appendChild(body);
      grid.appendChild(card);
    }
    renderIcons(this._root);
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

  disconnectedCallback() {
    if (this._outsideHandler) document.removeEventListener('click', this._outsideHandler);
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    if (this._clockInterval) clearInterval(this._clockInterval);
    if (this._unsubTheme) this._unsubTheme();
  }
}

customElements.define('de-launcher', DeLauncher);
export default DeLauncher;
