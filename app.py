"""From Your Garage — 질문으로 찾는 내 브랜드. 메뉴: 활용 템플릿 / 1:1 멘토링 / 브랜드 코칭(단계: 0 홈 → 1 기본 정보 → 2 진단 질문 → 3 성향 찾기 → 4 되비추기 → 5 리포트) / 브랜드 스토리"""
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

# 진단 질문 6개 = 3묶음(왜 / 누구에게 / 무엇이 다른가) × 2
APP_NAME = "From Your Garage"

QUESTIONS = {
    "상품": ["이 상품에 관심을 갖게 된 계기나 이유는 무엇인가요?", "이 상품으로 이루고 싶은 것은 무엇인가요?",
            "어떤 사람들에게 이 상품이 필요할까요?", "그 사람은 지금 어떤 점이 불편하거나 아쉬울까요?",
            "다른 상품과 다르게 하고 있는(또는 하고 싶은) 점은 무엇인가요?", "손님이 이 상품에 대해 꼭 기억했으면 하는 한 가지는 무엇인가요?"],
    "서비스": ["이 일에 관심을 갖게 된 계기나 이유는 무엇인가요?", "이 일로 이루고 싶은 것은 무엇인가요?",
             "어떤 사람이 찾아오면 좋겠나요?", "그 사람은 지금 어떤 점이 불편하거나 아쉬울까요?",
             "다른 곳과 다르게 하고 있는(또는 하고 싶은) 점은 무엇인가요?", "손님이 이 서비스에 대해 꼭 기억했으면 하는 한 가지는 무엇인가요?"],
}
GROUPS = ["왜", "왜", "누구에게", "누구에게", "무엇이 다른가", "무엇이 다른가"]
N = len(GROUPS)

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
REFLECT = """사용자가 답한 내용을 "말씀하신 건 이런 뜻이에요" 형태로, 묶음별(왜 / 누구에게 / 무엇이 다른가) 항목과 "고른 성향·말투" 항목으로 쉽게 정리해줘.
{rules}

{info}"""
BRIEF = """아래 내용으로 브랜드 분석 리포트를 만들어줘. 항목: 미션 / 핵심 가치 3개 / 성격·말투 / 핵심 메시지 / 슬로건 3안 / 무드 키워드.
항목마다 아래 형식을 지킨다.
### 항목 이름
**결과:** 내용
**이유:** 왜 이렇게 정리했는지 1~2문장
**근거가 된 내 답:** 사용자 정보의 문장을 「」 안에 한 글자도 바꾸지 말고 그대로 옮긴다 (1~2개)
**쓸 때 팁:** 상세페이지·SNS·간판 등 어디에 어떻게 쓰면 좋은지 1문장
정보가 부족해 채울 수 없는 항목(또는 항목의 일부)은 결과에 "아직 정해지지 않았어요. (채우려면: 사용자에게 던질 질문 1개)"라고 쓰고 근거는 비운다. 질문에는 새 사실을 넣지 않는다.
같은 표현을 반복해 항목을 억지로 채우지 말고, 근거가 있는 것만 쓴다. 성격·말투는 사용자가 고른 성향과 말투 예시를 근거로 쓴다.
{rules}

{info}"""
# 컬러는 사실이 아니라 제안 → 3안을 한 번에 받아 "다른 안 보기"로 넘김
COLORS = """아래 사용자 정보(특히 고른 성향)에 어울리는 브랜드 컬러 조합 3안을 추천해줘. 안마다 색 3개(메인/보조/강조)를 고른다.
반드시 JSON만 출력한다: {{"palettes": [{{"name": "조합 이름", "colors": [{{"hex": "#RRGGBB", "role": "메인"}}, ...], "why": "이 조합을 고른 이유 1~2문장", "quote": "근거가 된 사용자 정보 문장 1개를 한 글자도 바꾸지 않고 그대로"}}]}}
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
    qa = "\n".join(f"- [{g}] {q}: {a}" for g, q, a in zip(GROUPS, QUESTIONS[s.kind], s.answers))
    memo = s.memo.strip() or "(없음)"
    fix = s.get("fix", "").strip()
    out = f"[사용자 정보]\n형태: {s.kind}\n이름: {s.name}\n설명: {s.desc}\n구상 메모(참고용): {memo}\n질문과 답변:\n{qa}"
    if s.get("traits"):
        out += f"\n사용자가 고른 성향: {', '.join(s.traits)}\n사용자가 고른 말투 예시: {s.get('tone', '(없음)')}"
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
    if template is BRIEF:
        return (f"### 미션\n**결과:** (테스트 모드 예시) {s.name}의 미션\n**이유:** 예시 이유\n**근거가 된 내 답:** 「{a}」\n"
                "**쓸 때 팁:** 예시 팁\n\n### 핵심 메시지\n**결과:** 아직 정해지지 않았어요. (채우려면: 손님이 꼭 기억했으면 하는 한 가지는?)")
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
    prompt = template.format(rules=RULES, info=info_text(), **extra)  # 형식 오류는 숨기지 않고 바로 드러냄
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
s.setdefault("answers", [""] * N)
s.setdefault("asked_more", [False] * N)
s.setdefault("more", [""] * N)


def go(step):
    s.step = step
    st.rerun()


def svg_b64(name):
    return base64.b64encode((Path(__file__).parent / "assets" / f"{name}.svg").read_bytes()).decode()


def logo(name, alt):
    """assets/의 로고 SVG(위키미디어 공용·simple-icons)를 글 안에 이미지로 넣음"""
    return f'<img class="logo logo-{Path(name).name}" alt="{alt}" src="data:image/svg+xml;base64,{svg_b64(name)}">'


@st.dialog("브랜드 브리프", width="large")
def brand_modal(b):
    st.markdown(f'<div class="bm-head"><span class="bm-logo">{logo("brands/" + b["logo"], b["en"])}</span><div><div class="bm-name">{b["name"]} <small>{b["en"]}</small></div>'
                f'<div class="bm-meta">{b["since"]} · {b["founder"]}</div></div></div>'
                f'<div class="bm-msg">“{b["message"]}”<small>{"대표 문구" if b["official"] else "핵심 생각 (공식 문구 아님, 요약)"}</small></div>'
                f'<div class="bm-tags">{"".join(f"<span>#{k}</span>" for k in b["keywords"])}</div>', unsafe_allow_html=True)
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
    if not s.get("brief"):
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
            text, err = ask_ai(TEMPLATE, channel=ch, items=CHANNELS[ch], brief=s.brief)
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
    return (f'<div class="mt-head"><img class="mt-ava" alt="" src="data:image/svg+xml;base64,{svg_b64("mentors/" + m["avatar"])}">'
            f'<div><div class="mt-name">{m["name"]}</div><div class="mt-role">{m["role"]} · {m["years"]}년차</div></div></div>'
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
HOME_STEPS = [("진단", "질문 6개 답하기"), ("성향", "성향 고르기"), ("확인", "내용 확인"), ("리포트", "리포트 받기")]

PAGES = {"브랜드 코칭": None, "활용 템플릿": show_templates, "브랜드 스토리": show_stories, "1:1 멘토링": show_mentors}
page = st.segmented_control("메뉴", list(PAGES), default="브랜드 코칭", key="page", label_visibility="collapsed")
if PAGES.get(page):
    PAGES[page]()
    st.stop()

STEPS = ["기본 정보", "진단", "성향", "확인", "리포트"]
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
<div class="hero-copy"><span>세상엔 수많은 브랜드가 있어요.</span><span>{logo("amazon_white", "아마존")}도, {logo("google", "구글")}도 작은 차고에서 시작했죠.</span><span>당신의 브랜드도 여기서 시작되길 바라요.</span></div>
<p class="hero-sub">질문에 답하다 보면 "내가 원래 생각하던 게 이거였구나"를 찾아 정리해 드려요.<br><span class="time-chip">약 15분</span>이면 충분해요.</p></div>
<div class="logo-band" aria-hidden="true">{marquee}</div>
<div class="steps">{"".join(f'<div class="step-card"><b>STEP {n}</b>{text}{ICONS[k]}</div>' for n, (k, text) in enumerate(HOME_STEPS, 1))}</div></div>""",
                unsafe_allow_html=True)
    st.caption("미리 생각해 두면 좋아요: 관심을 갖게 된 계기 · 도와주고 싶은 사람 · 다르게 하고 싶은 점 (잘 몰라도 괜찮아요)")
    if st.button("준비됐어요, 시작할게요", type="primary", key="start"):
        go(1)

