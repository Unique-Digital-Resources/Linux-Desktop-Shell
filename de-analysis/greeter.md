# DMGreeter — Analysis

## Overview

`DMGreeter.html` is the login / display-manager (greeter) screen for the "Aether" custom Wayland display manager — the first surface a user sees before any desktop session starts. It is a single self-contained HTML document (1724 lines) loading Google Fonts (Inter + Space Grotesk) and the `lucide` icon library from a CDN, then rendering everything from one inline `<style>` block and one inline IIFE `<script>`.

**Visual concept**
- Dark, glassmorphic aesthetic. Surfaces use `rgba()` translucent fills layered over a blurred wallpaper (`backdrop-filter: blur(22px) saturate(120%)`).
- Accent is a mint/teal (`--accent: #6ad1b3`) used for primary actions, focused fields, active tabs, session indicators, and the success overlay; text is near-white `#eef3f7`.
- A fixed `.wallpaper` gradient sits behind a remote `.wallpaper-img` (Unsplash) that fades in once loaded, with a left-to-right `.veil` gradient darkening the image for legibility.
- A light theme is fully supported via `[data-theme="light"]` overrides of every design token.
- Motion is restrained and cubic-bezier-eased (`--ease: cubic-bezier(.22,.61,.36,1)`, `--ease-out: cubic-bezier(.16,1,.3,1)`), with a `prefers-reduced-motion` short-circuit at the bottom.

**Main UI regions (top → bottom)**
1. **Wallpaper layers** — `.wallpaper` (gradient fallback) + `.wallpaper-img` (remote image, fades in) + `.veil` (legibility scrim).
2. **Stage** — `.stage` flex container centering the auth area.
3. **Auth wrapper** — `.auth-wrapper` (column) containing:
   - `.auth-container` (row): **user-box** (left, expandable drawer of avatars) + **auth-card** (right, 440 px glass card with method tabs, step indicator, and method panels for password / PIN / pattern / fingerprint / security question).
   - `.statusbar` (pill-shaped, full width below the cards): session picker on the left, system indicators (network, volume, battery, theme, power) on the right.
4. **Popovers** — `.popover` panels anchored above their trigger buttons for session list, network info, volume slider, and power menu.
5. **Dialog + scrim** — `.scrim` + `.dialog` confirmation modal for power actions.
6. **Overlay screens** — full-screen `.overlay-screen` for "Welcome back" success and the power-off "Shutting down" / "Restarting" / "Suspending" / "Locking" / "About" states.

The page sets `<html data-theme="dark">` and provides a `<title>Aether — Display Manager</title>`.

---

## HTML structure

Below is the complete inner HTML of `<body>` reproduced verbatim (every element, class, attribute, and text node), indented for readability. This is the template that will back the greeter web component.

```html
  <div class="wallpaper"></div>
  <div class="wallpaper-img" id="wallImg"></div>
  <div class="veil"></div>

  <main class="stage" id="stage">
    <div class="auth-wrapper">
    
      <div class="auth-container">
      
        <!-- ===== USER BOX (left) ===== -->
        <div class="user-box" id="userBox">
          <button class="drawer-btn" id="drawerBtn" aria-label="Switch user">
            <i data-lucide="chevron-right"></i>
          </button>
        
          <div class="drawer-panel" id="drawerPanel">
            <div class="drawer-label">Switch User</div>
            <div class="avatar-grid" id="avatarGrid"></div>
          </div>
        
          <div class="user-box-content">
            <img class="large-avatar" id="avatar" alt="" />
            <div>
              <div class="user-name" id="userName">Aria Voss</div>
              <div class="user-handle" id="userHandle">@aria</div>
            </div>
          </div>
        </div>
      
        <!-- ===== AUTH CARD (right) ===== -->
        <div class="auth-card" id="authCard">
          <div class="method-tabs" role="tablist" aria-label="Authentication method">
            <button class="method-tab active" data-method="password" title="Password" role="tab"><i data-lucide="key-round"></i>Password</button>
            <button class="method-tab" data-method="pin" title="PIN" role="tab"><i data-lucide="grid-2x2"></i>PIN</button>
            <button class="method-tab" data-method="pattern" title="Pattern" role="tab"><i data-lucide="git-fork"></i>Pattern</button>
            <button class="method-tab" data-method="fingerprint" title="Fingerprint" role="tab"><i data-lucide="fingerprint"></i>Finger</button>
            <button class="method-tab" data-method="question" title="Security Question" role="tab"><i data-lucide="help-circle"></i>Question</button>
          </div>

          <div class="step-indicator" id="stepIndicator">
            <div class="step-label" id="stepLabel">Step 1 of 2 · Password</div>
            <div class="step-dots" id="stepDots"></div>
          </div>

          <div class="method-body">
            <div class="method-panel active" data-panel="password">
              <form id="pwForm" autocomplete="off">
                <div class="field" id="pwField">
                  <i data-lucide="lock" class="lead"></i>
                  <input type="text" id="userInput" class="user-input" placeholder="Username" aria-label="Username" autocomplete="off" />
                  <span class="field-sep" id="fieldSep"></span>
                  <input type="password" id="pwInput" placeholder="Password" aria-label="Password" autocomplete="off" />
                  <button type="button" class="eye" id="pwEye" aria-label="Show password" tabindex="-1">
                    <i data-lucide="eye"></i>
                  </button>
                </div>
                <button type="submit" class="primary-action" id="pwSubmit">
                  <span class="label">Sign in</span>
                  <i data-lucide="arrow-right"></i>
                  <span class="spinner"></span>
                </button>
                <div class="field-foot">
                  <span class="error-msg" id="pwError">Incorrect password. Try again.</span>
                  <span class="demo-hint" id="pwHint"></span>
                </div>
              </form>
            </div>

            <div class="method-panel" data-panel="pin">
              <div class="pin-display" id="pinDisplay">
                <span class="pin-dot"></span><span class="pin-dot"></span>
                <span class="pin-dot"></span><span class="pin-dot"></span>
              </div>
              <div class="pin-pad" id="pinPad">
                <button class="pin-key" data-k="1">1</button>
                <button class="pin-key" data-k="2">2</button>
                <button class="pin-key" data-k="3">3</button>
                <button class="pin-key" data-k="4">4</button>
                <button class="pin-key" data-k="5">5</button>
                <button class="pin-key" data-k="6">6</button>
                <button class="pin-key" data-k="7">7</button>
                <button class="pin-key" data-k="8">8</button>
                <button class="pin-key" data-k="9">9</button>
                <button class="pin-key fn" data-k="clear" aria-label="Clear"><i data-lucide="delete"></i></button>
                <button class="pin-key" data-k="0">0</button>
                <button class="pin-key fn" data-k="enter" aria-label="Submit" id="pinEnter"><i data-lucide="corner-down-left"></i></button>
              </div>
              <div class="field-foot">
                <span class="error-msg" id="pinError">Incorrect PIN.</span>
                <span class="demo-hint" id="pinHint"></span>
              </div>
            </div>

            <div class="method-panel" data-panel="pattern">
              <div class="pattern-wrap">
                <div class="pattern-canvas" id="patternCanvas">
                  <svg class="pattern-svg" id="patternSvg"></svg>
                </div>
                <div class="pattern-hint" id="patternHint">Draw a pattern of 4 or more points</div>
                <div class="field-foot" style="width:100%;justify-content:space-between;margin-top:8px">
                  <span class="error-msg" id="patternError">Pattern too short.</span>
                  <span class="demo-hint" id="patternHintDemo"></span>
                </div>
              </div>
            </div>

            <div class="method-panel" data-panel="fingerprint">
              <div class="fp-wrap">
                <button class="fp-btn" id="fpBtn" aria-label="Scan fingerprint">
                  <i data-lucide="fingerprint"></i>
                </button>
                <div class="fp-label" id="fpLabel">Touch the sensor to scan</div>
                <div class="field-foot" style="margin-top:10px">
                  <span class="error-msg" id="fpError">Scan failed. Try again.</span>
                  <span class="demo-hint" id="fpHint"></span>
                </div>
              </div>
            </div>

            <div class="method-panel" data-panel="question">
              <div class="question-box">
                <i data-lucide="help-circle"></i>
                <div class="question-text" id="questionText">What is the name of your first pet?</div>
              </div>
              <div class="field" id="qField">
                <i data-lucide="message-circle" class="lead"></i>
                <input type="text" id="qInput" placeholder="Your answer" aria-label="Security answer" autocomplete="off" />
              </div>
              <button type="button" class="primary-action" id="qSubmit">
                <span class="label">Verify answer</span>
                <i data-lucide="check"></i>
                <span class="spinner"></span>
              </button>
              <div class="field-foot">
                <span class="error-msg" id="qError">Incorrect answer.</span>
                <span class="demo-hint" id="qHint"></span>
              </div>
            </div>
          </div>
        </div>
      
      </div>
    
      <!-- ===== STATUS BAR (under boxes, full width) ===== -->
      <nav class="statusbar" aria-label="System status">
        <button class="session-indicator" id="sessionBtn" data-pop="session" aria-label="Select session">
          <i data-lucide="layout-grid"></i>
          <span class="session-label">Session</span>
          <span class="session-val" id="sessionVal">Hyprland</span>
          <i data-lucide="chevron-down" class="chev"></i>
        </button>
      
        <div class="system-indicators">
          <button class="indicator" id="netBtn" data-pop="network" aria-label="Network">
            <i data-lucide="wifi"></i>
            <span class="pill"><span class="lvl-text" id="netText">Aether-5G</span></span>
            <span class="tip">Connected · Aether-5G</span>
          </button>
          <button class="indicator" id="volBtn" data-pop="volume" aria-label="Volume">
            <i data-lucide="volume-2"></i>
            <span class="pill"><span class="lvl-text" id="volText">45%</span></span>
            <span class="tip" id="volTip">Volume 45%</span>
          </button>
          <button class="indicator" id="batBtn" aria-label="Battery">
            <span class="bat-case"><span class="bat-fill" id="batFill" style="width:78%"></span></span>
            <span class="lvl-text" id="batText">78%</span>
            <span class="tip" id="batTip">78% remaining</span>
          </button>
          <button class="indicator" id="themeBtn" aria-label="Toggle theme">
            <i data-lucide="sun-moon"></i>
            <span class="tip">Switch theme</span>
          </button>
          <button class="indicator" id="powerBtn" data-pop="power" aria-label="Power and system options">
            <i data-lucide="power"></i>
            <span class="tip">Power options</span>
          </button>
        </div>
      </nav>
    
    </div>
  </main>

  <!-- Popovers -->
  <div class="popover" id="pop-session" role="menu" aria-label="Select session">
    <div class="pop-label">Desktop Session</div>
    <div id="sessionList"></div>
  </div>

  <div class="popover" id="pop-network" role="menu" aria-label="Network status" style="min-width:260px">
    <div class="pop-section">
      <div class="pop-label">Connection</div>
      <div class="net-info-row">
        <div class="net-info-icon"><i data-lucide="wifi"></i></div>
        <div class="net-info-text">
          <div class="net-info-name">Aether-5G</div>
          <div class="net-info-detail">Connected · Secured · 5 GHz</div>
        </div>
      </div>
    </div>
    <div class="pop-section">
      <div class="pop-label">Details</div>
      <div class="net-stat"><span>Interface</span><span class="net-stat-val">wlan0</span></div>
      <div class="net-stat"><span>Signal strength</span><span class="net-stat-val">Excellent</span></div>
      <div class="net-stat"><span>IP address</span><span class="net-stat-val">192.168.1.42</span></div>
      <div class="net-stat"><span>Gateway</span><span class="net-stat-val">192.168.1.1</span></div>
    </div>
  </div>

  <div class="popover" id="pop-volume" role="menu" aria-label="Volume" style="min-width:260px">
    <div class="pop-section">
      <div class="pop-label">Output volume</div>
      <div class="vol-row">
        <button class="vol-toggle" id="volToggle" aria-label="Toggle mute">
          <i data-lucide="volume-2"></i>
        </button>
        <input type="range" id="volSlider" min="0" max="100" value="45" class="vol-slider" aria-label="Volume level" />
        <span class="vol-value" id="volValue">45%</span>
      </div>
    </div>
  </div>

  <div class="popover origin-bl" id="pop-power" role="menu" aria-label="Power options">
    <div class="pop-section">
      <button class="pop-item" data-power="suspend"><i data-lucide="moon"></i><span>Suspend</span></button>
      <button class="pop-item" data-power="restart"><i data-lucide="rotate-cw"></i><span>Restart</span></button>
      <button class="pop-item danger" data-power="shutdown"><i data-lucide="power"></i><span>Shut down</span></button>
    </div>
    <div class="pop-section">
      <button class="pop-item" id="lockBtn"><i data-lucide="lock-keyhole"></i><span>Lock screen</span></button>
      <button class="pop-item" id="aboutBtn"><i data-lucide="info"></i><span>About this system</span></button>
    </div>
  </div>

  <div class="scrim" id="scrim"></div>
  <div class="dialog" id="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
    <div class="dialog-icon" id="dlgIcon"><i data-lucide="triangle-alert"></i></div>
    <h3 id="dlgTitle">Shut down?</h3>
    <p id="dlgBody">This will close all running sessions and power off the device. Any unsaved work will be lost.</p>
    <div class="dialog-actions">
      <button class="btn btn-ghost" id="dlgCancel">Cancel</button>
      <button class="btn btn-danger" id="dlgConfirm">Shut down</button>
    </div>
  </div>

  <div class="overlay-screen" id="successOverlay">
    <div class="overlay-icon" id="successIcon"><i data-lucide="check"></i></div>
    <div class="overlay-title" id="successTitle">Welcome back, Aria</div>
    <div class="overlay-sub" id="successSub">Starting Hyprland session…</div>
    <button class="overlay-back" id="successBack">Return to greeter</button>
  </div>

  <div class="overlay-screen power" id="powerOverlay">
    <div class="overlay-icon" id="powerIcon"><i data-lucide="power"></i></div>
    <div class="overlay-title" id="powerTitle">Shutting down</div>
    <div class="overlay-sub" id="powerSub">It is now safe to power off the device.</div>
    <button class="overlay-back" id="powerBack">Return to greeter</button>
  </div>
```

