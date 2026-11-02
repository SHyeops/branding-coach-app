"use client";
// 결과 화면 맨 아래: 내 브랜드 리포트 전체(내가 한 말 + 리포트 모든 항목)를 긴 PNG 한 장으로 저장
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

export default function OnePager({ s, bt, items }: { s: St; bt: string; items: [string, string][] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"" | "busy" | "err">("");
  const [img, setImg] = useState<{ url: string; file: File } | null>(null);
  if (!s.sheet) return null;
  const sh = s.sheet, pal = s.palettes?.[s.pal] ?? s.palettes?.[0];
  const val = (key: string) => asList(sh[key]?.value);
  const fname = `${s.name || "내 브랜드"}_브랜드리포트.png`;
  // 리포트 한 항목을 글로 (화면의 왼쪽 상자와 같은 내용 + 이유)
  const body = (key: string) => {
    const it = sh[key] ?? {}, opts = asList(it.options).map(String);
    if (key === "type") return <>{bt}형 — {D.TYPES[bt]?.desc}</>;
    if (key === "like") return <>{D.TYPES[bt]?.like.map(([b, why]) => `${D.BRANDS.find(x => x.logo === b)?.name ?? b}: ${why}`).join(" / ")}</>;
    if (key === "color") return pal ? <><b>{pal.name}</b><div style={{ display: "flex", gap: 6, marginTop: 4 }}>{pal.colors.map((c, i) =>
      <div key={i} style={{ textAlign: "center", fontSize: 11, color: MUTE }}><div style={{ width: 44, height: 30, borderRadius: 6, background: c.hex, border: "1px solid #0002" }} />{c.hex}</div>)}</div>{pal.why && <div style={{ color: MUTE }}>{pal.why}</div>}</> : null;
    return <>
      {opts.length ? <><b>{chosen(s, key)}</b>{opts.length > 1 && <div style={{ color: MUTE, fontSize: 13 }}>다른 안: {opts.filter(o => o !== chosen(s, key)).join(" / ")}</div>}</>
        : Array.isArray(it.value) ? list(it.value) : String(it.value ?? "")}
      {!!it.example && <div>“{String(it.example)}”</div>}
      {asList(it.points).length > 0 && list(asList(it.points))}
      {!!it.why && <div style={{ color: MUTE, fontSize: 13, marginTop: 4 }}>이유: {String(it.why)}</div>}
    </>;
  };

  const make = async () => {
    if (!ref.current) return;
    setState("busy");
    try {
      // skipFonts: 외부 글꼴 CSS를 읽다 막히는 브라우저가 있어, 기기에 있는 글꼴로 그림
      // 긴 이미지라 아이폰 캔버스 한도(약 1,670만 화소)를 넘지 않게 배율을 낮춤
      const pixelRatio = Math.min(2, Math.sqrt(16e6 / (ref.current.offsetWidth * ref.current.offsetHeight)));
      const url = await toPng(ref.current, { pixelRatio, skipFonts: true, backgroundColor: "#f4f2ee" });
      const file = new File([await (await fetch(url)).blob()], fname, { type: "image/png" });
      setImg({ url, file }); setState("");
    } catch { setState("err"); }
  };
  // 공유 창은 누른 직후에만 열려서(사파리) 이미지를 먼저 만들어 두고 따로 누르게 함
  const canShare = !!img && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [img.file] });
  const share = () => img && navigator.share({ files: [img.file], title: fname }).catch(() => {});
  const download = () => { if (!img) return; const a = document.createElement("a"); a.href = img.url; a.download = fname; a.click(); };

  return (
    <div className="box">
      <b>내 브랜드 리포트 전체 저장하기</b>
      <p className="caption">내가 한 말과 리포트의 모든 항목(내가 고른 안, 이유 포함)을 긴 이미지 한 장으로 모았어요. 휴대폰 사진첩에 두고 볼 수 있어요.</p>
      {!img && <button className="btn primary" disabled={state === "busy"} onClick={make}>{state === "busy" ? "이미지 만드는 중…" : "이미지 만들기"}</button>}
      {state === "err" && <div className="alert error">이미지를 만들지 못했어요. 다시 눌러 주세요. 계속 안 되면 화면을 캡처해 주세요.</div>}
      {img && <>
        <img src={img.url} alt={`${s.name} 브랜드 리포트`} style={{ width: "100%", borderRadius: 10, margin: "8px 0", display: "block" }} />
        <p className="caption">휴대폰에서는 <b>사진첩에 저장</b>을 누르고 공유 창에서 &apos;이미지 저장&apos;(아이폰)이나 갤러리(안드로이드)를 고르세요. 안 되면 이미지를 <b>길게 눌러</b> 저장할 수 있어요.</p>
        <div className="btn-row">
          {canShare && <button className="btn primary" onClick={share}>사진첩에 저장 / 공유</button>}
          <button className={canShare ? "btn" : "btn primary"} onClick={download}>파일로 내려받기</button>
        </div>
      </>}

      {/* 저장용 원본: 화면 밖에 1200px로 그려 두고 이미지로 바꿈 (휴대폰에서도 같은 모양) */}
      <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden="true">
        <div ref={ref} style={{ width: 1200, padding: 30, boxSizing: "border-box", background: "#f4f2ee", color: INK, fontSize: 15, lineHeight: 1.55, fontFamily: "Pretendard, 'Apple SD Gothic Neo', sans-serif" }}>
          <div style={{ fontSize: 13, letterSpacing: ".08em", color: MUTE, fontWeight: 700 }}>MY BRAND REPORT · FROM YOUR GARAGE</div>
          <div style={{ fontSize: 30, fontWeight: 800, margin: "4px 0" }}>{s.name} <span style={{ fontSize: 14, color: "#fff", background: NAVY, borderRadius: 99, padding: "3px 10px", verticalAlign: "middle" }}>{bt}형</span></div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{String(sh.one_liner?.value ?? "")}</div>
          <div style={{ color: NAVY, fontWeight: 700, marginTop: 4 }}>{val("values").map(v => `#${String(v)}`).join("  ")}</div>
          <div style={{ marginTop: 18 }}>
            <div style={card}>
              <h2 style={h2}>내가 한 말</h2>
              {D.SCENES[s.kind].map((sc, i) => {
                const picks = (s.picks[i] ?? []).join(", "), note = s.notes[i];
                return picks || note ? <div key={i}><div style={k}>[{sc.group}] {sc.ask}</div>{picks}{picks && note ? <br /> : null}{note ? `✍ ${note}` : null}</div> : null;
              })}
            </div>
          </div>
          <div style={{ ...card, marginTop: 18 }}>
            <h2 style={h2}>내 브랜드 리포트</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 28 }}>
              {items.filter(([key]) => key !== "names" || sh.names).map(([key, label]) => <div key={key} style={{ breakInside: "avoid", gridColumn: ["story", "edge", "strategy", "todo", "advice"].includes(key) ? "1 / -1" : undefined }}>
                <div style={{ ...k, color: key === "todo" ? NAVY : MUTE }}>{label}</div>{body(key)}</div>)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: MUTE, marginTop: 14 }}>AI가 내 말을 엮어 만든 초안이에요. 사실과 다른 부분은 고쳐 쓰고, 노란 줄은 손님에게 확인해 보세요. · fromyourgarage.vercel.app</div>
        </div>
      </div>
    </div>
  );
}
