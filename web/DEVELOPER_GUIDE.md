# Kaiban Studio - Entwickler-Guide

Dieser Guide hilft Entwicklern, das System zu erweitern und eigene Features zu entwickeln.

## Inhaltsverzeichnis

1. [Plugin-Entwicklung](#plugin-entwicklung)
2. [Agent-Entwicklung](#agent-entwicklung)
3. [Tool-Entwicklung](#tool-entwicklung)
4. [Event-System](#event-system)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)

---

## Plugin-Entwicklung

### Grundstruktur

```typescript
import { Plugin, Tool, AgentDefinition } from '@/lib/plugins';

const myPlugin: Plugin = {
  name: 'my-awesome-plugin',
  version: '1.0.0',
  description: 'Beschreibung des Plugins',
  tools: [
    // Tools definieren
  ],
  agents: [
    // Agents definieren
  ],
  onLoad: () => {
    console.log('Plugin geladen!');
  },
  onUnload: () => {
    console.log('Plugin entladen!');
  }
};

export default myPlugin;
```

### Plugin registrieren

```typescript
import { PluginRegistry } from '@/lib/plugins';
import myPlugin from './my-plugin';

// Plugin registrieren
PluginRegistry.register(myPlugin);
```

### Lifecycle Hooks

**onLoad:**
- Wird aufgerufen, wenn das Plugin geladen wird
- Geeignet für Initialisierungen
- Kann asynchron sein

**onUnload:**
- Wird aufgerufen, wenn das Plugin entladen wird
- Geeignet für Cleanup-Operationen
- Kann asynchron sein

### Plugin-Abhängigkeiten

```typescript
const pluginWithDeps: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  dependencies: [
    {
      name: 'other-plugin',
      version: '^1.0.0' // Semver-Spezifikation
    }
  ]
};
```

### Example: Einfaches Plugin

```typescript
import { Plugin, Tool } from '@/lib/plugins';

const examplePlugin: Plugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'Ein Beispiel-Plugin mit Tools',

  tools: [
    {
      name: 'calculate-sum',
      description: 'Berechnet die Summe zweier Zahlen',
      async execute(params: { a: number; b: number }) {
        const { a, b } = params;
        return {
          success: true,
          result: a + b
        };
      }
    }
  ],

  onLoad() {
    console.log('Example Plugin geladen!');
  }
};

export default examplePlugin;
```

---

## Agent-Entwicklung

### Agent-Definition

```typescript
interface AgentDefinition {
  name: string;
  role: string;
  goal: string;
  backstory?: string;
  model?: string; // Override Standard-Modell
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
}
```

### Example: Custom Agent

```typescript
import { AgentDefinition, Tool } from '@/lib/plugins';

const codeReviewerAgent: AgentDefinition = {
  name: 'Code Reviewer',
  role: 'Senior Software Engineer',
  goal: 'Code auf Best Practices und Performance prüfen',
  backstory: 'Ich bin ein erfahrener Software Engineer mit 10 Jahren Erfahrung in React und TypeScript.',
  model: 'gpt-4', // Override Standard-Modell
  temperature: 0.3, // Konsistente Antworten
  maxTokens: 2000,
  tools: [
    // Tools hinzufügen
  ]
};
```

### Agent im Team registrieren

```typescript
import { Team } from '@/lib/schema';

const team: Team = {
  agents: [
    codeReviewerAgent,
    // Andere Agents
  ]
};
```

---

## Tool-Entwicklung

### Tool-Interface

```typescript
interface Tool {
  name: string;
  description: string;
  parameters?: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
  };
  execute: (params: any) => Promise<ToolResult>;
}
```

### Tool-Result

```typescript
interface ToolResult {
  success: boolean;
  result?: any;
  error?: string;
}
```

### Example: File-Tool

```typescript
const readFileTool: Tool = {
  name: 'read_file',
  description: 'Liest den Inhalt einer Datei',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Dateipfad',
        required: true
      }
    }
  },
  async execute(params: { path: string }) {
    try {
      const content = await readFile(params.path);
      return {
        success: true,
        result: content
      };
    } catch (error) {
      return {
        success: false,
        error: `Konnte Datei nicht lesen: ${error}`
      };
    }
  }
};
```

### Tool im Agent verwenden

```typescript
const agentWithTool: AgentDefinition = {
  name: 'File Reader',
  role: 'File System Specialist',
  goal: 'Dateien lesen und analysieren',
  tools: [readFileTool, writeFileTool]
};
```

### Example: HTTP-Request Tool

```typescript
const httpRequestTool: Tool = {
  name: 'http_request',
  description: 'Führt eine HTTP-Anfrage aus',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL',
        required: true
      },
      method: {
        type: 'string',
        description: 'HTTP Method (GET, POST, etc.)',
        required: true
      },
      body: {
        type: 'string',
        description: 'Request Body (für POST/PUT)',
        required: false
      }
    }
  },
  async execute(params: { url: string; method: string; body?: string }) {
    try {
      const response = await fetch(params.url, {
        method: params.method,
        body: params.body ? JSON.stringify(params.body) : undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      return {
        success: true,
        result: data
      };
    } catch (error) {
      return {
        success: false,
        error: `HTTP Request fehlgeschlagen: ${error}`
      };
    }
  }
};
```

---

## Event-System

### Event-Typen

```typescript
enum EventType {
  // Task Events
  TASK_STARTED = 'task:started',
  TASK_PROGRESS = 'task:progress',
  TASK_COMPLETED = 'task:completed',
  TASK_FAILED = 'task:failed',
  TASK_CANCELLED = 'task:cancelled',

  // Project Events
  PROJECT_CREATED = 'project:created',
  PROJECT_UPDATED = 'project:updated',
  PROJECT_DELETED = 'project:deleted',

  // Agent Events
  AGENT_STARTED = 'agent:started',
  AGENT_MESSAGE = 'agent:message',
  AGENT_COMPLETED = 'agent:completed',

  // Error Events
  ERROR_OCCURRED = 'error:occurred',
  ERROR_RESOLVED = 'error:resolved',

  // Wildcard
  WILDCARD = '*'
}
```

### Events emitten

```typescript
import { EventEmitter, EventType } from '@/lib/events';

const emitter = new EventEmitter();

// Event emitten
emitter.emit(EventType.TASK_STARTED, {
  taskId: '123',
  projectId: '456',
  agent: 'Agent Name',
  timestamp: new Date().toISOString()
});
```

### Event-Listener registrieren

```typescript
// Spezifisches Event
emitter.on(EventType.TASK_COMPLETED, (data) => {
  console.log('Task abgeschlossen:', data);
  // Aktion ausführen
});

// Wildcard für alle Events
emitter.on(EventType.WILDCARD, (type, data) => {
  console.log(`Event: ${type}`, data);
  // Logging, Analytics, etc.
});
```

### Once-Listener

```typescript
// Wird nur einmal aufgerufen
emitter.once(EventType.TASK_COMPLETED, (data) => {
  console.log('Task abgeschlossen (nur einmal):', data);
});
```

### Event-Listener abmelden

```typescript
const handler = (data) => {
  console.log('Event:', data);
};

// Registrieren
emitter.on(EventType.TASK_STARTED, handler);

// Abmelden
emitter.off(EventType.TASK_STARTED, handler);
```

### Event-History

```typescript
// History abrufen
const history = emitter.getHistory();

// Letzte 10 Events
const last10 = emitter.getHistory(10);

// Events filtern
const taskEvents = emitter.getHistory()
  .filter(event => event.type.startsWith('task:'));
```

---

## Best Practices

### TypeScript

**Nutze Strict Mode:**
```typescript
// ✅ Gut
function calculate(a: number, b: number): number {
  return a + b;
}

// ❌ Schlecht
function calculate(a: any, b: any): any {
  return a + b;
}
```

**Nutze Type Guards:**
```typescript
function isTool(value: unknown): value is Tool {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'description' in value &&
    'execute' in value
  );
}

if (isTool(data)) {
  // TypeScript weiß jetzt, dass data ein Tool ist
  data.execute(params);
}
```

**Nutze Branded Strings:**
```typescript
type TaskId = string & { readonly __brand: unique symbol };

function createTaskId(id: string): TaskId {
  return id as TaskId;
}

function runTask(taskId: TaskId) {
  // Typsichere Nutzung
}

// Kann versehentlich normale Strings übergeben
const taskId = createTaskId('123');
runTask(taskId); // ✅ OK
runTask('123'); // ❌ Fehler
```

### React

**Nutze useMemo für Performance:**
```typescript
const expensiveCalculation = useMemo(() => {
  return data.map(item => complexOperation(item));
}, [data]);
```

**Nutze useCallback für Event-Handler:**
```typescript
const handleClick = useCallback(() => {
  emitter.emit(EventType.BUTTON_CLICKED, { id: 123 });
}, []);
```

### Error-Handling

**Spezifische Fehler:**
```typescript
class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    public originalError: Error
  ) {
    super(`Tool ${toolName} fehlgeschlagen: ${originalError.message}`);
    this.name = 'ToolExecutionError';
  }
}

try {
  await tool.execute(params);
} catch (error) {
  throw new ToolExecutionError(tool.name, error);
}
```

**Error Recovery:**
```typescript
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await delay(1000 * (i + 1)); // Exponential Backoff
    }
  }
  throw new Error('Max retries reached');
}
```

---

## Common Patterns

### Singleton-Pattern

```typescript
class EventEmitter {
  private static instance: EventEmitter;

  private constructor() {
    // Private Konstruktor
  }

  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) {
      EventEmitter.instance = new EventEmitter();
    }
    return EventEmitter.instance;
  }
}

// Nutzung
const emitter = EventEmitter.getInstance();
```

### Factory-Pattern

```typescript
interface AgentFactory {
  create(type: string): AgentDefinition;
}

class AgentFactoryImpl implements AgentFactory {
  private agentTypes: Map<string, AgentDefinition>;

  constructor() {
    this.agentTypes = new Map();
    this.registerAgent('coder', codeAgent);
    this.registerAgent('tester', testAgent);
  }

  create(type: string): AgentDefinition {
    const agent = this.agentTypes.get(type);
    if (!agent) {
      throw new Error(`Agent-Typ ${type} nicht gefunden`);
    }
    return { ...agent }; // Clone
  }
}

// Nutzung
const factory = new AgentFactoryImpl();
const coder = factory.create('coder');
```

### Observer-Pattern

```typescript
interface Observer {
  update(event: Event): void;
}

interface Observable {
  subscribe(observer: Observer): void;
  unsubscribe(observer: Observer): void;
  notify(event: Event): void;
}

class EventEmitter implements Observable {
  private observers: Set<Observer> = new Set();

  subscribe(observer: Observer): void {
    this.observers.add(observer);
  }

  unsubscribe(observer: Observer): void {
    this.observers.delete(observer);
  }

  notify(event: Event): void {
    this.observers.forEach(observer => observer.update(event));
  }
}
```

### Strategy-Pattern

```typescript
interface ExecutionStrategy {
  execute(task: Task): Promise<Result>;
}

class SequentialExecution implements ExecutionStrategy {
  async execute(task: Task): Promise<Result> {
    for (const subTask of task.subTasks) {
      await this.runSubTask(subTask);
    }
  }
}

class ParallelExecution implements ExecutionStrategy {
  async execute(task: Task): Promise<Result> {
    const results = await Promise.all(
      task.subTasks.map(subTask => this.runSubTask(subTask))
    );
    return this.mergeResults(results);
  }
}

// Nutzung
const strategy = task.parallel 
  ? new ParallelExecution() 
  : new SequentialExecution();

const result = await strategy.execute(task);
```

---

## Testing

### Unit-Tests

```typescript
import { EventEmitter, EventType } from '@/lib/events';

describe('EventEmitter', () => {
  it('should emit event to listener', () => {
    const emitter = new EventEmitter();
    const mockHandler = jest.fn();

    emitter.on(EventType.TASK_STARTED, mockHandler);
    emitter.emit(EventType.TASK_STARTED, { taskId: '123' });

    expect(mockHandler).toHaveBeenCalledWith({ taskId: '123' });
  });

  it('should support wildcard listeners', () => {
    const emitter = new EventEmitter();
    const mockHandler = jest.fn();

    emitter.on(EventType.WILDCARD, mockHandler);
    emitter.emit(EventType.TASK_STARTED, { taskId: '123' });
    emitter.emit(EventType.TASK_COMPLETED, { taskId: '123' });

    expect(mockHandler).toHaveBeenCalledTimes(2);
  });
});
```

### Integration-Tests

```typescript
import { PluginRegistry } from '@/lib/plugins';
import { myPlugin } from './my-plugin';

describe('Plugin Integration', () => {
  beforeEach(() => {
    PluginRegistry.register(myPlugin);
  });

  it('should execute plugin tool', async () => {
    const tool = PluginRegistry.getTool('my-tool');
    const result = await tool.execute({ param1: 'value1' });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
  });
});
```

---

## Debugging

### Logging

```typescript
import { Logger } from '@/lib/logs';

const logger = new Logger('MyComponent');

logger.info('Component initialisiert');
logger.warn('Warnung: Wert außerhalb des Bereichs');
logger.error('Fehler:', error);
```

### Performance-Monitoring

```typescript
function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  console.log(`${name}: ${end - start}ms`);
  return result;
}

// Nutzung
const result = measurePerformance('expensiveOperation', () => {
  return data.map(item => complexOperation(item));
});
```

---

## Deployments

### Lokale Entwicklung

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

### Environment-Variablen

```env
NODE_ENV=production
PORT=3333
```

---

## Support

Bei Fragen zur Entwicklung:
- Lies die [CONTRIBUTING.md](CONTRIBUTING.md)
- Prüfe die [ARCHITECTURE.md](ARCHITECTURE.md)
- Öffne ein Issue auf GitHub

---

**Guide aktualisiert:** 11.01.2026
