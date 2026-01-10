import type { CompletionOptions, ModelProvider } from "./index";
import { retryWithBackoff } from "../retry";

export function createAnthropicProvider(apiKey: string, baseUrl?: string): ModelProvider {
  return {
    name: "anthropic",
    complete: async (options: CompletionOptions) => {
      const url = baseUrl ?? "https://api.anthropic.com/v1/messages";
      const system = options.messages.find((message) => message.role === "system")?.content ?? "";
      const messages = options.messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        }));
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: options.model,
            system: system || undefined,
            messages,
            max_tokens: 2048,
            temperature: options.temperature ?? 0.2,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          const error = new Error(text) as Error & { status?: number };
          error.status = res.status;
          throw error;
        }
        return res.json();
      });
      const content = response?.content?.[0]?.text ?? "";
      return {
        content,
        model: options.model,
      };
    },
  };
}
