# Kaiban Studio - API-Dokumentation

Dieses Dokument beschreibt alle verfügbaren API-Endpunkte, Request/Response-Schemas und Authentifizierung.

## Base URL

```
Development: http://localhost:3333/api
Production: https://your-domain.com/api
```

## Authentifizierung

Aktuell wird keine Authentifizierung verwendet. Alle Endpunkte sind öffentlich zugänglich.

In Zukunft wird Token-basierte Authentifizierung hinzugefügt.

## Allgemeine Response-Format

### Success Response

```json
{
  "success": true,
  "data": { }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": { }
  }
}
```

---

## Projekte API

### Alle Projekte auflisten

```http
GET /api/projects
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "project-id",
      "name": "Project Name",
      "description": "Project Description",
      "createdAt": "2026-01-11T00:00:00Z",
      "updatedAt": "2026-01-11T00:00:00Z",
      "status": "active"
    }
  ]
}
```

### Projekt erstellen

```http
POST /api/projects
```

**Request Body:**

```json
{
  "name": "Project Name",
  "description": "Project Description"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "new-project-id",
    "name": "Project Name",
    "description": "Project Description",
    "createdAt": "2026-01-11T00:00:00Z"
  }
}
```

### Projekt lesen

```http
GET /api/projects/{projectId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "project-id",
    "name": "Project Name",
    "description": "Project Description",
    "plan": "# Project Plan\n...",
    "tasks": [ ],
    "team": { },
    "createdAt": "2026-01-11T00:00:00Z"
  }
}
```

### Projekt aktualisieren

```http
PUT /api/projects/{projectId}
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "description": "Updated Description"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "project-id",
    "name": "Updated Name",
    "description": "Updated Description",
    "updatedAt": "2026-01-11T00:00:00Z"
  }
}
```

### Projekt löschen

```http
DELETE /api/projects/{projectId}
```

**Response:**

```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

---

## Projekt-Settings API

### Settings lesen

```http
GET /api/projects/{projectId}/settings
```

**Response:**

```json
{
  "success": true,
  "data": {
    "models": {
      "wizard": "gpt-4",
      "planning": "gpt-4",
      "taskRun": "gpt-3.5-turbo",
      "testing": "gpt-4",
      "fixing": "gpt-4"
    },
    "providers": {
      "openai": {
        "enabled": true,
        "models": ["gpt-4", "gpt-3.5-turbo"]
      }
    }
  }
}
```

### Settings aktualisieren

```http
PUT /api/projects/{projectId}/settings
```

**Request Body:**

```json
{
  "models": {
    "wizard": "gpt-4",
    "planning": "gpt-4"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "models": {
      "wizard": "gpt-4",
      "planning": "gpt-4"
    }
  }
}
```

---

## Tasks API

### Alle Tasks auflisten

```http
GET /api/projects/{projectId}/tasks
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "task-id",
      "title": "Task Title",
      "description": "Task Description",
      "status": "pending",
      "dependencies": ["task-1"],
      "agent": "agent-name"
    }
  ]
}
```

### Task ausführen

```http
POST /api/projects/{projectId}/tasks/{taskId}/run
```

**Request Body:**

```json
{
  "phase": "execution",
  "agent": "agent-name"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "taskId": "task-id",
    "status": "running",
    "logs": [ ]
  }
}
```

### Task abbrechen

```http
DELETE /api/projects/{projectId}/tasks/{taskId}
```

**Response:**

```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

---

## Wizard API

### Projekt erstellen mit Wizard

```http
POST /api/wizard
```

**Request Body:**

```json
{
  "description": "Create a task management app",
  "features": ["user auth", "task lists", "notifications"],
  "techStack": "next.js, typescript, tailwind"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "projectId": "generated-id",
    "plan": "# Project Plan\n...",
    "tasks": [ ],
    "team": { }
  }
}
```

---

## Task-Wizard API

### Aufgaben analysieren und generieren

```http
POST /api/projects/{projectId}/task-wizard
```

**Request Body:**

```json
{
  "userInput": "Add file upload functionality",
  "context": {
    "currentFeatures": ["user auth", "task lists"]
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "title": "Implement file upload component",
        "description": "Create React component for file upload",
        "dependencies": ["user-auth"]
      }
    ]
  }
}
```

---

## Designer API

### Workflow speichern

```http
POST /api/designer
```

**Request Body:**

```json
{
  "projectId": "project-id",
  "workflow": {
    "nodes": [ ],
    "edges": [ ],
    "variables": { }
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "workflowId": "workflow-id",
    "saved": true
  }
}
```

