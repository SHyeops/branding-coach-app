# 진행 체크판: 최신 일정 문서의 '기준 일정' 표(고정 계획일 + 실제 날짜)를 읽어 앞당김/늦음을 그림
# 실행: python3 make_board.py [오늘 MM/DD]  → results/progress/진행체크판.html
import glob, re, sys
from datetime import date
from html import escape as e
from pathlib import Path

DAYS = [("10/28", "수", "1일차"), ("10/29", "목", "2일차"), ("10/30", "금", "3일차"),
        ("10/31", "토", "작업 없음"), ("11/1", "일", "4일차 · 반나절"), ("11/2", "월", "5일차 · 끝내는 날")]
WORK = [d for d, _, t in DAYS if t != "작업 없음"]  # 날짜 차이는 작업하는 날로만 셈


def load():
    src = max(glob.glob("*_1차프로젝트_일정_v*.md"), key=lambda p: int(re.search(r"_v(\d+)", p)[1]))
    body = Path(src).read_text().split("<!-- board:start -->")[1].split("<!-- board:end -->")[0]
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in body.strip().splitlines()[2:]]
    return src, [dict(id=r[0], name=r[1], plan=r[2], people=bool(r[3]), act=r[4]) for r in rows]


def status(t, today):
    """(종류, 꼬리표) — done/ahead/doing/early/late/today/todo"""
    kind, _, d = t["act"].partition(" ")
    gap = WORK.index(t["plan"]) - WORK.index(d) if d in WORK else 0
    if kind == "완료": return ("ahead", f"⏩ {d}에 끝 · {gap}일 당김") if gap > 0 else ("done", "✓ 끝")
    if WORK.index(t["plan"]) < WORK.index(today): return ("late", "⚠ 늦음" + (f" · {d} 시작" if d else ""))
    if kind == "진행": return ("early", f"◐ {d} 미리 시작") if gap > 0 else ("doing", "◐ 하는 중")
    return ("today", "○ 오늘 할 일") if t["plan"] == today else ("todo", "○ 할 일")


def summary(ts, today):
    st = {t["id"]: status(t, today)[0] for t in ts}
    due = [t for t in ts if WORK.index(t["plan"]) <= WORK.index(today)]
    done_due = [t for t in due if st[t["id"]] in ("done", "ahead")]
    ahead = [t for t in ts if st[t["id"]] == "ahead"]
    early = [t for t in ts if st[t["id"]] == "early"]
    late = [t for t in ts if st[t["id"]] == "late"]
    left_today = [t for t in ts if st[t["id"]] == "today"]
    if late: verdict = f"⚠ 늦은 일 {len(late)}개 — 먼저 처리"
    elif ahead or early: verdict = "⏩ 계획보다 앞서는 중"
    else: verdict = "✓ 계획대로"
    nums = [("오늘까지 계획", f"{len(done_due)}/{len(due)} 끝"), ("다음 날 일 미리 끝", f"{len(ahead)}개"),
            ("다음 날 일 미리 시작", f"{len(early)}개"), ("늦은 일", f"{len(late)}개")]
    note = ("오늘 계획 중 남은 일: " + ", ".join(t["name"] + (" 👥" if t["people"] else "") for t in left_today)) if left_today else "오늘 계획한 일은 모두 끝"
    return verdict, nums, note


BG, INK, INK2, PINK, AMB, RED = "#0f0f0f", "#f5f5f5", "#a3a3a3", "#ff3d9a", "#ffc35a", "#ff6b6b"
F = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR',sans-serif"
M = "ui-monospace,'SF Mono',Menlo,monospace"
STY = {  # 카드 배경, 테두리, 대시, 꼬리표 색
    "done": ("#1f1f1f", "none", "", INK2), "ahead": ("rgba(255,61,154,0.14)", PINK, "", PINK),
    "doing": ("none", AMB, "", AMB), "early": ("none", PINK, "5,4", PINK),
    "today": ("none", AMB, "5,4", AMB), "todo": ("none", "rgba(255,255,255,0.28)", "5,4", INK2),
    "late": ("rgba(255,107,107,0.10)", RED, "", RED),
}


