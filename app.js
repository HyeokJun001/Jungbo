// ===== 정처기 실기 이론 암기앱 (localStorage, 백엔드 나중에) =====
QUESTIONS.forEach((q, i) => { q.id = i; });

const LS = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
};
const KEY_BM = "jcgi_bookmark", KEY_PENALTY = "jcgi_penalty3", KEY_HISTORY = "jcgi_history";
const penaltyOn = () => LS.get(KEY_PENALTY, false);
// 틀렸을 때 target 문장을 3번 정확히 써야 nextBtn 활성화
// 입력이 target과 어디까지 일치하는지(관대: ·=쉼표, 공백 유연) → {pos, mode}
function penaltyDiff(input, target){
  const isSp = c => /\s/.test(c);
  const same = (a,b) => (a==="·"?",":a) === (b==="·"?",":b);
  let i=0, t=0;
  while(t<target.length && i<input.length){
    if(isSp(target[t])){ while(i<input.length&&isSp(input[i]))i++; while(t<target.length&&isSp(target[t]))t++; continue; }
    if(isSp(input[i])){ i++; continue; }
    if(same(input[i], target[t])){ i++; t++; } else break;
  }
  while(t<target.length && isSp(target[t])) t++;
  let mode;
  if(t>=target.length) mode = (i<input.length) ? "extra" : "done";
  else mode = (i>=input.length) ? "incomplete" : "wrong";
  return { pos:t, mode };
}
function penaltyDiffHtml(target, pos, mode){
  const ok = `<span class="d-ok">${escapeHtml(target.slice(0,pos))}</span>`;
  if(mode==="done") return ok;
  if(mode==="incomplete") return ok + `<span class="d-rest">${escapeHtml(target.slice(pos))}</span>`;
  if(mode==="extra") return ok + `<span class="d-bad"> ⟵ 여기서 끝</span>`;
  return ok + `<span class="d-bad">${escapeHtml(target.slice(pos,pos+1)||"·")}</span><span class="d-rest">${escapeHtml(target.slice(pos+1))}</span>`;
}
function buildPenalty(areaEl, nextBtn, target){
  let done = 0; const NEED = 3;
  // 가운뎃점(·)은 쉼표와 동일 취급, 공백은 전부 무시(띄어쓰기 달라도 통과) — diff와 기준 통일
  const clean = s => (s||"").replace(/·/g, ",").replace(/\s+/g, "");
  nextBtn.disabled = true;
  areaEl.innerHTML = `<div class="penalty-box">
    <div class="ptitle">✍️ 아래 문장을 <b>3번</b> 정확히 써야 다음으로 넘어갈 수 있어요 <b class="pcnt">0 / 3</b></div>
    <div class="ptarget"></div>
    <div class="answer-row"><input class="pinput" placeholder="위 문장을 그대로 입력하세요" autocomplete="off"/>
      <button class="submit pbtn">쓰기</button></div>
    <div class="pmsg"></div></div>`;
  areaEl.querySelector(".ptarget").textContent = target;
  const inp = areaEl.querySelector(".pinput"), msg = areaEl.querySelector(".pmsg"), cnt = areaEl.querySelector(".pcnt");
  const tgtEl = areaEl.querySelector(".ptarget");
  const submit = () => {
    if(clean(inp.value) === clean(target)){
      done++; cnt.textContent = `${done} / ${NEED}`; inp.value = "";
      tgtEl.textContent = target; // 다음 회차용 초기화
      if(done >= NEED){
        nextBtn.disabled = false; inp.disabled = true;
        msg.innerHTML = `<div class="result ok" style="margin-top:10px">✅ 다 썼어요! 이제 다음으로 넘어갈 수 있어요.</div>`;
      } else {
        msg.innerHTML = `<span class="pgood">좋아요! ${NEED-done}번 더 쓰면 돼요.</span>`;
      }
    } else {
      const d = penaltyDiff(inp.value, target);
      tgtEl.innerHTML = penaltyDiffHtml(target, d.pos, d.mode); // 틀린 지점 색으로 표시
      msg.innerHTML = d.mode === "incomplete"
        ? `<span class="pbad">초록색까지 맞았어요. 이어서 끝까지 써주세요.</span>`
        : `<span class="pbad">빨간 부분이 달라요. 그 앞(초록색)까지는 맞았어요.</span>`;
    }
    inp.focus();
  };
  // 한컴타자연습식 실시간 색칠: 맞은 만큼 초록, 틀리는 지점 빨강
  const live = () => {
    if(inp.disabled) return;
    const v = inp.value;
    if(!v){ tgtEl.textContent = target; return; }
    if(clean(v) === clean(target)){ tgtEl.innerHTML = penaltyDiffHtml(target, target.length, "done"); return; }
    const d = penaltyDiff(v, target);
    tgtEl.innerHTML = penaltyDiffHtml(target, d.pos, d.mode);
  };
  let composing = false;
  inp.addEventListener("compositionstart", () => { composing = true; });
  inp.addEventListener("compositionend", () => { composing = false; live(); }); // 한글 글자 완성 시 갱신
  inp.addEventListener("input", () => { if(!composing) live(); });              // 영문·숫자·백스페이스 등
  areaEl.querySelector(".pbtn").addEventListener("click", submit);
  inp.addEventListener("keydown", e => { if(e.key === "Enter") submit(); });
  inp.focus();
}

