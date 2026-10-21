const FALLBACK = [
  { title: 'Short, useful how-to content', traffic: 'Evergreen format', source: 'Idea' },
  { title: 'Before / after with context', traffic: 'Testable format', source: 'Idea' },
  { title: 'A personal lesson or honest story', traffic: 'Testable format', source: 'Idea' },
  { title: 'Myth vs fact in your niche', traffic: 'Testable format', source: 'Idea' },
  { title: 'Three mistakes beginners make', traffic: 'Testable format', source: 'Idea' }
];
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const geo = (url.searchParams.get('geo') || 'IN').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'IN';
  try {
    const rss = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, { headers: { 'user-agent': 'VyomAI/1.0 (public trends RSS reader)', 'accept': 'application/rss+xml, application/xml, text/xml' }, cf: { cacheTtl: 1800, cacheEverything: true } });
    if (!rss.ok) throw new Error('Trend feed unavailable');
    const xml = await rss.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 10).map(m => {
      const part = m[1];
      const get = (tag) => { const match = part.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')); return match ? match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : ''; };
      const title = get('title'); const traffic = get('ht:approx_traffic'); const pubDate = get('pubDate');
      return title ? { title: title.slice(0, 180), traffic: traffic || 'Trending search', pubDate: pubDate.slice(0, 60), source: 'Google Trends' } : null;
    }).filter(Boolean);
    if (!items.length) throw new Error('No trend items');
    return Response.json({ live: true, geo, period: 'Current public search interest', trends: items }, { headers: { 'cache-control': 'public, max-age=900' } });
  } catch {
    return Response.json({ live: false, geo, period: 'Fallback ideas — not live trend data', trends: FALLBACK }, { headers: { 'cache-control': 'public, max-age=300' } });
  }
}
