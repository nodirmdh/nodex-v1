import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
const backupFile = process.env.BACKUP_FILE;
const confirm = process.env.RESTORE_CONFIRMATION;

if (!databaseUrl || !backupFile) {
  console.error("DATABASE_URL and BACKUP_FILE are required.");
  process.exit(1);
}

if (confirm !== "RESTORE_NODEX_DATABASE") {
  console.error("Set RESTORE_CONFIRMATION=RESTORE_NODEX_DATABASE to restore.");
  process.exit(1);
}

const source = resolve(backupFile);
if (!existsSync(source)) {
  console.error(`Backup file not found: ${source}`);
  process.exit(1);
}

const pgRestore = spawn(
  "pg_restore",
  ["--clean", "--if-exists", "--no-owner", "--dbname", databaseUrl, source],
  {
    stdio: "inherit",
  },
);

pgRestore.on("exit", (code) => {
  process.exit(code ?? 1);
});
