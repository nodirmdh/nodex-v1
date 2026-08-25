import { spawn } from "node:child_process";

const pnpmExecPath = process.env.npm_execpath;

if (!pnpmExecPath) {
  console.error("pnpm executable path is not available. Run this wrapper through pnpm scripts.");
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [pnpmExecPath, "exec", "playwright", "test", ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env: { ...process.env },
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  },
);

child.once("error", (error) => {
  console.error(`Failed to start Playwright via pnpm exec: ${error.message}`);
  process.exit(1);
});

child.once("exit", (code, signal) => {
  if (signal) {
    console.error(`Playwright exited by signal ${signal}`);
  }
  process.exit(code ?? 1);
});
