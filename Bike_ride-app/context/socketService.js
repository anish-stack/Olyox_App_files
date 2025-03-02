import io from "socket.io-client";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = "http://192.168.1.2:3000";
let socket = null;

// Fetch user details
export const fetchUserData = async () => {
    try {
        const token = await SecureStore.getItemAsync("auth_token_cab");

        if (!token) {
            throw new Error("No auth token found");
        }

        const response = await axios.get(
            "http://192.168.1.2:3000/api/v1/rider/user-details",
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
    console.log("userId",userId)
    if (!userId) {
        console.error("User ID is required to initialize socket");
        return null;
    }
    console.log("I am connecting ✔️")

    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 2000,
            timeout: 20000,
        });

        socket.userType = userType;
        socket.userId = userId;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("driver_connect", { userType, userId });
        });

        socket.on("disconnect", (reason) => {
            console.warn("Socket disconnected:", reason);
            if (reason === "io server disconnect") {
                socket.connect();
            }
        });

        socket.on("reconnect_attempt", (attempt) => {
            console.log(`Reconnection attempt #${attempt}`);
        });

        socket.on("reconnect", () => {
            console.log("Socket reconnected:", socket.id);
            socket.emit("driver_connect", { userType, userId });
        });

        socket.on("reconnect_failed", () => {
            console.error("Reconnection failed. Check network.");
        });

        socket.on("connect_error", (error) => {
            console.error("Connection error:", error.message);
        });

        socket.on("connect_timeout", () => {
            console.warn("Connection timed out. Retrying...");
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
};
