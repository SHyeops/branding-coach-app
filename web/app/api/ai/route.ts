// AI 호출은 서버에서만 (OPENAI_API_KEY는 브라우저로 나가지 않음). 실패해도 화면이 멈추지 않게 {text} 또는 {error}로 돌려줌
import OpenAI from "openai";
import { D, PROMPTS, PromptName, St, fmt, infoText, parsePalettes } from "@/lib/logic";

export const maxDuration = 120; // 브랜드 시트 생성이 30~60초 걸림

const fake = () => process.env.FAKE_AI === "1";

export async function GET() {
  return Response.json({ fake: fake() });
}

/** 테스트 모드(FAKE_AI="1"): API를 부르지 않고 예시 답 → 화면 흐름 확인에 돈이 안 듦 */
function fakeAnswer(name: PromptName, s: St) {
  const a = s.answers[0] || s.name;
  if (name === "COLORS")
    return JSON.stringify({ palettes: [
      { name: "테스트 1안", colors: [{ hex: "#A94F3F", role: "메인" }, { hex: "#F3E6CF", role: "보조" }, { hex: "#687A4D", role: "강조" }], why: "(테스트 모드 예시) 고른 성향에 맞춘 조합이에요.", quote: a },
      { name: "테스트 2안", colors: [{ hex: "#6B4937", role: "메인" }, { hex: "#F6F0E4", role: "보조" }, { hex: "#D9A441", role: "강조" }], why: "(테스트 모드 예시) 두 번째 조합이에요.", quote: a },
    ] });
  if (name === "SHEET") {
    const item = (v: unknown) => ({ value: v, why: "(테스트 모드 예시) 이 선택이 이렇게 읽혀서 이런 결과가 나왔어요.", quotes: [a] });
    const d: Record<string, Record<string, unknown>> = Object.fromEntries(Object.entries(D.SHEET_LABELS).map(([k, l]) => [k, item(`(예시) ${l}`)]));
    for (const [k, n] of [["mission", 2], ["message", 2], ["slogans", 3]] as const)
      d[k] = { options: Array.from({ length: n }, (_, j) => `(예시) ${D.SHEET_LABELS[k]} ${j + 1}안`), why: "(테스트 모드 예시) 두 방향이에요.", quotes: [a] };
    for (const k of ["values", "mood", "todo", "advice"]) d[k].value = [1, 2, 3].map(j => `예시 ${j}`);
    d.personality.example = "오늘도 정성껏 준비했어요.";
    d.strategy.points = ["채널: 인스타그램", "가격: 예시", "첫 손님: 예시"];
    return JSON.stringify(d);
  }
  if (name === "TEMPLATE") return `### 예시 항목 1\n(테스트 모드 예시) ${s.name} 문구예요.\n두 번째 줄이에요.\n\n### 예시 항목 2\n(테스트 모드 예시) ${a}`;
  if (name === "REFLECT") return `### 왜\n- (테스트 모드 예시) ${a}\n\n### 고른 성향·말투\n- ${(s.traits ?? []).join(", ")}`;
  return "(테스트 모드 예시) 조금 더 들려주세요. 예를 들면 그때 어떤 상황이었는지, 누가 떠올랐는지요.";
}

export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 60_000) return Response.json({ error: "입력이 너무 길어요." }, { status: 413 }); // 공개 주소라 과도한 요청(비용) 막기
  let name: PromptName, s: St, extra: Record<string, string>;
  try {
    ({ name, state: s, extra = {} } = JSON.parse(body));
    if (!(name in PROMPTS) || !s || !Array.isArray(s.answers) || (s.notes != null && !Array.isArray(s.notes))) throw new Error("bad request");
    extra = Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v).slice(0, 8000)]));
  } catch {
    return Response.json({ error: "요청 형식이 맞지 않아요." }, { status: 400 });
  }
  if (fake()) return Response.json({ text: fakeAnswer(name, s) });
  const model = process.env.OPENAI_MODEL;
  if (!model) return Response.json({ error: "모델 설정(OPENAI_MODEL)이 없어요. 환경 변수를 확인해 주세요." });
  const prompt = fmt(PROMPTS[name], { rules: D.RULES, info: infoText(s), platforms: D.PLATFORMS, ...extra });
  try {
    const res = await new OpenAI().chat.completions.create({
      model, messages: [{ role: "user", content: prompt }],
      ...(name === "COLORS" ? { response_format: { type: "json_object" as const } } : {}), // 컬러가 가끔 JSON이 아니어서 0안 → JSON만 받게
    });
    const text = res.choices[0]?.message?.content ?? "";
    if (name === "COLORS" && !parsePalettes(text).length) console.warn("COLORS 0안 원문:", text.slice(0, 1000)); // 원인 추적용(Vercel 로그)
    return Response.json({ text });
  } catch {
    return Response.json({ error: "AI 연결에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요." });
  }
}
