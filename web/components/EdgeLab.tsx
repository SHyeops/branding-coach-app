"use client";
// 차별점 찾기 탭: 늘어놓기 → 엮어 보기 → 버리기 → 남은 것. AI 없이 사용자가 직접 (차고 벽에 종이를 붙이고, 실로 잇고, 구겨 버림)
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as PE } from "react";

type Note = { id: number; text: string; cat: string; combo?: [string, string]; star?: boolean };
type Saved = { notes: Note[]; trash: Note[]; step: number; next: number };

const CATS: [string, string][] = [["할 줄 아는 것", "#fff3a8"], ["좋아하는 것", "#cdeccd"], ["겪은 일·경력", "#cfe3ff"], ["칭찬받은 것", "#ffd9b8"], ["코칭에서", "#fffdf7"]];
const COLOR = Object.fromEntries(CATS) as Record<string, string>;
const STEPS = [
  { t: "늘어놓기", h: "할 줄 아는 것, 좋아하는 것, 겪은 일을 사소한 것까지 벽에 붙여요. 10장이 목표예요." },
  { t: "엮어 보기", h: "종이 하나를 누른 채 보드마카로 다른 종이까지 선을 그어 보세요(두 장을 차례로 눌러도 돼요). 둘을 합치면 어떤 일이 되나요? 예) 회계 경력 + 베이킹 → 원가를 공개하는 빵집" },
  { t: "버리기", h: "하기 싫은 것, 같은 걸 파는 3곳도 똑같이 말할 수 있는 것을 눌러 구겨 버려요. 쓰레기통을 누르면 되살아나요." },
  { t: "남은 것", h: "벽에 남은 것이 내 차별점 후보예요. 가장 마음에 드는 것에 별을 붙이고(3개까지) 확인해 보세요." },
];
const KEY = "fyg-edge-lab";
const empty: Saved = { notes: [], trash: [], step: 0, next: 1 };

