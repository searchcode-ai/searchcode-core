// GENERATED from the searchcode.ai customer API contract. Do not edit by hand.
// Contract-to-client tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Api,
  ApiError,
  CUSTOMER_API_ROUTES,
  DEFAULT_BASE_URL,
  OPERATIONS,
  callRoute,
  configFromEnv,
  creditsFor,
  customerApiPath,
  minTierFor,
} from '../src/index.js';

const apiKeyRoutes = Object.values(CUSTOMER_API_ROUTES).filter((r) => r.auth === 'api_key');
const npmRoutes = apiKeyRoutes.filter((r) => r.npmOperation);

test('every contract operation has a client method', () => {
  for (const route of npmRoutes) {
    assert.equal(typeof Api[route.npmOperation], 'function', `missing ${route.npmOperation}`);
  }
  assert.deepEqual([...OPERATIONS].sort(), npmRoutes.map((r) => r.npmOperation).sort());
});

test('the client exposes no operation the contract does not declare', () => {
  const declared = new Set(npmRoutes.map((r) => r.npmOperation));
  for (const name of Object.keys(Api)) {
    assert.ok(declared.has(name), `${name} is not in the contract`);
  }
});

test('only customer API-key routes are callable', () => {
  const sessionRoute = Object.values(CUSTOMER_API_ROUTES).find((r) => r.auth === 'session');
  if (!sessionRoute) return;
  assert.throws(() => callRoute({ baseUrl: 'https://x', apiKey: 'k' }, sessionRoute.id), /not a customer API-key route/);
});

test('no published route touches an admin or withdrawn path', () => {
  for (const route of npmRoutes) {
    assert.doesNotMatch(route.path, /secret|audit|admin|operator/i, route.id);
  }
});

test('credits and minimum plan come from the contract', () => {
  for (const route of npmRoutes) {
    assert.equal(creditsFor(route.id), route.meter.credits);
    assert.equal(minTierFor(route.id), route.minTier);
  }
});

test('path parameters are substituted and required', () => {
  for (const route of npmRoutes) {
    const params = (route.params ?? []).filter((p) => p.in === 'path');
    if (params.length === 0) continue;
    const filled = Object.fromEntries(params.map((p) => [p.name, 'VALUE']));
    assert.equal(customerApiPath(route.id, filled).includes('VALUE'), true);
    assert.throws(() => customerApiPath(route.id, {}), /missing path parameter/);
  }
});

test('the default base URL is the public site', () => {
  assert.equal(DEFAULT_BASE_URL, 'https://searchcode.ai');
  assert.equal(configFromEnv({}).baseUrl, 'https://searchcode.ai');
  assert.equal(configFromEnv({ SEARCHCODE_API_URL: 'https://x/' }).baseUrl, 'https://x');
});

test('the API key travels as a header, never in the URL', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ results: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    await Api.searchSource({ baseUrl: 'https://example.test', apiKey: 'secret-key' }, {"q":"js.stripe.com/v3"});
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init.headers['x-api-key'], 'secret-key');
    assert.doesNotMatch(calls[0].url, /secret-key/);
  } finally {
    globalThis.fetch = original;
  }
});

test('both gateway error envelopes are parsed', async () => {
  // The gateway answers with the canonical api-error.v1 envelope from its middleware, and with a
  // flat {error, code} from a few hand-written handlers. Reading only one loses the code and the
  // message, which is exactly what the live smoke test caught.
  const envelopes = [
    [
      'api-error.v1',
      { error: { code: 'INVALID_REQUEST', message: 'name or name_slug is required', retryable: false }, schema_version: 'api-error.v1' },
      'INVALID_REQUEST',
      'name or name_slug is required',
    ],
    [
      'flat',
      { error: 'unknown or revoked API key', code: 'INVALID_API_KEY' },
      'INVALID_API_KEY',
      'unknown or revoked API key',
    ],
  ];
  const original = globalThis.fetch;
  try {
    for (const [name, body, code, message] of envelopes) {
      globalThis.fetch = async () => new Response(JSON.stringify(body), { status: 400 });
      await assert.rejects(
        () => Api.searchSource({ baseUrl: 'https://example.test', apiKey: 'k' }, { q: 'x' }),
        (error) => {
          assert.equal(error.code, code, `${name}: code`);
          assert.equal(error.message, message, `${name}: message`);
          return true;
        },
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});

test('a non-2xx becomes an ApiError carrying the gateway code', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'out of credits', code: 'OUT_OF_CREDITS' }), { status: 402 });
  try {
    await assert.rejects(
      () => Api.searchSource({ baseUrl: 'https://example.test', apiKey: 'k' }, { q: 'x' }),
      (error) => error instanceof ApiError && error.status === 402 && error.code === 'OUT_OF_CREDITS',
    );
  } finally {
    globalThis.fetch = original;
  }
});
