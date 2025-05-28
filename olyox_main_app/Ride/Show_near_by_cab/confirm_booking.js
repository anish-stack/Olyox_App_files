
import { useEffect, useState, useRef } from "react"
import { View, Text, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import * as Location from "expo-location"
import axios from "axios"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import LottieView from "lottie-react-native"

import Map from "../Map/Map"
import { tokenCache } from "../../Auth/cache"
import { useSocket } from "../../context/SocketContext"
import { useLocation } from "../../context/LocationContext"
import { useRide } from "../../context/RideContext"
import useNotificationPermission from "../../hooks/notification"
import styles from "./BookingConfirmationStyles"

export default function BookingConfirmation() {
    const route = useRoute()
    const navigation = useNavigation()
    const { location } = useLocation()
    const { isConnected, socket, userId } = useSocket()
    const { saveRide, updateRideStatus } = useRide()
    const { fcmToken, lastNotification } = useNotificationPermission()

    // State variables
    const [fareDetails, setFareDetails] = useState(null)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(false)
    const [bookingStep, setBookingStep] = useState(0)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(null)
    const [currentLocation, setCurrentLocation] = useState(null)
    const [timeoutActive, setTimeoutActive] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes in seconds
    const [socketConnected, setSocketConnected] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState("Cash")
    const [connectionStatus, setConnectionStatus] = useState("disconnected") // 'connected', 'disconnected', 'reconnecting'
    const [usingFcmFallback, setUsingFcmFallback] = useState(false)

    //   console.log("lastNotification",)
    // Extract route params
    const { origin, destination, selectedRide, dropoff, pickup } = route.params || {}

    // Animation refs
    const pulseAnim = useRef(new Animated.Value(1)).current
    const fadeAnim = useRef(new Animated.Value(0)).current
    const timerRef = useRef(null)
    const socketTimeoutRef = useRef(null)
    const lottieRef = useRef(null)
    const reconnectTimeoutRef = useRef(null)
    const reconnectAttempts = useRef(0)

    // Booking steps for the loading animation with enhanced messaging
    const bookingSteps = [
        {
            icon: "car-clock",
            title: "Getting Ready! 🚀",
            message: "Hang tight! We're preparing your perfect ride experience...",
            lottie: "https://assets5.lottiefiles.com/packages/lf20_jjmptxzk.json",
        },
        {
            icon: "map-search",
            title: "Finding Your Driver 🔍",
            message: "Connecting you with our top-rated drivers nearby...",
            lottie: "https://assets9.lottiefiles.com/packages/lf20_vxvx0hzv.json",
        },
        {
            icon: "timer-sand",
            title: "Almost There! ⌛",
            message: "Our drivers are quite busy, but we're doing our best to find you the perfect match...",
            lottie: "https://assets10.lottiefiles.com/packages/lf20_bkmfgzpj.json",
        },
        {
            icon: "check-circle",
            title: "Great News! 🎉",
            message: "We've found you an amazing driver! Getting everything ready for your journey...",
            lottie: "https://assets3.lottiefiles.com/packages/lf20_touohxv0.json",
        },
    ]

    // Check socket connection and handle reconnection
    useEffect(() => {
        const checkSocketConnection = () => {
            if (!socket) {
                console.error("Socket function is not available")
                setSocketConnected(false)
                setConnectionStatus("disconnected")
                return false
            }

            let socketInstance
            try {
                socketInstance = socket()
            } catch (err) {
                console.error("Error getting socket instance:", err)
                setSocketConnected(false)
                setConnectionStatus("disconnected")
                return false
            }

            if (!socketInstance) {
                console.error("No socket instance returned from socket()")
                setSocketConnected(false)
                setConnectionStatus("disconnected")
                return false
            }

            setSocketConnected(socketInstance.connected)
            setConnectionStatus(socketInstance.connected ? "connected" : "disconnected")
            return socketInstance.connected
        }

        const attemptReconnection = () => {
            if (reconnectAttempts.current >= 5) {
                console.log("Max reconnection attempts reached, using FCM fallback")
                if (fcmToken) {
                    setUsingFcmFallback(true)
                    setConnectionStatus("using_fcm")
                    setSuccess("Using push notifications for ride updates")
                    setTimeout(() => setSuccess(null), 3000)
                } else {
                    setError("Unable to connect. Please restart the app.")
                }
                return
            }

            setConnectionStatus("reconnecting")
            reconnectAttempts.current += 1

            // Clear any existing timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }

            // Try to reconnect after a delay (with exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
            reconnectTimeoutRef.current = setTimeout(() => {
                if (checkSocketConnection()) {
                    // Successfully reconnected
                    reconnectAttempts.current = 0
                    setSuccess("Connection restored!")
                    setTimeout(() => setSuccess(null), 3000)
                } else {
                    // Try again
                    attemptReconnection()
                }
            }, delay)
        }

        const isConnected = checkSocketConnection()

        if (!isConnected && !usingFcmFallback) {
            attemptReconnection()
        }

        // Socket event handlers
        if (socket) {
            let socketInstance
            try {
                socketInstance = socket()

                if (socketInstance) {
                    const handleConnect = () => {
                        setSocketConnected(true)
                        setConnectionStatus("connected")
                        setError(null)
                        reconnectAttempts.current = 0
                        setUsingFcmFallback(false)
                        setSuccess("Connection established!")
                        setTimeout(() => setSuccess(null), 3000)
                    }

                    const handleDisconnect = () => {
                        setSocketConnected(false)
                        setConnectionStatus("disconnected")
                        if (loading && !usingFcmFallback) {
                            attemptReconnection()
                        }
                    }

                    const handleConnectError = (err) => {
                        setSocketConnected(false)
                        setConnectionStatus("disconnected")
                        console.error("Socket connection error:", err)
                        if (!usingFcmFallback) {
                            attemptReconnection()
                        }
                    }

                    socketInstance.on("connect", handleConnect)
                    socketInstance.on("disconnect", handleDisconnect)
                    socketInstance.on("connect_error", handleConnectError)

                    return () => {
                        try {
                            if (socketInstance) {
                                socketInstance.off("connect", handleConnect)
                                socketInstance.off("disconnect", handleDisconnect)
                                socketInstance.off("connect_error", handleConnectError)
                            }
                        } catch (err) {
                            console.error("Error during socket cleanup:", err)
                        }

                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current)
                        }
                    }
                }
            } catch (err) {
                console.error("Error setting up socket listeners:", err)
            }
        }

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [socket, loading, fcmToken, usingFcmFallback])

    // Get current location
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                setInitialLoading(true)

                if (location) {
                    setCurrentLocation(location.coords)
                } else {
                    const { status } = await Location.requestForegroundPermissionsAsync()

                    if (status !== "granted") {
                        setError("Location permission is required to book a ride")
                        return
                    }

                    const currentPosition = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.High,
                    })

                    setCurrentLocation(currentPosition.coords)
                }
            } catch (err) {
                console.error("Error getting location:", err)
                setError("Unable to get your current location. Please try again.")
            } finally {
                setInitialLoading(false)
            }
        }

        fetchLocation()
    }, [location])

    // Get fare information
    useEffect(() => {
        const getFareInfo = async () => {
            try {
                setInitialLoading(true)

                if (!origin || !destination || !selectedRide) {
                    setError("Missing ride information. Please try again.")
                    return
                }

                const response = await axios.post(
                    "https://appapi.olyox.com/api/v1/rider/get-fare-info",
                    {
                        origin,
                        destination,
                        waitingTimeInMinutes: 0,
                        ratePerKm: selectedRide?.priceRange,
                    },
                    { timeout: 10000 },
                )

                if (response.data) {
                    setFareDetails(response.data)
                    setError(null)
                } else {
                    setError("Unable to calculate fare. Please try again.")
                }
            } catch (err) {
                console.error("Error getting fare info:", err.response?.data?.message || err.message)
                setError("Unable to calculate fare. Please check your internet connection and try again.")
            } finally {
                setInitialLoading(false)
            }
        }

        if (origin && destination && selectedRide) {
            getFareInfo()
        }
    }, [origin, destination, selectedRide])

    // Pulse animation for loading state
    useEffect(() => {
        if (loading) {
            // Start pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ).start()

            // Start fade animation
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }).start()

            // Play Lottie animation
            if (lottieRef.current) {
                lottieRef.current.play()
            }
        } else {
            pulseAnim.setValue(1)
            fadeAnim.setValue(0)
        }

        return () => {
            pulseAnim.stopAnimation()
            fadeAnim.stopAnimation()
        }
    }, [loading, pulseAnim, fadeAnim, bookingStep])

    useEffect(() => {
        const setupSocketListeners = () => {
            if (!socket) return null;

            let socketInstance;
            try {
                socketInstance = socket();
            } catch (err) {
                console.error("Error getting socket instance:", err);
                return null;
            }

            if (!socketInstance) return null;

            const handleRideConfirm = (data) => {
                try {
                    console.log("Ride confirmation received:", data);

                    if (socketTimeoutRef.current) {
                        clearTimeout(socketTimeoutRef.current);
                        socketTimeoutRef.current = null;
                    }

                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }

                    setTimeoutActive(false);
                    setBookingStep(3);
                    setSuccess("🎉 Driver found! Preparing your ride...");

                    if (data && data.rideDetails) {
                        setTimeout(() => {
                            setLoading(false);
                            saveRide(data.rideDetails);
                            updateRideStatus("confirmed");
                            navigation.navigate("driver_match", {
                                ride: data.rideDetails,
                                origin,
                                destination,
                            });
                        }, 1500);
                    } else {
                        console.error("Invalid ride data received:", data);
                        setLoading(false);
                        setError("Invalid ride data received. Please try again.");
                    }
                } catch (err) {
                    console.error("Error processing ride confirmation:", err);
                    setLoading(false);
                    setError("Error processing driver match. Please try again.");
                }
            };

            const handleRideRejected = (data) => {
                console.log("Ride rejected:", data);
                setLoading(false);
                setError("No drivers available at the moment. Please try again later.");

                if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current);
                if (timerRef.current) clearInterval(timerRef.current);

                socketTimeoutRef.current = null;
                timerRef.current = null;
                setTimeoutActive(false);
            };

            const handleNoDrivers = (data) => {
                console.log("No drivers available:", data);
                setLoading(false);
                setError("No drivers found in your area. Please try again later.");

                if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current);
                if (timerRef.current) clearInterval(timerRef.current);

                socketTimeoutRef.current = null;
                timerRef.current = null;
                setTimeoutActive(false);
            };

            const handleSocketError = (err) => {
                console.error("Socket error:", err);
                setLoading(false);
                setError("Connection error. Please try again.");

                if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current);
                if (timerRef.current) clearInterval(timerRef.current);

                socketTimeoutRef.current = null;
                timerRef.current = null;
                setTimeoutActive(false);
            };

            socketInstance.on("ride_accepted_message", handleRideConfirm);
            socketInstance.on("ride_rejected_message", handleRideRejected);
            socketInstance.on("sorry_no_rider_available", handleNoDrivers);
            socketInstance.on("error", handleSocketError);

            return {
                cleanup: () => {
                    try {
                        socketInstance.off("ride_accepted_message", handleRideConfirm);
                        socketInstance.off("ride_rejected_message", handleRideRejected);
                        socketInstance.off("sorry_no_rider_available", handleNoDrivers);
                        socketInstance.off("error", handleSocketError);
                    } catch (err) {
                        console.error("Error during event listener cleanup:", err);
                    }
                },
            };
        };

        const setupFcmListeners = () => {
            if (!fcmToken) return null;

            console.log("FCM fallback active, listening for push notifications");

            return {
                cleanup: () => {
                    console.log("Cleaning up FCM listeners");
                },
            };
        };

        // 1. Setup based on socket or FCM
        let listeners = null;
        if (socketConnected && !usingFcmFallback) {
            listeners = setupSocketListeners();
        } else if (fcmToken && (usingFcmFallback || connectionStatus === "reconnecting")) {
            listeners = setupFcmListeners();
        }

        // 2. If no socket or FCM connection, use lastNotification as fallback
        if (
            !socketConnected &&
            (!listeners || !listeners.cleanup) &&
            lastNotification?.request?.content?.data?.rideDetails
        ) {
            const fallbackRideDetails = lastNotification.request.content.data.rideDetails;

            console.log("📩 Using rideDetails from last notification:", fallbackRideDetails);

            setTimeout(() => {
                setLoading(false);
                setBookingStep(3);
                setSuccess("🎉 Driver found! Preparing your ride...");
                saveRide(fallbackRideDetails);
                updateRideStatus("confirmed");
                navigation.navigate("driver_match", {
                    ride: fallbackRideDetails,
                    origin,
                    destination,
                });
            }, 1500);
        }

        return () => {
            if (listeners && listeners.cleanup) {
                listeners.cleanup();
            }

            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current);
                socketTimeoutRef.current = null;
            }

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [
        socket,
        navigation,
        origin,
        destination,
        socketConnected,
        fcmToken,
        usingFcmFallback,
        connectionStatus,
        lastNotification, // make sure this is in your state/props/deps
    ]);

    // Handle booking submission
    const handleSubmit = async () => {
        try {
            // Reset states
            setError(null)
            setSuccess(null)
            setLoading(true)
            setBookingStep(0)
            setTimeoutActive(true)
            setTimeRemaining(120)

            // Check if we have a valid connection method
            if (!socketConnected && !fcmToken) {
                setError("No connection available. Please check your internet and try again.")
                setLoading(false)
                setTimeoutActive(false)
                return
            }

            // Check if we have all required data
            if (!currentLocation || !origin || !destination || !selectedRide) {
                setError("Missing ride information. Please try again.")
                setLoading(false)
                setTimeoutActive(false)
                return
            }

            // Get auth token
            let token
            try {
                token = await tokenCache.getToken("auth_token_db")
            } catch (err) {
                console.error("Error retrieving auth token:", err)
                setError("Authentication error. Please log in again.")
                setLoading(false)
                setTimeoutActive(false)
                return
            }

            if (!token) {
                setError("Authentication error. Please log in again.")
                setLoading(false)
                setTimeoutActive(false)
                return
            }

            // Create ride request
            const response = await axios.post(
                "https://appapi.olyox.com/api/v1/rides/create-ride",
                {
                    currentLocation,
                    pickupLocation: origin,
                    dropLocation: destination,
                    pick_desc: pickup?.description,
                    drop_desc: dropoff?.description,
                    vehicleType: selectedRide?.name,
                    paymentMethod: paymentMethod,
                    fcmToken: fcmToken, // Include FCM token for fallback notifications
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: 15000,
                },
            )

            const request = response?.data?.rideRequest

            // Validate request data
            if (!request) {
                throw new Error("Invalid response from server")
            }

            setSuccess("Ride request created successfully!")
            setBookingStep(1)

            // Start the 2-minute countdown timer
            timerRef.current = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            // Set a timeout for 2 minutes
            socketTimeoutRef.current = setTimeout(() => {
                console.log("Request timeout reached")
                setError("No drivers found nearby. Please try again later.")
                if (loading) {
                    setLoading(false)
                    setTimeoutActive(false)

                    if (timerRef.current) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                    }
                }
            }, 120000)

            // Simulate step progression for better UX
            setTimeout(() => {
                if (loading) setBookingStep(1)
            }, 3000)

            // Send ride request via socket or FCM
            setTimeout(() => {
                if (socketConnected && !usingFcmFallback) {
                    // Use socket for real-time communication
                    try {
                        const currentSocket = socket()

                        if (!currentSocket || !currentSocket.connected) {
                            throw new Error("Socket disconnected")
                        }

                        currentSocket.emit("send_message", {
                            message: "ride-save-find-riders",
                            data: request,
                        })

                        setSuccess("Finding drivers near you...")

                        // Move to next step after emitting event
                        setTimeout(() => {
                            if (loading) setBookingStep(2)
                        }, 3000)
                    } catch (err) {
                        console.error("Error emitting socket event:", err)

                        // Fall back to FCM if available
                        if (fcmToken) {
                            setUsingFcmFallback(true)
                            setConnectionStatus("using_fcm")
                            setSuccess("Using push notifications for ride updates")

                            // In a real app, you would make an API call here to trigger the FCM-based ride matching
                            console.log("Falling back to FCM for ride matching")

                            // Move to next step
                            setTimeout(() => {
                                if (loading) setBookingStep(2)
                            }, 3000)
                        } else {
                            setLoading(false)
                            setError("Connection error. Please try again.")
                            setTimeoutActive(false)

                            // Clear timers
                            if (socketTimeoutRef.current) {
                                clearTimeout(socketTimeoutRef.current)
                                socketTimeoutRef.current = null
                            }

                            if (timerRef.current) {
                                clearInterval(timerRef.current)
                                timerRef.current = null
                            }
                        }
                    }
                } else if (fcmToken) {
                    // Use FCM as fallback
                    setUsingFcmFallback(true)
                    setConnectionStatus("using_fcm")
                    setSuccess("Using push notifications for ride updates")

                    // In a real app, you would make an API call here to trigger the FCM-based ride matching
                    console.log("Using FCM for ride matching")

                    // Move to next step
                    setTimeout(() => {
                        if (loading) setBookingStep(2)
                    }, 3000)
                } else {
                    setLoading(false)
                    setError("No connection method available. Please try again later.")
                    setTimeoutActive(false)

                    // Clear timers
                    if (socketTimeoutRef.current) {
                        clearTimeout(socketTimeoutRef.current)
                        socketTimeoutRef.current = null
                    }

                    if (timerRef.current) {
                        clearInterval(timerRef.current)
                        timerRef.current = null
                    }
                }
            }, 2000)
        } catch (err) {
            console.error("Error creating ride:", err)

            let errorMessage = "Failed to create ride request. Please try again."

            if (err.response) {
                // Server responded with an error
                if (err.response.status === 401) {
                    errorMessage = "Your session has expired. Please log in again."
                } else if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message
                }
            } else if (err.request) {
                // Request was made but no response
                errorMessage = "Server not responding. Please check your internet connection."
            }

            setError(errorMessage)
            setLoading(false)
            setTimeoutActive(false)

            // Clear timers
            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current)
                socketTimeoutRef.current = null
            }

            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }

    // Change payment method
    const handleChangePayment = () => {
        Alert.alert("Select Payment Method", "Choose your preferred payment method", [
            {
                text: "Cash",
                onPress: () => setPaymentMethod("Cash"),
            },
            // {
            //     text: "Card",
            //     onPress: () => setPaymentMethod("Card"),
            // },
            {
                text: "Cancel",
                style: "cancel",
            },
        ])
    }

    // Format time remaining
    const formatTimeRemaining = () => {
        const minutes = Math.floor(timeRemaining / 60)
        const seconds = timeRemaining % 60
        return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
    }

    // Component for the header
    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                    // Show confirmation if booking is in progress
                    if (loading) {
                        Alert.alert("Cancel Booking?", "Are you sure you want to cancel your booking request?", [
                            {
                                text: "No",
                                style: "cancel",
                            },
                            {
                                text: "Yes, Cancel",
                                style: "destructive",
                                onPress: () => {
                                    setLoading(false)
                                    setTimeoutActive(false)

                                    // Clear timers
                                    if (socketTimeoutRef.current) {
                                        clearTimeout(socketTimeoutRef.current)
                                        socketTimeoutRef.current = null
                                    }

                                    if (timerRef.current) {
                                        clearInterval(timerRef.current)
                                        timerRef.current = null
                                    }

                                    navigation.goBack()
                                },
                            },
                        ])
                    } else {
                        navigation.goBack()
                    }
                }}
            >
                <Icon name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm Your Ride</Text>
            <View style={styles.placeholder} />
        </View>
    )

    // Component for connection status
    const ConnectionStatusBar = () => {
        if (connectionStatus === "connected") return null

        let statusMessage = ""
        let statusIcon = ""
        let statusStyle = {}

        switch (connectionStatus) {
            case "disconnected":
                statusMessage = "You're offline. Please check your connection."
                statusIcon = "wifi-off"
                statusStyle = styles.disconnectedStatus
                break
            case "reconnecting":
                statusMessage = "Reconnecting to server..."
                statusIcon = "reload"
                statusStyle = styles.reconnectingStatus
                break
            case "using_fcm":
                statusMessage = "Using push notifications for updates"
                statusIcon = "bell-ring"
                statusStyle = styles.fcmStatus
                break
            default:
                return null
        }

        return (
            <View style={[styles.connectionStatus, statusStyle]}>
                <Icon name={statusIcon} size={16} color={statusStyle.iconColor} />
                <Text style={[styles.connectionStatusText, { color: statusStyle.textColor }]}>{statusMessage}</Text>
            </View>
        )
    }

    // Component for the loading animation
    const LoaderComponent = () => (
        <Animated.View style={[styles.loaderContainer, { opacity: fadeAnim }]}>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
                {/* Use Lottie animation if available, fallback to icon */}
                {bookingSteps[bookingStep].lottie ? (
                    <LottieView
                        ref={lottieRef}
                        source={{ uri: bookingSteps[bookingStep].lottie }}
                        style={styles.lottieAnimation}
                        autoPlay
                        loop
                    />
                ) : (
                    <Icon name={bookingSteps[bookingStep].icon} size={50} color="#1976D2" />
                )}
            </Animated.View>

            <Text style={styles.loaderTitle}>{bookingSteps[bookingStep].title}</Text>

            <Text style={styles.loaderMessage}>{bookingSteps[bookingStep].message}</Text>

            {timeoutActive && (
                <View style={styles.timerContainer}>
                    <Icon name="timer-outline" size={20} color="#666" />
                    <Text style={styles.timerText}>Finding driver: {formatTimeRemaining()}</Text>
                </View>
            )}

            {usingFcmFallback && (
                <View style={styles.fcmNotice}>
                    <Icon name="bell-ring" size={20} color="#059669" />
                    <Text style={styles.fcmNoticeText}>Using push notifications for updates</Text>
                </View>
            )}

            <View style={styles.stepIndicatorContainer}>
                {bookingSteps.map((_, index) => (
                    <View key={index} style={[styles.stepDot, index === bookingStep && styles.stepDotActive]} />
                ))}
            </View>

            <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                    Alert.alert("Cancel Booking?", "Are you sure you want to cancel your booking request?", [
                        {
                            text: "No",
                            style: "cancel",
                        },
                        {
                            text: "Yes, Cancel",
                            style: "destructive",
                            onPress: () => {
                                setLoading(false)
                                setTimeoutActive(false)

                                // Clear timers
                                if (socketTimeoutRef.current) {
                                    clearTimeout(socketTimeoutRef.current)
                                    socketTimeoutRef.current = null
                                }

                                if (timerRef.current) {
                                    clearInterval(timerRef.current)
                                    timerRef.current = null
                                }
                            },
                        },
                    ])
                }}
            >
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </Animated.View>
    )

    // Component for ride details
    const RideDetails = () => (
        <View style={styles.rideDetailsCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Ride Details</Text>
                {fareDetails && (
                    <View style={styles.estimatedTime}>
                        <Icon name="clock-outline" size={16} color="#059669" />
                        <Text style={styles.estimatedTimeText}>{fareDetails?.durationInMinutes?.toFixed(0) || "0"} min</Text>
                    </View>
                )}
            </View>

            <View style={styles.rideInfo}>
                <View style={styles.rideInfoItem}>
                    <Icon name="map-marker" size={24} color="#E3838D" />
                    <View style={styles.rideInfoText}>
                        <Text style={styles.rideInfoLabel}>Pickup</Text>
                        <Text style={styles.rideInfoValue} numberOfLines={2}>
                            {pickup?.description || "Current Location"}
                        </Text>
                    </View>
                </View>

                <View style={styles.locationConnector}>
                    <View style={styles.locationDot} />
                    <View style={styles.locationLine} />
                    <View style={styles.locationDot} />
                </View>

                <View style={styles.rideInfoItem}>
                    <Icon name="map-marker-radius" size={24} color="#D62C27" />
                    <View style={styles.rideInfoText}>
                        <Text style={styles.rideInfoLabel}>Dropoff</Text>
                        <Text style={styles.rideInfoValue} numberOfLines={2}>
                            {dropoff?.description || "Destination"}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            {fareDetails ? (
                <View style={styles.fareDetails}>
                    <Text style={styles.fareTitle}>Fare Breakdown</Text>

                    {/* Extra Charge Due to Rain */}
                    {fareDetails?.rain && (
                        <View style={styles.fareItem}>
                            <Text style={styles.fareItemText}>Extra Charge Due To Rain</Text>
                            <Text style={styles.fareItemValue}>₹{fareDetails.rain || 5}</Text>
                        </View>
                    )}

                    {/* Price for Distance */}
                    <View style={styles.fareItem}>
                        <Text style={styles.fareItemText}>
                            Price for Distance ({fareDetails?.distanceInKm?.toFixed(2) || "0"} km)
                        </Text>
                        <Text style={styles.fareItemValue}>₹{fareDetails?.totalPrice?.toFixed(0) || "0"}</Text>
                    </View>

                    {/* Total Price */}
                    <View style={[styles.fareItem, styles.fareTotal]}>
                        <Text style={styles.totalText}>Total</Text>
                        <Text style={styles.totalAmount}>₹{fareDetails?.totalPrice?.toFixed(0) || "0"}</Text>
                    </View>

                    {/* Fare Note */}
                    <View style={styles.fareNote}>
                        <Text style={styles.fareNoteText}>
                            <Text style={styles.noteHighlight}>Note: </Text>
                            Road tax, state tax, and highway tolls are included.
                            <Text style={styles.noteHighlight}> (MCD tolls are not included.)</Text>
                        </Text>
                    </View>
                </View>
            ) : (
                <View style={styles.loadingFare}>
                    <ActivityIndicator size="small" color="#00aaa9" />
                    <Text style={styles.loadingFareText}>Calculating fare...</Text>
                </View>
            )}
        </View>
    )

    // Initial loading state
    if (initialLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <Header />
                <View style={styles.initialLoadingContainer}>
                    <LottieView
                        source={{ uri: "https://assets9.lottiefiles.com/packages/lf20_p8bfn5to.json" }}
                        style={styles.initialLoadingAnimation}
                        autoPlay
                        loop
                    />
                    <Text style={styles.initialLoadingText}>Loading ride details...</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <ConnectionStatusBar />

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.mapContainer}>
                    <Map origin={origin} destination={destination} />
                </View>

                {loading ? <LoaderComponent /> : <RideDetails />}
            </ScrollView>

            {!loading && (
                <View style={styles.bottomContainer}>
                    <View style={styles.paymentMethod}>
                        <Icon name={paymentMethod === "Cash" ? "cash" : "credit-card"} size={24} color="#059669" />
                        <Text style={styles.paymentText}>{paymentMethod} Payment</Text>
                        <TouchableOpacity onPress={handleChangePayment}>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.confirmButton, (!fareDetails || error) && styles.confirmButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!fareDetails || !!error}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.confirmButtonText}>Confirm Ride</Text>
                        {fareDetails && (
                            <Text style={styles.confirmButtonPrice}>₹{fareDetails?.totalPrice?.toFixed(0) || "0"}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle" size={24} color="#DC2626" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.dismissButton} onPress={() => setError(null)}>
                        <Icon name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            )}

            {success && (
                <View style={styles.successContainer}>
                    <Icon name="check-circle" size={24} color="#059669" />
                    <Text style={styles.successText}>{success}</Text>
                    <TouchableOpacity style={styles.dismissButton} onPress={() => setSuccess(null)}>
                        <Icon name="close" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            )}

            {connectionStatus === "reconnecting" && (
                <View style={styles.reconnectingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.reconnectingText}>Reconnecting to server...</Text>
                </View>
            )}
        </SafeAreaView>
    )
}
