import OpenAI from "openai";
import type { CompletionOptions, ModelProvider } from "./index";
import { retryWithBackoff } from "../retry";

export function createOpenRouterProvider(
  apiKey: string,
  baseUrl?: string,
  providerOptions?: { cooldownSeconds?: number }
): ModelProvider {
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl ?? "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "X-Title": "Candy Studio",
      "HTTP-Referer": "http://localhost:3333",
    },
  });

  return {
    name: "openrouter",
    complete: async (options: CompletionOptions) => {
      const response = await retryWithBackoff(async () => {
        return client.chat.completions.create({
          model: options.model,
          messages: options.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          temperature: options.temperature ?? 0.2,
        });
      }, providerOptions?.cooldownSeconds ? { cooldownSeconds: providerOptions.cooldownSeconds } : undefined);
      const content = response.choices?.[0]?.message?.content ?? "";
      return {
        content,
        model: response.model ?? options.model,
      };
    },
  };
}
