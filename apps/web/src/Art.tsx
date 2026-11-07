import { registry, type ComponentDefinition } from '@pin-thirteen/registry';
import { UNO_SVG } from './art/generated';

function BoardArt({ definition }: { definition: ComponentDefinition }) {
  const holes = definition.pins
    .map((p) => `M${p.position.x - 2.2} ${p.position.y - 2.2}h4.4v4.4h-4.4z`)
    .join('');
  return (
    <>
      <rect x="6" y="7" width="903" height="190" fill="#1b1915" />
      <rect className="ink" x="1" y="1" width="903" height="190" fill="#fbf6e8" />
      <rect x="4" y="94" width="897" height="8" fill="#e1d397" stroke="#1b1915" strokeWidth="1.6" />
      <path stroke="#ffd179" strokeWidth="3" d="M14 8H890M14 170H890" />
      <path stroke="#acd5ff" strokeWidth="3" d="M14 34H890M14 182H890" />
      {/* One path for all holes: hit-testing is arithmetic, so no per-hole nodes are needed. */}
      <path d={holes} fill="#1b1915" />
      {[1, 10, 20, 30, 40, 50, 60].map((n) => (
        <text key={n} className="pin-label" x={30 + (n - 1) * 13.6} y="40" textAnchor="middle">
          {n}
        </text>
      ))}
    </>
  );
}

const SEGMENTS: Record<string, string> = {
  a: 'M-12 -30h24l-4 5h-16z',
  b: 'M13 -29v24l-5 -3v-17z',
  c: 'M13 -3v24l-5 -4v-17z',
  d: 'M-12 22h24l-4 -5h-16z',
  e: 'M-13 -3v24l5 -4v-17z',
  f: 'M-13 -29v24l5 -3v-17z',
  g: 'M-12 -4h24l-4 4h-16z',
};

function SevenSegment({ definition, lit }: { definition: ComponentDefinition; lit?: string[] }) {
  return (
    <>
      <rect className="ink" x="-22" y="-38" width="44" height="70" fill="#1b1915" />
      {Object.entries(SEGMENTS).map(([id, d]) => (
        <path key={id} d={d} data-segment={id} fill={lit?.includes(id) ? '#ffee9a' : '#38342c'} />
      ))}
      {definition.pins.map((p) => (
        <path
          key={p.id}
          className="ink"
          d={`M${p.position.x} 32V${p.position.y}`}
          strokeWidth="2.4"
        />
      ))}
    </>
  );
}

/** Interim cut-paper module art, shared until each part gets its own illustration. */
function ModuleArt({ definition }: { definition: ComponentDefinition }) {
  const xs = definition.pins.map((p) => p.position.x);
  const left = Math.min(...xs) - 16;
  const width = Math.max(...xs) + 16 - left;
  return (
    <>
      {definition.pins.map((p) => (
        <path
          key={p.id}
          className="ink"
          d={`M${p.position.x} 12V${p.position.y}`}
          fill="none"
          strokeWidth="3"
        />
      ))}
      <rect
        className="ink"
        x={left}
        y="-30"
        width={Math.max(width, 66)}
        height="44"
        fill="#acd5ff"
      />
      <text className="pin-tag" x={left + 6} y="-12">
        {definition.identifier}
      </text>
      {definition.pins.map((p) => (
        <text key={p.id} className="pin-label" x={p.position.x} y="8" textAnchor="middle">
          {p.label}
        </text>
      ))}
    </>
  );
}

export function Art({ definition, lit }: { definition: ComponentDefinition; lit?: string[] }) {
  if (definition.art === 'breadboard-830') return <BoardArt definition={definition} />;
  if (definition.art === 'uno-r3') {
    return (
      <>
        <g dangerouslySetInnerHTML={{ __html: UNO_SVG }} />
        {definition.pins.map((pin) => {
          const top = pin.position.y < 100;
          return (
            <g key={pin.id}>
              <rect
                x={pin.position.x - 2.5}
                y={pin.position.y - 2.5}
                width="5"
                height="5"
                fill="#e1d397"
              />
              <text
                className="pin-label"
                textAnchor={top ? 'end' : 'start'}
                transform={`translate(${pin.position.x + 2.5} ${pin.position.y + (top ? 16 : -16)}) rotate(-90)`}
              >
                {pin.label}
              </text>
            </g>
          );
        })}
      </>
    );
  }
  if (definition.art === 'potentiometer') {
    return (
      <>
        <path className="ink" d="M-13.6 14V34M0 14V34M13.6 14V34" fill="none" strokeWidth="3.2" />
        <rect className="ink" x="-22" y="-22" width="44" height="38" fill="#acd5ff" />
        <circle className="ink" cy="-4" r="15" fill="#fbf6e8" />
        <path className="ink" d="M0 -4V-17" strokeWidth="3.4" />
      </>
    );
  }
  if (definition.art === 'seven-segment') return <SevenSegment definition={definition} lit={lit} />;
  if (definition.art === 'module') return <ModuleArt definition={definition} />;
  if (definition.art === 'hc-sr04') return <use href="#d-sonic" />;
  if (definition.art === 'servo') return <use href="#d-servo" />;
  const href = { 'led-5mm': '#d-led', resistor: '#d-res', 'push-button': '#d-btn' }[definition.art];
  return <use href={href} />;
}

export const nameOf = (type: string) => registry.get(type)?.name ?? type;