elif s.step == 1:
    st.header("먼저 어떤 걸 브랜딩할지 알려 주세요")
    kinds = list(QUESTIONS)
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
    st.progress((i + 1) / N, text=f"진단 질문 {i + 1}/{N} · {GROUPS[i]}")
    st.subheader(QUESTIONS[s.kind][i])
    if s.more[i]:
        st.info(s.more[i])
    s.answers[i] = st.text_area("자유롭게 적어 주세요 (\"모르겠어요\"도 괜찮아요)", s.answers[i], key=f"a{i}")
    short = 0 < len(s.answers[i].strip()) < MIN_LEN and not s.asked_more[i]
    c1, c2 = st.columns(2)
    if c1.button("이전") and i > 0:
        s.q -= 1
        st.rerun()
    if c2.button("다음", type="primary"):
        if not s.answers[i].strip():
            st.warning("한 줄이라도 적어 주세요.")
        elif short:
            s.asked_more[i] = True
            with st.spinner("조금 더 여쭤볼게요…"):
                more, _ = ask_ai(FOLLOWUP, question=QUESTIONS[s.kind][i], answer=s.answers[i], name=s.name)
            s.more[i] = more or "조금 더 들려주세요. 예를 들면 그때 어떤 상황이었는지, 누가 떠올랐는지요."
            st.rerun()
        elif i < N - 1:
            s.q += 1
            st.rerun()
        else:
            go(3)

