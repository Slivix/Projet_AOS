// === Config API ===
// Local (déjà en place via proxy nginx/express) :
const API_LOCAL  = "/game-api";
// En ligne : préfixe via le proxy nginx frontal. Doit être routé vers
// http://game-service:8000/game-online/ (voir `frontend/nginx.conf`).
const API_ONLINE = "/game-online-api";

const $ = (id) => document.getElementById(id);

let state = null;              // état de la partie en cours (local OU en ligne)
let currentMode = "local";     // "local" | "online" | "ai"
let onlineContext = {          // petit contexte pour le mode online

  roomId: null,
  gameId: null,
  playerId: null,
  token: null
};

let onlinePollTimer = null;
function startOnlinePolling(){
  if (onlinePollTimer || !onlineContext.roomId) return;
  onlinePollTimer = setInterval(async ()=>{
    try {
      const next = await refreshOnline(onlineContext.roomId);
      if (next) { state = next; renderMeta(); renderBoard(); renderStatus(); }
    } catch(e) { /* ignore */ }
  }, 1500);
}
function stopOnlinePolling(){
  if (onlinePollTimer) { clearInterval(onlinePollTimer); onlinePollTimer = null; }
}

function clearOnlineState(){
  stopOnlinePolling();
  onlineContext.roomId = null;
  onlineContext.gameId = null;
  onlineContext.playerId = null;
  onlineContext.token = null;
  state = null;
  $("lobbies").textContent = "";
  renderMeta(); renderBoard(); renderStatus();
}


// ---------- Helpers fetch ----------
async function httpJson(url, opts = {}) {
  const r = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(opts.headers||{}) },
    ...opts
  });
  const isJson = (r.headers.get("content-type")||"").includes("application/json");
  const data = isJson ? await r.json() : await r.text();
  if (!r.ok) {
    const msg = (data && data.detail) ? data.detail : (typeof data === "string" ? data : "Erreur API");
    throw new Error(msg);
  }
  return data;
}

