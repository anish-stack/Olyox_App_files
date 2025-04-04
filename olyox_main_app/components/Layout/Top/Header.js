"use client"

import { useState, useRef, useEffect } from "react"
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

const { width, height } = Dimensions.get("window")

const Header = () => {
  // State management
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [address, setAddress] = useState({})
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [locationLoading, setLocationLoading] = useState(true)
  const [userData, setUserData] = useState(null)
  // Hooks
  const { location } = useLocation()
  const { settings, loading } = useSettings()
  const navigation = useNavigation()

  // Animations
  const slideAnim = useRef(new Animated.Value(-width)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const headerHeightAnim = useRef(new Animated.Value(70)).current

  // Rain animation setup
  const rainDrops = useRef(
    [...Array(20)].map(() => ({
      x: Math.random() * width,
      y: -Math.random() * 100,
      speed: 2 + Math.random() * 5,
      opacity: 0.5 + Math.random() * 0.5,
      size: 2 + Math.random() * 4,
    })),
  ).current
  const rainAnimValues = useRef(rainDrops.map(() => new Animated.Value(0))).current

  // Toggle sidebar function
  const toggleSidebar = () => {
    if (sidebarVisible) {
      hideSidebar()
    } else {
      showSidebar()
    }
  }

  // Show sidebar with animation
  const showSidebar = () => {
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
  }

  // Hide sidebar with animation
  const hideSidebar = () => {
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
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await find_me();
        setUserData(user.user);
      } catch (error) {
        console.log(error)
      }
    }
    fetchData()
  }, [isAuthenticated])

  // Fetch current location
  const findCurrent = async () => {
    setLocationLoading(true)
    if (!location?.coords) {
      setTimeout(() => {
        if (!location?.coords) {
          setLocationLoading(false)
        }
      }, 5000)
      return
    }

    try {
      const { data } = await axios.post(`https://demoapi.olyox.com/Fetch-Current-Location`, {
        lat: location?.coords?.latitude,
        lng: location?.coords?.longitude,
      })
      setAddress(data.data.address)
      setLocationLoading(false)

      // Animate header height based on address length
      const targetHeight = data.data.address?.completeAddress?.length > 30 ? 90 : 70
      Animated.timing(headerHeightAnim, {
        toValue: targetHeight,
        duration: 300,
        useNativeDriver: false,
      }).start()
    } catch (error) {
      console.error("Error fetching location:", error.response?.data?.message || error.message)
      setLocationLoading(false)
    }
  }

  // Handle logout
  const handleLogout = async () => {
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
  }

  // Handle login
  const handleLogin = () => {
    navigation.navigate("Login")
    hideSidebar()
  }

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const token = await tokenCache.getToken("auth_token_db")
      setIsAuthenticated(!!token)
    } catch (error) {
      console.error("Error checking auth status:", error)
      setIsAuthenticated(false)
    }
  }
  console.log("userData", userData)

  // Start rain animation
  const startRainAnimation = () => {
    rainAnimValues.forEach((anim, index) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500 + Math.random() * 2500,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ).start()
    })
  }

  // Menu items configuration
  const menuItems = [
    {
      title: "Home",
      icon: "home",
      iconType: "FontAwesome5",
      screen: "Home",
    },
    {
      title: "Profile",
      icon: "user",
      iconType: "FontAwesome5",
      screen: "Profile",
    },
    {
      title: "Parcel",
      icon: "box",
      iconType: "FontAwesome5",
      screen: "Parcel",
    },
    {
      title: "Orders",
      icon: "shopping-bag",
      iconType: "FontAwesome5",
      screen: "Orders",
    },
    {
      title: "Hotel",
      icon: "hotel",
      iconType: "FontAwesome5",
      screen: "Hotel",
    },
    {
      title: "Transport",
      icon: "car",
      iconType: "FontAwesome5",
      screen: "Transport",
    },
  ]

  // Handle menu item click
  const handleMenuClick = (screen) => {
    navigation.navigate(screen)
    hideSidebar()
  }

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
  }, [location, settings?.RainModeOn])

  // Render icon based on type
  const renderIcon = (item) => {
    if (item.iconType === "Ionicons") {
      return <Ionicons name={item.icon} size={20} color={COLORS.text} />
    } else if (item.iconType === "FontAwesome5") {
      return <FontAwesome5 name={item.icon} size={20} color={COLORS.text} />
    }
    return <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.text} />
  }

  // Render raindrops
  const renderRaindrops = () => {
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
  }

  return (
    <View>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.error} />

      {/* Main Header */}
      <Animated.View style={[styles.header, { height: headerHeightAnim }]}>
        <View style={styles.headerContent}>
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
              <Text style={styles.locationLabel}>{locationLoading ? "Finding location..." : "Delivery Location"}</Text>
              {locationLoading ? (
                <View style={styles.loadingIndicator} />
              ) : (
                <Text numberOfLines={2} style={styles.locationDetails}>
                  {address?.completeAddress || "Location unavailable"}
                  {address?.district ? `, ${address.district}` : ""}
                </Text>
              )}
            </View>

            {/* <MaterialCommunityIcons name="chevron-down" size={20} color="rgba(255,255,255,0.8)" /> */}
          </TouchableOpacity>

          {/* Menu Button */}
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar} activeOpacity={0.7}>
            <MaterialCommunityIcons name="menu" size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Rain Mode Indicator */}
        {settings?.RainModeOn && (
          <View style={styles.rainModeContainer}>
            <MaterialCommunityIcons name="weather-pouring" size={18} color={COLORS.white} />
            <Text style={styles.rainModeText}>Rain Alert: Delivery may be delayed</Text>
          </View>
        )}
      </Animated.View>

      {/* Rain Animation Overlay */}
      {settings?.RainModeOn && <View style={styles.rainContainer}>{renderRaindrops()}</View>}

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

                {/* Auth Buttons */}
              

                {/* Menu Items */}
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
                <View style={styles.authButtons}>
                  {isAuthenticated ? (
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                      <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} />
                      <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.authButtonsContainer}>
                      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                        <Text style={styles.loginButtonText}>Login</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.registerButton}
                        onPress={() => {
                          navigation.navigate("Register")
                          hideSidebar()
                        }}
                      >
                        <Text style={styles.registerButtonText}>Register</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
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
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
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

