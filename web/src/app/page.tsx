import Link from "next/link";
import { ProjectsList } from "@/components/ProjectsList";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
      <header className="fade-up panel-glass glow-line flex flex-col gap-8 p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.35em] text-[var(--accent-2)]">
              <span className="pulse h-2 w-2 rounded-full bg-[var(--accent-2)]" />
              Candy Studio
            </div>
            <h1 className="mt-4 font-[var(--font-display)] text-4xl font-semibold leading-tight sm:text-5xl">
              Erstelle Projekte, steuere Agenten, lasse Tasks sequenziell laufen.
            </h1>
            <p className="mt-4 text-base text-[var(--muted)] sm:text-lg">
              Ein fokussierter Workspace fuer Planung, Task-Management, automatische Tests
              und Rueckkopplung mit KI.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects/new"
              className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--ring)] transition hover:-translate-y-0.5"
            >
              Neues Projekt starten
            </Link>
            <a
              href="https://docs.kaibanjs.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              KaibanJS Referenz
            </a>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-[var(--muted)] sm:grid-cols-3">
          <div className="fade-up delay-1 card rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4">
            Multi-Agent-Setup mit Rollen, Goals und Model-Overrides.
          </div>
          <div className="fade-up delay-2 card rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4">
            Tasks speichern, bearbeiten und automatisiert ausfuehren.
          </div>
          <div className="fade-up delay-2 card rounded-2xl border border-white/10 bg-[var(--surface-strong)] p-4">
            Tests laufen nach jedem Task, Fehler werden iterativ gefixt.
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Deine Projekte</h2>
          <Link
            href="/projects/new"
            className="text-sm font-semibold text-[var(--accent)]"
          >
            + Wizard starten
          </Link>
        </div>
        <ProjectsList />
      </section>
    </div>
  );
}
