# When — Timezone Converter

> Pick a moment in time, add cities, and share one link — everyone sees it in their own timezone.

🌐 **Live site:** [https://memilyc.github.io/when/](https://memilyc.github.io/when/)

---

## The Problem

Working across timezones is painful. When you want to announce an event, schedule a meeting, or simply say "let's talk at 3 PM", people in other countries have no quick mental model of what that means for them.

**When** removes that friction: pick your moment, add the relevant cities, and share one link — everyone who opens it sees the exact same moment converted to their own local time, on their own date.

---

## Features

| | Feature | Description |
|---|---|---|
| 🎚️ | **Visual time slider** | Drag a 0–23:59 slider. A ☀️ sun icon shows daytime and 🌙 moon shows night, with a smooth animated crossfade when crossing the boundary. |
| 📅 | **Date picker** | Pick a date alongside the time to pin an exact UTC moment — important when zones are 12+ hours apart and the date differs. |
| 🌍 | **City search** | Search 400+ cities worldwide by name. Each result shows the country and IANA timezone. |
| ➕ | **Unlimited timezone rows** | Add as many cities as you need. Each row shows the converted time, date, timezone abbreviation, and a day/night indicator. |
| 📆 | **Day offset badge** | Rows show **+1 day** or **−1 day** when the converted date crosses midnight relative to your reference timezone. |
| 🔗 | **Shareable link** | Click **Copy link** to copy a message and URL to your clipboard. The message lists every timezone with its converted time, then the link. Recipients open it and see the moment in their own local time automatically. |
| 💬 | **Rich copy format** | Copied text is ready to paste into any chat or email, e.g.:<br>`MYT, Kuala Lumpur, 9:00 PM`<br>`WAT, Lagos, 1:00 AM`<br>`https://memilyc.github.io/when/?t=...` |
| 💾 | **Remembers your cities** | Your timezone rows are saved to `localStorage` and restored on your next visit — no re-adding the same cities every time. |
| ✏️ | **Replaceable local row** | Your local timezone is pinned at the top but can be changed — useful if you're planning from a different location (e.g. you're in Seoul but scheduling from Kuala Lumpur). |
| 🎨 | **Three themes** | **Light**, **Dark**, and **Bob** — a teal-to-navy tech theme with Inter typography and a faint construction crane backdrop. Toggle top-right. |
| ♿ | **Accessible** | WCAG AA colour contrast, keyboard-navigable autocomplete, `aria-live` regions, skip-nav link, 44 px touch targets. |
| 📱 | **Mobile friendly** | Fully responsive from 320 px upward. Native date picker on mobile, large slider thumb, no horizontal scroll. |
| ⚡ | **No install, no build** | Plain HTML + CSS + vanilla JS. No frameworks, no bundler, no API keys. |

---

## How to Use

### 1. Set the time
Drag the **time slider** left or right to pick the hour and minute (15-minute steps). The large time display updates instantly. The slider thumb shows ☀️ during daytime (6 AM – 8 PM) and 🌙 at night, with a smooth animation when crossing the boundary.

### 2. Set the date
Use the **date picker** below the slider to choose a date. This matters when the cities you're comparing span more than 12 hours — the date can differ between them.

### 3. Add cities
Type a city name in the **search box** under Timezones (e.g. `Lagos`, `Seoul`, `London`). Select from the dropdown. Each city appears as a row showing:
- City name and country
- Converted time in that timezone
- Date (with **+1 day** / **−1 day** badge if it differs from your reference)
- Timezone abbreviation and day/night icon

Repeat for as many cities as you need. Your selections are remembered for next time.

### 4. Change your local timezone *(optional)*
The first row is your browser's local timezone, pinned at the top. Click **✏ Change** to swap it — for example, if you're in Korea but planning an event in Malaysia.

### 5. Share
Click **Copy link**. Your clipboard will contain:

