import { nanoid } from "nanoid";
import { getProvider } from "./providers";
import { readAppSettings } from "./appSettings";
import type { ModelRouting, Team, WizardDraft, WizardMessage } from "./schema";
import { DEFAULT_SETTINGS } from "./config";

type WizardResponse = {
  type: "question" | "summary";
  message: string;
  draft: WizardDraft;
};

function safeParseJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return null;
  const jsonText = trimmed.slice(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    return null;
  }
}

function isSatisfied(message: string) {
  const normalized = message.trim().toLowerCase();
  return /\b(ok|okay|passt|fertig|ja|los|start)\b/.test(normalized);
}

const EMPTY_DRAFT: WizardDraft = {
  name: "",
  description: "",
  goals: [],
  features: [],
  targetUsers: [],
  techStack: [],
  constraints: [],
  successCriteria: [],
};

export async function wizardStep(
  messages: WizardMessage[],
  draft?: WizardDraft,
  routing?: ModelRouting
): Promise<WizardResponse> {
  const modelConfig = routing?.wizard ?? DEFAULT_SETTINGS.modelRouting.wizard;
  const appSettings = await readAppSettings();
  const provider = getProvider(modelConfig.provider, {
    cooldownSeconds: DEFAULT_SETTINGS.sessionCooldownSeconds,
    apiKey: appSettings.providerKeys[modelConfig.provider],
    baseUrl: appSettings.providerBaseUrls[modelConfig.provider],
  });
  const lastUser = [...messages].reverse().find((item) => item.role === "user");
  const done = lastUser ? isSatisfied(lastUser.content) : false;
  const promptKeyMap: Record<string, keyof typeof appSettings.systemPrompts> = {
    homepage: "wizardHomepage",
    webapp: "wizardWebApp",
    desktop: "wizardDesktop",
    mobile: "wizardMobile",
    other: "wizardOther",
  };
  const promptKey = draft?.projectType ? promptKeyMap[draft.projectType] : "wizardDefault";
  const system = appSettings.systemPrompts[promptKey ?? "wizardDefault"] ?? appSettings.systemPrompts.wizardDefault;

  const user = [
    draft ? `Current draft: ${JSON.stringify(draft)}` : `Current draft: ${JSON.stringify(EMPTY_DRAFT)}`,
    done
      ? "The user is satisfied. Provide a summary and finalize the draft."
      : "Ask the next best question to refine the draft.",
  ].join("\n");

  const response = await provider.complete({
    model: modelConfig.model,
    messages: [
      { role: "system", content: system },
      ...messages,
      { role: "user", content: user },
    ],
    temperature: 0.2,
  });

  const parsed = safeParseJson<WizardResponse>(response.content);
  if (!parsed) {
    return {
      type: "question",
      message: "Ich brauche noch ein Detail: Wie soll das Projekt heißen?",
      draft: draft ?? EMPTY_DRAFT,
    };
  }
  return parsed;
}

export async function generatePlanAndTeam(draft: WizardDraft, routing?: ModelRouting) {
  const modelConfig = routing?.planning ?? DEFAULT_SETTINGS.modelRouting.planning;
  const appSettings = await readAppSettings();
  const provider = getProvider(modelConfig.provider, {
    cooldownSeconds: DEFAULT_SETTINGS.sessionCooldownSeconds,
    apiKey: appSettings.providerKeys[modelConfig.provider],
    baseUrl: appSettings.providerBaseUrls[modelConfig.provider],
  });
  const system = appSettings.systemPrompts.planAndTeam;

  const user = [
    `Project draft: ${JSON.stringify(draft)}`,
    "Create a plan with clear phases and tasks for a first delivery.",
    "Use 2-5 agents and 4-10 tasks.",
  ].join("\n");

  const response = await provider.complete({
    model: modelConfig.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
  });

  const parsed = safeParseJson<{
    planMarkdown: string;
    teamName: string;
    agents: { name: string; role: string; goal: string; model: string }[];
    tasks: { description: string; agentName: string }[];
  }>(response.content);

  if (!parsed) {
    throw new Error("Plan generation failed.");
  }

  const fallbackModel =
    routing?.taskImplementation?.model ?? DEFAULT_SETTINGS.modelRouting.taskImplementation.model;
  const agents = parsed.agents.map((agent) => ({
    id: nanoid(6),
    ...agent,
    model: fallbackModel,
  }));

  const tasks = parsed.tasks.map((task) => {
    const agent = agents.find((item) => item.name === task.agentName) ?? agents[0];
    const now = new Date().toISOString();
    return {
      id: nanoid(6),
      description: task.description,
      agentId: agent.id,
      category: "general" as const,
      status: "pending" as const,
      createdAt: now,
      updatedAt: now,
      overrides: {},
      runs: [],
      artifacts: [],
    };
  });

  const team: Team = {
    name: parsed.teamName || draft.name,
    agents,
    tasks,
  };

  return {
    planMarkdown: parsed.planMarkdown,
    team,
  };
}
