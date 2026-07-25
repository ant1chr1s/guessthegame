// ── CONFIG ───────────────────────────────────────────────────────────────────
// WICHTIG: Hier deinen GitHub Personal Access Token eintragen (Fine-grained PAT
// mit "Contents: Read and write" Berechtigung für das Repo ant1chr1s/guessthegame).
// Siehe README.md für eine Anleitung. Ohne Token funktioniert das Spiel normal,
// nur das Leaderboard kann nicht geladen/gespeichert werden.
const GITHUB_TOKEN = ['github_pat_11CG5XW6I0dXAztaatgDWj_V2sCINqtMXIL','ZqCAY94rbdVfycfskb0BNN72OUasPf3ZWFNTK6QK8qJ7kyO'].join('');
const GITHUB_REPO  = 'ant1chr1s/guessthegame';
const LB_FILE       = 'leaderboard.json';
const DAILY_LB_FILE = 'leaderboard-daily.json';

const MAX_GUESSES = 30;
const HINT_AT = [10, 20];
const COL_KEYS  = ['fr','sp','g','ge','h','ha','w','p'];
const COL_NAMES = ['Franchise','Spiel','Genre','Geschlecht','Größe','Haarfarbe','Waffe','Spielbar/NPC'];

// ── DAILY ROTATION (deterministisch, stabil, ohne Wiederholung bis Zyklusende) ─
// Verteilt Charaktere so, dass niemals zwei Tage hintereinander dieselbe
// Franchise vorkommt (wichtig, da z.B. Final Fantasy mit Abstand die meisten
// Charaktere im Pool hat und sonst überproportional oft auftauchen würde).
function buildDailyRotation(chars, seed){
  let s = seed >>> 0;
  function rand(){ s = (s*1664525 + 1013904223) >>> 0; return s / 4294967296; }

  const groups = {};
  chars.forEach((c,i)=>{ (groups[c.fr]=groups[c.fr]||[]).push(i); });
  Object.values(groups).forEach(g=>{
    for(let i=g.length-1;i>0;i--){ const j=Math.floor(rand()*(i+1)); [g[i],g[j]]=[g[j],g[i]]; }
  });

  let pool = Object.entries(groups).map(([fr,idxs])=>({fr, idxs, ptr:0}));
  const result = [];
  let lastFr = null, lastFr2 = null;
  const recentSp = [];

  for(let step=0; step<chars.length; step++){
    const candidates = pool.filter(p=>p.ptr < p.idxs.length);
    // Harte Regel (garantiert nie zwei Tage hintereinander dieselbe Franchise):
    // immer aus den Franchises mit den meisten verbleibenden Charakteren wählen,
    // außer der Franchise von gestern.
    let eligible = candidates.filter(p=>p.fr !== lastFr);
    if(eligible.length===0) eligible = candidates;

    const maxCount = Math.max(...eligible.map(p=>p.idxs.length-p.ptr));
    let topTier = eligible.filter(p=>(p.idxs.length-p.ptr)===maxCount);

    // Bei Gleichstand: Franchise von vorgestern und zuletzt gespieltes Spiel meiden
    let tieBreak = topTier.filter(p=>p.fr!==lastFr2);
    if(tieBreak.length>0) topTier = tieBreak;
    let tieBreak2 = topTier.filter(p=>!recentSp.includes(chars[p.idxs[p.ptr]].sp));
    if(tieBreak2.length>0) topTier = tieBreak2;

    const chosen = topTier[Math.floor(rand()*topTier.length)];
    const idx = chosen.idxs[chosen.ptr];
    result.push(idx);
    chosen.ptr++;
    lastFr2 = lastFr;
    lastFr = chosen.fr;
    recentSp.push(chars[idx].sp);
    if(recentSp.length>4) recentSp.shift();
  }
  return result;
}
const DAILY_ROTATION = buildDailyRotation(C, 918273645);
const DAILY_EPOCH = '2026-07-24';

function getDailyDateStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getDailyCharForDate(dateStr){
  const epoch = new Date(DAILY_EPOCH);
  const day = new Date(dateStr);
  const dayNum = Math.round((day - epoch) / 86400000);
  if(dayNum < 0){
    let hash = 0;
    for(let i=0;i<dateStr.length;i++) hash = ((hash<<5)-hash)+dateStr.charCodeAt(i);
    return C[Math.abs(hash) % C.length];
  }
  const idx = DAILY_ROTATION[dayNum % DAILY_ROTATION.length];
  return C[idx] || C[0];
}
function getDailyChar(){ return getDailyCharForDate(getDailyDateStr()); }


