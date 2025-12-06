const serverUrl = "wss://omegle-f80m.onrender.com";

let ws;
let pc;
let localStream;

// HTML
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const connectBtn = document.getElementById("connectBtn");
const nextBtn = document.getElementById("nextBtn");
const leaveBtn = document.getElementById("leaveBtn");
const messages = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

connectBtn.onclick = startConnection;
nextBtn.onclick = findNext;
leaveBtn.onclick = leaveChat;
sendBtn.onclick = sendMessage;

async function startConnection() {
    connectBtn.disabled = true;

    ws = new WebSocket(serverUrl);
    ws.onmessage = onMessage;
    
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
}

function createPeer() {
    pc = new RTCPeerConnection();

    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    pc.ontrack = e => {
        remoteVideo.srcObject = e.streams[0];
    };

    pc.onicecandidate = e => {
        if (e.candidate) {
            ws.send(JSON.stringify({ type: "candidate", candidate: e.candidate }));
        }
    };
}

async function onMessage(msg) {
    let data = JSON.parse(msg.data);

    if (data.type === "match") {
        nextBtn.disabled = false;
        leaveBtn.disabled = false;

        createPeer();

        if (data.offer) {
            await pc.setRemoteDescription(data.offer);
            let answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            ws.send(JSON.stringify({ type: "answer", answer }));
        }
        return;
    }

    if (data.type === "answer") {
        pc.setRemoteDescription(data.answer);
        return;
    }

    if (data.type === "candidate") {
        pc.addIceCandidate(data.candidate);
    }

    if (data.type === "offer") {
        await pc.setRemoteDescription(data.offer);
        let answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({ type: "answer", answer }));
    }

    if (data.type === "message") {
        addMsg("Extraño", data.text);
    }
}

function findNext() {
    ws.send(JSON.stringify({ type: "next" }));
}

function leaveChat() {
    ws.send(JSON.stringify({ type: "leave" }));
    location.reload();
}

function sendMessage() {
    let text = messageInput.value;
    messageInput.value = "";

    addMsg("Tú", text);

    ws.send(JSON.stringify({ type: "message", text }));
}

function addMsg(user, text) {
    messages.innerHTML += `<p><b>${user}:</b> ${text}</p>`;
}
