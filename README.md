# Shortsy

**Shortsy** is a tiny URL shortener built with Next.js and deployed on Vercel.
It creates 6-character short codes, supports optional custom slugs, expirations (TTL), copy & QR, and fast redirects.

Built with [Next.js](https://nextjs.org/) and deployed on [Vercel](https://vercel.com/).

---

## 🚀 Quick Start

```bash
# install
npm install

# dev
npm run dev

# open http://localhost:3000
```
#### Environment (local & Vercel):

- REDIS_URL – Redis connection string (if using Redis Cloud)

- BASE_URL (optional) – e.g. https://your-app.vercel.app
 (API also auto-detects origin)

---

### How It Works

- Create: The UI calls POST /api/create with a destination URL, optional expiry, and optional custom slug.
The server generates a 6-char code (or uses your slug), stores {code → url} with an optional TTL in Redis, and returns a fullShortUrl.

- Open: Visiting /r/[code] resolves the code and 302 redirects to the long URL.

- No DB vendor lock: Storage is abstracted; you can swap Redis for Vercel KV/Turso later with a small adapter.

---

### Features

- Short links: Random 6-char codes (unambiguous alphabet).

- Custom slugs: Claim /r/my-link if available.

- Expiry (TTL): Choose preset days or custom; expired links disappear automatically.

- Nice UX: Copy button, QR code, simple local “recent” list, dark/light aware.

- Prod-friendly: Deployed on Vercel, typed API, linted, minimal deps.

---

### Parameters

- Destination URL: Must be a valid http(s) URL.

- Expiry: Presets (Never, 1/7/30/90 days) or a custom number of days.

- Custom Slug (optional): [A-Za-z0-9_-], 3–32 chars; reserved words (e.g. api, r, _next) are blocked.

---

### API

- Create Short Link

```
POST /api/create
```

- Request Body

```
{
  "url": "https://www.linkedin.com/in/sumedh-badnore/",
  "expiresAt": 1759344000000,   // epoch ms, optional (null = never)
  "customSlug": "sumedh"        // optional
}
```

- Response

```
{
  "code": "sumedh",
  "fullShortUrl": "https://your-app.vercel.app/r/sumedh"
}
```

- Example (curl)

```
curl -X POST https://your-app.vercel.app/api/create \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com","expiresAt":null,"customSlug":null}'
```

---

### Project Structure

```
src/
  app/
    page.tsx               # UI: form, presets, custom slug, copy, QR
    page.module.css        # Styles (dark/light aware)
    api/
      create/route.ts      # POST /api/create (Node.js runtime)
    r/[code]/route.ts      # GET /r/:code redirect (Node.js runtime)
  lib/
    storage.ts             # Storage interface + Redis-backed implementation
    redis.ts               # ioredis client helper
  types/
    qrcode.d.ts            # (dev) types for 'qrcode' if needed

```

Made with ☕ caffeine and curiosity by Sumedh.