// ---- 채점 유틸 ----
const norm = s => (s||"").toString().toLowerCase().replace(/\s+/g,"").replace(/[·\-_.,()]/g,"");
function grade(q, input){
  const raw = (input||"").trim().toLowerCase();
  if(q.match !== "set" && q.a.some(a => a.trim().toLowerCase() === raw)) return true; // 기호 답(--,* 등) 원문 일치
  const ni = norm(input);
  if(!ni) return false;
  if(q.match === "set") return q.setAnswers.every(t => ni.includes(norm(t)));
  return q.a.some(a => { const na = norm(a); return na === ni || (na.length >= 2 && ni.includes(na)); });
}
// 용어 사전 조회: 정답 후보들 중 사전에 있는 첫 항목의 {term, full, desc} 반환
let _glossNorm = null;
function glossLookup(answers){
  if(typeof GLOSSARY === "undefined") return null;
  for(const a of answers){ if(GLOSSARY[a]) return { term:a, ...GLOSSARY[a] }; }
  if(!_glossNorm){ _glossNorm = {}; for(const k in GLOSSARY) _glossNorm[norm(k)] = { term:k, ...GLOSSARY[k] }; }
  for(const a of answers){ const hit = _glossNorm[norm(a)]; if(hit) return hit; }
  return null;
}
// 벌칙으로 3번 쓸 문장: "정답 : 설명" (설명은 사전 우선, 없으면 문제 지문)
function penaltyText(q){
  const ans = q.match==="set" ? q.setAnswers.join(", ") : q.a[0];
  const g = glossLookup(q.match==="set" ? q.setAnswers : q.a);
  const desc = g ? g.desc : (q.q || "").replace(/\s*\?.*$/, "").trim();
  return `${ans} : ${desc}`;
}
// 정답이 문제 지문 안에 들어있는지 자동 감지
function answerInQ(q){
  if(q.match === "set") return false;
  const nq = norm(q.q);
  return q.a.some(a => norm(a).length >= 2 && nq.includes(norm(a)));
}

// ---- 저장소 헬퍼 ----
const bookmarks = () => LS.get(KEY_BM, []);
function toggleBookmark(id){
  const b = bookmarks(); const i = b.indexOf(id);
  if(i >= 0) b.splice(i,1); else b.push(id);
  LS.set(KEY_BM, b); return b.includes(id);
}
// 단일 기록 저장소: 문제별 최신 시도 1건 {id,q,theme,sector,mine,answer,ok,date}
function history(){ return LS.get(KEY_HISTORY, []); }
function recordAttempt(q, mine, ok){
  const h = history().filter(r => r.id !== q.id); // 같은 문제는 최신 시도로 갱신
  h.unshift({ id:q.id, q:q.q, theme:q.theme, sector:q.sector, mine,
    answer:(q.match==="set" ? q.setAnswers.join(", ") : q.a[0]), ok,
    date:new Date().toISOString().slice(0,10) });
  LS.set(KEY_HISTORY, h);
}

// ---- 라우팅 ----
const app = document.getElementById("app");
const TABS = [
  ["home","홈"], ["search","🔍 검색"], ["random","랜덤 문제"], ["study","섹터별 공부"],
  ["sectorquiz","섹터별 문제"], ["blanks","빈칸 채우기"],
  ["history","📋 기록"], ["bookmark","북마크"],
];
function renderTabs(active){
  return `<nav class="tabs">${TABS.map(([k,l])=>
    `<button data-go="${k}" class="${k===active?'active':''}">${l}</button>`).join("")}</nav>`;
}
let sessionState = null;

