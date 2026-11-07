# Porting Guide — HTML templates → Web Components

This is the canonical pattern every component-porting agent MUST follow so the
result is visually + interactively 1-1 with the original templates while
honoring the project's architecture (web components, shadow DOM, command system).

## Goal
Turn a self-contained HTML template (`<style>` + `<body>` + `<script>`) into a
custom element (`<xxx-yyy>`) whose Shadow DOM encapsulates the verbatim CSS and
HTML, and whose logic is ported from the original `<script>`.

## File layout
Each component lives at `public/de/components/<name>.js` and is an ES module
that default-exports nothing but registers the custom element as a side effect.

## The component skeleton

```js
import { renderIcons, swapIcon } from '../core/icons.js';
import { $, $$ } from '../core/utils.js';
import { commands } from '../core/command-registry.js';

const CSS = `<style>
  /* VERBATIM CSS from the template, with the substitutions below */
</style>`;

const HTML = `<!-- VERBATIM body inner HTML from the template -->`;

class FooBar extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return; // idempotent
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = CSS + HTML;
    this._root = root;
    // wait a tick so layout is ready, then init
    requestAnimationFrame(() => this._init());
  }

  _init() {
    renderIcons(this._root);
    // ... ported original init logic, scoped to this._root
  }
}
customElements.define('foo-bar', FooBar);
```

## CSS substitutions (apply to the verbatim CSS, mechanically)

Apply these find/replace-style transformations to keep CSS 1-1 while scoping it
to the component's shadow root:

| Original (template) | Replacement (component) | Why |
|---|---|---|
| `:root {` (token block) | `:host {` | tokens cascade from the host element |
| `html, body {` (the app container reset) | `:host {` | the host IS the app container |
| `html { ... }` | `:host { ... }` | |
| `body { ... }` | `:host { ... }` | |
| `body.light { ... }` | `:host(.light) { ... }` | light-mode overrides scoped to host |
| `[data-theme="light"]` or `[data-theme="light"] :root` | `:host([data-theme="light"])` | |
| `body.light *,` selectors | `:host(.light) *` | |
| selectors starting with `body` (e.g. `body .foo`) | `.foo` (drop the `body ` prefix) | host is the implicit root |

Keep EVERYTHING ELSE verbatim — selectors, properties, values, comments, @keyframes, @media.
Do not reorder, do not "clean up", do not merge rules. Visual fidelity depends on it.

### Token inheritance note
If this component is a CHILD rendered inside `<de-shell>`'s shadow tree (e.g.
`<de-dock>`, `<de-launcher>`, etc.), it must NOT redefine the design tokens.
`<de-shell>` sets `--accent-*`, `--text-*`, `--surface-*`, etc. on its own
`:host`, and custom properties inherit through the shadow boundary to children.
So child components should INCLUDE only their own component/region CSS and OMIT
the `:root { ... }` token block entirely. The token block belongs to `<de-shell>`.

## HTML substitutions

Inject the verbatim `<body>` inner HTML into the shadow root. The ONLY changes:
- Remove any `<script>` block (logic is ported into the class).
- Remove external `<link>`/`<script src>` tags (fonts + lucide are loaded by the host page).
- Remove `onerror="..."` inline handlers on elements that reference remote URLs
  the sandbox can't reach? — KEEP them; they're harmless and part of fidelity.

## JS porting rules

The original `<script>` is an IIFE that closes over `document`. Port it into the
class, scoped to `this._root` (the shadow root). Apply these mechanical rules:

### 1. DOM queries
- `document.querySelector(sel)` → `this._root.querySelector(sel)` (or the scoped `$`)
- `document.querySelectorAll(sel)` → `this._root.querySelectorAll(sel)`
- Keep a local helper: `const $ = (s, r=this._root) => r.querySelector(s);`
  `const $$ = (s, r=this._root) => Array.from(r.querySelectorAll(s));`

### 2. Global listeners
- `document.addEventListener('click', ...)` — KEEP on document, but for the
  outside-click check use the **composed path** so it works across shadow
  boundaries:
  ```js
  document.addEventListener('click', (e) => {
    if (!e.composedPath().includes(this)) { /* outside */ }
  });
  ```
