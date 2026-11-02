// From Your Garage 사용자 테스트 구글폼 자동 생성 (사용자테스트지 v4 기준, 혼자 하는 원격용)
// 사용법: script.google.com → 새 프로젝트 → 이 내용 전체 붙여넣기 → ▶ 실행(makeForm) → 권한 허용
//        → 아래 '실행 로그'에 응답 주소(보낼 링크)와 편집 주소가 찍힘
// 이름·연락처·이메일은 받지 않음 (기록표가 GitHub에 올라가서)
function makeForm() {
  const APP = 'https://fromyourgarage.vercel.app';
  const f = FormApp.create('From Your Garage 사용자 테스트 (약 25분)');
  f.setDescription(
    '내 브랜드를 정리해 주는 코칭 앱을 써 보고 답하는 테스트예요.\n' +
    '정답은 없고, 앱을 평가하는 거지 당신을 평가하는 게 아니에요.\n' +
    '이름·연락처는 받지 않아요. 휴대폰·PC 모두 가능해요.\n\n' +
    '순서: ① 사용 전 질문 → ② 앱 써 보기 → ③ 사용 후 질문 → ④ 차별점 찾기 탭 → ⑤ 피드백');
  f.setCollectEmail(false);
  f.setProgressBar(true);

  const scale = (title, help) => f.addScaleItem().setTitle(title).setHelpText(help || '')
    .setBounds(1, 5).setLabels('전혀 아니다', '매우 그렇다').setRequired(true);
  const text = (title, help, req) => f.addTextItem().setTitle(title).setHelpText(help || '').setRequired(!!req);
  const para = (title, help, req) => f.addParagraphTextItem().setTitle(title).setHelpText(help || '').setRequired(!!req);
  const choice = (title, choices, help) => f.addMultipleChoiceItem().setTitle(title).setHelpText(help || '')
    .setChoiceValues(choices).setRequired(true);
  const page = (title, help) => f.addPageBreakItem().setTitle(title).setHelpText(help || '');
  const THINK = '나는 내 브랜드가 왜 시작했고, 누구에게, 무엇이 다른지를 지금 바로 말로 설명할 수 있다';

  // ① 사용 전
  f.addSectionHeaderItem().setTitle('① 사용 전 (2분)')
    .setHelpText('지금 하고 있거나, 언젠가 해 보고 싶은 상품·서비스 하나를 떠올려 주세요.');
  choice('어떤 분야인가요?', ['먹거리·농산물', '손으로 만든 물건', '패션·뷰티', '교육·강의·재능', '서비스·가게', '아직 정하지 않음', '기타']);
  choice('지금 어느 단계인가요?', ['이미 팔고 있어요', '준비 중이에요', '언젠가 해 보고 싶어요']);
  para('그 상품·서비스를 한두 줄로 소개해 주세요 (선택)',
    '가칭이어도 괜찮아요. 개인정보·회사 내부 내용은 쓰지 마세요. 나중에 비교용 결과를 만들 때만 써요.');
  scale('[사용 전] ' + THINK, '앱을 쓰기 전 지금 느낌 그대로 골라 주세요.');

  // ② 앱 사용
  page('② 앱 써 보기 (10~15분)',
    '아래 주소를 새 창으로 열어 주세요: ' + APP + '\n\n' +
    '1. 지금 시각을 기억해 두고 "준비됐어요, 시작할게요"를 눌러 주세요.\n' +
    '2. 떠올린 상품·서비스로 끝까지 진행해 결과 화면까지 가 주세요. (AI가 정리하는 데 1분쯤 걸려요)\n' +
    '3. 결과 화면이 뜨면 걸린 시간을 적고, 이상한 화면은 캡처해 두세요.\n' +
    '이 창은 닫지 말고, 결과 화면까지 본 다음 "다음"을 눌러 주세요.');
  text('시작부터 결과 화면까지 대략 몇 분 걸렸나요? (숫자만)', '예: 12', true)
    .setValidation(FormApp.createTextValidation().requireNumber().setHelpText('숫자만 적어 주세요').build());

  // ③ 사용 후
  page('③ 사용 후 (1분)', '앞에서 받은 질문과 같은 문장이에요. 지금 느낌으로 다시 골라 주세요.');
  scale('[사용 후] ' + THINK);

  // ④ 차별점 찾기
  page('④ 차별점 찾기 탭 (5분)',
    '결과 화면 아래쪽의 "내 차별점 직접 찾아보기" 버튼을 눌러 주세요. (위쪽 메뉴의 "차별점 찾기"도 같은 곳이에요)\n\n' +
    '① 늘어놓기: 할 줄 아는 것·좋아하는 것·겪은 일을 종이 5장 이상\n' +
    '② 엮어 보기: 종이를 누른 채 다른 종이로 끌어 보드마카로 잇고, 조합을 한 줄로 적기\n' +
    '③ 버리기: 하기 싫은 것, 남도 말할 수 있는 것은 구겨서 버리기\n' +
    '④ 고르기: 남은 것에 별 1~3개');
  choice('④에서 처음 생각해 본 차별점 후보가 나왔나요?', ['있음', '없음']);
  text('별을 붙인 후보를 한 줄로 적어 주세요 (있으면)');
  choice('앱이 결과 화면에서 찾아 준 차별점과 내가 탭에서 직접 찾은 것 중 어느 쪽이 더 내 것 같나요?', ['앱', '직접', '비슷함']);
  text('그렇게 고른 이유 한 줄', '', true);

  // ⑤ 피드백
  page('⑤ 피드백 (5분)', '솔직하게 써 주실수록 도움이 돼요.');
  para('가장 좋았던 순간 한 가지', '', true);
  para('가장 답답하거나 헷갈렸던 순간 한 가지', '', true);
  para('오류나 이상하게 보인 화면이 있었나요?', '글자 잘림, 버튼 안 눌림, 이상한 AI 답 등. 없으면 "없음". 캡처는 따로 보내 주세요.', true);
  para('결과 중에 나와 안 맞거나 사실과 다른 말이 있었나요?', '있으면 어느 항목인지. 없으면 "없음"', true);
  scale('결과를 보고 "이제 시작해도 되겠다"는 느낌이 들었나요?');
  scale('비슷한 고민을 하는 지인에게 이 앱을 권하고 싶나요?');
  para('하나만 바꾼다면 무엇을 바꾸고 싶나요?', '', true);
  choice('결과에서 새로 알게 됐거나 처음 생각해 본 것이 있었나요?', ['있음', '없음']);
  text('있었다면 무엇인가요? (한 줄)');
  scale('앱이 말한 "나만의 차별점"이 경쟁자(비슷한 걸 파는 다른 사람)와 실제로 다르다고 생각하나요?');
  choice('어떤 기기로 했나요?', ['아이폰', '안드로이드 폰', 'PC·노트북', '태블릿']);

  f.setConfirmationMessage('고맙습니다! 이상한 화면 캡처가 있으면 보내 주세요.');
  // shortcut: 최근 Google 정책상 API로 만든 폼이 '게시 안 됨'일 수 있어 게시를 시도함. 안 되면 편집 화면 오른쪽 위 '게시'를 누르면 됨
  try { f.setPublished(true); } catch (e) {}
  Logger.log('보낼 링크(응답): ' + f.getPublishedUrl());
  Logger.log('편집 링크: ' + f.getEditUrl());
}