function go(view, arg){
  window.scrollTo(0,0);
  if(view==="home") return renderHome();
  if(view==="random") return startQuiz(shuffle(QUESTIONS.slice()), "랜덤 문제", "random");
  if(view==="study") return renderSectorList("study");
  if(view==="sectorquiz") return renderSectorList("sectorquiz");
  if(view==="theory") return renderTheory(arg);
  if(view==="blanks") return renderBlanks();
  if(view==="history" || view==="wrong" || view==="solved") return renderHistory();
  if(view==="bookmark") return renderBookmark();
  if(view==="search") return renderSearch();
}
function bindTabs(){
  app.querySelectorAll("[data-go]").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.go, b.dataset.arg)));
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ---- 홈 ----
function renderHome(){
  const hist = history(), bm = bookmarks().length;
  const solved = hist.filter(r=>r.ok).length, wrong = hist.length - solved;
  app.innerHTML = `
  <header class="top"><div class="top-inner">
    <div class="brand"><h1>📘 정처기 실기 이론</h1><span class="sub">주관식 암기 트레이너</span></div>
    ${renderTabs("home")}
  </div></header>
  <div class="wrap">
    <div class="hero"><h2>설명을 읽고, 용어를 직접 써보세요</h2>
      <p>객관식이 아닌 주관식. 시험장처럼 손으로 답을 떠올리는 연습.</p></div>
    <div class="stats">
      <div class="stat"><b>${QUESTIONS.length}</b><span>전체 문제</span></div>
      <div class="stat"><b>${solved}</b><span>맞춘 문제</span></div>
      <div class="stat"><b>${wrong}</b><span>틀린 문제</span></div>
      <div class="stat"><b>${bm}</b><span>북마크</span></div>
    </div>
    <div class="grid">
      <button class="card" data-go="search"><div class="ic">🔍</div><h3>검색</h3><p>용어·설명으로 문제 찾기</p></button>
      <button class="card" data-go="random"><div class="ic">🎲</div><h3>랜덤 문제 풀기</h3><p>전체에서 무작위로 계속 출제</p></button>
      <button class="card" data-go="study"><div class="ic">📖</div><h3>섹터별 이론 공부</h3><p>섹터를 골라 이론 정리 읽기</p></button>
      <button class="card" data-go="sectorquiz"><div class="ic">✏️</div><h3>섹터별 문제 풀기</h3><p>한 섹터만 집중 훈련</p></button>
      <button class="card" data-go="blanks"><div class="ic">🧩</div><h3>빈칸 채우기</h3><p>이론 문장의 핵심어 채우기</p></button>
      <button class="card" data-go="history"><div class="ic">📋</div><h3>기록 · 복기</h3><p>맞은·틀린 문제 바로 복습</p></button>
      <button class="card" data-go="bookmark"><div class="ic">⭐</div><h3>북마크</h3><p>별표해 둔 문제 모음</p></button>
    </div>
  </div>`;
  bindTabs();
}

// ---- 섹터 목록 ----
function renderSectorList(mode){
  const items = SECTORS.map(s => {
    const cnt = QUESTIONS.filter(q => q.sector === s).length;
    const arg = mode==="study" ? "theory" : "sectorquiz-run";
    return `<button class="sector-item" data-sector="${s}" data-mode="${mode}">
      <span>${s}</span><span class="cnt">${cnt}문제</span></button>`;
  }).join("");
  app.innerHTML = `
  <header class="top"><div class="top-inner">
    <div class="brand"><h1>📘 정처기 실기 이론</h1></div>${renderTabs(mode)}
  </div></header>
  <div class="wrap">
    <h2 class="section-title">${mode==="study"?"섹터별 이론 공부":"섹터별 문제 풀기"}</h2>
    <p class="section-desc">${mode==="study"?"섹터를 선택하면 이론 요약을 볼 수 있어요.":"섹터를 선택하면 그 섹터 문제만 랜덤 출제돼요."}</p>
    <div class="sector-list">${items}</div>
  </div>`;
  bindTabs();
  app.querySelectorAll(".sector-item").forEach(b => b.addEventListener("click", () => {
    const s = b.dataset.sector;
    if(b.dataset.mode === "study") renderTheory(s);
    else startQuiz(shuffle(QUESTIONS.filter(q => q.sector === s)), s, "sectorquiz");
  }));
}

