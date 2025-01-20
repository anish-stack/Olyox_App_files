import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cleanupSocket, initializeSocket } from "./socketService";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [isSocketReady, setSocketReady] = useState(false);

  useEffect(() => {
    if (!socketRef.current) {
      // Initialize socket once user is set
      socketRef.current = initializeSocket({ userId: 2 });
    }

    // Set socket ready flag when socket is connected
    socketRef.current.on("connect", () => {
      setSocketReady(true);
    });

    // Cleanup the socket connection on component unmount
    return () => {
      if (socketRef.current) {
        cleanupSocket(socketRef.current);
        setSocketReady(false);
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isSocketReady }}>
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
