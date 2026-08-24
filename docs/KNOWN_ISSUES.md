# Known issues

This file deliberately describes the limitations of the deployed baseline. The
initial repository import does not attempt to solve them.

## Security: legacy file URL authentication

The Web compatibility patch recognizes a stored `/api/file_storage` path even
when its origin is stale, then image helpers normalize it to the current origin.
The separate download helper still classifies by path and can attach a bearer
token before normalizing the URL. Treat untrusted document URLs as unsafe until
all authenticated fetches normalize first and verify the current origin. Add an
adversarial-origin regression test with that fix.

## Database tab order is browser-local

Grid, Board, and Calendar tabs can be dragged into a different order. For the
legacy standalone database topology used by the pinned Cloud, Web stores that
order in browser local storage under the database ID. It survives reloads in
the same browser but does not yet synchronize between browsers or native
clients. This deliberately avoids adding a PostgreSQL field or inventing a new
durable Collab schema without a cross-client migration design.

## Board grouping controls are incomplete

Board creation now chooses a working default field, but the old Web client does
not yet provide a complete Notion-like `Group by` selector. Users must be able
to change grouping per view without modifying other views. Status detection is
also based on broad name substring matching and the fallback `Status` label is
not localized.

## Compatibility shims hide optional APIs

The pinned Cloud lacks `workspace-profile` and `shared-with-me` endpoints used
by Web 0.10.7. Folia currently returns `null` instead of requesting them. Some
upstream integration tests still describe the old response contracts and need
to be updated before those suites become authoritative.

## Test evidence is incomplete

GitHub Actions now provides repeatable image builds, but successful container
builds do not prove the focused Web tests, Cloud unit tests, or an authenticated
Cloud/Web Board-view contract. The deployed baseline is healthy, but those
behavioral checks are not yet complete and should not be inferred from a green
CI or release workflow.

## Image reproducibility

The Dockerfiles pin major toolchain/image tags but not every base-image digest
or operating-system package. Release promotion protects an existing commit tag
from being redirected to a different digest, but rebuilding the source later is
not guaranteed to produce that digest. Releases should record GHCR digests; OCI
provenance, image signing, and SBOM generation are still missing.
