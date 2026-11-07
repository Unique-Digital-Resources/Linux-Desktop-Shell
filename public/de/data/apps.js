/**
 * apps.js — the application registry for the desktop.
 *
 * Maps an appId → { id, name, icon (lucide kebab), component (custom-element tag),
 * category, exec?, titlebar? }. This is the single source of truth for
 * "what can be launched".
 *
 * The dock + launcher read this list. window.open(appId) resolves the component
 * tag and instantiates it inside a <de-app-window>.
 *
 * `titlebar` (default true) lets each app decide whether its window shows the
 * chrome titlebar. Apps that provide their own top bar (e.g. the file explorer,
 * whose tab strip acts as the titlebar) set `titlebar: false`; the windowing
 * system then floats the window controls at the top-right corner instead.
 */
export const APPS = [
  {
    id: 'files',
    name: 'Files',
    icon: 'folder',
    component: 'fe-app',
    category: 'System',
    exec: true, // actually opens a real app
    titlebar: false, // the file explorer has its own tab strip as the top bar
  },
  {
    id: 'terminal',
    name: 'Terminal',
    icon: 'square-terminal',
    component: 'de-placeholder-app',
    category: 'System',
    exec: true,
  },
  {
    id: 'code',
    name: 'Editor',
    icon: 'code',
    component: 'de-placeholder-app',
    category: 'Development',
    exec: true,
  },
  {
    id: 'firefox',
    name: 'Firefox',
    icon: 'globe',
    component: 'de-placeholder-app',
    category: 'Internet',
    exec: true,
    badge: true, // dock shows an indicator ring
  },
  {
    id: 'writer',
    name: 'Writer',
    icon: 'file-text',
    component: 'de-placeholder-app',
    category: 'Office',
    exec: true,
  },
  {
    id: 'calc',
    name: 'Calc',
    icon: 'table',
    component: 'de-placeholder-app',
    category: 'Office',
    exec: true,
  },
  {
    id: 'impress',
    name: 'Impress',
    icon: 'presentation',
    component: 'de-placeholder-app',
    category: 'Office',
    exec: true,
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    icon: 'book',
    component: 'de-placeholder-app',
    category: 'Notes',
    exec: true,
  },
  {
    id: 'inkscape',
    name: 'Inkscape',
    icon: 'pen-tool',
    component: 'de-placeholder-app',
    category: 'Graphics',
    exec: true,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    icon: 'music',
    component: 'de-placeholder-app',
    category: 'Media',
    exec: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: 'message-circle',
    component: 'de-placeholder-app',
    category: 'Internet',
    exec: true,
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: 'settings',
    component: 'de-placeholder-app',
    category: 'System',
    exec: true,
  },
  {
    id: 'text_editor',
    name: 'Text Editor',
    icon: 'file-pen',
    component: 'de-placeholder-app',
    category: 'Accessories',
    exec: true,
  },
];

const byId = new Map(APPS.map((a) => [a.id, a]));

export function getApp(id) { return byId.get(id); }
export function listApps() { return APPS.slice(); }
export function appsByCategory() {
  const m = new Map();
  for (const a of APPS) {
    if (!m.has(a.category)) m.set(a.category, []);
    m.get(a.category).push(a);
  }
  return Array.from(m.entries());
}

export default APPS;
