import { useRoute } from '@react-navigation/native';
import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function RideConfirmed() {
    const route = useRoute()
    const { driver } = route.params;
    const rideDetails = {
        otp: "5432",
        eta: "2 mins",
        price: "₹165",
        pickup: "190A, Naharpur Village Rd, Naharpur",
        dropoff: "Chaayos Cafe At Netaji Subhash Place"
    };

    const OtpCard = () => (
        <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>Share OTP with driver</Text>
            <Text style={styles.otpNumber}>{rideDetails.otp}</Text>
        </View>
    );

    const DriverCard = () => (
        <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
                <View>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.carDetails}>
                        {driver.carModel} • {driver.carNumber}
                    </Text>
                </View>
                <View style={styles.ratingContainer}>
                    <Text style={styles.rating}>⭐ {driver.rating}</Text>
                    <Text style={styles.trips}>{driver.trips} trips</Text>
                </View>
            </View>
            <Text style={styles.eta}>Arriving in {rideDetails.eta}</Text>
        </View>
    );

    const LocationCard = () => (
        <View style={styles.locationCard}>
            <View style={styles.locationItem}>
                <View style={styles.greenDot} />
                <Text style={styles.locationText}>{rideDetails.pickup}</Text>
            </View>
            <View style={styles.locationDivider} />
            <View style={styles.locationItem}>
                <View style={styles.redDot} />
                <Text style={styles.locationText}>{rideDetails.dropoff}</Text>
            </View>
        </View>
    );

    const PriceCard = () => (
        <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Estimated Fare</Text>
            <Text style={styles.priceAmount}>{rideDetails.price}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Ride Confirmed</Text>
            </View>

            <ScrollView style={styles.content}>
                <OtpCard />
                <DriverCard />
                <LocationCard />
                <PriceCard />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.supportButton}>
                    <Text style={styles.supportButtonText}>Need Help?</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    otpCard: {
        backgroundColor: '#f8f8f8',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    otpLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    otpNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    driverCard: {
        backgroundColor: '#f8f8f8',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    driverHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    driverName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    carDetails: {
        color: '#666',
        marginTop: 4,
    },
    ratingContainer: {
        alignItems: 'flex-end',
    },
    rating: {
        fontSize: 16,
        fontWeight: '500',
    },
    trips: {
        color: '#666',
        marginTop: 4,
    },
    eta: {
        fontSize: 16,
        color: '#000',
        fontWeight: '500',
    },
    locationCard: {
        backgroundColor: '#f8f8f8',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    locationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    locationDivider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 8,
    },
    greenDot: {
        width: 10,
        height: 10,
        backgroundColor: '#4CAF50',
        borderRadius: 5,
        marginRight: 12,
    },
    redDot: {
        width: 10,
        height: 10,
        backgroundColor: '#F44336',
        borderRadius: 5,
        marginRight: 12,
    },
    locationText: {
        flex: 1,
        fontSize: 14,
    },
    priceCard: {
        backgroundColor: '#f8f8f8',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 16,
        color: '#666',
    },
    priceAmount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    supportButton: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    supportButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});