// v3 측정: 테스트 10건을 앱과 같은 순서(추가 질문 → 이해한 내용 → 시트 → 컬러 → 템플릿)로 실제 AI에 보내고 지표 계산
// 실행: 실제 AI 모드로 dev 서버를 띄운 뒤 (FAKE_AI=0 npx next dev -p 3100) → npx -y tsx@4.19.2 scripts/measure-v3.ts [P01 P02 ...]
// 가상 사용자 답변은 테스트 CSV(설명·메모·가격·채널·타깃)에서만 가져옴. 보기는 그 정보에 가장 가까운 것을 고름
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  D, St, emptyState, answerText, brandType, parseSheet, parsePalettes, sheetText, sheetQuotes, unmatched,
  findExaggeration, userText, asList, Kind, infoText,
} from "../lib/logic";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? "../results/v3/measure_20261030";

type P = { kind: Kind; picks: string[][]; notes: string[]; traits: string[]; tone: string; channel: string };
const PERSONA: Record<string, P> = {
  P01: { kind: "상품", channel: "스마트스토어",
    picks: [["아깝게 버려지는 걸 살리고 싶어서"], ["믿고 먹는(쓰는) 좋은 걸 알리기", "내 이야기가 담긴 브랜드로 기억되기"], ["30대", "40대", "취향·감성을 중시하는 사람"], ["사연·정성이 담긴 걸 찾기 어렵다", "믿을 만한 걸 고르기 어렵다"], ["더 좋은 재료·품질", "환경을 생각하는 방식"], []],
    notes: ["부모님 귤밭에서 버려지는 못난이 귤이 아까워서 시작", "", "", "", "못난이 감귤 껍질까지 쓰고 설탕 대신 원당 사용", "버려지던 귤 껍질까지 살린 제주 수제 귤피청"],
    traits: ["따뜻한", "친근한", "전통·정겨운", "차분한"], tone: "작은 것 하나에도 마음을 담았어요." },
  P02: { kind: "상품", channel: "스마트스토어",
    picks: [["아깝게 버려지는 걸 살리고 싶어서"], ["믿고 먹는(쓰는) 좋은 걸 알리기", "동네·단골과 오래 함께하기"], ["30대", "40대", "아이 키우는 부모", "가성비를 따지는 사람"], ["가격이 부담된다", "믿을 만한 걸 고르기 어렵다"], ["부담 없는 가격", "나만의 사연·출신"], []],
    notes: ["해마다 상품성 떨어진다고 버리는 사과가 30%가 넘어서", "", "", "", "버려지던 사과를 직접 골라 담아 팔기 시작한 과수원", "모양은 못생겨도 맛과 당도는 일반 사과와 똑같다는 것"],
    traits: ["따뜻한", "친근한", "전통·정겨운", "차분한"], tone: "오늘도 정성껏 준비했어요. 편하게 만나 보세요!" },
  P03: { kind: "상품", channel: "당근 비즈프로필",
    picks: [["가족·지역의 전통을 잇고 싶어서"], ["내 이야기가 담긴 브랜드로 기억되기", "동네·단골과 오래 함께하기"], ["40대", "50대", "60대 이상"], ["사연·정성이 담긴 걸 찾기 어렵다"], ["나만의 사연·출신"], []],
    notes: ["씨앗을 사지 않고 직접 받아 심는 집이 동네에 우리 집만 남음", "", "", "", "할아버지 때부터 3대째 씨앗을 받아 키우는 토종 찰옥수수", "여름 한 달만 맛볼 수 있는 3대째 토종 찰옥수수"],
    traits: ["따뜻한", "친근한", "전통·정겨운", "차분한"], tone: "이웃처럼 편하게 찾아 주세요." },
  P04: { kind: "상품", channel: "인스타그램",
    picks: [["아깝게 버려지는 걸 살리고 싶어서"], ["아무도 안 해 본 걸 처음 선보이기", "내 이야기가 담긴 브랜드로 기억되기"], ["20대", "30대", "취향·감성을 중시하는 사람"], ["늘 비슷해서 지루하다", "사연·정성이 담긴 걸 찾기 어렵다"], ["환경을 생각하는 방식", "특별한 경험·분위기"], []],
    notes: ["버려지는 현수막 양을 보고 충격받아 시작", "", "", "", "", "같은 디자인이 하나도 없는 현수막 업사이클 에코백"],
    traits: ["세련된", "친근한", "새롭고 감각적인", "활기찬"], tone: "복잡한 건 빼고, 좋은 것만." },
  // 흔한 특징: '특별한 이유 없음' → 장면 1은 보기 중 가장 가까운 것, 장면 6은 짧게(추가 질문 확인)
  P05: { kind: "상품", channel: "스마트스토어",
    picks: [["좋아하던 걸 일로 만들고 싶어서"], ["나만의 일로 안정적인 수입 만들기"], ["30대", "40대", "50대", "가성비를 따지는 사람"], ["가격이 부담된다"], ["부담 없는 가격"], []],
    notes: ["특별한 이유 없음. 그냥 감자 농사지어서 팔아야 함", "", "", "", "", "강원도 감자"],
    traits: ["따뜻한", "친근한", "전통·정겨운", "차분한"], tone: "오늘도 정성껏 준비했어요. 편하게 만나 보세요!" },
  // 정보 부족: 메모 없음, 장면 6 짧게
  P06: { kind: "상품", channel: "인스타그램",
    picks: [["좋아하던 걸 일로 만들고 싶어서"], ["나만의 일로 안정적인 수입 만들기"], ["20대", "30대"], ["어디서 사야 할지 모르겠다"], ["손으로 직접, 정성껏"], []],
    notes: ["", "", "", "", "", "맛있는 쿠키"],
    traits: ["따뜻한", "친근한", "새롭고 감각적인", "활기찬"], tone: "작은 것 하나에도 마음을 담았어요." },
  // 효능 과장: 입력에 과장 표현을 그대로 둠 → 결과에 남는지 측정
  P07: { kind: "상품", channel: "스마트스토어",
    picks: [["누군가에게 도움이 되고 싶어서"], ["누군가의 몸과 마음을 챙기기", "나만의 일로 안정적인 수입 만들기"], ["30대", "40대", "50대", "건강을 챙기는 사람"], ["믿을 만한 걸 고르기 어렵다"], ["더 좋은 재료·품질"], []],
    notes: ["지인 제품 판매 대행", "", "", "", "국내 1등 콜라겐", "먹으면 주름 사라짐, 100% 효과 보장"],
    traits: ["세련된", "전문적인", "새롭고 감각적인", "활기찬"], tone: "필요한 것만, 정확하게 제공합니다." },
  P08: { kind: "서비스", channel: "당근 비즈프로필",
    picks: [["내가 겪은 어려움을 다른 사람은 덜 겪게 하고 싶어서"], ["손님의 일상을 조금 더 편하게", "손님이 실제로 달라지는 걸 보기"], ["30대", "바쁜 직장인"], ["시간이 없다", "혼자서는 꾸준히 못 하겠다"], ["시간·장소가 편함", "내 경험에서 나온 노하우"], []],
    notes: ["트레이너 본인이 직장인 시절 운동할 시간이 없었던 경험", "", "", "", "직장인 시절 운동할 시간이 없었던 경험", "출근 전 30분이면 운동을 시작할 수 있다는 것"],
    traits: ["따뜻한", "친근한", "새롭고 감각적인", "활기찬"], tone: "이웃처럼 편하게 찾아 주세요." },
  P09: { kind: "서비스", channel: "인스타그램",
    picks: [["내 경험담을 들려주고 싶어서"], ["손님이 실제로 달라지는 걸 보기", "내 이야기가 담긴 브랜드로 기억되기"], ["20대", "30대", "바쁜 직장인", "취향·감성을 중시하는 사람"], ["뻔한 방식은 지루하다", "나와 비슷한 사람의 경험을 듣고 싶다"], ["한 사람 한 사람 맞춤", "내 경험에서 나온 노하우"], []],
    notes: ["회사 다니며 번아웃 왔을 때 흙 만지면서 회복한 경험", "", "", "", "번아웃 왔을 때 흙 만지면서 회복한 경험", "흙 만지며 쉬어 가는 2시간"],
    traits: ["따뜻한", "친근한", "새롭고 감각적인", "차분한"], tone: "작은 것 하나에도 마음을 담았어요." },
  // 성과 과장
  P10: { kind: "서비스", channel: "네이버 블로그",
    picks: [["누군가 성장하는 걸 돕고 싶어서"], ["실력 있는 사람으로 인정받기", "손님이 실제로 달라지는 걸 보기"], ["20대"], ["믿을 만한 사람을 찾기 어렵다", "어디서 배워야(맡겨야) 할지 모르겠다"], ["쌓아 온 실력·경력", "한 사람 한 사람 맞춤"], []],
    notes: ["인사팀 8년 일하며 좋은 사람이 이력서 때문에 떨어지는 걸 많이 봄", "", "", "", "현직 인사담당자 출신, 인사팀 8년", "무조건 서류 합격, 100% 합격 보장"],
    traits: ["세련된", "전문적인", "새롭고 감각적인", "차분한"], tone: "기준은 분명하게, 설명은 정확하게." },
};

