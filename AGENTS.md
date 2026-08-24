# Repository Agent Guidelines

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
