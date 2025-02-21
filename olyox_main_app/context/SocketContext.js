import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initializeSocket, cleanupSocket } from "../services/socketService";
import { find_me } from "../utils/helpers";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [user, setUser] = useState(null);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      const data = await find_me();
      if (data?.user?._id) {
        setUser(data.user._id);
      } else {
        console.warn("⚠️ No user found");
      }
    };
    fetchUser();
  }, []);

  // Initialize socket once user is set
  useEffect(() => {
    if (user && !socketRef.current) {
      console.log("🚀 Initializing socket for user:", user);
      socketRef.current = initializeSocket({ userId: user });
    }

    return () => {
      if (socketRef.current) {
        console.log("🛑 Cleaning up socket on unmount...");
        cleanupSocket();
      }
    };
  }, [user]);

  // Reconnect if socket disconnects
  useEffect(() => {
    const checkAndReconnect = () => {
      if (socketRef.current && !socketRef.current.connected) {
        console.warn("🔄 Socket disconnected. Reconnecting...");
        cleanupSocket();
        socketRef.current = initializeSocket({ userId: user });
      }
    };

    if (user) {
      const interval = setInterval(checkAndReconnect, 60000); // Check every 60 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
