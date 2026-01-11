# Kaiban Studio - Architektur-Dokumentation

Dieses Dokument beschreibt die System-Architektur, Design-Entscheidungen und technische Grundlagen von Kaiban Studio.

## Inhaltsverzeichnis

1. [Überblick](#Überblick)
2. [System-Architektur](#system-architektur)
3. [Komponenten-Design](#komponenten-design)
4. [Datenfluss](#datenfluss)
5. [Design-Entscheidungen](#design-entscheidungen)
6. [Technische Grundlagen](#technische-grundlagen)

---

## Überblick

Kaiban Studio ist ein AI-Powered Multi-Agent Workflow System mit folgenden Kernprinzipien:

- **Loose Kopplung**: Event-System für Kommunikation zwischen Komponenten
- **Erweiterbarkeit**: Plugin-System für Custom Tools und Agents
- **Trennung der Anliegen**: Klare Trennung zwischen UI, API, Business-Logik und Data-Layer
- **Type-Sicherheit**: TypeScript Strict Mode für zuverlässige Codebasis
- **Einfachheit**: Intuitive UI mit Wizard-Assistent für schnelle Projekt-Erstellung

---

## System-Architektur

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16)                    │
│                                                                  │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐
│  │              │              │              │               │
│  │    UI        │   API Layer   │   Server      │
│  │              │              │               │
│  │  ┌────────┐   │   ┌────────┐   │   ┌─────────┐   │
│  │  │ Pages │   │   │ Routes │   │   │ Actions  │   │
│  │  └────────┘   │   └────────┘   │   └─────────┘   │
│  └──────────────┴──────────────┴──────────────┴───────────────┘
│                                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                            │
                            │
┌───────────────────────────────┴─────────────────────────────────────┐
│                         Libraries (src/lib/)                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐   │
│  │  Events      │   Plugins     │   Providers   │   Utilities   │
│  │              │              │              │               │
│  └──────────────┴──────────────┴──────────────┴──────────────┘   │
└───────────────────────────────┴─────────────────────────────────────┘
                            │
┌───────────────────────────────┴─────────────────────────────────────┐
│                         Data Layer                               │
│  ┌──────────────┬──────────────┬──────────────────────────────────┐   │
│  │  Storage     │   Config      │   Logging     │   Schema     │
│  └──────────────┴──────────────┴──────────────────────────────┘   │
└───────────────────────────────┴─────────────────────────────────────┘
```

### Frontend (Next.js 16)

**Pages:**
- `page.tsx`: Hauptseite mit Projektliste
- `designer/page.tsx`: Visueller Workflow-Editor
- `projects/[projectId]/page.tsx`: Projekt-Dashboard
- `projects/[projectId]/tasks/[taskId]/page.tsx`: Task-Detailseite
- `projects/new/page.tsx`: Projekt-Erstellungsseite
- `settings/page.tsx`: Anwendungseinstellungen
- `tests/workflow/page.tsx`: Workflow-Tests

**API Routes:**
- `api/designer/*`: Designer API (Workflow CRUD, Wizard)
- `api/projects/*`: Projekt-CRUD API
- `api/projects/[projectId]/*`: Projekt-spezifische API
- `api/tasks/*`: Task Management API
- `api/wizard/*`: Wizard API
- `api/settings/*`: Settings API
- `api/logs/*`: Logging API

**Components:**
- `components/Sidebar.tsx`: Navigation
- `components/LogPanel.tsx`: Log-Anzeige
- `components/ProjectsList.tsx`: Projektliste

**Libraries (Core):**
- `events.ts`: Event-System
- `plugins/index.ts`: Plugin-System
- `runner.ts`: Task Execution Engine
- `storage.ts`: File Storage
- `wizard.ts`: Project Wizard
- `taskWizard.ts`: Task Wizard Logic
- `config.ts`: Konfiguration
- `logs.ts`: Logging
- `schema.ts`: TypeScript Schemas

**Libraries (External):**
- `providers/openai.ts`: OpenAI Provider
- `providers/glm.ts`: GLM Provider
- `providers/google.ts`: Google Provider
- `providers/anthropic.ts`: Anthropic Provider
- `providers/openrouter.ts`: OpenRouter Provider
- `providers/index.ts`: Provider Registry

**Data Layer:**
- `projects/`: Projekt-Dateien (plan.md, tasks.md, team.json)
- `projects/<id>/workspace/`: Arbeitsverzeichnis
- `logs/server.log`: Application Logs

---

## Komponenten-Design

### Event-System

Das Event-System basiert auf dem Observer-Pattern und ermöglicht lose Kopplung:

```typescript
// EventEmitter Class
class EventEmitter {
  private listeners: Map<EventType, Set<EventHandler>>;
  private history: EventPayload[];
  
  // Event emitten
  emit<T>(type: EventType, payload: T): void
  
  // Event zuhören
  on(type: EventType, handler: EventHandler): void
  
  // Event abmelden
  off(type: EventType, handler: EventHandler): void
}
```

**Verwendete Event-Typen:**
- `task:*`: Task-bezogene Events
- `project:*`: Projekt-bezogene Events
- `error:*`: Fehler-Events
- `agent:*`: Agent-bezogene Events
- `*`: Wildcard für alle Events

**Vorteile:**
- ✅ Lose Kopplung ohne direkte Abhängigkeiten
- ✅ Einfache Integration neuer Komponenten
- ✅ Event-History für Debugging
- ✅ Priority-basierte Handler

### Plugin-System

Erweiterbare Architektur für Custom Tools und Agents:

```typescript
// Plugin Interface
interface Plugin {
  name: string;
  version: string;
  description?: string;
  tools?: Tool[];
  agents?: AgentDefinition[];
}

// Tool Interface
interface Tool {
  name: string;
  description: string;
  execute: (params: any) => Promise<any>;
}

// Agent Definition
interface AgentDefinition {
  name: string;
  role: string;
  goal: string;
  model?: string; // Model Override
}
```

**Features:**
- ✅ Plugin Registry für dynamisches Laden
- ✅ Lifecycle Hooks (onLoad, onUnload)
- ✅ Version Management
- ✅ Dependency Resolution zwischen Plugins
- ✅ Typ-Sichere Registrierung

### Task Runner

Zentrale Engine für die Ausführung von Aufgaben:

```typescript
class TaskRunner {
  // Aufgaben sequenziell ausführen
  async run(project: Project): Promise<void>
  
  // Automatische Tests durchführen
  async test(project: Project): Promise<TestResult>
  
  // Fix-Loops bei Fehlern
  async fixIssues(project: Project, error: Error): Promise<void>
}
```

**Execution-Flow:**
1. **Planning**: Analysiert Aufgaben und erstellt Plan
2. **Execution**: Führt Tasks mit Agenten aus
3. **Testing**: Verifiziert Ergebnisse
4. **Fixing**: Behebt Fehler und wiederholt bei Bedarf
5. **Completion**: Finalisiert den Task

---

## Datenfluss

### Projekt-Erstellung (Wizard)

```
User Input
     │
     ▼
     │
     ├─→ Wizard API (/api/wizard)
     │   │
     │   ├─→ Analyze Request
     │   │   │
     │   ├─→ Create Project Plan
     │   │   │
     │   └─→ Generate team.json
     │         │
     │         ▼
     │         │
     └─→ Store in projects/<id>/
             │
             │
             ▼
             │
   Project Created
```

### Task-Ausführung

```
User: "Run Task"
     │
     ▼
     │
     ├─→ Task Runner
     │   │
     │   ├─→ Load team.json
     │   │   │
     │   ├─→ Initialize Agents
     │   │   │
     │   ├─→ Execute Phase
     │   │   │
     │   │   │
     │   ├─→ Run Agent Actions
     │   │   │   │
     │   │   │
     │   │   │
     │   └─→ Save Results
     │         │
     │         │
     │         ▼
     │         │
         └─→ Update Tasks/Logs
```

### Error-Handling

```
Error Occurs
     │
     ▼
     │
     ├─→ Error Parser
     │   │
     │   ├─→ Parse Error Message
     │   │   │
     │   ├─→ Extract Solutions
     │   │   │
     │   └─→ Format for Display
     │         │
     │         ▼
     │         │
         └─→ Show to User
              │
              │
              ▼
         User: "Retry" or "Fix"
              │
         └─→ Trigger Fix Loop
```

---

## Design-Entscheidungen

### 1. Lose Kopplung vs Trennter Layer

**Entscheidung:** Event-System für lose Kopplung anstatt direkter Abhängigkeiten

**Begründung:**
- ✅ Einfache Integration neuer Features
- ✅ Testbarkeit einzelner Komponenten
- ✅ Flexibilität bei Architekturänderungen
- ✅ Bessere Wartbarkeit

**Nachteile:**
- ⚠️ Event-History kann den Speicher erhöhen
- ⚠️ Schwierigeres Debugging bei komplexen Workflows
- ⚠️ Asynchrone Natur kann Race Conditions verursachen

### 2. File-Based Storage vs Database

**Entscheidung:** File-Based Storage (JSON/YAML)

**Begründung:**
- ✅ Einfache Migration und Backup
- ✅ Version Control mit Git
- ✅ Keine zusätzliche Infrastruktur nötig
- ✅ Transparente Speicherung in Klartext

**Nachteile:**
- ⚠️ Skalierungsprobleme bei großen Projekten
- ⚠️ Keine ACID-Transaktionen
- ⚠️ Keine komplexe Queries ohne zusätzliche Logik
- ⚠️ File-I/O kann bei großer Anzahl von Tasks langsam sein

**Mögliche Erweiterung:** Hybrid-Ansatz mit lokalen Files und optionalem SQLite

### 3. Monolith vs Microservices

**Entscheidung:** Monolith in einer Next.js App

**Begründung:**
- ✅ Einfachheit für MVP
- ✅ Keine Netzwerklatenz zwischen Services
- ✅ Einheitliches Deployment
- ✅ Einfachere Fehlerbehandlung

**Nachteile:**
- ⚠️ Koppelter Code bei größeren Änderungen
- ⚠️ Skalierungsprobleme bei hoher Last
- ⚠️ Schwierigeres Testen einzelner Features
- ⚠️ Single Point of Failure

**Mögliche Erweiterung:** Microservice-Architektur für kritische Komponenten (Task Runner, Event-Bus)

### 4. Synchrone vs Asynchrone Task-Ausführung

**Entscheidung:** Synchrone Ausführung mit sequenzieller Reihenfolge

**Begründung:**
- ✅ Einfache Implementierung
- ✅ Klare Abhängigkeiten zwischen Tasks
- ✅ Vorhersehbare Fehleranalyse
- ✅ Konsistente Ergebnisse

**Nachteile:**
- ⚠️ Langsame Ausführung bei vielen Tasks
- ⚠️ Keine parallele Ausführung
- ⚠️ Hoher Ressourcenverbrauch

**Mögliche Erweiterung:** Parallele Ausführung mit Dependency Graph (Phase 3.4)

---

## Technische Grundlagen

### TypeScript-Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true
    "noUnusedLocals": true,
    "noUnusedParameters": true
    "allowSyntheticDefaultImports": false
  }
}
```

**Konfigurierte Rules:**
- ✅ Keine implizite `any` Typen
- ✅ Striktes Null-Checking
- ✅ Verbot von ungeschützen Eigenschaftszugriffen
- ✅ Explizite `return` bei void-Funktionen

### ESLint-Regeln

```javascript
{
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "no-shadow": "warn",
    "no-console": process.env.NODE_ENV === "production" ? "error" : "warn",
    "semi": ["error", "always"],
    "quotes": ["error", "double"]
  }
}
```

### Code-Standards

**TypeScript:**
- Interfaces für komplexe Typen
- Type Guards für Runtime-Validierung
- Branded String Types für Fehlermeldungen
- Generics für wiederverwendbare Komponenten

**Namen:**
- **Variablen/Funktionen:** camelCase (`myVariable`, `myFunction`)
- **Klassen/Components:** PascalCase (`MyComponent`, `MyClass`)
- **Konstanten:** UPPER_SNAKE_CASE (`API_KEY`, `MAX_RETRIES`)
- **Interfaces:** PascalCase mit I-Präfix (`IPlugin`, `ITool`)
- **Typen:** PascalCase ohne Präfix (`PluginType`, `ToolType`)

### Git-Hooks (Husky)

```bash
# Pre-commit Hook
.husky/pre-commit

#!/bin/sh
"$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Aktionen:**
1. ESLint auf alle staged Files
2. Prettier zum Formatieren
3. Automatische Fehlerbehebung (--fix)

---

## Performance-Betrachtungen

### Memory-Management

- **Event-History:** Begrenzung auf 100 Events pro Session
- **Datei-System:** Lazy Loading für große Projekte
- **Plugin-Cache:** Caching geladener Plugins

### Task-Ausführung

- **Batch-Processing:** Mehrere Tasks gleichzeitig wenn möglich
- **Caching:** Zwischenspeicher für häufige Operationen
- **Connection Pooling:** Wiederverwendung von Provider-Verbindungen

---

## Sicherheit

### API-Keys

- **Keine Hardcodierung:** API-Keys nur aus `.env.local`
- **Kein Commit von Secrets:** `.env.local` in `.gitignore`
- **Environment-spezifisch:** Unterschiedliche Keys für Dev/Prod/Stage

### File-Zugriff

- **Path-Traversal-Schutz:** Validierung von Dateipfaden
- **File-Type-Validierung:** Nur JSON/YAML für Projekt-Dateien
- **Größenlimitierung:** Max. 10MB pro Workspace-Datei

---

## Trade-offs

| Entscheidung | Vorteil | Nachteil |
|-----------|---------|-----------|
| File-Based Storage | Einfach, Git-Tracking | Skalierung, No Queries |
| Synchrone Tasks | Einfach, Konsistent | Langsam, Parallelität |
| Event-System | Lose Kopplung, Flexibel | Debugging-Komplexität |
| Monolith | Einfach, Einheitliches Deploy | Koppelter Code, SPOF |
| Strict TypeScript | Typesichere Code | Steile Lernkurve |

---

## Zukunftige Erweiterungen

### Phase 3: Erweiterte Agent-Fähigkeiten
- Memory-Management für langfristigen Kontext
- Vector Search für RAG-Integration
- Agent-Kommunikation für Multi-Agent-Kooperation
- Parallel Task Execution mit Dependency Graph
- Permissions-System

### Phase 4: Workflow-Engine
- Visueller Graph-Editor für komplexere Workflows
- Condition Nodes (if/else)
- Loop Nodes (while, for)
- Workflow Templates

### Phase 5: Testing & Qualität
- E2E-Tests für UI-Interaktionen
- Integrationstests für End-to-End-Szenarien
- Performance-Tests
- Code Coverage >80%

---

## Fazit

Kaiban Studio wurde mit folgenden Prinzipien entwickelt:

1. **Einfachheit vor Perfektion**: Fokus auf nutzbare Features
2. **Loose Kopplung für Flexibilität**: Event-System
3. **Erweiterbarkeit**: Plugin-System
4. **Type-Sicherheit**: TypeScript Strict Mode
5. **Automatisierung**: Fix-Loops und Auto-Tests

Diese Architektur ermöglicht schnelle Entwicklung, leichte Wartbarkeit und problemlose Erweiterung des Systems.

---

**Dokumentation aktualisiert:** 11.01.2026
