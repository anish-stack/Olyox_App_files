"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StatusBar,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import Ionicons from "react-native-vector-icons/Ionicons"
import { useFood } from "../../context/Food_Context/Food_context"
import AddressModal from "./AddressModal"
import { useLocation } from "../../context/LocationContext"
import axios from "axios"
import AddOn from "./AddOn"
import { tokenCache } from "../../Auth/cache"
import * as SecureStore from "expo-secure-store"

const Checkout = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { data } = route.params || {}
    const { removeFood, cart: initialItems, addFood, updateQuantity } = useFood()
    const { total_amount: initialTotalAmount, restaurant } = data || {}
    const { location } = useLocation()

    // State management
    const [token, setToken] = useState(null)
    const [items, setItems] = useState(initialItems)
    const [totalAmount, setTotalAmount] = useState(initialTotalAmount)
    const [selectedCoupon, setSelectedCoupon] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState("CARD")
    const [isLoading, setIsLoading] = useState(false)
    const [showAddressModal, setShowAddressModal] = useState(false)
    const [deliveryAddress, setDeliveryAddress] = useState(null)
    const [address, setAddress] = useState(null)
    const [imageError, setImageError] = useState(false)

    // Coupon states
    const [coupons, setCoupons] = useState([])
    const [couponsLoading, setCouponsLoading] = useState(false)
    const [couponsError, setCouponsError] = useState(null)

    // Fetch user's current location and token
    const findCurrent = useCallback(async () => {
        try {
            const data = await axios.post(`http://192.168.1.11:3100/Fetch-Current-Location`, {
                lat: location?.coords?.latitude,
                lng: location?.coords?.longitude,
            })
            setAddress(data.data.data.address)

            const gmail_token = await tokenCache.getToken("auth_token")
            const db_token = await tokenCache.getToken("auth_token_db")
            const _token = db_token || gmail_token
            setToken(_token)
        } catch (error) {
            console.log("Location fetch error:", error)
        }
    }, [location])

    // Fetch available coupons
    const fetchCoupons = useCallback(async () => {
        setCouponsLoading(true)
        setCouponsError(null)
        try {
            const response = await axios.get("http://192.168.1.11:3100/api/v1/tiffin/tiffin-coupons")
            if (response.data.success) {
                // Filter only active coupons
                const activeCoupons = response.data.data.filter((coupon) => coupon.active)
                setCoupons(activeCoupons)
            } else {
                setCouponsError("Failed to load coupons")
            }
        } catch (error) {
            console.error("Coupon fetch error:", error)
            setCouponsError("Network error. Please try again.")
        } finally {
            setCouponsLoading(false)
        }
    }, [])

    useEffect(() => {
        findCurrent()
        fetchCoupons()
    }, [findCurrent, fetchCoupons])

    // Update total amount when items change
    useEffect(() => {
        updateTotalAmount()
    }, [items])

    const updateTotalAmount = useCallback(() => {
        if (!items || items.length === 0) return
        const newTotal = items.reduce((sum, item) => sum + item.food_price * item.quantity, 0)
        setTotalAmount(newTotal)
    }, [items])

    // Handle quantity updates with useCallback for performance
    const handleUpdateQuantity = useCallback(
        (itemId, newQuantity) => {
            if (newQuantity < 1) {
                handleRemoveItem(itemId)
                return
            }

            const updatedItems = items?.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
            setItems(updatedItems)
            updateQuantity(itemId, newQuantity)
        },
        [items, updateQuantity],
    )

    // Handle item removal with useCallback
    const handleRemoveItem = useCallback(
        (itemId) => {
            const updatedItems = items.filter((item) => item._id !== itemId)
            setItems(updatedItems)
            removeFood(itemId)
        },
        [items, removeFood],
    )

    // Calculate discount with useMemo for performance
    const calculateDiscount = useMemo(() => {
        if (!selectedCoupon || totalAmount < selectedCoupon.min_order_amount) return 0

        const { discount_type, max_discount, discount } = selectedCoupon

        if (discount_type === "percentage") {
            const discountAmount = totalAmount * (discount / 100)
            return max_discount ? Math.min(discountAmount, max_discount) : discountAmount
        }

        return discount || 0
    }, [selectedCoupon, totalAmount])

    // Calculate final amount with useMemo
    const finalAmount = useMemo(() => {
        return totalAmount - calculateDiscount
    }, [totalAmount, calculateDiscount])

    // Handle coupon selection
    const handleSelectCoupon = useCallback(
        (coupon) => {
            if (selectedCoupon && selectedCoupon._id === coupon._id) {
                // If the same coupon is selected, deselect it
                setSelectedCoupon(null)
                Alert.alert("Coupon Removed", "Coupon has been removed successfully")
            } else {
                // Otherwise, select the new coupon
                setSelectedCoupon(coupon)
                Alert.alert("Coupon Applied", `${coupon.Coupon_Code} applied successfully!`)
            }
        },
        [selectedCoupon],
    )

    // Handle place order
    const handlePlaceOrder = useCallback(async () => {
        if (!token) {
            const gmail_token = await tokenCache.getToken("auth_token")
            const db_token = await tokenCache.getToken("auth_token_db")
            const _token = db_token || gmail_token
            setToken(_token)
        }

        if (!deliveryAddress) {
            setShowAddressModal(true)
            return
        }

        setIsLoading(true)

        try {
            const response = await axios.post(
                `http://192.168.1.11:3100/api/v1/tiffin/create_order_of_food`,
                {
                    order_items: items,
                    orderId: "ORD" + Math.floor(Math.random() * 1000000),
                    deliveryAddress,
                    paymentMethod,
                    total_payable: finalAmount,
                    coupon_applied: selectedCoupon,
                    user_lat: location?.coords?.latitude,
                    user_lng: location?.coords?.longitude,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                },
            )

            if (response && response.data && response.data.orderDetails) {
                await SecureStore.setItemAsync("ongoing_order", JSON.stringify([response.data.orderDetails]))

                navigation.navigate("Order_Process", {
                    order_id: response.data.orderDetails,
                })

                Alert.alert(
                    "Order Placed Successfully!",
                    "Your order has been placed successfully. You will receive updates soon.",
                    [{ text: "OK" }],
                )
            } else {
                throw new Error("Order details are missing in the response.")
            }
        } catch (error) {
            console.error("Order placement error:", error)
            const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred."

            Alert.alert("Order Failed!", errorMessage, [{ text: "OK" }])
        } finally {
            setIsLoading(false)
        }
    }, [token, deliveryAddress, items, paymentMethod, finalAmount, selectedCoupon, location, navigation])

    // Render cart item component
    const renderCartItem = useCallback(
        (item) => (
            <View key={item._id} style={styles.cartItem}>
                <Image
                    source={imageError ? require("./no-image.jpeg") : { uri: item.images.url }}
                    onError={() => setImageError(true)}
                    style={styles.foodImage}
                />
                <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{item.food_name}</Text>
                    <Text style={styles.foodDescription} numberOfLines={1}>
                        {item.food_description || "Delicious food item"}
                    </Text>
                    <Text style={styles.foodPrice}>₹{(item.food_price * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.quantityContainer}>
                    <TouchableOpacity
                        onPress={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                        style={styles.quantityButton}
                    >
                        <Icon name="minus" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                        onPress={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                        style={styles.quantityButton}
                    >
                        <Icon name="plus" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        ),
        [handleUpdateQuantity, imageError],
    )

    // Render coupons section
    const renderCoupons = useCallback(() => {
        if (couponsLoading) {
            return (
                <View style={styles.couponsContainer}>
                    <Text style={styles.sectionTitle}>Available Coupons</Text>
                    <View style={styles.couponLoadingContainer}>
                        <ActivityIndicator size="small" color="#E23744" />
                        <Text style={styles.couponLoadingText}>Loading coupons...</Text>
                    </View>
                </View>
            )
        }

        if (couponsError) {
            return (
                <View style={styles.couponsContainer}>
                    <Text style={styles.sectionTitle}>Available Coupons</Text>
                    <View style={styles.couponErrorContainer}>
                        <Icon name="alert-circle-outline" size={24} color="#E23744" />
                        <Text style={styles.couponErrorText}>{couponsError}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={fetchCoupons}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )
        }

        if (coupons.length === 0) {
            return (
                <View style={styles.couponsContainer}>
                    <Text style={styles.sectionTitle}>Available Coupons</Text>
                    <View style={styles.noCouponsContainer}>
                        <Icon name="ticket-percent-outline" size={24} color="#999" />
                        <Text style={styles.noCouponsText}>No coupons available at the moment</Text>
                    </View>
                </View>
            )
        }

        return (
            <View style={styles.couponsContainer}>
                <Text style={styles.sectionTitle}>Available Coupons</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.couponsScrollContainer}
                >
                    {coupons.map((coupon) => {
                        const isDisabled = totalAmount < coupon.min_order_amount
                        const isSelected = selectedCoupon && selectedCoupon._id === coupon._id

                        return (
                            <TouchableOpacity
                                key={coupon._id}
                                style={[styles.couponItem, isSelected && styles.selectedCoupon, isDisabled && styles.disabledCoupon]}
                                onPress={() => !isDisabled && handleSelectCoupon(coupon)}
                                disabled={isDisabled}
                                activeOpacity={0.7}
                            >
                                <View style={styles.couponHeader}>
                                    <Icon name="ticket-percent" size={20} color={isSelected ? "#E23744" : "#666"} />
                                    <Text style={[styles.couponTitle, isSelected && styles.selectedCouponText]}>{coupon.title}</Text>
                                </View>

                                <View style={[styles.couponBadge, isSelected && styles.selectedCouponBadge]}>
                                    <Text style={[styles.couponCode, isSelected && styles.selectedCouponCodeText]}>
                                        {coupon.Coupon_Code}
                                    </Text>
                                </View>

                                <View style={styles.couponDetails}>
                                    <Text style={styles.couponDetailText}>
                                        {coupon.discount_type === "percentage" ? `${coupon.discount}% off` : `₹${coupon.discount} off`}
                                    </Text>
                                    {coupon.max_discount && <Text style={styles.couponDetailText}>Up to ₹{coupon.max_discount}</Text>}
                                    <Text style={[styles.couponMinOrder, isDisabled && styles.couponMinOrderHighlight]}>
                                        Min order: ₹{coupon.min_order_amount}
                                    </Text>
                                </View>

                                {isSelected && (
                                    <View style={styles.appliedTag}>
                                        <Text style={styles.appliedTagText}>APPLIED</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )
                    })}
                </ScrollView>
            </View>
        )
    }, [coupons, couponsLoading, couponsError, totalAmount, selectedCoupon, handleSelectCoupon, fetchCoupons])

    // Render delivery address section
    const renderDeliveryAddress = useCallback(
        () => (
            <View style={styles.addressContainer}>
                <View style={styles.sectionTitleContainer}>
                    <Icon name="map-marker" size={22} color="#E23744" />
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    {deliveryAddress && (
                        <TouchableOpacity style={styles.changeButton} onPress={() => setShowAddressModal(true)}>
                            <Text style={styles.changeText}>Change</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {deliveryAddress ? (
                    <View style={styles.addressContent}>
                        <View style={styles.addressDetails}>
                            <View style={styles.addressTypeContainer}>
                                <Text style={styles.addressType}>{deliveryAddress.addressType || "Home"}</Text>
                                {deliveryAddress.isDefault && (
                                    <View style={styles.defaultBadge}>
                                        <Text style={styles.defaultBadgeText}>Default</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.addressText}>
                                {`${deliveryAddress.flatNo}, ${deliveryAddress.street}`}
                                {deliveryAddress.landmark ? `, ${deliveryAddress.landmark}` : ""}
                                {` - ${deliveryAddress.pincode}`}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.addAddressButton} onPress={() => setShowAddressModal(true)}>
                        <Icon name="plus" size={20} color="#FFFFFF" />
                        <Text style={styles.addAddressText}>Add Delivery Address</Text>
                    </TouchableOpacity>
                )}
            </View>
        ),
        [deliveryAddress],
    )

    //   console.log("restaurant?.restaurant_address",restaurant?.restaurant_address)
    // Render payment methods section
    const renderPaymentMethods = useCallback(() => {
        const paymentMethods = [
            {
                id: "CARD",
                name: "Online Payment",
                icon: "credit-card",
                description: "Pay securely with credit/debit card or UPI",
            },
            {
                id: "COD",
                name: "Cash on Delivery",
                icon: "cash",
                description: "Pay when your order arrives",
            },
        ]

        return (
            <View style={styles.paymentMethodsContainer}>
                <View style={styles.sectionTitleContainer}>
                    <Icon name="wallet" size={22} color="#E23744" />
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                </View>

                {paymentMethods.map((method) => (
                    <TouchableOpacity
                        key={method.id}
                        style={[styles.paymentMethod, paymentMethod === method.id && styles.selectedPayment]}
                        onPress={() => setPaymentMethod(method.id)}
                    >
                        <View style={styles.paymentMethodContent}>
                            <View
                                style={[
                                    styles.paymentIconContainer,
                                    paymentMethod === method.id && styles.selectedPaymentIconContainer,
                                ]}
                            >
                                <Icon name={method.icon} size={20} color={paymentMethod === method.id ? "#FFFFFF" : "#666"} />
                            </View>

                            <View style={styles.paymentMethodInfo}>
                                <Text style={[styles.paymentMethodName, paymentMethod === method.id && styles.selectedPaymentText]}>
                                    {method.name}
                                </Text>
                                <Text style={styles.paymentMethodDescription}>{method.description}</Text>
                            </View>
                        </View>

                        <View style={[styles.radioButton, paymentMethod === method.id && styles.radioButtonSelected]}>
                            {paymentMethod === method.id && <View style={styles.radioButtonInner} />}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        )
    }, [paymentMethod])

    // Render bill details section
    const renderBillDetails = useCallback(() => {
        const deliveryFee = 40
        const packagingFee = 15
        const taxes = Math.round(totalAmount * 0.05)

        const finalPayableAmount = finalAmount + deliveryFee + packagingFee + taxes

        return (
            <View style={styles.billDetailsContainer}>
                <View style={styles.sectionTitleContainer}>
                    <Icon name="receipt" size={22} color="#E23744" />
                    <Text style={styles.sectionTitle}>Bill Details</Text>
                </View>

                <View style={styles.billItem}>
                    <Text style={styles.billItemLabel}>Item Total</Text>
                    <Text style={styles.billItemValue}>₹{totalAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.billItem}>
                    <Text style={styles.billItemLabel}>Delivery Fee</Text>
                    <Text style={styles.billItemValue}>₹{deliveryFee.toFixed(2)}</Text>
                </View>

                <View style={styles.billItem}>
                    <Text style={styles.billItemLabel}>Packaging Fee</Text>
                    <Text style={styles.billItemValue}>₹{packagingFee.toFixed(2)}</Text>
                </View>

                <View style={styles.billItem}>
                    <Text style={styles.billItemLabel}>Taxes</Text>
                    <Text style={styles.billItemValue}>₹{taxes.toFixed(2)}</Text>
                </View>

                {calculateDiscount > 0 && (
                    <View style={styles.billItem}>
                        <Text style={styles.billItemLabel}>Discount</Text>
                        <Text style={styles.discountText}>- ₹{calculateDiscount.toFixed(2)}</Text>
                    </View>
                )}

                <View style={styles.totalItem}>
                    <Text style={styles.totalText}>To Pay</Text>
                    <Text style={styles.totalValue}>₹{finalPayableAmount.toFixed(2)}</Text>
                </View>

                {calculateDiscount > 0 && (
                    <View style={styles.savingContainer}>
                        <Icon name="tag" size={16} color="#4CAF50" />
                        <Text style={styles.savingText}>You saved ₹{calculateDiscount.toFixed(2)} on this order!</Text>
                    </View>
                )}
            </View>
        )
    }, [totalAmount, finalAmount, calculateDiscount])

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Checkout</Text>
                    <View style={styles.headerRight} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Restaurant Info */}
                    <View style={styles.restaurantContainer}>
                        <View style={styles.restaurantInfo}>
                            <Text style={styles.restaurantName}>
                                {restaurant?.restaurant_name || "Restaurant Name"}
                            </Text>
                            <Text style={styles.restaurantAddress}>
                                {restaurant?.restaurant_address
                                    ? `${restaurant.restaurant_address.street || ''}, ${restaurant.restaurant_address.city || ''}, ${restaurant.restaurant_address.state || ''} - ${restaurant.restaurant_address.zip || ''}`
                                    : "Restaurant Address"}
                            </Text>
                        </View>
                        <View style={styles.deliveryTimeContainer}>
                            <Icon name="clock-outline" size={16} color="#666" />
                            <Text style={styles.deliveryTimeText}>25-30 min</Text>
                        </View>
                    </View>


                    {/* Order Items */}
                    <View style={styles.cartContainer}>
                        <View style={styles.sectionTitleContainer}>
                            <Icon name="food" size={22} color="#E23744" />
                            <Text style={styles.sectionTitle}>Your Order</Text>
                            <Text style={styles.itemCount}>
                                ({items?.length || 0} {items?.length === 1 ? "item" : "items"})
                            </Text>
                        </View>
                        {items?.map(renderCartItem)}
                    </View>

                    {/* Delivery Address */}
                    {renderDeliveryAddress()}

                    {/* Coupons */}
                    {renderCoupons()}

                    {/* Add-ons */}
                    <AddOn restaurant_id={restaurant} />

                    {/* Payment Methods */}
                    {renderPaymentMethods()}

                    {/* Bill Details */}
                    {renderBillDetails()}
                </ScrollView>

                {/* Checkout Button */}
                <View style={styles.checkoutButtonContainer}>
                    <View style={styles.checkoutSummary}>
                        <View>
                            <Text style={styles.checkoutTotalLabel}>Total Amount</Text>
                            <Text style={styles.totalAmount}>
                                ₹{(finalAmount + 40 + 15 + Math.round(totalAmount * 0.05)).toFixed(2)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.checkoutButton, (!deliveryAddress || isLoading) && styles.disabledButton]}
                            onPress={handlePlaceOrder}
                            disabled={!deliveryAddress || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.checkoutButtonText}>Place Order</Text>
                                    <Icon name="arrow-right" size={20} color="#FFFFFF" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Address Modal */}
                <AddressModal
                    visible={showAddressModal}
                    location_data={address}
                    onClose={() => setShowAddressModal(false)}
                    onSave={(address) => setDeliveryAddress(address)}
                />
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#EEEEEE",
        elevation: 2,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333333",
    },
    headerRight: {
        width: 40,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    restaurantContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    restaurantInfo: {
        flex: 1,
    },
    restaurantName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333333",
        marginBottom: 4,
    },
    restaurantAddress: {
        fontSize: 14,
        color: "#666666",
    },
    deliveryTimeContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0F0F0",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    deliveryTimeText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#666666",
        marginLeft: 4,
    },
    sectionTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333333",
        marginLeft: 8,
        flex: 1,
    },
    itemCount: {
        fontSize: 14,
        color: "#666666",
    },
    cartContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    cartItem: {
        flexDirection: "row",
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    foodImage: {
        width: 70,
        height: 70,
        borderRadius: 8,
        marginRight: 12,
    },
    foodInfo: {
        flex: 1,
        justifyContent: "center",
    },
    foodName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333333",
        marginBottom: 4,
    },
    foodDescription: {
        fontSize: 13,
        color: "#666666",
        marginBottom: 6,
    },
    foodPrice: {
        fontSize: 15,
        fontWeight: "700",
        color: "#333333",
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        backgroundColor: "#E23744",
        borderRadius: 20,
        padding: 4,
    },
    quantityButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#E23744",
        justifyContent: "center",
        alignItems: "center",
    },
    quantityText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginHorizontal: 10,
    },
    addressContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    changeButton: {
        paddingHorizontal: 10,
    },
    changeText: {
        color: "#E23744",
        fontSize: 14,
        fontWeight: "600",
    },
    addressContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    addressDetails: {
        flex: 1,
    },
    addressTypeContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
    },
    addressType: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333333",
        marginRight: 8,
    },
    defaultBadge: {
        backgroundColor: "#E8F5E9",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    defaultBadgeText: {
        fontSize: 12,
        color: "#4CAF50",
        fontWeight: "500",
    },
    addressText: {
        fontSize: 14,
        color: "#666666",
        lineHeight: 20,
    },
    addAddressButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#E23744",
        paddingVertical: 12,
        borderRadius: 8,
    },
    addAddressText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
    couponsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    couponsScrollContainer: {
        paddingBottom: 8,
    },
    couponLoadingContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    couponLoadingText: {
        marginLeft: 10,
        fontSize: 14,
        color: "#666666",
    },
    couponErrorContainer: {
        alignItems: "center",
        padding: 20,
    },
    couponErrorText: {
        marginTop: 8,
        fontSize: 14,
        color: "#E23744",
        textAlign: "center",
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: "#E23744",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    noCouponsContainer: {
        alignItems: "center",
        padding: 20,
    },
    noCouponsText: {
        marginTop: 8,
        fontSize: 14,
        color: "#666666",
        textAlign: "center",
    },
    couponItem: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        padding: 12,
        marginRight: 12,
        width: 180,
        borderWidth: 1,
        borderColor: "#EEEEEE",
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        position: "relative",
    },
    selectedCoupon: {
        borderColor: "#E23744",
        borderWidth: 2,
        backgroundColor: "#FFF8F8",
    },
    disabledCoupon: {
        opacity: 0.7,
    },
    couponHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    couponTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#333333",
        marginLeft: 6,
        flex: 1,
    },
    selectedCouponText: {
        color: "#E23744",
    },
    couponBadge: {
        backgroundColor: "#F0F0F0",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    selectedCouponBadge: {
        backgroundColor: "#FFE8E8",
    },
    couponCode: {
        fontSize: 14,
        fontWeight: "700",
        color: "#333333",
        textAlign: "center",
    },
    selectedCouponCodeText: {
        color: "#E23744",
    },
    couponDetails: {
        marginTop: 4,
    },
    couponDetailText: {
        fontSize: 12,
        color: "#666666",
        marginBottom: 2,
    },
    couponMinOrder: {
        fontSize: 12,
        color: "#666666",
        marginTop: 4,
    },
    couponMinOrderHighlight: {
        color: "#E23744",
        fontWeight: "500",
    },
    appliedTag: {
        position: "absolute",
        top: 0,
        right: 0,
        backgroundColor: "#E23744",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomLeftRadius: 8,
    },
    appliedTagText: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "700",
    },
    paymentMethodsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    paymentMethod: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#EEEEEE",
        borderRadius: 8,
        marginBottom: 12,
        paddingHorizontal: 12,
    },
    selectedPayment: {
        borderColor: "#E23744",
        backgroundColor: "#FFF8F8",
    },
    paymentMethodContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    paymentIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F0F0F0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    selectedPaymentIconContainer: {
        backgroundColor: "#E23744",
    },
    paymentMethodInfo: {
        flex: 1,
    },
    paymentMethodName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333333",
        marginBottom: 4,
    },
    selectedPaymentText: {
        color: "#E23744",
    },
    paymentMethodDescription: {
        fontSize: 13,
        color: "#666666",
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#CCCCCC",
        justifyContent: "center",
        alignItems: "center",
    },
    radioButtonSelected: {
        borderColor: "#E23744",
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: "#E23744",
    },
    billDetailsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    billItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    billItemLabel: {
        fontSize: 14,
        color: "#666666",
    },
    billItemValue: {
        fontSize: 14,
        color: "#333333",
        fontWeight: "500",
    },
    discountText: {
        color: "#4CAF50",
        fontSize: 14,
        fontWeight: "500",
    },
    totalItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#EEEEEE",
        marginTop: 4,
    },
    totalText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#333333",
    },
    totalValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#E23744",
    },
    savingContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#E8F5E9",
        padding: 10,
        borderRadius: 6,
        marginTop: 12,
    },
    savingText: {
        fontSize: 13,
        color: "#4CAF50",
        fontWeight: "500",
        marginLeft: 6,
    },
    checkoutButtonContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#EEEEEE",
        elevation: 10,
    },
    checkoutSummary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    checkoutTotalLabel: {
        fontSize: 12,
        color: "#666666",
        marginBottom: 4,
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333333",
    },
    checkoutButton: {
        backgroundColor: "#E23744",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: "row",
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#CCCCCC",
    },
    checkoutButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "700",
        marginRight: 8,
    },
})

export default Checkout

