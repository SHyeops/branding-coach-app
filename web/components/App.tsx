"use client";
// From Your Garage — 화면 전체 (Streamlit app.py에서 옮김). 메뉴: 브랜드 코칭(0 홈 → 1 기본 정보 → 2 장면 6개 → 3 간판 → 4 확인 → 5 결과) / 활용 템플릿 / 브랜드 스토리 / 1:1 멘토링
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import demoData from "@/lib/demo_P02.json";
import {
  D, N, type St, type Kind, type Brand, type Mentor, type Palette, type PromptName, type Opt,
  emptyState, flatOptions, brandType, answerText, unmatched, asList, parseSheet, parsePalettes, fallbackPalettes, chosen, sheetText, sheetQuotes, wallItems,
  findExaggeration, userText,
} from "@/lib/logic";

type Page = "브랜드 코칭" | "활용 템플릿" | "브랜드 스토리" | "1:1 멘토링";
const PAGES: Page[] = ["브랜드 코칭", "활용 템플릿", "브랜드 스토리", "1:1 멘토링"];
const STEPS = ["기본 정보", "생각 정리", "간판", "확인", "리포트"];
const ITEMS: [string, string][] = [["type", "브랜드 유형"], ["customer", "주요 고객층"], ["pain", "고객의 고민"], ["mission", "미션"], ["message", "핵심 메시지"],
  ["slogans", "슬로건"], ["personality", "성격·말투"], ["strategy", "판매 전략"], ["color", "아이덴티티 컬러"], ["mood", "무드 키워드"],
  ["like", "닮은 브랜드"], ["todo", "이번 주 할 일"], ["advice", "더 생각해 볼 것"]];
const WIDE_LOGO = new Set(["amazon", "samsung"]); // 글자형 로고는 넓게
const svg = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS: Record<string, string> = {
  진단: svg('<path d="M4 4h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M18 8h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3a2 2 0 0 1-2-2v-1"/><path d="M7.6 7.2a1.5 1.5 0 1 1 2.1 1.4c-.5.2-.7.6-.7 1.1M9 11.3v.1"/>'),
  성향: svg('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  확인: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16 9.5"/>'),
  리포트: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
};

/** AI 호출 (서버 /api/ai). 실패해도 화면이 멈추지 않게 [결과, 오류문구] */
async function askAI(name: PromptName, s: St, extra: Record<string, string> = {}): Promise<[string | null, string | null]> {
  const state = { step: s.step, kind: s.kind, name: s.name, desc: s.desc, memo: s.memo, answers: s.answers, picks: s.picks, notes: s.notes, traits: s.traits, tone: s.tone, fix: s.fix };
  try {
    const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, state, extra }) });
    const j = await r.json();
    return j.error ? [null, j.error] : [j.text ?? "", null];
  } catch {
    return [null, "AI 연결에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요."];
  }
}

/** 긴 문장은 쉼표·마침표 뒤에서 줄을 바꿔 읽기 쉽게 */
function Soft({ t }: { t: unknown }) {
  const s = String(t ?? "");
  if (s.length <= 28) return <>{s}</>;
  const parts = s.split(/(?<=[,.])\s+/);
  return <>{parts.map((p, i) => <span key={i}>{p}{i < parts.length - 1 && <br />}</span>)}</>;
}

