import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Card, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

export default function All_Orders() {
    const [workStatus, setWorkStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation()
    useEffect(() => {
        fetchWorkStatus();
    }, []);

    const fetchWorkStatus = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) return;

            const response = await axios.get(
                'http://192.168.1.4:3000/api/v1/parcel/my_parcel_driver-details',
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            let filteredOrders = response.data.data.filter(order => order.status !== "Delivered");

            console.log("Filtered Data:", filteredOrders);
            setWorkStatus(filteredOrders);
        } catch (error) {
            console.error('Error fetching work status:', error.response?.data || error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchWorkStatus();
    }, []);

    const callCustomer = (phoneNumber) => {
        if (phoneNumber) {
            Linking.openURL(`tel:${phoneNumber}`);
        } else {
            alert("Customer phone number not available");
        }
    };

    return (
        <View style={{ flex: 1, padding: 10, backgroundColor: '#f8f9fa' }}>
     

            {loading ? (
                <ActivityIndicator size="large" color="#d64444" style={{ marginTop: 20 }} />
            ) : workStatus.length > 0 ? (
                <FlatList
                    data={workStatus}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item) => item._id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#d64444']} />
                    }
                    renderItem={({ item }) => (
                        <Card style={{ marginBottom: 10, padding: 15, borderRadius: 10, backgroundColor: '#fff', elevation: 3 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#003873' }}>
                                Order ID: {item._id}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#666' }}>
                                Pickup: {item.pickupLocation}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#666' }}>
                                Dropoff: {item.dropoffLocation}
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: item.status === 'pending' ? '#d64444' : '#25d366' }}>
                                Status: {item.status.toUpperCase()}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#333' }}>
                                Price: ₹{item.price.toFixed(2)}
                            </Text>

                            {/* Buttons Row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                {/* Call Customer Button */}
                                <TouchableOpacity
                                    onPress={() => callCustomer(item.customerId?.number)}
                                    style={{
                                        backgroundColor: '#d64444',
                                        paddingVertical: 8,
                                        paddingHorizontal: 15,
                                        borderRadius: 5,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Call Customer</Text>
                                </TouchableOpacity>

                                {/* Support Button */}
                                <TouchableOpacity
                                    onPress={() => alert('Contacting Support...')}
                                    style={{
                                        backgroundColor: '#003873',
                                        paddingVertical: 8,
                                        paddingHorizontal: 15,
                                        borderRadius: 5,
                                    }}
                                >
                                    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Support</Text>
                                </TouchableOpacity>

                                {/* View Details Button */}
                                <Button
                                    mode="contained"
                                    onPress={() => navigation.navigate('Order_View',{id:item?._id})}
                                    style={{ backgroundColor: '#00aaa9' }}
                                >
                                    View Details
                                </Button>
                            </View>
                        </Card>
                    )}
                />
            ) : (
                <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 16 }}>No active orders found.</Text>
            )}
        </View>
    );
}
