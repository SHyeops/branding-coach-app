/**
 * 사용법: script.google.com → 새 프로젝트 → 이 코드 전체 붙여넣기 → 저장 → ▶ 실행(createSurvey)
 * 처음 실행 시 권한 허용 필요. 실행 후 '실행 로그'에 설문 링크 2개(편집용/응답용)가 나옵니다.
 */
function createSurvey() {
  var form = FormApp.create('브랜드를 꿈꿔본 적 있나요? (3분 설문)');
  form.setDescription('수업 프로젝트로 "내 생각을 정리해 브랜드로 만들어 주는 도구"를 만들고 있어요.\n익명으로 받으며, 결과는 프로젝트에만 사용합니다. 3~5분 걸려요 🙏');

  // 섹션 1
  var q1 = form.addMultipleChoiceItem().setTitle('브랜드·가게·상품과 관련해 나는…').setRequired(true);
  var q2 = form.addMultipleChoiceItem().setTitle('어떤 분야인가요?').setRequired(true)
    .setChoiceValues(['식품·농산물','뷰티','패션·잡화','반려동물','서비스·교육','콘텐츠·크리에이터']).showOtherOption(true);

  // 섹션 2
  var sec2 = form.addPageBreakItem().setTitle('막혔던 순간');
  form.addCheckboxItem().setTitle('가장 막막했던(막막할 것 같은) 단계는? (여러 개 선택)').setRequired(true)
    .setChoiceValues(['왜 하는지·무엇을 하고 싶은지 정리','남과 다른 점 찾기','누구에게 팔지 정하기','이름 짓기','소개 문구·슬로건','로고·색·디자인','어디에 어떻게 알릴지']).showOtherOption(true);
  form.addCheckboxItem().setTitle('막힌 이유는? (여러 개 선택)').setRequired(true)
    .setChoiceValues(['머릿속엔 있는데 말로 안 나와서','내가 뭘 원하는지 나도 몰라서','차별점이 없는 것 같아서','방법을 몰라서','시간이 없어서','비용이 부담돼서']).showOtherOption(true);
  form.addScaleItem().setTitle('"하고 싶은 건 있는데, 말이나 글로 정리가 잘 안 된다"').setBounds(1,5)
    .setLabels('전혀 아니다','매우 그렇다').setRequired(true);
  form.addParagraphTextItem().setTitle('멈췄거나 망설였던 가장 큰 이유는? (해당될 때만)');

  // 섹션 3
  form.addPageBreakItem().setTitle('도움 받은 경험');
  form.addCheckboxItem().setTitle('써본 방법은? (여러 개 선택)')
    .setChoiceValues(['혼자 고민','지인 조언','책·강의·유튜브','디자이너·대행사','AI(챗GPT 등)','없음']);
  form.addParagraphTextItem().setTitle('그 방법에서 아쉬웠던 점은? (예: 결과가 내 것 같지 않았다)');

  // 섹션 4
  form.addPageBreakItem().setTitle('아이디어 반응')
    .setHelpText('"질문에 답하다 보면 내가 원래 생각하던 게 이거였구나를 정리해 주고, 그걸 어떻게 활용할지까지 알려주는 도구"');
  form.addScaleItem().setTitle('이런 도구를 써보고 싶은 정도').setBounds(1,5).setLabels('전혀','매우').setRequired(true);
  form.addParagraphTextItem().setTitle('그렇게 답한 이유는?');
  form.addMultipleChoiceItem().setTitle('10~15분 테스트에 참여해 주실 수 있나요?').setChoiceValues(['예','아니오']);
  form.addTextItem().setTitle('(선택) 참여 가능하면 연락 방법').setHelpText('테스트 안내에만 사용하고 프로젝트 자료에는 넣지 않아요.');

  // 분기: '해당 없음'은 바로 제출
  q1.setChoices([
    q1.createChoice('지금 운영 중이다', FormApp.PageNavigationType.CONTINUE),
    q1.createChoice('준비 중이다', FormApp.PageNavigationType.CONTINUE),
    q1.createChoice('언젠가 해보고 싶다 (꿈꿔봄)', FormApp.PageNavigationType.CONTINUE),
    q1.createChoice('시도했다가 멈췄다', FormApp.PageNavigationType.CONTINUE),
    q1.createChoice('해당 없음', FormApp.PageNavigationType.SUBMIT)
  ]);

  Logger.log('편집 링크: ' + form.getEditUrl());
  Logger.log('응답 링크(공유용): ' + form.getPublishedUrl());
}
