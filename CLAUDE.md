# CLAUDE.md — ChipMind

> **Read this file entirely before writing a single line of code.**
> Every rule here is non-negotiable unless explicitly overridden in a task prompt.

---

## PROJECT SUMMARY

**ChipMind** is a casino dealer mental-math training PWA.
Target users: people preparing the Cerus Casino Academy croupier certification.
Source material: CCA preparation document (tables ×5 ×8 ×11 ×17 ×35, card counting, grids).

### Hard constraints

- No framework (no React, no Vue, no Svelte)
- No build step, no bundler, no transpiler
- Pure HTML / CSS / Vanilla JS only
- Fully offline via Service Worker
- Installable on Android and iOS (Web App Manifest)
- Single HTML file (`index.html`) — SPA routing only

---

## FILE STRUCTURE

```
/index.html               ← unique HTML entry point

/manifest.json
/sw.js                    ← service worker

/js/
  core/
    app.js                ← bootstrap, init
    router.js             ← SPA navigation (hash-based)
    state.js              ← global state (single source of truth)
    storage.js            ← IndexedDB wrapper
    sound.js              ← audio system
    achievements.js       ← achievements engine

  modules/
    module01.js           ← Tables croupier
    module02.js           ← Table mélangé
    module03.js           ← Comptage de cartes
    module04.js           ← Grilles de calcul
    module05.js           ← Paiements roulette
    module06.js           ← Multi-joueurs
    module07.js           ← Chrono 90 secondes
    module08.js           ← Suites logiques
    module09.js           ← Mémoire de séquence
    module10.js           ← Additions en cascade
    learningTables.js     ← Academy des Tables (learning, no stars)

/css/
  variables.css           ← design tokens (import first, always)
  base.css
  components.css
  modules.css

/assets/
  fonts/                  ← self-hosted .woff2 (see Fonts section)
  icons/
  sounds/
```

---

## GLOBAL STATE — MANDATORY STRUCTURE

One single state object, never duplicated:

```js
state = {
  settings: {
    difficulty: "beginner",    // "beginner" | "intermediate" | "expert"
    soundVolume: 0.8,          // 0.0 → 1.0  (default = 80%)
    musicVolume: 0.5,          // 0.0 → 1.0  (default = 50%)
    vibration: true
  },

  progress: {
    module01: {},
    module02: {},
    module03: {},
    module04: {},
    module05: {},
    module06: {},
    module07: {},
    module08: {},
    module09: {},
    module10: {},
    learningTables: {}         // steps only, no stars
  },

  history: [],                 // max 20 entries — see History System
  achievements: [],
  stats: {
    totalStars: 0,             // sum of stars from modules 01–10 only
    totalSessions: 0
  }
}
```

---

## STORAGE — IndexedDB ONLY

`localStorage` is **banned** for core data.

Implement and use exclusively:

```js
db.get(key)
db.set(key, value)
db.delete(key)
db.reset()
```

### Full reset (Settings > Reset)

Must execute all three steps, in order:

```js
indexedDB.deleteDatabase("ChipMindDB")
localStorage.clear()
caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
```

---

## SPA NAVIGATION

### Routing: hash-based only

Use `window.location.hash` (`#/`, `#/history`, etc.).
**Reason:** History API requires server-side config that breaks offline PWA. Hash routing works fully offline with no server.

`window.location.href` navigation is **forbidden**.
All views render inside a single `#root` container.

### 4 tabs — always visible at the bottom

| Tab | Icon | Hash route |
|-----|------|------------|
| Accueil | 🎰 | `#/` |
| Histoire | 📜 | `#/history` |
| Succès | 🏆 | `#/achievements` |
| Paramètres | ⚙️ | `#/settings` |

---

## SERVICE WORKER

File: `sw.js`
Cache name: `chipmind-v1` — **bump this string on every deploy**

Strategy: **Cache-first** for all static assets.

