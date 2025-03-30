
import { useEffect, useState } from "react"
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
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import Map from "../Map/Map"
import axios from "axios"
import { AntDesign, MaterialIcons, Ionicons } from "@expo/vector-icons"
import useShowRiders from "../../hooks/Show_Riders"

export default function ShowMap() {
  const route = useRoute()
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedRide, setSelectedRide] = useState(null)
  const [rides, setRides] = useState([])
  const [fareDetails, setFareDetails] = useState([])
  const [error, setError] = useState(null)
  const navigation = useNavigation()

  // Extract data from route params or use defaults
  const data = route?.params?.data || {}
  const { dropoff, pickup } = data || {}

  const origin =
    pickup?.latitude && pickup?.longitude
      ? { latitude: pickup.latitude, longitude: pickup.longitude }
      : { latitude: 28.7161663, longitude: 77.1240672 }

  const destination =
    dropoff?.latitude && dropoff?.longitude
      ? { latitude: dropoff.latitude, longitude: dropoff.longitude }
      : { latitude: 28.70406, longitude: 77.102493 }



  const { riders, loading: riderLoading, error: riderError } = useShowRiders(origin);


// console.log("riders",riders)
  // Initial loading simulation
  useEffect(() => {
    setTimeout(() => setLoading(false), 2000)
  }, [])

  // Fetch available ride options
  const fetchRidesVehicle = async () => {
    try {
      setInitialLoading(true)
      const { data } = await axios.get(`https://demoapi.olyox.com/api/v1/admin/getAllSuggestions`)
      if (data?.data?.length) {
        setRides(data.data)
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
            "https://demoapi.olyox.com/api/v1/rider/get-fare-info",
            {
              origin,
              destination,
              waitingTimeInMinutes: 0,
              ratePerKm: ride?.priceRange,
            },
            { timeout: 10000 },
          )

          if (response.data) {
            // Combine ride info with fare details
            fareResponses.push({
              ...ride,
              fareInfo: response.data,
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

  // Reward banner component
  const RewardBanner = () => (
    <View style={styles.rewardBanner}>
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1618005198919-d3d4b5a23cbb?q=80&w=1000&auto=format&fit=crop",
        }}
        style={styles.coinIcon}
      />
      <Text style={styles.rewardText}>Get up to 8 OlyoxCoin with this booking</Text>
    </View>
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
      </View>
    </View>
  )

  // Ride option component
  const RideOption = ({ ride }) => {
    const isSelected = selectedRide?._id === ride._id
    const fareInfo = ride.fareInfo
    const ExtraFareInfo = (ride.fareInfo?.totalPrice * 1.1).toFixed(2)


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
        case "Bike":
          return "🏍️"
        default:
          return "🏍️"
      }
    }

    return (
      <TouchableOpacity
        style={[styles.rideOption, isSelected && styles.selectedRide]}
        onPress={() => setSelectedRide(ride)}
        activeOpacity={0.7}
      >
        <View style={styles.rideLeft}>
          <View style={styles.rideIconContainer}>
            <Text style={styles.rideIcon}>{getVehicleIcon()}</Text>
          </View>
          <View style={styles.rideInfo}>
            <Text style={styles.rideName}>{ride.name}</Text>
            <Text style={styles.rideDescription}>{ride.description}</Text>
            <View style={styles.rideDetailRow}>
              <MaterialIcons name="access-time" size={12} color="#666" />
              <Text style={styles.rideTime}>{ride.time || "10 min"}</Text>

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
          <Text style={styles.fareItemValue}>10% Off</Text>

          {fareInfo?.totalPrice ? (
            <View style={{ flexDirection: 'row', marginHorizontal: 4 }}>
              {/* Display Final Ride Price */}
              <Text style={styles.ridePrice}>{formatPrice(fareInfo?.totalPrice)}</Text>

              {/* Display Original Price with Strike-through (if applicable) */}
              {ExtraFareInfo && (
                <Text style={[styles.ridePrice, styles.strikeThrough]}>
                  {formatPrice(ExtraFareInfo)}
                </Text>
              )}



            </View>

          ) : (
            <ActivityIndicator size="small" color="#00BCD4" />
          )}
          <View style={[styles.selectIndicator, isSelected && styles.selectedIndicator]} />
        </View>

      </TouchableOpacity>
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
        <Header />
        <LoadingScreen />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.mapWrapper}>
        <Map origin={origin} destination={destination} />
      </View>
      <View style={styles.contentWrapper}>
        <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <RewardBanner />
          <LocationSection />

          {error ? (
            <ErrorMessage />
          ) : (
            <View style={styles.ridesSection}>
              <Text style={styles.sectionTitle}>Recommended for you</Text>

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

          {/* Add extra space at bottom for scrolling past the book button */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
      <View style={styles.bookButtonContainer}>
        <TouchableOpacity
          onPress={handleBookNow}
          style={[styles.bookButton, !selectedRide && styles.disabledButton]}
          activeOpacity={0.8}
          disabled={!selectedRide}
        >
          <Text style={styles.bookButtonText}>
            {selectedRide
              ? `Book ${selectedRide.name} ${selectedRide.fareInfo ? formatPrice(selectedRide.fareInfo.totalPrice) : ""}`
              : "Select a Ride"}
          </Text>
          <AntDesign name="arrowright" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const { width, height } = Dimensions.get("window")

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    ...Platform.select({
      ios: {
        paddingTop: 0,
      },
      android: {
        paddingTop: 0,
      },
    }),
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
  },
  contentWrapper: {
    flex: 1,
    // height:height-295,
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
    backgroundColor: "#FFF9E6",
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
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
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    color: "#666",
  },
  ridesSection: {
    flex: 1,
    // paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    padding: 16,
    color: "#333",
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 20,
    marginRight: 12,
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
  ridePrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
    fontSize: 12,
    color: '#444',
  },
  fareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  fareItemText: {
    fontSize: 14,
    color: '#666',
  },
  fareItemValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#d64444', // Red color for discount text
  },
  selectIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#ccc",
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
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

