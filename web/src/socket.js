// web/src/socket.js
import { io } from "socket.io-client";

export function connectSocket(token) {
  const s = io("/", {
    path: "/socket.io",
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
  });

  // sadece bağlantı logları
  s.on("connect", () => console.log("WS CONNECTED", s.id));
  s.on("disconnect", (r) => console.log("WS DISCONNECTED", r));
  s.on("connect_error", (e) => console.log("WS ERROR", e?.message || e));

  return s;
}