const connectBtn = document.getElementById('connectBtn');
const nextBtn = document.getElementById('nextBtn');
const leaveBtn = document.getElementById('leaveBtn');
const messagesEl = document.getElementById('messages');
const remoteVideo = document.getElementById('remoteVideo');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let localStream = null;
let socket = null; // tu WebSocket

// MENSAJES
function logMessage(text) {
  const d = document.createElement('div');
  d.className = 'msg';
  d.textContent = text;
  messagesEl.prepend(d);
}

// DETENER CÁMARA
function stopLocalStream() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
    console.log('Local stream detenido');
  }
  remoteVideo.srcObject = null;
}

// AUTO CIERRE
window.addEventListener('pagehide', stopLocalStream);
window.addEventListener('beforeunload', stopLocalStream);

// MOSTRAR CÁMARA (opcional futuramente)
async function startCamera() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    remoteVideo.srcObject = localStream;
  } catch (err) {
    logMessage('Error al acceder a cámara: ' + err);
  }
}

// ===============================
//   ⭐ CONEXIÓN WEBSOCKET ⭐
// ===============================
function connectWebSocket() {
  socket = new WebSocket("wss://omegle-server-5i11.onrender.com");

  socket.onopen = () => {
    logMessage("🟢 Conectado al servidor WebSocket");
  };

  socket.onmessage = (ev) => {
    logMessage("Stranger: " + ev.data);
  };

  socket.onclose = () => {
    logMessage("🔴 Desconectado del servidor");
  };

  socket.onerror = (err) => {
    logMessage("⚠ Error WebSocket");
    console.error(err);
  };
}

// ===============================
//    BOTÓN CONECTAR
// ===============================
connectBtn.addEventListener('click', async () => {
  connectBtn.disabled = true;
  logMessage('Conectando con el servidor...');

  try {
    connectWebSocket(); // 👉 AQUÍ SE CONECTA TU SERVER
    
    await new Promise(r => setTimeout(r, 800));

    logMessage('Conectado (simulado).');

    nextBtn.disabled = false;
    leaveBtn.disabled = false;

  } catch (err) {
    logMessage('Error al conectar: ' + (err.message || err));
    connectBtn.disabled = false;
  }
});

// ===============================
//     BOTÓN SALIR
// ===============================
leaveBtn.addEventListener('click', () => {
  logMessage('Cerrando conexión...');
  stopLocalStream();

  if (socket) socket.close();

  connectBtn.disabled = false;
  nextBtn.disabled = true;
  leaveBtn.disabled = true;
});

// ===============================
//     BOTÓN ENVIAR MENSAJE
// ===============================
sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text) return;

  logMessage('Tú: ' + text);

  if (socket && socket.readyState === 1) {
    socket.send(text); // enviar al servidor
  } else {
    logMessage('⚠ No estás conectado al servidor');
  }

  messageInput.value = '';
});

// MODO OSCURO / CLARO
const themeToggle = document.getElementById('themeToggle');
themeToggle && themeToggle.addEventListener('click', () => {
  document.documentElement.classList.toggle('light');
  themeToggle.textContent = document.documentElement.classList.contains('light') ? '🌞' : '🌙';
});
