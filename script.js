let ws = null;

function connect() {
    ws = new WebSocket("wss://omegle-f80m.onrender.com");

    ws.onopen = () => {
        addMessage("🟢 Conectado. Buscando un desconocido...");
        ws.send(JSON.stringify({ type: "find" }));
    };

    ws.onmessage = (msg) => {
        let data = JSON.parse(msg.data);

        if (data.type === "matched") {
            addMessage("🔵 Conectado con un desconocido.");
        }

        if (data.type === "message") {
            addMessage("Desconocido: " + data.text);
        }

        if (data.type === "end") {
            addMessage("❌ El desconocido se desconectó.");
        }
    };
}

function addMessage(text) {
    let box = document.getElementById("chat-box");
    let div = document.createElement("div");
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

document.getElementById("send-btn").onclick = () => {
    let input = document.getElementById("message-input");
    let text = input.value.trim();

    if (text !== "" && ws) {
        ws.send(JSON.stringify({ type: "message", text }));
        addMessage("Tú: " + text);
        input.value = "";
    }
};

document.getElementById("next-btn").onclick = () => {
    location.reload();
};

connect();
