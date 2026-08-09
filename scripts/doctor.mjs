import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";

const requiredNode = "24.13.1";
const requiredPnpmMajor = "11.";
const requiredPorts = [3000, 3001, 3002, 3003, 15432, 6387, 9100, 9101, 11025, 18025];

function fail(message) {
  console.error(`doctor: ${message}`);
  process.exitCode = 1;
}

function checkVersion(label, actual, expected) {
  if (!actual.includes(expected)) {
    fail(`${label} expected ${expected}, got ${actual.trim()}`);
  }
}

function command(commandName, args = []) {
  const executable =
    process.platform === "win32" && commandName === "pnpm" ? "cmd.exe" : commandName;
  const executableArgs =
    process.platform === "win32" && commandName === "pnpm"
      ? ["/d", "/s", "/c", ["pnpm", ...args].join(" ")]
      : args;
  const result = spawnSync(executable, executableArgs, {
    encoding: "utf8",
    shell: false,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

const nodeVersion = process.version.replace(/^v/, "");
checkVersion("Node", nodeVersion, requiredNode);

const pnpm = command("pnpm", ["--version"]);
if (!pnpm.ok) {
  fail("pnpm is not available");
} else if (!pnpm.output.startsWith(requiredPnpmMajor)) {
  fail(`pnpm expected ${requiredPnpmMajor}x, got ${pnpm.output}`);
}

for (const file of [".env", ".env.local", ".env.example"]) {
  if (existsSync(file)) {
    break;
  }
  if (file === ".env.example") {
    fail("missing .env, .env.local, or .env.example");
  }
}

if (!existsSync("pnpm-lock.yaml")) {
  fail("missing pnpm-lock.yaml");
}

const lock = readFileSync("pnpm-lock.yaml", "utf8");
if (!lock.includes("lockfileVersion:")) {
  fail("pnpm-lock.yaml does not look valid");
}

if (!existsSync("packages/database/node_modules/@prisma/client/default.d.ts")) {
  fail("Prisma Client is not generated for @nodex/database");
}

const docker = command("docker", ["compose", "config"]);
if (!docker.ok) {
  fail("docker compose config is not available");
}

const occupied = [];
for (const port of requiredPorts) {
  if (!(await isPortFree(port))) {
    occupied.push(port);
  }
}

if (occupied.length > 0) {
  console.log(
    `doctor: occupied ports detected: ${occupied.join(", ")}. This is OK when local services are already running.`,
  );
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`doctor: ok (Node ${nodeVersion}, pnpm ${pnpm.output})`);
