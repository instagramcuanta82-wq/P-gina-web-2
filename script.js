// script.js - Versión moderna para Omega X
// (Compatible con wss://omegle-f80m.onrender.com)

const SERVER = "wss://omegle-f80m.onrender.com";

let ws = null;
let pc = null;
let localStream = null;
let isCaller = false;

const remoteVideo = document.getElementById("remoteVideo");
const connectBtn = document.getElementById("connectBtn");
const nextBtn = document.getElementById("nextBtn");
const leaveBtn = document.getElementById("leaveBtn");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const darkModeBtn = document.getElementById("darkModeBtn");

connectBtn.onclick = start;
nextBtn.onclick = findNext;
leaveBtn.onclick = leaveChat;
sendBtn.onclick = sendChat;
messageInput.onkeydown = (e) => { if (e.key === "Enter") sendChat(); };
darkModeBtn.onclick = toggleDarkMode;

// --------- DARK MODE (guarda preferencia) ----------
(function initDarkMode() {
  const saved = localStorage.getItem("omegax_dark");
  if (saved === "1") document.body.classList.add("dark");
})();

function toggleDarkMode() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("omegax_dark", isDark ? "1" : "0");
}

// --------- UTIL: añadir mensajes (burbujas) ----------
function addMessage(text, who = "other") {
  const div = document.createElement("div");
  div.className = `message ${who === "me" ? "me" : "other"}`;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

// --------- INICIAR CONEXIÓN (websocket + getUserMedia) ----------
async function start() {
  connectBtn.disabled = true;
  addMessage("Conectando con el servidor...", "other");

  try {
    // Obtener mic y cámara (aunque no mostramos local, las mandamos)
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    console.error("No se pudo acceder a la cámara/mic:", err);
    addMessage("No se pudo activar la cámara/auricular.", "other");
    connectBtn.disabled = false;
    return;
  }

  // Conectar WS
  ws = new WebSocket(SERVER);

  ws.onopen = () => {
    addMessage("Conectado al servidor. Buscando un extraño...", "other");
    ws.send(JSON.stringify({ type: "find" }));
    // habilitar botones mínimos
    nextBtn.disabled = false;
    leaveBtn.disabled = false;
  };

  ws.onmessage = async (evt) => {
    try {
      const data = JSON.parse(evt.data);
      handleSignal(data);
    } catch (err) {
      console.error("WS mensaje no JSON:", evt.data);
    }
  };

  ws.onclose = () => {
    addMessage("Conexión con el servidor cerrada.", "other");
    cleanupPeer();
    connectBtn.disabled = false;
    nextBtn.disabled = true;
    leaveBtn.disabled = true;
  };

  ws.onerror = (e) => {
    console.error("WebSocket error:", e);
    addMessage("Error de conexión con el servidor.", "other");
  };
}

// --------- Manejo de señales desde WS ----------
async function handleSignal(data) {
  // manejar variantes: 'match' o 'matched'
  if (data.type === "match" || data.type === "matched") {
    // servidor indica que encontró pareja; si contiene offer => se transformará en callee
    addMessage("Pareja encontrada. Iniciando WebRTC...", "other");
    // Si el servidor incluye 'offer' significa que el otro ya envió oferta
    if (data.offer) {
      // ser callee
      await preparePeer(false);
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "answer", answer }));
    } else {
      // ser caller
      await preparePeer(true);
      // createOffer dentro de preparePeer si isCaller true
    }
    nextBtn.disabled = false;
    leaveBtn.disabled = false;
    return;
  }

  if (data.type === "offer") {
    // oferta de otro: convertirnos en callee
    addMessage("Oferta recibida. Respondiendo...", "other");
    if (!pc) await preparePeer(false);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    ws.send(JSON.stringify({ type: "answer", answer }));
    return;
  }

  if (data.type === "answer") {
    addMessage("Respuesta recibida. Conexión establecida.", "other");
    if (pc && data.answer) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
    return;
  }

  if (data.type === "candidate" || data.type === "ice") {
    // aceptar candidatos ICE
    try {
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } else if (pc && data.ice) {
        await pc.addIceCandidate(new RTCIceCandidate(data.ice));
      }
    } catch (err) {
      console.warn("Error añadiendo ICE:", err);
    }
    return;
  }

  if (data.type === "message" || data.type === "chat") {
    addMessage(data.text || data.message || "(mensaje vacío)", "other");
    return;
  }

  if (data.type === "end" || data.type === "leave" || data.type === "disconnect") {
    addMessage("El desconocido se desconectó.", "other");
    // limpiar peer y esperar nuevo match
    cleanupPeer();
    return;
  }

  // Otros tipos: log
  console.log("Señal no reconocida:", data);
}

// --------- Preparar RTCPeerConnection ----------
async function preparePeer(iAmCaller) {
  isCaller = !!iAmCaller;
  pc = new RTCPeerConnection();

  // agregar pistas locales
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.ontrack = (ev) => {
    // mostrar stream remoto
    if (ev.streams && ev.streams[0]) {
      remoteVideo.srcObject = ev.streams[0];
    } else if (ev.stream) {
      remoteVideo.srcObject = ev.stream;
    }
  };

  pc.onicecandidate = (ev) => {
    if (ev.candidate && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "candidate", candidate: ev.candidate }));
    }
  };

  pc.onconnectionstatechange = () => {
    if (!pc) return;
    const s = pc.connectionState;
    console.log("Peer connectionState:", s);
    if (s === "connected") addMessage("WebRTC conectado", "other");
    if (s === "disconnected" || s === "failed" || s === "closed") {
      addMessage("Conexión con el extraño perdida.", "other");
      // cleanup pero no desconectar ws
      cleanupPeer();
    }
  };

  // si soy caller, genero oferta
  if (isCaller) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "offer", offer }));
    }
  }
}

// --------- Solicitar siguiente persona ----------
function findNext() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addMessage("No estás conectado al servidor.", "other");
    return;
  }
  addMessage("Buscando nuevo extraño...", "other");
  // limpiar peer actual para conectar a otro
  cleanupPeer();
  ws.send(JSON.stringify({ type: "next" }));
}

// --------- Dejar chat (recargar/limpiar) ----------
function leaveChat() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "leave" }));
  }
  cleanupPeer();
  // opcional: recargar para estado limpio
  setTimeout(() => location.reload(), 400);
}

// --------- Enviar mensaje de chat ----------
function sendChat() {
  const text = messageInput.value.trim();
  if (!text) return;
  // enviar por WS
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "message", text }));
    addMessage("Tú: " + text, "me");
    messageInput.value = "";
  } else {
    addMessage("No conectado al servidor.", "other");
  }
}

// --------- Limpiar PeerConnection ----------
function cleanupPeer() {
  try {
    if (pc) {
      pc.close();
    }
  } catch (e) { /* ignore */ }
  pc = null;
  // stop local tracks? las dejamos si queremos seguir usando cámara
  // if (localStream) { localStream.getTracks().forEach(t=>t.stop()); localStream=null; }
  remoteVideo.srcObject = null;
}

// --------- Antes de cerrar ventana, avisar servidor y cerrar ws ----------
window.addEventListener("beforeunload", () => {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  } catch (e) {}
});

// --------- FIN del script ----------