/** AI 정리 글(### 제목, - 목록, **굵게**)만 그리는 작은 마크다운 */
function Md({ text }: { text: string }) {
  const bold = (l: string) => l.split(/\*\*(.+?)\*\*/).map((x, i) => (i % 2 ? <b key={i}>{x}</b> : x));
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => { if (list.length) out.push(<ul key={out.length}>{list}</ul>); list = []; };
  text.split("\n").forEach((raw, i) => {
    const l = raw.trim();
    if (/^-\s+/.test(l)) list.push(<li key={i}>{bold(l.replace(/^-\s+/, ""))}</li>);
    else { flush(); if (/^#{1,3}\s/.test(l)) out.push(<h3 key={i}>{l.replace(/^#+\s*/, "")}</h3>); else if (l) out.push(<p key={i}>{bold(l)}</p>); }
  });
  flush();
  return <div className="md">{out}</div>;
}

function Modal({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", f); document.body.style.overflow = ""; };
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} onClick={e => e.stopPropagation()}>
        <button className="modal-x" aria-label="닫기" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

function Radios({ options, value, onChange, fmt, two }: { options: string[]; value?: string; onChange: (v: string) => void; fmt?: (v: string) => string; two?: boolean }) {
  return (
    <div className={`radio-grid${two ? " two" : ""}`} role="radiogroup">
      {options.map(o => (
        <button type="button" key={o} role="radio" aria-checked={o === value} className={`radio-opt${o === value ? " on" : ""}`} onClick={() => onChange(o)}>{fmt ? fmt(o) : o}</button>
      ))}
    </div>
  );
}

function Pills({ label, options, value, onToggle }: { label: string; options: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <>
      <span className="pill-label">{label}</span>
      <div className="pills" role="group" aria-label={label}>
        {options.map(o => <button type="button" key={o} aria-pressed={value.includes(o)} className={`pill${value.includes(o) ? " on" : ""}`} onClick={() => onToggle(o)}>{o}</button>)}
      </div>
    </>
  );
}

const Bulbs = ({ lit }: { lit: number }) => (
  <div className="bulbs" aria-label={`아이디어 ${lit}/${N + 1} 켜짐`}>
    {Array.from({ length: N + 1 }, (_, k) => <i key={k} className={`bulb${k < lit ? " on" : ""}`} />)}<span>아이디어 {lit}/{N + 1}</span>
  </div>
);

/** 차고 벽(흰 페인트 벽돌): 브랜드 이름 + 지금까지 고른 생각을 포스트잇으로 (방금 고른 건 new) */
function Wall({ name, items, fresh = [] }: { name: string; items: string[]; fresh?: string[] }) {
  const notes: [string, string][] = [[name, "name"], ...items.map(x => [x, ""] as [string, string]), ...fresh.map(x => [x, "new"] as [string, string])];
  return (
    <div className="wall">
      <span className="wall-label">GARAGE WALL</span>
      {notes.map(([x, c], j) => (
        <span key={j} className={`postit ${c}`} style={{ "--r": `${(j * 37) % 7 - 3}deg`, "--c": D.POSTIT_COLORS[j % D.POSTIT_COLORS.length] } as CSSProperties}>{x}</span>
      ))}
    </div>
  );
}

function PaletteView({ p, s }: { p: Palette; s: St }) {
  return (
    <>
      <p className="pal-name">{p.name}</p>
      <div className="palette">
        {p.colors.map(c => <div className="chip" key={c.hex + c.role}><div style={{ background: c.hex }} /><b>{c.role}</b><span>{c.hex.toUpperCase()}</span></div>)}
      </div>
      <p><b>이유:</b> {p.why}</p>
      {p.quote && <p><b>근거가 된 내 답:</b> 「{p.quote}」{unmatched([p.quote], s).length > 0 && " ⚠️ 내 답과 일치하지 않아요"}</p>}
    </>
  );
}

/** 과장·단정 표현 안내 (막지 않고 알려만 줌) */
function ExagNote({ text, title = "과장으로 보일 수 있는 표현이 있어요" }: { text: string; title?: string }) {
  const found = findExaggeration(text);
  if (!found.length) return null;
  const cats = [...new Set(found.map(f => f.cat))];
  return (
    <div className="alert warning exag" role="status">
      <b>⚠️ {title}</b>
      {cats.map(c => (
        <p key={c}><b>{c}:</b> {found.filter(f => f.cat === c).map(f => `“${f.word}”`).join(", ")}<br /><span>{found.find(f => f.cat === c)!.tip}</span></p>
      ))}
      <small>광고 표현을 참고로 알려 드리는 안내예요. 바꾸지 않아도 다음으로 넘어갈 수 있어요.</small>
    </div>
  );
}

const Postits = ({ items }: { items: string[] }) => <>{items.map((x, i) => <span key={i} className="postit">{x}</span>)}</>;

export default function App() {
  const [s, setS] = useState<St>(emptyState);
  const [page, setPage] = useState<Page>("브랜드 코칭");
  const [fake, setFake] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  const [warn, setWarn] = useState("");
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState<{ b?: Brand; similar?: string; m?: Mentor } | null>(null);
  const [applied, setApplied] = useState(false);
  const [traitPicks, setTraitPicks] = useState<string[]>(() => D.TRAITS.map(([a]) => a[0]));
  const [tonePick, setTonePick] = useState("");
  const [optSel, setOptSel] = useState<Record<string, string>>({});
  const [palSel, setPalSel] = useState<number | null>(null);
  const [ch, setCh] = useState("인스타그램");
  const [copied, setCopied] = useState(-1);
  const inflight = useRef(new Set<string>()); // 같은 AI 요청이 두 번 나가지 않게 (개발 모드 이중 실행 포함)
  const garageRef = useRef<HTMLElement>(null);
  const [garagePos, setGaragePos] = useState<CSSProperties>();
  const up = (patch: Partial<St>) => setS(p => ({ ...p, ...patch }));

  // 테스트 모드 여부 + 예시 링크(?demo=report / ?demo=scenes: 저장해 둔 실제 AI 결과, AI를 다시 부르지 않음)
  useEffect(() => {
    fetch("/api/ai").then(r => r.json()).then(j => setFake(!!j.fake)).catch(() => {});
    const demo = new URLSearchParams(window.location.search).get("demo");
    if (demo === "report" || demo === "scenes") {
      setS({ ...emptyState(), ...(demoData as unknown as Partial<St>), step: demo === "report" ? 5 : 2, q: 0 });
      setIntroSeen(true);
    }
  }, []);
  // 인트로는 처음 한 번만 (메뉴를 오가도 다시 안 나오게)
  useEffect(() => { if (page !== "브랜드 코칭" || s.step !== 0) setIntroSeen(true); }, [page, s.step]);
  // 셔터 위 GARAGE를 홈 GARAGE와 같은 자리·크기에 멈추게 (셔터가 열릴 때 겹쳐 보이게). offset 값은 등장 효과(transform)의 영향을 안 받음
  useLayoutEffect(() => {
    const el = garageRef.current;
    if (introSeen || !el) return;
    const place = () => {
      let x = 0, y = 0;
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) { x += n.offsetLeft; y += n.offsetTop; }
      setGaragePos({ "--gx": `${x + el.offsetWidth / 2 - window.scrollX}px`, "--gy": `${y + el.offsetHeight / 2 - window.scrollY}px`, "--gs": getComputedStyle(el).fontSize } as CSSProperties);
    };
    place();
    document.fonts?.ready.then(place); // 글꼴이 늦게 오면 폭이 바뀜
    const ro = new ResizeObserver(place); // 창 크기·위쪽 안내 띠 등장으로 자리가 바뀌면 다시 잼
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [introSeen]);
  // 화면이 바뀌면 맨 위부터 (리포트로 넘어갈 때 중간부터 보이던 문제)
  useEffect(() => { window.scrollTo(0, 0); setWarn(""); }, [page, s.step, s.q]);

  // 4단계: 이해한 내용 정리 / 5단계: 아이덴티티 시트 → 컬러 (화면에 들어오면 자동으로 한 번)
  useEffect(() => {
    const run = async (key: string, fn: () => Promise<void>) => {
      if (inflight.current.has(key)) return;
      inflight.current.add(key); setBusy(key);
      try { await fn(); } finally { inflight.current.delete(key); setBusy(""); }
    };
    if (s.err) return;
    if (s.step === 4 && s.reflect === undefined)
      run("reflect", async () => { const [t, e] = await askAI("REFLECT", s); up(e ? { err: e } : { reflect: t ?? "" }); });
    else if (s.step === 5 && s.sheet === undefined)
      run("sheet", async () => {
        const [t, e] = await askAI("SHEET", s);
        const sheet = e ? null : parseSheet(t ?? "");
        setS(p => ({ ...p, sheet, err: e ?? (sheet ? null : "결과 형식이 맞지 않았어요. 다시 시도해 주세요."), ...(sheet ? { brief: sheetText({ ...p, sheet }) } : {}) }));
      });
    else if (s.step === 5 && s.sheet && s.palettes === undefined)
      run("colors", async () => {
        let palettes = parsePalettes((await askAI("COLORS", s))[0] ?? "");
        if (!palettes.length) palettes = parsePalettes((await askAI("COLORS", s))[0] ?? ""); // 가끔 형식이 어긋나 0개(측정 10건 중 3건) → 한 번 더
        if (!palettes.length) palettes = fallbackPalettes(brandType(s.kind, s.picks)[0]); // 그래도 0개면 빈칸 대신 유형별 기본 조합
        up({ palettes, pal: 0 });
      });
  }, [s.step, s.reflect, s.sheet, s.palettes, s.err]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setS(emptyState()); setPage("브랜드 코칭"); window.history.replaceState(null, "", "/"); };
  const [bt, reasons] = brandType(s.kind, s.picks);
  const byLogo = Object.fromEntries(D.BRANDS.map(b => [b.logo, b])) as Record<string, Brand>;

  // ───────── 홈 ─────────
  const home = () => (
    <>
      <div className={`home${introSeen ? " seen" : ""}`}>
        <div className="hero">
          <span className="eyebrow">질문으로 찾는 내 브랜드</span>
          <div className="brand-title" role="heading" aria-level={1}><span className="by">From Your</span> <em ref={garageRef}>GARAGE</em></div>
          <div className="hero-copy">
            <span><img className="logo logo-amazon_white" src="/assets/amazon_white.svg" alt="아마존" />도, <img className="logo logo-google" src="/assets/google.svg" alt="구글" />도 작은 차고에서 시작했죠.</span>
            <span>당신의 브랜드도 여기서 시작되길 바라요.</span>
          </div>
          <p className="hero-sub">질문에 답하다 보면 &quot;내가 원래 생각하던 게 이거였구나&quot;를 찾아 정리해 드려요.<br /><span className="time-chip">약 15분</span>이면 충분해요.</p>
        </div>
        <div className="logo-band" aria-hidden="true">
          {D.MARQUEE.map((row, i) => (
            <div key={i} className={`lb-row${i ? " rev" : ""}`}><div className="lb-track">
              {[...row, ...row].map((n, j) => <img key={j} className={`logo logo-${n}`} src={`/assets/brands/${n}.svg`} alt="" />)}
            </div></div>
          ))}
        </div>
        <div className="steps">
          {D.HOME_STEPS.map(([k, t], n) => <div className="step-card" key={k}><b>STEP {n + 1}</b>{t}<span dangerouslySetInnerHTML={{ __html: ICONS[k] }} /></div>)}
        </div>
      </div>
      <p className="caption center">미리 생각해 두면 좋아요: 관심을 갖게 된 계기 · 도와주고 싶은 사람 · 다르게 하고 싶은 점 (잘 몰라도 괜찮아요)</p>
      <div className="btn-gap center"><button className="btn primary start" onClick={() => up({ step: 1 })}>준비됐어요, 시작할게요</button></div>
    </>
  );

  // ───────── 1. 기본 정보 ─────────
  const basics = () => {
    const ex = D.EXAMPLES[s.kind];
    return (
      <>
        <h2 className="page-h">먼저 어떤 걸 브랜딩할지 알려 주세요</h2>
        <span className="radio-label">형태</span>
        <Radios two options={["상품", "서비스"]} value={s.kind} onChange={k => up({ kind: k as Kind })} fmt={k => (k === "서비스" ? "서비스 (레슨·클래스·코칭 포함)" : k)} />
        <label className="field"><span>이름</span><input value={s.name} placeholder={ex.name} onChange={e => up({ name: e.target.value })} /></label>
        <label className="field"><span>한 줄 설명</span><textarea value={s.desc} placeholder={ex.desc} onChange={e => up({ desc: e.target.value })} /></label>
        <label className="field"><span>(선택) 이미 구상 중인 내용이 있다면 자유롭게 적어 주세요</span><textarea value={s.memo} placeholder={ex.memo} onChange={e => up({ memo: e.target.value })} /></label>
        <ExagNote text={`${s.name}\n${s.desc}\n${s.memo}`} />
        {warn && <div className="alert warning">{warn}</div>}
        <div className="btn-gap">
          <button className="btn primary" onClick={() => (!s.name.trim() || !s.desc.trim() ? setWarn("이름과 한 줄 설명을 적어 주세요.") : up({ step: 2 }))}>시작하기</button>
        </div>
      </>
    );
  };

  // ───────── 2. 장면 6개 ─────────
  const scene = () => {
    const i = s.q, sc = D.SCENES[s.kind][i], cur = s.picks[i];
    const detail = cur.map(c => D.ASK_DETAIL[c]).find(Boolean);
    const noteShown = sc.pick === 0 || !!sc.note || !!detail;
    const note = noteShown ? s.notes[i] : "";
    const setPick = (arr: string[]) => setS(p => {
      const keepNote = sc.pick === 0 || sc.note || arr.some(c => D.ASK_DETAIL[c]); // 한 줄 칸이 사라지면 적은 말도 지움
      const notes = keepNote ? p.notes : p.notes.map((x, j) => (j === i ? "" : x));
      return { ...p, picks: p.picks.map((x, j) => (j === i ? arr : x)), notes, answers: p.answers.map((x, j) => (j === i ? answerText(arr, notes[i]) : x)) };
    });
    const setNote = (v: string) => setS(p => ({ ...p, notes: p.notes.map((x, j) => (j === i ? v : x)), answers: p.answers.map((x, j) => (j === i ? answerText(p.picks[i], v) : x)) }));
    const toggle = (o: string) => setPick(cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o]);
    const groups: [string, Opt[]][] = sc.pick > 1
      ? (Array.isArray((sc.options![0] as unknown[])[1]) && Array.isArray(((sc.options![0] as unknown[])[1] as unknown[])[0])
        ? (sc.options as [string, Opt[]][]) : [[`최대 ${sc.pick}개까지 골라요`, sc.options as Opt[]]]) : [];
    const next = async () => {
      if (sc.pick && !cur.length) return setWarn("마음에 가장 가까운 걸 하나 이상 골라 주세요.");
      if (sc.pick > 1 && sc.pick < 9 && cur.length > sc.pick) return setWarn(`최대 ${sc.pick}개까지 골라 주세요. 가장 가까운 것만 남겨 볼까요?`);
      if (sc.pick === 0 && !note.trim()) return setWarn("한 줄이라도 적어 주세요.");
      if (sc.pick === 0 && note.trim().length < D.MIN_LEN && !s.asked_more[i]) {
        setBusy("followup");
        const [more] = await askAI("FOLLOWUP", s, { question: sc.ask, answer: note, name: s.name });
        setBusy("");
        setWarn("");
        return up({ asked_more: s.asked_more.map((x, j) => j === i || x), more: s.more.map((x, j) => (j === i ? more || "조금 더 들려주세요. 예를 들면 그때 어떤 상황이었는지, 누가 떠올랐는지요." : x)) });
      }
      up(i < N - 1 ? { q: i + 1 } : { step: 3 });
    };
    return (
      <>
        <Wall name={s.name} items={wallItems(s, i)} fresh={[...cur, ...(note.trim() ? [note.trim()] : [])]} />
        <div className="scene-head"><span className="day">GARAGE DAY 1 · 장면 {i + 1}/{N}</span><Bulbs lit={i} /></div>
        <p className="scene">{sc.scene}</p>
        <div className="ask">“{sc.ask}”</div>
        {s.more[i] && <div className="alert info">{s.more[i]}</div>}
        {sc.pick === 1 && <Radios options={flatOptions(sc).map(([o]) => o)} value={cur[0]} onChange={o => setPick([o])} />}
        {groups.map(([label, opts]) => <Pills key={label} label={label} options={opts.map(([o]) => o)} value={cur} onToggle={toggle} />)}
        {sc.pick === 0 && <label className="field"><span>노트에 적어 보세요 (&quot;모르겠어요&quot;도 괜찮아요)</span><textarea value={s.notes[i]} onChange={e => setNote(e.target.value)} /></label>}
        {sc.pick !== 0 && sc.note && <label className="field"><span>✏️ 노트에 한 줄 더 적기 (선택)</span><input value={s.notes[i]} placeholder="예: 그때 있었던 일, 떠오른 사람" onChange={e => setNote(e.target.value)} /></label>}
        {sc.pick !== 0 && !sc.note && detail && <label className="field"><span>✏️ 조금만 더: {detail} (선택, 한 줄)</span><input value={s.notes[i]} onChange={e => setNote(e.target.value)} /></label>}
        <ExagNote text={note} />
        {warn && <div className="alert warning">{warn}</div>}
        {busy === "followup" && <div className="loading">조금 더 여쭤볼게요…</div>}
        <div className="btn-row">
          <button className="btn" onClick={() => i > 0 && up({ q: i - 1 })}>이전</button>
          <button className="btn primary" disabled={!!busy} onClick={next}>다음</button>
        </div>
      </>
    );
  };

  // ───────── 3. 간판 ─────────
  const signboard = () => {
    const ex = Object.fromEntries(D.TRAITS.flatMap(pair => pair)) as Record<string, string>;
    const tones = s.traits ? D.TONES[`${s.traits[0]}|${s.traits[1]}`] : [];
    const tone = tones.includes(tonePick) ? tonePick : tones[0];
    return (
      <>
        <Wall name={s.name} items={[...wallItems(s, N), ...(s.traits ?? [])]} />
        <div className="scene-head"><span className="day">GARAGE DAY 1 · 마지막 장면</span><Bulbs lit={N} /></div>
        <p className="scene">벽을 가득 채운 포스트잇을 본다. 이제 간판을 상상해 볼 차례.</p>
        <div className="ask">“내 가게 간판은 어떤 느낌일까?”</div>
        {!s.traits ? (
          <>
            <p className="caption">1단계 · 둘 중 내 간판에 더 가까운 쪽을 골라 주세요. 정답은 없어요.</p>
            {D.TRAITS.map(([a, b], k) => (
              <div key={k}>
                <span className="radio-label">{a[0]} vs {b[0]}</span>
                <Radios two options={[a[0], b[0]]} value={traitPicks[k]} onChange={v => setTraitPicks(t => t.map((x, j) => (j === k ? v : x)))} fmt={o => `${o} — “${ex[o]}”`} />
              </div>
            ))}
            <div className="btn-gap"><button className="btn primary" onClick={() => up({ traits: traitPicks })}>다음</button></div>
          </>
        ) : (
          <>
            <p className="caption">1단계에서 고른 성향: {s.traits.join(" · ")}</p>
            <p className="caption">2단계 · 간판 아래 붙일 한마디라면? 내 브랜드가 할 법한 말투를 하나 골라 주세요. (말투 예시일 뿐, 내용은 내 답변으로 채워져요)</p>
            <Radios options={tones} value={tone} onChange={setTonePick} />
            <div className="btn-row">
              <button className="btn" onClick={() => up({ traits: undefined })}>성향 다시 고르기</button>
              <button className="btn primary" onClick={() => up({ tone, step: 4 })}>아이디어 ON!</button>
            </div>
          </>
        )}
      </>
    );
  };

  // ───────── 4. 확인 ─────────
  const confirm = () => (
    <>
      <h2 className="page-h">제가 이해한 내용</h2>
      <p className="caption">제가 이해한 내용이 맞는지 확인해 주세요. 다르면 아래에 고칠 점을 적어 주시면 다시 정리할게요.</p>
      {busy === "reflect" && <div className="loading">정리하고 있어요…</div>}
      {s.err ? (
        <><div className="alert error">{s.err}</div><button className="btn" onClick={() => up({ err: null, reflect: undefined })}>다시 시도</button></>
      ) : s.reflect !== undefined && (
        <>
          <div className="box"><Md text={s.reflect.replace(/^#{1,3}[^\n]*이런 뜻이에요[^\n]*\n+/, "")} /></div>
          <div className="btn-gap"><button className="btn primary" onClick={() => up({ step: 5 })}>맞아요</button></div>
          <label className="field"><span>조금 달라요 — 고칠 내용을 적어 주세요</span><textarea value={s.fix ?? ""} onChange={e => up({ fix: e.target.value })} /></label>
          <ExagNote text={s.fix ?? ""} />
          <div className="btn-gap"><button className="btn" onClick={() => s.fix?.trim() && up({ reflect: undefined })}>이 내용으로 다시 정리</button></div>
        </>
      )}
    </>
  );

  // ───────── 5. 결과 (브랜드 아이덴티티) ─────────
  const sheetValue = (k: string): ReactNode => {
    if (k === "type") return <><div className="sv-main">{bt}형</div><div className="sv-sub">{D.TYPES[bt].desc}</div></>;
    if (k === "like") return null;
    if (k === "color") {
      if (!s.palettes?.length) return <div className="sv-sub">{busy === "colors" ? "컬러를 고르고 있어요…" : "컬러를 만들지 못했어요. 상세에서 다시 시도할 수 있어요."}</div>;
      const p = s.palettes[s.pal] ?? s.palettes[0];
      return <><div className="sv-swatch">{p.colors.map(c => <i key={c.hex + c.role} style={{ background: c.hex }} title={c.hex} />)}</div>
        <div className="sv-sub">{p.name} · {p.colors.map(c => `${c.role ?? ""} ${c.hex.toUpperCase()}`).join(" / ")}</div></>;
    }
    const it = s.sheet?.[k] ?? {};
    if ("options" in it) {
      const n = asList(it.options).length;
      return <><div className="sv-main"><Soft t={chosen(s, k)} /></div>{n > 1 && <div className="sv-sub">다른 안 {n - 1}개 · 상세에서 바꿀 수 있어요</div>}</>;
    }
    const v = it.value;
    if (k === "values" || k === "mood") return <div className="sv-chips">{asList(v).map((x, i) => <span key={i}>{String(x)}</span>)}</div>;
    if (k === "advice") return <ul className="sv-list">{asList(v).map((x, i) => <li key={i}>{String(x)}</li>)}</ul>;
    if (k === "todo") return <ol className="sv-list">{asList(v).map((x, i) => <li key={i}>{String(x)}</li>)}</ol>;
    return (
      <>
        <div className="sv-main"><Soft t={v} /></div>
        {k === "personality" && !!it.example && <div className="sv-sub">“<Soft t={it.example} />”</div>}
        {k === "strategy" && <ul className="sv-list">{asList(it.points).map((x, i) => <li key={i}>{String(x)}</li>)}</ul>}
      </>
    );
  };

  const detailBody = (k: string, label: string): ReactNode => {
    if (k === "type") {
      const tp = D.TYPES[bt];
      const score = Object.entries(reasons).filter(([, r]) => r.length).sort((a, b) => b[1].length - a[1].length).map(([t, r]) => `${t}형 ${r.length}점`).join(" · ");
      return <>
        <div className="why-label">{label}</div>
        <div className="why-value">{bt}형 — {tp.desc}</div>
        <p>코칭에서 고른 보기마다 가까운 유형에 1점씩 더했어요. <b>{score}</b>로, {bt}형이 가장 높았어요. (동점이면 첫 장면에서 고른 &apos;시작한 이유&apos;를 우선해요.)</p>
        <div className="why-quotes"><b>{bt}형 점수를 만든 내 선택</b><Postits items={reasons[bt]} /></div>
        <div className="type-tips"><div><b>이 유형이 잘하는 것</b>{tp.good}</div><div><b>조심할 것</b>{tp.care}</div></div>
        <p className="caption">유형은 AI가 아니라 앱이 정해진 규칙으로 계산해요. 같은 선택이면 늘 같은 결과예요. (브랜딩 이론을 참고해 쉽게 만든 분류)</p>
      </>;
    }
    if (k === "like") return <>
      <div className="why-label">{label}</div>
      <p>내 브랜드가 <b>{bt}형</b>이라서, 같은 성격이 두드러지는 브랜드를 골랐어요. 규모가 아니라 &apos;성격&apos;이 닮았다는 뜻이에요.</p>
      {D.TYPES[bt].like.map(([key, why]) => <p key={key}><b>{byLogo[key].name}</b> — {why}</p>)}
      <p className="caption">목록의 브랜드 버튼을 누르면 그 브랜드의 시작 이야기를 볼 수 있어요.</p>
    </>;
    if (k === "color") {
      if (!s.palettes?.length) return <><div className="why-label">{label}</div><button className="btn" disabled={!!busy} onClick={() => up({ palettes: undefined })}>컬러 다시 추천받기</button></>;
      const j = palSel ?? s.pal;
      return <>
        <div className="why-label">{label}</div>
        <Radios options={s.palettes.map((p, n) => p.name || `${n + 1}안`)} value={s.palettes[j]?.name || `${j + 1}안`}
          onChange={v => setPalSel(s.palettes!.findIndex((p, n) => (p.name || `${n + 1}안`) === v))} />
        <PaletteView p={s.palettes[j] ?? s.palettes[0]} s={s} />
        {s.palettes[0].fallback && <div className="btn-gap"><button className="btn" disabled={!!busy} onClick={() => up({ palettes: undefined })}>컬러 다시 추천받기</button></div>}
        <div className="btn-gap"><button className="btn primary" onClick={() => up({ pal: j })}>이 컬러로 정하기</button></div>
      </>;
    }
    const it = s.sheet?.[k] ?? {};
    const opts = asList(it.options).map(String);
    const qs = asList(it.quotes).filter((q): q is string => typeof q === "string");
    const bad = unmatched(qs, s);
    return <>
      <div className="why-label">{label}</div>
      {opts.length > 1 ? <>
        <p className="caption">AI가 서로 다른 방향을 제안했어요. 내 생각에 더 가까운 안을 골라 주세요.</p>
        <Radios options={opts} value={optSel[k] ?? chosen(s, k)} onChange={v => setOptSel(o => ({ ...o, [k]: v }))} />
        <div className="btn-gap"><button className="btn primary" onClick={() => up({ choice: { ...s.choice, [k]: optSel[k] ?? chosen(s, k) } })}>이 안으로 정하기</button></div>
      </> : sheetValue(k)}
      <div className="why-text">{String(it.why ?? "")}</div>
      {qs.length > 0 && <div className="why-quotes"><b>근거가 된 내 선택·내 말</b><Postits items={qs} /></div>}
      {bad.length > 0 && <div className="alert warning">이 인용은 내 입력과 그대로 일치하지 않아요: {bad.join(" / ")}</div>}
      <p className="caption">이건 AI의 해석이에요. 내 생각과 다른 부분은 덜어 내고 보세요. 판단은 내 몫이에요.</p>
    </>;
  };

  const report = () => {
    if (busy === "sheet") return <div className="loading">내 브랜드 시트를 만들고 있어요… (30초쯤 걸려요)</div>;
    if (s.err) return <><div className="alert error">{s.err}</div><div className="btn-gap"><button className="btn" onClick={() => up({ err: null, sheet: undefined })}>다시 시도</button></div></>;
    if (!s.sheet) return null;
    const labels = Object.fromEntries(ITEMS);
    const sel = s.detail in labels ? s.detail : "type";
    const quotes = sheetQuotes(s), bad = unmatched(quotes, s);
    return (
      <>
        <div className="profile">
          <span className="eyebrow">BRAND IDENTITY</span>
          <div className="sheet-name" role="heading" aria-level={1}>{s.name}<span className="mt-badge">{bt}형</span></div>
          <p className="sheet-one">{String(s.sheet.one_liner?.value ?? "")}</p>
          <div className="bm-tags">{asList(s.sheet.values?.value).map((v, i) => <span key={i}>#{String(v)}</span>)}</div>
          <p className="sheet-hint">내 선택과 내 말을 엮어서 낸 결론이에요. 항목의 <b>상세</b>를 누르면 이렇게 나온 이유와 근거를 볼 수 있어요.</p>
        </div>
        <div className="res-grid">
          <div className="res-list">
            {ITEMS.map(([k, label]) => (
              <div key={k} className={`res-item${k === sel ? " sel" : ""}`}>
                <div className="sl">{label}</div>
                {sheetValue(k)}
                {k === "like" && <div className="item-actions">
                  {D.TYPES[bt].like.map(([key, why]) => (
                    <button key={key} className="btn block" onClick={() => setModal({ b: byLogo[key], similar: `${why}. 내 브랜드처럼 ${bt}형의 성격이 두드러져요.` })}>
                      <img src={`/assets/brands/${key}.svg`} alt="" style={{ height: 22, filter: "brightness(0) invert(1)" }} />{byLogo[key].name} 이야기 보기
                    </button>
                  ))}
                </div>}
                {k === sel
                  ? <><span className="sel-mark">상세 보는 중 →</span><div className="detail-inline">{detailBody(k, label)}</div></>
                  : <div className="item-actions"><button className="btn sm" onClick={() => { up({ detail: k }); setOptSel({}); setPalSel(null); }}>상세</button></div>}
              </div>
            ))}
          </div>
          <div className="detail-panel">{detailBody(sel, labels[sel])}</div>
        </div>
        {(() => {
          // 결과 글(값·안·포인트·예문)만 검사. 이유·인용은 사용자 말을 옮긴 것이라 제외
          const resultText = Object.values(s.sheet!).flatMap(it => [...asList(it?.value), ...asList(it?.options), ...asList(it?.points), it?.example ?? ""]).map(String).join("\n");
          const before = findExaggeration(userText(s)).length, left = findExaggeration(resultText);
          return left.length
            ? <ExagNote text={resultText} title={`과장 표현 점검: 내가 쓴 글 ${before}개 → 결과에 ${left.length}개 남아 있어요`} />
            : <div className="alert success">과장 표현 점검: 내가 쓴 글에서 {before}개 → 결과에 남은 것 0개 ✅</div>;
        })()}
        <p className="caption">근거 확인: AI가 인용한 내 답 {quotes.length}개 중 {quotes.length - bad.length}개가 입력과 그대로 일치해요.
          {bad.length > 0 && ` 일치하지 않는 인용: ${bad.join(" / ")}.`} AI가 만든 글이니 사실과 다른 부분이 없는지 직접 확인해 주세요.</p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => setPage("활용 템플릿")}>이 시트로 채널별 문구 만들기</button>
          <button className="btn" onClick={() => setPage("1:1 멘토링")}>멘토와 이야기해 보기 (첫 1회 무료)</button>
        </div>
      </>
    );
  };

  const coaching = () => (
    <>
      {s.step > 0 && <div className="stepper">{STEPS.map((n, k) => <div key={n} className={k + 1 === s.step ? "now" : k + 1 < s.step ? "done" : ""}>{k + 1}. {n}</div>)}</div>}
      {[home, basics, scene, signboard, confirm, report][s.step]()}
      {s.step === 5 && <div className="btn-gap"><button className="btn" onClick={reset}>처음부터 다시</button></div>}
    </>
  );

  // ───────── 활용 템플릿 ─────────
  const templates = () => {
    const text = s.tpl[ch];
    const make = async () => {
      setBusy("tpl");
      const [t, e] = await askAI("TEMPLATE", s, { channel: ch, items: D.CHANNELS[ch], brief: sheetText(s) });
      setBusy("");
      if (e) setWarn(e); else up({ tpl: { ...s.tpl, [ch]: t ?? "" } });
    };
    return (
      <>
        <div className="hero story-hero"><span className="eyebrow">TEMPLATES</span><div className="page-title">리포트를 바로 쓰는 문구로</div>
          <p className="hero-sub">채널을 고르면 내 브랜드 리포트를 그 채널에 맞는 문구로 바꿔 드려요. 복사 버튼으로 바로 붙여 넣으세요.</p></div>
        {!s.sheet ? <>
          <div className="alert info">브랜드 코칭을 마치고 리포트를 받으면, 여기서 채널별 문구를 바로 만들 수 있어요.</div>
          {Object.entries(D.CHANNELS).map(([c, items]) => <div className="ch-row" key={c}><b>{c}</b><span>{items}</span></div>)}
          <div className="btn-gap"><button className="btn primary" onClick={() => setPage("브랜드 코칭")}>브랜드 코칭 시작하기</button></div>
        </> : <>
          <Pills label="채널" options={Object.keys(D.CHANNELS)} value={[ch]} onToggle={setCh} />
          <div className="btn-gap"><button className="btn primary" disabled={busy === "tpl"} onClick={make}>{text === undefined ? "이 채널 문구 만들기" : "다시 만들기"}</button></div>
          {busy === "tpl" && <div className="loading">{ch}에 맞게 쓰고 있어요…</div>}
          {warn && <div className="alert error">{warn}</div>}
          {text !== undefined && <>
            {text.split(/^###\s*/m).map((block, i) => {
              const [title, ...rest] = block.trim().split("\n");
              const body = rest.join("\n").trim();
              return body ? <div key={i}><b>{title.trim()}</b>
                <div className="codebox">{body}<button className="btn sm" onClick={() => { navigator.clipboard?.writeText(body); setCopied(i); }}>{copied === i ? "복사됨" : "복사"}</button></div></div> : null;
            })}
            <ExagNote text={text} title="이 문구에 과장으로 보일 수 있는 표현이 있어요" />
            <p className="caption">AI가 리포트를 바탕으로 쓴 초안이에요. 사실과 다르거나 과장된 표현이 없는지 확인한 뒤 써 주세요.</p>
          </>}
        </>}
      </>
    );
  };

  // ───────── 브랜드 스토리 ─────────
  const stories = () => (
    <>
      <div className="hero story-hero"><span className="eyebrow">BRAND STORIES</span><div className="page-title">작은 곳에서 시작한 브랜드들</div>
        <p className="hero-sub">로고를 누르면 브랜드 브리프와 시작 이야기를 볼 수 있어요.</p></div>
      <div className="brand-grid">
        {D.BRANDS.map(b => (
          <button key={b.logo} className="brand-card" onClick={() => setModal({ b })}>
            <img className={WIDE_LOGO.has(b.logo) ? "wide" : ""} src={`/assets/brands/${b.logo}.svg`} alt="" />{b.name}<br />{b.en}
          </button>
        ))}
      </div>
    </>
  );

  // ───────── 1:1 멘토링 ─────────
  const mentorHead = (m: Mentor) => <>
    <div className="mt-head"><img className="mt-ava" alt="" src={`/assets/mentors/${m.avatar}.svg`} />
      <div><div className="mt-name">{m.name}{m.badge && <span className="mt-badge">{m.badge}</span>}</div><div className="mt-role">{m.role} · {m.years}년차</div></div></div>
    <div className="bm-tags">{m.tags.map(t => <span key={t}>#{t}</span>)}</div>
  </>;
  const mentors = () => (
    <>
      <div className="hero story-hero"><span className="eyebrow">1:1 MENTORING</span><div className="page-title">내 브랜드, 전문가와 한 번 더</div>
        <p className="hero-sub">리포트를 들고 분야별 멘토와 60분 동안 이야기해요. 마음에 드는 멘토를 눌러 프로필을 보세요.</p></div>
      <div className="free-banner"><b>첫 1:1 멘토링 1회 무료</b><span>모든 멘토 공통 · 60분</span></div>
      <div className="mentor-grid">
        {D.MENTORS.map(m => (
          <div className="mentor-card" key={m.avatar}>
            {mentorHead(m)}<p className="mt-intro">{m.intro}</p>
            <button className="btn block" onClick={() => { setApplied(false); setModal({ m }); }}>프로필 보기</button>
          </div>
        ))}
      </div>
      <p className="caption">※ 소개된 멘토는 서비스 예시를 위한 가상 인물이에요.</p>
    </>
  );

  const brandModal = (b: Brand, similar?: string) => (
    <>
      <div className="bm-head"><span className="bm-logo"><img className={b.logo === "samsung" ? "wide" : ""} src={`/assets/brands/${b.logo}.svg`} alt={b.en} /></span>
        <div><div className="bm-name">{b.name} <small>{b.en}</small></div><div className="bm-meta">{b.since} · {b.founder}</div></div></div>
      <div className="bm-msg">“{b.message}”<small>{b.official ? "대표 문구" : "핵심 생각 (공식 문구 아님, 요약)"}</small></div>
      <div className="bm-tags">{b.keywords.map(k => <span key={k}>#{k}</span>)}</div>
      {similar && <div className="bm-similar"><b>내 브랜드와 닮은 점</b>{similar}</div>}
      <p><b>시작 이야기</b><br />{b.story.split(/(?<=[.!?])\s+/).map((x, i, a) => <span key={i}>{x}{i < a.length - 1 && <br />}</span>)}</p>
      <div className="alert info"><b>작은 브랜드가 배울 점</b> {b.lesson}</div>
      {b.photos.length > 0 && <div className="modal-photos">
        {b.photos.map(([file, cap, lic]) => <figure key={file} style={{ margin: 0 }}>
          <img src={`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=900`} alt={cap} />
          <figcaption>{cap} · 위키미디어 공용({lic})</figcaption></figure>)}
      </div>}
      <p><a href={b.wiki} target="_blank" rel="noreferrer">위키백과에서 더 보기</a></p>
    </>
  );
  const mentorModal = (m: Mentor) => (
    <>
      {mentorHead(m)}
      <p className="caption">멘토가 직접 작성한 소개예요</p>
      <p>{m.intro}</p>
      <p><b>제가 함께할 수 있는 것</b><br />{m.can.map((c, i) => <span key={i}>· {c}<br /></span>)}</p>
      <p><b>걸어온 길</b><br />{m.career.map((c, i) => <span key={i}>· {c}<br /></span>)}</p>
      <p><b>이런 분을 만나고 싶어요</b><br />{m.for}</p>
      <div className="btn-gap"><button className="btn primary" onClick={() => setApplied(true)}>첫 1회 무료로 신청하기</button></div>
      {applied && <div className="alert success">{m.name} 멘토에게 신청했어요. (테스트 화면이라 실제로 전송되지는 않아요)</div>}
    </>
  );

  const view = { "브랜드 코칭": coaching, "활용 템플릿": templates, "브랜드 스토리": stories, "1:1 멘토링": mentors }[page];
  return (
    <main className="container">
      {/* 셔터는 등장 효과(transform)가 걸린 상자 밖에 둬야 화면 전체를 덮음 (안에 두면 가운데 상자 폭만큼만 그려져 글자가 잘림) */}
      {!introSeen && page === "브랜드 코칭" && s.step === 0 &&
        <div className="intro" aria-hidden="true" style={garagePos}><div className="mq"><span className="g"><span className="pre">FROM YOUR&nbsp;</span>GARAGE</span></div></div>}
      {fake && <div className="test-banner">테스트 모드: AI를 부르지 않고 예시 답을 보여줘요 (비용 0원). 끄려면 환경 변수 FAKE_AI를 지우세요.</div>}
      <nav className="menu" aria-label="메뉴">
        {PAGES.map(p => <button key={p} className={p === page ? "on" : ""} aria-current={p === page} onClick={() => setPage(p)}>{p}</button>)}
      </nav>
      <div className="screen" key={`${page}-${s.step}-${s.q}`}>{view()}</div>
      {modal && <Modal label={modal.b ? "브랜드 브리프" : "멘토 프로필"} onClose={() => setModal(null)}>
        {modal.b ? brandModal(modal.b, modal.similar) : modal.m && mentorModal(modal.m)}
      </Modal>}
    </main>
  );
}
