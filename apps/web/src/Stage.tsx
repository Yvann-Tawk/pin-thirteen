import {
  buildNetlist,
  pinKey,
  type CircuitDocument,
  type Point,
  type Wire,
} from '@pin-thirteen/circuit-core';
import { findPinAt, pinPosition, registry, type PinHit } from '@pin-thirteen/registry';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Art } from './Art';
import { BACKDROP_SVG } from './art/generated';
import { useApp, WIRE_COLOURS } from './store';

type Gesture =
  | { kind: 'drag'; id: string; start: Point; moved: boolean; origin: Point }
  | { kind: 'pan'; start: Point; origin: Point };

const curve = (a: Point, b: Point) => {
  const sag = Math.min(60, 18 + Math.hypot(a.x - b.x, a.y - b.y) / 6);
  return `M${a.x} ${a.y}C${a.x} ${a.y - sag} ${b.x} ${b.y - sag} ${b.x} ${b.y}`;
};

/** Applies an in-progress drag without touching the document or the undo history. */
function preview(doc: CircuitDocument, id: string | null, dx: number, dy: number): CircuitDocument {
  if (!id) return doc;
  return {
    ...doc,
    components: doc.components.map((c) =>
      c.id === id || c.placement?.board === id
        ? { ...c, position: { x: c.position.x + dx, y: c.position.y + dy } }
        : c,
    ),
  };
}

function WirePath({ wire, doc }: { wire: Wire; doc: CircuitDocument }) {
  const selected = useApp((s) => s.selectedWire === wire.id);
  const selectWire = useApp((s) => s.selectWire);
  const a = pinPosition(doc, registry, wire.from.instance, wire.from.pin);
  const b = pinPosition(doc, registry, wire.to.instance, wire.to.pin);
  if (!a || !b) return null;
  const d = curve(a, b);
  return (
    <g data-wire={wire.id}>
      {selected && <path d={d} className="wire" stroke="#ffd179" strokeWidth="15" />}
      <path d={d} className="wire k" />
      <path d={d} className="wire c" stroke={WIRE_COLOURS[wire.style.colour]} />
      <circle cx={a.x} cy={a.y} r="4.5" fill="#1b1915" />
      <circle cx={b.x} cy={b.y} r="4.5" fill="#1b1915" />
      <path
        d={d}
        className="wire-hit"
        onPointerDown={(e) => {
          if (useApp.getState().draft) return;
          e.stopPropagation();
          selectWire(wire.id);
        }}
      />
    </g>
  );
}

