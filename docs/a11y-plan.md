# Accessibility Plan — Student Finance Tracker

## 1. Target standard
WCAG 2.1 Level AA. Manual testing with keyboard only + screen reader (NVDA on Windows), automated checks with axe DevTools / Lighthouse.

## 2. Known gaps in current markup (index.html)
- `<label>` elements (e.g. "Amount (K)", "Source", "Category", "Date") are not associated with their inputs via `for`/`id` — only positional/visual association. Screen readers won't announce the label when the input is focused.
- Font Awesome icons used as the *only* content of a control (sort icon, filter icon, ellipsis menu, chevron) have no `aria-hidden="true"` on the `<i>` and no accessible text on the parent — relies on visible text next to them, but icon-only buttons (e.g. `card-menu`, `modal-close`) have no `aria-label`.
- Dropdowns (`filter-dropdown`, `card-menu-dropdown`, sort/filter menus) are shown/hidden via inline `style.display`, with no `aria-expanded` on the trigger and no `role="menu"`/`role="menuitem"` on the items. Keyboard users can't tell open/closed state is exposed to AT.
- Modals (`modal-overlay`) lack `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing at the modal title. No documented focus trap or focus return to trigger on close.
- Tabs (`tab-btn`) are plain buttons with a `tab-active` class for state, not `role="tab"`/`aria-selected`, and the tab list has no `role="tablist"`.
- Table sort controls don't expose `aria-sort` on `<th>`.
- Color is the only signal for income vs. expense in some places (legend dots, amount coloring) — needs a text/icon backup, already partly covered by icons (arrow-up/arrow-down) on FABs but not consistently in the table/cards.
- Dashboard numbers (monthly income/expenses, budget remaining) update via JS with no `aria-live` region — screen reader users get no notification when totals change after adding a transaction.
- Hidden "other note" field groups are toggled via inline style with no `aria-hidden`/focus management — a hidden field could remain in the tab order in some browsers.

## 3. Plan by milestone

### M2 (Semantic HTML & Base CSS)
- Use semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>` (already present).
- Ensure heading order is logical (h1 → h2 → h3, no skipped levels).
- Base CSS: visible `:focus-visible` outline on all interactive elements, minimum 4.5:1 text contrast, no information conveyed by color alone in default styles.

### M3 (Forms & Regex Validation)
- Add `for`/`id` pairing on every `<label>`/input in the income, expense, budget, and category modals.
- Associate validation errors with inputs via `aria-describedby` pointing at an error `<span>` with `role="alert"` (or `aria-live="polite"`).
- Mark required fields with `aria-required="true"` (in addition to `required`) and indicate visually (already using native `required`).
- `tests.html` includes at least one assertion that checks error text is present/associated, not just that validation logic returns true/false.

### M4 (Render + Sort + Search)
- Add `aria-sort="ascending|descending|none"` to sortable `<th>` elements, updated on sort change.
- Make sort/filter dropdown triggers proper buttons with `aria-haspopup="listbox"` (or `menu`) and `aria-expanded` toggled in JS alongside the `style.display` toggle.
- Highlighted search matches use a `<mark>` element (not just a background-color span) so meaning survives without color.

### M5 (Stats + Cap/Targets)
- Wrap dashboard summary numbers (`#monthly-income`, `#monthly-expenses`, `#total-remaining`, budget cap warnings) in a container with `aria-live="polite"` so updates are announced.
- Budget-cap-exceeded warning gets `role="alert"` (assertive) since it requires immediate attention; routine totals stay `polite`.
- Any progress bar/visual cap indicator gets `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, plus a plain-text percentage.

### M6 (Persistence + Import/Export + Settings)
- Import/Export buttons already have `aria-label` — keep this pattern consistent for every icon-only or icon+ambiguous-text button added later.
- After import/export/clear actions, surface a confirmation message in a `aria-live="polite"` status region rather than (or in addition to) any alert/toast that disappears.
- File input for import stays keyboard-operable (native `<input type="file">`, already present).

### M7 (Polish & A11y Audit)
- Full keyboard-only pass: tab order through header → nav → tab content → FABs → modals; verify no keyboard trap and that Escape closes modals/dropdowns.
- Add `role="dialog"` + `aria-modal="true"` + `aria-labelledby` to every `.modal-overlay`, trap focus while open, return focus to the triggering element on close.
- Convert `.tab-nav` to `role="tablist"` with `role="tab"`/`aria-selected` on buttons and `role="tabpanel"` on each `.tab-view`.
- Add `aria-label` (or `aria-hidden="true"` + visible adjacent text) to every icon-only control still missing one (card menu ellipsis, chevrons, search icon button).
- Run axe DevTools and Lighthouse accessibility audit, fix all flagged issues, record before/after scores in README.
- Record the 2–3 min demo video showing at least one full keyboard-only flow (add a transaction, see live-updated total, open and close a modal without a mouse).

## 4. Testing checklist (re-run before each milestone push)
- [ ] Tab through entire page with mouse unplugged (keyboard only).
- [ ] All interactive elements have a visible focus indicator.
- [ ] All form inputs have a programmatically associated label.
- [ ] All icon-only buttons have accessible names.
- [ ] Dynamic content (totals, validation errors, import/export results) is announced via `aria-live` or `role="alert"`.
- [ ] Color contrast checked for text, icons, and focus indicators (4.5:1 normal text, 3:1 large text/icons).
- [ ] axe DevTools scan run with zero critical/serious issues.
