"""브랜드 스토리 탭 데이터 (테스트용 10개). 내용은 공개 자료 요약 — 발표 전 출처 링크로 사실 확인 필요.
logo: assets/brands/{logo}.svg / photos: 위키미디어 공용 파일 이름 (사진, 설명, 라이선스)"""

# 홈 로고 띠: 위 줄은 오른쪽으로, 아래 줄은 왼쪽으로 흐름
MARQUEE = [["apple", "google", "amazon", "nike", "starbucks", "airbnb", "netflix", "spotify", "tesla", "cocacola", "mcdonalds"],
           ["samsung", "hyundai", "kia", "naver", "kakaotalk", "line", "lg", "adidas", "ikea", "sony", "youtube", "instagram"]]

BRANDS = [
    {"logo": "apple", "name": "애플", "en": "Apple", "since": "1976 · 미국 로스앨토스", "founder": "스티브 잡스 · 스티브 워즈니악",
     "message": "Think different.", "official": True, "keywords": ["단순함", "디자인", "혁신"],
     "story": "잡스의 부모님 집 차고에서 컴퓨터 기판 'Apple I'을 조립해 팔며 시작한 회사로 알려져 있어요. "
              "'복잡한 기술을 누구나 쉽게'라는 생각을 제품·광고·매장까지 한결같이 이어 왔어요.",
     "lesson": "무엇을 파는지보다 '왜' 하는지를 먼저 말하면 팬이 생겨요.",
     "photos": [("Apple_Garage.jpg", "애플이 시작된 로스앨토스의 차고", "CC BY-SA 2.0")],
     "wiki": "https://ko.wikipedia.org/wiki/애플_(기업)"},
    {"logo": "google", "name": "구글", "en": "Google", "since": "1998 · 미국 멘로파크", "founder": "래리 페이지 · 세르게이 브린",
     "message": "세상의 정보를 정리해 누구나 쉽게 쓸 수 있게 한다", "official": True, "keywords": ["검색", "단순함", "호기심"],
     "story": "스탠퍼드 대학원생 두 명이 만든 검색 엔진에서 시작했어요. 첫 사무실은 멘로파크에서 빌린 차고였어요. "
              "첫 화면에 검색창 하나만 두는 단순함이 그대로 브랜드가 됐어요.",
     "lesson": "한 가지를 가장 잘하는 모습이 곧 브랜드가 돼요.",
     "photos": [("Google_garage.JPG", "구글이 처음 빌린 멘로파크의 차고", "CC BY-SA 3.0")],
     "wiki": "https://ko.wikipedia.org/wiki/구글"},
    {"logo": "amazon", "name": "아마존", "en": "Amazon", "since": "1994 · 미국 벨뷰", "founder": "제프 베이조스",
     "message": "지구에서 가장 고객 중심적인 회사", "official": True, "keywords": ["고객 중심", "다양한 선택", "편리함"],
     "story": "집 차고에서 온라인 서점으로 시작했어요. 로고의 화살표는 a에서 z로 이어지는 미소 모양이에요. "
              "'무엇이든 판다'는 뜻과 '고객의 미소'를 함께 담았어요.",
     "lesson": "책 한 종류로 작게 시작해도, 큰 방향을 정해 두면 이야기가 함께 자라요.",
     "photos": [("Amazon's_founding_site_in_Bellevue,_Washington_-_garage.jpg", "아마존이 시작된 벨뷰 집의 차고", "CC BY-SA 4.0"),
                ("Amazon's_founding_site_in_Bellevue,_Washington_-_exterior.jpg", "같은 집의 바깥 모습", "CC BY-SA 4.0")],
     "wiki": "https://ko.wikipedia.org/wiki/아마존_(기업)"},
    {"logo": "nike", "name": "나이키", "en": "Nike", "since": "1964 · 미국 오리건", "founder": "필 나이트 · 빌 바워만",
     "message": "Just Do It.", "official": True, "keywords": ["도전", "운동선수", "승리"],
     "story": "육상 코치와 그 제자였던 선수가 일본 운동화를 들여와 팔며 시작했어요(당시 이름 '블루 리본 스포츠'). "
              "1971년 승리의 여신 '니케'에서 이름을 따 나이키가 됐고, 스우시 로고도 이때 생겼어요.",
     "lesson": "제품 기능보다 '고객이 되고 싶은 모습'을 말하면 마음이 움직여요.",
     "photos": [("Nike_Cortez.jpg", "나이키 초기 대표 운동화 '코르테즈'", "CC0")],
     "wiki": "https://ko.wikipedia.org/wiki/나이키_(기업)"},
    {"logo": "starbucks", "name": "스타벅스", "en": "Starbucks", "since": "1971 · 미국 시애틀", "founder": "제리 볼드윈 · 제브 시글 · 고든 보커",
     "message": "한 사람, 한 잔, 한 이웃에게 영감을", "official": True, "keywords": ["제3의 공간", "커피 경험", "이웃"],
     "story": "시애틀에서 원두를 파는 작은 가게로 시작했어요. 이름은 소설 『모비 딕』의 항해사 '스타벅'에서 따왔어요. "
              "이후 하워드 슐츠가 집과 회사 사이의 '제3의 공간'이라는 경험을 더해 지금의 브랜드가 됐어요.",
     "lesson": "상품(커피)이 아니라 머무는 경험(공간)을 팔 수도 있어요.",
     "photos": [("2013_Original_Starbucks_Coffee_in_Pike_Place_Market_Seattle.jpg", "시애틀 파이크 플레이스 시장의 스타벅스", "CC BY-SA 4.0")],
     "wiki": "https://ko.wikipedia.org/wiki/스타벅스"},
    {"logo": "airbnb", "name": "에어비앤비", "en": "Airbnb", "since": "2008 · 미국 샌프란시스코", "founder": "브라이언 체스키 · 조 게비아 · 네이선 블레차르지크",
     "message": "Belong Anywhere (어디서든 내 집처럼)", "official": True, "keywords": ["소속감", "현지 경험", "신뢰"],
     "story": "2007년 집세가 버거웠던 두 디자이너가, 큰 행사로 호텔이 꽉 찬 틈에 거실에 에어 매트리스를 깔고 손님을 받았어요. "
              "이름도 '에어베드 앤 브렉퍼스트'에서 왔어요.",
     "lesson": "내 불편함을 직접 해결한 경험이 가장 설득력 있는 이야기가 돼요.",
     "photos": [("Airbnb_HQ_(39902444911).jpg", "샌프란시스코의 에어비앤비 본사", "CC BY 2.0")],
     "wiki": "https://ko.wikipedia.org/wiki/에어비앤비"},
    {"logo": "samsung", "name": "삼성", "en": "Samsung", "since": "1938 · 대구", "founder": "이병철",
     "message": "인재와 기술로 최고의 제품을 만들어 인류 사회에 공헌한다", "official": True, "keywords": ["기술", "품질", "세계 무대"],
     "story": "대구의 작은 가게 '삼성상회'에서 청과물과 건어물을 팔며 시작했어요. "
              "'삼성(三星)'에는 크고, 많고, 강하며 영원히 빛나라는 뜻을 담았다고 알려져 있어요.",
     "lesson": "이름에 담은 바람이 오래 가는 방향이 돼요.",
     "photos": [], "wiki": "https://ko.wikipedia.org/wiki/삼성"},
    {"logo": "hyundai", "name": "현대", "en": "Hyundai", "since": "1946 · 서울", "founder": "정주영",
     "message": "New Thinking. New Possibilities.", "official": True, "keywords": ["도전", "진보", "모빌리티"],
     "story": "정주영 창업자는 1940년 서울의 자동차 수리 공장 '아도서비스'를 인수하며 사업을 시작했어요. "
              "1946년 '현대자동차공업사' 간판을 걸었고, 1975년 한국 첫 독자 모델 자동차 '포니'를 내놓았어요.",
     "lesson": "'이봐, 해 봤어?' 같은 창업자의 한마디가 브랜드의 성격이 돼요.",
     "photos": [("1984_Hyundai_Pony_1600GLS.jpg", "현대 포니 (1984년형)", "CC BY-SA 4.0")],
     "wiki": "https://ko.wikipedia.org/wiki/현대그룹"},
    {"logo": "naver", "name": "네이버", "en": "NAVER", "since": "1999 · 한국", "founder": "이해진",
     "message": "찾고 싶은 것을 가장 쉽게", "official": False, "keywords": ["검색", "지식 나눔", "한국어"],
     "story": "삼성SDS의 사내 벤처로 시작해 1999년 독립했어요. 이름은 '항해하다(navigate)'에 '-er'를 붙여 '인터넷 바다를 항해하는 사람'이라는 뜻이에요. "
              "2002년 사람들이 서로 묻고 답하는 '지식iN'으로 크게 자랐어요.",
     "lesson": "고객끼리 도와주는 장을 만들면 브랜드가 함께 커져요.",
     "photos": [], "wiki": "https://ko.wikipedia.org/wiki/네이버"},
    {"logo": "kakaotalk", "name": "카카오", "en": "Kakao", "since": "2006 · 한국", "founder": "김범수",
     "message": "모두를 친근하게 연결하기", "official": False, "keywords": ["연결", "친근함", "캐릭터"],
     "story": "작은 회사 '아이위랩'으로 시작해 여러 서비스를 시도했어요. 2010년 무료 메신저 '카카오톡'이 크게 성공하며 회사 이름도 카카오가 됐어요. "
              "노란 말풍선과 '카카오프렌즈' 캐릭터로 친근한 이미지를 만들었어요.",
     "lesson": "여러 번 시도하다 하나가 맞으면, 거기에 집중해 이름까지 바꿀 수 있어요.",
     "photos": [], "wiki": "https://ko.wikipedia.org/wiki/카카오"},
]
