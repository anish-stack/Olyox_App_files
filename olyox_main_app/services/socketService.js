import io from "socket.io-client";

const SOCKET_URL = "http://192.168.1.3:3000";
let socket = null; // Singleton instance

export const initializeSocket = ({ userType = "user", userId }) => {
  if (!socket) {
    console.log("Initializing socket...");
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      jsonp: false,
      reconnection: true, 
      reconnectionAttempts: 5, 
      reconnectionDelay: 3000, 
    });

    socket.userType = userType;
    socket.userId = userId;

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
      socket.emit("user_connect", { userType: socket.userType, userId: socket.userId });
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.error("⚠️ Socket connection error:", error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("⚠️ Socket is not initialized. Call initializeSocket() first.");
  }
  return socket;
};

export const cleanupSocket = () => {
  if (socket) {
    console.log("🛑 Cleaning up socket...");
    socket.disconnect();
    socket = null;
  }
};
