# Linux DE Concept — Wayland Shell

> **Source file**: `upload/LinuxDEConcept.html` (1974 lines, 11–802 CSS, 805–1973 body)
> **Title**: `caelestia · wayland shell`
> **Output kind**: Source extraction for use as a web component template.

---

## Overview

`LinuxDEConcept.html` is a single-file HTML mockup of a **Wayland shell / Linux desktop environment** (à la Wayfire/Caelestia/GNOME Shell). It runs entirely in the browser as a self-contained "desktop chrome" demo, with no real compositor backend — every window, popover, dock item, and widget is a styled DOM element driven by a small vanilla-JS controller.

### Visual concept
- **Dark, purple-accented, glassmorphic**: deep purple/indigo base (`#06040f` body bg, `#07051a → #120d2c → #080614` wallpaper gradient) with an accent token of `#b4a0ff` (light) / `#8b6fff` (strong) / `rgba(180,160,255,…)` glows.
- **Glassmorphism**: every chrome surface uses `backdrop-filter: blur(22–36px) saturate(180%)`, translucency via `rgba()` surfaces, and `1px` purple-tinted borders with `inset 0 1px 0 rgba(255,255,255,0.04)` hairline highlights.
- **Light theme** is a full alternate palette (warm purple `#6549e0` accent, inverted wallpaper, light surfaces) toggled by adding `body.light`.
- Typography: **Inter** for UI (300–700), **JetBrains Mono** for numerics/labels. Iconography via **Lucide** + brand logos from `cdn.simpleicons.org`.
- Motion: cubic-bezier `--ease: cubic-bezier(0.32,0.72,0,1)` and a softer variant; durations `0.13/0.20/0.30s`; popovers fade-scale in, dock rises on load, music widget slides down, calendar pane fades.

### Main UI regions
1. **Wallpaper** — layered radial + linear gradient backdrop (with optional `<img>` overlay driven by theme).
2. **Music widget** (`aside.music-widget`) — top-right pill: album art, track name, artist, animated progress bar.
3. **App window** (`div.window#appWindow`) — centered modal "empty workspace" placeholder that opens when an app icon is clicked.
4. **Start menu / Launcher popover** (`div.popover.start-menu#launcherPop`) — 680×560 panel with tabs: **Apps** (mosaic of grouped app icons), **Widgets** (clock / weather / system stats / top processes / now-playing), **Settings** (Looks & Feel / System / Network / Accounts panes; the Looks pane contains theme list, mode tabs, bar config grid).
5. **Quick settings popover** (`div.popover.qs-panel#qsPanel`) — Wi-Fi/BT/DND/Theme toggle tiles + volume + brightness sliders + battery footer.
6. **Calendar & weather popover** (`div.popover.cal-pop#calPop`) — split layout: left weather side, vertical year/month bar, right calendar grid with prev/next nav.
7. **Dock / shell bar** (`nav#dock-container`) — bottom-centered pill containing grouped bar items:
   - launcher button + AI capsule input + Files icon,
   - Firefox icon with SVG "indicator ring",
   - Office group (Writer/Calc/Impress),
   - Obsidian + Inkscape,
   - **Workspace widget** (layout indicator box, theme selector trigger + dark/light vertical toggle, 3×3 workspace dot grid),
   - stacked system-tray tile (Wi-Fi/volume/BT/battery — opens Quick Settings),
   - **status section** (cloud-sun weather icon, vertical divider, time/day/date stack — opens Calendar popover).

The dock supports "disconnected" and "in-box" states that change its surface treatment (controlled from Settings → Bar Configuration toggles).

---

## HTML Structure

The complete `<body>` inner HTML markup, reproduced verbatim from `upload/LinuxDEConcept.html` (lines 806–1308). The `<script>` block is intentionally omitted here and reproduced verbatim in the JS Logic section below — this markup is the template for a web component.

```html
<div class="desktop">
  <div class="wallpaper">
    <img id="wallpaperImg" src="" alt="" onerror="this.style.opacity='0'">
  </div>

  <aside class="music-widget">
    <div class="album-art">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    </div>
    <div class="music-info">
      <div class="track-name">Outro</div>
      <div class="artist-name">M83 — Hurry Up, We're Dreaming</div>
      <div class="progress-bar"><div class="progress-fill"></div></div>
    </div>
  </aside>

  <div class="window" id="appWindow" role="dialog" aria-modal="true">
    <div class="titlebar">
      <div class="title">
        <img id="winIcon" src="" alt="" style="display:none">
        <span id="winTitle">Application</span>
      </div>
      <div class="win-controls">
        <button class="win-ctrl min" aria-label="Minimize"></button>
        <button class="win-ctrl max" aria-label="Maximize"></button>
        <button class="win-ctrl close" id="closeWindow" aria-label="Close"></button>
      </div>
    </div>
    <div class="window-content">
      <div class="placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
        <span>empty workspace</span>
      </div>
    </div>
  </div>

  <!-- ═══ START MENU ═══ -->
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
        <div class="widgets-grid">
          <div class="widget widget-time">
            <div class="widget-head">Local Time</div>
            <div class="time-big" id="widgetTime">14:32</div>
            <div class="date-big" id="widgetDate">Thursday, 24 October</div>
          </div>
          <div class="widget widget-weather">
            <div class="widget-head">Weather</div>
            <div class="weather-body">
              <div class="weather-icon"><i data-lucide="cloud-sun"></i></div>
              <div class="weather-info">
                <div class="weather-temp">18°</div>
                <div class="weather-cond">Partly Cloudy</div>
                <div class="weather-loc">Reykjavík</div>
              </div>
            </div>
          </div>
          <div class="widget widget-stats">
            <div class="widget-head">System</div>
            <div class="stat-row"><span class="stat-label">CPU</span><div class="stat-bar"><div class="stat-fill" style="width: 24%"></div></div><span class="stat-val">24%</span></div>
            <div class="stat-row"><span class="stat-label">RAM</span><div class="stat-bar"><div class="stat-fill" style="width: 62%"></div></div><span class="stat-val">9.8G</span></div>
            <div class="stat-row"><span class="stat-label">DISK</span><div class="stat-bar"><div class="stat-fill" style="width: 41%"></div></div><span class="stat-val">205G</span></div>
          </div>
          <div class="widget widget-proc">
            <div class="widget-head">TopProcesses</div>
            <div class="proc-row"><span>firefox</span><span>12.4%</span></div>
            <div class="proc-row"><span>code</span><span>8.1%</span></div>
            <div class="proc-row"><span>node</span><span>4.2%</span></div>
            <div class="proc-row"><span>wayfire</span><span>2.1%</span></div>
          </div>
          <div class="widget widget-music">
            <div class="wm-art"></div>
            <div class="wm-info">
              <div class="wm-title">Outro</div>
              <div class="wm-artist">M83 — Hurry Up, We're Dreaming</div>
            </div>
            <div class="wm-controls">
              <button class="wm-btn"><i data-lucide="skip-back"></i></button>
              <button class="wm-btn play"><i data-lucide="play"></i></button>
              <button class="wm-btn"><i data-lucide="skip-forward"></i></button>
            </div>
          </div>
        </div>
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
  </div>

  <!-- ═══ QUICK SETTINGS ═══ -->
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
  </div>

  <!-- ═══ CALENDAR & WEATHER POPOVER ═══ -->
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
  </div>

  <!-- ═══ CUSTOM TASKBAR (DOCK CONTAINER) ═══ -->
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
        <svg class="app-indicator" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#ff5f56" stroke-width="2" stroke-linecap="butt" stroke-dasharray="17.991148575128552 69.97344572538566" stroke-dashoffset="0"></circle>
          <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="butt" stroke-dasharray="17.991148575128552 69.97344572538566" stroke-dashoffset="-21.991148575128552"></circle>
          <circle cx="16" cy="16" r="14" fill="none" stroke="#27c93f" stroke-width="2" stroke-linecap="butt" stroke-dasharray="17.991148575128552 69.97344572538566" stroke-dashoffset="-43.982297150257104"></circle>
          <circle cx="16" cy="16" r="14" fill="none" stroke="#2196f3" stroke-width="2" stroke-linecap="butt" stroke-dasharray="17.991148575128552 69.97344572538566" stroke-dashoffset="-65.97344572538566"></circle>
        </svg>
        <img src="https://cdn.simpleicons.org/firefox" alt="">
      </button>
    </div>
    
    <div class="separator"></div>
    
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
</div>
```