- `document.addEventListener('keydown', ...)` — keep; the handler can reference
  `this._root` for any UI queries.
- `window.addEventListener('resize', ...)` — keep.

### 3. Lucide icons
- Replace EVERY call to `lucide.createIcons()` with `renderIcons(this._root)`.
- Replace the template's `swapIcon(el, name)` helper usage: the imported
  `swapIcon(el, name)` returns a new `<i data-lucide>` placeholder; after
  calling it, run `renderIcons(this._root)` to materialize the SVG.
- The greeter/shell templates define their own `refreshIcons()` wrapper —
  reimplement it as `() => renderIcons(this._root)`.

### 4. Theme / data-theme / body.light
- `document.documentElement.setAttribute('data-theme', t)` → `this.setAttribute('data-theme', t)`
- `document.body.classList.toggle('light', ...)` → `this.classList.toggle('light', ...)`
- reading: `document.documentElement.getAttribute('data-theme')` → `this.getAttribute('data-theme')`
- reading: `document.body.classList.contains('light')` → `this.classList.contains('light')`

### 5. CSS custom property writes
- `document.documentElement.style.setProperty('--accent', ...)` → `this.style.setProperty('--accent', ...)`
- The shell's `applyTheme` writes `--accent-*` — these go on the host so they
  cascade to all children. Use `this.style.setProperty('--accent', hex)` etc.

### 6. Cross-cutting actions → commands
Wire these to the command system instead of mutating other components directly:

| Action | Command call |
|---|---|
| Greeter successful login | `commands.execute('session.login', { user, session })` |
| Greeter lock / shutdown / restart / suspend | `commands.execute('system.lock' / 'system.shutdown' / 'system.restart' / 'system.suspend')` |
| Greeter "return to greeter" after power overlay | `commands.execute('system.resume')` then re-render locally |
| Dock launcher button click | `commands.execute('ui.toggleLauncher', { anchor: btnEl })` |
| Dock quick-settings button click | `commands.execute('ui.toggleQuickSettings', { anchor: btnEl })` |
| Dock calendar/status button click | `commands.execute('ui.toggleCalendar', { anchor: btnEl })` |
| Dock / launcher app icon click | `commands.execute('window.open', { appId })` |
| App window close button | `commands.execute('window.close', { id })` (the window id is on `this.dataset.windowId`) |
| App window minimize / maximize | `commands.execute('window.minimize'/'window.toggleMaximize', { id })` |

### 7. Boot wiring
- The shell subscribes to `window-service` `onWindowsChange` and renders
  `<de-app-window data-window-id=... title=... icon=...>` for each open window,
  putting `<fe-app>` (appId 'files') or `<de-placeholder-app data-app-id=...>`
  inside the default slot.
- The shell subscribes to the `ui.popover` bus event to position+toggle its
  popover children (`<de-launcher>`, `<de-quicksettings>`, `<de-calendar>`).
- The greeter does NOT manage session transitions itself — it calls the command
  and the boot orchestrator swaps the DOM.

## Verbatim fidelity checklist (before declaring done)
- [ ] All original CSS rules present (compare rule count to the source .css).
- [ ] All original HTML elements + classes + text present.
- [ ] All original event handlers ported (click, input, keydown, pointer, drag/drop).
- [ ] All original functions ported (search, filter, render, navigate, dialog, toast...).
- [ ] Icons render as inline `<svg>` (no leftover `<i data-lucide>` visible).
- [ ] Outside-click + Escape close popovers/menus/dialogs via composedPath.
- [ ] No reference to undefined globals; `this._root` is used for all shadow queries.
- [ ] Lint: `bun run lint` must not error on your file (it's a static asset, so
      ESLint won't check it — but it must be syntactically valid JS).

## Worklog
After finishing, append a `---` section to `/home/z/my-project/worklog.md`:
```
---
Task ID: <your id>
Agent: general-purpose
Task: <what you built>

Work Log:
- <steps>

Stage Summary:
- <files produced, components registered, line counts, fidelity notes>
```
