/**
 * 서식 페이지 정적 생성기
 *
 * 왜 필요한가 — 서식 114종은 MCP 서버(카카오클라우드 주소)가 그려서 내보내고 있다.
 * 그 주소는 공모전이 내준 것이라 우리 자산이 아니고, description·canonical도 없다.
 * 검색에 걸리는 페이지 114개를 우리 도메인에 두려면 여기서 만들어 둬야 한다.
 *
 *   node build.mjs
 *   SITE=https://legalnavi.kr node build.mjs     # 도메인 붙인 뒤
 *   MCP=http://localhost:4100 node build.mjs     # 공모전 끝나고 로컬에서 뽑을 때
 *
 * 서식 내용이 바뀌면 다시 돌려야 한다. 배포 전에 항상 한 번 돌릴 것.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";

const SITE = (process.env.SITE || "https://legalnavi.pages.dev").replace(/\/$/, "");
const MCP = (process.env.MCP || "https://legal-navigator-kakaotools.playmcp-endpoint.kakaocloud.io").replace(/\/$/, "");
const OUT = "forms";
const CONCURRENCY = 6;

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const unesc = (s) =>
  String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/**
 * 서식 목록·커버리지 수치를 MCP에서 직접 받아온다.
 *
 * 예전에는 index.html에 박아둔 목록을 원본으로 삼았는데, 그러면 MCP에 서식을
 * 추가해도 랜딩이 모른다. 손으로 맞춰야 하는 건 언젠가 어긋난다.
 * tools/list 응답의 enum이 곧 MCP가 실제로 가진 목록이라 그걸 쓴다.
 */
async function fromMcp() {
  const res = await fetch(`${MCP}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
  if (!res.ok) throw new Error(`tools/list ${res.status}`);
  const tools = (await res.json()).result.tools;

  const enumOf = (tool, param) => {
    const t = tools.find((x) => x.name === tool);
    const e = t?.inputSchema?.properties?.[param]?.enum;
    if (!Array.isArray(e) || !e.length) throw new Error(`${tool}.${param} 목록을 못 읽었습니다`);
    return e;
  };

  return {
    keys: enumOf("get_form_template", "form"),
    counts: {
      분야: enumOf("search_topics", "category").length,
      주제: enumOf("get_procedure", "topic").length,
      서식: enumOf("get_form_template", "form").length,
      자가진단: enumOf("check_elements", "issue").length,
    },
  };
}

/** 서식 페이지에서 제목과 용도를 읽는다. 랜딩 목록에 그대로 쓰인다. */
function readMeta(html, key) {
  const t = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const u = html.match(/<p class="use">([\s\S]*?)<\/p>/);
  if (!t || !u) throw new Error(`제목·용도를 못 읽었습니다: ${key}`);
  return { t: unesc(t[1].replace(/<[^>]+>/g, "").trim()), u: unesc(u[1].replace(/<[^>]+>/g, "").trim()) };
}

/** 랜딩의 서식 목록과 커버리지 숫자를 MCP 기준으로 다시 쓴다. */
async function syncLanding(forms, counts) {
  let html = await readFile("index.html", "utf8");
  const before = [...html.matchAll(/data-k="([^"]+)"/g)].map((m) => unesc(m[1]));

  const items = forms
    .map(
      (f, i) =>
        `<a class="fitem" href="/forms/${encodeURIComponent(f.k)}" target="_blank" rel="noopener"` +
        ` data-k="${esc(f.k)}" data-t="${esc(f.t)}" data-u="${esc(f.u)}"${i >= 9 ? " hidden" : ""}>` +
        `<b>${esc(f.t)}</b><small>${esc(f.u)}</small></a>`
    )
    .join("\n");
  html = html.replace(/<div class="flist" id="flist">[\s\S]*?<\/div>\n?(?=\s*<div id="empty")/,
    `<div class="flist" id="flist">\n${items}\n</div>\n`);

  // 커버리지 숫자 — 통계 칸과 본문 곳곳
  const stat = (n, label) => [new RegExp(`<b>\\d+</b><span>${label}</span>`, "g"), `<b>${n}</b><span>${label}</span>`];
  for (const [re, to] of [
    stat(counts.분야, "분야"),
    stat(counts.주제, "절차 주제"),
    stat(counts.서식, "빈칸 채움형 서식"),
    stat(counts.자가진단, "자가진단"),
  ])
    html = html.replace(re, to);
  html = html
    .replace(/서식 \d+종/g, `서식 ${counts.서식}종`)
    .replace(/자가진단 \d+종/g, `자가진단 ${counts.자가진단}종`)
    .replace(/(스토킹·명예훼손·사기·횡령 등 <b>)\d+(<\/b>)/, `$1${counts.자가진단}$2`)
    .replace(/(<b>)\d+(종<\/b> — 진정서·내용증명)/, `$1${counts.서식}$2`);

  await writeFile("index.html", html);

  const now = forms.map((f) => f.k);
  return {
    added: now.filter((k) => !before.includes(k)),
    removed: before.filter((k) => !now.includes(k)),
  };
}

/** 검색 결과에 그대로 노출되는 문구들. 사람들이 실제로 치는 말이 '양식'이라 제목에 넣는다. */
function meta(f) {
  const url = `${SITE}/forms/${encodeURIComponent(f.k)}`;
  const desc = `${f.u} 회원가입 없이 빈칸을 채워 인쇄·PDF·한글(워드)로 저장하세요. 어디에 접수하는지도 함께 안내합니다.`;
  return `
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="법률 절차 길잡이">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(f.t)} 양식 — 빈칸만 채우면 됩니다">
<meta property="og:description" content="${esc(f.u)}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(f.t)} 양식 — 빈칸만 채우면 됩니다">
<meta name="twitter:description" content="${esc(f.u)}">
<meta name="twitter:image" content="${SITE}/og.png">
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${f.t} 양식`,
    description: f.u,
    inLanguage: "ko-KR",
    url,
    isPartOf: { "@type": "WebSite", name: "법률 절차 길잡이", url: SITE + "/" },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "법률 절차 길잡이", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "서식 찾기", item: SITE + "/#forms" },
        { "@type": "ListItem", position: 3, name: f.t },
      ],
    },
  })}</script>`;
}

