  // CONFIG ------------------------------------------------
const WS_URL = 'wss://omegle-server-5i11.onrender.com'; // tu servidor
const STUN_SERVERS = [{urls: 'stun:stun.l.google.com:19302'}];

// DOM
const connectBtn = document.getElementById('connectBtn');
const nextBtn = document.getElementById('nextBtn');
const leaveBtn = document.getElementById('leaveBtn');
const messagesEl = document.getElementById('messages');
const remoteVideo = document.getElementById('remoteVideo');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const overlayStatus = document.getElementById('overlayStatus');
const serverUrlEl = document.getElementById('serverUrl');
const themeToggle = document.getElementById('themeToggle');

serverUrlEl.textContent = WS_URL;

// STATE
let ws = null;
let pc = null;
let localStream = null;
let partnerConnected = false;

// util logs
function logMessage(text){
  const d = document.createElement('div');
  d.className = 'msg';
  d.textContent = text;
  messagesEl.prepend(d);
}
function setStatus(text){
  overlayStatus.textContent = text;
}

// CLOSE / STOP local tracks
function stopLocalStream(){
  if(localStream){
    localStream.getTracks().forEach(t=>t.stop());
    localStream = null;
    console.log('Local stream stopped');
  }
  if(remoteVideo) remoteVideo.srcObject = null;
}

// WHEN USER LEAVES PAGE
window.addEventListener('pagehide', () => {
  stopLocalStream();
  if(ws) { ws.close(); ws = null; }
});
window.addEventListener('beforeunload', () => {
  stopLocalStream();
  if(ws) { ws.close(); ws = null; }
});

// THEME
themeToggle.addEventListener('click', ()=>{
  document.documentElement.classList.toggle('light');
  themeToggle.textContent = document.documentElement.classList.contains('light') ? '🌞' : '🌙';
});

// WEBSOCKET + WebRTC handling
async function ensureLocalStream(){
  if(localStream) return localStream;
  try{
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    logMessage('Cámara y micrófono permitidos.');
  }catch(e){
    logMessage('No se permitió la cámara/mic: ' + (e.message||e));
    localStream = null;
  }
  return localStream;
}

function createPeerConnection(){
  pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

  pc.ontrack = (ev) => {
    // remote tracks
    console.log('Track recibido', ev);
    remoteVideo.srcObject = ev.streams[0];
    setStatus('Conectado — vídeo recibido');
  };

  pc.onicecandidate = (ev) => {
    if(ev.candidate && ws && ws.readyState === WebSocket.OPEN){
      ws.send(JSON.stringify({ type: 'candidate', candidate: ev.candidate }));
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('pc state', pc.connectionState);
    setStatus('Peer: ' + pc.connectionState);
    if(pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed'){
      partnerConnected = false;
      nextBtn.disabled = true;
      leaveBtn.disabled = true;
      connectBtn.disabled = false;
    }
  };

  return pc;
}

// Conectar al servidor y empezar handshake
async function startConnection(){
  connectBtn.disabled = true;
  setStatus('Conectando al servidor...');
  logMessage('Conectando al servidor websocket...');

  ws = new WebSocket(WS_URL);

  ws.onopen = async () => {
    logMessage('WebSocket abierto.');
    setStatus('Conectado al servidor (esperando pareja)...');

    // prepare PC and local stream
    pc = createPeerConnection();
    const s = await ensureLocalStream();
    if(s){
      // send tracks to remote peer
      s.getTracks().forEach(track => pc.addTrack(track, s));
      logMessage('Enviando tu cámara al peer (si hay pareja).');
    } else {
      logMessage('No se envía cámara (sin permiso).');
    }

    // tell server we want to start (server pairs clients)
    ws.send(JSON.stringify({ type: 'start' }));
  };

  ws.onmessage = async (evt) => {
    // server forwards messages between peers (JSON expected)
    let data;
    try { data = JSON.parse(evt.data); } catch(e){ 
      // if plain text -> show
      logMessage('Servidor: ' + evt.data);
      return;
    }

    console.log('WS mensaje:', data);

    if(data.type === 'start' || data.type === 'status'){
      // messages from server (status)
      logMessage('Servidor: ' + (data.msg || data.type));
      if(data.type === 'status' && data.msg && data.msg.includes('paired')){
        setStatus('Emparejado — negociando WebRTC...');
      }
    }

    if(data.type === 'offer'){
      logMessage('Recibida oferta (offer). Respondiendo...');
      // set remote desc and answer
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', answer }));
    }

    if(data.type === 'answer'){
      logMessage('Recibida answer.');
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }

    if(data.type === 'candidate'){
      try{
        await pc.addIceCandidate(data.candidate);
      }catch(e){
        console.warn('ICE candidate error', e);
      }
    }

    if(data.type === 'text'){
      logMessage('Extraño: ' + (data.msg||''));
    }

    // if other server-specific signals exist, show them
    if(data.type === 'paired'){
      // If server decides pairing and expects client to create offer:
      if(data.role === 'caller'){
        // create offer
        logMessage('Eres caller, creando oferta...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', offer }));
      } else {
        logMessage('Eres callee, esperando oferta...');
      }
      partnerConnected = true;
      nextBtn.disabled = false;
      leaveBtn.disabled = false;
    }
  };

  ws.onclose = () => {
    logMessage('WebSocket cerrado.');
    setStatus('Desconectado');
    connectBtn.disabled = false;
    nextBtn.disabled = true;
    leaveBtn.disabled = true;
    partnerConnected = false;
    // cleanup PC
    if(pc){ try{ pc.close(); }catch(e){} pc=null; }
  };

  ws.onerror = (err) => {
    console.error('WS error', err);
    logMessage('Error WS: ' + (err.message||err));
    setStatus('Error WS');
  };
}

// UI handlers
connectBtn.addEventListener('click', async () => {
  await startConnection();
});

leaveBtn.addEventListener('click', () => {
  logMessage('Solicitado salir.');
  if(ws && ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify({ type: 'leave' }));
    ws.close();
  }
  stopLocalStream();
  setStatus('Desconectado');
  connectBtn.disabled = false;
  nextBtn.disabled = true;
  leaveBtn.disabled = true;
});

nextBtn.addEventListener('click', () => {
  logMessage('Solicitado siguiente (desconectar y buscar nuevo).');
  // inform server to requeue
  if(ws && ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify({ type: 'next' }));
  } else {
    logMessage('No estás conectado al servidor.');
  }
});

sendBtn.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if(!text) return;
  logMessage('Tú: ' + text);
  if(ws && ws.readyState === WebSocket.OPEN){
    ws.send(JSON.stringify({ type: 'text', msg: text }));
  } else logMessage('No conectado al servidor.');
  messageInput.value = '';
});

// allow Enter to send
messageInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ sendBtn.click(); e.preventDefault(); }
});
