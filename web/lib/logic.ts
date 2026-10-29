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
export type Palette = { name?: string; colors: { hex: string; role?: string }[]; why?: string; quote?: string };

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

/** 색 값은 화면 스타일에 들어가므로 #RRGGBB만 허용 */
export function parsePalettes(text: string): Palette[] {
  try {
    const d = JSON.parse(text.trim().replace(/^```(json)?|```$/g, "").trim());
    return (d.palettes as Palette[]).filter(p => p.colors?.length && p.colors.every(c => /^#[0-9a-fA-F]{6}$/.test(c.hex ?? "")));
  } catch { return []; }
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

