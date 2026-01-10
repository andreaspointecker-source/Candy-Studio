import type { CompletionOptions, ModelProvider } from "./index";
import { retryWithBackoff } from "../retry";

function toGeminiRole(role: string) {
  if (role === "assistant") return "model";
  return "user";
}

export function createGoogleProvider(apiKey: string, baseUrl?: string): ModelProvider {
  return {
    name: "google",
    complete: async (options: CompletionOptions) => {
      const urlBase = baseUrl ?? "https://generativelanguage.googleapis.com/v1beta/models";
      const url = `${urlBase}/${options.model}:generateContent?key=${apiKey}`;
      const contents = options.messages.map((message) => ({
        role: toGeminiRole(message.role),
        parts: [{ text: message.content }],
      }));
      const response = await retryWithBackoff(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options.temperature ?? 0.2,
            },
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
      const content =
        response?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ??
        "";
      return {
        content,
        model: options.model,
      };
    },
  };
}
