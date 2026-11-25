// 강의용 슬라이드와 참여용 페이지가 함께 쓰는 설정
window.LIVE_CONFIG = {
  url: "https://auzgvzddjfkpkyakygnx.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1emd2emRkamZrcGt5YWt5Z254Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyMzI4NzcsImV4cCI6MjA5MTgwODg3N30.TcTiFeutEa89pdlzjLGJ8_oSrfgnEi8Td60QzjLGzyQ",
  defaultRoom: "dodream1"
};

var COLORS = [["R", "빨강", "교훈적 뜻"], ["G", "초록", "기뻐하시는 뜻"], ["B", "파랑", "작정적 뜻"]];
function colorOpts() { return COLORS.map(function (c) { return { v: c[0], label: c[1], sub: c[2] }; }); }

window.LIVE_POLLS = {
  pic:   { type: "one",  q: "지금까지 내가 생각해 온 하나님의 뜻은 어느 그림에 가깝나요?",
           opts: [{ v: "A", label: "A", sub: "숨은그림찾기" }, { v: "B", label: "B", sub: "울타리 안의 들판" }] },
  ox1:   { type: "one",  q: "기도했더니 마음이 평안하다. 그러면 하나님의 뜻이다.", opts: [{ v: "O", label: "O" }, { v: "X", label: "X" }] },
  ox2:   { type: "one",  q: "원하던 학교에서 합격 통지가 왔다. 문이 열렸으니 하나님의 뜻이다.", opts: [{ v: "O", label: "O" }, { v: "X", label: "X" }] },
  ox3:   { type: "one",  q: "확실한 표적이 올 때까지 결정을 미루는 것이 믿음이다.", opts: [{ v: "O", label: "O" }, { v: "X", label: "X" }] },
  card1: { type: "many", q: "상황 카드 1 · 오늘 점심, 짜장면이냐 짬뽕이냐", opts: colorOpts() },
  card2: { type: "many", q: "상황 카드 2 · 비자가 거절되었다", opts: colorOpts() },
  card3: { type: "many", q: "상황 카드 3 · 같은 연구실 친구의 표절을 알게 되었다", opts: colorOpts() },
  card4: { type: "many", q: "상황 카드 4 · 주일에 꼭 돌려야 하는 실험이 있다", opts: colorOpts() },
  card5: { type: "many", q: "상황 카드 5 · 박사 후 한국으로 갈까, 미국에 남을까", opts: colorOpts() },
  card6: { type: "many", q: "상황 카드 6 · 믿음 안에서 만난 사람과 결혼을 생각하는데, 이 사람이 하나님이 정해 두신 \"단 한 사람\"인지 확신이 없다", opts: colorOpts() },
  card7: { type: "many", q: "상황 카드 7 · 부모님은 의대를 원하고, 나는 다른 전공을 원한다", opts: colorOpts() },
  idcard: { type: "private", q: "한 문장 카드" },
  write: { type: "write", q: "지금 붙들고 있는 결정 하나를 적어 보내 주세요." },
  stuck: { type: "one",  q: "다섯 질문 가운데 어디에서 가장 막혔나요?",
           opts: [{ v: "1", label: "1", sub: "말씀" }, { v: "2", label: "2", sub: "지혜" }, { v: "3", label: "3", sub: "욕망 점검" }, { v: "4", label: "4", sub: "공동체" }, { v: "5", label: "5", sub: "기도" }] }
};

window.liveRpc = function (fn, args) {
  var c = window.LIVE_CONFIG;
  return fetch(c.url + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": c.key, "Authorization": "Bearer " + c.key },
    body: JSON.stringify(args || {})
  }).then(function (r) {
    return r.text().then(function (t) {
      var data = t ? JSON.parse(t) : null;
      if (!r.ok) { var e = new Error((data && data.message) || ("http_" + r.status)); e.data = data; throw e; }
      return data;
    });
  });
};
