// 화면(클라이언트)과 AI 서버 라우트가 같이 쓰는 규칙 — Streamlit app.py·scenes.py에서 그대로 옮김
import raw from "./data.json";

export type Kind = "상품" | "서비스";
export type Opt = [string, string | null];
export type Scene = { group: string; scene: string; ask: string; pick: number; note?: boolean; options?: unknown[] };
export type TypeInfo = { desc: string; good: string; care: string; like: [string, string][] };
export type Brand = {
  logo: string; name: string; en: string; since: string; founder: string; message: string; official: boolean;
  keywords: string[]; story: string; lesson: string; photos: [string, string, string][]; wiki: string;
};
export type Mentor = {
  avatar: string; name: string; role: string; years: number; badge?: string; tags: string[];
  intro: string; can: string[]; career: string[]; for: string;
};
export type Item = { value?: unknown; options?: unknown; why?: unknown; quotes?: unknown; example?: unknown; points?: unknown };
export type Sheet = Record<string, Item>;
export type Palette = { name?: string; colors: { hex: string; role?: string }[]; why?: string; quote?: string; fallback?: boolean };

export type St = {
  step: number; q: number; kind: Kind; name: string; desc: string; memo: string;
  answers: string[]; picks: string[][]; notes: string[]; asked_more: boolean[]; more: string[];
  traits?: string[]; tone?: string; fix?: string; reflect?: string;
  sheet?: Sheet | null; palettes?: Palette[]; pal: number; brief?: string; err?: string | null;
  detail: string; choice: Record<string, string>; tpl: Record<string, string>;
};

type Data = {
  SCENES: Record<Kind, Scene[]>; TYPES: Record<string, TypeInfo>; ASK_DETAIL: Record<string, string>;
  BRANDS: Brand[]; MARQUEE: string[][]; MENTORS: Mentor[];
  RULES: string; REFLECT: string; PLATFORMS: string; SHEET: string; SHEET_LABELS: Record<string, string>;
  COLORS: string; TEMPLATE: string; CHANNELS: Record<string, string>; FOLLOWUP: string;
  TRAITS: [[string, string], [string, string]][]; TONES: Record<string, string[]>; EXAMPLES: Record<Kind, Record<string, string>>;
  MIN_LEN: number; POSTIT_COLORS: string[]; HOME_STEPS: [string, string][]; N: number; APP_NAME: string;
};
export const D = raw as unknown as Data;
export const N = D.N;

export const PROMPTS = { REFLECT: D.REFLECT, SHEET: D.SHEET, COLORS: D.COLORS, TEMPLATE: D.TEMPLATE, FOLLOWUP: D.FOLLOWUP };
export type PromptName = keyof typeof PROMPTS;

export function emptyState(): St {
  return {
    step: 0, q: 0, kind: "상품", name: "", desc: "", memo: "",
    answers: Array(N).fill(""), picks: Array.from({ length: N }, () => []), notes: Array(N).fill(""),
    asked_more: Array(N).fill(false), more: Array(N).fill(""), pal: 0, detail: "type", choice: {}, tpl: {},
  };
}

/** 파이썬 str.format과 같게: {이름} 채우기, {{ }} → { } */
export function fmt(t: string, vars: Record<string, string>) {
  return t.replace(/\{\{|\}\}|\{(\w+)\}/g, (m, k) => (m === "{{" ? "{" : m === "}}" ? "}" : k in vars ? vars[k] : m));
}

/** 장면 3처럼 소제목으로 나뉜 보기도 한 줄 목록으로 */
export function flatOptions(sc: Scene): Opt[] {
  const o = sc.options ?? [];
  return o.length && Array.isArray((o[0] as unknown[])[1]) ? (o as [string, Opt[]][]).flatMap(([, g]) => g) : (o as Opt[]);
}

/** 고른 보기마다 그 유형에 1점 → 가장 높은 유형 (동점이면 장면 1 유형 우선) */
export function brandType(kind: Kind, picks: string[][]): [string, Record<string, string[]>] {
  const reasons: Record<string, string[]> = Object.fromEntries(Object.keys(D.TYPES).map(t => [t, []]));
  D.SCENES[kind].forEach((sc, i) => {
    const m = new Map(flatOptions(sc));
    for (const text of picks[i] ?? []) { const t = m.get(text); if (t) reasons[t].push(text); }
  });
  const first = new Map(flatOptions(D.SCENES[kind][0])).get((picks[0] ?? [])[0]);
  const best = Object.keys(D.TYPES).reduce((a, b) => {
    const sa = [reasons[a].length, a === first ? 1 : 0], sb = [reasons[b].length, b === first ? 1 : 0];
    return sb[0] > sa[0] || (sb[0] === sa[0] && sb[1] > sa[1]) ? b : a;
  });
  return [best, reasons];
}

