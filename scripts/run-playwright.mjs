import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const cli = join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");

if (!existsSync(cli)) {
  console.error(`Playwright CLI not found at ${cli}`);
  process.exit(1);
}

const child = spawn(process.execPath, [cli, "test", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  shell: false,
  stdio: "inherit",
  windowsHide: true,
});

child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Playwright exited by signal ${signal}`);
  }
  process.exit(code ?? 1);
});
