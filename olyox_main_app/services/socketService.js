import io from "socket.io-client";

const SOCKET_URL = "http://192.168.1.9:3100";
let socket = null; // Singleton instance

export const initializeSocket = ({ userType = "user", userId }) => {
  if (socket) {
    // If the socket exists but is disconnected, just reconnect it
    if (!socket.connected) {
      console.log("Socket exists but disconnected. Reconnecting...");
      socket.connect();
    } else {
      console.log("Socket already initialized and connected.");
    }
    return socket;
  }

  console.log("Initializing new socket...");
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    jsonp: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
    // Add timeout to avoid long-pending connections
    timeout: 10000
  });

  socket.userType = userType;
  socket.userId = userId;

  socket.on("connect", () => {
    console.log("🟢 Socket connected:", socket.id);
    socket.emit("user_connect", { userType: socket.userType, userId: socket.userId });
  });

  socket.on("disconnect", (reason) => {
    console.log("🔴 Socket disconnected:", reason);
    // Let the context handle reconnection
  });

  socket.on("connect_error", (error) => {
    console.error("⚠️ Socket connection error:", error.message);
  });

  socket.on("reconnect_attempt", (attemptNumber) => {
    console.log(`🔄 Reconnection attempt #${attemptNumber}`);
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log(`✅ Reconnected after ${attemptNumber} attempts`);
  });

  socket.on("reconnect_error", (error) => {
    console.error("⚠️ Reconnection error:", error.message);
  });

  socket.on("reconnect_failed", () => {
    console.error("❌ Failed to reconnect after all attempts");
  });

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
    socket.removeAllListeners();
    socket = null;
  }
};

export const isSocketConnected = () => {
  return socket && socket.connected;
};