import fs from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import YAML from "yaml";
import { getProvider } from "./providers";
import { readAppSettings } from "./appSettings";
import {
  readPlan,
  readProjectMeta,
  readTeam,
  updateProjectTimestamp,
  writeTasksMarkdown,
  writeTeam,
  workspaceDir,
} from "./storage";
import type { Agent, ModelConfig, ModelRouting, Task, TaskRun, Team } from "./schema";
import { detectTestCommand, runTestCommand } from "./tests";
import { appendLog } from "./logs";
import { parseError, createErrorContext, hasFilePath } from "./errorParser";

type TaskAction =
  | { type: "write"; path: string; content: string }
  | { type: "delete"; path: string }
  | { type: "mkdir"; path: string };

type TaskResponse = {
  summary?: string;
  actions?: TaskAction[];
  artifacts?: string[];
};

type TaskChange = { path: string; action: TaskAction["type"] };

const IGNORED_FOLDERS = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"]);

function extractFirstJsonChunk(raw: string) {
  const start = raw.search(/[\[{]/);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{" || char === "[") depth += 1;
    if (char === "}" || char === "]") depth -= 1;
    if (depth === 0) {
      return raw.slice(start, i + 1);
    }
  }
  return null;
}

function extractFencedBlock(raw: string) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}

function normalizeParsed(parsed: unknown) {
  if (Array.isArray(parsed)) {
    if (parsed.length === 1 && parsed[0] && typeof parsed[0] === "object") {
      return parsed[0];
    }
    const looksLikeActions = parsed.every(
      (item) =>
        item &&
        typeof item === "object" &&
        "type" in item &&
        "path" in item &&
        (item as { type?: string }).type
    );
    if (looksLikeActions) {
      return { summary: "", actions: parsed };
    }
  }
  return parsed;
}

function safeParseJson(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fenced = extractFencedBlock(trimmed);
  const candidates = [trimmed, fenced].filter(Boolean) as string[];
  try {
    return normalizeParsed(JSON.parse(trimmed));
  } catch {}
  for (const candidate of candidates) {
    if (!candidate || candidate === trimmed) continue;
    try {
      return normalizeParsed(JSON.parse(candidate));
    } catch {}
  }
  const chunk = extractFirstJsonChunk(trimmed);
  if (!chunk) return null;
  try {
    return normalizeParsed(JSON.parse(chunk));
  } catch {
    try {
      return normalizeParsed(YAML.parse(trimmed));
    } catch {
      return null;
    }
  }
}

function isTaskResponse(value: unknown): value is TaskResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const hasSummary = typeof record.summary === "string";
  const hasActions = Array.isArray(record.actions);
  return hasSummary || hasActions;
}

async function buildWorkspaceContext(root: string) {
  const files: string[] = [];
  const contents: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_FOLDERS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name));
        continue;
      }
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      const stats = await fs.stat(absolute);
      files.push(`${relative} (${stats.size} bytes)`);
      const ext = path.extname(entry.name).toLowerCase();
      if (stats.size <= 20000 && TEXT_EXTENSIONS.has(ext)) {
        const content = await fs.readFile(absolute, "utf8");
        contents.push(`--- ${relative}\n${content}`);
      }
    }
  }

  await walk(root);
  return {
    context: [
      "Workspace files:",
      ...files.map((line) => `- ${line}`),
      "",
      "Workspace content (truncated):",
      ...contents,
    ].join("\n"),
    fileCount: files.length,
    snippetCount: contents.length,
  };
}

/**
 * Erstellt einen fokussierten Workspace-Kontext für eine bestimmte Datei
 * Wird verwendet, wenn Fehler mit Dateipfaden vorliegen
 */
async function buildFocusedWorkspaceContext(
  root: string,
  filePath: string | null,
  lineNumber: number | null = null
) {
  if (!filePath) {
    // Fallback zum Standard-Kontext, wenn kein Pfad gefunden
    return buildWorkspaceContext(root);
  }

  const targetPath = path.join(root, filePath.replace(/\\/g, "/"));
  
  try {
    // Prüfe, ob die Datei existiert
    await fs.access(targetPath);
    
    // Lies den Inhalt der Datei
    const content = await fs.readFile(targetPath, "utf8");
    const stats = await fs.stat(targetPath);
    const relativePath = path.relative(root, targetPath).replace(/\\/g, "/");
    
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
      fileCount: 1,
      snippetCount: 1,
    };
  } catch (error) {
    // Wenn Datei nicht gefunden, logge es und nutze Standard-Kontext
    await appendLog(`Fokussierter Kontext: Datei ${filePath} nicht gefunden. Fallback zu Standard-Kontext.`);
    return buildWorkspaceContext(root);
  }
}

