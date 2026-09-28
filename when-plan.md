# When — Timezone Converter: Implementation Plan

## Overview

**When** is a static single-page web application hosted on GitHub Pages.
It solves the problem of communicating a specific moment in time to people across different timezones.
A user picks a time (and date) using a visual time-slider, adds as many timezone rows as they like, then shares a URL that encodes a UTC timestamp — so anyone who opens the link sees the moment converted to their own local time automatically.

**Stack:** Plain HTML + CSS + Vanilla JS (no build step).
**Timezone library:** [Luxon](https://moment.github.io/luxon/) (CDN, includes IANA timezone data) with a curated city → IANA timezone JSON file.
**Hosting:** GitHub Pages (root of `main` branch).
**Design:** System-font stack, flat (no gradients), WCAG-AA accessible, dark mode via `prefers-color-scheme`.

### Problem Statement
Working across timezones is painful. When you want to announce an event, schedule a meeting, or simply say "let's talk at 3 PM", people in other countries have no quick mental model of what that means for them. **When** removes that friction: pick your moment, add the relevant cities, and share one link — everyone who opens it sees the exact same moment in their own local time, on their own date.

### Built with IBM Bob
This project was planned and developed using [IBM Bob](https://www.ibm.com/products/bob), an AI-powered coding assistant. Bob was used to:
- Define the problem statement and gather requirements through a structured planning session.
- Design the overall architecture (file structure, URL schema, data format).
- Generate the full implementation plan broken into reviewable sub-tasks.
- Write and review all code across each sub-task in Agent mode.

Bob's Plan mode was used to think through trade-offs (e.g. library choice, URL encoding strategy, accessibility requirements) before any code was written, ensuring a coherent design from the start.

---

## Architecture

```
index.html          — shell, loads all assets
css/style.css       — all styles (light + dark tokens)
js/app.js           — main controller: state, URL encode/decode, event wiring
js/slider.js        — TimeSlider component (canvas or SVG arc, sun/moon icons)
js/timezones.js     — timezone row manager (add, remove, render)
js/cities.js        — city search: fuzzy match against city-tz map, uses Luxon
data/cities.json    — curated list: [{city, country, tz}] ~500 entries
```

URL format: `?t=<unix-seconds-utc>[&tz=<IANA-name>...]`  
- `t` is the selected UTC moment (seconds since epoch).  
- `tz` repeats for each added timezone row so the recipient sees the same rows.

---

## Sub-Tasks

---

### 1. Project Scaffolding
**Status:** [ ] pending

**Intent**
Create the file and folder structure so every subsequent sub-task has a stable place to land. Also configure GitHub Pages deployment.

**Expected Outcomes**
- `index.html`, `css/style.css`, `js/app.js`, `js/slider.js`, `js/timezones.js`, `js/cities.js`, `data/cities.json` all exist with stub content.
- The page loads in a browser with no console errors.
- A `<meta>` viewport tag and ARIA landmark regions are in place.
- Luxon is loaded from CDN.
- Emoji favicon (🕐) inlined as SVG data URI in `<link rel="icon">`.

**Todo List**
1. Create `index.html` with semantic structure: `<header>`, `<main>`, `<footer>`, viewport meta, theme-color meta, Luxon CDN `<script>`, emoji favicon.
2. Create `css/style.css` with CSS custom properties for light/dark colour tokens (no gradients).
3. Create stub JS files (`app.js`, `slider.js`, `timezones.js`, `cities.js`) with empty module-style IIFE or ES module exports.
4. Create `data/cities.json` as an empty array `[]` (populated in sub-task 2).
5. Write `README.md` with: project name + tagline, problem statement, feature list, live URL placeholder, "Built with IBM Bob" section describing how Bob was used throughout the development process (planning, architecture design, implementation).

**Relevant Context**
- GitHub Pages serves from repo root on `main` branch — no `_config.yml` needed for plain HTML.
- Luxon CDN: `https://cdn.jsdelivr.net/npm/luxon@3/build/global/luxon.min.js` (sets `window.luxon`).
- Emoji favicon SVG trick: `<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><text y='32' font-size='32'>🕐</text></svg>">`.

---

### 2. City → Timezone Data
**Status:** [ ] pending

**Intent**  
Populate `data/cities.json` with a curated, compact set of world cities so users can search by city name and get the correct IANA timezone string.

**Expected Outcomes**
- `data/cities.json` contains ~400–600 entries covering every UTC offset, major cities on every continent.
- Each entry is `{ "city": "Lagos", "country": "NG", "tz": "Africa/Lagos" }`.
- The file is ≤ 50 KB uncompressed.

**Todo List**
1. Compile the city list from a reliable public domain source (e.g. derived from the `cities-and-timezones` npm package data or the IANA zone tab).
2. Normalise all entries to `{ city, country, tz }`, remove duplicates.
3. Sort alphabetically by city name for binary-search capability.
4. Write the final array to `data/cities.json`.

**Relevant Context**
- Luxon's `DateTime.local()` and `DateTime.setZone(tz)` accept IANA timezone identifiers directly.
- The file is fetched at runtime with a single `fetch('data/cities.json')`.

---

### 3. Time Slider Component
**Status:** [ ] pending

**Intent**  
Build the central visual interaction: a horizontal slider (0–23:59) that shows a sun icon during daytime hours and a moon icon at night, making it immediately intuitive to see whether the selected time is day or night.

**Expected Outcomes**
- A custom `<input type="range">` styled with a sun/moon icon that moves with the thumb.
- The icon switches between ☀ (sun) and 🌙 (moon) based on the selected hour (sun = 06:00–20:00, moon otherwise).
- The slider label reads the current selected time in 12 h / 24 h according to browser locale.
- The slider is keyboard-accessible (arrow keys, step = 15 min = value step of 1 in 96-step scale or minute resolution).
- Works on touch devices.

**Todo List**
1. In `slider.js`, define `TimeSlider` class that wraps a container `<div>` with an `<input type="range" min=0 max=1439 step=15>` (minutes in a day, 96 steps).
2. Add an absolutely-positioned icon element that tracks the thumb position across the full slider width.
3. Animate the icon transition: when crossing the 06:00 or 20:00 boundary, apply a CSS class that triggers a short scale + opacity crossfade between ☀ and 🌙 (CSS `transition: opacity 0.3s, transform 0.3s`). No JS animation libraries needed.
4. Simultaneously animate the track background colour using a CSS `transition` on the `--track-day-color` / `--track-night-color` custom property switch so the colour shift feels smooth.
5. Expose `getValue()` → minutes-since-midnight and `setValue(mins)` for external control.
6. Emit a custom `timechange` event on the container whenever the value changes.
7. Style in `css/style.css`: custom thumb (≥ 44×44 px touch target), track colour changes to reflect day (warm amber) vs night (cool indigo) — flat colours only, no gradients.

**Relevant Context**
- Day boundary: ☀ sun = 06:00–19:59 (minutes 360–1199), 🌙 moon otherwise. Fixed for phase 1; future phase can use sunrise/sunset data per location.
- Use CSS `--range-progress` trick or a JS-updated CSS variable to colour the track left of the thumb.
- Accessibility: `<input type="range">` already has keyboard support; add `aria-label="Select time"` and `aria-valuetext` with human-readable time string.
- Smooth feel: 15-minute steps give 96 positions — enough resolution without feeling choppy.

---

### 4. Date Picker
**Status:** [ ] pending

**Intent**  
Add a date input so the full UTC moment can be determined (not just time-of-day). Always visible — not optional.

**Expected Outcomes**
- A `<input type="date">` pre-filled with today's date in the user's local timezone.
- When the date changes, the displayed times across all timezone rows update.
- On mobile, the native date picker is used (no custom calendar widget needed).

**Todo List**
1. Add `<input type="date" id="date-picker">` in `index.html` inside the main controls section.
2. In `app.js`, read the date on load and on `change` event; combine with the slider minutes to form a Luxon `DateTime` in the local timezone, then convert to UTC for the shared timestamp.
3. Ensure the date input is labelled with `<label for="date-picker">Date</label>`.

**Relevant Context**
- Combine: `DateTime.fromObject({ year, month, day, hour, minute }, { zone: 'local' }).toUTC()`.
- When decoding a shared URL (sub-task 6), set the date input to the local-date equivalent of the UTC timestamp.

---

### 5. Timezone Rows
**Status:** [ ] pending

**Intent**  
Let users add city/timezone rows that show the selected time converted to each zone, with a remove button per row.

**Expected Outcomes**
- An "Add timezone" input with city autocomplete (searches `data/cities.json`).
- Each row shows: city name, country, IANA zone abbreviation, converted time, and the date (which may differ from the reference date).
- Rows show a **+1 day** / **−1 day** badge when the date differs from the local date of the selected moment.
- A "×" remove button on each row.
- The user's local timezone is always shown as the first pinned row (non-removable).

**Todo List**
1. In `cities.js`, implement `loadCities()` (fetch + cache) and `searchCities(query)` (case-insensitive prefix/substring match, returns top 8 results).
2. In `timezones.js`, implement `TimezoneRows` class:
   - `addRow(cityObj)` — creates DOM row, appends to `<ul id="tz-rows">`.
   - `removeRow(tz)` — removes by IANA string.
   - `updateAll(utcDateTime)` — re-renders all row times from a Luxon UTC DateTime.
3. The first row is the browser locale zone, rendered using `DateTime.local()` info. It is pinned (always first) but **not locked** — it has a "change" affordance (a small edit icon or re-type trigger) so the user can replace it with a different city. This covers cases like "I'm physically in Korea but planning from Malaysia".
   - Changing the local row updates the state's reference zone but does not affect the UTC moment.
4. Autocomplete dropdown: keyboard-navigable list (`role="listbox"`, `role="option"`, `aria-selected`).
5. Wire add/remove/change events in `app.js`.

**Relevant Context**
- Luxon: `dt.setZone(ianaName)` for conversion; `.toFormat('h:mm a')` or `'HH:mm'` depending on locale.
- Date difference: compare `.startOf('day')` of the local row vs the reference local row.

---

### 6. URL Sharing
**Status:** [ ] pending

**Intent**  
Generate and parse a shareable URL that encodes the selected UTC moment and the list of added timezone rows, so recipients see the same view converted to their own local time.

**Expected Outcomes**
- A "Copy link" button generates `?t=<unix-epoch-seconds>&tz=Africa/Lagos&tz=America/New_York` etc.
- On page load, if `?t=` is present, the slider, date picker, and timezone rows are restored from the URL params.
- The page `<title>` and `<meta name="description">` are updated dynamically to reflect the selected time for social sharing previews.
- A visual confirmation ("Link copied!") appears after copying.

**Todo List**
1. In `app.js`, implement `encodeState()` → URL string and `decodeState(searchParams)` → `{ utcMillis, timezones[] }`.
2. On "Copy link" click: call `encodeState()`, write to clipboard via `navigator.clipboard.writeText()`, show transient confirmation.
3. On page load: call `decodeState(location.search)`, hydrate slider + date picker + timezone rows.
4. Update `document.title` to e.g. `"When — Monday 14 Jul, 15:30 your time"` after any state change.

**Relevant Context**
- UTC seconds (not milliseconds) keeps URLs shorter.
- `URLSearchParams` natively supports repeated keys (`tz` appearing multiple times).
- Fallback for clipboard API failure: show a `<input readonly>` with the URL pre-selected.

---

### 7. Accessibility & Polish
**Status:** [ ] pending

**Intent**  
Ensure the app meets WCAG AA, works on mobile, and looks cohesive in both light and dark mode.

**Expected Outcomes**
- All interactive elements have visible focus rings.
- Colour contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for UI components).
- Page works at 320 px viewport width.
- Dark mode (via `prefers-color-scheme: dark`) inverts tokens without breaking contrast.
- No horizontal scroll on mobile.
- Smooth slider interaction on iOS/Android touch.
- `lang="en"` on `<html>`, `<title>` is meaningful, skip-nav link present.

**Todo List**
1. Audit focus styles — add `:focus-visible` outlines to all interactive elements.
2. Check colour tokens in `css/style.css` against WCAG AA; adjust if needed.
3. Test at 320 px: adjust layout to single-column, ensure slider thumb is ≥ 44×44 px touch target.
4. Add skip-nav `<a href="#main" class="skip-link">Skip to content</a>` in `index.html`.
5. Verify `aria-live="polite"` region exists for dynamic time updates so screen readers announce changes.
6. Final review: no `<div>` used where a semantic element fits, no `tabindex > 0`.

**Relevant Context**
- CSS custom properties defined in sub-task 1 make dark mode a single `@media (prefers-color-scheme: dark)` block that overrides tokens.
- Slider thumb size: `width: 2.75rem; height: 2.75rem` ensures 44 px touch target on most devices.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Plain HTML/JS | Zero build step; trivial GitHub Pages deploy |
| Timezone library | Luxon (CDN) | Full IANA support, small-ish, no build needed |
| City data | Bundled JSON | No API key, works offline/cached |
| URL encoding | UTC epoch seconds + repeated `tz` params | Short, human-debuggable, standard |
| Date input | Native `<input type="date">` | Free mobile picker, no custom widget |
| Slider | `<input type="range">` + CSS + JS icon | Accessible by default, no canvas needed |
| Colour theme | CSS custom properties, flat | Easy dark mode, no gradients |
| Favicon | Emoji 🕐 as inline SVG data URI | No image file needed, renders on all platforms |
| Slider steps | 15 min (96 steps) | Smooth feel, sufficient resolution for scheduling |
| Day/night boundary | Fixed 06:00–20:00 (phase 1) | Simple, consistent; sunrise/sunset per-city is a future phase |
| Local row | Pinned first but user-replaceable | Covers edge case of planning from a different location |
| README | Includes problem statement + IBM Bob section | Documents purpose and AI-assisted development process |

---

## Future Phases (out of scope for v1)
- Sunrise/sunset boundary per city based on date and latitude.
- "Best overlap" suggestion: highlight a time window where all added zones are within working hours.
- Calendar export (.ics) from the shared link.
