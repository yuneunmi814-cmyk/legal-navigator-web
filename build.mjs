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

/** 랜딩 HTML에 이미 114종이 박혀 있으므로 그걸 원본으로 삼는다(목록을 두 곳에서 관리하지 않기 위해). */
async function readForms() {
  const html = await readFile("index.html", "utf8");
  const forms = [...html.matchAll(/data-k="([^"]+)"\s+data-t="([^"]+)"\s+data-u="([^"]+)"/g)].map(
    ([, k, t, u]) => ({
      k: k.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
      t: t.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
      u: u.replace(/&amp;/g, "&").replace(/&quot;/g, '"'),
    })
  );
  if (!forms.length) throw new Error("index.html에서 서식 목록을 못 찾았습니다 (data-k/t/u 속성 확인)");
  return forms;
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

  // MCP 절대주소로 나가는 링크(.txt 내려받기 등)를 우리 도메인 상대경로로 돌린다.
  html = html.split(MCP + "/").join("/");

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
  const forms = await readForms();
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

  console.log(`서식 ${done}/${forms.length}종 생성 · ${Math.round(bytes / 1024)}KB`);
  console.log(`sitemap.xml ${urls.length}건 · robots.txt`);
  console.log(`기준 주소 SITE=${SITE}`);
  if (failed.length) {
    console.error(`\n❌ 실패 ${failed.length}건:`);
    failed.forEach((x) => console.error("  " + x));
    process.exitCode = 1;
  }
}

run();
