/**
 * widget-drag.js — pointer-based widget drag coordinated via the event bus.
 *
 * NO floating ghost — the drag just emits `widget.dragmove`{x,y,id,from} on each
 * pointermove and `widget.dragend`{x,y,id,from} on pointerup. Container drop-zones
 * (bar slot, desktop) hit-test the pointer + show their OWN preview (e.g. the bar
 * shows an in-flow preview item that slides between dock items).
 */
import { bus } from './event-bus.js';

let active = null;

/** Start dragging widget `id` from container `from` ('palette' | 'bar' | 'desktop'). */
export function startWidgetDrag(widgetId, from) {
  // force-clear any stale drag (e.g. a prior drag whose pointerup was missed)
  if (active) active = null;
  active = { widgetId, from };

  const move = (e) => {
    bus.emit('widget.dragmove', { x: e.clientX, y: e.clientY, id: widgetId, from });
  };
  const up = (e) => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    bus.emit('widget.dragend', { x: e.clientX, y: e.clientY, id: widgetId, from });
    active = null;
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

export function isWidgetDragging() { return !!active; }
