# Release checklist

## Product

- [ ] Replace the date and support email placeholders in the privacy policy and terms.
- [ ] Host the privacy policy and terms on public HTTPS pages.
- [ ] Create a public source repository and add the MIT license.
- [ ] Add a support/feedback URL.
- [ ] Check the RouteMate name in target trademark databases and the Chrome Web Store before launch.

## Chrome Web Store account

- [ ] Register and verify the developer account.
- [ ] Enable two-step verification.
- [ ] Complete trader/non-trader and contact disclosures required for target markets.

## Build QA

- [ ] Run `npm test`.
- [ ] Load the unpacked extension in stable Chrome.
- [ ] Test on a fresh browser profile.
- [ ] Test route create/duplicate/rename/delete and migration from v0.2/v0.3 storage.
- [ ] Test place capture, duplicate detection, 50-stop limit, drag-and-drop, removal, and clear.
- [ ] Test four statuses, priority, service duration, visit details, skip-finished, fixed finish, reverse, and optimization.
- [ ] Test work date, start time, travel buffer, time windows, finish forecast, and conflict warnings.
- [ ] Confirm completed visits keep the remaining schedule stable and skipped visits are removed from it.
- [ ] Test each travel mode and automatic multi-section handoff.
- [ ] Test non-ASCII names and CSV in Excel/Google Sheets.
- [ ] Test CSV import/export and full JSON workspace backup/restore.
- [ ] Run `npm run package` and upload only the generated ZIP.

## Listing assets

- [ ] 128×128 store icon.
- [ ] At least one 1280×800 or 640×400 screenshot without personal account data.
- [ ] Optional 440×280 small promo tile.
- [ ] Accurate English listing and localized Ukrainian/Russian text.
- [ ] Do not use Google’s logo or imply endorsement.

## Privacy declarations

- [ ] Declare website content access limited to the current Google Maps page.
- [ ] Confirm there is no analytics, advertising, external server, or sale of data.
- [ ] Paste the single-purpose statement and permission justifications from `LISTING_EN.md`.
- [ ] Confirm all executable code is packaged locally.
