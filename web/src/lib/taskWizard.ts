import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import { readAppSettings } from "./appSettings";
import { readPlan, readProjectMeta, readTeam, workspaceDir } from "./storage";
import { getProvider } from "./providers";
import type { ModelRouting, Task, WizardMessage } from "./schema";
import { DEFAULT_SETTINGS } from "./config";
import { parseError, createErrorContext, hasFilePath } from "./errorParser";

type TaskWizardResponse = {
  type: "question" | "summary";
  message: string;
  tasks?: { description: string; category?: "general" | "research"; agentName?: string }[];
  planAppend?: string;
};

function extractFencedBlock(raw: string) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

function safeParseJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = extractFencedBlock(trimmed);
  const candidates = [trimmed, fenced].filter(Boolean) as string[];
  try {
    return JSON.parse(trimmed) as T;
  } catch {}
  for (const candidate of candidates) {
    if (!candidate || candidate === trimmed) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {}
  }
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) {
    const jsonText = trimmed.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(jsonText) as T;
    } catch {}
  }
  try {
    return YAML.parse(trimmed) as T;
  } catch {
    return null;
  }
}

function summarizeTasks(tasks: Task[]) {
  return tasks
    .map((task) => `- ${task.description} [${task.status}]`)
    .join("\n");
}

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".css",
  ".html",
  ".json",
  ".yml",
  ".yaml",
  ".py",
]);

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out"]);

async function listWorkspaceFiles(base: string, maxFiles: number, maxDepth: number) {
  const results: string[] = [];
  const queue: { dir: string; depth: number }[] = [{ dir: base, depth: 0 }];

  while (queue.length && results.length < maxFiles) {
    const { dir, depth } = queue.shift()!;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < maxDepth && !SKIP_DIRS.has(entry.name)) {
          queue.push({ dir: full, depth: depth + 1 });
        }
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!TEXT_EXTENSIONS.has(ext)) continue;
      results.push(full);
    }
  }

  return results;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTrimmed(filePath: string, limit: number) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw) return "";
  return raw.slice(0, limit).trim();
}

async function pickRelevantFiles(base: string) {
  const candidates = [
    "package.json",
    "README.md",
    "index.html",
    "main.py",
    "app.py",
    "server.py",
    "run.py",
    "src/index.tsx",
    "src/index.ts",
    "src/index.jsx",
    "src/index.js",
    "src/main.tsx",
    "src/main.ts",
    "src/main.jsx",
    "src/main.js",
    "src/App.tsx",
    "src/App.ts",
    "src/App.jsx",
    "src/App.js",
    "src/app/page.tsx",
    "src/app/page.ts",
    "src/app/layout.tsx",
    "src/app/layout.ts",
    "public/index.html",
  ];

  const selected: string[] = [];
  for (const relative of candidates) {
    const full = path.join(base, relative);
    if (await fileExists(full)) {
      selected.push(full);
    }
  }

  if (selected.length) {
    return selected;
  }

  const fallback = await listWorkspaceFiles(base, 6, 2);
  return fallback;
}

async function buildWorkspaceContext(projectId: string) {
  const base = workspaceDir(projectId);
  const files = await pickRelevantFiles(base);
  if (!files.length) {
    return "Workspace-Dateien: (keine gefunden)";
  }

  const list = files
    .map((file) => path.relative(base, file).replace(/\\/g, "/"))
    .join(", ");
  const snippets: string[] = [];

  for (const filePath of files) {
    const relative = path.relative(base, filePath).replace(/\\/g, "/");
    const trimmed = await readTrimmed(filePath, 2000);
    if (!trimmed) {
      snippets.push(`--- ${relative}\n(keine lesbaren Inhalte)`);
    } else {
      snippets.push(`--- ${relative}\n${trimmed}`);
    }
  }

  return `Workspace-Dateien: ${list}\n\nDatei-Auszug:\n${snippets.join("\n\n")}`;
}

/**
 * Erstellt einen fokussierten Workspace-Kontext für eine bestimmte Datei
 * Wird verwendet, wenn Fehler mit Dateipfaden vorliegen
 */