```js
// Assets to pre-cache on install:
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/variables.css',
  '/css/base.css',
  '/css/components.css',
  '/css/modules.css',
  '/js/core/app.js',
  '/js/core/router.js',
  '/js/core/state.js',
  '/js/core/storage.js',
  '/js/core/sound.js',
  '/js/core/achievements.js',
  // + all module files
  // + all font files in /assets/fonts/
]
```

On fetch: serve from cache, fall back to network. Never fail silently — log cache misses.

---

## FONTS — OFFLINE STRATEGY

Google Fonts CDN is **not usable** in a fully offline PWA.

**Required approach: self-host**

1. Download the following `.woff2` files into `/assets/fonts/`:
   - `PlayfairDisplay-Regular.woff2`
   - `PlayfairDisplay-Bold.woff2`
   - `RobotoMono-Regular.woff2`
   - `Lato-Regular.woff2`
   - `Lato-Bold.woff2`

2. Declare them with `@font-face` in `variables.css` (no external CDN link).

3. Fallback stack in CSS variables must work without any font file:
```css
--font-display: 'Playfair Display', Georgia, serif;
--font-mono:    'Roboto Mono', 'Courier New', monospace;
--font-body:    'Lato', 'Helvetica Neue', sans-serif;
```

4. Add all font files to the SW precache list.

**Do not add any `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` tag.**

---

## MODULE CONTRACT — STRICT FORMAT

Every module file **must** export exactly this shape:

```js
export const module = {
  id: "module01",          // matches filename, never change after creation
  type: "training",        // "training" | "learning"
  label: "Tables Croupier",
  icon: "♠",

  modes: [],               // e.g. ["flash", "qcm", "input"]
  difficulties: ["beginner", "intermediate", "expert"],

  render(container, state) {},   // draws the module UI into container
  start(config) {},              // begins a session, returns session object
  end(session) {},               // saves to storage, triggers achievements

  getProgress(state) {},         // returns { stars, bestTime, successRate }
  getStars(session) {},          // returns integer 0–3
  getAchievements(session) {}    // returns [] of unlocked achievement ids
}
```

Any module not matching this contract **will not be integrated**.
`type: "learning"` modules implement the same contract but `getStars()` always returns 0.

---

## PROGRESSION SYSTEM

### Stars per training module

- 3 difficulties × 3 stars each = **9 stars max per module**
- Only modules 01–10 (type `"training"`) contribute stars
- `learningTables` (type `"learning"`) contributes **zero stars** — achievements only

### Global progress formula

```
maxStars       = 10 × 9 = 90       ← fixed value, modules 01–10 only
globalProgress = totalStars / 90   ← displayed as %
```

### Dashboard displays

- Count of modules with 3★ on all difficulties (out of 10)
- Total sessions (all modules including learning)
- Total stars earned (out of 90)
- Global progression %

---

## HISTORY SYSTEM

Max **20 entries**. When full, drop the oldest.

Each entry shape:

```js
{
  date: "",             // ISO 8601 string
  moduleId: "module01",
  difficulty: "intermediate",
  successRate: 0.87,    // 0.0 → 1.0
  durationMs: 94000     // milliseconds  (field was named 'time' in v0 — do not use 'time')
}
```

---

## MODULES SPECIFICATION

---

### MODULE 01 — Tables Croupier

Tables: ×5 ×8 ×11 ×17 ×35 — from ×1 to ×20 (100 combinations total)

**Modes:**
- `flash` — show question + answer simultaneously (memorization, no input)
- `qcm` — 4 choices, one correct
- `input` — free text input, validated on Enter

**Stars (3 per difficulty, earned by mode):**
- 1★ Flash mode, 30 questions completed
- 2★ QCM mode, 30 questions, ≤ 2 errors
- 3★ Input mode, 30 questions, ≤ 2 errors

**Difficulty timing:**
- Beginner: no timer
- Intermediate: 30s/question
- Expert: 10s/question, unanswered = error

**Achievements:**
- 🥇 Gold: input mode, 0 errors, avg < 5s/question
- 🥈 Silver: input mode, avg < 7s/question
- 🥉 Bronze: 50 total questions answered across all sessions, 0 errors