// ---- 이론 공부 ----
// 해당 섹터 문제의 정답·키워드를 모아 이론 본문에서 자동으로 빨간 강조
function theoryTerms(sector){
  const set = new Set();
  QUESTIONS.filter(q => q.sector === sector).forEach(q => {
    (q.a||[]).forEach(a => set.add(a));
    (q.setAnswers||[]).forEach(a => set.add(a));
    (q.keywords||[]).forEach(k => set.add(k));
  });
  return [...set]
    .filter(t => t && t.trim().length >= 2 && /[가-힣A-Za-z0-9]/.test(t))
    .sort((a,b) => b.length - a.length); // 긴 것부터 우선 매칭
}
function escRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function hlTheory(text, terms){
  const html = escapeHtml(text);
  if(!terms.length) return html;
  const re = new RegExp(terms.map(escRe).join("|"), "g");
  return html.replace(re, m => `<span class="kw">${m}</span>`);
}
function renderTheory(sector){
  const terms = theoryTerms(sector);
  const blocks = (THEORY[sector]||[]).map(x =>
    `<div class="item"><b>${escapeHtml(x.t)}</b><p>${hlTheory(x.b, terms)}</p>${x.code?`<pre>${escapeHtml(x.code)}</pre>`:""}${x.tip?`<p class="tip">🧠 암기팁 — ${escapeHtml(x.tip)}</p>`:""}</div>`).join("");
  app.innerHTML = `
  <header class="top"><div class="top-inner">
    <div class="brand"><h1>📖 ${sector}</h1></div>${renderTabs("study")}
  </div></header>
  <div class="wrap">
    <button class="bigbtn sub" id="back" style="background:transparent;border:1px solid var(--line);color:var(--muted);margin-bottom:10px">← 섹터 목록으로</button>
    <button class="bigbtn sub" id="toq">✏️ 이 섹터 문제 풀러 가기</button>
    <div class="theory-block"><h3>${sector}</h3>${blocks || "<p>준비 중</p>"}</div>
  </div>`;
  bindTabs();
  document.getElementById("back").addEventListener("click", () => renderSectorList("study"));
  document.getElementById("toq").addEventListener("click", () =>
    startQuiz(shuffle(QUESTIONS.filter(q => q.sector === sector)), sector, "sectorquiz"));
}