elif s.step == 3:
    st.header("내 브랜드 성향 찾기")
    if not s.get("traits"):
        st.caption("1단계 · 둘 중 내 브랜드에 더 가까운 쪽을 골라 주세요. 정답은 없어요.")
        ex = {name: line for pair in TRAITS for name, line in pair}
        picks = [st.radio(f"{a[0]} vs {b[0]}", [a[0], b[0]], key=f"t{k}", format_func=lambda o: f"{o} — “{ex[o]}”")
                 for k, (a, b) in enumerate(TRAITS)]
        if st.button("다음", type="primary"):
            s.traits = picks
            st.rerun()
    else:
        st.caption(f"1단계에서 고른 성향: {' · '.join(s.traits)}")
        st.caption("2단계 · 이 중 내 브랜드가 할 법한 말투를 하나 골라 주세요. (말투 예시일 뿐, 내용은 내 답변으로 채워져요)")
        tone = st.radio("말투", TONES[(s.traits[0], s.traits[1])], label_visibility="collapsed")
        c1, c2 = st.columns(2)
        if c1.button("성향 다시 고르기"):
            del s["traits"]
            st.rerun()
        if c2.button("다음", type="primary"):
            s.tone = tone
            go(4)

elif s.step == 4:
    st.header("제가 이해한 건 이런 뜻이에요")
    if "reflect" not in s:
        with st.spinner("정리하고 있어요…"):
            s.reflect, s.err = ask_ai(REFLECT)
    if s.err:
        st.error(s.err)
        if st.button("다시 시도"):
            del s["reflect"]
            st.rerun()
    else:
        st.markdown(s.reflect)
        if st.button("맞아요", type="primary"):
            go(5)
        s.fix = st.text_area("조금 달라요 — 고칠 내용을 적어 주세요", s.get("fix", ""))
        if st.button("이 내용으로 다시 정리") and s.fix.strip():
            del s["reflect"]
            st.rerun()

else:
    st.header(f"{s.name} 브랜드 정리")
    if "brief" not in s:
        with st.spinner("정리본을 만들고 있어요…"):
            s.brief, s.err = ask_ai(BRIEF)
    if s.err:
        st.error(s.err)
        if st.button("다시 시도"):
            del s["brief"]
            st.rerun()
    else:
        tab_brief, tab_mentor = st.tabs(["정리본", "1:1 멘토링"])
        with tab_brief:
            with st.container(border=True):
                st.markdown(s.brief.replace("\n", "  \n"))  # 결과/이유/근거/팁이 한 줄로 붙지 않게
                quotes = re.findall(r"「(.+?)」", s.brief)
                bad = unmatched(quotes)
                st.caption(f"근거 확인: AI가 인용한 내 답 {len(quotes)}개 중 {len(quotes) - len(bad)}개가 입력과 그대로 일치해요."
                           + (f" 일치하지 않는 인용: {' / '.join(bad)}." if bad else "")
                           + " AI가 만든 글이니 사실과 다른 부분이 없는지 직접 확인해 주세요.")
            st.button("이 리포트로 채널별 문구 만들기", on_click=lambda: s.update(page="활용 템플릿"))
            if "palettes" not in s:
                with st.spinner("어울리는 컬러를 고르고 있어요…"):
                    text, _ = ask_ai(COLORS)
                s.palettes, s.pal = parse_palettes(text or ""), 0
            # 서비스는 컬러 영향이 상대적으로 작아 접어 둠 (사용자 의견 10/29)
            box = st.expander("추천 컬러 (선택)") if s.kind == "서비스" else st.container(border=True)
            with box:
                st.subheader("추천 컬러")
                if not s.palettes:
                    st.info("컬러 추천을 만들지 못했어요. 아래 버튼으로 다시 시도해 주세요.")
                    if st.button("컬러 다시 추천받기"):
                        del s["palettes"]
                        st.rerun()
                else:
                    st.caption(f"{s.pal + 1}안 / {len(s.palettes)}안 · 로고·상세페이지·SNS에 쓸 색이에요. 마음에 들지 않으면 다른 안을 보세요.")
                    show_palette(s.palettes[s.pal])
                    if len(s.palettes) > 1 and st.button("다른 안 보기"):
                        s.pal = (s.pal + 1) % len(s.palettes)
                        st.rerun()
        with tab_mentor:
            st.subheader("우리 업계 이야기를 더 자세히 듣고 싶다면")
            st.write("정리본을 가지고 분야별 멘토와 1:1로 이야기해 보는 멘토링이에요. 첫 1회는 무료예요.")
            st.button("멘토 둘러보기", on_click=lambda: s.update(page="1:1 멘토링"))
    if st.button("처음부터 다시"):
        s.clear()
        st.rerun()