---

### MODULE 02 — Table Mélangée

Multiplicands presented in random order. Player must find all 5 results (×5 ×8 ×11 ×17 ×35) for each row.

**Default session:** 10 questions (rows)

**Modes:** QCM, Input

**Difficulty timing:**
- Beginner: no timer
- Intermediate: 30s/question
- Expert: 15s/question

**Stars:**
- 1★ QCM, 20 questions, 0 errors
- 2★ Input, 10 questions, 0 errors
- 3★ Input, 20 questions, 0 errors

**Achievements:**
- 🥇 Gold: avg < 5s per line
- 🥈 Silver: avg < 7s per line
- 🥉 Bronze: avg < 12s per line

---

### MODULE 03 — Comptage de Cartes

Deck: 36 cards (Ace=1 to 9, four suits). Sum = **180**.

**Modes:**
- `montée` — cards shown one by one, player accumulates 0 → 180
- `descente` — player subtracts from 180 → 0
- `aller-retour` — full 0 → 180 → 0 without stopping

Player sees one card at a time and must validate the running total before the next card appears.

**Difficulty timing (per card):**
- Beginner: no timer
- Intermediate: 14s/card
- Expert: 10s/card

**Stars:**
- 1★ montée, 0 errors
- 2★ descente, 0 errors
- 3★ aller-retour, 0 errors

**Achievements:**
- 🃏 Mémoire du Tapis: aller-retour completed in < 5 min total
- ✅ Tout Complet: all 3 modes on all 3 difficulties, 0 errors
- 🎴 Demi-Jeu: montée OR descente perfect on expert

---

### MODULE 04 — Grilles de Calcul

Derived from CCA preparation grids.
- Grid 1: 176 integers (values 1–181, non-sequential, as per CCA document)
- Grid 2: 176 multiples of 5 (values 5–980, as per CCA document)

**Exercises (unlock progressively):**
1. Single cell shown → player states ×2, then ÷2 (two taps to validate)
2. Two adjacent cells → add them, then ×2 and ÷2 on the sum
3. Full row sum
4. Full column sum
5. Diagonal sum
6. Mixed: grey rows from Grid 1 combined with grey rows from Grid 2

**Difficulty:**
- Beginner: exercises 1–2 only, no timer, one operation at a time
- Intermediate: exercises 1–4, 30s/row
- Expert: all exercises, 20s limit, no hints

**Stars:**
- 1★ exercises 1–2 completed, 0 errors
- 2★ row sums (exercise 3), ≤ 2 errors
- 3★ column or diagonal (exercises 4–5), 0 errors

**Achievements:**
- 🥇 Gold: full grid traversal (all exercises), 0 errors, < 8 min
- 🥈 Silver: full grid, ≤ 3 errors

---

### MODULE 05 — Paiements Roulette

Realistic casino payout calculation scenarios.

**Payout reference:**

| Bet | Multiplier |
|-----|-----------|
| Plein (straight up) | ×35 |
| Cheval (split) | ×17 |
| Transversale (street) | ×11 |
| Carré (corner) | ×8 |
| Sixain (line) | ×5 |

**Difficulty:**
- Beginner: single bet, answer = gain only (e.g. 7 × 35 = 245)
- Intermediate: single bet, answer = total payout (gain + stake returned, e.g. 245 + 7 = 252)
- Expert: multiple simultaneous bets on different positions, 15s/scenario

**Stars:**
- 1★ 20 beginner scenarios, 0 errors
- 2★ 20 intermediate scenarios, 0 errors
- 3★ 10 expert multi-bet scenarios, 0 errors

**Achievements:**
- 🎰 Le Croupier: 30 scenarios total, 0 errors
- ⚡ Éclair: expert mode, avg < 8s/scenario

---

### MODULE 06 — Multi-Joueurs

Simulate a real roulette table: 2 to 4 players, each with different bets on different positions. Calculate each player's payout individually before moving to the next round.

