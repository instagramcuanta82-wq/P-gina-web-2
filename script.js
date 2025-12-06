const connectBtn = document.getElementById('connectBtn');
const nextBtn = document.getElementById('nextBtn');
const leaveBtn = document.getElementById('leaveBtn');
const messagesEl = document.getElementById('messages');
const remoteVideo = document.getElementById('remoteVideo');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let localStream = null;
let ws = null;

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

// MOSTRAR CÁMARA
async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        // Solo para mostrarte que tu cámara funciona
        remoteVideo.srcObject = localStream;
        logMessage("🎥 Cámara activada correctamente.");

        return true;
    } catch (err) {
        logMessage("❌ Error al activar cámara: " + err.message);
        return false;
    }
}

// AUTOCIERRE
window.addEventListener('pagehide', stopLocalStream);
window.addEventListener('beforeunload', stopLocalStream);

// CONECTAR
connectBtn.addEventListener('click', async () => {
    connectBtn.disabled = true;

    logMessage("Activando cámara...");
    const ok = await startCamera();
    if (!ok) {
        connectBtn.disabled = false;
        return;
    }

    // FALTA: conectar a WebSocket real
    logMessage("Conectando al servidor...");
    await new Promise(r => setTimeout(r, 600));

    logMessage("Conectado (simulado).");
    nextBtn.disabled = false;
    leaveBtn.disabled = false;
});

// SALIR
leaveBtn.addEventListener('click', () => {
    logMessage("Cerrando conexión...");
    stopLocalStream();

    connectBtn.disabled = false;
    nextBtn.disabled = true;
    leaveBtn.disabled = true;
});

// CHAT
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;
    logMessage("Tú: " + text);
    messageInput.value = '';
});