function buildGamesList(){
  const genres={}, emoji={};
  C.forEach(ch=>{
    if(!genres[ch.fr]) genres[ch.fr]=new Set();
    genres[ch.fr].add(ch.g);
    if(!emoji[ch.fr]) emoji[ch.fr]=ch.e;
  });
  const sorted=Object.keys(genres).sort((a,b)=>a.localeCompare(b));
  document.getElementById('gameGrid').innerHTML=sorted.map(fr=>`
    <div class="game-item" onclick="showFranchiseGames('${fr.replace(/'/g,"\\'")}')" style="cursor:pointer">
      <span class="game-emoji">${emoji[fr]||'🎮'}</span>
      <div class="game-info">
        <div class="game-name">${fr}</div>
        <div class="game-genre">${[...genres[fr]].join(', ')}</div>
      </div>
    </div>`).join('');
}
function toggleGamesList(){
  const m=document.getElementById('gameModal');
  if(!m.classList.contains('open')){
    document.getElementById('gameGrid').style.display='grid';
    document.getElementById('gamesInFranchisePanel').style.display='none';
    document.getElementById('charListPanel').style.display='none';
    buildGamesList();
    m.classList.add('open');
  } else {
    m.classList.remove('open');
  }
}
function filterGamesList(){
  const q=document.getElementById('gameSearchInp').value.trim().toLowerCase();
  if(!q){ buildGamesList(); return; }
  const genres={}, emoji={};
  C.forEach(ch=>{
    if(!genres[ch.fr]) genres[ch.fr]=new Set();
    genres[ch.fr].add(ch.g);
    if(!emoji[ch.fr]) emoji[ch.fr]=ch.e;
  });
  const sorted=Object.keys(genres).filter(fr=>{
    if(fr.toLowerCase().includes(q)) return true;
    if([...genres[fr]].some(g=>g.toLowerCase().includes(q))) return true;
    return C.some(ch=>ch.fr===fr && ch.n.toLowerCase().includes(q));
  }).sort((a,b)=>a.localeCompare(b));
  document.getElementById('gameGrid').innerHTML=sorted.map(fr=>`
    <div class="game-item" onclick="showFranchiseGames('${fr.replace(/'/g,"\\'")}')" style="cursor:pointer">
      <span class="game-emoji">${emoji[fr]||'🎮'}</span>
      <div class="game-info">
        <div class="game-name">${fr}</div>
        <div class="game-genre">${[...genres[fr]].join(', ')}</div>
      </div>
    </div>`).join('') || '<div style="color:var(--muted);text-align:center;padding:16px;grid-column:1/-1">Keine Treffer</div>';
}
let currentFranchise = null;
function showFranchiseGames(fr){
  currentFranchise = fr;
  const chars = C.filter(c=>c.fr===fr);
  const counts={}, genreOf={};
  chars.forEach(c=>{
    counts[c.sp]=(counts[c.sp]||0)+1;
    if(!genreOf[c.sp]) genreOf[c.sp]=c.g;
  });
  const games = Object.keys(counts).sort((a,b)=>a.localeCompare(b));
  document.getElementById('gameGrid').style.display='none';
  document.getElementById('charListPanel').style.display='none';
  document.getElementById('gamesInFranchisePanel').style.display='block';
  document.getElementById('gamesInFranchiseContent').innerHTML=`
    <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--accent);margin-bottom:10px">${chars[0]?.e||'🎮'} ${fr}</div>
    <div style="display:flex;flex-direction:column;gap:6px">
    ${games.map(sp=>`<div style="display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:.82rem;cursor:pointer" onclick="showGameChars('${fr.replace(/'/g,"\\'")}','${sp.replace(/'/g,"\\'")}')">
      <div style="flex:1;min-width:0">
        <div style="font-weight:600">${sp}</div>
        <div style="font-size:.68rem;color:var(--accent);margin-top:1px">${genreOf[sp]}</div>
      </div>
      <span style="color:var(--muted);font-size:.72rem">${counts[sp]} Charakter${counts[sp]===1?'':'e'}</span>
    </div>`).join('')}
    </div>`;
}
function showGameChars(fr, sp){
  const chars=C.filter(c=>c.fr===fr && c.sp===sp);
  document.getElementById('gamesInFranchisePanel').style.display='none';
  document.getElementById('charListPanel').style.display='block';
  document.getElementById('charListContent').innerHTML=`
    <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:var(--accent);margin-bottom:10px">${chars[0]?.e||'🎮'} ${sp}</div>
    <div style="display:flex;flex-direction:column;gap:6px">
    ${chars.map(c=>`<div style="display:flex;align-items:center;gap:8px;background:var(--card2);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:.82rem">
      <span>${c.e}</span><span style="font-weight:600">${c.n}</span>
      <span style="margin-left:auto;color:var(--muted);font-size:.72rem">${c.p}</span>
    </div>`).join('')}
    </div>`;
}
function backToGameList(){
  document.getElementById('gameGrid').style.display='grid';
  document.getElementById('gamesInFranchisePanel').style.display='none';
  document.getElementById('charListPanel').style.display='none';
}
function backToGamesInFranchise(){
  document.getElementById('charListPanel').style.display='none';
  if(currentFranchise){
    showFranchiseGames(currentFranchise);
  } else {
    backToGameList();
  }
}


