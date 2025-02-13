
import { useEffect, useState } from "react"
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, SafeAreaView } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axios from "axios"
import { useNavigation, useRoute } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import * as Location from "expo-location"
import * as TaskManager from "expo-task-manager"
import styles from "./Styles"
import MapComponent from "./MapComponent"
import OrderDetails from "./OrderDetails"
import ActionButtons from "./ActionButtons"
import { useSocket } from "../../../context/SocketContext"

const LOCATION_TASK_NAME = "background-location-task"

const OngoingOrderScreen = () => {
  const [driverLocation, setDriverLocation] = useState(null)
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNearCustomer, setIsNearCustomer] = useState(false)
  const [hasReached, setHasReached] = useState(false)
  const route = useRoute()
    const { socket, isSocketReady } = useSocket();
  
  const navigation = useNavigation()
  const { order, location } = route.params || {}

  useEffect(() => {
    const fetchData = async () => {
      try {
        let data = order
        if (!data) {
          const storedOrder = await AsyncStorage.getItem("Ongoing_Order")
          if (storedOrder) {
            data = JSON.parse(storedOrder)
          } else {
            const token = await AsyncStorage.getItem("auth_token_partner")
            if (!token) throw new Error("No auth token found")

            const response = await axios.get("http://192.168.1.9:3000/api/v1/parcel/user-details", {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (response.data.latestOrder) {
              data = response.data.latestOrder
              await AsyncStorage.setItem("ongoing_order", JSON.stringify(data))
            } else {
              throw new Error("No ongoing orders found")
            }
          }
        }
        setOrderData(data)
        await setupLocation()
      } catch (error) {
        console.error("Error fetching order data:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
    }
  }, [order]) // Removed 'location' from dependencies

  const setupLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      setError("Permission to access location was denied")
      return
    }

    const currentLocation = await Location.getCurrentPositionAsync({})
    setDriverLocation({
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    })

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10000,
      distanceInterval: 10,
    })
  }

  useEffect(() => {
    if (driverLocation && orderData) {
        console.log("driverLocation",driverLocation)
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        orderData.pickupGeo.coordinates[1],
        orderData.pickupGeo.coordinates[0],
      )
      console.log("distance",distance)
      if(distance > 0.5){
            setIsNearCustomer(true) 
        console.log("Driver has arrived at pickup location")
      }else{
        console.log("Driver is still en route to pickup location")
      }
    }
  }, [driverLocation, orderData])

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
  }

  const handleMarkReached = () => {
    if(socket){
      socket.emit('driver_reached', orderData)
      setHasReached(true)
    }
    // Here you would typically update the server about the status change
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
      <MapComponent driverLocation={driverLocation} orderData={orderData} />
      <ScrollView style={styles.detailsContainer}>
        <OrderDetails orderData={orderData} />
      </ScrollView>
      <ActionButtons
        isNearCustomer={isNearCustomer}
        hasReached={hasReached}
        onMarkReached={handleMarkReached}
        orderData={orderData}
      />
    </SafeAreaView>
  )
}

TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error(error)
    return
  }
  if (data) {
    const { locations } = data
    // Do something with the locations captured in the background
  }
})

export default OngoingOrderScreen

