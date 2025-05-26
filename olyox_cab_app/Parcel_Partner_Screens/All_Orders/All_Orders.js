import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function All_Orders() {
    const [workStatus, setWorkStatus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation();

    useEffect(() => {
        fetchWorkStatus();
    }, []);

    const fetchWorkStatus = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) return;

            const response = await axios.get(
                'https://appapi.olyox.com/api/v1/parcel/my_parcel_driver-details',
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            let filteredOrders = response.data.data.filter(order => order.status !== "Delivered");
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

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'pending':
                return '#FFA500';
            case 'in progress':
                return '#2196F3';
            case 'completed':
                return '#4CAF50';
            default:
                return '#666';
        }
    };

    const OrderCard = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.orderId}>Order #{item._id.slice(-6)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
            </View>

            <View style={styles.locationContainer}>
                <View style={styles.locationItem}>
                    <Ionicons name="location" size={20} color="#4CAF50" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.pickupLocation}
                    </Text>
                </View>
                <View style={styles.locationDivider} />
                <View style={styles.locationItem}>
                    <Ionicons name="flag" size={20} color="#F44336" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.dropoffLocation}
                    </Text>
                </View>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.callButton]}
                    onPress={() => callCustomer(item.customerId?.number)}
                >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.supportButton]}
                    onPress={() => alert('Contacting Support...')}
                >
                    <Ionicons name="help-circle" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Support</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.detailsButton]}
                    onPress={() => navigation.navigate('Order_View', { id: item?._id })}
                >
                    <Ionicons name="eye" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {workStatus.length > 0 ? (
                <FlatList
                    data={workStatus}
                    renderItem={({ item }) => <OrderCard item={item} />}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#2196F3']}
                            tintColor="#2196F3"
                        />
                    }
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>No active orders found</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    orderId: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    price: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2196F3',
    },
    locationContainer: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    locationText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
        flex: 1,
    },
    locationDivider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    buttonText: {
        color: '#fff',
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
    },
    callButton: {
        backgroundColor: '#4CAF50',
    },
    supportButton: {
        backgroundColor: '#FFA500',
    },
    detailsButton: {
        backgroundColor: '#2196F3',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
});