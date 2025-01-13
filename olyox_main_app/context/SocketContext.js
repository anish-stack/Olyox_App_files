import React, { createContext, useContext, useEffect, useRef } from "react";
import { initializeSocket, cleanupSocket } from "../services/socketService";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      // Initialize socket once
      socketRef.current = initializeSocket("user");
    }

    return () => {
      // Cleanup socket on component unmount
      cleanupSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