// ---- 퀴즈 엔진 ----
function startQuiz(list, title, backView){
  if(!list.length){ app.innerHTML = `<div class="wrap"><div class="empty">문제가 없습니다.</div></div>`; return; }
  sessionState = { list, i:0, title, backView, answered:false, results:{} };
  renderQuiz();
}
function renderQuiz(){
  const S = sessionState, q = S.list[S.i];
  const pct = Math.round((S.i)/S.list.length*100);
  const starred = bookmarks().includes(q.id);
  app.innerHTML = `
  <header class="top"><div class="top-inner">
    <div class="brand"><h1>📘 ${S.title}</h1></div>${renderTabs("")}
  </div></header>
  <div class="wrap">
    <div class="quiz-head"><span class="meta">${S.i+1} / ${S.list.length}</span>
      <span style="display:flex;gap:8px">
        <button id="stopBtn" style="border:1px solid var(--no);color:var(--no);background:var(--panel);padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:700">⏹ 그만하기</button>
        <button class="tools-back" data-go="home" style="border:1px solid var(--line);background:var(--panel);padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:600">← 홈</button>
      </span></div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <label class="penalty-toggle"><input type="checkbox" id="penaltyChk" ${penaltyOn()?"checked":""}/>
      <span class="track"></span> ✍️ 틀리면 정답 3번 쓰기</label>
    <div class="qcard">
      <span class="chip">${q.sector} · ${q.theme}</span>
      <p class="qtext" id="qtext">${escapeHtml(q.q)}</p>
      <div class="answer-row">
        <input id="ans" placeholder="정답을 입력하세요" autocomplete="off" ${S.answered?"disabled":""}/>
        <button class="submit" id="submit">확인</button>
      </div>
      <div class="tools">
        <button id="hintBtn">💡 힌트</button>
        <button id="kwBtn">🔴 중점 키워드</button>
        <button id="starBtn" class="star ${starred?'on':''}">⭐ ${starred?"북마크됨":"북마크"}</button>
      </div>
      <div id="hintArea"></div>
      <div id="resultArea"></div>
      <div id="penaltyArea"></div>
    </div>
    <div class="nav-btns">
      <button id="prev" ${S.i===0?"disabled":""}>← 이전</button>
      <button class="next" id="next">다음 →</button>
    </div>
  </div>`;
  bindTabs();
  const input = document.getElementById("ans");
  const submit = () => submitAnswer();
  document.getElementById("submit").addEventListener("click", submit);
  input.addEventListener("keydown", e => { if(e.key==="Enter" && !S.answered) submit(); });
  if(!S.answered) input.focus();

  document.getElementById("hintBtn").addEventListener("click", showHint);
  document.getElementById("kwBtn").addEventListener("click", toggleKw);
  document.getElementById("starBtn").addEventListener("click", () => {
    const on = toggleBookmark(q.id);
    const btn = document.getElementById("starBtn");
    btn.classList.toggle("on", on); btn.textContent = "⭐ " + (on?"북마크됨":"북마크");
  });
  document.getElementById("prev").addEventListener("click", () => { if(S.i>0){ S.i--; S.answered=false; renderQuiz(); } });
  document.getElementById("next").addEventListener("click", nextQ);
  document.getElementById("stopBtn").addEventListener("click", () => renderSessionSummary(false));
  document.getElementById("penaltyChk").addEventListener("change", e => {
    LS.set(KEY_PENALTY, e.target.checked);
    if(!e.target.checked){ // 끄면 벌칙 해제
      document.getElementById("penaltyArea").innerHTML = "";
      document.getElementById("next").disabled = false;
    } else if(S.answered && S._lastMine !== undefined && !grade(q, S._lastMine)){
      buildPenalty(document.getElementById("penaltyArea"), document.getElementById("next"), penaltyText(q));
    }
  });

  if(S.answered && S._lastMine !== undefined) showResult(grade(q, S._lastMine), S._lastMine);
}
function showHint(){
  const area = document.getElementById("hintArea");
  const btn = document.getElementById("hintBtn");
  if(area.dataset.on === "1"){ area.innerHTML = ""; area.dataset.on = ""; btn.classList.remove("on"); return; } // 다시 누르면 숨김
  const q = sessionState.list[sessionState.i];
  const flag = answerInQ(q) ? ' <span class="flag">+문제에 정답이 있어요!</span>' : '';
  area.innerHTML = `<div class="hintbox">💡 ${escapeHtml(q.hint || "힌트 없음")}${flag}</div>`;
  area.dataset.on = "1"; btn.classList.add("on");
}
function toggleKw(){
  const q = sessionState.list[sessionState.i];
  const el = document.getElementById("qtext");
  document.getElementById("kwBtn").classList.toggle("on", el.dataset.kw !== "on");
  if(el.dataset.kw === "on"){ el.innerHTML = escapeHtml(q.q); el.dataset.kw = ""; return; }
  let html = escapeHtml(q.q);
  (q.keywords||[]).forEach(k => {
    const kk = escapeHtml(k);
    html = html.split(kk).join(`<span class="kw">${kk}</span>`);
  });
  el.innerHTML = html; el.dataset.kw = "on";
}
function submitAnswer(){
  const S = sessionState, q = S.list[S.i];
  const mine = document.getElementById("ans").value.trim();
  if(!mine) return;
  S.answered = true; S._lastMine = mine;
  document.getElementById("ans").disabled = true;
  const ok = grade(q, mine);
  recordAttempt(q, mine, ok);
  S.results[q.id] = { q, mine, ok }; // 세션 요약용
  showResult(ok, mine);
}
function showResult(ok, mine){
  const q = sessionState.list[sessionState.i];
  const ansTxt = q.match==="set" ? q.setAnswers.join(", ") : q.a[0];
  const g = glossLookup(q.match==="set" ? q.setAnswers : q.a);
  // 정답 옆 풀네임: 약어일 때만 (풀네임이 정답과 다를 때)
  const fullTag = (g && g.full && norm(g.full) !== norm(ansTxt))
    ? ` <span class="full">(${escapeHtml(g.full)})</span>` : "";
  const descText = g ? g.desc : (q.match!=="set" ? q.q : "");
  const descBox = descText ? `<div class="desc-box">📖 ${escapeHtml(descText)}</div>` : "";
  const alt = (!q.match && q.a.length>1) ? `<div class="mine">인정 답안: ${q.a.slice(0,4).join(" / ")}</div>` : "";
  const ansHtml = `<span class="ans">${escapeHtml(ansTxt)}</span>${fullTag}`;
  document.getElementById("resultArea").innerHTML = ok
    ? `<div class="result ok">✅ 정답입니다! ${ansHtml}${alt}${descBox}</div>`
    : `<div class="result no">❌ 오답 — 정답: ${ansHtml}
        <div class="mine">내 답: ${escapeHtml(mine)}</div>${alt}${descBox}
        <div class="selfgrade">사실 맞았다면?
          <button class="g-ok" id="mark-ok">정답 처리</button></div></div>`;
  const m = document.getElementById("mark-ok");
  if(m) m.addEventListener("click", () => { recordAttempt(q, mine, true);
    if(sessionState.results[q.id]) sessionState.results[q.id].ok = true;
    document.getElementById("resultArea").innerHTML =
      `<div class="result ok">✅ 정답 처리했어요. ${ansHtml}${descBox}</div>`;
    document.getElementById("penaltyArea").innerHTML = "";   // 정답 처리하면 벌칙 해제
    document.getElementById("next").disabled = false; });
  // 틀렸고 토글 켜져 있으면 정답 3번 쓰기 벌칙
  const pa = document.getElementById("penaltyArea");
  if(pa){
    if(!ok && penaltyOn()) buildPenalty(pa, document.getElementById("next"), penaltyText(q));
    else { pa.innerHTML = ""; const nx = document.getElementById("next"); if(nx) nx.disabled = false; }
  }
}
function nextQ(){
  const S = sessionState;
  if(S.i < S.list.length - 1){ S.i++; S.answered=false; S._lastMine=undefined; renderQuiz(); }
  else renderSessionSummary(true);
}
// 세션 요약: '그만하기' 또는 세트 완료 시 여기까지 푼 문제 결과를 나열
function renderSessionSummary(done){
  const S = sessionState;
  // 이번 세션에서 답한 문제만, 출제 순서대로
  const solved = S.list.filter(q => S.results[q.id]);
  const okN = solved.filter(q => S.results[q.id].ok).length;
  const noN = solved.length - okN;
  const cards = solved.map((q, idx) => {
    const r = S.results[q.id];
    const ans = q.match==="set" ? q.setAnswers.join(", ") : q.a[0];
    const g = glossLookup(q.match==="set" ? q.setAnswers : q.a);
    const full = (g && g.full && norm(g.full)!==norm(ans)) ? ` <span class="full">(${escapeHtml(g.full)})</span>` : "";
    const desc = g ? `<div class="desc-box" style="margin-top:8px">📖 ${escapeHtml(g.desc)}</div>` : "";
    return `<div class="rec ${r.ok?'r-ok':'r-no'}">
      <div class="rec-head"><span class="badge ${r.ok?'b-ok':'b-no'}">${idx+1}. ${r.ok?'✅ 맞음':'❌ 틀림'}</span>
        <span class="rec-meta">${q.sector} · ${q.theme}</span></div>
      <p class="rq">${escapeHtml(q.q)}</p>
      <p class="line mine">내 답: ${escapeHtml(r.mine||"-")}</p>
      <p class="line correct">정답: <b>${escapeHtml(ans)}</b>${full}</p>
      ${desc}
    </div>`;
  }).join("");
  const body = solved.length ? cards : `<div class="empty">아직 푼 문제가 없어요.</div>`;

  app.innerHTML = `
  <header class="top"><div class="top-inner"><div class="brand"><h1>${done?'🎉 완료':'⏹ 그만하기'}</h1></div>${renderTabs("")}</div></header>
  <div class="wrap">
    <h2 class="section-title">${done?'이 세트를 모두 풀었어요':'여기까지 푼 결과'}</h2>
    <p class="section-desc">총 ${solved.length}문제 · <b style="color:var(--ok)">✅ ${okN}</b> · <b style="color:var(--no)">❌ ${noN}</b></p>
    ${noN>0 ? `<button class="bigbtn" id="retryWrong">🔁 틀린 것만 다시 풀기 (${noN})</button>` : ""}
    <button class="bigbtn sub" data-go="home">홈으로</button>
    <div style="margin-top:14px">${body}</div>
  </div>`;
  bindTabs();
  const rw = document.getElementById("retryWrong");
  if(rw) rw.addEventListener("click", () => {
    const wrongQs = solved.filter(q => !S.results[q.id].ok);
    startQuiz(shuffle(wrongQs.slice()), "틀린 것만 다시 풀기", S.backView);
  });
}