async function buildOne(f) {
  const src = `${MCP}/forms/${encodeURIComponent(f.k)}`;
  const res = await fetch(src, { headers: { "user-agent": "legalnavi-build" } });
  if (!res.ok) throw new Error(`${res.status} ${f.k}`);
  let html = await res.text();

  if (!/<\/title>/.test(html)) throw new Error(`title 없음: ${f.k}`);

  // 제목·용도는 이 페이지가 원본이다. 랜딩 목록도 여기서 나온 값을 쓴다.
  Object.assign(f, readMeta(html, f.k));

  // MCP 절대주소로 나가는 링크(.txt 내려받기 등)를 우리 도메인 상대경로로 돌린다.
  html = html.split(MCP + "/").join("/");

  // 검색으로 이 페이지에 바로 들어온 사람에게는 여기가 사이트의 전부다.
  // 서비스가 뭔지 알려주고 다른 서식으로 갈 길을 열어준다(검색엔진이 114개를
  // 서로 이어진 한 사이트로 읽게 하는 효과도 같이).
  const home = `<div class="ln-home"><a href="/"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8 2.5 13.5h5zM19 8l-2.5 5.5h5z"/></svg><b>법률 절차 길잡이</b></a><a class="more" href="/#forms">서식 114종 전체 보기 &rsaquo;</a></div>`;
  const homeCss = `<style>
.ln-home{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;
  padding:10px 14px;background:var(--paper);border-bottom:1px solid var(--line);font-size:13.5px}
.ln-home a{display:inline-flex;align-items:center;gap:6px;color:var(--ink);text-decoration:none;
  min-height:44px}  /* 손가락으로 누르는 크기 */
.ln-home b{font-weight:800;letter-spacing:-.02em}
.ln-home .more{color:var(--accent);font-weight:700}
.ln-home .more:hover{text-decoration:underline}
@media print{.ln-home{display:none}}

/* 모바일 서식 채우기 — MCP 서버(src/server.ts)에도 같은 규칙을 넣었다.
   여기 사본은 그쪽 재배포를 기다리지 않고 먼저 반영되게 하려고 둔다.
   16px 미만이면 iOS가 빈칸을 탭할 때마다 확대해서 서식을 채울 수가 없다. */
@media (max-width:520px){
  .doc{line-height:1.9;font-size:16px}
  .fld{padding:1px 6px;min-height:1.7em}
}
</style>`;
  html = html.replace("</head>", `${homeCss}</head>`).replace(/<body([^>]*)>/, `<body$1>${home}`);

  // 제목은 검색 결과에 그대로 뜨는 한 줄이다. 사람들이 치는 말은 '양식'이라 그걸 넣는다.
  const title = `${f.t} 양식 · 무료 빈칸 채움 — 법률 절차 길잡이`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>${meta(f)}`);
  await writeFile(`${OUT}/${f.k}.html`, html);

  // 페이지 안의 '텍스트 파일' 내려받기 링크도 우리 도메인을 보게 됐으니 실제 파일을 같이 받아둔다.
  const txt = await fetch(`${src}.txt`, { headers: { "user-agent": "legalnavi-build" } });
  if (!txt.ok) throw new Error(`${txt.status} ${f.k}.txt`);
  const body = await txt.text();
  await writeFile(`${OUT}/${f.k}.txt`, body);

  return html.length + body.length;
}

async function run() {
  const { keys, counts } = await fromMcp();
  const forms = keys.map((k) => ({ k }));
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const queue = [...forms];
  const failed = [];
  let done = 0,
    bytes = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const f = queue.shift();
        try {
          bytes += await buildOne(f);
          done++;
        } catch (e) {
          failed.push(`${f.k} — ${e.message}`);
        }
      }
    })
  );

  // 사이트맵 — 검색엔진에 "이 주소들을 봐 달라"고 알려주는 목록.
  const urls = [
    { loc: SITE + "/", pri: "1.0" },
    ...forms.map((f) => ({ loc: `${SITE}/forms/${encodeURIComponent(f.k)}`, pri: "0.8" })),
  ];
  await writeFile(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.pri}</priority></url>`).join("\n") +
      `\n</urlset>\n`
  );

  await writeFile("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

  const { added, removed } = await syncLanding(forms.filter((f) => f.t), counts);

  console.log(`서식 ${done}/${forms.length}종 생성 · ${Math.round(bytes / 1024)}KB`);
  console.log(`커버리지 ${counts.분야}분야 · ${counts.주제}주제 · 서식 ${counts.서식} · 자가진단 ${counts.자가진단}`);
  console.log(`sitemap.xml ${urls.length}건 · robots.txt · 랜딩 목록 갱신`);
  console.log(`기준 주소 SITE=${SITE}`);
  if (added.length) console.log(`\n＋ 새 서식 ${added.length}종: ${added.join(", ")}`);
  if (removed.length) console.log(`\n－ 빠진 서식 ${removed.length}종: ${removed.join(", ")}`);
  if (!added.length && !removed.length) console.log(`\n서식 목록 변동 없음 — MCP와 일치`);
  if (failed.length) {
    console.error(`\n❌ 실패 ${failed.length}건:`);
    failed.forEach((x) => console.error("  " + x));
    process.exitCode = 1;
  }
}

run();
