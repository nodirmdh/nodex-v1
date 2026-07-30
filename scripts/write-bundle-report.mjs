import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const app = process.argv[2];
const appDir = process.argv[3];
const outDir = process.argv[4];

if (!app || !appDir || !outDir) {
  console.error("usage: node scripts/write-bundle-report.mjs <name> <app-dir> <out-dir>");
  process.exit(1);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

const staticDir = join(appDir, ".next", "static");
const files = walk(staticDir)
  .filter((file) => file.endsWith(".js") || file.endsWith(".css"))
  .map((file) => ({ file: relative(appDir, file), bytes: statSync(file).size }))
  .sort((a, b) => b.bytes - a.bytes);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "summary.json"), JSON.stringify({ app, files }, null, 2));

const totalJs = files
  .filter((item) => item.file.endsWith(".js"))
  .reduce((sum, item) => sum + item.bytes, 0);
const lines = [
  `# Bundle Report: ${app}`,
  "",
  `Total static JS bytes: ${totalJs}`,
  "",
  "| File | Bytes |",
  "| ---- | ----- |",
  ...files.slice(0, 20).map((item) => `| ${item.file} | ${item.bytes} |`),
  "",
];

writeFileSync(join(outDir, "summary.md"), lines.join("\n"));
console.log(`bundle report written to ${outDir}`);
