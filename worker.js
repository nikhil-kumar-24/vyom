import { onRequestPost as analyzePost } from './functions/api/analyze.js';
import { onRequestGet as trendsGet } from './functions/api/trends.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      return analyzePost({ request, env, ctx });
    }
    if (url.pathname === '/api/trends' && request.method === 'GET') {
      return trendsGet({ request, env, ctx });
    }
    // Assets are checked before the Worker runs; reaching here means no static file matched.
    return new Response('Not found', { status: 404 });
  }
};
