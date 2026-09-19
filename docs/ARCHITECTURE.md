# RouteMate architecture

## Current boundary

RouteMate is intentionally local-first and backend-free.

1. A content script runs only on declared Google Maps pages.
2. The user presses **Add stop**.
3. The content script reads the visible place heading, address, URL, and coordinates encoded in the URL.
4. The side panel saves the normalized stop in a versioned local workspace.
5. RouteMate manages execution status, priority, visit duration, time windows, contacts, notes, and reusable route lists.
6. A nearest-neighbor seed and 2-opt pass reorder pending stops locally.
7. A deterministic local scheduler forecasts visit and finish times from the workday start, service duration, time windows, and configured travel buffer.
8. Chrome opens one or more connected Google Maps route sections.

## Components

- `content/maps-capture.js`: user-initiated extraction from the current page.
- `sidepanel/`: UI, route state, import/export, and browser interaction.
- `shared/route-utils.js`: deterministic routing and scheduling helpers, CSV parsing, import normalization, and exports.
- `shared/workspace.js`: schema v3, route creation/duplication, backup validation, and legacy migration.
- `service-worker.js`: side-panel behavior.
- `test/`: unit tests for deterministic logic.

## Security rules

- No `eval`, remotely hosted scripts, or runtime-downloaded logic.
- No broad browsing permission.
- No automatic collection of result lists.
- Imported files are parsed as data, capped at 50 stops, and normalized.
- Workspaces are capped at 20 routes and backups are normalized before use.
- URLs are generated with `URLSearchParams`.

## Future architecture

The extension should remain the private local client. Optional cloud features must be a separate, explicit layer:

- account and team workspace;
- shared route plans and dispatcher assignments;
- audited API integrations;
- privacy-preserving product metrics with clear consent;
- official Google Maps Platform APIs when road-aware optimization becomes necessary.

Do not couple the MVP to a backend before repeated-use demand is demonstrated.
