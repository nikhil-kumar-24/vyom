const MODEL = '@cf/google/gemma-4-26b-a4b-it';
const TEXT_MODEL = '@cf/zai-org/glm-4.7-flash';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
function clamp(n) { return Math.max(0, Math.min(100, Math.round(Number(n) || 0))); }
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
  if (start < 0 || end <= start) throw new Error('AI returned an unreadable report');
  return JSON.parse(cleaned.slice(start, end + 1));
}
function fallback(input, trendItems) {
  const hasHook = input.hook.trim().length > 8;
  const hasCaption = input.caption.trim().length > 30;
  const categories = [
    { name: 'Opening hook', score: hasHook ? 70 : 42, reason: hasHook ? 'A hook was provided; test whether it creates a clear curiosity gap.' : 'No hook text was provided, so the opening cannot be fully assessed.' },
    { name: 'Story & clarity', score: hasCaption ? 68 : 48, reason: hasCaption ? 'A caption or script is available to assess the message.' : 'Add a concise script or caption for a stronger story review.' },
    { name: 'Visual storytelling', score: input.frames.length ? 55 : 35, reason: input.frames.length ? 'Frames were extracted, but visual AI is unavailable in fallback mode.' : 'Video frames were unavailable for inspection.' },
    { name: 'Audience fit', score: input.audience ? 67 : 50, reason: input.audience ? 'Audience was specified; make the benefit immediately relevant to them.' : 'Define a specific audience to make the reel more targeted.' },
    { name: 'Share & save potential', score: hasCaption ? 62 : 45, reason: 'This is a heuristic estimate; actual sharing behavior cannot be known before posting.' }
  ];
  const score = clamp(categories.reduce((sum, c) => sum + c.score * ({'Opening hook':.25,'Story & clarity':.2,'Visual storytelling':.2,'Audience fit':.15,'Share & save potential':.2}[c.name]), 0));
  const nicheTag = input.niche.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hindiCategories = [
    { name: 'शुरुआती हुक', score: categories[0].score, reason: hasHook ? 'हुक दिया गया है; देखें कि क्या यह दर्शकों में स्पष्ट जिज्ञासा जगाता है।' : 'हुक का पाठ नहीं दिया गया, इसलिए शुरुआत का पूरा आकलन संभव नहीं है।' },
    { name: 'कहानी और स्पष्टता', score: categories[1].score, reason: hasCaption ? 'संदेश का आकलन करने के लिए कैप्शन या स्क्रिप्ट उपलब्ध है।' : 'बेहतर कहानी के आकलन के लिए संक्षिप्त स्क्रिप्ट या कैप्शन जोड़ें।' },
    { name: 'दृश्य कहानी', score: categories[2].score, reason: input.frames.length ? 'फ्रेम निकाले गए, लेकिन इस मोड में दृश्य AI उपलब्ध नहीं है।' : 'जांच के लिए वीडियो फ्रेम उपलब्ध नहीं थे।' },
    { name: 'दर्शकों के लिए उपयुक्तता', score: categories[3].score, reason: input.audience ? 'दर्शक बताए गए हैं; लाभ को उनके लिए तुरंत प्रासंगिक बनाएं।' : 'रील को अधिक लक्षित बनाने के लिए विशिष्ट दर्शक तय करें।' },
    { name: 'शेयर और सेव की संभावना', score: categories[4].score, reason: 'यह एक अनुमान है; पोस्ट करने से पहले वास्तविक शेयर व्यवहार ज्ञात नहीं हो सकता।' }
  ];
  return {
    mode: 'fallback', score, label: 'CONTENT READINESS', headline: score >= 70 ? 'Good foundations — sharpen the details' : 'A few focused edits could help',
    summary: 'This is a transparent heuristic baseline, not a model-based review or a prediction of views.', categories,
    recommendations: [
      hasHook ? 'Make the opening more specific: promise a clear payoff or challenge a familiar belief in the first 1–2 seconds.' : 'Write a punchy first-line hook before editing. Lead with a surprising result, a specific problem, or a clear promise.',
      'Remove pauses and repeated points; make each cut earn the next second of attention.',
      'Add high-contrast, readable subtitles and keep key text away from Instagram’s interface overlays.',
      'End with one natural action that matches your goal: save this, share with a friend, or comment with an opinion.'
    ],
    hashtags: [''+nicheTag, 'reelsinstagram', 'reelscreator', 'contentcreator', 'explorepage'],
    suggestedHook: hasHook ? input.hook.trim().slice(0, 200) : `Stop scrolling if you're into ${input.niche.toLowerCase()} — here's what nobody tells you.`,
    suggestedCaption: hasCaption ? input.caption.trim().slice(0, 300) : `A quick, honest take on ${input.niche.toLowerCase()} for ${input.audience || 'anyone getting started'}. Save this for later and tell me your take in the comments.`,
    trends: trendItems.slice(0, 4).map(t => ({ title: t.title, reason: 'Trend signal to investigate; adapt it to your niche rather than copying blindly.' })),
    periodLabel: input.period === 'month' ? 'Monthly trend angles to explore' : 'Weekly trend angles to explore',
    disclaimer: 'Fallback mode: no AI model was available. Scores are rule-based estimates and trends are public search signals, not Instagram virality data.',
    hindi: {
      label: 'सामग्री की तैयारी',
      headline: score >= 70 ? 'अच्छी शुरुआत है, अब कुछ बारीकियां सुधारें' : 'कुछ छोटे बदलावों से रील बेहतर हो सकती है',
      summary: 'यह नियम-आधारित शुरुआती आकलन है, AI समीक्षा या व्यूज़ का अनुमान नहीं।',
      categories: hindiCategories,
      recommendations: [
        hasHook ? 'शुरुआत को अधिक खास बनाएं: पहले 1–2 सेकंड में स्पष्ट नतीजे का वादा करें या आम धारणा को चुनौती दें।' : 'एडिटिंग से पहले एक दमदार शुरुआती पंक्ति लिखें। चौंकाने वाला नतीजा, खास समस्या या स्पष्ट वादा पेश करें।',
        'रुकावटें और दोहराई गई बातें हटाएं; हर कट दर्शक का अगला सेकंड पाने लायक हो।',
        'पढ़ने में आसान, स्पष्ट सबटाइटल लगाएं और जरूरी टेक्स्ट को Instagram के इंटरफेस से दूर रखें।',
        'अपने लक्ष्य के अनुसार एक सहज आग्रह के साथ खत्म करें: सेव करें, दोस्त को भेजें या अपनी राय बताएं।'
      ],
      suggestedHook: `रुकिए, ${input.niche.toLowerCase()} के बारे में यह बात शायद आपको किसी ने नहीं बताई।`,
      suggestedCaption: `${input.audience || 'शुरुआत कर रहे लोगों'} के लिए ${input.niche.toLowerCase()} पर एक छोटा और सच्चा सुझाव। बाद के लिए सेव करें और अपनी राय कमेंट में बताएं।`,
      trends: trendItems.slice(0, 4).map(t => ({ title: t.title, reason: 'यह खोज रुचि का संकेत है; नकल करने के बजाय इसे अपने विषय के अनुसार ढालें।' })),
      periodLabel: input.period === 'month' ? 'महीने के लिए ट्रेंड विषय' : 'हफ्ते के लिए ट्रेंड विषय',
      disclaimer: 'फॉलबैक मोड: AI मॉडल उपलब्ध नहीं था। स्कोर नियम-आधारित अनुमान हैं और ट्रेंड सार्वजनिक खोज संकेत हैं, Instagram वायरलिटी डेटा नहीं।'
    }
  };
}