function buildAgentPrompt(agent: Agent, task: Task) {
  const role = task.overrides?.role ?? agent.role;
  const goal = task.overrides?.goal ?? agent.goal;
  return `Agent: ${agent.name}\nRole: ${role}\nGoal: ${goal}`;
}

function resolveTaskModelConfig(
  agent: Agent,
  task: Task,
  routing: ModelRouting,
  phase: "implement" | "tests" | "fix"
): ModelConfig {
  const base =
    phase === "tests"
      ? routing.taskTests
      : phase === "fix"
        ? routing.taskFix
        : task.category === "research"
          ? routing.research
          : routing.taskImplementation;
  const provider = task.overrides?.provider ?? base.provider;
  const model = task.overrides?.model ?? base.model ?? agent.model;
  return {
    provider,
    model,
  };
}

async function applyActions(root: string, actions: TaskAction[] = []) {
  const changed: TaskChange[] = [];
  const rootResolved = path.resolve(root);
  for (const action of actions) {
    const target = path.resolve(rootResolved, action.path);
    if (!target.startsWith(rootResolved)) {
      throw new Error(`Unsafe path: ${action.path}`);
    }
    if (action.type === "mkdir") {
      await fs.mkdir(target, { recursive: true });
      changed.push({ path: action.path, action: "mkdir" });
      continue;
    }
    if (action.type === "delete") {
      await fs.rm(target, { force: true, recursive: true });
      changed.push({ path: action.path, action: "delete" });
      continue;
    }
    if (action.type === "write") {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, action.content);
      changed.push({ path: action.path, action: "write" });
      continue;
    }
  }
  return changed;
}

