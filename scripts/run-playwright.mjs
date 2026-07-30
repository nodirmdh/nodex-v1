import { execFile, execFileSync, spawn } from "node:child_process";

const servers = [
  {
    name: "client",
    command: "pnpm",
    args: ["--filter", "@nodex/client-mini-app", "dev:e2e"],
    url: "http://127.0.0.1:3100",
  },
  {
    name: "driver",
    command: "pnpm",
    args: ["--filter", "@nodex/driver-mini-app", "dev:e2e"],
    url: "http://127.0.0.1:3101",
  },
  {
    name: "admin",
    command: "pnpm",
    args: ["--filter", "@nodex/admin-web", "dev:e2e"],
    url: "http://127.0.0.1:3102",
  },
  {
    name: "api",
    command: "pnpm",
    args: ["--filter", "@nodex/api", "exec", "tsx", "src/main.ts"],
    env: {
      API_PORT: "3103",
      AUTH_ACCESS_TOKEN_SECRET: "replace-with-access-token-secret",
      AUTH_MOCK_ENABLED: "true",
      DATABASE_URL: "postgresql://nodex:nodex@localhost:15432/nodex?schema=public",
      JWT_SECRET: "replace-with-local-secret",
      REDIS_URL: "redis://localhost:6379",
    },
    url: "http://127.0.0.1:3103/api/v1/health",
  },
];
const ports = [3100, 3101, 3102, 3103, 3104];

function executable(command) {
  return process.platform === "win32" && command === "pnpm" ? "pnpm.cmd" : command;
}

function start(server) {
  const command = [executable(server.command), ...server.args].join(" ");
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : executable(server.command),
    process.platform === "win32" ? ["/d", "/s", "/c", command] : server.args,
    {
      cwd: process.cwd(),
      env: { ...process.env, ...(server.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.on("data", (chunk) => process.stdout.write(`[${server.name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${server.name}] ${chunk}`));
  return child;
}

function execFilePromise(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, () => resolve());
  });
}

async function cleanupPorts() {
  if (process.platform !== "win32") return;
  const output = execFileSync("netstat.exe", ["-ano"], { encoding: "utf8" });
  const processIds = new Set();
  for (const line of output.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || !["TCP", "UDP"].includes(columns[0])) continue;
    const localAddress = columns[1] ?? "";
    const pid = columns.at(-1);
    const port = Number(localAddress.match(/:(\d+)$/)?.[1]);
    if (ports.includes(port) && pid && pid !== "0") processIds.add(pid);
  }
  await Promise.all(
    [...processIds].map((pid) => execFilePromise("taskkill.exe", ["/pid", pid, "/T", "/F"])),
  );
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

async function waitFor(url, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForServer(server, child) {
  const exit = new Promise((_, reject) => {
    child.once("exit", (code) => reject(new Error(`${server.name} exited before ready (${code})`)));
  });
  await Promise.race([waitFor(server.url), exit]);
}

function stop(child) {
  if (child.killed || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

await cleanupPorts();

const children = servers.map(start);

try {
  await Promise.all(servers.map((server, index) => waitForServer(server, children[index])));
  const args = ["test", ...process.argv.slice(2)];
  const playwrightCommand =
    process.platform === "win32"
      ? [".\\node_modules\\.bin\\playwright.cmd", ...args].join(" ")
      : "./node_modules/.bin/playwright";
  const playwright = spawn(playwrightCommand, process.platform === "win32" ? [] : args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const code = await new Promise((resolve) => playwright.on("exit", resolve));
  process.exitCode = code ?? 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const child of children) stop(child);
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  await cleanupPorts();
  process.exit(process.exitCode ?? 0);
}
