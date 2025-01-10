import { useRoute } from '@react-navigation/native';
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Map from '../Map/Map';

export function DriverMatching({ navigation }) {
    const [matchingState, setMatchingState] = useState('searching'); // searching, found, success, declined
    const [timeLeft, setTimeLeft] = useState(30);
    const route = useRoute()
    const { origin, destination , ride } = route.params || {}
    const [selectedDriver, setSelectedDriver] = useState({
        name: "Rahul Kumar",
        rating: "4.8",
        trips: "2,543",
        carNumber: "DL 5C AB 1234",
        carModel: "Swift Dzire",
        arrivalTime: "2 mins"
    });

    useEffect(() => {
        // Simulate finding a driver after 3 seconds
        const findDriverTimer = setTimeout(() => {
            setMatchingState('found');
        }, 3000);

        // Show accept/decline buttons after 30 seconds
        const decisionTimer = setTimeout(() => {
            setTimeLeft(0);
        }, 30000);

        // Update countdown timer
        const countdownInterval = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            clearTimeout(findDriverTimer);
            clearTimeout(decisionTimer);
            clearInterval(countdownInterval);
        };
    }, []);

    const handleRideAccept = () => {
        setMatchingState('success');
        setTimeout(() => {
            navigation.navigate('RideStarted', { driver: selectedDriver });
        }, 1500);
    };

    const handleRideDecline = () => {
        setMatchingState('declined');
        // Restart the search after 2 seconds
        setTimeout(() => {
            setMatchingState('searching');
            setTimeLeft(10);
        }, 2000);
    };

    const LoadingStates = () => {
        if (matchingState === 'searching') {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <Text style={styles.loadingText}>Looking for nearby drivers...</Text>
                </View>
            );
        }

        if (matchingState === 'found') {
            return (
                <View style={styles.driverFound}>
                    <View style={styles.driverInfo}>
                        <View style={styles.driverHeader}>
                            <Text style={styles.driverName}>{selectedDriver.name}</Text>
                            <View style={styles.ratingContainer}>
                                <Text style={styles.ratingText}>⭐ {selectedDriver.rating}</Text>
                                <Text style={styles.tripsText}>{selectedDriver.trips} trips</Text>
                            </View>
                        </View>

                        <View style={styles.carInfo}>
                            <Text style={styles.carNumber}>{selectedDriver.carNumber}</Text>
                            <Text style={styles.carModel}>{selectedDriver.carModel}</Text>
                        </View>

                        <View style={styles.arrivalInfo}>
                            <Text style={styles.arrivalText}>
                                Arriving in {selectedDriver.arrivalTime}
                            </Text>
                            {timeLeft > 0 && (
                                <Text style={styles.timeLeft}>
                                    Driver will confirm in {timeLeft}s
                                </Text>
                            )}
                        </View>
                    </View>

                    {timeLeft === 0 && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.acceptButton]}
                                onPress={handleRideAccept}
                            >
                                <Text style={styles.buttonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.declineButton]}
                                onPress={handleRideDecline}
                            >
                                <Text style={[styles.buttonText, styles.declineText]}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            );
        }

        if (matchingState === 'success') {
            return (
                <View style={styles.successContainer}>
                    <Text style={styles.successText}>Ride Confirmed! 🎉</Text>
                    <Text style={styles.successSubText}>Redirecting to ride screen...</Text>
                </View>
            );
        }

        if (matchingState === 'declined') {
            return (
                <View style={styles.declinedContainer}>
                    <Text style={styles.declinedText}>Looking for another driver...</Text>
                </View>
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Finding your ride</Text>
                <View style={styles.placeholder} />
            </View>

            <Map origin={origin} destination={destination} />
            <View style={styles.content}>

                <LoadingStates />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        fontSize: 24,
    },
    placeholder: {
        width: 24,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    driverFound: {
        padding: 20,
    },
    driverInfo: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
    },
    driverHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    driverName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    ratingContainer: {
        alignItems: 'flex-end',
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '500',
    },
    tripsText: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    carInfo: {
        marginBottom: 12,
    },
    carNumber: {
        fontSize: 16,
        fontWeight: '500',
    },
    carModel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    arrivalInfo: {
        alignItems: 'center',
        marginTop: 16,
    },
    arrivalText: {
        fontSize: 18,
        fontWeight: '500',
    },
    timeLeft: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#000',
    },
    declineButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#000',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    declineText: {
        color: '#000',
    },
    successContainer: {
        alignItems: 'center',
        padding: 20,
    },
    successText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    successSubText: {
        fontSize: 16,
        color: '#666',
    },
    declinedContainer: {
        alignItems: 'center',
        padding: 20,
    },
    declinedText: {
        fontSize: 16,
        color: '#666',
    },
});