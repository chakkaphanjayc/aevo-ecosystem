import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "bun";
import {
  accountRedirectOrigins,
  appOriginEnvironment,
  gatewayAllowedOrigins,
  resolveTunnelOrigins,
  tunnelOrigin,
  type TunnelOrigins
} from "./tunnel-config.ts";
import { killProcessTree, stopWorkspaceProcessesOnPorts } from "./process-tree.ts";

type AppName = "hub" | "admin" | "play" | "pos";

interface AppProfile {
  label: string;
  directory: string;
  apiUrl: string;
  webUrl: string;
  modernUrl?: string;
  requiresSupabase?: boolean;
  environment: Record<string, string>;
  processes: ProcessSpec[];
}

interface ProcessSpec {
  label: string;
  ownerLabel?: string;
  command?: string;
  args: string[];
  directory?: string;
  environmentFile?: string;
  environment?: Record<string, string>;
}

const ecosystemRoot = resolve(import.meta.dir, "..");

const profiles: Record<AppName, AppProfile> = {
  hub: {
    label: "Aevo Hub",
    directory: "aevo-hub",
    apiUrl: "http://localhost:4000",
    webUrl: "http://localhost:4330/modern",
    environment: {
      API_PORT: "4000",
      WEB_ORIGIN: "http://localhost:4330",
      AEVO_CORE_API_URL: "http://localhost:4000",
      AEVO_APP_CODE: "HUB",
      SESSION_COOKIE_NAME: "aevo_hub_session",
      AEVO_HUB_WEB_URL: "http://localhost:4330",
      AEVO_HUB_HOME_URL: "http://localhost:4330",
      AEVO_PLAY_URL: "http://localhost:4331/modern",
      AEVO_POS_URL: "http://localhost:4332",
      AEVO_CLOUDFLARE_INSPECTOR_PORT: "9229",
    },
    processes: [
      { label: "modern", args: ["--conditions=development", "run", "--cwd", "apps/hub", "dev"] }
    ]
  },
  admin: {
    label: "Aevo Admin",
    directory: "aevo-admin",
    apiUrl: "http://localhost:4001",
    webUrl: "http://localhost:4335",
    requiresSupabase: false,
    environment: {
      API_PORT: "4001",
      WEB_ORIGIN: "http://localhost:4335",
      PUBLIC_API_URL: "http://localhost:4001",
      AEVO_API_URL: "http://localhost:4001",
      AEVO_APP_CODE: "ADMIN",
      SESSION_COOKIE_NAME: "aevo_admin_session",
      CSRF_COOKIE_NAME: "aevo_admin_csrf",
      AEVO_ALLOWED_WEB_ORIGINS: "http://localhost:4335",
      AEVO_HUB_WEB_URL: "http://localhost:4330",
      AEVO_HUB_API_URL: "http://localhost:4000",
      AEVO_CLOUDFLARE_INSPECTOR_PORT: "9230"
    },
    processes: [
      { label: "admin", args: ["--conditions=development", "run", "dev"] }
    ]
  },
  play: {
    label: "Aevo Play",
    directory: "aevo-play",
    apiUrl: "http://localhost:3002",
    webUrl: "http://localhost:4331/modern",
    environment: {
      API_PORT: "3002",
      WEB_ORIGIN: "http://localhost:4331",
      PUBLIC_API_URL: "http://localhost:3002",
      SESSION_COOKIE_NAME: "aevo_play_session",
      CSRF_COOKIE_NAME: "aevo_play_csrf",
      MODERN_WEB_ORIGIN: "http://localhost:4331",
      AEVO_PLAY_API_URL: "http://localhost:3002",
      AEVO_HUB_WEB_URL: "http://localhost:4330",
      AEVO_CLOUDFLARE_INSPECTOR_PORT: "9231",
    },
    processes: [
      { label: "api", args: ["--conditions=development", "run", "--watch", "apps/api/src/index.ts"] },
      { label: "modern", args: ["--conditions=development", "run", "--cwd", "apps/modern", "dev"] }
    ]
  },
  pos: {
    label: "Aevo POS",
    directory: "aevo-pos",
    apiUrl: "http://localhost:3003",
    webUrl: "http://localhost:4332",
    environment: {
      API_PORT: "3003",
      WEB_ORIGIN: "http://localhost:4332",
      PUBLIC_API_URL: "http://localhost:3003",
      SESSION_COOKIE_NAME: "aevo_pos_session",
      CSRF_COOKIE_NAME: "aevo_pos_csrf",
      MODERN_WEB_ORIGIN: "http://localhost:4332",
      AEVO_HUB_WEB_URL: "http://localhost:4330",
      AEVO_CLOUDFLARE_INSPECTOR_PORT: "9232",
    },
    processes: [
      { label: "api", args: ["--conditions=development", "run", "--watch", "apps/api/src/index.ts"] },
      { label: "modern", args: ["--conditions=development", "run", "--cwd", "apps/pos-modern", "dev"] }
    ]
  }
};

function inheritedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}

function requestedApps(argumentsList: string[]): AppName[] {
  const requested = argumentsList.filter((value): value is AppName => value === "hub" || value === "admin" || value === "play" || value === "pos");
  if (argumentsList.includes("all")) return ["hub", "admin", "play", "pos"];
  if (requested.length === 0) return ["hub", "play", "pos"];
  return [...new Set(requested)];
}

function localDevelopmentPorts(appsToStart: AppName[]): number[] {
  const ports = [5099, 8787, 4000, 4001, 18788, 18789];
  if (appsToStart.includes("hub")) ports.push(4330, 9229);
  if (appsToStart.includes("admin")) ports.push(4335, 9230);
  if (appsToStart.includes("play")) ports.push(3002, 4331, 9231);
  if (appsToStart.includes("pos")) ports.push(3003, 4332, 9232);
  return ports;
}

function printUrls(apps: AppName[]): void {
  console.log("\nAevo local development surfaces");
  if (apps.length > 0) {
    console.log("  Aevo Core   api http://localhost:5099  (versioned Core API)");
    console.log("  Aevo Edge   api http://localhost:4000 (Hub) / http://localhost:4001 (Admin)");
  }
  for (const appName of apps) {
    const profile = profiles[appName];
    const configuredTunnel = tunnelOrigins[appName];
    console.log(`  ${profile.label.padEnd(12)} web ${profile.webUrl}  api ${profile.apiUrl}${configuredTunnel ? `  tunnel ${configuredTunnel}` : ""}`);
  }
  if (tunnelAutoStartRequested()) {
    console.log("\nCloudflare Quick Tunnel: ready for each Vite web surface.");
    console.log("Use the Tunnel URL printed by each web process on another device.");
  } else {
    console.log("\nTunnel support: set AEVO_DEV_TUNNEL=1 before starting, or press t + Enter in a Vite terminal.");
  }
  if (Object.keys(tunnelOrigins).length > 0) {
    console.log("Configured public origins are applied to local CORS and Accounts callback allowlists.");
  }
  console.log("\nStop all processes with Ctrl+C.\n");
}

function readEnvironmentFile(file: string): Record<string, string> {
  try {
    const contents = readFileSync(file, "utf8");
    const values: Record<string, string> = {};
    for (const line of contents.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      let value = match[2] ?? "";
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      values[match[1]] = value;
    }
    return values;
  } catch {
    return {};
  }
}

const inherited = inheritedEnvironment();
const apps = requestedApps(process.argv.slice(2));
const children: Array<ReturnType<typeof spawn>> = [];

function usableSecret(value: string | undefined): value is string {
  return Boolean(value?.trim() && !/replace-with|your-project-ref|your-.*secret/i.test(value));
}

