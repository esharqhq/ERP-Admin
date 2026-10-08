/**
 * The Content-Security-Policy `proxy.ts` sends with every page.
 *
 * Why the panel needs one: the access and refresh tokens live in localStorage
 * (`auth-storage`), so one injected script is a full super-admin takeover. The
 * policy is the second wall behind React's escaping.
 *
 * Scripts run only with the per-request nonce. `'strict-dynamic'` passes that
 * trust to the scripts they load, which covers Next's chunks and the OneSignal
 * SDK that `react-onesignal` injects from cdn.onesignal.com. Next reads the
 * nonce from the request's CSP header and stamps it on its own tags
 * (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 *
 * Choices that look loose but are deliberate:
 * - `style-src 'unsafe-inline'` with **no** nonce. Leaflet, recharts, base-ui
 *   and React `style={}` all write style attributes, and a browser ignores
 *   `'unsafe-inline'` as soon as a nonce sits beside it.
 * - `img-src https:`. Images come from the API's file store, map tiles and
 *   OneSignal. Narrowing it buys little once scripts are locked down, and a
 *   missed image host would break screens silently.
 * - `frame-src` is narrow on purpose. The only frame is the document viewer's
 *   PDF preview, served from the API's `/files` route.
 */
export interface CspInput {
  nonce: string;
  /** `NEXT_PUBLIC_API_URL`: REST, SignalR and `/files`. */
  apiUrl?: string;
  /** `HEALTH_URL`: the header chip fetches it from the browser. */
  healthUrl?: string;
  /** React needs `eval` in development to rebuild server error stacks. */
  dev: boolean;
}

const ONESIGNAL = ["https://onesignal.com", "https://*.onesignal.com"];

/** The origin of an absolute URL, or null for anything else. */
export function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildCsp({ nonce, apiUrl, healthUrl, dev }: CspInput): string {
  const api = originOf(apiUrl);
  const health = originOf(healthUrl);
  // SignalR negotiates over https, then upgrades: https → wss, http → ws.
  const apiSocket = api ? api.replace(/^http/, "ws") : null;

  const policy: Record<string, (string | null | false)[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", dev && "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'", "https://cdn.onesignal.com"],
    "img-src": ["'self'", "data:", "blob:", "https:", api],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", api, apiSocket, health, ...ONESIGNAL],
    "frame-src": ["'self'", api],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };

  return Object.entries(policy)
    .map(([name, values]) => {
      const kept = [...new Set(values.filter((v): v is string => Boolean(v)))];
      return `${name} ${kept.join(" ")}`;
    })
    .join("; ");
}
