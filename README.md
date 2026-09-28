# When — Timezone Converter

> Pick a moment in time, add cities, and share one link — everyone sees it in their own timezone.

**Live site:** https://\<your-username\>.github.io/when

---

## Problem Statement

Working across timezones is painful. When you want to announce an event, schedule a meeting, or simply say "let's talk at 3 PM", people in other countries have no quick mental model of what that means for them. **When** removes that friction: pick your moment, add the relevant cities, and share one link — everyone who opens it sees the exact same moment in their own local time, on their own date.

---

## Features

- **Visual time slider** — drag a 0–23:59 slider with a sun ☀ / moon 🌙 icon that shifts with the time of day.
- **Native date picker** — combine time and date to pin an exact UTC moment.
- **Unlimited timezone rows** — search by city name and add as many zones as you need.
- **Day offset badge** — rows show **+1 day** or **−1 day** when the converted date crosses midnight.
- **Shareable URL** — a single "Copy link" button encodes the full state (`?t=<epoch-seconds>&tz=...`) so recipients see the same view in their local time.
- **Dark mode** — automatic, via `prefers-color-scheme`, no toggle needed.
- **Accessible** — keyboard-navigable, WCAG AA colour contrast, screen-reader friendly (`aria-live`, `role` attributes, skip-nav link).
- **No install, no build step** — plain HTML + CSS + vanilla JavaScript, hosted on GitHub Pages.

---

## Architecture

```
index.html          — shell, loads all assets
css/style.css       — all styles (light + dark tokens via CSS custom properties)
js/app.js           — main controller: state, URL encode/decode, event wiring
js/slider.js        — TimeSlider component (sun/moon icon, day/night track colour)
js/timezones.js     — timezone row manager (add, remove, render, day-offset badge)
js/cities.js        — city search: fuzzy match against city→tz map, uses Luxon
data/cities.json    — curated list: [{city, country, tz}] ~500 entries
```

**URL format:** `?t=<unix-seconds-utc>[&tz=<IANA-name>...]`  
- `t` — the selected UTC moment (seconds since epoch).  
- `tz` — repeats for each added timezone row so the recipient sees the same rows.

---

## Technology

| Concern | Choice | Why |
|---|---|---|
| Framework | Plain HTML/JS | Zero build step; trivial GitHub Pages deploy |
| Timezone library | [Luxon](https://moment.github.io/luxon/) (CDN) | Full IANA timezone support, no build needed |
| City data | Bundled JSON (`data/cities.json`) | No API key, works offline / from cache |
| URL encoding | UTC epoch seconds + repeated `tz` params | Short, human-readable, standard `URLSearchParams` |
| Date input | Native `<input type="date">` | Free mobile picker, zero custom widget |
| Colour theme | CSS custom properties, flat colours | Easy dark mode, no gradients |

---

## Getting Started

No install needed. Clone the repo and open `index.html` in any modern browser, or serve it locally:

```bash
git clone https://github.com/<your-username>/when.git
cd when
npx serve .          # or: python3 -m http.server 8080
```

Then open **http://localhost:3000** (or whichever port your server reports).

---

## Built with IBM Bob

This project was planned and developed end-to-end using [IBM Bob](https://www.ibm.com/products/bob), an AI-powered coding assistant.

### How Bob was used

**Plan mode — requirements & architecture**  
Before writing a single line of code, Bob's Plan mode was used to think through the problem clearly:
- Define the problem statement and gather requirements in a structured way.
- Evaluate trade-offs between library choices (e.g., Luxon vs. Intl API), URL encoding strategies, and accessibility approaches.
- Design the overall architecture: file structure, data shapes, URL schema, component boundaries.
- Break the project into reviewable, ordered sub-tasks with clear expected outcomes and relevant context per task.

**Agent mode — implementation**  
Each sub-task was implemented in Bob's Agent mode:
- Bob generated all HTML, CSS, and JavaScript files, following the design constraints agreed in Plan mode (mobile-first, no gradients, WCAG AA, system font, flat colour tokens).
- Stub files were created first (Sub-task 1) so every subsequent sub-task had a stable place to land, mirroring good engineering practice.
- Bob followed the single-responsibility principle for each JS module and added JSDoc comments throughout.
- All accessibility requirements (skip-nav, ARIA landmarks, `aria-live`, focus rings, 44 px touch targets) were checked against the plan at each step.

> Bob's Plan mode ensured a coherent design before implementation began. Agent mode turned that design into working code with minimal back-and-forth.

---

## Licence

MIT — see [LICENSE](LICENSE).
