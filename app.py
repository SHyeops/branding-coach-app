"""From Your Garage — 질문으로 찾는 내 브랜드. 메뉴: 활용 템플릿 / 1:1 멘토링 / 브랜드 코칭(단계: 0 홈 → 1 기본 정보 → 2 생각 정리(1인칭 장면 6개) → 3 간판 성향 → 4 되비추기 → 5 리포트) / 브랜드 스토리"""
import base64
import html
import json
import os
import re
from pathlib import Path
from urllib.parse import quote

import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

from brands import BRANDS, MARQUEE
from mentors import MENTORS
from scenes import ASK_DETAIL, SCENES, TYPES, brand_type, flat_options

APP_NAME = "From Your Garage"
N = 6  # 장면 수 (scenes.py) = 3묶음(왜 / 누구에게 / 무엇이 다른가) × 2

# 성향 찾기 1단계: 둘 중 고르기 (선택지는 고정 목록 → 사람마다 비교 가능, 고른 것 = 근거)
TRAITS = [
    (("따뜻한", "오늘도 정성껏 담았어요"), ("세련된", "필요한 것만, 정확하게")),
    (("친근한", "편하게 물어보세요, 언제든 반가워요"), ("전문적인", "기준과 과정을 분명하게 알려드려요")),
    (("전통·정겨운", "예전 그 맛, 그대로 지켜요"), ("새롭고 감각적인", "익숙한 것을 새롭게 바꿔봤어요")),
    (("차분한", "천천히, 오래 곁에 두고 싶은"), ("활기찬", "오늘 바로 기분 좋아지는!")),
]
# 2단계: 1단계 앞 두 쌍(따뜻/세련 × 친근/전문) 조합별 말투 예시 3개 (말투만 보여주는 예시, 내용은 사실 아님)
TONES = {
    ("따뜻한", "친근한"): ["오늘도 정성껏 준비했어요. 맛있게 즐겨 주세요!", "이웃처럼 편하게 들러 주세요.", "작은 것 하나에도 마음을 담았어요."],
    ("따뜻한", "전문적인"): ["꼼꼼히 고르고 정성껏 만들었습니다.", "믿고 맡기실 수 있게 과정을 보여드릴게요.", "기본을 지키는 것부터 시작합니다."],
    ("세련된", "친근한"): ["필요한 것만 담았어요. 가볍게 시작해 보세요.", "복잡한 건 빼고, 좋은 것만.", "오늘의 나에게 딱 맞는 선택."],
    ("세련된", "전문적인"): ["기준은 분명하게, 설명은 정확하게.", "필요한 것만, 정확하게 제공합니다.", "과정을 설계하고 그대로 지킵니다."],
}
# 형태별 입력 예시 (테스트 데이터 P02·P08에서 가져옴)
EXAMPLES = {
    "상품": {"name": "예: 못난이 사과", "desc": "예: 모양이 고르지 않은 사과 5kg 박스",
            "memo": "예: 맛은 똑같은데 버려지는 사과가 아까웠어요. 가족 단위 손님을 생각하고 있어요."},
    "서비스": {"name": "예: 출근 전 30분 PT", "desc": "예: 동네 1인 PT 스튜디오의 아침 1:1 운동 프로그램",
             "memo": "예: 직장인 시절 운동할 시간이 없었던 경험에서 시작했어요."},
}
MIN_LEN = 10  # shortcut: 글자 수로만 '짧은 답' 판단, 이후 AI 판단으로 교체

load_dotenv()

# v2 프롬프트 (v1과 같은 모델·기본 설정, 시스템 메시지 없음 → 규칙은 요청문 안에 넣음)
RULES = """규칙: 아래 [사용자 정보]에 있는 내용만 사용한다. 정보에 없는 사실(브랜드명, 판매처, 재료, 수치, 인증, 경력 등)은 절대 추가하지 않는다.
모르는 부분은 지어내지 말고 "아직 정해지지 않았어요"라고 쓴다. 효능·성과를 단정하거나 과장하지 않는다. 쉬운 한국어로 쓴다."""
REFLECT = """사용자가 답한 내용을 묶음별(왜 / 누구에게 / 무엇이 다른가) 항목과 "고른 성향·말투" 항목으로 쉽게 정리해줘.
전체 제목(예: "말씀하신 건 이런 뜻이에요")은 쓰지 말고 "### 왜"처럼 묶음 제목부터 시작한다. 같은 맺음 표현("~이런 뜻이에요")을 반복하지 않는다.
{rules}

{info}"""
# 시작 채널은 이 목록 안에서만 (기획서 3-1) → AI가 플랫폼을 지어내지 않게
PLATFORMS = """농작물·식품: 네이버 스마트스토어, 쿠팡, 카카오톡 선물하기 / 인스타그램, 카카오톡 채널, 네이버 블로그
수공예·일반 상품: 아이디어스, 네이버 스마트스토어 / 인스타그램, 플리마켓·팝업
새 상품 첫 출시: 와디즈(펀딩) / 인스타그램
동네 기반 서비스: 네이버 플레이스(예약), 당근 / 당근, 인스타그램
레슨·코칭·전문 서비스: 숨고, 크몽 / 네이버 블로그, 유튜브, 인스타그램
클래스·취미: 클래스 플랫폼(프립·탈잉·클래스101) / 인스타그램"""
# 리포트 = 브랜드 아이덴티티 시트: 고른 보기를 옮겨 적지 않고 엮어서 '최종 값' + 항목마다 자세한 이유(why)·근거(quotes)
SHEET = """아래 [사용자 정보]로 '브랜드 아이덴티티 시트'를 만들어줘.
고른 보기를 그대로 옮겨 적지 말고, 여러 선택과 사용자가 쓴 말을 엮어 하나의 결론(최종 값)으로 정리한다.
반드시 JSON만 출력한다. 키: one_liner, customer, pain, mission, values, personality, message, slogans, strategy, mood, todo, advice
각 키의 값 = {{"value": 값, "why": "왜 이렇게 나왔는지", "quotes": ["근거 문장", ...]}}
- one_liner: 이 브랜드를 한 문장으로 정의 / customer: 주요 고객층을 한 사람처럼 그린 1문장 / pain: 그 고객의 고민 1문장
- mission, message: value 대신 "options": [서로 다른 방향 2개] / slogans: "options": [3개]
- values: value는 핵심 가치 3개 목록 / todo: value는 이번 주 바로 할 수 있는 작은 일 3개 목록
- advice: value는 아직 비어 있거나 더 구체적이면 좋을 부분을 가볍게 짚는 조언 2~3개 목록 ("~을 정해 두면 ~가 쉬워져요"처럼 응원하는 말투, 꾸짖지 않기)
- mood: value는 사진·디자인에 쓸 색·소재·장면 낱말 5개 목록 (고른 성향 낱말을 되풀이하지 않는다)
- personality: value는 성격·말투 1문장, "example"에 이 말투로 쓴 손님 안내 문장 1개
- strategy: value는 판매 전략 한 줄, "points"에 3개 [시작 채널(아래 목록 안에서만 1~2곳)과 이 브랜드에 맞는 이유 / 가격·차별점을 어떻게 보여 줄지 / 첫 손님을 어떻게 만날지]. 각 point는 짧은 1~2문장. 수수료·조건·숫자는 말하지 않는다.
- why: 5~7문장으로 자세히 풀어 쓴다. 순서: ① 근거가 된 선택·말 ② 그것이 어떤 뜻으로 읽혔는지 ③ 다른 선택과 어떻게 이어졌는지 ④ 그래서 이 결론이 된 이유 ⑤ "만약 ~라고 생각한다면 ~쪽으로 바뀔 수 있어요"처럼 사용자가 스스로 판단할 여지 1문장. 단정하지 말고 "~로 읽혀요", "~에 가까워요"처럼 쓴다. "목록", "사용자 정보" 같은 내부 표현은 쓰지 않는다.
- quotes: 근거가 된 사용자 정보 문장을 한 글자도 바꾸지 말고 1~3개 옮긴다. 앞에 붙은 "고른 것:", "내가 쓴 말:" 같은 꼬리표는 빼고 내용만 옮긴다.
- 정보가 없어 채울 수 없으면 value(또는 options)에 "아직 정해지지 않았어요"라고 쓰고, why에 채우려면 생각해 볼 질문 1개를 쓴다.
- 사용자 정보의 "앱이 계산한 브랜드 유형"은 방향 참고용이다. 유형 이름을 근거로 새 사실을 만들지 않는다.
{rules}

[시작 채널 목록] (판매 / 홍보)
{platforms}

{info}"""
SHEET_LABELS = {"one_liner": "한 줄 정의", "customer": "주요 고객층", "pain": "고객의 고민", "mission": "미션", "values": "핵심 가치",
                "personality": "성격·말투", "message": "핵심 메시지", "slogans": "슬로건", "strategy": "판매 전략", "mood": "무드 키워드",
                "todo": "이번 주 할 일", "advice": "더 생각해 볼 것"}
