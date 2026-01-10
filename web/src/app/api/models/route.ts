import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  getGLMKey,
  getGLMManualModels,
  getGLMModelsUrl,
  getOpenAIKey,
  getOpenRouterKey,
  getOpenRouterModelsUrl,
} from "@/lib/config";
import { readAppSettings } from "@/lib/appSettings";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (provider === "glm") {
    const appSettings = await readAppSettings();
    const apiKey = appSettings.providerKeys.glm ?? getGLMKey();
    if (!apiKey) {
      return NextResponse.json({ error: "GLM_API_KEY is not configured." }, { status: 400 });
    }
    const response = await fetch(appSettings.providerBaseUrls.glmModels ?? getGLMModelsUrl(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }
    const data = await response.json();
    const fromApi =
      data?.data?.map((item: { id?: string }) => item.id).filter(Boolean) ??
      data?.models?.map((item: { id?: string; name?: string }) => item.id ?? item.name).filter(Boolean) ??
      [];
    const manual = getGLMManualModels();
    const models = Array.from(new Set([...fromApi, ...manual])).sort();
    return NextResponse.json({ models });
  }

  if (provider === "openai") {
    const appSettings = await readAppSettings();
    const apiKey = appSettings.providerKeys.openai ?? getOpenAIKey();
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
    }
    try {
      const client = new OpenAI({ apiKey });
      const result = await client.models.list();
      const models = result.data.map((item) => item.id).sort();
      return NextResponse.json({ models });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OpenAI models failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (provider === "openrouter") {
    const appSettings = await readAppSettings();
    const apiKey = appSettings.providerKeys.openrouter ?? getOpenRouterKey();
    if (!apiKey) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is not configured." }, { status: 400 });
    }
    const modelsUrl = appSettings.providerBaseUrls.openrouterModels ?? getOpenRouterModelsUrl();
    const response = await fetch(modelsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }
    const data = await response.json();
    const modelDetails = (data?.data ?? [])
      .map((item: { id?: string; name?: string; pricing?: Record<string, string> }) => {
        const id = item.id ?? item.name;
        if (!id) return null;
        const pricingValues = Object.values(item.pricing ?? {});
        const isFree =
          pricingValues.length > 0 &&
          pricingValues.every((value) => Number.parseFloat(value) === 0);
        return { id, tier: isFree ? "free" : "paid" };
      })
      .filter(Boolean) as { id: string; tier: "free" | "paid" }[];
    const models = modelDetails.map((item) => item.id).sort();
    return NextResponse.json({ models, modelDetails });
  }

  if (provider === "google") {
    const appSettings = await readAppSettings();
    const apiKey = appSettings.providerKeys.google ?? process.env.GOOGLE_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 400 });
    }
    const modelsUrl =
      appSettings.providerBaseUrls.googleModels ??
      "https://generativelanguage.googleapis.com/v1beta/models";
    const response = await fetch(`${modelsUrl}?key=${apiKey}`);
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }
    const data = await response.json();
    const models = (data?.models ?? [])
      .map((item: { name?: string; displayName?: string }) => item.name ?? item.displayName)
      .filter(Boolean)
      .map((name: string) => name.replace("models/", ""))
      .sort();
    return NextResponse.json({ models });
  }

  if (provider === "anthropic") {
    const appSettings = await readAppSettings();
    const apiKey = appSettings.providerKeys.anthropic ?? process.env.ANTHROPIC_API_KEY ?? "";
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 400 });
    }
    const modelsUrl = appSettings.providerBaseUrls.anthropicModels ?? "https://api.anthropic.com/v1/models";
    const response = await fetch(modelsUrl, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: text }, { status: response.status });
    }
    const data = await response.json();
    const models = (data?.data ?? []).map((item: { id?: string }) => item.id).filter(Boolean).sort();
    return NextResponse.json({ models });
  }

  return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
}
