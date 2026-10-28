'use client';

import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { Spinner } from './ui';

function usePrefersDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return dark;
}

export function CodeEditor({ language, value, onChange, readOnly }: { language: string; value: string; onChange?: (v: string) => void; readOnly?: boolean }) {
  const dark = usePrefersDark();
  return (
    <Editor
      height="100%"
      language={language === 'text' ? 'markdown' : language}
      value={value}
      onChange={(v) => onChange?.(v ?? '')}
      theme={dark ? 'vs-dark' : 'light'}
      loading={<Spinner />}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: language === 'text' ? 'on' : 'off'
      }}
    />
  );
}
