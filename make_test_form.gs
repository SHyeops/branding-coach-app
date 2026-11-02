// From Your Garage 사용자 테스트 구글폼 자동 생성 (약 12분 + 선택 3분, 혼자 하는 원격용)
// 사용법: script.google.com → 새 프로젝트 → 이 내용 전체 붙여넣기 → ▶ 실행(makeForm) → 권한 허용
//        → 아래 '실행 로그'에 응답 주소(보낼 링크)와 편집 주소가 찍힘
// 이름·연락처·이메일은 받지 않음 (기록표가 GitHub에 올라가서)
function makeForm() {
  const APP = 'https://fromyourgarage.vercel.app';
  const f = FormApp.create('From Your Garage 사용자 테스트 (약 12분)');
  f.setDescription(
    '내 브랜드를 정리해 주는 코칭 앱을 써 보고 답하는 테스트예요.\n' +
    '정답은 없고, 앱을 평가하는 거지 당신을 평가하는 게 아니에요. 이름·연락처는 받지 않아요. 휴대폰 OK.\n\n' +
    '① 질문 2개 → ② 앱 써 보기(8~10분) → ③ 질문 몇 개 → (선택) 차별점 찾기 3분');
  f.setCollectEmail(false);
  f.setProgressBar(true);

  const scale = (title, help) => f.addScaleItem().setTitle(title).setHelpText(help || '')
    .setBounds(1, 5).setLabels('전혀 아니다', '매우 그렇다').setRequired(true);
  const text = (title, help, req) => f.addTextItem().setTitle(title).setHelpText(help || '').setRequired(!!req);
  const para = (title, help, req) => f.addParagraphTextItem().setTitle(title).setHelpText(help || '').setRequired(!!req);
  const choice = (title, choices, req) => f.addMultipleChoiceItem().setTitle(title).setChoiceValues(choices).setRequired(req !== false);
  const page = (title, help) => f.addPageBreakItem().setTitle(title).setHelpText(help || '');
  const THINK = '나는 내 브랜드가 왜 시작했고, 누구에게, 무엇이 다른지를 지금 바로 말로 설명할 수 있다';

  // ① 사용 전 (30초)
  f.addSectionHeaderItem().setTitle('① 시작 전 (30초)')
    .setHelpText('지금 하고 있거나, 언젠가 해 보고 싶은 상품·서비스 하나를 떠올려 주세요.');
  choice('어떤 분야인가요?', ['먹거리·농산물', '손으로 만든 물건', '패션·뷰티', '교육·강의·재능', '서비스·가게', '아직 정하지 않음', '기타']);
  scale('[사용 전] ' + THINK, '지금 느낌 그대로 골라 주세요.');

  // ② 앱 사용 (8~10분)
  page('② 앱 써 보기 (8~10분)',
    '새 창으로 열어 주세요 👉 ' + APP + '\n\n' +
    '지금 시각을 기억해 두고 "준비됐어요, 시작할게요" → 떠올린 상품으로 결과 화면까지 가 주세요. (AI 정리에 1분쯤 걸려요)\n' +
    '결과 화면까지 본 다음 이 창으로 돌아와 "다음"을 눌러 주세요.');
  text('결과 화면까지 대략 몇 분 걸렸나요? (숫자만)', '예: 9', true)
    .setValidation(FormApp.createTextValidation().requireNumber().setHelpText('숫자만 적어 주세요').build());

  // ③ 사용 후 (2분)
  page('③ 써 본 뒤 (2분)');
  scale('[사용 후] ' + THINK, '처음과 같은 문장이에요.');
  scale('결과를 보고 "이제 시작해도 되겠다"는 느낌이 들었나요?');
  scale('앱이 말한 "나만의 차별점"이 비슷한 걸 파는 다른 사람과 실제로 다르다고 생각하나요?');
  scale('비슷한 고민을 하는 지인에게 권하고 싶나요?');
  choice('결과에서 처음 생각해 본 것이 있었나요?', ['있음', '없음']);
  text('가장 좋았던 점 한 줄', '', true);
  para('답답했거나 나와 안 맞았던 점, 바꾸고 싶은 점', '없으면 "없음"', true);
  text('오류나 이상한 화면이 있었나요?', '글자 잘림, 버튼 안 눌림, 이상한 AI 답 등. 없으면 "없음"', true);
  choice('어떤 기기로 했나요?', ['아이폰', '안드로이드 폰', 'PC·노트북', '태블릿']);
  const more = f.addMultipleChoiceItem().setTitle('3분만 더, "차별점 찾기"도 해 볼까요? (선택)').setRequired(true);

  // (선택) 차별점 찾기 3분
  const lab = page('(선택) 차별점 찾기 (3분)',
    '결과 화면 아래 "내 차별점 직접 찾아보기"를 눌러 주세요.\n' +
    '할 줄 아는 것·좋아하는 것·겪은 일을 종이로 붙이고 → 보드마카로 두 장 잇고 → 하기 싫은 건 구겨 버리고 → 남은 것에 별을 붙여요.');
  more.setChoices([more.createChoice('해 볼게요', lab), more.createChoice('여기서 제출할게요', FormApp.PageNavigationType.SUBMIT)]);
  choice('처음 생각해 본 차별점 후보가 나왔나요?', ['있음', '없음']);
  text('별을 붙인 후보 한 줄 (있으면)');
  choice('앱이 찾아 준 차별점과 내가 직접 찾은 것 중 어느 쪽이 더 내 것 같나요?', ['앱', '직접', '비슷함']);

  f.setConfirmationMessage('고맙습니다! 이상한 화면 캡처가 있으면 보내 주세요.');
  // shortcut: 최근 Google 정책상 스크립트로 만든 폼이 '게시 안 됨'일 수 있어 게시를 시도함. 안 되면 편집 화면 오른쪽 위 '게시'
  try { f.setPublished(true); } catch (e) {}
  Logger.log('보낼 링크(응답): ' + f.getPublishedUrl());
  Logger.log('편집 링크: ' + f.getEditUrl());
}