export function answerText(chosen: string[], note: string) {
  return [chosen.length ? `고른 것: ${chosen.join(", ")}` : "", note.trim() ? `내가 쓴 말: ${note.trim()}` : ""].filter(Boolean).join(" / ");
}

export function infoText(s: St) {
  const qa = D.SCENES[s.kind].map((sc, i) => `- [${sc.group}] ${sc.ask}: ${s.answers[i] ?? ""}`).join("\n");
  let out = `[사용자 정보]\n형태: ${s.kind}\n이름: ${s.name}\n설명: ${s.desc}\n구상 메모(참고용): ${s.memo.trim() || "(없음)"}\n질문과 답변:\n${qa}`;
  if (s.traits?.length) out += `\n사용자가 고른 성향: ${s.traits.join(", ")}\n사용자가 고른 말투 예시: ${s.tone ?? "(없음)"}`;
  if (s.step >= 4) {
    const [bt] = brandType(s.kind, s.picks);
    out += `\n앱이 계산한 브랜드 유형(고른 보기로 계산, 방향 참고용): ${bt}형 — ${D.TYPES[bt].desc}`;
  }
  const ex = findExaggeration(userText(s));  // 사용자 글의 과장 표현은 결과에 그대로 옮기지 않게 AI에 알림
  if (ex.length) out += `\n[주의] 사용자 입력 중 과장·단정 표현: ${ex.map(e => e.word).join(", ")} → 결과 글에 그대로 쓰지 말고, 확인된 사실(재료·과정·경험)로 바꿔 쓴다.`;
  return out + (s.fix?.trim() ? `\n사용자 수정 요청: ${s.fix.trim()}` : "");
}

/** AI가 '내 답'이라며 인용한 문장 중 실제 입력에 없는 것 (띄어쓰기 차이는 무시) */
export function unmatched(quotes: string[], s: St) {
  const src = infoText(s).replace(/\s+/g, "");
  return quotes.filter(q => !src.includes(q.replace(/\s+/g, "")));
}

export const asList = (x: unknown): unknown[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

/** AI 시트 JSON → 객체. 키가 빠졌거나 형식이 틀리면 null (→ 다시 시도) */
export function parseSheet(text: string): Sheet | null {
  try {
    const d = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return Object.keys(D.SHEET_LABELS).every(k => d[k] && typeof d[k] === "object") ? d : null;
  } catch { return null; }
}

/** "#abc"·"abc123"도 #RRGGBB로 맞춤. 색 값은 화면 스타일에 들어가므로 그 밖의 값은 null */
const toHex = (h: unknown) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(h ?? "").trim());
  return m ? "#" + (m[1].length === 3 ? [...m[1]].map(c => c + c).join("") : m[1]) : null;
};

export function parsePalettes(text: string): Palette[] {
  try {
    const d = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)); // 앞뒤 설명·코드 블록 표시가 붙어도 읽게
    return asList(d.palettes).flatMap(x => {
      const p = x as Palette, colors = asList(p?.colors).map(c => ({ ...(c as Palette["colors"][0]), hex: toHex((c as { hex?: unknown })?.hex) }));
      return colors.length && colors.every(c => c.hex) ? [{ ...p, colors: colors as Palette["colors"] }] : [];
    });
  } catch { return []; }
}

/** AI 컬러가 두 번 다 비었을 때 유형별 기본 조합 (빈칸 대신) */
const BASE_COLORS: Record<string, [string, string, string]> = {
  해결사: ["#2F5D8A", "#EEF2F6", "#F2A541"], 돌봄: ["#7A9E87", "#F7F3EC", "#E0897A"], 장인: ["#5B4636", "#F3EEE6", "#B08D57"],
  이야기꾼: ["#A94F3F", "#F3E6CF", "#687A4D"], 탐험가: ["#1F6F78", "#F2F4EF", "#F07F3C"], 이웃: ["#E39B3D", "#FFF8EC", "#5E8C61"],
};
export function fallbackPalettes(type: string): Palette[] {
  const [a, b, c] = BASE_COLORS[type] ?? BASE_COLORS.이웃;
  return [{ name: `${type}형 기본 조합`, fallback: true, why: `AI 추천을 받지 못해 ${type}형 브랜드에 흔히 어울리는 기본 조합을 먼저 보여드려요. 상세에서 다시 추천받을 수 있어요.`,
    colors: [{ hex: a, role: "메인" }, { hex: b, role: "보조" }, { hex: c, role: "강조" }] }];
}

