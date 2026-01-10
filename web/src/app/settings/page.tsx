"use client";

import { useEffect, useState } from "react";

type ProviderName = "openai" | "glm" | "google" | "anthropic" | "openrouter";

type ModelConfig = {
  provider: ProviderName;
  model: string;
};

type ModelRouting = {
  wizard: ModelConfig;
  taskWizard: ModelConfig;
  planning: ModelConfig;
  taskImplementation: ModelConfig;
  taskTests: ModelConfig;
  taskFix: ModelConfig;
  research: ModelConfig;
};

type SystemPrompts = {
  wizardDefault: string;
  wizardHomepage: string;
  wizardWebApp: string;
  wizardDesktop: string;
  wizardMobile: string;
  wizardOther: string;
  taskWizard: string;
  planAndTeam: string;
  taskRunner: string;
  designerGenerate: string;
  designerChat: string;
  designerProjectReview: string;
};

type AppSettings = {
  providerKeys: {
    openai?: string;
    glm?: string;
    google?: string;
    anthropic?: string;
    openrouter?: string;
  };
  providerBaseUrls: {
    openai?: string;
    glm?: string;
    glmModels?: string;
    google?: string;
    googleModels?: string;
    anthropic?: string;
    anthropicModels?: string;
    openrouter?: string;
    openrouterModels?: string;
  };
  modelRouting: ModelRouting;
  systemPrompts: SystemPrompts;
};

const ROUTING_ROWS: { key: keyof ModelRouting; label: string }[] = [
  { key: "wizard", label: "Projekt-Wizard" },
  { key: "taskWizard", label: "Task-Wizard" },
  { key: "planning", label: "Plan + Team" },
  { key: "research", label: "Research-Tasks" },
  { key: "taskImplementation", label: "Task-Implementierung" },
  { key: "taskTests", label: "Tests erstellen" },
  { key: "taskFix", label: "Fix-Loops" },
];

const PROMPT_OPTIONS: { key: keyof SystemPrompts; label: string; hint: string }[] = [
  { key: "wizardDefault", label: "Wizard: Standard", hint: "Allgemeiner Intake-Prompt" },
  { key: "wizardHomepage", label: "Wizard: Homepage", hint: "Prompt fuer Marketing/Homepages" },
  { key: "wizardWebApp", label: "Wizard: Web-App", hint: "Prompt fuer Web-Apps" },
  { key: "wizardDesktop", label: "Wizard: Desktop-App", hint: "Prompt fuer Desktop-Apps" },
  { key: "wizardMobile", label: "Wizard: Mobile-App", hint: "Prompt fuer Mobile-Apps" },
  { key: "wizardOther", label: "Wizard: Sonstiges", hint: "Fallback-Prompt" },
  { key: "taskWizard", label: "Task-Wizard", hint: "Prompt fuer neue Tasks" },
  { key: "planAndTeam", label: "Plan + Team", hint: "Prompt fuer Plan- und Team-Generierung" },
  { key: "taskRunner", label: "Task Runner", hint: "Prompt fuer Ausfuehrung/Tests/Fixes" },
  { key: "designerGenerate", label: "UI Designer: Generierung", hint: "Prompt fuer UI-Variationen" },
  { key: "designerChat", label: "UI Designer: Chat", hint: "Prompt fuer Design-Chat" },
  {
    key: "designerProjectReview",
    label: "UI Designer: Projektanalyse",
    hint: "Prompt fuer Analyse + Rueckfragen",
  },
];

