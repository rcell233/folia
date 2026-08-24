# Deployment

## Separation of responsibilities

GitHub Actions builds and publishes the official images to GHCR. GHCR is the
only supported registry for Folia-built images. The NAS should only hold
Compose configuration, secrets, persistent data, backups, and pulled images.
Do not run `scripts/build.sh` or `scripts/publish.sh` on the NAS.

Official release images currently target `linux/amd64`; the NAS must support
that platform.

## GHCR access

GHCR package visibility is configured separately for each of the five image
packages. After their first publication, make each package public once if the
NAS should pull anonymously. Public packages need no registry credentials.

If any package remains private, authenticate Docker on the NAS with a GitHub
credential that can read that package:

```bash
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
```

Keep that credential out of `.env` and Git. All five packages must be readable
by the NAS; mixed public/private visibility can otherwise fail midway through a
pull.

## First installation

1. Copy `deploy/compose/.env.example` to `deploy/compose/.env`, or run
   `scripts/init-env.sh` to generate local secrets.
2. Set all three public URL values together. HTTPS requires a matching `wss://`
   WebSocket URL.
3. Set all five `FOLIA_*_IMAGE` values to the same version from a successfully
   completed release workflow. Do not use commit tags as a substitute for a
   complete release set.
4. Run `bash scripts/deploy.sh`.
5. Confirm `docker compose ps`, `/healthz`, login, page editing, attachment
   loading, and WebSocket reconnection.

The generated `.env` is mode `0600` where the host filesystem supports Unix
permissions. It must never be committed.

Folia does not publish `latest`. A deployable `X.Y.Z` set consists of exactly:

```text
ghcr.io/rcell233/folia-cloud:X.Y.Z
ghcr.io/rcell233/folia-web:X.Y.Z
ghcr.io/rcell233/folia-worker:X.Y.Z
ghcr.io/rcell233/folia-auth:X.Y.Z
ghcr.io/rcell233/folia-url-migrator:X.Y.Z
```

The five tags must come from the same successful release workflow. Seeing some
of them in GHCR after a failed workflow does not make that version deployable.

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
digests. Confirm the tagged release workflow succeeded in full, update all five
image variables together, then run `bash scripts/deploy.sh`. The script pulls
every image before recreating services, so a registry or authentication failure
stops the deployment instead of intentionally starting a mixed release. Resolve
the failure and rerun the command; do not substitute an image from another
version.

Container rollback is possible by restoring the previous image tags. Database
rollback is not automatically safe after schema migrations; restore the matching
database and object-storage backup when a release includes incompatible schema
changes.

### Database view tab compatibility

The database-view tab fix does not add or alter PostgreSQL tables, columns, or
indexes, so it has no SQL migration. Existing secondary layouts remain in the
Folder collab for compatibility with rename, delete, and older clients. The new
Cloud navigation projection stops exposing those records as nested pages; no
offline backfill or destructive cleanup is required.

Deploy Cloud before Web for this change. The new Web expects the database-view
creation response to contain `view_id`, `database_id`, and `database_update`;
the old Cloud returned an empty response. After Cloud is healthy, deploy Web and
force a browser reload. Rolling back both images restores the old presentation
without restoring PostgreSQL, Redis, MinIO, or Collab data.

See [`RELEASING.md`](RELEASING.md) for version-tag and completeness rules.
