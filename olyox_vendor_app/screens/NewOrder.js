import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function NewOrder() {
    // Sample order data
    const order = [
        {
            id: '#ORD123456',
            customerName: 'John Doe',
            items: [
                { name: 'Veg Thali', quantity: 2, price: 150 },
                { name: 'Roti', quantity: 4, price: 40 }
            ],
            totalAmount: 340,
            deliveryAddress: '123 Main Street, Apartment 4B',
            phoneNumber: '+1 234-567-8900',
            orderTime: '10:30 AM',
            paymentStatus: 'Pending'
        },
        {
            id: '#ORD123456',
            customerName: 'John Doe',
            items: [
                { name: 'Veg Thali', quantity: 2, price: 150 },
                { name: 'Roti', quantity: 4, price: 40 }
            ],
            totalAmount: 340,
            deliveryAddress: '123 Main Street, Apartment 4B',
            phoneNumber: '+1 234-567-8900',
            orderTime: '10:30 AM',
            paymentStatus: 'Pending'
        }
    ];
    // const order = []


    if (order.length === 0) {
        return (
            <View style={styles.noOrderContainer}>
                <Image source={require('../assets/no-orders.png')} style={styles.noOrderImage} />
                <Text style={styles.noOrderText}>No Orders Yet!</Text>
                <Text style={styles.noOrderSubText}>You don't have any orders at the moment. Check back later!</Text>
            </View>
        );
    }
    const totalItems = order.reduce((sum, currentOrder) => sum + currentOrder.items.reduce((subSum, item) => subSum + item.quantity, 0), 0);

    return (
        <ScrollView>
            {
                order.map((item, index) => (
                    <View key={index} style={styles.container}>
                        <View style={styles.header}>
                            <View style={styles.orderInfo}>
                                <Text style={styles.orderId}>{item.id}</Text>
                                <View style={styles.timeContainer}>
                                    <Icon name="clock-outline" size={16} color="#666" />
                                    <Text style={styles.timeText}>{item.orderTime}</Text>
                                </View>
                            </View>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>New Order</Text>
                            </View>
                        </View>

                        <View style={styles.customerSection}>
                            <View style={styles.customerInfo}>
                                <Icon name="account" size={24} color="#4CAF50" />
                                <View style={styles.customerDetails}>
                                    <Text style={styles.customerName}>{item.customerName}</Text>
                                    <Text style={styles.address} numberOfLines={1}>{item.deliveryAddress}</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => {/* Handle call */ }}
                            >
                                <Icon name="phone" size={20} color="#4CAF50" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.itemsContainer}>
                            <Text style={styles.sectionTitle}>Order Details</Text>
                            {item.items.map((orderItem, idx) => (
                                <View key={idx} style={styles.itemRow}>
                                    <View style={styles.itemInfo}>
                                        <View style={styles.foodIconContainer}>
                                            <Icon name="food" size={16} color="#4CAF50" />
                                        </View>
                                        <Text style={styles.itemName}>{orderItem.name}</Text>
                                        <Text style={styles.itemQuantity}>x{orderItem.quantity}</Text>
                                    </View>
                                    <Text style={styles.itemPrice}>₹{orderItem.price * orderItem.quantity}</Text>
                                </View>
                            ))}
                            <View style={styles.totalRow}>
                                <Text style={styles.totalText}>Total ({item.items.reduce((sum, item) => sum + item.quantity, 0)} items)</Text>
                                <Text style={styles.totalAmount}>₹{item.totalAmount}</Text>
                            </View>
                        </View>

                        <View style={styles.paymentStatus}>
                            <Icon name="cash-multiple" size={20} color="#FF9800" />
                            <Text style={styles.paymentText}>Payment {item.paymentStatus}</Text>
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.acceptButton]}
                                onPress={() => {/* Handle accept */ }}
                            >
                                <Icon name="check-circle" size={20} color="#FFF" />
                                <Text style={styles.buttonText}>Accept Order</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.rejectButton]}
                                onPress={() => {/* Handle reject */ }}
                            >
                                <Icon name="close-circle" size={20} color="#FFF" />
                                <Text style={styles.buttonText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            }
        </ScrollView>

    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#FFF',
        borderRadius: 12,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    orderInfo: {
        flex: 1,
    },
    orderId: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    timeText: {
        marginLeft: 4,
        color: '#666',
        fontSize: 12,
    },
    statusBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        color: '#4CAF50',
        fontWeight: '600',
        fontSize: 12,
    },
    customerSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    customerInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    customerDetails: {
        marginLeft: 12,
        flex: 1,
    },
    customerName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    address: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemsContainer: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    foodIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    itemName: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#666',
        marginHorizontal: 8,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        marginTop: 8,
        paddingTop: 8,
    },
    totalText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    totalAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    paymentStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    paymentText: {
        marginLeft: 8,
        color: '#FF9800',
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 6,
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#FF5252',
    },
    buttonText: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 8,
    },
    noOrderContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        flex: 1,
    },
    noOrderImage: {
        width: 150,
        height: 150,
        marginBottom: 20,
    },
    noOrderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    noOrderSubText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
});