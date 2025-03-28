import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Dimensions, BackHandler, Alert } from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { useLocation } from "../../../context/LocationContext";
import axios from "axios";
import { tokenCache } from "../../../Auth/cache";
import { COLORS } from "../../../constants/colors";
import useSettings from "../../../hooks/Settings";
import Footer from "./Footer";

const { width } = Dimensions.get("window");

const Header = () => {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [address, setAddress] = useState({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const { location } = useLocation();
  const { settings, loading } = useSettings();
  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const rainDrops = useRef([...Array(20)].map(() => ({
    x: Math.random() * width,
    y: -Math.random() * 100,
    speed: 2 + Math.random() * 5,
    opacity: 0.5 + Math.random() * 0.5,
    size: 2 + Math.random() * 4
  }))).current;

  const rainAnimValues = useRef(rainDrops.map(() => new Animated.Value(0))).current;

  const toggleSidebar = () => {
    if (sidebarVisible) {
      hideSidebar();
    } else {
      showSidebar();
    }
  };


  const showSidebar = () => {
    setSidebarVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const hideSidebar = () => {
    Animated.spring(slideAnim, {
      toValue: -width,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  const findCurrent = async () => {
    setLocationLoading(true);
    if (!location?.coords) {
      setTimeout(() => {
        if (!location?.coords) {
          setLocationLoading(false);
        }
      }, 5000);
      return;
    }
    console.log("location?.coords?.latitude,", location?.coords?.latitude)
    console.log("location?.coords?.longitude,", location?.coords?.longitude)

    try {
      const { data } = await axios.post(`http://192.168.1.12:3100/Fetch-Current-Location`, {
        lat: location?.coords?.latitude,
        lng: location?.coords?.longitude,
      });
      setAddress(data.data.address);
      setLocationLoading(false);
    } catch (error) {
      console.error("Error fetching location:", error.response.data.message);
      setLocationLoading(false);
    }
  };

  const handleLogout = async () => {
    try {

    await axios.get("http://192.168.1.12:3100/api/v1/rider/logout", { withCredentials: true });


      await tokenCache.deleteToken("auth_token_db");
    

      setIsAuthenticated(false);


      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      });


      setTimeout(() => {
        BackHandler.exitApp();
      }, 1000);

    } catch (error) {
      console.error("Error during logout:", error);
      navigation.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      });
      Alert.alert("Logout Failed", "Something went wrong. Please try again.");
    }
  };


  const handleLogin = () => {
    navigation.navigate("Login");
    hideSidebar();
  };

  const checkAuthStatus = async () => {
    try {
      const token = await tokenCache.getToken("auth_token_db");
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    }
  };

  const startRainAnimation = () => {
    rainAnimValues.forEach((anim, index) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500 + Math.random() * 2500,
          useNativeDriver: true,
          isInteraction: false,
        })
      ).start();
    });
  };

  const menuItems = [
    { title: "Home", icon: "home-outline", iconType: "Ionicons" },
    { title: "Profile", icon: "person-outline", iconType: "Ionicons" },
    { title: "Parcel", icon: "box", iconType: "Feather" },
    { title: "Orders", icon: "shopping-bag", iconType: "FontAwesome5" },
    { title: "Hotel", icon: "bed", iconType: "FontAwesome5" },
    { title: "Transport", icon: "bus", iconType: "FontAwesome5" },
  ];

  const handleMenuClick = (title) => {
    navigation.navigate(title);
    hideSidebar();
  };

  useEffect(() => {
    findCurrent();
    checkAuthStatus();

    if (settings?.RainModeOn) {
      startRainAnimation();
    }
  }, [location, settings?.RainModeOn]);

  const renderIcon = (item) => {
    if (item.iconType === "Ionicons") {
      return <Ionicons name={item.icon} size={20} color={COLORS.text} />;
    } else if (item.iconType === "FontAwesome5") {
      return <FontAwesome5 name={item.icon} size={20} color={COLORS.text} />;
    }
    return <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.text} />;
  };

  const renderRaindrops = () => {
    if (!settings?.RainModeOn) return null;

    return rainDrops.map((drop, index) => {
      const translateY = rainAnimValues[index].interpolate({
        inputRange: [0, 1],
        outputRange: [0, 300]
      });

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
              transform: [{ translateY }]
            }
          ]}
        />
      );
    });
  };

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.locationContainer}>
          <MaterialCommunityIcons name="map-marker" size={20} color={COLORS.white} />
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Location</Text>
            {locationLoading ? (
              <Text style={styles.locationDetails}>Olyox App</Text>
            ) : (
              <>
                <Text numberOfLines={1} style={styles.locationDetails}>
                  {address?.completeAddress || "Location unavailable"}
                </Text>
                <Text style={styles.locationDetails}>{address?.district || ""}</Text>
              </>
            )}
          </View>
        </View>

        {settings?.RainModeOn && (
          <View style={styles.rainModeContainer}>
            <MaterialCommunityIcons name="weather-pouring" size={24} color={COLORS.white} />
            <Text style={styles.rainModeText}>Some Rain is Happens</Text>
          </View>
        )}

        <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
          <MaterialCommunityIcons name="menu" size={30} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Rain animation overlay */}
      {settings?.RainModeOn && (
        <View style={styles.rainContainer}>
          {renderRaindrops()}
        </View>
      )}

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
            <TouchableOpacity activeOpacity={1} onPress={() => { }}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Olyox</Text>
                <TouchableOpacity onPress={hideSidebar} style={styles.closeButton}>
                  <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.authButtons}>
                {isAuthenticated ? (
                  <TouchableOpacity onPress={handleLogout} style={styles.registerButton}>
                    <Text style={styles.registerButtonText}>Logout</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                      <Text style={styles.loginButtonText}>Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.registerButton}>
                      <Text style={styles.registerButtonText}>Register</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <View style={styles.menuItems}>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.title}
                    style={styles.menuItem}
                    onPress={() => handleMenuClick(item.title)}
                  >
                    {renderIcon(item)}
                    <Text style={styles.menuText}>{item.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Footer />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>

      </Modal>
    </View>
  );
};

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
  rainModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  rainModeText: {
    color: COLORS.white,
    marginLeft: 8,
    fontWeight: "bold",
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
    height: "65%",
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
  rainContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  raindrop: {
    position: 'absolute',
    backgroundColor: '#A4D4FF',
    borderRadius: 10,
  }
});

export default Header;
