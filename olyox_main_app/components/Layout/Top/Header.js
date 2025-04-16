import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  BackHandler,
  Alert,
  StatusBar,
  Image,

} from "react-native"
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { useLocation } from "../../../context/LocationContext"
import axios from "axios"
import { tokenCache } from "../../../Auth/cache"
import { COLORS } from "../../../constants/colors"
import useSettings from "../../../hooks/Settings"
import Footer from "./Footer"
import { find_me } from "../../../utils/helpers"
import * as Location from 'expo-location'
import { useGuest } from "../../../context/GuestLoginContext"

const { width } = Dimensions.get("window")

const Header = () => {
  // State management
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [address, setAddress] = useState({})
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  const [locationPermission, setLocationPermission] = useState(null)
  const { isGuest } = useGuest()
  // Hooks
  const { location } = useLocation()
  const { settings } = useSettings()
  const navigation = useNavigation()

  // Animations
  const slideAnim = useRef(new Animated.Value(-width)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const headerHeightAnim = useRef(new Animated.Value(70)).current

  // Rain animation setup
  const rainDrops = useMemo(() =>
    [...Array(20)].map(() => ({
      x: Math.random() * width,
      y: -Math.random() * 100,
      speed: 2 + Math.random() * 5,
      opacity: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 4,
    })),
    [])

  const rainAnimValues = useRef(rainDrops.map(() => new Animated.Value(0))).current

  // Menu items configuration
  const menuItems = useMemo(() => [
    { title: "Home", icon: "home", iconType: "FontAwesome5", screen: "Home" },
    { title: isGuest ? "Guest" : "Profile", icon: "user", iconType: "FontAwesome5", screen: isGuest ? '' : "Profile" },
    { title: "Parcel", icon: "box", iconType: "FontAwesome5", screen: "Parcel" },
    { title: "Orders", icon: "shopping-bag", iconType: "FontAwesome5", screen: "Orders" },
    { title: "Hotel", icon: "hotel", iconType: "FontAwesome5", screen: "Hotel" },
    { title: "Transport", icon: "car", iconType: "FontAwesome5", screen: "Transport" },
  ], [])

  // Toggle sidebar function
  const toggleSidebar = useCallback(() => {
    if (sidebarVisible) {
      hideSidebar()
    } else {
      showSidebar()
    }
  }, [sidebarVisible])

  // Show sidebar with animation
  const showSidebar = useCallback(() => {
    setSidebarVisible(true)
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [slideAnim, fadeAnim])

  // Hide sidebar with animation
  const hideSidebar = useCallback(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: -width,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setSidebarVisible(false))
  }, [slideAnim, fadeAnim])

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const user = await find_me()
      setUserData(user.user)
    } catch (error) {
      console.log("Error fetching user data:", error)
    }
  }, [])

  // Request location permission
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      setLocationPermission(status)
      return status === 'granted'
    } catch (error) {
      console.log("Error requesting location permission:", error)
      return false
    }
  }, [])

  // Fetch current location with caching
  const findCurrent = useCallback(async () => {
    setLocationLoading(true)

    // Check if we have permission
    if (locationPermission !== 'granted') {
      const hasPermission = await requestLocationPermission()
      if (!hasPermission) {
        setLocationLoading(false)
        return
      }
    }

    // Check if we have location coordinates
    if (!location?.coords) {
      setTimeout(() => {
        if (!location?.coords) {
          setLocationLoading(false)
        }
      }, 12000)
      return
    }

    try {
      // Try to get from cache first
      const cachedAddress = await tokenCache.get_location("cached_location")
      const cachedCoords = await tokenCache.get_location("cached_coords")

      console.log("cachedAddress", cachedAddress)
      console.log("get_location", cachedCoords)

      // If we have cached location and it's close to current location, use it
      if (cachedAddress && cachedCoords) {
        const parsedCoords = JSON.parse(cachedCoords)
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          parsedCoords.latitude,
          parsedCoords.longitude
        )

        // If within 100 meters, use cached address
        if (distance < 0.1) {
          setAddress(JSON.parse(cachedAddress))
          setLocationLoading(false)

          // Animate header height based on address length
          const addressObj = JSON.parse(cachedAddress)
          const targetHeight = addressObj?.completeAddress?.length > 30 ? 90 : 70
          animateHeaderHeight(targetHeight)
          return
        }
      }

      // Fetch new address from API
      const { data } = await axios.post(`https://demoapi.olyox.com/Fetch-Current-Location`, {
        lat: location?.coords?.latitude,
        lng: location?.coords?.longitude,
      })

      setAddress(data.data.address)
      setLocationLoading(false)

      // Cache the new address and coordinates
      await tokenCache.save_location("cached_location", JSON.stringify(data.data.address))
      await tokenCache.save_location("cached_coords", JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      }))

      // Animate header height based on address length
      const targetHeight = data.data.address?.completeAddress?.length > 30 ? 90 : 70
      animateHeaderHeight(targetHeight)
    } catch (error) {
      console.error("Error fetching location:", error.response?.data?.message || error.message)
      setLocationLoading(false)
    }
  }, [location, locationPermission, requestLocationPermission])

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in km
  }

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
  }

  // Animate header height
  const animateHeaderHeight = useCallback((targetHeight) => {
    Animated.timing(headerHeightAnim, {
      toValue: targetHeight,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [headerHeightAnim])

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await axios.get("https://demoapi.olyox.com/api/v1/rider/logout", { withCredentials: true })
      await tokenCache.deleteToken("auth_token_db")
      setIsAuthenticated(false)

      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      })

      setTimeout(() => {
        BackHandler.exitApp()
      }, 1000)
    } catch (error) {
      console.error("Error during logout:", error)
      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      })
      Alert.alert("Logout Failed", "Something went wrong. Please try again.")
    }
  }, [navigation])

  // Handle login
  const handleLogin = useCallback(() => {
    navigation.navigate("Onboarding")
    hideSidebar()
  }, [navigation, hideSidebar])

  // Handle menu item click
  const handleMenuClick = useCallback((screen) => {
    navigation.navigate(screen)
    hideSidebar()
  }, [navigation, hideSidebar])

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      const token = await tokenCache.getToken("auth_token_db")
      setIsAuthenticated(!!token)
    } catch (error) {
      console.error("Error checking auth status:", error)
      setIsAuthenticated(false)
    }
  }, [])

  // Start rain animation
  const startRainAnimation = useCallback(() => {
    rainAnimValues.forEach((anim) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500 + Math.random() * 2500,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ).start()
    })
  }, [rainAnimValues])

  // Render icon based on type
  const renderIcon = useCallback((item) => {
    if (item.iconType === "Ionicons") {
      return <Ionicons name={item.icon} size={20} color={COLORS.text} />
    } else if (item.iconType === "FontAwesome5") {
      return <FontAwesome5 name={item.icon} size={20} color={COLORS.text} />
    }
    return <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.text} />
  }, [])

  // Effects
  useEffect(() => {
    findCurrent()
    checkAuthStatus()

    if (settings?.RainModeOn) {
      startRainAnimation()
    }

    // Handle back button press to close sidebar
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (sidebarVisible) {
        hideSidebar()
        return true
      }
      return false
    })

    return () => backHandler.remove()
  }, [location, settings?.RainModeOn, findCurrent, checkAuthStatus, startRainAnimation, sidebarVisible, hideSidebar])

  // Fetch user data when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData()
    }
  }, [isAuthenticated, fetchUserData])

  // Render raindrops
  const renderRaindrops = useMemo(() => {
    if (!settings?.RainModeOn) return null

    return rainDrops.map((drop, index) => {
      const translateY = rainAnimValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0, 300],
      })

      return (
        <Animated.View
          key={index}
          style={[
            styles.raindrop,
            {
              left: drop.x,
              top: drop.y,
              opacity: drop.opacity,
              width: drop.size,
              height: drop.size * 5,
              transform: [{ translateY }],
            },
          ]}
        />
      )
    })
  }, [settings?.RainModeOn, rainDrops, rainAnimValues])

  // Render location permission request
  const renderLocationPermissionRequest = useMemo(() => {
    if (locationPermission === 'granted' || !locationLoading) return null

    return (
      <TouchableOpacity
        style={styles.permissionRequest}
        onPress={requestLocationPermission}
      >
        <MaterialCommunityIcons name="map-marker-alert" size={18} color={COLORS.white} />
        <Text style={styles.permissionText}>Location access needed</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestLocationPermission}
        >
          <Text style={styles.permissionButtonText}>Allow</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }, [locationPermission, locationLoading, requestLocationPermission])

  // Render user profile section
  const renderUserProfile = useMemo(() => (
    <View style={styles.profileSection}>
      <View style={styles.profileImageContainer}>
        {isAuthenticated && userData?.profileImage?.image ? (
          <Image
            source={{ uri: userData?.profileImage?.image || 'https://example.com/default-image.png' }}
            style={{ width: 50, height: 50, borderRadius: 25 }}
            onError={(error) => console.log("Image load error:", error.nativeEvent.error)}
          />
        ) : (
          <FontAwesome5 name="user" size={30} color="#FFFFFF" />
        )}
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{isAuthenticated ? userData?.name : "Guest User"}</Text>
        <Text style={styles.profileEmail}>
          {isAuthenticated ? userData?.email : "Sign in to access all features"}
        </Text>
      </View>
    </View>
  ), [isAuthenticated, userData])

  // Render auth buttons
  const renderAuthButtons = useMemo(() => (
    <View style={styles.authButtons}>
      {isAuthenticated ? (
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.authButtonsContainer}>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Sign up</Text>
          </TouchableOpacity>
       
        </View>
      )}
    </View>
  ), [isAuthenticated, handleLogout, handleLogin, navigation, hideSidebar])

  // Render menu items
  const renderMenuItems = useMemo(() => (
    <View style={styles.menuItems}>
      {menuItems.map((item, index) => (
        <TouchableOpacity
          key={item.title}
          style={[styles.menuItem, index === menuItems.length - 1 && styles.lastMenuItem]}
          onPress={() => handleMenuClick(item.screen)}
        >
          <View style={styles.menuIconContainer}>{renderIcon(item)}</View>
          <Text style={styles.menuText}>{item.title}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CCCCCC" style={styles.menuArrow} />
        </TouchableOpacity>
      ))}
    </View>
  ), [menuItems, handleMenuClick, renderIcon])

  return (
    <View>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.error} />

      {/* Main Header */}
      <Animated.View style={[styles.header, { height: headerHeightAnim }]}>

        <View style={styles.headerContent}>
          <View style={styles.headerLogoContainer}>
            <Image source={require("./logo_O.png")} style={styles.headerLogo} resizeMode="contain" />
          </View>
          {/* Location Section */}
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={() => navigation.navigate("LocationSelect")}
            activeOpacity={0.8}
          >
            <View style={styles.locationIconContainer}>
              <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.white} />
            </View>

            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>{locationLoading ? "Finding location..." : "Your Location"}</Text>
              {locationLoading ? (
                <View style={styles.loadingIndicator} />
              ) : (
                <Text numberOfLines={2} style={styles.locationDetails}>
                  {address?.completeAddress || "Searching Location ..."}
                  {address?.district ? `, ${address.district}` : ""}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Logo in Header */}


          {/* Menu Button */}
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar} activeOpacity={0.7}>
            <MaterialCommunityIcons name="menu" size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Location Permission Request */}
        {renderLocationPermissionRequest}

        {/* Rain Mode Indicator */}
        {settings?.RainModeOn && (
          <View style={styles.rainModeContainer}>
            <MaterialCommunityIcons name="weather-pouring" size={18} color={COLORS.white} />
            <Text style={styles.rainModeText}>Rain Alert: Delivery may be delayed</Text>
          </View>
        )}
      </Animated.View>

      {/* Rain Animation Overlay */}
      {settings?.RainModeOn && <View style={styles.rainContainer}>{renderRaindrops}</View>}

      {/* Sidebar Modal */}
      <Modal visible={sidebarVisible} transparent={true} onRequestClose={hideSidebar} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={hideSidebar}>
            <Animated.View
              style={[
                styles.sidebar,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                {/* Sidebar Header */}
                <View style={styles.sidebarHeader}>
                  <View style={styles.logoContainer}>
                    <Image source={require("./logo_O.png")} style={styles.logo} resizeMode="contain" />
                    <Text style={styles.sidebarTitle}>Olyox</Text>
                  </View>
                  <TouchableOpacity
                    onPress={hideSidebar}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* User Profile Section */}
                {renderUserProfile}

                {/* Auth Buttons */}
                {renderAuthButtons}

                {/* Menu Items */}
                {renderMenuItems}

                {/* Footer */}
                <Footer />
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.error,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  locationIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  locationTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  locationLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "500",
  },
  locationDetails: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "400",
  },
  loadingIndicator: {
    height: 14,
    width: 100,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 7,
    marginTop: 4,
  },
  headerLogoContainer: {
    width: 45,
    height: 45,
    borderRadius: 18,
    // backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  headerLogo: {
    width: 36,
    height: 36,
  },
  menuButton: {
    width: 35,
    height: 35,
    marginLeft: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionRequest: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  permissionText: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  permissionButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  permissionButtonText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "bold",
  },
  rainModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  rainModeText: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebar: {
    backgroundColor: COLORS.background,
    width: width * 0.85,
    height: "100%",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  sidebarTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  profileSection: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  profileImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#666",
  },
  authButtons: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  authButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  loginButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
    elevation: 2,
  },
  registerButton: {
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 8,
  },
  loginButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  registerButtonText: {
    color: COLORS.error,
    fontWeight: "bold",
    fontSize: 14,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  menuItems: {
    padding: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  menuArrow: {
    marginLeft: 8,
  },
  rainContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
    zIndex: 10,
  },
  raindrop: {
    position: "absolute",
    backgroundColor: "#A4D4FF",
    borderRadius: 10,
  },
})

export default Header