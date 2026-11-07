import { articleFor, explainPin, FINDING_ARTICLES, searchArticles } from '@pin-thirteen/knowledge';
import { evaluate, lessonPassed, LESSONS } from '@pin-thirteen/learning';
import { registry, type ComponentDefinition } from '@pin-thirteen/registry';
import { validate } from '@pin-thirteen/validation';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Art } from './Art';
import { DEFS_SVG } from './art/generated';
import { Editor } from './Editor';
import { EXAMPLES } from './examples';
import { Inspector } from './Inspector';
import { Stage } from './Stage';
import { useApp } from './store';

type View = 'play' | 'kit' | 'exp' | 'code' | 'set';

function Academy() {
  const completed = useApp((s) => s.completed);
  const startLesson = useApp((s) => s.startLesson);
  return (
    <div className="page-inner">
      <h2 className="page-title">Academy</h2>
      <ol className="lessons">
        {LESSONS.map((l) => (
          <li key={l.id}>
            <button
              className="lesson-card"
              data-done={completed.includes(l.id)}
              onClick={() => startLesson(l.id)}
            >
              <i>{l.number}</i>
              <b>{l.title}</b>
              <span>{l.summary}</span>
              {l.support === 'approximate' && <em>Simulated estimate</em>}
              {completed.includes(l.id) && <em>Complete</em>}
            </button>
          </li>
        ))}
      </ol>
      <p className="pane-note lessons-later">
        Sound, sensors, motors, displays and a combined project arrive as the parts are added.
      </p>
    </div>
  );
}

