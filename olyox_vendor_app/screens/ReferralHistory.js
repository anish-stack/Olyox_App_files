import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function ReferralHistory() {
    const [refreshing, setRefreshing] = useState(false);

    // Sample data - replace with your actual data
    const referrals = [
        {
            _id: '6773c186725aeeda57ffdd0a',
            contactNumber: '07665666658',
            name: 'Hitesh yadav',
            state: 'Haryana',
            isRecharge: false,
            vendor_id: '6772310a8a8b2d061105997d',
            isRegistered: false,
            createdAt: '2024-12-31T10:03:50.259+00:00',
            updatedAt: '2024-12-31T10:03:50.259+00:00',
            __v: 0
        },
        // Add more sample data here
    ];

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        // Add your refresh logic here
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const ReferralCard = ({ referral }) => (
        <Animated.View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Icon
                        name={referral.isRegistered ? "account-check" : "account-clock"}
                        size={24}
                        color={referral.isRegistered ? "#4CAF50" : "#FFA000"}
                    />
                    <Text style={styles.name}>{referral.name}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: referral.isRecharge ? '#4CAF50' : '#FF5252' }
                ]}>
                    <Icon
                        name={referral.isRecharge ? "cash-check" : "cash-clock"}
                        size={16}
                        color="#fff"
                    />
                    <Text style={styles.statusText}>
                        {referral.isRecharge ? 'Recharged' : 'Pending'}
                    </Text>
                </View>
            </View>

            <View style={styles.cardContent}>
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Icon name="phone" size={16} color="#666" />
                        <Text style={styles.infoText}>{referral.contactNumber}</Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Icon name="map-marker" size={16} color="#666" />
                        <Text style={styles.infoText}>{referral.state}</Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                        <Icon name="calendar-plus" size={14} color="#666" />
                        <Text style={styles.dateText}>
                            Created: {formatDate(referral.createdAt)}
                        </Text>
                    </View>
                    <View style={styles.dateItem}>
                        <Icon name="calendar-sync" size={14} color="#666" />
                        <Text style={styles.dateText}>
                            Updated: {formatDate(referral.updatedAt)}
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsText}>View Details</Text>
                <Icon name="chevron-right" size={20} color="#2196F3" />
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Icon name="account-group" size={28} color="#2196F3" />
                <Text style={styles.headerText}>Referral History</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {referrals.map((referral) => (
                    <ReferralCard key={referral._id} referral={referral} />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginLeft: 10,
        color: '#333',
    },
    scrollView: {
        flex: 1,
        padding: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginLeft: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 5,
    },
    cardContent: {
        padding: 15,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        marginLeft: 8,
        color: '#666',
        fontSize: 14,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        marginLeft: 5,
        color: '#888',
        fontSize: 12,
    },
    detailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    detailsText: {
        color: '#2196F3',
        fontSize: 14,
        fontWeight: '600',
        marginRight: 5,
    },
});

export default ReferralHistory;