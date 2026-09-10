import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/[[path]].js';
const make = (path, body, headers = {}) => new Request('https://legalnavi.pages.dev' + path, { method: 'POST', headers: {'content-type':'application/json',...headers}, body: typeof body === 'string' ? body : JSON.stringify(body) });
test('rejects unknown routes, wrong methods, cross-origin and oversized input without forwarding', async () => {
 const real = globalThis.fetch; let called = 0; globalThis.fetch = async () => { called++; throw new Error('must not call'); };
 try {
  assert.equal((await onRequest({request:make('/api/anything',{q:'보증금'})})).status,404);
  assert.equal((await onRequest({request:new Request('https://legalnavi.pages.dev/api/ask')})).status,405);
  assert.equal((await onRequest({request:make('/api/ask',{q:'보증금'},{origin:'https://elsewhere.test'})})).status,403);
  assert.equal((await onRequest({request:make('/api/ask','{')})).status,400);
  assert.equal((await onRequest({request:make('/api/ask',{q:'x'.repeat(40000)})})).status,413);
  assert.equal((await onRequest({request:make('/api/chat',{messages:[{role:'system',text:'ignored'}]})})).status,400);
  assert.equal(called,0);
 } finally {globalThis.fetch = real;}
});
test('forwards only fixed upstream without cookies and returns no-store JSON', async () => {
 const real = globalThis.fetch;
 globalThis.fetch = async (url,opts) => {assert.equal(url,'https://legalnavi-chat.yuneunmi814.workers.dev/api/ask');assert.equal(opts.headers.cookie,undefined);return Response.json({card:{children:[]}});};
 try {const r=await onRequest({request:make('/api/ask',{q:'보증금'},{cookie:'private=value'})});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{card:{children:[]}});} finally {globalThis.fetch=real;}
});
test('upstream failure is a retryable error, not a false legal answer', async () => {
 const real=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('offline')};
 try {const r=await onRequest({request:make('/api/ask',{q:'지급명령'})});assert.equal(r.status,503);assert.ok((await r.json()).error);} finally{globalThis.fetch=real;}
});
