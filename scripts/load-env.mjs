import { readFile } from "node:fs/promises";

/** Load simple KEY=value entries from the repository-root .env file.
 * Existing process environment variables always take precedence.
 */
export async function loadProjectEnv() {
  let content;
  try {
    content = await readFile(new URL("../.env", import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return process.env;
    throw error;
  }

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, "").trim();
    }

    process.env[key] = value;
  }

  return process.env;
}
