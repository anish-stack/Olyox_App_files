"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import axios from "axios"
import { MaterialIcons, Ionicons } from "@expo/vector-icons"
import { useSocket } from "../../context/SocketContext"

const { width, height } = Dimensions.get("window")
const GOOGLE_MAPS_API_KEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8"

// Loading steps
const LOADING_STEPS = [
  "Initializing your request...",
  "Searching for nearby drivers...",
  "Calculating optimal routes...",
  "Sending notifications to drivers...",
  "Finalizing your delivery request...",
]

export default function FindRider() {
  const route = useRoute()
  const navigation = useNavigation()
  const { id } = route.params
  const mapRef = useRef(null)

  // Socket
  const { socket } = useSocket()

  // State
  const [parcelDetails, setParcelDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [riderFound, setRiderFound] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)
  const [parcelError, setParcelError] = useState(null)

  // Animations
  const slideAnim = useRef(new Animated.Value(height)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const loadingStepAnim = useRef(new Animated.Value(0)).current

  // Memoized values
  const coordinates = useMemo(() => {
    if (!parcelDetails?.locations) return null
    return {
      pickup: {
        latitude: parcelDetails.locations.pickup.location.coordinates[1],
        longitude: parcelDetails.locations.pickup.location.coordinates[0],
      },
      dropoff: {
        latitude: parcelDetails.locations.dropoff.location.coordinates[1],
        longitude: parcelDetails.locations.dropoff.location.coordinates[0],
      },
    }
  }, [parcelDetails])

  const fetchParcelDetails = async () => {
    try {
      const { data } = await axios.get(`http://192.168.1.12:3100/api/v1/parcel/get-parcel/${id}`)
      setParcelDetails(data?.parcelDetails)

      // Start the loading step animation
      startLoadingStepAnimation()

      // Set a timeout of 2 minutes to stop searching
      setTimeout(() => {
        if (loading && !parcelError) {
          setLoading(false)
          setRiderFound(false)
          animateSlideUp()
        }
      }, 120000) // 2 minutes
    } catch (error) {
      console.error("Error:", error)
      Alert.alert("Error", "Failed to load parcel details")
      navigation.goBack()
    }
  }

  const startLoadingStepAnimation = () => {
    // Reset to first step
    setCurrentLoadingStep(0)

    // Animate through all steps
    const animateNextStep = (step) => {
      if (step >= LOADING_STEPS.length || !loading || parcelError) return

      setTimeout(() => {
        setCurrentLoadingStep(step)
        animateNextStep(step + 1)
      }, 5000) // Change step every 5 seconds
    }

    animateNextStep(0)
  }

  useEffect(() => {
    const socketInstance = socket()

    const handleParcelError = (data) => {
      console.log("Parcel Error:", data)
      setParcelError(data)
      setLoading(false)
      animateSlideUp()
    }

    if (socketInstance) {
      socketInstance.on("parcel_error", handleParcelError)
    }

    return () => {
      if (socketInstance) {
        socketInstance.off("parcel_error", handleParcelError)
      }
    }
  }, [])

  const animateSlideUp = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start()
  }

  useEffect(() => {
    fetchParcelDetails()
  }, [id])

  const handleCancel = () => {
    Alert.alert("Cancel Request", "Are you sure you want to cancel this parcel request?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: async () => {
          try {
            await axios.post(`http://192.168.1.12:3100/api/v1/parcel/cancel-request/${id}`)
            navigation.navigate("Home")
          } catch (error) {
            Alert.alert("Error", "Failed to cancel request")
          }
        },
      },
    ])
  }

  const renderMap = () => (
    <View style={styles.mapContainer}>
      {coordinates && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: coordinates.pickup.latitude,
            longitude: coordinates.pickup.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker coordinate={coordinates.pickup}>
            <View style={styles.markerPickup}>
              <MaterialIcons name="local-shipping" size={18} color="#fff" />
            </View>
          </Marker>

          <Marker coordinate={coordinates.dropoff}>
            <View style={styles.markerDropoff}>
              <Ionicons name="location" size={18} color="#fff" />
            </View>
          </Marker>

          <MapViewDirections
            origin={coordinates.pickup}
            destination={coordinates.dropoff}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={3}
            strokeColor="#FF5722"
          />
        </MapView>
      )}
    </View>
  )

  const renderLoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingStepsContainer}>
        {LOADING_STEPS.map((step, index) => (
          <View key={index} style={[styles.loadingStep, index === currentLoadingStep && styles.activeLoadingStep]}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepText, index === currentLoadingStep && styles.activeStepText]}>{step}</Text>
          </View>
        ))}
      </View>
      <ActivityIndicator size="large" color="#FF5722" style={styles.loadingIndicator} />
      <Text style={styles.loadingText}>{LOADING_STEPS[currentLoadingStep]}</Text>
    </View>
  )

  const renderNoRiderFound = () => (
    <View style={styles.noRiderContainer}>
      {parcelError ? (
        <>
          <MaterialIcons name="error-outline" size={48} color="#FF5722" />
          <Text style={styles.errorTitle}>Driver Search Failed</Text>
          <Text style={styles.errorText}>
            {parcelError.message ||
              "Sorry, we couldn't find any available drivers at the moment. Please try again later."}
          </Text>
          <View style={styles.errorDetailsContainer}>
            <Text style={styles.errorDetailsTitle}>Error Details:</Text>
            <Text style={styles.errorDetailsText}>Parcel ID: {parcelError.parcel || id}</Text>
            <Text style={styles.errorDetailsText}>Time: {new Date().toLocaleTimeString()}</Text>
          </View>
        </>
      ) : (
        <>
          <MaterialIcons name="search-off" size={48} color="#666" />
          <Text style={styles.noRiderTitle}>No Riders Found</Text>
          <Text style={styles.noRiderText}>
            We'll notify you as soon as a rider accepts your request. Thank you for your patience.
          </Text>
        </>
      )}
    </View>
  )

  const renderParcelDetails = () => {
    if (!parcelDetails) return null

    return (
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Delivery Details</Text>

        <View style={styles.locationContainer}>
          <View style={styles.locationIconContainer}>
            <View style={styles.pickupDot} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.address}>{parcelDetails.locations.pickup.address}</Text>
          </View>
        </View>

        <View style={styles.locationDivider} />

        <View style={styles.locationContainer}>
          <View style={styles.locationIconContainer}>
            <View style={styles.dropoffDot} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.address}>{parcelDetails.locations.dropoff.address}</Text>
          </View>
        </View>

        <View style={styles.fareContainer}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Base Fare</Text>
            <Text style={styles.fareValue}>₹{parcelDetails.fares.baseFare}</Text>
          </View>

          {parcelDetails.fares.couponApplied && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Discount</Text>
              <Text style={styles.discountValue}>₹{parcelDetails.fares.discount}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{parcelDetails.fares.payableAmount}</Text>
          </View>
        </View>

        <View style={styles.customerInfoContainer}>
          <Text style={styles.customerInfoTitle}>Customer</Text>
          <Text style={styles.customerName}>{parcelDetails.customerId.name}</Text>
          <Text style={styles.customerPhone}>{parcelDetails.customerId.number}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {renderMap()}

      {loading && renderLoadingOverlay()}

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.bottomSheetHandle} />

        <ScrollView style={styles.detailsScroll}>
          {!riderFound && renderNoRiderFound()}
          {renderParcelDetails()}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.buttonText}>Cancel Request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                Linking.openURL("tel:+1234567890")
                setModalVisible(false)
              }}
            >
              <Text style={styles.modalOptionText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalOption, styles.cancelOption]} onPress={handleCancel}>
              <Text style={[styles.modalOptionText, styles.cancelText]}>Cancel Request</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    height: "60%",
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingStepsContainer: {
    width: "100%",
    marginBottom: 30,
  },
  loadingStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    opacity: 0.5,
  },
  activeLoadingStep: {
    opacity: 1,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  activeStepCircle: {
    backgroundColor: "#FF5722",
  },
  stepNumber: {
    color: "#333",
    fontWeight: "bold",
  },
  stepText: {
    fontSize: 14,
    color: "#666",
  },
  activeStepText: {
    color: "#333",
    fontWeight: "600",
  },
  loadingIndicator: {
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "45%",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#ddd",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 10,
  },
  detailsScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noRiderContainer: {
    alignItems: "center",
    padding: 20,
  },
  noRiderTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginVertical: 10,
    color: "#333",
  },
  noRiderText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    lineHeight: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginVertical: 10,
    color: "#FF5722",
  },
  errorText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 15,
  },
  errorDetailsContainer: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginTop: 10,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 5,
    color: "#333",
  },
  errorDetailsText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 3,
  },
  detailsCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  locationContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  locationIconContainer: {
    width: 24,
    alignItems: "center",
    marginRight: 10,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF5722",
  },
  locationDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#ddd",
    marginLeft: 17,
    marginBottom: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  address: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  fareContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fareLabel: {
    fontSize: 14,
    color: "#666",
  },
  fareValue: {
    fontSize: 14,
    color: "#333",
  },
  discountValue: {
    fontSize: 14,
    color: "#4CAF50",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF5722",
  },
  customerInfoContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  customerInfoTitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 5,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 3,
  },
  customerPhone: {
    fontSize: 14,
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#FF5722",
    padding: 15,
    borderRadius: 12,
    marginRight: 10,
  },
  homeButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  markerPickup: {
    backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerDropoff: {
    backgroundColor: "#FF5722",
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  cancelOption: {
    borderBottomWidth: 0,
  },
  cancelText: {
    color: "#FF5722",
  },
  modalClose: {
    marginTop: 15,
    paddingVertical: 15,
  },
  modalCloseText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
})
