import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function detectTestCommand(root: string) {
  const packagePath = path.join(root, "package.json");
  try {
    const raw = await fs.readFile(packagePath, "utf8");
    const pkg = JSON.parse(raw) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    if (pkg.scripts?.test) {
      return "npm test";
    }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) return "npx vitest run";
    if (deps.jest) return "npx jest";
    if (deps.mocha) return "npx mocha";
  } catch {
    // ignore
  }

  const pyproject = path.join(root, "pyproject.toml");
  const requirements = path.join(root, "requirements.txt");
  try {
    const raw = await fs.readFile(pyproject, "utf8");
    if (raw.includes("pytest")) return "pytest";
  } catch {
    // ignore
  }
  try {
    const raw = await fs.readFile(requirements, "utf8");
    if (raw.includes("pytest")) return "pytest";
  } catch {
    // ignore
  }

  return null;
}

export async function runTestCommand(command: string, cwd: string) {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd, env: process.env, shell: true });
    return { success: true, output: `${stdout}\n${stderr}`.trim() };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const output = [err.stdout, err.stderr, err.message].filter(Boolean).join("\n");
    return { success: false, output };
  }
}
