# Student Finance Tracker

# webpage link
https://gmweene-wq.github.io/Student-Finance-Tracker/
# video 
https://youtu.be/zhHlGUWjdZA

## Author
Built by Griphen Mweene
Github: (https://github.com/gmweene-wq) 
Email: g.mweene@alustudent.com

## Overview

A single-page, client-side finance tracker built for students. No account or backend required — everything is persisted in the browser's `localStorage`. Track income and expenses, set monthly budgets per category, and view spending trends across three currencies, all without a server.

## Features

- **Dashboard** — monthly income/expense cards, an overview chart, and a recent transactions list
- **Records** — full list of income and expense entries with search and filtering
- **Budgets** — set monthly spending limits per category and track progress against them
- **Settings** — manage expense categories, export/import data, and configure currency display
- **Multi-currency** — base currency (ZMW) plus RWF and USD, with manual exchange rates set in Settings (no external API)
- **About** — app info and contact information

## Tech Stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no build step.

## Project Structure

```
index.html              Markup for all five tabs (Dashboard, Records, Budgets, Settings, About)
styles/style.css         App styling
scripts/
  main.js                App entry point / wiring
  ui.js                  Tab switching, modals, rendering
  state.js               In-memory state management
  storage.js             localStorage persistence
  search.js              Transaction search
  validators.js          Form/input validation
seed.json                Sample transaction data
assets/data-model.txt    Data model & localStorage schema reference
assets/wireframes/       UI wireframes
tests.html               Manual/automated test harness
docs/a11y-plan.md        Accessibility plan
```

## Data Model

Transactions are stored under the `transactions` key in `localStorage` as a JSON array. Each record has:

| Field       | Type   | Notes                                      |
|-------------|--------|---------------------------------------------|
| id          | string | Sequential, e.g. `rec_0001`                 |
| type        | string | `income` or `expense`                       |
| description | string | Free-text note                              |
| amount      | number | Positive decimal                            |
| category    | string | Expense only                                |
| source      | string | Income only                                 |
| otherNote   | string | Used when category/source is "Other"        |
| date        | string | ISO date (`YYYY-MM-DD`)                      |
| createdAt   | string | ISO 8601 timestamp                          |
| updatedAt   | string | ISO 8601 timestamp                          |

Supporting keys: `expense_categories`, `budgets`, `rec_counter`.

See [assets/data-model.txt](assets/data-model.txt) for the full reference.

## Getting Started

No build step or dependencies — just open `index.html` in a browser.

```
git clone <repo-url>
cd Student-Finance-Tracker
open index.html
```

To load sample data, copy the contents of `seed.json` into the `transactions` key in your browser's `localStorage`.

## Regex Catalog

Form input is validated in [scripts/validators.js](scripts/validators.js) with the following patterns:

| Pattern | Regex | Purpose |
|---------|-------|---------|
| `DESCRIPTION_RE` | `/^\S(?:.*\S)?$/` | Rejects leading/trailing whitespace on the description field |
| `DOUBLE_SPACE_RE` | `/\s{2,}/` | Flags repeated/double spaces inside the description |
| `DUPLICATE_WORD_RE` | `/\b(\w+)\s+\1\b/i` | Catches an accidentally repeated word (e.g. "the the") |
| `AMOUNT_RE` | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | Positive number with up to 2 decimal places |
| `DATE_RE` | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | Strict `YYYY-MM-DD` date format |
| `CATEGORY_RE` | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | Letters, spaces, or hyphens only for custom categories |

`DATE_RE` is also reused by `validateJSONImport` to sanity-check each record's `date` field when importing a transactions JSON file in Settings.

## Keyboard Map

| Key | Context | Action |
|-----|---------|--------|
| `Enter` | New category input | Adds the category |
| `Enter` | Search field | Runs the search |
| `Escape` | Any open modal | Closes the modal and returns focus to the trigger element |
| `Tab` / `Shift+Tab` | Any open modal | Cycles focus within the modal (focus trap — wraps from last to first element and back) |
| `Tab` | Page body | Standard browser tab order through header → nav → tab content → FABs |

See [docs/a11y-plan.md](docs/a11y-plan.md) for the full keyboard-only testing checklist.

## Accessibility

The UI uses semantic HTML, ARIA roles (`tablist`/`tab`/`tabpanel`), and a skip-to-content link. See [docs/a11y-plan.md](docs/a11y-plan.md) for the full plan.

## Testing

Open [tests.html](tests.html) directly in a browser — there's no test framework or build step involved. It loads `storage.js`, `state.js`, and `validators.js`, runs a set of plain-JavaScript assertions against them, and prints a pass/fail summary on the page.

Before each milestone push, also run through the manual keyboard-only checklist in [docs/a11y-plan.md](docs/a11y-plan.md) (tab order, focus indicators, modal focus trap, `aria-live` announcements, and an axe DevTools scan).

## References

- Fonticons, Inc. (n.d.). *Font Awesome* (Version 6.4.0) [Icon set]. https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css
- MDN Web Docs. (n.d.). *MDN Web Docs*. Mozilla. https://developer.mozilla.org/
- W3C. (n.d.). *WAI-ARIA authoring practices guide*. https://www.w3.org/WAI/ARIA/apg/
- Codynn. (n.d.). *Build an expense tracker app with HTML, CSS & JavaScript | Beginner project* [Video]. YouTube. https://www.youtube.com/watch?v=gstzPdGYrgI

