# Kaiban Studio

Ein Web-UI fuer Projekt-Wizard, Task-Management und sequenzielle Ausfuehrung aehnlich KaibanJS.

## Setup

```bash
npm install
```

```bash
copy .env.example .env.local
```

Trage deinen OpenAI API Key in `.env.local` ein. Optional kannst du GLM nutzen
(`GLM_API_KEY` und ggf. `GLM_BASE_URL`), dann:

```bash
npm run dev
```

Die App laeuft unter `http://localhost:3000`.

## Projektstruktur

- `projects/`: alle erzeugten Projekte inkl. `plan.md`, `tasks.md`, `team.json` oder `team.yaml`
- `projects/<id>/workspace`: Workspace fuer die Task-Ausfuehrung
- `src/lib/runner.ts`: Task-Runner, Auto-Tests, Fix-Loops
- `src/app/api`: API fuer Wizard, Projekt-CRUD und Task-Runner

## Modelleinstellungen

Im Wizard und in jedem Projekt kannst du pro Arbeitsphase (Wizard, Planung, Task-Run, Tests, Fix)
ein Modell und den Provider (OpenAI/GLM) festlegen.

## Task-Ausfuehrung

Der Runner fordert vom Modell JSON-Actions an und schreibt die Dateien in `workspace/`.
Nach jedem Task werden Tests automatisch erkannt und ausgefuehrt. Bei Fehlern versucht
das System bis zu `maxFixIterations` automatische Fixes.
