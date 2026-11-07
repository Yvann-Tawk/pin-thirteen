import { cpp } from '@codemirror/lang-cpp';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { setDiagnostics, type Diagnostic as LintDiagnostic } from '@codemirror/lint';
import { EditorView, hoverTooltip } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { FUNCTION_DOCS } from '@pin-thirteen/knowledge';
import type { Diagnostic } from '@pin-thirteen/sim-edu';
import { basicSetup } from 'codemirror';
import { useEffect, useRef } from 'react';

// The approved look: ink text over highlighter-pen colours.
const pen = HighlightStyle.define([
  {
    tag: [t.keyword, t.typeName, t.standard(t.typeName)],
    backgroundColor: 'var(--palette-2)',
    fontWeight: '600',
  },
  { tag: [t.function(t.variableName), t.macroName], backgroundColor: 'var(--palette-1)' },
  { tag: [t.number, t.bool], backgroundColor: 'var(--palette-5)' },
  { tag: t.string, backgroundColor: 'var(--palette-4)' },
  { tag: t.comment, fontStyle: 'italic', color: 'var(--char)' },
]);

const docs = hoverTooltip((view, pos) => {
  const word = view.state.wordAt(pos);
  const text = word && FUNCTION_DOCS[view.state.sliceDoc(word.from, word.to)];
  if (!word || !text) return null;
  return {
    pos: word.from,
    end: word.to,
    create() {
      const dom = document.createElement('div');
      dom.className = 'code-tip';
      dom.textContent = text;
      return { dom };
    },
  };
});

const paper = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent', fontSize: '14px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '24px' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    paddingLeft: '30px',
    color: 'var(--char)',
  },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
  '.cm-content': { caretColor: 'var(--ink)', padding: '0' },
  '.cm-line': { padding: '0 0 0 12px' },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--palette-4)',
    outline: '1px solid var(--ink)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--palette-5) !important',
  },
});

export function Editor({
  value,
  onChange,
  problem,
}: {
  value: string;
  onChange(v: string): void;
  problem: Diagnostic | null;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  const change = useRef(onChange);
  change.current = onChange;

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      doc: value,
      extensions: [
        basicSetup,
        cpp(),
        syntaxHighlighting(pen),
        paper,
        docs,
        EditorView.contentAttributes.of({ 'aria-label': 'Sketch editor' }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) change.current(u.state.doc.toString());
        }),
      ],
    });
    view.current = editor;
    return () => editor.destroy();
    // The view owns its text after creation; external changes arrive through the effect below.
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value) {
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const marks: LintDiagnostic[] = [];
    if (problem && problem.line <= editor.state.doc.lines) {
      const line = editor.state.doc.line(problem.line);
      marks.push({ from: line.from, to: line.to, severity: 'error', message: problem.message });
    }
    editor.dispatch(setDiagnostics(editor.state, marks));
  }, [problem]);

  return <div className="editor" ref={host} />;
}
