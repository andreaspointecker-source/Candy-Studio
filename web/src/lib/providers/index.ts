import { createOpenAIProvider } from "./openai";
import { createGLMProvider } from "./glm";
import { createGoogleProvider } from "./google";
import { createAnthropicProvider } from "./anthropic";
import { createOpenRouterProvider } from "./openrouter";
import { getGLMBaseUrl, getGLMKey, getOpenAIKey, getOpenRouterBaseUrl, getOpenRouterKey } from "../config";
import type { ProviderName, WizardMessage } from "../schema";

export type ProviderResponse = {
  content: string;
  model: string;
};

export type CompletionOptions = {
  model: string;
  messages: WizardMessage[];
  temperature?: number;
  responseFormat?: "json" | "text";
};

export type ModelProvider = {
  name: string;
  complete: (options: CompletionOptions) => Promise<ProviderResponse>;
};

export function getProvider(
  name: ProviderName,
  options?: {
    cooldownSeconds?: number;
    apiKey?: string;
    baseUrl?: string;
  }
): ModelProvider {
  if (name === "glm") {
    const apiKey = options?.apiKey ?? getGLMKey();
    if (!apiKey) {
      throw new Error("GLM_API_KEY is not configured.");
    }
    return createGLMProvider(apiKey, options?.baseUrl ?? getGLMBaseUrl(), options);
  }
  if (name === "google") {
    const apiKey = options?.apiKey ?? process.env.GOOGLE_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is not configured.");
    }
    return createGoogleProvider(apiKey, options?.baseUrl);
  }
  if (name === "anthropic") {
    const apiKey = options?.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured.");
    }
    return createAnthropicProvider(apiKey, options?.baseUrl);
  }
  if (name === "openrouter") {
    const apiKey = options?.apiKey ?? getOpenRouterKey();
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }
    return createOpenRouterProvider(apiKey, options?.baseUrl ?? getOpenRouterBaseUrl(), options);
  }
  const apiKey = options?.apiKey ?? getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  return createOpenAIProvider(apiKey, options);
}
