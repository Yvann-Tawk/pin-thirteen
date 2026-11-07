import { registry, type ComponentDefinition } from '@pin-thirteen/registry';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Art } from './Art';
import { DEFS_SVG } from './art/generated';
import { highlight } from './highlight';
import { Inspector } from './Inspector';
import { Stage } from './Stage';
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

function Toolbar() {
  const s = useApp();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="toolbar" role="toolbar" aria-label="Project tools">
      <button
        className="tool"
        aria-label="Zoom in"
        onClick={() => s.zoomAt(1.25, { x: 500, y: 310 })}
      >
        +
      </button>
      <button
        className="tool"
        aria-label="Zoom out"
        onClick={() => s.zoomAt(0.8, { x: 500, y: 310 })}
      >
        −
      </button>
      <button className="tool" onClick={s.fitView}>
        Fit
      </button>
      <button className="tool" disabled={!s.history.past.length} onClick={s.undo}>
        Undo
      </button>
      <button className="tool" disabled={!s.history.future.length} onClick={s.redo}>
        Redo
      </button>
      <button className="tool" onClick={s.reset}>
        Reset
      </button>
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

function Card({ definition, index }: { definition: ComponentDefinition; index: number }) {
  const place = useApp((s) => s.place);
  const box =
    { 'uno-r3': '-28 -8 440 306', 'led-5mm': '-34 -38 68 96', 'breadboard-830': '-4 -30 916 250' }[
      definition.art
    ] ?? '-68 -30 136 60';
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState();
      if (e.key === 'Escape') s.cancelDraft();
      const typing = (e.target as Element).closest('input, select, textarea');
      if (typing || !(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) s.redo();
      else s.undo();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
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
          <Inspector />
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
