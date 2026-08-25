# Repository Agent Guidelines

## Release Tag Safety

- Before preparing or publishing any release, read and follow
  `docs/RELEASING.md` completely. Treat it as the authoritative release
  procedure.
- Never create or push a release tag before the release-preparation commit has
  been pushed to `main` and the required non-tag CI workflows for that exact
  commit have completed successfully.
- Before pushing a `vX.Y.Z` tag, update and commit every version location
  required by `docs/RELEASING.md`, including `VERSION`,
  `release/manifest.yaml`, all release image references, and the production
  Compose image defaults. Verify locally that they all exactly match `X.Y.Z`.
- Create the release tag only on the exact commit that passed the required CI
  checks. After pushing it, monitor the release workflow through candidate
  builds and final promotion; do not report the release as successful until the
  complete workflow succeeds.
- If a newly pushed tag fails before publishing release artifacts because of a
  preparation error, remove the failed local and remote tag, fix and validate
  the release-preparation commit on `main`, wait for CI to succeed, and only
  then recreate the tag. Never move or overwrite a tag for a release whose
  artifacts may already have been published; issue a new version instead.

## Web Feature Upstream Reference

- The Web application in this repository starts from an older pinned AppFlowy
  Web commit. When implementing a requested Web feature, first research
  Notion's current publicly observable behavior and interaction model for the
  equivalent feature, using up-to-date online sources. Treat Notion's product
  behavior as the primary reference for the feature's detailed semantics and
  user experience.
- After establishing the intended Notion behavior, inspect the latest publicly
  available AppFlowy Web source for an equivalent implementation that can be
  reused.
- If an upstream implementation exists, prefer porting it into this repository
  instead of reimplementing it. Adapt the code as needed for this repository's
  older Web baseline, pinned Cloud API, local compatibility patches, and
  dependency versions; do not assume that code from the latest upstream branch
  can be copied without compatibility work.
- If Notion and the latest AppFlowy Web implement the same feature differently,
  follow Notion's behavior and interaction logic. Reuse or adapt AppFlowy code
  only where it supports that behavior; otherwise modify it or implement the
  differing behavior locally.
- If no suitable public upstream implementation exists, implement the feature
  locally using the existing architecture and conventions while following the
  researched Notion behavior.
- Preserve applicable upstream attribution and licensing when porting code, and
  record the upstream revision or source location when that context will help
  future maintenance.

## Persistent Data And Schema Changes

- For feature development, prefer solutions that do not add or modify persistent
  database fields, tables, indexes, or durable data formats. Reuse existing data
  models when that remains correct and maintainable.
- Do not change the database schema merely to simplify application code. Treat a
  production schema change as a last resort and explain why it is unavoidable.
- When a schema change is unavoidable, the feature is incomplete unless it also
  includes an ordered migration that upgrades an existing production database.
  For PostgreSQL, add a new migration under `services/cloud/migrations`; never
  rewrite a migration that may already have been applied.
- A production migration must cover existing-data backfill, defaults and
  nullability, index/locking impact, mixed-version deployment compatibility, and
  a rollback or recovery plan. Document the deployment sequence when ordering
  matters.
- Verify both paths: initializing a clean database and upgrading a representative
  old database with existing data. A fresh-install schema alone is not an upgrade
  plan.
- Apply the same discipline to durable non-SQL formats such as Yjs/collab data,
  serialized blobs, object-storage layouts, and protocol schemas. Prefer
  backward-compatible readers and lazy migration; otherwise provide a versioned
  backfill or conversion tool and recovery instructions.