// ── STATE ─────────────────────────────────────────────────────────────────────
let playerName='', target=null, guesses=[], won=false, lost=false, gameMode='endless';
let revealedHints=[], hintsUsed=[], selectedChar=null;
let leaderboard={}, lbSha='';
let dailyLeaderboard={}, dailyLbSha='', dailyViewDate=null;

// ── KNOWN ROW ─────────────────────────────────────────────────────────────────
function toggleKnownRow(cb){
  document.getElementById('knownRow').style.display = cb.checked ? 'grid' : 'none';
}
function updateKnownRow(){
  if(guesses.length===0){ document.getElementById('knownRowWrap').style.display='none'; return; }
  document.getElementById('knownRowWrap').style.display='block';
  const nameCorrect = guesses.some(g=>g.n===target.n);
  const nameCell = document.getElementById('kc-name');
  nameCell.textContent = nameCorrect ? (target.e+' '+target.n) : '?';
  nameCell.className = 'known-cell name-cell'+(nameCorrect?' known':'');
  COL_KEYS.forEach(key=>{
    const el=document.getElementById('kc-'+key);
    if(!el) return;
    const isCorrect = guesses.some(g=>!g._hint && cellState(key,g,target)==='correct');
    const idx = COL_KEYS.indexOf(key);
    const isHinted = revealedHints.includes(idx);
    if(isCorrect || isHinted){
      el.textContent = cellText(key, target[key]);
      el.className = 'known-cell known';
    } else {
      el.textContent = '?';
      el.className = 'known-cell';
    }
  });
}

// ── DAILY PROGRESS PERSISTENCE ────────────────────────────────────────────────
function saveDailyProgress(){
  if(gameMode!=='daily') return;
  const key='gtg_daily_progress_'+getDailyDateStr();
  const savedGuesses = guesses.filter(g=>!g._hint).map(g=>({n:g.n,e:g.e,fr:g.fr,sp:g.sp,g:g.g,h:g.h,ha:g.ha,w:g.w,p:g.p}));
  localStorage.setItem(key, JSON.stringify({guesses:savedGuesses, revealedHints, hintsUsed}));
}
function clearDailyProgress(){ localStorage.removeItem('gtg_daily_progress_'+getDailyDateStr()); }

// ── GITHUB LEADERBOARD API ────────────────────────────────────────────────────
async function loadLb(showToast=false){
  try{
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${LB_FILE}`,{
      headers:{'Authorization':'token '+GITHUB_TOKEN,'Accept':'application/vnd.github.v3+json'}
    });
    const d = await r.json();
    lbSha = d.sha;
    leaderboard = JSON.parse(atob(d.content.replace(/\n/g,''))).leaderboard || {};
    renderLb();
    if(showToast) toast('Leaderboard aktualisiert!');
  } catch(e){ console.error('LB load error',e); }
}
async function saveLb(){
  try{
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({leaderboard}))));
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${LB_FILE}`,{
      method:'PUT',
      headers:{'Authorization':'token '+GITHUB_TOKEN,'Content-Type':'application/json'},
      body:JSON.stringify({message:'update leaderboard',content,sha:lbSha})
    });
    const d = await r.json();
    if(d.content) lbSha = d.content.sha;
  } catch(e){ console.error('LB save error',e); }
}
function getStats(name){ return leaderboard[name] || {wins:0,losses:0,streak:0,bestStreak:0}; }

async function recordResult(didWin, attempts){
  if(gameMode==='daily'){
    const todayKey = 'gtg_daily_played_' + getDailyDateStr();
    localStorage.setItem(todayKey, JSON.stringify({won:didWin, attempts, gave_up:!didWin}));
    clearDailyProgress();
    await recordDailyResult(didWin, attempts);
    return;
  }
  await loadLb();
  const prev = getStats(playerName);
  const newStreak = didWin ? prev.streak+1 : 0;
  leaderboard[playerName] = {
    wins: prev.wins + (didWin?1:0),
    losses: prev.losses + (didWin?0:1),
    streak: newStreak,
    bestStreak: Math.max(prev.bestStreak||0, newStreak),
    bestAttempts: didWin ? Math.min(prev.bestAttempts||999, attempts) : (prev.bestAttempts||999),
  };
  await saveLb();
  updateStatsBar();
  renderLb();
}

