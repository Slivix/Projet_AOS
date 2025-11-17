// Utilise le proxy défini dans nginx.conf
const API = "/game-api";
const $ = (id) => document.getElementById(id);
let state = null;

async function createGame(payload){
  const r = await fetch(`${API}/`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  const data = await r.json(); if(!r.ok) throw new Error(data?.detail || "create failed"); return data;
}
async function playMove(id, column, player_id){
  const r = await fetch(`${API}/${id}/move`, {
    method:"PUT", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ column, player_id })
  });
  const data = await r.json(); if(!r.ok) throw new Error(data?.detail || "move failed"); return data;
}
function renderMeta(){
  if(!state) return;
  const p = state.players[state.current_player_index];
  const who = state.status==="active" ? `Tour : <b>${p.name}</b> (id=${p.id})`
            : state.status==="won" ? `Victoire : <b>${state.winner_id===state.players[0].id?state.players[0].name:state.players[1].name}</b>` : "Match nul";
  $("meta").innerHTML = `#${state.id} — ${state.config.rows}x${state.config.cols} — aligner ${state.config.connect}<br/>${who}`;
}
function renderBoard(){
  const boardEl = $("board");
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${state.config.cols}, 48px)`;
  state.board.forEach((row)=>row.forEach((cell,c)=>{
    const d = document.createElement("div");
    d.className = "cell " + (cell===0?"":(cell===state.players[0].id?"p1":"p2"));
    d.title = `Colonne ${c}`;
    d.onclick = async ()=>{
      if(state.status!=="active") return;
      try { const cur = state.players[state.current_player_index];
            state = await playMove(state.id, c, cur.id);
            renderMeta(); renderBoard(); renderStatus(); }
      catch(e){ alert(e.message); }
    };
    boardEl.appendChild(d);
  }));
}
function renderStatus(){
  $("status").textContent = !state ? "" : state.status==="active"?"En cours...":(state.status==="won"?"Terminé : victoire":"Terminé : nul");
}
$("newGame").onclick = async ()=>{
  const username = localStorage.getItem("username") || "Joueur1";
  const rows = parseInt($("rows").value,10), cols = parseInt($("cols").value,10), connect = parseInt($("connect").value,10);
  const p2 = (document.getElementById("p2").value || "Bob").trim();
  const payload = { id:Date.now(), players:[{id:1,name:username},{id:2,name:p2}], rows, cols, connect };
  try { state = await createGame(payload); renderMeta(); renderBoard(); renderStatus(); }
  catch(e){ alert(e.message); }
};
