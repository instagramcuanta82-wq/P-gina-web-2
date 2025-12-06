const connectBtn = document.getElementById('connectBtn');
const nextBtn = document.getElementById('nextBtn');
const leaveBtn = document.getElementById('leaveBtn');
const messagesEl = document.getElementById('messages');
const remoteVideo = document.getElementById('remoteVideo');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let localStream = null;
let ws = null; 

function logMessage(text){
  const d = document.createElement('div');
  d.className = 'msg';
  d.textContent = text;
  messagesEl.prepend(d);
}

// DETENER CÁMARA / AUDIO
function stopLocalStream(){
  if(localStream){
    localStream.getTracks().forEach(track=>track.stop());
    localStream = null;
    console.log('Local stream detenido');
  }
  remoteVideo.srcObject = null;
}

// AUTOCIERRE CUANDO CAMBIÁS DE PESTAÑA O SALÍS
window.addEventListener('pagehide', stopLocalStream);
window.addEventListener('beforeunload', stopLocalStream);

// CONECTAR (SIMULADO)
connectBtn.addEventListener('click', async ()=>{
  connectBtn.disabled = true;
  logMessage('Conectando con el servidor...');

  try{
    // Si usarás la cámara local en el futuro:
    // localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    // remoteVideo.srcObject = localStream;

    await new Promise(r=>setTimeout(r,800));
    logMessage('Conectado (simulado).');

    nextBtn.disabled = false;
    leaveBtn.disabled = false;

  }catch(err){
    logMessage('Error al conectar: '+(err.message||err));
    connectBtn.disabled = false;
  }
});

// SALIR
leaveBtn.addEventListener('click', ()=>{
  logMessage('Cerrando conexión...');
  stopLocalStream();
  connectBtn.disabled = false;
  nextBtn.disabled = true;
  leaveBtn.disabled = true;
});

// ENVIAR MENSAJE
sendBtn.addEventListener('click', ()=>{
  const text = messageInput.value.trim();
  if(!text) return;
  logMessage('Tú: '+text);
  messageInput.value='';
});

// ERROR DEL SERVIDOR
function onServerError(msg){
  logMessage('Error de conexión con el servidor: '+msg);
}

// MODO OSCURO / CLARO
const themeToggle = document.getElementById('themeToggle');
themeToggle && themeToggle.addEventListener('click', ()=>{
  document.documentElement.classList.toggle('light');
  themeToggle.textContent = document.documentElement.classList.contains('light') ? '🌞' : '🌙';
});
