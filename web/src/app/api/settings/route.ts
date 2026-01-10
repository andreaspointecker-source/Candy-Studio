import { NextResponse } from "next/server";
import { readAppSettings, writeAppSettings } from "@/lib/appSettings";
import {
  getAnthropicKey,
  getGLMKey,
  getGoogleKey,
  getOpenAIKey,
  getOpenRouterKey,
} from "@/lib/config";
import type { AppSettings, ProviderName } from "@/lib/schema";

export async function GET() {
  const settings = await readAppSettings();
  const envKeys = {
    openai: getOpenAIKey(),
    glm: getGLMKey(),
    google: getGoogleKey(),
    anthropic: getAnthropicKey(),
    openrouter: getOpenRouterKey(),
  };
  const keySources: Record<ProviderName, "stored" | "env" | "missing"> = {
    openai: settings.providerKeys.openai ? "stored" : envKeys.openai ? "env" : "missing",
    glm: settings.providerKeys.glm ? "stored" : envKeys.glm ? "env" : "missing",
    google: settings.providerKeys.google ? "stored" : envKeys.google ? "env" : "missing",
    anthropic: settings.providerKeys.anthropic ? "stored" : envKeys.anthropic ? "env" : "missing",
    openrouter: settings.providerKeys.openrouter
      ? "stored"
      : envKeys.openrouter
        ? "env"
        : "missing",
  };
  return NextResponse.json({ settings, keySources });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as AppSettings;
  await writeAppSettings(body);
  return NextResponse.json({ settings: body });
}