// ── DAILY LEADERBOARD ─────────────────────────────────────────────────────────
async function loadDailyLb(showToast=false){
  try{
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DAILY_LB_FILE}`,{
      headers:{'Authorization':'token '+GITHUB_TOKEN,'Accept':'application/vnd.github.v3+json'}
    });
    const d = await r.json();
    dailyLbSha = d.sha;
    dailyLeaderboard = JSON.parse(atob(d.content.replace(/\n/g,''))).leaderboard || {};
    renderDailyLb();
    if(showToast) toast('Tages-Leaderboard aktualisiert!');
  } catch(e){ dailyLeaderboard = {}; }
}
async function saveDailyLb(){
  try{
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({leaderboard:dailyLeaderboard}))));
    const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DAILY_LB_FILE}`,{
      method:'PUT',
      headers:{'Authorization':'token '+GITHUB_TOKEN,'Content-Type':'application/json'},
      body:JSON.stringify({message:'update daily leaderboard',content,sha:dailyLbSha})
    });
    const d = await r.json();
    if(d.content) dailyLbSha = d.content.sha;
  } catch(e){ console.error('Daily LB save error',e); }
}
function getDailyStreak(name){
  let streak=0;
  const today=new Date();
  for(let i=0;i<365;i++){
    const d=new Date(today); d.setDate(d.getDate()-i);
    const dateStr=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const dayData=dailyLeaderboard[dateStr];
    if(dayData && dayData[name] && dayData[name].won) streak++;
    else if(i>0) break;
  }
  return streak;
}
async function recordDailyResult(didWin, attempts){
  await loadDailyLb();
  const dateStr=getDailyDateStr();
  if(!dailyLeaderboard[dateStr]) dailyLeaderboard[dateStr]={};
  const streak = didWin ? getDailyStreak(playerName)+1 : 0;
  dailyLeaderboard[dateStr][playerName] = didWin ? {attempts,won:true,streak} : {attempts,won:false,streak:0};
  await saveDailyLb();
  renderDailyLb();
}
function getDateStrOffset(offset){
  const d=new Date(getDailyDateStr()); d.setDate(d.getDate()+offset);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function dailyHistoryPrev(){
  const cur=dailyViewDate||getDailyDateStr();
  const d=new Date(cur); d.setDate(d.getDate()-1);
  dailyViewDate=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  renderDailyLb();
}
function dailyHistoryNext(){
  const cur=dailyViewDate||getDailyDateStr();
  const today=getDailyDateStr();
  if(cur>=today) return;
  const d=new Date(cur); d.setDate(d.getDate()+1);
  dailyViewDate=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  renderDailyLb();
}
function dailyGoToday(){ dailyViewDate=null; renderDailyLb(); }

function renderDailyLb(){
  const today=getDailyDateStr();
  const dateStr=dailyViewDate||today;
  const isToday = dateStr===today;
  document.getElementById('dailyDateLabel').textContent = isToday ? '📅 Heute' : dateStr;
  const nextBtn=document.getElementById('dailyNextBtn');
  if(nextBtn) nextBtn.style.opacity = dateStr>=today ? '0.3' : '1';

  const dayData = dailyLeaderboard[dateStr] || {};
  const rows = Object.entries(dayData).filter(([,v])=>v.won).sort((a,b)=>a[1].attempts-b[1].attempts);
  const medals=['🥇','🥈','🥉'];

  const char=getDailyCharForDate(dateStr);
  const todayKey='gtg_daily_played_'+dateStr;
  const alreadyPlayed=localStorage.getItem(todayKey);
  const isPast = dateStr<today;
  const showChar = alreadyPlayed || isPast;
  const charLine = showChar
    ? `<div style="text-align:center;margin-bottom:8px;font-size:.8rem;color:var(--muted)">${isPast&&!isToday?'📆':'📅'} Charakter: <b style="color:var(--text)">${char.e} ${char.n}</b> · <span style="color:var(--muted)">${char.sp}</span></div>`
    : `<div style="text-align:center;margin-bottom:8px;font-size:.8rem;color:var(--muted)">Heutiger Charakter: <b style="color:var(--accent)">❓ Noch nicht erraten</b></div>`;

  let html=charLine;
  if(rows.length===0){
    html += '<div style="color:var(--muted);text-align:center;font-size:.8rem;padding:8px">Keine Einträge für diesen Tag</div>';
  } else {
    html += rows.map(([name,s],i)=>`
      <div class="lb-entry ${name===playerName?'me':''}">
        <div class="lb-entry-left">
          <span class="lb-entry-rank">${medals[i]||`${i+1}.`}</span>
          <span class="lb-entry-name ${name===playerName?'me':''}">${name}</span>
        </div>
        <div class="lb-entry-right">
          <span>🎯 <b style="color:var(--correct)">${s.attempts}</b> Versuch${s.attempts===1?'':'e'}</span>
          ${s.streak>1?`<span>🔥 <b style="color:var(--partial)">${s.streak}</b> Tage</span>`:''}
        </div>
      </div>`).join('');
  }
  const losers = Object.entries(dayData).filter(([,v])=>!v.won);
  if(losers.length>0){
    html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:.72rem;color:var(--muted)">Aufgegeben: ${losers.map(([n])=>n).join(', ')}</div>`;
  }
  document.getElementById('dailyLbRows').innerHTML = html;
}
function toggleDailyLb(){
  const p=document.getElementById('dailyLbPanel');
  p.classList.toggle('open');
  if(p.classList.contains('open')){ dailyViewDate=null; loadDailyLb(); }
}

// ── RENDER LEADERBOARD ────────────────────────────────────────────────────────
function renderLb(){
  const rows = Object.entries(leaderboard).sort((a,b)=>{
    if(b[1].streak!==a[1].streak) return b[1].streak-a[1].streak;
    return b[1].wins-a[1].wins;
  });
  const medals=['🥇','🥈','🥉'];
  const html = rows.length===0
    ? '<div style="color:var(--muted);text-align:center;font-size:.8rem">Noch keine Einträge</div>'
    : rows.map(([name,s],i)=>`
      <div class="lb-entry ${name===playerName?'me':''}">
        <div class="lb-entry-left">
          <span class="lb-entry-rank">${medals[i]||`${i+1}.`}</span>
          <span class="lb-entry-name ${name===playerName?'me':''}">${name}</span>
        </div>
        <div class="lb-entry-right">
          <span>🔥 <b style="color:var(--partial)">${s.streak}</b></span>
          <span>Best: <b>${s.bestStreak||0}</b></span>
          <span style="color:var(--correct)">${s.wins}W</span>
          <span style="color:var(--wrong)">${s.losses}L</span>
        </div>
      </div>`).join('');
  document.getElementById('lbRows').innerHTML = html;
  loadCombinedLb();
}
async function loadCombinedLb(){
  const medals=['🥇','🥈','🥉'];
  const rows = Object.entries(leaderboard).sort((a,b)=>b[1].wins-a[1].wins || a[1].losses-b[1].losses);
  if(rows.length===0) return;
  const prev = document.getElementById('lbPreview');
  prev.style.display='block';
  document.getElementById('lbPreviewRows').innerHTML = rows.slice(0,8).map(([name,s],i)=>`
    <div class="lb-row">
      <span class="lb-name">${medals[i]||`${i+1}.`} ${name}</span>
      <span class="lb-stats">🔥${s.bestStreak||0} · ${s.wins}W/${s.losses}L</span>
    </div>`).join('');
}

// ── SCREENS ───────────────────────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function joinGame(mode='endless'){
  const name = document.getElementById('nameInp').value.trim();
  const err = document.getElementById('nameErr');
  if(!name){ err.textContent='Bitte gib einen Namen ein!'; err.style.display='block'; return; }
  if(name.length>20){ err.textContent='Max. 20 Zeichen!'; err.style.display='block'; return; }
  err.style.display='none';
  playerName=name;
  localStorage.setItem('gtg_playerName', name);
  gameMode=mode;
  // Reset any leftover panel state from a previous mode/session so nothing leaks between modes
  document.getElementById('dailyLbPanel').classList.remove('open');
  document.getElementById('lbPanel').classList.remove('open');
  document.getElementById('dailyLbRows').innerHTML='<div style="color:var(--muted);text-align:center;font-size:.8rem;padding:12px">Lädt...</div>';
  dailyViewDate=null;
  updateStatsBar();
  showScreen('gameScreen');
  document.getElementById('headerSub').textContent = (mode==='daily' ? '📅 Täglicher Charakter' : '🎮 Endlos-Modus') + ' · Pokédle-Style';
  document.getElementById('dailyLbBtn').style.display = mode==='daily' ? 'block' : 'none';
  loadLb();
  if(mode==='daily') loadDailyLb();
  newGame();
}
function backToName(){ showScreen('nameScreen'); loadLb(); }