---

## CSS section index

The stylesheet is grouped into eleven numbered sections by banner comments in the source. Below, every selector / group is listed with a one-line description of what it styles, organized by region.

### 1. Design tokens
- `:root` — All dark-theme CSS custom properties: accent ramp (`--accent`, `--accent-soft`, `--accent-strong`, `--accent-press`), surface tokens (`--surface`, `--surface-strong`, `--surface-hover`, `--surface-input`), text ramp (`--text` … `--text-faint`), hairlines & ring, error/success/warn, radii (`--r-sm/md/lg/pill`), `--pad-input`, `--blur`, durations (`--dur-fast/dur/slow`), eases, panel & float shadows.
- `[data-theme="light"]` — Light-theme overrides for every color/shadow token above (deep teal accent, white surfaces, dark text, lighter shadows).

### 2. Reset & base
- `*` — Box-sizing reset, zero margin/padding.
- `html, body` — Full height.
- `body` — Inter font stack, text color, fallback background, `overflow:hidden`, antialiasing, optimized text rendering.
- `button` / `input` — Inherit font/color, strip borders/background, pointer cursor for buttons, no outline on inputs.
- `::selection` — Accent-soft selection highlight.
- `button:focus-visible, .method-tab:focus-visible, .indicator:focus-visible, .session-indicator:focus-visible, .pin-key:focus-visible, .vol-toggle:focus-visible, .drawer-btn:focus-visible, .grid-avatar:focus-visible` — Shared keyboard focus ring (2 px accent ring, 6 px radius).
- `.field input:focus, .field input:focus-visible` — Strip native input outline (field-level focus handled by container).

### 3. Wallpaper & atmosphere
- `.wallpaper` — Fixed full-viewport gradient fallback (radial accent glow top-left + cool blue glow bottom-right + linear gradient between `--bg-fallback-1/2`).
- `.wallpaper-img` — Fixed full-viewport remote image layer; opacity 0 → 1 with `.loaded` (slow ease transition).
- `.wallpaper-img.loaded` — Faded-in state.
- `.veil` — Fixed legibility scrim over the wallpaper (two linear gradients: horizontal darkening + bottom-up darkening).
- `[data-theme="light"] .veil` — Lighter veil gradients for the light theme.

### 4. Stage layout
- `.stage` — Relative layer above the wallpaper (`z-index:2`), full size, flex center, fluid padding via `clamp()`.
- `.auth-wrapper` — Column flex, 16 px gap, `width:max-content`, capped at viewport.
- `.auth-container` — Row flex holding the user-box and auth-card, 16 px gap.

### 5. User box (left) — drawer inside, expands
- `.user-box` — Glass panel (`--surface`, blur, hairline border, large radius, panel shadow) housing the avatar + (optional) drawer; width animates on drawer open.
- `.user-box::before` — Inset 1 px top-highlight gradient overlay (glass sheen).
- `.drawer-panel` — Hidden by default; inset dark panel with column layout, shown when `.drawer-open` is on the user-box.
- `.user-box.drawer-open .drawer-panel` — Reveals the drawer (display:flex).
- `.drawer-label` — Uppercase, letter-spaced, faint "Switch User" caption.
- `.avatar-grid` — 3-row CSS grid with column auto-flow for the avatar buttons.
- `.grid-avatar` — 44 px circular avatar button, transparent border, hover scale + accent border, `.selected` accent ring.
- `.grid-avatar img` — Full-cover image fill.
- `.grid-avatar:hover` — Accent border + 1.08 scale.
- `.grid-avatar.selected` — Accent border + 3 px accent-soft ring.
- `.user-box-content` — Fixed 220 px column, centered avatar + name + handle.
- `.large-avatar` — 128 px circular cover image with hairline-strong border, drop shadow, surface-input background, bottom margin.
- `.user-name` — Space Grotesk 22 px / weight 500, negative letter-spacing, centered.
- `.user-handle` — 13 px muted Space Grotesk handle.
- `.drawer-btn` — Absolutely-positioned 32 px circular toggle left of the box (`-16 px`), surface-strong fill, hairline-strong border, float shadow, accent-on-hover.
- `.drawer-btn:hover` — Accent fill, dark text, accent border.
- `[data-theme="light"] .drawer-btn:hover` — White text on accent.
- `.drawer-btn svg` — 16 px, rotation transitions.
- `.user-box.drawer-open .drawer-btn svg` — Rotates the chevron 180° when drawer is open.

