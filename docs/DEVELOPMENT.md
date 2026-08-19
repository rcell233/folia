# Development

## Build one component

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
```

With no arguments, `build.sh` builds all application and tool images. That is
for release validation, not the default inner development loop.

## Publish

Set immutable GHCR tags in `.env`, authenticate with `docker login ghcr.io`,
then run `scripts/publish.sh` with the same service selection. Do not overwrite
an existing release tag.

## Upstream updates

Cloud, Web, and Auth retain upstream histories as subtrees. Update one subtree
at a time, reapply or revise Folia patches, and run compatibility tests before
changing the release manifest. Never update Web and Cloud independently in a
published release merely because an upstream `latest` tag moved.

## Required release checks

The current NAS baseline predates a complete CI pipeline. Before declaring a
general release, the development machine should run:

* Web install, type check, focused Jest tests, and production build;
* Cloud formatting, focused Board tests, and release build;
* Auth build;
* Compose configuration validation;
* authenticated database-view creation and editing against the complete stack;
* image vulnerability and secret scans.
