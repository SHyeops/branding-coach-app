"use client";
// 결과 화면 맨 아래: 내 브랜드 원 페이지 가이드(내가 한 말 | 추천 방향)를 PNG 한 장으로 저장
import { useRef, useState, type CSSProperties } from "react";
import { toPng } from "html-to-image";
import { D, type St, asList, chosen } from "@/lib/logic";

const INK = "#1d1d1f", NAVY = "#1f2a44", MUTE = "#6b6b6b";
const k: CSSProperties = { fontWeight: 700, color: MUTE, fontSize: 13, margin: "12px 0 2px" };
const card: CSSProperties = { background: "#fff", borderRadius: 14, padding: 22 };
const h2: CSSProperties = { margin: "0 0 8px", fontSize: 17, color: NAVY, borderBottom: `2px solid ${NAVY}`, paddingBottom: 5 };
const list = (xs: unknown[]) => <ul style={{ margin: "2px 0", paddingLeft: 18 }}>{xs.map((x, i) => {
  const t = String(x);
  return <li key={i} style={t.includes("아직 흔한 편") ? { background: "#fff3c4" } : undefined}>{t}</li>;
})}</ul>;

export default function OnePager({ s, bt }: { s: St; bt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"" | "busy" | "err">("");
  if (!s.sheet) return null;
  const sh = s.sheet, pal = s.palettes?.[s.pal] ?? s.palettes?.[0];
  const val = (key: string) => asList(sh[key]?.value);

  const save = async () => {
    if (!ref.current) return;
    setState("busy");
    try {
      // skipFonts: 외부 글꼴 CSS를 읽다 막히는 브라우저가 있어, 기기에 있는 글꼴로 그림
      const url = await toPng(ref.current, { pixelRatio: 2, skipFonts: true, backgroundColor: "#f4f2ee" });
      const a = document.createElement("a");
      a.href = url; a.download = `${s.name || "내 브랜드"}_브랜드가이드.png`; a.click();
      setState("");
    } catch { setState("err"); }
  };

  return (
    <div className="box">
      <b>내 브랜드 가이드 한 장으로 저장하기</b>
      <p className="caption">내가 한 말과 추천 방향을 이미지 한 장으로 모았어요. 휴대폰 사진첩에 두고 볼 수 있어요.</p>
      <button className="btn primary" disabled={state === "busy"} onClick={save}>{state === "busy" ? "이미지 만드는 중…" : "이미지로 저장 (PNG)"}</button>
      {state === "err" && <div className="alert error">이미지를 만들지 못했어요. 다시 눌러 주세요. 계속 안 되면 화면을 캡처해 주세요.</div>}

      {/* 저장용 원본: 화면 밖에 1200px로 그려 두고 이미지로 바꿈 (휴대폰에서도 같은 모양) */}
      <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden="true">
        <div ref={ref} style={{ width: 1200, padding: 30, boxSizing: "border-box", background: "#f4f2ee", color: INK, fontSize: 15, lineHeight: 1.55, fontFamily: "Pretendard, 'Apple SD Gothic Neo', sans-serif" }}>
          <div style={{ fontSize: 13, letterSpacing: ".08em", color: MUTE, fontWeight: 700 }}>MY BRAND GUIDE · FROM YOUR GARAGE</div>
          <div style={{ fontSize: 30, fontWeight: 800, margin: "4px 0" }}>{s.name} <span style={{ fontSize: 14, color: "#fff", background: NAVY, borderRadius: 99, padding: "3px 10px", verticalAlign: "middle" }}>{bt}형</span></div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{String(sh.one_liner?.value ?? "")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 18, marginTop: 18 }}>
            <div style={card}>
              <h2 style={h2}>내가 한 말</h2>
              {D.SCENES[s.kind].map((sc, i) => {
                const picks = (s.picks[i] ?? []).join(", "), note = s.notes[i];
                return picks || note ? <div key={i}><div style={k}>[{sc.group}] {sc.ask}</div>{picks}{picks && note ? <br /> : null}{note ? `✍ ${note}` : null}</div> : null;
              })}
            </div>
            <div style={card}>
              <h2 style={h2}>추천 방향</h2>
              <div style={k}>나만의 차별점</div>{list(val("edge"))}
              <div style={k}>미션</div>{chosen(s, "mission")}
              <div style={k}>핵심 가치</div>{val("values").map(String).join(" · ")}
              <div style={k}>핵심 메시지</div>{chosen(s, "message")}
              <div style={k}>슬로건</div><b>{chosen(s, "slogans")}</b>
              {pal && <><div style={k}>컬러 · {pal.name}</div><div style={{ display: "flex", gap: 6 }}>{pal.colors.map((c, i) =>
                <div key={i} style={{ textAlign: "center", fontSize: 11, color: MUTE }}><div style={{ width: 44, height: 30, borderRadius: 6, background: c.hex, border: "1px solid #0002" }} />{c.hex}</div>)}</div></>}
              <div style={{ ...k, color: NAVY }}>이번 주 할 일</div>{list(val("todo"))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: MUTE, marginTop: 14 }}>AI가 내 말을 엮어 만든 초안이에요. 사실과 다른 부분은 고쳐 쓰고, 노란 줄은 손님에게 확인해 보세요. · fromyourgarage.vercel.app</div>
        </div>
      </div>
    </div>
  );
}
