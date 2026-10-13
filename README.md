# Aura Vibe Co. Food Finder — Japanese restaurants by city

This is the updated Cloudflare Pages version of the existing Aura Vibe Co. food finder. The existing vegetarian food catalogue, filters, favorites, meal builder, nutrition estimates, sharing, and PWA assets are preserved. The old nearby vegetarian restaurant search has been replaced with a city-based **Japanese Restaurant Finder**.

## Japanese Restaurant Finder

- Enter a city (for example, `Bengaluru, India`) instead of granting device-location permission.
- The Cloudflare Pages Function uses OpenStreetMap's Nominatim geocoder to resolve a mapped administrative boundary.
- It then queries the Overpass API for establishments in that boundary tagged with `cuisine=japanese` and an amenity of `restaurant`, `fast_food`, or `cafe`.
- Results include mapped names, address fields when available, amenity type, opening hours/phone/website when contributors have mapped them, an OpenStreetMap details link, and a Google Maps search link.
- Results are deduplicated and alphabetically sorted.
- No Google Maps API key or billing setup is required.

### About the query

Overpass Turbo (`https://overpass-turbo.eu/`) is a browser-based query editor. Its `{{geocodeArea:...}}` syntax is a Turbo macro, not raw Overpass API syntax. This app implements the same flow in its backend: geocode the entered city to a boundary, convert the OSM relation/way ID to an Overpass area ID, and run this equivalent query:

```overpass
[out:json][timeout:60];
area(AREA_ID)->.searchArea;
(
  nwr["amenity"~"^(restaurant|fast_food|cafe)$"]
     ["cuisine"="japanese"](area.searchArea);
);
out center tags;
```

The filter is intentionally strict. A place tagged `cuisine=sushi;japanese`, `cuisine=ramen`, or without a cuisine tag will not match unless its value is exactly `japanese`. This helps keep the results Japanese-only, but means some genuine Japanese restaurants may be omitted due to how the community data is tagged. OpenStreetMap coverage is not a complete commercial directory, and listings can be missing or outdated.

## Run locally

Cloudflare Pages Functions need a local Pages-compatible runtime. Install Wrangler if needed, then run from this directory:

```bash
npx wrangler pages dev .
```

Open the local URL Wrangler prints. The app's static files and `functions/api/restaurants.js` are served together. A basic `python3 -m http.server` can preview the static food tools, but it will not run the `/api/restaurants` function.

## Deploy to Cloudflare Pages

1. Extract the ZIP.
2. Commit the complete `aura-vibe-cloudflare-deploy` folder contents to a GitHub repository. The `functions/` folder must be at the project root next to `index.html`.
3. In Cloudflare Dashboard, go to **Workers & Pages → Create application → Pages → Connect to Git** and connect the repository.
4. Use the production branch `main` (or your chosen branch), build command `exit 0`, and output directory `.`.
5. Deploy. Cloudflare Pages should discover `functions/api/restaurants.js` as `/api/restaurants`.
6. Test with a city such as `Bengaluru, India`, then test a second city/country.

Do not use static drag-and-drop/direct upload if you need Pages Functions; use Git integration or Wrangler Pages deployment so the function is included.

## API and privacy notes

- No API key is required for this implementation. It uses public OpenStreetMap Nominatim and Overpass services, which have fair-use policies, rate limits, and no guarantee of availability. Avoid rapid repeated searches and do not use the public endpoints for high-volume production traffic without reviewing their usage policies or arranging suitable infrastructure.
- The entered city is sent to Nominatim; the resolved area query is sent to Overpass. This app does not persist city searches. Hosting and provider logs may still exist under their respective policies.
- OpenStreetMap data is licensed under the Open Database License (ODbL). Keep attribution visible: “© OpenStreetMap contributors”. Review the current attribution and usage requirements before production launch.
- Restaurant records are community-contributed, not manually verified. A mapped Japanese cuisine tag is not a guarantee of authenticity, current operation, menu, or dietary suitability.
- The app creates Google Maps search links from the restaurant name/address; these are convenience links, not provider-verified business profile URLs. Website links are shown only when present in OSM tags and pass an HTTP(S) URL check.
- Add abuse protection and consider a self-hosted/contracted geocoding and Overpass service before high-traffic public launch.

## Existing food finder features

- Responsive, accessible dark UI
- Searchable vegetarian food catalogue
- Vegetarian/vegan, category, and meal filters
- High-protein, budget-friendly, and favorites quick filters
- Approximate protein and calorie estimates
- Meal builder with quantity controls, totals, share sheet, and clipboard fallback
- Local browser storage for favorites and meal selection
- PWA manifest and service worker

## Files

- `index.html` — app UI, food catalogue, and city-based Japanese restaurant search
- `functions/api/restaurants.js` — Cloudflare Pages Function for Nominatim + Overpass
- `manifest.webmanifest` — PWA metadata
- `sw.js` — basic offline cache
- `icon.svg` — app icon