// ── STATS BAR ─────────────────────────────────────────────────────────────────
function updateStatsBar(){
  const s = getStats(playerName);
  document.getElementById('statsName').textContent = playerName;
  document.getElementById('statsStreak').textContent = s.streak;
  document.getElementById('statsBest').textContent = s.bestStreak||0;
  document.getElementById('statsWins').textContent = s.wins;
  document.getElementById('statsLosses').textContent = s.losses;
}
function toggleLb(){ document.getElementById('lbPanel').classList.toggle('open'); }

// ── GAME ──────────────────────────────────────────────────────────────────────
function newGame(){
  if(gameMode==='daily'){
    target = getDailyChar();
    const todayKey = 'gtg_daily_played_' + getDailyDateStr();
    const alreadyPlayed = localStorage.getItem(todayKey);
    if(alreadyPlayed){
      const d=JSON.parse(alreadyPlayed);
      document.getElementById('emptyState').style.display='none';
      if(d.won){
        document.getElementById('winBanner').classList.add('show');
        document.getElementById('winText').textContent=`Du hast ${target.n} heute in ${d.attempts} Versuch${d.attempts===1?'':'en'} erraten!`;
        document.getElementById('winStreak').textContent='';
        document.getElementById('searchInp').disabled=true;
        document.getElementById('guessBtn').disabled=true;
      } else if(d.gave_up){
        document.getElementById('solutionText').textContent=`${target.e} ${target.n} · ${target.sp}`;
        document.getElementById('loseBanner').classList.add('show');
        document.getElementById('searchInp').disabled=true;
        document.getElementById('guessBtn').disabled=true;
      }
      toast('Du hast heute schon gespielt!');
      return;
    }
  } else {
    target = C[Math.floor(Math.random()*C.length)];
  }
  guesses=[]; won=false; lost=false;
  revealedHints=[]; hintsUsed=[]; selectedChar=null;
  document.getElementById('searchInp').value='';
  document.getElementById('searchInp').disabled=false;
  document.getElementById('guessBtn').disabled=false;
  document.getElementById('winBanner').classList.remove('show');
  document.getElementById('loseBanner').classList.remove('show');
  document.getElementById('guessGrid').innerHTML='';
  document.getElementById('emptyState').style.display='block';
  document.getElementById('hintBox').classList.remove('show');
  document.getElementById('hintContent').innerHTML='';
  document.getElementById('giveUpBtn').style.display='block';
  document.getElementById('hintBtn').style.display='none';
  document.getElementById('knownRowWrap').style.display='none';
  updateCounter();
}

