export type TaskStatus = "pending" | "running" | "testing" | "completed" | "failed" | "blocked";

export type ProviderName = "openai" | "glm" | "google" | "anthropic" | "openrouter";

export type ModelConfig = {
  provider: ProviderName;
  model: string;
};

export type ModelRouting = {
  wizard: ModelConfig;
  taskWizard: ModelConfig;
  planning: ModelConfig;
  taskImplementation: ModelConfig;
  taskTests: ModelConfig;
  taskFix: ModelConfig;
  research: ModelConfig;
};

export type ProviderKeys = {
  openai?: string;
  glm?: string;
  google?: string;
  anthropic?: string;
  openrouter?: string;
};

export type ProviderBaseUrls = {
  openai?: string;
  glm?: string;
  glmModels?: string;
  google?: string;
  googleModels?: string;
  anthropic?: string;
  anthropicModels?: string;
  openrouter?: string;
  openrouterModels?: string;
};

export type AppSettings = {
  providerKeys: ProviderKeys;
  providerBaseUrls: ProviderBaseUrls;
  modelRouting: ModelRouting;
  systemPrompts: SystemPrompts;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  goal: string;
  model: string;
  systemPrompt?: string;
};

export type TaskOverrides = {
  role?: string;
  goal?: string;
  provider?: ProviderName;
  model?: string;
};

export type TaskRun = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: TaskStatus;
  summary?: string;
  output?: string;
  testOutput?: string;
  changes?: { path: string; action: "write" | "delete" | "mkdir" }[];
};

export type Task = {
  id: string;
  description: string;
  agentId: string;
  category?: "general" | "research";
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  overrides?: TaskOverrides;
  runs?: TaskRun[];
  artifacts?: string[];
};

export type Team = {
  name: string;
  agents: Agent[];
  tasks: Task[];
};

export type ProjectSettings = {
  storageFormat: "json" | "yaml";
  defaultModel: string;
  modelRouting: ModelRouting;
  maxFixIterations: number;
  autoTest: boolean;
  sessionCooldownSeconds: number;
};

export type ProjectMeta = {
  id: string;
  name: string;
  description: string;
  storagePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectData = {
  meta: ProjectMeta;
  settings: ProjectSettings;
};

export type WizardDraft = {
  name: string;
  description: string;
  projectType?: ProjectType;
  storagePath?: string;
  goals: string[];
  features: string[];
  targetUsers: string[];
  techStack: string[];
  constraints: string[];
  successCriteria: string[];
};

export type ProjectType =
  | "homepage"
  | "webapp"
  | "desktop"
  | "mobile"
  | "other";

export type SystemPrompts = {
  wizardDefault: string;
  wizardHomepage: string;
  wizardWebApp: string;
  wizardDesktop: string;
  wizardMobile: string;
  wizardOther: string;
  taskWizard: string;
  planAndTeam: string;
  taskRunner: string;
  designerGenerate: string;
  designerChat: string;
  designerProjectReview: string;
};

export type WizardMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
