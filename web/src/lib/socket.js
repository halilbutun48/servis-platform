import { io } from "socket.io-client";
import { getToken } from "./api";

export function makeSocket() {
  return io("http://localhost:3000", {
    transports: ["websocket"],
    auth: { token: getToken() },
    autoConnect: true,
  });
}