const hubEnvironmentFile = readEnvironmentFile(resolve(ecosystemRoot, "aevo-hub/.env"));
const playEnvironmentFile = readEnvironmentFile(resolve(ecosystemRoot, "aevo-play/.env"));
const posEnvironmentFile = readEnvironmentFile(resolve(ecosystemRoot, "aevo-pos/.env"));
const goEnvironmentFile = readEnvironmentFile(resolve(ecosystemRoot, "aevo-go/.env"));
const adminEnvironmentFile = readEnvironmentFile(resolve(ecosystemRoot, "aevo-admin/.env"));
const configuredTunnelOrigins = resolveTunnelOrigins(
  hubEnvironmentFile,
  adminEnvironmentFile,
  playEnvironmentFile,
  posEnvironmentFile,
  goEnvironmentFile,
  inherited
);
let tunnelOrigins: TunnelOrigins = configuredTunnelOrigins;
if (tunnelAutoStartRequested()) {
  try {
    const quickTunnelOrigins = await startQuickTunnels(apps, configuredTunnelOrigins);
    tunnelOrigins = resolveTunnelOrigins(
      quickTunnelOrigins,
      hubEnvironmentFile,
      adminEnvironmentFile,
      playEnvironmentFile,
      posEnvironmentFile,
      goEnvironmentFile,
      inherited
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    await stopChildren();
    process.exitCode = 1;
    process.exit();
  }
}
const coreEnvironmentFile = readEnvironmentFile(resolve(ecosystemRoot, "aevo-core-api/.env"));
const developmentDatabaseUrl = process.env.AEVO_DATABASE_URL?.trim()
  || process.env.DATABASE_URL?.trim()
  || hubEnvironmentFile.DATABASE_URL?.trim();
const developmentSessionSecret = process.env.AEVO_SESSION_SECRET?.trim()
  || hubEnvironmentFile.AEVO_SESSION_SECRET?.trim()
  || hubEnvironmentFile.SESSION_COOKIE_SECRET?.trim()
  || "aevo-local-core-session-secret";
const developmentAccountsSecret = (usableSecret(process.env.AEVO_ACCOUNTS_SERVICE_SECRET) ? process.env.AEVO_ACCOUNTS_SERVICE_SECRET.trim() : undefined)
  || (usableSecret(hubEnvironmentFile.AEVO_ACCOUNTS_SERVICE_SECRET) ? hubEnvironmentFile.AEVO_ACCOUNTS_SERVICE_SECRET.trim() : undefined)
  || "aevo-local-accounts-service-secret";
const developmentCoreSecret = (usableSecret(process.env.AEVO_CORE_API_SERVICE_SECRET) ? process.env.AEVO_CORE_API_SERVICE_SECRET.trim() : undefined)
  || (usableSecret(coreEnvironmentFile.AEVO_CORE_API_SERVICE_SECRET) ? coreEnvironmentFile.AEVO_CORE_API_SERVICE_SECRET.trim() : undefined)
  || "aevo-local-core-service-secret";
const developmentHandshakeSecret = (usableSecret(process.env.AEVO_HANDSHAKE_SHARED_SECRET) ? process.env.AEVO_HANDSHAKE_SHARED_SECRET.trim() : undefined)
  || (usableSecret(coreEnvironmentFile.AEVO_HANDSHAKE_SHARED_SECRET) ? coreEnvironmentFile.AEVO_HANDSHAKE_SHARED_SECRET.trim() : undefined)
  || "aevo-local-handshake-secret";
const configuredFeedCursorSecret = process.env.AEVO_FEED_CURSOR_SECRET?.trim()
  || coreEnvironmentFile.AEVO_FEED_CURSOR_SECRET?.trim();
const developmentFeedCursorSecret = configuredFeedCursorSecret
  && configuredFeedCursorSecret.length >= 32
  && !/replace-with|your-project-ref|your-.*secret/i.test(configuredFeedCursorSecret)
  ? configuredFeedCursorSecret
  : "aevo-local-feed-cursor-secret-32-bytes-min";
const localCoreOrigin = process.env.AEVO_LOCAL_CORE_API_ORIGIN?.trim() || "http://127.0.0.1:5099";
const localAccountsOrigin = process.env.AEVO_LOCAL_ACCOUNTS_API_ORIGIN?.trim() || "http://127.0.0.1:8787";
const localAllowedRedirectOrigins = accountRedirectOrigins(tunnelOrigins);
const localAllowedOrigins = gatewayAllowedOrigins(tunnelOrigins);
const hubWebOrigin = tunnelOrigin(tunnelOrigins, "hub", "http://localhost:4330");
const localAccountsPort = new URL(localAccountsOrigin).port || "8787";
const localAccountsInspectorPort = String(Number(localAccountsPort) + 10000);
const localEdgeInspectorPort = String(Number(localAccountsPort) + 10001);
const localAdminEdgeInspectorPort = String(Number(localAccountsPort) + 10002);

function sharedProcessSpecs(appsToStart: AppName[]): ProcessSpec[] {
  // Every first-party runtime now authenticates and authorizes through Core /
  // Accounts. Starting only Play or POS must therefore still bring up the
  // shared boundary; otherwise those apps silently fall back to dead local
  // origins and appear to hang on navigation.
  const needsCoreBoundary = appsToStart.length > 0;
  if (!needsCoreBoundary) return [];

  const specs: ProcessSpec[] = [
    {
      label: "core-api",
      ownerLabel: "Aevo Platform",
      command: "dotnet",
      // Core has no static web assets. Disabling Hot Reload avoids dotnet-watch
      // probing the missing staticwebassets.development.json on macOS while
      // retaining file watching and automatic process restarts.
      args: ["watch", "--no-hot-reload", "--project", "src/Aevo.CoreApi/Aevo.CoreApi.csproj", "run", "--urls", localCoreOrigin],
      directory: "aevo-core-api",
      environmentFile: "aevo-core-api/.env",
      environment: {
        AEVO_ENVIRONMENT: "development",
        AEVO_BUILD_VERSION: "local",
        ASPNETCORE_ENVIRONMENT: "Development",
        DOTNET_ENVIRONMENT: "Development",
        ...(developmentDatabaseUrl ? { AEVO_DATABASE_URL: developmentDatabaseUrl } : {}),
        AEVO_IDENTITY_PLATFORM_PROJECT_ID: process.env.AEVO_IDENTITY_PLATFORM_PROJECT_ID?.trim() || "local-development",
        AEVO_SESSION_SECRET: developmentSessionSecret,
        AEVO_AUDIT_CURSOR_SECRET: process.env.AEVO_AUDIT_CURSOR_SECRET?.trim() || `${developmentSessionSecret}-audit-cursor`,
        AEVO_ACCOUNTS_API_ORIGIN: localAccountsOrigin,
        AEVO_ALLOWED_ORIGINS: localAllowedOrigins,
        AEVO_ACCOUNTS_SERVICE_SECRET: developmentAccountsSecret,
        AEVO_CORE_API_SERVICE_SECRET: developmentCoreSecret,
        AEVO_HANDSHAKE_SHARED_SECRET: developmentHandshakeSecret,
        AEVO_FEED_CURSOR_SECRET: developmentFeedCursorSecret,
        AEVO_PLAY_API_ORIGIN: "http://localhost:3002",
        AEVO_POS_API_ORIGIN: "http://localhost:3003",
        AEVO_REQUIRE_GATEWAY_SIGNATURE: "true",
        AEVO_ORIGIN_SIGNING_SECRET: "aevo-local-gateway-signing-secret",
        AEVO_TRUSTED_GATEWAYS: "aevo-edge-gateway,aevo-edge-gateway-admin"
      }
    }
  ];

  if (appsToStart.some((app) => ["hub", "admin", "play", "pos"].includes(app))) {
    specs.push({
      label: "accounts",
      ownerLabel: "Aevo Platform",
      command: resolve(ecosystemRoot, "aevo-accounts/node_modules/.bin/wrangler"),
      args: [
        "dev", "--local", "--port", localAccountsPort,
        "--inspector-port", localAccountsInspectorPort,
        "--var", "AEVO_ENVIRONMENT:development",
        "--var", `AEVO_CORE_API_ORIGIN:${localCoreOrigin}`,
        "--var", `AEVO_HUB_WEB_ORIGIN:${hubWebOrigin}`,
        "--var", `AEVO_ALLOWED_REDIRECT_ORIGINS:${localAllowedRedirectOrigins}`,
        "--var", `AEVO_ACCOUNTS_SESSION_SECRET:${process.env.AEVO_ACCOUNTS_SESSION_SECRET?.trim() || "aevo-local-accounts-session-secret"}`,
        "--var", `AEVO_ACCOUNTS_SERVICE_SECRET:${developmentAccountsSecret}`,
        "--var", `AEVO_IDENTITY_PLATFORM_PROJECT_ID:${process.env.AEVO_IDENTITY_PLATFORM_PROJECT_ID?.trim() || hubEnvironmentFile.AEVO_IDENTITY_PLATFORM_PROJECT_ID?.trim() || "local-development"}`,
        ...(hubEnvironmentFile.SUPABASE_URL ? ["--var", `SUPABASE_URL:${hubEnvironmentFile.SUPABASE_URL}`] : []),
        ...(hubEnvironmentFile.SUPABASE_ANON_KEY ? ["--var", `SUPABASE_ANON_KEY:${hubEnvironmentFile.SUPABASE_ANON_KEY}`] : []),
        ...(hubEnvironmentFile.SUPABASE_SECRET_KEY ? ["--var", `SUPABASE_SECRET_KEY:${hubEnvironmentFile.SUPABASE_SECRET_KEY}`] : [])
      ],
      directory: "aevo-accounts",
      environmentFile: "aevo-accounts/.env",
      environment: {
        AEVO_ENVIRONMENT: "development",
        AEVO_CORE_API_ORIGIN: localCoreOrigin,
        AEVO_HUB_WEB_ORIGIN: hubWebOrigin,
        AEVO_ALLOWED_REDIRECT_ORIGINS: localAllowedRedirectOrigins,
        AEVO_ACCOUNTS_SESSION_SECRET: process.env.AEVO_ACCOUNTS_SESSION_SECRET?.trim() || "aevo-local-accounts-session-secret",
        AEVO_ACCOUNTS_SERVICE_SECRET: developmentAccountsSecret,
        ...(hubEnvironmentFile.SUPABASE_URL ? { SUPABASE_URL: hubEnvironmentFile.SUPABASE_URL } : {}),
        ...(hubEnvironmentFile.SUPABASE_SECRET_KEY ? { SUPABASE_SECRET_KEY: hubEnvironmentFile.SUPABASE_SECRET_KEY } : {})
      }
    });
    specs.push({
      label: "edge",
      ownerLabel: "Aevo Platform",
      args: [
        "run", "dev", "--local", "--persist-to", ".wrangler/state-hub", "--port", "4000", "--inspector-port", localEdgeInspectorPort,
        "--var", `AEVO_CORE_API_ORIGIN:${localCoreOrigin}`,
        "--var", "AEVO_GATEWAY_SIGNING_SECRET:aevo-local-gateway-signing-secret",
        "--var", "AEVO_APP_CODE:HUB",
        "--var", "AEVO_ENVIRONMENT:development",
        "--var", `AEVO_ALLOWED_ORIGINS:${localAllowedOrigins}`
      ],
      directory: "aevo-edge-gateway",
      environmentFile: "aevo-edge-gateway/.env",
      environment: {
        AEVO_ENVIRONMENT: "development",
        AEVO_GATEWAY_NAME: "aevo-edge-gateway",
        AEVO_APP_CODE: "HUB",
        AEVO_CORE_API_ORIGIN: localCoreOrigin,
        AEVO_GATEWAY_SIGNING_SECRET: "aevo-local-gateway-signing-secret",
        AEVO_ALLOWED_ORIGINS: localAllowedOrigins
      }
    });
  }

  if (appsToStart.includes("admin")) {
    specs.push({
      label: "edge-admin",
      ownerLabel: "Aevo Platform",
      args: [
        "run", "dev", "--local", "--persist-to", ".wrangler/state-admin", "--port", "4001", "--inspector-port", localAdminEdgeInspectorPort,
        "--var", `AEVO_CORE_API_ORIGIN:${localCoreOrigin}`,
        "--var", "AEVO_GATEWAY_SIGNING_SECRET:aevo-local-gateway-signing-secret",
        "--var", "AEVO_APP_CODE:ADMIN",
        "--var", "AEVO_ENVIRONMENT:development",
        "--var", `AEVO_ALLOWED_ORIGINS:${localAllowedOrigins}`
      ],
      directory: "aevo-edge-gateway",
      environmentFile: "aevo-edge-gateway/.env",
      environment: {
        AEVO_ENVIRONMENT: "development",
        AEVO_GATEWAY_NAME: "aevo-edge-gateway-admin",
        AEVO_APP_CODE: "ADMIN",
        AEVO_CORE_API_ORIGIN: localCoreOrigin,
        AEVO_GATEWAY_SIGNING_SECRET: "aevo-local-gateway-signing-secret",
        AEVO_ALLOWED_ORIGINS: localAllowedOrigins
      }
    });
  }

  return specs;
}

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim() && !/your-project-ref|your-supabase-secret-key|change-me/i.test(value));
}

function enabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function tunnelAutoStartRequested(): boolean {
  return enabled(inherited.AEVO_DEV_TUNNEL) || enabled(inherited.AEVO_DEV_TUNNEL_AUTOSTART);
}

function localWebPort(appName: AppName): number {
  const parsed = new URL(profiles[appName].webUrl);
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`[${profiles[appName].label}] invalid local web port`);
  return port;
}

function wranglerCommand(): string {
  const configured = inherited.AEVO_WRANGLER_BIN?.trim();
  if (configured && (!configured.includes("/") || existsSync(configured))) return configured;

  const localCandidates = [
    resolve(ecosystemRoot, "aevo-edge-gateway/node_modules/.bin/wrangler"),
    resolve(ecosystemRoot, "aevo-go/node_modules/.bin/wrangler")
  ];
  return localCandidates.find((candidate) => existsSync(candidate)) ?? "wrangler";
}

async function consumeTunnelOutput(
  stream: ReadableStream<Uint8Array>,
  onLine: (line: string) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffered += decoder.decode(chunk.value, { stream: true });
      const lines = buffered.split(/\r?\n/u);
      buffered = lines.pop() ?? "";
      for (const line of lines) onLine(line);
    }
    buffered += decoder.decode();
    if (buffered) onLine(buffered);
  } finally {
    reader.releaseLock();
  }
}

