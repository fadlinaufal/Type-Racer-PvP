import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────
// Ganti ini dengan URL Railway kamu setelah deploy server!
// Contoh: "wss://typing-race-production.up.railway.app"
const WS_URL = import.meta.env.VITE_WS_URL || "wss://GANTI-DENGAN-URL-RAILWAY-KAMU.up.railway.app";
// ─────────────────────────────────────────────────────────

const C = {
  p1: "#00f5d4", p2: "#f72585",
  bg: "#0a0a0f", border: "#1e1e2e",
  text: "#e0e0f0", dim: "#444466", gold: "#ffd60a",
};

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Particles ──
function Particles({ color }) {
  const pts = Array.from({ length: 55 }, (_, i) => ({
    id: i, left: Math.random() * 100,
    size: Math.random() * 5 + 3,
    dur: Math.random() * 2 + 1.5,
    delay: Math.random() * 0.8,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 45 }}>
      {pts.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: `${p.left}vw`, top: -10,
          width: p.size, height: p.size, borderRadius: "50%", background: color,
          animation: `ptfall ${p.dur}s ${p.delay}s linear forwards`,
        }} />
      ))}
    </div>
  );
}

// ── TextDisplay ──
function TextDisplay({ gameText, typed, color }) {
  const cursorRef = useRef(null);
  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [typed]);

  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: 10, padding: "18px 20px",
      fontFamily: "'Share Tech Mono', monospace", fontSize: "0.9rem",
      lineHeight: 2.2, overflowY: "auto", overflowX: "hidden",
      wordBreak: "break-word", minHeight: 0,
    }}>
      {gameText.split("").map((ch, i) => {
        const isCursor = i === typed.length;
        const correct = i < typed.length && typed[i] === ch;
        const wrong = i < typed.length && typed[i] !== ch;
        return (
          <span key={i} ref={isCursor ? cursorRef : null} style={{
            color: correct ? "#3a3a5c" : wrong ? "#ff6b6b" : "#c8cce8",
            background: wrong ? "rgba(255,80,80,0.18)" : "transparent",
            borderRadius: wrong ? 2 : 0,
            borderLeft: isCursor ? `2px solid ${color}` : "none",
            marginLeft: isCursor ? -1 : 0,
            animation: isCursor ? "blink 0.8s infinite" : "none",
          }}>{ch}</span>
        );
      })}
    </div>
  );
}

