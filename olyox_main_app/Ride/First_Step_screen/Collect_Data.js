
import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Dimensions,
  Alert,
  Platform,
  Keyboard,
  TextInput,
  StyleSheet,
  StatusBar,
  Animated,
  Vibration,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import axios from "axios"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import * as Location from "expo-location"
import { useNavigation } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { find_me } from "../../utils/helpers"
import { tokenCache } from "../../Auth/cache"

const GOOGLE_MAPS_APIKEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8"
const { width, height } = Dimensions.get("window")
const ASPECT_RATIO = width / height
const LATITUDE_DELTA = 0.0922
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

// India region boundaries
const INDIA_REGION = {
  minLat: 6.7559, // Southern tip
  maxLat: 35.6745, // Northern tip
  minLng: 68.1629, // Western edge
  maxLng: 97.3953, // Eastern edge
  center: {
    latitude: 22.9734,
    longitude: 78.6569,
  },
}

// Custom map style to emphasize roads
const mapStyle = [
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [
      {
        color: "#ffffff",
      },
    ],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [
      {
        color: "#000000",
      },
    ],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [
      {
        color: "#fdfcf8",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [
      {
        color: "#f8c967",
      },
    ],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [
      {
        color: "#e9bc62",
      },
    ],
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [
      {
        color: "#b9d3e6",
      },
    ],
  },
]

const CollectData = () => {
  const mapRef = useRef(null)
  const pickupInputRef = useRef(null)
  const dropoffInputRef = useRef(null)
  const debounceTimer = useRef(null)
  const scrollViewRef = useRef(null)
  const loadingAnimation = useRef(new Animated.Value(0)).current
  const navigation = useNavigation()

  const [state, setState] = useState({
    pickup: "",
    dropoff: "",
    suggestions: [],
    loading: false,
    error: "",
    activeInput: null,
    showMap: false,
    mapType: null,
    isFetchingLocation: false,
    locationPermissionGranted: false,
    inputHeight: 70,
  })

  const [pastRides, setPastRides] = useState([])
  const [pastRideSuggestions, setPastRideSuggestions] = useState({
    pickup: [],
    dropoff: [],
  })

  const [rideData, setRideData] = useState({
    pickup: { latitude: 0, longitude: 0, description: "" },
    dropoff: { latitude: 0, longitude: 0, description: "" },
  })

  const [region, setRegion] = useState({
    latitude: INDIA_REGION.center.latitude,
    longitude: INDIA_REGION.center.longitude,
    latitudeDelta: 20,
    longitudeDelta: 20,
  })

  // Start loading animation
  useEffect(() => {
    if (state.isFetchingLocation || state.loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(loadingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start()
    } else {
      loadingAnimation.setValue(0)
    }
  }, [state.isFetchingLocation, state.loading])

  useEffect(() => {
    checkLocationPermission()
    fetchPastRides()

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // Process past rides to extract unique locations
  useEffect(() => {
    if (pastRides.length > 0) {
      // Extract unique pickup locations
      const uniquePickups = [
        ...new Map(
          pastRides.map((ride) => [
            ride.pickup_desc,
            {
              description: ride.pickup_desc,
              coordinates: ride.pickupLocation?.coordinates || [],
            },
          ]),
        ).values(),
      ].filter((item) => item.description && item.coordinates.length === 2)

      // Extract unique dropoff locations
      const uniqueDropoffs = [
        ...new Map(
          pastRides.map((ride) => [
            ride.drop_desc,
            {
              description: ride.drop_desc,
              coordinates: ride.dropLocation?.coordinates || [],
            },
          ]),
        ).values(),
      ].filter((item) => item.description && item.coordinates.length === 2)

      // Limit to 3 suggestions each
      setPastRideSuggestions({
        pickup: uniquePickups.slice(0, 3),
        dropoff: uniqueDropoffs.slice(0, 3),
      })
    }
  }, [pastRides])

  const checkLocationPermission = async () => {
    try {
      setState((prev) => ({ ...prev, isFetchingLocation: true }))
      const { status } = await Location.requestForegroundPermissionsAsync()
      setState((prev) => ({
        ...prev,
        locationPermissionGranted: status === "granted",
        isFetchingLocation: status !== "granted",
      }))

      if (status === "granted") {
        await getCachedOrCurrentLocation()
      } else {
        setState((prev) => ({
          ...prev,
          error: "Location permission denied. Some features may be limited.",
          isFetchingLocation: false,
        }))
      }
    } catch (error) {
      console.error("Permission error:", error)
      setState((prev) => ({
        ...prev,
        error: "Failed to request location permission",
        isFetchingLocation: false,
      }))
    }
  }

  const getCachedOrCurrentLocation = async () => {
    try {
      const cachedLocation = await AsyncStorage.getItem("lastKnownLocation")
      if (cachedLocation) {
        const { location, timestamp } = JSON.parse(cachedLocation)
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          updateLocationData(location)
          return
        }
      }
      await fetchCurrentLocation()
    } catch (error) {
      console.error("Location cache error:", error)
      await fetchCurrentLocation()
    }
  }

  const fetchCurrentLocation = async () => {
    setState((prev) => ({ ...prev, isFetchingLocation: true, error: "" }))
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Use high accuracy
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update every 10 meters
      })

      await AsyncStorage.setItem(
        "lastKnownLocation",
        JSON.stringify({
          location,
          timestamp: Date.now(),
        }),
      )

      await updateLocationData(location)
    } catch (error) {
      console.error("Location error:", error)
      setState((prev) => ({
        ...prev,
        error: "Location unavailable. Please enter manually.",
        isFetchingLocation: false,
      }))

      // Show alert with recovery options
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please check your device settings or enter location manually.",
        [
          { text: "Enter Manually", style: "default" },
          {
            text: "Try Again",
            onPress: () => fetchCurrentLocation(),
            style: "cancel",
          },
        ],
      )
    }
  }

  const updateLocationData = async (location) => {
    try {
      const response = await axios.post("https://api.srtutorsbureau.com/Fetch-Current-Location", {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      })

      const address = response?.data?.data?.address?.completeAddress

      // Ensure coordinates are within India
      const latitude = Math.min(Math.max(location.coords.latitude, INDIA_REGION.minLat), INDIA_REGION.maxLat)
      const longitude = Math.min(Math.max(location.coords.longitude, INDIA_REGION.minLng), INDIA_REGION.maxLng)

      setRegion({
        latitude,
        longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      })

      setState((prev) => ({
        ...prev,
        pickup: address,
        isFetchingLocation: false,
      }))

      setRideData((prev) => ({
        ...prev,
        pickup: {
          latitude,
          longitude,
          description: address,
        },
      }))

      // Vibrate to indicate location found
      if (Platform.OS === "android") {
        Vibration.vibrate(50)
      }
    } catch (error) {
      console.error("Address fetch error:", error)
      setState((prev) => ({
        ...prev,
        isFetchingLocation: false,
        error: "Failed to get address. Please enter manually.",
      }))
    }
  }

  const handleMapRegionChange = async (newRegion) => {
    // Constrain to India's boundaries
    const constrainedRegion = {
      ...newRegion,
      latitude: Math.min(Math.max(newRegion.latitude, INDIA_REGION.minLat), INDIA_REGION.maxLat),
      longitude: Math.min(Math.max(newRegion.longitude, INDIA_REGION.minLng), INDIA_REGION.maxLng),
    }

    setRegion(constrainedRegion)
    const { latitude, longitude } = constrainedRegion

    try {
      setState((prev) => ({ ...prev, loading: true }))
      const response = await axios.post("https://api.srtutorsbureau.com/Fetch-Current-Location", {
        lat: latitude,
        lng: longitude,
      })

      const address = response?.data?.data?.address?.completeAddress

      if (state.mapType === "pickup") {
        setState((prev) => ({ ...prev, pickup: address, loading: false }))
        setRideData((prev) => ({
          ...prev,
          pickup: { latitude, longitude, description: address },
        }))
      } else {
        setState((prev) => ({ ...prev, dropoff: address, loading: false }))
        setRideData((prev) => ({
          ...prev,
          dropoff: { latitude, longitude, description: address },
        }))
      }
    } catch (error) {
      console.error("Region change error:", error)
      setState((prev) => ({ ...prev, loading: false }))
    }
  }

  const fetchPastRides = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }))
      const user = await find_me()

      const gmail_token = await tokenCache.getToken("auth_token")
      const db_token = await tokenCache.getToken("auth_token_db")
      const token = db_token || gmail_token

      const response = await axios.get("https://demoapi.olyox.com/api/v1/user/find-Orders-details", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.data?.data?.RideData) {
        setPastRides(response.data.data.RideData)
      }
    } catch (error) {
      console.error("Error fetching past rides:", error)
    } finally {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }

  const fetchSuggestions = (input, type) => {
    if (!input || input.length < 2) {
      setState((prev) => ({ ...prev, suggestions: [] }))
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    setState((prev) => ({ ...prev, loading: true }))

    debounceTimer.current = setTimeout(async () => {
      try {
        const { data } = await axios.get("https://api.srtutorsbureau.com/autocomplete", {
          params: { input },
        })
        setState((prev) => ({
          ...prev,
          suggestions: data || [],
          loading: false,
          activeInput: type,
        }))
      } catch (error) {
        console.error("Suggestion error:", error)
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to fetch suggestions",
        }))
      }
    }, 300)
  }

  const handleLocationSelect = async (location, coordinates = null) => {
    try {
      setState((prev) => ({ ...prev, loading: true }))

      let latitude, longitude

      // If coordinates are provided (from past rides), use them directly
      if (coordinates && coordinates.length === 2) {
        ;[longitude, latitude] = coordinates
      } else {
        // Otherwise, geocode the address
        const endpoint = `https://api.srtutorsbureau.com/geocode?address=${encodeURIComponent(location)}`
        const response = await axios.get(endpoint)
        latitude = response.data.latitude
        longitude = response.data.longitude
      }

      if (state.activeInput === "pickup") {
        setState((prev) => ({ ...prev, pickup: location, suggestions: [], loading: false }))
        setRideData((prev) => ({
          ...prev,
          pickup: {
            latitude,
            longitude,
            description: location,
          },
        }))

        // If dropoff is already set, adjust map to show both
        if (rideData.dropoff.latitude) {
          fitMapToMarkers()
        } else {
          // Otherwise focus on the selected location
          mapRef.current?.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            },
            1000,
          )
        }
      } else {
        setState((prev) => ({ ...prev, dropoff: location, suggestions: [], loading: false }))
        setRideData((prev) => ({
          ...prev,
          dropoff: {
            latitude,
            longitude,
            description: location,
          },
        }))

        // If pickup is already set, adjust map to show both
        if (rideData.pickup.latitude) {
          fitMapToMarkers()
        } else {
          // Otherwise focus on the selected location
          mapRef.current?.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: LATITUDE_DELTA,
              longitudeDelta: LONGITUDE_DELTA,
            },
            1000,
          )
        }
      }
    } catch (error) {
      console.error("Location select error:", error)
      setState((prev) => ({ ...prev, loading: false }))
      Alert.alert("Error", "Failed to get location coordinates")
    }

    setState((prev) => ({ ...prev, activeInput: null }))
    Keyboard.dismiss()
  }

  const fitMapToMarkers = () => {
    if (!mapRef.current || !rideData.pickup.latitude || !rideData.dropoff.latitude) return

    mapRef.current.fitToCoordinates(
      [
        {
          latitude: rideData.pickup.latitude,
          longitude: rideData.pickup.longitude,
        },
        {
          latitude: rideData.dropoff.latitude,
          longitude: rideData.dropoff.longitude,
        },
      ],
      {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      },
    )
  }

  const handleSubmit = () => {
    if (!rideData.pickup.latitude || !rideData.dropoff.latitude) {
      Alert.alert("Error", "Please select both pickup and drop-off locations")
      return
    }

    // Vibrate to indicate submission
    if (Platform.OS === "android") {
      Vibration.vibrate(100)
    }

    navigation.navigate("second_step_of_booking", { data: rideData })
  }

  const renderMapView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.mapHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => setState((prev) => ({ ...prev, showMap: false }))}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.mapHeaderTitle}>Select {state.mapType === "pickup" ? "Pickup" : "Drop-off"} Location</Text>
      </View>

      <View style={styles.mapContainer}>
        {state.loading && (
          <View style={styles.mapLoadingContainer}>
            <ActivityIndicator size="small" color={state.mapType === "pickup" ? "#35C14F" : "#D93A2D"} />
            <Text style={styles.mapLoadingText}>Getting address...</Text>
          </View>
        )}

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          customMapStyle={mapStyle}
          onRegionChangeComplete={handleMapRegionChange}
          showsUserLocation
          showsMyLocationButton
          showsCompass
          minZoomLevel={5} // Prevent zooming out too far
          maxZoomLevel={18} // Prevent zooming in too far
        >
          <Marker
            coordinate={{
              latitude: region.latitude,
              longitude: region.longitude,
            }}
            pinColor={state.mapType === "pickup" ? "green" : "red"}
            opacity={0} // Hide the default marker as we're using a custom one
          />
        </MapView>

        {/* Custom centered marker */}
        <View style={styles.centerMarker}>
          <View style={styles.markerShadow} />
          <Icon name="map-marker" size={40} color={state.mapType === "pickup" ? "#35C14F" : "#D93A2D"} />
        </View>
      </View>

      <View style={styles.mapFooter}>
        <Text numberOfLines={2} style={styles.mapAddressText}>
          {state.mapType === "pickup" ? state.pickup : state.dropoff || "Move map to select location"}
        </Text>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: state.mapType === "pickup" ? "#35C14F" : "#D93A2D" }]}
          onPress={() => setState((prev) => ({ ...prev, showMap: false }))}
        >
          <Text style={styles.confirmButtonText}>Confirm Location</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  // Render past ride suggestions
  const renderPastRideSuggestions = () => {
    const suggestions = state.activeInput === "pickup" ? pastRideSuggestions.pickup : pastRideSuggestions.dropoff

    if (!suggestions || suggestions.length === 0) return null

    return (
      <View style={styles.pastRidesContainer}>
        <Text style={styles.pastRidesTitle}>
          {state.activeInput === "pickup" ? "🔄 Recent pickup locations" : "🔄 Recent drop-off locations"}
        </Text>

        {suggestions.map((item, index) => (
          <Pressable
            key={index}
            style={styles.pastRideItem}
            onPress={() => handleLocationSelect(item.description, item.coordinates)}
            android_ripple={{ color: "#f0f0f0" }}
          >
            <Icon name="history" size={20} color={state.activeInput === "pickup" ? "#35C14F" : "#D93A2D"} />
            <Text numberOfLines={1} style={styles.pastRideText}>
              {item.description}
            </Text>
          </Pressable>
        ))}
      </View>
    )
  }

  if (state.showMap) return renderMapView()

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Where to?</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        <View style={styles.inputsContainer}>
          {/* Pickup Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <Icon name="circle" size={12} color="#35C14F" />
            </View>

            <TextInput
              ref={pickupInputRef}
              style={styles.input}
              placeholder="Enter pickup location"
              placeholderTextColor="#999"
              value={state.pickup}
              onChangeText={(text) => {
                setState((prev) => ({ ...prev, pickup: text }))
                fetchSuggestions(text, "pickup")
              }}
              onFocus={() => {
                setState((prev) => ({ ...prev, activeInput: "pickup" }))
                if (pastRideSuggestions.pickup.length > 0 && !state.pickup) {
                  setState((prev) => ({ ...prev, suggestions: [] }))
                }
              }}
              multiline
            />

            {state.isFetchingLocation && state.activeInput === "pickup" ? (
              <Animated.View
                style={{
                  opacity: loadingAnimation,
                  transform: [
                    {
                      scale: loadingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                }}
              >
                <ActivityIndicator size="small" color="#35C14F" />
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  setState((prev) => ({
                    ...prev,
                    showMap: true,
                    mapType: "pickup",
                  }))
                }}
              >
                <Icon name="map-marker" size={24} color="#35C14F" />
              </TouchableOpacity>
            )}
          </View>

          {/* Dropoff Input */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <Icon name="square" size={12} color="#D93A2D" />
            </View>

            <TextInput
              ref={dropoffInputRef}
              style={styles.input}
              placeholder="Enter drop-off location"
              placeholderTextColor="#999"
              value={state.dropoff}
              onChangeText={(text) => {
                setState((prev) => ({ ...prev, dropoff: text }))
                fetchSuggestions(text, "dropoff")
              }}
              onFocus={() => {
                setState((prev) => ({ ...prev, activeInput: "dropoff" }))
                if (pastRideSuggestions.dropoff.length > 0 && !state.dropoff) {
                  setState((prev) => ({ ...prev, suggestions: [] }))
                }
              }}
              multiline
            />

            {state.loading && state.activeInput === "dropoff" ? (
              <Animated.View
                style={{
                  opacity: loadingAnimation,
                  transform: [
                    {
                      scale: loadingAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                }}
              >
                <ActivityIndicator size="small" color="#D93A2D" />
              </Animated.View>
            ) : (
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => {
                  setState((prev) => ({
                    ...prev,
                    showMap: true,
                    mapType: "dropoff",
                  }))
                }}
              >
                <Icon name="map-marker" size={24} color="#D93A2D" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Error message */}
        {state.error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={18} color="#D93A2D" />
            <Text style={styles.errorText}>{state.error}</Text>
          </View>
        ) : null}

        {/* Loading indicator for suggestions */}
        {state.loading && !state.suggestions.length && (
          <View style={styles.smallLoaderContainer}>
            <ActivityIndicator size="small" color={state.activeInput === "pickup" ? "#35C14F" : "#D93A2D"} />
            <Text style={styles.smallLoaderText}>Finding locations...</Text>
          </View>
        )}

        {/* Past ride suggestions */}
        {state.activeInput && !state.suggestions.length && renderPastRideSuggestions()}

        {/* Location suggestions */}
        {state.suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {state.suggestions.map((suggestion, index) => (
              <Pressable
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleLocationSelect(suggestion.description)}
                android_ripple={{ color: "#f0f0f0" }}
              >
                <Icon name="map-marker" size={20} color={state.activeInput === "pickup" ? "#35C14F" : "#D93A2D"} />
                <Text numberOfLines={2} style={styles.suggestionText}>
                  {suggestion.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Map preview when both locations are set */}
        {rideData.pickup.latitude && rideData.dropoff.latitude && !state.suggestions.length && !state.activeInput && (
          <View style={styles.previewMapContainer}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.previewMap}
              initialRegion={region}
              customMapStyle={mapStyle}
              showsUserLocation
              showsCompass={true}
              showsMyLocationButton={true}
              minZoomLevel={5}
              maxZoomLevel={18}
              onLayout={fitMapToMarkers}
            >
              {/* Pickup marker */}
              <Marker
                coordinate={{
                  latitude: rideData.pickup.latitude,
                  longitude: rideData.pickup.longitude,
                }}
                title="Pickup"
                description={rideData.pickup.description}
              >
                <View style={styles.customMarker}>
                  <Icon name="circle" size={12} color="#35C14F" />
                </View>
              </Marker>

              {/* Dropoff marker */}
              <Marker
                coordinate={{
                  latitude: rideData.dropoff.latitude,
                  longitude: rideData.dropoff.longitude,
                }}
                title="Drop-off"
                description={rideData.dropoff.description}
              >
                <View style={styles.customMarker}>
                  <Icon name="square" size={12} color="#D93A2D" />
                </View>
              </Marker>

              {/* Route line */}
              <MapViewDirections
                origin={{
                  latitude: rideData.pickup.latitude,
                  longitude: rideData.pickup.longitude,
                }}
                destination={{
                  latitude: rideData.dropoff.latitude,
                  longitude: rideData.dropoff.longitude,
                }}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={4}
                strokeColor="#000000"
                lineDashPattern={[0]}
                mode="DRIVING"
                onReady={(result) => {
                  // Store distance and duration if needed
                  console.log(`Distance: ${result.distance} km`)
                  console.log(`Duration: ${result.duration} min`)
                }}
              />
            </MapView>

            <View style={styles.mapOverlayInfo}>
              <View style={styles.mapInfoItem}>
                <Icon name="circle" size={10} color="#35C14F" />
                <Text numberOfLines={1} style={styles.mapInfoText}>
                  {rideData.pickup.description}
                </Text>
              </View>
              <View style={styles.mapInfoDivider} />
              <View style={styles.mapInfoItem}>
                <Icon name="square" size={10} color="#D93A2D" />
                <Text numberOfLines={1} style={styles.mapInfoText}>
                  {rideData.dropoff.description}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Find Riders button */}
      {rideData.pickup.latitude && rideData.dropoff.latitude && !state.suggestions.length && (
        <View style={styles.findRiderButtonContainer}>
          <TouchableOpacity style={styles.findRiderButton} onPress={handleSubmit} activeOpacity={0.8}>
            <Icon name="car" size={24} color="white" />
            <Text style={styles.findRiderButtonText}>Find Riders</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Space for the sticky button
  },
  inputsContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 12,
  },
  inputIconContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    paddingVertical: 8,
    minHeight: 40,
  },
  mapButton: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEEEE",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  errorText: {
    color: "#D93A2D",
    marginLeft: 8,
    fontSize: 14,
  },
  smallLoaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 8,
  },
  smallLoaderText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666666",
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#333333",
  },
  pastRidesContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
  },
  pastRidesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666666",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  pastRideItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
  },
  pastRideText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#333333",
  },
  previewMapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlayInfo: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    padding: 12,
  },
  mapInfoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapInfoText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#333333",
  },
  mapInfoDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 8,
  },
  findRiderButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  findRiderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#951235",
    borderRadius: 12,
    paddingVertical: 16,
  },
  findRiderButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000000",
  },
  centerMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
    alignItems: "center",
  },
  markerShadow: {
    position: "absolute",
    bottom: 0,
    width: 16,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  mapFooter: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  mapAddressText: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  mapLoadingContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    padding: 8,
    zIndex: 1,
  },
  mapLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666666",
  },
  customMarker: {
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
})

export default CollectData