### 6. Auth card (right)
- `.auth-card` — Fixed 440 px glass column with fluid padding, surface fill, blur, hairline border, large radius, panel shadow.
- `.auth-card::before` — Inset top-highlight gradient (glass sheen).
- `.method-tabs` — Pill-shaped segmented control holding the five method tabs.
- `.method-tab` — Inline-flex tab with icon + label, 11.5 px medium, muted; hover brightens; `.active` gets accent fill + dark text.
- `.method-tab svg` — 14 px icon.
- `.method-tab:hover` — Brighter text.
- `.method-tab.active` — Accent background, dark text.
- `[data-theme="light"] .method-tab.active` — White text.
- `.step-indicator` — Hidden column (label + dots) shown only for multi-step auth via `.show`.
- `.step-indicator.show` — Reveals the indicator.
- `.step-label` — 12 px muted Space Grotesk label like "Step 1 of 2 · Password".
- `.step-dots` — 6 px-gap row of step dots.
- `.step-dot` — 7 px circle, hairline-strong, transitions.
- `.step-dot.active` — Accent fill, 1.3 scale, accent-soft glow.
- `.step-dot.completed` — Success-green fill.
- `.method-body` — Relative container for the five method panels; 12 px top margin.
- `.method-panel` — Hidden by default.
- `.method-panel.active` — Visible, with `fadeUp` keyframe entrance.
- `@keyframes fadeUp` — Opacity 0 → 1 + 6 px upward translate.
- `.field` — Shared input container: surface-input fill, hairline border, medium radius; focus-within adds accent border + accent-soft ring; `.error` adds error border + ring + `shake` animation.
- `@keyframes shake` — Quick horizontal jitter for invalid fields.
- `.field > svg.lead` — 17 px leading icon inside a field, 15 px left margin.
- `.field input` — Flex:1, padded, 15 px font, slight letter-spacing, min-width 0.
- `.field input::placeholder` — Faint placeholder text.
- `.field .user-input` — Hidden username sub-input.
- `.field .user-input.show` — Shown as 35 % flex column when the user requires a username.
- `.field .field-sep` — Hidden vertical divider.
- `.field .field-sep.show` — 1 px vertical hairline between username and password inputs.
- `.field .eye` — 38 px square password-reveal toggle area, muted → bright on hover.
- `.field .eye:hover` — Brighter icon.
- `.field .eye svg` — 17 px eye icon.
- `.primary-action` — Full-width accent submit button: 13 px padding, medium radius, accent fill, dark text, 14.5 px / weight 600; hover → accent-strong; active → slight scale-down; disabled dimmed.
- `[data-theme="light"] .primary-action` — White text.
- `.primary-action:hover` — Accent-strong background.
- `.primary-action:active` — 0.985 scale press.
- `.primary-action[disabled]` — 0.55 opacity, not-allowed cursor.
- `.primary-action svg` — 17 px trailing icon.
- `.primary-action.loading .label, .primary-action.loading svg` — Hide label + icon while loading.
- `.primary-action.loading .spinner` — Show spinner while loading.
- `.spinner` — 22 px spinning ring border, hidden by default, `spin` keyframe.
- `[data-theme="light"] .spinner` — White ring border for light theme.
- `@keyframes spin` — 360° rotation, 0.8 s linear.
- `.field-foot` — 10 px-top row between button and footer; space-between alignment, 18 px min height.
- `.error-msg` — 12.5 px error-red, weight 500; hidden via opacity/translate; `.show` reveals it.
- `.error-msg.show` — Visible.
- `.demo-hint` — 11.5 px faint Space Grotesk hint on the right; `<b>` child uses mute color.
- `.demo-hint b` — Mute-colored bold segment.

**PIN sub-panel**
- `.pin-display` — Centered row of 4 dots with 14 px gap.
- `.pin-dot` — 12 px circle, 1.5 px hairline-strong border.
- `.pin-dot.filled` — Accent fill + border, 1.08 scale.
- `.pin-dot.error` — Error-red border + error-soft fill.
- `.pin-pad` — 3-column grid of number keys with 8 px gap.
- `.pin-key` — 50 px tall key, surface-input fill, hairline border, Space Grotesk 19 px digit; hover lightens; active scales down + accent-soft fill; `.fn` variant is muted with smaller icon; `.loading` dims.
- `.pin-key:hover` — Lighter surface + stronger hairline.
- `.pin-key:active` — 0.95 scale + accent-soft fill.
- `.pin-key.fn` — Muted, 14 px font (for clear / enter icons).
- `.pin-key.fn svg` — 18 px icon.
- `.pin-key.loading` — 0.5 opacity, no pointer events.

**Pattern sub-panel**
- `.pattern-wrap` — Centered column wrapper.
- `.pattern-canvas` — 220 × 220 relative pattern area with `touch-action:none`.
- `.pattern-svg` — Absolutely-filled SVG layer for the connecting polyline (no pointer events).
- `.pattern-dot` — 14 px absolutely-positioned circle (translated -50 %,-50 %), hairline-strong border, surface-input fill.
- `.pattern-dot.active` — Accent fill + border + 6 px accent-soft ring.
- `.pattern-dot.error` — Error fill + border + 6 px error-soft ring.
- `.pattern-hint` — 12.5 px muted Space Grotesk status text, 18 px min height.

**Fingerprint sub-panel**
- `.fp-wrap` — Centered column wrapper.
- `.fp-btn` — 92 px circular sensor button, hairline-strong border, surface-input fill; hover → accent; `.scanning` adds accent border + `pulse` animation + ripple `::after`; `.success` turns success-green.
- `.fp-btn svg` — 46 px fingerprint icon, color transitions.
- `.fp-btn:hover` — Accent color + border.
- `.fp-btn.scanning` — Accent border/color + infinite pulse.
- `.fp-btn.scanning::after` — Expanding ripple ring around the sensor.
- `@keyframes pulse` — Box-shadow pulse on the sensor.
- `@keyframes ripple` — Outward scale + fade ripple.
- `.fp-btn.success` — Success-green icon + border.
- `.fp-label` — 16 px-top muted Space Grotesk status label, 18 px min height.

**Security-question sub-panel**
- `.question-box` — Accent-soft tinted box with hairline border holding the prompt.
- `.question-box svg` — 18 px accent help icon, flex-shrink 0.
- `.question-text` — 13.5 px Space Grotesk weight-500 prompt text, 1.45 line-height.

### 7. Status bar
- `.statusbar` — Pill-shaped full-width glass bar (`z-index:5`), surface fill, blur, hairline border, float shadow, 46 px min height; space-between layout.
- `.session-indicator` — Inline-flex pill button on the left with icon + label + value + chevron; surface-input fill; hover lightens; `.active` flips the chevron.
- `.session-indicator:hover` — Lighter surface + brighter text.
- `.session-indicator svg` — 16 px muted icon.
- `.session-indicator .session-label` — Muted 12.5 px label.
- `.session-indicator .session-val` — Bright 12.5 px value.
- `.session-indicator .chev` — 14 px faint chevron, rotation transition.
- `.session-indicator.active .chev` — 180°-rotated chevron.
- `.system-indicators` — Right-side row of indicator buttons with 4 px gap.
- `.indicator` — Pill-shaped icon/lvl button, 34 px tall, surface-hover on hover.
- `.indicator:hover` — Lighter surface + brighter text.
- `.indicator svg` — 17 px icon.
- `.indicator .lvl-text` — 12 px tabular-nums level text.
- `.indicator .pill` — Inner pill wrapper (border + gap + padding) for level text.
- `.bat-case` — 23 × 13 px battery outline drawn with `currentColor` + a `::after` nub.
- `.bat-case::after` — Right-side battery nub.
- `.bat-fill` — Absolutely-positioned inner fill bar (width set inline by JS).
- `.tip` — Tooltip above an indicator (surface-strong, hairline border, 11.5 px text); hidden by default; revealed by `.indicator:hover .tip`.
- `.indicator:hover .tip` — Revealed + translated tooltip.

