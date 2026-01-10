# Workflow: Neues Projekt bis Task-Abschluss

Diese Datei beschreibt den kompletten Ablauf fuer neue Projekte in Kaiban Studio – vom Wizard bis zur fertigen Task-Ausfuehrung.

## 1) Projekt Wizard (Neues Projekt)

### Schritt 1: Grunddaten
- Projektname, Beschreibung und optionaler Speicherort angeben.
- Der Projektname wird als Ordnername (slug) verwendet.
- Ein optionaler Speicherort legt das Basisverzeichnis fest; darin wird der Projektordner angelegt.

### Schritt 2: Projektart
- Auswahl der Projektart (Homepage, Web App, Desktop App, Mobile App, Sonstiges).
- Diese Auswahl steuert den Systemprompt fuer den Wizard (spezifische Rueckfragen).
- Mit "KI-Chat starten" wird der Wizard aktiviert.

### Schritt 3: Projekt-Chat
- Die KI stellt Rueckfragen basierend auf den Grunddaten und der Projektart.
- Du kannst beliebig weiter chatten und Anforderungen verfeinern.
- "Zusammenfassung" erzeugt eine konsolidierte Projektbeschreibung.
- Danach wechselt der Button zu "Projekt erstellen".

## 2) Projekt-Erstellung

Beim Klick auf "Projekt erstellen" passiert Folgendes:
- Es wird ein Projektordner erstellt:
  - Basis: angegebener Speicherort oder Standard-`web/projects`
  - Ordnername: Projektname als slug (z.B. "Snake Game" -> "snake-game")
- Es werden Standarddateien angelegt:
  - `project.json` (Meta + Settings)
  - `plan.md`
  - `tasks.md`
  - `team.json` oder `team.yaml` (abh. von Storage-Format)
  - `workspace/` (Arbeitsverzeichnis)
- Das Projekt wird in der Projektliste angezeigt.

## 3) Plan + Team Generierung

Nach dem Wizard:
- Die KI erstellt einen Projektplan (Phasen + Tasks).
- Es wird ein Team mit Agenten erzeugt.
- Die Tasks werden in `tasks.md` und in der Team-Datei gespeichert.

## 4) Tasks ausfuehren

### Einzelne Task starten
- Beim Start wechselt der Status in "running".
- Die KI erstellt die Task-Implementierung (Dateien schreiben/loeschen/anlegen).
- Danach wechselt die Task in "testing".
- Tests werden automatisch ausgefuehrt (wenn `Auto-Tests` aktiv).
- Bei Fehlern startet die Fix-Schleife (max. Iterationen oder unbegrenzt bei 0).
- Nach erfolgreichem Test: Status "completed".

### Alle Tasks starten
- Startet nacheinander alle Tasks, die nicht "completed" sind.
- Statuswechsel erfolgt wie bei Einzel-Tasks.

## 5) Kanban-Ansicht

Die Kanban-Ansicht zeigt den Live-Status:
- To Do: `pending`
- Doing: `running`
- Testing: `testing`
- Done: `completed`
- Blocked: `failed`/`blocked`

## 6) Task-Details & Nachverfolgung

In der Task-Detailansicht:
- Dateien, die geaendert wurden, sind aufgelistet.
- Letzter Run (Summary, Output, Test-Output) ist sichtbar.
- Modell-Override pro Task kann gesetzt werden.

## 7) Systemprompts (Einstellungen)

Unter Einstellungen > Systemprompts:
- Alle Prompts sind zentral editierbar.
- Wizard nutzt je Projektart den passenden Prompt.
- Prompts fuer Plan/Team, Task Runner und UI-Designer sind getrennt konfigurierbar.

---

Kurz gesagt:
Wizard -> Zusammenfassung -> Projekt erstellen -> Plan/Team -> Tasks laufen -> Testing -> Done.
