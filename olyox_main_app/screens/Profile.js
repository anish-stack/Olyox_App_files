import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,Image, Dimensions, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { tokenCache } from '../Auth/cache';
import { find_me } from '../utils/helpers';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function UserProfile() {
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('Orders');
    const [userData, setUserData] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const user = await find_me();
            setUserData(user.user);
                  const gmail_token = await tokenCache.getToken('auth_token');
                    const db_token = await tokenCache.getToken('auth_token_db');
            const token = db_token || gmail_token
            const response = await axios.get('http://192.168.1.4:3000/api/v1/user/find-Orders-details', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrderData(response.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { name: 'Orders', icon: 'restaurant-menu', count: orderData?.orderCounts?.foodOrders || 0 },
        { name: 'Rides', icon: 'local-taxi', count: orderData?.orderCounts?.rideRequests || 0 },
        { name: 'Parcels', icon: 'local-shipping', count: orderData?.orderCounts?.parcels || 0 },
        { name: 'Hotels', icon: 'hotel', count: orderData?.orderCounts?.hotelBookings || 0 },
    ];

    const renderOrderCard = (order) => (
        <AnimatedTouchableOpacity
       
            style={styles.orderCard}
            onPress={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
        >
            <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>Order #{order.Order_Id}</Text>
                    <Text style={styles.orderDate}>
                        {new Date(order.order_date).toLocaleDateString()}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: order.status === 'Pending' ? '#fef3c7' : '#dcfce7' }]}>
                    <Text style={[styles.statusText, { color: order.status === 'Pending' ? '#92400e' : '#166534' }]}>
                        {order.status}
                    </Text>
                </View>
            </View>

            {expandedOrder === order._id && (
                <Animated.View style={styles.orderDetails}>
                    {order.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <Image
                                source={{ uri: item.foodItem_id.images.url }}
                                style={styles.foodImage}
                            />
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.foodItem_id.food_name}</Text>
                                <Text style={styles.itemDesc}>{item.foodItem_id.description}</Text>
                                <View style={styles.quantityPrice}>
                                    <Text style={styles.quantity}>Qty: {item.quantity}</Text>
                                    <Text style={styles.price}>₹{item.price}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                    <View style={styles.deliveryInfo}>
                        <Text style={styles.deliveryAddress}>
                            Delivery to: {order.address_details.flatNo}, {order.address_details.street}
                        </Text>
                        <Text style={styles.totalPrice}>Total: ₹{order.totalPrice}</Text>
                    </View>
                </Animated.View>
            )}
        </AnimatedTouchableOpacity>
    );

    const renderRideCard = (ride) => (
        <AnimatedTouchableOpacity
        
            style={styles.orderCard}
            onPress={() => setExpandedOrder(expandedOrder === ride._id ? null : ride._id)}
        >
            <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{ride.vehicleType} Ride</Text>
                    <Text style={styles.orderDate}>
                        {new Date(ride.createdAt).toLocaleDateString()}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.statusText, { color: '#166534' }]}>
                        {ride.rideStatus}
                    </Text>
                </View>
            </View>

            {expandedOrder === ride._id && (
                <Animated.View  style={styles.orderDetails}>
                    <View style={styles.rideDetails}>
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={20} color="#6366f1" />
                            <Text style={styles.locationText}>{ride.pickup_desc}</Text>
                        </View>
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={20} color="#ef4444" />
                            <Text style={styles.locationText}>{ride.drop_desc}</Text>
                        </View>
                        <View style={styles.rideStats}>
                            <Text style={styles.statItem}>Distance: {ride.kmOfRide} km</Text>
                            <Text style={styles.statItem}>ETA: {ride.EtaOfRide}</Text>
                        </View>
                    </View>
                </Animated.View>
            )}
        </AnimatedTouchableOpacity>
    );

    const renderParcelCard = (parcel) => (
        <AnimatedTouchableOpacity
        
            style={styles.orderCard}
            onPress={() => setExpandedOrder(expandedOrder === parcel._id ? null : parcel._id)}
        >
            <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>Parcel Delivery</Text>
                    <Text style={styles.orderDate}>
                        {new Date(parcel.createdAt).toLocaleDateString()}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.statusText, { color: '#166534' }]}>
                        {parcel.status}
                    </Text>
                </View>
            </View>

            {expandedOrder === parcel._id && (
                <Animated.View  style={styles.orderDetails}>
                    <View style={styles.parcelDetails}>
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={20} color="#6366f1" />
                            <Text style={styles.locationText}>{parcel.pickupLocation}</Text>
                        </View>
                        <View style={styles.locationInfo}>
                            <Ionicons name="location" size={20} color="#ef4444" />
                            <Text style={styles.locationText}>{parcel.dropoffLocation}</Text>
                        </View>
                        <View style={styles.parcelStats}>
                            <Text style={styles.statItem}>
                                Weight: {parcel.parcelDetails.weight} kg
                            </Text>
                            <Text style={styles.statItem}>
                                Price: ₹{parcel.price}
                            </Text>
                        </View>
                    </View>
                </Animated.View>
            )}
        </AnimatedTouchableOpacity>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'Orders':
                return orderData?.OrderFood.map(order => renderOrderCard(order));
            case 'Rides':
                return orderData?.RideData.map(ride => renderRideCard(ride));
            case 'Parcels':
                return orderData?.Parcel.map(parcel => renderParcelCard(parcel));
            case 'Hotels':
                return (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="hotel" size={64} color="#94a3b8" />
                        <Text style={styles.emptyStateText}>No hotel bookings yet</Text>
                    </View>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <LinearGradient
                colors={['#6366f1', '#818cf8']}
                style={styles.header}
            >
                <View style={styles.profileSection}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
                        style={styles.avatar}
                    />
                    <Text style={styles.name}>{userData?.name}</Text>
                    <Text style={styles.email}>{userData?.email}</Text>
                </View>
            </LinearGradient>

            <View style={styles.statsContainer}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.statCard}
                        onPress={() => setActiveTab(tab.name)}
                    >
                        <MaterialIcons name={tab.icon} size={24} color="#6366f1" />
                        <Text style={styles.statCount}>{tab.count}</Text>
                        <Text style={styles.statLabel}>{tab.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>{activeTab} History</Text>
                {renderContent()}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    profileSection: {
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 12,
    },
    email: {
        fontSize: 16,
        color: '#e0e7ff',
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        marginTop: -30,
    },
    statCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        width: width / 4 - 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statCount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 15,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    orderDate: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderDetails: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 15,
    },
    itemRow: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    foodImage: {
        width: 70,
        height: 70,
        borderRadius: 10,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 15,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    itemDesc: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    quantityPrice: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    quantity: {
        fontSize: 14,
        color: '#6b7280',
    },
    price: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    deliveryInfo: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
    },
    deliveryAddress: {
        fontSize: 14,
        color: '#4b5563',
    },
    totalPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 8,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    locationText: {
        marginLeft: 10,
        flex: 1,
        fontSize: 14,
        color: '#4b5563',
    },
    rideStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        padding: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
    },
    statItem: {
        fontSize: 14,
        color: '#4b5563',
    },
    emptyState: {
        alignItems: 'center',
        padding: 30,
    },
    emptyStateText: {
        marginTop: 12,
        fontSize: 16,
        color: '#94a3b8',
        textAlign: 'center',
    },
});
