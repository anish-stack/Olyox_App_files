import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, SafeAreaView, Alert } from "react-native";
import axios from "axios";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import styles from "../Other_Parcel_Screens/Ongoing/Styles";
import OrderDetailsComponent from "../Other_Parcel_Screens/Ongoing/OrderDetails";
import ActionButtons from "../Other_Parcel_Screens/Ongoing/ActionButtons";
import MapComponent from "../Other_Parcel_Screens/Ongoing/MapComponent";
import { useSocket } from "../../context/SocketContext";
import { initializeSocket } from "../../context/socketService";

export default function OrderDetails() {
    const [driverLocation, setDriverLocation] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isNearCustomer, setIsNearCustomer] = useState(false);
    const navigation = useNavigation();
    const route = useRoute();
    const { id } = route.params || {};
    let { socket, isSocketReady } = useSocket();

    // Initialize socket if not available
    useEffect(() => {
        if (!socket) {
            socket = initializeSocket({ userType: "driver", userId: id });
        }
    }, [socket]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Please grant location permission to continue.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ]);
                return;
            }

            const { data } = await axios.get(`http://192.168.1.47:3100/api/v1/parcel/single_my_parcel?id=${id}`);
            setOrderData(data.data);
            await setupLocation();
        } catch (err) {
            setError("Failed to fetch order data. Please try again.");
            console.error("Error fetching order data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const setupLocation = async () => {
        try {
            const currentLocation = await Location.getCurrentPositionAsync({});
            setDriverLocation({
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            });
        } catch (err) {
            console.error("Error fetching driver location:", err);
        }
    };

    useEffect(() => {
        if (driverLocation && orderData) {
            const distance = calculateDistance(
                driverLocation.latitude,
                driverLocation.longitude,
                orderData.pickupGeo.coordinates[1],
                orderData.pickupGeo.coordinates[0]
            );
            setIsNearCustomer(distance <= 0.5);
        }
    }, [driverLocation, orderData]);

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const deg2rad = (deg) => deg * (Math.PI / 180);

    const handleMarkReached = () => {
        if (socket) {
            socket.emit("driver_reached", orderData);
            fetchData();
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6600" />
                <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={50} color="#FF6600" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!orderData || !driverLocation) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="information-circle" size={50} color="#FF6600" />
                <Text style={styles.errorText}>No ongoing orders found.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {orderData.status === "cancelled" ? (
                <View style={styles.cancelledContainer}>
                    <View style={styles.cancelledBox}>
                        <Text style={styles.cancelledText}>
                            Order {orderData._id.substring(0, 5)} has been cancelled.
                        </Text>
                    </View>
                </View>
            ) : (
                <>
                    <MapComponent driverLocation={driverLocation} orderData={orderData} />
                    <ScrollView style={styles.detailsContainer}>
                        <OrderDetailsComponent orderData={orderData} />
                    </ScrollView>
                    <ActionButtons
                        isNearCustomer={isNearCustomer}
                        hasReached={orderData?.is_driver_reached}
                        functionHim={fetchData}
                        onMarkReached={handleMarkReached}
                        orderData={orderData}
                    />
                </>
            )}
        </SafeAreaView>
    );
}
