# Amar Furniture — Order Tracker

A single-page PWA for tracking furniture orders. It is hosted on GitHub Pages (see `CNAME`) and has no build step.

## Files
- `index.html`: the whole app, including CSS, HTML and two scripts.
  - The `<style>` block is split into sections marked `/* ── … ── */` (topbar, KPI strip, Reports, order card, modals, desktop).
  - The module script holds Firebase setup (Auth + Firestore), the admin email list, order numbers, the live `projects` listener, and save/update.
  - The plain script holds `APP_VERSION`, the language strings, the service worker and self-update, the Drive folder webhook, icons, order cards, sections, the KPI strip, Reports, the order form and keyboard shortcuts.
- `cut/index.html` and `cut/manifest.json`: the workshop tablet page at `/cut/`, a cutting list with Woodwork, Lathe and CNC tabs. It is a standalone page that loads none of the orders app, and it signs in as `workshop@amarfurniture.in`. If that account opens the main app, it is redirected to `/cut/`.
- `firestore.rules`: a copy of the live Firestore rules, which are pasted into the Firebase console by hand. Keep this file in step with what is live.
- `sw.js`: the service worker. It is network-first and also handles push notifications. The `CACHE` name holds the SW version.
- `manifest.json` and `icon-*.png`: the PWA install files.
- `deployment-guide.docx`: the setup guide for the owner.

## Working rules
1. **The UI must match the Concept A design.** Keep using the existing tokens (`--ivory`, `--clay`, `--ink*`, and so on), the Fraunces and Public Sans fonts, the rounded cards and chips, and the 24px round-stroke icons (`svgi(...)`). Do not introduce a new visual style.
2. **Every release bumps the version** in all of these places:
   - `index.html`: the comment at the top of `<style>` (`/* ── vX.Y.Z — …`), the sign-in brand line (`Order Tracker · vX.Y.Z`) and `const APP_VERSION = 'vX.Y.Z'`.
   - `cut/index.html`: the comment at the top of `<style>`, the sign-in brand line and `const CUT_VERSION`. These match the app version.
   - `sw.js`: the header comment and `const CACHE = 'af-orders-v1.3.N'`, where N goes up by 1 each release.
   - The commit title ends with `(vX.Y.Z)`.
3. **When handing over a commit, put the commit message and the description in separate code blocks.**
4. **Keep solutions simple.** Make small, local changes, add no dependencies and no build tooling, and match the comment style around the code you change.

## Data and features
- **Firestore**
  - `projects` holds one document per order. Fields include `client`, `phone`, `item`, `notes`, `internalNotes` (admin-only on screen), `projectType`, `status` (0–4, where 4 means delivered), `items[]`, `amount`, `advance`, `payments`, `activityLog` (newest first), `archived`, `orderNo`, `createdAt` and `driveFolderUrl`. Each item in `items[]` has `name`, `l`, `b`, `w`, `qty`, `unit` and an optional `note` (v3.78.0).
  - `settings/app` holds app settings and `lastOrderNo`.
