import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getProvider } from "@/lib/providers";
import { readAppSettings } from "@/lib/appSettings";
import {
  getAnthropicKey,
  getGLMKey,
  getGoogleKey,
  getOpenAIKey,
  getOpenRouterKey,
} from "@/lib/config";
import type { ProviderName } from "@/lib/schema";

type ChatRequest = {
  prompt: string;
  provider: ProviderName;
  model: string;
  images?: { name: string; size: number; dataUrl: string; mime: string }[];
};

const VISION_MODELS: Record<ProviderName, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  anthropic: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-20240229"],
  google: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash"],
  openrouter: [
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-pro-1.5",
    "meta-llama/llama-3.2-90b-vision-instruct",
    "google/gemini-flash-1.5",
  ],
  glm: ["glm-4v-plus", "glm-4v"],
};

function isVisionModel(provider: ProviderName, model: string) {
  return VISION_MODELS[provider]?.includes(model);
}

function toBase64(dataUrl: string) {
  const parts = dataUrl.split(",");
  return parts.length > 1 ? parts[1] : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt fehlt." }, { status: 400 });
    }
    if (!body.provider || !body.model) {
      return NextResponse.json({ error: "Provider oder Modell fehlt." }, { status: 400 });
    }

    const appSettings = await readAppSettings();
    const apiKey =
      appSettings.providerKeys[body.provider] ??
      (body.provider === "openai"
        ? getOpenAIKey()
        : body.provider === "glm"
          ? getGLMKey()
          : body.provider === "google"
            ? getGoogleKey()
            : body.provider === "anthropic"
              ? getAnthropicKey()
              : body.provider === "openrouter"
                ? getOpenRouterKey()
                : "");

    if (!apiKey) {
      return NextResponse.json({ error: "Kein API Key fuer Provider." }, { status: 400 });
    }

    const system = appSettings.systemPrompts.designerChat;

    const images = body.images ?? [];
    if (images.length && !isVisionModel(body.provider, body.model)) {
      return NextResponse.json({ error: "Modell unterstuetzt keine Bilder." }, { status: 400 });
    }

    if (!images.length) {
      const provider = getProvider(body.provider, {
        cooldownSeconds: 30,
        apiKey,
        baseUrl: appSettings.providerBaseUrls[body.provider],
      });
      const response = await provider.complete({
        model: body.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: body.prompt },
        ],
        temperature: 0.5,
        responseFormat: "text",
      });
      return NextResponse.json({ message: response.content });
    }

    if (body.provider === "openai") {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: body.model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: body.prompt },
              ...images.map((image) => ({
                type: "image_url" as const,
                image_url: { url: image.dataUrl },
              })),
            ],
          },
        ],
        temperature: 0.5,
      });
      return NextResponse.json({ message: response.choices?.[0]?.message?.content ?? "" });
    }

    if (body.provider === "openrouter") {
      const client = new OpenAI({
        apiKey,
        baseURL: appSettings.providerBaseUrls.openrouter ?? "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "X-Title": "Candy Studio",
          "HTTP-Referer": "http://localhost:3333",
        },
      });
      const response = await client.chat.completions.create({
        model: body.model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: body.prompt },
              ...images.map((image) => ({
                type: "image_url" as const,
                image_url: { url: image.dataUrl },
              })),
            ],
          },
        ],
        temperature: 0.5,
      });
      return NextResponse.json({ message: response.choices?.[0]?.message?.content ?? "" });
    }

    if (body.provider === "anthropic") {
      const response = await fetch(
        appSettings.providerBaseUrls.anthropic ?? "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: body.model,
            system,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: body.prompt },
                  ...images.map((image) => ({
                    type: "image",
                    source: {
                      type: "base64",
                      media_type: image.mime,
                      data: toBase64(image.dataUrl),
                    },
                  })),
                ],
              },
            ],
            max_tokens: 1024,
            temperature: 0.5,
          }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text }, { status: response.status });
      }
      const data = await response.json();
      return NextResponse.json({ message: data?.content?.[0]?.text ?? "" });
    }

    if (body.provider === "google") {
      const baseUrl =
        appSettings.providerBaseUrls.google ??
        "https://generativelanguage.googleapis.com/v1beta/models";
      const response = await fetch(`${baseUrl}/${body.model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: body.prompt },
                ...images.map((image) => ({
                  inlineData: {
                    mimeType: image.mime,
                    data: toBase64(image.dataUrl),
                  },
                })),
              ],
            },
          ],
          generationConfig: { temperature: 0.5 },
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text }, { status: response.status });
      }
      const data = await response.json();
      const message =
        data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ??
        "";
      return NextResponse.json({ message });
    }

    if (body.provider === "glm") {
      const response = await fetch(
        appSettings.providerBaseUrls.glm ?? "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: body.model,
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                content: [
                  { type: "text", text: body.prompt },
                  ...images.map((image) => ({
                    type: "image_url",
                    image_url: { url: image.dataUrl },
                  })),
                ],
              },
            ],
            temperature: 0.5,
          }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: text }, { status: response.status });
      }
      const data = await response.json();
      const message = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.content ?? "";
      return NextResponse.json({ message });
    }

    return NextResponse.json({ error: "Provider nicht unterstuetzt." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