def render(ts, today, src):
    W, LW, CW, TOP, CH, GAP = 1200, 24, 192, 104, 52, 8
    n = max(sum(t["plan"] == d for t in ts) for d, _, _ in DAYS)
    H = TOP + n * (CH + GAP) + 64
    o = [f'<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
         f'<line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.08)" stroke-width="2"/></pattern>'
         f'<marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="{INK2}"/></marker></defs>',
         f'<rect width="{W}" height="{H}" fill="{BG}"/>']
    for j, (d, wd, label) in enumerate(DAYS):
        x = LW + j * CW
        if d == today:
            o.append(f'<rect x="{x + 2}" y="16" width="{CW - 4}" height="{H - 72}" rx="8" fill="rgba(255,255,255,0.04)" stroke="{INK}" stroke-width="1.5"/>')
        if j < len(DAYS) - 1:
            o.append(f'<line x1="{x + CW - 8}" y1="52" x2="{x + CW + 7}" y2="52" stroke="{INK2}" marker-end="url(#arrow)"/>')
    for j, (d, wd, label) in enumerate(DAYS):
        x, bx, bw = LW + j * CW, LW + j * CW + 8, CW - 16
        o.append(f'<rect x="{bx}" y="24" width="{bw}" height="56" rx="6" fill="#171717" stroke="{INK if d == today else "rgba(255,255,255,0.2)"}"/>')
        o.append(f'<text x="{bx + 12}" y="46" font-family="{M}" font-size="12" fill="{INK2}">{d} {wd}{" · 오늘" if d == today else ""}</text>')
        o.append(f'<text x="{bx + 12}" y="68" font-family="{F}" font-size="15" font-weight="700" fill="{INK if d in WORK else INK2}">{e(label)}</text>')
        if d not in WORK:
            o.append(f'<rect x="{bx}" y="{TOP}" width="{bw}" height="{n * (CH + GAP) - GAP}" rx="6" fill="url(#hatch)" stroke="rgba(255,255,255,0.12)"/>')
            cy = TOP + (n * (CH + GAP)) // 2
            o.append(f'<rect x="{bx + 24}" y="{cy - 28}" width="{bw - 48}" height="52" rx="4" fill="{BG}"/>')
            o.append(f'<text x="{bx + bw // 2}" y="{cy - 6}" text-anchor="middle" font-family="{F}" font-size="13" font-weight="600" fill="{INK2}">개인 일정</text>')
            o.append(f'<text x="{bx + bw // 2}" y="{cy + 14}" text-anchor="middle" font-family="{F}" font-size="12" fill="{INK2}">작업 없음</text>')
            continue
        for i, t in enumerate([t for t in ts if t["plan"] == d]):
            k, tag = status(t, today)
            fill, stroke, dash, tc = STY[k]
            y = TOP + i * (CH + GAP)
            o.append(f'<rect x="{bx}" y="{y}" width="{bw}" height="{CH}" rx="6" fill="{fill}" stroke="{stroke}"' + (f' stroke-dasharray="{dash}"' if dash else "") + "/>")
            o.append(f'<text x="{bx + 10}" y="{y + 21}" font-family="{M}" font-size="11" fill="{INK2}">{t["id"]}</text>')
            o.append(f'<text x="{bx + 42}" y="{y + 21}" font-family="{F}" font-size="13" font-weight="600" fill="{INK}">{e(t["name"])}{" 👥" if t["people"] else ""}</text>')
            o.append(f'<text x="{bx + 42}" y="{y + 41}" font-family="{F}" font-size="12" fill="{tc}">{e(tag)}</text>')
    lg = [("■ 회색 ✓ = 계획한 날에 끝", INK2), ("■ 분홍 ⏩ = 계획보다 먼저 끝", PINK), ("┅ 분홍 ◐ = 미리 시작", PINK),
          ("┅ 노랑 ○ = 남은 일", AMB), ("■ 빨강 ⚠ = 늦음", RED), ("👥 = 다른 사람 필요(평일만)", INK2)]
    xx = 24
    for t, c in lg:
        o.append(f'<text x="{xx}" y="{H - 24}" font-family="{F}" font-size="12" fill="{c}">{e(t)}</text>')
        xx += 32 + len(t) * 10
    svg = (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="progress-board-title progress-board-desc" xmlns="http://www.w3.org/2000/svg">\n'
           f'<title id="progress-board-title">1차 프로젝트 진행 체크판</title>\n'
           f'<desc id="progress-board-desc">고정한 기준 일정의 할 일을 계획한 날짜 칸에 두고, 실제로 끝낸 날짜와 비교해 앞당김, 계획대로, 늦음, 남은 일을 표시한다.</desc>\n'
           + "\n".join(o) + "\n</svg>")
    verdict, nums, note = summary(ts, today)
    cards = "".join(f'<div class="n"><b>{e(v)}</b><span>{e(k)}</span></div>' for k, v in nums)
    return f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>1차 프로젝트 진행 체크판</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap">