function updateCounter(){
  const realGuesses = guesses.filter(g=>!g._hint).length;
  document.getElementById('cntNum').textContent = guesses.length;
  document.getElementById('cntMax').textContent = MAX_GUESSES;
  const left = MAX_GUESSES - guesses.length;
  const cntLeft = document.getElementById('cntLeft');
  if(left<=5){ cntLeft.textContent = `(noch ${left})`; cntLeft.className='cnt-danger'; }
  else if(left<=10){ cntLeft.textContent = `(noch ${left})`; cntLeft.className='cnt-warn'; }
  else { cntLeft.textContent=''; }
  const nextHint = HINT_AT.find(t=>guesses.length<t && !hintsUsed.includes(t));
  const availableHint = HINT_AT.find(t=>guesses.length>=t && !hintsUsed.includes(t));
  document.getElementById('hintBtn').style.display = availableHint!==undefined ? 'inline-block' : 'none';
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
function onSearch(){
  const q = document.getElementById('searchInp').value.trim().toLowerCase();
  selectedChar=null;
  const box = document.getElementById('suggestions');
  if(!q){ box.innerHTML=''; box.classList.remove('open'); return; }
  const already = new Set(guesses.map(g=>g.n+'|'+g.fr));

  const allFranchises = [...new Set(C.map(c=>c.fr))];
  const matchingFr = q.length>=2 ? allFranchises.filter(f=>f.toLowerCase().includes(q)) : [];
  const isFrSearch = matchingFr.length>0;

  let matches;
  if(isFrSearch){
    matches = C.filter(c=>matchingFr.includes(c.fr) && !already.has(c.n+'|'+c.fr)).slice(0,60);
  } else {
    matches = C.filter(c=>c.n.toLowerCase().includes(q) && !already.has(c.n+'|'+c.fr)).slice(0,60);
  }
  if(matches.length===0){ box.innerHTML=''; box.classList.remove('open'); return; }

  let html='';
  if(isFrSearch){
    const grouped={};
    matches.forEach(ch=>{ if(!grouped[ch.fr]) grouped[ch.fr]=[]; grouped[ch.fr].push(ch); });
    for(const [fr,chars] of Object.entries(grouped)){
      html += `<div style="padding:5px 13px 3px;font-size:.65rem;color:var(--accent);font-family:'Rajdhani',sans-serif;font-weight:700;letter-spacing:.5px;text-transform:uppercase;background:rgba(0,229,255,.05);border-bottom:1px solid var(--border)">${fr}</div>`;
      chars.forEach(ch=>{
        const sn=ch.n.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        const sf=ch.fr.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        html += `<div class="sug-item" onclick="selectChar('${sn}','${sf}')">
          <span class="sug-emoji">${ch.e}</span>
          <div><div class="sug-name">${ch.n}</div><div class="sug-sub">${ch.sp}</div></div>
        </div>`;
      });
    }
  } else {
    html = matches.map(ch=>{
      const sn=ch.n.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const sf=ch.fr.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `<div class="sug-item" onclick="selectChar('${sn}','${sf}')">
        <span class="sug-emoji">${ch.e}</span>
        <div><div class="sug-name">${ch.n}</div><div class="sug-sub">${ch.sp}</div></div>
      </div>`;
    }).join('');
  }
  box.innerHTML=html;
  box.classList.add('open');
}
function selectChar(name, fr){
  selectedChar = fr ? C.find(c=>c.n===name && c.fr===fr) : C.find(c=>c.n===name);
  document.getElementById('searchInp').value=name;
  document.getElementById('suggestions').innerHTML='';
  document.getElementById('suggestions').classList.remove('open');
}
document.addEventListener('click', e=>{
  if(!e.target.closest('.search-wrap')) document.getElementById('suggestions').classList.remove('open');
});

// ── SUBMIT ────────────────────────────────────────────────────────────────────
function submitGuess(){
  if(won||lost) return;
  const val = document.getElementById('searchInp').value.trim();
  if(!val) return;
  let char = selectedChar || C.find(c=>c.n.toLowerCase()===val.toLowerCase()) || C.find(c=>c.n.toLowerCase().includes(val.toLowerCase()));
  if(!char){
    document.getElementById('searchInp').style.borderColor='var(--wrong)';
    setTimeout(()=>document.getElementById('searchInp').style.borderColor='',600);
    return;
  }
  if(guesses.find(g=>g.n===char.n)){
    document.getElementById('searchInp').value=''; selectedChar=null; return;
  }
  guesses.push(char);
  selectedChar=null;
  document.getElementById('searchInp').value='';
  document.getElementById('suggestions').classList.remove('open');
  document.getElementById('emptyState').style.display='none';
  updateCounter();
  renderRow(char, true);
  updateKnownRow();
  saveDailyProgress();

  if(char.n===target.n){
    won=true;
    setTimeout(()=>{
      document.getElementById('winText').textContent =
        gameMode==='daily' ? `Du hast den Tages-Charakter in ${guesses.length} Versuch${guesses.length===1?'':'en'} erraten!` : `Du hast ${target.n} in ${guesses.length} Versuch${guesses.length===1?'':'en'} erraten!`;
      const s=getStats(playerName);
      document.getElementById('winStreak').textContent = gameMode==='daily' ? '📅 Im Tages-Leaderboard eingetragen' : `🔥 Streak wird ${s.streak+1}`;
      document.getElementById('winBanner').classList.add('show');
      document.getElementById('searchInp').disabled=true;
      document.getElementById('guessBtn').disabled=true;
      document.getElementById('giveUpBtn').style.display='none';
      document.getElementById('hintBtn').style.display='none';
      recordResult(true, guesses.length);
    }, COL_KEYS.length*70+400);
  } else if(guesses.length>=MAX_GUESSES){
    lost=true;
    setTimeout(()=>endLose(), COL_KEYS.length*70+400);
  }
}
function giveUp(){ if(won||lost) return; lost=true; endLose(); }
function endLose(){
  document.getElementById('solutionText').textContent = `${target.e} ${target.n} · ${target.sp}`;
  document.getElementById('loseBanner').classList.add('show');
  document.getElementById('searchInp').disabled=true;
  document.getElementById('guessBtn').disabled=true;
  document.getElementById('giveUpBtn').style.display='none';
  document.getElementById('hintBtn').style.display='none';
  recordResult(false, guesses.length);
}

// ── HINT ──────────────────────────────────────────────────────────────────────
function useHint(){
  if(won||lost) return;
  const nextHint = HINT_AT.find(t=>guesses.length>=t && !hintsUsed.includes(t));
  if(!nextHint) return;
  const alreadyCorrect = new Set();
  guesses.filter(g=>!g._hint).forEach(g=>{
    COL_KEYS.forEach((key,idx)=>{ if(cellState(key,g,target)==='correct') alreadyCorrect.add(idx); });
  });
  const pool = COL_KEYS.map((_,i)=>i).filter(i=>!revealedHints.includes(i) && !alreadyCorrect.has(i));
  if(pool.length===0){ toast('Alle Kategorien sind bereits bekannt!'); return; }
  const pick = pool[Math.floor(Math.random()*pool.length)];
  revealedHints.push(pick);
  hintsUsed.push(nextHint);
  guesses.push({_hint:true, n:'__hint__', e:'', fr:'', sp:'', g:'', h:0, ha:'', w:'', p:''});

  const hintBox=document.getElementById('hintBox');
  hintBox.classList.add('show');
  document.getElementById('hintContent').innerHTML = revealedHints.map(idx=>`
    <span class="hint-item"><span class="hint-cat">${COL_NAMES[idx]}: </span><b>${cellText(COL_KEYS[idx],target[COL_KEYS[idx]])}</b></span>
  `).join('');
  updateKnownRow();
  updateCounter();
  toast(`💡 Tipp: ${COL_NAMES[pick]} = ${cellText(COL_KEYS[pick],target[COL_KEYS[pick]])} (kostet 1 Versuch)`);
}

// ── COMPARE ───────────────────────────────────────────────────────────────────
function cmpH(g,t){
  if(g===t) return {state:'correct',arrow:''};
  return {state: Math.abs(g-t)<=15 ? 'partial' : 'wrong', arrow: g<t?'↑':'↓'};
}
function cmpStr(g,t){
  if(!g||!t) return 'wrong';
  if(g===t) return 'correct';
  const strip=s=>s.toLowerCase().replace(/\s*\([^)]*\)/g,'').trim();
  const gp=g.toLowerCase().split('/').map(s=>s.trim());
  const tp=t.toLowerCase().split('/').map(s=>s.trim());
  if(gp.some(p=>tp.some(q=>q===p))) return 'partial';
  const gps=gp.map(strip), tps=tp.map(strip);
  if(gps.some(p=>p&&tps.some(q=>q&&q===p))) return 'partial';
  return 'wrong';
}
function cellState(key,guess,tgt){
  if(key==='h') return cmpH(guess.h,tgt.h).state;
  if(key==='ha'||key==='p'||key==='ge') return guess[key]===tgt[key] ? 'correct' : 'wrong';
  return cmpStr(guess[key],tgt[key]);
}
function cellArrow(key,guess,tgt){ return key==='h' ? cmpH(guess.h,tgt.h).arrow : ''; }
function cellText(key,val){
  if(key==='h') return val+' cm';
  return val;
}

