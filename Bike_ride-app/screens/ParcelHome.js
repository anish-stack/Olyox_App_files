import React, { useState, useCallback, useEffect, useMemo } from "react"
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Text,
    Modal,
    Pressable,
    BackHandler,
    Alert,
    Image,
} from "react-native"
import * as Updates from "expo-updates"
import { MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons"
import axios from "axios"
import * as SecureStore from "expo-secure-store"
import { CommonActions, useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

import { initializeSocket } from "../context/socketService"
import { useSocket } from "../context/SocketContext"
import styles from "./parcelStyle"

// API configuration
const API_URL = "https://www.appapi.olyox.com/api/v1"
const RIDER_API = `${API_URL}/rider`

const ParcelHome = () => {
    // States
    const [menuVisible, setMenuVisible] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [isOnline, setIsOnline] = useState(false)
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(false)

    // Context and hooks
    const { isSocketReady, socket } = useSocket()
    const navigation = useNavigation()


    // Refresh handler
    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await fetchUserDetails()
            await Updates.reloadAsync()

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                })
            )
        } catch (error) {
            console.error("Refresh failed:", error)
            Alert.alert("Refresh Failed", "Could not refresh data. Please try again.")
        } finally {
            setRefreshing(false)
        }
    }, [])

    // Logout handler with retry mechanism
    const handleLogout = useCallback(async (retryCount = 0, maxRetries = 3) => {
        try {
            // First, delete secure storage items regardless of connection state
            await SecureStore.deleteItemAsync("auth_token_cab")
            await SecureStore.deleteItemAsync("isOnline")

            if (!userData?._id) {
                console.log("No user ID available for logout")
                // Even without ID, we should reset to Onboarding since tokens are deleted
                navigation.reset({
                    index: 0,
                    routes: [{ name: "Onboarding" }],
                })
                return
            }

            // Attempt the logout API call
            const response = await axios.get(`${RIDER_API}/rider-logout/${userData._id}`)

            if (response.data.success) {
                console.log("Logout successful:", response.data)

                navigation.reset({
                    index: 0,
                    routes: [{ name: "Onboarding" }],
                })

                BackHandler.exitApp()
            } else {
                throw new Error(response.data.message || "Logout failed")
            }
        } catch (error) {
            console.error(`Logout Error (Attempt ${retryCount + 1}):`, error)

            // If we haven't reached max retries, try again after 4 seconds
            if (retryCount < maxRetries) {
                console.log(`Retrying logout in 4 seconds... (Attempt ${retryCount + 1}/${maxRetries})`)

                setTimeout(() => {
                    handleLogout(retryCount + 1, maxRetries)
                }, 4000)
            } else {
                // If we've reached max retries, show error and provide options
                const errorMessage = error?.response?.data?.message &&
                    error?.response?.data?.message !== "undefined"
                    ? error.response.data.message
                    : "Please try again. If you have an ongoing delivery, please complete it first."

                Alert.alert(
                    "Unable to Logout",
                    errorMessage,
                    [
                        {
                            text: "Try Again",
                            onPress: () => handleLogout(0, maxRetries)
                        },
                        {
                            text: "Force Logout",
                            onPress: () => {
                                // Force navigation reset even if API call failed
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: "Onboarding" }],
                                })
                            }
                        }
                    ]
                )
            }
        } finally {
            setMenuVisible(false)
        }
    }, [navigation, userData])

    // Socket reconnection handler
    const handleSocketReconnect = async (userId) => {
        if (!userId) {
            Alert.alert("Error", "User information not available. Please try to log in again.")
            return
        }

        try {
            setLoading(true)
            const isReconnected = await initializeSocket({ userId })

            if (isReconnected) {
                Alert.alert("Success", "Successfully reconnected to the server.")
                await Updates.reloadAsync()
            } else {
                throw new Error("Connection failed")
            }
        } catch (error) {
            console.error("Socket reconnection error:", error)
            Alert.alert("Connection Error", "Failed to connect to the server. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    // Clear local storage and reset navigation
    const handleHardReset = async () => {
        try {
            // Clear any stored ride data
            if (window.LocalRideStorage && typeof window.LocalRideStorage.clearRide === 'function') {
                await window.LocalRideStorage.clearRide()
            }

            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: "Home" }],
                })
            )
        } catch (error) {
            console.error("Hard reset error:", error)
            Alert.alert("Reset Error", "Failed to reset the application. Please try again.")
        }
    }

    // Fetch user details from API
    const fetchUserDetails = async () => {
        setLoading(true)
        try {
            const token = await SecureStore.getItemAsync("auth_token_cab")

            if (!token) {
                throw new Error("Authentication token not found")
            }

            const response = await axios.get(`${RIDER_API}/user-details`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (response.data.success && response.data.partner) {
                const partnerData = response.data.partner
                setUserData(partnerData)
                setIsOnline(partnerData.isAvailable)

                // Initialize socket connection with user ID
                await initializeSocket({ userId: partnerData._id })

                return partnerData
            } else {
                throw new Error(response.data.message || "Failed to fetch user details")
            }
        } catch (error) {
            console.error("Error fetching user details:", error?.response?.data?.message || error.message)

            if (error?.response?.status === 401) {
                Alert.alert(
                    "Session Expired",
                    "Your session has expired. Please log in again.",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                navigation.reset({
                                    index: 0,
                                    routes: [{ name: "Onboarding" }],
                                })
                            }
                        }
                    ]
                )
            }
        } finally {
            setLoading(false)
        }
    }

    // Initial data load
    useEffect(() => {
        fetchUserDetails()
    }, [])

    // Toggle online/offline status
    const toggleOnlineStatus = async () => {
        if (loading) return

        setLoading(true)

        try {
            // Check if location is available before going online
            // if (!isOnline ) {
            //     throw new Error("Location not available. Please ensure your GPS is enabled.")
            // }

            // Check if recharge is expired before going online
            const expireDate = new Date(userData?.RechargeData?.expireData)
            const currentDate = new Date()
            const goingOnline = !isOnline

            if (goingOnline && expireDate < currentDate) {
                Alert.alert(
                    "Recharge Expired",
                    "Your recharge has expired. Please recharge to go online.",
                    [{ text: "Recharge Now", onPress: () => navigation.navigate("Recharge") }]
                )
                return
            }

            const token = await SecureStore.getItemAsync("auth_token_cab")

            if (!token) {
                throw new Error("Authentication token not found")
            }

            // Toggle driver availability
            const response = await axios.post(
                `${RIDER_API}/toggleWorkStatusOfRider`,
                { status: goingOnline },
                { headers: { Authorization: `Bearer ${token}` } }
            )

            if (!response.data.success) {
                throw new Error(response.data.message || "Failed to update status")
            }

            // Get latest user data
            const updatedUserData = await fetchUserDetails()

            // Update local storage with online status
            await SecureStore.setItemAsync("isOnline", goingOnline.toString())

            // Update state with new online status
            setIsOnline(response.data.cabRider?.status === "online")

            // Show success message
            Alert.alert(
                "Status Updated",
                `You are now ${goingOnline ? "online" : "offline"}.`,
                [{ text: "OK" }]
            )
        } catch (error) {
            console.error("Toggle Status Error:", error?.response?.data?.message || error.message)

            Alert.alert(
                "Status Update Failed",
                error?.response?.data?.message || error.message || "Something went wrong",
                [{ text: "OK" }]
            )
        } finally {
            setLoading(false)
        }
    }

    // Format date to Indian Standard Time
    const formatToIST = (dateString) => {
        if (!dateString) return "N/A"

        try {
            const date = new Date(dateString)
            return date.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
        } catch (error) {
            console.error("Date formatting error:", error)
            return "Invalid Date"
        }
    }

    // Memoized components for performance
    const ConnectionStatusIndicator = useMemo(() => (
        <View style={[styles.connectionStatus, { backgroundColor: socket?.connected ? "#FFF8E1" : "#FFEBEE" }]}>
            <MaterialCommunityIcons
                name={socket?.connected ? "wifi-check" : "wifi-off"}
                size={20}
                color={socket?.connected ? "#00C1A4" : "#C62828"}
            />
            <Text style={[styles.connectionText, { color: socket?.connected ? "#00C1A4" : "#C62828" }]}>
                {socket?.connected ? "Connected" : "Offline"}
            </Text>
        </View>
    ), [socket?.connected])

    const MenuModal = useMemo(() => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={menuVisible}
            onRequestClose={() => setMenuVisible(false)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
                <View style={styles.menuContainer}>
                    <View style={styles.menuHandle} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setMenuVisible(false)
                            navigation.navigate("Profile")
                        }}
                    >
                        <MaterialCommunityIcons name="account" size={24} color="#FFB300" />
                        <Text style={styles.menuText}>Profile</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setMenuVisible(false)
                            navigation.navigate("Recharge")
                        }}
                    >
                        <MaterialCommunityIcons name="contactless-payment" size={24} color="#FFB300" />
                        <Text style={styles.menuText}>Recharge</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setMenuVisible(false)
                            navigation.navigate("DeliveryHistory")
                        }}
                    >
                        <MaterialCommunityIcons name="history" size={24} color="#FFB300" />
                        <Text style={styles.menuText}>Delivery History</Text>
                    </TouchableOpacity>

                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={24} color="#FFB300" />
                        <Text style={styles.menuText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    ), [menuVisible, navigation, handleLogout])

    const StatusCards = useMemo(() => (
        <View style={styles.statusCard}>
            <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                    <View style={[styles.statusIcon, { backgroundColor: "#E3F2FD" }]}>
                        <FontAwesome5 name="box" size={18} color="#1976D2" />
                    </View>
                    <Text style={styles.statusLabel}>Status</Text>
                    <Text style={[
                        styles.statusValue,
                        {
                            color: userData?.isAvailable ? "#4CAF50" :
                                userData?.on_ride_id ? "#FB8C00" : "#F44336"
                        }
                    ]}>
                        {userData?.isAvailable
                            ? "Online"
                            : userData?.on_ride_id
                                ? "On Delivery"
                                : "Offline"}
                    </Text>
                </View>

                <View style={styles.statusItem}>
                    <View style={[styles.statusIcon, { backgroundColor: "#E8F5E9" }]}>
                        <MaterialCommunityIcons name="wifi" size={18} color="#43A047" />
                    </View>
                    <Text style={styles.statusLabel}>Connection</Text>
                    <Text style={[
                        styles.statusValue,
                        { color: socket?.connected ? "#4CAF50" : "#F44336" }
                    ]}>
                        {socket?.connected ? "Connected" : "Offline"}
                    </Text>
                </View>
            </View>


        </View>
    ), [userData?.isAvailable, userData?.on_ride_id, socket?.connected])

    return (
        <SafeAreaView style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Parcel Driver Dashboard</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleHardReset} style={styles.headerButton}>
                        <MaterialCommunityIcons name="reload" size={24} color="#212121" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerButton}>
                        <MaterialCommunityIcons name="dots-vertical" size={24} color="#212121" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#FFB300"]}
                        tintColor="#FFB300"
                    />
                }
            >
                {ConnectionStatusIndicator}

                <View style={styles.content}>
                    {/* Welcome Card with Profile */}
                    <View style={styles.welcomeCard}>
                        <View style={styles.profileSection}>
                            <View style={styles.avatarContainer}>
                                {userData?.documents?.profile ? (
                                    <Image
                                        source={{ uri: userData.documents.profile }}
                                        style={styles.profileImage}
                                    />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <MaterialCommunityIcons name="account" size={40} color="#FFB300" />
                                    </View>
                                )}
                            </View>

                            <View style={styles.welcomeTextContainer}>
                                <Text style={styles.welcomeText}>
                                    Welcome back, {userData?.name?.split(' ')[0] || 'Driver'}!
                                </Text>
                                <Text style={styles.subText}>
                                    Recharge expires: {formatToIST(userData?.RechargeData?.expireData)}
                                </Text>
                            </View>
                        </View>

                        {/* Online/Offline Toggle */}
                        <TouchableOpacity
                            style={[
                                styles.onlineToggle,
                                {
                                    backgroundColor: loading
                                        ? "#F5F5F5"
                                        : isOnline
                                            ? "#E8F5E9"
                                            : userData?.on_ride_id
                                                ? "#FFF3E0"
                                                : "#FFEBEE"
                                }
                            ]}
                            onPress={toggleOnlineStatus}
                            disabled={loading || userData?.on_ride_id}
                        >
                            <MaterialCommunityIcons
                                name={
                                    loading
                                        ? "progress-clock"
                                        : isOnline
                                            ? "package-variant"
                                            : userData?.on_ride_id
                                                ? "package-variant-closed"
                                                : "package-variant-remove"
                                }
                                size={24}
                                color={
                                    loading
                                        ? "#757575"
                                        : isOnline
                                            ? "#43A047"
                                            : userData?.on_ride_id
                                                ? "#FB8C00"
                                                : "#E53935"
                                }
                            />
                            <Text
                                style={[
                                    styles.onlineToggleText,
                                    {
                                        color: loading
                                            ? "#757575"
                                            : isOnline
                                                ? "#43A047"
                                                : userData?.on_ride_id
                                                    ? "#FB8C00"
                                                    : "#E53935"
                                    }
                                ]}
                            >
                                {loading
                                    ? "Updating..."
                                    : isOnline
                                        ? "Go Offline"
                                        : userData?.on_ride_id
                                            ? "Delivery In Progress"
                                            : "Go Online"}
                            </Text>
                        </TouchableOpacity>

                        {/* Reconnect Button */}
                        <TouchableOpacity
                            style={[styles.reconnectButton, { backgroundColor: isSocketReady ? "#E3F2FD" : "#FFEBEE" }]}
                            onPress={() => handleSocketReconnect(userData?._id)}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons
                                name={isSocketReady ? "wifi-check" : "wifi-off"}
                                size={24}
                                color={isSocketReady ? "#1976D2" : "#E53935"}
                            />
                            <Text style={[styles.reconnectText, { color: isSocketReady ? "#1976D2" : "#E53935" }]}>
                                {isSocketReady ? "Connected to Server" : "Reconnect to Server"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Status Cards */}
                    {StatusCards}

                </View>
            </ScrollView>

            {/* Menu Modal */}
            {MenuModal}
        </SafeAreaView>
    )
}

export default React.memo(ParcelHome)