---

## CSS Section Index

Every selector group in `shell.css`, with a one-line description. Grouped by region in source order.

### Tokens
- `:root` — design tokens (accent colors, tints, text levels, surfaces, borders, radii, elevations, easings, durations, bar height, icon sizes, stroke width).
- `body.light` — light-mode overrides for accent / tint / text / surface / border tokens.

### Base / reset
- `*, *::before, *::after` — box-sizing + margin/padding reset.
- `html, body` — full-viewport, hidden overflow, Inter font, dark base background, font-smoothing.
- `body.light` — light base background.
- `button`, `input`, `img` — element resets (font/color/border inheritance, display block).
- `::selection` — purple-tint selection background.
- `.desktop` — fixed full-screen overflow-hidden container.

### Wallpaper
- `.wallpaper` — absolute full-cover layered radial/linear gradient backdrop with transition.
- `body.light .wallpaper` — light gradient palette.
- `.wallpaper img` — full-cover `<img>` overlay (theme wallpaper), opacity transitions.
- `.wallpaper::after` — pointer-none atmospheric overlay (radial vignettes + top/bottom darkening).
- `body.light .wallpaper::after` — light atmospheric overlay.

### Music widget (top-right pill)
- `.music-widget` — absolute top-right glass pill container, fadeDown entrance.
- `@keyframes fadeDown` — slide-from-above entrance.
- `.album-art` — 42×42 purple gradient square tile with inset highlight.
- `.album-art svg` — inner music-note icon sizing.
- `.music-info`, `.track-name`, `.artist-name` — flex column with ellipsis truncation.
- `.progress-bar`, `.progress-fill` — 2px track with linear-gradient fill that animates via `@keyframes progress` (214s loop, simulates a full song).

### Dock / shell bar
- `#dock-container` — absolute bottom-centered glass pill bar (height `--bar-h`), `barRise` entrance, multi-property transition (bg/border/shadow/backdrop/gap/padding).
- `@keyframes barRise` — translate-up + fade entrance for the dock.
- `#dock-container.disconnected` — transparent, borderless, shadowless state (no surface).
- `.separator` — vertical 1px gradient hairline divider between bar groups.
- `#dock-container.disconnected .separator` — hidden separator in disconnected state.
- `.bar-group` — flex wrapper for a logical cluster of bar items, with multi-prop transition.
- `#dock-container.disconnected.in-box .bar-group` — each group gets its own glass surface box (combo state).

### App icons
- `.app-icon` — 34×34 centered icon tile, hover tint, active-press scale, hover background.
- `.app-icon:hover`, `.app-icon:active` — tint + scale states.
- `.app-icon img, .app-icon svg:not(.app-indicator):not([data-lucide])` — sized icon content.
- `.app-icon[data-lucide] i, .app-icon[data-lucide] svg` — Lucide-icon variant sizing.
- `.app-icon.active` — tinted active state.
- `.app-indicator` — absolutely positioned SVG ring overlay (Firefox indicator).
- `.office-group`, `.office-group .app-icon`, `.office-group .app-icon img` — bundled small-icon cluster for office apps.

### AI capsule input
- `.capsule-input-wrapper` — pill-shaped input capsule with tinted background, focus-within border accent.
- `.capsule-input-wrapper svg` — bot icon.
- `.capsule-input-wrapper input`, `… input::placeholder` — transparent input + placeholder color.

