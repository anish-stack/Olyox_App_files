import io from "socket.io-client";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = "http://192.168.1.11:3100";
let socket = null;
let pingIntervalRef = null;

// Fetch user details
export const fetchUserData = async () => {
    try {
        const token = await SecureStore.getItemAsync("auth_token_cab");

        if (!token) {
            throw new Error("No auth token found");
        }

        const response = await axios.get(
            "http://192.168.1.11:3100/api/v1/rider/user-details",
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        return response.data.partner;
    } catch (error) {
        console.error("Error fetching user details:", error);
        throw error;
    }
};

// Initialize socket connection
export const initializeSocket = async ({ userType = "driver", userId }) => {
    if (!userId) {
        console.error("User ID is required to initialize socket");
        return null;
    }

    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            randomizationFactor: 0.5,
            timeout: 20000,
            autoConnect: true,
        });

        socket.userType = userType;
        socket.userId = userId;

        return new Promise((resolve, reject) => {
            socket.on("connect", () => {
                console.log("✅ Socket connected:", socket.id);
                socket.emit("driver_connect", { userType, userId });

                // Start heartbeat (custom ping)
                if (!pingIntervalRef) {
                    pingIntervalRef = setInterval(() => {
                        if (socket && socket.connected) {
                            socket.emit("ping-custom", { time: Date.now() });
                        }
                    }, 20000); // Every 20 seconds
                }

                resolve(socket);
            });

            socket.on("connect_error", (error) => {
                console.error("❌ Connection error:", error.message);
                reject(error);
            });

            socket.on("disconnect", (reason) => {
                console.warn("⚠️ Socket disconnected:", reason);

                // Cleanup heartbeat on disconnect
                if (pingIntervalRef) {
                    clearInterval(pingIntervalRef);
                    pingIntervalRef = null;
                }
            });

            socket.on("reconnect_attempt", (attempt) => {
                console.log(`🔁 Reconnection attempt #${attempt}`);
            });

            socket.on("reconnect", (attempt) => {
                console.log(`✅ Reconnected successfully after ${attempt} attempt(s)`);
                socket.emit("driver_connect", { userType, userId });
            });

            socket.on("reconnect_failed", () => {
                console.error("❌ Reconnection failed");
            });

            // Optional: Log custom ping response if implemented server-side
            socket.on("pong-custom", (data) => {
                console.log("Pong received from server:", data);
            });
        });
    }

    return socket;
};

// Get socket instance
export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket is not initialized. Call initializeSocket() first.");
    }
    return socket;
};

// Cleanup socket connection
export const cleanupSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }

    if (pingIntervalRef) {
        clearInterval(pingIntervalRef);
        pingIntervalRef = null;
    }
};
