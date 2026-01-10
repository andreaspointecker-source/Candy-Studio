"use client";

import { useMemo, useRef, useState } from "react";

type ProjectData = {
  meta: { id: string; name: string; description: string };
};

type Task = {
  id: string;
  description: string;
  status: string;
};

type Team = {
  name: string;
  tasks: Task[];
};

type Step =
  | "idle"
  | "creating"
  | "runningOne"
  | "waitingOne"
  | "runningAll"
  | "waitingAll"
  | "done"
  | "error";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function WorkflowTestPage() {
  const [step, setStep] = useState<Step>("idle");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(true);

  const statusLabel = useMemo(() => {
    switch (step) {
      case "creating":
        return "Projekt wird erstellt...";
      case "runningOne":
        return "Ersten Task starten...";
      case "waitingOne":
        return "Warte auf Abschluss des ersten Tasks...";
      case "runningAll":
        return "Alle Tasks starten...";
      case "waitingAll":
        return "Warte auf Abschluss aller Tasks...";
      case "done":
        return "Fertig: Alle Tasks abgeschlossen.";
      case "error":
        return "Fehler im Workflow.";
      default:
        return "Bereit.";
    }
  }, [step]);

  function log(message: string) {
    setLogLines((prev) => [...prev, `${new Date().toLocaleTimeString("de-DE")}: ${message}`]);
  }

  async function fetchProject(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}`);
    const text = await response.text();
    if (text.trim().startsWith("<")) {
      throw new Error("Serverfehler: HTML-Antwort.");
    }
    const data = text
      ? (JSON.parse(text) as { project?: ProjectData; team?: Team; error?: string })
      : {};
    if (!response.ok || data.error || !data.project || !data.team) {
      throw new Error(data.error ?? "Projekt konnte nicht geladen werden.");
    }
    return data;
  }

  async function waitForTask(
    projectId: string,
    predicate: (tasks: Task[]) => boolean,
    label: string
  ) {
    while (runningRef.current) {
      const data = await fetchProject(projectId);
      setProject(data.project);
      setTeam(data.team);
      if (predicate(data.team.tasks)) {
        log(`${label} abgeschlossen.`);
        return;
      }
      await sleep(2500);
    }
  }

  async function startWorkflow() {
    runningRef.current = true;
    setError(null);
    setLogLines([]);
    setProject(null);
    setTeam(null);

    try {
      setStep("creating");
      const name = `workflow-landing-${Date.now()}`;
      log(`Projekt "${name}" wird erstellt (Landingpage mit Animationen).`);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: {
            name,
            description:
              "Landingpage mit passenden Texten, CTA und sichtbaren Animationen. " +
              "Es soll Maus-Animationen geben (mousemove bewegt Elemente) und einen Hover-Reveal Effekt " +
              "bei Karten oder Bereichen.",
            projectType: "homepage",
            goals: ["Demo-Landingpage mit Animationen", "Interaktive Effekte"],
            features: [
              "Hero mit klarer Headline und Subline",
              "CTA Button",
              "Feature-Sektion mit Karten",
              "Maus-Animationen (Parallax)",
              "Hover-Reveal Effekt auf Karten",
            ],
            targetUsers: ["Demo"],
            techStack: ["HTML", "CSS", "JavaScript"],
            constraints: [
              "Mausbewegung beeinflusst sichtbare Elemente",
              "Hover-Reveal Effekt mit Hintergrundwechsel",
              "Animationen sollen sichtbar und smooth sein",
            ],
            successCriteria: [
              "Landingpage ist in Browser sichtbar",
              "Maus-Animationen reagieren",
              "Hover-Reveal Effekt sichtbar",
            ],
          },
        }),
      });
      const text = await response.text();
      if (text.trim().startsWith("<")) {
        throw new Error("Serverfehler: HTML-Antwort.");
      }
      const data = text ? (JSON.parse(text) as { projectId?: string; error?: string }) : {};
      if (!response.ok || data.error || !data.projectId) {
        throw new Error(data.error ?? "Projekt konnte nicht erstellt werden.");
      }

      const projectId = data.projectId;
      log(`Projekt-ID: ${projectId}`);
      const loaded = await fetchProject(projectId);
      setProject(loaded.project);
      setTeam(loaded.team);

      const firstTask = loaded.team.tasks[0];
      if (!firstTask) {
        throw new Error("Keine Tasks vorhanden.");
      }

      setStep("runningOne");
      log(`Starte Task: ${firstTask.description}`);
      await fetch(`/api/projects/${projectId}/tasks/${firstTask.id}/run`, {
        method: "POST",
      });

      setStep("waitingOne");
      await waitForTask(
        projectId,
        (tasks) => tasks.find((task) => task.id === firstTask.id)?.status === "completed",
        "Erster Task"
      );

      setStep("runningAll");
      log("Starte alle Tasks.");
      await fetch(`/api/projects/${projectId}/run`, { method: "POST" });

      setStep("waitingAll");
      await waitForTask(
        projectId,
        (tasks) => tasks.every((task) => task.status === "completed"),
        "Alle Tasks"
      );

      setStep("done");
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
      log("Fehler im Workflow.");
    }
  }

  function stopWorkflow() {
    runningRef.current = false;
    log("Workflow gestoppt.");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="panel-glass glow-line p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
          <span className="pulse h-2 w-2 rounded-full bg-[var(--accent-2)]" />
          Workflow Test
        </div>
        <h1 className="mt-4 font-[var(--font-display)] text-3xl font-semibold">
          Projekt-Ablauf im Browser
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Erstellt ein kleines Projekt, startet einen Task, danach alle Tasks, bis alles DONE ist.
        </p>
      </header>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white"
            onClick={startWorkflow}
            disabled={step !== "idle" && step !== "done" && step !== "error"}
          >
            Workflow starten
          </button>
          <button
            className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold"
            onClick={stopWorkflow}
          >
            Stoppen
          </button>
          <span className="text-sm text-[var(--muted)]">{statusLabel}</span>
          {project?.meta?.id && (
            <a
              className="ml-auto rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold"
              href={`/projects/${project.meta.id}`}
            >
              Projekt oeffnen
            </a>
          )}
        </div>
        {error && <p className="mt-4 text-sm text-[var(--accent)]">{error}</p>}
      </section>

      <section className="panel p-6">
        <h2 className="text-base font-semibold">Live-Log</h2>
        <pre className="workflow-log mt-3">
          {logLines.length ? logLines.join("\n") : "Noch keine Eintraege."}
        </pre>
      </section>

      {team && (
        <section className="panel p-6">
          <h2 className="text-base font-semibold">Task-Status</h2>
          <div className="mt-4 grid gap-3">
            {team.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4"
              >
                <p className="text-sm font-semibold">{task.description}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]">
                  {task.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
