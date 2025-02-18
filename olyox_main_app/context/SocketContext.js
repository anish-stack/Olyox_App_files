import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initializeSocket, cleanupSocket } from "../services/socketService";
import { find_me } from "../utils/helpers";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null); // Track socket state
  const [user, setUser] = useState(null);

  const firstFound = async () => {
    const data = await find_me();

    if (data.user) {
      setUser(data.user?._id);
    } else {
      console.log("No user found");
      setUser(null);
    }
  };

  const initializeAndSetSocket = () => {
    const newSocket = initializeSocket({ userId: user });
    socketRef.current = newSocket;
    setSocket(newSocket); // Update socket state
  };

  const checkAndReconnectSocket = () => {
    if (socketRef.current && socketRef.current.connected) {
      console.log("Socket is already connected");
    } else {
      console.warn("Socket is disconnected. Reinitializing...");
      cleanupSocket(socketRef.current);
      initializeAndSetSocket();
    }
  };

  useEffect(() => {
    firstFound();
  }, []);

  useEffect(() => {
    if (user !== null) {
      if (!socketRef.current) {
        // Initialize socket once user is set
        initializeAndSetSocket();
      }
    } else {
      console.log("No user found");
    }

    return () => {
      // Cleanup socket on component unmount
      if (socketRef.current) {
        cleanupSocket(socketRef.current);
      }
    };
  }, [user]);

  // Periodically check socket connection every 20 seconds
  useEffect(() => {
    if (user) {
      console.log("Starting periodic socket check");
      const interval = setInterval(() => {
        checkAndReconnectSocket();
      }, 60000); // 20 seconds

      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
