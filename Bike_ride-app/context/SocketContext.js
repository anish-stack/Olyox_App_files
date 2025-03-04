import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { cleanupSocket, initializeSocket, fetchUserData } from "./socketService";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const appState = useRef(AppState.currentState);
    const socketRef = useRef(null);
    const [isSocketReady, setSocketReady] = useState(false);
    const [isReconnecting, setReconnecting] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("🟢 Initializing socket connection...");

        const loadUserAndInitializeSocket = async () => {
            try {
                console.log("🔄 Fetching user data...");
                const user = await fetchUserData();

                console.log("✅ User Data:", user);

                if (!user || !user._id) throw new Error("❌ Invalid user data");

                setUserData(user);

                console.log("🔌 Initializing socket connection...");
                const newSocket = await initializeSocket({
                    userType: "driver",
                    userId: user._id,
                });

                if (newSocket) {
                    console.log("✅ Socket connected successfully!");
                    socketRef.current = newSocket;
                    setSocketReady(true);
                    setReconnecting(false);
                } else {
                    console.log("⚠️ Failed to initialize socket");
                }
            } catch (err) {
                console.error("❌ Error initializing socket:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadUserAndInitializeSocket();

        return () => {
            console.log("🛑 Cleaning up socket connection...");
            cleanupSocket();
            setSocketReady(false);
            setReconnecting(false);
        };
    }, []);

    // Handle AppState Changes
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            console.log(`🔄 AppState changed: ${appState.current} ➡️ ${nextAppState}`);

            if (appState.current.match(/inactive|background/) && nextAppState === "active") {
                console.log("🟢 App has come to the foreground");

                if (socketRef.current && !socketRef.current.connected) {
                    console.log("🔌 Reconnecting socket...");
                    socketRef.current.connect();
                } else {
                    console.log("✅ Socket is already connected.");
                }
            } else if (appState.current === "active" && nextAppState.match(/inactive|background/)) {
                console.log("🔴 App has gone to the background");

                if (socketRef.current) {
                    console.log(" ✅ socket... connected");
                    socketRef.current.connect();
                }
            }

            appState.current = nextAppState;
        };

        console.log("📡 Subscribing to AppState changes...");
        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            console.log("🔄 Removing AppState event listener...");
            subscription.remove();
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
        throw new Error("❌ useSocket must be used within a SocketProvider");
    }
    return context;
};