**Difficulty:**
- Beginner: 2 players, 1 bet each, gain only
- Intermediate: 3 players, mixed bet types, total payout
- Expert: 4 players, multiple bets per player, 20s/round, total payout

**Stars:**
- 1★ 10 rounds, 2 players, 0 errors
- 2★ 10 rounds, 3 players, 0 errors
- 3★ 10 rounds, 4 players, < 20s/round, 0 errors

**Achievements:**
- 🎲 Chef de Table: 4 players, 0 errors, avg < 15s/round

---

### MODULE 07 — Chrono 90 Secondes

Simulation of the Cerus Casino Academy entrance test format.

**Format:** Maximum correct answers in exactly 90 seconds. Mix of additions and subtractions.

**Difficulty:**
- Beginner: numbers 1–50, QCM or input
- Intermediate: numbers 1–100, input only
- Expert: numbers 1–200, input only, no deletion once submitted

**Stars:**
- 1★ ≥ 20 correct answers
- 2★ ≥ 30 correct answers
- 3★ ≥ 40 correct answers

**Achievements:**
- ⏱️ Machine: ≥ 50 correct answers in one session
- 🎯 Sniper: ≥ 40 correct answers, 0 errors

---

### MODULE 08 — Suites Logiques

Complete arithmetic sequences using casino-relevant step values (+5, +8, +11, +17, +35, and combinations).

**Format:** Series of 8 numbers displayed, with 2–3 blanks to fill.

**Difficulty:**
- Beginner: one constant step (+5 or +8), one blank, QCM
- Intermediate: one constant step, two blanks, input
- Expert: alternating two-step sequences (e.g. +17 then −5), three blanks, input

**Stars:**
- 1★ 20 sequences, beginner, 0 errors
- 2★ 20 sequences, intermediate, 0 errors
- 3★ 15 sequences, expert, 0 errors

**Achievements:**
- 🧠 Logique Pure: 30 expert sequences, 0 errors

---

### MODULE 09 — Mémoire de Séquence

A sequence of numbers flashes briefly on screen. Player reproduces it from memory.

**Format:** Sequence displayed for N seconds → screen clears → player inputs sequence in order.

**Difficulty:**
- Beginner: 3 numbers, shown for 3s
- Intermediate: 5 numbers, shown for 2s
- Expert: 7 numbers, shown for 1.5s

**Stars:**
- 1★ 15 sequences, beginner, ≥ 80% perfect
- 2★ 15 sequences, intermediate, ≥ 80% perfect
- 3★ 15 sequences, expert, ≥ 75% perfect

**Achievements:**
- 🐘 Mémoire d'Éléphant: 7 numbers at 1.5s, 10 consecutive perfect

---

### MODULE 10 — Additions en Cascade

Chain additions: a starting number, then a stream of values to add one by one. Player tracks the running total mentally without writing it down.

**Format:** Number appears on screen → player holds total in memory → next number appears → and so on.
Validation frequency varies by difficulty (see below).

**Difficulty:**
- Beginner: 5 numbers, range 1–20, validate after each addition
- Intermediate: 8 numbers, range 1–100, validate every 3 additions
- Expert: 10 numbers, range 1–180, single validation at the very end only

**Stars:**
- 1★ 10 chains, beginner, 0 errors
- 2★ 10 chains, intermediate, ≤ 1 error
- 3★ 10 chains, expert, 0 errors

**Achievements:**
- 🌊 Cascade: 20 expert chains, 0 errors

---

### LEARNING MODULE — Academy des Tables

```
type: "learning"
getStars() always returns 0
Does NOT contribute to globalProgress or totalStars
Contributes to achievements only
```

**Tables covered:**
- School: ×2 ×3 ×4 ×5 ×6 ×7 ×8 ×9  (×1 and ×10 excluded — trivial)
- Casino: ×5 ×8 ×11 ×17 ×35

