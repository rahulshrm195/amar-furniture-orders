# Amar Furniture — Order Tracker

A single-page PWA for tracking furniture orders. It is hosted on GitHub Pages (see `CNAME`) and has no build step.

## Files
- `index.html`: the whole app, including CSS, HTML and two scripts.
  - The `<style>` block is split into sections marked `/* ── … ── */` (topbar, KPI strip, Reports, order card, modals, desktop).
  - The module script holds Firebase setup (Auth + Firestore), the admin email list, order numbers, the live `projects` listener, and save/update.
  - The plain script holds `APP_VERSION`, the language strings, the service worker and self-update, the Drive folder webhook, icons, order cards, sections, the KPI strip, Reports, the order form and keyboard shortcuts.
- `sw.js`: the service worker. It is network-first and also handles push notifications. The `CACHE` name holds the SW version.
- `manifest.json` and `icon-*.png`: the PWA install files.
- `deployment-guide.docx`: the setup guide for the owner.

## Working rules
1. **The UI must match the Concept A design.** Keep using the existing tokens (`--ivory`, `--clay`, `--ink*`, and so on), the Fraunces and Public Sans fonts, the rounded cards and chips, and the 24px round-stroke icons (`svgi(...)`). Do not introduce a new visual style.
2. **Every release bumps the version** in all of these places:
   - `index.html`: the comment at the top of `<style>` (`/* ── vX.Y.Z — …`), the sign-in brand line (`Order Tracker · vX.Y.Z`) and `const APP_VERSION = 'vX.Y.Z'`.
   - `sw.js`: the header comment and `const CACHE = 'af-orders-v1.3.N'`, where N goes up by 1 each release.
   - The commit title ends with `(vX.Y.Z)`.
3. **When handing over a commit, put the commit message and the description in separate code blocks.**
4. **Keep solutions simple.** Make small, local changes, add no dependencies and no build tooling, and match the comment style around the code you change.

## Data and features
- **Firestore**
  - `projects` holds one document per order. Fields include `client`, `phone`, `item`, `projectType`, `status` (0–4, where 4 means delivered), `items[]`, `amount`, `advance`, `payments`, `activityLog` (newest first), `archived`, `orderNo`, `createdAt` and `driveFolderUrl`.
  - `settings/app` holds app settings and `lastOrderNo`.
- **Order numbers** (v3.59.0): orders are numbered #1001 and up. `_nextOrderNo()` hands out each number inside a transaction, and numbers are never reused. Older orders without a number are backfilled oldest-first the first time an admin loads the app (`backfillOrderNos`).
- **Drive folders**: `createDriveFolder` POSTs the order to an Apps Script webhook with `client`, `projectType`, `orderNo` and `otherLabel`. The script then writes the folder URL back to the order document.
- **Keyboard shortcuts**:
  - `N` opens a new order (admins only).
  - `R` opens or closes Reports (admins only).
  - `H` goes Home.
  - Cmd/Ctrl+S saves the order form.
  - Cmd/Ctrl+F jumps to search.
  - Esc closes the small dialogs, but never the order form.
  - Tab stays inside the open dialog.
  - None of the plain-letter shortcuts fire while typing or while a dialog is open.