async function buildFocusedWorkspaceContext(
  base: string,
  filePath: string | null,
  lineNumber: number | null = null
) {
  if (!filePath) {
    // Fallback zum Standard-Kontext, wenn kein Pfad gefunden
    return {
      context: "Workspace-Dateien: (keine gefunden)",
      isFocused: false,
    };
  }

  const targetPath = path.join(base, filePath.replace(/\\/g, "/"));
  
  try {
    // Prüfe, ob die Datei existiert
    await fs.access(targetPath);
    
    // Lies den Inhalt der Datei
    const content = await fs.readFile(targetPath, "utf8");
    const stats = await fs.stat(targetPath);
    const relativePath = path.relative(base, targetPath).replace(/\\/g, "/");
    
    let focusedContent = `--- ${relativePath}\n${content}`;
    
    // Wenn Zeilennummer vorhanden, markiere sie
    if (lineNumber) {
      const lines = content.split("\n");
      const startLine = Math.max(0, lineNumber - 5);
      const endLine = Math.min(lines.length, lineNumber + 5);
      
      focusedContent = `--- ${relativePath} (Fokus: Zeile ${lineNumber})\n`;
      focusedContent += lines.slice(startLine, endLine)
        .map((line, idx) => {
          const actualLine = startLine + idx + 1;
          const prefix = actualLine === lineNumber ? ">>> " : "    ";
          return `${prefix}${actualLine}: ${line}`;
        })
        .join("\n");
      
      focusedContent += `\n\n--- Vollständiger Inhalt von ${relativePath}\n${content}`;
    }
    
    return {
      context: [
        "FOKUSSIERTER WORKSPACE-KONTEXT (Fehler-Datei):",
        `Datei: ${relativePath}`,
        `Größe: ${stats.size} bytes`,
        "",
        focusedContent,
      ].join("\n"),
      isFocused: true,
    };
  } catch (error) {
    // Wenn Datei nicht gefunden, gib Standard-Kontext zurück
    return {
      context: "Workspace-Dateien: (Datei nicht gefunden, nutze Standard-Kontext)",
      isFocused: false,
    };
  }
}

export async function taskWizardStep(input: {
  projectId: string;
  messages: WizardMessage[];
  routing?: ModelRouting;
  errorMessage?: string;
}) {
  const project = await readProjectMeta(input.projectId);
  const team = await readTeam(input.projectId);
  const plan = await readPlan(input.projectId).catch(() => "");
  const appSettings = await readAppSettings();
  const modelConfig = input.routing?.taskWizard ?? DEFAULT_SETTINGS.modelRouting.taskWizard;
  const provider = getProvider(modelConfig.provider, {
    cooldownSeconds: project.settings.sessionCooldownSeconds,
    apiKey: appSettings.providerKeys[modelConfig.provider],
    baseUrl: appSettings.providerBaseUrls[modelConfig.provider],
  });

  // Prüfe, ob eine Fehlermeldung vorliegt
  let workspaceContext: string;
  let errorContext = "";
  
  if (input.errorMessage) {
    // Parse Fehler und extrahiere Dateipfad
    const parsedError = parseError(input.errorMessage);
    
    if (hasFilePath(parsedError)) {
      // Erstelle fokussierten Kontext für die Fehler-Datei
      const base = workspaceDir(input.projectId);
      const focusedResult = await buildFocusedWorkspaceContext(
        base,
        parsedError.filePath,
        parsedError.lineNumber
      );
      
      workspaceContext = focusedResult.context;
      errorContext = createErrorContext(parsedError, base);
    } else {
      // Fallback zum Standard-Kontext, wenn kein Pfad gefunden
      workspaceContext = await buildWorkspaceContext(input.projectId);
      errorContext = `Fehlermeldung:\n${input.errorMessage}`;
    }
  } else {
    // Standard-Kontext ohne Fehler
    workspaceContext = await buildWorkspaceContext(input.projectId);
  }

  const system = [
    appSettings.systemPrompts.taskWizard,
    "Du hast Zugriff auf Projektdateien im Workspace. Frage nicht nach Dateiinhalten, wenn Kontext vorhanden ist.",
    "Antwortformat ist json.",
  ].join("\n");

  const context = [
    `Projekt: ${project.meta.name}`,
    `Beschreibung: ${project.meta.description}`,
    plan ? `Plan:\n${plan}` : "Plan: (keiner)",
    "Vorhandene Tasks:",
    summarizeTasks(team.tasks),
    input.errorMessage && errorContext ? errorContext : "",
    workspaceContext,
  ].join("\n\n");

  const baseMessages: WizardMessage[] = input.messages.length
    ? input.messages
    : [
        {
          role: "user",
          content:
            "Bitte analysiere zuerst das Projekt und stelle dann die erste Rueckfrage.",
        },
      ];

  const response = await provider.complete({
    model: modelConfig.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `${context}\n\nKontext beachten.` },
      ...baseMessages,
      {
        role: "user",
        content: "Antwort nur als json. Stelle ggf. eine Rueckfrage.",
      },
    ],
    responseFormat: "json",
    temperature: 0.2,
  });

  let parsed = safeParseJson<TaskWizardResponse>(response.content);
  if (!parsed || typeof parsed !== "object" || !parsed.type) {
    const retry = await provider.complete({
      model: modelConfig.model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            "Deine letzte Antwort war kein JSON.",
            "Wandle den folgenden Text in das JSON-Schema um und antworte NUR mit JSON:",
            response.content,
          ].join("\n"),
        },
      ],
      responseFormat: "json",
      temperature: 0.1,
    });
    parsed = safeParseJson<TaskWizardResponse>(retry.content);
    if (!parsed || typeof parsed !== "object" || !parsed.type) {
      throw new Error("Task wizard response could not be parsed as JSON.");
    }
  }

  return parsed;
}