export default function EdgeLab({ seeds }: { seeds: string[] }) {
  const [v, setV] = useState<Saved>(empty);
  const [text, setText] = useState(""), [cat, setCat] = useState(CATS[0][0]), [combo, setCombo] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [fly, setFly] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const [gulp, setGulp] = useState(0);
  const [line, setLine] = useState<number[] | null>(null);
  const [drag, setDrag] = useState<{ from: number; x: number; y: number; x0: number; y0: number } | null>(null);
  const wall = useRef<HTMLDivElement>(null), trashEl = useRef<HTMLButtonElement>(null);
  const el = (id: number) => wall.current?.querySelector<HTMLElement>(`[data-id="${id}"]`);

  // 이 브라우저에만 저장 (새로고침해도 남게). 막힌 브라우저에선 그냥 저장 안 함
  const [loaded, setLoaded] = useState(false); // 불러오기 전에 빈 벽으로 덮어쓰지 않게
  useEffect(() => { try { const x = localStorage.getItem(KEY); if (x) setV({ ...empty, ...JSON.parse(x) }); } catch {} setLoaded(true); }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} }, [v, loaded]);

  // 고른 두 장 사이의 빨간 실
  useLayoutEffect(() => {
    const draw = () => {
      const a = el(sel[0]), b = el(sel[1]), w = wall.current?.getBoundingClientRect();
      if (sel.length < 2 || !a || !b || !w) return setLine(null);
      const c = (r: DOMRect) => [r.left + r.width / 2 - w.left, r.top + 6 - w.top];
      setLine([...c(a.getBoundingClientRect()), ...c(b.getBoundingClientRect())]);
    };
    draw(); addEventListener("resize", draw); return () => removeEventListener("resize", draw);
  }, [sel, v.notes]);

  // 보드마카: 종이에서 누른 채 끌어 다른 종이 위에서 놓으면 연결
  const at = (e: { clientX: number; clientY: number }) => { const w = wall.current!.getBoundingClientRect(); return [e.clientX - w.left, e.clientY - w.top]; };
  const down = (n: Note) => (e: PE) => {
    if (v.step !== 1) return;
    const r = el(n.id)!.getBoundingClientRect(), w = wall.current!.getBoundingClientRect();
    const [x, y] = at(e);
    setDrag({ from: n.id, x, y, x0: r.left + r.width / 2 - w.left, y0: r.top + 6 - w.top });
  };
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => { const [x, y] = at(e); setDrag(d => d && { ...d, x, y }); };
    const end = (e: PointerEvent) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-id]");
      const to = hit && wall.current?.contains(hit) ? Number(hit.dataset.id) : 0;
      if (to && to !== drag.from) setSel([drag.from, to]);
      else if (to === drag.from) setSel(s => s.includes(to) ? s.filter(x => x !== to) : [...s, to].slice(-2));  // 끌지 않고 누르기만 = 하나씩 고르기
      setDrag(null);
    };
    addEventListener("pointermove", move); addEventListener("pointerup", end, { once: true });
    return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", end); };
  }, [drag?.from]); // eslint-disable-line react-hooks/exhaustive-deps

  const up = (p: Partial<Saved>) => setV(o => ({ ...o, ...p }));
  const add = (t: string, c: string, extra: Partial<Note> = {}) => setV(o => ({ ...o, next: o.next + 1, notes: [...o.notes, { id: o.next, text: t, cat: c, ...extra }] }));
  const stick = () => { const t = text.trim(); if (t) { add(t, cat); setText(""); } };
  const enter = (f: () => void) => (e: KeyboardEvent) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); f(); } };
  const fresh = seeds.filter(x => !v.notes.some(n => n.text === x) && !v.trash.some(n => n.text === x));
  const pulled = () => setV(o => ({ ...o, next: o.next + fresh.length, notes: [...o.notes, ...fresh.map((t, k) => ({ id: o.next + k, text: t, cat: "코칭에서" }))] }));
  const go = (n: number) => { setSel([]); setCombo(""); up({ step: n }); };

  const tap = (n: Note, keyboard = false) => {
    if (v.step === 1 && keyboard) setSel(s => s.includes(n.id) ? s.filter(x => x !== n.id) : [...s, n.id].slice(-2));
    if (v.step === 2 && !fly) {
      const a = el(n.id)?.getBoundingClientRect(), b = trashEl.current?.getBoundingClientRect();
      if (!a || !b) return;
      setFly({ id: n.id, dx: b.left + b.width / 2 - (a.left + a.width / 2), dy: b.top + b.height / 3 - (a.top + a.height / 2) });
    }
    if (v.step === 3) setV(o => {
      const on = o.notes.filter(x => x.star).length;
      return { ...o, notes: o.notes.map(x => x.id === n.id ? { ...x, star: x.star ? false : on < 3 } : x) };
    });
  };
  const landed = (id: number) => {
    setV(o => ({ ...o, notes: o.notes.filter(x => x.id !== id), trash: [...o.trash, { ...o.notes.find(x => x.id === id)!, star: false }] }));
    setFly(null); setGulp(g => g + 1);
  };
  const restore = () => setV(o => o.trash.length ? { ...o, trash: o.trash.slice(0, -1), notes: [...o.notes, o.trash[o.trash.length - 1]] } : o);
  const tie = () => {
    const [a, b] = sel.map(id => v.notes.find(n => n.id === id)!.text), t = combo.trim();
    if (!t) return;
    add(t, "조합", { combo: [a, b] }); setSel([]); setCombo("");
  };

  const combos = v.notes.filter(n => n.combo), stars = v.notes.filter(n => n.star);
  const picked = sel.map(id => v.notes.find(n => n.id === id)?.text ?? "");

  return (
    <>
      <div className="hero story-hero"><span className="eyebrow">FIND YOUR EDGE</span><div className="page-title">내 차별점, 직접 찾기</div>
        <p className="hero-sub">AI가 대신 찾아 준 차별점보다 내가 찾은 게 오래 가요. 할 줄 아는 걸 늘어놓고, 엮고, 버려 보세요. 손님이 아직 없어도 할 수 있어요.</p></div>

      <ol className="lab-steps">
        {STEPS.map((x, k) => <li key={x.t}><button className={k === v.step ? "on" : k < v.step ? "done" : ""} aria-current={k === v.step} onClick={() => go(k)}><b>{k + 1}</b>{x.t}</button></li>)}
      </ol>
      <p className="lab-hint">{STEPS[v.step].h}</p>

      {v.step === 0 && <div className="lab-input">
        <div className="lab-cats">{CATS.slice(0, 4).map(([c, col]) => <button key={c} className={c === cat ? "on" : ""} style={{ "--c": col } as CSSProperties} onClick={() => setCat(c)}>{c}</button>)}</div>
        <div className="lab-row">
          <input value={text} maxLength={40} placeholder={{ "할 줄 아는 것": "예: 엑셀로 원가 계산", "좋아하는 것": "예: 새벽 시장 구경", "겪은 일·경력": "예: 회계 사무소 5년", "칭찬받은 것": "예: 설명을 쉽게 한다" }[cat]}
            onChange={e => setText(e.target.value)} onKeyDown={enter(stick)} aria-label={`${cat} 적기`} />
          <button className="btn primary" disabled={!text.trim()} onClick={stick}>벽에 붙이기</button>
        </div>
        {fresh.length > 0 && <button className="btn sm" onClick={pulled}>코칭에서 고른 것 {fresh.length}장 붙이기</button>}
      </div>}

      <div className={`wall lab-wall step${v.step}`} ref={wall}>
        <span className="wall-label">GARAGE WALL · {v.notes.length}장{v.step === 0 && v.notes.length < 10 ? ` / 목표 10장` : ""}</span>
        {!v.notes.length && <p className="lab-empty">아직 빈 벽이에요. 위에서 하나씩 붙여 보세요.</p>}
        {v.notes.map((n, j) => {
          const flying = fly?.id === n.id, act = v.step > 0;
          const st = { "--r": `${(n.id * 37) % 7 - 3}deg`, "--c": n.combo ? "#ffd3e6" : COLOR[n.cat] ?? "#fffdf7", ...(flying && { "--dx": `${fly.dx}px`, "--dy": `${fly.dy}px` }) } as CSSProperties;
          const cls = `postit lab-note new${n.combo ? " combo" : ""}${sel.includes(n.id) ? " picked" : ""}${n.star ? " star" : ""}${flying ? " crumple" : ""}`;
          const body = <>{n.combo ? <small>{n.combo[0]} + {n.combo[1]}</small> : <small>{n.cat}</small>}{n.text}</>;
          return act
            ? <button key={n.id} data-id={n.id} className={cls} style={{ ...st, animationDelay: flying ? "0s" : `${Math.min(j, 8) * 0.03}s` }}
                aria-label={`${n.text} — ${["", "엮을 종이로 고르기", "구겨 버리기", "별 붙이기"][v.step]}`} onClick={e => tap(n, e.detail === 0)} onPointerDown={down(n)}
                onAnimationEnd={e => { if (flying && e.animationName === "crumple") landed(n.id); }}>{body}</button>
            : <span key={n.id} data-id={n.id} className={cls} style={st}>{body}</span>;
        })}
        {(line || drag) && <svg className="lab-marker" aria-hidden="true">
          {line && !drag && <path className="ink done" d={`M${line[0]} ${line[1]} Q${(line[0] + line[2]) / 2 + 12} ${(line[1] + line[3]) / 2 - 18} ${line[2]} ${line[3]}`} />}
          {drag && <><path className="ink" d={`M${drag.x0} ${drag.y0} L${drag.x} ${drag.y}`} /><g transform={`translate(${drag.x} ${drag.y}) rotate(-35)`} className="pen">
            <rect x="-6" y="-46" width="12" height="34" rx="3" /><rect x="-6" y="-56" width="12" height="11" rx="2" className="cap" /><path d="M-5 -12 L0 0 L5 -12z" className="tip" /></g></>}
        </svg>}
        <button ref={trashEl} key={gulp} className={`lab-trash${gulp ? " gulp" : ""}${v.step === 2 ? " ready" : ""}`} onClick={restore} disabled={!v.trash.length}
          aria-label={`쓰레기통 ${v.trash.length}장${v.trash.length ? " — 눌러서 마지막 종이 되살리기" : ""}`} title={v.trash.length ? "눌러서 되살리기" : "쓰레기통"}>
          <svg viewBox="0 0 64 72" aria-hidden="true"><rect x="6" y="10" width="52" height="8" rx="3" className="lid" /><rect x="24" y="4" width="16" height="7" rx="3" className="lid" />
            <path d="M11 20h42l-4 48H15z" className="can" /><path d="M24 28v32M32 28v32M40 28v32" className="rib" /></svg>
          {v.trash.length > 0 && <b>{v.trash.length}</b>}
        </button>
      </div>

      {v.step === 1 && sel.length === 2 && <div className="lab-input tie">
        <p><b>「{picked[0]}」</b> + <b>「{picked[1]}」</b> = ?</p>
        <div className="lab-row">
          <input value={combo} maxLength={50} placeholder="둘을 합친 일을 한 줄로 (예: 원가를 공개하는 빵집)" onChange={e => setCombo(e.target.value)} onKeyDown={enter(tie)} aria-label="엮은 결과 적기" autoFocus />
          <button className="btn primary" disabled={!combo.trim()} onClick={tie}>엮어서 붙이기</button>
        </div>
      </div>}
      {v.step === 1 && sel.length < 2 && <p className="caption">🖊️ 종이에서 다른 종이까지 선을 그어 보세요{sel.length === 1 ? " (한 장 골랐어요, 한 장 더)" : ""}. 엮은 종이는 분홍색으로 붙어요{combos.length ? ` (지금 ${combos.length}장)` : ""}.</p>}

      {v.step === 3 && <div className="lab-final">
        <div><b>⭐ 내 차별점 후보</b>
          {stars.length ? <ul>{stars.map(n => <li key={n.id}>{n.text}{n.combo && <small> ({n.combo.join(" + ")})</small>}</li>)}</ul>
            : <p className="caption">벽의 종이를 눌러 별을 붙여 보세요. 분홍색 엮은 종이가 좋은 후보예요.</p>}</div>
        <div><b>이번 주에 확인해 보기</b><ol>
          <li><b>따라 하기 시험</b> — 같은 걸 파는 사람이 이 말을 그대로 쓰면 거짓말이 되나요? 그렇다면 내 것이에요.</li>
          <li><b>3명에게 묻기</b> — 살 것 같은 사람 3명에게 &ldquo;이런 곳이면 사겠어요?&rdquo;라고 물어요. 손님이 있으면 손님에게, 없으면 지인에게.</li>
          <li><b>첫 줄에 쓰기</b> — 두 번 이상 좋다는 말이 나온 것을 소개 첫 줄에 써 봐요.</li>
        </ol></div>
      </div>}

      <div className="btn-row">
        {v.step > 0 ? <button className="btn" onClick={() => go(v.step - 1)}>← {STEPS[v.step - 1].t}</button> : <span />}
        {v.step < 3 ? <button className="btn primary" disabled={v.step === 0 && v.notes.length < 2} onClick={() => go(v.step + 1)}>다음: {STEPS[v.step + 1].t}</button>
          : <button className="btn" onClick={() => { if (confirm("벽을 모두 비우고 처음부터 할까요?")) { setSel([]); setV(empty); } }}>벽 비우고 다시 하기</button>}
      </div>
    </>
  );
}
