# Hosting Strategy

## Recommendation: Vercel + `tetris.raywu.org` subdomain

**TL;DR** — Deploy to Vercel (free tier). Point a `tetris.raywu.org` CNAME at Vercel's DNS. The subfolder option is not viable with Svbtle.

---

## Why the subfolder option is off the table

`raywu.org` is served by **Svbtle**, a closed hosted platform. Svbtle controls the web server; you cannot configure it to proxy `/tetris/*` to a different origin, add rewrites, or serve files outside the blog engine. Unless you move `raywu.org` off Svbtle entirely, a subfolder path like `raywu.org/tetris-flow` is not achievable.

---

## Option comparison

| | Vercel (standalone) | Vercel + subdomain | GitHub Pages |
|---|---|---|---|
| URL | `tetris-flow.vercel.app` | `tetris.raywu.org` | `raywu.github.io/tetris-flow` |
| Cost | Free | Free | Free |
| DNS change required | No | Yes — one CNAME record | No (or one CNAME) |
| Custom domain support | Yes (on free plan) | Yes | Yes |
| Vite `base` config needed | No | No | Yes (`/tetris-flow/`) |
| Deploy on push | Yes | Yes | Manual or via Action |
| OAuth origin update needed | Yes | Yes | Yes |
| Cold-deploy setup friction | Very low | Low | Medium |

---

## Recommended path: Vercel + `tetris.raywu.org`

### Why Vercel

- Zero-config for Vite projects: detects the framework, sets build command (`npm run build`) and output dir (`dist/`) automatically.
- CDN edge caching out of the box — good for the static assets-heavy canvas game.
- Preview deployments on every PR branch, useful for testing changes before they hit the live URL.
- Free tier limits (100 GB bandwidth/month, unlimited personal projects) are more than enough for personal use.

### Why the subdomain over `*.vercel.app`

- Keeps the game under your own domain, consistent with your existing web presence at `raywu.org`.
- `tetris.raywu.org` is readable and memorable.
- No additional cost — Vercel supports custom domains on the free plan.

---

## Setup steps

### 1. Google Cloud: enable the YouTube Data API

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Library**, search for **YouTube Data API v3** and enable it. The app will silently fail at the subscriptions/search calls if this is skipped — there's no obvious error message.

### 2. Google Cloud: configure the OAuth consent screen

Go to **APIs & Services → OAuth consent screen**.

- **User type:** External
- **Publishing status:** Leave as **Testing** — you do not need to publish. In Testing mode only listed test users can sign in, which is fine for personal use and avoids the Google verification process entirely (which is required for apps using sensitive scopes like `youtube.force-ssl` if they go public).
- Under **Test users**, add your own Google account.
- **Scopes:** The app requests three scopes. Add all three on the consent screen:
  - `https://www.googleapis.com/auth/youtube.force-ssl` (sensitive — triggers the "not verified" warning, safe to proceed for personal use)
  - `profile` (non-sensitive — needed to display your name in the leaderboard)
  - `email` (non-sensitive — included alongside profile by GIS)

  Google will show a warning during sign-in ("this app is not verified") due to the YouTube scope. This is expected and safe to proceed through for personal use.

### 3. Firebase: set up Firestore

The leaderboard uses Firebase Firestore to persist scores. This requires a separate Firebase project.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. In the project, go to **Build → Firestore Database** → **Create database** → select **Native mode** and any region.
3. Go to **Authentication → Settings → Authorized domains** and add `tetris.raywu.org`. Firebase rejects Firestore writes from origins not on this list.
4. Go to **Firestore → Rules** and set:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{userId}/entries/{entry} {
      allow read, write: if true;
    }
  }
}
```

> `allow read, write: if true` is appropriate here — scores are non-sensitive personal data and the app has no Firebase Auth integration. If you later add Firebase Auth you can tighten this to `if request.auth.uid == userId`.

5. Go to **Project settings → General → Your apps** → **Add app → Web**. Register the app and copy the config values — you'll need them for the Vercel env vars in Step 6.

---

### 4. Google Cloud: update OAuth Client ID authorized origins

Go to **APIs & Services → Credentials** → your OAuth 2.0 Client ID (Web application type).

Under **Authorized JavaScript origins**, add:

```
https://tetris.raywu.org
http://localhost:5173
```

**Do not add anything under Authorized redirect URIs.** The app uses the GIS Token Client flow (implicit grant), which only checks the JavaScript origin — redirect URIs are not involved and adding them won't help if the origin is wrong.

If you're using a second OAuth client ID for quota switching (`VITE_GOOGLE_CLIENT_ID_2`), apply the same origin additions to that client as well.

> The origin check is exact: `https://tetris.raywu.org` (no trailing slash, must be `https`). A mismatch causes a `redirect_uri_mismatch` or `invalid_client` error in the GIS popup with no further detail.

