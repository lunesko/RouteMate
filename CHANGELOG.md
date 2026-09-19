# Changelog

## 0.4.0

- Added a field-day planner with work date, start time, and configurable travel buffer.
- Added visit time windows, planned visit times, finish forecast, and local schedule-conflict warnings.
- Expanded visit cards with task type, contact name, phone number, and four execution statuses.
- Added a focused next-visit card with one-click start and completion actions.
- Added route duplication for recurring work; visit details are retained while execution state is reset.
- Extended CSV import/export and JSON normalization for the new operational fields.
- Migrated local workspaces to schema v3 without losing v0.3 data.

## 0.3.0

- Repositioned RouteMate as a local field-visit workspace.
- Added up to 20 named routes with automatic migration from the original single-route storage.
- Added pending/completed status, priority, service duration, and route summaries.
- Added skip-completed navigation, fixed-finish optimization, reverse pending work, and drag-and-drop.
- Replaced the single nearest-neighbor pass with nearest-neighbor plus 2-opt improvement.
- Added operational CSV import/export and complete workspace JSON backup/restore.
- Improved duplicate detection and retained the 50-stop per-route safety limit.

## 0.2.0

- Removed billing and made every feature free.
- Added multi-section Google Maps handoff, JSON backup, and MIT licensing.

## 0.1.0

- Initial multi-stop planner MVP.
