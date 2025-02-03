import io from "socket.io-client";

const SOCKET_URL = "http://192.168.1.9:9630";
let socket;

export const initializeSocket = ({ userType = "driver", userId = 2 }) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"], 
      jsonp: false,
      reconnection: true, 
      reconnectionAttempts: Infinity, 
      reconnectionDelay: 1000,
      timeout: 20000, 
    });

    socket.userType = userType;
    socket.userId = userId;

    // On successful connection
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("driver_connect", { userType: socket.userType, userId: socket.userId });
    });

    // On disconnection
    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io server disconnect") {
        socket.connect(); // Attempt to reconnect manually
      }
    });

    // On reconnection attempt
    socket.on("reconnect_attempt", (attempt) => {
      console.log(`Reconnection attempt #${attempt}`);
    });

    // On successful reconnection
    socket.on("reconnect", () => {
      console.log("Socket reconnected:", socket.id);
      socket.emit("driver_connect", { userType: socket.userType, userId: socket.userId });
    });

    // On reconnection failure
    socket.on("reconnect_failed", () => {
      console.error("Reconnection failed. Check your server or network.");
    });

    // Debug connection errors
    socket.on("connect_error", (error) => {
      console.error("Connection error:", error.message);
    });

    socket.on("connect_timeout", () => {
      console.warn("Connection timed out. Retrying...");
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket is not initialized. Call initializeSocket() first.");
  }
  return socket;
};

export const cleanupSocket = (socketInstance) => {
  if (socketInstance) {
    socketInstance.disconnect();
    socket = null;
  }
};
