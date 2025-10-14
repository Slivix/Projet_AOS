const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(__dirname));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "user.html"));
});

// Accès direct propre
app.get("/user.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "user.html"));
});
app.get("/game.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "game.html"));
});

//  ping
app.get("/healthz", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend running on http://0.0.0.0:${PORT}`);
});
