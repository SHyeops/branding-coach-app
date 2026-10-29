# From Your Garage (웹 앱)

질문으로 찾는 내 브랜드 — Next.js(App Router) 버전. 기존 Streamlit 앱(저장소 루트의 `app.py`)과 같은 흐름·디자인.

## 주소
- 실제 사이트: https://fromyourgarage.vercel.app (OpenAI 호출, 비용 발생)
- 테스트 사이트: https://fromyourgarage-test.vercel.app (테스트 모드 `FAKE_AI=1`, 예시 답만, 비용 0원)
- 예시 결과: `?demo=report` / 답이 채워진 장면부터: `?demo=scenes` (저장된 실제 AI 결과, AI 재호출 없음)

## 배포
`main` 브랜치에 push하면 두 사이트가 자동 배포됩니다 (Vercel ↔ GitHub 연결, Root Directory = `web`).

## 로컬 실행
```bash
cd web
cp .env.local.example .env.local   # 값 채우기 (OPENAI_API_KEY, OPENAI_MODEL, 필요하면 FAKE_AI="1")
npm install
npm run dev                        # http://localhost:3000
```

## 구조
- `components/App.tsx` — 전체 화면 (코칭 6단계, 활용 템플릿, 브랜드 스토리, 1:1 멘토링)
- `lib/logic.ts` — 유형 계산, 근거 대조, 시트 해석 (화면·서버 공용)
- `app/api/ai/route.ts` — OpenAI 호출 (키는 서버에만)
- `lib/data.json` — 장면·보기·유형·프롬프트 (Streamlit `scenes.py`·`app.py`에서 변환)
