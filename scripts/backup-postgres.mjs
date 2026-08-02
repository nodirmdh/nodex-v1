import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const output = process.env.BACKUP_FILE;

if (!databaseUrl || !output) {
  console.error("DATABASE_URL and BACKUP_FILE are required.");
  process.exit(1);
}

const target = resolve(output);
await mkdir(dirname(target), { recursive: true });

const pgDump = spawn("pg_dump", [databaseUrl, "--format=custom", "--file", target], {
  stdio: "inherit",
});

pgDump.on("exit", (code) => {
  process.exit(code ?? 1);
});
