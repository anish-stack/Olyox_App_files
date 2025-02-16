import { useState, useMemo, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import { useFood } from "../../context/Food_Context/Food_context"
import AddressModal from "./AddressModal"
import { useLocation } from "../../context/LocationContext"
import axios from "axios"
import AddOn from "./AddOn"
import { tokenCache } from "../../Auth/cache"
import * as SecureStore from 'expo-secure-store';

const Checkout = () => {
    const route = useRoute()
    const navigation = useNavigation()
    const { data } = route.params || {}
    // console.log("data",data)renderCartItem
    const [token, setToken] = useState(null)
    const { removeFood, cart: initialItems, addFood, updateQuantity } = useFood()
    const { total_amount: initialTotalAmount, restaurant } = data || {}
    const [items, setItems] = useState(initialItems)
    const [totalAmount, setTotalAmount] = useState(initialTotalAmount)
    const [selectedCoupon, setSelectedCoupon] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState("UPI")
    const [isLoading, setIsLoading] = useState(false)
    const [showAddressModal, setShowAddressModal] = useState(false)
    const [deliveryAddress, setDeliveryAddress] = useState(null)
    const [address, setAddreess] = useState(null)
    const { location } = useLocation()

    const findCurrent = async () => {
        try {
            const data = await axios.post(`http://192.168.50.28:3000/Fetch-Current-Location`, {
                lat: location?.coords?.latitude,
                lng: location?.coords?.longitude
            })
            setAddreess(data.data.data.address)
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const _token = db_token || gmail_token
            setToken(_token)
            // console.log(data.data.data.address)
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        findCurrent()
        // console.log(address)
    }, [location])
    const paymentMethods = [
        {
            id: "CARD",
            name: "Online",
            icon: "credit-card",
            options: [],
        },
        {
            id: "COD",
            name: "Cash on Delivery",
            icon: "cash",
            options: [],
        },
    ]


    const coupons = [
        {
            id: 1,
            title: "50% Off Upto ₹120",
            Coupon_Code: "NEWUSER50",
            min_order_amount: 599,
            max_discount: 120,
            discount_type: "percentage",
            discount: 50,
            active: true,
        },
        {
            id: 2,
            title: "Flat ₹100 Off",
            Coupon_Code: "FLAT100",
            min_order_amount: 799,
            max_discount: 100,
            discount_type: "flat",
            discount: 100,
            active: true,
        },
        {
            id: 3,
            title: "30% Off Upto ₹150",
            Coupon_Code: "SAVE30",
            min_order_amount: 699,
            max_discount: 150,
            discount_type: "percentage",
            discount: 30,
            active: true,
        },
        {
            id: 4,
            title: "₹200 Off on ₹999+ Orders",
            Coupon_Code: "BIGDEAL",
            min_order_amount: 999,
            max_discount: 200,
            discount_type: "flat",
            discount: 200,
            active: true,
        },
        {
            id: 5,
            title: "Buy 1 Get 1 Free",
            Coupon_Code: "BOGO",
            min_order_amount: 499,
            max_discount: null,
            discount_type: "bogo",
            active: true,
        },
    ]

    useEffect(() => {
        updateTotalAmount()
    }, [updateQuantity]) // Update when items change

    const updateTotalAmount = () => {
        const newTotal = items?.reduce((sum, item) => sum + item.food_price * item.quantity, 0)
        console.log(newTotal)
        setTotalAmount(newTotal)
    }

    const handleUpdateQuantity = (itemId, newQuantity) => {
        if (newQuantity < 1) {
            handleRemoveItem(itemId)

            return
        }

        const updatedItems = items?.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item))
        setItems(updatedItems)
        updateQuantity(itemId, newQuantity)
    }

    const handleRemoveItem = (itemId) => {
        const updatedItems = items.filter((item) => item._id !== itemId)
        setItems(updatedItems)
        removeFood(itemId)
    }

    //   console.log("ss",totalAmount)
    const calculateDiscount = useMemo(() => {
        if (!selectedCoupon || totalAmount < selectedCoupon.min_order_amount) return 0
        const { discount_type, max_discount, discount } = selectedCoupon
        if (discount_type === "percentage") {
            const discountAmount = totalAmount * (discount / 100)
            return Math.min(discountAmount, max_discount)
        }
        return max_discount
    }, [selectedCoupon, totalAmount])

    const finalAmount = totalAmount - calculateDiscount

    const renderCartItem = (item) => (
        <View key={item._id} style={styles.cartItem}>
            <Image source={{ uri: item.images.url }} style={styles.foodImage} />
            <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{item.food_name}</Text>
                <Text style={styles.foodPrice}>₹{(item.food_price * item.quantity)?.toFixed(2)}</Text>
            </View>
            <View style={styles.quantityContainer}>
                <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                    style={styles.quantityButton}
                >
                    <Icon name="minus" size={20} color="#E23744" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{item.quantity}</Text>
                <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                    style={styles.quantityButton}
                >
                    <Icon name="plus" size={20} color="#E23744" />
                </TouchableOpacity>
            </View>
        </View>
    )
    const renderCoupons = () => {
        const totalAmount = items?.reduce((sum, item) => sum + item.food_price * item.quantity, 0);

        return (
            <View style={styles.couponsContainer}>
                <Text style={styles.sectionTitle}>Available Coupons</Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {coupons?.map((coupon) => {
                        const isDisabled = totalAmount < coupon.min_order_amount;

                        return (
                            <TouchableOpacity
                                key={coupon.id}
                                style={[
                                    styles.couponItem,
                                    selectedCoupon?.id === coupon.id && styles.selectedCoupon,
                                    isDisabled && styles.disabledCoupon,
                                ]}
                                onPress={() => !isDisabled && setSelectedCoupon(coupon)}
                                disabled={isDisabled}
                                activeOpacity={0.7} // Smooth touch feedback
                            >
                                <View style={styles.couponContent}>
                                    <Text style={styles.couponTitle}>{coupon.title}</Text>
                                    <View style={styles.couponBadge}>
                                        <Text style={styles.couponCode}>{coupon.Coupon_Code}</Text>
                                    </View>
                                    {isDisabled && (
                                        <Text style={styles.couponNote}>Min Order: ₹{coupon.min_order_amount}</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };



    const renderDeliveryAddress = () => (
        <View style={styles.addressContainer}>
            <View style={styles.addressHeader}>
                {/* <Text style={styles.sectionTitle}>Delivery Address</Text> */}
                {deliveryAddress && (
                    <TouchableOpacity onPress={() => setShowAddressModal(true)}>
                        <Text style={styles.changeText}>Change</Text>
                    </TouchableOpacity>
                )}
            </View>
            {deliveryAddress ? (
                <View style={styles.addressContent}>

                    <View style={styles.addressDetails}>

                        <Text style={styles.addressText}>
                            {`${deliveryAddress.flatNo}, ${deliveryAddress.street}`}
                            {deliveryAddress.landmark ? `, ${deliveryAddress.landmark}` : ""}
                            {` - ${deliveryAddress.pincode}`}
                        </Text>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.addAddressButton} onPress={() => setShowAddressModal(true)}>
                    <Icon name="plus" size={24} color="#E23744" />
                    <Text style={styles.addAddressText}>Add Delivery Address</Text>
                </TouchableOpacity>
            )}
        </View>
    )

    const renderPaymentMethods = () => (
        <View style={styles.paymentMethodsContainer}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            {paymentMethods?.map((method) => (
                <TouchableOpacity
                    key={method.id}
                    style={[styles.paymentMethod, paymentMethod === method.id && styles.selectedPayment]}
                    onPress={() => setPaymentMethod(method.id)}
                >
                    <View style={styles.paymentMethodHeader}>
                        <View style={styles.paymentMethodLeft}>
                            <Icon name={method.icon} size={24} color={paymentMethod === method.id ? "#E23744" : "#666"} />
                            <Text style={[styles.paymentMethodText, paymentMethod === method.id && styles.selectedPaymentText]}>
                                {method.name}
                            </Text>
                        </View>
                        <Icon name={paymentMethod === method.id ? "chevron-up" : "chevron-down"} size={24} color="#666" />
                    </View>
                    {paymentMethod === method.id && method.options.length > 0 && (
                        <View style={styles.paymentOptions}>
                            {method?.options?.map((option) => (
                                <TouchableOpacity key={option} style={styles.paymentOption}>
                                    <Text style={styles.paymentOptionText}>{option}</Text>
                                    <Icon name="chevron-right" size={20} color="#666" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    )

    const handlePlaceOrder = async () => {
        if (!token) {
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const _token = db_token || gmail_token;
            setToken(_token);
        }
    
        if (!deliveryAddress) {
            setShowAddressModal(true);
            return;
        }
    
        setIsLoading(true);
    
        try {
            const response = await axios.post(
                `http://192.168.50.28:3000/api/v1/tiffin/create_order_of_food`,
                {
                    order_items: items,
                    orderId: "ORD" + Math.floor(Math.random() * 1000000),
                    deliveryAddress,
                    paymentMethod,
                    total_payable: totalAmount,
                    coupon_applied: selectedCoupon,
                    user_lat: location?.coords?.latitude,
                    user_lng: location?.coords?.longitude,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );
    
            // Check if the response is valid and contains the expected data
            if (response && response.data && response.data.orderDetails) {
                console.log(response.data.orderDetails);
    
                await SecureStore.setItemAsync('ongoing_order', JSON.stringify([response.data.orderDetails]));
                navigation.navigate('Order_Process', {
                    order_id: response.data.orderDetails,
                });
    
                Alert.alert(
                    "Order Placed Successfully!",
                    "Your order has been placed successfully. You will receive updates soon.",
                    [{ text: "OK", onPress: () => console.log("Order confirmed") }]
                );
            } else {
                throw new Error('Order details are missing in the response.');
            }
    
        } catch (error) {
            console.error("Order placement error:", error);
    
            // Ensure error response is available
            const errorMessage = error.response?.data?.message || error.message || "An unexpected error occurred.";
    
            Alert.alert(
                "Order Failed!",
                errorMessage,
                [{ text: "OK", onPress: () => console.log("Order failed") }]
            );
        } finally {
            setIsLoading(false);
        }
    };
    

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Checkout</Text>
                </View>

                {renderDeliveryAddress()}

                <View style={styles.cartContainer}>{initialItems?.map(renderCartItem)}</View>
                {renderCoupons()}
                <AddOn restaurant_id={restaurant} />
                {renderPaymentMethods()}

                <View style={styles.billDetailsContainer}>
                    <Text style={styles.sectionTitle}>Bill Details</Text>
                    <View style={styles.billItem}>
                        <Text>Item Total</Text>
                        <Text>₹{totalAmount?.toFixed(2)}</Text>
                    </View>
                    <View style={styles.billItem}>
                        <Text>Delivery Fee</Text>
                        <Text>₹40.00</Text>
                    </View>
                    {calculateDiscount > 0 && (
                        <View style={styles.billItem}>
                            <Text>Discount</Text>
                            <Text style={styles.discountText}>- ₹{calculateDiscount?.toFixed(2)}</Text>
                        </View>
                    )}
                    <View style={[styles.billItem, styles.totalItem]}>
                        <Text style={styles.totalText}>To Pay</Text>
                        <Text style={styles.totalText}>₹{(finalAmount + 40)?.toFixed(2)}</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.checkoutButtonContainer}>
                <View style={styles.checkoutSummary}>
                    <Text style={styles.totalAmount}>₹{(finalAmount + 40)?.toFixed(2)}</Text>
                    <TouchableOpacity
                        style={[styles.checkoutButton, !deliveryAddress && styles.disabledButton]}
                        onPress={handlePlaceOrder}

                        disabled={!deliveryAddress || isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.checkoutButtonText}>Place Order</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <AddressModal
                visible={showAddressModal}
                location_data={address}
                onClose={() => setShowAddressModal(false)}
                onSave={(address) => setDeliveryAddress(address)}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F8F8",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    headerTitle: {
        fontSize: 18,
        textAlign: 'center',
        fontWeight: "bold",
        marginLeft: 16,
    },
    addressContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    addressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    addressContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    addressDetails: {
        marginLeft: 12,
        flex: 1,
    },
    addressType: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 4,
    },
    addressText: {
        fontSize: 14,
        color: "#666",
        lineHeight: 20,
    },
    changeText: {
        color: "#E23744",
        fontSize: 14,
        fontWeight: "500",
    },
    addAddressButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderWidth: 1,
        borderColor: "#E23744",
        borderRadius: 8,
        justifyContent: "center",
    },
    addAddressText: {
        color: "#E23744",
        fontSize: 16,
        fontWeight: "500",
        marginLeft: 8,
    },
    cartContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    cartItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    foodImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    foodInfo: {
        flex: 1,
    },
    foodName: {
        fontSize: 16,
        fontWeight: "500",
        marginBottom: 4,
    },
    foodPrice: {
        fontSize: 14,
        color: "#666",
    },
    quantityContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8F8F8",
        borderRadius: 8,
        padding: 4,
    },
    quantityButton: {
        padding: 8,
    },
    quantityText: {
        fontSize: 16,
        fontWeight: "500",
        marginHorizontal: 12,
    },

    paymentMethodsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 8,
    },
    paymentMethod: {
        marginBottom: 12,
    },
    paymentMethodHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
    },
    paymentMethodLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    paymentMethodText: {
        fontSize: 16,
        marginLeft: 12,
        color: "#333",
    },
    selectedPaymentText: {
        color: "#E23744",
        fontWeight: "500",
    },
    paymentOptions: {
        marginLeft: 36,
    },
    paymentOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
    },
    paymentOptionText: {
        fontSize: 14,
        color: "#666",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
    },
    billDetailsContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        marginBottom: 100,
    },
    billItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    discountText: {
        color: "#4CAF50",
    },
    totalItem: {
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingTop: 8,
        marginTop: 8,
    },
    totalText: {
        fontSize: 16,
        fontWeight: "bold",
    },
    checkoutButtonContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
    },
    checkoutSummary: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    totalAmount: {
        fontSize: 18,
        fontWeight: "bold",
    },

    checkoutButton: {
        backgroundColor: "#E23744",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
        alignItems: "center",
    },
    disabledButton: {
        backgroundColor: "#E0E0E0",
    },
    checkoutButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    couponsContainer: {
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 8,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 12,
        color: "#333",
    },

    couponItem: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 4,
        marginRight: 12,
        minWidth: 180,
        borderWidth: 1
    },

    selectedCoupon: {
        borderColor: "#E23744",
        borderWidth: 2,
        backgroundColor: "#FFE8E8",
    },

    disabledCoupon: {
        backgroundColor: "#f0f0f0",
        opacity: 0.6,
    },

    couponContent: {
        alignItems: "center",
    },

    couponTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 6,
    },

    couponBadge: {
        backgroundColor: "#E23744",
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
    },

    couponCode: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#fff",
    },

    couponNote: {
        fontSize: 12,
        color: "#777",
        // marginTop: 6,
    },
})

export default Checkout