// ---- 빈칸 채우기 ----
function renderBlanks(){
  startBlank(shuffle(BLANKS.slice()), 0);
}
function startBlank(list, i){
  const b = list[i];
  app.innerHTML = `
  <header class="top"><div class="top-inner"><div class="brand"><h1>🧩 빈칸 채우기</h1></div>${renderTabs("blanks")}</div></header>
  <div class="wrap">
    <div class="quiz-head"><span class="meta">${i+1} / ${list.length}</span></div>
    <div class="qcard">
      <span class="chip">${b.sector}</span>
      <p class="qtext">${escapeHtml(b.text).replace("___",'<span class="kw">_____</span>')}</p>
      <div class="answer-row"><input id="bans" placeholder="빈칸에 들어갈 말" autocomplete="off"/>
        <button class="submit" id="bsubmit">확인</button></div>
      <div id="bresult"></div>
    </div>
    <div class="nav-btns"><button data-go="home">← 홈</button><button class="next" id="bnext">다음 →</button></div>
  </div>`;
  bindTabs();
  const inp = document.getElementById("bans");
  const submit = () => {
    const mine = inp.value.trim(); if(!mine) return;
    const ok = b.a.some(a => norm(a)===norm(mine) || (norm(a).length>=1 && norm(mine).includes(norm(a))));
    inp.disabled = true;
    const g = glossLookup(b.a);
    const fullTag = (g && g.full && norm(g.full) !== norm(b.a[0])) ? ` <span class="full">(${escapeHtml(g.full)})</span>` : "";
    const descBox = g ? `<div class="desc-box">📖 ${escapeHtml(g.desc)}</div>` : "";
    const ansHtml = `<span class="ans">${escapeHtml(b.a[0])}</span>${fullTag}`;
    document.getElementById("bresult").innerHTML = ok
      ? `<div class="result ok">✅ 정답! ${ansHtml}${descBox}</div>`
      : `<div class="result no">❌ 정답: ${ansHtml}<div class="mine">내 답: ${escapeHtml(mine)}</div>${descBox}</div>`;
  };
  document.getElementById("bsubmit").addEventListener("click", submit);
  inp.addEventListener("keydown", e => { if(e.key==="Enter") submit(); });
  inp.focus();
  document.getElementById("bnext").addEventListener("click", () =>
    i < list.length-1 ? startBlank(list, i+1) : startBlank(shuffle(list.slice()), 0));
}

