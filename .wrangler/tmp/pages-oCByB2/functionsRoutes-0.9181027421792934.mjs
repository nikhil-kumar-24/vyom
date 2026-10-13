import { onRequestOptions as __api_restaurants_js_onRequestOptions } from "/Users/NikhilKumar/Cloudfare/vyom/functions/api/restaurants.js"
import { onRequestPost as __api_restaurants_js_onRequestPost } from "/Users/NikhilKumar/Cloudfare/vyom/functions/api/restaurants.js"

export const routes = [
    {
      routePath: "/api/restaurants",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_restaurants_js_onRequestOptions],
    },
  {
      routePath: "/api/restaurants",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_restaurants_js_onRequestPost],
    },
  ]