const rows = Object.fromEntries(readFileSync("../20261028_테스트상품_v3.csv", "utf-8").trim().split("\n").slice(1)
  .map(l => l.split(",")).map(r => [r[0], r]));

function makeState(id: string): St {
  const r = rows[id], p = PERSONA[id], s = emptyState();
  const memo = r[7] === "모름" ? "" : `가격대: ${r[7]} / 판매 채널: ${r[8]} / 생각하는 타깃: ${r[9]}`;
  return { ...s, kind: p.kind, name: r[5], desc: r[6], memo, picks: p.picks, notes: p.notes,
    answers: p.picks.map((c, i) => answerText(c, p.notes[i])), traits: p.traits, tone: p.tone };
}

async function ask(name: string, s: St, extra: Record<string, string> = {}) {
  const t0 = Date.now();
  const state = { step: s.step, kind: s.kind, name: s.name, desc: s.desc, memo: s.memo, answers: s.answers, picks: s.picks, notes: s.notes, traits: s.traits, tone: s.tone, fix: s.fix };
  const j = await (await fetch(`${BASE}/api/ai`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, state, extra }) })).json();
  if (j.error) throw new Error(`${name}: ${j.error}`);
  return { text: j.text as string, sec: Math.round((Date.now() - t0) / 1000) };
}

