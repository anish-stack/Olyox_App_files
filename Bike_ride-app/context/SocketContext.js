import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { cleanupSocket, initializeSocket, fetchUserData } from "./socketService";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const [isSocketReady, setSocketReady] = useState(false);
    const [isReconnecting, setReconnecting] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("connecting")
        const loadUserAndInitializeSocket = async () => {
            try {
                const user = await fetchUserData();
                console.log(user)
                if (!user || !user._id) throw new Error("Invalid user data");

                setUserData(user);

                const newSocket = await initializeSocket({
                    userType: "driver",
                    userId: user._id,
                });

                if (newSocket) {
                    socketRef.current = newSocket;
                    setSocketReady(true);
                    setReconnecting(false);
                }
            } catch (err) {
                console.error("Error initializing socket:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadUserAndInitializeSocket();

        return () => {
            cleanupSocket();
            setSocketReady(false);
            setReconnecting(false);
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isSocketReady, isReconnecting, loading, error }}>
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