### 8. Popover panels
- `.popover` — Fixed `z-index:30` glass panel, surface-strong fill, blur, hairline-strong border, medium radius, panel shadow; hidden via opacity + downward/scale transform; `.open` reveals; transform-origin variations for top-left / bottom-left.
- `.popover.open` — Visible + reset transform.
- `.popover.origin-tl` — Top-left transform origin.
- `.popover.origin-bl` — Bottom-left transform origin (used by the power popover).
- `.pop-section` — 6 px-padded section with top hairline divider between siblings.
- `.pop-section + .pop-section` — Top hairline divider.
- `.pop-label` — Uppercase letter-spaced faint 10.5 px section caption.
- `.pop-item` — Full-width row button: 9 px padding, 13.5 px text, surface-hover on hover; `.danger` variant is error-red; `.selected` is bright with an accent check; carries a `.meta` slot on the right.
- `.pop-item:hover` — Lighter surface + brighter text.
- `.pop-item svg` — 17 px muted icon.
- `.pop-item .meta` — Right-aligned 12 px faint tabular meta slot.
- `.pop-item.danger` — Error-red text + icon + error-soft hover.
- `.pop-item.danger svg` — Error-red icon.
- `.pop-item.danger:hover` — Error-soft background.
- `.pop-item.selected` — Bright text.
- `.pop-item.selected .pop-check` — Accent-colored check.
- `.pop-check` — Right-aligned 16 px accent check icon.
- `.session-logo` — 18 × 18 px logo slot.
- `.session-logo svg` — 18 px session logo.
- `.session-desc` — 11.5 px faint description line under the session name.
- `.net-info-row` — Network connection row with icon + text.
- `.net-info-icon` — 36 px circular accent-soft icon well.
- `.net-info-icon svg` — 18 px wifi icon.
- `.net-info-text` — Flex:1 text column.
- `.net-info-name` — 14 px weight-500 network name.
- `.net-info-detail` — 12 px muted detail line.
- `.net-stat` — Space-between row of network stat pairs.
- `.net-stat-val` — Right-aligned Space Grotesk tabular value.
- `.vol-row` — Volume row with toggle + slider + value.
- `.vol-toggle` — 36 px circular mute toggle; hover lightens; `.muted` is error-red.
- `.vol-toggle:hover` — Lighter surface + brighter text.
- `.vol-toggle.muted` — Error-red icon.
- `.vol-toggle svg` — 18 px speaker icon.
- `.vol-slider` — Flex:1 range input with `accent-color:var(--accent)`.
- `.vol-value` — Right-aligned 12 px Space Grotesk tabular percent.

### 9. Dialog / overlay
- `.scrim` — Fixed `z-index:40` full-viewport dim + 4 px blur; hidden by default; `.open` reveals.
- `.scrim.open` — Visible + interactive.
- `.dialog` — Fixed centered (`z-index:41`) glass modal, ≤ 380 px wide, surface-strong fill, blur, hairline-strong border, large radius, panel shadow; hidden via opacity + scale; `.open` scales to 1.
- `.dialog.open` — Visible + centered scale-1.
- `.dialog-icon` — 44 px rounded-square icon well (error-soft fill + error color by default).
- `.dialog-icon svg` — 23 px alert icon.
- `.dialog h3` — Space Grotesk 18 px weight-500 title.
- `.dialog p` — 13.5 px soft body text, 6 px top margin, 1.5 line-height.
- `.dialog-actions` — Right-aligned 8 px-gap row of action buttons.
- `.btn` — Base 9 × 16 px button, small radius, 13.5 px / weight 500, fast transition.
- `.btn-ghost` — Soft ghost button; hover lightens.
- `.btn-ghost:hover` — Lighter surface + brighter text.
- `.btn-danger` — Error-fill button with dark text; hover brightens.
- `.btn-danger:hover` — Slight brightness boost.
- `.btn-primary` — Accent-fill primary button with dark text.
- `[data-theme="light"] .btn-primary` — White text.
- `.btn-primary:hover` — Accent-strong background.
- `.overlay-screen` — Full-viewport `z-index:60` flex column overlay, transparent by default; `.show` fades in a dim background; `.power` is near-opaque for power-off.
- `.overlay-screen.show` — Visible + dim background.
- `.overlay-screen.power` — Near-opaque dark background.
- `.overlay-icon` — 64 px circular accent well with dark icon; scales from 0.6 → 1 on `.show`.
- `[data-theme="light"] .overlay-icon` — White icon.
- `.overlay-screen.show .overlay-icon` — Scaled + visible.
- `.overlay-icon svg` — 30 px icon.
- `.overlay-title` — 30 px Space Grotesk weight-400 welcome/shutdown title; translated + faded until `.show`.
- `.overlay-screen.show .overlay-title` — Revealed + translated up.
- `.overlay-sub` — 13.5 px translucent subtitle; staged 0.08 s after the title.
- `.overlay-screen.show .overlay-sub` — Revealed.
- `.overlay-back` — Pill-bordered "Return to greeter" button; staged 0.24 s.
- `.overlay-screen.show .overlay-back` — Revealed.
- `.overlay-back:hover` — Lighter surface + bright text.

### 10. Responsive
- `@media (max-width:980px)` — Stacks auth-container vertically, makes user-box-content row with smaller avatar, repositions drawer-btn to the bottom (90°-rotated chevron), widens avatar-grid to 2 rows, full-width auth-card, wraps the status bar.
- `@media (max-width:620px)` — Shrinks method-tab and session-indicator padding/font, tightens indicator pills.

### 11. Reduced motion
- `@media (prefers-reduced-motion:reduce)` — Collapses all animation/transition durations to 0.001 ms and forces animation-iteration-count to 1 (effectively instant) for every element + its `::before` / `::after`.

The full verbatim CSS is reproduced in **`greeter.css`** (732 lines).

---

## JS logic

Below is the complete verbatim content of the `<script>` block (an IIFE with `"use strict"`), followed by a bullet summary of state, functions, event listeners, interactions, and data.

### Script source (verbatim)

