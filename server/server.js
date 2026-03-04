const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");

const PORT = process.env.PORT || 3001;

// ── Teks kemerdekaan ──
const TEXTS = [
  "Pada tanggal 17 Agustus 1945, Soekarno membacakan teks proklamasi kemerdekaan Indonesia di Jalan Pegangsaan Timur nomor 56, Jakarta, menandai lahirnya bangsa yang merdeka dari penjajahan.",
  "Setelah tiga setengah abad dijajah Belanda dan tiga tahun di bawah pendudukan Jepang, rakyat Indonesia akhirnya meraih kemerdekaan yang telah lama diperjuangkan dengan darah dan air mata.",
  "Bung Karno dan Bung Hatta adalah dua tokoh proklamator yang namanya abadi dalam sejarah perjuangan bangsa Indonesia menuju gerbang kemerdekaan yang penuh dengan pengorbanan dan keberanian.",
  "Para pemuda pejuang kemerdekaan mendesak Soekarno dan Hatta agar segera memproklamasikan kemerdekaan Indonesia tanpa menunggu persetujuan Jepang yang telah menyerah kepada Sekutu.",
  "Peristiwa Rengasdengklok terjadi saat para pemuda membawa Soekarno dan Hatta ke luar Jakarta demi menjauhkan mereka dari pengaruh Jepang sebelum proklamasi kemerdekaan dikumandangkan.",
  "Teks proklamasi yang singkat namun penuh makna dirumuskan oleh Soekarno, Hatta, dan Achmad Soebardjo di rumah Laksamana Maeda pada malam menjelang fajar kemerdekaan Indonesia.",
  "Fatmawati, istri Soekarno, menjahit dengan tangannya sendiri Bendera Merah Putih yang dikibarkan pertama kali pada hari proklamasi sebagai simbol kedaulatan dan kebanggaan bangsa Indonesia.",
  "Pertempuran Surabaya pada November 1945 menjadi bukti nyata semangat arek-arek Surabaya yang berjuang mempertahankan kemerdekaan melawan pasukan asing dengan penuh keberanian dan tekad bulat.",
  "Semangat juang para pahlawan bangsa mengajarkan kita bahwa kemerdekaan bukan hadiah melainkan hasil perjuangan panjang yang mengorbankan jiwa raga demi generasi penerus yang lebih baik.",
  "Tan Malaka, Sutan Sjahrir, dan banyak tokoh pejuang lainnya rela diasingkan oleh penjajah demi menjaga api semangat kemerdekaan tetap menyala di hati seluruh rakyat Indonesia.",
];

// ── rooms — HARUS di atas wss.on ──
const rooms = {};

function initRoom() {
  return {
    phase: "lobby",
    gameText: "",
    countdownStart: null,
    winner: null,
    player1: { id: null, ready: false, progress: 0, wpm: 0, accuracy: 100, done: false, finishedAt: null },
    player2: { id: null, ready: false, progress: 0, wpm: 0, accuracy: 100, done: false, finishedAt: null },
  };
}

function broadcast(roomId, data) {
  const room = rooms[roomId];
  if (!room) return;
  const msg = JSON.stringify(data);
  room.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}

// ── HTTP server untuk health check Railway ──
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Type Race Server OK");
});

// ── WebSocket server ──
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  let currentRoom = null;
  let currentSlot = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === "join") {
      const { roomId, slot, playerId } = msg;
      if (!rooms[roomId]) rooms[roomId] = { state: initRoom(), clients: new Set() };
      const room = rooms[roomId];
      const state = room.state;
      if (state[slot].id && state[slot].id !== playerId) {
        send(ws, { type: "error", message: `Slot ${slot === "player1" ? "Player 1" : "Player 2"} sudah dipakai!` });
        return;
      }
      state[slot].id = playerId;
      currentRoom = roomId;
      currentSlot = slot;
      room.clients.add(ws);
      broadcast(roomId, { type: "sync", state });
    }

    else if (msg.type === "ready") {
      if (!currentRoom) return;
      const state = rooms[currentRoom].state;
      state[currentSlot].ready = true;
      const bothReady = state.player1.id && state.player2.id && state.player1.ready && state.player2.ready;
      if (bothReady && state.phase === "lobby") {
        state.phase = "countdown";
        state.countdownStart = Date.now();
        state.gameText = TEXTS[Math.floor(Math.random() * TEXTS.length)];
        state.winner = null;
        state.player1 = { ...state.player1, progress: 0, wpm: 0, accuracy: 100, done: false, finishedAt: null };
        state.player2 = { ...state.player2, progress: 0, wpm: 0, accuracy: 100, done: false, finishedAt: null };
        broadcast(currentRoom, { type: "sync", state });
        setTimeout(() => {
          const r = rooms[currentRoom];
          if (r && r.state.phase === "countdown") {
            r.state.phase = "playing";
            broadcast(currentRoom, { type: "sync", state: r.state });
          }
        }, 3500);
      } else {
        broadcast(currentRoom, { type: "sync", state });
      }
    }

    else if (msg.type === "progress") {
      if (!currentRoom) return;
      const state = rooms[currentRoom].state;
      const { progress, wpm, accuracy, done } = msg;
      state[currentSlot].progress = progress;
      state[currentSlot].wpm = wpm;
      state[currentSlot].accuracy = accuracy;
      if (done && !state[currentSlot].done) {
        state[currentSlot].done = true;
        state[currentSlot].finishedAt = Date.now();
        const opp = currentSlot === "player1" ? "player2" : "player1";
        state.winner = state[opp].done
          ? (state.player1.finishedAt <= state.player2.finishedAt ? "player1" : "player2")
          : currentSlot;
        state.phase = "finished";
      }
      broadcast(currentRoom, { type: "sync", state });
    }

    else if (msg.type === "reset") {
      if (!currentRoom) return;
      const newState = initRoom();
      newState.player1.id = rooms[currentRoom].state.player1.id;
      newState.player2.id = rooms[currentRoom].state.player2.id;
      rooms[currentRoom].state = newState;
      broadcast(currentRoom, { type: "sync", state: newState });
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].clients.delete(ws);
      if (rooms[currentRoom].clients.size === 0) {
        setTimeout(() => {
          if (rooms[currentRoom]?.clients.size === 0) delete rooms[currentRoom];
        }, 5 * 60 * 1000);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Type Race server running on port ${PORT}`);
});
