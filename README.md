<!--
  GENERATED. This repository is produced from the searchcode.ai customer API contract.
  Edits here are overwritten on the next contract change — open an issue instead.
-->

# @searchcode/core

[![npm](https://img.shields.io/npm/v/@searchcode/core.svg)](https://www.npmjs.com/package/@searchcode/core) [![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

The shared HTTP client for the [searchcode.ai](https://searchcode.ai) customer API — search the HTML,
JavaScript and CSS of the public web, identify the technologies behind any domain, and find the
sites that share an operator.

This package is the engine behind [`@searchcode/cli`](https://github.com/searchcode-ai/searchcode-cli) and
[`@searchcode/mcp`](https://github.com/searchcode-ai/searchcode-mcp). Install it directly when you want the API from your
own code; install one of those when you want a command or an agent tool.

## Install

```bash
npm install @searchcode/core
```

## Use

```js
import { Api, configFromEnv } from '@searchcode/core';

const cfg = configFromEnv();            // reads SEARCHCODE_API_KEY
const hits = await Api.searchSource(cfg, { q: 'js.stripe.com/v3' });

for (const row of hits.results) console.log(row.domain);
```

Set `SEARCHCODE_API_KEY` to your key. `SEARCHCODE_API_URL` overrides the gateway, which
defaults to `https://searchcode.ai`. [Get a key](https://searchcode.ai/) — the free plan needs no card.

## Operations

Each one maps to a single API route, charges the credits shown, and needs the plan shown.

| Operation | Credits | Plan | What it does |
| --- | --- | --- | --- |
| `searchSource` | 5 | Free | Search the source code of the public web |
| `facetCount` | 1 | Free | Count the sites carrying one signal |
| `techQuery` | 3 | Free | List every site using a technology |
| `exportTechnology` | 5 | Solo | Export matching domains in bulk |
| `techLookup` | 3 | Pro | Show what one domain is built with |
| `readSource` | 5 | Pro | Read the retained source behind a search hit |
| `ownerGraph` | 5 | Pro | Find domains sharing a tracking identifier |
| `browseDomains` | 1 | Free | Browse the ranked domain index |
| `listShops` | 1 | Enterprise | Browse captured e-commerce storefronts |
| `shopStats` | 1 | Enterprise | Aggregate statistics over the shop catalog |
| `shopProducts` | 2 | Enterprise | Read captured product records |
| `discoverShops` | 1 | Enterprise | Discover storefronts with resumable paging |
| `shopCatalog` | 2 | Enterprise | Read a store catalog page by page |
| `shopCatalogDocument` | 2 | Enterprise | Fetch one catalog document |

## Errors

Every non-2xx throws an `ApiError` carrying the HTTP status, the gateway's error code, and the
credits you have left.

```js
import { ApiError, hintFor } from '@searchcode/core';

try {
  await Api.searchSource(cfg, { q: 'needle' });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.code, error.message, hintFor(error.code));
  }
}
```

## How this repository is produced

Every file here is generated from the searchcode.ai customer API contract. When the API changes,
the contract changes, these packages are regenerated, their tests run, and a new version is
published. That is why the commands, tools, credit costs and plan requirements documented here
can never drift from what the API actually does.

Found a problem? [Open an issue](https://github.com/searchcode-ai) — please don't send a pull request against generated
files, they are overwritten on the next contract change.

## Links

- [Documentation](https://searchcode.ai/docs/)
- [Free source search, no account needed](https://searchcode.ai/)
- [Plans and pricing](https://searchcode.ai/docs/plans/)
- Contact: hello@searchcode.ai

## License

MIT