# 컬러는 사실이 아니라 제안 → 3안을 한 번에 받아 "다른 안 보기"로 넘김
COLORS = """아래 사용자 정보(특히 고른 성향)에 어울리는 브랜드 컬러 조합 3안을 추천해줘. 안마다 색 3개(메인/보조/강조)를 고른다.
반드시 JSON만 출력한다: {{"palettes": [{{"name": "조합 이름", "colors": [{{"hex": "#RRGGBB", "role": "메인"}}, ...], "why": "이 조합을 고른 이유 1~2문장", "quote": "근거가 된 사용자 정보 문장 1개를 한 글자도 바꾸지 않고 그대로 (앞의 '고른 것:' 같은 꼬리표는 빼고)"}}]}}
{rules}

{info}"""
# 활용 템플릿: 리포트를 채널별로 바로 붙여 쓸 문구로 (채널은 기획서 3-1 시작 플랫폼 목록 안에서)
TEMPLATE = """아래 [사용자 정보]와 [브랜드 리포트]를 바탕으로 {channel}에 바로 붙여 쓸 문구를 만들어줘.
만들 것: {items}
각 항목은 "### 항목 이름" 한 줄로 시작하고, 그 아래에는 붙여 쓸 문구만 쓴다 (설명·따옴표 없이).
리포트의 성격·말투와 핵심 메시지를 따른다. 리포트에서 "아직 정해지지 않았어요"인 내용은 지어내지 않고 빼고 쓴다.
{rules}

[브랜드 리포트]
{brief}

{info}"""
CHANNELS = {
    "인스타그램": "프로필 소개 (150자 이내, 줄바꿈 2~3줄) / 첫 게시물 캡션 (브랜드 소개, 해시태그 5개 포함)",
    "스레드": "첫 글 (이 브랜드를 시작한 이야기, 말하듯 편하게, 500자 이내)",
    "스마트스토어": "상품명 (검색할 만한 낱말을 앞쪽에, 짧게) / 상세페이지 첫 문단 (3~4문장)",
    "네이버 블로그": "첫 글 제목 3안 / 첫 글 도입 문단 (4~5문장)",
    "당근 비즈프로필": "가게 소개 (동네 이웃에게 말하듯, 3~4문장) / 첫 소식 글 (인사 + 소개)",
}
FOLLOWUP = """사용자가 아래 질문에 너무 짧게 답했다. 답을 더 구체적으로 이끌어낼 추가 질문 1개를 쉬운 말로 만들어줘.
질문에는 사용자가 말하지 않은 사실을 넣지 말고, 떠올리기 쉽도록 "예를 들면 …" 식의 열린 예시 2개를 덧붙인다. 질문만 출력한다.
질문: {question}
사용자의 짧은 답: {answer}
상품·서비스 이름: {name}"""

def info_text():
    qa = "\n".join(f"- [{sc['group']}] {sc['ask']}: {a}" for sc, a in zip(SCENES[s.kind], s.answers))
    memo = s.memo.strip() or "(없음)"
    fix = s.get("fix", "").strip()
    out = f"[사용자 정보]\n형태: {s.kind}\n이름: {s.name}\n설명: {s.desc}\n구상 메모(참고용): {memo}\n질문과 답변:\n{qa}"
    if s.get("traits"):
        out += f"\n사용자가 고른 성향: {', '.join(s.traits)}\n사용자가 고른 말투 예시: {s.get('tone', '(없음)')}"
    if s.step >= 4:
        bt, _ = brand_type(s.kind, s.picks)
        out += f"\n앱이 계산한 브랜드 유형(고른 보기로 계산, 방향 참고용): {bt}형 — {TYPES[bt]['desc']}"
    return out + (f"\n사용자 수정 요청: {fix}" if fix else "")


