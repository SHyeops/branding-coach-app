# 사용자 테스트 집계: 기록표 CSV → 발표용 숫자 + 문서에 남은 빈칸 목록
# 실행: python3 make_user_summary.py [기록표.csv]  → results/user_test/summary.md
import csv, glob, re, sys
from pathlib import Path

SRC = sys.argv[1] if len(sys.argv) > 1 else "results/user_test/기록표.csv"
OUT = Path(SRC).with_name("summary.md")
BLANK = re.compile(r'⬜|class="blank"|미측정')  # 문서 빈칸 표시: md는 ⬜(기획서는 '미측정'), 발표 HTML은 blank 칸


def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None


def avg(rows, col):
    xs = [x for x in (num(r[col]) for r in rows) if x is not None]
    return (round(sum(xs) / len(xs), 1), len(xs)) if xs else (None, 0)


def summarize(rows):
    rows = [r for r in rows if any((r[k] or "").strip() for k in r if k not in ("ID", "분야"))]  # 빈 줄 제외
    pick = [r["고른쪽(앱/v1)"].strip() for r in rows if r["고른쪽(앱/v1)"].strip()]
    errs = [r for r in rows if (r["오류·이상한 화면"] or "").strip() not in ("", "없음", "-")]
    pre, post = avg(rows, "사용 전 점수"), avg(rows, "사용 후 점수")
    return dict(n=len(rows), pick_n=len(pick), app=pick.count("앱"), v1=pick.count("v1"),
                pre=pre[0], post=post[0], time=avg(rows, "작성 시간(분)")[0],
                start=avg(rows, "시작해도 되겠다(1~5)")[0], rec=avg(rows, "추천 의향(1~5)")[0],
                errs=len(errs), rows=rows, edge=avg(rows, "차별점이 실제로 다름(1~5)")[0],
                new=sum((r["새로 알게 된 것(있음/없음)"] or "").strip() == "있음" for r in rows),
                found=sum((r.get("직접 찾은 후보(있음/없음)") or "").strip() == "있음" for r in rows), tried=sum(bool((r.get("직접 찾은 후보(있음/없음)") or "").strip()) for r in rows),
                mine={k: sum((r.get("더 내 것 같은 차별점(앱/직접/비슷)") or "").strip() == k for r in rows) for k in ("앱", "직접", "비슷")})


def blanks():
    files = sorted(set(glob.glob("*발표자료*.html") + glob.glob("*발표자료*.md") + glob.glob("*기획_v*.md") + ["README.md"]))
    latest = {}
    for f in files:  # 같은 이름은 최신 버전만
        key = re.sub(r"^\d+_|_v\d+.*$", "", f) + Path(f).suffix
        v = int(m[1]) if (m := re.search(r"_v(\d+)", f)) else 0
        if key not in latest or v > latest[key][0]: latest[key] = (v, f)
    hits = []
    for _, f in sorted(latest.values(), key=lambda x: x[1]):
        for i, line in enumerate(Path(f).read_text().splitlines(), 1):
            if BLANK.search(line) and not line.startswith(">"):  # '>' 줄은 빈칸 설명(범례)
                hits.append(f"`{f}:{i}`")
    return hits


def fmt(x, unit=""): return "⬜" if x is None else f"{x:g}{unit}"


if __name__ == "__main__":
    with open(SRC, encoding="utf-8-sig") as fh: s = summarize(list(csv.DictReader(fh)))
    up = None if s["pre"] is None or s["post"] is None else round(s["post"] - s["pre"], 1)
    lines = [
        f"# 사용자 테스트 집계 ({s['n']}명)", "",
        "| 지표 | 결과 |", "|---|---:|",
        f"| ⭐ 내 생각에 더 가깝다고 고른 쪽 | 앱 {s['app']} / {s['pick_n']}명 · v1 {s['v1']} / {s['pick_n']}명 |",
        f"| ⭐ 생각 정리 점수 (1~5) | 사용 전 {fmt(s['pre'])} → 사용 후 {fmt(s['post'])} ({'⬜' if up is None else f'{up:+g}'}) |",
        f"| 작성 시간 | 앱 평균 {fmt(s['time'], '분')} (직접 작성 24.5분) |",
        f"| '이제 시작해도 되겠다' (1~5) | {fmt(s['start'])} |",
        f"| 추천 의향 (1~5) | {fmt(s['rec'])} |",
        f"| 새로 알게 된 것이 있었다 | {s['new']} / {s['n']}명 |",
        f"| 차별점이 경쟁자와 실제로 다르다 (1~5) | {fmt(s['edge'])} |",
        f"| '차별점 찾기'에서 새 후보를 찾았다 | {s['found']} / {s['tried']}명 (해 본 사람) |",
        f"| 더 내 것 같은 차별점 | 앱 {s['mine']['앱']} · 직접 {s['mine']['직접']} · 비슷 {s['mine']['비슷']} (명) |",
        f"| 오류 제보 | {s['errs']}건 |", "",
        "## 고른 이유 · 피드백", "",
        *[f"- **{r['ID']}** ({r['분야'] or '-'}) 고른 쪽 {r['고른쪽(앱/v1)'] or '-'}: {r['고른 이유'] or '-'} / 좋았던 점: {r['좋았던 점'] or '-'} / 답답했던 점: {r['답답했던 점'] or '-'} / 오류: {r['오류·이상한 화면'] or '-'} / 안 맞는 결과: {r['안 맞는 결과'] or '-'} / 하나만 바꾼다면: {r['하나만 바꾼다면'] or '-'} / 새로 알게 된 것: {r['새로 알게 된 내용'] or '-'} / 직접 찾은 후보: {r.get('직접 찾은 후보 내용') or '-'} / 더 내 것: {r.get('더 내 것 같은 차별점(앱/직접/비슷)') or '-'} ({r.get('더 내 것 같은 이유') or '-'})" for r in s["rows"]],
        "", "## 문서에 남은 빈칸 (0개가 되면 반영 끝)", "",
        *[f"- {h}" for h in blanks()],
    ]
    OUT.write_text("\n".join(lines) + "\n")
    print(f"{OUT} | {s['n']}명 · 앱 선택 {s['app']}/{s['pick_n']} · 남은 빈칸 {len(blanks())}곳")
