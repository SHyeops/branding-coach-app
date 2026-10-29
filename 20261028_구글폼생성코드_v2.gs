/**
 * 사용법: script.google.com → 새 프로젝트 → 기존 코드 지우고 이 코드 전체 붙여넣기 → 저장 → ▶ 실행(createSurvey)
 * 처음 실행 시 권한 허용. 실행 후 '실행 로그'에 편집 링크/응답 링크가 나옵니다.
 */
function createSurvey() {
  var form = FormApp.create('나만의 브랜드, 꿈꿔본 적 있나요? (3~5분 설문)');
  form.setDescription(
    '수업 프로젝트로 "내 안의 생각을 끄집어내 브랜드로 정리해 주는 도구"를 만들고 있어요.\n' +
    '익명으로 받으며, 결과는 프로젝트에만 사용합니다. 개인정보는 마지막에 모두 선택이에요 🙏');

  var FIELDS = ['식품·농산물','뷰티','패션·잡화','반려동물','레슨·코칭·클래스','서비스','콘텐츠·크리에이터'];
  var STEPS = ['하고 싶은 것 정리','남과 다른 점 찾기','누구에게 팔지 정하기','이름 짓기','소개 문구·슬로건','로고·색·디자인','어디서 시작할지'];

  // ── 섹션 1: 시작
  var q1 = form.addMultipleChoiceItem()
    .setTitle('나만의 상품·가게·재능(레슨·코칭 등)을 파는 것과 관련해 나는…').setRequired(true);

  // ── 섹션 2-A: 경험자
  var pbExp = form.addPageBreakItem().setTitle('경험자 질문').setHelpText('실제로 해 보신 경험을 떠올려 주세요.');
  form.addMultipleChoiceItem().setTitle('어떤 분야인가요?').setChoiceValues(FIELDS).showOtherOption(true).setRequired(true);
  form.addCheckboxItem().setTitle('실제로 가장 막막했던 단계는? (여러 개 선택)').setChoiceValues(STEPS).showOtherOption(true).setRequired(true);
  form.addCheckboxItem().setTitle('막힌 이유는? (여러 개 선택)')
    .setChoiceValues(['머릿속엔 있는데 말로 안 나와서','내가 뭘 원하는지 나도 몰라서','차별점이 없는 것 같아서','방법을 몰라서','시간이 없어서','비용이 부담돼서'])
    .showOtherOption(true).setRequired(true);
  form.addScaleItem().setTitle('머릿속엔 생각이 있는데, 막상 남에게 설명하려면 말이 잘 안 나온다')
    .setHelpText('예) "내 상품이 왜 좋은지는 아는데, 소개 글 한 줄을 못 쓰겠다"\n예) "다른 사람과 뭐가 다른지 설명이 안 된다"')
    .setBounds(1,5).setLabels('전혀 그렇지 않다','매우 그렇다').setRequired(true);
  form.addCheckboxItem().setTitle('써 본 도움은? (여러 개 선택)')
    .setChoiceValues(['혼자 고민','지인 조언','책·강의·유튜브','디자이너·대행사','AI(챗GPT 등)','없음']);
  form.addParagraphTextItem().setTitle('그 도움에서 아쉬웠던 점은? (예: 결과가 내 것 같지 않았다)');
  form.addParagraphTextItem().setTitle('멈췄거나 망설였던 가장 큰 이유는? (해당될 때만)');

  // ── 섹션 2-B: 비경험자
  var pbNon = form.addPageBreakItem().setTitle('비경험자 질문').setHelpText('아직 시작하지 않았다면, 시작한다고 상상하며 답해 주세요.');
  form.addMultipleChoiceItem().setTitle('해보고 싶은 분야는?').setChoiceValues(FIELDS).showOtherOption(true).setRequired(true);
  form.addTextItem().setTitle('해보고 싶은 것을 한 줄로 적어 주세요').setHelpText('예) 퇴근 후 기타 레슨, 부모님 사과 온라인 판매');
  form.addCheckboxItem().setTitle('아직 시작하지 못한 이유는? (여러 개 선택)')
    .setChoiceValues(['뭘 할지 확실하지 않아서','내가 잘하는 게 뭔지 몰라서','팔릴지 몰라서','어떻게 시작할지 몰라서','시간이 없어서','돈이 부담돼서','용기가 안 나서'])
    .showOtherOption(true).setRequired(true);
  form.addCheckboxItem().setTitle('시작한다면 가장 어려울 것 같은 단계는? (여러 개 선택)').setChoiceValues(STEPS).showOtherOption(true).setRequired(true);
  form.addScaleItem().setTitle('내가 하고 싶은 것을 남에게 쉽게 설명할 수 있다')
    .setBounds(1,5).setLabels('전혀 그렇지 않다','매우 그렇다').setRequired(true);
  form.addCheckboxItem().setTitle('가장 받고 싶은 도움은? (여러 개 선택)')
    .setChoiceValues(['내가 원하는 것 정리','남과 다른 점 찾기','이름·문구 만들기','디자인 방향','어디서 시작할지','첫 손님 모으는 법'])
    .showOtherOption(true);

  // ── 섹션 3: 공통 아이디어 반응
  var pbCommon = form.addPageBreakItem().setTitle('아이디어 반응')
    .setHelpText('"질문에 답하다 보면 \'내가 원래 생각하던 게 이거였구나\'를 정리해 주고, 왜 그렇게 나왔는지 하나하나 풀어 주고, 어디서 시작할지까지 알려주는 도구"');
  form.addScaleItem().setTitle('이런 도구를 써 보고 싶은 정도').setBounds(1,5).setLabels('전혀','매우').setRequired(true);
  form.addCheckboxItem().setTitle('가장 도움이 될 것 같은 기능은? (여러 개 선택)')
    .setChoiceValues(['생각 정리','요소별 풀이(왜 이렇게 나왔는지)','슬로건·소개 문구','컬러·폰트 추천','시작 플랫폼 추천']);
  form.addParagraphTextItem().setTitle('그렇게 답한 이유는?');
  form.addMultipleChoiceItem().setTitle('앱을 5~10분 써 보는 테스트에 참여해 주실 수 있나요? (온라인으로 가능)').setChoiceValues(['예','아니오']);

  // ── 섹션 4: 선택 정보
  form.addPageBreakItem().setTitle('선택 정보 (모두 선택)')
    .setHelpText('분석·발표에는 익명으로만 사용하고, 연락처는 테스트 안내 후 삭제합니다.');
  form.addTextItem().setTitle('이름 또는 닉네임');
  form.addTextItem().setTitle('직군').setHelpText('예) 마케터, 개발자, 자영업, 학생');
  form.addMultipleChoiceItem().setTitle('연령대').setChoiceValues(['20대','30대','40대','50대','60대 이상']);
  form.addTextItem().setTitle('테스트 참여 시 연락 방법').setHelpText('테스트 안내에만 사용 후 삭제합니다.');

  // ── 분기 설정
  q1.setChoices([
    q1.createChoice('지금 운영 중이다', pbExp),
    q1.createChoice('준비 중이다', pbExp),
    q1.createChoice('시도했다가 멈췄다', pbExp),
    q1.createChoice('해보고 싶은 생각은 있다', pbNon),
    q1.createChoice('생각해 본 적 없다', FormApp.PageNavigationType.SUBMIT)
  ]);
  pbNon.setGoToPage(pbCommon); // 경험자 섹션이 끝나면 비경험자 섹션을 건너뛰고 공통 섹션으로

  Logger.log('편집 링크: ' + form.getEditUrl());
  Logger.log('응답 링크(공유용): ' + form.getPublishedUrl());
}
