# Folia Web

Folia Web is the browser client shipped by the Folia self-hosted collaborative
workspace distribution.

The application is based on a pinned AppFlowy Web revision and includes Folia's
compatibility and product patches. See the repository root
[`README.md`](../../README.md), [`docs/BASELINE.md`](../../docs/BASELINE.md), and
[`NOTICE`](../../NOTICE) for architecture, provenance, upstream attribution,
and licensing details.

## Development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Run the standard checks before submitting changes:

```bash
pnpm type-check
pnpm lint
pnpm test
```

Folia Web is distributed under AGPL-3.0. The upstream AppFlowy Web source and
its retained notices remain subject to their original license and attribution.