**Progression steps per table (sequential, each unlocks the next):**
1. Display — full table shown, no input (memorization)
2. Fill in order — complete the table top to bottom
3. Drag & drop — match multiplicands to results
4. Fill shuffled — same as step 2 with rows randomized
5. QCM — 4-choice questions
6. Input — free-text, validated on Enter
7. Bonus: memory card game (flip pairs to match)

Progress tracked per table per step. A table is "mastered" when all 7 steps are complete.

**Achievements (only rewards for this module):**
- 🥉 Bronze: all school tables completed through step 6
- 🥈 Silver: all school tables fully mastered (all 7 steps)
- 🥇 Gold: all casino tables fully mastered (all 7 steps)

---

## VISUAL DESIGN SYSTEM

### Design tokens — `variables.css`

```css
:root {
  /* Backgrounds */
  --color-felt:        #0a2e1a;   /* main green felt — primary bg */
  --color-felt-dark:   #071f12;   /* deeper felt — page bg */
  --color-surface:     #0f0f0f;   /* cards, modals */
  --color-surface-2:   #1a1a1a;   /* elevated surfaces, inputs */

  /* Accents */
  --color-gold:        #c9a84c;
  --color-gold-light:  #e8c96a;
  --color-red:         #c0392b;   /* casino red — errors, hearts/diamonds */
  --color-green-ok:    #27ae60;   /* correct answer flash */

  /* Text */
  --color-text:        #f0e6d3;   /* warm white — primary text */
  --color-text-muted:  #8a7a6a;   /* secondary text, labels */

  /* Suit colors */
  --color-spade:       #f0e6d3;   /* ♠ ♣ */
  --color-heart:       #c0392b;   /* ♥ ♦ */

  /* Typography — self-hosted, see Fonts section */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-mono:    'Roboto Mono', 'Courier New', monospace;
  --font-body:    'Lato', 'Helvetica Neue', sans-serif;

  /* Spacing scale */
  --sp-1: 4px;   --sp-2: 8px;   --sp-3: 12px;
  --sp-4: 16px;  --sp-6: 24px;  --sp-8: 32px;  --sp-12: 48px;

  /* Border radius */
  --radius-sm:   6px;
  --radius-md:   12px;
  --radius-lg:   20px;
  --radius-pill: 999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-std:  300ms ease;
  --transition-slow: 500ms ease;
}
```

### UI rules

- Mobile-first. Max content width: 480px, centered on desktop.
- Touch targets: minimum 48px height on all interactive elements.
- Decorative suits (♠ ♥ ♦ ♣) used in module headings and empty states.
- Correct answer: `--color-green-ok` flash + optional chip-drop sound.
- Wrong answer: `--color-red` flash + vibration (if `state.settings.vibration` is true).
- Module cards on dashboard: felt background, gold border (`--color-gold`), suit icon.
- Respect `prefers-reduced-motion` for all animations — no JS animation setting.

### Forbidden aesthetics

- No purple gradients anywhere
- No white or light backgrounds
- No generic sans-serif as primary display font
- No flat, colorless buttons

---

## SOUND SYSTEM

All audio goes through `sound.js`. Never call `new Audio()` directly in modules.

```js
sound.play(category)   // fire-and-forget, never blocks UI
```

**Categories:** `correct` `wrong` `levelUp` `achievement` `cardFlip` `chipDrop`

Rules:
- Read volume from `state.settings.soundVolume` (0.0–1.0) on every play call
- Read music volume from `state.settings.musicVolume`
- Gracefully fail if AudioContext is unavailable (iOS restriction, no interaction yet)
- Never throw — wrap all audio in try/catch

---

## SETTINGS PAGE

| Setting | Type | Default | State key |
|---------|------|---------|-----------|
| SFX Volume | Slider 0–100 | **80** | `soundVolume: 0.8` |
| Music Volume | Slider 0–100 | **50** | `musicVolume: 0.5` |
| Vibration | Toggle | On | `vibration: true` |
| Default Difficulty | Select | Beginner | `difficulty: "beginner"` |
| Reset all data | Button (destructive) | — | triggers `db.reset()` |

Note: animations are **not** a setting — handled automatically via `prefers-reduced-motion`.

