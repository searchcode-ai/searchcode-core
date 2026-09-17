// GENERATED from the searchcode.ai customer API contract. Do not edit by hand.
// Shared HTTP client for the searchcode.ai customer API.

// Every request targets the customer plane (`${baseUrl}/api/v1/*`), authenticated with a
// metered API key and gated per-key by tier, credits, and rate.
//
// Config:
//   SEARCHCODE_API_KEY — your API key, sent as the `x-api-key` header.
//   SEARCHCODE_API_URL — gateway base URL (default https://searchcode.ai).

import {
  CUSTOMER_API_PREFIX,
  CUSTOMER_API_ROUTES,
  customerApiPath,
  customerApiRoute,
} from './contract.js';

export * from './contract.js';

export const DEFAULT_BASE_URL = 'https://searchcode.ai';

export function configFromEnv(env = process.env) {
  return {
    baseUrl: (env.SEARCHCODE_API_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
    apiKey: env.SEARCHCODE_API_KEY || '',
  };
}

/** Thrown for any non-2xx, carrying the gateway's {error, code} plus the HTTP status. */
export class ApiError extends Error {
  constructor(status, code, message, creditsRemaining) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.creditsRemaining = creditsRemaining;
  }
}

/** A human-readable hint for the gateway's error codes. */
export function hintFor(code) {
  switch (code) {
    case 'OUT_OF_CREDITS': return 'top up credits or upgrade your plan';
    case 'TIER_FORBIDDEN': return 'this endpoint requires a higher plan';
    case 'RATE_LIMITED': return 'slow down; per-key rate limit hit';
    case 'MISSING_API_KEY':
    case 'INVALID_API_KEY': return 'set SEARCHCODE_API_KEY';
    case 'INVALID_REQUEST': return 'check the arguments you passed';
    default: return '';
  }
}

async function request(cfg, path, params = {}, { method = 'GET', body, signal, responseMaxBytes } = {}) {
  const url = new URL(cfg.baseUrl + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const headers = { accept: 'application/json' };
  if (cfg.apiKey) headers['x-api-key'] = cfg.apiKey;
  if (body !== undefined) headers['content-type'] = 'application/json';

  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (signal?.aborted) throw signal.reason || e;
    throw new ApiError(0, 'NETWORK', `cannot reach ${cfg.baseUrl}: ${e.message}`);
  }

  const creditsRemaining = resp.headers.get('x-credits-remaining');
  const text = responseMaxBytes
    ? await boundedText(resp, responseMaxBytes, signal)
    : await resp.text();

  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

  if (!resp.ok) {
    // The gateway speaks two error envelopes: the canonical `api-error.v1`
    // ({error: {code, message, retryable}, schema_version}) that its middleware applies, and a
    // flat {error, code} from a few hand-written handlers. Read both, or a coded error arrives
    // as a bare HTTP status with an unreadable message.
    const nested = payload.error && typeof payload.error === 'object' ? payload.error : null;
    const code = nested?.code ?? payload.code ?? `HTTP_${resp.status}`;
    const message = nested?.message
      ?? (typeof payload.error === 'string' ? payload.error : null)
      ?? text
      ?? resp.statusText;
    const error = new ApiError(resp.status, code, message, creditsRemaining);
    if (nested && typeof nested.retryable === 'boolean') error.retryable = nested.retryable;
    throw error;
  }
  if (creditsRemaining !== null) payload._creditsRemaining = Number(creditsRemaining);
  return payload;
}

async function boundedText(response, limit, signal) {
  const tooBig = () => new ApiError(0, 'RESPONSE_SIZE_LIMIT', 'response exceeds its byte limit');
  const declared = response.headers.get('content-length');
  if (declared && /^\d+$/.test(declared) && BigInt(declared) > BigInt(limit)) {
    await response.body?.cancel();
    throw tooBig();
  }
  if (!response.body?.getReader) throw new ApiError(0, 'INVALID_RESPONSE', 'response has no readable body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  let text = '', bytes = 0, complete = false;
  try {
    for (;;) {
      if (signal?.aborted) throw signal.reason || new Error('request aborted');
      const { value, done } = await reader.read();
      if (done) { text += decoder.decode(); complete = true; return text; }
      bytes += value.byteLength;
      if (bytes > limit) throw tooBig();
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Call any customer route by its contract id. */
export function callRoute(cfg, routeId, { pathParams = {}, query = {}, body, signal, responseMaxBytes } = {}) {
  const route = customerApiRoute(routeId);
  if (route.auth !== 'api_key') {
    throw new Error(`${routeId} is not a customer API-key route`);
  }
  return request(
    cfg,
    `${CUSTOMER_API_PREFIX}${customerApiPath(routeId, pathParams)}`,
    query,
    { method: route.method, body, signal, responseMaxBytes },
  );
}

/** Credits the contract charges for a route. */
export function creditsFor(routeId) {
  return customerApiRoute(routeId).meter?.credits ?? 1;
}

/** Minimum plan a route requires. */
export function minTierFor(routeId) {
  return customerApiRoute(routeId).minTier ?? 'free';
}

// ── named operations, one per contract npmOperation ──
export const Api = {
  /** search_source — 5 credits, Free+. */
  searchSource: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'source_search_sync', { query, signal }),
  /** facet_count — 1 credit, Free+. */
  facetCount: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'facet_count', { query, signal }),
  /** tech_query — 3 credits, Free+. */
  techQuery: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'tech_query', { query, signal }),
  /** domain_export — 5 credits, Solo+. */
  exportTechnology: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'domain_export', { query, signal }),
  /** tech_lookup — 3 credits, Pro+. */
  techLookup: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'site_profile', { query, signal }),
  /** source_read — 5 credits, Pro+. */
  readSource: (cfg, { blob_hash, ...query } = {}, { signal } = {}) =>
    callRoute(cfg, 'source_read', { pathParams: { blob_hash }, query, signal }),
  /** owner_graph — 5 credits, Pro+. */
  ownerGraph: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'owner_graph', { query, signal }),
  /** domain_browse — 1 credit, Free+. */
  browseDomains: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'domain_browse', { query, signal }),
  /** shop_browse — 1 credit, Enterprise+. */
  listShops: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'shop_browse', { query, signal }),
  /** shop_stats — 1 credit, Enterprise+. */
  shopStats: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'shop_stats', { query, signal }),
  /** shop_products — 2 credits, Enterprise+. */
  shopProducts: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'shop_products', { query, signal }),
  /** shop_browse — 1 credit, Enterprise+. */
  discoverShops: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'shop_discovery', { query, signal }),
  /** shop_products — 2 credits, Enterprise+. */
  shopCatalog: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'shop_catalog_v2', { query, signal }),
  /** shop_products — 2 credits, Enterprise+. */
  shopCatalogDocument: (cfg, query = {}, { signal } = {}) =>
    callRoute(cfg, 'shop_catalog_document', { query, signal, responseMaxBytes: 5 * 1024 * 1024 }),
};

/** Every operation name this client exposes, from the contract. */
export const OPERATIONS = Object.freeze(["searchSource","facetCount","techQuery","exportTechnology","techLookup","readSource","ownerGraph","browseDomains","listShops","shopStats","shopProducts","discoverShops","shopCatalog","shopCatalogDocument"]);
