import path from "path";
import type { ModelRouting, ProjectSettings } from "./schema";

export const PROJECTS_ROOT = path.join(process.cwd(), "projects");

const DEFAULT_ROUTING: ModelRouting = {
  wizard: { provider: "openai", model: "gpt-4o-mini" },
  taskWizard: { provider: "openai", model: "gpt-4o-mini" },
  planning: { provider: "openai", model: "gpt-4o-mini" },
  taskImplementation: { provider: "openai", model: "gpt-4o-mini" },
  taskTests: { provider: "openai", model: "gpt-4o-mini" },
  taskFix: { provider: "openai", model: "gpt-4o-mini" },
  research: { provider: "openai", model: "gpt-4o-mini" },
};

export const DEFAULT_SETTINGS: ProjectSettings = {
  storageFormat: "json",
  defaultModel: "gpt-4o-mini",
  modelRouting: DEFAULT_ROUTING,
  maxFixIterations: 2,
  autoTest: true,
  sessionCooldownSeconds: 45,
};

export function getOpenAIKey() {
  return process.env.OPENAI_API_KEY ?? "";
}

export function getGLMKey() {
  return process.env.GLM_API_KEY ?? "";
}

export function getGoogleKey() {
  return process.env.GOOGLE_API_KEY ?? "";
}

export function getAnthropicKey() {
  return process.env.ANTHROPIC_API_KEY ?? "";
}

export function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY ?? "";
}

export function getGLMBaseUrl() {
  return process.env.GLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions";
}

export function getGLMModelsUrl() {
  return process.env.GLM_MODELS_URL ?? "https://open.bigmodel.cn/api/paas/v4/models";
}

export function getOpenRouterBaseUrl() {
  return process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
}

export function getOpenRouterModelsUrl() {
  return process.env.OPENROUTER_MODELS_URL ?? "https://openrouter.ai/api/v1/models";
}

export function getGLMManualModels() {
  const raw = process.env.GLM_MODELS_MANUAL ?? "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mergeSettings(input?: Partial<ProjectSettings>): ProjectSettings {
  const routing = input?.modelRouting ?? DEFAULT_SETTINGS.modelRouting;
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    modelRouting: {
      ...DEFAULT_SETTINGS.modelRouting,
      ...routing,
    },
  };
}
