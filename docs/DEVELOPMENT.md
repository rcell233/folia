# Development

## Official CI behavior

GitHub Actions is the official build path. `.github/workflows/images.yml` runs
on pull requests and `main`, detects which of the five images are affected, and
builds only those images. Routine builds never push to GHCR. A manual workflow
run can build one selected component in the same cloud environment.

A `vX.Y.Z` tag invokes the only publishing workflow. It validates the release
metadata, builds all five candidates for `linux/amd64`, and promotes them to
version and commit tags only after every build succeeds. Release procedure and
recovery rules are in [`RELEASING.md`](RELEASING.md).

## Local source development

The Folia development stack runs Web and Cloud from the checkout while Docker
runs PostgreSQL, Redis, MinIO, Auth, and Worker. Auth and Worker use the tested
Folia release images from GHCR; local development does not build them.

Required local tools are Node.js 20 or newer, pnpm 10.9.0, Rust 1.86.0,
`sqlx-cli` 0.8.1, PostgreSQL client tools, Protobuf, OpenSSL development files,
and Docker Compose. Cypress checks on Ubuntu additionally require `xvfb`,
`libnss3`, and `libnspr4`.

Install the Ubuntu 22.04 system packages with:

```bash
sudo apt-get install -y build-essential clang lld cmake pkg-config \
  libssl-dev protobuf-compiler libprotobuf-dev postgresql-client \
  xvfb libnss3 libnspr4
```

Initialize configuration and start the container services:

```bash
bash deploy/dev/scripts/up.sh
```

Install source dependencies once:

```bash
cd apps/web
pnpm install --frozen-lockfile

cd ../../services/cloud
cargo fetch --locked
```

Run Cloud and Web in separate terminals:

```bash
bash deploy/dev/scripts/run-cloud.sh
bash deploy/dev/scripts/run-web.sh
```

The local endpoints are Web `http://localhost:3000`, Cloud
`http://localhost:8000`, Auth `http://localhost:9999`, MinIO API
`http://localhost:9000`, and MinIO Console `http://localhost:9001`. Cloud and
Auth apply their own database migrations at startup. Container ports bind only
to `127.0.0.1`, so local development does not require a domain or gateway. Web
accesses Auth through Vite's same-origin `http://localhost:3000/gotrue` proxy;
port `9999` remains available for direct API debugging. Stop the container stack
with `bash deploy/dev/scripts/down.sh`; named volumes preserve local data.

## Optional local build

Copy and edit the Compose environment once:

```bash
cp deploy/compose/.env.example deploy/compose/.env
```

Then build only the component being changed:

```bash
cd deploy/compose
bash scripts/build.sh appflowy-web
bash scripts/build.sh appflowy-cloud
bash scripts/build.sh appflowy-worker
bash scripts/build.sh gotrue
bash scripts/build.sh url-migrator
```

With no arguments, `build.sh` builds all application and tool images. Local
builds are useful for focused troubleshooting before a push and for emergency
diagnostics. They do not replace the GitHub Actions release workflow.

## Emergency local publish

Set immutable GHCR tags in `.env`, authenticate with `docker login ghcr.io`,
then run `scripts/publish.sh` with the same service selection only when the
official workflow cannot be used and publication is operationally necessary.
The script does not prove that `release/manifest.yaml` matches a Git tag or that
all five images form a complete release. Never overwrite an existing version or
SHA tag, and never publish `latest`.

## Upstream updates

Cloud, Web, and Auth retain upstream histories as subtrees. Update one subtree
at a time, reapply or revise Folia patches, and run compatibility tests before
changing the release manifest. Never update Web and Cloud independently in a
published release merely because an upstream `latest` tag moved.

## Required release checks

A green image-build workflow proves that the selected container builds
completed. It is not, by itself, evidence for all application behavior or
security properties. Before declaring a general release, maintainers should
also establish:

* Web install, type check, focused Jest tests, and production build;
* Cloud formatting, focused Board tests, and release build;
* Auth build;
* Compose configuration validation;
* authenticated database-view creation and editing against the complete stack;
* image vulnerability and secret scans.