function startQuickTunnel(appName: AppName, port: number, command: string): Promise<string> {
  const child = spawn([command, "tunnel", "quick-start", `http://127.0.0.1:${port}`, "--log-level", "info"], {
    cwd: ecosystemRoot,
    env: { ...inherited, NO_COLOR: "1" },
    stdout: "pipe",
    stderr: "pipe"
  });
  children.push(child);

  return new Promise<string>((resolveTunnel, rejectTunnel) => {
    const quickTunnelPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/iu;
    let settled = false;
    let recentOutput = "";
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      killProcessTree(child.pid);
      rejectTunnel(new Error(`[${profiles[appName].label}] Cloudflare Quick Tunnel did not start within 45 seconds. Install Wrangler or set AEVO_WRANGLER_BIN.`));
    }, 45_000);

    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const handleLine = (line: string): void => {
      if (!line.trim()) return;
      recentOutput = `${recentOutput}\n${line}`.slice(-1_500);
      console.log(`[Cloudflare ${appName}] ${line}`);
      const match = line.match(quickTunnelPattern);
      if (match?.[0]) finish(() => resolveTunnel(match[0]));
    };

    const stdout = child.stdout;
    const stderr = child.stderr;
    if (stdout && typeof stdout !== "number") void consumeTunnelOutput(stdout, handleLine);
    if (stderr && typeof stderr !== "number") void consumeTunnelOutput(stderr, handleLine);
    void child.exited.then((code) => {
      if (settled) return;
      finish(() => rejectTunnel(new Error(`[${profiles[appName].label}] Cloudflare Quick Tunnel exited with code ${code}.${recentOutput}`)));
    });
  });
}

