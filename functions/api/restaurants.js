// Cloudflare Pages Function: POST /api/restaurants
// City-based Japanese restaurant discovery using Nominatim + Overpass API.
// No API key is required. The query intentionally uses the exact cuisine=japanese tag.
export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Send a valid JSON body containing a city." }, 400); }

  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (!city || city.length > 120) {
    return json({ error: "Enter a city name, optionally followed by a country (for example, Bengaluru, India)." }, 400);
  }

  try {
    const boundary = await findCityBoundary(city);
    if (!boundary) {
      return json({ error: `Could not find a mapped city boundary for “${city}”. Try adding the country, for example “Bengaluru, India”.` }, 422);
    }

    const areaId = boundary.osm_type === "relation"
      ? Number(boundary.osm_id) + 3600000000
      : Number(boundary.osm_id) + 2400000000;
    if (!Number.isSafeInteger(areaId) || areaId <= 0) {
      return json({ error: "The city boundary returned by OpenStreetMap could not be used for a search." }, 422);
    }

    const query = `[out:json][timeout:60];\narea(${areaId})->.searchArea;\n(\n  nwr["amenity"~"^(restaurant|fast_food|cafe)$"]["cuisine"="japanese"](area.searchArea);\n);\nout center tags;`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65000);
    let response;
    try {
      response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8", "Accept": "application/json" },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("Overpass request returned status", response.status);
      return json({ error: "OpenStreetMap's Overpass service is busy or unavailable. Please try again in a little while." }, 502);
    }
    const data = await response.json();
    const seen = new Set();
    const places = (Array.isArray(data.elements) ? data.elements : []).map(element => {
      const tags = element.tags || {};
      const lat = Number.isFinite(element.lat) ? element.lat : element.center?.lat;
      const lon = Number.isFinite(element.lon) ? element.lon : element.center?.lon;
      const name = tags["name:en"] || tags.name || tags["official_name"] || "Unnamed Japanese restaurant";
      const address = formatAddress(tags);
      const website = tags.website || tags["contact:website"] || tags.url || "";
      const phone = tags.phone || tags["contact:phone"] || "";
      const key = `${String(name).trim().toLowerCase()}|${Number.isFinite(lat) ? lat.toFixed(4) : ""}|${Number.isFinite(lon) ? lon.toFixed(4) : ""}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        id: `${element.type}/${element.id}`,
        name,
        address,
        amenityLabel: amenityLabel(tags.amenity),
        cuisine: tags.cuisine || "japanese",
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lon) ? lon : null,
        website: safeUrl(website),
        phone,
        openingHours: tags.opening_hours || "",
        osmUrl: `https://www.openstreetmap.org/${encodeURIComponent(element.type)}/${element.id}`
      };
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

    return json({ city: boundary.display_name || city, count: places.length, places, provider: "OpenStreetMap / Overpass API" });
  } catch (error) {
    console.error("Japanese restaurant lookup failed:", error?.name || "Error", error?.message || "unknown error");
    if (error?.name === "AbortError") return json({ error: "The city-wide search took too long. Try again shortly or use a more specific city name." }, 504);
    return json({ error: "Could not complete the Japanese restaurant search. Please try again later." }, 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function findCityBoundary(city) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", city);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Language": "en",
      "User-Agent": "VYOM-Japanese-Restaurant-Finder/1.0 (+https://auravibecommune.com)"
    }
  });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
  const results = await response.json();
  if (!Array.isArray(results)) return null;
  // Equivalent to Overpass Turbo's geocodeArea macro: prefer an administrative
  // relation/way so the query can cover the city's mapped boundary.
  const candidates = results.filter(item =>
    ["relation", "way"].includes(item.osm_type) &&
    (item.class === "boundary" || item.type === "administrative") &&
    Number.isFinite(Number(item.osm_id))
  );
  const candidate = candidates.find(item => item.osm_type === "relation") || candidates[0];
  if (!candidate) return null;
  return candidate;
}

function formatAddress(tags) {
  const houseStreet = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [];
  if (houseStreet) parts.push(houseStreet);
  for (const key of ["addr:suburb", "addr:neighbourhood", "addr:city", "addr:town", "addr:village", "addr:postcode"]) {
    if (tags[key] && !parts.includes(tags[key])) parts.push(tags[key]);
  }
  return parts.join(", ") || tags["addr:full"] || tags["addr:place"] || "Address not mapped";
}
function amenityLabel(value) {
  return ({ restaurant: "Japanese restaurant", fast_food: "Japanese fast food", cafe: "Japanese café" })[value] || "Japanese cuisine";
}
function safeUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.startsWith("www.") ? `https://${value}` : value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function corsHeaders() {
  return { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
