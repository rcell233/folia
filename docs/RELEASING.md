# Releasing

GitHub Actions is the only normal release publisher, and GHCR is the only
registry for Folia-built images. A release is one compatible set of Cloud, Web,
Worker, Auth, and URL Migrator images. Folia never publishes a floating `latest`
tag.

## Prepare the release

1. Choose a semantic version `X.Y.Z`. The Git tag will include the `v` prefix;
   the manifest version and image tags will not.
2. Ensure the intended source revisions and compatibility patches are on
   `main`.
3. Set `VERSION` and the `version` field in `release/manifest.yaml` to exactly
   `X.Y.Z`. Set all five manifest image references to `:X.Y.Z` and verify that
   the recorded source revisions are current. Update the five
   `FOLIA_*_IMAGE` defaults in `deploy/compose/.env.example` to the same version.
4. Merge that manifest change and require the relevant CI checks. Complete the
   behavioral and security checks described in
   [`DEVELOPMENT.md`](DEVELOPMENT.md); an image build alone is not a complete
   compatibility test.
5. Create and push `vX.Y.Z` at the release commit. Do not move an existing
   release tag.

For example:

```bash
git tag -a vX.Y.Z -m "Folia X.Y.Z"
git push origin vX.Y.Z
```

## What the workflow publishes

The tag starts `.github/workflows/release.yml`. It first verifies that the tag
is exactly `vX.Y.Z` and that `VERSION`, `release/manifest.yaml`, and the Compose
image defaults all declare `X.Y.Z`. It then builds all five images in parallel
on separate `ubuntu-24.04` runners for `linux/amd64`. Each build initially pushes
only a unique `candidate-<run>-<attempt>` tag.

After every candidate build succeeds, one promotion job verifies that no
`X.Y.Z` tag already exists and that an existing commit tag, if any, has the same
digest. It then creates these operator-facing tags without rebuilding:

```text
ghcr.io/rcell233/folia-cloud:X.Y.Z
ghcr.io/rcell233/folia-cloud:sha-<40-character-commit>
ghcr.io/rcell233/folia-web:X.Y.Z
ghcr.io/rcell233/folia-web:sha-<40-character-commit>
ghcr.io/rcell233/folia-worker:X.Y.Z
ghcr.io/rcell233/folia-worker:sha-<40-character-commit>
ghcr.io/rcell233/folia-auth:X.Y.Z
ghcr.io/rcell233/folia-auth:sha-<40-character-commit>
ghcr.io/rcell233/folia-url-migrator:X.Y.Z
ghcr.io/rcell233/folia-url-migrator:sha-<40-character-commit>
```

The version tags are the operator-facing compatibility set. The SHA tags tie
artifacts to the release commit. The workflow refuses to redirect either an
existing version tag or a commit tag that points at a different digest.

## Completion and failure

Wait for the candidate matrix and the final promotion job to succeed. A
candidate build failure creates no version tags. Candidate tags are internal
build artifacts and are never deployable releases.

For a transient build or registry failure before promotion, rerun the workflow
only for the unchanged tag and commit. GHCR cannot atomically update five
packages, so a failure during final promotion can still leave some version tags.
The workflow will refuse to overwrite that partial set on a rerun. Treat the
version as failed, fix the cause on `main`, and issue a new version rather than
moving the old Git tag or overwriting image tags.

After the first publication of each package, choose its GHCR visibility once:

* Make all five packages public for anonymous NAS pulls; or
* keep them private and authenticate the NAS with `docker login ghcr.io` using
  a credential that can read every package.

Do not mix visibility assumptions across the set. Package existence alone is
not evidence that the full workflow succeeded.

## Deploy and record

1. Record the release commit and the five image digests reported by GHCR.
2. Back up the current deployment.
3. Set every `FOLIA_*_IMAGE` variable to the same `X.Y.Z` version.
4. Run `bash deploy/compose/scripts/deploy.sh` and complete the health, login,
   editing, attachment, and WebSocket checks in
   [`DEPLOYMENT.md`](DEPLOYMENT.md).

The NAS remains pull-only throughout this process.