async function startQuickTunnels(appsToStart: AppName[], configuredOrigins: TunnelOrigins): Promise<Record<string, string>> {
  const tunnelApps = appsToStart.filter((appName) => !configuredOrigins[appName]);
  if (tunnelApps.length === 0) return {};
  const command = wranglerCommand();
  const entries = await Promise.all(tunnelApps.map(async (appName) => [
    appName,
    await startQuickTunnel(appName, localWebPort(appName), command)
  ] as const));
  return Object.fromEntries(entries);
}

function localEnvironment(appName: AppName, inherited: Record<string, string>): { values: Record<string, string>; fallbackSource?: string } {
  const profile = profiles[appName];
  const appEnvFile = resolve(ecosystemRoot, profile.directory, ".env");
  const appEnv = readEnvironmentFile(appEnvFile);
  let sharedEnv: Record<string, string> = {};
  let fallbackSource: string | undefined;
  const testMode = (appName === "play" || appName === "pos") && (enabled(inherited.AEVO_TEST_MODE) || enabled(appEnv.AEVO_TEST_MODE));
  const hasSupabase = configured(inherited.SUPABASE_URL) && (configured(inherited.SUPABASE_SECRET_KEY) || configured(inherited.SUPABASE_SERVICE_ROLE_KEY));
  const appHasSupabase = configured(appEnv.SUPABASE_URL) && (configured(appEnv.SUPABASE_SECRET_KEY) || configured(appEnv.SUPABASE_SERVICE_ROLE_KEY));

  if (appName === "play" && !testMode && !hasSupabase && !appHasSupabase && process.env.AEVO_DISABLE_SHARED_ENV !== "1") {
    const configuredSource = process.env.AEVO_SHARED_ENV_FILE?.trim();
    const candidates = configuredSource
      ? [resolve(ecosystemRoot, configuredSource)]
      : [resolve(ecosystemRoot, "aevo-hub/.env"), resolve(ecosystemRoot, "aevo-pos/.env")];
    for (const candidate of candidates) {
      const candidateEnv = readEnvironmentFile(candidate);
      if (configured(candidateEnv.SUPABASE_URL) && (configured(candidateEnv.SUPABASE_SECRET_KEY) || configured(candidateEnv.SUPABASE_SERVICE_ROLE_KEY))) {
        sharedEnv = candidateEnv;
        fallbackSource = candidate;
        break;
      }
    }
  }

  const testEnvironment: Record<string, string> = testMode
    ? { AEVO_TEST_MODE: "1", VITE_AEVO_TEST_MODE: "1" }
    : {};

  return {
    values: {
      ...appEnv,
      ...sharedEnv,
      ...inherited,
      ...testEnvironment,
      ...profile.environment,
      ...appOriginEnvironment(appName, tunnelOrigins),
      ...(appName === "play" || appName === "pos"
        ? {
            AEVO_CORE_API_ORIGIN: localCoreOrigin,
            AEVO_CORE_API_SERVICE_SECRET: developmentCoreSecret,
            AEVO_HANDSHAKE_SHARED_SECRET: developmentHandshakeSecret,
            AEVO_ACCOUNTS_API_URL: localAccountsOrigin,
            AEVO_ACCOUNTS_SERVICE_SECRET: developmentAccountsSecret,
            AEVO_ACCOUNTS_EXCHANGE_SECRET: developmentAccountsSecret
          }
        : {})
    },
    ...(fallbackSource ? { fallbackSource } : {})
  };
}

