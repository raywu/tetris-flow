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

### 1. Connect the repo to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import from GitHub.
2. Vercel auto-detects Vite. Confirm:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
   - **Install command:** `npm install`
3. Deploy. Note the assigned `*.vercel.app` URL — you'll need it for DNS.

### 2. Add the custom domain in Vercel

In the project **Settings → Domains**, add `tetris.raywu.org`.

Vercel will show you the DNS record to create (typically a CNAME).

### 3. Add the CNAME at your registrar

In whatever DNS provider manages `raywu.org` (not Svbtle — this is at your domain registrar or a DNS host like Cloudflare):

```
Type:  CNAME
Host:  tetris
Value: cname.vercel-dns.com
TTL:   auto (or 3600)
```

> If you use Cloudflare, set the record to **DNS-only** (grey cloud) to avoid conflicts with Vercel's TLS certificate provisioning.

Vercel will auto-provision a TLS cert via Let's Encrypt once the CNAME propagates (usually a few minutes).

### 4. Update Google OAuth authorized origins

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials** → your OAuth 2.0 Client ID:

Under **Authorized JavaScript origins**, add:
```
https://tetris.raywu.org
```

This is required because `auth.ts` initiates GIS OAuth from the browser. The origin must match exactly — no trailing slash.

If you want to keep local dev working, also ensure `http://localhost:5173` is listed.

### 5. No Vite config changes needed

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
| Vite base path | `/` (no change) |
| OAuth origin to add | `https://tetris.raywu.org` |
