"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Language } from "@/lib/types";
import { useDarkMode } from "@/lib/useDarkMode";

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];

interface CodeEditorProps {
  value: string;
  language: Language;
  onChange: (v: string) => void;
  highlightLines?: number[];
  height?: string | number;
}

export function CodeEditor({ value, language, onChange, highlightLines = [], height = "100%" }: CodeEditorProps) {
  const dark = useDarkMode();
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoRef = useRef<ReturnType<MonacoEditor["createDecorationsCollection"]> | null>(null);

  const applyHighlights = () => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    decoRef.current?.clear();
    decoRef.current = editor.createDecorationsCollection(
      highlightLines.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "qo-highlight-line",
          glyphMarginClassName: "qo-highlight-glyph",
          hoverMessage: { value: "🦆 Quack says: look closely at this line" },
        },
      }))
    );
    if (highlightLines.length) editor.revealLineInCenterIfOutsideViewport(highlightLines[0]);
  };

  useEffect(applyHighlights, [highlightLines.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full min-h-[280px] w-full" data-testid="code-editor" data-highlight-lines={highlightLines.join(",")}>
      <Editor
        height={height}
        language={language}
        value={value}
        theme={dark ? "vs-dark" : "light"}
        onChange={(v) => onChange(v ?? "")}
        loading={<div className="p-4 text-sm text-muted-foreground">Loading editor…</div>}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          monacoRef.current = monaco;
          applyHighlights();
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          glyphMargin: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: language === "python" ? 4 : 2,
          ariaLabel: "Code editor",
          accessibilitySupport: "auto",
        }}
      />
    </div>
  );
}