<style>
:root{{--bg:{BG};--ink:{INK};--ink-2:{INK2};--pink:{PINK}}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:{F};padding:40px 16px}}
main{{max-width:1200px;margin:0 auto}}
.eyebrow{{color:var(--ink-2);font-size:13px;letter-spacing:.04em}}
h1{{font-size:28px;margin:6px 0 4px}}
p.sub{{color:var(--ink-2);margin:0 0 20px;font-size:14px}}
.pace{{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;margin-bottom:20px}}
.verdict{{flex:1.4 1 260px;border:1.5px solid var(--pink);border-radius:8px;padding:14px 16px}}
.verdict b{{display:block;font-size:20px;color:var(--pink)}}
.verdict span{{display:block;margin-top:6px;color:var(--ink-2);font-size:13px}}
.n{{flex:1 1 120px;border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:14px 16px}}
.n b{{display:block;font-size:20px}} .n span{{color:var(--ink-2);font-size:12px}}
.wrap{{overflow-x:auto;border:1px solid rgba(255,255,255,.12);border-radius:8px}}
.wrap svg{{display:block;min-width:1200px}}
</style></head><body><main>
<div class="eyebrow">FROM YOUR GARAGE · AI 네이티브 커리어 캠프 2기 1차 프로젝트</div>
<h1>1차 프로젝트 진행 체크판</h1>
<p class="sub">{today} 기준 · 기준 일정은 고정(`{e(src)}`) · 목표 11/2(월) 제출 완료, 공식 마감 11/3 09:50 · 토요일 작업 없음</p>
<div class="pace"><div class="verdict"><b>{e(verdict)}</b><span>{e(note)}</span></div>{cards}</div>
<div class="wrap">{svg}</div>
</main></body></html>'''


if __name__ == "__main__":
    t = date.today()
    today = sys.argv[1] if len(sys.argv) > 1 else f"{t.month}/{t.day}"
    if today not in WORK: today = next((d for d in WORK if (int(d.split("/")[0]), int(d.split("/")[1])) > (int(today.split("/")[0]), int(today.split("/")[1]))), WORK[-1])  # 토요일 등은 다음 작업일로
    src, ts = load()
    # 자체 점검: 판정 규칙
    T = lambda plan, act: dict(id="X", name="x", plan=plan, people=False, act=act)
    assert status(T("11/1", "완료 10/30"), "10/30")[0] == "ahead"
    assert status(T("10/30", "완료 10/30"), "10/30")[0] == "done"
    assert status(T("10/30", ""), "11/1")[0] == "late"
    assert status(T("11/2", "진행 10/30"), "10/30")[0] == "early"
    assert status(T("10/30", ""), "10/30")[0] == "today"
    assert all(x["plan"] in WORK for x in ts), "계획일은 작업하는 날만"
    assert not any(x["people"] and x["plan"] == "11/1" for x in ts), "👥 일은 주말 금지"
    out = Path("results/progress/진행체크판.html")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(ts, today, src))
    print(out, "|", summary(ts, today)[0])
