# Candy Studio - GitHub Deployment Anleitung

## Voraussetzungen

- GitHub Account
- Git installiert (bereits vorhanden)
- Node.js 18+ installiert

## Schritte zum Pushen auf GitHub

### 1. GitHub Repository erstellen

1. Öffne https://github.com/new
2. Repository-Name: `Candy-Studio`
3. Beschreibung: `AI-Powered Multi-Agent Workflow System`
4. Wähle "Public" oder "Private"
5. **WICHTIG:** Repository initialisieren lassen (kein .gitignore, keine README, keine Lizenz)
6. Klicke auf "Create repository"

### 2. Remote-URL hinzufügen

Nachdem das Repository erstellt wurde, füge die Remote-URL hinzu:

```bash
git remote add origin https://github.com/IHR_USERNAME/Candy-Studio.git
```

Ersetze `IHR_USERNAME` mit deinem GitHub-Benutzernamen.

### 3. Branch umbenennen (optional, aber empfohlen)

GitHub verwendet standardmäßig `main` als Standard-Branch:

```bash
git branch -M main
```

### 4. Auf GitHub pushen

```bash
git push -u origin main
```

## Verifizieren

Nach erfolgreichem Push:
1. Öffne https://github.com/IHR_USERNAME/Candy-Studio
2. Du solltest alle Dateien sehen:
   - `src/` - Source Code
   - `ROADMAP.md` - Strategische Roadmap
   - `IMPLEMENTATION_PLAN.md` - Detaillierter Plan
   - `TASKS.md` - Aufgabenliste
   - `README.md` - Projektübersicht
   - `package.json` - Dependencies
   - `tsconfig.json` - TypeScript-Konfiguration

## GitHub Actions (optional)

Wenn du CI/CD automatisieren möchtest:

### 1. `.github/workflows` Ordner erstellen

```bash
mkdir -p .github/workflows
```

### 2. Workflow-Datei erstellen

Erstelle `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Run tests
        run: npm test
        
      - name: Lint
        run: npm run lint
```

### 3. Workflow committen und pushen

```bash
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI workflow"
git push
```

## Nächste Schritte nach dem Push

### 1. Repository beschreiben

1. Gehe zu GitHub Repository Settings → General
2. Füge eine Beschreibung hinzu
3. Wähle Topics (z.B. `ai`, `agents`, `workflow`, `nextjs`, `typescript`)
4. Füge eine Website URL hinzu (falls vorhanden)

### 2. GitHub Pages (optional)

Wenn du eine Dokumentation hosten möchtest:

1. Gehe zu Repository Settings → Pages
2. Source: wähle "Deploy from a branch"
3. Branch: `main`
4. Folder: `/docs` (oder `/root` für README.md)
5. Klicke auf "Save"

### 3. Issues und Projects

1. Aktiviere "Issues" für Bug-Tracking
2. Aktiviere "Projects" für Kanban-Boards
3. Erstelle Labels (z.B. `bug`, `feature`, `enhancement`, `documentation`)
4. Erste Milestones basierend auf ROADMAP.md erstellen

### 4. Collaborators hinzufügen (optional)

1. Gehe zu Settings → Collaborators
2. Lade andere Entwickler ein
3. Definiere Berechtigungen (Read, Write, Admin)

## Häufige Probleme

### Problem: Authentication Error

```bash
error: failed to push some refs to 'https://github.com/...'
```

**Lösung:** Verwende SSH oder Personal Access Token

**Option A - SSH:**
```bash
git remote set-url origin git@github.com:IHR_USERNAME/Candy-Studio.git
```

**Option B - Personal Access Token:**
1. Gehe zu GitHub Settings → Developer settings → Personal access tokens
2. Erstelle neues Token (Token: `repo`)
3. Verwende:
```bash
git remote set-url origin https://TOKEN@github.com/IHR_USERNAME/Candy-Studio.git
```

### Problem: Branch nicht gefunden

```bash
error: src refspec main does not match any
```

**Lösung:** Branch überprüfen

```bash
git branch
```

Wenn `master` angezeigt wird:
```bash
git branch -M main
git push -u origin main
```

## Tipps

### Commit-Nachrichten

Verwende klare Commit-Nachrichten:
- `feat: Add event-system` - Neue Features
- `fix: Resolve TypeScript errors` - Bugfixes
- `docs: Update README` - Dokumentation
- `refactor: Simplify plugin-system` - Refactoring
- `test: Add unit tests for events` - Tests

### .gitignore

Stelle sicher, dass sensible Dateien ignoriert werden:
```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
.next/
out/
build/

# Environment
.env
.env.local
.env*.local

# Logs
logs/
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Testing
coverage/
```

### Git-Hooks (optional)

Für bessere Code-Qualität:

```bash
# Installiere Husky
npm install husky --save-dev
npx husky install

# Pre-commit Hook
cat .husky/pre-commit << 'EOF'
#!/bin/sh
npm run lint
npm run test
EOF
chmod +x .husky/pre-commit
```

## Weiterführende Schritte

1. **README.md verbessern** - Screenshots, GIFs, Beispiele
2. **License hinzufügen** - MIT oder andere Open Source License
3. **CONTRIBUTING.md erstellen** - Richtlinien für Contributions
4. **CHANGELOG.md führen** - Versionen und Änderungen
5. **Badge hinzufügen** - Build status, Version, etc.

## Hilfe

- [GitHub Docs](https://docs.github.com/)
- [Git Docs](https://git-scm.com/doc)
- [Next.js Docs](https://nextjs.org/docs)

---

**Viel Erfolg beim Pushen auf GitHub! 🚀**
