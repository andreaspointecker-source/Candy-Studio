import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { workspaceDir } from "./storage";

export type PreviewEntry = {
  relativePath: string;
};

export async function findPreviewEntry(projectId: string): Promise<PreviewEntry | null> {
  if (!projectId) {
    return null;
  }
  const base = workspaceDir(projectId);
  const direct = path.join(base, "index.html");
  if (fsSync.existsSync(direct)) {
    return { relativePath: "index.html" };
  }

  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(base, entry.name, "index.html");
    if (fsSync.existsSync(candidate)) {
      return { relativePath: path.posix.join(entry.name, "index.html") };
    }
  }

  return null;
}