function validateEnvironment(appsToStart: AppName[], inherited: Record<string, string>): Map<AppName, { values: Record<string, string>; fallbackSource?: string }> {
  const environments = new Map<AppName, { values: Record<string, string>; fallbackSource?: string }>();
  for (const appName of appsToStart) {
    const profile = profiles[appName];
    const runtime = localEnvironment(appName, inherited);
    const missing = enabled(runtime.values.AEVO_TEST_MODE) || profile.requiresSupabase === false
      ? []
      : ["SUPABASE_URL"]
        .filter((key) => !configured(runtime.values[key]))
        .concat(configured(runtime.values.SUPABASE_SECRET_KEY) || configured(runtime.values.SUPABASE_SERVICE_ROLE_KEY) ? [] : ["SUPABASE_SECRET_KEY"]);
    if (missing.length > 0) {
      throw new Error(
        `[${profile.label}] missing ${missing.join(", ")}. Update ${profile.directory}/.env from .env.example, or set AEVO_SHARED_ENV_FILE to a valid local Supabase env file.`
      );
    }
    environments.set(appName, runtime);
  }
  return environments;
}

let runtimeEnvironments: Map<AppName, { values: Record<string, string>; fallbackSource?: string }>;
try {
  runtimeEnvironments = validateEnvironment(apps, inherited);
  await stopWorkspaceProcessesOnPorts(localDevelopmentPorts(apps), ecosystemRoot);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  await stopChildren();
  process.exitCode = 1;
  process.exit();
}
type LaunchSpec = {
  processSpec: ProcessSpec;
  profile: AppProfile;
  appName?: AppName;
};

const sharedLaunches: LaunchSpec[] = sharedProcessSpecs(apps).map((processSpec) => ({
  processSpec,
  profile: profiles.hub,
  appName: undefined
}));

