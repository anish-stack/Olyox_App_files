import React, { useEffect, useState } from 'react';
import { ScrollView, View, ActivityIndicator } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { Audio } from 'expo-av';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
const GOOGLE_MAPS_APIKEY = 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8';

export default function RideCome() {
    const navigation = useNavigation();
    const { socket, isSocketReady } = useSocket();
    const [rideData, setRideData] = useState(null);
    const [sound, setSound] = useState();
    const [loading, setLoading] = useState(false);
    const rider_name = 'Karan Singh' || 'Karan'; // Rider name to match

    useEffect(() => {
        if (isSocketReady && socket) {
            socket.on('ride_come', (data) => {
                // console.log('Received ride data:', data);
                setRideData(data); // Set received ride data
                playSound(); // Play sound notification
            });

            return () => {
                socket.off('ride_come');
            };
        }
    }, [isSocketReady, socket]);

    const playSound = async () => {
        const { sound } = await Audio.Sound.createAsync(
            require('./taxi.mp3'),
            {
                shouldPlay: true,
                // isLooping: true,
            }
        );
        setSound(sound);
    };

    const stopSound = async () => {
        if (sound) {
            await sound.stopAsync();
            await sound.unloadAsync();
            setSound(null);
        }
    };



    const handleRejectRide = async () => {
        console.log('Ride Rejected');
        await stopSound();
        setRideData(null); // Clear ride data
    };

    const { dropLocation, pickupLocation } = rideData || {};
    const origin = pickupLocation?.coordinates
        ? {
            latitude: pickupLocation.coordinates[1],
            longitude: pickupLocation.coordinates[0],
        }
        : null;
    const destination = dropLocation?.coordinates
        ? {
            latitude: dropLocation.coordinates[1],
            longitude: dropLocation.coordinates[0],
        }
        : null;

    const matchedRider = rideData?.riders?.find((rider) => rider.name === rider_name);
    // console.log("matchedRiders", rideData.user)
    const origins = { latitude: 37.3318456, longitude: -122.0296002 };
    const destinations = { latitude: 37.771707, longitude: -122.4053769 };

    const handleAcceptRide = async () => {
        if (socket) {
            socket.emit('ride_accepted', {
                data: {
                    rider_id: matchedRider?.id,
                    ride_request_id: matchedRider.rideRequestId,
                    user_id: rideData.user?._id || null,
                    rider_name: matchedRider.name,
                    vehicleName: matchedRider.vehicleName,
                    vehicleNumber: matchedRider.vehicleNumber,
                    vehicleType: matchedRider.vehicleType,
                    price: matchedRider.price,
                    eta: matchedRider.eta,
                }

            });
        }
        await stopSound();
        // Additional ride acceptance logic
    };

    useEffect(() => {
        if (socket) {
            socket.on('ride_accepted_message', (data) => {
                const { rideDetails, driver } = data || {}
                console.log("ride_accepted_message", data)
                if (driver && rideDetails) {
                    console.log('Ride accepted by user:', data);
                    // Additional ride acceptance logic
                    navigation.navigate('start', {
                        screen: 'ride_details',
                        params: {
                            rideDetails,
                            driver,
                        },
                        index: 1,
                    })

                }
            })
        }
    }, [socket])
    return (
        <ScrollView >
            <View >
                {origin && destination && matchedRider ? (
                    <MapView
                        provider={PROVIDER_GOOGLE} // Use Google Maps provider
                        style={{ width: '100%', height: 400 }}
                        showsUserLocation={true} // Display the user's current location
                        showsMyLocationButton={true} // Android-only, shows location button
                        zoomControlEnabled={true} // Android-only, shows zoom controls
                        initialRegion={{
                            latitude: origin.latitude,
                            longitude: origin.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        customMapStyle={[
                            {
                                featureType: 'poi',
                                stylers: [{ visibility: 'off' }], // Hides points of interest
                            },
                        ]}
                    >
                        <Marker coordinate={origin} title="Pickup Location" />
                        <Marker coordinate={destination} title="Dropoff Location" />
                        <MapViewDirections
                            origin={origin}
                            destination={destination}
                            apikey={GOOGLE_MAPS_APIKEY}
                            strokeWidth={4}
                            strokeColor="#FF6666"
                            onError={(error) => console.error('Directions error:', error)}
                        />
                    </MapView>
                ) : (
                   <View>
                    <Text>Waiting for a match</Text>
                    
                        <ActivityIndicator size="large" color="#0000ff" />
                   </View>
                )}
            </View>
            {rideData && matchedRider ? (
                <View>
                    <Card style={{ marginBottom: 16 }}>
                        <Card.Title title="Ride Request" />
                        <Card.Content>
                            <Text variant="headlineSmall">Pickup Location:</Text>
                            <Text>{rideData.pickup_desc}</Text>
                            <Divider style={{ marginVertical: 8 }} />
                            <Text variant="headlineSmall">Drop Location:</Text>
                            <Text>{rideData.drop_desc}</Text>
                            <Divider style={{ marginVertical: 8 }} />
                            <Text variant="headlineSmall">Distance:</Text>
                            <Text>{rideData.distance} km</Text>
                            <Divider style={{ marginVertical: 8 }} />
                            <Text variant="headlineSmall">Traffic Duration:</Text>
                            <Text>{rideData.trafficDuration} minutes</Text>
                            <Divider style={{ marginVertical: 8 }} />
                            <Text variant="headlineSmall">Price:</Text>
                            <Text>₹{matchedRider.price}</Text>
                        </Card.Content>
                    </Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Button mode="contained" onPress={handleAcceptRide} style={{ flex: 0.48 }}>
                            Accept Ride
                        </Button>
                        <Button
                            mode="outlined"
                            onPress={handleRejectRide}
                            style={{ flex: 0.48 }}
                            textColor="red"
                        >
                            Reject Ride
                        </Button>
                    </View>
                </View>
            ) : (
                <Card>
                    <Card.Content>
                        <Text>Waiting for ride data...</Text>
                    </Card.Content>
                </Card>
            )}
        </ScrollView>
    );
}
