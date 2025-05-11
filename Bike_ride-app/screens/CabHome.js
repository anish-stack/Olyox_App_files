import React, { useState, useCallback, useEffect, useMemo, useRef } from "react"
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
  Animated,
  StatusBar,
  ActivityIndicator,
} from "react-native"
import * as Updates from "expo-updates"
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons"
import axios from "axios"
import * as SecureStore from "expo-secure-store"
import { useSocket } from "../context/SocketContext"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import * as Location from "expo-location"
import LottieView from "lottie-react-native"
import { LinearGradient } from "expo-linear-gradient"

import RideCome from "./Ride.come"
import Report from "./Report/Report"
import { CommonActions, useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { initializeSocket } from "../context/socketService"
import { LocalRideStorage } from "../services/DatabaseService"
import styles from "./HomeScreen.styles"
import { useRideStatus } from "../context/CheckRideHaveOrNot.context"
import ActiveRideButton from "../ActiveRideButton"
import Bonus from "./Bonus/Bonus"

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
  const [activeRideData, setActiveRideData] = useState(false)
  const [showReconnectAnimation, setShowReconnectAnimation] = useState(false)
  const { onRide, updateRideStatus } = useRideStatus()
  const navigation = useNavigation()
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current
  const scaleAnim = useRef(new Animated.Value(1)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const mapHeightAnim = useRef(new Animated.Value(200)).current
  const refreshSpinValue = useRef(new Animated.Value(0)).current

  // Get current location
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied")
        return
      }

      const location = await Location.getCurrentPositionAsync({})
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
        }
      )
    })()
  }, [])

  // Soft refresh function - maintains socket connection
  const onSoftRefresh = useCallback(async () => {
    setRefreshing(true)
    
    // Start refresh animation
    Animated.loop(
      Animated.timing(refreshSpinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start()
    
    try {
      // Fetch user details without reloading the app
      await fetchUserDetails()
      
      // Pulse animation for status card
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
      
      // Show success message
      Alert.alert("Refresh Complete", "Dashboard updated successfully")
    } catch (error) {
      console.error("Soft refresh failed:", error)
      Alert.alert("Refresh Failed", "Could not update dashboard information")
    } finally {
      setRefreshing(false)
      // Stop refresh animation
      refreshSpinValue.setValue(0)
    }
  }, [])

  // Hard refresh function - reloads the app
  const onHardRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchUserDetails()
      await Updates.reloadAsync()

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      )
    } catch (error) {
      console.error("Hard refresh failed:", error)
      Alert.alert("Hard Refresh Failed", "Please try again later")
    } finally {
      setRefreshing(false)
    }
  }, [])

  const foundRideDetails = async () => {
    let temp_ride_id

    if (user_data && user_data.hasOwnProperty("on_ride_id") && user_data.on_ride_id != null) {
      temp_ride_id = user_data.on_ride_id

      try {
        const response = await axios.get(`https://www.appapi.olyox.com/rider/${temp_ride_id}`)
        if (response.data) {
          updateRideStatus(true)
        }
        setActiveRideData(response.data)
      } catch (error) {
        console.error("Error fetching ride details:", error?.response?.data || error.message)
      }
    } else {
      console.log("No active ride found or invalid on_ride_id")
    }
  }

  useEffect(() => {
    foundRideDetails()
  }, [user_data])

  const handleLogout = useCallback(async (retryCount = 0, maxRetries = 3) => {
    try {
      // First, delete secure storage items regardless of connection state
      await SecureStore.deleteItemAsync("auth_token_cab")
      await SecureStore.deleteItemAsync("isOnline")

      if (!user_data?._id) {
        console.log("No user ID available", user_data)
        // Even without ID, we should reset to Onboarding since tokens are deleted
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        })
        return
      }

      // Attempt the logout API call
      const response = await axios.get(`https://www.appapi.olyox.com/api/v1/rider/rider-logout/${user_data._id}`)
      console.log("Logout successful:", response.data)

      // On success, reset navigation and exit
      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      })

      BackHandler.exitApp()
    } catch (error) {
      console.error(`Logout Error (Attempt ${retryCount + 1}):`, error)

      // If we haven't reached max retries, try again after 4 seconds
      if (retryCount < maxRetries) {
        console.log(`Retrying logout in 4 seconds... (Attempt ${retryCount + 1}/${maxRetries})`)

        // Schedule retry after 4 seconds
        setTimeout(() => {
          handleLogout(retryCount + 1, maxRetries)
        }, 4000)
      } else {
        // If we've reached max retries, show only the specific server error message
        const errorMessage =
          error?.response?.data?.message && error?.response?.data?.message !== "undefined"
            ? error.response.data.message
            : "Please try again. If you have an ongoing ride, please complete it first."

        Alert.alert("Unable to Logout", errorMessage, [
          {
            text: "Try Again",
            onPress: () => handleLogout(0, maxRetries),
          },
          {
            text: "Force Logout",
            onPress: () => {
              // Force navigation reset even if API call failed
              navigation.reset({
                index: 0,
                routes: [{ name: "Onboarding" }],
              })
            },
          },
        ])
      }
    } finally {
      setMenuVisible(false)
    }
  }, [navigation, user_data])

  const handleHardReconnect = async (id) => {
    try {
      if (!id) {
        return Alert.alert("Connection Error", "Please try to re-login to reconnect")
      }
      
      setShowReconnectAnimation(true)
      
      const isReconnectingHard = await initializeSocket({
        userId: id,
      })

      // Simulate a delay to show the animation
      setTimeout(() => {
        setShowReconnectAnimation(false)
        
        if (isReconnectingHard) {
          Alert.alert("Connection Successful", "You are now connected to the server")
        }
      }, 2000)
    } catch (error) {
      setShowReconnectAnimation(false)
      Alert.alert("Connection Failed", "Could not connect to the server. Please try again.")
      console.log("Socket reconnection error", error)
    }
  }

  const hardClear = async () => {
    // Start rotation animation
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      rotateAnim.setValue(0)
    })
    
    await LocalRideStorage.clearRide()
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    )
  }

  const fetchUserDetails = async () => {
    setLoading(true)
    try {
      const token = await SecureStore.getItemAsync("auth_token_cab")
      if (token) {
        const response = await axios.get("https://www.appapi.olyox.com/api/v1/rider/user-details", {
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
        "https://www.appapi.olyox.com/api/v1/rider/toggleWorkStatusOfRider",
        { status: goingOnline },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      const response_two = await axios.get("https://www.appapi.olyox.com/api/v1/rider/user-details", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const partnerData = response_two.data.partner
      setUserData(partnerData)
      
      if (response.data.success) {
        setIsOnline(response.data.cabRider?.status === "online" ? true : false)
        await SecureStore.setItemAsync("isOnline", goingOnline.toString())
        
        // Pulse animation for status change
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.7,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start()
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

  const toggleMapVisibility = () => {
    if (mapVisible) {
      // Collapse map
      Animated.timing(mapHeightAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => setMapVisible(false))
    } else {
      // Expand map
      setMapVisible(true)
      Animated.timing(mapHeightAnim, {
        toValue: 200,
        duration: 300,
        useNativeDriver: false,
      }).start()
    }
  }

  // Rotate interpolation for refresh icon
  const spin = refreshSpinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })
  
  // Rotate interpolation for hard refresh
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  })

  // Memoized components for better performance
  const ConnectionStatus = useMemo(() => {
    return (
      <Animated.View 
        style={[
          styles.connectionStatus, 
          { 
            backgroundColor: socket?.connected ? "#E0F7FA" : "#FFEBEE",
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <MaterialCommunityIcons
          name={socket?.connected ? "wifi-check" : "wifi-off"}
          size={20}
          color={socket?.connected ? "#00BCD4" : "#F44336"}
        />
        <Text style={[styles.connectionText, { color: socket?.connected ? "#00BCD4" : "#F44336" }]}>
          {socket?.connected ? "Connected to Server" : "Server Disconnected"}
        </Text>
        
        {!socket?.connected && (
          <TouchableOpacity 
            style={styles.reconnectIconButton}
            onPress={() => handleHardReconnect(user_data?._id)}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#F44336" />
          </TouchableOpacity>
        )}
      </Animated.View>
    )
  }, [socket?.connected, fadeAnim, scaleAnim])

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
            
            <View style={styles.menuHeader}>
              <Text style={styles.menuHeaderText}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false)
                navigation.navigate("Profile")
              }}
            >
              <MaterialCommunityIcons name="account" size={24} color="#00BCD4" />
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false)
                navigation.navigate("Recharge", {
                  showOnlyBikePlan:
                    user_data?.rideVehicleInfo?.vehicleName === "2 Wheeler" ||
                    user_data?.rideVehicleInfo?.vehicleName === "Bike"
                      ? true
                      : false,
                  role: user_data?.category,
                  firstRecharge: user_data?.isFirstRechargeDone || false,
                })
              }}
            >
              <MaterialCommunityIcons name="contactless-payment" size={24} color="#00BCD4" />
              <Text style={styles.menuText}>Recharge</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false)
                onSoftRefresh()
              }}
            >
              <MaterialCommunityIcons name="refresh" size={24} color="#00BCD4" />
              <Text style={styles.menuText}>Refresh Dashboard</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={24} color="#F44336" />
              <Text style={[styles.menuText, { color: "#F44336" }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    )
  }, [menuVisible, navigation, handleLogout, onSoftRefresh])

  const StatusCard = useMemo(() => {
    return (
      <Animated.View 
        style={[
          styles.statusCard,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIcon, { backgroundColor: "#E3F2FD" }]}>
              <FontAwesome5 name="car" size={18} color="#2196F3" />
            </View>
            <Text style={styles.statusLabel}>Status</Text>
            <Text style={[styles.statusValue, { color: user_data?.isAvailable ? "#4CAF50" : "#F44336" }]}>
              {user_data?.isAvailable
                ? "Online"
                : user_data?.on_ride_id
                ? "On Ride"
                : "Offline"}
            </Text>
          </View>

          <View style={styles.statusItem}>
            <View style={[styles.statusIcon, { backgroundColor: "#E8F5E9" }]}>
              <MaterialCommunityIcons name="wifi" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.statusLabel}>Connection</Text>
            <Text style={[styles.statusValue, { color: socket?.connected ? "#4CAF50" : "#F44336" }]}>
              {socket?.connected ? "Connected" : "Offline"}
            </Text>
          </View>
        </View>
      </Animated.View>
    )
  }, [user_data?.isAvailable, socket?.connected, scaleAnim])

  const DriverMap = useMemo(() => {
    if (!location) return null

    return (
      <Animated.View style={[styles.mapContainer, { height: mapHeightAnim }]}>
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
        <TouchableOpacity style={styles.mapToggleButton} onPress={toggleMapVisibility}>
          <MaterialCommunityIcons name={mapVisible ? "chevron-down" : "chevron-up"} size={24} color="#333" />
        </TouchableOpacity>
      </Animated.View>
    )
  }, [location, mapVisible, mapHeightAnim])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#00BCD4" barStyle="light-content" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={["#00BCD4", "#0097A7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientHeader}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity>
              {onRide && <ActiveRideButton rideDetails={activeRideData} />}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onSoftRefresh} style={styles.headerButton} disabled={refreshing}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <MaterialCommunityIcons name="refresh" size={24} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => hardClear()} style={styles.headerButton}>
              <Animated.View style={{ transform: [{ rotate: rotate }] }}>
                <MaterialCommunityIcons name="reload" size={24} color="#FFFFFF" />
              </Animated.View>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerButton}>
              <MaterialCommunityIcons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
      showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onSoftRefresh} 
            colors={["#00BCD4"]} 
            tintColor="#00BCD4"
            progressBackgroundColor="#FFFFFF"
          />
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
                    <MaterialCommunityIcons name="account" size={40} color="#00BCD4" />
                  </View>
                )}
              </View>
              <View style={styles.welcomeTextContainer}>
                <Text style={styles.welcomeText}>Welcome back!</Text>
                <Text style={styles.nameText}>{user_data?.name || "Driver"}</Text>
                <View style={styles.expiryContainer}>
                  <MaterialCommunityIcons name="calendar-clock" size={14} color="#757575" />
                  <Text style={styles.subText}>
                    Expires: {formatToIST(user_data?.RechargeData?.expireData)}
                  </Text>
                </View>
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
                    : "#FFEBEE",
                },
              ]}
              onPress={toggleOnlineStatus}
              disabled={loading || user_data?.on_ride_id}
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
                    ? "#4CAF50"
                    : user_data?.on_ride_id
                    ? "#FB8C00" // orange
                    : "#F44336"
                }
              />
              <Text
                style={[
                  styles.onlineToggleText,
                  {
                    color: loading
                      ? "#757575"
                      : isOnline
                      ? "#4CAF50"
                      : user_data?.on_ride_id
                      ? "#FB8C00"
                      : "#F44336",
                  },
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
              style={[styles.reconnectButton, { backgroundColor: isSocketReady ? "#E0F7FA" : "#FFEBEE" }]}
              onPress={() => handleHardReconnect(user_data?._id)}
              disabled={loading || showReconnectAnimation}
            >
              {showReconnectAnimation ? (
                <View style={styles.reconnectingContainer}>
                  <ActivityIndicator size="small" color="#00BCD4" />
                  <Text style={[styles.reconnectText, { color: "#00BCD4" }]}>Reconnecting...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name={isSocketReady ? "wifi-check" : "wifi-off"}
                    size={24}
                    color={isSocketReady ? "#00BCD4" : "#F44336"}
                  />
                  <Text style={[styles.reconnectText, { color: isSocketReady ? "#00BCD4" : "#F44336" }]}>
                    {isSocketReady ? "Connected to Server" : "Reconnect to Server"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {!mapVisible && (
            <TouchableOpacity 
              style={styles.showMapButton} 
              onPress={toggleMapVisibility}
            >
              <MaterialCommunityIcons name="map-marker" size={20} color="#00BCD4" />
              <Text style={styles.showMapText}>Show My Location</Text>
            </TouchableOpacity>
          )}
          
          {mapVisible && DriverMap}
                    <Report isRefresh={refreshing} />

          <Bonus />
        </View>
      </ScrollView>

      {Menu}
    </SafeAreaView>
  )
}

export default React.memo(CabHome)
