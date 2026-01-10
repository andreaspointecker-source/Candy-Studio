"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProviderName = "openai" | "glm" | "google" | "anthropic" | "openrouter";
type ExportFormat = "html" | "css" | "react" | "json";

type DesignerVariation = {
  title: string;
  previewHtml: string;
  exports: {
    html: string;
    css: string;
    react: string;
    json: string;
  };
};

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
  time: string;
};

type ProjectMeta = {
  id: string;
  name: string;
  description: string;
};

type CanvasElement = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

const PROVIDERS: ProviderName[] = ["openai", "glm", "google", "anthropic", "openrouter"];
const EXPORT_FORMATS: ExportFormat[] = ["html", "css", "react", "json"];
const ELEMENT_TEMPLATES = [
  { type: "Hero", description: "Headline, Subline, CTA" },
  { type: "Feature Grid", description: "3-6 Feature Cards" },
  { type: "Stats Row", description: "KPIs und Zahlen" },
  { type: "Pricing", description: "Preisstaffeln" },
];

export default function DesignerPage() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [model, setModel] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [variations, setVariations] = useState(3);
  const [format, setFormat] = useState<ExportFormat>("html");
  const [exportSource, setExportSource] = useState<"ai" | "canvas">("ai");
  const [models, setModels] = useState<Record<ProviderName, string[]>>({
    openai: [],
    glm: [],
    google: [],
    anthropic: [],
    openrouter: [],
  });
  const [modelDetails, setModelDetails] = useState<
    Record<ProviderName, { id: string; tier?: "free" | "paid" }[]>
  >({
    openai: [],
    glm: [],
    google: [],
    anthropic: [],
    openrouter: [],
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<DesignerVariation[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [refineTarget, setRefineTarget] = useState<number | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [canvasPanel, setCanvasPanel] = useState<
    "none" | "export" | "add" | "brand" | "inspect"
  >("none");
  const [progress, setProgress] = useState(0);
  const [gridSize, setGridSize] = useState(16);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Willkommen! Beschreibe dein UI und starte.",
      time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatMode, setChatMode] = useState<"new" | "edit" | "chat">("new");
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    open: boolean;
  }>({ x: 0, y: 0, open: false });
  const [attachments, setAttachments] = useState<
    { name: string; size: number; dataUrl: string; mime: string }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [projectId, setProjectId] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    mode: "move" | "resize";
    handle?: "nw" | "ne" | "sw" | "se";
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    let active = true;
    const fetchModels = async (name: ProviderName) => {
      const response = await fetch(`/api/models?provider=${name}`);
      const text = await response.text();
      try {
        const data = JSON.parse(text) as {
          models?: string[];
          modelDetails?: { id: string; tier?: "free" | "paid" }[];
          error?: string;
        };
        return { name, models: data.models ?? [], modelDetails: data.modelDetails ?? [] };
      } catch {
        return { name, models: [] };
      }
    };
    Promise.all(PROVIDERS.map(fetchModels)).then((items) => {
      if (!active) return;
      setModels((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item.name] = item.models;
        });
        return next;
      });
      setModelDetails((prev) => {
        const next = { ...prev };
        items.forEach((item) => {
          next[item.name] = item.modelDetails ?? [];
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setProjects(data.projects ?? []);
      })
      .catch(() => {
        if (!active) return;
        setProjects([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!models[provider]?.length) return;
    setModel((prev) => prev || models[provider][0]);
  }, [provider, models]);

  useEffect(() => {
    setModelSearch("");
  }, [provider]);

  const activeVariation = results[activeIndex] ?? null;
  const canvasExport = useMemo(() => buildCanvasExports(elements), [elements]);
  const exportText = useMemo(() => {
    if (exportSource === "canvas" && elements.length) {
      return canvasExport[format] ?? "";
    }
    if (!activeVariation) return "";
    return activeVariation.exports[format] ?? "";
  }, [activeVariation, format, exportSource, elements, canvasExport]);

  async function generateDesigns() {
    setLoading(true);
    setStatus(null);
    setProgress(12);
    const modeLabel =
      chatMode === "new" ? "Neues Design" : chatMode === "edit" ? "Design bearbeiten" : "Chat";
    const attachmentInfo = attachments.length
      ? `\nAnhaenge: ${attachments.map((item) => item.name).join(", ")}`
      : "";
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `${prompt}${attachmentInfo}`,
        time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    const history = messages
      .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
      .join("\n");
    try {
      const response = await fetch(chatMode === "chat" ? "/api/designer/chat" : "/api/designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          chatMode === "chat"
            ? { prompt, provider, model, images: attachments }
            : {
                prompt: `Mode: ${modeLabel}\n${prompt}`,
                provider,
                model,
                variations,
                images: attachments,
                history,
              }
        ),
      });
      setProgress(48);
      const text = await response.text();
      if (chatMode === "chat") {
        const data = text ? (JSON.parse(text) as { message?: string; error?: string }) : {};
        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Chat fehlgeschlagen.");
        }
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message ?? "Okay.",
            time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setProgress(90);
      } else {
        const data = text
          ? (JSON.parse(text) as { variations?: DesignerVariation[]; error?: string })
          : {};
        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Generierung fehlgeschlagen.");
        }
        setResults(data.variations ?? []);
        setActiveIndex(0);
        setProgress(90);
        setStatus("Variationen erstellt.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Variationen sind bereit. Waehle eine aus.",
            time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Fehler beim Generieren.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Fehler beim Generieren.",
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setProgress(100);
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
      setPrompt("");
      setAttachments([]);
    }
  }

  async function refineVariation(index: number) {
    const current = results[index];
    if (!current || !refinePrompt.trim()) return;
    setLoading(true);
    setProgress(18);
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Refine: ${refinePrompt}`,
        time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    try {
      const response = await fetch("/api/designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Refine variation:\n${refinePrompt}\n\nCurrent HTML:\n${current.previewHtml}`,
          provider,
          model,
          variations: 1,
          images: attachments,
        }),
      });
      setProgress(60);
      const text = await response.text();
      const data = text
        ? (JSON.parse(text) as { variations?: DesignerVariation[]; error?: string })
        : {};
      if (!response.ok || data.error || !data.variations?.length) {
        throw new Error(data.error ?? "Refine fehlgeschlagen.");
      }
      setResults((prev) =>
        prev.map((item, idx) => (idx === index ? data.variations![0] : item))
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Variation aktualisiert.",
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setRefinePrompt("");
      setRefineTarget(null);
      setProgress(100);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Refine fehlgeschlagen.",
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
      setAttachments([]);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) return;
        setAttachments((prev) => [
          ...prev,
          { name: file.name, size: file.size, dataUrl, mime: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function moveAttachment(from: number, to: number) {
    setAttachments((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function downloadExport() {
    if (!exportText) return;
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `design-export.${format === "react" ? "tsx" : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function buildCanvasExports(items: CanvasElement[]) {
    const json = JSON.stringify(
      {
        canvas: {
          width: 960,
          height: 640,
        },
        elements: items.map((item) => ({
          id: item.id,
          type: item.type,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex,
        })),
      },
      null,
      2
    );

    const cssItems = items
      .map(
        (item) => `
.el-${item.id} {
  position: absolute;
  left: ${item.x}px;
  top: ${item.y}px;
  width: ${item.width}px;
  height: ${item.height}px;
  z-index: ${item.zIndex};
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  background: rgba(12, 14, 20, 0.75);
  color: #f5f7fb;
  display: grid;
  place-items: center;
  font-size: 12px;
}`
      )
      .join("\n");

    const css = `
.canvas-root {
  position: relative;
  width: 960px;
  height: 640px;
  background: #0a0c12;
}
${cssItems}
`.trim();

    const htmlItems = items
      .map((item) => `<div class="el-${item.id}">${item.type}</div>`)
      .join("\n");

    const html = `
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Canvas Export</title>
  <style>${css}</style>
</head>
<body>
  <div class="canvas-root">
    ${htmlItems}
  </div>
</body>
</html>
`.trim();

    const reactItems = items
      .map(
        (item) =>
          `<div className="el-${item.id}">${item.type}</div>`
      )
      .join("\n        ");

    const react = `
export default function CanvasLayout() {
  return (
    <div className="canvas-root">
        ${reactItems}
    </div>
  );
}
`.trim();

    return { json, css, html, react };
  }

  async function importToProject() {
    if (!projectId) {
      setImportStatus("Bitte Projekt auswaehlen.");
      return;
    }
    const payload = {
      projectId,
      exportFormat: format,
      exportContent: exportText,
      source: exportSource,
      prompt,
    };
    setImportStatus("Import laeuft...");
    const response = await fetch("/api/designer/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    const data = text ? (JSON.parse(text) as { taskId?: string; error?: string }) : {};
    if (!response.ok || data.error) {
      setImportStatus(data.error ?? "Import fehlgeschlagen.");
      return;
    }
    setImportStatus("Task wurde angelegt.");
  }

  async function reviewProject() {
    if (!projectId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Bitte zuerst ein Projekt auswaehlen.",
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      return;
    }
    setLoading(true);
    setProgress(18);
    setReviewStatus("Analyse laeuft...");
    try {
      const response = await fetch("/api/designer/project-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, provider, model }),
      });
      const text = await response.text();
      const data = text ? (JSON.parse(text) as { message?: string; error?: string }) : {};
      if (!response.ok || data.error) {
        throw new Error(data.error ?? "Analyse fehlgeschlagen.");
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message ?? "Analyse abgeschlossen.",
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setReviewStatus("Analyse abgeschlossen.");
      setProgress(100);
    } catch (err) {
      setReviewStatus(err instanceof Error ? err.message : "Analyse fehlgeschlagen.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Analyse fehlgeschlagen.",
          time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  function addElement(type: string) {
    setElements((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        type,
        x: 40 + prev.length * 16,
        y: 40 + prev.length * 16,
        width: 220,
        height: 80,
        zIndex: prev.length + 1,
      },
    ]);
  }

  function handlePointerDown(
    id: string,
    event: React.PointerEvent<HTMLDivElement>,
    mode: "move" | "resize" = "move",
    handle?: "nw" | "ne" | "sw" | "se"
  ) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const element = elements.find((item) => item.id === id);
    if (!element) return;
    setActiveElementId(id);
    setElements((prev) => {
      const maxZ = Math.max(0, ...prev.map((item) => item.zIndex));
      return prev.map((item) =>
        item.id === id ? { ...item, zIndex: maxZ + 1 } : item
      );
    });
    dragRef.current = {
      id,
      mode,
      handle,
      offsetX: event.clientX - rect.left - element.x,
      offsetY: event.clientY - rect.top - element.y,
    };
  }

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setElements((prev) =>
        prev.map((item) => {
          if (item.id !== dragRef.current?.id) return item;
          const snap = (value: number) => Math.round(value / gridSize) * gridSize;
          if (dragRef.current?.mode === "resize") {
            const minWidth = 140;
            const minHeight = 60;
            let nextWidth = item.width;
            let nextHeight = item.height;
            let nextX = item.x;
            let nextY = item.y;
            const cursorX = event.clientX - rect.left;
            const cursorY = event.clientY - rect.top;
            if (dragRef.current.handle?.includes("e")) {
              nextWidth = snap(cursorX - item.x);
            }
            if (dragRef.current.handle?.includes("s")) {
              nextHeight = snap(cursorY - item.y);
            }
            if (dragRef.current.handle?.includes("w")) {
              nextWidth = snap(item.width + (item.x - cursorX));
              nextX = snap(cursorX);
            }
            if (dragRef.current.handle?.includes("n")) {
              nextHeight = snap(item.height + (item.y - cursorY));
              nextY = snap(cursorY);
            }
            nextWidth = Math.max(minWidth, Math.min(nextWidth, rect.width - nextX - 20));
            nextHeight = Math.max(minHeight, Math.min(nextHeight, rect.height - nextY - 20));
            return {
              ...item,
              x: Math.max(0, nextX),
              y: Math.max(0, nextY),
              width: nextWidth,
              height: nextHeight,
            };
          }
          const x = snap(event.clientX - rect.left - dragRef.current.offsetX);
          const y = snap(event.clientY - rect.top - dragRef.current.offsetY);
          return {
            ...item,
            x: Math.max(0, Math.min(x, rect.width - item.width)),
            y: Math.max(0, Math.min(y, rect.height - item.height)),
          };
        })
      );
    };
    const handleUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu((prev) => ({ ...prev, open: false }));
        setCanvasPanel("none");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="designer-shell canvas-shell">
      <div className="canvas-layout">
        <header className="canvas-topbar">
          <div className="canvas-title">
            <span className="canvas-logo">K</span>
            <span>UI Designer</span>
          </div>
          <div className="canvas-actions">
            <button className="designer-chip" onClick={() => setCanvasPanel("export")}>
              Export
            </button>
            <button className="designer-chip" onClick={() => setCanvasPanel("add")}>
              Add Element
            </button>
            <button className="designer-chip" onClick={() => setCanvasPanel("brand")}>
              Brand Assets
            </button>
          </div>
        </header>
        <aside className="canvas-tools">
  <button className="canvas-tool active">SEL</button>
  <button className="canvas-tool">BOX</button>
  <button className="canvas-tool">TXT</button>
  <button className="canvas-tool">PEN</button>
  <button className="canvas-tool">ADD</button>
</aside>

        <main
          className="canvas-board"
          onClick={() => setContextMenu((prev) => ({ ...prev, open: false }))}
          onContextMenu={(event) => {
            event.preventDefault();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              open: true,
            });
          }}
        >
          <div className="canvas-toolbar">
            <div className="canvas-zoom">
              <button>-</button>
              <span>100%</span>
              <button>+</button>
            </div>
            <div className="canvas-toolbar-right">
              <label>
                Grid
                <select value={gridSize} onChange={(event) => setGridSize(Number(event.target.value))}>
                  {[8, 16, 24].map((value) => (
                    <option key={value} value={value}>
                      {value}px
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="canvas-status">
              {loading ? "Generierung laeuft..." : "Bereit"}
              {progress > 0 && (
                <span className="canvas-progress">
                  <span style={{ width: `${progress}%` }} />
                </span>
              )}
            </div>
          </div>

          <div
            className="canvas-grid"
            ref={canvasRef}
            style={{ ["--grid-size" as never]: `${gridSize}px` }}
          >
            {activeVariation ? (
              <div className="canvas-frame">
                <iframe
                  title="UI Preview"
                  srcDoc={activeVariation.previewHtml}
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="canvas-empty">
                <p>Starte mit einem Prompt im Chat, um eine UI zu erzeugen.</p>
              </div>
            )}
            <div className="canvas-elements">
              {elements.map((item) => (
                <div
                  key={item.id}
                  className={`canvas-element ${item.id === activeElementId ? "active" : ""}`}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    zIndex: item.zIndex,
                  }}
                  onPointerDown={(event) => handlePointerDown(item.id, event, "move")}
                >
                  {item.type}
                  <span className="canvas-handle nw" onPointerDown={(event) => handlePointerDown(item.id, event, "resize", "nw")} />
                  <span className="canvas-handle ne" onPointerDown={(event) => handlePointerDown(item.id, event, "resize", "ne")} />
                  <span className="canvas-handle sw" onPointerDown={(event) => handlePointerDown(item.id, event, "resize", "sw")} />
                  <span className="canvas-handle se" onPointerDown={(event) => handlePointerDown(item.id, event, "resize", "se")} />
                </div>
              ))}
            </div>
          </div>

          <div className="canvas-variations">
            {results.length ? (
              results.map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  className={`canvas-variation ${index === activeIndex ? "active" : ""}`}
                  onClick={() => setActiveIndex(index)}
                >
                  <iframe
                    title={`Variation ${index + 1}`}
                    srcDoc={item.previewHtml}
                    sandbox="allow-same-origin"
                  />
                  <span>Variation {index + 1}</span>
                  <button
                    className="variation-refine"
                    onClick={(event) => {
                      event.stopPropagation();
                      setRefineTarget(index);
                    }}
                  >
                    Refine
                  </button>
                </button>
              ))
            ) : (
              <div className="canvas-variations-empty">Keine Variationen.</div>
            )}
          </div>

          {refineTarget !== null && (
            <div className="canvas-refine">
              <input
                value={refinePrompt}
                onChange={(event) => setRefinePrompt(event.target.value)}
                placeholder="Was soll an dieser Variation verbessert werden?"
              />
              <button
                className="designer-primary"
                onClick={() => refineVariation(refineTarget)}
                disabled={loading}
              >
                Refine anwenden
              </button>
            </div>
          )}

          {canvasPanel !== "none" && (
            <div className="canvas-panel">
              <div className="canvas-panel-header">
                <strong>
                  {canvasPanel === "export"
                    ? "Export"
                    : canvasPanel === "add"
                      ? "Add Element"
                      : canvasPanel === "brand"
                        ? "Brand Assets"
                        : "Inspect"}
                </strong>
                <button onClick={() => setCanvasPanel("none")}>X</button>
              </div>
              {canvasPanel === "export" && (
                <div className="canvas-panel-body">
                  <label>Quelle</label>
                  <select
                    value={exportSource}
                    onChange={(event) => setExportSource(event.target.value as "ai" | "canvas")}
                  >
                    <option value="ai">AI Variation</option>
                    <option value="canvas">Canvas Layout</option>
                  </select>
                  <label>Format</label>
                  <select value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)}>
                    {EXPORT_FORMATS.map((item) => (
                      <option key={item} value={item}>
                        {item.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <textarea readOnly value={exportText} placeholder="Export erscheint hier..." />
                  <button className="designer-primary" onClick={downloadExport} disabled={!exportText}>
                    Export herunterladen
                  </button>
                  <label>Projekt</label>
                  <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                    <option value="">Projekt auswaehlen</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button className="designer-secondary" onClick={importToProject} disabled={!exportText}>
                    Ins Projekt uebernehmen
                  </button>
                  {importStatus && <span className="designer-hint">{importStatus}</span>}
                </div>
              )}
              {canvasPanel === "add" && (
                <div className="canvas-panel-body">
                  {ELEMENT_TEMPLATES.map((item) => (
                    <button
                      key={item.type}
                      className="designer-secondary"
                      onClick={() => addElement(item.type)}
                    >
                      {item.type} - {item.description}
                    </button>
                  ))}
                </div>
              )}
              {canvasPanel === "brand" && (
                <div className="canvas-panel-body">
                  <p className="designer-hint">Logo, Fonts und Farben verwalten.</p>
                  <button className="designer-secondary">Logo hochladen</button>
                  <button className="designer-secondary">Fonts hinzufuegen</button>
                </div>
              )}
              {canvasPanel === "inspect" && (
                <div className="canvas-panel-body">
                  {elements.length ? (
                    elements
                      .slice()
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((item) => (
                        <div key={item.id} className="inspect-row">
                          <span>{item.type}</span>
                          <div className="inspect-actions">
                            <button
                              onClick={() =>
                                setElements((prev) =>
                                  prev.map((el) =>
                                    el.id === item.id
                                      ? { ...el, zIndex: el.zIndex + 1 }
                                      : el
                                  )
                                )
                              }
                            >
                              Up
                            </button>
                            <button
                              onClick={() =>
                                setElements((prev) =>
                                  prev.map((el) =>
                                    el.id === item.id
                                      ? { ...el, zIndex: Math.max(1, el.zIndex - 1) }
                                      : el
                                  )
                                )
                              }
                            >
                              Down
                            </button>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="designer-hint">Keine Elemente im Canvas.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {contextMenu.open && (
            <div
              className="canvas-context"
              style={{
                left: contextMenu.x,
                top: contextMenu.y,
                transform: "translate(-50%, -10px)",
              }}
            >
              <button onClick={() => setCanvasPanel("export")}>Export</button>
              <button onClick={() => setCanvasPanel("add")}>Add Element</button>
              <button onClick={() => setCanvasPanel("brand")}>Brand Assets</button>
              <button onClick={() => setCanvasPanel("inspect")}>Inspect</button>
            </div>
          )}
        </main>

        <aside
          className={`canvas-chat ${isDragging ? "dragging" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            event.preventDefault();
            dragCounter.current += 1;
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragCounter.current = Math.max(0, dragCounter.current - 1);
            if (dragCounter.current === 0) {
              setIsDragging(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragCounter.current = 0;
            setIsDragging(false);
            handleFiles(event.dataTransfer.files);
          }}
        >
          <div className="canvas-chat-header">
            <span>Design Chat</span>
            <span className="canvas-chat-state">{loading ? "busy" : "ready"}</span>
          </div>
          <div className="canvas-chat-meta">
            <select
              value={chatMode}
              onChange={(event) => setChatMode(event.target.value as "new" | "edit" | "chat")}
            >
              <option value="new">Neues Design</option>
              <option value="edit">Design bearbeiten</option>
              <option value="chat">Chat</option>
            </select>
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              <option value="">Projekt</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button className="designer-secondary" onClick={reviewProject} disabled={loading}>
              Analyse
            </button>
            <button
              className="designer-secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Anhang
            </button>
          </div>
          {reviewStatus && <span className="designer-hint">{reviewStatus}</span>}
          <div className="canvas-chat-body">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className={`chat-bubble ${item.role}`}>
                <div className="chat-header">
                  <span className="chat-avatar">{item.role === "user" ? "DU" : "AI"}</span>
                  <span className="chat-time">{item.time}</span>
                </div>
                <p>{item.content}</p>
              </div>
            ))}
            {attachments.length > 0 && (
              <div className="chat-attachments">
                {attachments.map((item, index) => (
                  <div
                    key={`${item.name}-${item.size}`}
                    className="chat-attachment"
                    title={`${item.name} (${Math.round(item.size / 1024)} KB)`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", String(index));
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                      if (!Number.isNaN(fromIndex) && fromIndex !== index) {
                        moveAttachment(fromIndex, index);
                      }
                    }}
                  >
                    <img src={item.dataUrl} alt={item.name} />
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      aria-label="Anhang entfernen"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="canvas-chat-input">
            <textarea
              placeholder="Beschreibe dein UI..."
              rows={2}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="canvas-chat-submit">
              <button className="designer-primary" onClick={generateDesigns} disabled={loading}>
                {loading ? "Generiere..." : chatMode === "chat" ? "Senden" : "Generieren"}
              </button>
            </div>
            <details className="canvas-chat-advanced">
              <summary>Erweiterte Einstellungen</summary>
              <div className="canvas-chat-actions">
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as ProviderName)}
                >
                  {PROVIDERS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <input
                  value={modelSearch}
                  onChange={(event) => setModelSearch(event.target.value)}
                  placeholder="Modelle filtern..."
                  className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <select value={model} onChange={(event) => setModel(event.target.value)}>
                  {provider === "openrouter" && modelDetails.openrouter.length ? (
                    <>
                      <optgroup label="Free">
                        {modelDetails.openrouter
                          .filter((item) => item.tier === "free")
                          .filter((item) =>
                            modelSearch
                              .toLowerCase()
                              .split(" ")
                              .filter(Boolean)
                              .every((token) => item.id.toLowerCase().includes(token))
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.id}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Paid">
                        {modelDetails.openrouter
                          .filter((item) => item.tier !== "free")
                          .filter((item) =>
                            modelSearch
                              .toLowerCase()
                              .split(" ")
                              .filter(Boolean)
                              .every((token) => item.id.toLowerCase().includes(token))
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.id}
                            </option>
                          ))}
                      </optgroup>
                    </>
                  ) : (
                    (models[provider] ?? [])
                      .filter((item) =>
                        modelSearch
                          .toLowerCase()
                          .split(" ")
                          .filter(Boolean)
                          .every((token) => item.toLowerCase().includes(token))
                      )
                      .map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))
                  )}
                </select>
                {chatMode !== "chat" && (
                  <select
                    value={variations}
                    onChange={(event) => setVariations(Number(event.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6].map((value) => (
                      <option key={value} value={value}>
                        {value} Variationen
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </details>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(event.target.files)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}