// ── Opponent Panel ──
function OppPanel({ label, color, progress, wpm, accuracy, done, online }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "16px 24px", gap: 14, minHeight: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "1.5rem", letterSpacing: "0.2em", color, textShadow: `0 0 18px ${color}80` }}>
          ⬡ {label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: online ? "#44ff88" : C.dim, boxShadow: online ? "0 0 6px #44ff88" : "none" }} />
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.65rem", color: online ? "#44ff88" : C.dim, letterSpacing: "0.1em" }}>
            {online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        {[["WPM", wpm], ["AKURASI", accuracy + "%"], ["PROGRESS", progress + "%"]].map(([lbl, val]) => (
          <div key={lbl}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "1.3rem", fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color: C.dim, textTransform: "uppercase" }}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "relative", paddingTop: 18 }}>
        <div style={{ position: "absolute", right: 0, top: 0, fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", color }}>{progress}%</div>
        <div style={{ height: 10, background: C.border, borderRadius: 5, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, borderRadius: 5, background: `linear-gradient(90deg, ${color}55, ${color})`, boxShadow: `0 0 10px ${color}`, transition: "width 0.3s ease" }} />
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, minHeight: 120 }}>
        {done ? (
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "2rem", color, letterSpacing: "0.2em" }}>✓ SELESAI</div>
        ) : online ? (
          <>
            <div style={{ width: 36, height: 36, border: `3px solid ${color}33`, borderTopColor: color, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", color: C.dim, letterSpacing: "0.1em" }}>LAWAN SEDANG MENGETIK...</div>
          </>
        ) : (
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "0.7rem", color: C.dim, letterSpacing: "0.1em" }}>MENUNGGU LAWAN...</div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════
// MAIN APP
// ════════════════════════════════════
export default function TypeRace() {
  const [playerId] = useState(() => uid());
  const [roomInput, setRoomInput] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mySlot, setMySlot] = useState(null);
  const [room, setRoom] = useState(null);
  const [screen, setScreen] = useState("home");
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);

  // typing state
  const [typed, setTyped] = useState("");
  const [myErrors, setMyErrors] = useState(0);
  const [myTotal, setMyTotal] = useState(0);
  const [myStartTime, setMyStartTime] = useState(null);

  const wsRef = useRef(null);
  const inputRef = useRef(null);
  const countdownRef = useRef(null);
  const roomRef = useRef(null); roomRef.current = room;
  const mySlotRef = useRef(null); mySlotRef.current = mySlot;
  const screenRef = useRef("home"); screenRef.current = screen;
  const typedRef = useRef(""); typedRef.current = typed;
  const errRef = useRef(0); errRef.current = myErrors;
  const totRef = useRef(0); totRef.current = myTotal;
  const startRef = useRef(null); startRef.current = myStartTime;

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // ── Connect WebSocket ──
  const connect = useCallback((roomId) => {
    if (wsRef.current) wsRef.current.close();
    setWsStatus("connecting");
    setError("");

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      if (msg.type === "sync") {
        const state = msg.state;
        setRoom(state);

        // Screen transitions
        if (state.phase === "playing" && screenRef.current !== "playing" && screenRef.current !== "finished") {
          setScreen("playing");
          setTyped(""); setMyErrors(0); setMyTotal(0); setMyStartTime(null);
          setTimeout(() => inputRef.current?.focus(), 150);
        }
        if (state.phase === "finished" && screenRef.current !== "finished") {
          setScreen("finished");
        }
        if (state.phase === "lobby" && screenRef.current === "finished") {
          setScreen("lobby");
        }
        if (state.phase === "countdown" && state.countdownStart) {
          if (screenRef.current !== "countdown" && screenRef.current !== "playing") {
            setScreen("countdown");
          }
          clearInterval(countdownRef.current);
          countdownRef.current = setInterval(() => {
            const rem = Math.ceil((state.countdownStart + 3500 - Date.now()) / 1000);
            setCountdown(Math.max(0, rem));
            if (rem <= 0) clearInterval(countdownRef.current);
          }, 100);
        }
      }

      if (msg.type === "error") {
        setError(msg.message);
      }
    };

    ws.onerror = () => setError("Gagal konek ke server. Pastikan URL WebSocket sudah benar di VITE_WS_URL.");
    ws.onclose = () => setWsStatus("disconnected");
  }, []);

  // ── Join room ──
  const handleJoinRoom = () => {
    const id = roomInput.trim().toLowerCase().replace(/\s+/g, "-") || uid();
    setRoomId(id);
    setRoomInput(id);
    connect(id);
    setScreen("lobby");
  };

  // After connect, auto-send join if slot already picked
  useEffect(() => {
    if (wsStatus === "connected" && roomId && mySlot) {
      send({ type: "join", roomId, slot: mySlot, playerId });
    }
  }, [wsStatus, roomId, mySlot, playerId, send]);

  // ── Claim slot ──
  const claimSlot = (slot) => {
    if (wsStatus !== "connected") { setError("Belum terhubung ke server."); return; }
    setMySlot(slot);
    send({ type: "join", roomId, slot, playerId });
  };

  // ── Ready ──
  const handleReady = () => send({ type: "ready" });

  // ── Typing ──
  const handleInput = useCallback((e) => {
    const val = e.target.value;
    const gameText = roomRef.current?.gameText;
    if (!gameText || screenRef.current !== "playing") return;

    const newStart = startRef.current ?? (val.length > 0 ? Date.now() : null);
    if (!startRef.current && val.length > 0) setMyStartTime(newStart);

    let newErr = errRef.current, newTot = totRef.current;
    if (val.length > typedRef.current.length) {
      const idx = val.length - 1;
      newTot++;
      if (val[idx] !== gameText[idx]) newErr++;
      setMyErrors(newErr); setMyTotal(newTot);
    }

    const clipped = val.slice(0, gameText.length);
    if (val.length > gameText.length) e.target.value = clipped;
    setTyped(clipped);

    const progress = Math.round((clipped.length / gameText.length) * 100);
    const accuracy = newTot > 0 ? Math.round(((newTot - newErr) / newTot) * 100) : 100;
    const mins = ((Date.now() - (newStart ?? Date.now())) / 60000) || 0.001;
    const words = clipped.trim().split(/\s+/).filter(Boolean).length;
    const wpm = Math.round(words / mins);
    const done = clipped === gameText;

    send({ type: "progress", progress, wpm, accuracy, done });
  }, [send]);

  // ── Reset ──
  const handleReset = () => {
    setTyped(""); setMyErrors(0); setMyTotal(0); setMyStartTime(null);
    send({ type: "reset" });
  };

  useEffect(() => () => clearInterval(countdownRef.current), []);

  // derived
  const myData = room?.[mySlot] ?? {};
  const oppSlot = mySlot === "player1" ? "player2" : "player1";
  const oppData = room?.[oppSlot] ?? {};
  const meColor = mySlot === "player1" ? C.p1 : C.p2;
  const oppColor = mySlot === "player1" ? C.p2 : C.p1;
  const p1taken = !!(room?.player1?.id);
  const p2taken = !!(room?.player2?.id);
  const winnerColor = room?.winner === "player1" ? C.p1 : C.p2;
  const iWon = room?.winner === mySlot;
  const oppOnline = wsStatus === "connected";

  const copyCode = () => {
    navigator.clipboard?.writeText(roomId.toUpperCase());
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ── btn style helper ──
  const btn = (color, small = false) => ({
    fontFamily: "'Bebas Neue', cursive",
    fontSize: small ? "0.9rem" : "1.2rem",
    letterSpacing: "0.22em",
    padding: small ? "8px 20px" : "13px 42px",
    border: "none", borderRadius: 6, cursor: "pointer",
    background: color, color: C.bg,
    boxShadow: `0 0 18px ${color}55`,
    transition: "all 0.2s",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&family=Rajdhani:wght@400;600;700&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes glitch{0%,90%,100%{transform:none}92%{transform:translateX(-3px)}94%{transform:translateX(3px)}96%{transform:translateX(-1px)}}
        @keyframes ptfall{0%{transform:translateY(-10px) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes countpop{0%{transform:scale(2.5);opacity:0}30%{opacity:1}100%{transform:scale(0.7);opacity:0}}
        @keyframes fadein{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e1e2e;border-radius:2px}
        input::placeholder{color:#444466!important}
      `}</style>

      <div style={{ background: C.bg, fontFamily: "'Rajdhani',sans-serif", color: C.text, height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Grid bg */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(rgba(0,245,212,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,212,0.03) 1px,transparent 1px)`, backgroundSize: "40px 40px" }} />
        {/* Scanlines */}
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px)" }} />

        {/* HEADER */}
        <header style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: `1px solid ${C.border}`, flexShrink: 0, background: "linear-gradient(180deg,rgba(15,15,26,0.9) 0%,transparent 100%)", zIndex: 10 }}>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "2.2rem", letterSpacing: "0.3em", background: `linear-gradient(90deg,${C.p1},#fff,${C.p2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>TYPE RACE</div>

          <div style={{ position: "absolute", right: 20, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            {roomId && <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "0.68rem", color: C.dim }}>ROOM: <span style={{ color: C.gold }}>{roomId.toUpperCase()}</span></div>}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: wsStatus === "connected" ? "#44ff88" : wsStatus === "connecting" ? C.gold : "#ff4444", boxShadow: wsStatus === "connected" ? "0 0 5px #44ff88" : "none" }} />
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "0.6rem", color: C.dim, letterSpacing: "0.08em" }}>
                {wsStatus === "connected" ? "TERHUBUNG" : wsStatus === "connecting" ? "MENGHUBUNGKAN..." : "TERPUTUS"}
              </span>
            </div>
          </div>
        </header>

        {/* ── HOME ── */}
        {screen === "home" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24, animation: "fadein 0.4s ease" }}>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "5rem", letterSpacing: "0.3em", background: `linear-gradient(90deg,${C.p1},#fff,${C.p2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", textAlign: "center", lineHeight: 1 }}>
              TYPE<br />RACE
            </div>
            <div style={{ color: C.dim, letterSpacing: "0.1em", fontSize: "0.88rem", textAlign: "center", lineHeight: 2, maxWidth: 380 }}>
              Duel mengetik real-time lewat internet<br />
              <span style={{ color: C.p1, fontSize: "0.76rem" }}>✦ Buka link ini di device temanmu</span><br />
              <span style={{ color: C.p2, fontSize: "0.76rem" }}>✦ Masukkan kode room yang sama</span>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 400 }}>
              <input
                value={roomInput}
                onChange={e => setRoomInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleJoinRoom()}
                placeholder="Kode room (kosong = buat baru)"
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 6, padding: "12px 16px", color: C.text, fontFamily: "'Share Tech Mono',monospace", fontSize: "0.85rem", outline: "none" }}
              />
              <button onClick={handleJoinRoom} style={btn(C.p1)}>MASUK</button>
            </div>
            {error && <div style={{ color: "#ff6b6b", fontSize: "0.82rem" }}>{error}</div>}
          </div>
        )}

        {/* ── LOBBY ── */}
        {screen === "lobby" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 24, animation: "fadein 0.4s ease" }}>
            {/* Room code */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 28px", textAlign: "center", width: "100%", maxWidth: 420 }}>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.16em", color: C.dim, marginBottom: 8 }}>KODE ROOM — BAGIKAN KE LAWANMU</div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "3rem", letterSpacing: "0.45em", color: C.gold }}>{roomId.toUpperCase()}</div>
              <div style={{ fontSize: "0.68rem", color: C.dim, margin: "6px 0 10px", letterSpacing: "0.06em" }}>Temanmu buka link yang sama → masukkan kode ini</div>
              <button onClick={copyCode} style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "0.76rem", letterSpacing: "0.12em", padding: "5px 16px", border: `1px solid ${copied ? C.p1 : C.border}`, borderRadius: 4, cursor: "pointer", background: "transparent", color: copied ? C.p1 : C.dim, transition: "all 0.2s" }}>
                {copied ? "✓ DISALIN!" : "SALIN KODE"}
              </button>
            </div>

            {!mySlot ? (
              <>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "1.3rem", letterSpacing: "0.2em", color: C.dim }}>PILIH POSISIMU</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[{ slot: "player1", color: C.p1, label: "PLAYER 1", taken: p1taken }, { slot: "player2", color: C.p2, label: "PLAYER 2", taken: p2taken }].map(({ slot, color, label, taken }) => (
                    <button key={slot} disabled={taken} onClick={() => claimSlot(slot)} style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "1.3rem", letterSpacing: "0.2em", padding: "18px 36px", border: `2px solid ${taken ? C.border : color}`, borderRadius: 8, cursor: taken ? "not-allowed" : "pointer", background: taken ? "rgba(255,255,255,0.02)" : `${color}12`, color: taken ? C.dim : color, boxShadow: taken ? "none" : `0 0 18px ${color}30`, opacity: taken ? 0.5 : 1, transition: "all 0.2s" }}>
                      {label}<br /><span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: taken ? C.dim : `${color}99` }}>{taken ? "SUDAH DIPAKAI" : "PILIH"}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "1.5rem", letterSpacing: "0.2em", color: meColor }}>
                  KAMU → {mySlot === "player1" ? "PLAYER 1" : "PLAYER 2"}
                </div>
                <div style={{ display: "flex", gap: 14 }}>
                  {[{ key: "player1", color: C.p1, label: "PLAYER 1" }, { key: "player2", color: C.p2, label: "PLAYER 2" }].map(({ key, color, label }) => {
                    const d = room?.[key];
                    return (
                      <div key={key} style={{ padding: "14px 24px", border: `1px solid ${d?.id ? color : C.border}`, borderRadius: 8, textAlign: "center", minWidth: 150, background: d?.id ? `${color}0d` : "transparent" }}>
                        <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "1.1rem", letterSpacing: "0.15em", color: d?.id ? color : C.dim }}>{label}</div>
                        <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", color: d?.ready ? C.gold : d?.id ? color : C.dim, marginTop: 4 }}>
                          {d?.ready ? "✓ SIAP" : d?.id ? "MENUNGGU..." : "BELUM MASUK"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!myData.ready ? (
                  <button onClick={handleReady} style={btn(meColor)}>▶ SIAP MAIN!</button>
                ) : (
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "0.88rem", color: C.gold, letterSpacing: "0.15em", animation: "pulse 1.2s infinite" }}>
                    {oppData.ready ? "KEDUANYA SIAP — MEMULAI..." : "MENUNGGU LAWAN SIAP..."}
                  </div>
                )}
              </>
            )}
            {error && <div style={{ color: "#ff6b6b", fontSize: "0.82rem" }}>{error}</div>}
          </div>
        )}

        {/* ── COUNTDOWN ── */}
        {screen === "countdown" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: "0.85rem", letterSpacing: "0.25em", color: C.dim }}>BERSIAP MENGETIK...</div>
            <div key={countdown} style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "11rem", lineHeight: 1, color: countdown <= 1 ? C.gold : C.text, animation: "countpop 1s ease-out forwards", textShadow: countdown <= 1 ? `0 0 40px ${C.gold}` : "none" }}>
              {countdown > 0 ? countdown : "GO!"}
            </div>
            {room?.gameText && (
              <div style={{ maxWidth: 500, textAlign: "center", color: C.dim, fontFamily: "'Share Tech Mono',monospace", fontSize: "0.76rem", lineHeight: 1.8, padding: "0 24px", opacity: 0.6 }}>
                "{room.gameText.slice(0, 60)}..."
              </div>
            )}
          </div>
        )}

        {/* ── PLAYING ── */}
        {screen === "playing" && mySlot && room?.gameText && (
          <>
            <div style={{ height: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: "'Share Tech Mono',monospace", fontSize: "0.72rem", letterSpacing: "0.1em", color: C.dim, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              {[{ key: "player1", color: C.p1, label: "P1" }, { key: "player2", color: C.p2, label: "P2" }].map(({ key, color, label }, i) => (
                <span key={key} style={{ color }}>
                  {i > 0 && <span style={{ margin: "0 10px", color: C.dim }}>|</span>}
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}`, marginRight: 6, verticalAlign: "middle" }} />
                  {label} — {room[key]?.progress ?? 0}% — {room[key]?.wpm ?? 0} WPM
                </span>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 4px 1fr", flex: 1, overflow: "hidden" }}>
              {/* My side */}
              <div style={{ display: "flex", flexDirection: "column", padding: "16px 24px", gap: 12, minHeight: 0, overflow: "hidden", background: `radial-gradient(ellipse at ${mySlot === "player1" ? "0%" : "100%"} 50%,${meColor}0d 0%,transparent 60%)` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "1.5rem", letterSpacing: "0.2em", color: meColor, textShadow: `0 0 18px ${meColor}80` }}>
                    ⬡ {mySlot === "player1" ? "PLAYER 1" : "PLAYER 2"}
                    <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "0.6rem", color: C.dim, letterSpacing: "0.1em", marginLeft: 10 }}>(KAMU)</span>
                  </div>
                  {myData.done && <span style={{ color: C.gold, fontFamily: "'Share Tech Mono',monospace", fontSize: "0.8rem" }}>✓ SELESAI</span>}
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  {[["WPM", myData.wpm ?? 0], ["AKURASI", (myData.accuracy ?? 100) + "%"], ["PROGRESS", (myData.progress ?? 0) + "%"]].map(([lbl, val]) => (
                    <div key={lbl}>
                      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "1.3rem", fontWeight: 700, color: meColor }}>{val}</div>
                      <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color: C.dim, textTransform: "uppercase" }}>{lbl}</div>
                    </div>
                  ))}
                </div>
                <div style={{ position: "relative", paddingTop: 18 }}>
                  <div style={{ position: "absolute", right: 0, top: 0, fontFamily: "'Share Tech Mono',monospace", fontSize: "0.7rem", color: meColor }}>{myData.progress ?? 0}%</div>
                  <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${myData.progress ?? 0}%`, borderRadius: 4, background: `linear-gradient(90deg,${meColor}55,${meColor})`, boxShadow: `0 0 8px ${meColor}`, transition: "width 0.2s ease" }} />
                  </div>
                </div>
                <TextDisplay gameText={room.gameText} typed={typed} color={meColor} />
              </div>

              {/* Divider */}
              <div style={{ background: `linear-gradient(180deg,${C.p1},${C.p2})`, opacity: 0.4, position: "relative" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontFamily: "'Bebas Neue',cursive", fontSize: "1rem", letterSpacing: "0.15em", color: C.text, background: C.bg, padding: "8px 4px", writingMode: "vertical-lr" }}>VS</div>
              </div>

              {/* Opponent side */}
              <OppPanel label={oppSlot === "player1" ? "PLAYER 1" : "PLAYER 2"} color={oppColor} progress={oppData.progress ?? 0} wpm={oppData.wpm ?? 0} accuracy={oppData.accuracy ?? 100} done={oppData.done} online={oppOnline} />
            </div>

            {!myData.done ? (
              <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <input ref={inputRef} autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Mulai mengetik di sini..."
                  onChange={handleInput}
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${meColor}`, borderRadius: 6, padding: "12px 16px", color: "#e8eaf6", fontFamily: "'Share Tech Mono',monospace", fontSize: "1rem", outline: "none", caretColor: "transparent", boxShadow: `0 0 12px ${meColor}33` }}
                />
              </div>
            ) : (
              <div style={{ padding: 14, textAlign: "center", borderTop: `1px solid ${C.border}`, fontFamily: "'Share Tech Mono',monospace", fontSize: "0.85rem", color: C.gold, letterSpacing: "0.15em", animation: "pulse 1.2s infinite" }}>
                ✓ SELESAI — MENUNGGU LAWAN...
              </div>
            )}
          </>
        )}

        {/* ── FINISHED ── */}
        {screen === "finished" && room && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,15,0.93)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, zIndex: 50, backdropFilter: "blur(4px)" }}>
            <Particles color={winnerColor} />
            <div style={{ fontSize: "4rem", animation: "float 2s ease-in-out infinite", zIndex: 1 }}>🏆</div>
            <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: "3.2rem", letterSpacing: "0.2em", color: winnerColor, textShadow: `0 0 30px ${winnerColor}cc`, animation: "glitch 3s infinite", zIndex: 1 }}>
              {iWon ? "KAMU MENANG!" : `${room.winner === "player1" ? "PLAYER 1" : "PLAYER 2"} MENANG!`}
            </div>
            <div style={{ color: C.dim, letterSpacing: "0.1em", textAlign: "center", fontSize: "0.88rem", zIndex: 1 }}>
              {iWon ? "Luar biasa! Kamu yang tercepat 🎉" : "Jangan menyerah, coba lagi!"}
            </div>
            <div style={{ display: "flex", gap: 40, zIndex: 1 }}>
              {[{ key: "player1", color: C.p1, label: "Player 1" }, { key: "player2", color: C.p2, label: "Player 2" }].map(({ key, color, label }) => (
                <div key={key} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "2rem", color }}>{room[key]?.wpm ?? 0}</div>
                  <div style={{ fontSize: "0.6rem", letterSpacing: "0.12em", color, textTransform: "uppercase" }}>{label} WPM</div>
                </div>
              ))}
            </div>
            <button onClick={handleReset} style={{ ...btn(C.p1), zIndex: 1 }}>↺ MAIN LAGI</button>
          </div>
        )}
      </div>
    </>
  );
}
