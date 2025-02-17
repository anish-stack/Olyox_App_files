
import { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Animated, Dimensions } from "react-native"
import {
  Menu,
  Search,
  MapPin,
  X,
  Home,
  User,
  ShoppingBag,
  MapPinned,
  Settings,
  HelpCircle,
  Briefcase,
} from "lucide-react-native"


import { useClerk } from "@clerk/clerk-expo"
import { useNavigation } from "@react-navigation/native"
import { useLocation } from "../../../context/LocationContext"
import axios from "axios"
import { tokenCache } from "../../../Auth/cache"
import { COLORS } from "../../../constants/colors"
const { width } = Dimensions.get("window")

const Header = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [address, setAddress] = useState({})
  const { location } = useLocation()
  const navigation = useNavigation()
  const slideAnim = useRef(new Animated.Value(-width)).current
  const { signOut } = useClerk()

  const toggleSidebar = () => {
    if (sidebarVisible) {
      hideSidebar()
    } else {
      showSidebar()
    }
  }

  const showSidebar = () => {
    setSidebarVisible(true)
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start()
  }

  const hideSidebar = () => {
    Animated.spring(slideAnim, {
      toValue: -width,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false))
  }

  const findCurrent = async () => {
    try {
      const { data } = await axios.post(`https://demoapi.olyox.com/Fetch-Current-Location`, {
        lat: location?.coords?.latitude,
        lng: location?.coords?.longitude,
      })
      setAddress(data.data.address)
    } catch (error) {
      console.error("Error fetching location:", error)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      await tokenCache.deleteToken("auth_token_db")
      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      })
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  const menuItems = [
    { title: "Home", icon: Home },
    { title: "Profile", icon: User },
    // { title: "Orders", icon: ShoppingBag },
    { title: "Parcel", icon: Briefcase },
    // { title: "Addresses", icon: MapPinned },
    // { title: "Settings", icon: Settings },
    // { title: "Help", icon: HelpCircle },
  ]

  const handleMenuClick = (title) => {
    navigation.navigate(title)
    hideSidebar()
  }

  useEffect(() => {
    findCurrent()
  }, [location, findCurrent]) // Added findCurrent to dependencies

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <MapPin size={20} color={COLORS.white} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Location</Text>
            <Text numberOfLines={1} style={styles.locationDetails}>
              {address?.completeAddress}
            </Text>
            <Text style={styles.locationDetails}>{address?.district}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search What you Want To Eat, Ride, and Shift ...."
            placeholderTextColor={COLORS.text}
          />
          <TouchableOpacity style={styles.searchIcon}>
            <Search size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
          <Menu size={30} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={sidebarVisible} transparent={true} onRequestClose={hideSidebar} animationType="none">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideSidebar}>
          <Animated.View
            style={[
              styles.sidebar,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Menu</Text>
                <TouchableOpacity onPress={hideSidebar} style={styles.closeButton}>
                  <X size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.authButtons}>
                <TouchableOpacity style={styles.loginButton}>
                  <Text style={styles.loginButtonText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={styles.registerButton}>
                  <Text style={styles.registerButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuItems}>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.title}
                    style={styles.menuItem}
                    onPress={() => handleMenuClick(item.title)}
                  >
                    <item.icon size={20} color={COLORS.text} />
                    <Text style={styles.menuText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.error,
    padding: 16,
    borderColor: COLORS.white,
    borderWidth: 2,
    borderRadius: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  locationLabel: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  locationDetails: {
    width: 200,
    color: COLORS.white,
    fontSize: 12,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
  },
  searchInput: {
    flex: 1,
    height: 35,
    color: COLORS.error,
    fontSize: 12,
  },
  searchIcon: {
    marginLeft: 8,
  },
  menuButton: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebar: {
    backgroundColor: COLORS.background,
    width: "80%",
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
    borderBottomColor: COLORS.border,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  closeButton: {
    padding: 8,
  },
  authButtons: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  loginButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  registerButton: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  loginButtonText: {
    color: COLORS.white,
    textAlign: "center",
    fontWeight: "bold",
  },
  registerButtonText: {
    color: COLORS.error,
    textAlign: "center",
    fontWeight: "bold",
  },
  menuItems: {
    padding: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.2,
    borderBottomColor: COLORS.border,
  },
  menuText: {
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 16,
  },
})

export default Header

