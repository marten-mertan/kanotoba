import { spawn } from "node:child_process";
import { loadProjectEnv } from "./load-env.mjs";

const env = await loadProjectEnv();
const name = env.KANOTOBA_D1_DATABASE_NAME || "kanotoba-db";
const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(executable, ["wrangler", "d1", "create", name], {
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

const code = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (value, signal) => signal ? reject(new Error(`Wrangler exited due to ${signal}`)) : resolve(value ?? 1));
});
process.exit(code);
