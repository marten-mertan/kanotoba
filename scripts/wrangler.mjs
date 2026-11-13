import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { loadProjectEnv } from "./load-env.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(root, "backend/wrangler.template.json");
const generatedPath = resolve(root, "backend/.wrangler.generated.json");
const env = await loadProjectEnv();
const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error("Usage: node scripts/wrangler.mjs <wrangler-command> [arguments...]");
  process.exit(2);
}

const databaseId = env.KANOTOBA_D1_DATABASE_ID;
if (!databaseId && command !== "d1-create") {
  console.error("Missing KANOTOBA_D1_DATABASE_ID. Set it in the root .env file; see .env.example.");
  process.exit(2);
}

const configValues = {
  __KANOTOBA_WORKER_NAME__: env.KANOTOBA_WORKER_NAME || "kanotoba-api",
  __KANOTOBA_D1_DATABASE_NAME__: env.KANOTOBA_D1_DATABASE_NAME || "kanotoba-db",
  __KANOTOBA_D1_DATABASE_ID__: databaseId || "00000000-0000-0000-0000-000000000000",
};

let configText = await readFile(templatePath, "utf8");
for (const [placeholder, value] of Object.entries(configValues)) {
  configText = configText.replaceAll(placeholder, JSON.stringify(value).slice(1, -1));
}
await writeFile(generatedPath, configText, "utf8");

const configuredDatabaseName = env.KANOTOBA_D1_DATABASE_NAME || "kanotoba-db";
const normalizedArgs = args.map((argument) => argument === "kanotoba-db" ? configuredDatabaseName : argument);
const wranglerArgs = [command, ...normalizedArgs, "--config", generatedPath];

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(executable, ["wrangler", ...wranglerArgs], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal) reject(new Error(`Wrangler exited due to signal ${signal}`));
    else resolveExit(code ?? 1);
  });
});

// Keep the generated config available for follow-up Wrangler commands in this session.
// It contains only a D1 resource ID, not an API token or secret.
if (exitCode !== 0) {
  console.error(`Wrangler command failed with exit code ${exitCode}.`);
}
process.exit(exitCode);
