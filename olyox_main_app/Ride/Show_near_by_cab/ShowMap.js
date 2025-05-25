import React, { useEffect, useState, useRef } from "react"
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Animated,
  StatusBar,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import Map from "../Map/Map"
import { Video } from 'expo-av'
import axios from "axios"
import { AntDesign, MaterialIcons, Ionicons, FontAwesome, Feather, MaterialCommunityIcons } from "@expo/vector-icons"
import useShowRiders from "../../hooks/Show_Riders"
import useSettings from "../../hooks/Settings"

const { width, height } = Dimensions.get("window")
const API_BASE_URL = "http://192.168.1.11:3100/api/v1"

export default function ShowMap() {
  // Navigation and route
  const route = useRoute()
  const navigation = useNavigation()

  // State management
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedRide, setSelectedRide] = useState(null)
  const [rides, setRides] = useState([])
  const [fareDetails, setFareDetails] = useState([])
  const [error, setError] = useState(null)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [showPromo, setShowPromo] = useState(true)
  const [promoApplied, setPromoApplied] = useState(false)
  const [estimatedTime, setEstimatedTime] = useState("10-15")

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current
  const mapHeightAnimation = useRef(new Animated.Value(height * 0.35)).current

  // Settings and riders
  const { settings } = useSettings()

  // Extract data from route params or use defaults
  const data = route?.params?.data || {}
  const { dropoff, pickup } = data || {}

  const origin = pickup?.latitude && pickup?.longitude
    ? { latitude: pickup.latitude, longitude: pickup.longitude }
    : { latitude: 28.7161663, longitude: 77.1240672 }

  const destination = dropoff?.latitude && dropoff?.longitude
    ? { latitude: dropoff.latitude, longitude: dropoff.longitude }
    : { latitude: 28.70406, longitude: 77.102493 }

  const { riders, loading: riderLoading, error: riderError } = useShowRiders(origin)

  // Toggle map size
  const toggleMapSize = () => {
    Animated.timing(mapHeightAnimation, {
      toValue: mapExpanded ? height * 0.35 : height * 0.6,
      duration: 300,
      useNativeDriver: false,
    }).start()
    setMapExpanded(!mapExpanded)
  }

  // Initial loading simulation
  useEffect(() => {
    setTimeout(() => setLoading(false), 1500)
  }, [])

  // Fetch available ride options
  const fetchRidesVehicle = async () => {
    try {
      setInitialLoading(true)
      const { data } = await axios.get(`${API_BASE_URL}/admin/getAllSuggestions`)
      if (data?.data?.length) {

        const sort = data?.data.filter((item) => item?.status === true)

        setRides(sort)
      } else {
        setRides([])
        setError("No ride options available at the moment")
      }
    } catch (error) {
      console.log(error?.response?.data || error.message)
      setRides([])
      setError("Failed to fetch ride options. Please try again.")
    }
  }

  // Calculate fare for each ride option
  const calculateFares = async () => {
    try {
      if (!origin || !destination || !rides?.length) {
        setError("Missing ride information. Please try again.")
        return
      }

      const fareResponses = []

      for (let index = 0; index < rides.length; index++) {
        const ride = rides[index]

        try {
          const response = await axios.post(
            `${API_BASE_URL}/rider/get-fare-info`,
            {
              origin,
              destination,
              waitingTimeInMinutes: 0,
              ratePerKm: ride?.priceRange,
            },
            { timeout: 10000 },
          )

          if (response.data) {
            // Calculate estimated time based on distance
            const distance = response.data.distanceInKm
            const estimatedMinutes = Math.round(distance * 2) + 5 // Simple estimation

            // Combine ride info with fare details
            fareResponses.push({
              ...ride,
              fareInfo: response.data,
              estimatedTime: `${estimatedMinutes}-${estimatedMinutes + 5} min`,
            })
          }
        } catch (err) {
          console.error(`Error fetching fare for ride ${index + 1}:`, err?.response?.data?.message || err)
        }
      }

      if (fareResponses.length > 0) {
        setFareDetails(fareResponses)
        setError(null)
      } else {
        setError("Unable to calculate fare. Please try again.")
      }
    } catch (err) {
      console.error("General Error getting fare info:", err?.response?.data?.message || err)
      setError("Unable to calculate fare. Please check your internet connection and try again.")
    } finally {
      setInitialLoading(false)
    }
  }

  // Fetch rides and calculate fares
  useEffect(() => {
    fetchRidesVehicle()
  }, [])

  useEffect(() => {
    if (rides.length > 0) {
      calculateFares()
    }
  }, [rides])

  // Apply promo code
  const applyPromo = () => {
    setPromoApplied(true)
    // Show success message
    alert("Promo code applied successfully! Enjoy 10% off your ride.")
  }

  // Handle booking the selected ride
  const handleBookNow = () => {
    if (!selectedRide) {
      alert("Please select a ride option.")
      return
    }

    // Find the fare details for the selected ride
    const rideWithFare = fareDetails.find((item) => item._id === selectedRide._id)

    navigation.navigate("confirm_screen", {
      origin,
      destination,
      selectedRide: rideWithFare,
      dropoff,
      pickup,
      promoApplied,
    })
  }

  // Format price to display in currency format
  const formatPrice = (price) => {
    return `₹${Math.round(price)}`
  }

  // Header component
  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <AntDesign name="arrowleft" size={24} color="#000" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>OLYOX RIDES</Text>
      <TouchableOpacity style={styles.notificationButton}>
        <Ionicons name="notifications-outline" size={22} color="#000" />
      </TouchableOpacity>
    </View>
  )

  // Map controls component
  const MapControls = () => (
    <View style={styles.mapControls}>
      <TouchableOpacity style={styles.mapControlButton} onPress={toggleMapSize}>
        <MaterialIcons name={mapExpanded ? "fullscreen-exit" : "fullscreen"} size={22} color="#000" />
      </TouchableOpacity>

    </View>
  )

  // Reward banner component
  const RewardBanner = () => (
    <TouchableOpacity
      style={styles.rewardBanner}
      onPress={() => setShowPromo(false)}
      activeOpacity={0.8}
    >
      {showPromo ? (
        <>
          <View style={styles.promoLeft}>
            <MaterialCommunityIcons name="ticket-percent-outline" size={20} color="#8B4513" />
            <Text style={styles.rewardText}>Use code FIRST10 for 10% off your first ride</Text>
          </View>
          <TouchableOpacity style={styles.applyButton} onPress={applyPromo}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1618005198919-d3d4b5a23cbb?q=80&w=1000&auto=format&fit=crop",
            }}
            style={styles.coinIcon}
          />
          <Text style={styles.rewardText}>Get up to 8 OlyoxCoin with this booking</Text>
        </>
      )}
    </TouchableOpacity>
  )

  // Location section component
  const LocationSection = () => (
    <View style={styles.locationContainer}>
      <View style={styles.locationItem}>
        <View style={styles.greenDot} />
        <Text style={styles.locationText} numberOfLines={1}>
          {pickup?.description || "Current Location"}
        </Text>
        <View style={styles.timeBox}>
          <MaterialIcons name="access-time" size={12} color="#666" />
          <Text style={styles.timeText}>Now</Text>
        </View>
      </View>
      <View style={styles.locationDivider} />
      <View style={styles.locationItem}>
        <View style={styles.redDot} />
        <Text style={styles.locationText} numberOfLines={1}>
          {dropoff?.description || "Destination"}
        </Text>
        <View style={styles.distanceBox}>
          <MaterialIcons name="directions" size={12} color="#666" />
          <Text style={styles.timeText}>
            {fareDetails.length > 0 ? `${fareDetails[0]?.fareInfo?.distanceInKm.toFixed(1)} km` : "Calculating..."}
          </Text>
        </View>
      </View>
    </View>
  )

  // Ride option component
  const RideOption = ({ ride }) => {
    const isSelected = selectedRide?._id === ride._id
    const fareInfo = ride.fareInfo
    const ridePercentage = parseFloat(settings?.ride_percentage_off) || 0

    // Convert percentage to decimal and add it to total price
    const extraFareAmount = (fareInfo?.totalPrice * ridePercentage / 100).toFixed(2)

    // Add that amount to the totalPrice
    const updatedTotalPrice = (fareInfo?.totalPrice + parseFloat(extraFareAmount)).toFixed(2)

    // Apply promo discount if applicable
    const finalPrice = promoApplied ? fareInfo?.totalPrice * 0.9 : fareInfo?.totalPrice

    // Get vehicle icon based on type
    const getVehicleIcon = () => {
      switch (ride.name.toUpperCase()) {
        case "SUV":
          return "🚙"
        case "SEDAN":
          return "🚗"
        case "PRIME":
          return "🚘"
        case "MINI":
          return "🚐"
        case "AUTO":
          return "🛺"
        case "BIKE":
          return "🏍️"
        default:
          return "🏍️"
      }
    }

    // Animation for selected ride
    const scaleAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
      if (isSelected) {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start()
      }
    }, [isSelected])

    return (
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          style={[styles.rideOption, isSelected && styles.selectedRide]}
          onPress={() => setSelectedRide(ride)}
          activeOpacity={0.7}
        >
          <View style={styles.rideLeft}>
            {ride?.icons_image?.url ? (
              <View style={[styles.rideIconContainer, isSelected && styles.selectedRideIcon]}>
                <Image source={{ uri: ride?.icons_image?.url }} style={styles.vehicleImage} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.rideIconContainer, isSelected && styles.selectedRideIcon]}>
                <Text style={styles.rideIcon}>{getVehicleIcon()}</Text>
              </View>
            )}
            <View style={styles.rideInfo}>
              <Text style={styles.rideName}>{ride.name}</Text>
              <Text style={styles.rideDescription}>{ride.description || `Comfortable ${ride.name} for your journey`}</Text>
              <View style={styles.rideDetailRow}>
                {/* <MaterialIcons name="access-time" size={12} color="#666" /> */}
                {/* <Text style={styles.rideTime}>{ride.estimatedTime || "10-15 min"}</Text> */}

                {fareInfo?.totalPrice && (
                  <>
                    <View style={styles.detailDivider} />
                    <Text style={styles.rideDistance}>{fareInfo.distanceInKm.toFixed(1)} km</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          <View style={styles.rideRight}>
            {fareInfo?.totalPrice ? (
              <View style={styles.priceContainer}>
                {promoApplied && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>10% OFF</Text>
                  </View>
                )}
                <Text style={styles.ridePrice}>{formatPrice(finalPrice)}</Text>
                <Text style={[styles.ridePrice, styles.strikeThrough]}>{formatPrice(updatedTotalPrice)}</Text>
              </View>
            ) : (
              <ActivityIndicator size="small" color="#00BCD4" />
            )}
            <View style={[styles.selectIndicator, isSelected && styles.selectedIndicator]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // Loading screen component
  const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loaderCard}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Finding the best rides for you...</Text>
      </View>
    </View>
  )

  // Error message component
  const ErrorMessage = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="warning-outline" size={40} color="#F44336" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setError(null)
          fetchRidesVehicle()
        }}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header />
        <LoadingScreen />
      </SafeAreaView>
    )
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header />
        <Animated.View style={[styles.mapWrapper, { height: mapHeightAnimation }]}>
          <Map
            isFakeRiderShow={true}
            origin={origin}
            destination={destination}
            useRealDriverIcons={true}
          />
          <MapControls />
        </Animated.View>
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, -20],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.ScrollView
            style={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
          >
            <LocationSection />

            {error ? (
              <ErrorMessage />
            ) : (
              <View style={styles.ridesSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recommended for you</Text>
                  {/* <TouchableOpacity style={styles.filterButton}>
                    <Feather name="sliders" size={16} color="#333" />
                    <Text style={styles.filterText}>Filter</Text>
                  </TouchableOpacity> */}
                </View>

                {initialLoading ? (
                  <View style={styles.loadingRidesContainer}>
                    <ActivityIndicator size="large" color="#00BCD4" />
                    <Text style={styles.loadingRidesText}>Calculating fares...</Text>
                  </View>
                ) : fareDetails.length > 0 ? (
                  fareDetails.map((ride) => <RideOption key={ride._id} ride={ride} />)
                ) : (
                  <View style={styles.noRidesContainer}>
                    <Text style={styles.noRidesText}>No rides available at the moment</Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 100 }} />
          </Animated.ScrollView>
        </Animated.View>

        {/* Sticky bottom bar with high z-index */}
        <View style={styles.bookButtonContainer}>

          <TouchableOpacity
            onPress={handleBookNow}
            style={[styles.bookButton, !selectedRide && styles.disabledButton]}
            activeOpacity={0.8}
            disabled={!selectedRide}
          >
            <Text style={styles.bookButtonText}>
              {selectedRide
                ? `Book ${selectedRide.name} ${selectedRide.fareInfo
                  ? formatPrice(promoApplied ? selectedRide.fareInfo.totalPrice * 0.9 : selectedRide.fareInfo.totalPrice)
                  : ""
                }`
                : "Select a Ride"}
            </Text>
            <AntDesign name="arrowright" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

    </>

  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  mapWrapper: {
    height: height * 0.35,
    backgroundColor: "#f0f0f0",
    position: 'relative',
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mapControlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  contentContainer: {
    flex: 1,
  },
  rewardBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF9E6",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  promoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  coinIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 10,
  },
  rewardText: {
    color: "#8B4513",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  applyButton: {
    backgroundColor: "#8B4513",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  locationContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  locationDivider: {
    height: 20,
    width: 1,
    backgroundColor: "#ddd",
    marginLeft: 5,
  },
  greenDot: {
    width: 10,
    height: 10,
    backgroundColor: "#4CAF50",
    borderRadius: 5,
    marginRight: 12,
  },
  redDot: {
    width: 10,
    height: 10,
    backgroundColor: "#F44336",
    borderRadius: 5,
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  distanceBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#666",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 14,
    marginLeft: 4,
    color: "#333",
  },
  ridesSection: {
    flex: 1,
  },
  rideOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  selectedRide: {
    backgroundColor: "#E0F7FA",
    borderWidth: 2,
    borderColor: "#00BCD4",
  },
  rideLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rideIconContainer: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 22,
    marginRight: 12,
  },
  selectedRideIcon: {
    backgroundColor: "#B2EBF2",
  },
  vehicleImage: {
    width: 30,
    height: 30,
  },
  rideIcon: {
    fontSize: 24,
  },
  rideInfo: {
    flex: 1,
  },
  rideName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  rideDescription: {
    textTransform: 'capitalize',
    color: "#666",
    fontSize: 14,
    marginTop: 2,
  },
  rideDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  rideTime: {
    color: "#666",
    fontSize: 12,
    marginLeft: 4,
  },
  rideDistance: {
    color: "#666",
    fontSize: 12,
  },
  detailDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ccc",
    marginHorizontal: 6,
  },
  rideRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  priceContainer: {
    alignItems: "flex-end",
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: -15,
    right: 0,
    backgroundColor: "#FF5722",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  ridePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
  },
  selectIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedIndicator: {
    borderColor: "#00BCD4",
    backgroundColor: "#00BCD4",
  },
  bookButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  selectedRideBadge: {
    backgroundColor: "#E0F7FA",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    alignSelf: "center",
  },
  selectedRideText: {
    color: "#00838F",
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    height: height,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  loaderCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    width: width * 0.8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  loadingRidesContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingRidesText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  noRidesContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  noRidesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#00BCD4",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
})