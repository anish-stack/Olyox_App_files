import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { tokenCache } from '../../../Auth/cache';
import axios from 'axios';
import Layout from '../../../components/Layout/_layout';
import { Ionicons } from '@expo/vector-icons';

export default function Parcel_Orders() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const navigation = useNavigation();

    const fetchData = async () => {
        setLoading(true);
        setRefreshing(true);
        const gmail_token = await tokenCache.getToken("auth_token");
        const db_token = await tokenCache.getToken("auth_token_db");
        const token = db_token || gmail_token;

        if (!token) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const response = await axios.get("https://demoapi.olyox.com/api/v1/parcel/my_parcel_user-details", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            setData(response.data.data);
        } catch (error) {
            setError(error?.response?.data?.message || "Error fetching data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={styles.card}
            onPress={() => navigation.navigate('OrderDetails', { order: item })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.customerName}>{item.customerName}</Text>
                <Text style={[styles.status, item.status === "pending" ? styles.pending : styles.completed]}>
                    {item.status.toUpperCase()}
                </Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#003873" />
                    <Text style={styles.info}>{item.pickupLocation}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="flag" size={16} color="#003873" />
                    <Text style={styles.info}>{item.dropoffLocation}</Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
                <TouchableOpacity 
                    style={styles.button}
                    onPress={() => navigation.navigate('OrderDetails', { order: item })}
                >
                    <Text style={styles.buttonText}>View Details</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <ActivityIndicator size="large" color="#f44336" style={styles.loader} />;
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    return (
        <Layout>
            <View style={styles.container}>
                <FlatList
                    data={data}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={fetchData} colors={["#00aaa9"]} />
                    }
                />
            </View>
        </Layout>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f9f9",
    },
    heading: {
        fontSize: 24,
        fontWeight: "bold",
        marginVertical: 20,
        textAlign: "center",
        color: "#003873",
    },
    listContainer: {
        padding: 15,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardBody: {
        padding: 15,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    customerName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#003873",
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    info: {
        fontSize: 14,
        color: "#555",
        marginLeft: 5,
    },
    price: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#d64444",
    },
    status: {
        fontSize: 12,
        fontWeight: "bold",
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
    },
    pending: {
        backgroundColor: "#f44336",
        color: "#fff",
    },
    completed: {
        backgroundColor: "#25d366",
        color: "#fff",
    },
    button: {
        backgroundColor: "#f44336",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 5,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 14,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        fontSize: 16,
        color: "#f44336",
    },
});
