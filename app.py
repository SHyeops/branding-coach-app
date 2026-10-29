"""I'm find (가칭) — 질문으로 찾는 내 브랜드. 단계: 0 홈 → 1 시작 → 2 질문 → 3 되비추기 → 4 정리본"""
import os

import streamlit as st
from dotenv import load_dotenv
from openai import OpenAI

QUESTIONS = {
    "상품": ["이 상품을 왜 만들었나요?", "누구에게 가장 도움이 되길 바라나요?", "다른 상품과 다른, 나만 하는 것은 무엇인가요?"],
    "서비스": ["이 일을 왜 시작했나요?", "누가 배우러(찾아) 오나요?", "다른 곳과 다른, 나만 하는 것은 무엇인가요?"],
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
REFLECT = """사용자가 답한 내용을 "말씀하신 건 이런 뜻이에요" 형태로, 3~4개 항목(시작한 이유 / 도와주고 싶은 사람 / 나만의 점)으로 쉽게 정리해줘.
{rules}

{info}"""
BRIEF = """아래 내용으로 브랜드 요약 카드를 만들어줘. 항목: 미션 / 핵심 가치 3개 / 성격·말투 / 핵심 메시지 / 슬로건 3안 / 무드 키워드와 컬러.
정보가 부족해 채울 수 없는 항목(또는 항목의 일부)은 "아직 정해지지 않았어요. (채우려면: 사용자에게 던질 질문 1개)" 형식으로 쓴다. 질문에는 새 사실을 넣지 않는다.
같은 표현을 반복해 항목을 억지로 채우지 말고, 근거가 있는 것만 쓴다.
{rules}

{info}"""
FOLLOWUP = """사용자가 아래 질문에 너무 짧게 답했다. 답을 더 구체적으로 이끌어낼 추가 질문 1개를 쉬운 말로 만들어줘.
질문에는 사용자가 말하지 않은 사실을 넣지 말고, 떠올리기 쉽도록 "예를 들면 …" 식의 열린 예시 2개를 덧붙인다. 질문만 출력한다.
질문: {question}
사용자의 짧은 답: {answer}
상품·서비스 이름: {name}"""

def info_text():
    qa = "\n".join(f"- {q}: {a}" for q, a in zip(QUESTIONS[s.kind], s.answers))
    memo = s.memo.strip() or "(없음)"
    fix = s.get("fix", "").strip()
    out = f"[사용자 정보]\n형태: {s.kind}\n이름: {s.name}\n설명: {s.desc}\n구상 메모(참고용): {memo}\n질문과 답변:\n{qa}"
    return out + (f"\n사용자 수정 요청: {fix}" if fix else "")


def ask_ai(template, **extra):
    """실패해도 앱이 멈추지 않게 (결과, 오류문구)를 돌려준다."""
    model = os.environ.get("OPENAI_MODEL")
    if not model:
        return None, "모델 설정(OPENAI_MODEL)이 없어요. .env 또는 Secrets를 확인해 주세요."
    prompt = template.format(rules=RULES, info=info_text(), **extra)  # 형식 오류는 숨기지 않고 바로 드러냄
    try:
        res = OpenAI().chat.completions.create(model=model, messages=[{"role": "user", "content": prompt}])
        return res.choices[0].message.content, None
    except Exception:
        return None, "AI 연결에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요."


st.set_page_config(page_title="I'm find — 질문으로 찾는 내 브랜드")
s = st.session_state
s.setdefault("step", 0)
s.setdefault("q", 0)          # 현재 질문 번호 (0~2)
s.setdefault("answers", ["", "", ""])
s.setdefault("asked_more", [False, False, False])
s.setdefault("more", ["", "", ""])


def go(step):
    s.step = step
    st.rerun()


if s.step == 0:
    st.title("I'm find")
    st.caption("질문으로 찾는 내 브랜드")
    st.write("질문에 답하다 보면 \"내가 원래 생각하던 게 이거였구나\"를 찾아 정리해 드려요.")
    st.markdown("**이렇게 진행돼요**\n1. 질문 3개에 답하기\n2. 제가 이해한 내용이 맞는지 확인\n3. 브랜드 정리 카드 받기")
    st.caption("미리 생각해 두면 좋아요: 시작한 이유 · 도와주고 싶은 사람 · 나만 하는 것 (잘 몰라도 괜찮아요)")
    if st.button("준비됐어요, 시작할게요", type="primary"):
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
    st.progress((i + 1) / 3, text=f"질문 {i + 1}/3")
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
        elif i < 2:
            s.q += 1
            st.rerun()
        else:
            go(3)

elif s.step == 3:
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
            go(4)
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
            st.markdown(s.brief)
            st.caption("AI가 만든 글이에요. 사실과 다른 부분이 없는지 직접 확인해 주세요.")
        with tab_mentor:
            st.subheader("우리 업계 이야기를 더 자세히 듣고 싶다면")
            st.write("정리본을 가지고 해당 업계 현직자와 1:1로 이야기해 보는 멘토링이에요. (유료)")
            st.info("아직 준비 중인 기능이에요. 곧 만나요!")
            st.button("멘토링 신청하기", disabled=True)
    if st.button("처음부터 다시"):
        s.clear()
        st.rerun()