export async function onRequestPost({ request, env }) {
  let input;
  let trends = [];
  try {
    const form = await request.formData();
    const video = form.get('video');
    if (!video || typeof video.arrayBuffer !== 'function') return json({ error: 'Please upload a video.' }, 400);
    if (video.size > 25 * 1024 * 1024) return json({ error: 'Video exceeds the 25 MB limit.' }, 413);
    if (!/^video\/(mp4|quicktime|webm|x-m4v)$/i.test(video.type || '')) return json({ error: 'Use an MP4, MOV or WebM video.' }, 415);
    input = {
      niche: String(form.get('niche') || 'General').slice(0, 100), audience: String(form.get('audience') || '').slice(0, 240),
      hook: String(form.get('hook') || '').slice(0, 2000), caption: String(form.get('caption') || '').slice(0, 6000),
      period: form.get('period') === 'month' ? 'month' : 'week', goal: String(form.get('goal') || 'Reach and shares').slice(0, 100), frames: []
    };
    try { input.frames = JSON.parse(String(form.get('frames') || '[]')).filter(x => typeof x === 'string' && x.startsWith('data:image/jpeg;base64,')).slice(0, 3); } catch {}
    try { const t = await fetch(new URL('/api/trends', request.url), { headers: { accept: 'application/json' } }); if (t.ok) trends = ((await t.json()).trends || []).slice(0, 8); } catch {}
    if (!env.AI) return json(fallback(input, trends));
    const prompt = `You are a careful Instagram Reels content coach. Review the supplied frame images (if any) and creator-provided text. Never claim you know Instagram's ranking system, future reach, live viral audio, or exact virality probability. Use the trends list only as public search-interest context, not Instagram trend proof. Return ONLY valid JSON with schema: {"score":integer 0-100,"label":"CONTENT READINESS","headline":string,"summary":string,"categories":[{"name":"Opening hook","score":0-100,"reason":string},{"name":"Story & clarity","score":0-100,"reason":string},{"name":"Visual storytelling","score":0-100,"reason":string},{"name":"Audience fit","score":0-100,"reason":string},{"name":"Share & save potential","score":0-100,"reason":string}],"recommendations":[string,string,string,string],"hashtags":["#tag1","#tag2","#tag3","#tag4","#tag5"],"suggestedHook":string,"suggestedCaption":string,"trends":[{"title":string,"reason":string}],"periodLabel":string,"disclaimer":string,"hindi":{"label":string,"headline":string,"summary":string,"categories":[{"name":string,"score":integer,"reason":string}],"recommendations":[string],"suggestedHook":string,"suggestedCaption":string,"trends":[{"title":string,"reason":string}],"periodLabel":string,"disclaimer":string}}. Hindi must be natural, creator-friendly Hindi in Devanagari, not transliterated English; translate all user-facing report text and category names while preserving scores and the exact five hashtags. Keep public trend titles unchanged. Give exactly 5 relevant, non-spammy hashtags; mix niche and broader tags. Avoid generic #viral/#fyp unless justified. Scores measure content readiness, never predict views. Make recommendations concrete and refer to visible evidence only when supported by frames. suggestedHook must be a punchy, specific rewrite of the opening 1-3 seconds (first-person, ready to use on screen); suggestedCaption must be a ready-to-post caption matching the niche, audience and goal. Provide both in English and Hindi. If info is missing, write plausible, honest suggestions rather than leaving them blank. Use the requested period to label trend angles. Include up to 4 trend items from the provided public data; do not invent live trends.\nCreator input: ${JSON.stringify({niche:input.niche,audience:input.audience,hook:input.hook,caption:input.caption,goal:input.goal,period:input.period,publicTrendSignals:trends.map(t=>({title:t.title,traffic:t.traffic}))})}`;
    let messages = [{ role: 'user', content: [{ type: 'text', text: prompt }] }];
    for (const frame of input.frames) messages[0].content.push({ type: 'image_url', image_url: { url: frame } });
    let result;
    let aiMode = 'ai-vision';
    try {
      result = await env.AI.run(MODEL, {
        messages,
        max_tokens: 2400,
        chat_template_kwargs: { enable_thinking: false }
      });
    } catch (visionError) {
      // If vision inference is unavailable, retry with GLM-4.7-Flash (text-only).
      aiMode = 'ai-text-only';
      result = await env.AI.run(TEXT_MODEL, {
        messages: [{ role: 'user', content: prompt + '\nNOTE: Vision processing was unavailable. Do not claim to have seen video frames; assess only the text provided.' }],
        max_tokens: 2400
      });
    }
    const raw = extractText(result);
    const parsed = parseJson(raw);
    const categories = Array.isArray(parsed.categories) ? parsed.categories.slice(0, 5).map(c => ({ name: String(c.name || 'Category').slice(0, 80), score: clamp(c.score), reason: String(c.reason || '').slice(0, 350) })) : [];
    const recs = Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 5).map(x => String(x).slice(0, 500)) : [];
    let hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5).map(x => { const tag = String(x).replace(/[^#\p{L}\p{N}_]/gu, ''); return tag.startsWith('#') ? tag : '#'+tag; }) : [];
    while (hashtags.length < 5) hashtags.push(['#reelscreator','#contentstrategy','#creatorcommunity','#reelsideas','#instagramtips'][hashtags.length]);
    const hindiFallback = fallback(input, trends).hindi;
    const parsedHindi = parsed.hindi || {};
    const hindi = {
      label: String(parsedHindi.label || hindiFallback.label).slice(0, 80),
      headline: String(parsedHindi.headline || hindiFallback.headline).slice(0, 140),
      summary: String(parsedHindi.summary || hindiFallback.summary).slice(0, 500),
      categories: Array.isArray(parsedHindi.categories) ? parsedHindi.categories.slice(0, 5).map((c, i) => ({ name: String(c.name || hindiFallback.categories[i]?.name || 'श्रेणी').slice(0, 80), score: clamp(c.score ?? categories[i]?.score), reason: String(c.reason || hindiFallback.categories[i]?.reason || '').slice(0, 350) })) : hindiFallback.categories,
      recommendations: Array.isArray(parsedHindi.recommendations) ? parsedHindi.recommendations.slice(0, 5).map(x => String(x).slice(0, 500)) : hindiFallback.recommendations,
      suggestedHook: String(parsedHindi.suggestedHook || hindiFallback.suggestedHook).slice(0, 200),
      suggestedCaption: String(parsedHindi.suggestedCaption || hindiFallback.suggestedCaption).slice(0, 400),
      trends: Array.isArray(parsedHindi.trends) ? parsedHindi.trends.slice(0, 4).map((t, i) => ({ title: String(t.title || trends[i]?.title || '').slice(0, 120), reason: String(t.reason || hindiFallback.trends[i]?.reason || '').slice(0, 220) })) : hindiFallback.trends,
      periodLabel: String(parsedHindi.periodLabel || hindiFallback.periodLabel).slice(0, 120),
      disclaimer: String(parsedHindi.disclaimer || hindiFallback.disclaimer).slice(0, 400)
    };
    return json({ mode: aiMode, score: clamp(parsed.score), label: String(parsed.label || 'CONTENT READINESS'), headline: String(parsed.headline || 'Your report is ready').slice(0, 140), summary: String(parsed.summary || '').slice(0, 500), categories, recommendations: recs, hashtags, suggestedHook: String(parsed.suggestedHook || '').slice(0, 200), suggestedCaption: String(parsed.suggestedCaption || '').slice(0, 400), trends: Array.isArray(parsed.trends) ? parsed.trends.slice(0, 4).map(t => ({title:String(t.title||'').slice(0,120),reason:String(t.reason||'').slice(0,220)})) : [], periodLabel: String(parsed.periodLabel || (input.period === 'month' ? 'Monthly trend angles' : 'Weekly trend angles')), disclaimer: String(parsed.disclaimer || 'Content-readiness score only; not a guarantee of reach or virality.').slice(0, 400), hindi });
  } catch (err) {
    // Keep the product usable when a model is unavailable, its quota is exhausted,
    // or the model returns malformed JSON. The UI will clearly label this as fallback.
    if (input) {
      const result = fallback(input, trends);
      result.aiError = String(err?.message || 'Workers AI request failed').slice(0, 180);
      return json(result);
    }
    return json({ error: 'Could not read the uploaded video. Please try an MP4, MOV, or WebM file under 25 MB.', detail: String(err?.message || '').slice(0, 180) }, 500);
  }
}
