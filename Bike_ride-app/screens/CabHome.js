
import React, { useState, useCallback, useEffect, useMemo } from "react"
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  Modal,
  Pressable,
  BackHandler,
  Alert,
  Image,
} from "react-native"
import * as Updates from "expo-updates"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import axios from "axios"
import * as SecureStore from "expo-secure-store"
import { useSocket } from "../context/SocketContext"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import LottieView from "lottie-react-native"

import RideCome from "./Ride.come"
import Report from "./Report/Report"
import { CommonActions, useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { initializeSocket } from "../context/socketService"
import { LocalRideStorage } from "../services/DatabaseService"
import styles from "./HomeScreen.styles"
import { useRideStatus } from "../context/CheckRideHaveOrNot.context"
import ActiveRideButton from "../ActiveRideButton"

const CabHome = () => {
  const { isSocketReady, socket } = useSocket()
  const [menuVisible, setMenuVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const [user_data, setUserData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [mapVisible, setMapVisible] = useState(true)
  const [activeRideData, setActiveRideData] = useState(false);
  const { onRide, updateRideStatus } = useRideStatus();
  const navigation = useNavigation()

  // Get current location
  useEffect(() => {
    ; (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
      console.log("location", location)
      setLocation(location)

      // Set up location tracking
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // update every 10 meters
          timeInterval: 5000, // update every 5 seconds
        },
        (newLocation) => {
          setLocation(newLocation)
        },
      )
    })()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const data = await fetchUserDetails()
      await Updates.reloadAsync()

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }],
        }),
      )
    } catch (error) {
      console.error("Refresh failed:", error)
    } finally {
      setRefreshing(false)
    }
  }, [])



  // console.log("Ride From Context",onRide)

  const foundRideDetails = async () => {
    let temp_ride_id;


    if (user_data && user_data.hasOwnProperty('on_ride_id') && user_data.on_ride_id != null) {
      temp_ride_id = user_data.on_ride_id;

      try {

        const response = await axios.get(`http://192.168.1.47:3100/rider/${temp_ride_id}`);
        console.log("Ride details:", response.data);
        if (response.data) {
          updateRideStatus(true)
        }
        setActiveRideData(response.data);
      } catch (error) {
        console.error("Error fetching ride details:", error?.response?.data || error.message);
      }
    } else {
      console.log("No active ride found or invalid on_ride_id");
      // Handle the case where there is no ride or on_ride_id is null
    }
  };


  useEffect(() => {
    foundRideDetails()
  }, [user_data])



  // console.log("No Id Available",user_data)
  const handleLogout = useCallback(async (retryCount = 0, maxRetries = 3) => {
    try {
      // First, delete secure storage items regardless of connection state
      await SecureStore.deleteItemAsync("auth_token_cab");
      await SecureStore.deleteItemAsync("isOnline");


      if (!user_data?._id) {
        console.log("No user ID available", user_data);
        // Even without ID, we should reset to Onboarding since tokens are deleted
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
        return;
      }

      // Attempt the logout API call
      const response = await axios.get(`http://192.168.1.47:3100/api/v1/rider/rider-logout/${user_data._id}`);
      console.log("Logout successful:", response.data);

      // On success, reset navigation and exit
      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      });

      BackHandler.exitApp();
    } catch (error) {
      console.error(`Logout Error (Attempt ${retryCount + 1}):`, error);

      // If we haven't reached max retries, try again after 4 seconds
      if (retryCount < maxRetries) {
        console.log(`Retrying logout in 4 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);

        // Schedule retry after 4 seconds
        setTimeout(() => {
          handleLogout(retryCount + 1, maxRetries);
        }, 4000);
      } else {
        // If we've reached max retries, show only the specific server error message
        const errorMessage =
          error?.response?.data?.message && error?.response?.data?.message !== "undefined"
            ? error.response.data.message
            : "Please try again. If you have an ongoing ride, please complete it first.";

        Alert.alert(
          "Unable to Logout",
          errorMessage,
          [
            {
              text: "Try Again",
              onPress: () => handleLogout(0, maxRetries)
            },
            {
              text: "Force Logout",
              onPress: () => {
                // Force navigation reset even if API call failed
                navigation.reset({
                  index: 0,
                  routes: [{ name: "Onboarding" }],
                });
              }
            }
          ]
        );
      }
    } finally {
      setMenuVisible(false);
    }
  }, [navigation, user_data]);

  const handleHardReconnect = async (id) => {
    try {
      if (!id) {
        return alert("Please try to re login")
      }
      const isReconnectingHard = await initializeSocket({
        userId: id,
      })

      console.log("i am socket", isReconnectingHard)

      await Updates.reloadAsync()
    } catch (error) {
      console.log("i am socket error", error)
    }
  }

  const hardClear = async () => {
    await LocalRideStorage.clearRide()
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      }),
    )
  }

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const token = await SecureStore.getItemAsync("auth_token_cab")
      console.log(token)
      if (token) {
        const response = await axios.get("http://192.168.1.47:3100/api/v1/rider/user-details", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.data.partner) {
          setUserData(response.data.partner)
          setIsOnline(response.data.partner.isAvailable)
          await initializeSocket({
            userId: response?.data?.partner?._id,
          })
          return response.data.partner
        }
      }
    } catch (error) {
      console.error("Error fetching user details:", error?.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserDetails()
  }, [])

  const toggleOnlineStatus = async () => {
    setLoading(true)

    const expireDate = new Date(user_data?.RechargeData?.expireData)
    const currentDate = new Date()

    const goingOnline = !isOnline

    try {
      const token = await SecureStore.getItemAsync("auth_token_cab")

      if (goingOnline && expireDate < currentDate) {
        Alert.alert("Recharge Expired", "You have been set to offline due to expired recharge.", [
          {
            text: "OK",
            onPress: () => navigation.navigate("Recharge"),
          },
        ])
        setLoading(false)
        return
      }

      // Always allow the API call if going OFFLINE regardless of recharge status
      const response = await axios.post(
        "http://192.168.1.47:3100/api/v1/rider/toggleWorkStatusOfRider",
        { status: goingOnline },
        { headers: { Authorization: `Bearer ${token}` } },
      )

      const response_two = await axios.get("http://192.168.1.47:3100/api/v1/rider/user-details", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const partnerData = response_two.data.partner
      setUserData(partnerData)
      console.log("response.data", response.data.cabRider?.status)
      if (response.data.success) {
        setIsOnline(response.data.cabRider?.status === "online" ? true : false)
        await SecureStore.setItemAsync("isOnline", goingOnline.toString())
      }
    } catch (error) {
      Alert.alert("Toggle Status Failed", error?.response?.data?.message || "Something went wrong", [{ text: "OK" }])
      console.error("Toggle Status Error:", error?.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatToIST = (dateString) => {
    if (!dateString) return "N/A"

    const date = new Date(dateString)
    return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
  }



  // Memoized components for better performance
  const ConnectionStatus = useMemo(() => {
    return (
      <View style={[styles.connectionStatus, { backgroundColor: socket?.connected ? "#FFF8E1" : "#FFEBEE" }]}>
        <MaterialCommunityIcons
          name={socket?.connected ? "wifi-check" : "wifi-off"}
          size={20}
          color={socket?.connected ? "#00C1A4" : "#C62828"}
        />
        <Text style={[styles.connectionText, { color: socket?.connected ? "#00C1A4" : "#C62828" }]}>
          {socket?.connected ? "Connected" : "Offline"}
        </Text>
      </View>
    )
  }, [socket?.connected])

  const Menu = useMemo(() => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <View style={styles.menuHandle} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false)
                navigation.navigate("Profile")
              }}
            >
              <MaterialCommunityIcons name="account" size={24} color="#FFB300" />
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false)
                navigation.navigate("Recharge")
              }}
            >
              <MaterialCommunityIcons name="contactless-payment" size={24} color="#FFB300" />
              <Text style={styles.menuText}>Recharge</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color="#FFB300" />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    )
  }, [menuVisible, navigation, handleLogout])

  const StatusCard = useMemo(() => {
    return (
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIcon, { backgroundColor: "#E3F2FD" }]}>
              <FontAwesome5 name="car" size={18} color="#1976D2" />
            </View>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusValue, { color: user_data?.isAvailable ? "#4CAF50" : "#F44336" }]}>
              {user_data?.isAvailable
                ? "Online"
                : user_data?.on_ride_id
                  ? "You are on a ride"
                  : "Offline"}
            </Text>

          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusIcon, { backgroundColor: "#E8F5E9" }]}>
              <MaterialCommunityIcons name="wifi" size={18} color="#43A047" />
            </View>
            <Text style={styles.statusLabel}>Connection</Text>
            <Text style={[styles.statusValue, { color: socket?.connected ? "#4CAF50" : "#F44336" }]}>
              {socket?.connected ? "Connected" : "Offline"}
            </Text>
          </View>
        </View>
      </View>
    )
  }, [user_data?.isAvailable, socket?.connected])

  const DriverMap = useMemo(() => {
    if (!location) return null

    return (
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerCircle}>
                <FontAwesome5 name="car" size={16} color="#FFFFFF" />
              </View>
              <View style={styles.markerTriangle} />
            </View>
          </Marker>
        </MapView>
        <TouchableOpacity style={styles.mapToggleButton} onPress={() => setMapVisible(!mapVisible)}>
          <MaterialCommunityIcons name={mapVisible ? "chevron-down" : "chevron-up"} size={24} color="#333" />
        </TouchableOpacity>
      </View>
    )
  }, [location, mapVisible])


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cab Driver Dashboard</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity >
            {onRide && (
              <ActiveRideButton rideDetails={activeRideData} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => hardClear()} style={styles.headerButton}>
            <MaterialCommunityIcons name="reload" size={24} color="#212121" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerButton}>
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#212121" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FFB300"]} tintColor="#FFB300" />
        }
      >
        {ConnectionStatus}
        <RideCome isRefresh={refreshing} />
        <View style={styles.content}>
          <View style={styles.welcomeCard}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {user_data?.documents?.profile ? (
                  <Image source={{ uri: user_data?.documents?.profile }} style={styles.profileImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <MaterialCommunityIcons name="account" size={40} color="#FFB300" />
                  </View>
                )}
              </View>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.subText}>Recharge expires: {formatToIST(user_data?.RechargeData?.expireData)}</Text>
              </View>
            </View>

            {StatusCard}

            <TouchableOpacity
              style={[
                styles.onlineToggle,
                {
                  backgroundColor: loading
                    ? "#F5F5F5"
                    : isOnline
                      ? "#E8F5E9"
                      : user_data?.on_ride_id
                        ? "#FFF3E0" // light orange for "Ride In Progress"
                        : "#FFEBEE"
                }
              ]}
              onPress={toggleOnlineStatus}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name={
                  loading
                    ? "progress-clock"
                    : isOnline
                      ? "car"
                      : user_data?.on_ride_id
                        ? "steering" // or "car-wrench" or "clock"
                        : "car-off"
                }
                size={24}
                color={
                  loading
                    ? "#757575"
                    : isOnline
                      ? "#43A047"
                      : user_data?.on_ride_id
                        ? "#FB8C00" // orange
                        : "#E53935"
                }
              />
              <Text
                style={[
                  styles.onlineToggleText,
                  {
                    color: loading
                      ? "#757575"
                      : isOnline
                        ? "#43A047"
                        : user_data?.on_ride_id
                          ? "#FB8C00"
                          : "#E53935"
                  }
                ]}
              >
                {loading
                  ? "Updating..."
                  : isOnline
                    ? "Go Offline"
                    : user_data?.on_ride_id
                      ? "Ride In Progress"
                      : "Go Online"}
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={[styles.reconnectButton, { backgroundColor: isSocketReady ? "#E3F2FD" : "#FFEBEE" }]}
              onPress={() => handleHardReconnect(user_data?._id)}
              disabled={loading}
            >
              <MaterialCommunityIcons
                name={isSocketReady ? "wifi-check" : "wifi-off"}
                size={24}
                color={isSocketReady ? "#1976D2" : "#E53935"}
              />
              <Text style={[styles.reconnectText, { color: isSocketReady ? "#1976D2" : "#E53935" }]}>
                {isSocketReady ? "Connected to Server" : "Reconnect to Server"}
              </Text>
            </TouchableOpacity>
          </View>

          {!mapVisible && (

            <View>
              <TouchableOpacity onPress={() => setMapVisible(true)}>
                <Text>Show My Location</Text>
              </TouchableOpacity>
            </View>
          )}
          {mapVisible && DriverMap}



          <Report isRefresh={refreshing} />
        </View>
      </ScrollView>

      {Menu}
    </SafeAreaView>
  )
}

export default React.memo(CabHome)