```
MYT, Kuala Lumpur, 9:00 PM
WAT, Lagos, 1:00 AM
KST, Seoul, 5:00 AM
https://memilyc.github.io/when/?t=1753401600&tz=Africa%2FLagos&tz=Asia%2FSeoul
```

Paste this directly into a Slack message, email, or tweet. Anyone who opens the link sees the same moment in **their own local time**.

### 6. Switch themes
Click the icon button in the **top-right corner** of the header to cycle through themes:

| Icon | Current theme | Next theme |
|---|---|---|
| 🌙 | Light | Dark |
| ✦ | Dark | Bob |
| ☀️ | Bob | Light |

---

## Architecture

```
index.html          — semantic HTML shell, ARIA landmarks, Luxon CDN
css/style.css       — all styles: light, dark, and Bob theme tokens
js/app.js           — main controller: state, URL encode/decode, localStorage, theme toggle
js/slider.js        — TimeSlider component (sun/moon icon, animated day/night track)
js/timezones.js     — timezone row manager (add, remove, city search, day-offset badge)
js/cities.js        — 402 cities inlined as JS array; loadCities(), searchCities(), getCityByTz()
data/cities.json    — source city data: [{city, country, tz}]
```

**URL format:** `?t=<unix-seconds-utc>[&tz=<IANA-name>...]`
- `t` — the selected UTC moment (seconds since epoch)
- `tz` — repeats for each added timezone row so recipients see the same cities

---

## Technology

| Concern | Choice | Why |
|---|---|---|
| Framework | Plain HTML/JS | Zero build step; trivial GitHub Pages deploy |
| Timezone library | [Luxon](https://moment.github.io/luxon/) v3 (CDN) | Full IANA timezone support, locale-aware formatting |
| City data | Inlined in `js/cities.js` | Works on `file://` and offline; no fetch required |
| URL encoding | UTC epoch seconds + repeated `tz` params | Short, human-debuggable, standard `URLSearchParams` |
| Date input | Native `<input type="date">` | Free mobile picker, zero custom widget |
| Themes | CSS custom properties + `data-theme` attribute | Single token swap covers every component |
| Font (Bob theme) | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts | Modern, high-legibility, 700–800 weight |

---

## Running Locally

No install needed. Clone and open directly, or use a local server (required for any future fetch-based features):

```bash
git clone https://github.com/memilyc/when.git
cd when

# Option 1 — simplest
open index.html

# Option 2 — local server
npx serve .
# then open http://localhost:3000

# Option 3 — Python
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Built with IBM Bob

This project was planned and developed end-to-end using [IBM Bob](https://www.ibm.com/products/bob), an AI-powered coding assistant built by IBM.

### How Bob was used

**Plan mode — requirements & architecture**
Before writing a single line of code, Bob's Plan mode was used to think through the problem:
- Defined the problem statement and gathered requirements through a structured conversation.
- Evaluated trade-offs between library choices (Luxon vs. Intl API), URL encoding strategies, and accessibility approaches.
- Designed the full architecture: file structure, data shapes, URL schema, component boundaries.
- Broke the project into 7 reviewable sub-tasks, each with clear intent, expected outcomes, and relevant context.

**Agent mode — implementation**
Each sub-task was implemented in Bob's Agent mode:
- Bob generated all HTML, CSS, and JavaScript, following constraints agreed in Plan mode (mobile-first, WCAG AA, no gradients, flat colour tokens).
- Bugs (city search not working on `file://`, timezone rows showing wrong time, copy confirmation always visible) were diagnosed and fixed through Bob's code investigation tools.
- Features were added iteratively — localStorage persistence, Bob theme, rich copy format, theme cycle — each as a focused conversation turn.

**The development loop**
```
Describe feature or bug  →  Bob reads relevant code  →  Bob proposes minimal fix  →  Review & deploy
```

> Bob's Plan mode ensured a coherent design before implementation began.  
> Agent mode turned that design into working, deployed code — fast.

---

## Licence

MIT — see [LICENSE](LICENSE).
