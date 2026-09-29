export type TunnelApp = "hub" | "admin" | "play" | "pos" | "go";

export interface TunnelOrigins {
  hub?: string;
  admin?: string;
  play?: string;
  pos?: string;
  go?: string;
}

const tunnelKeys: Record<TunnelApp, string> = {
  hub: "AEVO_HUB_TUNNEL_URL",
  admin: "AEVO_ADMIN_TUNNEL_URL",
  play: "AEVO_PLAY_TUNNEL_URL",
  pos: "AEVO_POS_TUNNEL_URL",
  go: "AEVO_GO_TUNNEL_URL"
};

function normalizedOrigin(value: string | undefined, key: string): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid protocol");
    if (url.username || url.password || url.search || url.hash) throw new Error("origin must not contain credentials or query parameters");
    return url.origin;
  } catch {
    throw new Error(`${key} must be a valid HTTP(S) origin without credentials, query parameters, or fragments`);
  }
}

export function resolveTunnelOrigins(...sources: Array<Record<string, string | undefined>>): TunnelOrigins {
  const merged = Object.assign({}, ...sources);
  const origins: TunnelOrigins = {};
  for (const app of Object.keys(tunnelKeys) as TunnelApp[]) {
    const key = tunnelKeys[app];
    const origin = normalizedOrigin(merged[key], key);
    if (origin) origins[app] = origin;
  }
  return origins;
}

export function tunnelOrigin(origins: TunnelOrigins, app: TunnelApp, fallback: string): string {
  return origins[app] ?? fallback;
}

export function firstPartyWebOrigins(origins: TunnelOrigins): string[] {
  return [...new Set([
    "http://localhost:4324",
    "http://127.0.0.1:4324",
    "http://localhost:4330",
    "http://127.0.0.1:4330",
    "http://localhost:4331",
    "http://127.0.0.1:4331",
    "http://localhost:4332",
    "http://127.0.0.1:4332",
    "http://localhost:4335",
    "http://127.0.0.1:4335",
    ...Object.values(origins).filter((value): value is string => Boolean(value))
  ])];
}

export function gatewayAllowedOrigins(origins: TunnelOrigins): string {
  return firstPartyWebOrigins(origins).join(",");
}

export function accountRedirectOrigins(origins: TunnelOrigins): string {
  const callbacks = [
    "http://localhost:4324/auth/callback",
    "http://localhost:4331/auth/callback",
    "http://localhost:4332/auth/callback",
    "http://localhost:4335/auth/callback"
  ];
  const tunnelCallbacks = [origins.go, origins.play, origins.pos, origins.admin]
    .filter((origin): origin is string => Boolean(origin))
    .map((origin) => `${origin}/auth/callback`);
  return [...new Set([...callbacks, ...tunnelCallbacks])].join(",");
}

export function tunnelEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

export function appOriginEnvironment(app: TunnelApp, origins: TunnelOrigins): Record<string, string> {
  const hub = origins.hub;
  const admin = origins.admin;
  const play = origins.play;
  const pos = origins.pos;
  const go = origins.go;

  if (app === "hub") {
    return {
      ...(hub ? {
        WEB_ORIGIN: hub,
        AEVO_HUB_WEB_URL: hub,
        AEVO_HUB_HOME_URL: hub,
        AEVO_ALLOWED_WEB_ORIGINS: firstPartyWebOrigins(origins).join(","),
        AEVO_HUB_OAUTH_CALLBACK_URL: `${hub}/api/auth/oauth/callback`,
        AEVO_PASSWORD_RECOVERY_CALLBACK_URL: `${hub}/api/auth/password/recovery/callback`
      } : {}),
      ...(admin ? { AEVO_ADMIN_URL: admin } : {}),
      ...(play ? { AEVO_PLAY_URL: `${play}/modern` } : {}),
      ...(pos ? { AEVO_POS_URL: pos } : {}),
      ...(go ? { AEVO_GO_URL: go } : {})
    };
  }
  if (app === "admin") {
    return {
      ...(admin ? { WEB_ORIGIN: admin, AEVO_ALLOWED_WEB_ORIGINS: admin } : {}),
      ...(hub ? { AEVO_HUB_WEB_URL: hub } : {})
    };
  }
  if (app === "play") {
    return {
      ...(play ? { WEB_ORIGIN: play, MODERN_WEB_ORIGIN: play } : {}),
      ...(hub ? { AEVO_HUB_WEB_URL: hub } : {})
    };
  }
  if (app === "pos") {
    return {
      ...(pos ? { WEB_ORIGIN: pos, MODERN_WEB_ORIGIN: pos } : {}),
      ...(hub ? { AEVO_HUB_WEB_URL: hub } : {})
    };
  }
  return {};
}
