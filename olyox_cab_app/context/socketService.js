import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const SOCKET_URL = "http://192.168.1.9:3100";
let socket = null;

export const fetchUserData = async () => {
    try {
        const token = await AsyncStorage.getItem("auth_token_partner");

        if (!token) {
            throw new Error("No auth token found");
        }

        const response = await axios.get(
            "http://192.168.1.9:3100/api/v1/parcel/user-details",
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        console.log(response.data.partner)
        return response.data.partner;
    } catch (error) {
        console.error("Error fetching user details context:", error);
        throw error;
    }
};

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
            reconnectionDelay: 1000,
            timeout: 20000,
        });

        socket.userType = userType;
        socket.userId = userId;

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            socket.emit("driver_connect", { userType: socket.userType, userId: socket.userId });
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
            if (reason === "io server disconnect") {
                socket.connect(); // Reconnect manually if disconnected by the server
            }
        });

        socket.on("reconnect_attempt", (attempt) => {
            console.log(`Reconnection attempt #${attempt}`);
        });

        socket.on("reconnect", () => {
            console.log("Socket reconnected:", socket.id);
            socket.emit("driver_connect", { userType: socket.userType, userId: socket.userId });
        });

        socket.on("reconnect_failed", () => {
            console.error("Reconnection failed. Check your server or network.");
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

export const getSocket = () => {
    if (!socket) {
        throw new Error("Socket is not initialized. Call initializeSocket() first.");
    }
    return socket;
};

export const cleanupSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
