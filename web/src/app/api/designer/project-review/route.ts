import { NextResponse } from "next/server";
import { readAppSettings } from "@/lib/appSettings";
import { getProvider } from "@/lib/providers";
import {
  getAnthropicKey,
  getGLMKey,
  getGoogleKey,
  getOpenAIKey,
  getOpenRouterKey,
} from "@/lib/config";
import { readProjectMeta, workspaceDir } from "@/lib/storage";
import type { ProviderName } from "@/lib/schema";
import fs from "fs/promises";
import path from "path";

type ReviewRequest = {
  projectId: string;
  provider: ProviderName;
  model: string;
};

const IGNORED_FOLDERS = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".md"]);

async function buildWorkspaceSummary(root: string) {
  const files: string[] = [];
  const snippets: string[] = [];

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORED_FOLDERS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name));
        continue;
      }
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, "/");
      const stats = await fs.stat(absolute);
      files.push(`${relative} (${stats.size} bytes)`);
      if (snippets.length >= 8) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (stats.size <= 12000 && TEXT_EXTENSIONS.has(ext)) {
        const content = await fs.readFile(absolute, "utf8");
        snippets.push(`--- ${relative}\n${content}`);
      }
    }
  }

  await walk(root);
  return {
    files: files.slice(0, 60),
    snippets,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewRequest;
    if (!body.projectId || !body.provider || !body.model) {
      return NextResponse.json({ error: "Projekt oder Modell fehlt." }, { status: 400 });
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

    const provider = getProvider(body.provider, {
      cooldownSeconds: 30,
      apiKey,
      baseUrl: appSettings.providerBaseUrls[body.provider],
    });

    const project = await readProjectMeta(body.projectId);
    const summary = await buildWorkspaceSummary(workspaceDir(body.projectId));

    const system = appSettings.systemPrompts.designerProjectReview;

    const user = [
      `Project: ${project.meta.name}`,
      `Description: ${project.meta.description}`,
      "Workspace files:",
      ...summary.files.map((item) => `- ${item}`),
      "",
      "Relevant snippets:",
      ...summary.snippets,
    ].join("\n");

    const response = await provider.complete({
      model: body.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      responseFormat: "text",
    });

    return NextResponse.json({ message: response.content });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Projektanalyse fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
