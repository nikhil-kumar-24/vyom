# Aura Vibe Co. — Veg Food Finder

A mobile-first, static web app MVP for discovering Indian vegetarian and vegan foods, filtering by diet/category/meal, favoriting foods, and building a meal with estimated protein and calories.

## Features
- Responsive, accessible UI with dark Aura Vibe Co. styling
- Search by food name, category, and keywords
- Vegetarian / vegan filter; category and meal filters
- High-protein, budget-friendly, and favorites quick filters
- Serving-based estimated protein and calorie values
- Meal builder with adjustable quantities and nutrition totals
- Favorites and meal selection stored locally in the browser
- Native share-sheet support and clipboard fallback
- PWA manifest and service worker for basic offline support after first load
- No account, third-party tracker, or external API required

## Run locally
Because service workers require localhost or HTTPS, run a local static server:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Deploy
This is a static site; no build command is required.

### Cloudflare Pages
1. Create a new Pages project and upload the contents of this folder, or connect a Git repository containing these files.
2. Set build command to empty / none.
3. Set output directory to `/` (project root).
4. Deploy and test the HTTPS URL on mobile.

### Netlify
Drag the folder into Netlify Drop or connect the repository. No build command is required; publish directory is the project root.

### Custom domain
Add your domain/subdomain in your hosting provider and enable HTTPS. Then add the final URL to your Instagram bio.

## Before a public production launch
This package is a deployable MVP, not a clinically verified nutrition database. Before representing nutrition figures as authoritative:
1. Verify and document each food's data source, food state (dry/cooked), portion, and nutrient values against a suitable authoritative source such as ICMR–NIN Indian Food Composition Tables and/or product labels.
2. Have a qualified nutrition professional review nutrition data and all nutrition-related claims.
3. Add a privacy policy and contact details if you add analytics, accounts, or collect any personal data.
4. Test supported iOS Safari and Android Chrome versions, share-sheet behavior, PWA installation, offline fallback, and accessibility.
5. Configure a custom domain and production monitoring if desired.

## Data caveats
Nutrition values are approximate illustrations and vary by variety, brand, recipe, preparation, and serving. Calories and protein are rounded. The budget-friendly tag is a qualitative generalization, not a live price comparison. The app does not provide medical advice or individualized dietary treatment.

## Files
- `index.html` — app UI, data, and interactions
- `manifest.webmanifest` — PWA metadata
- `sw.js` — basic offline cache
- `icon.svg` — app icon


## Nearby restaurant discovery (Google Places API)

The app now includes a nearby restaurant section. The browser asks for location only after the user taps **Find restaurants near me**. If permission is denied, the food finder still works. Coordinates are sent by POST to `/api/restaurants` for the live search and are not stored by this app. Browser/device and hosting-provider logs may have their own policies; publish an appropriate privacy notice before launch.

The API runs as a Vercel serverless function (`api/restaurants.js`) so the Google API key is not shipped to the browser. It runs three location-biased text searches: pure vegetarian, vegan, and vegetarian-friendly. Results are deduplicated, sorted by approximate straight-line distance, and include Google Maps links where the provider supplies them.

### Configure Google Places
1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Places API (New)** and attach billing. Review current Google Maps Platform pricing and quotas before launch.
3. Create an API key and restrict it to Places API (New). Keep it private.
4. Deploy this project to Vercel.
5. In Vercel → Project → Settings → Environment Variables, add `GOOGLE_MAPS_API_KEY` with the key value for Production (and Preview if needed).
6. Redeploy after adding the environment variable.
7. Open the deployed site over HTTPS and test the location permission flow and restaurant results on a real phone.

### Deployment
Use Vercel for this version because the `/api/restaurants.js` function is a Vercel-style serverless endpoint. Import this folder into a Git repository, then import the repository into Vercel. No frontend build command is needed; the site is static HTML/CSS/JS and the API lives in `/api`.

### Production launch checklist
- Configure Google Places API billing, quotas, and budget alerts. Monitor per-request cost because the "All vegetarian options" selection performs three provider searches.
- Add persistent rate limiting / abuse protection to `/api/restaurants` before broad public promotion. Serverless in-memory limits alone are not reliable.
- Apply an appropriate API-key restriction, keep the key only in server environment variables, and do not commit secrets.
- Test the app on iOS Safari and Android Chrome, including denied permission, unavailable location, API failure, slow network, and successful result cases.
- Publish a privacy notice explaining that coordinates are sent to Google Places through the server to find nearby businesses, and review Google Places attribution and data-use terms.
- Google Places search terms are relevance queries, not certification. The app cannot guarantee a restaurant is fully vegetarian, vegan, or safe from cross-contact. Users should confirm directly with the restaurant.
- Restaurant availability, menu, price, and opening information can change. This version does not claim live opening status or exact walking/driving distance.


## Cloudflare Pages deployment (nearby restaurant API included)

This project includes `functions/api/restaurants.js`, a Cloudflare Pages Function serving `POST /api/restaurants`. Use Git integration or Wrangler CLI: dashboard drag-and-drop / Direct Upload deploys static files only, not Pages Functions.

### Recommended: GitHub + Cloudflare Pages
1. Extract this ZIP on your computer.
2. Upload the complete extracted project to a new GitHub repository, including the top-level `functions/` folder.
3. In Cloudflare Dashboard, open **Workers & Pages → Create application → Pages → Connect to Git** and connect that repository.
4. Set production branch to `main`. This is static HTML; use build command `exit 0` and output directory `.` (the project root containing `index.html`).
5. Deploy. The `functions/api/restaurants.js` file should be routed to `/api/restaurants`.
6. Open the Pages project **Settings → Variables and Secrets**. Add `GOOGLE_MAPS_API_KEY` as an encrypted secret for Production (and Preview if needed), then redeploy.
7. Test the HTTPS site on a phone and tap **Find restaurants near me**.

### Google Places setup
1. In Google Cloud Console, enable **Places API (New)** and billing.
2. Create an API key restricted to Places API (New).
3. Save it only as the Cloudflare secret `GOOGLE_MAPS_API_KEY`. Never put it in frontend files or commit it to GitHub.

### Important launch notes
- Configure API quotas and billing alerts; the all-category search makes three Places requests.
- Add rate limiting / abuse protection before promoting the public app.
- Publish a privacy notice explaining that user-approved coordinates are sent to the search service.
- Places search terms cannot certify a restaurant's kitchen, vegan status, or cross-contact; users should confirm with the restaurant.
- Cloudflare docs: https://developers.cloudflare.com/pages/functions/get-started/ and https://developers.cloudflare.com/pages/configuration/git-integration/