- **Order numbers** (v3.59.0): orders are numbered #1001 and up. `_nextOrderNo()` hands out each number inside a transaction, and numbers are never reused. Older orders without a number are backfilled oldest-first the first time an admin loads the app (`backfillOrderNos`).
- **Cut lists** (v3.60.0):
  - Storage: one `cutlists/{orderId}` doc per order, holding `orderNo`, `client`, `title`, `deadline`, `hidden`, `active`, `notes`, `dept: 'wood'` and `pieces[]`.
  - Each piece has `id`, `name`, `l`, `w`, `t` (inches), `qty`, `wood`, `note`, `done`, `doneBy`, `doneAt` and `createdAt`. The `note` comes from the order item when the list is copied from the items, can be edited in the cut list editor, and shows under the piece name on the tablet and the slip.
  - Editing: admins edit a cut list from the saw icon on woodwork order cards. Saves run in a transaction that keeps the workshop's ticks.
  - Sync: `syncCutLists()` keeps the name, number and deadline in step with the order. `hidden` is set when the order is delivered or archived.
  - Copy from items (v3.62.0): a new cut list starts from the order's items, mapping L → L, B → W, W → T and keeping the qty. "Copy sizes from order items" adds any items that aren't on the list yet.
  - Carpenters: names live in `workshop/config.carpenters` and are edited in Settings.
  - Tablet: it can mark one piece, a selected group, or every remaining piece as cut, and it records who did it and when. Sizes show as `63" x 3" x 3"`. "Start cutting" pins a project to the "Cutting now" section.
  - Back button (v3.68.0): one guard history entry catches Android's Back. Opening a project (narrow screens), Select mode or the name picker registers a layer (`openLayer`/`closeLayer`), and Back closes the top layer. On the project list, the first Back shows "Press back again to exit" and drops the guard for 2 seconds, so a second Back exits. The header shows `CUT_VERSION`.
  - Language (v3.69.0): the tablet is in Hindi by default. The हिं / EN header button switches language and is remembered in localStorage (`af-cut-lang`). All tablet text lives in `WORDS` (department words) and `TX` (everything else), in `en` and `hi`, and is reached through `W()` / `L()`. The printed slip follows the language. Names, sizes and "Nos" are not translated.
  - Print (v3.65.0): the tablet's Print button fills `#slip` and calls `window.print()`. Print CSS lays it out for a 58 mm (2-inch) roll at `@page size:58mm`. The shop's printer is an "EZO" 2-inch Bluetooth roll printer, reached through Android's Print screen with the RawBT print service app.
  - Lathe (v3.67.0): Lathe Work orders get the same list with `dept: 'lathe'`; `cutMeta` sets `dept` from the order's type. A lathe order is tracked twice:
    - Its pieces are cut on the tablet's Woodwork tab, which uses `done`/`doneBy`/`doneAt` and the `active` pin.
    - They are then turned on the Lathe tab, which uses `turned`/`turnedBy`/`turnedAt` and the `activeLathe` pin.
    - The Woodwork tab shows every list. The Lathe tab shows only lathe orders and says "turned" instead of "cut".
    - Lathe cards show both "Cut x/n" and "Turned y/n".
    - The tablet remembers its tab in localStorage (`af-cut-dept`). Lists without `dept` count as woodwork.
  - Timber Supply / CNC Work (v3.75.0): project types `timber` and `cnc`, each with its own section, KPI card and type button.
    - Timber cut lists use `dept: 'wood'`, so they appear only on the Woodwork tab. New timber orders start with `drawingNA: true` (No drawing).
    - CNC works like lathe: `dept: 'cnc'`. Its wood is cut on the Woodwork tab (`done`), then the CNC step is done on the tablet's CNC tab (`cnc`/`cncBy`/`cncAt`, pin `activeCnc`). Cards show "Cut x/n" and "CNC y/n".
    - On the order cards, `isLathe` means "has a second step" (lathe or CNC), and `step2` picks the right field and label.
  - Cut size OK (v3.70.0): each piece has `cs`, a list of the sides (`'l'`, `'w'`, `'t'`) where a cut size is acceptable (the standard ¼" less, which the carpenters know). The editor toggles it with the "=" button under each size box. The tablet and slip show those numbers double-underlined (`sizeHtml`), with no extra text.
  - Fractions (v3.71.0): sizes are displayed with single-character fractions (`fmtSize`, which is in both `index.html` and `cut/index.html`). For example, "2 1/2", "2.5" and "5/2" all show as 2 ½ (non-breaking space after the whole number), "0.25" shows as ¼, and odd ones like 3/16 show as ³⁄₁₆. Decimals become fractions only when they land exactly on a 1/16. Stored values and form inputs stay exactly as typed.
  - Hold pieces (v3.72.0): a piece with `hold: true` is set by the office with the "Hold" button in the editor.
    - On the tablet it is listed last under "होल्ड — अभी मत काटो", shown amber with a pause sign, and can't be ticked.
    - It is left out of "x of n" and shown as "2 होल्ड" instead.
    - It keeps the project out of Done (`isDone` needs every piece done) until the hold is released or the piece deleted.
    - The slip prints it last with "होल्ड" in place of the tick box and its size struck through.
    - Order cards show an "N on hold" chip.
  - Counts in Nos (v3.77.0): every count adds up the pieces' qty (blank = 1), so a "Wood Panel × 12 Nos" line counts as 12. This covers the tablet's "x Nos में से y कटा", header, hold count, prompts and slip footer (`nosOf`), and the order cards' Cut / Turned / CNC chips and "N Nos on hold". A line is still ticked as a whole; partial cuts are for later.
  - Naming (v3.74.1): the orders app calls it "Cut list" for every order, lathe ones included. Only the tablet's Lathe tab says लेथ लिस्ट.
  - Card details (v3.74.1): the list icon, or a tap on the Cut / Turned chips, opens a "Cut list (n)" block with each piece's size, qty and ✓ Cut / ✓ Turned / On hold status. Hovering a status shows who did it.
  - Card button: the cut-list button (prep row) is plain when there is no list, orange (`.prep`) once a list exists, and green (`.has`) when everything is cut (and, for lathe orders, turned).
- **Drawing and prep row** (v3.74.0):
  - The drawing state is `drawingDone` / `drawingNA`, and each tap cycles it: pending (plain) → done (green) → not needed (red) → pending.
  - "Drawing pending" counts only pending drawings (`needsDrawing`).
  - The drawing and cut-list buttons sit in their own labelled row on the card (`.oc-prep` / `.prep-btn`), above the action icons.
- **Order form** (v3.78.0): one column on desktop (no side-by-side columns): project type chips, then client / phone / dates in one row, description and amounts, the Hold and Drive Folder switches, the items table, the two notes boxes and Status as a row of chips. The title and the Save/Cancel row stay put while the body scrolls.
  - Items are a table on desktop: # · Item · L · B · W · Qty · Unit · Note · × (`.items-head`, and the row's wrappers are `display:contents`). On phones each item stays a small card with the note box underneath.
  - The Items heading shows "6 items · 13 Nos" (`updateItemsSum`).
- **Section ribbons** (v3.76.0): each section header on the list (`sectionHeader`) is a band in its type's soft colour with a 4px left stripe in the strong colour (`--sb` / `--sc`), so the sections are easy to tell apart while scrolling.
- **Priority order** (v3.73.0): each project has a numeric `rank`; within a section, lower ranks are shown first.
  - Ranks were backfilled once in due-date order (`backfillRanks`). New orders get `_nextRank()`, which puts them at the end.
  - The sort switch above the list offers "My order" (rank), "Due date" or "Order date". It is remembered in localStorage (`af-sort`).
  - In "My order", admins drag cards within a section on desktop (HTML5 drag and drop on `.order-card.movable`), or use the Move to front / Earlier / Later buttons in the card details. `applyOrder` reuses the section's own ranks and saves them in one `writeBatch`.
  - `cutMeta` copies `rank` to the cut list, and the tablet sorts by rank, then due date.
- **Drive folders**: `createDriveFolder` POSTs the order to an Apps Script webhook with `client`, `projectType`, `orderNo` and `otherLabel`. The script then writes the folder URL back to the order document.
- **Keyboard shortcuts**:
  - `N` opens a new order (admins only).
  - `R` opens or closes Reports (admins only).
  - `H` goes Home.
  - Cmd/Ctrl+S saves the order form or the cut list.
  - Cmd/Ctrl+F jumps to search.
  - Esc closes the small dialogs, but never the order form.
  - Tab stays inside the open dialog. The app moves focus itself, so buttons and dropdowns are reached in every browser (Safari's own Tab skips them).
  - Order items (v3.75.1, v3.78.0): Tab goes through the switches → item rows (Name → L → B → W → Qty → Unit → Note) → "+ Add Item" → Notes → Internal Notes → Status; the row's × button is skipped. Enter in an item row jumps to the next row, or adds a new one from the last row. Empty rows are dropped on save.
  - None of the plain-letter shortcuts fire while typing or while a dialog is open.

## Backlog (noted by the owner, not started)
1. **Drive folder script.** Put `orderNo` in the folder names. The owner will paste the Apps Script.
2. **"Paste items" box.** Fill an order's item rows from a pasted list.
3. **Order numbers.** Confirm the existing orders were numbered from #1001.
4. **Cut-list workflow change.** The owner will explain it later.
5. **Firestore rules.** `isAdmin()` lists only rahulshrm195@gmail.com. Add rahul@ and father@amarfurniture.in if they should create orders.
