# Optimization Plan

~~Eight~~ Six focused commits across the five areas identified (commits 1, 3, and 8 have already shipped). Each commit is self-contained — they can land in order or individually.

---

## Area 1: YouTube API resilience

### ~~Commit 1 — Token refresh wrapper for all API calls~~ ✓ Done

~~`withTokenRefresh` exported from `auth.ts`, applied at all call sites in `main.ts` and `pregame.ts`.~~

---

### Commit 2 — Script load timeouts

**Problem:** `loadYTApi()` (`player.ts`) and `loadGISScript()` (`auth.ts`) wait indefinitely. On a slow or blocked network, the app hangs with no feedback — no spinner timeout, no error, no fallback.

**Approach:** Wrap each script load promise in a `Promise.race` against a `setTimeout` reject (10 seconds). On timeout, reject with a descriptive error so the caller's existing error handler surfaces it.

**Files changed:**
- `src/player.ts` — race `loadYTApi()` against 10s timeout
- `src/auth.ts` — race `loadGISScript()` against 10s timeout

---

## Area 2: Cleanup / memory

### ~~Commit 3 — Fix debounce leak on pregame unmount and add page unload stop~~ ✓ Partially done

~~`pagehide` → `game.stop()` is wired in `main.ts:504`.~~ The debounce cancel in `pregame.ts` has **not** been done and remains outstanding — promote to a standalone fix if desired.

---

## Area 3: Quota management

### Commit 4 — Clear search cache on client switch

**Problem:** `switchClientId()` in `auth.ts:39-40` clears `yt_recommendations` and `yt_subscriptions` from localStorage, but leaves all `yt_search_${query}` entries in sessionStorage. After switching to a second account, stale search results from account 1 are returned immediately from cache.

**Approach:** In `switchClientId()`, iterate `sessionStorage` keys and remove any starting with `yt_search_`.

**Files changed:**
- `src/auth.ts` — clear search keys from sessionStorage in `switchClientId()`

---

### Commit 5 — Paginate subscriptions past the first 50

**Problem:** `fetchSubscriptions()` hardcodes `maxResults: '50'`. The YouTube API caps a single page at 50 results. Users with more than 50 subscriptions silently get an incomplete set, biasing recommendations toward their first 50 channels.

**Approach:** Follow `nextPageToken` in a loop until exhausted or a configurable cap (e.g. 200 = 4 pages × ~1 quota unit each). Add a `MAX_SUBSCRIPTION_PAGES` constant to `constants.ts`.

**Files changed:**
- `src/youtube.ts` — loop on `nextPageToken` in `fetchSubscriptions()`
- `src/constants.ts` — add `MAX_SUBSCRIPTION_PAGES = 4`

---

## Area 4: UX polish

### Commit 6 — Persist playback speed across video changes

**Problem:** `speedIndex` is declared inside `mountVideo()` (`main.ts:315`) and resets to `1` (1×) on every call. A user who sets 1.5× for a lecture must re-set it after every video skip.

**Approach:** Lift `speedIndex` to `startGame()` scope (alongside `videoList`, `currentVideoId`, etc.) so it survives across `mountVideo()` calls. `mountVideo()` reads the current `speedIndex` on init and applies it immediately after player is ready.

**Files changed:**
- `src/main.ts` — hoist `speedIndex` to `startGame()` scope; apply in player `onReady` callback

---

### Commit 7 — "Back to recommendations" after search

**Problem:** Once a user searches, `this.videos` is replaced with search results. The only way back to recommendations is the ↺ refresh button, which isn't labeled clearly and re-triggers a loading state (even if cache is warm). There is no "clear search" affordance.

**Approach:**
- Save the pre-search recommendations to `this.recommendedVideos` before overwriting `this.videos` in `handleSearch()`.
- When the search input is cleared (empty string), restore `this.videos` from `this.recommendedVideos` and re-render without an API call.
- Add a small "✕ Clear search" control next to the search input when results are showing.

**Files changed:**
- `src/pregame.ts` — `recommendedVideos` instance field; restore on clear; clear-search button in `buildHTML()`

---

## Area 5: Error message quality

### ~~Commit 8 — Sanitize error messages before display~~ ✓ Done

~~Shipped in commit `fcbf982 fix: sanitize and map API errors to friendly messages`.~~

---

## Area 6: Firebase error handling

### Commit 9 (optional) — Friendly errors for Firestore failures

**Problem:** `addScore` and `getTopScores` failures in `main.ts` surface as hardcoded
strings that don't distinguish between network errors and quota/permission issues. The
same `friendlyError()` pattern from commit 8 could be applied here.

**Approach:** Extend `friendlyError()` in `pregame.ts` (or extract to a shared util) to
handle Firebase error codes (`permission-denied`, `unavailable`, etc.) and apply at the
two call sites in `onGameOver`.

**Files changed:**
- `src/main.ts` — apply `friendlyError()` to `addScore`/`getTopScores` catch blocks

---

## Commit sequence summary

| # | Area | Commit message (draft) | Status |
|---|---|---|---|
| ~~1~~ | ~~API resilience~~ | ~~`fix: refresh token on 401 for all YouTube API calls`~~ | ✓ Done |
| 2 | API resilience | `fix: add 10s timeout to GIS and YouTube iframe API script loads` | Pending |
| ~~3~~ | ~~Cleanup~~ | ~~`fix: cancel search debounce on pregame unmount; stop RAF on pagehide`~~ | ✓ Partial (pagehide done; debounce cancel outstanding) |
| 4 | Quota | `fix: clear search cache from sessionStorage on client switch` | Pending |
| 5 | Quota | `feat: paginate subscriptions beyond first 50` | Pending |
| 6 | UX | `fix: persist playback speed across video changes` | Pending |
| 7 | UX | `feat: restore recommendations when search is cleared` | Pending |
| ~~8~~ | ~~Errors~~ | ~~`fix: sanitize and map API errors to friendly messages`~~ | ✓ Done |
| 9 (opt) | Firebase errors | `fix: friendly error messages for Firestore failures` | Pending |

Commits 2 and 4 are pure fixes with no visible behavior changes for the happy path. Commits 5–7 have visible UX impact and should get a quick smoke-test after each.