```js
(function(){
  "use strict";

  const WALLPAPER_URL = "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=2400&q=80";
  const DEMO = { password:"demo", pin:"1234", patternMinLen:4 };

  const SESSIONS = [
    { id:"hyprland", name:"Hyprland", desc:"Dynamic tiling Wayland compositor",
      logo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18M3 12h18M3 17h18M7 3v18M14 3v18"/></svg>` },
    { id:"kde", name:"KDE Plasma", desc:"Flexible desktop by KDE",
      logo:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.6 3.2c0 .9.7 1.6 1.6 1.6.9 0 1.6-.7 1.6-1.6 0-.9-.7-1.6-1.6-1.6-.9 0-1.6.7-1.6 1.6zM8.8 6.4c.5 0 1 .1 1.4.4.4.2.7.2 1.1.1.7-.2 1.4-.2 2.1 0 .4.1.7.1 1.1-.1.4-.3.9-.4 1.4-.4 1.2 0 2.1.9 2.1 2.1 0 .8-.4 1.5-.9 2.2-.4.5-.5 1.1-.4 1.7.1.5.2 1 .2 1.5 0 1.5-1.2 2.7-2.7 2.7-.5 0-1-.1-1.4-.4-.4-.2-.9-.3-1.4-.3-.5 0-1 .1-1.4.3-.4.3-.9.4-1.4.4-1.5 0-2.7-1.2-2.7-2.7 0-.5.1-1 .2-1.5.1-.6 0-1.2-.4-1.7-.5-.7-.9-1.4-.9-2.2 0-1.2.9-2.1 2.1-2.1z"/></svg>` },
    { id:"gnome", name:"GNOME", desc:"Clean, focused Wayland desktop",
      logo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3.2"/><path d="M12 5.5v-2M12 20.5v-2M5.5 12h-2M20.5 12h-2M7 7 5.5 5.5M18.5 18.5 17 17M17 7l1.5-1.5M5.5 18.5 7 17"/></svg>` },
    { id:"sway", name:"Sway", desc:"i3-compatible Wayland tiler",
      logo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 6h7v12H4zM13 6h7v6h-7zM13 14h7v4h-7z"/></svg>` },
    { id:"xfce", name:"Xfce", desc:"Lightweight, stable desktop",
      logo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 14 4-9 3 5 2-3 7 11"/><path d="M4 14h16"/></svg>` },
    { id:"custom", name:"Custom Wayland", desc:"User-defined session script",
      logo:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1"/><circle cx="12" cy="12" r="3"/></svg>` }
  ];

  const USERS = [
    { name:"Aria Voss",   handle:"aria",   img:"https://i.pravatar.cc/160?img=5",  auth:"password", pw:"demo",
      question:"What city were you born in?", answer:"cairo" },
    { name:"Kenji Sato",  handle:"kenji",   img:"https://i.pravatar.cc/160?img=11", auth:"password", pw:"demo", requiresUsername:true,
      question:"What is your favorite book?", answer:"dune" },
    { name:"Mira Sol",   handle:"mira",    img:"https://i.pravatar.cc/160?img=47", auth:"pin",
      question:"What is your mother's maiden name?", answer:"rivera" },
    { name:"Devon Hart", handle:"devon",   img:"https://i.pravatar.cc/160?img=33", auth:"pattern",
      question:"What was the name of your first school?", answer:"maplewood" },
    { name:"Yuki Tanaka",handle:"yuki",    img:"https://i.pravatar.cc/160?img=20", auth:"question",
      question:"What is the name of your first pet?", answer:"mochi" },
    { name:"Sage Lin",   handle:"sage",    img:"https://i.pravatar.cc/160?img=16", auth:"multi-step",
      steps:[ { type:"password", pw:"demo" }, { type:"pattern" } ],
      question:"What is your favorite color?", answer:"teal" }
  ];

  const state = {
    userIndex: 0,
    method: "password",
    authStatus: "idle",
    multiStep: { active:false, current:0, total:0 },
    session: "hyprland",
    theme: "dark",
    openPop: null,
    drawerOpen: false,
    powerAction: null,
    net: { name:"Aether-5G", online:true },
    battery: { level:78, charging:false },
    volume: { level:45, muted:false },
    pin: "",
    pattern: [],
    patternDrawing: false
  };

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const user = () => USERS[state.userIndex];
  const session = () => SESSIONS.find(s => s.id === state.session);

  function refreshIcons(){ if (window.lucide && lucide.createIcons) lucide.createIcons(); }

  function swapIcon(el, iconName) {
    if (typeof el === "string") el = $(el);
    if (!el) return;
    const old = el.querySelector("svg, [data-lucide]") || el;
    const newI = document.createElement("i");
    newI.setAttribute("data-lucide", iconName);
    let cls = old.className;
    if (typeof cls === "object" && cls.baseVal !== undefined) cls = cls.baseVal;
    const keep = cls.split(/\s+/).filter(c => c && !c.startsWith("lucide"));
    newI.className = keep.join(" ");
    old.replaceWith(newI);
    refreshIcons();
  }

  function renderIdentity(){
    const u = user();
    const av = $("#avatar");
    av.src = u.img;
    av.onerror = () => { av.style.background = "linear-gradient(135deg,var(--accent),var(--accent-press))"; av.removeAttribute("src"); };
    $("#userName").textContent = u.name;
    $("#userHandle").textContent = "@" + u.handle;
  }

  function renderSession(){
    const s = session();
    $("#sessionVal").textContent = s.name;
    $$("#sessionList .pop-item").forEach(b => {
      const on = b.dataset.session === state.session;
      b.classList.toggle("selected", on);
      const chk = b.querySelector(".pop-check");
      if (chk) chk.style.opacity = on ? "1" : "0";
    });
  }

  function renderVolume(){
    const muted = state.volume.muted || state.volume.level === 0;
    const volIcon = muted ? "volume-x" : state.volume.level < 35 ? "volume-1" : "volume-2";
    $("#volText").textContent = muted ? "Muted" : state.volume.level + "%";
    $("#volTip").textContent = muted ? "Muted" : `Volume ${state.volume.level}%`;
    swapIcon("#volBtn", volIcon);
    const volToggle = $("#volToggle");
    if (volToggle){
      swapIcon("#volToggle", volIcon);
      volToggle.classList.toggle("muted", muted);
    }
    if ($("#volSlider")) $("#volSlider").value = state.volume.level;
    if ($("#volValue")) $("#volValue").textContent = muted ? "Muted" : state.volume.level + "%";
  }

  function renderBattery(){
    const lvl = state.battery.level;
    $("#batFill").style.width = Math.max(0, Math.min(100, lvl)) + "%";
    $("#batText").textContent = lvl + "%";
    $("#batTip").textContent = state.battery.charging ? `Charging · ${lvl}%` : `${lvl}% remaining`;
  }

  function renderNetwork(){ $("#netText").textContent = state.net.name; }

  function renderAll(){
    renderIdentity();
    renderSession();
    renderVolume();
    renderBattery();
    renderNetwork();
  }

  function updateAuthChrome(){
    const u = user();
    const isMulti = u.auth === "multi-step";
    state.multiStep.active = isMulti;
    state.multiStep.current = 0;
    state.multiStep.total = isMulti ? u.steps.length : 0;
    $(".method-tabs").style.display = isMulti ? "none" : "flex";
    $("#stepIndicator").classList.toggle("show", isMulti);
    const showUser = !!u.requiresUsername && !isMulti;
    $("#userInput").classList.toggle("show", showUser);
    $("#fieldSep").classList.toggle("show", showUser);
    swapIcon("#pwField .lead", showUser ? "user-round" : "lock");
    if (isMulti) renderStep();
    else setMethod(u.auth);
    updateDemoHints();
  }

  function setMethod(m){
    state.method = m;
    $$(".method-tab").forEach(t => t.classList.toggle("active", t.dataset.method === m));
    $$(".method-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === m));
    clearErrors();
    if (m === "pattern") setTimeout(buildPattern, 50);
  }

  function clearErrors(){
    $("#pwField").classList.remove("error");
    $("#pwError").classList.remove("show");
    $("#pinError").classList.remove("show");
    $("#patternError").classList.remove("show");
    $("#qField").classList.remove("error");
    $("#qError").classList.remove("show");
    $("#fpError").classList.remove("show");
    $("#pinDisplay").querySelectorAll(".pin-dot").forEach(d=>d.classList.remove("error"));
  }

  function stepLabel(type){
    return { password:"Password", pin:"PIN", pattern:"Pattern", fingerprint:"Fingerprint", question:"Security Question" }[type] || type;
  }
  function renderStep(){
    if (!state.multiStep.active) return;
    const u = user();
    const step = u.steps[state.multiStep.current];
    $("#stepLabel").textContent = `Step ${state.multiStep.current+1} of ${state.multiStep.total} · ${stepLabel(step.type)}`;
    const dotsEl = $("#stepDots");
    dotsEl.innerHTML = "";
    u.steps.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = "step-dot";
      if (i === state.multiStep.current) dot.classList.add("active");
      if (i < state.multiStep.current) dot.classList.add("completed");
      dotsEl.appendChild(dot);
    });
    setMethod(step.type);
    updateDemoHints();
  }
  function advanceStep(){
    const u = user();
    const stepType = u.steps[state.multiStep.current].type;
    if (stepType === "password") $("#pwInput").value = "";
    if (stepType === "pin") { state.pin = ""; renderPin(); }
    if (stepType === "pattern") clearPattern();
    if (stepType === "question") $("#qInput").value = "";
    state.multiStep.current++;
    renderStep();
  }
  function onAuthSuccess(){
    if (state.multiStep.active && state.multiStep.current < state.multiStep.total - 1){
      state.authStatus = "idle";
      setTimeout(advanceStep, 450);
    } else {
      showSuccess();
    }
  }

  function updateDemoHints(){
    const u = user();
    if (u.requiresUsername && !state.multiStep.active){
      $("#pwHint").innerHTML = `<b>demo:</b> any user · pass = <b>demo</b>`;
    } else {
      $("#pwHint").innerHTML = `<b>demo:</b> password = <b>demo</b>`;
    }
    $("#pinHint").innerHTML = `<b>demo:</b> PIN = <b>1234</b>`;
    $("#patternHintDemo").innerHTML = `<b>demo:</b> any 4+ dots`;
    $("#fpHint").innerHTML = `<b>demo:</b> tap to scan`;
    if (u.question){
      $("#qHint").innerHTML = `<b>demo:</b> answer = <b>${u.answer}</b>`;
      $("#questionText").textContent = u.question;
    } else {
      $("#qHint").innerHTML = `<b>demo:</b> no question set`;
      $("#questionText").textContent = "No security question configured for this user.";
    }
  }

  function setBtnLoading(btn, on){
    btn.classList.toggle("loading", on);
    btn.disabled = on;
    state.authStatus = on ? "loading" : "idle";
  }
  function showSuccess(){
    const u = user();
    $("#successTitle").textContent = `Welcome back, ${u.name.split(" ")[0]}`;
    $("#successSub").textContent = `Starting ${session().name} session…`;
    $("#successIcon").innerHTML = `<i data-lucide="check"></i>`;
    refreshIcons();
    $("#successOverlay").classList.add("show");
    state.authStatus = "success";
  }
  function returnToGreeter(){
    $("#successOverlay").classList.remove("show");
    $("#powerOverlay").classList.remove("show");
    state.authStatus = "idle";
    state.multiStep.current = 0;
    if (state.multiStep.active) renderStep();
    $("#pwInput").value = "";
    $("#userInput").value = "";
    $("#qInput").value = "";
    state.pin = ""; renderPin();
    clearPattern();
    clearErrors();
  }
  function flashError(fieldEl, msgEl, msg){
    fieldEl && fieldEl.classList.add("error");
    if (msg){ msgEl.textContent = msg; msgEl.classList.add("show"); }
    setTimeout(()=>{ fieldEl && fieldEl.classList.remove("error"); }, 420);
  }

  function submitPassword(e){
    e.preventDefault();
    if (state.authStatus === "loading") return;
    const u = user();
    const pwVal = $("#pwInput").value;
    const userVal = u.requiresUsername ? $("#userInput").value.trim() : "";
    if (u.requiresUsername && !userVal){
      flashError($("#pwField"), $("#pwError"), "Enter username.");
      $("#userInput").focus(); return;
    }
    if (!pwVal){
      flashError($("#pwField"), $("#pwError"), "Enter password.");
      $("#pwInput").focus(); return;
    }
    setBtnLoading($("#pwSubmit"), true);
    setTimeout(()=>{
      setBtnLoading($("#pwSubmit"), false);
      const expectedPw = state.multiStep.active
        ? (u.steps[state.multiStep.current].pw || DEMO.password)
        : (u.pw || DEMO.password);
      if (pwVal === expectedPw) onAuthSuccess();
      else flashError($("#pwField"), $("#pwError"), "Incorrect credentials. Try again.");
    }, 850);
  }

  function renderPin(){
    const dots = $$("#pinDisplay .pin-dot");
    dots.forEach((d,i)=>{ d.classList.toggle("filled", i < state.pin.length); d.classList.remove("error"); });
  }
  function pinError(msg){
    $("#pinDisplay").querySelectorAll(".pin-dot").forEach(d=>d.classList.add("error"));
    $("#pinError").textContent = msg || "Incorrect PIN.";
    $("#pinError").classList.add("show");
    setTimeout(()=>{ $("#pinError").classList.remove("show"); renderPin(); }, 700);
  }
  function pinPress(k){
    if (state.authStatus === "loading") return;
    if (k === "clear"){ state.pin = ""; renderPin(); $("#pinError").classList.remove("show"); return; }
    if (k === "enter"){ submitPin(); return; }
    if (state.pin.length >= 4) return;
    state.pin += k; renderPin();
    $("#pinError").classList.remove("show");
    if (state.pin.length === 4) setTimeout(submitPin, 160);
  }
  function submitPin(){
    if (state.authStatus === "loading") return;
    const enterBtn = $("#pinEnter");
    enterBtn.classList.add("loading"); enterBtn.disabled = true; state.authStatus = "loading";
    setTimeout(()=>{
      enterBtn.classList.remove("loading"); enterBtn.disabled = false; state.authStatus = "idle";
      if (state.pin === DEMO.pin){ state.pin = ""; renderPin(); onAuthSuccess(); }
      else pinError("Incorrect PIN.");
    }, 700);
  }

  const PAT_SIZE = 3;
  const patCanvas = $("#patternCanvas");
  const patSvg = $("#patternSvg");
  let patDots = [];
  function buildPattern(){
    patCanvas.querySelectorAll(".pattern-dot").forEach(d=>d.remove());
    patSvg.innerHTML = ""; patDots = [];
    const cs = patCanvas.getBoundingClientRect();
    if (cs.width === 0) return;
    const n = PAT_SIZE, pad = 24;
    for (let r=0;r<n;r++){
      for (let c=0;c<n;c++){
        const x = pad + (cs.width-2*pad) * (c/(n-1));
        const y = pad + (cs.height-2*pad) * (r/(n-1));
        const el = document.createElement("div");
        el.className = "pattern-dot";
        el.style.left = x+"px"; el.style.top = y+"px";
        el.dataset.idx = r*n+c;
        patCanvas.appendChild(el); patDots.push(el);
      }
    }
  }
  function clearPattern(){
    state.pattern = []; state.patternDrawing=false;
    patDots.forEach(d=>d.classList.remove("active","error"));
    patSvg.innerHTML = "";
    $("#patternError").classList.remove("show");
    $("#patternHint").textContent = "Draw a pattern of 4 or more points";
  }
  function addPatternDot(idx){
    if (state.pattern.includes(idx)) return;
    state.pattern.push(idx);
    patDots[idx].classList.add("active");
    drawPatternLines();
    $("#patternHint").textContent = `${state.pattern.length} point${state.pattern.length>1?"s":""} selected`;
  }
  function drawPatternLines(){
    if (state.pattern.length < 2) return;
    const cs = patCanvas.getBoundingClientRect();
    patSvg.setAttribute("viewBox", `0 0 ${cs.width} ${cs.height}`);
    let d = "";
    state.pattern.forEach((idx,i)=>{
      const dot = patDots[idx];
      const x = parseFloat(dot.style.left), y = parseFloat(dot.style.top);
      d += (i===0?"M":"L") + x + " " + y + " ";
    });
    patSvg.innerHTML = `<path d="${d}" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.85"/>`;
  }
  function dotAt(x,y){
    for (let i=0;i<patDots.length;i++){
      const r = patDots[i].getBoundingClientRect();
      if (x >= r.left-14 && x <= r.right+14 && y >= r.top-14 && y <= r.bottom+14) return i;
    }
    return -1;
  }
  function submitPattern(){
    if (state.pattern.length >= DEMO.patternMinLen){
      $("#patternHint").textContent = "Verifying…";
      setTimeout(()=>{
        if (state.pattern.length >= DEMO.patternMinLen) onAuthSuccess();
        else patternFail();
      }, 500);
    } else patternFail();
  }
  function patternFail(){
    patDots.forEach(d=>d.classList.add("error"));
    const path = patSvg.querySelector("path");
    if (path) path.setAttribute("stroke","var(--error)");
    $("#patternError").classList.add("show");
    $("#patternHint").textContent = "Pattern too short";
    setTimeout(clearPattern, 800);
  }

  function scanFingerprint(){
    const btn = $("#fpBtn");
    if (btn.classList.contains("scanning")) return;
    btn.classList.add("scanning");
    $("#fpLabel").textContent = "Scanning…";
    $("#fpError").classList.remove("show");
    setTimeout(()=>{
      btn.classList.remove("scanning");
      btn.classList.add("success");
      $("#fpLabel").textContent = "Identity verified";
      setTimeout(()=>{ btn.classList.remove("success"); onAuthSuccess(); }, 480);
    }, 1200);
  }

  function submitQuestion(){
    if (state.authStatus === "loading") return;
    const u = user();
    const val = $("#qInput").value.trim().toLowerCase();
    if (!val){ flashError($("#qField"), $("#qError"), "Enter an answer."); return; }
    setBtnLoading($("#qSubmit"), true);
    setTimeout(()=>{
      setBtnLoading($("#qSubmit"), false);
      if (val === (u.answer || "").toLowerCase()) onAuthSuccess();
      else flashError($("#qField"), $("#qError"), "Incorrect answer.");
    }, 850);
  }

  function closeAllPops(){
    $$(".popover.open").forEach(p => p.classList.remove("open"));
    $("#sessionBtn").classList.remove("active");
    state.openPop = null;
  }
  function openPop(name, anchorEl){
    closeAllPops();
    const pop = $("#pop-" + name);
    if (!pop) return;
    state.openPop = name;
    if (name === "session") $("#sessionBtn").classList.add("active");
    pop.style.visibility = "hidden";
    pop.classList.add("open");
    requestAnimationFrame(()=>{
      const pr = pop.getBoundingClientRect();
      const ar = anchorEl.getBoundingClientRect();
      let left, top;
      if (name === "power"){
        left = ar.right - pr.width;
        left = Math.max(16, Math.min(left, window.innerWidth - pr.width - 16));
        top = ar.top - pr.height - 12;
        if (top < 12) top = ar.bottom + 12;
      } else {
        left = ar.left;
        left = Math.max(16, Math.min(left, window.innerWidth - pr.width - 16));
        top = ar.top - pr.height - 12;
        if (top < 12) top = ar.bottom + 12;
      }
      pop.style.left = left + "px";
      pop.style.top = top + "px";
      pop.style.visibility = "visible";
    });
  }
  function togglePop(name, anchorEl){
    if (state.openPop === name) closeAllPops();
    else openPop(name, anchorEl);
  }

  function buildAvatarGrid(){
    const grid = $("#avatarGrid");
    grid.innerHTML = "";
    USERS.forEach((u, i) => {
      const btn = document.createElement("button");
      btn.className = "grid-avatar" + (i === state.userIndex ? " selected" : "");
      btn.setAttribute("aria-label", u.name);
      btn.innerHTML = `<img src="${u.img}" alt="${u.name}" onerror="this.style.background='linear-gradient(135deg,var(--accent),var(--accent-press))';this.removeAttribute('src')"/>`;
      btn.addEventListener("click", () => {
        selectUser(i);
        closeDrawer();
      });
      grid.appendChild(btn);
    });
  }
  function openDrawer(){
    state.drawerOpen = true;
    $("#userBox").classList.add("drawer-open");
  }
  function closeDrawer(){
    state.drawerOpen = false;
    $("#userBox").classList.remove("drawer-open");
  }
  function toggleDrawer(){
    if (state.drawerOpen) closeDrawer();
    else openDrawer();
  }

  function selectUser(index){
    state.userIndex = index;
    state.pin = "";
    state.pattern = [];
    state.authStatus = "idle";
    $("#pwInput").value = "";
    $("#userInput").value = "";
    $("#qInput").value = "";
    clearErrors();
    renderIdentity();
    updateAuthChrome();
    buildAvatarGrid();
    closeAllPops();
    setTimeout(()=>{
      if (state.method === "password") $("#pwInput").focus();
      else if (state.method === "question") $("#qInput").focus();
    }, 200);
  }

  function buildSessionList(){
    const wrap = $("#sessionList");
    wrap.innerHTML = "";
    SESSIONS.forEach(s=>{
      const b = document.createElement("button");
      b.className = "pop-item" + (s.id === state.session ? " selected" : "");
      b.dataset.session = s.id;
      b.innerHTML = `
        <span class="session-logo">${s.logo}</span>
        <span><span>${s.name}</span><span class="session-desc">${s.desc}</span></span>
        <i data-lucide="check" class="pop-check" style="opacity:${s.id===state.session?1:0}"></i>`;
      b.addEventListener("click", ()=>{
        state.session = s.id;
        renderSession();
        closeAllPops();
      });
      wrap.appendChild(b);
    });
    refreshIcons();
  }

  const dialog = $("#dialog"), scrim = $("#scrim");
  function openDialog(action){
    const titles = {
      shutdown:["Shut down?","This will close all running sessions and power off the device. Any unsaved work will be lost.","Shut down","power"],
      restart:  ["Restart?","The system will reboot. Any unsaved work will be lost.","Restart","rotate-cw"],
      suspend:  ["Suspend?","The system will enter sleep mode and can be resumed with a key press.","Suspend","moon"]
    };
    const [title,body,confirm,icon] = titles[action] || titles.shutdown;
    $("#dlgTitle").textContent = title;
    $("#dlgBody").textContent = body;
    $("#dlgConfirm").textContent = confirm;
    state.powerAction = action;
    const di = $("#dlgIcon");
    di.innerHTML = `<i data-lucide="${icon}"></i>`;
    refreshIcons();
    di.style.background = action === "shutdown" ? "var(--error-soft)" : "var(--accent-soft)";
    di.style.color = action === "shutdown" ? "var(--error)" : "var(--accent)";
    const conf = $("#dlgConfirm");
    conf.className = "btn " + (action === "shutdown" ? "btn-danger" : "btn-primary");
    closeAllPops();
    scrim.classList.add("open");
    dialog.classList.add("open");
  }
  function closeDialog(){
    scrim.classList.remove("open");
    dialog.classList.remove("open");
    state.powerAction = null;
  }
  function confirmPower(){
    const action = state.powerAction || "shutdown";
    closeDialog();
    const titles = { shutdown:"Shutting down", restart:"Restarting", suspend:"Suspending" };
    const subs = {
      shutdown:"It is now safe to power off the device.",
      restart:"The system is restarting…",
      suspend:"System suspended. Press any key to resume."
    };
    $("#powerTitle").textContent = titles[action];
    $("#powerSub").textContent = subs[action];
    $("#powerIcon").innerHTML = `<i data-lucide="${action==='suspend'?'moon':action==='restart'?'rotate-cw':'power'}"></i>`;
    refreshIcons();
    $("#powerOverlay").classList.add("show");
  }

  function setTheme(t){
    state.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    swapIcon("#themeBtn", t === "dark" ? "sun-moon" : "sun");
  }

  function wire(){
    const img = new Image();
    img.onload = ()=>{ $("#wallImg").classList.add("loaded"); };
    img.onerror = ()=>{};
    img.src = WALLPAPER_URL;

    $("#themeBtn").addEventListener("click", ()=> setTheme(state.theme === "dark" ? "light" : "dark"));

    $("#drawerBtn").addEventListener("click", e=>{
      e.stopPropagation();
      toggleDrawer();
    });

    $$(".method-tab").forEach(t => t.addEventListener("click", ()=> {
      if (!state.multiStep.active) setMethod(t.dataset.method);
    }));

    $("#pwForm").addEventListener("submit", submitPassword);
    let pwShown = false;
    $("#pwEye").addEventListener("click", ()=>{
      pwShown = !pwShown;
      $("#pwInput").type = pwShown ? "text" : "password";
      swapIcon("#pwEye", pwShown ? "eye-off" : "eye");
    });
    $("#pwInput").addEventListener("input", ()=>{
      $("#pwField").classList.remove("error");
      $("#pwError").classList.remove("show");
    });
    $("#userInput").addEventListener("input", ()=>{
      $("#pwField").classList.remove("error");
      $("#pwError").classList.remove("show");
    });
    $("#userInput").addEventListener("keydown", e=>{
      if (e.key === "Enter"){ e.preventDefault(); $("#pwInput").focus(); }
    });

    $$("#pinPad .pin-key").forEach(k => k.addEventListener("click", ()=> pinPress(k.dataset.k)));

    patCanvas.addEventListener("pointerdown", e=>{
      if (state.authStatus==="loading") return;
      clearPattern();
      state.patternDrawing = true;
      patCanvas.setPointerCapture(e.pointerId);
      const i = dotAt(e.clientX, e.clientY);
      if (i>=0) addPatternDot(i);
    });
    patCanvas.addEventListener("pointermove", e=>{
      if (!state.patternDrawing) return;
      const i = dotAt(e.clientX, e.clientY);
      if (i>=0) addPatternDot(i);
    });
    function endPattern(){
      if (!state.patternDrawing) return;
      state.patternDrawing = false;
      submitPattern();
    }
    patCanvas.addEventListener("pointerup", endPattern);
    patCanvas.addEventListener("pointercancel", endPattern);

    $("#fpBtn").addEventListener("click", scanFingerprint);

    $("#qSubmit").addEventListener("click", submitQuestion);
    $("#qInput").addEventListener("keydown", e=>{
      if (e.key === "Enter"){ e.preventDefault(); submitQuestion(); }
    });
    $("#qInput").addEventListener("input", ()=>{
      $("#qField").classList.remove("error");
      $("#qError").classList.remove("show");
    });

    $("#sessionBtn").addEventListener("click", e=>{ e.stopPropagation(); togglePop("session", $("#sessionBtn")); });
    $("#netBtn").addEventListener("click", e=>{ e.stopPropagation(); togglePop("network", $("#netBtn")); });
    $("#volBtn").addEventListener("click", e=>{ e.stopPropagation(); togglePop("volume", $("#volBtn")); });
    $("#powerBtn").addEventListener("click", e=>{ e.stopPropagation(); togglePop("power", $("#powerBtn")); });

    $("#volToggle").addEventListener("click", ()=>{
      state.volume.muted = !state.volume.muted;
      renderVolume();
    });
    $("#volSlider").addEventListener("input", e=>{
      state.volume.level = parseInt(e.target.value, 10);
      if (state.volume.level > 0) state.volume.muted = false;
      renderVolume();
    });

    $$("#pop-power [data-power]").forEach(b => b.addEventListener("click", ()=> openDialog(b.dataset.power)));
    $("#lockBtn").addEventListener("click", ()=>{
      closeAllPops();
      $("#powerTitle").textContent = "Locking";
      $("#powerSub").textContent = "Screen locked.";
      $("#powerIcon").innerHTML = `<i data-lucide="lock-keyhole"></i>`;
      refreshIcons();
      $("#powerOverlay").classList.add("show");
    });
    $("#aboutBtn").addEventListener("click", ()=>{
      closeAllPops();
      $("#successTitle").textContent = "Aether Greeter";
      $("#successSub").textContent = "Custom Wayland display manager · v1.7 · mock environment";
      $("#successIcon").innerHTML = `<i data-lucide="info"></i>`;
      refreshIcons();
      $("#successOverlay").classList.add("show");
    });

    $("#dlgCancel").addEventListener("click", closeDialog);
    $("#dlgConfirm").addEventListener("click", confirmPower);
    scrim.addEventListener("click", closeDialog);

    $("#successBack").addEventListener("click", returnToGreeter);
    $("#powerBack").addEventListener("click", returnToGreeter);

    document.addEventListener("click", e=>{
      const t = e.target;
      if (state.drawerOpen && !t.closest(".drawer-panel") && !t.closest(".drawer-btn")){
        closeDrawer();
      }
      if (!state.openPop) return;
      if (t.closest(".popover") || t.closest("[data-pop]")) return;
      closeAllPops();
    });

    document.addEventListener("keydown", e=>{
      if (e.key === "Escape"){
        if (dialog.classList.contains("open")){ closeDialog(); return; }
        if (state.drawerOpen){ closeDrawer(); return; }
        if (state.openPop){ closeAllPops(); return; }
      }
    });

    window.addEventListener("resize", ()=>{
      if (state.openPop) closeAllPops();
      if (state.drawerOpen) closeDrawer();
      if (state.method === "pattern") buildPattern();
    });
  }

  function init(){
    refreshIcons();
    renderAll();
    buildAvatarGrid();
    buildSessionList();
    updateAuthChrome();
    wire();
    setTimeout(()=>{ $("#pwInput").focus(); }, 400);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
```

### Bullet summary

**Constants / data**
- `WALLPAPER_URL` — Unsplash photo URL (also referenced in the `.wallpaper-img` CSS); preloaded by an `Image()` so the `.loaded` class can fade it in.
- `DEMO` — `{ password:"demo", pin:"1234", patternMinLen:4 }` accepted credentials / pattern minimum.
- `SESSIONS` — Array of 6 desktop sessions (`hyprland`, `kde`, `gnome`, `sway`, `xfce`, `custom`); each carries `id`, `name`, `desc`, and an inline SVG `logo` used in the session popover.
- `USERS` — Array of 6 demo users (`Aria Voss`, `Kenji Sato`, `Mira Sol`, `Devon Hart`, `Yuki Tanaka`, `Sage Lin`) with pravatar.cc avatars and a per-user `auth` strategy (`password`, `pin`, `pattern`, `question`, or `multi-step`), optional `pw`, `requiresUsername`, `question`/`answer`, or a `steps[]` array.

**State variables (single `state` object)**
- `userIndex`, `method` (current auth method), `authStatus` (`idle|loading|success`).
- `multiStep` = `{ active, current, total }` for users with chained steps.
- `session`, `theme` (`dark|light`), `openPop` (which popover is open), `drawerOpen`, `powerAction`.
- `net` = `{ name, online }`, `battery` = `{ level, charging }`, `volume` = `{ level, muted }`.
- `pin` (entered PIN string), `pattern` (selected dot-index array), `patternDrawing` (boolean).

**Helpers**
- `$` / `$$` — scoped `querySelector` / `Array.from(querySelectorAll)`.
- `user()` / `session()` — current user / session object lookups.
- `refreshIcons()` — re-runs `lucide.createIcons()` after dynamic `<i data-lucide>` insertions.
- `swapIcon(el, name)` — Replaces an existing icon element (svg or `[data-lucide]`) with a new `<i data-lucide="…">`, preserving non-`lucide` classes, then `refreshIcons()`.

**Render functions**
- `renderIdentity()` — Sets the avatar `src` (with `onerror` fallback gradient), `#userName`, `#userHandle`.
- `renderSession()` — Updates `#sessionVal` and toggles `.selected` + check opacity on the session list items.
- `renderVolume()` — Picks `volume-x`/`volume-1`/`volume-2` icon, swaps it on both `#volBtn` and `#volToggle`, updates `#volText`/`#volTip`/`#volSlider`/`#volValue`, toggles `.muted` on the toggle.
- `renderBattery()` — Sets `#batFill` width, `#batText`, and `#batTip` (charging vs remaining).
- `renderNetwork()` — Sets `#netText` to the SSID.
- `renderAll()` — Calls all five renderers in order.

**Auth flow control**
- `updateAuthChrome()` — Detects `multi-step` users, hides/shows method tabs vs step indicator, toggles the username sub-input (`requiresUsername`), swaps the password field's lead icon (`user-round` vs `lock`), then `renderStep()` or `setMethod(u.auth)`, then `updateDemoHints()`.
- `setMethod(m)` — Sets `state.method`, toggles `.active` on the matching tab and panel, calls `clearErrors()`, and (for pattern) schedules `buildPattern()` after 50 ms.
- `clearErrors()` — Strips `.error`/`.show` from every field, error message, and pin dots.
- `stepLabel(type)` — Maps a step type to a display label.
- `renderStep()` — Updates `#stepLabel` ("Step X of Y · Type") and rebuilds `#stepDots` (active + completed dots), then `setMethod(step.type)` + `updateDemoHints()`.
- `advanceStep()` — Resets the just-completed step's input (password/PIN/pattern/question), increments `multiStep.current`, and `renderStep()`.
- `onAuthSuccess()` — Either `advanceStep()` (after a 450 ms delay) when more steps remain, or `showSuccess()` for the final success.
- `updateDemoHints()` — Writes the demo hint for every method (`demo: …`), and either shows the user's `question`/`answer` in `#questionText`/`#qHint` or a "no question set" fallback.
- `setBtnLoading(btn, on)` — Toggles `.loading` + `disabled` on a primary button and sets `state.authStatus` accordingly.
- `showSuccess()` — Fills `#successTitle`/`#successSub`/`#successIcon` and adds `.show` to the success overlay.
- `returnToGreeter()` — Removes `.show` from both overlays, resets `authStatus`/`multiStep.current`, re-renders the current step if multi-step, clears every input + pin + pattern + errors.
- `flashError(fieldEl, msgEl, msg)` — Adds `.error` to the field, sets the message text + `.show`, then strips `.error` after 420 ms.

**Per-method handlers**
- `submitPassword(e)` — Validates username (if required) and password presence, sets the submit button loading, then after 850 ms compares against the user's `pw` (or the step's `pw` if multi-step) and either calls `onAuthSuccess()` or `flashError()`.
- `renderPin()` — Toggles `.filled` on the four pin dots based on `state.pin.length`.
- `pinError(msg)` — Adds `.error` to all dots + shows the message, then auto-clears after 700 ms.
- `pinPress(k)` — Handles `clear` (reset), `enter` (submit), or appends a digit (max 4, auto-submits at length 4 after 160 ms).
- `submitPin()` — Marks the enter button loading, then after 700 ms either succeeds (PIN = "1234") or `pinError()`.
- Pattern: `buildPattern()` lays out a 3×3 grid of `.pattern-dot` elements positioned by canvas size; `clearPattern()` resets state + visuals + hint; `addPatternDot(idx)` pushes a unique index, marks `.active`, redraws lines, updates the count hint; `drawPatternLines()` renders an SVG `<path>` through the selected dots; `dotAt(x,y)` hit-tests pointer coords against dots (with 14 px slack); `submitPattern()` accepts ≥ 4 dots (waits 500 ms then `onAuthSuccess()`) or `patternFail()` (errors all dots + path, resets after 800 ms).
- `scanFingerprint()` — Adds `.scanning` + "Scanning…" label for 1200 ms, then `.success` + "Identity verified" for 480 ms, then `onAuthSuccess()`.
- `submitQuestion()` — Validates presence, sets the submit button loading, then after 850 ms compares the lowercased answer against `u.answer` and either `onAuthSuccess()` or `flashError()`.

**Popover management**
- `closeAllPops()` — Removes `.open` from every popover, removes `.active` from the session button, clears `state.openPop`.
- `openPop(name, anchor)` — Closes others, marks `state.openPop`, anchors the popover above (or below if too close to top) the trigger using `requestAnimationFrame` measurements, with special bottom-right anchoring for the power popover.
- `togglePop(name, anchor)` — Closes if already open, otherwise opens.

**Drawer / user switching**
- `buildAvatarGrid()` — Renders one `.grid-avatar` button per user (with `onerror` gradient fallback), `.selected` on the current user, click → `selectUser(i)` + `closeDrawer()`.
- `openDrawer()` / `closeDrawer()` / `toggleDrawer()` — Toggles `.drawer-open` on `#userBox`.
- `selectUser(index)` — Resets `userIndex` + all inputs + pin + pattern + errors, re-renders identity + auth chrome + avatar grid, closes popovers, and focuses the appropriate input after 200 ms.

**Session list**
- `buildSessionList()` — Builds one `.pop-item` per session with logo + name + desc + check icon, click → updates `state.session`, `renderSession()`, `closeAllPops()`.

**Dialog / power**
- `openDialog(action)` — Looks up title/body/confirm-label/icon for `shutdown`/`restart`/`suspend`, sets `state.powerAction`, recolors `#dlgIcon`/`#dlgConfirm` (danger vs primary), closes popovers, opens scrim + dialog.
- `closeDialog()` — Removes `.open` from scrim + dialog, clears `state.powerAction`.
- `confirmPower()` — Closes the dialog, sets `#powerTitle`/`#powerSub`/`#powerIcon` for the chosen action, and shows the power overlay.

**Theme**
- `setTheme(t)` — Sets `state.theme`, toggles `data-theme` on `<html>`, swaps the theme button icon (`sun-moon` for dark, `sun` for light).

**Event wiring (`wire()`)**
- Wallpaper: creates an `Image()`, on load adds `.loaded` to `#wallImg`.
- `#themeBtn` click → toggle theme.
- `#drawerBtn` click (stopPropagation) → `toggleDrawer()`.
- Each `.method-tab` click → `setMethod(t.dataset.method)` unless multi-step is active.
- `#pwForm` submit → `submitPassword`; `#pwEye` click toggles password visibility + swaps eye/eye-off icon; `#pwInput` + `#userInput` `input` clears field error; `#userInput` `Enter` focuses the password input.
- Each `.pin-key` click → `pinPress(k.dataset.k)`.
- `#patternCanvas` `pointerdown` → clears pattern, starts drawing, captures pointer, adds first dot; `pointermove` → adds dots as the pointer hits them; `pointerup`/`pointercancel` → `endPattern()` → `submitPattern()`.
- `#fpBtn` click → `scanFingerprint()`.
- `#qSubmit` click → `submitQuestion()`; `#qInput` `Enter` → submit; `#qInput` `input` → clear field error.
- `#sessionBtn` / `#netBtn` / `#volBtn` / `#powerBtn` click (stopPropagation) → `togglePop(…, anchor)`.
- `#volToggle` click → mute toggle + re-render; `#volSlider` `input` → set level, auto-unmute at > 0, re-render.
- Each `#pop-power [data-power]` click → `openDialog(action)`; `#lockBtn` click → closes popovers and shows the power overlay in a "Locking" state; `#aboutBtn` click → shows the success overlay repurposed as an "About" panel ("Aether Greeter · v1.7 · mock environment").
- `#dlgCancel` / `#dlgConfirm` / scrim click → `closeDialog()` / `confirmPower()` / `closeDialog()`.
- `#successBack` / `#powerBack` click → `returnToGreeter()`.
- Document `click` → closes drawer if the click is outside the drawer panel/btn; closes popovers if the click is outside any popover/`[data-pop]`.
- Document `keydown` Escape → close dialog (if open), else drawer (if open), else popovers (if any).
- Window `resize` → closes any open popover + drawer, and rebuilds the pattern grid if pattern is the active method.

**Init**
- `init()` (run on `DOMContentLoaded`) → `refreshIcons()`, `renderAll()`, `buildAvatarGrid()`, `buildSessionList()`, `updateAuthChrome()`, `wire()`, then focuses `#pwInput` after 400 ms.

**Interactions / animations recap**
- Wallpaper cross-fade on `Image` load; `fadeUp` panel entrance on method switch; `shake` on field errors; `spin` spinner on primary buttons; pin dot fill transitions + `.error` flash; pattern dot `.active`/`.error` transitions + live SVG polyline; fingerprint `pulse` + `ripple` during scanning and `.success` color flip; step dot `.active`/`.completed` transitions; drawer chevron 180° rotation; popover opacity + transform open; dialog scale-in; staggered overlay icon → title → sub → back reveal (0 / 0.08 s / 0.16 s / 0.24 s); avatar hover scale + accent ring; tooltip hover reveal; theme token swap via `data-theme`.

**Data recap**
- 6 sessions (Hyprland, KDE Plasma, GNOME, Sway, Xfce, Custom Wayland) with inline SVG logos.
- 6 demo users with pravatar.cc avatars and varied auth strategies (one multi-step user with a password + pattern sequence).
- Demo credentials surfaced through the `.demo-hint` lines: password = `demo`, PIN = `1234`, any 4+ pattern dots, tap-to-scan fingerprint, and per-user `answer` shown verbatim in the question hint.
- No live clock — this greeter screen does not display a clock.
