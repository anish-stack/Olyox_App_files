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
        const loadUserAndInitializeSocket = async () => {
            try {
                const user = await fetchUserData();
                setUserData(user);

                socketRef.current = await initializeSocket({
                    userType: "driver",
                    userId: user._id,
                });

                if (socketRef.current) {
                    setSocketReady(true);
                    setReconnecting(false);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadUserAndInitializeSocket();

        return () => {
            if (socketRef.current) {
                cleanupSocket();
            }
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
