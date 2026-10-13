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
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.priceLevel,places.types";
export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_MAPS_API_KEY) return json({ error: "Restaurant search is not configured. Add GOOGLE_MAPS_API_KEY as a Pages secret." }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON request." }, 400); }
  const lat = Number(body.latitude), lng = Number(body.longitude);
  const category = ["all","pure-veg","vegan","veg-friendly"].includes(body.category) ? body.category : "all";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return json({ error: "Valid latitude and longitude are required." }, 400);
  try {
    const groups = await Promise.all(QUERIES[category].map(async item => {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method:"POST",
        headers:{"Content-Type":"application/json","X-Goog-Api-Key":env.GOOGLE_MAPS_API_KEY,"X-Goog-FieldMask":FIELD_MASK},
        body:JSON.stringify({textQuery:item.query,pageSize:10,languageCode:"en",regionCode:"IN",rankPreference:"DISTANCE",locationBias:{circle:{center:{latitude:lat,longitude:lng},radius:5000}}})
      });
      const d = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(d?.error?.message || "Places API request failed");
      return (d.places||[]).map(p=>({id:p.id,name:p.displayName?.text||"Restaurant",address:p.formattedAddress||"",latitude:p.location?.latitude,longitude:p.location?.longitude,rating:typeof p.rating==="number"?p.rating:null,ratingCount:typeof p.userRatingCount==="number"?p.userRatingCount:null,mapsUrl:p.googleMapsUri||null,websiteUrl:p.websiteUri||null,priceLevel:p.priceLevel||null,types:Array.isArray(p.types)?p.types:[],searchCategoryLabel:item.label}));
    }));
    const byId=new Map();
    for(const p of groups.flat()){if(!p.id)continue;if(!byId.has(p.id))byId.set(p.id,p);else if(byId.get(p.id).searchCategoryLabel!==p.searchCategoryLabel)byId.get(p.id).searchCategoryLabel="Multiple veg searches";}
    const places=[...byId.values()].map(p=>({...p,distanceKm:Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)?distanceKm(lat,lng,p.latitude,p.longitude):null})).filter(p=>p.distanceKm===null||p.distanceKm<=8).sort((a,b)=>(a.distanceKm??Infinity)-(b.distanceKm??Infinity)).slice(0,25);
    return json({places,count:places.length,provider:"Google Places API"});
  } catch(e) {
    console.error("Places search failed:",e.message);
    return json({error:"The restaurant provider could not complete the search. Please try again later."},502);
  }
}
export async function onRequestOptions() { return new Response(null,{status:204,headers:headers()}); }
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...headers(),"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});}
function headers(){return {"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"};}
function distanceKm(a,b,c,d){const rad=x=>x*Math.PI/180;const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
