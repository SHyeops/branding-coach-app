"use client";
// 활용 템플릿: AI가 쓴 문구를 채널 화면처럼 보여 줌 (로고·상표 없이 배치만 비슷하게). 문구는 '### 항목' 순서대로 자리에 들어감
import { useState, type CSSProperties, type ReactNode } from "react";

export type Block = { title: string; body: string };

export default function ChannelMock({ ch, blocks, name, color }: { ch: string; blocks: Block[]; name: string; color: string }) {
  const [copied, setCopied] = useState(-1);
  const b = (i: number) => blocks[i]?.body ?? "";
  const ava = <span className="mk-ava" style={{ "--c": color } as CSSProperties}>{name.slice(0, 1)}</span>;
  const lines = (t: string) => t.split("\n").map((x, i) => <span key={i} className={x.trim().startsWith("👇") ? "mk-cta" : ""}>{x}<br /></span>);

  const views: Record<string, ReactNode> = {
    "인스타그램": <>
      <div className="mk-ig-top">{ava}<div className="mk-stats"><span><b>1</b>게시물</span><span><b>0</b>팔로워</span><span><b>0</b>팔로잉</span></div></div>
      <b className="mk-name">{name}</b>
      <p className="mk-text">{lines(b(0))}</p>
      <span className="mk-link">🔗 내 링크</span>
      <div className="mk-btns"><span className="on">팔로우</span><span>메시지</span></div>
      <div className="mk-grid"><i style={{ background: color }} /><i /><i /></div>
      {b(1) && <p className="mk-text mk-cap"><b>{name}</b> {b(1)} <span className="mk-more">… 더 보기</span></p>}
    </>,
    "스레드": <div className="mk-post">{ava}<div><b className="mk-name">{name}</b> <span className="mk-time">방금</span><p className="mk-text">{lines(b(0))}</p><div className="mk-acts">♡ &nbsp; 💬 &nbsp; ↻ &nbsp; ➤</div></div></div>,
    "스마트스토어": <>
      <div className="mk-photo" style={{ background: color }}><span>상품 사진</span></div>
      <b className="mk-title">{b(0)}</b>
      <div className="mk-sec">상세정보</div>
      <p className="mk-text">{lines(b(1))}</p>
    </>,
    "당근 비즈프로필": <>
      <div className="mk-dg-top">{ava}<div><b className="mk-name">{name}</b><span className="mk-time">우리 동네 가게</span></div><span className="mk-pill">단골 맺기</span></div>
      <div className="mk-sec">소개</div>
      <p className="mk-text">{lines(b(0))}</p>
    </>,
  };

  return (
    <div className="mk-wrap">
      <div className={`mk-phone mk-${Object.keys(views).indexOf(ch)}`} aria-label={`${ch} 미리보기`}>{views[ch] ?? blocks.map((x, i) => <p key={i} className="mk-text">{lines(x.body)}</p>)}</div>
      <div className="mk-copy">
        <p className="caption">실제 화면처럼 넣어 본 예시예요. 마음에 드는 문구를 복사해 쓰세요.</p>
        {blocks.map((x, i) => <div key={i} className="mk-item"><b>{x.title}</b><p>{x.body}</p>
          <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(x.body); setCopied(i); }}>{copied === i ? "복사됨" : "복사"}</button></div>)}
      </div>
    </div>
  );
}
