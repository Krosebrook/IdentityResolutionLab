# 🧬 Identity Resolution Lab: Flash vs. Pro

An advanced benchmarking and processing workbench designed to evaluate the performance of **Gemini 3 Flash** against **Gemini 3 Pro** in complex Identity Resolution (IDR) tasks. The lab transforms messy, unstructured chat transcripts and legacy customer records into a unified "Golden Record."

## 🚀 Core Features

### ⚔️ The Battle of Inference
Run parallel processing streams to compare **Gemini 3 Flash** (Speed Optimized) and **Gemini 3 Pro** (Deep Reasoning).
- **Flash Engine**: Optimized for rapid merging with a low thinking budget (1k tokens).
- **Pro Engine**: Utilizes a high thinking budget (2k tokens) to stream Chain-of-Thought (CoT) reasoning, capturing nuanced intent that smaller models might miss.

### 🏆 Golden Record Synthesis
Features an **Arbiter Logic** that intelligently consolidates results from both models. If models disagree, a third synthesis pass evaluates the original context to establish the final definitive record.

### 📊 Precision Analytics
- **Confidence Gauges**: Visual circular indicators representing the trust score of synthesized data.
- **Efficiency Metrics**: Real-time tracking of latency (ms) and processing duration.
- **AI Chat Summaries**: Automatic generation of single-sentence transcript summaries using `flash-lite`.

### 🛠 Workbench Tools
- **Manual Injection**: Test specific edge cases by inputting raw customer data and transcripts manually.
- **Bulk Stream**: Inject sequential scenarios (Suit-themed personas) to test system resilience.
- **Data Portability**: Export resolved identities and synthesis logs in **JSON** or **CSV** formats.

## 🛠 Technology Stack

- **Framework**: React 19 (Strict Mode)
- **AI Intelligence**: Google Gemini API (@google/genai)
- **Styling**: Tailwind CSS (Material Dark Palette)
- **Icons**: Lucide React
- **State Management**: React Hooks with LocalStorage Persistence

## 🚦 Getting Started

1. Ensure your environment has the `API_KEY` configured.
2. Click **Inject Data** to populate the stream.
3. Use the **Segmented Control** to select your model configuration (Flash, Pro, or Both).
4. Click **Start Battle** to initiate the resolution engine.
5. Expand history items to view **Reasoning Insights** and **Synthesis Logs**.

---

## 🏗️ Local Development

**Prerequisites**: Node ≥ 20, npm ≥ 10

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env
# Edit .env and set GEMINI_API_KEY

# 3. Start dev server (http://localhost:3000)
npm run dev

# 4. Type-check
npm run typecheck
```

---

## 🚀 Deployment

> ⚠️ **Security note**: `GEMINI_API_KEY` is embedded in the client bundle and
> visible to end users. Restrict the key to your deployment domain(s) via
> [HTTP Referrer restrictions](https://cloud.google.com/docs/authentication/api-keys#adding_http_restrictions)
> in the Google Cloud console.

### Option A — Vercel (recommended for simplicity)

**Manual setup (Vercel dashboard):**

| Setting | Value |
|---|---|
| Framework Preset | **Other** (Vite is auto-detected) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm ci` |
| Node.js Version | **20.x** |

**Environment variables (Vercel → Settings → Environment Variables):**

| Key | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |

**Local Vercel preview:**
```bash
npm i -g vercel
vercel dev          # or: npm run build && vercel --prebuilt
```

---

### Option B — Cloudflare Pages (recommended for global edge performance)

**Dashboard setup (Cloudflare → Pages → Create Application → Connect Git):**

| Setting | Value |
|---|---|
| Framework Preset | **None** |
| Build Command | `npm run build` |
| Build Output Directory | `dist` |
| Node.js Version | `20` (set via `NODE_VERSION` env var) |

**Environment variables (Cloudflare → Pages → Settings → Environment Variables):**

| Key | Value |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `NODE_VERSION` | `20` |

**Local Cloudflare Pages preview:**
```bash
npm i -g wrangler
npm run build
wrangler pages dev dist --port 8788
# App → http://localhost:8788
```

**Deploy via CLI:**
```bash
wrangler pages deploy dist --project-name identity-resolution-lab
```

**Set secret via CLI:**
```bash
wrangler pages secret put GEMINI_API_KEY
```

---

## 🔥 Smoke Test (both platforms)

Run this before every production deploy to verify the build is healthy:

```bash
# Type-check → build → local preview on :4173
npm run smoke
# Then open http://localhost:4173 and confirm the app loads.
# Ctrl+C to stop.
```

---

## 🔒 Security

- **Security headers** are applied via `vercel.json` (Vercel) and `public/_headers` (Cloudflare Pages).
- **CSP** is set to `report-only` mode. Once you have confirmed no violations, promote it to enforcing by changing the header key to `Content-Security-Policy`.
- **Rate limiting**: Enable Cloudflare WAF rate-limiting rules on your domain (recommended: ≤60 req/min per IP for the `/` route).

---

## 📋 Deployment Checklist

### Vercel
- [ ] `GEMINI_API_KEY` set in project environment variables
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Install command: `npm ci`
- [ ] Node.js version: 20.x
- [ ] Domain configured and HTTPS enforced
- [ ] Confirm `vercel.json` security headers are active (`curl -I <url>`)

### Cloudflare Pages
- [ ] `GEMINI_API_KEY` set as encrypted environment variable (both Production + Preview)
- [ ] `NODE_VERSION=20` set as environment variable
- [ ] Build command: `npm run build`
- [ ] Build output directory: `dist`
- [ ] Domain configured and HTTPS enforced
- [ ] Confirm `_headers` security headers are active (`curl -I <url>`)

---

## ↩️ Rollback Plan

**Vercel**: In the Vercel dashboard → Deployments → find the last good deployment → click **Promote to Production**.

**Cloudflare Pages**: In the Cloudflare dashboard → Pages → Deployments → find the last good deployment → click **Rollback to this deployment**.

Both platforms keep full deployment history. No data is stored server-side (app is purely client-side), so rollback is instant and safe.

---

## 🩺 Launch Verification

After deploying, confirm production health:

```bash
# 1. App loads with HTTP 200
curl -s -o /dev/null -w "%{http_code}" https://<your-domain>/

# 2. Security headers are present
curl -I https://<your-domain>/ | grep -E "x-content-type|x-frame|referrer"

# 3. Assets are cached correctly
curl -I https://<your-domain>/assets/ | grep cache-control
```

Open the app, inject sample data, and confirm the resolution pipeline completes without errors.

---

## 📝 Diff Plan (files added/changed for deployment readiness)

| File | Action | Reason |
|---|---|---|
| `.nvmrc` | Added | Pins Node 20 LTS for consistent builds on both platforms |
| `.env.example` | Added | Documents required env vars; prevents accidental secret commits |
| `.gitignore` | Modified | Added `.env` and `.env.local` patterns to protect secrets |
| `package.json` | Modified | Added `engines`, `typecheck` script, and `smoke` convenience script |
| `vercel.json` | Added | SPA rewrites + security headers for Vercel |
| `wrangler.toml` | Added | Cloudflare Pages project config and build settings |
| `public/_headers` | Added | Cloudflare Pages security headers |
| `public/_redirects` | Added | Cloudflare Pages SPA fallback routing |
| `README.md` | Modified | Added full deployment guide, checklist, rollback, and launch notes |

---

*Developed by Senior Frontend Engineering for the Gemini Ecosystem.*
