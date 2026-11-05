'use client';

import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef } from 'react';
import { Spinner } from './ui';

const defineEditorTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('practice', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5f6f78', fontStyle: 'italic' },
      { token: 'keyword', foreground: '1d4ed8' },
      { token: 'string', foreground: '116b33' },
      { token: 'number', foreground: 'b45309' }
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#f3f7f7',
      'editorLineNumber.foreground': '#8d9ca4',
      'editorLineNumber.activeForeground': '#116b33',
      'editorCursor.foreground': '#116b33',
      'editor.selectionBackground': '#a8e3bf88'
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
      // Uncontrolled on purpose: feeding every keystroke back through `value` lets a stale render
      // overwrite newer text when typing fast. Remount (via `key`) to load different content.
      defaultValue={value}
      onChange={(v) => onChange?.(v ?? '')}
      beforeMount={defineEditorTheme}
      theme="practice"
      loading={<Spinner />}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontLigatures: false,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        padding: { top: 12 },
        wordWrap: language === 'text' ? 'on' : 'off',
        // Prose answers: word completions fire on every word and hijack Enter.
        ...(language === 'text' && {
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          wordBasedSuggestions: 'off',
          acceptSuggestionOnEnter: 'off',
          autoClosingBrackets: 'never',
          autoClosingQuotes: 'never'
        })
      }}
    />
  );
}
