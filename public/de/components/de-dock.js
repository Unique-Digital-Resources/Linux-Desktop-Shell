/**
 * de-dock.js — <de-dock>
 *
 * Bottom shell bar. Ports the verbatim <nav id="dock-container"> markup + the
 * dock/bar-group/app-icon/AI-capsule/workspace-widget/stacked-tray/status-section
 * CSS region + tooltips. Per the porting guide, child components OMIT the token
 * block — tokens cascade from <de-shell>:'s :host. body.light structural
 * overrides (sys-tray-stacked / status-section / start-user-btn backgrounds)
 * are dropped per task spec; tokens handle light mode.
 *
 * Wiring:
 *   - #launcherBtn          → commands.execute('ui.toggleLauncher', {anchor})
 *   - #quickSettingsBtn     → commands.execute('ui.toggleQuickSettings', {anchor})
 *   - #globeBtn             → commands.execute('ui.toggleCalendar', {anchor})
 *   - #themeTriggerBtn      → commands.execute('ui.toggleThemePopup', {anchor})
 *   - #customToggle         → commands.execute('theme.toggleMode')
 *   - .app-icon[data-app]  → commands.execute('window.open', {appId})
 *   - #layout-indicator     → local visual toggle (float/stack)
 *   - .ws-dot               → local visual active dot
 *
 * Clock: 5s interval updates #time/#day/#date (popover clocks are owned by
 * their respective popover components).
 *
 * setActiveApp(appId) / clearActiveApp() — called by <de-shell> when the
 * focused window changes, to mark the corresponding .app-icon as .active.
 *
 * Bus subscriptions:
 *   - 'dock.config' {disconnected?, inBox?, gap?} from <de-launcher>'s settings
 *   - 'qs.volume'   {value}      from <de-quicksettings>'s volume slider
 *
 * Theme popup: the dock owns #themePopupMenu + #themeTriggerBtn. Populates on
 * init and on theme changes; click → commands.execute('theme.set', {theme}).
 */