const PROVIDERS: ProviderName[] = ["openai", "glm", "google", "anthropic", "openrouter"];
const PROVIDER_LOGIN: Partial<Record<ProviderName, string>> = {
  openai: "https://platform.openai.com/account/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
};
const PROVIDER_PORTAL: Partial<Record<ProviderName, string>> = {
  anthropic: "https://claude.ai",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"providers" | "routing" | "prompts">("providers");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [keySources, setKeySources] = useState<
    Record<ProviderName, "stored" | "env" | "missing">
  >({
    openai: "missing",
    glm: "missing",
    google: "missing",
    anthropic: "missing",
    openrouter: "missing",
  });
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
  const [providerStatus, setProviderStatus] = useState<
    Record<ProviderName, { state: "unknown" | "connected" | "missing" | "error"; message: string }>
  >({
    openai: { state: "unknown", message: "Pruefe..." },
    glm: { state: "unknown", message: "Pruefe..." },
    google: { state: "unknown", message: "Pruefe..." },
    anthropic: { state: "unknown", message: "Pruefe..." },
    openrouter: { state: "unknown", message: "Pruefe..." },
  });
  const [status, setStatus] = useState<string | null>(null);
  const [activePromptKey, setActivePromptKey] = useState<keyof SystemPrompts>("wizardDefault");
  const [routingFilters, setRoutingFilters] = useState<Record<keyof ModelRouting, string>>({
    wizard: "",
    taskWizard: "",
    planning: "",
    taskImplementation: "",
    taskTests: "",
    taskFix: "",
    research: "",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setSettings(data.settings);
        if (data.keySources) {
          setKeySources(data.keySources);
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("Einstellungen konnten nicht geladen werden.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchModels = async (provider: ProviderName) => {
      const response = await fetch(`/api/models?provider=${provider}`);
      const text = await response.text();
      try {
        const data = JSON.parse(text) as {
          models?: string[];
          modelDetails?: { id: string; tier?: "free" | "paid" }[];
          error?: string;
        };
        return { ok: response.ok, data };
      } catch {
        return { ok: false, data: { models: [] } };
      }
    };
    Promise.all(PROVIDERS.map((provider) => fetchModels(provider))).then((results) => {
      if (!active) return;
      const next: Record<ProviderName, string[]> = {
        openai: [],
        glm: [],
        google: [],
        anthropic: [],
        openrouter: [],
      };
      const nextDetails: Record<ProviderName, { id: string; tier?: "free" | "paid" }[]> = {
        openai: [],
        glm: [],
        google: [],
        anthropic: [],
        openrouter: [],
      };
      const nextStatus = { ...providerStatus };
      results.forEach((result, index) => {
        const provider = PROVIDERS[index];
        next[provider] = result.data.models ?? [];
        nextDetails[provider] = result.data.modelDetails ?? [];
        const hasKey = Boolean(settings?.providerKeys?.[provider]) || keySources[provider] !== "missing";
        if (!hasKey) {
          nextStatus[provider] = { state: "missing", message: "Kein Key" };
          return;
        }
        if (!result.ok) {
          nextStatus[provider] = { state: "error", message: "Fehler" };
          return;
        }
        if (next[provider].length) {
          nextStatus[provider] = { state: "connected", message: "Verbunden" };
        } else {
          nextStatus[provider] = { state: "error", message: "Keine Modelle" };
        }
      });
      setModels(next);
      setModelDetails(nextDetails);
      setProviderStatus(nextStatus);
    });
    return () => {
      active = false;
    };
  }, [settings, keySources]);

  async function saveSettings() {
    if (!settings) return;
    setStatus(null);
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (response.ok) {
      setStatus("Gespeichert.");
    } else {
      setStatus("Speichern fehlgeschlagen.");
    }
  }

  if (!settings) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="panel p-6">Lade Einstellungen...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="panel-glass glow-line p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
          <span className="pulse h-2 w-2 rounded-full bg-[var(--accent-2)]" />
          Einstellungen
        </div>
        <h1 className="mt-4 font-[var(--font-display)] text-3xl font-semibold">
          Provider & Routing
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Hinterlege API Keys und lege fest, welches Modell welche Aufgabe uebernimmt.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setTab("providers")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold ${
            tab === "providers"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--ring)]"
              : "border border-white/15"
          }`}
        >
          Provider
        </button>
        <button
          onClick={() => setTab("routing")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold ${
            tab === "routing"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--ring)]"
              : "border border-white/15"
          }`}
        >
          Routing
        </button>
        <button
          onClick={() => setTab("prompts")}
          className={`rounded-xl px-4 py-2 text-xs font-semibold ${
            tab === "prompts"
              ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--ring)]"
              : "border border-white/15"
          }`}
        >
          Systemprompts
        </button>
        <div className="ml-auto flex items-center gap-3">
          {status && <span className="text-xs text-[var(--muted)]">{status}</span>}
          <button
            onClick={saveSettings}
            className="rounded-xl bg-[var(--accent-2)] px-4 py-2 text-xs font-semibold text-black shadow-lg shadow-[var(--ring)]"
          >
            Speichern
          </button>
        </div>
      </div>

      {tab === "providers" ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="panel p-6">
            <h2 className="text-base font-semibold">API Keys</h2>
            <div className="mt-4 grid gap-4">
              {(["openai", "glm", "google", "anthropic", "openrouter"] as ProviderName[]).map(
                (provider) => (
                  <div
                    key={provider}
                    className="grid gap-2 rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4"
                  >
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      <span>{provider}</span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            providerStatus[provider].state === "connected"
                              ? "bg-[var(--accent-2)]"
                              : providerStatus[provider].state === "missing"
                                ? "bg-white/30"
                                : "bg-[var(--accent-3)]"
                          }`}
                        />
                        {providerStatus[provider].message}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                      <input
                        type="password"
                        value={settings.providerKeys[provider] ?? ""}
                        placeholder={
                          keySources[provider] === "env"
                            ? "Key via .env aktiv"
                            : "API Key eingeben"
                        }
                        onChange={(event) =>
                          setSettings((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  providerKeys: {
                                    ...prev.providerKeys,
                                    [provider]: event.target.value,
                                  },
                                }
                              : prev
                          )
                        }
                        className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
                      />
                      <div className="flex gap-2">
                        {PROVIDER_PORTAL[provider] && (
                          <a
                            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-center"
                            href={PROVIDER_PORTAL[provider]}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abo
                          </a>
                        )}
                        {PROVIDER_LOGIN[provider] && (
                          <a
                            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-center"
                            href={PROVIDER_LOGIN[provider]}
                            target="_blank"
                            rel="noreferrer"
                          >
                            API Key
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {settings.providerKeys[provider]
                        ? `Gespeichert: ${"*".repeat(
                            Math.min(settings.providerKeys[provider]?.length ?? 0, 20)
                          )}`
                        : keySources[provider] === "env"
                          ? "Aktiv via .env.local."
                          : "Kein Key gespeichert."}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
          <section className="panel p-6">
            <h2 className="text-base font-semibold">Base URLs</h2>
            <div className="mt-4 grid gap-4 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              <label className="grid gap-2">
                GLM Chat
                <input
                  value={settings.providerBaseUrls.glm ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: { ...prev.providerBaseUrls, glm: event.target.value },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                GLM Models
                <input
                  value={settings.providerBaseUrls.glmModels ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: { ...prev.providerBaseUrls, glmModels: event.target.value },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                Google Base
                <input
                  value={settings.providerBaseUrls.google ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: { ...prev.providerBaseUrls, google: event.target.value },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                Google Models
                <input
                  value={settings.providerBaseUrls.googleModels ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: { ...prev.providerBaseUrls, googleModels: event.target.value },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                Anthropic Base
                <input
                  value={settings.providerBaseUrls.anthropic ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: {
                              ...prev.providerBaseUrls,
                              anthropic: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                Anthropic Models
                <input
                  value={settings.providerBaseUrls.anthropicModels ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: {
                              ...prev.providerBaseUrls,
                              anthropicModels: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                OpenRouter Base
                <input
                  value={settings.providerBaseUrls.openrouter ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: {
                              ...prev.providerBaseUrls,
                              openrouter: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
              <label className="grid gap-2">
                OpenRouter Models
                <input
                  value={settings.providerBaseUrls.openrouterModels ?? ""}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            providerBaseUrls: {
                              ...prev.providerBaseUrls,
                              openrouterModels: event.target.value,
                            },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
            </div>
          </section>
        </div>
      ) : tab === "routing" ? (
        <section className="panel p-6">
          <h2 className="text-base font-semibold">Routing</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Lege fest, welcher Provider und welches Modell pro Phase verwendet wird.
          </p>
          <div className="mt-6 grid gap-3">
            {ROUTING_ROWS.map((row) => (
              <div
                key={row.key}
                className="grid gap-2 rounded-2xl border border-white/10 bg-[var(--surface-strong)] px-4 py-3 sm:grid-cols-[1fr_160px_1fr_1fr] sm:items-center"
              >
                <span className="text-sm font-medium">{row.label}</span>
                <select
                  value={settings.modelRouting[row.key].provider}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            modelRouting: {
                              ...prev.modelRouting,
                              [row.key]: {
                                ...prev.modelRouting[row.key],
                                provider: event.target.value as ProviderName,
                              },
                            },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  {PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
                <input
                  value={routingFilters[row.key] ?? ""}
                  onChange={(event) =>
                    setRoutingFilters((prev) => ({ ...prev, [row.key]: event.target.value }))
                  }
                  placeholder="Modelle filtern..."
                  className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <select
                  value={settings.modelRouting[row.key].model}
                  onChange={(event) =>
                    setSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            modelRouting: {
                              ...prev.modelRouting,
                              [row.key]: {
                                ...prev.modelRouting[row.key],
                                model: event.target.value,
                              },
                            },
                          }
                        : prev
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  {settings.modelRouting[row.key].provider === "openrouter" &&
                  modelDetails.openrouter.length ? (
                    <>
                      <optgroup label="Free">
                        {modelDetails.openrouter
                          .filter((item) => item.tier === "free")
                          .filter((item) =>
                            (routingFilters[row.key] ?? "")
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
                            (routingFilters[row.key] ?? "")
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
                    (models[settings.modelRouting[row.key].provider] ?? [])
                      .filter((model) =>
                        (routingFilters[row.key] ?? "")
                          .toLowerCase()
                          .split(" ")
                          .filter(Boolean)
                          .every((token) => model.toLowerCase().includes(token))
                      )
                      .map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))
                  )}
                  {!models[settings.modelRouting[row.key].provider]?.length &&
                    !modelDetails.openrouter.length && (
                      <option value={settings.modelRouting[row.key].model}>
                        {settings.modelRouting[row.key].model}
                      </option>
                    )}
                </select>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel p-6">
          <h2 className="text-base font-semibold">Systemprompts</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Waehle einen Prompt und passe ihn an. Aenderungen wirken sofort fuer neue Runs.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4">
              <label className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Prompt-Auswahl
              </label>
              <select
                className="mt-3 w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm"
                value={activePromptKey}
                onChange={(event) =>
                  setActivePromptKey(event.target.value as keyof SystemPrompts)
                }
              >
                {PROMPT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-3 text-xs text-[var(--muted)]">
                {PROMPT_OPTIONS.find((item) => item.key === activePromptKey)?.hint}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4">
              <label className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
                Inhalt
              </label>
              <textarea
                className="mt-3 min-h-[260px] w-full rounded-xl border border-white/10 bg-[var(--surface)] px-3 py-2 text-sm"
                value={settings.systemPrompts[activePromptKey] ?? ""}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          systemPrompts: {
                            ...prev.systemPrompts,
                            [activePromptKey]: event.target.value,
                          },
                        }
                      : prev
                  )
                }
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

