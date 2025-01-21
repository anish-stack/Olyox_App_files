import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cleanupSocket, initializeSocket } from "./socketService";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isSocketReady, setSocketReady] = useState(false);
  const [isReconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (!socketRef.current) {
      // Initialize socket once user is set
      socketRef.current = initializeSocket({ userId: 2 });
    }

    const socket = socketRef.current;

    // Handle successful connection
    const handleConnect = () => {
      console.log("Socket connected");
      setSocketReady(true);
      setReconnecting(false);
    };

    // Handle disconnection and attempt reconnection
    const handleDisconnect = (reason) => {
      console.warn("Socket disconnected:", reason);
      setSocketReady(false);
      setReconnecting(true);

      // Optionally, add a delay before attempting reconnection
      setTimeout(() => {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, 2000); // Attempt reconnection after 2 seconds
    };

    // Handle reconnection attempts
    const handleReconnect = (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setSocketReady(true);
      setReconnecting(false);
    };

    // Handle reconnection errors
    const handleReconnectError = (error) => {
      console.error("Reconnection error:", error);
      setReconnecting(true);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect", handleReconnect);
    socket.on("reconnect_error", handleReconnectError);

    // Cleanup the socket connection on component unmount
    return () => {
      if (socket) {
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
        socket.off("reconnect", handleReconnect);
        socket.off("reconnect_error", handleReconnectError);
        cleanupSocket(socket);
      }
      setSocketReady(false);
      setReconnecting(false);
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isSocketReady,
        isReconnecting,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return context;
};
