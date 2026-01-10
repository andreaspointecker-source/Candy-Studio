"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProjectMeta = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects")
      .then(async (response) => {
        const text = await response.text();
        const data = text ? (JSON.parse(text) as { projects?: ProjectMeta[]; error?: string }) : {};
        if (!response.ok || data.error) {
          throw new Error(data.error ?? "Fehler beim Laden.");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setProjects(data.projects ?? []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? "Fehler beim Laden.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Lade Projekte...</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--muted)]">Fehler: {error}</p>;
  }

  if (!projects.length) {
    return (
      <div className="panel p-6 text-sm text-[var(--muted)]">
        Noch keine Projekte. Starte mit dem Wizard.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="group panel card p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-[var(--font-display)] text-lg font-semibold">
                {project.name}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {project.description || "Keine Beschreibung"}
              </p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-[var(--muted)]">
              {new Date(project.createdAt).toLocaleDateString("de-DE")}
            </span>
          </div>
          <div className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--accent-2)]">
            Projekt öffnen
          </div>
        </Link>
      ))}
    </div>
  );
}
