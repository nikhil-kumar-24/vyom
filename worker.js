import { onRequestPost as analyzePost } from './functions/api/analyze.js';
import { onRequestGet as trendsGet } from './functions/api/trends.js';
import { onRequestPost as beatlinePost } from './functions/api/beatline.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      return analyzePost({ request, env, ctx });
    }
    if (url.pathname === '/api/trends' && request.method === 'GET') {
      return trendsGet({ request, env, ctx });
    }
    if (url.pathname === '/api/beatline' && request.method === 'POST') {
      return beatlinePost({ request, env, ctx });
    }
    // Legacy/cached links to the old .html paths: send them to the clean URL instead of a dead end.
    const legacyRedirects = { '/index.html': '/', '/sfx.html': '/sfx', '/beatline.html': '/beatline' };
    if (legacyRedirects[url.pathname]) {
      url.pathname = legacyRedirects[url.pathname];
      return Response.redirect(url.toString(), 301);
    }
    // Assets are checked before the Worker runs; reaching here means no static file matched.
    return new Response('Not found', { status: 404 });
  }
};
