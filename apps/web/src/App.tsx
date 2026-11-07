import { registry, type ComponentDefinition } from '@pin-thirteen/registry';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BACKDROP_SVG, DEFS_SVG, UNO_SVG } from './art/generated';
import { highlight } from './highlight';
import { useApp } from './store';

type View = 'play' | 'kit' | 'exp' | 'code' | 'set';

const CHAPTERS: { view: View; label: string; icon: ReactNode }[] = [
  {
    view: 'play',
    label: 'Play­ground',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="12" />
        <path d="M3 10H0M3 14H0M8 6V3M12 6V3M16 6V3" />
        <rect x="11" y="11" width="6" height="3" />
      </>
    ),
  },
  {
    view: 'kit',
    label: 'Compo­nents',
    icon: <path d="M7 15V8a5 5 0 0 1 10 0v7zM5 15h14M9 15v7M15 15v5" />,
  },
  { view: 'exp', label: 'Experi­ments', icon: <path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M7 15h10" /> },
  { view: 'code', label: 'Code Lab', icon: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /> },
  {
    view: 'set',
    label: 'Settings',
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2.5" />
        <circle cx="8" cy="17" r="2.5" />
      </>
    ),
  },
];

function Art({ definition }: { definition: ComponentDefinition }) {
  if (definition.art === 'uno-r3') {
    return (
      <>
        <g dangerouslySetInnerHTML={{ __html: UNO_SVG }} />
        {definition.pins.map((pin) => (
          <g key={pin.id}>
            <rect
              x={pin.position.x - 2.5}
              y={pin.position.y - 2.5}
              width="5"
              height="5"
              fill="#e1d397"
            >
              <title>{pin.id}</title>
            </rect>
            <text
              className="pin-label"
              textAnchor={pin.position.y < 100 ? 'end' : 'start'}
              transform={`translate(${pin.position.x + 2.5} ${pin.position.y + (pin.position.y < 100 ? 16 : -16)}) rotate(-90)`}
            >
              {pin.label}
            </text>
          </g>
        ))}
      </>
    );
  }
  return <use href={definition.art === 'led-5mm' ? '#d-led' : '#d-res'} />;
}

