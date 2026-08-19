# Architecture

## Purpose

Folia is a compatibility distribution, not a clean-room rewrite. Its primary
contract is that a specific Web revision and a specific public Cloud revision
are released and tested together. Upstream updates are deliberate compatibility
work, never floating `latest` dependencies.

## Runtime topology

```text
Browser
  |
  v
Gateway (Nginx)
  |-- / ----------------------> Web (static application)
  |-- /gotrue ----------------> Auth
  |-- /api and /ws -----------> Cloud
  `-- /minio-api -------------> MinIO

Cloud ------> PostgreSQL
  |---------> Redis
  `---------> MinIO

Worker -----> PostgreSQL, Redis, and MinIO
```

Only the Gateway publishes a host port. Database, cache, object storage, Auth,
Cloud, Worker, and Web communicate on the private `folia` Docker network.

## Source ownership

The three application trees are imported with `git subtree`, preserving their
upstream commit histories and license files:

* `apps/web`: browser application.
* `services/cloud`: API, collaboration server, migrations, and Worker source.
* `services/auth`: authentication service.

Folia-owned deployment code lives outside those trees. Local compatibility
changes are committed after the subtree import so they remain reviewable and
can be rebased or dropped independently.

## Build and release boundary

Each deployable artifact has an independent image:

* `folia-web`
* `folia-cloud`
* `folia-worker`
* `folia-auth`
* `folia-url-migrator`

The build machine uses `compose.yaml` plus `compose.build.yaml`. Production uses
only `compose.yaml`, which contains no source builds. This prevents Docker builds
and BuildKit mounts from touching NAS-managed shared-folder state.

A Folia release version identifies the complete compatible image set. Release
tags must be immutable. Production should eventually pin image digests as well
as human-readable tags.

## Persistence boundary

Only these directories contain mutable application state:

* `data/postgres`
* `data/redis`
* `data/minio`
* `backups`

They are excluded from Git and image build contexts. Source checkouts and
containers are replaceable; these state directories are not.

## Intended development flow

1. Change one application tree on a development machine.
2. Run that component's focused tests and compatibility checks.
3. Build only the affected image.
4. Run integration tests against the pinned companion images.
5. Publish immutable images to GHCR.
6. Back up production, pull the release on the NAS, and run health checks.

CI automation, image signing, SBOM generation, and contract coverage remain
follow-up work. They are intentionally not invented on the NAS during this
baseline migration.
