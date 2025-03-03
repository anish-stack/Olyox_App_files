import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initializeSocket, cleanupSocket, getSocket } from "../services/socketService";
import { find_me } from "../utils/helpers";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const socketInitialized = useRef(false);
  const reconnectTimerRef = useRef(null);

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
    if (user && !socketInitialized.current) {
      console.log("🚀 Initializing socket for user:", user);
      
      const socket = initializeSocket({ userId: user });
      socketInitialized.current = true;
      
      // Set up event listeners for connection state
      socket.on('connect', () => {
        console.log("🔌 Socket connected");
        setIsConnected(true);
        setLastConnectedAt(new Date());
        
        // Clear any pending reconnection timers when connected
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      });
      
      socket.on('disconnect', () => {
        console.log("❌ Socket disconnected");
        setIsConnected(false);
        // Don't immediately reconnect here - we'll handle it in the reconnection effect
      });
      
      socket.on('connect_error', (err) => {
        console.error("🚨 Socket connection error:", err);
        setIsConnected(false);
      });
    }
    
    return () => {
      if (socketInitialized.current) {
        console.log("🛑 Cleaning up socket on unmount...");
        cleanupSocket();
        socketInitialized.current = false;
        setIsConnected(false);
        
        // Clear any pending reconnection timers
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      }
    };
  }, [user]);

  // Handle reconnection logic
  useEffect(() => {
    const handleReconnection = () => {
      // Only attempt to reconnect if we have a user and socket is initialized but not connected
      if (user && socketInitialized.current && !isConnected) {
        console.warn("🔄 Socket disconnected. Attempting to reconnect...");
        
        // Try getting the existing socket first
        try {
          const socket = getSocket();
          if (!socket.connected) {
            socket.connect();
          }
        } catch (error) {
          // If getSocket fails, the socket was probably cleared, reinitialize
          console.log("Reinitializing socket connection...");
          cleanupSocket();
          socketInitialized.current = false;
          const newSocket = initializeSocket({ userId: user });
          socketInitialized.current = true;
        }
      }
    };

    // If we're not connected but should be, set up a reconnection timer
    if (user && socketInitialized.current && !isConnected && !reconnectTimerRef.current) {
      reconnectTimerRef.current = setTimeout(() => {
        handleReconnection();
        reconnectTimerRef.current = null;
      }, 5000); // Try to reconnect after 5 seconds
    }

    // Clear the timer when unmounting
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [user, isConnected]);

  // Value to expose through context
  const contextValue = {
    isConnected,
    lastConnectedAt,
    socket: socketInitialized.current ? getSocket : null,
    userId: user
  };

  return (
    <SocketContext.Provider value={contextValue}>
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