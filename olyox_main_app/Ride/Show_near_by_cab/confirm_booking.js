import { useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Map from '../Map/Map';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';
export function BookingConfirmation() {
    const route = useRoute();
    const [status, requestPermission] = Location.useBackgroundPermissions();

    const [loading, setLoading] = useState(false)
    const { origin, destination, selectedRide, dropoff, pickup } = route.params || {};
    const navigation = useNavigation();

    const handleSubmit = async () => {
        if (!origin || !destination) {
            setError('Please select both pickup and drop-off locations');
            return;
        }
        setLoading(true)
        let location = await Location.getCurrentPositionAsync({});

        try {
            const response = await axios.post('http://192.168.1.8:9630/api/v1/rides/create-ride', {
                currentLocation: location.coords,
                pickupLocation: origin,
                dropLocation: destination,
                pick_desc: pickup?.description,
                drop_desc: dropoff?.description,
                vehicleType: selectedRide?.name,
            })
            console.log(response.data)
            setTimeout(() => {
                setLoading(false)
                navigation.navigate('driver_match', { ride: response.data,origin, destination });
            }, 520)

        } catch (error) {
            setLoading(false)
            console.log(error)
        }


        // console.log('Ride requested:', { complete_ride });

    };
    const Header = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm your ride</Text>
            <View style={styles.placeholder} />
        </View>
    );

    const PaymentSection = () => (
        <View style={styles.paymentSection}>
            <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Payment</Text>
                <TouchableOpacity style={styles.changeButton}>
                    <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.paymentMethod}>
                <Text style={styles.paymentIcon}>💳</Text>
                <Text style={styles.paymentText}>Cash</Text>
            </View>
        </View>
    );

    const RideDetails = () => (
        <View style={styles.rideDetailsCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.rideDetailsTitle}>Ride Details</Text>
                <View style={styles.estimatedTime}>
                    <Icon name="clock-outline" size={16} color="#4CAF50" />
                    <Text style={styles.estimatedTimeText}>Est. 25 mins</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.rideDetailItem}>
                <View style={styles.iconContainer}>
                    <Icon name="car" size={22} color="#1976D2" />
                </View>
                <Text style={styles.rideText}>Car Type: {selectedRide?.name}</Text>
            </View>

            <View style={styles.rideDetailItem}>
                <View style={styles.iconContainer}>
                    <Icon name="map-marker-distance" size={22} color="#1976D2" />
                </View>
                <Text style={styles.rideText}>Distance: {selectedRide?.distance} km</Text>
            </View>

            <View style={styles.rideDetailItem}>
                <View style={styles.iconContainer}>
                    <Icon name="currency-inr" size={22} color="#1976D2" />
                </View>
                <Text style={styles.rideText}>Price: ₹{selectedRide?.priceRange}</Text>
            </View>
        </View>
    );


    return (
        <SafeAreaView style={styles.container}>
            <Header />
            <ScrollView style={styles.content}>
                <Map origin={origin} destination={destination} />

                <RideDetails />
                <PaymentSection />
            </ScrollView>

            <TouchableOpacity
                onPress={() => handleSubmit()}
                style={styles.confirmButton}
            >
                <Text style={styles.confirmButtonText}>
                    {loading ? 'Searching for a rider, please wait...' : `Confirm ${selectedRide?.name}`}
                </Text>
                {!loading && selectedRide?.priceRange && (
                    <Text style={styles.confirmButtonPrice}>₹{selectedRide?.priceRange}</Text>
                )}
            </TouchableOpacity>


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
        backgroundColor: '#fff',
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
    },
    mapPreview: {
        height: 200,
        backgroundColor: '#f0f0f0',
    },
    rideDetailsCard: {
        backgroundColor: '#fff',
        // borderRadius: 12,
        padding: 14,
        marginHorizontal: 5,
        marginTop: 16,
        marginBottom: 8,
        // shadowColor: '#000',
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.1,
        // shadowRadius: 8,
        // elevation: 5,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    rideDetailsTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A237E',
        letterSpacing: 0.3,
    },
    estimatedTime: {
        // flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    estimatedTimeText: {
        marginLeft: 4,
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 12,
    },
    rideDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        backgroundColor: '#E3F2FD',
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rideText: {
        fontSize: 16,
        color: '#424242',
        fontWeight: '500',
        flex: 1,
    },
    paymentSection: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    paymentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    changeButton: {
        padding: 8,
    },
    changeButtonText: {
        color: '#2E7D32',
        fontWeight: '500',
    },
    paymentMethod: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    paymentText: {
        fontSize: 16,
    },
    confirmButton: {
        backgroundColor: '#000',
        margin: 16,
        padding: 16,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButtonPrice: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
