/**
 * 기관용 소개서 9종 PDF 생성
 *
 * 원본은 드롭다운으로 기관을 고르고 사람이 인쇄를 9번 누르는 구조였다.
 * 그래서 수치가 낡아도 다시 만들기가 번거로웠다. 기관별 HTML을 미리
 * 만들어 두고 한 번에 뽑는다.
 *
 *   node scripts/brochure.mjs
 *   SRCDIR=/다른/경로 node scripts/brochure.mjs
 *
 * 원본 HTML(기관용_소개서_A4.html)은 공모전 문서라 데스크톱에 두고,
 * 결과 PDF만 이 레포가 갖는다. 커버리지 수치가 바뀌면 nums 배열을 고칠 것.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SRCDIR = process.env.SRCDIR || "/Users/piglet/Desktop/AGENTIC_PLAYER10_공모전/04_발표_홍보";
const WORK = process.env.TMPDIR ? process.env.TMPDIR + "brochure-build" : "/tmp/brochure-build";
const OUT = new URL("../brochure", import.meta.url).pathname;

// 기관유형 → 파일명. 기존 PDF 이름을 그대로 유지한다(메일에 이미 나간 링크가 있다).
const SLUG = {
  "가정폭력 상담소·보호시설": "domestic-violence",
  "이주여성·다문화 지원기관": "migrant",
  "노동 상담 단체": "labor",
  "세입자·주거 단체": "housing",
  "금융복지·채무 상담기관": "debt",
  "한부모·미혼모 지원기관": "single-parent",
  "장애인 단체": "disability",
  "범죄피해자 지원기관": "crime-victim",
  "종합사회복지관·자활기관": "welfare",
};

// 이모지는 기기·폰트마다 다르게 그려진다. 인쇄물이라 더 그렇다. 인라인 SVG로 바꾼다.
const svg = (d, w = 15) =>
  `<svg class="ic" viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  "⚖️": svg(`<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8 2.5 13.5h5zM19 8l-2.5 5.5h5z"/>`, 20),
  "📄": svg(`<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>`),
  "💡": svg(`<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.8 1 1.5 1 2.5h6c0-1 .3-1.7 1-2.5A6 6 0 0 0 12 3z"/>`),
  "✉️": svg(`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`),
};

async function main() {
  const files = await readdir(SRCDIR);
  const srcName = files.find((f) => f.endsWith(".html") && f.includes("소개서"));
  if (!srcName) throw new Error("원본 HTML을 못 찾았습니다");
  let html = await readFile(path.join(SRCDIR, srcName), "utf8");

  // 1) 낡은 수치 갱신 — 실측 기준(2026-08-17)
  const nums = [
    [/<b>56<\/b><span>분야<\/span>/, "<b>57</b><span>분야</span>"],
    [/<b>242<\/b><span>절차 주제<\/span>/, "<b>259</b><span>절차 주제</span>"],
    [/<b>111<\/b><span>빈칸 채움형 서식<\/span>/, "<b>114</b><span>빈칸 채움형 서식</span>"],
    [/서식 111종/g, "서식 114종"],
  ];
  for (const [re, to] of nums) {
    if (!re.test(html)) throw new Error(`수치 교체 실패: ${re}`);
    html = html.replace(re, to);
  }

  // CARDS는 JSON이라 이모지를 바꾸기 전에 먼저 꺼낸다.
  // (SVG 안에 따옴표가 있어서 문자열째로 치환하면 JSON이 깨진다.)
  const CARDS = JSON.parse(html.match(/const CARDS=(\{[\s\S]*?\});\n/)[1]);

  // 2) 이모지 → SVG. 본문과 카드에 각각 HTML로서 적용한다.
  const deEmoji = (s) => {
    for (const [emoji, ico] of Object.entries(ICON)) s = s.split(emoji).join(ico);
    return s;
  };
  html = deEmoji(html);
  for (const k of Object.keys(CARDS)) CARDS[k] = deEmoji(CARDS[k]);

  // 3) 아이콘 정렬용 CSS + 화면 전용 컨트롤 숨김
  html = html.replace(
    "</style>",
    `.ic{vertical-align:-2px;margin-right:4px;flex:0 0 auto}
h1 .ic{vertical-align:-3px;margin-right:6px}
.controls{display:none!important}
</style>`
  );


  await mkdir(WORK, { recursive: true });
  const made = [];

  for (const [org, cards] of Object.entries(CARDS)) {
    const slug = SLUG[org];
    if (!slug) throw new Error(`파일명 매핑 없음: ${org}`);

    // 기관명과 사례 카드를 미리 박아 넣는다(스크립트 실행 없이도 완성된 문서가 되게).
    let page = html
      .replace(/<em id="orgname">[^<]*<\/em>/, `<em id="orgname">${org}</em>`)
      .replace(/<div id="cards">[\s\S]*?<\/div>\n?(?=\s*<div class="how">)/, `<div id="cards">${cards}</div>\n`);

    const f = path.join(WORK, `${slug}.html`);
    await writeFile(f, page);

    await run(CHROME, [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${path.join(OUT, slug + ".pdf")}`,
      "file://" + f,
    ]).catch((e) => {
      if (!/task_policy_set/.test(String(e.stderr || ""))) throw e; // 맥에서 늘 나는 무해한 경고
    });
    made.push(slug);
  }

  console.log(`소개서 ${made.length}종 생성 → ${OUT}`);
  console.log("  " + made.join(", "));
}

main();