async function requestTaskActions(input: {
  phase: "implement" | "tests" | "fix";
  projectId: string;
  task: Task;
  agent: Agent;
  team: Team;
  errors?: string;
}) {
  const project = await readProjectMeta(input.projectId);
  const appSettings = await readAppSettings();
  const modelConfig = resolveTaskModelConfig(
    input.agent,
    input.task,
    project.settings.modelRouting,
    input.phase
  );
  const provider = getProvider(modelConfig.provider, {
    cooldownSeconds: project.settings.sessionCooldownSeconds,
    apiKey: appSettings.providerKeys[modelConfig.provider],
    baseUrl: appSettings.providerBaseUrls[modelConfig.provider],
  });
  const plan = await readPlan(input.projectId).catch(() => "");
  const workspace = workspaceDir(input.projectId);
  
  // In der Fix-Phase: Versuche, fokussierten Kontext zu verwenden
  let workspaceSnapshot;
  let errorContext = "";
  
  if (input.phase === "fix" && input.errors) {
    // Parse Fehler und extrahiere Dateipfad
    const parsedError = parseError(input.errors);
    
    if (hasFilePath(parsedError)) {
      await appendLog(
        `Task ${input.task.id}: Fix-Phase mit fokussiertem Kontext für ${parsedError.filePath}`
      );
      
      // Erstelle fokussierten Kontext für die Fehler-Datei
      workspaceSnapshot = await buildFocusedWorkspaceContext(
        workspace,
        parsedError.filePath,
        parsedError.lineNumber
      );
      
      // Erstelle formatierten Fehler-Kontext
      errorContext = createErrorContext(parsedError, workspace);
      
      await appendLog(
        `Task ${input.task.id}: Fokussierter Kontext: ${workspaceSnapshot.fileCount} Datei, ${parsedError.errorType}-Fehler`
      );
    } else {
      // Fallback zum Standard-Kontext, wenn kein Pfad gefunden
      await appendLog(
        `Task ${input.task.id}: Fix-Phase ohne Dateipfad, nutze Standard-Kontext`
      );
      workspaceSnapshot = await buildWorkspaceContext(workspace);
      errorContext = `Fehlermeldung:\n${input.errors}`;
    }
  } else {
    // Standard-Kontext für Implementierungs- und Test-Phase
    workspaceSnapshot = await buildWorkspaceContext(workspace);
  }
  
  const model = modelConfig.model;
  await appendLog(
    `Task ${input.task.id}: Phase ${input.phase} mit ${modelConfig.provider}/${model}`
  );
  await appendLog(
    `Task ${input.task.id}: Workspace ${workspaceSnapshot.fileCount} Dateien, ${workspaceSnapshot.snippetCount} Auszuege`
  );

  const system = appSettings.systemPrompts.taskRunner;

  const user = [
    `Project: ${project.meta.name}`,
    `Description: ${project.meta.description}`,
    plan ? `Plan:\n${plan}` : "Plan: (none)",
    `Phase: ${input.phase}`,
    buildAgentPrompt(input.agent, input.task),
    `Category: ${input.task.category ?? "general"}`,
    `Task: ${input.task.description}`,
    input.phase === "fix" && errorContext ? errorContext : "",
    input.phase === "fix" && !errorContext && input.errors ? `Test errors:\n${input.errors}` : "",
    input.phase !== "fix" && input.errors ? `Test errors:\n${input.errors}` : "",
    "Antwort MUSS ein gueltiges JSON-Objekt sein. Nutze das JSON-Schema aus dem Systemprompt.",
    workspaceSnapshot.context,
  ]
    .filter(Boolean)
    .join("\n\n");

  const baseMessages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];

  const response = await provider.complete({
    model,
    messages: baseMessages,
    responseFormat: "json",
    temperature: input.phase === "fix" ? 0.1 : 0.2,
  });
  await appendLog(
    `Task ${input.task.id}: Modellantwort erhalten (${response.content.length} Zeichen)`
  );

  let parsed = safeParseJson(response.content) as TaskResponse | null;
  if (!parsed || !isTaskResponse(parsed)) {
    const snippet = response.content.replace(/\s+/g, " ").slice(0, 220);
    await appendLog(`Task ${input.task.id}: JSON-Parse fehlgeschlagen. Retry. Snippet: ${snippet}`);
    const retry = await provider.complete({
      model,
      messages: [
        ...baseMessages,
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
    await appendLog(
      `Task ${input.task.id}: Modellantwort (Retry) erhalten (${retry.content.length} Zeichen)`
    );
    parsed = safeParseJson(retry.content) as TaskResponse | null;
    if (!parsed || !isTaskResponse(parsed)) {
      throw new Error("Model response could not be parsed as JSON.");
    }
  }
  return parsed;
}

async function runTaskInternal(projectId: string, task: Task, team: Team) {
  const project = await readProjectMeta(projectId);
  const agent = team.agents.find((item) => item.id === task.agentId);
  if (!agent) {
    throw new Error(`Agent not found for task ${task.id}`);
  }

  const run: TaskRun = {
    id: nanoid(8),
    startedAt: new Date().toISOString(),
    status: "running",
  };
  task.status = "running";
  task.updatedAt = new Date().toISOString();
  task.runs = [...(task.runs ?? []), run];
  await appendLog(`Task ${task.id}: startet (Implementierung)`);
  await writeTeam(projectId, team, project.settings.storageFormat);
  await writeTasksMarkdown(projectId, team);
  await updateProjectTimestamp(projectId);

  await appendLog(`Task ${task.id}: denkt nach (Implementierung)`);
  const implement = await requestTaskActions({
    phase: "implement",
    projectId,
    task,
    agent,
    team,
  });
  await appendLog(`Task ${task.id}: actions erhalten (${implement.actions?.length ?? 0})`);
  const changes: TaskChange[] = [];
  const implementChanges = await applyActions(workspaceDir(projectId), implement.actions);
  await appendLog(
    `Task ${task.id}: ${implementChanges.length} Aenderungen angewendet (Implementierung)`
  );
  for (const change of implementChanges) {
    await appendLog(`Task ${task.id}: ${change.action} ${change.path}`);
  }
  changes.push(...implementChanges);

  task.status = "testing";
  run.status = "testing";
  task.updatedAt = new Date().toISOString();
  await appendLog(`Task ${task.id}: Tests vorbereiten`);
  await writeTeam(projectId, team, project.settings.storageFormat);
  await writeTasksMarkdown(projectId, team);
  await updateProjectTimestamp(projectId);

  await appendLog(`Task ${task.id}: denkt nach (Tests)`);
  const tests = await requestTaskActions({
    phase: "tests",
    projectId,
    task,
    agent,
    team,
  });
  await appendLog(`Task ${task.id}: Test-actions erhalten (${tests.actions?.length ?? 0})`);
  const testChanges = await applyActions(workspaceDir(projectId), tests.actions);
  await appendLog(`Task ${task.id}: ${testChanges.length} Aenderungen angewendet (Tests)`);
  for (const change of testChanges) {
    await appendLog(`Task ${task.id}: ${change.action} ${change.path}`);
  }
  changes.push(...testChanges);

  let testOutput = "";
  let testStatus: "completed" | "failed" = "completed";
  if (project.settings.autoTest) {
    const testCommand = await detectTestCommand(workspaceDir(projectId));
    if (testCommand) {
      await appendLog(`Task ${task.id}: Tests ausfuehren (${testCommand})`);
      const result = await runTestCommand(testCommand, workspaceDir(projectId));
      testOutput = result.output;
      testStatus = result.success ? "completed" : "failed";
      await appendLog(
        `Task ${task.id}: Tests ${result.success ? "ok" : "fehlgeschlagen"}`
      );
      if (!result.success) {
        let attempt = 0;
        const maxFixIterations =
          project.settings.maxFixIterations <= 0
            ? Number.POSITIVE_INFINITY
            : project.settings.maxFixIterations;
        while (!result.success && attempt < maxFixIterations) {
          attempt += 1;
          await appendLog(`Task ${task.id}: Fix-Versuch ${attempt}`);
          const fix = await requestTaskActions({
            phase: "fix",
            projectId,
            task,
            agent,
            team,
            errors: result.output,
          });
          await appendLog(`Task ${task.id}: Fix-actions erhalten (${fix.actions?.length ?? 0})`);
          const fixChanges = await applyActions(workspaceDir(projectId), fix.actions);
          await appendLog(
            `Task ${task.id}: ${fixChanges.length} Aenderungen angewendet (Fix)`
          );
          for (const change of fixChanges) {
            await appendLog(`Task ${task.id}: ${change.action} ${change.path}`);
          }
          changes.push(...fixChanges);
          const retry = await runTestCommand(testCommand, workspaceDir(projectId));
          testOutput = retry.output;
          testStatus = retry.success ? "completed" : "failed";
          await appendLog(
            `Task ${task.id}: Fix-Tests ${retry.success ? "ok" : "fehlgeschlagen"}`
          );
          if (retry.success) break;
        }
      }
    }
  }

  run.finishedAt = new Date().toISOString();
  run.status = testStatus === "completed" ? "completed" : "failed";
  run.summary = implement.summary ?? tests.summary ?? "";
  run.output = [implement.summary, tests.summary].filter(Boolean).join("\n");
  run.testOutput = testOutput;
  run.changes = Array.from(
    new Map(changes.map((change) => [`${change.action}:${change.path}`, change])).values()
  );
  task.status = run.status;
  task.updatedAt = new Date().toISOString();
  await appendLog(`Task ${task.id}: ${task.status}`);
  task.artifacts = Array.from(
    new Set([...(task.artifacts ?? []), ...(implement.artifacts ?? []), ...(tests.artifacts ?? [])])
  );

  await writeTeam(projectId, team, project.settings.storageFormat);
  await writeTasksMarkdown(projectId, team);
  await updateProjectTimestamp(projectId);

  return task;
}

export async function runTask(projectId: string, taskId: string) {
  const team = await readTeam(projectId);
  const task = team.tasks.find((item) => item.id === taskId);
  if (!task) {
    throw new Error("Task not found.");
  }
  return runTaskInternal(projectId, task, team);
}

export async function runAllTasks(projectId: string) {
  const team = await readTeam(projectId);
  for (const task of team.tasks) {
    if (task.status === "completed") continue;
    await runTaskInternal(projectId, task, team);
  }
  return team;
}
