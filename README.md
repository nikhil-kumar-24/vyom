# ReelReach AI — Cloudflare Pages MVP

A deployable static frontend + Cloudflare Pages Functions backend for Instagram Reels content-readiness analysis. Includes browser-side video preview/frame extraction, Cloudflare Workers AI integration, five-category scoring, actionable recommendations, five hashtag suggestions, and a public Google Trends RSS discovery feed.

## Deploy from GitHub to Cloudflare Pages

1. Create a GitHub repository and upload the contents of this folder to its root (make sure `index.html`, `functions/`, and `wrangler.toml` are at the root).
2. In Cloudflare Dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
3. Framework preset: **None**. Build command: leave blank. Build output directory: `.`.
4. Deploy. Cloudflare Pages Functions are discovered from the root `functions/` folder.
5. In the Cloudflare dashboard, open the Pages project settings and ensure **Workers AI** is available/enabled for the project. The `wrangler.toml` declares the `AI` binding. If your dashboard asks you to configure bindings manually, add a Workers AI binding named `AI` and redeploy.

You can also use Wrangler locally after installing Node.js: `npx wrangler pages dev .`.

## What is implemented

- Upload validation (MP4, MOV, WebM; maximum 25 MB), in-browser preview, and three representative frames extracted in the browser.
- `POST /api/analyze`: tries Cloudflare Workers AI vision (`@cf/meta/llama-3.2-11b-vision-instruct`), then text-only AI (`@cf/meta/llama-3.1-8b-instruct`) if vision fails. Returns structured scores, reasons, recommendations, and exactly five hashtags. If the AI binding is not configured, returns clearly labeled heuristic fallback results.
- `GET /api/trends`: reads the public Google Trends RSS feed for India by default, cached at the edge; if unavailable, returns clearly labeled evergreen content formats rather than pretending those are live trends.
- Temporary video frames are sent only as part of the analysis request; this project does not persist uploads or maintain user accounts.

## Important limits

- The score is **content readiness**, not a probability of virality or forecast of views. Instagram ranking signals and account-specific performance are not available from this app.
- Google Trends reports public search-interest signals, not Instagram audio/hashtag rankings. Trending search terms should be adapted to a creator's niche rather than blindly used as hashtags.
- Workers AI model availability and free allocations depend on Cloudflare's current account/model policies and may change. If a model is unavailable, text-only AI is attempted; if the AI binding itself is missing, heuristic mode is used.
- The uploaded video file is not sent to the backend as a media file for storage; only a few reduced-size JPEG frames plus the creator-provided text and video metadata are used. The backend validates the uploaded file but does not persist it.
- This is an MVP, not a security-audited production SaaS. Add rate limiting, abuse controls, privacy terms, authentication, and usage monitoring before opening it to the public.

## Scoring methodology

The AI is asked to score five dimensions from 0–100: opening hook (25%), story and clarity (20%), visual storytelling (20%), audience fit (15%), and share/save potential (20%). The final score should be interpreted as a structured editorial checklist. It does not estimate expected reach. In fallback mode the same categories use simple rule-based baselines and are labeled as heuristic.
