// Conexión al servidor WebSocket en Render
const socket = new WebSocket("wss://omega-x-3.onrender.com");

// Elementos de la página
const statusText = document.getElementById("status");
const chatBox = document.getElementById("chatBox");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");

// Cuando se conecta
socket.onopen = () => {
  statusText.textContent = "Conectando...";
};

// Cuando llega un mensaje del servidor
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "status") {
    statusText.textContent = data.message;
  }

  if (data.type === "message") {
    const p = document.createElement("p");
    p.textContent = "Extraño: " + data.message;
    chatBox.appendChild(p);
  }
};

// Botón para enviar mensajes
sendBtn.onclick = () => {
  const msg = messageInput.value;
  if (msg.trim() === "") return;

  socket.send(msg);

  const p = document.createElement("p");
  p.textContent = "Tú: " + msg;
  chatBox.appendChild(p);

  messageInput.value = "";
};
