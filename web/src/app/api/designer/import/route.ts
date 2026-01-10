import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs/promises";
import {
  readProjectMeta,
  readTeam,
  updateProjectTimestamp,
  workspaceDir,
  writeTasksMarkdown,
  writeTeam,
} from "@/lib/storage";

type ImportRequest = {
  projectId: string;
  exportFormat: "html" | "css" | "react" | "json";
  exportContent: string;
  source?: "ai" | "canvas";
  prompt?: string;
};

const EXTENSIONS: Record<ImportRequest["exportFormat"], string> = {
  html: "html",
  css: "css",
  react: "tsx",
  json: "json",
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportRequest;
    if (!body.projectId || !body.exportContent) {
      return NextResponse.json({ error: "Projekt oder Export fehlt." }, { status: 400 });
    }

    const project = await readProjectMeta(body.projectId);
    const team = await readTeam(body.projectId);
    const agentId = team.agents[0]?.id;
    if (!agentId) {
      return NextResponse.json({ error: "Kein Agent im Projekt." }, { status: 400 });
    }

    const ext = EXTENSIONS[body.exportFormat];
    const fileName = `ui-designer-${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
    const folder = path.join(workspaceDir(body.projectId), "designs");
    await fs.mkdir(folder, { recursive: true });
    const filePath = path.join(folder, fileName);
    await fs.writeFile(filePath, body.exportContent);

    const now = new Date().toISOString();
    const taskId = nanoid(6);
    team.tasks.push({
      id: taskId,
      description: `Implementiere UI aus UI Designer (${body.source ?? "ai"})`,
      agentId,
      category: "general",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      overrides: {},
      runs: [],
      artifacts: [path.relative(workspaceDir(body.projectId), filePath).replace(/\\/g, "/")],
    });

    await writeTeam(body.projectId, team, project.settings.storageFormat);
    await writeTasksMarkdown(body.projectId, team);
    await updateProjectTimestamp(body.projectId);

    return NextResponse.json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
