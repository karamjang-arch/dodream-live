// 강의용 슬라이드의 라이브 기능 (GitHub Pages에서만 동작, 아티팩트에서는 조용히 꺼짐)
// 키: L 강사 로그인(PIN) · R 결과 막대 켜기/끄기 · M 글 관리 · P 승인된 글 보기
(function () {
  if (!window.LIVE_CONFIG || /SUPABASE_URL/.test(LIVE_CONFIG.url)) return;
  var params = new URLSearchParams(location.search);
  var room = (params.get("r") || LIVE_CONFIG.defaultRoom).toLowerCase();
  var joinUrl = location.origin + location.pathname.replace(/[^/]*$/, "") + "join.html?r=" + encodeURIComponent(room);
  var pin = null; try { pin = sessionStorage.getItem("live_pin_" + room); } catch (e) {}
  var online = false, currentPoll = null, showBars = true, countTimer = null;

  var css = document.createElement("style");
  css.textContent = [
    ".slide.lv-on{padding-right:600px!important}",
    ".slide.lv-on .card-q{font-size:52px}",
    ".lv-chip{position:absolute;top:60px;right:40px;width:480px;box-sizing:border-box;z-index:3;display:flex;gap:14px;align-items:center;background:#fff;border:2px solid #D5DBD2;border-radius:16px;padding:12px 16px;font-size:22px;color:#1C2420;box-shadow:0 4px 16px rgba(0,0,0,.08)}",
    ".lv-chip .qr{width:120px;height:120px}",
    ".lv-chip .qr img,.lv-chip .qr canvas{width:120px!important;height:120px!important}",
    ".lv-chip b{font-size:30px;color:#2F6B50}",
    ".lv-chip .warn{display:block;font-size:17px;color:#B23A30;font-weight:700;margin-top:4px}",
    ".lv-bars{position:absolute;right:40px;top:240px;width:480px;box-sizing:border-box;z-index:3;background:rgba(255,255,255,.97);border:2px solid #D5DBD2;border-radius:16px;padding:20px 22px;display:flex;flex-direction:column;gap:14px}",
    ".lv-row{display:grid;grid-template-columns:140px 1fr 74px;gap:12px;align-items:center;font-size:24px}",
    ".lv-row .tr{height:26px;background:#EEF1EC;border-radius:13px;overflow:hidden}",
    ".lv-row .fl{height:100%;border-radius:13px;background:#2F6B50;transition:width .4s}",
    ".lv-row .pc{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}",
    ".lv-cover{position:absolute;right:120px;bottom:110px;z-index:3;background:#fff;border-radius:18px;padding:18px;text-align:center;color:#1C2420;font-size:22px}",
    ".lv-cover .qr img,.lv-cover .qr canvas{width:240px!important;height:240px!important}",
    ".lv-panel{position:fixed;inset:0;z-index:20;background:rgba(28,36,32,.96);color:#F4F6F2;overflow:auto;padding:24px max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));font-family:'Noto Sans KR',sans-serif}",
    ".lv-panel h3{margin:0 0 12px;font-size:20px}",
    ".lv-panel .row{background:#F4F6F2;color:#1C2420;border-radius:10px;padding:12px 14px;margin:0 0 10px;display:flex;gap:12px;align-items:flex-start;max-width:900px}",
    ".lv-panel .row p{margin:0;flex:1;font-size:17px;line-height:1.5;word-break:keep-all}",
    ".lv-panel .row small{display:block;color:#5E6963;font-size:13px}",
    ".lv-panel button{font:inherit;font-size:15px;border:0;border-radius:8px;padding:8px 12px;cursor:pointer}",
    ".lv-ok{background:#2F6B50;color:#fff}.lv-no{background:#D5DBD2;color:#1C2420}",
    ".lv-panel input{font:inherit;font-size:20px;padding:10px 12px;border-radius:8px;border:0;width:200px}",
    ".lv-wall{position:absolute;inset:0;z-index:4;background:#F4F6F2;padding:70px 100px;display:flex;flex-direction:column;gap:24px}",
    ".lv-wall .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;overflow:hidden}",
    ".lv-wall .it{background:#fff;border:2px solid #D5DBD2;border-radius:14px;padding:22px 26px;font-size:30px;line-height:1.5;cursor:pointer;word-break:keep-all}",
    ".lv-wall .it small{display:block;font-size:20px;color:#2F6B50;font-weight:700;margin-bottom:6px}",
    ".lv-wall .one{font-size:56px;font-weight:700;line-height:1.5;max-width:1300px}"
  ].join("\n");
  document.head.appendChild(css);

  function stopClicks(el) { el.addEventListener("click", function (e) { e.stopPropagation(); }); return el; }
  function qr(el, size) {
    if (!window.QRCode) return;
    el.innerHTML = ""; new QRCode(el, { text: joinUrl, width: size, height: size, correctLevel: QRCode.CorrectLevel.M });
  }
  function err(e) { return (e && e.message) || "error"; }

  // ---------- 화면 위 요소
  var chip = stopClicks(document.createElement("div")); chip.className = "lv-chip"; chip.hidden = true;
  chip.innerHTML = '<div class="qr"></div><div>참여 <b class="n">0</b>명<br><span style="font-size:18px;color:#5E6963">QR로 함께하기</span><span class="warn">L 키로 강사 로그인</span></div>';
  function paintWarn() { chip.querySelector(".warn").hidden = !!pin; }
  var bars = stopClicks(document.createElement("div")); bars.className = "lv-bars"; bars.hidden = true;
  var cover = stopClicks(document.createElement("div")); cover.className = "lv-cover"; cover.hidden = true;
  cover.innerHTML = '<div class="qr"></div><div style="margin-top:10px;font-weight:700">휴대폰으로 함께하기</div>';
  var stage = document.getElementById("stage");
  stage.appendChild(chip); stage.appendChild(bars); stage.appendChild(cover);
  setTimeout(function () { qr(chip.querySelector(".qr"), 120); qr(cover.querySelector(".qr"), 240); }, 300);

  // ---------- 슬라이드 바뀔 때
  document.addEventListener("slidechange", function (ev) {
    var sl = ev.detail.slide, poll = sl.getAttribute("data-poll");
    cover.hidden = !(online && sl.classList.contains("cover") && ev.detail.index === 0);
    if (poll && LIVE_POLLS[poll]) openPoll(poll); else closePoll();
    if (wall && !wall.hidden && !sl.hasAttribute("data-posts")) wall.hidden = true;
  });

  var padded = null;
  function openPoll(poll) {
    if (padded) padded.classList.remove("lv-on");
    padded = document.querySelector(".slide.on"); if (online && padded) padded.classList.add("lv-on");
    paintWarn();
    currentPoll = poll; chip.hidden = !online; bars.hidden = !(online && showBars);
    renderBars(null);
    if (pin) liveRpc("live_host_set", { p_room: room, p_pin: pin, p_poll: poll, p_open: true }).catch(function () {});
    clearInterval(countTimer); countTimer = setInterval(fetchCounts, 1500); fetchCounts();
  }
  function closePoll() {
    if (currentPoll && pin) liveRpc("live_host_set", { p_room: room, p_pin: pin, p_poll: null, p_open: false }).catch(function () {});
    if (padded) { padded.classList.remove("lv-on"); padded = null; }
    currentPoll = null; chip.hidden = true; bars.hidden = true; clearInterval(countTimer);
  }
  function fetchCounts() {
    if (!currentPoll) return;
    var p = currentPoll;
    liveRpc("live_counts", { p_room: room, p_poll: p }).then(function (rows) {
      if (p !== currentPoll) return; online = true; renderBars(rows || []);
      if (padded && !padded.classList.contains("lv-on")) padded.classList.add("lv-on");
      chip.hidden = false; bars.hidden = !showBars;
    }).catch(function () {});
  }
  var COLOR = { R: "#B23A30", G: "#2E7D4F", B: "#2C5D88" };
  function renderBars(rows) {
    var p = LIVE_POLLS[currentPoll]; if (!p) return;
    var map = {}, total = 0;
    (rows || []).forEach(function (r) { map[r.choice] = r.n; total = r.total; });
    chip.querySelector(".n").textContent = total;
    bars.innerHTML = "";
    var head = document.createElement("div"); head.style.cssText = "font-size:20px;color:#5E6963";
    head.textContent = p.type === "many" ? "여러 개 고를 수 있습니다 · " + total + "명" : total + "명 응답";
    bars.appendChild(head);
    p.opts.forEach(function (o) {
      var n = map[o.v] || 0, pc = total ? Math.round(n * 100 / total) : 0;
      var row = document.createElement("div"); row.className = "lv-row";
      var lab = document.createElement("div"); lab.textContent = p.type === "many" ? o.label : o.label + (o.sub && p.opts.length > 2 ? " " + o.sub : "");
      lab.style.fontWeight = "700"; if (COLOR[o.v] && p.type === "many") lab.style.color = COLOR[o.v];
      var tr = document.createElement("div"); tr.className = "tr";
      var fl = document.createElement("div"); fl.className = "fl"; fl.style.width = pc + "%"; if (COLOR[o.v] && p.type === "many") fl.style.background = COLOR[o.v];
      tr.appendChild(fl);
      var pcel = document.createElement("div"); pcel.className = "pc"; pcel.textContent = pc + "%";
      row.appendChild(lab); row.appendChild(tr); row.appendChild(pcel); bars.appendChild(row);
    });
  }

  // ---------- 강사 패널 (L: 로그인, M: 글 관리)
  var panel = document.createElement("div"); panel.className = "lv-panel"; panel.hidden = true; document.body.appendChild(panel);
  panel.addEventListener("keydown", function (e) { e.stopPropagation(); });
  panel.addEventListener("click", function (e) { e.stopPropagation(); });
  function showLogin() {
    panel.innerHTML = '<h3>강사 로그인 · 방 ' + room + '</h3><p style="margin:0 0 12px">PIN을 넣으면 슬라이드를 넘길 때 휴대폰 질문이 자동으로 열리고 닫힙니다.</p>' +
      '<input type="password" inputmode="numeric" autocomplete="off" placeholder="PIN"> <button class="lv-ok">확인</button> <button class="lv-no">닫기</button><p class="msg"></p>';
    panel.hidden = false;
    var inp = panel.querySelector("input"); inp.focus();
    function go() {
      var v = inp.value.trim();
      liveRpc("live_host_posts", { p_room: room, p_pin: v }).then(function () {
        pin = v; try { sessionStorage.setItem("live_pin_" + room, v); } catch (e) {}
        online = true; inp.blur(); panel.hidden = true; paintWarn();
        if (currentPoll) liveRpc("live_host_set", { p_room: room, p_pin: pin, p_poll: currentPoll, p_open: true }).catch(function () {});
      }).catch(function (e) { panel.querySelector(".msg").textContent = /bad_pin/.test(err(e)) ? "PIN이 맞지 않습니다." : "연결되지 않았습니다: " + err(e); });
    }
    panel.querySelector(".lv-ok").onclick = go;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    panel.querySelector(".lv-no").onclick = function () { panel.hidden = true; };
  }
  var armedReset = false;
  function showManage() {
    if (!pin) { showLogin(); return; }
    panel.hidden = false;
    panel.innerHTML = '<h3>보낸 글 관리 · 방 ' + room + ' <button class="lv-no" data-a="close">닫기 (M)</button> <button class="lv-no" data-a="reload">새로고침</button> <button class="lv-no" data-a="reset">이 회차 초기화</button></h3><div class="list">불러오는 중...</div>';
    panel.querySelector('[data-a="close"]').onclick = function () { panel.hidden = true; };
    panel.querySelector('[data-a="reload"]').onclick = showManage;
    var rb = panel.querySelector('[data-a="reset"]');
    rb.onclick = function () {
      if (!armedReset) { armedReset = true; rb.textContent = "정말 지울까요? 한 번 더 누르세요"; rb.style.background = "#B23A30"; rb.style.color = "#fff"; return; }
      armedReset = false;
      liveRpc("live_host_reset", { p_room: room, p_pin: pin }).then(showManage).catch(function (e) { alert(err(e)); });
    };
    liveRpc("live_host_posts", { p_room: room, p_pin: pin }).then(function (rows) {
      var list = panel.querySelector(".list"); list.innerHTML = "";
      if (!rows.length) { list.textContent = "아직 보낸 글이 없습니다."; return; }
      rows.forEach(function (r) {
        var row = document.createElement("div"); row.className = "row";
        var p = document.createElement("p");
        var sm = document.createElement("small");
        sm.textContent = (r.kind === "decision" ? "내 결정" : "질문") + " · " + ({ pending: "대기", approved: "화면에 보임", hidden: "숨김" })[r.status];
        p.appendChild(sm); p.appendChild(document.createTextNode(r.body));
        var ok = document.createElement("button"); ok.className = "lv-ok"; ok.textContent = "보이기";
        var no = document.createElement("button"); no.className = "lv-no"; no.textContent = "숨기기";
        ok.onclick = function () { mod(r.id, "approved"); }; no.onclick = function () { mod(r.id, "hidden"); };
        row.appendChild(p); if (r.status !== "approved") row.appendChild(ok); if (r.status !== "hidden") row.appendChild(no);
        list.appendChild(row);
      });
    }).catch(function (e) { panel.querySelector(".list").textContent = "불러오지 못했습니다: " + err(e); });
  }
  function mod(id, st) { liveRpc("live_host_moderate", { p_room: room, p_pin: pin, p_id: id, p_status: st }).then(showManage); }

  // ---------- 승인된 글 벽 (P)
  var wall = stopClicks(document.createElement("div")); wall.className = "lv-wall"; wall.hidden = true; stage.appendChild(wall);
  function showWall() {
    wall.hidden = false;
    wall.innerHTML = '<div class="eyebrow" style="font-size:24px;color:#2F6B50;font-weight:700;letter-spacing:.12em">함께 분별하기 · 우리의 질문과 결정</div><div class="grid">불러오는 중...</div><div class="help" style="font-size:20px;color:#5E6963">글을 누르면 크게 봅니다 · P 닫기</div>';
    liveRpc("live_approved", { p_room: room }).then(function (rows) {
      var g = wall.querySelector(".grid"); g.innerHTML = "";
      if (!rows.length) { g.textContent = "아직 화면에 올린 글이 없습니다."; return; }
      rows.slice(-6).forEach(function (r) {
        var it = document.createElement("div"); it.className = "it";
        var s = document.createElement("small"); s.textContent = r.kind === "decision" ? "결정" : "질문";
        it.appendChild(s); it.appendChild(document.createTextNode(r.body));
        it.onclick = function () {
          wall.innerHTML = ""; var o = document.createElement("div"); o.className = "one"; o.textContent = r.body;
          var h = document.createElement("div"); h.className = "help"; h.style.cssText = "font-size:20px;color:#5E6963"; h.textContent = "누르면 목록으로 돌아갑니다";
          wall.appendChild(o); wall.appendChild(h); wall.onclick = function (e) { e.stopPropagation(); wall.onclick = null; showWall(); };
        };
        g.appendChild(it);
      });
    }).catch(function (e) { wall.querySelector(".grid").textContent = "불러오지 못했습니다: " + err(e); });
  }

  // ---------- 키 (슬라이드 키보다 먼저 받음)
  window.addEventListener("keydown", function (e) {
    var t = e.target && e.target.tagName;
    if ((t === "INPUT" || t === "TEXTAREA") && !panel.hidden) return;
    if (t === "INPUT" || t === "TEXTAREA") e.target.blur();
    var k = e.key.toLowerCase();
    if (!panel.hidden && k !== "m" && k !== "escape") { e.stopPropagation(); return; }
    if (["l","m","r","p"].indexOf(k) > -1 && !e.ctrlKey && !e.metaKey) e.preventDefault();
    if (k === "l") { e.stopPropagation(); showLogin(); }
    else if (k === "m") { e.stopPropagation(); if (panel.hidden) showManage(); else panel.hidden = true; }
    else if (k === "escape" && !panel.hidden) { e.stopPropagation(); panel.hidden = true; }
    else if (k === "r") { e.stopPropagation(); showBars = !showBars; bars.hidden = !(showBars && currentPoll && online); }
    else if (k === "p") { e.stopPropagation(); if (wall.hidden) showWall(); else wall.hidden = true; }
  }, true);

  // 처음 연결 확인 (표지의 QR)
  liveRpc("live_state", { p_room: room }).then(function () {
    online = true;
    var first = document.querySelector(".slide.on");
    if (first) document.dispatchEvent(new CustomEvent("slidechange", { detail: { slide: first, index: [].indexOf.call(document.querySelectorAll(".slide"), first) } }));
  }).catch(function () {});
})();
