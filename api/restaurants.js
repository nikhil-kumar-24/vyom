// Vercel serverless function: POST /api/restaurants
// Set GOOGLE_MAPS_API_KEY in Vercel Project Settings > Environment Variables.
// Enable Places API (New) and restrict this key to Places API (New).
const ALLOWED_CATEGORIES = new Set(["all", "pure-veg", "vegan", "veg-friendly"]);
const QUERIES = {
  "pure-veg": [{ query: "pure vegetarian restaurants", label: "Pure veg search" }],
  "vegan": [{ query: "vegan restaurants and vegan cafes", label: "Vegan search" }],
  "veg-friendly": [{ query: "vegetarian friendly restaurants with vegetarian food", label: "Veg-friendly search" }],
  "all": [
    { query: "pure vegetarian restaurants", label: "Pure veg search" },
    { query: "vegan restaurants and vegan cafes", label: "Vegan search" },
    { query: "vegetarian friendly restaurants with vegetarian food", label: "Veg-friendly search" }
  ]
};
const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.location",
  "places.rating", "places.userRatingCount", "places.googleMapsUri", "places.websiteUri",
  "places.priceLevel", "places.types"
].join(",");
function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return json(res, 405, { error: "Use POST for restaurant search." });
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return json(res, 503, { error: "Restaurant search is not configured yet. Add GOOGLE_MAPS_API_KEY to your hosting environment." });
  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const latitude = Number(body.latitude), longitude = Number(body.longitude);
  const category = ALLOWED_CATEGORIES.has(body.category) ? body.category : "all";
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return json(res, 400, { error: "Valid latitude and longitude are required." });
  }
  try {
    const searches = await Promise.all(QUERIES[category].map(async item => {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK
        },
        body: JSON.stringify({
          textQuery: item.query,
          pageSize: 10,
          languageCode: "en",
          regionCode: "IN",
          rankPreference: "DISTANCE",
          locationBias: { circle: { center: { latitude, longitude }, radius: 5000 } }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data?.error?.message || "Places API request failed.";
        throw new Error(message);
      }
      return (data.places || []).map(place => ({
        id: place.id,
        name: place.displayName?.text || "Restaurant",
        address: place.formattedAddress || "",
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        rating: typeof place.rating === "number" ? place.rating : null,
        ratingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
        mapsUrl: place.googleMapsUri || null,
        websiteUrl: place.websiteUri || null,
        priceLevel: place.priceLevel || null,
        types: Array.isArray(place.types) ? place.types : [],
        searchCategoryLabel: item.label
      }));
    }));
    const byId = new Map();
    for (const place of searches.flat()) {
      if (!place.id) continue;
      if (!byId.has(place.id)) byId.set(place.id, place);
      else {
        const existing = byId.get(place.id);
        const labels = new Set([existing.searchCategoryLabel, place.searchCategoryLabel]);
        existing.searchCategoryLabel = labels.size > 1 ? "Multiple veg searches" : existing.searchCategoryLabel;
      }
    }
    const places = [...byId.values()].map(place => ({
      ...place,
      distanceKm: Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
        ? haversine(latitude, longitude, place.latitude, place.longitude) : null
    })).filter(place => place.distanceKm === null || place.distanceKm <= 8)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      .slice(0, 25);
    return json(res, 200, { places, count: places.length, provider: "Google Places API" });
  } catch (error) {
    // Do not return credentials or raw provider payloads to the browser.
    console.error("Places search failed:", error.message);
    return json(res, 502, { error: "The restaurant provider could not complete the search. Please try again later." });
  }
};
function haversine(lat1, lon1, lat2, lon2) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
