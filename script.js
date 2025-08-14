// ========================
/*
Black & Gold Math Quiz — Full Logic (client-only)
This script implements:
- Quiz generation
- Timer
- Navigation
- Scoring
- localStorage leaderboard
- Teacher gate (client-side)
- Certificate generation (print)
*/
(function(){
  // Storage key
  const STORAGE_KEY = "mathQuizResults_v2";

  // State
  let student = { name: "", matric: "", class: "", score: 0, time: 0, total: 0, date: "" };
  let quizData = [];
  let answers = [];
  let currentQ = 0;
  let startTime = 0, timerInterval = null;

  // DOM refs
  const pages = {
    home: document.getElementById("page-home"),
    quiz: document.getElementById("page-quiz"),
    student: document.getElementById("page-student"),
    board: document.getElementById("page-board"),
    cert: document.getElementById("page-cert"),
    teacherGate: document.getElementById("page-teacher-gate"),
    teacher: document.getElementById("page-teacher")
  };
  const timerEl = document.querySelector(".brand-sub span");
  const qContainer = document.getElementById("questions");
  const qIndexEl = document.getElementById("qIndex");
  const qTotalEl = document.getElementById("qTotal");

  function showPage(id){ Object.values(pages).forEach(s=>s.classList.add("hidden")); pages[id].classList.remove("hidden"); }
  function fmtTime(sec){ const m=String(Math.floor(sec/60)).padStart(2,'0'); const s=String(sec%60).padStart(2,'0'); return `${m}:${s}`; }

  // Bind events
  document.getElementById("startQuiz").addEventListener("click", startQuiz);
  document.getElementById("nextQ").addEventListener("click", ()=>changeQ(1));
  document.getElementById("prevQ").addEventListener("click", ()=>changeQ(-1));
  document.getElementById("submitBtn").addEventListener("click", submitQuiz);
  document.getElementById("retakeBtn").addEventListener("click", ()=>{ resetForm(); showPage('home'); });
  document.getElementById("gotoLeaderboard").addEventListener("click", ()=>{ renderLeaderboard(); showPage('board'); });
  document.getElementById("genCert").addEventListener("click", ()=>{ generateCertificate(); showPage('cert'); });
  document.getElementById("backToDash").addEventListener("click", ()=> showPage('student'));
  document.getElementById("openBoard").addEventListener("click", ()=>{ renderLeaderboard(); showPage('board'); });
  document.getElementById("myDashFromBoard").addEventListener("click", ()=> showPage('student'));
  document.getElementById("backHome").addEventListener("click", ()=> showPage('home'));
  document.getElementById("teacherGate").addEventListener("click", ()=> showPage('teacherGate'));
  document.getElementById("openTeacher").addEventListener("click", openTeacherDashboard);
  document.getElementById("closeTeacher").addEventListener("click", ()=> showPage('home'));
  document.getElementById("exportCsv").addEventListener("click", exportCSV);
  document.getElementById("clearAll").addEventListener("click", clearAllResults);
  document.getElementById("classFilter").addEventListener("change", renderTeacherDashboard);
  document.getElementById("downloadCert").addEventListener("click", downloadCertificateAsPDF);

  // Core quiz
  function startQuiz(){
    const name = document.getElementById('fullName').value.trim();
    const matric = document.getElementById('matric').value.trim();
    const cls = document.getElementById('classSelect').value;
    if(!name || !matric || !cls){ alert('Please fill in all your details first.'); return; }
    const prev = getAllResults().find(r=> r.matric === matric);
    if(prev && !confirm('Record with this matric exists. Start a new attempt?')){ return; }
    student = { name, matric, class: cls, score: 0, time: 0, total: 10, date: new Date().toISOString() };
    quizData = generateMathQuestions(10);
    answers = Array(quizData.length).fill("");
    currentQ = 0;
    qTotalEl.textContent = quizData.length;
    renderQuestion(currentQ);
    startTime = Date.now();
    timerInterval && clearInterval(timerInterval);
    timerInterval = setInterval(()=>{ const elapsed = Math.floor((Date.now()-startTime)/1000); timerEl.textContent = fmtTime(elapsed); }, 1000);
    showPage('quiz');
  }

  function generateMathQuestions(n){
    const ops = ['+','-','×','÷'];
    const arr = [];
    for(let i=0;i<n;i++){
      const a = Math.floor(Math.random()*20)+1;
      const b = Math.floor(Math.random()*20)+1;
      const op = ops[Math.floor(Math.random()*ops.length)];
      let ans;
      if(op === '+') ans = a+b;
      else if(op === '-') ans = a-b;
      else if(op === '×') ans = a*b;
      else { ans = +(a/b).toFixed(2); }
      arr.push({ question: `${a} ${op} ${b}`, answer: ans });
    }
    return arr;
  }

  function renderQuestion(idx){
    const q = quizData[idx];
    qContainer.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card pad';
    card.innerHTML = `
      <p><strong>Q${idx+1}:</strong> ${escapeHtml(q.question)}</p>
      <input id="answerInput" type="number" step="any" class="input" value="${answers[idx] ?? ''}" aria-label="Answer for question ${idx+1}" />
    `;
    qContainer.appendChild(card);
    qIndexEl.textContent = idx+1;
    setTimeout(()=> document.getElementById('answerInput')?.focus(), 0);
  }

  function changeQ(delta){
    saveCurrentAnswer();
    const ni = currentQ + delta;
    if(ni >= 0 && ni < quizData.length){ currentQ = ni; renderQuestion(currentQ); }
  }

  function saveCurrentAnswer(){
    const inp = document.getElementById('answerInput');
    if(!inp) return;
    answers[currentQ] = inp.value.trim();
  }

  function submitQuiz(){
    saveCurrentAnswer();
    if(!confirm('Submit answers now?')) return;
    timerInterval && clearInterval(timerInterval);
    const elapsed = Math.floor((Date.now()-startTime)/1000);
    student.time = elapsed;
    let score = 0;
    quizData.forEach((q,i)=>{
      const val = parseFloat(answers[i]);
      if(Number.isNaN(val)) return;
      if(typeof q.answer === 'number'){
        if(q.question.includes('÷')) {
          if(Math.abs(val - q.answer) <= 0.01) score++;
        } else {
          if(val === q.answer) score++;
        }
      }
    });
    student.score = score; student.total = quizData.length;
    saveResult(student);
    renderStudentDashboard();
    showPage('student');
  }

  // Persistence
  function getAllResults(){ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }catch{ return []; } }
  function saveAllResults(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  function saveResult(r){ const list = getAllResults(); list.push(r); saveAllResults(list); }

  // Student dashboard
  function renderStudentDashboard(){
    const sum = document.getElementById('mySummary');
    sum.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(student.name)}</p>
      <p><strong>Matric:</strong> ${escapeHtml(student.matric)}</p>
      <p><strong>Class:</strong> ${escapeHtml(student.class)}</p>
      <p><strong>Score:</strong> ${student.score} / ${student.total}</p>
      <p><strong>Time:</strong> ${student.time}s (${fmtTime(student.time)})</p>
    `;
    const rev = document.getElementById('review');
    rev.innerHTML = '';
    quizData.forEach((q,i)=>{
      const given = answers[i];
      const correctVal = q.answer;
      const correct = !Number.isNaN(parseFloat(given)) && (
        q.question.includes('÷') ? Math.abs(parseFloat(given) - correctVal) <= 0.01 : parseFloat(given) === correctVal
      );
      const div = document.createElement('div');
      div.className = 'card pad';
      div.innerHTML = `
        <p><strong>Q${i+1}:</strong> ${escapeHtml(q.question)}</p>
        <p>Your Answer: ${escapeHtml(given ?? '—')}</p>
        <p>Correct Answer: ${correctVal}</p>
        <p style="color:${correct ? 'var(--ok)' : 'var(--bad)'}">${correct ? '✔ Correct' : '✖ Wrong'}</p>
      `;
      rev.appendChild(div);
    });
  }

  // Leaderboard
  function renderLeaderboard(){
    const list = getAllResults().slice().sort((a,b)=> (b.score-a.score) || (a.time-b.time));
    const podium = document.getElementById('podium');
    const leaders = document.getElementById('leaders');
    podium.innerHTML = '';
    leaders.innerHTML = '';
    list.slice(0,3).forEach((r,i)=>{
      const d = document.createElement('div'); d.className='card pad';
      d.innerHTML = `<h3>#${i+1} ${escapeHtml(r.name)}</h3><p>${r.score}/${r.total} — ${fmtTime(r.time)}</p>`;
      podium.appendChild(d);
    });
    list.forEach((r,i)=>{
      const d = document.createElement('div'); d.className='card pad';
      d.innerHTML = `<p><strong>${String(i+1).padStart(2,'0')}.</strong> ${escapeHtml(r.name)} (${escapeHtml(r.class)}) — <b>${r.score}/${r.total}</b> in ${fmtTime(r.time)} <span class="tiny">[${escapeHtml(r.matric)}]</span></p>`;
      leaders.appendChild(d);
    });
  }

  // Certificate
  function generateCertificate(){
    document.getElementById('cert-name').textContent = student.name;
    document.getElementById('cert-score').textContent = `${student.score} / ${student.total}`;
    const d = new Date();
    document.getElementById('cert-date').textContent = d.toLocaleDateString();
    document.getElementById('cert-date').setAttribute('datetime', d.toISOString());
  }

  function downloadCertificateAsPDF(){
    const cert = document.getElementById('certificate-container').outerHTML;
    const win = window.open('', 'certprint');
    win.document.write(`<!doctype html><html><head><title>Certificate</title>
      <style>body{background:#0f0f10;color:#f4f4f6;font-family:${getComputedStyle(document.body).fontFamily};padding:24px;} .card{background:#141416;border:0;border-radius:12px;padding:24px;}</style>
    </head><body>${cert}<script>window.onload=()=>window.print()<\\/script></body></html>`);
    win.document.close();
  }

  // Teacher
  function openTeacherDashboard(){
    const pass = (document.getElementById('tpass').value || '').trim();
    const msg = document.getElementById('tpassMsg');
    if(pass === 'teacher123'){
      msg.textContent = 'Access granted.'; msg.style.color = 'var(--ok)';
      renderTeacherDashboard(); showPage('teacher');
    } else {
      msg.textContent = 'Wrong password.'; msg.style.color = 'var(--bad)';
    }
  }

  function getFilteredResults(){
    const cls = document.getElementById('classFilter').value;
    const all = getAllResults();
    return cls === 'all' ? all : all.filter(r=> r.class === cls);
  }

  function renderTeacherDashboard(){
    const list = getFilteredResults().slice().sort((a,b)=> (b.score-a.score) || (a.time-b.time));
    const stats = document.getElementById('teacherStats');
    if(list.length === 0){ stats.innerHTML = '<p>No results.</p>'; }
    else {
      const avgScore = (list.reduce((s,r)=>s+r.score,0)/list.length).toFixed(2);
      const avgTime = Math.round(list.reduce((s,r)=>s+r.time,0)/list.length);
      const best = list[0];
      stats.innerHTML = `
        <div class="grid grid-3">
          <div class="card pad"><b>Total</b><div>${list.length}</div></div>
          <div class="card pad"><b>Avg Score</b><div>${avgScore}</div></div>
          <div class="card pad"><b>Avg Time</b><div>${fmtTime(avgTime)}</div></div>
        </div>
        <div class="card pad" style="margin-top:12px;"><b>Top Performer:</b> ${escapeHtml(best.name)} (${escapeHtml(best.class)}) — ${best.score}/${best.total} in ${fmtTime(best.time)}</div>
      `;
    }
    const table = document.getElementById('teacherTable');
    table.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'card pad';
    header.innerHTML = '<b>#</b> &nbsp; Name — Class — Score — Time — Matric';
    table.appendChild(header);
    list.forEach((r,i)=>{
      const row = document.createElement('div'); row.className='card pad';
      row.innerHTML = `<b>${i+1}.</b> ${escapeHtml(r.name)} — ${escapeHtml(r.class)} — <b>${r.score}/${r.total}</b> — ${fmtTime(r.time)} — <span class="tiny">${escapeHtml(r.matric)}</span>`;
      table.appendChild(row);
    });
  }

  function exportCSV(){
    const list = getFilteredResults();
    const rows = [['Name','Matric','Class','Score','Total','TimeSeconds','TimeFormatted','DateISO']]
      .concat(list.map(r=>[r.name,r.matric,r.class,String(r.score),String(r.total),String(r.time),fmtTime(r.time),r.date]));
    const csv = rows.map(r=> r.map(field=> '\"'+String(field).replaceAll('\"','\"\"')+'\"').join(',')).join('\\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='quiz_results.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function clearAllResults(){
    if(confirm('This will permanently remove all stored results. Continue?')){
      localStorage.removeItem(STORAGE_KEY);
      renderTeacherDashboard();
      renderLeaderboard();
    }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>\\\"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
  function resetForm(){ document.getElementById('studentForm').reset(); timerEl.textContent='00:00'; }

  // Expose some functions for debugging
  window._bgq = {
    startQuiz, submitQuiz, renderLeaderboard, renderTeacherDashboard, exportCSV
  };

})();
