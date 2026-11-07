/**
 * icons.js — render <i data-lucide="name"> → <svg> inside a given root.
 * Works inside Shadow DOM (lucide's own createIcons only scans document).
 *
 * lucide UMD exposes `window.lucide.icons` keyed by PascalCase; each value is
 * an array of child nodes: [[tag, attrs, children?], ...].
 */
import { toPascalCase } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BASE_ATTRS = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
};

function buildNode(node, ns) {
  const [tag, attrs, children] = node;
  const el = document.createElementNS(ns, tag);
  if (attrs && typeof attrs === 'object') {
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  }
  if (Array.isArray(children)) {
    for (const c of children) {
      if (Array.isArray(c)) el.appendChild(buildNode(c, ns));
    }
  }
  return el;
}

/**
 * Replace every <i data-lucide="..."> in `root` with an inline <svg>.
 * Preserves the original element's class list and non-lucide attributes.
 * Safe to call repeatedly (already-replaced elements are gone, so re-runs only
 * catch newly inserted <i data-lucide>).
 */
export function renderIcons(root = document) {
  const lib = window.lucide;
  if (!lib || !lib.icons) {
    root.querySelectorAll('[data-lucide]').forEach((el) => {
      if (!el.querySelector('svg')) {
        const dot = document.createElementNS(SVG_NS, 'svg');
        for (const [k, v] of Object.entries(BASE_ATTRS)) dot.setAttribute(k, String(v));
        el.appendChild(dot);
      }
    });
    return 0;
  }
  let n = 0;
  root.querySelectorAll('[data-lucide]').forEach((el) => {
    const name = el.getAttribute('data-lucide');
    if (!name) return;
    const key = toPascalCase(name);
    const node = lib.icons[key];
    if (!node) {
      if (!el.querySelector('svg')) {
        const dot = document.createElementNS(SVG_NS, 'svg');
        for (const [k, v] of Object.entries(BASE_ATTRS)) dot.setAttribute(k, String(v));
        el.appendChild(dot);
      }
      return;
    }
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (const [k, v] of Object.entries(BASE_ATTRS)) svg.setAttribute(k, String(v));
    // preserve class
    if (el.classList && el.classList.length) {
      svg.setAttribute('class', Array.from(el.classList).join(' '));
    }
    // preserve other attributes (style, aria-*, data-*, width/height override)
    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'data-lucide' || attr.name === 'class') continue;
      svg.setAttribute(attr.name, attr.value);
    }
    // append child nodes (lucide stores the inner elements array)
    const kids = Array.isArray(node) ? node : (node && node.children) || [];
    for (const c of kids) {
      if (Array.isArray(c)) svg.appendChild(buildNode(c, SVG_NS));
    }
    el.replaceWith(svg);
    n++;
  });
  return n;
}

/** Build a single lucide icon as an <svg> element (for dynamic insertion). */
export function makeIcon(kebab, className = '') {
  const lib = window.lucide;
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(BASE_ATTRS)) svg.setAttribute(k, String(v));
  if (className) svg.setAttribute('class', className);
  if (lib && lib.icons) {
    const node = lib.icons[toPascalCase(kebab)];
    if (Array.isArray(node)) {
      for (const c of node) {
        if (Array.isArray(c)) svg.appendChild(buildNode(c, SVG_NS));
      }
    }
  }
  return svg;
}

/**
 * Replace an existing icon element (svg or <i data-lucide>) with a fresh
 * <i data-lucide="kebabName"> placeholder, preserving the original element's
 * non-icon classes. Caller then runs renderIcons(root) to materialize it.
 * Returns the new placeholder element.
 */
export function swapIcon(existingEl, kebabName) {
  const newEl = document.createElement('i');
  newEl.setAttribute('data-lucide', kebabName);
  if (existingEl.classList) {
    for (const c of Array.from(existingEl.classList)) newEl.classList.add(c);
  }
  for (const attr of Array.from(existingEl.attributes || [])) {
    if (attr.name === 'class' || attr.name === 'data-lucide' || attr.name === 'd') continue;
    newEl.setAttribute(attr.name, attr.value);
  }
  existingEl.replaceWith(newEl);
  return newEl;
}
