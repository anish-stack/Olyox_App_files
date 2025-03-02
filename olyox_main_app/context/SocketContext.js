import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initializeSocket, cleanupSocket } from "../services/socketService";
import { find_me } from "../utils/helpers";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);

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
      const socket = initializeSocket({ userId: user });
      socketRef.current = socket;

      // Set up event listeners for connection state
      socket.on('connect', () => {
        console.log("🔌 Socket connected");
        setIsConnected(true);
        setLastConnectedAt(new Date());
      });

      socket.on('disconnect', () => {
        console.log("❌ Socket disconnected");
        setIsConnected(false);
      });

      socket.on('connect_error', (err) => {
        console.error("🚨 Socket connection error:", err);
        setIsConnected(false);
      });
    }

    return () => {
      if (socketRef.current) {
        console.log("🛑 Cleaning up socket on unmount...");
        cleanupSocket();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user]);

  // More frequent reconnection checks
  useEffect(() => {
    const checkAndReconnect = () => {
      if (user && (!socketRef.current || !isConnected)) {
        console.warn("🔄 Socket disconnected. Reconnecting...");
        if (socketRef.current) {
          cleanupSocket();
          socketRef.current = null;
        }
        socketRef.current = initializeSocket({ userId: user });
      }
    };

    if (user) {
      // Check more frequently - every 10 seconds
      const interval = setInterval(checkAndReconnect, 10000);
      return () => clearInterval(interval);
    }
  }, [user, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        lastConnectedAt,
        userId: user
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};