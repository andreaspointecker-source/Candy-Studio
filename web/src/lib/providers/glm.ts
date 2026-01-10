import type { CompletionOptions, ModelProvider } from "./index";
import { retryWithBackoff } from "../retry";

export function createGLMProvider(
  apiKey: string,
  baseUrl: string,
  providerOptions?: { cooldownSeconds?: number }
): ModelProvider {
  return {
    name: "glm",
    complete: async (options: CompletionOptions) => {
      const data = await retryWithBackoff(async () => {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            messages: options.messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            temperature: options.temperature ?? 0.2,
          }),
        });
        if (!response.ok) {
          const text = await response.text();
          const error = new Error(text) as Error & { status?: number };
          error.status = response.status;
          throw error;
        }
        return response.json();
      }, providerOptions?.cooldownSeconds ? { cooldownSeconds: providerOptions.cooldownSeconds } : undefined);

      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.content ?? "";
      return {
        content,
        model: data?.model ?? options.model,
      };
    },
  };
}
