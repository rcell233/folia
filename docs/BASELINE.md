# Deployed baseline

This document records the source and running images audited on 2026-08-19 in
the original NAS installation at `/vol1/1000/appdata/appflowy`.

## Application sources

| Component | Upstream | Revision | License |
|---|---|---|---|
| Cloud | `AppFlowy-IO/AppFlowy-Cloud` | `581f123d48008dd4453be85a5133c554e34a51cb` | AGPL-3.0 |
| Web | `AppFlowy-IO/AppFlowy-Web` | `d0704de22c6521a17d04db76888c869b7b218026` (`0.10.7`) | AGPL-3.0 |
| Auth | `AppFlowy-IO/auth` | `43770901225d5fb6d2a262e62412e1c223ffd85c` (`0.8.0`) | MIT |

The newer Web worktree at revision `4c993e08` was not deployed and is not part
of this repository baseline.

## Deployed Folia patches

Cloud has one content patch in `src/biz/collab/database.rs`:

* choose Board grouping fields in the order status-like Single Select, other
  Single Select, Multi Select, then Checkbox;
* support Multi Select option groups;
* create a `Status` Single Select when no compatible field exists;
* add focused unit-test cases in the same Rust module.

Web has content patches in eight files:

* initialize Board grouping using the same compatibility order;
* return `null` for two optional endpoints absent from the pinned Cloud;
* reconnect WebSockets without reloading the page;
* rebase legacy file-storage URLs after a deployment-origin migration;
* add focused file URL tests.

Filesystem-only executable-bit changes observed on the NAS were excluded.

## Running image evidence

| Service | Local image | Image ID | Created |
|---|---|---|---|
| Cloud | `local/appflowy-cloud:581f123d` | `sha256:67f7e75224b995fd4e18e33e4191acd99ac4a5bc04c21f2a7ba809aef00881e2` | 2026-08-19 06:54 +08:00 |
| Web | `local/appflowy-web:d0704de2` | `sha256:e8b5c5e63b34de0430511df6b3e00c974d48d51bb58b5e7c493d4574f835e2b6` | 2026-08-19 07:31 +08:00 |
| Worker | `local/appflowy-worker:581f123d` | `sha256:5d21e879de8f17518b909cf2172a4ea52d002d3a57f7951fb515feb1cf2fa54a` | 2026-08-19 00:22 +08:00 |
| Auth | `local/appflowy-auth:43770901` | `sha256:047a3e60cff5ad688c75a5b1882afe3423a272ddcf3a6a5b495ae22135950f52` | 2026-08-16 16:46 +08:00 |

Cloud and Web image contents and timestamps confirm that their working-tree
patches were included. All eight Compose services were running; Cloud and Web
reported healthy when audited.

No persistent data, `.env`, credentials, backups, or local certificates from
that installation are included in this repository.
