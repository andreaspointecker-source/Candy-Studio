import OpenAI from "openai";
import type { CompletionOptions, ModelProvider } from "./index";
import { retryWithBackoff } from "../retry";

export function createOpenAIProvider(
  apiKey: string,
  providerOptions?: { cooldownSeconds?: number }
): ModelProvider {
  const client = new OpenAI({ apiKey });

  return {
    name: "openai",
    complete: async (options: CompletionOptions) => {
      const response = await retryWithBackoff(async () => {
        return client.chat.completions.create({
          model: options.model,
          messages: options.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          ...(options.responseFormat === "text"
            ? {}
            : { response_format: { type: "json_object" } }),
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
