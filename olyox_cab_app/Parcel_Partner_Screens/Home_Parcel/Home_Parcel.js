import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, Dimensions, Platform } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = width < 768 ? (width - 48) / 2 : (width - 64) / 4;

export default function Home_Parcel() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const fetchUserData = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) {
                setError('No auth token found');
                return;
            }

            const response = await axios.get(
                'http://192.168.1.9:9630/api/v1/parcel/user-details',
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setUserData(response.data.partner);
            setError(null);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching user details:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            await fetchUserData();
            setLoading(false);
        };
        loadData();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchUserData();
        setRefreshing(false);
    }, []);

    if (loading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                    <Text style={styles.loadingText}>Loading your dashboard...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !userData) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Icon name="alert-circle-outline" size={80} color="#FF5252" />
                    <Text style={styles.errorTitle}>Oops!</Text>
                    <Text style={styles.errorText}>
                        {error || 'Please login to continue'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!userData.isActive) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <ScrollView refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }>

                    <View style={styles.blockedContainer}>
                        <Icon name="account-off" size={80} color="#FF5252" />
                        <Text style={styles.blockedTitle}>Account Blocked</Text>
                        <Text style={styles.blockedMessage}>
                            Your account has been blocked by admin. Please contact support to reactivate your account.
                        </Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (!userData.DocumentVerify) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.verificationContainer}>
                    <Icon name="file-document-edit" size={80} color="#FFA000" />
                    <Text style={styles.verificationTitle}>Documents Under Review</Text>
                    <Text style={styles.verificationMessage}>
                        Your documents are being verified. This process may take 24-48 hours.
                        Thank you for your patience.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.welcomeText}>Welcome Back!</Text>
                    <Text style={styles.dateText}>{new Date().toLocaleDateString()}</Text>
                </View>

                {/* Vehicle Details Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Icon name="car" size={28} color="#2196F3" />
                        <Text style={styles.cardTitle}>Vehicle Details</Text>
                    </View>
                    <View style={styles.vehicleDetails}>
                        <View style={styles.detailRow}>
                            <Icon name="car-side" size={24} color="#2196F3" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Make & Model</Text>
                                <Text style={styles.detailText}>{userData.bikeDetails.make} {userData.bikeDetails.model}</Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <Icon name="card-text" size={24} color="#2196F3" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>License Plate</Text>
                                <Text style={styles.detailText}>{userData.bikeDetails.licensePlate}</Text>
                            </View>
                        </View>
                        <View style={styles.detailRow}>
                            <Icon name="calendar" size={24} color="#2196F3" />
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Year</Text>
                                <Text style={styles.detailText}>{userData.bikeDetails.year}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
                            <Icon name="package-variant" size={32} color="#4CAF50" />
                        </View>
                        <Text style={styles.statsNumber}>0</Text>
                        <Text style={styles.statsLabel}>New Orders</Text>
                    </View>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
                            <Icon name="check-circle" size={32} color="#2196F3" />
                        </View>
                        <Text style={styles.statsNumber}>0</Text>
                        <Text style={styles.statsLabel}>Completed</Text>
                    </View>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                            <Icon name="wallet" size={32} color="#FFA000" />
                        </View>
                        <Text style={styles.statsNumber}>₹{userData.amountPaid}</Text>
                        <Text style={styles.statsLabel}>Earnings</Text>
                    </View>
                    <View style={[styles.statsCard, { width: cardWidth }]}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
                            <Icon name="account-group" size={32} color="#9C27B0" />
                        </View>
                        <Text style={styles.statsNumber}>{userData.her_referenced.length}</Text>
                        <Text style={styles.statsLabel}>Referrals</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    dateText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF5252',
        marginTop: 16,
    },
    blockedContainer: {
        flex: 1,
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    blockedTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF5252',
        marginTop: 20,
    },
    blockedMessage: {
        fontSize: 16,
        color: '#d32f2f',
        textAlign: 'center',
        marginTop: 10,
    },
    verificationContainer: {
        flex: 1,
        backgroundColor: '#fff8e1',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    verificationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFA000',
        marginTop: 20,
    },
    verificationMessage: {
        fontSize: 16,
        color: '#ff6f00',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 24,
    },
    card: {
        backgroundColor: 'white',
        margin: 16,
        padding: 16,
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 12,
    },
    vehicleDetails: {
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    detailText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 8,
        justifyContent: 'space-between',
    },
    statsCard: {
        backgroundColor: 'white',
        padding: 16,
        margin: 8,
        borderRadius: 16,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statsNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statsLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
});