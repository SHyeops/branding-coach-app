"use client";
// 화면 밖에 1200px로 그린 내용을 긴 PNG 한 장으로 저장 (브랜드 리포트·차별점 찾기 공용)
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toPng } from "html-to-image";

export const INK = "#1d1d1f", NAVY = "#1f2a44", MUTE = "#6b6b6b";
export const k: CSSProperties = { fontWeight: 700, color: MUTE, fontSize: 13, margin: "12px 0 2px" };
export const card: CSSProperties = { background: "#fff", borderRadius: 14, padding: 22 };
export const h2: CSSProperties = { margin: "0 0 8px", fontSize: 17, color: NAVY, borderBottom: `2px solid ${NAVY}`, paddingBottom: 5 };

export default function SaveImage({ title, caption, fname, alt, children }: { title: string; caption: string; fname: string; alt: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"" | "busy" | "err">("");
  const [img, setImg] = useState<{ url: string; file: File } | null>(null);

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
      <b>{title}</b>
      <p className="caption">{caption}</p>
      {!img && <button className="btn primary" disabled={state === "busy"} onClick={make}>{state === "busy" ? "이미지 만드는 중…" : "이미지 만들기"}</button>}
      {state === "err" && <div className="alert error">이미지를 만들지 못했어요. 다시 눌러 주세요. 계속 안 되면 화면을 캡처해 주세요.</div>}
      {img && <>
        <img src={img.url} alt={alt} style={{ width: "100%", borderRadius: 10, margin: "8px 0", display: "block" }} />
        <p className="caption">휴대폰에서는 <b>사진첩에 저장</b>을 누르고 공유 창에서 &apos;이미지 저장&apos;(아이폰)이나 갤러리(안드로이드)를 고르세요. 안 되면 이미지를 <b>길게 눌러</b> 저장할 수 있어요.</p>
        <div className="btn-row">
          {canShare && <button className="btn primary" onClick={share}>사진첩에 저장 / 공유</button>}
          <button className={canShare ? "btn" : "btn primary"} onClick={download}>파일로 내려받기</button>
        </div>
      </>}

      {/* 저장용 원본: 화면 밖에 1200px로 그려 두고 이미지로 바꿈 (휴대폰에서도 같은 모양) */}
      <div style={{ position: "fixed", left: -10000, top: 0 }} aria-hidden="true">
        <div ref={ref} style={{ width: 1200, padding: 30, boxSizing: "border-box", background: "#f4f2ee", color: INK, fontSize: 15, lineHeight: 1.55, fontFamily: "Pretendard, 'Apple SD Gothic Neo', sans-serif" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
