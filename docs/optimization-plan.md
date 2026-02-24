# Optimization Plan

Eight focused commits across the five areas identified. Each commit is self-contained — they can land in order or individually.

---

## Area 1: YouTube API resilience

### Commit 1 — Token refresh wrapper for all API calls

**Problem:** `refreshToken()` retry is wired up in exactly one place (`main.ts` like button handler). Every other API call — `fetchSubscriptions`, `buildRecommendations`, `searchVideos` — surfaces a raw "YouTube API error 401" to the user if the token expires mid-session.

**Approach:** Add a `withTokenRefresh<T>(fn: (token: string) => Promise<T>): Promise<T>` helper to `auth.ts`. It calls `fn` with the current token, catches any error whose message contains `401`, refreshes once, and retries. All call sites swap to using this wrapper.

**Files changed:**
- `src/auth.ts` — add and export `withTokenRefresh`
- `src/pregame.ts` — wrap `fetchSubscriptions` and `buildRecommendations` calls
- `src/main.ts` — replace the manual retry on the like button with `withTokenRefresh`; add it to `getVideoRating` call

---

### Commit 2 — Script load timeouts

**Problem:** `loadYTApi()` (`player.ts`) and `loadGISScript()` (`auth.ts`) wait indefinitely. On a slow or blocked network, the app hangs with no feedback — no spinner timeout, no error, no fallback.

**Approach:** Wrap each script load promise in a `Promise.race` against a `setTimeout` reject (10 seconds). On timeout, reject with a descriptive error so the caller's existing error handler surfaces it.

**Files changed:**
- `src/player.ts` — race `loadYTApi()` against 10s timeout
- `src/auth.ts` — race `loadGISScript()` against 10s timeout

---

## Area 2: Cleanup / memory

### Commit 3 — Fix debounce leak on pregame unmount and add page unload stop

**Problem 1:** The search debounce `setTimeout` in `pregame.ts:170` is allocated in `attachListeners()`. When `unmount()` is called (e.g. user clicks a video), the timeout is not cancelled. If it fires after unmount it calls `handleSearch()` which calls `this.render()` on a detached element — harmless today but will throw once the element is fully removed from any parent.

**Problem 2:** The game's RAF loop (`game.ts`) runs for the entire page lifetime even when the tab is hidden. `stop()` already exists and works; it's just never wired to `visibilitychange` or `pagehide`.

**Approach:**
- `pregame.ts`: promote `debounce` to an instance field; call `clearTimeout(this.debounce)` in `unmount()`.
- `main.ts`: listen for `pagehide` (more reliable than `beforeunload` for mobile/bfcache) and call `game.stop()`.

**Files changed:**
- `src/pregame.ts` — instance-level debounce handle, cleared in `unmount()`
- `src/main.ts` — `pagehide` → `game.stop()`

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

### Commit 8 — Sanitize error messages before display

**Problem 1 (XSS):** `pregame.ts:128` renders `this.errorMessage` directly into an `innerHTML` string. `errorMessage` is set from `err.message`, which for YouTube API errors contains the full HTTP response body (JSON with quota codes, endpoint details). A crafted API error containing `<script>` tags would execute.

**Problem 2 (UX):** Raw messages like `"YouTube API error 403: { code: 403, message: 'quotaExceeded', ... }"` are unhelpful and expose internals.

**Approach:**
- Add a `friendlyError(err: unknown): string` utility function that pattern-matches known conditions (`401` → "Session expired — try signing in again", `403` with `quotaExceeded` → "Daily API quota reached — try again tomorrow", network errors → "Check your connection") with a generic fallback.
- `buildBody()` uses `textContent` assignment instead of injecting into `innerHTML`, eliminating the XSS vector. Since `buildHTML()` builds a string, escape the message before interpolation using a simple `escapeHtml()` helper.

**Files changed:**
- `src/pregame.ts` — `friendlyError()` mapper, `escapeHtml()` helper, apply to error display

---

## Commit sequence summary

| # | Area | Commit message (draft) |
|---|---|---|
| 1 | API resilience | `fix: refresh token on 401 for all YouTube API calls` |
| 2 | API resilience | `fix: add 10s timeout to GIS and YouTube iframe API script loads` |
| 3 | Cleanup | `fix: cancel search debounce on pregame unmount; stop RAF on pagehide` |
| 4 | Quota | `fix: clear search cache from sessionStorage on client switch` |
| 5 | Quota | `feat: paginate subscriptions beyond first 50` |
| 6 | UX | `fix: persist playback speed across video changes` |
| 7 | UX | `feat: restore recommendations when search is cleared` |
| 8 | Errors | `fix: sanitize and map API errors to friendly messages` |

Commits 1–4 are pure fixes with no visible behavior changes for the happy path. Commits 5–8 have visible UX impact and should get a quick smoke-test after each.
