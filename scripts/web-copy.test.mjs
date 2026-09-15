import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile('index.html','utf8');
for(const forbidden of ['ChatGPT for Kakao에서 만날','공개되면,<br>이곳에서 안내','본선 최신판','기한 · 지금 할 일 · 빈칸만 채우면'])assert.ok(!html.includes(forbidden),forbidden);
assert.equal((html.match(/<h1>/g)||[]).length,1);
for(const tag of ['name="description"','property="og:description"','name="twitter:description"']){const meta=html.split('\n').find(l=>l.includes(tag));assert.ok(meta.includes('상담 준비자료'));assert.ok(meta.includes('자동 제출·승패 예측은 하지 않습니다'));}
assert.ok(html.includes('id="coverage-checked"'));
assert.ok(html.includes('법령·서식별 최신성이나 법률 검수 완료를 보장하지 않습니다'));
assert.ok(html.includes('음성 입력·유료 결제·기관용 계정은 아직 제공하지 않습니다'));
assert.ok(html.includes('https://legalnavi.pages.dev/assets/web-share.png'));
const image=await readFile('assets/web-share.png');assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
console.log('PASS: current scope, sharing metadata, dated coverage, no competition launch promises, 1200x630 sharing image');
