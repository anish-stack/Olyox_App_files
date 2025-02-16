import io from "socket.io-client";

const SOCKET_URL = "http://192.168.11.28:3000";
let socket; // Singleton socket instance

export const initializeSocket = ({ userType = "user", userId = 1 }) => {
  console.log("userId",userId)
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      jsonp: false,
    });

    socket.userType = userType;
    socket.userId = userId;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      console.log("User Type:", socket.userType);

      // Emit user type when connected
      socket.emit("user_connect", { userType: socket.userType, userId: socket.userId });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
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
    socketInstance.disconnect(); // Properly disconnect the socket
    socket = null; // Reset the socket instance
  }
};
