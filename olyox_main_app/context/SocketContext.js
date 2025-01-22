import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { initializeSocket, cleanupSocket } from "../services/socketService";
import { find_me } from "../utils/helpers";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [user, setUser] = useState(null);

  const firstFound = async () => {
    const data = await find_me();
    console.log("data", data.user?._id);
    if (data.user) {
      setUser(data.user?._id);
    } else {
      console.log("no user found");
      setUser(null);
    }
  };

  useEffect(() => {
    firstFound();
  }, []);

  // Use `user` as a dependency to initialize the socket after user is set
  useEffect(() => {
    if (user !== null) {
      if (!socketRef.current) {
        // Initialize socket once user is set
        socketRef.current = initializeSocket({ userId: user });
      }
    } else {
      console.log("no user found");
    }

    return () => {
      // Cleanup socket on component unmount
      if (socketRef.current) {
        cleanupSocket(socketRef.current);
      }
    };
  }, [user]); // Dependency array now watches `user`
  const reinitializeSocket = () => {
    console.log("Reinitializing socket...");
    cleanupSocketConnection();
    socketRef.current = initializeSocket({ userId: user });
  };

  return (
    <SocketContext.Provider value={socketRef.current}>
      {children}
    </SocketContext.Provider>
  );
};

export const reinitializeSocket = () => {
  return useContext(reinitializeSocket)
}
export const useSocket = () => {
  return useContext(SocketContext);
};