### Workspace widget
- `.workspace-widget` — flex container holding layout/theme/dots.
- `.layout-box` — 22×22 bordered tiling-icon button with hover accent border.
- `.mini-win-container`, `.mini-float`, `.mini-stack` — inner mini-windows preview (row vs column layout).
- `.m-win`, `.m-win.solid` — single mini-window cell; `.solid` is the accent-colored "active" window.
- `.theme-widget`, `.theme-dock-controls` — wrapper for theme trigger + dark/light toggle.
- `.theme-trigger-btn` — 22×22 grid-of-4-dots swatch button (hover scale).
- `.color-dot` — single color swatch inside the trigger / theme previews.
- `.custom-toggle`, `.custom-toggle.active`, `.custom-toggle-thumb` — vertical 16×28 toggle switch (top/bottom thumb travel).
- `.custom-toggle-thumb i, .custom-toggle-thumb svg` — inner mode icon (moon/sun).
- `.theme-popup-menu`, `.theme-popup-menu.open` — anchored 200px popup above the trigger (bottom-centered origin).
- `.theme-item`, `.theme-item:hover`, `.theme-item.active` — popup list entry (swatch + name).
- `.color-plate-preview`, `.dots-grid`, `.font-info-text`, `.theme-separator`, `.theme-short-name` — sub-elements inside theme items.
- `.ws-dots`, `.ws-dot`, `.ws-dot:hover`, `.ws-dot.active` — 3×3 grid of 5px workspace indicator dots.

### Stacked system tray
- `.sys-tray-stacked`, `body.light .sys-tray-stacked`, hover states — 2×2 grid tile for Wi-Fi/volume/BT/battery icons (also acts as Quick Settings trigger).

### Status section (globe)
- `.status-section`, `body.light .status-section`, hover states — pill containing weather icon, vertical separator, and time/day/date stack (also acts as Calendar trigger).
- `.weather-icon-only` — accent-light cloud-sun icon.
- `.vertical-separator` — 1px×24 hairline divider.
- `.date-time`, `.time`, `.day`, `.date` — stacked numeric time display.

### Tooltips
- `[data-tip]`, `[data-tip]::before`, `[data-tip]:hover::before` — CSS-only hover tooltip with delayed opacity/transform transition.

### Window (modal placeholder)
- `.window`, `.window.open` — centered 720×460 modal with opacity/scale transition; `.open` shows it.
- `.titlebar`, `.titlebar .title`, `.titlebar .title img/svg` — top bar with icon + title text.
- `.win-controls`, `.win-ctrl`, `.win-ctrl:hover` — three macOS-style window control dots.
- `.win-ctrl.close/.min/.max` — red/yellow/green dots.
- `.window-content`, `.window-content .placeholder`, `.placeholder svg/span` — empty-workspace placeholder content.

### Popover base
- `.popover`, `.popover.open` — shared glass popover surface with fade + translateY+scale entrance; bottom-center transform origin.
- `.section-title` — small uppercase tracked section label.

### Start menu
- `.start-menu` — 680×560 popover shell.
- `.start-header` — top bar with tabs and search box.
- `.start-tabs`, `.start-tab`, `.start-tab:hover`, `.start-tab.active`, `.start-tab svg` — Apps/Widgets/Settings tab buttons.
- `.start-header .search-box`, `.search-box`, `.search-box:focus-within`, `.search-box svg`, `.search-box input`, `… input::placeholder` — search capsule (reused elsewhere).
- `.start-body`, `.start-pane`, `.start-pane.active`, `@keyframes fadeIn` — scrollable body with pane-switching + fade-in.
- `.app-groups-container` — 6-column mosaic grid.
- `.app-group`, `.app-group.span-2`, `.app-group.span-3`, `.app-group-title`, `.app-group-items`, `.app-group-items.layout-sq2/.layout-h3/.layout-v2` — group cells with span variants + inner layout modes.
- `.app-item`, `.app-item:hover`, `.app-item img/svg`, `.app-item span` — 2×2 square app tile.
- `.app-item-list`, hover, img/svg, span — horizontal list-style app tile.
- `.start-footer` — bottom row with user button + power button.
- `.start-user-btn`, `body.light …`, `:hover`, `.start-user-btn img` — user pill button.
- `.start-user-info`, `.start-user-name`, `.start-user-sub` — user name + subtitle.
- `.start-power`, `:hover`, `.start-power svg` — power icon button.

### Settings pane
- `.settings-layout`, `.settings-nav`, `.settings-tab`, `:hover`, `.active`, `.settings-tab svg` — sidebar nav + content area.
- `.settings-content`, `.settings-pane`, `.settings-pane.active` — scrollable panes with fadeIn.
- `.settings-box`, `.settings-box-title` — tinted content card with title.
- `.theme-settings-layout`, `.installed-themes-list`, `.settings-theme-item`, `:hover`, `.active`, `.settings-theme-item .color-plate-preview`, `.settings-theme-item .theme-short-name` — theme picker sidebar (within Looks pane).
- `.theme-config` — right side of theme picker.
- `.theme-wallpaper` — preview image of the theme wallpaper.
- `.mode-tabs`, `.mode-tab`, `.mode-tab.active`, `.mode-tab svg` — Dark/Light mode switch.
- `.mode-content`, `.mode-content.active` — per-mode config pane.
- `.config-row`, `:last-child` — label/value row with bottom hairline.
- `.config-label`, `.config-value`, `.config-value svg` — row label and value text.
- `.palette-display`, `.palette-color` — small swatch row for theme palette preview.

### Bar settings config (inside Looks pane)
- `.bar-side-tabs`, `.bar-side-tab`, `.bar-side-tab.active` — Top/Bottom/Left/Right selector.
- `.bar-config-grid` — 2-column grid of config groups.
- `.config-group`, `.config-group-title` — tinted config card with title.
- `.mini-slider`, `.mini-slider-fill`, `.mini-slider-thumb` — small horizontal slider for dimensions/separation.
- `.mini-val` — small numeric value label.
- `.settings-toggle`, `.settings-toggle.active`, `.settings-toggle-thumb` — horizontal 32×18 toggle switch.
- `.config-row-check`, `.config-row-check.active`, `.config-row-check svg` — checkable row with check icon.

### Widgets pane (Widgets tab)
- `.widgets-grid` — 2-column widget grid.
- `.widget`, `.widget-head` — tinted widget card with title.
- `.widget-time`, `.time-big`, `.date-big` — clock widget.
- `.widget-weather`, `.weather-body`, `.weather-icon`, `.weather-temp`, `.weather-cond`, `.weather-loc` — weather widget.
- `.widget-stats`, `.stat-row`, `.stat-label`, `.stat-bar`, `.stat-fill`, `.stat-val` — CPU/RAM/DISK bars.
- `.widget-proc`, `.proc-row`, `.widget-proc .proc-row:last-child`, `.proc-row span` — top-processes list.
- `.widget-music`, `.wm-art`, `.wm-info`, `.wm-title`, `.wm-artist`, `.wm-controls`, `.wm-btn`, `.wm-btn:hover`, `.wm-btn.play`, `.wm-btn svg` — wide now-playing widget with prev/play/next.

