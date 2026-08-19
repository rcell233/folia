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

GitHub Actions is the official build and publication boundary. The root CI
workflow evaluates image inputs on pull requests and `main` and builds only the
images affected by a change. Routine pull-request and `main` jobs do not publish
images. A manual run may select one component, but it also remains build-only.

A `vX.Y.Z` tag invokes the release workflow. After confirming that `VERSION` and
`release/manifest.yaml` declare `X.Y.Z`, it builds all five images in parallel on
`ubuntu-24.04` for `linux/amd64`, each under a unique candidate tag. A final job
runs only after all five builds succeed, rejects an existing version tag that
points elsewhere, and promotes the candidates to the version tag and the same
commit SHA tag. Only that promoted set is a compatible release.

GHCR is the only registry for Folia-built images. Release and SHA tags are
protected from overwrite by the release workflow, and there is no floating
`latest` channel. GHCR has no cross-package transaction, so an infrastructure
failure during final promotion can still temporarily leave a partial set; the
unchanged promotion job can resume it idempotently. Production may additionally
pin the reported image digests when stricter artifact identity is required.

Local tools use `compose.yaml` plus `compose.build.yaml` for troubleshooting or
emergency builds. Production uses only `compose.yaml`, which contains no source
builds. This prevents Docker builds and BuildKit mounts from touching
NAS-managed shared-folder state.

## Persistence boundary

Only these directories contain mutable application state:

* `data/postgres`
* `data/redis`
* `data/minio`
* `backups`

They are excluded from Git and image build contexts. Source checkouts and
containers are replaceable; these state directories are not.

## Intended development flow

1. Change one application tree and run its focused tests and compatibility
   checks.
2. Open a pull request; CI builds the affected images without publishing them.
3. Merge to `main`; CI repeats the affected builds against the trusted branch.
4. Update the release metadata and create a matching version tag when the whole
   source tree is ready to release.
5. Require the five candidate builds and final promotion to succeed before
   treating the version as deployable.
6. Back up production, pull the complete version set on the NAS, and run health
   checks.

Image signing, SBOM generation, vulnerability scanning, and complete behavioral
contract coverage remain follow-up work. GitHub Actions image builds do not, by
themselves, close those gaps.
