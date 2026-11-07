/**
 * utils.js — shared helpers for the Aether web desktop.
 * Pure functions, no globals beyond `window`.
 */

/** scoped querySelector */
export const $ = (sel, root = document) => root.querySelector(sel);
/** scoped querySelectorAll → real Array */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
/** delegate helper: attach a listener to a root that matches a selector */
export const on = (root, ev, sel, handler, opts) => {
  root.addEventListener(ev, (e) => {
    const target = e.target.closest(sel);
    if (target && root.contains(target)) {
      handler(e, target);
    }
  }, opts);
};

/** escape text for safe innerHTML insertion */
export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** convert kebab-case → PascalCase (chevron-right → ChevronRight) */
export function toPascalCase(s = '') {
  return s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

/** format bytes → human readable */
export function formatSize(bytes = 0) {
  if (!bytes) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}

/** relative date (Today / Yesterday / N days ago) */
export function formatDate(d = new Date()) {
  const now = new Date();
  const day = 86400000;
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Today';
  const y = new Date(now - day);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  const diff = Math.floor((now - d) / day);
  if (diff < 30) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** clamp helper */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** random int in [min,max] */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** a tiny unique id */
let _uid = 0;
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

/** wait until window.lucide is available (CDN may load late) */
export function waitForLucide(timeout = 4000) {
  return new Promise((resolve) => {
    if (window.lucide && window.lucide.icons) return resolve(window.lucide);
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (window.lucide && window.lucide.icons) {
        clearInterval(iv);
        resolve(window.lucide);
      } else if (Date.now() - t0 > timeout) {
        clearInterval(iv);
        resolve(null);
      }
    }, 30);
  });
}
