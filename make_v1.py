"""v1(개선 전): 상품 10개를 '한 번에 요청' 프롬프트로 실행해 results/v1/에 저장."""
import csv
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
MODEL = os.environ["OPENAI_MODEL"]
client = OpenAI()  # OPENAI_API_KEY를 환경변수에서 자동으로 읽음

# 프롬프트기록_v1.md의 v1 프롬프트 그대로
PROMPT = """아래 상품의 브랜딩을 해줘.
아이덴티티(미션, 핵심 가치 3개, 브랜드 성격, 톤앤매너),
비주얼 컨셉(무드 키워드, 컬러, 서체 느낌),
전달 메시지(슬로건 3개, 핵심 메시지, 채널별 한 줄 카피)를 정리해줘.

[상품 정보]
업종: {업종}
상품명: {상품명}
설명: {상품 설명}
가격대: {가격대}
판매 채널: {판매 채널}
타깃: {생각하는 타깃}"""

out = Path("results/v1")
out.mkdir(parents=True, exist_ok=True)

with open("20261028_테스트상품_v3.csv", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

for r in rows:
    inputs = {
        "업종": r["업종"], "상품명": r["이름(가칭)"], "상품 설명": r["설명"],
        "가격대": r["가격대"], "판매 채널": r["판매 채널"], "생각하는 타깃": r["생각하는 타깃"],
    }
    prompt = PROMPT.format(**inputs)
    try:
        res = client.chat.completions.create(model=MODEL, messages=[{"role": "user", "content": prompt}])
        body = res.choices[0].message.content
    except Exception as e:  # 한 상품이 실패해도 나머지는 계속
        print(f"{r['id']} 실패: {e}")
        continue
    now = datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d %H:%M:%S")
    head = "\n".join(f"- {k}: {v}" for k, v in inputs.items())
    (out / f"{r['id']}.md").write_text(
        f"# {r['id']} {inputs['상품명']} — v1 결과\n\n- 모델: {MODEL}\n- 생성 시각: {now} (Asia/Seoul)\n\n"
        f"## 입력 정보\n{head}\n\n---\n\n{body}\n", encoding="utf-8")
    print(f"{r['id']} 저장 완료")