/** 2안·3안 항목에서 사용자가 고른 안 (안 골랐으면 1안) */
export function chosen(s: St, k: string) {
  const it = s.sheet?.[k] ?? {};
  const opts = asList(it.options ?? it.value).map(String);
  return opts.includes(s.choice[k]) ? s.choice[k] : opts[0] ?? "";
}

export function sheetText(s: St) {
  if (!s.sheet) return "";
  const val = (k: string) => ("options" in s.sheet![k] ? chosen(s, k) : asList(s.sheet![k].value).map(String).join(", "));
  return Object.entries(D.SHEET_LABELS).map(([k, label]) => `${label}: ${val(k)}`).join("\n");
}

export function sheetQuotes(s: St) {
  const qs = Object.values(s.sheet ?? {}).flatMap(it => asList(it?.quotes)).filter((q): q is string => typeof q === "string");
  return [...new Set([...qs, ...(s.palettes ?? []).map(p => p.quote).filter((q): q is string => !!q)])];
}

export const wallItems = (s: St, upto: number) =>
  Array.from({ length: upto }, (_, k) => [...s.picks[k], ...(s.notes[k].trim() ? [s.notes[k]] : [])]).flat();


// ───────── 과장 표현 점검 (기획서 7번 안정성). AI가 아니라 정해진 규칙 → 비용 0원, 같은 글이면 늘 같은 결과(측정 지표로 사용)
// 법률 판단이 아니라 참고 안내. 판정 기준은 식품·화장품 광고에서 흔히 문제 되는 유형을 쉽게 묶은 것
export const EXAGGERATION: { cat: string; re: RegExp; tip: string }[] = [
  { cat: "효능·질병 단정", re: /미백|주름\s*(?:개선|제거|사라[가-힣]*|없[가-힣]*)|피부\s*재생|면역력?\s*(?:강화|증진|향상)|살\s*빠[가-힣]*|체중\s*감량|다이어트\s*효과|디톡스|해독|혈압|혈당|당뇨|암\s*예방|질병\s*예방|완치|치료\s*효과|효과\s*보장/g,
    tip: "식품·화장품은 기능이나 질병 예방·치료를 단정하면 문제가 될 수 있어요. '매일 챙기기 쉬운'처럼 경험이나 사실(재료·과정)로 바꿔 보세요." },
  { cat: "성과 보장", re: /(?:합격|취업|수익|매출|성적|성공)\s*(?:보장|100\s*%)|무조건\s*(?:\S+\s*)?(?:합격|성공|수익|취업)|\d+\s*배\s*(?:매출|수익|성장)/g,
    tip: "결과는 사람마다 달라서 '보장'은 과장 광고가 될 수 있어요. '합격 가능성을 높이는 첨삭', '실제 사례'처럼 말해 보세요." },
  { cat: "근거 없는 최상급", re: /최고|최초|유일|국내\s*1\s*(?:등|위)|세계\s*최[가-힣]*|1\s*(?:등|위)|넘버\s*원|No\.?\s*1/gi,
    tip: "최고·1위 같은 말은 객관적 근거(수상, 공인 순위)가 없으면 문제가 될 수 있어요. 근거가 있다면 출처를 함께 적어 주세요." },
  { cat: "지나친 단정", re: /100\s*%|무조건|반드시|절대(?:로)?|완벽(?:하게|한)|부작용\s*(?:없[가-힣]*|0)/g,
    tip: "100%·무조건 같은 단정은 오히려 믿음을 떨어뜨릴 수 있어요. 구체적인 사실이나 숫자의 근거로 바꿔 보세요." },
];

export type Exag = { cat: string; word: string; tip: string };
/** 글에서 과장·단정 표현 찾기 (같은 유형의 같은 말은 한 번만) */
export function findExaggeration(text: string): Exag[] {
  const out: Exag[] = [];
  for (const { cat, re, tip } of EXAGGERATION)
    for (const m of text.matchAll(re)) {
      const word = m[0].trim();
      if (/^\s*(?:표현|문구|같은\s*말|대신)/.test(text.slice(m.index! + m[0].length))) continue; // "합격 보장 표현은 빼고", "합격 보장 대신"처럼 피하라는 안내는 제외
      if (!out.some(o => o.cat === cat && o.word === word)) out.push({ cat, word, tip });
    }
  return out;
}

/** 사용자가 직접 쓴 글 전체 (이름·설명·메모·장면 메모) */
export const userText = (s: St) => [s.name, s.desc, s.memo, ...(s.notes ?? []), s.fix ?? ""].join("\n");
