import { io } from "socket.io-client";

const SOCKET_URL = "http://192.168.1.2:3000";

class SocketService {
  constructor() {
    if (!SocketService.instance) {
      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
        transports: ["websocket"],
      });

      this.socket.on("connect", () => {
        console.log("✅ Socket connected:", this.socket.id);
      });

      this.socket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason);
      });

      this.socket.on("connect_error", (error) => {
        console.log("⚠️ Socket connection error:", error);
      });

      SocketService.instance = this;
    }
    return SocketService.instance;
  }

  getSocket() {
    return this.socket;
  }
}

const socketInstance = new SocketService();
export default socketInstance;
