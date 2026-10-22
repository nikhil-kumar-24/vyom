const MODEL = '@cf/google/gemma-4-26b-a4b-it';
// Must stay in sync with the `tag` values in sfx-data.js so suggestions can match a library clip.
const ALLOWED_TAGS = ['fast whoosh','notification','typewriter','glitch','whoosh impact','ratchet','impact thud','riser','pop click','click','tap','snap','pop','bass hit','swoosh','camera shutter','ticking clock','explosion rumble'];
const FALLBACK_CYCLE = ['fast whoosh','pop','impact thud','riser','glitch','swoosh'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function extractText(result) {
  if (typeof result === 'string') return result;
  if (typeof result?.response === 'string') return result.response;
  if (typeof result?.output_text === 'string') return result.output_text;
  if (typeof result?.result === 'string') return result.result;
  if (typeof result?.choices?.[0]?.message?.content === 'string') return result.choices[0].message.content;
  if (typeof result?.content === 'string') return result.content;
  return '';
}
function parseJson(text) {
  const cleaned = String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI returned an unreadable timeline');
  return JSON.parse(cleaned.slice(start, end + 1));
}
function fallbackCuts(cuts) {
  return cuts.map((c, i) => ({
    time: c.time,
    momentLabel: `Cut point ${i + 1}`,
    sfxTag: FALLBACK_CYCLE[i % FALLBACK_CYCLE.length],
    reason: 'Heuristic pick based on cut position; AI vision was unavailable for a content-aware suggestion.'
  }));
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const duration = Number(body.durationSeconds) || 0;
  const vibe = String(body.vibe || '').slice(0, 120);
  const isFrame = (s) => typeof s === 'string' && s.startsWith('data:image/jpeg;base64,') && s.length < 400000;
  const cuts = (Array.isArray(body.cuts) ? body.cuts : [])
    .slice(0, 6)
    .filter(c => c && typeof c.time === 'number' && isFinite(c.time) && isFrame(c.beforeFrame) && isFrame(c.afterFrame))
    .map(c => ({ time: Math.max(0, Math.round(c.time * 10) / 10), beforeFrame: c.beforeFrame, afterFrame: c.afterFrame }));
  if (!cuts.length) return json({ error: 'No valid cut points were provided.' }, 400);

  if (!env.AI) {
    return json({ mode: 'fallback', duration, cuts: fallbackCuts(cuts), disclaimer: 'Workers AI is not configured, so these are rotation-based heuristic picks, not content-aware suggestions.' });
  }

  try {
    const intro = `You are a short-form video sound design assistant. For each numbered transition you are given a "before" frame and an "after" frame from a creator's reel. Pick exactly one sfxTag per transition from this fixed list (do not invent new tags): ${JSON.stringify(ALLOWED_TAGS)}.${vibe ? ` Editing style/vibe context: ${vibe}.` : ''} Return ONLY valid JSON: {"cuts":[{"time":number,"momentLabel":string (<=60 chars describing what visibly changes),"sfxTag":string (must exactly match one allowed tag),"reason":string (<=160 chars, reference what you see in the frames)}]}. Keep the cuts array in the same order, same length, and same "time" values as the input.`;
    const content = [{ type: 'text', text: intro + '\nTransitions:\n' + cuts.map((c, i) => `Cut ${i + 1} at ${c.time}s`).join('\n') }];
    cuts.forEach((c, i) => {
      content.push({ type: 'text', text: `Cut ${i + 1} before frame:` });
      content.push({ type: 'image_url', image_url: { url: c.beforeFrame } });
      content.push({ type: 'text', text: `Cut ${i + 1} after frame:` });
      content.push({ type: 'image_url', image_url: { url: c.afterFrame } });
    });
    const result = await env.AI.run(MODEL, { messages: [{ role: 'user', content }], max_tokens: 900, chat_template_kwargs: { enable_thinking: false } });
    const raw = extractText(result);
    const parsed = parseJson(raw);
    const list = Array.isArray(parsed.cuts) ? parsed.cuts : [];
    const outCuts = cuts.map((c, i) => {
      const p = list[i] || {};
      return {
        time: c.time,
        momentLabel: String(p.momentLabel || `Edit point ${i + 1}`).slice(0, 80),
        sfxTag: ALLOWED_TAGS.includes(p.sfxTag) ? p.sfxTag : FALLBACK_CYCLE[i % FALLBACK_CYCLE.length],
        reason: String(p.reason || '').slice(0, 220)
      };
    });
    return json({ mode: 'ai-vision', duration, cuts: outCuts, disclaimer: 'AI-suggested sound categories based on the two frames around each cut; preview and adjust to taste before publishing.' });
  } catch (err) {
    // Keep the feature usable when the model is unavailable, quota is exhausted, or it returns malformed JSON.
    return json({ mode: 'fallback', duration, cuts: fallbackCuts(cuts), aiError: String(err?.message || 'Workers AI request failed').slice(0, 180), disclaimer: 'AI was unavailable, so these are rotation-based heuristic picks.' });
  }
}
