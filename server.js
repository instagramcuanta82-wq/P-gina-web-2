import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: process.env.PORT || 10000 });

let waiting = null;

wss.on("connection", (ws) => {
    ws.partner = null;

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.type === "find") {
            if (waiting && waiting !== ws) {
                ws.partner = waiting;
                waiting.partner = ws;

                ws.send(JSON.stringify({ type: "matched" }));
                waiting.send(JSON.stringify({ type: "matched" }));

                waiting = null;
            } else {
                waiting = ws;
            }
        }

        if (data.type === "message" && ws.partner) {
            ws.partner.send(JSON.stringify({ type: "message", text: data.text }));
        }
    });

    ws.on("close", () => {
        if (ws.partner) {
            ws.partner.send(JSON.stringify({ type: "end" }));
            ws.partner.partner = null;
        }
        if (waiting === ws) waiting = null;
    });
});
