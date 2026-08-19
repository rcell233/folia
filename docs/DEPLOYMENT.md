# Deployment

## Separation of responsibilities

Build application images on a development or CI machine. The NAS should only
hold Compose configuration, secrets, persistent data, backups, and pulled
images. Do not run `scripts/build.sh` on the NAS.

## First installation

1. Copy `deploy/compose/.env.example` to `deploy/compose/.env`, or run
   `scripts/init-env.sh` to generate local secrets.
2. Set all three public URL values together. HTTPS requires a matching `wss://`
   WebSocket URL.
3. Set the five `FOLIA_*_IMAGE` values to tags already published by the build
   machine.
4. Run `bash scripts/deploy.sh`.
5. Confirm `docker compose ps`, `/healthz`, login, page editing, attachment
   loading, and WebSocket reconnection.

The generated `.env` is mode `0600` where the host filesystem supports Unix
permissions. It must never be committed.

## Existing installation migration

The repository does not automatically move production data. Preserve the
existing PostgreSQL, Redis, and MinIO directories and make a verified backup
before switching Compose projects. Bind mounts in this repository resolve to
the root-level `data/` directory.

Changing the public origin also requires migrating absolute URLs stored in
Collab documents. Preview first:

```bash
bash scripts/migrate-urls.sh 'http://old.example' 'https://new.example'
bash scripts/migrate-urls.sh 'http://old.example' 'https://new.example' --apply
```

Apply mode creates a backup and briefly stops Gateway, Web, and Cloud. The URL
migrator image must already be published; the NAS script never builds it.

## Upgrade and rollback

Before an upgrade, run `bash scripts/backup.sh` and record the current image
digests. Pull every image before recreating services so a partial registry
failure cannot leave a mixed release.

Container rollback is possible by restoring the previous image tags. Database
rollback is not automatically safe after schema migrations; restore the matching
database and object-storage backup when a release includes incompatible schema
changes.
