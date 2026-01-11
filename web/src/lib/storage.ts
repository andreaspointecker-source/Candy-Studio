import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import YAML from "yaml";
import { nanoid } from "nanoid";
import { DEFAULT_SETTINGS, PROJECTS_ROOT, mergeSettings } from "./config";
import type { ProjectData, ProjectMeta, ProjectSettings, Team, WizardDraft } from "./schema";

const PROJECT_FILE = "project.json";
const TEAM_FILE_JSON = "team.json";
const TEAM_FILE_YAML = "team.yaml";
const PLAN_FILE = "plan.md";
const TASKS_FILE = "tasks.md";
const INDEX_FILE = path.join(PROJECTS_ROOT, ".index.json");

export function projectDir(projectId: string) {
  const index = readProjectIndex();
  if (index[projectId]) {
    return index[projectId];
  }
  return path.join(PROJECTS_ROOT, projectId);
}

export function workspaceDir(projectId: string) {
  return path.join(projectDir(projectId), "workspace");
}

export async function ensureProjectsRoot() {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
}

function readProjectIndex(): Record<string, string> {
  try {
    if (!fsSync.existsSync(INDEX_FILE)) return {};
    const raw = fsSync.readFileSync(INDEX_FILE, "utf8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeProjectIndex(nextIndex: Record<string, string>) {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
  await fs.writeFile(INDEX_FILE, JSON.stringify(nextIndex, null, 2));
}

function slugifyName(name: string) {
  const trimmed = name.trim().toLowerCase();
  const cleaned = trimmed
    .replace(/[^a-z0-9\\s_-]/g, "")
    .replace(/\\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned || "project";
}

export async function listProjects(): Promise<ProjectMeta[]> {
  await ensureProjectsRoot();
  const index = readProjectIndex();
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true });
  const projects: ProjectMeta[] = [];
  const seen = new Set<string>();

  async function readMeta(folder: string) {
    const metaPath = path.join(folder, PROJECT_FILE);
    try {
      const raw = await fs.readFile(metaPath, "utf8");
      const data = JSON.parse(raw) as ProjectData;
      if (seen.has(data.meta.id)) return;
      seen.add(data.meta.id);
      projects.push(data.meta);
    } catch {
      return;
    }
  }

  for (const mapped of Object.values(index)) {
    await readMeta(mapped);
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    await readMeta(path.join(PROJECTS_ROOT, entry.name));
    const nested = await fs.readdir(path.join(PROJECTS_ROOT, entry.name), {
      withFileTypes: true,
    });
    for (const sub of nested) {
      if (!sub.isDirectory()) continue;
      if (sub.name === "workspace" || sub.name.startsWith(".")) continue;
      await readMeta(path.join(PROJECTS_ROOT, entry.name, sub.name));
    }
  }
  return projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function readProjectMeta(projectId: string): Promise<ProjectData> {
  const metaPath = path.join(projectDir(projectId), PROJECT_FILE);
  const raw = await fs.readFile(metaPath, "utf8");
  const parsed = JSON.parse(raw) as ProjectData;
  return {
    ...parsed,
    settings: mergeSettings(parsed.settings),
  };
}

export async function writeProjectMeta(project: ProjectData) {
  const metaPath = path.join(projectDir(project.meta.id), PROJECT_FILE);
  await fs.writeFile(metaPath, JSON.stringify(project, null, 2));
}

export async function readTeam(projectId: string): Promise<Team> {
  const folder = projectDir(projectId);
  const yamlPath = path.join(folder, TEAM_FILE_YAML);
  const jsonPath = path.join(folder, TEAM_FILE_JSON);
  try {
    const rawYaml = await fs.readFile(yamlPath, "utf8");
    return YAML.parse(rawYaml) as Team;
  } catch {
    const rawJson = await fs.readFile(jsonPath, "utf8");
    return JSON.parse(rawJson) as Team;
  }
}

export async function writeTeam(projectId: string, team: Team, format: "json" | "yaml") {
  const folder = projectDir(projectId);
  const filePath = path.join(folder, format === "yaml" ? TEAM_FILE_YAML : TEAM_FILE_JSON);
  if (format === "yaml") {
    await fs.writeFile(filePath, YAML.stringify(team));
    const jsonPath = path.join(folder, TEAM_FILE_JSON);
    await fs.rm(jsonPath, { force: true });
    return;
  }
  await fs.writeFile(filePath, JSON.stringify(team, null, 2));
  const yamlPath = path.join(folder, TEAM_FILE_YAML);
  await fs.rm(yamlPath, { force: true });
}

export async function writePlan(projectId: string, content: string) {
  await fs.writeFile(path.join(projectDir(projectId), PLAN_FILE), content);
}

export async function readPlan(projectId: string) {
  return fs.readFile(path.join(projectDir(projectId), PLAN_FILE), "utf8");
}

export async function readTasksMarkdown(projectId: string) {
  return fs.readFile(path.join(projectDir(projectId), TASKS_FILE), "utf8");
}

export async function writeTasksMarkdown(projectId: string, team: Team) {
  const header = `# Tasks\n\n| Status | Task | Agent | Kategorie |\n| --- | --- | --- | --- |\n`;
  const rows = team.tasks
    .map((task) => {
      const agent = team.agents.find((item) => item.id === task.agentId);
      const agentName = agent ? agent.name : "Unassigned";
      return `| ${task.status} | ${task.description} | ${agentName} | ${task.category ?? "general"} |`;
    })
    .join("\n");
  await fs.writeFile(path.join(projectDir(projectId), TASKS_FILE), `${header}${rows}\n`);
}

export async function createProject(input: {
  draft: WizardDraft;
  planMarkdown: string;
  team: Team;
  storageFormat?: "json" | "yaml";
  settings?: Partial<ProjectSettings>;
}) {
  await ensureProjectsRoot();
  const baseId = slugifyName(input.draft.name);
  const basePath = input.draft.storagePath?.trim();
  const baseRoot = basePath
    ? path.isAbsolute(basePath)
      ? basePath
      : path.join(PROJECTS_ROOT, basePath)
    : PROJECTS_ROOT;
  let projectId = baseId;
  let projectRoot =
    basePath && path.basename(baseRoot).toLowerCase() === baseId
      ? baseRoot
      : path.join(baseRoot, baseId);
  let suffix = 1;
  while (fsSync.existsSync(projectRoot)) {
    suffix += 1;
    projectId = `${baseId}-${suffix}`;
    projectRoot = path.join(baseRoot, projectId);
  }
  const now = new Date().toISOString();
  const meta: ProjectMeta = {
    id: projectId,
    name: input.draft.name,
    description: input.draft.description,
    storagePath: input.draft.storagePath?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const settings = mergeSettings({
    ...(input.settings ?? {}),
    storageFormat: input.storageFormat ?? DEFAULT_SETTINGS.storageFormat,
  });
  const projectData: ProjectData = { meta, settings };
  const folder = projectRoot;
  await fs.mkdir(folder, { recursive: true });
  await fs.mkdir(path.join(folder, "workspace"), { recursive: true });
  if (folder !== path.join(PROJECTS_ROOT, projectId)) {
    const index = readProjectIndex();
    index[projectId] = folder;
    await writeProjectIndex(index);
  }
  await writeProjectMeta(projectData);
  await writeTeam(projectId, input.team, settings.storageFormat);
  await writePlan(projectId, input.planMarkdown);
  await writeTasksMarkdown(projectId, input.team);
  return projectData;
}

export async function updateProjectTimestamp(projectId: string) {
  const project = await readProjectMeta(projectId);
  project.meta.updatedAt = new Date().toISOString();
  await writeProjectMeta(project);
}

/**
 * Generic Storage Wrapper
 * 
 * Bietet eine API für localStorage/sessionStorage, die automatisch
 * zwischen In-Memory und Persistenz synchronisiert.
 */

// Typ-Definitionen
type StorageValue = string | number | boolean | object | any[] | null;
type StorageKey = string;

export class Storage {
  private prefix: string = 'kaiban-'; // Optionaler Prefix zur Vermeidung

  constructor(prefix?: string) {
    if (prefix) {
      this.prefix = prefix;
    }
  }

  /**
   * Einen Wert speichern
   */
  setItem(key: StorageKey, value: StorageValue): void {
    const fullKey = `${this.prefix}${key}`;
    
    // Im localStorage speichern
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (error) {
      console.error(`[Storage] Failed to write to localStorage:`, error);
    }
  }

  /**
   * Einen Wert abrufen
   */
  getItem(key: StorageKey): StorageValue | null {
    const fullKey = `${this.prefix}${key}`;
    
    try {
      const item = localStorage.getItem(fullKey);
      if (item === null) return null;
      return JSON.parse(item);
    } catch (error) {
      console.error(`[Storage] Failed to read from localStorage:`, error);
      return null;
    }
  }

  /**
   * Einen Wert entfernen
   */
  removeItem(key: StorageKey): void {
    const fullKey = `${this.prefix}${key}`;
    try {
      localStorage.removeItem(fullKey);
    } catch (error) {
      console.error(`[Storage] Failed to remove from localStorage:`, error);
    }
  }

  /**
   * Alle Werte löschen
   */
  clear(): void {
    // Lösche nur Keys, die mit dem Prefix beginnen, um andere Daten nicht zu löschen
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Alle Keys zurückgeben
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        // Entferne den Prefix
        keys.push(key.substring(this.prefix.length + 1)); 
      }
    }
    return keys;
  }

  /**
   * Alle Werte zurückgeben
   */
  getAll(): Record<string, StorageValue> {
    const items: Record<string, StorageValue> = {};
    this.getAllKeys().forEach((key) => {
      const value = this.getItem(key);
      if (value !== null) {
        items[key] = value;
      }
    });
    return items;
  }
}

// Singleton-Instanz (damit einfach importiert werden kann)
export const storage = new Storage();