### Workflow importieren

```http
POST /api/designer/import
```

**Request Body:**

```json
{
  "format": "json",
  "content": "..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "nodes": [ ],
    "edges": [ ]
  }
}
```

### Project Review

```http
POST /api/designer/project-review
```

**Request Body:**

```json
{
  "projectId": "project-id",
  "reviewType": "full"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "issues": [ ],
    "suggestions": [ ],
    "score": 85
  }
}
```

---

## Settings API

### Anwendungseinstellungen lesen

```http
GET /api/settings
```

**Response:**

```json
{
  "success": true,
  "data": {
    "theme": "dark",
    "language": "de",
    "defaultProvider": "openai"
  }
}
```

### Anwendungseinstellungen aktualisieren

```http
PUT /api/settings
```

**Request Body:**

```json
{
  "theme": "light",
  "language": "en"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "theme": "light",
    "language": "en"
  }
}
```

---

## Models API

### Verfügbare Modelle auflisten

```http
GET /api/models
```

**Response:**

```json
{
  "success": true,
  "data": {
    "openai": {
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "enabled": true
    },
    "glm": {
      "models": ["glm-4"],
      "enabled": true
    },
    "google": {
      "models": ["gemini-pro"],
      "enabled": false
    }
  }
}
```

---

## Logs API

### Logs lesen

```http
GET /api/logs
```

**Query Parameters:**
- `level`: Filter by log level (info, warn, error)
- `limit`: Maximum number of logs (default: 100)
- `offset`: Offset for pagination

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-01-11T00:00:00Z",
      "level": "info",
      "message": "Task started",
      "metadata": {
        "taskId": "task-id"
      }
    }
  ]
}
```

---

## File API

### Datei lesen

```http
GET /api/projects/{projectId}/files/read/[...path]
```

**Response:**

```json
{
  "success": true,
  "data": {
    "content": "file content...",
    "path": "src/app/page.tsx"
  }
}
```

### Projekt starten

```http
POST /api/projects/{projectId}/launch
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "http://localhost:3001",
    "pid": 12345
  }
}
```

---

## Error Codes

| Code | Beschreibung |
|------|------------|
| `PROJECT_NOT_FOUND` | Projekt wurde nicht gefunden |
| `TASK_NOT_FOUND` | Task wurde nicht gefunden |
| `INVALID_INPUT` | Ungültige Eingabe |
| `AUTH_REQUIRED` | Authentifizierung erforderlich |
| `PERMISSION_DENIED` | Keine Berechtigung |
| `INTERNAL_ERROR` | Interner Server-Fehler |
| `PROVIDER_ERROR` | AI-Provider Fehler |
| `FILE_NOT_FOUND` | Datei wurde nicht gefunden |
| `TASK_EXECUTION_FAILED` | Task-Ausführung fehlgeschlagen |

---

## Rate Limiting

Aktuell ist kein Rate Limiting implementiert.

In Zukunft:
- 100 Requests pro Minute pro IP
- 1000 Requests pro Stunde pro IP

---

## WebSocket API (Live Updates)

### Verbindung herstellen

```
ws://localhost:3333/api/events
```

**Event-Typen:**

- `task:started`: Task gestartet
- `task:progress`: Task-Fortschritt
- `task:completed`: Task abgeschlossen
- `task:failed`: Task fehlgeschlagen
- `log:new`: Neuer Log-Eintrag
- `error:occurred`: Fehler aufgetreten

**Beispiel:**

```json
{
  "type": "task:progress",
  "payload": {
    "taskId": "task-id",
    "progress": 50,
    "message": "Executing phase 2"
  }
}
```

---

## Examples

### Curl Beispiele

```bash
# Alle Projekte auflisten
curl http://localhost:3333/api/projects

# Neues Projekt erstellen
curl -X POST http://localhost:3333/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"Test"}'

# Task ausführen
curl -X POST http://localhost:3333/api/projects/123/tasks/456/run \
  -H "Content-Type: application/json" \
  -d '{"phase":"execution","agent":"agent-name"}'
```

### JavaScript/TypeScript Examples

```typescript
// Projekt erstellen
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'My Project',
    description: 'Test project'
  })
});

const data = await response.json();
console.log(data);
```

---

## Support

Bei Problemen mit der API:
- Prüfe die [Logs](#logs-api)
- Lies die [Error Codes](#error-codes)
- Öffne ein Issue auf GitHub

---

**API-Version:** 1.0.0
**Letzte Aktualisierung:** 11.01.2026
