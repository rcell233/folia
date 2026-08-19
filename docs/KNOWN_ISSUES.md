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

## Database views appear as child pages

AppFlowy Web 0.10.7 and the pinned Cloud create a new database view as a Folder
child of the original database page. This differs from the desired same-page tab
model and is not caused by the Board grouping patch.

The future fix must change the Web/Cloud view topology contract, preserve
existing views, and avoid creating navigation children for secondary layouts.

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

The deployed Cloud and Web images built successfully and are healthy, but the
new Board unit cases were not proven to have run on the NAS. The development
machine should establish focused Web tests, Cloud unit tests, and an authenticated
Cloud/Web Board-view contract test before the first general release.

## Image reproducibility

The initial Dockerfiles pin major toolchain/image tags but not every base-image
digest or operating-system package. The first formal release should record image
digests, add OCI source/revision labels, and generate an SBOM.
