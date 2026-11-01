# 측정 결과 JSON → 건별 카드 PNG (넣은 값 | 나온 값). 실행: python3 make_cards.py results/v3/<측정 폴더>  (Chrome 필요)
import json, subprocess, sys
from html import escape as e
from pathlib import Path
from PIL import Image, ImageChops

DIR = Path(sys.argv[1]); IMG = DIR / "images"; IMG.mkdir(exist_ok=True)
D = json.load(open("web/lib/data.json"))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SHOW = ["one_liner", "edge", "story", "mission", "values", "message", "slogans", "strategy"]
CSS = """body{margin:0;background:#f4f2ee;font-family:Pretendard,'Apple SD Gothic Neo',sans-serif;color:#1d1d1f;font-size:15px;line-height:1.55}
.w{width:1280px;padding:28px;box-sizing:border-box}h1{margin:0 0 6px;font-size:26px}.b{display:inline-block;margin:4px 6px 0 0;padding:3px 10px;border-radius:99px;background:#1f2a44;color:#fff;font-size:13px}
.b.bad{background:#c0392b}.g{display:grid;grid-template-columns:1fr 1.25fr;gap:18px;margin-top:16px}.c{background:#fff;border-radius:12px;padding:18px}
h2{margin:0 0 10px;font-size:17px;color:#1f2a44;border-bottom:2px solid #1f2a44;padding-bottom:4px}.k{font-weight:700;color:#555;font-size:13px;margin-top:10px}
ul{margin:2px 0;padding-left:18px}.sw{display:inline-block;width:26px;height:26px;border-radius:6px;margin-right:4px;vertical-align:middle;border:1px solid #0002}"""


def items(v): return v if isinstance(v, list) else [v] if v else []


def card(d):
    m, s = d["metrics"], d["state"]
    if "error" in m: return None
    flag = sum("아직 흔한 편" in str(x) for x in items((s["sheet"].get("edge") or {}).get("value")))
    ex_bad = len(m["exSheet"]) + len(m["exTpl"])
    badges = [f"{m['type']}형", f"인용 {m['matched']}/{m['quotes']} 일치", f"과장 입력 {len(m['exIn'])}개 → 결과 {ex_bad}개",
              f"컬러 {m['palettes']}안", f"AI {m['totalSec']}초", f"템플릿: {m['channel']}", f"흔한 차별점 표시 {flag}개" + (" · 이해한 내용도" if "아직 뚜렷하지 않아요" in (s.get("reflect") or "") else "")]
    bad = lambda b: "bad" if ("일치" in b and m["matched"] < m["quotes"]) or ("과장" in b and ex_bad) or (b.startswith("컬러 0")) else ""
    left = [f"<div class=k>설명</div>{e(s['desc'])}", f"<div class=k>구상 메모</div>{e(s['memo'] or '(없음)')}"]
    for i, sc in enumerate(D["SCENES"][s["kind"]]):
        picks, note = ", ".join(s["picks"][i]), s["notes"][i]
        left.append(f"<div class=k>[{e(sc['group'])}] {e(sc['ask'])}</div>{e(picks)}{('<br>' if picks else '') + '✍ ' + e(note) if note else ''}{'' if picks or note else '(빈칸)'}")
    left.append(f"<div class=k>성향 · 말투</div>{e(', '.join(s['traits']))} / “{e(s['tone'])}”")
    right = []
    for k in SHOW:
        it = s["sheet"].get(k) or {}
        vals = items(it.get("value")) + items(it.get("options")) + items(it.get("points"))
        right.append(f"<div class=k>{e(D['SHEET_LABELS'][k])}</div>" + (e(vals[0]) if len(vals) == 1 else "<ul>" + "".join(f"<li{' style="background:#fff3c4"' if "아직 흔한 편" in str(x) else ''}>{e(str(x))}</li>" for x in vals) + "</ul>"))
    right.append("<div class=k>컬러</div>" + " ".join("<span>" + "".join(f"<span class=sw style='background:{c['hex']}'></span>" for c in p["colors"]) + f" {e(p['name'])}</span><br>" for p in s["palettes"]))
    return f"""<!doctype html><meta charset=utf-8><style>{CSS}</style><div class=w><h1>{m['id']} · {e(s['name'])} <span style='font-size:15px;color:#777'>({s['kind']})</span></h1>
{''.join(f"<span class='b {bad(b)}'>{e(b)}</span>" for b in badges)}
<div class=g><div class=c><h2>넣은 값 (가상 사용자 답)</h2>{''.join(left)}</div><div class=c><h2>나온 값 (실제 AI 결과 · 일부 항목)</h2>{''.join(right)}</div></div></div>"""


for f in sorted(DIR.glob("P*.json")):
    html = card(json.load(open(f)))
    if not html: print(f.stem, "오류 — 카드 없음"); continue
    h, png = DIR / "images" / f"{f.stem}.html", IMG / f"{f.stem}.png"
    h.write_text(html)
    subprocess.run([CHROME, "--headless=new", "--hide-scrollbars", f"--screenshot={png}", "--window-size=1280,4000", f"file://{h.resolve()}"], capture_output=True)
    im = Image.open(png).convert("RGB")
    box = ImageChops.difference(im, Image.new("RGB", im.size, im.getpixel((0, im.height - 1)))).getbbox()  # 아래 빈 배경 잘라내기
    im.crop((0, 0, im.width, min(im.height, box[3] + 28))).save(png); h.unlink()
    print(png)
