'use client';

import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { Spinner } from './ui';

const defineArenaTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('arena', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7a81a3', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ad94ff' },
      { token: 'string', foreground: 'bdf043' },
      { token: 'number', foreground: '7cf0fb' }
    ],
    colors: {
      'editor.background': '#0b0c15',
      'editor.lineHighlightBackground': '#161929',
      'editorLineNumber.foreground': '#4a5070',
      'editorLineNumber.activeForeground': '#3fe3f2',
      'editorCursor.foreground': '#3fe3f2',
      'editor.selectionBackground': '#5a2bd866'
    }
  });
};

export function CodeEditor({
  language,
  value,
  onChange,
  onPaste,
  readOnly
}: {
  language: string;
  value: string;
  onChange?: (v: string) => void;
  onPaste?: (info: { lines: number; chars: number }) => void;
  readOnly?: boolean;
}) {
  // Monaco registers the listener once, so read the latest callback through a ref.
  const pasteRef = useRef(onPaste);
  useEffect(() => {
    pasteRef.current = onPaste;
  }, [onPaste]);
  const handleMount: OnMount = (editor) => {
    editor.onDidPaste((e) => {
      const text = editor.getModel()?.getValueInRange(e.range) ?? '';
      pasteRef.current?.({ lines: e.range.endLineNumber - e.range.startLineNumber + 1, chars: text.length });
    });
  };
  return (
    <Editor
      onMount={handleMount}
      height="100%"
      language={language === 'text' ? 'markdown' : language}
      value={value}
      onChange={(v) => onChange?.(v ?? '')}
      beforeMount={defineArenaTheme}
      theme="arena"
      loading={<Spinner />}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontLigatures: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12 },
        wordWrap: language === 'text' ? 'on' : 'off'
      }}
    />
  );
}
