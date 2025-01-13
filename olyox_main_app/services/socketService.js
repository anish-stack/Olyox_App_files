import io from "socket.io-client";

const SOCKET_URL = "http://192.168.1.8:9630";
let socket; // Singleton socket instance

export const initializeSocket = (userType = "user") => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      jsonp: false,
    });

    socket.userType = userType;
    socket.userId = 1;


    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      console.log("User Type:", socket.userType);

      // Emit user type when connected
      socket.emit("user_connect", { userType: socket.userType , userid:socket.userId });
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

export const cleanupSocket = () => {
  if (socket) {
    socket.disconnect(); // Properly disconnect the socket
    socket = null; // Reset the socket instance
  }
};