function Stage() {
  const doc = useApp((s) => s.history.present);
  const selected = useApp((s) => s.selected);
  const select = useApp((s) => s.select);
  const remove = useApp((s) => s.remove);
  return (
    <svg
      className="stage"
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid slice"
      aria-label="Circuit workspace"
      onClick={() => select(null)}
    >
      <g dangerouslySetInnerHTML={{ __html: BACKDROP_SVG }} />
      {doc.components.map((c) => {
        const definition = registry.get(c.type);
        if (!definition) return null;
        return (
          <g
            key={c.id}
            transform={`translate(${c.position.x} ${c.position.y}) rotate(${c.rotation})`}
          >
            <g
              className={`part${selected === c.id ? ' sel' : ''}`}
              data-part={c.type}
              tabIndex={0}
              role="button"
              aria-label={definition.name}
              aria-pressed={selected === c.id}
              onClick={(e) => {
                e.stopPropagation();
                select(c.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select(c.id);
                }
                if (e.key === 'Delete' || e.key === 'Backspace') remove(c.id);
              }}
            >
              <Art definition={definition} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function Toolbar() {
  const s = useApp();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="toolbar" role="toolbar" aria-label="Project tools">
      <button className="tool" disabled={!s.history.past.length} onClick={s.undo}>
        Undo
      </button>
      <button className="tool" disabled={!s.history.future.length} onClick={s.redo}>
        Redo
      </button>
      <button className="tool" onClick={s.reset}>
        Reset
      </button>
      {s.selected && (
        <button className="tool" onClick={() => s.remove(s.selected!)}>
          Remove
        </button>
      )}
      <button className="tool" onClick={() => input.current?.click()}>
        Import
      </button>
      <button className="tool" onClick={s.exportFile}>
        Export
      </button>
      <button className="tool primary" onClick={() => void s.save()}>
        Save
      </button>
      <input
        ref={input}
        hidden
        type="file"
        accept="application/json,.json"
        aria-label="Import project file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) s.importFile(await file.text());
          e.target.value = '';
        }}
      />
    </div>
  );
}

function Bubble() {
  const doc = useApp((s) => s.history.present);
  const selected = useApp((s) => s.selected);
  const type = doc.components.find((c) => c.id === selected)?.type;
  const definition = type ? registry.get(type) : undefined;
  if (!definition) return null;
  return (
    <div className="bubble" role="status" style={{ left: '38%', top: '3%' }}>
      <b>{definition.name}</b>
      <span>{definition.description}</span>
    </div>
  );
}

function Card({ definition, index }: { definition: ComponentDefinition; index: number }) {
  const place = useApp((s) => s.place);
  const box =
    definition.art === 'uno-r3'
      ? '-28 -8 440 306'
      : definition.art === 'led-5mm'
        ? '-34 -38 68 96'
        : '-68 -30 136 60';
  return (
    <button
      className="card"
      style={{ '--i': index } as CSSProperties}
      aria-pressed={false}
      onClick={() => place(definition.id)}
    >
      <svg viewBox={box} aria-hidden="true">
        <g filter="url(#die)">
          <Art definition={definition} />
        </g>
      </svg>
      <span className="nm">{definition.name}</span>
      <span className="id">{definition.identifier}</span>
    </button>
  );
}

function CodeLab() {
  const sketch = useApp((s) => s.sketch);
  const [tab, setTab] = useState<'code' | 'serial'>('code');
  return (
    <section className="lab" aria-label="Code Lab">
      <div className="lab-tabs" role="tablist" aria-label="Code Lab views">
        <button
          className="lab-tab"
          role="tab"
          aria-selected={tab === 'code'}
          onClick={() => setTab('code')}
        >
          Code
        </button>
        <button
          className="lab-tab"
          role="tab"
          aria-selected={tab === 'serial'}
          onClick={() => setTab('serial')}
        >
          Serial Monitor
        </button>
      </div>
      <div className="sheet">
        {tab === 'code' ? (
          <div className="pane" tabIndex={0} role="tabpanel" aria-label="Sketch">
            <ol className="code">
              {sketch
                .trimEnd()
                .split('\n')
                .map((line, i) => (
                  <li key={i}>{line ? highlight(line) : ' '}</li>
                ))}
            </ol>
          </div>
        ) : (
          <div className="pane" tabIndex={0} role="tabpanel" aria-label="Serial output">
            <p className="pane-note">No serial output. Nothing is simulated yet.</p>
          </div>
        )}
        <div className="notes">
          <p>
            setup() runs once.
            <br />
            loop() never stops.
          </p>
          <p>Editing and running arrive with the simulator in Phase 3.</p>
          <div className="controls">
            <button className="press run" disabled>
              Run
            </button>
            <button className="press" disabled>
              Stop
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [view, setView] = useState<View>('play');
  const [dealt, setDealt] = useState(0);
  const status = useApp((s) => s.status);
  const page = view === 'exp' || view === 'set' ? view : 'play';
  return (
    <div className={`app${view === 'code' ? ' code-open' : ''}`}>
      <svg className="defs" aria-hidden="true" focusable="false">
        <defs dangerouslySetInnerHTML={{ __html: DEFS_SVG }} />
      </svg>
      <nav className="index" aria-label="Chapters">
        <div className="colophon">
          <b>Nº1</b>
          <span>
            THE PAPER
            <br />
            COMIC LAB
          </span>
        </div>
        <ul className="tabs">
          {CHAPTERS.map((c, i) => (
            <li key={c.view}>
              <button
                className="tab"
                aria-current={view === c.view ? 'page' : undefined}
                onClick={() => {
                  setView(c.view);
                  if (c.view === 'kit') setDealt((n) => n + 1);
                }}
              >
                <span>
                  <span className="num">{i + 1}</span>
                  <svg viewBox="0 0 24 24">{c.icon}</svg>
                </span>
                <span className="lbl">{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="price">
          5 VOLTS
          <br />
          ONLY
        </div>
      </nav>
      <main className="stage-wrap">
        <section className="page" aria-label="Electronics playground" hidden={page !== 'play'}>
          <div className="masthead">
            <h1>
              <em>Pin</em>
              <br />
              <span>Thirteen</span>
            </h1>
          </div>
          <Stage />
          <Bubble />
          <p className="status" role="status">
            {status}
          </p>
          <Toolbar />
        </section>
        <section className="page" aria-label="Experiments" hidden={page !== 'exp'}>
          <div className="page-inner">
            <h2 className="page-title">Experiments</h2>
            <p className="pane-note" style={{ paddingLeft: 0 }}>
              Lessons arrive in Phase 4.
            </p>
          </div>
        </section>
        <section className="page" aria-label="Settings" hidden={page !== 'set'}>
          <div className="page-inner" style={{ background: 'var(--grain), var(--palette-5)' }}>
            <h2 className="page-title">Settings</h2>
            <p className="pane-note" style={{ paddingLeft: 0 }}>
              Nothing to set yet.
            </p>
          </div>
        </section>
      </main>
      <aside className="kit" aria-label="Component collection">
        <header>
          <h2>
            The
            <br />
            Collection
          </h2>
          <p>{registry.all().length} PIECES · CLICK TO PLACE</p>
        </header>
        <div className="cards show" key={dealt}>
          {registry.all().map((d, i) => (
            <Card key={d.id} definition={d} index={i} />
          ))}
        </div>
      </aside>
      <CodeLab />
    </div>
  );
}
