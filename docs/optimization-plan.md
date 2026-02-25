# Optimization Plan

All commits have shipped.

---

## Area 1: YouTube API resilience

### ~~Commit 1 — Token refresh wrapper for all API calls~~ ✓ Done

~~`withTokenRefresh` exported from `auth.ts`, applied at all call sites in `main.ts` and `pregame.ts`.~~

---

### ~~Commit 2 — Script load timeouts~~ ✓ Done

~~`loadYTApi()` (`player.ts`) and `loadGISScript()` (`auth.ts`) each wrap their script load in a `Promise.race` against a 10-second `setTimeout` reject.~~

---

## Area 2: Cleanup / memory

### ~~Commit 3 — Fix debounce leak on pregame unmount and add page unload stop~~ ✓ Done

~~`pagehide` → `game.stop()` is wired in `main.ts`. `debounceTimer` is an instance field in `pregame.ts`; `unmount()` calls `clearTimeout(this.debounceTimer)` and nulls it.~~

---

## Area 3: Quota management

### ~~Commit 4 — Clear search cache on client switch~~ ✓ Done

~~`switchClientId()` in `auth.ts` iterates sessionStorage and removes all keys starting with `yt_search_`.~~

---

### ~~Commit 5 — Paginate subscriptions past the first 50~~ ✓ Done

~~`fetchSubscriptions()` in `youtube.ts` loops on `nextPageToken` up to `MAX_SUBSCRIPTION_PAGES` (= 4, defined in `constants.ts`).~~

---

## Area 4: UX polish

### ~~Commit 6 — Persist playback speed across video changes~~ ✓ Done

~~`speedIndex` is declared at `startGame()` scope in `main.ts` and applied via `ytPlayer?.setPlaybackRate(SPEED_RATES[speedIndex])` in the player `onReady` callback.~~

---

### ~~Commit 7 — "Back to recommendations" after search~~ ✓ Done

~~`pregame.ts` stores `recommendedVideos` as an instance field. `handleSearch('')` (triggered by clearing the input via debounce) restores `this.videos = this.recommendedVideos` and re-renders without an API call.~~ (Note: an explicit "✕ Clear search" button in `buildHTML()` was not confirmed; clearing the input is sufficient and fully functional.)

---

## Area 5: Error message quality

### ~~Commit 8 — Sanitize error messages before display~~ ✓ Done

~~Shipped in commit `fcbf982 fix: sanitize and map API errors to friendly messages`.~~

---

## Area 6: Firebase error handling

### ~~Commit 9 (optional) — Friendly errors for Firestore failures~~ ✓ Done

~~Shipped in commit `ab1e00c fix: friendly Firestore error messages; mark optimization commits done`.~~

---

## Commit sequence summary

| # | Area | Commit message (draft) | Status |
|---|---|---|---|
| ~~1~~ | ~~API resilience~~ | ~~`fix: refresh token on 401 for all YouTube API calls`~~ | ✓ Done |
| ~~2~~ | ~~API resilience~~ | ~~`fix: add 10s timeout to GIS and YouTube iframe API script loads`~~ | ✓ Done |
| ~~3~~ | ~~Cleanup~~ | ~~`fix: cancel search debounce on pregame unmount; stop RAF on pagehide`~~ | ✓ Done |
| ~~4~~ | ~~Quota~~ | ~~`fix: clear search cache from sessionStorage on client switch`~~ | ✓ Done |
| ~~5~~ | ~~Quota~~ | ~~`feat: paginate subscriptions beyond first 50`~~ | ✓ Done |
| ~~6~~ | ~~UX~~ | ~~`fix: persist playback speed across video changes`~~ | ✓ Done |
| ~~7~~ | ~~UX~~ | ~~`feat: restore recommendations when search is cleared`~~ | ✓ Done |
| ~~8~~ | ~~Errors~~ | ~~`fix: sanitize and map API errors to friendly messages`~~ | ✓ Done |
| ~~9 (opt)~~ | ~~Firebase errors~~ | ~~`fix: friendly error messages for Firestore failures`~~ | ✓ Done |

All 9 commits have shipped.