---

## DEVELOPMENT WORKFLOW

Follow this sequence **for every task**, without exception:

1. **Read** — open and read every file relevant to the task
2. **Plan** — write a numbered implementation plan in plain language
3. **Wait** — do not write a single line of code until the plan is explicitly validated
4. **Implement** — one file at a time, one logical change at a time
5. **Explain** — after each file, describe what changed and why

### When modifying existing code

- Never remove logic without a confirmed replacement in the same task
- Never refactor and add a feature in the same step
- Flag any breaking change immediately with `⚠️` before proceeding

### Legacy cleanup rule

On first boot, if old localStorage keys exist and IDB is empty, **delete** localStorage — never read or transform the data. State restarts from defaults defined in `state.js`.

Implemented in `js/core/migrate.js → cleanLegacyStorage()`, called by `js/core/app.js → init()` before any state load.

The app is a complete SPA. All module pages live in `index.html`. No separate `.html` files per module.

---

## ABSOLUTE PROHIBITIONS

| Forbidden | Reason |
|-----------|--------|
| `import React` / `import Vue` / any framework | Framework-free constraint |
| `localStorage.setItem` for core data | IndexedDB only |
| Multiple `.html` files | SPA constraint |
| `window.location.href` for navigation | Router handles all navigation |
| `history.pushState` for routing | Hash-based router only |
| `<link href="fonts.googleapis.com/...">` | Offline PWA — self-host fonts |
| Bundlers, build scripts, `npm run build` | No build step |
| Inventing module data not in this spec | Ask before implementing |
| Skipping the plan step | Non-negotiable |

---

## DATA REFERENCE — CCA SOURCE MATERIAL

### Multiplication tables (casino)

| n | ×5 | ×8 | ×11 | ×17 | ×35 |
|---|----|----|-----|-----|-----|
| 1 | 5 | 8 | 11 | 17 | 35 |
| 2 | 10 | 16 | 22 | 34 | 70 |
| 3 | 15 | 24 | 33 | 51 | 105 |
| 4 | 20 | 32 | 44 | 68 | 140 |
| 5 | 25 | 40 | 55 | 85 | 175 |
| 6 | 30 | 48 | 66 | 102 | 210 |
| 7 | 35 | 56 | 77 | 119 | 245 |
| 8 | 40 | 64 | 88 | 136 | 280 |
| 9 | 45 | 72 | 99 | 153 | 315 |
| 10 | 50 | 80 | 110 | 170 | 350 |
| 11 | 55 | 88 | 121 | 187 | 385 |
| 12 | 60 | 96 | 132 | 204 | 420 |
| 13 | 65 | 104 | 143 | 221 | 455 |
| 14 | 70 | 112 | 154 | 238 | 490 |
| 15 | 75 | 120 | 165 | 255 | 525 |
| 16 | 80 | 128 | 176 | 272 | 560 |
| 17 | 85 | 136 | 187 | 289 | 595 |
| 18 | 90 | 144 | 198 | 306 | 630 |
| 19 | 95 | 152 | 209 | 323 | 665 |
| 20 | 100 | 160 | 220 | 340 | 700 |

### Card counting

- Deck: Ace(=1) to 9, four suits = 36 cards
- Sum: (1+2+3+4+5+6+7+8+9) × 4 = 45 × 4 = **180**
- Exercises: montée 0→180 / descente 180→0 / aller-retour 0→180→0

### Roulette payouts

| Bet type | Multiplier | Example: 7 chips bet |
|----------|------------|----------------------|
| Plein (straight up) | ×35 | gain: 245 / total: 252 |
| Cheval (split) | ×17 | gain: 119 / total: 126 |
| Transversale (street) | ×11 | gain: 77 / total: 84 |
| Carré (corner) | ×8 | gain: 56 / total: 63 |
| Sixain (line) | ×5 | gain: 35 / total: 42 |

*gain = bet × multiplier / total payout = gain + stake returned*

---

*Last updated: post-audit corrections — v2*