import { useEffect, useState } from "react"
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, SafeAreaView, Alert } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import * as Location from "expo-location"
import styles from "../Other_Parcel_Screens/Ongoing/Styles"
import OrderDetailsComponet from '../Other_Parcel_Screens/Ongoing/OrderDetails'
import ActionButtons from '../Other_Parcel_Screens/Ongoing/ActionButtons'
import MapComponent from '../Other_Parcel_Screens/Ongoing/MapComponent'
import { useSocket } from '../../context/SocketContext'

const LOCATION_TASK_NAME = "background-location-task"

export default function OrderDetails() {
    const [driverLocation, setDriverLocation] = useState(null)
    const [orderData, setOrderData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isNearCustomer, setIsNearCustomer] = useState(false)
    const [hasReached, setHasReached] = useState(true)
    const route = useRoute()
    const { socket, isSocketReady } = useSocket();

    const navigation = useNavigation()
    const { id } = route.params || {}

    const fetchData = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync()
            console.log("status", status)
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Please grant location permission to continue.", [
                    { text: "OK", onPress: () => navigation.goBack() }
                ])
                return
            }

            const { data } = await axios.get(`http://192.168.1.9:3000/api/v1/parcel/single_my_parcel?id=${id}`)
            console.log(data.data)
            setOrderData(data.data)
            await setupLocation()
        } catch (error) {
            console.error("Error fetching order data:", error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {

        fetchData()

        return () => {
            Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
        }
    }, [id])

    const setupLocation = async () => {
        // const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        // console.log("foregroundStatus",foregroundStatus)
        // if (foregroundStatus !== "granted") {
        //     setError("Permission to access location was denied");
        //     return;
        // }

        // const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        // if (backgroundStatus !== "granted") {
        //     setError("Permission to access background location was denied");
        //     return;
        // }

        const currentLocation = await Location.getCurrentPositionAsync({});
        console.log(currentLocation)
        setDriverLocation({
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
        });

        // await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        //     accuracy: Location.Accuracy.Balanced,
        //     timeInterval: 10000,
        //     distanceInterval: 10,
        //     deferredUpdatesInterval: 5000, // Improves battery usage
        //     deferredUpdatesDistance: 5,
        //     showsBackgroundLocationIndicator: true,
        // });
    };

    useEffect(() => {
        if (driverLocation && orderData) {
            console.log("driverLocation", driverLocation)
            const distance = calculateDistance(
                driverLocation.latitude,
                driverLocation.longitude,
                orderData.pickupGeo.coordinates[1],
                orderData.pickupGeo.coordinates[0],
            )
            console.log("distance", distance)
            if (distance > 0.5) {
                setIsNearCustomer(true)
                console.log("Driver has arrived at pickup location")
            } else {
                console.log("Driver is still en route to pickup location")
            }
        }
    }, [driverLocation, orderData])

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371
        const dLat = deg2rad(lat2 - lat1)
        const dLon = deg2rad(lon2 - lon1)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        const d = R * c
        return d
    }

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180)
    }

    const handleMarkReached = () => {
        if (socket) {
            socket.emit('driver_reached', orderData)
            setHasReached(true)
            fetchData()
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6600" />
                <Text style={styles.loadingText}>Loading order details...</Text>
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={50} color="#FF6600" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        )
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
        )
    }
    return (
        <SafeAreaView style={styles.container}>
            {orderData.status === 'cancelled' ? (
                <View style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f8d7da', // Light red background
                    padding: 20
                }}>
                    <View style={{
                        backgroundColor: '#f44336',
                        padding: 20,
                        borderRadius: 10,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 5,
                        elevation: 5
                    }}>
                        <Text style={{
                            color: '#fff',
                            fontSize: 18,
                            fontWeight: 'bold',
                            textAlign: 'center'
                        }}>
                            Order {orderData._id.substring(0, 5)} has been cancelled.
                        </Text>
                    </View>
                </View>

            ) : (
                <>
                    <MapComponent driverLocation={driverLocation} orderData={orderData} />
                    <ScrollView style={styles.detailsContainer}>
                        <OrderDetailsComponet orderData={orderData} />
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
    )
}
