# Contributing to Kaiban Studio

Vielen Dank für dein Interesse an Kaiban Studio! Wir schätzen Beiträge jeglicher Art, sei es Fehlerberichte, Feature-Requests oder Code-Beiträge.

## Entwickler-Setup

### Voraussetzungen

- Node.js 18 oder höher
- npm oder yarn oder pnpm
- Git

### Installation

1. Repository klonen:
```bash
git clone https://github.com/andreaspointecker-source/Candy-Studio.git
cd Candy-Studio/web
```

2. Abhängigkeiten installieren:
```bash
npm install
```

3. Entwicklungsserver starten:
```bash
npm run dev
```

Der Server läuft unter `http://localhost:3333`

## Code-Style-Guidelines

### TypeScript

- Verwende TypeScript Strict Mode
- Vermeide `any` - stattdessen spezifische Typen oder `unknown`
- Nutze Interfaces für Objekt-Definitionen
- Nutze Type Aliases für Union-Typen
- Implementiere Type Guards für komplexe Validierung

### React

- Nutze Functional Components mit Hooks
- Vermeide Props-Drilling - Context API oder State Management nutzen
- Component-Name in PascalCase
- Dateiname in PascalCase (z.B. `MyComponent.tsx`)
- Exportiere default für Haupt-Component
- Nutze `useMemo` und `useCallback` für Performance-Optimierung

### ESLint & Prettier

Wir verwenden ESLint und Prettier für Code-Qualität. Bevor du committest:

```bash
npm run lint
npm run format
```

oder lass pre-commit Hooks automatisch formatieren.

### Naming Conventions

- **Variablen/Funktionen:** camelCase (`myVariable`, `myFunction`)
- **Klassen/Components:** PascalCase (`MyComponent`, `MyClass`)
- **Konstanten:** UPPER_SNAKE_CASE (`API_KEY`, `MAX_RETRIES`)
- **Interfaces:** PascalCase mit I-Präfix (`IPlugin`, `ITool`)
- **Types:** PascalCase ohne Präfix (`PluginType`, `ToolType`)
- **Files:**
  - Components: `PascalCase.tsx`
  - Utilities: `camelCase.ts`
  - Constants: `camelCase.ts` oder `constants.ts`

## Pull-Request-Prozess

### 1. Branch erstellen

Erstelle einen neuen Branch für deinen Beitrag:

```bash
git checkout -b feature/my-feature
# oder
git checkout -b fix/my-bug-fix
```

Branch-Naming:
- `feature/` - Neue Features
- `fix/` - Bugfixes
- `docs/` - Dokumentations-Änderungen
- `refactor/` - Refactoring
- `test/` - Test-Erweiterungen

### 2. Änderungen vornehmen

- Halte Änderungen klein und fokussiert
- Füge Tests für neue Features hinzu
- Aktualisiere Dokumentation bei Bedarf
- Stelle sicher, dass alle Tests bestehen

### 3. Commit-Nachrichten

Wir folgen dem [Conventional Commits](https://www.conventionalcommits.org/) Format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: Neues Feature
- `fix`: Bugfix
- `docs`: Dokumentations-Änderungen
- `style`: Formatierung, Semikolons, etc.
- `refactor`: Code-Refactoring
- `test`: Tests hinzufügen/ändern
- `chore`: Build-Prozess oder Hilfswerkzeuge

**Beispiele:**

```bash
feat(event-system): add wildcard event listener support
fix(auth): resolve token expiration issue
docs(readme): update installation instructions
style(plugin): format plugin interface
refactor(runner): simplify task execution
test(events): add unit tests for EventEmitter
```

### 4. Pull Request erstellen

1. Sende deinen Branch zu GitHub:
```bash
git push origin feature/my-feature
```

2. Erstelle Pull Request auf GitHub

3. PR-Description sollte enthalten:
   - Beschreibung der Änderungen
   - Warum diese Änderungen notwendig sind
   - Screenshots für UI-Änderungen
   - Verweise auf relevante Issues
   - Checkliste für Review

### 5. Review-Prozess

- Mindestens ein Approval erforderlich
- Alle CI-Checks müssen bestehen
- Addressiere Review-Kommentare
- Halte PRs aktuell mit main-Branch

## Test-Guidelines

### Unit-Tests

- Teste isolierte Funktionen/Komponenten
- Nutze Mocks für externe Abhängigkeiten
- Deskriptive Test-Namen:
  ```typescript
  describe('EventEmitter', () => {
     it('should emit event to registered listener', () => {
        // ...
     });
  });
  ```

### Integration-Tests

- Teste Interaktion zwischen Komponenten
- Nutze Test-Server für API-Tests
- Teste häufige Workflows

### Coverage-Ziele

- Strebe nach >80% Code-Coverage
- Fokus auf kritischen Pfad
- Mock-Code muss nicht abgedeckt werden

## Entwicklungsumgebung

### VS Code Empfehlungen

Installiere diese Extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

### Recommended Settings (.vscode/settings.json)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

## Häufige Aufgaben

### Neuen Agent hinzufügen

1. Agent in `src/lib/providers/` erstellen
2. Provider Interface implementieren
3. Tests hinzufügen
4. Dokumentation aktualisieren

### Neues Tool erstellen

1. Tool Interface implementieren
2. Tool im Plugin-System registrieren
3. Tests schreiben
4. Dokumentation hinzufügen

### Event hinzufügen

1. Event-Type in `src/lib/events.ts` definieren
2. Event emitten wo nötig
3. Event-Listener nutzen wo erforderlich

## Fragen?

- Öffne ein Issue für Fragen
- Nutze Discussions für allgemeine Diskussionen
- Prüfe bestehende Issues vor neuen Beiträgen

## License

Durch Beiträge stimmst du zu, dass dein Beitrag unter der Projekt-Lizenz veröffentlicht wird.

---

**Vielen Dank für deinen Beitrag! 🎉**
