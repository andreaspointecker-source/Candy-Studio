import fs from "fs/promises";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "server.log");

export async function appendLog(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  await fs.mkdir(LOG_DIR, { recursive: true });
  await fs.appendFile(LOG_FILE, line);
}

export async function readLogs(limit = 300) {
  try {
    const raw = await fs.readFile(LOG_FILE, "utf8");
    const lines = raw.trim().split("\n");
    return lines.slice(-limit).join("\n");
  } catch {
    return "";
  }
}
