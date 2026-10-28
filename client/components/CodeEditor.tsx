'use client';

import Editor, { type BeforeMount } from '@monaco-editor/react';
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

export function CodeEditor({ language, value, onChange, readOnly }: { language: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  return (
    <Editor
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