def fake_ai(template):
    """테스트 모드(.env에 FAKE_AI="1"): API를 부르지 않고 예시 답을 돌려줌 → 화면 흐름 확인에 돈이 안 듦"""
    a = s.answers[0] or s.name
    if template is COLORS:
        return json.dumps({"palettes": [
            {"name": "테스트 1안", "colors": [{"hex": "#A94F3F", "role": "메인"}, {"hex": "#F3E6CF", "role": "보조"}, {"hex": "#687A4D", "role": "강조"}],
             "why": "(테스트 모드 예시) 고른 성향에 맞춘 조합이에요.", "quote": a},
            {"name": "테스트 2안", "colors": [{"hex": "#6B4937", "role": "메인"}, {"hex": "#F6F0E4", "role": "보조"}, {"hex": "#D9A441", "role": "강조"}],
             "why": "(테스트 모드 예시) 두 번째 조합이에요.", "quote": a}]}, ensure_ascii=False)
    if template is SHEET:
        item = lambda v: {"value": v, "why": "(테스트 모드 예시) 이 선택이 이렇게 읽혀서 이런 결과가 나왔어요.", "quotes": [a]}
        d = {k: item(f"(예시) {label}") for k, label in SHEET_LABELS.items()}
        for k, n in [("mission", 2), ("message", 2), ("slogans", 3)]:
            d[k] = {"options": [f"(예시) {SHEET_LABELS[k]} {j + 1}안" for j in range(n)], "why": "(테스트 모드 예시) 두 방향이에요.", "quotes": [a]}
        for k in ("values", "mood", "todo", "advice"):
            d[k]["value"] = [f"예시 {j + 1}" for j in range(3)]
        d["personality"]["example"] = "오늘도 정성껏 준비했어요."
        d["strategy"]["points"] = ["채널: 인스타그램", "가격: 예시", "첫 손님: 예시"]
        return json.dumps(d, ensure_ascii=False)
    if template is TEMPLATE:
        return f"### 예시 항목 1\n(테스트 모드 예시) {s.name} 문구예요.\n두 번째 줄이에요.\n\n### 예시 항목 2\n(테스트 모드 예시) {a}"
    if template is REFLECT:
        return f"(테스트 모드 예시) 말씀하신 건 이런 뜻이에요.\n- **왜:** {a}\n- **고른 성향:** {', '.join(s.get('traits', []))}"
    return "(테스트 모드 예시) 조금 더 들려주세요. 예를 들면 그때 어떤 상황이었는지, 누가 떠올랐는지요."


def ask_ai(template, **extra):
    """실패해도 앱이 멈추지 않게 (결과, 오류문구)를 돌려준다."""
    if os.environ.get("FAKE_AI") == "1":
        return fake_ai(template), None
    model = os.environ.get("OPENAI_MODEL")
    if not model:
        return None, "모델 설정(OPENAI_MODEL)이 없어요. .env 또는 Secrets를 확인해 주세요."
    prompt = template.format(rules=RULES, info=info_text(), platforms=PLATFORMS, **extra)  # 형식 오류는 숨기지 않고 바로 드러냄
    try:
        res = OpenAI().chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}])
        return res.choices[0].message.content, None
    except Exception:
        return None, "AI 연결에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요."


def unmatched(quotes):
    """AI가 '내 답'이라며 인용한 문장 중 실제 입력에 없는 것 (띄어쓰기 차이는 무시)"""
    src = "".join(info_text().split())
    return [q for q in quotes if "".join(q.split()) not in src]


def parse_palettes(text):
    """AI가 준 JSON에서 형식이 맞는 안만 남김 (색 값은 HTML에 들어가므로 #RRGGBB만 허용)"""
    try:
        data = json.loads(re.sub(r"^```(json)?|```$", "", text.strip()).strip())
        return [p for p in data["palettes"]
                if p.get("colors") and all(re.fullmatch(r"#[0-9a-fA-F]{6}", c.get("hex", "")) for c in p["colors"])]
    except (ValueError, KeyError, TypeError, AttributeError):
        return []


def show_palette(p):
    chips = "".join(f'<div class="chip"><div style="background:{c["hex"]}"></div><b>{html.escape(str(c.get("role", "")))}</b>'
                    f'<span>{c["hex"].upper()}</span></div>' for c in p["colors"])
    st.markdown(f'<p class="pal-name">{html.escape(str(p.get("name", "")))}</p><div class="palette">{chips}</div>',
                unsafe_allow_html=True)
    st.markdown(f'**이유:** {p.get("why", "")}')
    if p.get("quote"):
        st.markdown(f'**근거가 된 내 답:** 「{p["quote"]}」' + (" ⚠️ 내 답과 일치하지 않아요" if unmatched([p["quote"]]) else ""))


