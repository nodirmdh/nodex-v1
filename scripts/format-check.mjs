import { spawnSync } from "node:child_process";

const bin = process.platform === "win32" ? "prettier.cmd" : "prettier";
const result = spawnSync(bin, ["--check", "."], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