### 5. Connect the repo to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import from GitHub.
2. Vercel auto-detects Vite. Confirm:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
3. Deploy once to get an initial `*.vercel.app` URL (needed for the next step).

### 6. Set environment variables in Vercel

Go to project **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | your primary OAuth client ID (ends in `.apps.googleusercontent.com`) |
| `VITE_GOOGLE_CLIENT_ID_2` | second client ID for quota switching, or leave blank |
| `VITE_FIREBASE_API_KEY` | Firebase project API key (from Project settings → Your apps) |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID (from Project settings → Your apps) |

**Critical:** `VITE_` prefixed variables are baked into the JavaScript bundle at build time by Vite — they are not runtime environment variables. This means:
- They will not be present if you just restart the deployment; you must trigger a new build.
- If you rotate a client ID, push any commit (even a whitespace change) to trigger a rebuild.
- Do not name them without the `VITE_` prefix expecting them to be available in the browser — they won't be.

After saving the variables, redeploy from the Vercel dashboard (or push a commit) so the build picks them up.

### 7. Add the custom domain in Vercel

In project **Settings → Domains**, add `tetris.raywu.org`. Vercel will display the DNS record to create.

### 8. Add the CNAME at your registrar

In whatever DNS provider manages `raywu.org` (your domain registrar — not Svbtle, which only controls the web server):

```
Type:  CNAME
Host:  tetris
Value: cname.vercel-dns.com
TTL:   auto (or 3600)
```

> If you use Cloudflare, set the record to **DNS-only** (grey cloud, proxying off). Cloudflare proxying interferes with Vercel's TLS certificate provisioning via Let's Encrypt.

Vercel auto-provisions a TLS cert once the CNAME propagates (usually a few minutes, up to an hour).

### 9. No Vite config changes needed

Because the app lives at the root of `tetris.raywu.org`, the default Vite `base: '/'` is correct. No changes to `vite.config.ts` are required.

---

## Continuous deployment

Once connected, Vercel deploys automatically on every push to `main`. The `npm run build` script runs `vitest run && tsc && vite build`, so failing tests or type errors will abort the deploy — a useful safety net.

To deploy a preview of a feature branch: push the branch to GitHub; Vercel creates a unique preview URL automatically.

---

## Summary

| Decision | Choice |
|---|---|
| Host | Vercel (free tier) |
| URL | `tetris.raywu.org` |
| Subfolder at raywu.org | Not viable (Svbtle restriction) |
| DNS record | `CNAME tetris → cname.vercel-dns.com` |
| Cloudflare proxy | Off (DNS-only / grey cloud) |
| Vite base path | `/` (no change) |
| OAuth consent screen | External, Testing mode — no Google verification needed |
| OAuth scopes | `youtube.force-ssl`, `profile`, `email` |
| OAuth authorized origin | `https://tetris.raywu.org` (+ `http://localhost:5173`) |
| OAuth redirect URIs | None — GIS token client flow doesn't use them |
| Env vars in Vercel | `VITE_GOOGLE_CLIENT_ID`, optionally `VITE_GOOGLE_CLIENT_ID_2`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` |
| Env var gotcha | Baked at build time — must redeploy after changes |
| YouTube Data API | Must be enabled in Google Cloud project |
| Firebase | Firestore in Native mode; `tetris.raywu.org` in Authorized domains; security rules open for scores |
