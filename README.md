# RouteMate: Multi-stop Planner

RouteMate is a free, open-source Manifest V3 workspace for field visits built beside Google Maps.

The project is a practical browser utility today and a foundation for a future route-workflow product for field service, delivery, travel, and small teams.

## Features

- Maintain up to 20 named routes with 50 stops each.
- Capture the place currently open in Google Maps.
- Track pending/completed work, priority, visit duration, and private notes.
- Plan a field day with a date, start time, per-leg travel buffer, and visit time windows.
- See planned visit times, projected finish, progress, and schedule conflicts without sending data to a server.
- Store task type and customer contact details for each visit.
- Start or complete the next visit from a focused field-work card.
- Duplicate a route as a recurring-work template while resetting execution status.
- Reorder by drag-and-drop, buttons, or reverse pending work.
- Optimize locally with nearest-neighbor plus 2-opt improvement.
- Keep the first stop and, optionally, the final stop fixed.
- Skip completed work when opening navigation.
- Open driving, walking, cycling, or transit routes in Google Maps.
- Automatically split more than 10 stops into connected route sections.
- Import/export operational CSV and back up or restore the entire workspace as JSON.
- No account, ads, analytics, backend, or Google Maps API key.

The summary shows remaining jobs, approximate straight-line distance, planned service time, projected finish, and completion progress. Schedule estimates use the user-defined travel buffer; the optimizer does not use live roads or traffic. Google Maps receives a route only when the user explicitly opens it.

## Run locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project directory.
4. Open `https://www.google.com/maps/`, select a place, click the RouteMate toolbar icon, and press **Add stop**.

After installing or updating an unpacked build, refresh any already-open Google Maps tab once so Chrome can attach the content script.

## Test and package

```bash
npm test
npm run package
```

The Chrome Web Store upload archive and a complete source archive are created under `dist/`.
The packager is implemented in Node.js and does not require external `zip`, `unzip`, or Bash tools.

## Product direction

The first goal is not monetization. It is reliable utility, installs, retention, reviews, and evidence that people repeatedly build routes from places discovered in Google Maps.

See `docs/PRODUCT_STRATEGY_RU.md` for the acquisition-oriented roadmap and `docs/ARCHITECTURE.md` for technical boundaries.

## Store positioning

Single purpose: **turn locations deliberately selected by the user in Google Maps into organized field-visit routes**.

RouteMate is independent and is not affiliated with, endorsed by, or sponsored by Google. Do not use Google’s logo or visual identity in project assets.

## Privacy and security

- Route and note data remains in `chrome.storage.local`.
- No analytics, advertising, location history collection, or sale of data.
- No remotely hosted executable code.
- Host access is limited to the two Google Maps URL patterns declared in `manifest.json`.
- The extension reads only the open place after the user presses **Add stop**.

## Known MVP constraints

- Capture uses the public Google Maps URL and visible place heading. Google can change its page structure; URL parsing is the fallback.
- Each generated Maps section contains at most 10 stops and is subject to Google’s URL-length limit.
- Approximate optimization ignores roads, closures, live traffic, vehicle restrictions, and borders.
- The first release targets `google.com/maps`; localized Google domains should be added only after testing.

## License

MIT. The source may be reused commercially, while the RouteMate name and future hosted services can be managed separately as product assets.
