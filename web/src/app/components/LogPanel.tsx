"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "kaiban.log.open";

export default function LogPanel() {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("live");
  const [autoScroll, setAutoScroll] = useState(true);
  const bodyRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setOpen(stored === "true");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(open));
  }, [open]);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const response = await fetch("/api/logs?limit=400");
        const data = await response.json();
        if (!active) return;
        setText(data.text ?? "");
        setStatus("live");
      } catch {
        if (!active) return;
        setStatus("offline");
      }
    };
    tick();
    const timer = setInterval(tick, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!autoScroll) return;
    const node = bodyRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [text, autoScroll, open]);

  function handleScroll() {
    const node = bodyRef.current;
    if (!node) return;
    const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 8;
    setAutoScroll(atBottom);
  }

  if (!open) {
    return (
      <button className="log-toggle" onClick={() => setOpen(true)}>
        Log
      </button>
    );
  }

  return (
    <div className="log-panel">
      <div className="log-header">
        <span>Server-Log</span>
        <span className={`log-state ${status}`}>{status}</span>
        <button onClick={() => setOpen(false)} aria-label="Schliessen">
          x
        </button>
      </div>
      <pre className="log-body" ref={bodyRef} onScroll={handleScroll}>
        {text || "Noch keine Eintraege."}
      </pre>
    </div>
  );
}