async function run(id: string) {
  let s = makeState(id);
  const log: string[] = [], sec: Record<string, number> = {};
  const sc5 = D.SCENES[s.kind][5], note5 = s.notes[5];
  if (note5.length < D.MIN_LEN) { // 앱과 같이: 장면 6 답이 짧으면 추가 질문 1번 (사용자는 그대로 넘어간다고 가정)
    const f = await ask("FOLLOWUP", { ...s, step: 2 }, { question: sc5.ask, answer: note5, name: s.name });
    sec.FOLLOWUP = f.sec; log.push(`## 추가 질문 (장면 6 답 "${note5}"이 짧아서)\n${f.text}`);
  }
  s = { ...s, step: 4 };
  const r = await ask("REFLECT", s); sec.REFLECT = r.sec; s.reflect = r.text;
  s = { ...s, step: 5 };
  let sheet = null, tries = 0;
  while (!sheet && tries < 2) { tries++; const x = await ask("SHEET", s); sec.SHEET = (sec.SHEET ?? 0) + x.sec; sheet = parseSheet(x.text); }
  if (!sheet) throw new Error("SHEET 형식 오류 2번");
  s.sheet = sheet;
  let c = await ask("COLORS", s); sec.COLORS = c.sec; s.palettes = parsePalettes(c.text);
  if (!s.palettes.length) { log.push(`## 컬러 첫 요청 원문 (0개로 해석됨)\n${c.text}`); c = await ask("COLORS", s); sec.COLORS += c.sec; s.palettes = parsePalettes(c.text); } // 앱과 같이 한 번 더
  const ch = PERSONA[id].channel;
  const t = await ask("TEMPLATE", s, { channel: ch, items: D.CHANNELS[ch], brief: sheetText(s) }); sec.TEMPLATE = t.sec;
  s.tpl = { [ch]: t.text };

  // 지표 (결과 화면과 같은 계산)
  const resultText = Object.values(sheet).flatMap(it => [...asList(it?.value), ...asList(it?.options), ...asList(it?.points), it?.example ?? ""]).map(String).join("\n");
  const exIn = findExaggeration(userText(s)), exSheet = findExaggeration(resultText), exTpl = findExaggeration(t.text);
  const quotes = sheetQuotes(s), bad = unmatched(quotes, s);
  const [type] = brandType(s.kind, s.picks);
  const m = { id, name: s.name, type, sheetTries: tries, palettes: s.palettes.length, exIn: exIn.map(e => e.word), exSheet: exSheet.map(e => e.word), exTpl: exTpl.map(e => e.word),
    quotes: quotes.length, matched: quotes.length - bad.length, bad, sec, totalSec: Object.values(sec).reduce((a, b) => a + b, 0), channel: ch };

  writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ metrics: m, state: s }, null, 1));
  writeFileSync(`${OUT}/${id}.md`, [
    `# ${id} ${s.name} — v3 측정 (2026-10-30, 모델: .env의 OPENAI_MODEL, 프롬프트 v3.4)`,
    `- 브랜드 유형(앱 계산): ${type}형 / 시트 시도 ${tries}번 / 컬러 ${s.palettes.length}안 / 걸린 시간 ${m.totalSec}초 ${JSON.stringify(sec)}`,
    `- 과장 표현: 입력 ${exIn.length}개 [${m.exIn.join(", ")}] → 시트 ${exSheet.length}개 [${m.exSheet.join(", ")}] / 템플릿 ${exTpl.length}개 [${m.exTpl.join(", ")}]`,
    `- 근거 인용: ${quotes.length}개 중 ${m.matched}개 일치${bad.length ? ` / 불일치: ${bad.join(" / ")}` : ""}`,
    `\n## 입력 (가상 사용자)\n\`\`\`\n${infoText(s)}\n\`\`\``,
    ...log, `## 이해한 내용 (REFLECT)\n${s.reflect}`,
    `## 브랜드 아이덴티티 시트\n${sheetText(s)}`,
    `## 상세 (why)\n${Object.entries(D.SHEET_LABELS).map(([k, l]) => `### ${l}\n${String(sheet[k]?.why ?? "")}\n- 인용: ${asList(sheet[k]?.quotes).join(" / ")}`).join("\n\n")}`,
    `## 컬러\n${s.palettes.map(p => `- ${p.name}: ${p.colors.map(x => `${x.hex}(${x.role})`).join(" ")} — ${p.why}`).join("\n")}`,
    `## 활용 템플릿 (${ch})\n${t.text}`,
  ].join("\n\n"));
  return m;
}

mkdirSync(OUT, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PERSONA);
(async () => {
  for (const id of ids) {
    try { const m = await run(id); console.log(JSON.stringify(m)); }
    catch (e) { console.log(JSON.stringify({ id, error: String(e) })); }
  }
})();