// ---- 기록 (복기): 맞은·틀린 문제를 한 곳에서 ----
let _histFilter = "all"; // all | ok | no
function renderHistory(){
  const all = history();
  const list = _histFilter==="ok" ? all.filter(r=>r.ok)
             : _histFilter==="no" ? all.filter(r=>!r.ok) : all;
  const okN = all.filter(r=>r.ok).length, noN = all.length - okN;

  const card = r => {
    const g = glossLookup([r.answer]);
    const full = (g && g.full && norm(g.full)!==norm(r.answer)) ? ` <span class="full">(${escapeHtml(g.full)})</span>` : "";
    const desc = g ? `<div class="desc-box" style="margin-top:8px">📖 ${escapeHtml(g.desc)}</div>` : "";
    return `<div class="rec ${r.ok?'r-ok':'r-no'}">
      <div class="rec-head"><span class="badge ${r.ok?'b-ok':'b-no'}">${r.ok?'✅ 맞음':'❌ 틀림'}</span>
        <span class="rec-meta">${r.sector} · ${r.theme||""} · ${r.date}</span></div>
      <p class="rq">${escapeHtml(r.q)}</p>
      <p class="line mine">내 답: ${escapeHtml(r.mine||"-")}</p>
      <p class="line correct">정답: <b>${escapeHtml(r.answer)}</b>${full}</p>
      ${desc}
      <div class="actions">
        <button data-theory="${escapeHtml(r.sector)}">📖 이론 보기</button>
        <button data-retry="${r.id}">✏️ 다시 풀기</button>
      </div>
    </div>`;
  };
  const body = list.length ? list.map(card).join("")
    : `<div class="empty">${all.length? "해당하는 기록이 없어요." : "아직 푼 문제가 없어요. 문제를 풀면 여기에 기록돼요."}</div>`;

  app.innerHTML = `
  <header class="top"><div class="top-inner"><div class="brand"><h1>📋 기록</h1></div>${renderTabs("history")}</div></header>
  <div class="wrap">
    <h2 class="section-title">내가 푼 문제 복기 (${all.length})</h2>
    <p class="section-desc">최근에 푼 것부터. 문제·내 답·정답·설명을 바로 확인하고 다시 풀 수 있어요.</p>
    <div class="hist-filters">
      <button data-f="all" class="${_histFilter==='all'?'on':''}">전체 ${all.length}</button>
      <button data-f="ok" class="${_histFilter==='ok'?'on':''}">✅ 맞음 ${okN}</button>
      <button data-f="no" class="${_histFilter==='no'?'on':''}">❌ 틀림 ${noN}</button>
    </div>
    ${noN>0 ? `<button class="bigbtn" id="retryWrong">🔁 틀린 문제만 다시 풀기 (랜덤)</button>` : ""}
    ${body}
  </div>`;
  bindTabs();
  app.querySelectorAll(".hist-filters [data-f]").forEach(b => b.addEventListener("click", () => { _histFilter = b.dataset.f; renderHistory(); }));
  app.querySelectorAll("[data-theory]").forEach(b => b.addEventListener("click", () => renderTheory(b.dataset.theory)));
  app.querySelectorAll("[data-retry]").forEach(b => b.addEventListener("click", () => {
    const q = QUESTIONS.find(x => x.id === +b.dataset.retry);
    if(q) startQuiz([q], "기록 복습", "history");
  }));
  const rw = document.getElementById("retryWrong");
  if(rw) rw.addEventListener("click", () => {
    const ids = all.filter(r=>!r.ok).map(r=>r.id);
    startQuiz(shuffle(QUESTIONS.filter(q => ids.includes(q.id))), "틀린 문제 다시 풀기", "history");
  });
}

