
import { useState, useEffect } from "react"
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Dimensions,
    RefreshControl,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import axios from "axios"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from 'react-native-safe-area-context'
const BASE_URL = `http://192.168.1.11:3100/api/v1/tiffin/find_Restaurant_Packages`
const { width } = Dimensions.get("window")

export default function TiffinsPage() {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [expandedId, setExpandedId] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchPackages()
    }, [])

    const fetchPackages = async () => {
        try {
            const response = await axios.get(BASE_URL)
            setPackages(response.data.packages)
            setError(null)
        } catch (err) {
            setError("Failed to load tiffin packages")
            console.error("Error fetching packages:", err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const onRefresh = () => {
        setRefreshing(true)
        fetchPackages()
    }

    const handleCall = (phoneNumber) => {
        // console.log("restaurant_phone", phoneNumber)
        Linking.openURL(`tel:${phoneNumber}`)
    }

    const renderMealItems = (meal) => {
        if (!meal.enabled || meal.items.length === 0) return null

        return (
            <View style={styles.mealItems}>
                {meal.items.map((item) => (
                    <Text key={item._id} style={styles.mealItemText}>
                        • {item.name} - ₹{item.price}
                    </Text>
                ))}
            </View>
        )
    }

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#FF6347" />
            </View>
        )
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchPackages}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {packages.map((pkg) => (
                    <View key={pkg._id} style={styles.packageCard}>
                        <Image
                            source={{ uri: pkg.images?.url || "https://via.placeholder.com/300x200" }}
                            style={styles.packageImage}
                            resizeMode="cover"
                        />
                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.5)"]} style={styles.gradient} />
                        <View style={styles.packageInfo}>
                            <View style={styles.restaurantHeader}>
                                <Text style={styles.restaurantName}>{pkg?.packageName || pkg.restaurant_id.restaurant_name}</Text>
                                <View style={styles.ratingContainer}>
                                    <Ionicons name="star" size={16} color="#FFD700" />
                                    <Text style={styles.rating}>{pkg.restaurant_id.rating}</Text>
                                </View>
                            </View>
                            <Text style={styles.address}>
                                {pkg.restaurant_id.restaurant_address.street},{pkg.restaurant_id.restaurant_address.city}
                            </Text>
                            <View style={styles.packageDetails}>
                                <Text style={styles.price}>₹{pkg.totalPrice}</Text>
                                <Text style={styles.duration}>{pkg.duration} days package</Text>
                            </View>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.callButton} onPress={() => handleCall(pkg?.restaurant_id?.restaurant_phone)}>
                                    <Ionicons name="call" size={20} color="#fff" />
                                    <Text style={styles.callButtonText}>Call</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.expandButton}
                                    onPress={() => setExpandedId(expandedId === pkg._id ? null : pkg._id)}
                                >
                                    <Text style={styles.expandButtonText}>{expandedId === pkg._id ? "Hide Details" : "View Details"}</Text>
                                    <Ionicons name={expandedId === pkg._id ? "chevron-up" : "chevron-down"} size={20} color="#FF6347" />
                                </TouchableOpacity>
                            </View>
                            {expandedId === pkg._id && (
                                <View style={styles.expandedContent}>
                                    {["breakfast", "lunch", "dinner"].map((mealType) => (
                                        <View key={mealType}>
                                            <Text style={styles.mealHeader}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                                            {renderMealItems(pkg.meals[mealType])}
                                        </View>
                                    ))}
                                    <View style={styles.deliveryInfo}>
                                        <Text style={styles.deliveryTime}>Delivery Time: {pkg.restaurant_id.minDeliveryTime}</Text>
                                        <Text style={styles.category}>{pkg.restaurant_id.restaurant_category}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        fontSize: 28,
        fontWeight: "bold",
        marginVertical: 20,
        color: "#333",
        textAlign: "center",
    },
    errorText: {
        color: "red",
        fontSize: 18,
        textAlign: "center",
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: "#FF6347",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    packageCard: {
        backgroundColor: "white",
        borderRadius: 15,
        marginHorizontal: 16,
        marginBottom: 20,
        overflow: "hidden",
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    packageImage: {
        width: "100%",
        height: 200,
    },
    gradient: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 100,
    },
    packageInfo: {
        padding: 16,
    },
    restaurantHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    restaurantName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
        flex: 1,
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 215, 0, 0.2)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    rating: {
        marginLeft: 4,
        color: "#333",
        fontWeight: "bold",
    },
    address: {
        color: "#666",
        marginBottom: 8,
    },
    packageDetails: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    price: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#FF6347",
    },
    duration: {
        color: "#666",
        fontSize: 16,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    callButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4CAF50",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    callButtonText: {
        color: "white",
        marginLeft: 8,
        fontSize: 16,
        fontWeight: "bold",
    },
    expandButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 99, 71, 0.1)",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    expandButtonText: {
        color: "#fff",
        marginRight: 8,
        fontSize: 16,
        fontWeight: "bold",
    },
    expandedContent: {
        marginTop: 16,
    },
    mealHeader: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginTop: 12,
        marginBottom: 8,
    },
    mealItems: {
        marginLeft: 16,
    },
    mealItemText: {
        color: "#666",
        marginBottom: 4,
        fontSize: 14,
    },
    deliveryInfo: {
        marginTop: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#eee",
    },
    deliveryTime: {
        color: "#666",
        fontSize: 14,
    },
    category: {
        backgroundColor: "#E3F2FD",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        color: "#1976D2",
        fontSize: 14,
        fontWeight: "bold",
    },
})

