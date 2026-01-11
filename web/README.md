# Kaiban Studio

AI-Powered Multi-Agent Workflow System für die Erstellung, Verwaltung und Ausführung von komplexen Aufgaben mit intelligenten Agenten.

## 🚀 Features

- **Multi-Agent-System**: Definiere Rollen, Ziele und Modell-Overrides für jeden Agenten
- **Task-Management**: Sequenzielle Ausführung von Aufgaben mit Abhängigkeiten
- **Automatische Tests**: Erkennung und Ausführung von Tests nach jedem Task
- **Fix-Loops**: Automatische Fehlerbehebung mit Wiederholungsstrategien
- **Plugin-System**: Erweiterbare Architektur für Custom Tools und Agents
- **Event-System**: Lose Kopplung zwischen Komponenten mit EventEmitter
- **Multiple AI Providers**: Unterstützung für OpenAI, GLM, Google, Anthropic und OpenRouter
- **Wizard-Assistent**: Interaktiver Projekt-Erstellungsassistent
- **TypeScript Strict Mode**: Typesichere Implementierung

## 📋 Voraussetzungen

- Node.js 18 oder höher
- npm, yarn oder pnpm
- Git (für Version Control)

## 🛠️ Installation

### 1. Repository klonen

```bash
git clone https://github.com/andreaspointecker-source/Candy-Studio.git
cd Candy-Studio/web
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

Kopiere die Beispiel-Datei:

```bash
copy .env.example .env.local
```

Trage deinen API-Key in `.env.local` ein:

```env
# OpenAI (Standard)
OPENAI_API_KEY=sk-your-key-here

# Optional: GLM
GLM_API_KEY=your-glm-key
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/

# Optional: Google
GOOGLE_API_KEY=your-google-key

# Optional: Anthropic
ANTHROPIC_API_KEY=your-anthropic-key

# Optional: OpenRouter
OPENROUTER_API_KEY=your-openrouter-key
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft unter `http://localhost:3333`

## 📁 Projektstruktur

```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── designer/       # Workflow Designer API
│   │   │   ├── projects/       # Projekt-CRUD
│   │   │   ├── wizard/         # Wizard API
│   │   │   └── settings/      # Settings API
│   │   ├── components/         # Reusable Components
│   │   ├── designer/          # Workflow Designer UI
│   │   ├── projects/          # Projekt-Management
│   │   └── settings/          # Settings Page
│   └── lib/                  # Core Libraries
│       ├── events.ts           # Event-System
│       ├── plugins/           # Plugin-System
│       ├── providers/         # AI Provider
│       ├── runner.ts          # Task Execution Engine
│       ├── storage.ts         # File Storage
│       ├── wizard.ts          # Project Wizard
│       └── taskWizard.ts     # Task Wizard
├── projects/                 # Project Files
│   └── <project-id>/
│       ├── plan.md           # Projektplan
│       ├── tasks.md          # Aufgabenliste
│       ├── team.json         # Agenten-Konfiguration
│       └── workspace/        # Arbeitsverzeichnis
└── logs/                    # Application Logs
```

## 🎯 Verwendung

### Neues Projekt erstellen

1. Navigiere zu "Neues Projekt"
2. Folge dem Wizard-Assistenten
3. Definiere Projektname, Beschreibung und Ziele
4. Erstelle Agenten mit Rollen und Zielen
5. Definiere Aufgaben und Abhängigkeiten
6. Wähle Modelle für jede Phase

### Aufgaben ausführen

1. Öffne ein Projekt
2. Gehe zum "Tasks" Tab
3. Starte einen Task oder alle Tasks
4. Verfolge den Fortschritt in Echtzeit
5. Prüfe automatisch generierte Tests
6. Analysiere Fehler und Fixes

### Workflow konfigurieren

1. Öffne den "Designer"
2. Erstelle visuelle Workflows
3. Verbinde Nodes mit Edges
4. Definiere Parameter und Outputs
5. Speichere und führe aus