export function Stage() {
  const doc = useApp((s) => s.history.present);
  const selected = useApp((s) => s.selected);
  const draft = useApp((s) => s.draft);
  const view = useApp((s) => s.view);
  const sim = useApp((s) => s.sim);
  const svg = useRef<SVGSVGElement>(null);
  const world = useRef<SVGGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const held = useRef<string | null>(null);
  const [offset, setOffset] = useState({ id: null as string | null, dx: 0, dy: 0 });
  const [hover, setHover] = useState<PinHit | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);

  const shown = useMemo(() => preview(doc, offset.id, offset.dx, offset.dy), [doc, offset]);
  const netlist = useMemo(
    () => buildNetlist(doc, (type) => registry.get(type)?.connectivity),
    [doc],
  );

  const toWorld = (clientX: number, clientY: number): Point => {
    const matrix = world.current?.getScreenCTM()?.inverse();
    const p = new DOMPoint(clientX, clientY).matrixTransform(matrix);
    return { x: p.x, y: p.y };
  };

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const screen = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        element.getScreenCTM()?.inverse(),
      );
      useApp.getState().zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, { x: screen.x, y: screen.y });
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const s = useApp.getState();
    const point = toWorld(e.clientX, e.clientY);
    const pin = findPinAt(doc, registry, point);
    if (pin) {
      s.pinClicked({ instance: pin.instance, pin: pin.pin });
      return;
    }
    const part = (e.target as Element).closest<SVGGElement>('[data-instance]');
    svg.current?.setPointerCapture(e.pointerId);
    if (part) {
      const id = part.dataset.instance!;
      s.select(id);
      if (s.running && registry.get(part.dataset.part ?? '')?.interaction?.kind === 'press') {
        s.press(id, true);
        held.current = id;
        return;
      }
      const c = doc.components.find((x) => x.id === id)!;
      gesture.current = { kind: 'drag', id, start: point, moved: false, origin: c.position };
      return;
    }
    s.select(null);
    s.cancelDraft();
    gesture.current = {
      kind: 'pan',
      start: { x: e.clientX, y: e.clientY },
      origin: { x: view.x, y: view.y },
    };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const g = gesture.current;
    const point = toWorld(e.clientX, e.clientY);
    if (g?.kind === 'drag') {
      const dx = point.x - g.start.x;
      const dy = point.y - g.start.y;
      if (g.moved || Math.hypot(dx, dy) > 3) {
        g.moved = true;
        setOffset({ id: g.id, dx, dy });
      }
      return;
    }
    if (g?.kind === 'pan') {
      const scale = svg.current?.getScreenCTM()?.a ?? 1;
      useApp.getState().panTo({
        x: g.origin.x + (e.clientX - g.start.x) / scale,
        y: g.origin.y + (e.clientY - g.start.y) / scale,
      });
      return;
    }
    setHover(findPinAt(doc, registry, point) ?? null);
    if (draft) setCursor(point);
  };

  const onPointerUp = () => {
    if (held.current) useApp.getState().press(held.current, false);
    held.current = null;
    const g = gesture.current;
    gesture.current = null;
    if (g?.kind === 'drag' && g.moved) {
      useApp.getState().moveTo(g.id, { x: g.origin.x + offset.dx, y: g.origin.y + offset.dy });
    }
    setOffset({ id: null, dx: 0, dy: 0 });
  };

  const draftStart = draft && pinPosition(doc, registry, draft.instance, draft.pin);
  const hoverNet = hover ? (netlist.netOf(pinKey(hover.instance, hover.pin)) ?? []) : [];

  return (
    <svg
      ref={svg}
      className={`stage${gesture.current?.kind === 'pan' ? ' panning' : ''}`}
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid slice"
      aria-label="Circuit workspace"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
    >
      <g dangerouslySetInnerHTML={{ __html: BACKDROP_SVG }} />
      <g
        ref={world}
        className="world"
        transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}
      >
        {shown.components.map((c) => {
          const definition = registry.get(c.type);
          if (!definition) return null;
          const brightness = sim?.components[c.id]?.brightness ?? 0;
          const lit =
            brightness > 0 || (definition.category === 'board' && (sim?.builtinLed ?? 0) > 0);
          const classes = [
            'part',
            lit && 'is-lit',
            definition.isBoard && 'flat',
            selected === c.id && 'sel',
            offset.id === c.id && 'dragging',
          ];
          return (
            <g
              key={c.id}
              transform={`translate(${c.position.x} ${c.position.y}) rotate(${c.rotation})`}
            >
              <g
                className={classes.filter(Boolean).join(' ')}
                data-instance={c.id}
                data-part={c.type}
                data-lit={lit ? 'true' : 'false'}
                style={
                  brightness > 0 ? ({ '--lens': 'var(--palette-4)' } as CSSProperties) : undefined
                }
                data-seated={c.placement ? Object.values(c.placement.pins).join(' ') : undefined}
                tabIndex={0}
                role="button"
                aria-label={definition.name}
                aria-pressed={selected === c.id}
                onFocus={() => useApp.getState().select(c.id)}
                onKeyDown={(e) => {
                  const s = useApp.getState();
                  const step = {
                    ArrowLeft: [-1, 0],
                    ArrowRight: [1, 0],
                    ArrowUp: [0, -1],
                    ArrowDown: [0, 1],
                  }[e.key];
                  if (step) {
                    e.preventDefault();
                    s.moveTo(c.id, {
                      x: c.position.x + step[0]! * 13.6,
                      y: c.position.y + step[1]! * 13.6,
                    });
                  }
                  if (e.key === 'r' || e.key === 'R') s.rotate(c.id);
                  if (e.key === 'Delete' || e.key === 'Backspace') s.remove(c.id);
                }}
              >
                <Art definition={definition} lit={sim?.components[c.id]?.segments} />
              </g>
            </g>
          );
        })}
        {shown.components.map((c) => {
          const brightness = sim?.components[c.id]?.brightness ?? 0;
          if (brightness <= 0) return null;
          return (
            <g
              key={c.id}
              className="glow"
              opacity={0.25 + 0.75 * brightness}
              transform={`translate(${c.position.x} ${c.position.y - 16})`}
            >
              <circle r="34" fill="#ffee9a" opacity="0.65" />
              <circle r="34" fill="url(#dots-paper)" />
            </g>
          );
        })}
        {shown.components.map((c) => {
          const readout = sim?.components[c.id]?.readout;
          if (!readout) return null;
          return (
            <g
              key={c.id}
              pointerEvents="none"
              transform={`translate(${c.position.x} ${c.position.y - 44})`}
            >
              <rect
                x="-4"
                y="-16"
                width={readout.length * 8 + 12}
                height="20"
                fill="#ffee9a"
                stroke="#1b1915"
                strokeWidth="2"
              />
              <text x="2" y="-1" className="pin-tag" data-readout={readout}>
                {readout}
              </text>
            </g>
          );
        })}
        {shown.wires.map((w) => (
          <WirePath key={w.id} wire={w} doc={shown} />
        ))}
        {draftStart && cursor && <path d={curve(draftStart, cursor)} className="wire draft" />}
        {hoverNet.slice(0, 120).map((key) => {
          const [instance, pin] = key.split(':') as [string, string];
          const p = pinPosition(doc, registry, instance, pin);
          return p && <circle key={key} cx={p.x} cy={p.y} r="4" className="net-mark" />;
        })}
        {hover && (
          <g pointerEvents="none" transform={`translate(${hover.world.x} ${hover.world.y})`}>
            <circle r="7" className="pin-ring" />
            <rect
              x="9"
              y="-24"
              width={hover.label.length * 7 + 12}
              height="18"
              fill="#fbf6e8"
              stroke="#1b1915"
              strokeWidth="2"
            />
            <text x="15" y="-11" className="pin-tag">
              {hover.label}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
