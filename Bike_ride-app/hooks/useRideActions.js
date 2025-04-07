
import { useCallback, useEffect } from "react"
import { Alert, Linking, Platform } from "react-native"
import * as IntentLauncher from "expo-intent-launcher"
import axios from "axios"
import { Audio } from "expo-av"
import { LocalRideStorage } from "../services/DatabaseService"

const API_BASE_URL = "https://demoapi.olyox.com/api/v1"

let otpDbCode
export function useRideActions({ state, setState, rideDetails, socket, navigation, mapRef, soundRef }) {
  // Helper function to update state

  useEffect(()=>{
    const fns = async()=>{
      const otpDb = await LocalRideStorage.getRide()
      console.log("otpDb",otpDb?.RideOtp)
      otpDbCode = otpDb?.RideOtp
    }
    fns()
  },[])
  const updateState = (newState) => {
    setState((prevState) => ({ ...prevState, ...newState }))
  }

  // Logging helpers
  const logDebug = (message, data = null) => {
    if (__DEV__) {
      if (data) {
        console.log(`✔️ ${message}`, data)
      } else {
        console.log(`✔️ ${message}`)
      }
    }
  }

  const logError = (message, error = null) => {
    if (error) {
      console.error(`❌ ${message}`, error)
    } else {
      console.error(`❌ ${message}`)
    }
  }

  // Start notification sound
  const startSound = useCallback(async () => {
    logDebug("Starting notification sound")
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync()
      }

      const { sound } = await Audio.Sound.createAsync(require("../components/cancel.mp3"), {
        shouldPlay: true,
        isLooping: true,
      })

      soundRef.current = sound
      updateState({ sound })

      setTimeout(() => {
        Alert.alert("Ride Cancelled", "The ride has been cancelled by the customer.", [
          {
            text: "OK",
            onPress: () => {
              stopSound()
              navigation.goBack()
            },
          },
        ])
      }, 100)

      logDebug("Sound started successfully")
    } catch (error) {
      logError("Error playing sound", error)
    }
  }, [])

  // Stop sound
  const stopSound = useCallback(async () => {
    if (soundRef.current) {
      logDebug("Stopping sound")
      try {
        await soundRef.current.stopAsync()
        soundRef.current = null
        logDebug("Sound stopped successfully")
      } catch (error) {
        logError("Error stopping sound", error)
      }
    }
  }, [])

  // Reset navigation to home
  const resetToHome = useCallback(() => {
    logDebug("Resetting navigation to Home")
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    })
  }, [navigation])

  // Fetch cancel reasons
  const fetchCancelReasons = useCallback(async () => {
    logDebug("Fetching cancel reasons")
    try {
      const { data } = await axios.get(`${API_BASE_URL}/admin/cancel-reasons?active=active`)

      if (data.data) {
        logDebug("Cancel reasons fetched successfully", data.data)
        updateState({ cancelReasons: data.data })
      } else {
        logDebug("No cancel reasons found")
        updateState({ cancelReasons: [] })
      }
    } catch (error) {
      logError("Error fetching cancel reasons", error)
      updateState({ cancelReasons: [] })
    }
  }, [])

  // Handle OTP submission
  const handleOtpSubmit = useCallback(() => {
   
    const expectedOtp = rideDetails?.RideOtp !== undefined && rideDetails?.RideOtp !== null ? rideDetails.RideOtp : otpDbCode

    logDebug("Submitting OTP", { entered: state.otp, expected: expectedOtp })

    if (state.otp === expectedOtp) {
      logDebug("OTP verified successfully")
      const newState = {
        showOtpModal: false,
        rideStarted: true,
        showDirectionsType: "pickup_to_drop",
      }

      updateState(newState)

      // Save ride state to AsyncStorage
      LocalRideStorage.saveRideState({
        otp: state.otp,
        rideStarted: true,
        rideCompleted: false,
      })
      // Emit ride started event
      if (socket && socket.connected) {
        logDebug("Emitting ride_started event", rideDetails)
        socket.emit("ride_started", rideDetails)
        setTimeout(() => {
          openGoogleMapsDirections()

        }, 2000)
      }

      // Fit map to show pickup and drop locations
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current.fitToCoordinates(
            [
              {
                latitude: rideDetails.pickupLocation.coordinates[1],
                longitude: rideDetails.pickupLocation.coordinates[0],
              },
              {
                latitude: rideDetails.dropLocation.coordinates[1],
                longitude: rideDetails.dropLocation.coordinates[0],
              },
            ],
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            },
          )
        }, 1000)
      }

      // Show local notification
      Alert.alert("Ride Started", "You have started the ride. Drive safely!")
    } else {
      logError("Incorrect OTP entered")
      Alert.alert("Incorrect OTP", "Please try again with the correct OTP.")
    }
  }, [state.otp, rideDetails, socket, mapRef])

  // Handle cancel ride
  const handleCancelRide = useCallback(async () => {
    logDebug("Cancelling ride", { reason: state.selectedReason })

    try {
      if (!state.selectedReason) {
        Alert.alert("Cancel Ride", "Please select a reason to cancel.")
        return
      }

      const data = {
        cancelBy: "driver",
        rideData: rideDetails,
        reason: state.selectedReason,
      }

      if (!socket || !socket.connected) {
        logError("Socket not connected for ride cancellation")
        Alert.alert("Error", "Unable to cancel ride due to connection issues.")
        return
      }

      logDebug("Emitting ride-cancel-by-user event", data)
      socket.emit("ride-cancel-by-user", data, (response) => {
        logDebug("Ride cancel response received", response)
      })

      Alert.alert("Cancel", "Your pickup has been canceled. Thank you for your time.", [
        { text: "OK", onPress: () => resetToHome() },
      ])

      updateState({ showCancelModal: false })
      await LocalRideStorage.clearRide()
    } catch (error) {
      logError("Error in handleCancelRide", error)
      Alert.alert("Error", "Something went wrong while canceling the ride.")
    }
  }, [state.selectedReason, rideDetails, socket, resetToHome])

  // Complete ride
  const handleCompleteRide = useCallback(async () => {
    if (!rideDetails) {
      logError("Ride details not found for completion")
      Alert.alert("Error", "Ride details not found")
      return
    }

    Alert.alert("Complete Ride", "Are you sure you want to complete this ride?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          if (socket && socket.connected) {
            logDebug("Emitting endRide event", { rideDetails })
            socket.emit("endRide", {
              rideDetails: rideDetails,
            })

            // Update and save ride state
            updateState({ rideCompleted: true })
            LocalRideStorage.saveRideState({
              otp: state.otp,
              rideStarted: true,
              rideCompleted: true,
            })

            await LocalRideStorage.clearRide()
            navigation.navigate("collect_money", { data: rideDetails })
          } else {
            logError("Socket not connected for ride completion")
            Alert.alert("Connection Error", "Please check your internet connection and try again.")
          }
        },
      },
    ])
  }, [rideDetails, socket, navigation, state.otp])

  // Open Google Maps for navigation
  const openGoogleMapsDirections = useCallback(() => {
    const destination = state.rideStarted
      ? `${rideDetails.dropLocation.coordinates[1]},${rideDetails.dropLocation.coordinates[0]}`
      : `${rideDetails.pickupLocation.coordinates[1]},${rideDetails.pickupLocation.coordinates[0]}`

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`

    logDebug("Opening Google Maps with URL", url)

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url)
      } else {
        if (Platform.OS === "android") {
          // Try to open with intent launcher as fallback
          IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
            data: url,
            flags: 268435456, // FLAG_ACTIVITY_NEW_TASK
          }).catch((err) => {
            logError("Error opening Google Maps with Intent Launcher", err)
            Alert.alert("Error", "Could not open Google Maps")
          })
        } else {
          logError("Cannot open Google Maps URL")
          Alert.alert("Error", "Could not open Google Maps")
        }
      }
    })
  }, [state.rideStarted, rideDetails])

  return {
    handleOtpSubmit,
    handleCancelRide,
    handleCompleteRide,
    openGoogleMapsDirections,
    startSound,
    stopSound,
    fetchCancelReasons,
  }
}

