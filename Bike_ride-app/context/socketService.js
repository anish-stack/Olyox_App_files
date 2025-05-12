import io from "socket.io-client";
import axios from "axios";
import * as SecureStore from 'expo-secure-store';

const SOCKET_URL = "https://appapi.olyox.com";
let socket = null;

// Fetch user details
export const fetchUserData = async () => {
    try {
        const token = await SecureStore.getItemAsync("auth_token_cab");

        if (!token) {
            throw new Error("No auth token found");
        }

        const response = await axios.get(
            "https://appapi.olyox.com/api/v1/rider/user-details",
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
            timeout: 20000,
        });

        socket.userType = userType;
        socket.userId = userId;

        return new Promise((resolve, reject) => {
            socket.on("connect", () => {
                console.log("Socket connected:", socket.id);
                socket.emit("driver_connect", { userType, userId });
                resolve(socket);
            });

            socket.on("connect_error", (error) => {
                console.error("Connection error:", error.message);
                reject(error);
            });

            socket.on("disconnect", (reason) => {
                console.warn("Socket disconnected:", reason);
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
};