function Library() {
  const id = useApp((s) => s.article);
  const open = useApp((s) => s.openArticle);
  const startLesson = useApp((s) => s.startLesson);
  const [query, setQuery] = useState('');
  const article = id ? articleFor(id) : undefined;
  const definition = article?.part ? registry.get(article.part) : undefined;
  if (article) {
    return (
      <article className="page-inner article">
        <button className="tool" onClick={() => open(null)}>
          Back to Library
        </button>
        <h2 className="page-title">{article.title}</h2>
        <h3>What it is</h3>
        <p>{article.what}</p>
        <h3>What it does</h3>
        <p>{article.does}</p>
        <h3>How it works</h3>
        <p>{article.how}</p>
        {definition && definition.specs.length > 0 && (
          <>
            <h3>Specifications</h3>
            <ul>
              {definition.specs.map((s) => (
                <li key={s.label}>
                  {s.label}: {s.value}
                </li>
              ))}
            </ul>
          </>
        )}
        {definition && definition.pins.length <= 8 && (
          <>
            <h3>Pins</h3>
            <ul>
              {definition.pins.map((p) => (
                <li key={p.id}>
                  {p.label}: {explainPin(p)}
                </li>
              ))}
            </ul>
          </>
        )}
        {definition && (
          <>
            <h3>In this simulator</h3>
            <p>
              {definition.simulation.educational.level}: {definition.simulation.educational.note}
            </p>
          </>
        )}
        {article.applications.length > 0 && (
          <>
            <h3>Common uses</h3>
            <ul>
              {article.applications.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </>
        )}
        <h3>Wiring</h3>
        <p>{article.wiring}</p>
        {article.code && (
          <>
            <h3>Code</h3>
            <pre>{article.code}</pre>
          </>
        )}
        <h3>Common mistakes</h3>
        <ul>
          {article.mistakes.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <h3>Troubleshooting</h3>
        <ul>
          {article.troubleshooting.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {article.lessons.length > 0 && (
          <>
            <h3>Related lessons</h3>
            <div className="row">
              {article.lessons.map((l) => (
                <button key={l} className="tool" onClick={() => startLesson(l)}>
                  {LESSONS.find((x) => x.id === l)?.title}
                </button>
              ))}
            </div>
          </>
        )}
      </article>
    );
  }
  return (
    <div className="page-inner">
      <h2 className="page-title">Library</h2>
      <label className="library-search">
        Search
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ul className="lessons">
        {searchArticles(query).map((a) => (
          <li key={a.id}>
            <button className="lesson-card" onClick={() => open(a.id)}>
              <b>{a.title}</b>
              <span>{a.what}</span>
              {a.tool && <em>Reference only</em>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LessonPanel() {
  const s = useApp();
  const lesson = LESSONS.find((l) => l.id === s.lessonId);
  if (!lesson) return null;
  const step = lesson.steps[s.lessonStep]!;
  const ctx = { doc: s.history.present, sketch: s.sketch, observed: s.observed, registry };
  const verifying = step.kind === 'verification';
  const passed = lessonPassed(lesson, ctx);
  const done = s.completed.includes(lesson.id);
  return (
    <section className="lesson" aria-label="Lesson">
      <p className="lesson-count">
        Lesson {lesson.number} · Step {s.lessonStep + 1} of 8
      </p>
      <h2>{step.title}</h2>
      <div className="lesson-body">
        {step.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {step.kind === 'components' && (
          <ul>
            {lesson.parts.map((p) => {
              const d = registry.get(p);
              return (
                <li key={p}>
                  <button className="tool" onClick={() => s.place(p)}>
                    Place {d?.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {step.kind === 'programming' && lesson.sketch && (
          <button className="tool primary" onClick={s.loadLessonSketch}>
            Load sketch
          </button>
        )}
        {verifying && (
          <ul className="checks" aria-label="Lesson checks">
            {lesson.verify.map((c) => {
              const ok = evaluate(c, ctx);
              return (
                <li key={c.label} data-ok={ok}>
                  {ok ? 'Done: ' : 'To do: '}
                  {c.label}
                </li>
              );
            })}
          </ul>
        )}
        {verifying && (
          <button className="tool primary" disabled={!passed || done} onClick={s.completeLesson}>
            {done ? 'Lesson complete' : 'Complete lesson'}
          </button>
        )}
      </div>
      <div className="row lesson-nav">
        <button
          className="tool"
          disabled={s.lessonStep === 0}
          onClick={() => s.setLessonStep(s.lessonStep - 1)}
        >
          Back
        </button>
        <button
          className="tool"
          disabled={s.lessonStep === 7}
          onClick={() => s.setLessonStep(s.lessonStep + 1)}
        >
          Next
        </button>
        <button className="tool" onClick={s.togglePanel}>
          {s.showParts ? 'Lesson' : 'Parts'}
        </button>
        <button className="tool" onClick={s.closeLesson}>
          Exit
        </button>
      </div>
    </section>
  );
}

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
    label: 'Library',
    icon: <path d="M7 15V8a5 5 0 0 1 10 0v7zM5 15h14M9 15v7M15 15v5" />,
  },
  { view: 'exp', label: 'Academy', icon: <path d="M9 3h6M10 3v7l-6 10h16l-6-10V3M7 15h10" /> },
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

function Findings() {
  const doc = useApp((s) => s.history.present);
  const sim = useApp((s) => s.sim);
  const problem = useApp((s) => s.problem);
  const open = useApp((s) => s.openArticle);
  const findings = useMemo(() => validate(doc, registry), [doc]);
  const label = { error: 'Error', hazard: 'Hazard', limitation: 'Limit' };
  return (
    <ul className="findings" aria-label="Circuit and sketch checks">
      {problem && (
        <li data-severity={problem.kind === 'unsupported' ? 'limitation' : 'error'}>
          <b>Line {problem.line}</b> {problem.message}
        </li>
      )}
      {sim?.fault && (
        <li data-severity="error">
          <b>Line {sim.fault.line}</b> {sim.fault.message}
        </li>
      )}
      {sim?.notices.map((n) => (
        <li key={n} data-severity="hazard">
          <b>Note</b> {n}
        </li>
      ))}
      {findings.map((f) => (
        <li key={f.id + (f.instance ?? '')} data-severity={f.severity} data-finding={f.id}>
          <b>{label[f.severity]}</b> {f.message}
          {FINDING_ARTICLES[f.id] && (
            <button className="why" onClick={() => open(FINDING_ARTICLES[f.id]!)}>
              Why?
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function CodeLab() {
  const sketch = useApp((s) => s.sketch);
  const setSketch = useApp((s) => s.setSketch);
  const serial = useApp((s) => s.serial);
  const problem = useApp((s) => s.problem);
  const running = useApp((s) => s.running);
  const run = useApp((s) => s.run);
  const stop = useApp((s) => s.stop);
  const sendSerial = useApp((s) => s.sendSerial);
  const [tab, setTab] = useState<'code' | 'serial'>('code');
  const [line, setLine] = useState('');
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
        <div className="pane" role="tabpanel" aria-label="Sketch" hidden={tab !== 'code'}>
          <Editor value={sketch} onChange={setSketch} problem={problem} />
        </div>
        <div className="pane" role="tabpanel" aria-label="Serial output" hidden={tab !== 'serial'}>
          <pre className="serial" data-testid="serial">
            {serial || 'Output from Serial.print appears here.'}
          </pre>
          <form
            className="serial-send"
            onSubmit={(e) => {
              e.preventDefault();
              sendSerial(line);
              setLine('');
            }}
          >
            <label>
              Send to board
              <input value={line} disabled={!running} onChange={(e) => setLine(e.target.value)} />
            </label>
            <button className="tool" disabled={!running}>
              Send
            </button>
          </form>
        </div>
        <div className="notes">
          <label className="examples">
            Example
            <select
              value=""
              onChange={(e) => {
                const found = EXAMPLES.find((x) => x.name === e.target.value);
                if (found) setSketch(found.sketch);
              }}
            >
              <option value="">Load a sketch...</option>
              {EXAMPLES.map((x) => (
                <option key={x.name}>{x.name}</option>
              ))}
            </select>
          </label>
          <Findings />
          <div className="controls">
            <button className="press run" disabled={running} onClick={run}>
              Run
            </button>
            <button className="press" disabled={!running} onClick={stop}>
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
  const view = useApp((s) => s.chapter);
  const setView = useApp((s) => s.setChapter);
  const inLesson = useApp((s) => !!s.lessonId && !s.showParts);
  const [dealt, setDealt] = useState(0);
  const status = useApp((s) => s.status);
  const page = view === 'exp' || view === 'set' || view === 'kit' ? view : 'play';
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
        <section className="page" aria-label="Academy" hidden={page !== 'exp'}>
          <Academy />
        </section>
        <section className="page" aria-label="Library" hidden={page !== 'kit'}>
          <Library />
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
        {inLesson ? (
          <LessonPanel />
        ) : (
          <>
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
          </>
        )}
      </aside>
      <CodeLab />
    </div>
  );
}