### Quick settings popover
- `.qs-panel` — 300px-wide popover.
- `.qs-header`, `.qs-date`, `.qs-settings-btn`, `:hover`, `.qs-settings-btn svg` — header with date + settings button.
- `.qs-tiles`, `.qs-tile`, `:hover`, `.active`, `.qs-tile-icon`, `.qs-tile.active .qs-tile-icon`, `.qs-tile-icon svg` — toggle tiles grid.
- `.qs-tile-body`, `.qs-tile-label`, `.qs-tile.active .qs-tile-label`, `.qs-tile-sub`, `.qs-tile.active .qs-tile-sub` — tile label + sub-label.
- `.qs-sliders`, `.slider-row`, `:hover`, `.slider-icon`, `:hover`, `.slider-icon svg` — slider rows.
- `.slider`, `.slider-fill`, `.slider-thumb`, `.slider:hover .slider-thumb`, `.slider-value` — main slider control with gradient fill + glow thumb.
- `.qs-footer`, `.qs-battery`, `.qs-battery svg`, `.qs-battery-time` — footer with battery info + power button.

### Calendar & weather popover
- `.cal-pop` — 460px-wide split popover.
- `.cal-split-layout` — horizontal flex of weather side, vertical bar, calendar side.
- `.cal-weather-side`, `.weather-icon-lg`, `.weather-icon-lg svg`, `.cw-temp`, `.cw-cond`, `.cw-loc` — left weather column.
- `.cal-vertical-bar`, `.vbar-sep` — middle vertical text bar (year digits + month initials).
- `.cal-cal-side`, `.cal-header`, `.cal-month`, `.cal-nav`, `.cal-nav-btn`, `:hover`, `.cal-nav-btn svg` — right calendar column with month + nav.
- `.cal-grid` — 7-column day grid.
- `.cal-day-head` — weekday header cell.
- `.cal-day`, `:hover:not(.empty)`, `.cal-day.other`, `.cal-day.today`, `.cal-day.empty` — day cells with states.

### Scrollbar & responsive
- `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-thumb:hover` — thin custom scrollbar.
- `@media (max-width: 1100px)` — shrink capsule input + dock padding.
- `@media (max-width: 900px)` — hide capsule, narrow music widget.
- `@media (max-width: 780px)` — hide office group + music widget; collapse settings nav to horizontal scroll.
- `@media (max-width: 640px)` — hide workspace widget, day/date in status; collapse theme settings; single-column bar config.
- `@media (max-width: 540px)` — full-width dock; single-column widgets.
- `@media (prefers-reduced-motion: reduce)` — force all animations/transitions to ~0ms.

---

## JS Logic

The complete `<script>` block, reproduced verbatim from `upload/LinuxDEConcept.html` (lines 1310–1973).

