"use client";
// 결과 화면 맨 아래: 내 브랜드 리포트 전체(내가 한 말 + 리포트 모든 항목)를 긴 PNG 한 장으로 저장
import { D, type St, asList, chosen } from "@/lib/logic";
import SaveImage, { MUTE, NAVY, k, card, h2 } from "./SaveImage";

const list = (xs: unknown[]) => <ul style={{ margin: "2px 0", paddingLeft: 18 }}>{xs.map((x, i) => {
  const t = String(x);
  return <li key={i} style={t.includes("아직 흔한 편") ? { background: "#fff3c4" } : undefined}>{t}</li>;
})}</ul>;

export default function OnePager({ s, bt, items }: { s: St; bt: string; items: [string, string][] }) {
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


  return (
    <SaveImage title="내 브랜드 리포트 전체 저장하기" fname={fname} alt={`${s.name} 브랜드 리포트`}
      caption="내가 한 말과 리포트의 모든 항목(내가 고른 안, 이유 포함)을 긴 이미지 한 장으로 모았어요. 휴대폰 사진첩에 두고 볼 수 있어요.">
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
    </SaveImage>
  );
}