// ---------- Endpoints LOCAL (déjà fonctionnels) ----------
async function createGameLocal(payload) {
  // adapte si ton endpoint diffère: POST /game-api/ (ou /game-api/new)
  return httpJson(`${API_LOCAL}/`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function playMoveLocal(id, column, player_id) {
  return httpJson(`${API_LOCAL}/${id}/move`, {
    method: "PUT",
    body: JSON.stringify({ column, player_id })
  });
}

// ---------- Endpoints ONLINE (stubs sûrs + messages clairs) ----------
function onlineNotReady() {
  $("status").textContent = "Online endpoints are not reachable.";
}

async function createLobby({ name, rows, cols, connect } = {}) {
  // Appelle le game-service via le proxy nginx : POST /game-online/ avec { gameCode, playerName, rows, cols, connect }
  const playerName = (name || $("onlineName").value || localStorage.getItem("username") || "Joueur").trim();
  const rowsValue = Number.isFinite(rows) ? rows : parseInt($("rowsOnline").value,10);
  const colsValue = Number.isFinite(cols) ? cols : parseInt($("colsOnline").value,10);
  const connectValue = Number.isFinite(connect) ? connect : parseInt($("connectOnline").value,10);
  // Genere un code simple (tu peux remplacer par un input si tu veux choisir)
  const gameCode = `room-${Date.now()}`;
  try {
    const res = await httpJson(`${API_ONLINE}/`, {
      method: "POST",
      body: JSON.stringify({
        gameCode,
        playerName,
        rows: rowsValue,
        cols: colsValue,
        connect: connectValue,
        verify_user: false
      })
    });
    // res: { message, code, state }
    return { room_id: res.code, game_id: res.state?.id, state: res.state };
  } catch(e){
    onlineNotReady();
    throw e;
  }
}

async function listLobbies() {
  // Le backend actuel n'expose pas de liste globale de lobbies.
  // On essaie une route /lobbies si elle existe, sinon on indique que ce n'est pas supporté.
  try {
    return await httpJson(`${API_ONLINE}/lobbies`);
  } catch(e){
    onlineNotReady();
    return [];
  }
}

async function joinLobby(roomId, name) {
  try {
    const res = await httpJson(`${API_ONLINE}/join`, {
      method: "POST",
      body: JSON.stringify({ gameCode: roomId, playerName: name })
    });
    // res: { message, state }
    return { room_id: roomId, game_id: res.state?.id, state: res.state };
  } catch(e){
    onlineNotReady();
    throw e;
  }
}

async function refreshOnline(gameId) {
  // gameId here is actually the game code (roomId)
  try {
    const res = await httpJson(`${API_ONLINE}/${gameId}`);
    return res;
  } catch(e){
    onlineNotReady();
    return state || null;
  }
}

async function playMoveOnline(gameId, column, player_id) {
  // gameId here is the game code (roomId). PUT /{code}/move
  try {
    const res = await httpJson(`${API_ONLINE}/${gameId}/move`, {
      method: "PUT",
      body: JSON.stringify({ column, player_id })
    });
    return res;
  } catch(e){
    // fallback demo if API fails
    onlineNotReady();
    if (state) { state = applyMoveSim(column, player_id); return state; }
    return null;
  }
}

// Simulateur local d'un coup (utilisé par les stubs "online" en mode démo)
function applyMoveSim(column, player_id) {
  if (!state || !state.board) return state;
  const rows = state.board.length;
  const cols = state.board[0].length;
  if (column < 0 || column >= cols) return state;

  // déposer le jeton dans la colonne (de bas en haut)
  let placedRow = -1;
  for (let r = rows - 1; r >= 0; r--) {
    if (state.board[r][column] === 0) {
      state.board[r][column] = player_id;
      placedRow = r;
      break;
    }
  }
  if (placedRow === -1) return state; // colonne pleine

  // helper pour compter dans une direction
  function countDir(r, c, dr, dc) {
    let cnt = 0;
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && state.board[rr][cc] === player_id) {
      cnt++; rr += dr; cc += dc;
    }
    return cnt;
  }

  const need = (state.config && state.config.connect) ? state.config.connect : 4;
  // vérifier victoire sur 4 directions (horiz, vert, diag1, diag2)
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  let won = false;
  for (const [dr,dc] of dirs) {
    const total = 1 + countDir(placedRow, column, dr, dc) + countDir(placedRow, column, -dr, -dc);
    if (total >= need) { won = true; break; }
  }

  if (won) {
    state.status = "won";
    const pl = (state.players || []).find(p=>p.id===player_id);
    state.winner_name = pl ? pl.name : String(player_id);
  } else {
    // vérifier si plein => match nul
    const full = state.board.every(r => r.every(c => c !== 0));
    if (full) state.status = "draw";
    else state.status = "active";
    // avancer le joueur courant
    state.current_player_index = ((state.current_player_index||0) + 1) % (state.players ? state.players.length : 2);
  }

  return state;
}


function aiPickColumn(curState){
  if (!curState || !curState.board) return null;
  const board = curState.board;
  const rows = board.length;
  const cols = board[0].length;
  const connect = (curState.config && curState.config.connect) ? curState.config.connect : 4;
  const valid = [];
  for (let c = 0; c < cols; c++) {
    if (board[0][c] === 0) valid.push(c);
  }
  if (!valid.length) return null;
  for (const c of valid) {
    if (aiWouldWin(board, c, 2, connect)) return c;
  }
  for (const c of valid) {
    if (aiWouldWin(board, c, 1, connect)) return c;
  }
  return valid[Math.floor(Math.random() * valid.length)];
}

function aiWouldWin(board, col, pid, connect){
  const copy = board.map(r => r.slice());
  const row = aiDrop(copy, col, pid);
  if (row === null) return false;
  return aiCheckWin(copy, row, col, pid, connect);
}

function aiDrop(board, col, pid){
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = pid;
      return r;
    }
  }
  return null;
}

function aiCount(board, r, c, dr, dc, pid){
  const rows = board.length;
  const cols = board[0].length;
  let n = 0;
  while (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c] === pid) {
    n++; r += dr; c += dc;
  }
  return n;
}

function aiCheckWin(board, lastR, lastC, pid, connect){
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    const line = aiCount(board, lastR, lastC, dr, dc, pid) + aiCount(board, lastR, lastC, -dr, -dc, pid) - 1;
    if (line >= connect) return true;
  }
  return false;
}

