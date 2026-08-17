# 법률 절차 길잡이 — 웹 (legal-navigator-web)

생활법률 안내 서비스 **법률 절차 길잡이**의 소개 페이지와 서식 페이지.

**https://legalnavi.pages.dev**

MCP 서버(대화로 물어보는 쪽)는 별도 저장소에 있습니다 →
[legal-navigator-mcp](https://github.com/yuneunmi814-cmyk/legal-navigator-mcp)

---

## 무엇이 들어 있나

| | |
|---|---|
| `index.html` | 소개 페이지 한 장. 서식 검색도 여기 들어 있습니다 |
| `forms/` | **서식 114종의 개별 페이지** — 빌드로 생성되며 직접 고치지 않습니다 |
| `brochure/` | 기관 유형별 소개서 PDF 9종 |
| `build.mjs` | 서식 페이지·사이트맵 생성기 (아래 참고) |
| `scripts/brochure.mjs` | 소개서 PDF 9종 생성기 |
| `_headers` | Cloudflare Pages 응답 헤더 (캐시·보안) |
| `404.html` | 없는 주소로 들어왔을 때 |

빌드 도구도 프레임워크도 쓰지 않습니다. **손으로 쓴 정적 HTML 한 장**입니다.
로그인도 서버도 데이터베이스도 없습니다 — 수집하는 개인정보가 0인 이유입니다.

---

## 서식 페이지는 어떻게 만들어지나

서식 114종의 내용은 **MCP 서버가 원본**입니다. 이 저장소는 그걸 받아서
우리 도메인에 정적 페이지로 굽습니다.

```bash
node build.mjs
```

이 한 줄이 하는 일:

1. MCP의 `tools/list`에서 **서식 목록과 커버리지 수치를 직접 읽습니다**
   (도구 스키마의 enum이 곧 MCP가 실제로 가진 목록이라 이보다 정확한 출처가 없습니다)
2. 서식 114종을 받아 `forms/` 에 페이지로 저장합니다 — 검색 노출용 제목·설명·canonical을 붙여서
3. `index.html`의 **서식 목록과 통계 숫자를 다시 씁니다**
4. `sitemap.xml`·`robots.txt`를 만듭니다
5. 새로 생기거나 빠진 서식이 있으면 이름으로 알려줍니다

**MCP에 서식을 추가한 뒤에는 이걸 한 번 돌려야 웹에도 반영됩니다.**

```bash
SITE=https://legalnavi.kr node build.mjs   # 도메인을 붙인 뒤
MCP=http://localhost:4100 node build.mjs   # 로컬 MCP에서 뽑을 때
```

> 법령 258건·판례 194건·용어 125개는 도구 목록으로 노출되지 않아 아직 손으로 적습니다
> (`index.html`의 통계 아래 한 줄).

---

## 소개서 PDF

```bash
node scripts/brochure.mjs
```

원본은 `~/Desktop/AGENTIC_PLAYER10_공모전/04_발표_홍보/기관용_소개서_A4.html` 입니다.
기관 유형별 HTML을 만들어 헤드리스 크롬으로 9종을 한 번에 뽑습니다.
커버리지 수치가 바뀌면 스크립트 안의 `nums` 배열만 고치면 됩니다.

---

## 배포

Cloudflare Pages (프로젝트명 `legalnavi`).

```bash
node build.mjs                                    # 서식 먼저 굽고
npx wrangler pages deploy . --project-name legalnavi --branch main
```

⚠️ `wrangler`는 **현재 셸 위치를 기준으로 올립니다.** 배포 전에 `pwd`로 이 저장소가 맞는지 확인하세요.
반영에 10~30초 걸리므로 곧바로 확인하면 이전 버전이 보입니다.

GitHub Pages에도 같은 내용이 올라가 있습니다
(`https://yuneunmi814-cmyk.github.io/legal-navigator-web/`). 도메인이 정해지면 정리할 예정입니다.

---

## 고칠 때 알아둘 것

- **`forms/` 안은 직접 고치지 마세요.** `build.mjs`가 통째로 다시 만듭니다.
  서식 내용을 고치려면 MCP 저장소의 `src/data/` 를 고치고 재배포한 뒤 여기서 빌드하세요.
- **`index.html`의 서식 목록도 직접 고치지 마세요.** 같은 이유입니다.
- CSS의 **모바일 미디어쿼리는 스타일시트 맨 끝**에 둡니다. 앞에 두면 뒤에 오는
  같은 우선순위 규칙에 덮여 조용히 무력해집니다.
- 요소를 숨길 때 `hidden` 속성만 믿지 마세요. `display`를 지정한 요소에서는
  밀립니다 (`[hidden]{display:none!important}` 규칙을 넣어둔 이유).

---

## 이 서비스가 하지 않는 것

정보 안내 도구이며 **개별 법률 자문이 아닙니다.**
서식은 표준 양식을 바탕으로 한 예시이고, 각 서식 화면에 공식 양식 받는 곳을 함께 안내합니다.
승패 판단이나 개별 사건 자문은 변호사 등 전문가의 영역입니다.

무료 법률상담 — 대한법률구조공단 국번없이 **132**

---

카카오 **AGENTIC PLAYER 10** 본선 진출작 · 팀 프로젝트윤