st.set_page_config(page_title=f"{APP_NAME} — 질문으로 찾는 내 브랜드")
st.markdown(f"<style>{(Path(__file__).parent / 'style.css').read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)
if os.environ.get("FAKE_AI") == "1":
    st.warning("테스트 모드: AI를 부르지 않고 예시 답을 보여줘요 (비용 0원). 끄려면 .env에서 FAKE_AI를 지우세요.")
s = st.session_state
s.setdefault("step", 0)
s.setdefault("q", 0)          # 현재 질문 번호 (0~N-1)
s.setdefault("answers", [""] * N)  # AI에 넘기는 장면별 답 = "고른 것: … / 내가 쓴 말: …"
s.setdefault("picks", [[] for _ in range(N)])  # 장면별 고른 보기
s.setdefault("notes", [""] * N)               # 장면별 직접 쓴 한 줄
# 예시 링크: ?demo=scenes(답이 다 채워진 첫 장면부터) / ?demo=report(결과 바로). 저장해 둔 실제 AI 결과를 써서 AI를 다시 부르지 않음
DEMO = Path(__file__).parent / "results" / "v3" / "demo_P02.json"
demo = st.query_params.get("demo")
if demo in ("scenes", "report") and s.get("demo_loaded") != demo and DEMO.exists():
    s.update(json.loads(DEMO.read_text(encoding="utf-8")))
    s.update(step=5 if demo == "report" else 2, q=0, intro_seen=True, demo_loaded=demo)
s.setdefault("asked_more", [False] * N)
s.setdefault("more", [""] * N)


def bulbs(lit):
    total = N + 1  # 장면 6 + 간판 성향
    dots = "".join(f'<i class="bulb{" on" if k < lit else ""}"></i>' for k in range(total))
    return f'<div class="bulbs" aria-label="아이디어 {lit}/{total} 켜짐">{dots}<span>아이디어 {lit}/{total}</span></div>'


POSTIT_COLORS = ["#fffdf7", "#ffd9e3", "#d4f1e4", "#d6e7ff", "#e7dcff", "#fff1c2"]  # 흰색 + 파스텔


def wall(items, new=()):
    """차고 벽(흰 페인트 벽돌): 브랜드 이름 + 지금까지 고른 생각을 포스트잇으로 (방금 고른 건 new)"""
    notes = [(s.name, "name")] + [(x, "") for x in items] + [(x, "new") for x in new]
    return ('<div class="wall"><span class="wall-label">GARAGE WALL</span>'
            + "".join(f'<span class="postit {c}" style="--r:{(j * 37) % 7 - 3}deg;--c:{POSTIT_COLORS[j % len(POSTIT_COLORS)]}">{html.escape(x)}</span>'
                      for j, (x, c) in enumerate(notes))
            + "</div>")


def wall_items(upto):
    return [x for k in range(upto) for x in s.picks[k] + ([s.notes[k]] if s.notes[k].strip() else [])]


def answer_text(chosen, note):
    return " / ".join(p for p in [f"고른 것: {', '.join(chosen)}" if chosen else "", f"내가 쓴 말: {note.strip()}" if note.strip() else ""] if p)


def parse_sheet(text):
    """AI 시트 JSON → dict. 키가 빠졌거나 형식이 틀리면 None (→ 다시 시도)"""
    try:
        d = json.loads(text[text.index("{"):text.rindex("}") + 1])
        return d if all(isinstance(d.get(k), dict) for k in SHEET_LABELS) else None
    except (ValueError, TypeError, AttributeError):
        return None


def as_list(x):
    return x if isinstance(x, list) else [x]


def chosen(k):
    """2안·3안 항목에서 사용자가 고른 안 (안 골랐으면 1안)"""
    opts = as_list(s.sheet[k].get("options") or s.sheet[k].get("value", ""))
    return s.get(f"pick_{k}") if s.get(f"pick_{k}") in opts else opts[0]


def sheet_text(sh):
    """시트를 글로 (활용 템플릿 요청에 넣음). 고른 안 기준"""
    val = lambda k: chosen(k) if "options" in sh[k] else ", ".join(map(str, as_list(sh[k].get("value", ""))))
    return "\n".join(f"{label}: {val(k)}" for k, label in SHEET_LABELS.items())


def sheet_quotes():
    qs = [q for it in s.sheet.values() if isinstance(it, dict) for q in as_list(it.get("quotes", [])) if isinstance(q, str)]
    return list(dict.fromkeys(qs + [p["quote"] for p in s.get("palettes", []) if p.get("quote")]))  # 같은 인용은 한 번만 셈


def go(step):
    s.step = step
    st.rerun()


def svg_b64(name):
    return base64.b64encode((Path(__file__).parent / "assets" / f"{name}.svg").read_bytes()).decode()


def logo(name, alt):
    """assets/의 로고 SVG(위키미디어 공용·simple-icons)를 글 안에 이미지로 넣음"""
    return f'<img class="logo logo-{Path(name).name}" alt="{alt}" src="data:image/svg+xml;base64,{svg_b64(name)}">'


@st.dialog("브랜드 브리프", width="large")
def brand_modal(b, similar=None):
    st.markdown(f'<div class="bm-head"><span class="bm-logo">{logo("brands/" + b["logo"], b["en"])}</span><div><div class="bm-name">{b["name"]} <small>{b["en"]}</small></div>'
                f'<div class="bm-meta">{b["since"]} · {b["founder"]}</div></div></div>'
                f'<div class="bm-msg">“{b["message"]}”<small>{"대표 문구" if b["official"] else "핵심 생각 (공식 문구 아님, 요약)"}</small></div>'
                f'<div class="bm-tags">{"".join(f"<span>#{k}</span>" for k in b["keywords"])}</div>', unsafe_allow_html=True)
    if similar:  # 결과 시트 '닮은 브랜드'에서 열었을 때
        st.markdown(f'<div class="bm-similar"><b>내 브랜드와 닮은 점</b>{similar}</div>', unsafe_allow_html=True)
    sentences = re.split(r"(?<=[.!?])\s+", b["story"])  # 큰 화면에서 한두 줄로 뭉쳐 보이지 않게 문장마다 줄바꿈
    st.markdown("**시작 이야기**  \n" + "  \n".join(sentences))
    st.info(f'**작은 브랜드가 배울 점** {b["lesson"]}')
    if b["photos"]:
        for col, (file, cap, lic) in zip(st.columns(len(b["photos"])), b["photos"]):
            col.image(f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(file)}?width=900", caption=f"{cap} · 위키미디어 공용({lic})", width="stretch")
    st.markdown(f'[위키백과에서 더 보기]({b["wiki"]})')


def show_stories():
    # 카드 버튼마다 로고를 배경으로 넣음 (Streamlit 버튼엔 이미지를 직접 못 넣음)
    css = "".join(f'.st-key-brand_{b["logo"]} button::before {{ background-image: url(data:image/svg+xml;base64,{svg_b64("brands/" + b["logo"])}); }}'
                  for b in BRANDS)
    st.markdown(f'<style>{css}</style><div class="hero story-hero"><span class="eyebrow">BRAND STORIES</span><div class="page-title">작은 곳에서 시작한 브랜드들</div>'
                '<p class="hero-sub">로고를 누르면 브랜드 브리프와 시작 이야기를 볼 수 있어요.</p></div>', unsafe_allow_html=True)
    for i in range(0, len(BRANDS), 5):
        for col, b in zip(st.columns(5), BRANDS[i:i + 5]):
            if col.button(f'{b["name"]}  \n{b["en"]}', key=f'brand_{b["logo"]}', use_container_width=True):
                brand_modal(b)


def show_templates():
    st.markdown('<div class="hero story-hero"><span class="eyebrow">TEMPLATES</span><div class="page-title">리포트를 바로 쓰는 문구로</div>'
                '<p class="hero-sub">채널을 고르면 내 브랜드 리포트를 그 채널에 맞는 문구로 바꿔 드려요. 복사 버튼으로 바로 붙여 넣으세요.</p></div>',
                unsafe_allow_html=True)
    if not s.get("sheet"):
        st.info("브랜드 코칭을 마치고 리포트를 받으면, 여기서 채널별 문구를 바로 만들 수 있어요.")
        st.markdown("".join(f'<div class="ch-row"><b>{ch}</b><span>{items}</span></div>' for ch, items in CHANNELS.items()), unsafe_allow_html=True)
        st.button("브랜드 코칭 시작하기", type="primary", on_click=lambda: s.update(page="브랜드 코칭"))
        return
    ch = st.pills("채널", list(CHANNELS), default="인스타그램", key="channel")
    if not ch:
        return
    tpl = s.setdefault("tpl", {})  # 채널별로 한 번 만든 결과는 저장 (다시 누르면 새로 만듦)
    if st.button("이 채널 문구 만들기" if ch not in tpl else "다시 만들기", type="primary"):
        with st.spinner(f"{ch}에 맞게 쓰고 있어요…"):
            text, err = ask_ai(TEMPLATE, channel=ch, items=CHANNELS[ch], brief=sheet_text(s.sheet))
        if err:
            st.error(err)
        else:
            tpl[ch] = text
    if ch in tpl:
        for block in re.split(r"^###\s*", tpl[ch], flags=re.M):
            title, _, body = block.strip().partition("\n")
            if body.strip():
                st.markdown(f"**{title.strip()}**")
                st.code(body.strip(), language=None, wrap_lines=True)
        st.caption("AI가 리포트를 바탕으로 쓴 초안이에요. 사실과 다르거나 과장된 표현이 없는지 확인한 뒤 써 주세요.")


def mentor_head(m):
    badge = f'<span class="mt-badge">{m["badge"]}</span>' if m.get("badge") else ""
    return (f'<div class="mt-head"><img class="mt-ava" alt="" src="data:image/svg+xml;base64,{svg_b64("mentors/" + m["avatar"])}">'
            f'<div><div class="mt-name">{m["name"]}{badge}</div><div class="mt-role">{m["role"]} · {m["years"]}년차</div></div></div>'
            f'<div class="bm-tags">{"".join(f"<span>#{k}</span>" for k in m["tags"])}</div>')


@st.dialog("멘토 프로필", width="large")
def mentor_modal(m):
    st.markdown(mentor_head(m), unsafe_allow_html=True)
    st.caption("멘토가 직접 작성한 소개예요")
    st.markdown(m["intro"])
    st.markdown("**제가 함께할 수 있는 것**  \n" + "  \n".join(f"· {c}" for c in m["can"]))
    st.markdown("**걸어온 길**  \n" + "  \n".join(f"· {c}" for c in m["career"]))
    st.markdown(f'**이런 분을 만나고 싶어요**  \n{m["for"]}')
    if st.button("첫 1회 무료로 신청하기", type="primary", key="apply"):
        st.success(f'{m["name"]} 멘토에게 신청했어요. (테스트 화면이라 실제로 전송되지는 않아요)')


def show_mentors():
    st.markdown('<div class="hero story-hero"><span class="eyebrow">1:1 MENTORING</span><div class="page-title">내 브랜드, 전문가와 한 번 더</div>'
                '<p class="hero-sub">리포트를 들고 분야별 멘토와 60분 동안 이야기해요. 마음에 드는 멘토를 눌러 프로필을 보세요.</p></div>'
                '<div class="free-banner"><b>첫 1:1 멘토링 1회 무료</b><span>모든 멘토 공통 · 60분</span></div>',
                unsafe_allow_html=True)
    for i in range(0, len(MENTORS), 3):
        for col, m in zip(st.columns(3), MENTORS[i:i + 3]):
            with col.container(border=True):
                st.markdown(mentor_head(m) + f'<p class="mt-intro">{m["intro"]}</p>', unsafe_allow_html=True)
                if st.button("프로필 보기", key=f'mentor_{m["avatar"]}', use_container_width=True):
                    mentor_modal(m)
    st.caption("※ 소개된 멘토는 서비스 예시를 위한 가상 인물이에요.")


# 단계 아이콘 (선 아이콘, 색은 CSS에서)
_svg = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{}</svg>'
ICONS = {
    "진단": _svg.format('<path d="M4 4h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>'
                        '<path d="M18 8h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-4-3h-3a2 2 0 0 1-2-2v-1"/>'
                        '<path d="M7.6 7.2a1.5 1.5 0 1 1 2.1 1.4c-.5.2-.7.6-.7 1.1M9 11.3v.1"/>'),
    "성향": _svg.format('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
    "확인": _svg.format('<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16 9.5"/>'),
    "리포트": _svg.format('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
}
HOME_STEPS = [("진단", "차고에서 나에게 묻기"), ("성향", "간판 느낌 고르기"), ("확인", "내용 확인"), ("리포트", "리포트 받기")]

def contrast(a, b):
    """두 색의 명도 대비 (WCAG 식)"""
    def lum(h):
        f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
        r, g, b_ = (f(int(h[i:i + 2], 16) / 255) for i in (1, 3, 5))
        return .2126 * r + .7152 * g + .0722 * b_
    hi, lo = sorted([lum(a), lum(b)], reverse=True)
    return (hi + .05) / (lo + .05)


def namecard(bt):
    """추천 컬러·슬로건·무드로 만든 명함 미리보기 ('내 브랜드가 있으면 이렇게 보이겠구나')"""
    if not s.get("palettes"):
        return ""
    cols = [c["hex"] for c in s.palettes[s.get("pal", 0)]["colors"]]
    bg = cols[0]
    fg = max(cols[1:] + ["#ffffff", "#1f1f1f"], key=lambda c: contrast(bg, c))  # 배경 위에서 가장 잘 읽히는 색
    mood = " · ".join(map(str, as_list(s.sheet["mood"].get("value", []))[:3]))
    return (f'<div class="namecard" style="--bg:{bg};--fg:{fg};--ac:{cols[-1]}"><span class="nc-type">{bt}형</span>'
            f'<div class="nc-name">{html.escape(s.name)}</div><div class="nc-slogan">{html.escape(chosen("slogans"))}</div>'
            f'<div class="nc-foot">{html.escape(mood)}</div></div><p class="hx-cap">추천 컬러·슬로건으로 만든 명함 미리보기</p>')


def soft_breaks(text):
    """긴 문장은 쉼표·마침표 뒤에서 줄을 바꿔 읽기 쉽게"""
    t_ = html.escape(str(text))
    return re.sub(r"([,.])\s+", r"\1<br>", t_) if len(t_) > 28 else t_


def postits(items):
    return "".join(f'<span class="postit">{html.escape(str(x))}</span>' for x in items)


def sheet_value(k):
    """시트 한 줄의 '최종 값' 화면 (고른 보기 목록이 아니라 AI·앱이 엮은 결론)"""
    if k == "type":
        bt, _ = brand_type(s.kind, s.picks)
        return f'<div class="sv-main">{bt}형</div><div class="sv-sub">{TYPES[bt]["desc"]}</div>'
    if k == "like":
        by_logo = {b["logo"]: b for b in BRANDS}
        bt, _ = brand_type(s.kind, s.picks)
        return '<div class="sv-likes">' + "".join(
            f'<span>{logo("brands/" + key, by_logo[key]["en"])}{by_logo[key]["name"]}</span>' for key, _ in TYPES[bt]["like"]) + "</div>"
    if k == "color":
        if not s.get("palettes"):
            return '<div class="sv-sub">컬러를 만들지 못했어요. 상세에서 다시 시도할 수 있어요.</div>'
        p = s.palettes[s.get("pal", 0)]
        sw = "".join(f'<i style="background:{c["hex"]}" title="{c["hex"]}"></i>' for c in p["colors"])
        return f'<div class="sv-swatch">{sw}</div><div class="sv-sub">{html.escape(str(p.get("name", "")))} · ' + " / ".join(f'{c.get("role", "")} {c["hex"].upper()}' for c in p["colors"]) + "</div>"
    it = s.sheet[k]
    if "options" in it:
        n = len(as_list(it["options"]))
        return f'<div class="sv-main">{soft_breaks(chosen(k))}</div>' + (f'<div class="sv-sub">다른 안 {n - 1}개 · 상세에서 바꿀 수 있어요</div>' if n > 1 else "")
    v = it.get("value", "")
    if k in ("values", "mood"):
        return '<div class="sv-chips">' + "".join(f"<span>{html.escape(str(x))}</span>" for x in as_list(v)) + "</div>"
    if k == "advice":
        return "<ul class=sv-list>" + "".join(f"<li>{html.escape(str(x))}</li>" for x in as_list(v)) + "</ul>"
    if k == "todo":
        return "<ol class=sv-list>" + "".join(f"<li>{html.escape(str(x))}</li>" for x in as_list(v)) + "</ol>"
    out = f'<div class="sv-main">{soft_breaks(v)}</div>'
    if k == "personality" and it.get("example"):
        out += f'<div class="sv-sub">“{soft_breaks(it["example"])}”</div>'
    if k == "strategy":
        out += "<ul class=sv-list>" + "".join(f"<li>{html.escape(str(x))}</li>" for x in as_list(it.get("points", []))) + "</ul>"
    return out


def detail_body(k, label, kp):
    st.markdown(f'<div class="why-label">{label}</div>', unsafe_allow_html=True)
    if k == "type":
        bt, reasons = brand_type(s.kind, s.picks)
        tp = TYPES[bt]
        st.markdown(f'<div class="why-value">{bt}형 — {tp["desc"]}</div>', unsafe_allow_html=True)
        score = " · ".join(f"{t}형 {len(r)}점" for t, r in sorted(reasons.items(), key=lambda x: -len(x[1])) if r)
        st.markdown(f"코칭에서 고른 보기마다 가까운 유형에 1점씩 더했어요. **{score}** 로, {bt}형이 가장 높았어요."
                    " (동점이면 첫 장면에서 고른 '시작한 이유'를 우선해요.)")
        st.markdown(f'<div class="why-quotes"><b>{bt}형 점수를 만든 내 선택</b>{postits(reasons[bt])}</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="type-tips"><div><b>이 유형이 잘하는 것</b>{tp["good"]}</div><div><b>조심할 것</b>{tp["care"]}</div></div>', unsafe_allow_html=True)
        st.caption("유형은 AI가 아니라 앱이 정해진 규칙으로 계산해요. 같은 선택이면 늘 같은 결과예요. (브랜딩 이론을 참고해 쉽게 만든 분류)")
        return
    if k == "like":
        by_logo = {b["logo"]: b for b in BRANDS}
        bt, _ = brand_type(s.kind, s.picks)
        st.markdown(f"내 브랜드가 **{bt}형**이라서, 같은 성격이 두드러지는 브랜드를 골랐어요. 규모가 아니라 '성격'이 닮았다는 뜻이에요.")
        for key, why in TYPES[bt]["like"]:
            st.markdown(f'**{by_logo[key]["name"]}** — {why}')
        st.caption("목록의 브랜드 버튼을 누르면 그 브랜드의 시작 이야기를 볼 수 있어요.")
        return
    if k == "color":
        if not s.get("palettes"):
            if st.button("컬러 다시 추천받기", key=f"{kp}retry_pal"):
                s.pop("palettes", None)
                st.rerun()
            return
        names = [p.get("name", f"{j + 1}안") for j, p in enumerate(s.palettes)]
        j = st.radio("컬러 안", range(len(names)), index=s.get("pal", 0), format_func=lambda x: names[x], horizontal=True, key=f"{kp}w_pal")
        show_palette(s.palettes[j])
        if st.button("이 컬러로 정하기", type="primary", key=f"{kp}set_pal"):
            s.pal = j
            st.rerun()
        return
    it = s.sheet[k]
    opts = as_list(it.get("options", []))
    if len(opts) > 1:
        st.caption("AI가 서로 다른 방향을 제안했어요. 내 생각에 더 가까운 안을 골라 주세요.")
        v = st.radio("안 고르기", opts, index=opts.index(chosen(k)), key=f"{kp}w_{k}", label_visibility="collapsed")
        if st.button("이 안으로 정하기", type="primary", key=f"{kp}set_{k}"):
            s[f"pick_{k}"] = v
            st.rerun()
    else:
        st.markdown(sheet_value(k), unsafe_allow_html=True)
    st.markdown(f'<div class="why-text">{html.escape(str(it.get("why", "")))}</div>', unsafe_allow_html=True)
    qs = [q for q in as_list(it.get("quotes", [])) if isinstance(q, str)]
    if qs:
        bad = unmatched(qs)
        st.markdown(f'<div class="why-quotes"><b>근거가 된 내 선택·내 말</b>{postits(qs)}</div>', unsafe_allow_html=True)
        if bad:
            st.warning(f"이 인용은 내 입력과 그대로 일치하지 않아요: {' / '.join(bad)}")
    st.caption("이건 AI의 해석이에요. 내 생각과 다른 부분은 덜어 내고 보세요. 판단은 내 몫이에요.")


def sheet_item(k, label, sel):
    with st.container(border=True, key=f"card_{k}"):
        st.markdown(f'<div class="sl">{label}</div>{sheet_value(k) if k != "like" else ""}', unsafe_allow_html=True)
        if k == "like":  # 닮은 브랜드: 누르면 브랜드 스토리 모달 + 닮은 점
            by_logo = {b["logo"]: b for b in BRANDS}
            bt, _ = brand_type(s.kind, s.picks)
            for key, why in TYPES[bt]["like"]:
                b = by_logo[key]
                if st.button(f'{b["name"]} 이야기 보기', key=f"likeb_{key}", use_container_width=True):
                    brand_modal(b, similar=f"{why}. 내 브랜드처럼 {bt}형의 성격이 두드러져요.")
        if k == sel:
            st.markdown('<span class="sel-mark">상세 보는 중 →</span>', unsafe_allow_html=True)
            with st.container(key="detail_inline"):  # 모바일 전용 (CSS로 데스크톱에선 숨김)
                detail_body(k, label, "m_")
        elif st.button("상세", key=f"why_{k}"):
            s.detail = k
            st.rerun()


PAGES = {"브랜드 코칭": None, "활용 템플릿": show_templates, "브랜드 스토리": show_stories, "1:1 멘토링": show_mentors}
page = st.segmented_control("메뉴", list(PAGES), default="브랜드 코칭", key="page", label_visibility="collapsed")
if PAGES.get(page):
    PAGES[page]()
    st.stop()

STEPS = ["기본 정보", "생각 정리", "간판", "확인", "리포트"]
if s.step > 0:  # 상단 단계 표시
    cells = "".join(f'<div class="{"now" if k == s.step else "done" if k < s.step else ""}">{k}. {name}</div>'
                    for k, name in enumerate(STEPS, 1))
    st.markdown(f'<div class="stepper">{cells}</div>', unsafe_allow_html=True)


if s.step == 0:
    # 인트로는 처음 한 번만 (메뉴를 오가도 다시 안 나오게)
    seen = s.get("intro_seen", False)
    s.intro_seen = True
    intro = "" if seen else '<div class="intro" aria-hidden="true"><div class="mq"><span class="g"><span class="pre">FROM YOUR&nbsp;</span>GARAGE</span></div></div>'
    marquee = "".join(f'<div class="lb-row{" rev" if i else ""}"><div class="lb-track">{"".join(logo("brands/" + n, "") for n in row * 2)}</div></div>'
                      for i, row in enumerate(MARQUEE))
    st.markdown(f"""<div class="home{" seen" if seen else ""}">{intro}
<div class="hero"><span class="eyebrow">질문으로 찾는 내 브랜드</span>
<div class="brand-title" role="heading" aria-level="1"><span class="by">From Your</span> <em>GARAGE</em></div>
<div class="hero-copy"><span>{logo("amazon_white", "아마존")}도, {logo("google", "구글")}도 작은 차고에서 시작했죠.</span><span>당신의 브랜드도 여기서 시작되길 바라요.</span></div>
<p class="hero-sub">질문에 답하다 보면 "내가 원래 생각하던 게 이거였구나"를 찾아 정리해 드려요.<br><span class="time-chip">약 15분</span>이면 충분해요.</p></div>
<div class="logo-band" aria-hidden="true">{marquee}</div>
<div class="steps">{"".join(f'<div class="step-card"><b>STEP {n}</b>{text}{ICONS[k]}</div>' for n, (k, text) in enumerate(HOME_STEPS, 1))}</div></div>""",
                unsafe_allow_html=True)
    st.caption("미리 생각해 두면 좋아요: 관심을 갖게 된 계기 · 도와주고 싶은 사람 · 다르게 하고 싶은 점 (잘 몰라도 괜찮아요)")
    if st.button("준비됐어요, 시작할게요", type="primary", key="start"):
        go(1)

elif s.step == 1:
    st.header("먼저 어떤 걸 브랜딩할지 알려 주세요")
    kinds = list(SCENES)
    s.kind = st.radio("형태", kinds, index=kinds.index(s.get("kind", "상품")), horizontal=True,
                      format_func=lambda k: "서비스 (레슨·클래스·코칭 포함)" if k == "서비스" else k)
    ex = EXAMPLES[s.kind]
    s.name = st.text_input("이름", s.get("name", ""), placeholder=ex["name"])
    s.desc = st.text_area("한 줄 설명", s.get("desc", ""), placeholder=ex["desc"])
    s.memo = st.text_area("(선택) 이미 구상 중인 내용이 있다면 자유롭게 적어 주세요", s.get("memo", ""), placeholder=ex["memo"])
    if st.button("시작하기", type="primary"):
        if not s.name.strip() or not s.desc.strip():
            st.warning("이름과 한 줄 설명을 적어 주세요.")
        else:
            go(2)

elif s.step == 2:
    i = s.q
    sc = SCENES[s.kind][i]
    wall_slot = st.empty()  # 포스트잇 벽: 맨 위 고정 (아래에서 고른 내용으로 채움)
    st.markdown(f'<div class="scene-head"><span class="day">GARAGE DAY 1 · 장면 {i + 1}/{N}</span>{bulbs(i)}</div>'
                f'<p class="scene">{sc["scene"]}</p><div class="ask">“{sc["ask"]}”</div>', unsafe_allow_html=True)
    if s.more[i]:
        st.info(s.more[i])
    chosen = []
    if sc["pick"] == 1:
        opts = [o for o, _ in sc["options"]]
        cur = s.picks[i][0] if s.picks[i] else None
        v = st.radio("속마음", opts, index=opts.index(cur) if cur in opts else None, key=f"p{i}", label_visibility="collapsed")
        chosen = [v] if v else []
    elif sc["pick"] > 1:
        groups = sc["options"] if isinstance(sc["options"][0][1], list) else [(f"최대 {sc['pick']}개까지 골라요", sc["options"])]
        for g, (label, opts) in enumerate(groups):
            names = [o for o, _ in opts]
            chosen += st.pills(label, names, selection_mode="multi", default=[c for c in s.picks[i] if c in names], key=f"p{i}_{g}") or []
    note = ""
    if sc["pick"] == 0:
        note = st.text_area("노트에 적어 보세요 (\"모르겠어요\"도 괜찮아요)", s.notes[i], key=f"n{i}")
    elif sc.get("note"):
        note = st.text_input("✏️ 노트에 한 줄 더 적기 (선택)", s.notes[i], key=f"n{i}", placeholder="예: 그때 있었던 일, 떠오른 사람")
    elif detail := [ASK_DETAIL[c] for c in chosen if c in ASK_DETAIL]:  # 내용이 있어야 쓸모 있는 보기 → 한 줄 더 물음
        note = st.text_input(f"✏️ 조금만 더: {detail[0]} (선택, 한 줄)", s.notes[i], key=f"n{i}")
    s.picks[i], s.notes[i] = chosen, note
    s.answers[i] = answer_text(chosen, note)
    wall_slot.markdown(wall(wall_items(i), chosen + ([note.strip()] if note.strip() else [])), unsafe_allow_html=True)
    c1, c2 = st.columns(2)
    if c1.button("이전") and i > 0:
        s.q -= 1
        st.rerun()
    if c2.button("다음", type="primary"):
        if sc["pick"] and not chosen:
            st.warning("마음에 가장 가까운 걸 하나 이상 골라 주세요.")
        elif 1 < sc["pick"] < 9 and len(chosen) > sc["pick"]:
            st.warning(f"최대 {sc['pick']}개까지 골라 주세요. 가장 가까운 것만 남겨 볼까요?")
        elif sc["pick"] == 0 and not note.strip():
            st.warning("한 줄이라도 적어 주세요.")
        elif sc["pick"] == 0 and len(note.strip()) < MIN_LEN and not s.asked_more[i]:
            s.asked_more[i] = True
            with st.spinner("조금 더 여쭤볼게요…"):
                more, _ = ask_ai(FOLLOWUP, question=sc["ask"], answer=note, name=s.name)
            s.more[i] = more or "조금 더 들려주세요. 예를 들면 그때 어떤 상황이었는지, 누가 떠올랐는지요."
            st.rerun()
        elif i < N - 1:
            s.q += 1
            st.rerun()
        else:
            go(3)

elif s.step == 3:
    st.markdown(wall(wall_items(N) + s.get("traits", [])), unsafe_allow_html=True)
    st.markdown(f'<div class="scene-head"><span class="day">GARAGE DAY 1 · 마지막 장면</span>{bulbs(N)}</div>'
                '<p class="scene">벽을 가득 채운 포스트잇을 본다. 이제 간판을 상상해 볼 차례.</p><div class="ask">“내 가게 간판은 어떤 느낌일까?”</div>',
                unsafe_allow_html=True)
    if not s.get("traits"):
        st.caption("1단계 · 둘 중 내 간판에 더 가까운 쪽을 골라 주세요. 정답은 없어요.")
        ex = {name: line for pair in TRAITS for name, line in pair}
        picks = [st.radio(f"{a[0]} vs {b[0]}", [a[0], b[0]], key=f"t{k}", format_func=lambda o: f"{o} — “{ex[o]}”")
                 for k, (a, b) in enumerate(TRAITS)]
        if st.button("다음", type="primary"):
            s.traits = picks
            st.rerun()
    else:
        st.caption(f"1단계에서 고른 성향: {' · '.join(s.traits)}")
        st.caption("2단계 · 간판 아래 붙일 한마디라면? 내 브랜드가 할 법한 말투를 하나 골라 주세요. (말투 예시일 뿐, 내용은 내 답변으로 채워져요)")
        tone = st.radio("말투", TONES[(s.traits[0], s.traits[1])], label_visibility="collapsed")
        c1, c2 = st.columns(2)
        if c1.button("성향 다시 고르기"):
            del s["traits"]
            st.rerun()
        if c2.button("아이디어 ON!", type="primary"):
            s.tone = tone
            go(4)

elif s.step == 4:
    st.header("제가 이해한 내용")
    st.caption("제가 이해한 내용이 맞는지 확인해 주세요. 다르면 아래에 고칠 점을 적어 주시면 다시 정리할게요.")
    if "reflect" not in s:
        with st.spinner("정리하고 있어요…"):
            s.reflect, s.err = ask_ai(REFLECT)
    if s.err:
        st.error(s.err)
        if st.button("다시 시도"):
            del s["reflect"]
            st.rerun()
    else:
        with st.container(border=True, key="reflect"):
            st.markdown(re.sub(r"^#{1,3}[^\n]*이런 뜻이에요[^\n]*\n+", "", s.reflect.strip()))  # AI가 전체 제목을 붙여도 지움
        if st.button("맞아요", type="primary"):
            go(5)
        s.fix = st.text_area("조금 달라요 — 고칠 내용을 적어 주세요", s.get("fix", ""))
        if st.button("이 내용으로 다시 정리") and s.fix.strip():
            del s["reflect"]
            st.rerun()

else:
    if "sheet" not in s:
        with st.spinner("내 브랜드 시트를 만들고 있어요… (30초쯤 걸려요)"):
            text, s.err = ask_ai(SHEET)
        s.sheet = None if s.err else parse_sheet(text or "")
        if not s.err and s.sheet is None:
            s.err = "결과 형식이 맞지 않았어요. 다시 시도해 주세요."
        if s.sheet:
            s.brief = sheet_text(s.sheet)
    if s.err:
        st.error(s.err)
        if st.button("다시 시도"):
            s.pop("sheet", None)
            s.err = None
            st.rerun()
    else:
        if "palettes" not in s:
            with st.spinner("어울리는 컬러를 고르고 있어요…"):
                text, _ = ask_ai(COLORS)
            s.palettes, s.pal = parse_palettes(text or ""), 0
        one = s.sheet["one_liner"].get("value", "")
        bt, reasons = brand_type(s.kind, s.picks)
        vals = "".join(f"<span>#{html.escape(str(v))}</span>" for v in as_list(s.sheet["values"].get("value", [])))
        with st.container(key="profile"):
            c1, c2 = st.columns([3, 2], vertical_alignment="center")
            c1.markdown(f'<span class="eyebrow">BRAND IDENTITY</span><div class="sheet-name">{html.escape(s.name)}<span class="mt-badge">{bt}형</span></div>'
                        f'<p class="sheet-one">{html.escape(str(one))}</p><div class="bm-tags">{vals}</div>'
                        '<p class="sheet-hint">내 선택과 내 말을 엮어서 낸 결론이에요. 항목의 <b>상세</b>를 누르면 이렇게 나온 이유와 근거를 볼 수 있어요.</p>',
                        unsafe_allow_html=True)
            c2.markdown(namecard(bt), unsafe_allow_html=True)
        items = [("type", "브랜드 유형"), ("customer", "주요 고객층"), ("pain", "고객의 고민"), ("mission", "미션"), ("message", "핵심 메시지"),
                 ("slogans", "슬로건"), ("personality", "성격·말투"), ("strategy", "판매 전략"), ("color", "아이덴티티 컬러"),
                 ("mood", "무드 키워드"), ("like", "닮은 브랜드"), ("todo", "이번 주 할 일"), ("advice", "더 생각해 볼 것")]
        labels = dict(items)
        sel = s.get("detail", "type")
        left, right = st.columns([5, 6], gap="large")
        with left:
            for k, label in items:
                sheet_item(k, label, sel)
        with right, st.container(key="detail_panel"):  # 데스크톱: 오른쪽 절반에 고정된 상세 창
            detail_body(sel, labels[sel], "d_")
        quotes = sheet_quotes()
        bad = unmatched(quotes)
        st.caption(f"근거 확인: AI가 인용한 내 답 {len(quotes)}개 중 {len(quotes) - len(bad)}개가 입력과 그대로 일치해요."
                   + (f" 일치하지 않는 인용: {' / '.join(bad)}." if bad else "")
                   + " AI가 만든 글이니 사실과 다른 부분이 없는지 직접 확인해 주세요.")
        c1, c2 = st.columns(2)
        c1.button("이 시트로 채널별 문구 만들기", type="primary", on_click=lambda: s.update(page="활용 템플릿"))
        c2.button("멘토와 이야기해 보기 (첫 1회 무료)", on_click=lambda: s.update(page="1:1 멘토링"))
    if st.button("처음부터 다시"):
        s.clear()
        st.query_params.clear()  # 예시 링크로 들어왔어도 빈 상태로 다시 시작
        st.rerun()