// ---------- Rendu ----------
function renderMeta(){
  if(!state) { $("meta").textContent = ""; return; }
  const cfg = state.config || {rows:$("rows").value, cols:$("cols").value, connect:$("connect").value};
  const p = (state.players && state.players[state.current_player_index]) || {name:"?"};
  const winnerName = state.winner_id
    ? (state.players || []).find(pl => pl.id === state.winner_id)?.name
    : null;
  const who = state.status==="active"
    ? `Tour : <b>${p.name||"?"}</b>${p.id?` (id=${p.id})`:""}`
    : state.status==="won"
      ? `Victoire : <b>${winnerName || state.winner_name || "?"}</b>`
      : "Match nul";
  $("meta").innerHTML = `#${state.id || onlineContext.gameId || "?"} — ${cfg.rows}x${cfg.cols} — aligner ${cfg.connect}<br/>${who}`;
}

function renderBoard(){
  const boardEl = $("board");
  boardEl.innerHTML = "";
  if (!state || !state.board) return;

  const cols = (state.config && state.config.cols) || state.board[0].length;
  boardEl.style.display = "grid";
  boardEl.style.gridTemplateColumns = `repeat(${cols}, 48px)`;

  state.board.forEach((row, rIdx)=>{
    row.forEach((cell, cIdx)=>{
      const d = document.createElement("div");
      d.className = "cell " + (cell===0?"":(cell===state.players?.[0]?.id?"p1":"p2"));
      d.title = `Colonne ${cIdx}`;
      d.onclick = async ()=>{
        if(state.status!=="active") return;
        if (currentMode === "online") {
          if (!onlineContext.roomId) return alert("Pas de partie en ligne attachee.");
          if (!onlineContext.playerId) return alert("Rejoins un lobby pour jouer.");
          if (state.players && state.players.length < 2) return alert("En attente d'un adversaire.");
          const curOnline = state.players?.[state.current_player_index];
          if (curOnline && curOnline.id !== onlineContext.playerId) return alert("Ce n'est pas ton tour.");
        }
        if (currentMode === "ai") {
          const curAi = state.players?.[state.current_player_index];
          if (curAi && curAi.id !== 1) return;
        }
        try {
          if (currentMode === "local" || currentMode === "ai") {
            const cur = state.players[state.current_player_index];
            state = await playMoveLocal(state.id, cIdx, cur.id);
          } else {
            const cur = state.players?.[state.current_player_index] || {id: onlineContext.playerId};
            state = await playMoveOnline(onlineContext.roomId, cIdx, onlineContext.playerId);
          }
          renderMeta(); renderBoard(); renderStatus();
          if (currentMode === "ai" && state && state.status === "active") {
            setTimeout(async ()=>{
              if (currentMode !== "ai" || !state || state.status !== "active") return;
              const cur = state.players?.[state.current_player_index];
              if (!cur || cur.id !== 2) return;
              const col = aiPickColumn(state);
              if (col === null) return;
              try {
                state = await playMoveLocal(state.id, col, 2);
                renderMeta(); renderBoard(); renderStatus();
              } catch(e) { console.error(e); }
            }, 300);
          }
        } catch(e){ alert(e.message); }
      };
      boardEl.appendChild(d);
    });
  });
}

function renderStatus(){
  if (!state) { $("status").textContent = ""; return; }
  if (currentMode === "online") {
    if (!state.players || state.players.length < 2) {
      $("status").textContent = "En attente d'un adversaire...";
      return;
    }
    if (state.status === "active") {
      const cur = state.players[state.current_player_index];
      const isMe = onlineContext.playerId && cur && cur.id === onlineContext.playerId;
      $("status").textContent = isMe ? "A toi de jouer." : ("Tour de " + (cur?.name || "?") + ".");
      return;
    }
  }
  if (currentMode === "ai" && state.status === "active") {
    const cur = state.players[state.current_player_index];
    const isMe = cur && cur.id === 1;
    $("status").textContent = isMe ? "A toi de jouer." : "IA joue...";
    return;
  }
  $("status").textContent = state.status==="active" ? "En cours..." : (state.status==="won" ? "Termine : victoire" : "Termine : nul");
}

// ---------- Actions UI ----------
$("newGame").onclick = async ()=>{
  const username = localStorage.getItem("username") || "Joueur1";
  const rows = parseInt($("rows").value,10);
  const cols = parseInt($("cols").value,10);
  const connect = parseInt($("connect").value,10);
  const p2 = ($("p2").value || "Bob").trim();
  const p2Name = (currentMode === "ai") ? "IA" : p2;

  // payload “simple” pour coller à ton service actuel
  const payload = { id: Date.now(), players:[{id:1,name:username},{id:2,name:p2Name}], rows, cols, connect };
  try {
    state = await createGameLocal(payload);
    renderMeta(); renderBoard(); renderStatus();
  } catch(e){ alert(e.message); }
};