```javascript
<script>
document.addEventListener('DOMContentLoaded', () => {
  const initIcons = () => { if (window.lucide) lucide.createIcons(); };
  initIcons();

  // Theme Data Model
  const themes = {
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
  let currentTheme = 'Midnight';

  function updateWallpaper() {
    const isLight = document.body.classList.contains('light');
    const theme = themes[currentTheme];
    const url = theme ? (isLight ? theme.light.url : theme.dark.url) : null;
    const img = document.getElementById('wallpaperImg');
    
    if (url) {
      const tempImg = new Image();
      tempImg.onload = () => {
        img.src = url;
        img.style.opacity = '0.85';
      };
      tempImg.src = url;
    } else {
      img.style.opacity = '0';
    }
  }

  function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    currentTheme = themeName;
    
    const isLight = document.body.classList.contains('light');
    const modeData = isLight ? theme.light : theme.dark;

    // Update Accent
    document.documentElement.style.setProperty('--accent-strong', theme.accent);
    const rgb = hexToRgb(theme.accent);
    if (rgb) {
      document.documentElement.style.setProperty('--accent', `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      document.documentElement.style.setProperty('--accent-light', `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
      document.documentElement.style.setProperty('--accent-glow', `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    }

    // Update Taskbar Trigger
    const trigger = document.getElementById('themeTriggerBtn');
    trigger.innerHTML = '';
    trigger.style.backgroundColor = modeData.bg;
    modeData.dots.forEach(c => {
      const dot = document.createElement('div');
      dot.className = 'color-dot';
      dot.style.backgroundColor = c;
      trigger.appendChild(dot);
    });

    // Update Taskbar Popup
    const popup = document.getElementById('themePopupMenu');
    popup.innerHTML = '';
    Object.keys(themes).forEach(name => {
      const t = themes[name];
      const tMode = isLight ? t.light : t.dark;
      const item = document.createElement('div');
      item.className = 'theme-item' + (name === themeName ? ' active' : '');
      item.dataset.name = name;
      item.dataset.color = t.accent;
      item.innerHTML = `
        <div class="color-plate-preview" style="background-color: ${tMode.bg};">
          <div class="dots-grid">
            ${tMode.dots.map(d => `<div class="color-dot" style="background-color: ${d};"></div>`).join('')}
          </div>
        </div>
        <div class="font-info-text">SE 14</div>
        <div class="theme-separator"></div>
        <div class="theme-short-name">${name}</div>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        applyTheme(name);
        popup.classList.remove('open');
      });
      popup.appendChild(item);
    });

    // Update Settings List
    const settingsList = document.getElementById('settingsThemeList');
    if (settingsList) {
      settingsList.innerHTML = '';
      Object.keys(themes).forEach(name => {
        const t = themes[name];
        const tMode = isLight ? t.light : t.dark;
        const item = document.createElement('div');
        item.className = 'settings-theme-item' + (name === themeName ? ' active' : '');
        item.dataset.theme = name;
        item.innerHTML = `
          <div class="color-plate-preview" style="background-color: ${tMode.bg};">
            <div class="dots-grid">
              ${tMode.dots.map(d => `<div class="color-dot" style="background-color: ${d};"></div>`).join('')}
            </div>
          </div>
          <span class="theme-short-name">${name}</span>
        `;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          // Selecting a theme in settings should NOT change the actual active theme
          document.querySelectorAll('.settings-theme-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          updateThemeConfigValues(name);
        });
        settingsList.appendChild(item);
      });
    }

    updateThemeConfigValues(themeName);
    updateWallpaper();
  }

  function updateThemeConfigValues(themeName) {
    const configArea = document.getElementById('themeConfigArea');
    if (!configArea) return;
    const theme = themes[themeName];
    const isLight = document.body.classList.contains('light');
    
    configArea.innerHTML = `
      <div class="mode-tabs">
        <button class="mode-tab ${!isLight ? 'active' : ''}" data-mode="dark"><i data-lucide="moon"></i> Dark</button>
        <button class="mode-tab ${isLight ? 'active' : ''}" data-mode="light"><i data-lucide="sun"></i> Light</button>
      </div>
      <div class="mode-content ${!isLight ? 'active' : ''}" id="mode-content-dark">
        ${generateModeContent(theme.dark)}
      </div>
      <div class="mode-content ${isLight ? 'active' : ''}" id="mode-content-light">
        ${generateModeContent(theme.light)}
      </div>
    `;
    
    configArea.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        configArea.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        configArea.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
        configArea.querySelector('#mode-content-' + mode).classList.add('active');
      });
    });
    
    initIcons();
  }
  
  function generateModeContent(modeData) {
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
            ${modeData.dots.map(d => `<div class="palette-color" style="background-color: ${d};"></div>`).join('')}
          </div>
        </span>
      </div>
    `;
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Initialize Theme
  applyTheme('Midnight');

  /* ═══ CLOCK & DATES ═══ */
  const timeEl = document.getElementById('time');
  const dayEl = document.getElementById('day');
  const dateEl = document.getElementById('date');
  const qsDateEl = document.getElementById('qsDate');
  const wTime = document.getElementById('widgetTime');
  const wDate = document.getElementById('widgetDate');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const daysLong = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthsLong = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    if (timeEl) timeEl.textContent = `${h}:${m}`;
    if (dayEl) dayEl.textContent = days[now.getDay()];
    if (dateEl) dateEl.textContent = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()}`;
    if (qsDateEl) qsDateEl.textContent = `${daysLong[now.getDay()]}, ${now.getDate()} ${monthsLong[now.getMonth()]}`;
    if (wTime) wTime.textContent = `${h}:${m}`;
    if (wDate) wDate.textContent = `${daysLong[now.getDay()]}, ${now.getDate()} ${monthsLong[now.getMonth()]}`;
  }
  updateClock();
  setInterval(updateClock, 5000);

  /* ═══ APP WINDOW ═══ */
  const appInfo = {
    firefox:  { name: 'Firefox — New Window',           icon: 'https://cdn.simpleicons.org/firefox' },
    code:     { name: 'Visual Studio Code',             icon: 'https://cdn.simpleicons.org/vscode' },
    terminal: { name: 'Terminal — zsh',                 icon: null },
    files:    { name: 'Files — Home',                   icon: null },
    discord:  { name: 'Discord',                        icon: 'https://cdn.simpleicons.org/discord' },
    spotify:  { name: 'Spotify',                        icon: 'https://cdn.simpleicons.org/spotify' },
    gimp:     { name: 'GNU Image Manipulation Program', icon: 'https://cdn.simpleicons.org/gimp' },
    writer:   { name: 'LibreOffice Writer',             icon: 'https://cdn.simpleicons.org/libreofficewriter' },
    calc:     { name: 'LibreOffice Calc',               icon: 'https://cdn.simpleicons.org/libreofficecalc' },
    impress:  { name: 'LibreOffice Impress',            icon: 'https://cdn.simpleicons.org/libreofficeimpress' },
    obsidian: { name: 'Obsidian Vault',                 icon: 'https://cdn.simpleicons.org/obsidian' },
    inkscape: { name: 'Inkscape',                       icon: 'https://cdn.simpleicons.org/inkscape' },
    settings: { name: 'Settings',                       icon: null },
    slack:    { name: 'Slack',                          icon: 'https://cdn.simpleicons.org/slack' },
    telegram: { name: 'Telegram',                       icon: 'https://cdn.simpleicons.org/telegram' },
    docker:   { name: 'Docker Desktop',                 icon: 'https://cdn.simpleicons.org/docker' },
    github:   { name: 'GitHub Desktop',                 icon: 'https://cdn.simpleicons.org/github' },
    blender:  { name: 'Blender',                        icon: 'https://cdn.simpleicons.org/blender' },
    figma:    { name: 'Figma',                          icon: 'https://cdn.simpleicons.org/figma' },
    obs:      { name: 'OBS Studio',                     icon: 'https://cdn.simpleicons.org/obsstudio' },
    vlc:      { name: 'VLC Media Player',               icon: 'https://cdn.simpleicons.org/vlc' },
    notion:   { name: 'Notion',                         icon: 'https://cdn.simpleicons.org/notion' },
    calc_app: { name: 'Calculator',                     icon: null },
    text_editor: { name: 'Text Editor',                 icon: null }
  };

  const appWindow = document.getElementById('appWindow');
  const winTitle = document.getElementById('winTitle');
  const winIcon = document.getElementById('winIcon');

  function openApp(appId) {
    const info = appInfo[appId] || { name: appId.charAt(0).toUpperCase() + appId.slice(1), icon: null };
    winTitle.textContent = info.name;
    if (info.icon) {
      winIcon.src = info.icon;
      winIcon.style.display = '';
      winIcon.onerror = () => { winIcon.style.display = 'none'; };
    } else {
      winIcon.style.display = 'none';
    }
    appWindow.classList.add('open');
    document.querySelectorAll('.app-icon').forEach(btn => {
      if (btn.dataset.app) {
        btn.classList.remove('active');
        if (btn.dataset.app === appId) btn.classList.add('active');
      }
    });
  }
  function closeWindow() {
    appWindow.classList.remove('open');
    document.querySelectorAll('.app-icon').forEach(btn => btn.classList.remove('active'));
  }
  document.getElementById('closeWindow').addEventListener('click', closeWindow);
  document.querySelectorAll('.app-icon[data-app]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.classList.contains('active')) closeWindow();
      else openApp(btn.dataset.app);
    });
  });

  /* ═══ POPOVER SYSTEM ═══ */
  const triggers = {
    launcher: document.getElementById('launcherBtn'),
    qs:       document.getElementById('quickSettingsBtn'),
    cal:      document.getElementById('globeBtn')
  };
  const panels = {
    launcher: document.getElementById('launcherPop'),
    qs:       document.getElementById('qsPanel'),
    cal:      document.getElementById('calPop')
  };
  let activeName = null;

  function closeAll() {
    Object.values(panels).forEach(p => p.classList.remove('open'));
    Object.values(triggers).flat().forEach(t => t.classList.remove('active'));
    document.getElementById('themePopupMenu').classList.remove('open');
    activeName = null;
  }

  function positionPanel(name, trigger) {
    const panel = panels[name];
    const tr = trigger.getBoundingClientRect();
    const pr = panel.getBoundingClientRect();
    let left = tr.left + tr.width / 2 - pr.width / 2;
    left = Math.max(10, Math.min(left, window.innerWidth - pr.width - 10));
    panel.style.left = left + 'px';
    panel.style.bottom = (window.innerHeight - tr.top + 10) + 'px';
    panel.style.right = 'auto';
    panel.style.top = 'auto';
  }

  function toggle(name, trigger) {
    const wasOpen = panels[name].classList.contains('open');
    closeAll();
    if (!wasOpen) {
      panels[name].classList.add('open');
      trigger.classList.add('active');
      activeName = name;
      requestAnimationFrame(() => positionPanel(name, trigger));
    }
  }

  triggers.launcher.addEventListener('click', e => { e.stopPropagation(); toggle('launcher', triggers.launcher); });
  triggers.cal.addEventListener('click',      e => { e.stopPropagation(); toggle('cal', triggers.cal); });
  triggers.qs.addEventListener('click',       e => { e.stopPropagation(); toggle('qs', triggers.qs); });

  Object.values(panels).forEach(p => p.addEventListener('click', e => e.stopPropagation()));
  document.addEventListener('click', () => { if (activeName) closeAll(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (activeName) closeAll();
      else if (appWindow.classList.contains('open')) closeWindow();
    }
  });

  window.addEventListener('resize', () => {
    if (activeName) {
      const trigger = Array.isArray(triggers[activeName]) ? triggers[activeName][0] : triggers[activeName];
      positionPanel(activeName, trigger);
    }
  });

  /* ═══ START MENU TABS ═══ */
  document.querySelectorAll('.start-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.start-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const target = tab.dataset.tab;
      document.querySelectorAll('.start-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('pane-' + target).classList.add('active');
    });
  });

  /* ═══ SETTINGS TABS ═══ */
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.settingsTab;
      document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('settings-pane-' + target).classList.add('active');
    });
  });

  // Bar Side Tabs
  document.querySelectorAll('.bar-side-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.bar-side-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
  });

  // Config Row Checkboxes
  document.querySelectorAll('.config-row-check').forEach(row => {
    row.addEventListener('click', () => {
        row.classList.toggle('active');
    });
  });

  // Settings Toggles
  document.querySelectorAll('.settings-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle.classList.toggle('active');
        
        const dock = document.getElementById('dock-container');
        // Bar Connection Toggle Logic
        if (toggle.id === 'toggleBarConnection') {
            if (toggle.classList.contains('active')) {
                dock.classList.remove('disconnected');
            } else {
                dock.classList.add('disconnected');
            }
        }
        
        // Bar In Box Toggle Logic
        if (toggle.id === 'toggleBarInBox') {
            if (toggle.classList.contains('active')) {
                dock.classList.add('in-box');
            } else {
                dock.classList.remove('in-box');
            }
        }
    });
  });

  // Bar Separation Slider
  const barSepSlider = makeSlider(
    document.getElementById('barSeparationSlider'),
    document.getElementById('barSeparationFill'),
    document.getElementById('barSeparationThumb'),
    document.getElementById('barSeparationVal'),
    30,
    (v) => {
      const px = Math.round(v / 100 * 20); // 0 to 20px
      document.getElementById('barSeparationVal').textContent = `${px}px`;
      const dock = document.getElementById('dock-container');
      dock.style.gap = `${px}px`;
    }
  );

  /* ═══ LAUNCHER SEARCH ═══ */
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    // Only search in apps pane
    document.querySelectorAll('#pane-apps .app-group').forEach(group => {
      let visibleCount = 0;
      group.querySelectorAll('.app-item').forEach(item => {
        const match = item.dataset.name.toLowerCase().includes(q);
        item.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      group.style.display = visibleCount > 0 ? '' : 'none';
    });
  });
  searchInput.addEventListener('click', e => e.stopPropagation());
  document.querySelectorAll('.app-item[data-app]').forEach(item => {
    item.addEventListener('click', () => {
      openApp(item.dataset.app);
      closeAll();
      searchInput.value = '';
      document.querySelectorAll('.app-item').forEach(i => i.style.display = '');
      document.querySelectorAll('.app-group').forEach(g => g.style.display = '');
    });
  });

  /* ═══ LAYOUT INDICATOR ═══ */
  const layoutBox = document.getElementById('layout-indicator');
  const miniWinContainer = document.getElementById('miniWinContainer');
  let isFloat = true;
  
  layoutBox.addEventListener('click', (e) => {
    e.stopPropagation();
    isFloat = !isFloat;
    if (isFloat) {
      miniWinContainer.className = 'mini-win-container mini-float';
      layoutBox.setAttribute('data-tip', 'Layout: Float');
    } else {
      miniWinContainer.className = 'mini-win-container mini-stack';
      layoutBox.setAttribute('data-tip', 'Layout: Stack');
    }
  });

  /* ═══ THEME SELECTOR ═══ */
  const themeTrigger = document.getElementById('themeTriggerBtn');
  const themePopup = document.getElementById('themePopupMenu');
  
  themeTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    themePopup.classList.toggle('open');
  });
  
  themePopup.addEventListener('click', (e) => e.stopPropagation());

  /* ═══ LIGHT/DARK TOGGLE ═══ */
  const customToggle = document.getElementById('customToggle');
  const toggleIcon = document.getElementById('toggleIcon');
  
  customToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    customToggle.classList.toggle('active');
    
    if (customToggle.classList.contains('active')) {
      document.body.classList.add('light');
      customToggle.setAttribute('data-tip', 'Light Mode');
      toggleIcon.setAttribute('data-lucide', 'sun');
    } else {
      document.body.classList.remove('light');
      customToggle.setAttribute('data-tip', 'Dark Mode');
      toggleIcon.setAttribute('data-lucide', 'moon');
    }
    initIcons();
    applyTheme(currentTheme); // Re-apply theme to update colors/wallpaper
  });

  /* ═══ WORKSPACE DOTS ═══ */
  document.querySelectorAll('.ws-dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.ws-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });

  /* ═══ QS TOGGLES ═══ */
  document.querySelectorAll('.qs-tile').forEach(tile => {
    tile.addEventListener('click', e => {
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

  /* ═══ SLIDERS ═══ */
  function makeSlider(sliderEl, fillEl, thumbEl, valueEl, initial, onChange) {
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
    sliderEl.addEventListener('mousedown', e => { dragging = true; fromEvent(e.clientX); e.preventDefault(); });
    sliderEl.addEventListener('touchstart', e => { dragging = true; fromEvent(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mousemove', e => { if (dragging) fromEvent(e.clientX); });
    document.addEventListener('touchmove', e => { if (dragging) fromEvent(e.touches[0].clientX); }, { passive: true });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.addEventListener('touchend', () => { dragging = false; });
    return { setVal, getVal: () => value };
  }

  const volSlider = makeSlider(
    document.getElementById('volSlider'),
    document.getElementById('volFill'),
    document.getElementById('volThumb'),
    document.getElementById('volValue'),
    60,
    (v) => {
      const stackedBtn = document.getElementById('quickSettingsBtn');
      stackedBtn.setAttribute('data-tip', `Volume · ${v}%`);
      const muteIcon = document.getElementById('muteBtn').querySelector('i, svg');
      const trayIcon = stackedBtn.querySelector('i[data-lucide="volume-2"], i[data-lucide="volume-1"], i[data-lucide="volume-x"]');
      const name = v === 0 ? 'volume-x' : (v < 35 ? 'volume-1' : 'volume-2');
      if (window.lucide) {
        if (muteIcon) { const n = document.createElement('i'); n.setAttribute('data-lucide', name); muteIcon.replaceWith(n); }
        if (trayIcon) { const n = document.createElement('i'); n.setAttribute('data-lucide', name); trayIcon.replaceWith(n); }
        lucide.createIcons();
      }
    }
  );

  const brightSlider = makeSlider(
    document.getElementById('brightSlider'),
    document.getElementById('brightFill'),
    document.getElementById('brightThumb'),
    document.getElementById('brightValue'),
    82, null
  );

  let lastVol = 60;
  document.getElementById('muteBtn').addEventListener('click', e => {
    e.stopPropagation();
    const cur = volSlider.getVal();
    if (cur > 0) { lastVol = cur; volSlider.setVal(0); }
    else { volSlider.setVal(lastVol || 60); }
  });

  /* ═══ CALENDAR ═══ */
  let calDate = new Date();
  function renderCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    document.getElementById('calMonth').textContent = `${monthsLong[month]} ${year}`;
    
    // Vertical bar text
    const vbar = document.getElementById('calVerticalBar');
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
    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    ['S','M','T','W','T','F','S'].forEach(d => {
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
  renderCalendar();
  document.getElementById('calPrev').addEventListener('click', e => { e.stopPropagation(); calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
  document.getElementById('calNext').addEventListener('click', e => { e.stopPropagation(); calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });

  setTimeout(initIcons, 50);
});
</script>
```

---

## JS Logic Summary

### Constants & state
- `themes` — data model with three theme entries (`Midnight`, `Cyberpunk`, `Sunny`), each with `dark`/`light` mode data (wallpaper URL, bg/text colors, accent dots array) plus an `accent` hex.
- `currentTheme` — string key of the active theme (`'Midnight'` initially).
- `appInfo` — map of `appId → { name, icon }` for window titles + icons (firefox, code, terminal, files, discord, spotify, …, text_editor).
- `triggers` / `panels` — DOM references for the three popovers (`launcher`, `qs`, `cal`) and their trigger buttons.
- `activeName` — name of the currently-open popover (or `null`).
- `isFloat` — workspace layout indicator state (true = float, false = stack).
- `calDate` — `Date` instance driving the calendar view.
- `lastVol` — last non-zero volume value (for mute/unmute restore).
- Days/months arrays (`days`, `daysLong`, `months`, `monthsLong`) for clock + calendar rendering.

### Functions
- `initIcons()` — call `lucide.createIcons()` (re-renders any newly-injected `<i data-lucide>` elements).
- `updateWallpaper()` — load the current theme's wallpaper image (light/dark) into `#wallpaperImg` with opacity fade-in, or hide if no URL.
- `applyTheme(themeName)` — set `--accent-*` CSS vars from `theme.accent` (via `hexToRgb`), populate the dock trigger button swatch, render the theme popup menu items, populate the Settings theme list, then call `updateThemeConfigValues` and `updateWallpaper`.
- `updateThemeConfigValues(themeName)` — render the Settings → Looks → theme config area: mode tabs (Dark/Light) + per-mode content with wallpaper preview, font info, base color palette, accent palette dots; wires up mode-tab switching.
- `generateModeContent(modeData)` — template-string generator for one mode's config rows.
- `hexToRgb(hex)` — regex hex-to-RGB conversion (returns `{r,g,b}` or `null`).
- `updateClock()` — refresh `#time`, `#day`, `#date`, `#qsDate`, `#widgetTime`, `#widgetDate` from `new Date()`; called every 5s via `setInterval`.
- `openApp(appId)` — set `#winTitle`/`#winIcon` from `appInfo`, add `.open` to `#appWindow`, mark matching `.app-icon[data-app]` as active (and clear others).
- `closeWindow()` — remove `.open` from window, clear all `.active` states on app icons.
- `closeAll()` — close every popover panel + theme popup, clear trigger `active` state, set `activeName = null`.
- `positionPanel(name, trigger)` — compute centered-above-trigger left/bottom placement clamped to viewport width.
- `toggle(name, trigger)` — close-all then re-open `name`'s panel (or just close if already open); calls `positionPanel` via `requestAnimationFrame`.
- `makeSlider(sliderEl, fillEl, thumbEl, valueEl, initial, onChange)` — factory returning `{setVal, getVal}`; wires mousedown/touchstart → mousemove/touchmove → mouseup/touchend drag behavior, clamps 0–100, updates fill width + thumb left position + aria-valuenow + value text, and fires `onChange`.
- `renderCalendar()` — render `#calMonth`, the `#calVerticalBar` (year digits + separator + month initials), weekday header row, leading empty cells, and per-day `<button class="cal-day">` cells (with `.today` for current month's today).

### Event listeners
- `triggers.launcher / .qs / .cal` `click` — toggle the corresponding popover (stopPropagation).
- `document` `click` — close all popovers if one is open (outside-click).
- `document` `keydown` `Escape` — close popovers; if none open, close the app window.
- `window` `resize` — re-position the active popover.
- Each panel `click` — stopPropagation (so inside-panel clicks don't close it).
- `#closeWindow` `click` — `closeWindow()`.
- Each `.app-icon[data-app]` `click` — toggle: if already active, close; else `openApp`.
- Each `.app-item[data-app]` (inside launcher) `click` — `openApp`, `closeAll`, reset search input + restore all hidden items/groups.
- Each `.start-tab` `click` — switch active tab + visible `.start-pane` (apps/widgets/settings).
- Each `.settings-tab` `click` — switch active settings nav + visible `.settings-pane`.
- Each `.bar-side-tab` `click` — toggle active side tab.
- Each `.config-row-check` `click` — toggle its `active` class.
- Each `.settings-toggle` `click` — toggle active; if `#toggleBarConnection`, toggle dock `disconnected` class; if `#toggleBarInBox`, toggle dock `in-box` class.
- `#barSeparationSlider` (via `makeSlider`) — `onChange` computes px (0–20) and sets `#dock-container` `gap` inline.
- `#searchInput` `input` — case-insensitive filter of `.app-item` inside `#pane-apps` by `data-name`; hides empty groups.
- `#searchInput` `click` — stopPropagation.
- `#layout-indicator` `click` — toggle `isFloat`, swap `mini-win-container` class between `mini-float`/`mini-stack`, update `data-tip` accordingly.
- `#themeTriggerBtn` `click` — toggle `#themePopupMenu.open`.
- `#themePopupMenu` `click` — stopPropagation.
- Each `.theme-item` (popup) `click` — `applyTheme(name)`, close popup.
- Each `.settings-theme-item` `click` — set active selection in settings list (does NOT change the actual theme) + `updateThemeConfigValues(name)`.
- `#customToggle` `click` — toggle light class on `body`, update `data-tip` (Light/Dark Mode), swap `toggleIcon` lucide name (sun/moon), re-init icons, re-`applyTheme(currentTheme)` to refresh CSS vars + wallpaper.
- Each `.ws-dot` `click` — clear other dots' active, mark clicked dot active.
- Each `.qs-tile` `click` — toggle active, update `.qs-tile-sub` text per toggle key (wifi → Aurora-5G/Off, others → On/Off).
- `#volSlider` (via `makeSlider`) `onChange` — update `#quickSettingsBtn` `data-tip` (Volume · N%) and replace both the mute button's icon and the stacked tray's volume icon (volume-x / volume-1 / volume-2) based on value.
- `#brightSlider` (via `makeSlider`, `onChange=null`) — drag-only update; no side effects.
- `#muteBtn` `click` — if `vol>0`, save `lastVol` and set 0; else restore `lastVol || 60`.
- `#calPrev` / `#calNext` `click` — decrement/increment `calDate` month, re-`renderCalendar`.
- Each `.mode-tab` (inside `#themeConfigArea`) `click` — switch active mode tab + visible `.mode-content`.

### Interactions overview
- **Clock**: auto-refreshes every 5s across status section, Quick Settings header, and Widgets pane.
- **Launcher**: a single popover hosts three tabs; Apps tab shows a mosaic of grouped app icons; Widgets tab shows live clock + weather + system stats + processes + now-playing; Settings tab hosts nav + four panes (Looks & Feel contains the full theme picker + bar configuration + window behavior).
- **Search**: filters app items in the Apps pane only by name (case-insensitive), hiding empty groups.
- **App window**: clicking an app icon (in dock or launcher) opens a centered modal with the app's name + icon; clicking the active app's icon again toggles it closed; the X (close) button and Escape also close it.
- **Quick Settings**: opens above the stacked system-tray tile; toggle tiles flip state and update their sub-label; volume + brightness sliders drag with mouse or touch; mute button toggles between 0 and last-known volume; volume slider also drives the tray icon shape.
- **Calendar popover**: opens above the status section; renders the current month grid with today highlighted, plus a vertical bar showing the year digits and month initials; prev/next arrows navigate months.
- **Theme system**: `applyTheme` writes `--accent`, `--accent-strong`, `--accent-light`, `--accent-glow` on `:root` from the theme's hex accent; updates the dock trigger swatch + popup list + Settings list; reloads wallpaper. The settings list selection does NOT change the active theme (preview only) — only the dock popup actually applies themes.
- **Light/dark toggle**: the vertical `#customToggle` adds/removes `body.light`, swaps the inner icon (moon ↔ sun), then re-applies the current theme so all derived colors/wallpaper update.
- **Bar config live state**: the `Items Connected` toggle adds/removes `disconnected` on `#dock-container`; the `Items In Box` toggle adds/removes `in-box`; the `Separation` slider updates `#dock-container` gap inline.
- **Workspace dots**: clicking a dot marks it active (visual only — no real workspace switch).
- **Layout indicator**: clicking the box toggles between float (horizontal mini-windows) and stack (vertical mini-windows) preview, and updates the tooltip.