function startProcess({ processSpec, profile, appName }: LaunchSpec): void {
  const directory = resolve(ecosystemRoot, processSpec.directory ?? profile.directory);
  const processEnvFile = processSpec.environmentFile
    ? readEnvironmentFile(resolve(ecosystemRoot, processSpec.environmentFile))
    : {};
  const runtime = appName ? runtimeEnvironments.get(appName) : undefined;
  const environment = {
    ...inherited,
    ...(runtime?.values ?? {}),
    ...processEnvFile,
    ...(tunnelAutoStartRequested()
      ? { AEVO_DEV_TUNNEL: "0", AEVO_DEV_TUNNEL_AUTOSTART: "0" }
      : {}),
    ...(appName ? appOriginEnvironment(appName, tunnelOrigins) : {}),
    ...(processSpec.environment ?? {})
  };
  if (runtime?.fallbackSource && appName) {
    console.warn(`[${profile.label}] using Supabase credentials from ${runtime.fallbackSource} for this process only; no env file was changed.`);
  }
  const command = processSpec.command ?? "bun";
  const child = spawn([command, ...processSpec.args], {
    cwd: directory,
    env: environment,
    stdout: "inherit",
    stderr: "inherit"
  });
  children.push(child);
  console.log(`[${processSpec.ownerLabel ?? profile.label}] started ${processSpec.label}`);
}

async function waitForLocalService(url: string, label: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastFailure = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (response.status < 500) {
        console.log(`[Aevo Platform] ready ${label}`);
        return;
      }
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await Bun.sleep(150);
  }
  throw new Error(`[Aevo Platform] ${label} did not become ready at ${url} (${lastFailure})`);
}

async function stopChildren(): Promise<void> {
  for (const child of children) killProcessTree(child.pid);
  const exited = Promise.all(children.map((child) => child.exited));
  const graceful = await Promise.race([
    exited.then(() => true),
    Bun.sleep(5_000).then(() => false)
  ]);
  if (!graceful) {
    for (const child of children) killProcessTree(child.pid, "SIGKILL");
    await exited;
  }
}

async function startInDependencyOrder(): Promise<void> {
  const coreLaunches = sharedLaunches.filter(({ processSpec }) => processSpec.label === "core-api" || processSpec.label === "accounts");
  const gatewayLaunches = sharedLaunches.filter(({ processSpec }) => processSpec.label === "edge" || processSpec.label === "edge-admin");

  for (const launch of coreLaunches) startProcess(launch);
  await Promise.all([
    waitForLocalService(`${localCoreOrigin}/ready`, "Core API"),
    waitForLocalService(`${localAccountsOrigin}/ready`, "Accounts")
  ]);

  for (const launch of gatewayLaunches) startProcess(launch);
  await Promise.all([
    gatewayLaunches.some(({ processSpec }) => processSpec.label === "edge")
      ? waitForLocalService("http://127.0.0.1:4000/health", "Hub Edge")
      : Promise.resolve(),
    gatewayLaunches.some(({ processSpec }) => processSpec.label === "edge-admin")
      ? waitForLocalService("http://127.0.0.1:4001/health", "Admin Edge")
      : Promise.resolve()
  ]);

  for (const appName of apps) {
    const appLaunches = profiles[appName].processes.map((processSpec) => ({
      processSpec,
      profile: profiles[appName],
      appName
    }));
    const apiLaunches = appLaunches.filter(({ processSpec }) => processSpec.label === "api");
    const webLaunches = appLaunches.filter(({ processSpec }) => processSpec.label !== "api");
    for (const launch of apiLaunches) startProcess(launch);
    if (appName === "play" && apiLaunches.length > 0) {
      await waitForLocalService("http://127.0.0.1:3002/ready", "Aevo Play API");
    }
    if (appName === "pos" && apiLaunches.length > 0) {
      await waitForLocalService("http://127.0.0.1:3003/ready", "Aevo POS API");
    }
    for (const launch of webLaunches) {
      startProcess(launch);
      await waitForLocalService(profiles[appName].webUrl, `${profiles[appName].label} web`);
    }
  }
}

try {
  await startInDependencyOrder();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  await stopChildren();
  process.exitCode = 1;
  process.exit();
}

printUrls(apps);

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\nReceived ${signal}; stopping Aevo local services...`);
  void stopChildren();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

const firstExit = await Promise.race(children.map(async (child, index) => ({ index, code: await child.exited })));
if (!shuttingDown) {
  console.error(`A local service exited unexpectedly with code ${firstExit.code}.`);
  shutdown(`service ${firstExit.index + 1} exit`);
  process.exitCode = firstExit.code === 0 ? 1 : firstExit.code;
}
await Promise.all(children.map((child) => child.exited));
