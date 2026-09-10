const UPSTREAM = 'https://legalnavi-chat.yuneunmi814.workers.dev';
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequest({ request, env = {} }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');
  if (!['/api/ask', '/api/chat', '/api/caps'].includes(path)) return json({ error: 'Not found' }, 404);
  const method = path === '/api/caps' ? 'GET' : 'POST';
  if (request.method !== method) return json({ error: 'Method not allowed' }, 405);
  if (method === 'POST' && request.headers.get('origin') && request.headers.get('origin') !== url.origin) return json({ error: 'Forbidden' }, 403);
  let body;
  if (method === 'POST') {
    if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'JSON required' }, 415);
    // Read a bounded stream, including requests without Content-Length.
    const reader = request.body?.getReader();
    const chunks = []; let size = 0;
    if (!reader) return json({ error: 'Missing body' }, 400);
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 32768) { await reader.cancel(); return json({ error: 'Too large' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try {
      body = new TextDecoder().decode(bytes); const data = JSON.parse(body);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'Invalid input' }, 400);
      if (path === '/api/ask' && (typeof data.q !== 'string' || data.q.trim().length < 2 || data.q.length > 300)) return json({ error: 'Invalid question' }, 400);
      if (path === '/api/chat' && (!Array.isArray(data.messages) || !data.messages.length || data.messages.length > 32 || !data.messages.every(m => m && ['user', 'bot'].includes(m.role) && typeof m.text === 'string' && m.text.length <= 6000) || (data.topic != null && (typeof data.topic !== 'string' || data.topic.length > 200)))) return json({ error: 'Invalid conversation' }, 400);
    } catch { return json({ error: 'Invalid JSON' }, 400); }
  }
  try {
    const upstream = new Request(UPSTREAM + path, { method, headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(50000), redirect: 'manual' });
    const result = env.GUIDANCE ? await env.GUIDANCE.fetch(upstream) : await fetch(upstream.url, { method, headers: { 'content-type': 'application/json' }, body, signal: upstream.signal, redirect: 'manual' });
    if (!result.ok) return json({ error: '안내 서버에 연결하지 못했습니다.' }, 502);
    return json(await result.json());
  } catch { return json({ error: '안내 서버의 응답이 늦어지고 있습니다.' }, 503); }
}
