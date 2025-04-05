import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Image, Dimensions, ActivityIndicator, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { tokenCache } from '../Auth/cache';
import { find_me } from '../utils/helpers';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import EditModal from './EditModel';

const { width } = Dimensions.get('window');

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function UserProfile() {

    const navigation = useNavigation();
    const [editModel, setEditModel] = useState(false);
    const [activeTab, setActiveTab] = useState('Orders');
    const [userData, setUserData] = useState(null);
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [image, setImage] = useState(null);

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
            const response = await axios.get('https://demoapi.olyox.com/api/v1/user/find-Orders-details', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrderData(response.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        (async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            console.log("status", status)
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access the media library.');
            }
        })();
    }, []);

    const pickImage = async () => {
        console.log("Opening image picker...");

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        console.log(result);

        if (!result.canceled && result.assets?.length > 0) {
            const imageUri = result.assets[0].uri;
          
            setImage(imageUri);
            
        }
    };
   
    const uploadImage = async () => {

        try {
            setLoading(true)
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const token = db_token || gmail_token;
           

            const form = new FormData();
            form.append('image', {
                uri: image,
                name: 'image.jpg',
                type: 'image/jpeg',
            });
          

            const response = await axios.post('https://demoapi.olyox.com/api/v1/user/update-profile', form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
            console.log("response", response.data);
            Alert.alert('Image uploaded successfully');
            fetchData();
            setImage(null);
            setLoading(false)

        } catch (error) {
            console.error('Error uploading image:', error);
            setLoading(false)

        }
    };

    const updateDetails = async ({ name, email }) => {
        try {
            setLoading(true);
    
            // Retrieve token from cache
            const gmail_token = await tokenCache.getToken('auth_token');
            const db_token = await tokenCache.getToken('auth_token_db');
            const token = db_token || gmail_token;
    
            // Initialize FormData
            const form = new FormData();
            
            // Only append non-empty fields
            if (name) form.append('name', name);
            if (email) form.append('email', email);
    
            // Check if there's anything to send in the form
            if (!name && !email) {
                Alert.alert('No changes detected', 'Please provide a name or email to update.');
                setLoading(false);
                return;
            }
    
            // Send the request to update profile
            const response = await axios.post('https://demoapi.olyox.com/api/v1/user/update-profile', form, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });
    
            console.log("response", response.data);
    
            // Refresh the data after the update
            fetchData();
    
            // Optionally reset image state if needed
            setImage(null);
    
            // Provide feedback and reset loading state
            Alert.alert('Profile updated successfully');
            setLoading(false);
            
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'There was an issue updating your profile. Please try again.');
            setLoading(false);
        }
    };
    

    useEffect(() => {
        if (image) {
            // Call the upload function when the image is set
            setTimeout(() => {
                uploadImage();
            }, 3000);
        }
    }, [image]);

    const tabs = [
        { name: 'Orders', icon: 'restaurant-menu', count: orderData?.orderCounts?.foodOrders || 0 },
        { name: 'Rides', icon: 'local-taxi', count: orderData?.orderCounts?.rideRequests || 0 },
        { name: 'Parcels', icon: 'local-shipping', count: orderData?.orderCounts?.parcels || 0 },
        { name: 'Hotels', icon: 'hotel', count: orderData?.orderCounts?.hotelBookings || 0 },
    ];

    const renderOrderCard = (order) => (
        <AnimatedTouchableOpacity
            key={order?._id.toString()}
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

    const renderRideCard = (ride) => {


        return (
            <AnimatedTouchableOpacity
                key={ride?._id.toString()}

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
                    <Animated.View style={styles.orderDetails}>
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
                            {ride.rideStatus !== "cancelled" && ride.rideStatus !== "completed" && (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate("RideStarted", { driver: ride?.rider, ride: ride })}
                                    style={{
                                        backgroundColor: "#007bff",
                                        paddingVertical: 12,
                                        paddingHorizontal: 20,
                                        borderRadius: 8,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginVertical: 10,
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 4,
                                        elevation: 3,
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#fff" }}>
                                        See Ride 🚖
                                    </Text>
                                </TouchableOpacity>
                            )}

                        </View>
                    </Animated.View>
                )}
            </AnimatedTouchableOpacity>
        )
    }

    const renderParcelCard = (parcel) => (
        <AnimatedTouchableOpacity
            key={parcel?._id.toString()}

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
                <Animated.View style={styles.orderDetails}>
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

    const renderHotelCards = (hotelData) => (
        <AnimatedTouchableOpacity
            key={hotelData?._id.toString()}

            style={styles.orderCard}
            onPress={() => setExpandedOrder(expandedOrder === hotelData._id ? null : hotelData._id)}
        >
            <View style={styles.orderHeader}>
                <Text>{hotelData?.HotelUserId?.hotel_name}</Text>
                <Text>View Details</Text>
            </View>
            {expandedOrder === hotelData._id && (
                <Animated.View style={styles.orderDetails}>
                    <View style={styles.hotelDataDetails}>
                        <View style={styles.checkInDateInfo}>
                            <Ionicons name="calendar" size={20} color="#6366f1" />
                            <Text style={styles.checkInDate}>{new Date(hotelData.checkInDate).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <View style={styles.checkInDateInfo}>
                            <Ionicons name="calendar" size={20} color="#ef4444" />
                            <Text style={styles.checkOutDate}>{new Date(hotelData.checkOutDate).toLocaleDateString('en-GB')}</Text>
                        </View>
                        <View style={styles.checkInDateInfo}>
                            <Ionicons name="calendar" size={20} color="#ef4444" />
                            <Text style={styles.paymentMode}>{hotelData.paymentMode}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.numberOfGuests}>
                                No Of Guests: {hotelData.numberOfGuests} kg
                            </Text>
                            <Text style={styles.statItem}>
                                status: {hotelData.status}
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
                return orderData?.Hotel.map(Hotel => renderHotelCards(Hotel));
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
                    <TouchableOpacity onPress={pickImage}>
                        <View style={{ position: 'relative' }}>
                            <Image
                                source={{ uri: userData?.profileImage?.image || image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
                                style={styles.avatar}
                            />
                            <View style={styles.avatarBadge}>
                                <Ionicons size={30} color={'#fff'} name='camera' />
                            </View>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.userName}>{userData?.name || "Please Add a good Name"}</Text>
                    <Text style={styles.contact}>{userData?.number}</Text>
                    <Text style={styles.email}>{userData?.email || "Please Add a Email"}</Text>
                    {/* <Text style={styles.email}>{userData?.isOtpVerify ? 'Verified User' : ''}</Text> */}
                    <View style={styles.containerButton}>
                        <TouchableOpacity style={styles.logoutButton} onPress={() => { }}>
                            <Text style={styles.logoutText}>Logout</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editButton} onPress={() => setEditModel(true)}>
                            <Text style={styles.editText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.statsContainer}>
                {tabs.map((tab, index) => (
                    <TouchableOpacity
                        key={index}
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
            <EditModal previousData={userData} visible={editModel} onClose={() => setEditModel(false)} onSubmit={updateDetails} />
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
        position: 'relative',
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: -5,
        right: 5,
        textAlign: 'center',
    },
    contact: {
        fontSize: 18,
        // fontWeight: 'bold',
        color: '#fff',
        // marginTop: 12,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
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
    hotelDataDetails: {
        flexDirection: 'column',
        gap: 8,
    },
    checkInDateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#e0e7ff',
        padding: 8,
        borderRadius: 5,
    },
    checkInDate: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4f46e5',
    },
    checkOutDate: {
        fontSize: 14,
        fontWeight: '500',
        color: '#dc2626',
    },
    paymentMode: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ef4444',
    },
    statItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f3f4f6',
        padding: 10,
        borderRadius: 5,
        marginTop: 5,
    },
    numberOfGuests: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    status: {
        fontSize: 14,
        fontWeight: '600',
        color: '#10b981',
    },
    containerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    logoutButton: {
        backgroundColor: '#d64444', // Red color for logout
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        width: '25%',
        marginHorizontal: 5,

        alignItems: 'center',
        // marginBottom: 10,
    },
    logoutText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    editButton: {
        backgroundColor: '#003873', // Dark blue color for edit
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        width: '30%',
        alignItems: 'center',
    },
    editText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});