## 🏗️ Architektur

### Event-System

Das Event-System ermöglicht lose Kopplung zwischen Komponenten:

```typescript
import { EventEmitter } from '@/lib/events';

const emitter = new EventEmitter();

// Event emitten
emitter.emit('task:started', { taskId: '123' });

// Event zuhören
emitter.on('task:completed', (data) => {
  console.log('Task abgeschlossen:', data);
});
```

### Plugin-System

Erweitere die Funktionalität mit Plugins:

```typescript
import { Plugin, Tool } from '@/lib/plugins';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  tools: [
    {
      name: 'my-tool',
      description: 'Beschreibung',
      execute: async (params) => {
        // Implementierung
      }
    }
  ]
};
```

### Task Runner

Der Runner führt Tasks sequenziell aus:

1. **Planning**: Agent erstellt Plan
2. **Execution**: Agent führt Aufgaben aus
3. **Testing**: Automatische Test-Erkennung
4. **Fixing**: Fehlerbehebung bei Fehlern
5. **Completion**: Finalisierung

## 🔧 Konfiguration

### Modell-Selektion

Im Wizard und in jedem Projekt kannst du pro Phase ein Modell wählen:

- **Wizard**: Modell für Projekt-Erstellung
- **Planning**: Modell für Aufgabenplanung
- **Task-Run**: Modell für Task-Ausführung
- **Testing**: Modell für Test-Erstellung
- **Fixing**: Modell für Fehlerbehebung

### Provider-Konfiguration

Unterstützte Provider:

| Provider | Modelle | Status |
|----------|---------|--------|
| OpenAI | GPT-4, GPT-3.5 | ✅ Stabil |
| GLM | GLM-4 | ✅ Stabil |
| Google | Gemini | ✅ Stabil |
| Anthropic | Claude | ✅ Stabil |
| OpenRouter | Multi-Model | ✅ Stabil |

## 🧪 Testing

### Unit Tests ausführen

```bash
npm test
```

### Tests mit Coverage

```bash
npm test -- --coverage
```

### E2E Tests

```bash
npm run test:e2e
```

## 📚 Dokumentation

- [ROADMAP.md](ROADMAP.md) - Strategische Roadmap
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - Detaillierter Plan
- [TASKS.md](TASKS.md) - Aufgabenliste
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution Guidelines

## 🤝 Beitragen

Wir schätzen Beiträge! Bitte lies unsere [CONTRIBUTING.md](CONTRIBUTING.md) für Details.

### Wie beitragen?

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'feat: add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Erstelle einen Pull Request

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

## 🐛 Bekannte Probleme

- [ ] Liste der bekannten Probleme

## ❓ Häufig gestellte Fragen (FAQ)

### Wie wechsle ich den AI Provider?

Editiere `.env.local` und füge den entsprechenden API-Key hinzu. Du kannst auch mehrere Provider gleichzeitig konfigurieren.

### Kann ich eigene Plugins erstellen?

Ja! Das Plugin-System ist vollständig dokumentiert in [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

### Wie werden Tests ausgeführt?

Der Runner erkennt automatisch Test-Dateien (`*test*.ts`, `*.test.ts`) im Workspace und führt sie aus.

### Was passiert bei Fehlern?

Das System versucht bis zu `maxFixIterations` Mal, Fehler automatisch zu beheben. Danach wird eine detaillierte Fehlermeldung angezeigt.

## 📞 Support

- 📖 [Dokumentation](docs/)
- 💬 [Discussions](https://github.com/andreaspointecker-source/Candy-Studio/discussions)
- 🐛 [Issues](https://github.com/andreaspointecker-source/Candy-Studio/issues)

## 🙏 Danksagung

Vielen Dank an alle Mitwirkenden und die Open-Source-Community!

---

**Mit ❤️ von der Candy Studio Community**