import { renderIcons, swapIcon } from '../core/icons.js';
import { commands } from '../core/command-registry.js';
import { bus } from '../core/event-bus.js';
import { onTheme, themeService } from '../services/theme-service.js';
import { onWindowsChange, windowService } from '../services/window-service.js';
import { workspaceService, onWorkspacesChange } from '../services/workspace-service.js';
import { widgetService, onWidgets } from '../services/widget-service.js';
import { startWidgetDrag } from '../core/widget-drag.js';
import { buildSettingsSection, WIDGET_SETTINGS_CSS } from '../core/widget-settings-ui.js';
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
  #dock-container {
    position: absolute;
    bottom: 16px; left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    display: flex; align-items: center;
    gap: 6px;
    height: var(--bar-h);
    padding: 4px 8px;
    background: var(--surface-bar);
    border: 1px solid var(--border-1);
    border-radius: var(--r-3xl);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    box-shadow: 0 12px 32px rgba(0,0,0,0.42), 0 3px 8px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05);
    max-width: calc(100vw - 24px);
    animation: barRise 0.65s var(--ease-soft) both;
    transition: background 0.3s var(--ease), border-color 0.3s var(--ease), box-shadow 0.3s var(--ease), backdrop-filter 0.3s var(--ease), gap 0.3s var(--ease), padding 0.3s var(--ease);
  }
  @keyframes barRise { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

  #dock-container.disconnected {
    background: transparent;
    border: none;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    padding: 0;
  }

  .separator {
    width: 1px;
    height: 24px;
    background: linear-gradient(180deg, transparent, var(--border-2) 30%, var(--border-2) 70%, transparent);
    flex-shrink: 0;
    transition: background 0.3s var(--ease);
  }
  #dock-container.disconnected .separator {
    background: transparent;
  }

  .bar-group {
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: var(--r-xl);
    transition: background 0.3s var(--ease), border-color 0.3s var(--ease), box-shadow 0.3s var(--ease), backdrop-filter 0.3s var(--ease), padding 0.3s var(--ease);
  }
  /* transformer-widget slot (single bar-form widget). Hidden when empty (no
     placeholder clutter); shown only when a widget is placed OR during a drag
     via the dock-wide insertion preview. */
  #widgetSlot { gap: 0; min-height: 34px; display: flex; align-items: center; }
  #widgetSlot:not(.has-widget) { display: none; }
  #widgetSlot tf-widget { display: flex; align-items: center; height: 34px; cursor: pointer; }
  #widgetSlot tf-widget.dragging { opacity: 0.4; }
  /* dock-wide insertion preview: an IN-FLOW item that slides between dock items
     as the pointer moves (no floating ghost). Shows an OUTLINE BOX of the widget's
     bar-form width + a thin accent insertion bar (NOT the actual widget). */
  #dock-container.bar-dragging .bar-insert-preview { display: flex; }
  .bar-insert-preview {
    display: none; align-items: center; gap: 0; flex-shrink: 0; pointer-events: none;
  }
  .bar-insert-preview .bar-insert-bar { width: 2px; height: 28px; background: var(--accent); border-radius: 2px; box-shadow: 0 0 6px var(--accent-glow); margin: 0 1px; }
  /* the outline preview box: dashed rectangle sized to the widget's bar width */
  .bar-insert-preview .bar-insert-outline {
    height: 28px; flex-shrink: 0;
    border: 1.5px dashed var(--accent);
    background: var(--tint-2);
    border-radius: var(--r-sm);
    box-shadow: 0 0 10px var(--accent-glow);
  }
  /* expanded-widget popover */
  .widget-popover {
    position: absolute; bottom: 76px; left: 50%; transform: translateX(-50%) translateY(8px) scale(0.96);
    z-index: 60; display: none; flex-direction: column; gap: 0;
    background: var(--surface-pop); border: 1px solid var(--border-2); border-radius: var(--r-2xl);
    backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
    box-shadow: var(--el-3), inset 0 1px 0 rgba(255,255,255,0.05);
    padding: 14px; min-width: 180px; max-width: 320px;
    opacity: 0; transition: opacity var(--d-med) var(--ease), transform var(--d-med) var(--ease), max-width var(--d-med) var(--ease);
  }
  .widget-popover.open { display: flex; opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  /* when the inline settings section is open, widen the popover to fit both
     the widget + the settings side-by-side */
  .widget-popover.with-settings { max-width: 560px; }
  .widget-popover .wp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 4px; }
  .widget-popover .wp-title { font-size: 11px; font-weight: 600; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em; flex: 1; }
  .widget-popover .wp-settings-btn { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; color: var(--text-4); cursor: pointer; opacity: 0; transition: opacity var(--d-fast), color var(--d-fast), background var(--d-fast); }
  .widget-popover:hover .wp-settings-btn { opacity: 1; }
  .widget-popover .wp-settings-btn:hover { color: var(--text-1); background: var(--tint-3); }
  .widget-popover .wp-settings-btn.active { color: var(--accent); background: var(--tint-3); opacity: 1; }
  .widget-popover .wp-settings-btn svg { width: 13px; height: 13px; }
  .widget-popover .wp-close { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; color: var(--text-4); cursor: pointer; opacity: 0; transition: opacity var(--d-fast); }
  .widget-popover:hover .wp-close { opacity: 1; }
  .widget-popover .wp-close:hover { color: var(--text-1); background: var(--tint-3); opacity: 1; }
  /* body: widget column + settings column (side by side when settings open) */
  .widget-popover .wp-body { display: flex; gap: 14px; }
  .widget-popover .wp-widget-col { flex-shrink: 0; }
  .widget-popover .wp-settings-col { display: none; min-width: 200px; max-width: 240px; border-left: 1px solid var(--border-1); padding-left: 14px; max-height: 280px; overflow-y: auto; }
  .widget-popover.with-settings .wp-settings-col { display: block; }
  .widget-popover .wp-hint { font-size: 10px; color: var(--text-4); margin-top: 10px; text-align: center; }
  /* shared widget-settings row styles (.sp-section, .sp-row, .sp-toggle, etc.) */
  ${WIDGET_SETTINGS_CSS}

  #dock-container.disconnected.in-box .bar-group {
    background: var(--surface-bar);
    border: 1px solid var(--border-1);
    box-shadow: 0 12px 32px rgba(0,0,0,0.42), 0 3px 8px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    padding: 4px 8px;
  }

  .app-icon {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; border-radius: var(--r-md);
    color: var(--text-2);
    transition: background var(--d-fast) var(--ease), transform 0.08s var(--ease);
    position: relative; flex-shrink: 0;
  }
  .app-icon:hover { background: var(--tint-2); }
  .app-icon:active { transform: scale(0.92); }
  .app-icon img, .app-icon svg:not(.app-indicator):not([data-lucide]) {
    width: 20px; height: 20px; pointer-events: none;
  }
  .app-icon[data-lucide] i, .app-icon[data-lucide] svg {
    width: 18px; height: 18px; color: var(--text-2);
  }
  .app-icon.active { background: var(--tint-3); }

  .capsule-input-wrapper {
    display: flex; align-items: center; gap: 8px;
    padding: 0 12px;
    height: 34px;
    background: var(--tint-2);
    border: 1px solid var(--border-1);
    border-radius: 17px;
    transition: border-color var(--d-fast);
  }
  .capsule-input-wrapper:focus-within { border-color: var(--border-3); }
  .capsule-input-wrapper svg { width: 14px; height: 14px; color: var(--accent-light); flex-shrink: 0; }
  .capsule-input-wrapper input {
    background: transparent; border: none; outline: none;
    font-size: 12px; color: var(--text-1); width: 100px;
  }
  .capsule-input-wrapper input::placeholder { color: var(--text-3); }

  .app-indicator {
    position: absolute;
    top: -2px; left: -2px;
    width: 38px; height: 38px;
    pointer-events: none;
    transform: rotate(-90deg);
  }
  /* downloading progress arc: soft pulsing cyan glow around the slice */
  .app-indicator .download-arc {
    filter: drop-shadow(0 0 2px var(--downloading));
    animation: download-pulse 1.1s ease-in-out infinite;
  }
  @keyframes download-pulse {
    0%, 100% { filter: drop-shadow(0 0 1px var(--downloading)); opacity: 0.85; }
    50%      { filter: drop-shadow(0 0 4px var(--downloading)); opacity: 1; }
  }

  .office-group {
    display: flex; gap: 2px;
    padding: 2px;
    background: var(--tint-1);
    border: 1px solid var(--border-1);
    border-radius: var(--r-lg);
  }
  .office-group .app-icon { width: 28px; height: 28px; border-radius: var(--r-sm); }
  .office-group .app-icon img { width: 18px; height: 18px; }

  .workspace-widget {
    display: flex; align-items: center; gap: 10px;
    padding: 4px 8px;
    background: var(--tint-1);
    border: 1px solid var(--border-1);
    border-radius: var(--r-lg);
  }

  .layout-box {
    width: 22px; height: 22px;
    border: 1px solid var(--text-3);
    border-radius: 4px;
    display: flex; padding: 2px; gap: 2px;
    cursor: pointer;
    transition: border-color var(--d-fast);
  }
  .layout-box:hover { border-color: var(--accent); }
  .mini-win-container { display: flex; gap: 2px; width: 100%; height: 100%; }
  .mini-float { flex-direction: row; }
  .mini-stack { flex-direction: column; }
  /* free-floating preview: two overlapping rects, the front one displaced to
     the top-left (one floats over the other). */
  .mini-free { position: relative; }
  .mini-free .m-win { position: absolute; flex: none; width: 62%; height: 62%; }
  .mini-free .m-win.m-1 { top: 0; left: 0; z-index: 2; }
  .mini-free .m-win.m-2 { bottom: 0; right: 0; z-index: 1; }
  .m-win { flex: 1; background: var(--text-3); border-radius: 1px; opacity: 0.6; transition: var(--d-fast); }
  .m-win.solid { background: var(--accent); opacity: 1; box-shadow: 0 0 4px var(--accent-glow); }

  .theme-widget { position: relative; display: flex; align-items: center; gap: 6px; }
  .theme-dock-controls { display: flex; gap: 4px; align-items: center; }

  .theme-trigger-btn {
    width: 22px; height: 22px;
    border-radius: 6px;
    cursor: pointer;
    border: 1px solid var(--border-2);
    transition: transform var(--d-fast);
    padding: 3px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 2px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .theme-trigger-btn:hover { transform: scale(1.1); }
  .color-dot { border-radius: 2px; width: 100%; height: 100%; }

  .custom-toggle {
    width: 16px; height: 28px;
    background: var(--tint-2);
    border: 1px solid var(--border-1);
    border-radius: 8px;
    position: relative;
    cursor: pointer;
    transition: background var(--d-med) var(--ease);
  }
  .custom-toggle.active { background: var(--accent); border-color: var(--accent); }
  .custom-toggle-thumb {
    position: absolute; top: 1px; left: 1px;
    width: 12px; height: 12px;
    background: #fff;
    border-radius: 50%;
    display: grid; place-items: center;
    transition: top var(--d-med) var(--ease);
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }
  .custom-toggle.active .custom-toggle-thumb { top: 13px; }
  .custom-toggle-thumb i, .custom-toggle-thumb svg {
    width: 9px; height: 9px;
    color: #999;
    transition: color var(--d-med);
  }
  .custom-toggle.active .custom-toggle-thumb i,
  .custom-toggle.active .custom-toggle-thumb svg { color: var(--accent); }

  .theme-popup-menu {
    position: absolute;
    bottom: calc(100% + 8px); right: 0;
    width: 200px;
    background: var(--surface-pop);
    border: 1px solid var(--border-2);
    border-radius: var(--r-lg);
    padding: 4px;
    display: none;
    flex-direction: column; gap: 2px;
    z-index: 100;
    box-shadow: var(--el-3);
    opacity: 0;
    transform: translateY(5px);
    transition: opacity var(--d-med), transform var(--d-med);
  }
  .theme-popup-menu.open { display: flex; opacity: 1; transform: translateY(0); }
  .theme-item {
    display: flex; align-items: center; gap: 10px;
    padding: 6px;
    border-radius: var(--r-sm);
    cursor: pointer;
    transition: background var(--d-fast);
  }
  .theme-item:hover { background: var(--tint-2); }
  .theme-item.active { background: var(--tint-3); }
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
  .font-info-text { font-size: 10px; color: var(--text-3); font-family: 'JetBrains Mono', monospace; }
  .theme-separator { width: 1px; height: 14px; background: var(--border-2); }
  .theme-short-name { font-size: 12px; font-weight: 500; color: var(--text-1); }

  .ws-dots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
  .ws-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--text-4);
    transition: var(--d-fast);
    cursor: pointer;
    position: relative;
  }
  .ws-dot:hover { background: var(--text-2); }
  .ws-dot.active { background: var(--accent); box-shadow: 0 0 4px var(--accent-glow); }
  /* non-active workspaces that hold open windows: filled faded-accent dot
     (clearly distinct from empty gray dots and the solid active dot) */
  .ws-dot.has-windows:not(.active) {
    background: var(--accent);
    opacity: 0.5;
  }

  .sys-tray-stacked {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 5px 7px;
    height: 38px;
    width: 44px;
    border-radius: var(--r-md);
    color: var(--text-2);
    background: rgba(0, 0, 0, 0.2);
    transition: background var(--d-fast);
    place-items: center;
  }
  .sys-tray-stacked:hover { background: rgba(0, 0, 0, 0.3); }
  .sys-tray-stacked svg { width: 14px; height: 14px; stroke-width: 2; }

  .status-section {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 4px 12px;
    height: 38px;
    border-radius: var(--r-md);
    cursor: pointer;
    background: rgba(0, 0, 0, 0.2);
    transition: background var(--d-fast);
  }
  .status-section:hover { background: rgba(0, 0, 0, 0.3); }
  .weather-icon-only { color: var(--accent-light); width: 24px; height: 24px; }
  .vertical-separator { width: 1px; height: 24px; background: var(--border-2); }
  .date-time { display: flex; flex-direction: column; align-items: center; line-height: 1.2; }
  .time { font-size: 12px; font-weight: 600; color: var(--text-1); font-variant-numeric: tabular-nums; }
  .day { font-size: 10px; color: var(--text-2); }
  .date { font-size: 9px; color: var(--text-3); font-variant-numeric: tabular-nums; }

  [data-tip] { position: relative; }
  [data-tip]::before {
    content: attr(data-tip); position: absolute;
    bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(3px);
    background: var(--surface-deep); border: 1px solid var(--border-2); color: var(--text-1);
    padding: 4px 8px; border-radius: var(--r-xs); font-size: 11px; font-weight: 500;
    white-space: nowrap; pointer-events: none; opacity: 0;
    transition: opacity var(--d-fast), transform var(--d-fast); z-index: 50;
    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: var(--el-1);
  }
  [data-tip]:hover::before { opacity: 1; transform: translateX(-50%) translateY(0); transition-delay: 0.45s; }

  @media (max-width: 1100px) {
    .capsule-input-wrapper input { width: 60px; }
    #dock-container { gap: 4px; padding: 4px 6px; }
  }
  @media (max-width: 900px) {
    .capsule-input-wrapper { display: none; }
  }
  @media (max-width: 780px) {
    .office-group { display: none; }
  }
  @media (max-width: 640px) {
    .workspace-widget { display: none; }
    .status-section .date-time .day, .status-section .date-time .date { display: none; }
  }
  @media (max-width: 540px) {
    #dock-container { width: calc(100vw - 20px); border-radius: var(--r-2xl); justify-content: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
</style>`;

const HTML = `
<nav id="dock-container" aria-label="Shell bar">
  <div class="bar-group">
    <button class="app-icon" id="launcherBtn" data-tip="Start Menu"><i data-lucide="layout-grid"></i></button>
    <div class="capsule-input-wrapper">
      <i data-lucide="bot"></i>
      <input type="text" placeholder="Ask AI...">
    </div>
    <button class="app-icon" data-app="files" data-tip="Files"><i data-lucide="folder"></i></button>
  </div>
  
  <div class="separator"></div>
  
  <div class="bar-group">
    <button class="app-icon" data-app="firefox" data-tip="Firefox">
      <!-- the client-state doughnut indicator is injected dynamically by
           _renderClientIndicators() based on the open window(s) and their state -->
      <img src="https://cdn.simpleicons.org/firefox" alt="">
    </button>
  </div>
  
  <div class="separator"></div>

  <!-- Responsive Transformer Widget slot: a single restricted slot in the bar.
       Dropping a widget here places it (replacing any existing). The widget
       renders in its bar form (e.g. music = rotating disk). Click → popup;
       drag → desktop. -->
  <div class="bar-group" id="widgetSlot" data-drop="bar"></div>

  <div class="bar-group">
    <div class="office-group" data-tip="Office Suite">
      <button class="app-icon" data-app="writer"><img src="https://cdn.simpleicons.org/libreofficewriter" alt=""></button>
      <button class="app-icon" data-app="calc"><img src="https://cdn.simpleicons.org/libreofficecalc" alt=""></button>
      <button class="app-icon" data-app="impress"><img src="https://cdn.simpleicons.org/libreofficeimpress" alt=""></button>
    </div>
  </div>
  
  <div class="separator"></div>
  
  <div class="bar-group">
    <button class="app-icon" data-app="obsidian" data-tip="Obsidian"><img src="https://cdn.simpleicons.org/obsidian" alt=""></button>
    <button class="app-icon" data-app="inkscape" data-tip="Inkscape"><img src="https://cdn.simpleicons.org/inkscape" alt=""></button>
  </div>
  
  <div class="separator"></div>
  
  <div class="bar-group">
    <div class="workspace-widget">
      <div class="layout-box" id="layout-indicator" data-tip="Layout: Float">
        <div class="mini-win-container mini-float" id="miniWinContainer">
          <div class="m-win m-1"></div>
          <div class="m-win m-2 solid"></div>
        </div>
      </div>
      <div class="theme-widget">
        <div class="theme-dock-controls">
          <div class="theme-trigger-btn" id="themeTriggerBtn" data-tip="Theme Selector"></div>
          <div class="custom-toggle" id="customToggle" data-tip="Dark Mode">
            <div class="custom-toggle-thumb">
              <i data-lucide="moon" id="toggleIcon"></i>
            </div>
          </div>
        </div>
        <div class="theme-popup-menu" id="themePopupMenu"></div>
      </div>
      <div class="ws-dots" id="wsGridContainer">
        <div class="ws-dot active" data-ws="1"></div>
        <div class="ws-dot" data-ws="2"></div>
        <div class="ws-dot" data-ws="3"></div>
        <div class="ws-dot" data-ws="4"></div>
        <div class="ws-dot" data-ws="5"></div>
        <div class="ws-dot" data-ws="6"></div>
        <div class="ws-dot" data-ws="7"></div>
        <div class="ws-dot" data-ws="8"></div>
        <div class="ws-dot" data-ws="9"></div>
      </div>
    </div>
  </div>

  <div class="separator"></div>

  <div class="bar-group">
    <button class="sys-tray-stacked" id="quickSettingsBtn" data-tip="Quick Settings">
      <i data-lucide="wifi"></i>
      <i data-lucide="volume-2"></i>
      <i data-lucide="bluetooth"></i>
      <i data-lucide="battery-medium"></i>
    </button>
  </div>

  <div class="separator"></div>

  <div class="bar-group">
    <button class="status-section" id="globeBtn" data-tip="Calendar & Weather">
      <i data-lucide="cloud-sun" class="weather-icon-only"></i>
      <div class="vertical-separator"></div>
      <div class="date-time">
        <div class="time" id="time">--:--</div>
        <div class="day" id="day">---</div>
        <div class="date" id="date">---</div>
      </div>
    </button>
  </div>
</nav>
<!-- expanded-widget popover: opened when a bar widget is clicked; shows the
     widget's full (popup) form. Also a drop target (drop on desktop to float). -->
<div class="widget-popover" id="widgetPopover"></div>`;

// Theme data model (verbatim from original; same as launcher + shell)
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

const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

class DeDock extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    this._themePopupOpen = false;
    requestAnimationFrame(() => this._init());
  }

  _init() {
    this._initIcons = () => renderIcons(this._root);
    this._initIcons();

    this._dock = this._root.getElementById('dock-container');
    this._trigger = this._root.getElementById('themeTriggerBtn');
    this._popup = this._root.getElementById('themePopupMenu');
    this._customToggle = this._root.getElementById('customToggle');
    this._toggleIcon = this._root.getElementById('toggleIcon');
    this._qsBtn = this._root.getElementById('quickSettingsBtn');

    // Trigger buttons → commands
    this._root.getElementById('launcherBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      commands.execute('ui.toggleLauncher', { anchor: e.currentTarget });
    });
    this._qsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      commands.execute('ui.toggleQuickSettings', { anchor: e.currentTarget });
    });
    this._root.getElementById('globeBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      commands.execute('ui.toggleCalendar', { anchor: e.currentTarget });
    });
    this._trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      commands.execute('ui.toggleThemePopup', { anchor: e.currentTarget });
    });
    this._popup.addEventListener('click', (e) => e.stopPropagation());

    // Custom (light/dark) toggle
    this._customToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      commands.execute('theme.toggleMode');
    });

    // App icons → window.open
    this._root.querySelectorAll('.app-icon[data-app]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        commands.execute('window.open', { appId: btn.dataset.app });
      });
    });

    // Layout indicator → cycles the windowing layout (horizontal → vertical →
    // floating). The two inner mini-rects mock the layout:
    //   horizontal → 2 rects side-by-side (mini-float)
    //   vertical   → 2 rects stacked (mini-stack)
    //   floating   → 2 rects overlapping, front displaced top-left (mini-free)
    const layoutBox = this._root.getElementById('layout-indicator');
    const miniWinContainer = this._root.getElementById('miniWinContainer');
    const LAYOUT_CLASS = { horizontal: 'mini-float', vertical: 'mini-stack', floating: 'mini-free' };
    const LAYOUT_TIP = { horizontal: 'Layout: Horizontal', vertical: 'Layout: Vertical', floating: 'Layout: Floating' };
    const syncLayoutVisual = (mode) => {
      miniWinContainer.className = 'mini-win-container ' + (LAYOUT_CLASS[mode] || 'mini-float');
      layoutBox.setAttribute('data-tip', LAYOUT_TIP[mode] || 'Layout');
    };
    syncLayoutVisual(windowService.layoutMode);
    this._unsubLayout = onWindowsChange((s) => syncLayoutVisual(s.layoutMode));
    layoutBox.addEventListener('click', (e) => {
      e.stopPropagation();
      commands.execute('window.cycleLayoutMode');
    });

    // Responsive Transformer Widgets tray (bar-form widgets placed here).
    this._renderWidgetTray();
    this._unsubWidgetTray = onWidgets(() => this._renderWidgetTray());
    // wire the bar slot as a drop target up-front (so it accepts drops even
    // when empty — _renderWidgetTray returns early when the bar is empty).
    this._wireTrayDrop();
    this._trayDropWired = true;

    // Window-client doughnut indicators: each app button with open window(s)
    // in the active workspace shows a ring divided into N arcs (one per
    // window). One window = full ring. Arc color = the window's state:
    //   opened=white, collapsed(gray)=minimized, or the app's notification
    //   state (blue/green/red/yellow) which overrides.
    this._renderClientIndicators();
    this._unsubClientIndicators = onWindowsChange(() => this._renderClientIndicators());
    this._unsubClientIndicatorsTheme = onTheme(() => this._renderClientIndicators());
    this._unsubClientIndicatorsWs = onWorkspacesChange(() => this._renderClientIndicators());

    // Workspace dots → switch virtual desktop. Each workspace owns its own
    // theme/mode/layout/open windows; switching swaps all of them at once.
    // (Each dot also gets a tooltip + a "has windows" indicator dot.)
    const wsDots = this._root.querySelectorAll('.ws-dot');
    const syncWorkspaceDots = () => {
      const activeId = workspaceService.activeId;
      wsDots.forEach((dot) => {
        const id = Number(dot.dataset.ws);
        dot.classList.toggle('active', id === activeId);
        // mark workspaces that have open windows
        const ws = workspaceService.workspaces[id - 1];
        dot.classList.toggle('has-windows', !!(ws && ws.windows.length));
        dot.setAttribute('data-tip', ws && ws.windows.length ? `Workspace ${id} · ${ws.windows.length}` : `Workspace ${id}`);
      });
    };
    syncWorkspaceDots();
    this._unsubWorkspaces = onWorkspacesChange(syncWorkspaceDots);
    this._unsubWindowsForDots = onWindowsChange(syncWorkspaceDots);
    wsDots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        workspaceService.switchTo(Number(dot.dataset.ws));
      });
    });

    // Outside-click closes theme popup
    this._outsideHandler = (e) => {
      if (this._themePopupOpen) {
        const path = e.composedPath();
        if (!path.includes(this._popup) && !path.includes(this._trigger)) {
          this._closeThemePopup();
        }
      }
      // close the expanded-widget popover on outside click
      if (this._widgetPopId) {
        const path = e.composedPath();
        const pop = this._root.getElementById('widgetPopover');
        const tray = this._root.getElementById('widgetTray');
        if (pop && !path.includes(pop) && (!tray || !path.includes(tray))) {
          this._closeWidgetPopover();
        }
      }
    };
    document.addEventListener('click', this._outsideHandler);

    // Escape closes theme popup
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this._themePopupOpen) this._closeThemePopup();
    };
    document.addEventListener('keydown', this._keyHandler);

    // Bus subscriptions
    this._unsubDockConfig = bus.on('dock.config', ({ disconnected, inBox, gap } = {}) => {
      if (disconnected !== undefined) this._dock.classList.toggle('disconnected', disconnected);
      if (inBox !== undefined) this._dock.classList.toggle('in-box', inBox);
      if (gap !== undefined) this._dock.style.gap = `${gap}px`;
    });

    this._unsubQsVol = bus.on('qs.volume', ({ value } = {}) => {
      this._qsBtn.setAttribute('data-tip', `Volume · ${value}%`);
      const trayIcon = this._qsBtn.querySelector('i[data-lucide="volume-2"], i[data-lucide="volume-1"], i[data-lucide="volume-x"], svg');
      const name = value === 0 ? 'volume-x' : (value < 35 ? 'volume-1' : 'volume-2');
      if (trayIcon) {
        swapIcon(trayIcon, name);
        this._initIcons();
      }
    });

    // Theme: render trigger + popup, sync custom toggle state
    this._unsubTheme = onTheme(() => this._applyTheme());
    this._applyTheme();

    // Clock: 5s interval updates #time / #day / #date
    this._updateClock();
    this._clockInterval = setInterval(() => this._updateClock(), 5000);
  }

  _updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const t = this._root.getElementById('time');
    const d = this._root.getElementById('day');
    const dt = this._root.getElementById('date');
    if (t) t.textContent = `${h}:${m}`;
    if (d) d.textContent = days[now.getDay()];
    if (dt) dt.textContent = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  }

  _applyTheme() {
    const state = themeService.state;
    const themeName = state.theme;
    const isLight = state.mode === 'light';
    const theme = THEMES[themeName];
    if (!theme) return;
    const modeData = isLight ? theme.light : theme.dark;

    // Trigger button: dots colored per current mode
    this._trigger.innerHTML = '';
    this._trigger.style.backgroundColor = modeData.bg;
    modeData.dots.forEach((c) => {
      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.backgroundColor = c;
      this._trigger.appendChild(dot);
    });

    // Popup: list of themes
    this._popup.innerHTML = '';
    Object.keys(THEMES).forEach((name) => {
      const t = THEMES[name];
      const tMode = isLight ? t.light : t.dark;
      const item = document.createElement('div');
      item.className = 'theme-item' + (name === themeName ? ' active' : '');
      item.dataset.name = name;
      item.innerHTML = `
        <div class="color-plate-preview" style="background-color: ${tMode.bg};">
          <div class="dots-grid">
            ${tMode.dots.map((d) => `<div class="color-dot" style="background-color: ${d};"></div>`).join('')}
          </div>
        </div>
        <div class="font-info-text">SE 14</div>
        <div class="theme-separator"></div>
        <div class="theme-short-name">${name}</div>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        commands.execute('theme.set', { theme: name });
        this._closeThemePopup();
      });
      this._popup.appendChild(item);
    });

    // Custom toggle sync (light = active)
    this._customToggle.classList.toggle('active', isLight);
    this._customToggle.setAttribute('data-tip', isLight ? 'Light Mode' : 'Dark Mode');
    const desiredIcon = isLight ? 'sun' : 'moon';
    if (this._lastToggleIcon !== desiredIcon) {
      // The first render leaves <svg id="toggleIcon"> (no data-lucide); the
      // cached reference is to the original <i> (now detached). Re-query the
      // current element inside the thumb and swap it for a fresh <i>.
      const thumbEl = this._root.querySelector('.custom-toggle-thumb');
      const curEl = thumbEl && (thumbEl.querySelector('svg') || thumbEl.querySelector('i'));
      if (curEl) {
        swapIcon(curEl, desiredIcon);
        this._initIcons();
      }
      this._lastToggleIcon = desiredIcon;
    }
  }

  /** Theme popup methods (called by the shell on 'ui.popover' {which:'theme'}). */
  toggleThemePopup() {
    if (this._themePopupOpen) this._closeThemePopup();
    else this._openThemePopup();
  }
  _openThemePopup() {
    this._popup.classList.add('open');
    this._themePopupOpen = true;
  }
  _closeThemePopup() {
    this._popup.classList.remove('open');
    this._themePopupOpen = false;
  }
  isThemePopupOpen() { return !!this._themePopupOpen; }
  closeThemePopup() { this._closeThemePopup(); }

  /**
   * Render the window-client doughnut indicator on every dock app button that
   * has open window(s) in the ACTIVE workspace. The ring is an SVG divided
   * into N arcs (one per window); one window = a full ring. Each arc is
   * colored by its window's state (appState overrides clientState).
   */
  _renderClientIndicators() {
    if (!this._root) return;
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const activeWs = workspaceService.active;
    // group the active workspace's windows by appId
    const byApp = new Map();
    for (const w of activeWs.windows) {
      if (!byApp.has(w.appId)) byApp.set(w.appId, []);
      byApp.get(w.appId).push(w);
    }
    for (const btn of this._root.querySelectorAll('.app-icon[data-app]')) {
      const appId = btn.dataset.app;
      const old = btn.querySelector('.app-indicator');
      if (old) old.remove();
      const wins = byApp.get(appId) || [];
      if (!wins.length) continue;

      const svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'app-indicator');
      svg.setAttribute('viewBox', '0 0 32 32');

      const r = 14;
      const C = 2 * Math.PI * r;          // ≈ 87.96
      const N = wins.length;
      const seg = C / N;                 // angular size of each client's slice
      const gap = N === 1 ? 0 : 3;       // small gap between slices

      wins.forEach((w, i) => {
        const baseArc = N === 1 ? C - 0.5 : Math.max(seg - gap, 1);
        const offset = -i * seg;

        if (w.appState === 'downloading') {
          // a download slice: a faint full-slice track + a progress arc that
          // fills it as the download progresses, with a soft cyan glow.
          const track = this._mkCircle(SVG_NS, r, baseArc, C, offset);
          track.style.stroke = 'var(--client-collapsed)';
          track.style.opacity = '0.35';
          svg.appendChild(track);

          const p = (typeof w.progress === 'number' ? w.progress : 0) / 100;
          const progLen = Math.max(0.5, baseArc * p);
          const prog = this._mkCircle(SVG_NS, r, progLen, C, offset);
          prog.setAttribute('class', 'download-arc');
          prog.setAttribute('stroke-linecap', 'round');
          prog.style.stroke = 'var(--downloading)';
          svg.appendChild(prog);
        } else {
          const c = this._mkCircle(SVG_NS, r, baseArc, C, offset);
          c.setAttribute('stroke-linecap', N === 1 ? 'round' : 'butt');
          c.style.stroke = this._clientColor(w);
          svg.appendChild(c);
        }
      });
      btn.insertBefore(svg, btn.firstChild);
    }
  }

  /** helper: create an SVG circle for the doughnut with dash geometry */
  _mkCircle(SVG_NS, r, arcLen, C, offset) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', '16');
    c.setAttribute('cy', '16');
    c.setAttribute('r', String(r));
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke-width', '2');
    c.setAttribute('stroke-dasharray', `${arcLen.toFixed(3)} ${(C - arcLen).toFixed(3)}`);
    c.setAttribute('stroke-dashoffset', offset.toFixed(3));
    return c;
  }

  /** map a window's client/app state → a theme-aware CSS color */
  _clientColor(w) {
    if (w.appState) {
      switch (w.appState) {
        case 'notification': return 'var(--info)';
        case 'success':      return 'var(--success)';
        case 'error':        return 'var(--error)';
        case 'warning':      return 'var(--warning)';
      }
    }
    return w.minimized ? 'var(--client-collapsed)' : 'var(--client-opened)';
  }

  /** render the single bar-slot widget (restricted: only one widget in the bar).
   *  It is clickable (→ expand into the widget popover) and draggable (→ drop on
   *  the desktop to float it, restoring its full layout). */
  _renderWidgetTray() {
    const slot = this._root.getElementById('widgetSlot');
    if (!slot) return;
    slot.innerHTML = '';
    const ids = widgetService.listContainer('bar');
    slot.classList.toggle('has-widget', ids.length > 0);
    if (!ids.length) return;
    const id = ids[0]; // restricted: only the first widget renders in the bar
    const w = document.createElement('tf-widget');
    w.setAttribute('data-id', id);
    w.setAttribute('data-container', 'bar');
    w.title = 'Click to expand · drag to desktop';
    // click → popover; drag (>4px) → widget drag to desktop. The click handler
    // stopPropagation so the dock's outside-click handler doesn't close it.
    let dragged = false;
    w.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragged) { dragged = false; return; } // a drag happened — suppress the click
      this._openWidgetPopover(id, w);
    });
    w.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.rz-handle')) return;
      dragged = false;
      const sx = e.clientX, sy = e.clientY;
      const move = (ev) => {
        if (!dragged && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 4) {
          dragged = true;
          w.classList.add('dragging');
          startWidgetDrag(id, 'bar');
        }
      };
      const up = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        w.classList.remove('dragging');
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    });
    slot.appendChild(w);
  }

  /** The whole dock bar is a drop target for a widget drag. While dragging over
   *  the bar, a thin accent insertion bar + the widget's bar-form preview is
   *  shown at the gap nearest the pointer (anywhere in the bar, not just one
   *  fixed slot). On drop, #widgetSlot is moved to that position and the widget
   *  is placed (restricted — replaces any existing bar widget). */
  _wireTrayDrop() {
    const dock = this._root.getElementById('dock-container');
    const slot = this._root.getElementById('widgetSlot');
    if (!dock || !slot) return;
    // a single insertion-preview element moved around the dock during a drag
    const preview = document.createElement('div');
    preview.className = 'bar-insert-preview';
    dock.appendChild(preview);

    const overDock = (x, y) => {
      const r = dock.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    // dock children that count as insertion anchors (exclude the slot + preview)
    const anchors = () => Array.from(dock.children).filter((c) => c !== slot && c !== preview);
    const insertionIndex = (x) => {
      const kids = anchors();
      for (let i = 0; i < kids.length; i++) {
        const r = kids[i].getBoundingClientRect();
        if (x < r.left + r.width / 2) return i;
      }
      return kids.length;
    };
    const placePreview = (x, id) => {
      // temporarily remove the preview so the insertion index is computed from
      // the UNSHIFTED dock items (accurate = final placement).
      preview.remove();
      const idx = insertionIndex(x);
      // build/refresh the preview content: thin accent bar + OUTLINE BOX (no
      // actual widget rendered) sized to this widget's natural bar-form width.
      let bar = preview.querySelector('.bar-insert-bar');
      if (!bar) {
        preview.innerHTML = '';
        bar = document.createElement('div');
        bar.className = 'bar-insert-bar';
        preview.appendChild(bar);
      }
      let outline = preview.querySelector('.bar-insert-outline');
      if (!outline) {
        outline = document.createElement('div');
        outline.className = 'bar-insert-outline';
        preview.appendChild(outline);
      }
      outline.style.width = widgetService.getBarWidth(id) + 'px';
      // re-insert the preview at the insertion index (in-flow, slides between items)
      const kids = anchors(); // excludes preview (just removed)
      const ref = kids[idx] || null;
      dock.insertBefore(preview, ref);
    };
    const hidePreview = () => { /* keep element, but CSS hides it without .bar-dragging */ };

    this._unsubDragMove = bus.on('widget.dragmove', ({ x, y, id }) => {
      if (overDock(x, y)) {
        dock.classList.add('bar-dragging');
        placePreview(x, id);
      } else {
        dock.classList.remove('bar-dragging');
      }
    });
    this._unsubDragEnd = bus.on('widget.dragend', ({ x, y, id, from }) => {
      const over = overDock(x, y);
      dock.classList.remove('bar-dragging');
      if (over) {
        // move the slot to the insertion index, then place the widget
        const idx = insertionIndex(x);
        const kids = anchors();
        const ref = kids[idx] || null;
        dock.insertBefore(slot, ref);
        if (from === 'palette') widgetService.addToContainer(id, 'bar');
        else if (from && from !== 'bar') widgetService.moveWidget(id, from, 'bar');
      }
    });
  }

  /** open the expanded-widget popover anchored above `anchorEl`. The popover has
   *  a settings button in the header that toggles an INLINE settings section
   *  beside the widget (same popover, not a separate popup). */
  _openWidgetPopover(id, anchorEl) {
    const pop = this._root.getElementById('widgetPopover');
    if (!pop) return;
    const def = widgetService.widgets[id];
    if (!def) return;
    // toggle: if the same widget is already open, close
    if (this._widgetPopId === id && pop.classList.contains('open')) {
      this._closeWidgetPopover();
      return;
    }
    // join the popup system: tell the shell to close other popovers (launcher,
    // quick settings, calendar, theme) — same as when those open.
    bus.emit('ui.popover', { which: 'widget', action: 'open' });
    pop.innerHTML = '';
    pop.classList.remove('with-settings');
    // header: title + settings toggle + close
    const head = document.createElement('div');
    head.className = 'wp-head';
    head.innerHTML = `<span class="wp-title">${def.name}</span><span class="wp-settings-btn" title="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span><span class="wp-close" title="Close">×</span>`;
    head.querySelector('.wp-close').addEventListener('click', () => this._closeWidgetPopover());
    head.querySelector('.wp-settings-btn').addEventListener('click', () => this._toggleWidgetPopoverSettings(id));
    pop.appendChild(head);
    // body: widget popup form + inline settings section (hidden by default)
    const body = document.createElement('div');
    body.className = 'wp-body';
    const widgetCol = document.createElement('div');
    widgetCol.className = 'wp-widget-col';
    const tf = document.createElement('tf-widget');
    tf.setAttribute('data-id', id);
    tf.setAttribute('data-container', 'popup');
    widgetCol.appendChild(tf);
    body.appendChild(widgetCol);
    const settingsCol = document.createElement('div');
    settingsCol.className = 'wp-settings-col';
    body.appendChild(settingsCol);
    pop.appendChild(body);
    const hint = document.createElement('div');
    hint.className = 'wp-hint';
    hint.textContent = 'drag the bar widget to the desktop to float it';
    pop.appendChild(hint);
    // anchor horizontally above the clicked widget
    const r = anchorEl.getBoundingClientRect();
    const dockR = this.getBoundingClientRect();
    const centerX = r.left + r.width / 2 - dockR.left;
    pop.style.left = centerX + 'px';
    pop.style.transform = 'translateX(-50%) translateY(8px) scale(0.96)';
    pop.classList.add('open');
    this._widgetPopId = id;
    requestAnimationFrame(() => { pop.style.transform = 'translateX(-50%) translateY(0) scale(1)'; });
  }

  /** toggle the inline settings section in the widget popover. When opened, the
   *  settings section appears BESIDE the widget (same popover widens) — NOT a
   *  separate popup. Uses the shared buildSettingsSection() for rendering. */
  _toggleWidgetPopoverSettings(id) {
    const pop = this._root.getElementById('widgetPopover');
    if (!pop) return;
    const settingsCol = pop.querySelector('.wp-settings-col');
    const settingsBtn = pop.querySelector('.wp-settings-btn');
    if (!settingsCol || !settingsBtn) return;
    if (pop.classList.contains('with-settings')) {
      // close settings section
      pop.classList.remove('with-settings');
      settingsBtn.classList.remove('active');
      settingsCol.innerHTML = '';
      return;
    }
    // open settings section: render common + widget-specific settings inline
    pop.classList.add('with-settings');
    settingsBtn.classList.add('active');
    settingsCol.innerHTML = '';
    const schema = widgetService.getSettingsSchema(id);
    const def = widgetService.widgets[id];
    const commonSchema = schema.filter((s) => s.group === 'common');
    if (commonSchema.length) settingsCol.appendChild(buildSettingsSection('Common', commonSchema, id));
    const uniqueSchema = schema.filter((s) => s.group !== 'common');
    if (uniqueSchema.length) settingsCol.appendChild(buildSettingsSection(def.name, uniqueSchema, id));
  }

  _closeWidgetPopover() {
    const pop = this._root.getElementById('widgetPopover');
    if (pop) pop.classList.remove('open');
    this._widgetPopId = null;
  }
  isWidgetPopoverOpen() { return !!this._widgetPopId; }

  /** Mark the .app-icon[data-app=appId] as .active; clear all others. */
  setActiveApp(appId) {
    if (!this._root) return;
    this._root.querySelectorAll('.app-icon[data-app]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.app === appId);
    });
  }
  clearActiveApp() {
    if (!this._root) return;
    this._root.querySelectorAll('.app-icon[data-app]').forEach((btn) => btn.classList.remove('active'));
  }

  disconnectedCallback() {
    if (this._outsideHandler) document.removeEventListener('click', this._outsideHandler);
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
    if (this._clockInterval) clearInterval(this._clockInterval);
    if (this._unsubTheme) this._unsubTheme();
    if (this._unsubDockConfig) this._unsubDockConfig();
    if (this._unsubQsVol) this._unsubQsVol();
    if (this._unsubLayout) this._unsubLayout();
    if (this._unsubWorkspaces) this._unsubWorkspaces();
    if (this._unsubWindowsForDots) this._unsubWindowsForDots();
    if (this._unsubClientIndicators) this._unsubClientIndicators();
    if (this._unsubClientIndicatorsTheme) this._unsubClientIndicatorsTheme();
    if (this._unsubClientIndicatorsWs) this._unsubClientIndicatorsWs();
  }
}

customElements.define('de-dock', DeDock);
export default DeDock;