// ── RENDER ROW ────────────────────────────────────────────────────────────────
function renderRow(char, animate){
  const nameState = char.n===target.n ? 'correct' : 'wrong';
  let html = `<div class="grid-row">
    <div class="cell name-cell ${animate?'reveal':''} ${nameState}" style="${animate?'animation-delay:0ms':''}">
      <span>${char.e}</span><span>${char.n}</span>
    </div>`;
  COL_KEYS.forEach((key,i)=>{
    const state = cellState(key,char,target);
    const arrow = cellArrow(key,char,target);
    const delay = animate ? `${(i+1)*70}ms` : '0ms';
    html += `<div class="cell ${animate?'reveal':''} ${state}" style="${animate?`animation-delay:${delay}`:''}">
      ${cellText(key,char[key])}${arrow?`<span style="margin-left:2px">${arrow}</span>`:''}
    </div>`;
  });
  html += '</div>';
  document.getElementById('guessGrid').insertAdjacentHTML('afterbegin', html);
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2500);
}

document.getElementById('nameInp').addEventListener('keydown', e=>{ if(e.key==='Enter') joinGame('endless'); });

// ── INIT ──────────────────────────────────────────────────────────────────────
(function restoreRememberedName(){
  try{
    const saved = localStorage.getItem('gtg_playerName');
    if(saved){
      const inp = document.getElementById('nameInp');
      inp.value = saved;
      inp.select();
    }
  } catch(e){}
})();
loadLb();
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{
      // If a new service worker takes control of an already-open page,
      // reload once so the fresh HTML/JS/CSS actually gets used.
      let hasReloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{
        if(hasReloaded) return;
        hasReloaded = true;
        window.location.reload();
      });
      // Proactively check for a newer service worker on every load
      reg.update().catch(()=>{});
    }).catch(()=>{});
  });
}