// ---- 검색 ----
function renderSearch(){
  app.innerHTML = `
  <header class="top"><div class="top-inner"><div class="brand"><h1>🔍 검색</h1></div>${renderTabs("search")}</div></header>
  <div class="wrap">
    <div class="answer-row" style="margin-top:22px">
      <input id="sq" placeholder="용어·설명·섹터로 검색 (예: UDDI, 응집도, 교착)" autocomplete="off"/>
    </div>
    <div id="sres" style="margin-top:16px"></div>
  </div>`;
  bindTabs();
  const inp = document.getElementById("sq");
  inp.addEventListener("input", () => doSearch(inp.value));
  inp.focus();
  doSearch("");
}
function doSearch(query){
  const res = document.getElementById("sres");
  const nq = norm(query);
  if(nq.length < 1){ res.innerHTML = `<div class="empty">검색어를 입력하세요.<br>문제 지문·정답·힌트·섹터에서 찾아줘요.</div>`; return; }
  const hits = QUESTIONS.filter(q => {
    const hay = norm([q.q, q.theme, q.sector, q.hint, (q.a||[]).join(" "), (q.setAnswers||[]).join(" ")].join(" "));
    return hay.includes(nq);
  });
  if(!hits.length){ res.innerHTML = `<div class="empty">"${escapeHtml(query)}" 검색 결과가 없어요.</div>`; return; }
  const shown = hits.slice(0, 50);
  res.innerHTML = `<p class="section-desc">${hits.length}개 결과${hits.length>50?" (상위 50개 표시)":""}</p>` +
    shown.map(q => `
      <div class="rec" style="cursor:pointer" data-open="${q.id}">
        <p class="line" style="color:var(--accent);font-weight:700;font-size:12px">${q.sector} · ${q.theme}</p>
        <p class="rq" style="margin:6px 0 0">${escapeHtml(q.q)}</p>
        <p class="line correct">정답: ${escapeHtml(q.match==="set"?q.setAnswers.join(", "):q.a[0])}</p>
      </div>`).join("");
  res.querySelectorAll("[data-open]").forEach(el => el.addEventListener("click", () => {
    const q = QUESTIONS.find(x => x.id === +el.dataset.open);
    if(q) startQuiz([q], "검색 결과", "search");
  }));
}

// ---- 북마크 ----
function renderBookmark(){
  const ids = bookmarks();
  const list = QUESTIONS.filter(q => ids.includes(q.id));
  const body = list.length ? list.map(q => `
    <div class="rec"><p class="rq">${escapeHtml(q.q)}</p>
      <p class="line correct">정답: ${escapeHtml(q.match==="set"?q.setAnswers.join(", "):q.a[0])}</p>
      <p class="line" style="color:var(--muted)">${q.sector} · ${q.theme}</p>
      <div class="actions"><button data-retry="${q.id}">✏️ 풀기</button>
        <button data-unbm="${q.id}">✖ 북마크 해제</button></div>
    </div>`).join("") : `<div class="empty">별표한 문제가 없어요. 문제 화면에서 ⭐를 눌러보세요.</div>`;
  app.innerHTML = `
  <header class="top"><div class="top-inner"><div class="brand"><h1>⭐ 북마크</h1></div>${renderTabs("bookmark")}</div></header>
  <div class="wrap"><h2 class="section-title">북마크한 문제 (${list.length})</h2>
    ${list.length ? `<button class="bigbtn" id="solveAll">✏️ 북마크 모아 풀기</button>` : ""}
    ${body}</div>`;
  bindTabs();
  app.querySelectorAll("[data-retry]").forEach(b => b.addEventListener("click", () => {
    const q = QUESTIONS.find(x => x.id === +b.dataset.retry); if(q) startQuiz([q], "북마크", "bookmark");
  }));
  app.querySelectorAll("[data-unbm]").forEach(b => b.addEventListener("click", () => {
    toggleBookmark(+b.dataset.unbm); renderBookmark();
  }));
  const sa = document.getElementById("solveAll");
  if(sa) sa.addEventListener("click", () => startQuiz(shuffle(list.slice()), "북마크 문제", "bookmark"));
}

function escapeHtml(s){ return (s||"").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }

// 시작
renderHome();
