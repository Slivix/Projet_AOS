const USER_API = "http://localhost:8002";

const $ = (id) => document.getElementById(id);

function formatHistoryDate(value){
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR");
}

function formatDuration(seconds){
  if (seconds === null || seconds === undefined) return "";
  const total = Math.max(0, Number(seconds));
  if (!Number.isFinite(total)) return "";
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m${String(secs).padStart(2, "0")}s`;
}

function renderHistoryStats(items){
  const statsEl = $("historyStats");
  if (!statsEl) return;
  if (!Array.isArray(items) || items.length === 0) {
    statsEl.innerHTML = "";
    return;
  }
  const total = items.length;
  const wins = items.filter(i => i.result === "win").length;
  const losses = items.filter(i => i.result === "loss").length;
  const draws = items.filter(i => i.result === "draw").length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const winMoves = items.filter(i => i.result === "win" && Number.isFinite(i.move_count));
  const avgMovesToWin = winMoves.length
    ? Math.round(winMoves.reduce((sum, i) => sum + i.move_count, 0) / winMoves.length)
    : null;
  const allMoves = items.filter(i => Number.isFinite(i.move_count));
  const avgMovesPerGame = allMoves.length
    ? Math.round(allMoves.reduce((sum, i) => sum + i.move_count, 0) / allMoves.length)
    : null;

  statsEl.innerHTML = [
    `<div class="history-stat"><strong>${total}</strong>Parties</div>`,
    `<div class="history-stat"><strong>${winRate}%</strong>Taux de victoire</div>`,
    `<div class="history-stat"><strong>${wins}/${losses}/${draws}</strong>V/D/N</div>`,
    `<div class="history-stat"><strong>${avgMovesToWin ?? "-"}</strong>Coups moyens (victoire)</div>`,
    `<div class="history-stat"><strong>${avgMovesPerGame ?? "-"}</strong>Coups moyens (partie)</div>`
  ].join("");
}

function renderHistory(items){
  const listEl = $("historyList");
  const emptyEl = $("historyEmpty");
  if (!listEl || !emptyEl) return;
  if (!Array.isArray(items) || items.length === 0) {
    emptyEl.textContent = "Aucune partie enregistree.";
    listEl.innerHTML = "";
    renderHistoryStats([]);
    return;
  }
  emptyEl.textContent = "";
  listEl.innerHTML = "";
  renderHistoryStats(items);
  const ordered = items.slice().reverse();
  ordered.forEach((item)=>{
    const mode = item.mode || "local";
    const rows = item.rows || "?";
    const cols = item.cols || "?";
    const connect = item.connect || "?";
    const opponent = item.opponent || "?";
    const winner = item.winner || "?";

    const resultKey = (item.result === "win" || item.result === "loss" || item.result === "draw")
      ? item.result
      : "draw";
    const resultLabel = item.result === "win" ? "Victoire" : (item.result === "loss" ? "Defaite" : "Nul");

    const row = document.createElement("div");
    row.className = "history-item";

    const main = document.createElement("div");
    main.className = "history-main";
    const title = document.createElement("div");
    title.textContent = `${mode} - ${rows}x${cols} - aligner ${connect}`;
    const sub = document.createElement("div");
    sub.className = "history-sub";
    const movesLabel = Number.isFinite(item.move_count) ? `Coups: ${item.move_count}` : null;
    const durationLabel = item.duration_s ? `Duree: ${formatDuration(item.duration_s)}` : null;
    const extra = [movesLabel, durationLabel].filter(Boolean).join(" | ");
    sub.textContent = `Adversaire: ${opponent} | Gagnant: ${winner}${extra ? " | " + extra : ""}`;
    main.appendChild(title);
    main.appendChild(sub);

    const meta = document.createElement("div");
    meta.className = "history-meta";
    const badge = document.createElement("span");
    badge.className = `tag result ${resultKey}`;
    badge.textContent = resultLabel;
    const date = document.createElement("span");
    date.textContent = formatHistoryDate(item.ended_at);
    meta.appendChild(badge);
    meta.appendChild(date);

    row.appendChild(main);
    row.appendChild(meta);
    listEl.appendChild(row);
  });
}

async function loadHistory(){
  const listEl = $("historyList");
  const emptyEl = $("historyEmpty");
  if (!listEl || !emptyEl) return;
  const username = localStorage.getItem("username");
  if (!username) {
    emptyEl.textContent = "Connecte-toi pour voir l'historique.";
    listEl.innerHTML = "";
    renderHistoryStats([]);
    return;
  }
  try {
    const res = await fetch(`${USER_API}/users/history/${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("history");
    const items = await res.json();
    renderHistory(items);
  } catch (e) {
    emptyEl.textContent = "Impossible de charger l'historique.";
    listEl.innerHTML = "";
    renderHistoryStats([]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const historyBtn = $("btnHistoryRefresh");
  if (historyBtn) { historyBtn.onclick = loadHistory; }

  const logoutBtn = $("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      window.location.href = "user.html";
    });
  }

  loadHistory();
});