// radio “mode”
$("modeLocal").addEventListener("change", ()=> {
  if ($("modeLocal").checked){
    currentMode = "local";
    $("localSection").style.display = "";
    $("onlineSection").style.display = "none";
    $("aiOptions").style.display = "none";
    $("p2").disabled = false;
    stopOnlinePolling();
  }
});
$("modeOnline").addEventListener("change", ()=> {
  if ($("modeOnline").checked){
    currentMode = "online";
    $("localSection").style.display = "none";
    $("onlineSection").style.display = "";
    $("aiOptions").style.display = "none";
    $("p2").disabled = false;
    // pr??remplir pseudo
    $("onlineName").value = localStorage.getItem("username") || $("onlineName").value || "";
    startOnlinePolling();
  }
});
$("modeAi").addEventListener("change", ()=> {
  if ($("modeAi").checked){
    currentMode = "ai";
    $("localSection").style.display = "";
    $("onlineSection").style.display = "none";
    $("aiOptions").style.display = "";
    $("p2").value = "IA";
    $("p2").disabled = true;
    stopOnlinePolling();
  }
});

// Boutons ONLINE
$("btnCreateLobby").onclick = async ()=>{
  try {
    const name = ($("onlineName").value || localStorage.getItem("username") || "Joueur").trim();
    const rows = parseInt($("rowsOnline").value,10);
    const cols = parseInt($("colsOnline").value,10);
    const connect = parseInt($("connectOnline").value,10);

    const res = await createLobby({ name, rows, cols, connect });
    onlineContext.roomId = res.room_id;
    onlineContext.gameId = res.game_id || null;
    onlineContext.token  = res.state?.host_token || null;
    state = res.state || null;
    onlineContext.playerId = res.state?.players?.[0]?.id || 1;
    renderMeta(); renderBoard(); renderStatus();
    startOnlinePolling();

    $("lobbies").innerText = "Lobby cree: " + onlineContext.roomId + (onlineContext.gameId ? " (game=" + onlineContext.gameId + ")" : "");
  } catch(e){ alert(e.message); }
};

$("btnListLobbies").onclick = async ()=>{
  try {
    const list = await listLobbies();
    $("lobbies").innerHTML = (list && list.length)
      ? list.map(x=>`- ${x.room_id} (${(x.players||[]).join(", ") || "empty"})`).join("<br>")
      : "Aucun lobby disponible.";
  } catch(e){ alert(e.message); }
};

$("btnJoinLobby").onclick = async ()=>{
  try {
    const roomId = $("joinRoomId").value.trim();
    if (!roomId) return alert("Saisis un ID de lobby.");
    const name = ($("onlineName").value || localStorage.getItem("username") || "Joueur").trim();

    const res = await joinLobby(roomId, name);
    onlineContext.roomId = res.room_id;
    onlineContext.gameId = res.game_id;
    // trouver l'ID du joueur créé dans l'état retourné
    onlineContext.playerId = res.state?.players?.find(p=>p.name===name)?.id || null;
    onlineContext.token = null;

    // récupérer l’état initial
    state = res.state || await refreshOnline(onlineContext.roomId);
    if (!state) { state = { id: onlineContext.gameId || onlineContext.roomId, status:"active", config:{rows:6,cols:7,connect:4}, players:[{id:1,name:"Joueur1"},{id:2,name:"Joueur2"}], current_player_index:0, board:Array.from({length:6},()=>Array(7).fill(0)) }; }
    renderMeta(); renderBoard(); renderStatus();
    startOnlinePolling();
  } catch(e){ alert(e.message); }
};

$("btnRefresh").onclick = async ()=>{
  if (!onlineContext.roomId) return alert("Pas de partie en ligne attachée.");
  try {
    state = await refreshOnline(onlineContext.roomId);
    renderMeta(); renderBoard(); renderStatus();
  } catch(e){ alert(e.message); }
};

$("btnLeaveLobby").onclick = async ()=>{
  clearOnlineState();
};

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "user.html";
  });
}

// premier rendu “vide”
renderStatus();
