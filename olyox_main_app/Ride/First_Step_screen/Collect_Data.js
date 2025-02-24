import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Input from '../../components/forms/Input';
import { COLORS } from '../../constants/colors';
import styles from './Styles';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { tokenCache } from '../../Auth/cache';

export default function Collect_Data() {
    const [status, requestPermission] = Location.useBackgroundPermissions();
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeInput, setActiveInput] = useState(null);
    const [complete_ride, setComplete_ride] = useState({
        pickup: { latitude: 0, longitude: 0, description: '' },
        dropoff: { latitude: 0, longitude: 0, description: '' },
    });
    const navigation = useNavigation()
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [isGeoCodeReady, setIsGeoCodeReady] = useState(false); // Track when geocoding is ready

    const fetchSuggestions = useCallback(async (input) => {
        if (!input) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get('https://api.srtutorsbureau.com/autocomplete', {
                params: { input },
            });
            setSuggestions(data);
        } catch (err) {
            setError('Failed to fetch locations. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLocationSelect = (location) => {
        if (activeInput === 'pickup') {
            setPickup(location);
        } else {
            setDropoff(location);
        }
        setSuggestions([]);
        setActiveInput(null);
    };

    const handleGeoCode = async () => {
        if (pickup && dropoff) {
            try {
                // Geocode pickup location
                const pickupData = await axios.get(`https://api.srtutorsbureau.com/geocode?address=${pickup}`);
                if (pickupData.data?.latitude) {
                    setComplete_ride((prev) => ({
                        ...prev,
                        pickup: {
                            latitude: pickupData.data.latitude,
                            longitude: pickupData.data.longitude,
                            description: pickup,
                        },
                    }));
                }

                // Geocode dropoff location
                const dropoffData = await axios.get(`https://api.srtutorsbureau.com/geocode?address=${dropoff}`);
                if (dropoffData.data?.latitude) {
                    setComplete_ride((prev) => ({
                        ...prev,
                        dropoff: {
                            latitude: dropoffData.data.latitude,
                            longitude: dropoffData.data.longitude,
                            description: dropoff,
                        },
                    }));
                }
                setIsGeoCodeReady(true); // Set to ready once geocoding is complete
            } catch (error) {
                console.log("Error From 1",error.response.data);
            }
        }
    };

    const handleSubmit = async () => {
        if (!pickup || !dropoff) {
            setError('Please select both pickup and drop-off locations');
            return;
        }
        // const gmail_token = await tokenCache.getToken('auth_token')
        // const db_token = await tokenCache.getToken('auth_token_db')
        // const token = db_token  || gmail_token
        // // setLoading(true)
        // let location = await Location.getCurrentPositionAsync({});
        // console.log("location",location)
        // try {
        //     const response = await axios.post('http://192.168.1.10:3000/api/v1/rides/create-ride', {
        //         currentLocation: location.coords,
        //         pickupLocation: complete_ride.pickup,
        //         dropLocation: complete_ride.dropoff,
        //     },{
        //         headers: {
        //              
        //         }
        //     })
        //     console.log("response from create ride",response.data)
        //     setLoading(false)
            
            
        // } catch (error) {
        //     setLoading(false)
        //     console.log("error from create",error)
        // }
        
        navigation.navigate('second_step_of_booking',{data:complete_ride})
        

        // console.log('Ride requested:', { complete_ride });

    };

    useEffect(() => {
        if (pickup && dropoff) {
            handleGeoCode();
        }
    }, [pickup, dropoff]); // Trigger geocoding when either pickup or dropoff changes

    useEffect(() => {
        fetchCurrent(); // Only call this once to get the initial pickup location
    }, []);

    const fetchCurrent = async () => {
        setIsFetchingLocation(true);
        let location = await Location.getCurrentPositionAsync({});
        if (!location) {
            await requestPermission();
        }
        try {
            const { data } = await axios.post('https://api.srtutorsbureau.com/Fetch-Current-Location', {
                lat: location?.coords?.latitude,
                lng: location?.coords?.longitude,
            });
            const currentLocation = data?.data?.address?.completeAddress;
            setPickup(currentLocation);
        } catch (error) {
            console.log("error fetching current",error.response.data);
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const truncateText = (text, maxLength = 30) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.card}>
                <View style={styles.locationCard}>
                    <View style={styles.inputsContainer}>
                        <View style={styles.inputWrapper}>
                            <View style={styles.inputRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
                                <View style={styles.inputContent}>
                                    <Text style={styles.inputLabel}>PICKUP</Text>
                                    <Input
                                        iconColour={COLORS.success}
                                        placeholder="Enter pickup location"
                                        value={truncateText(pickup)}
                                        onChangeText={(text) => {
                                            setPickup(text);
                                            setActiveInput('pickup');
                                            fetchSuggestions(text);
                                        }}
                                        error={activeInput === 'pickup' && error}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputWrapper}>
                            <View style={styles.inputRow}>
                                <View style={[styles.dot, { backgroundColor: COLORS.error }]} />
                                <View style={styles.inputContent}>
                                    <Text style={styles.inputLabel}>DROP-OFF</Text>
                                    <Input
                                        iconColour={COLORS.error}
                                        placeholder="Enter drop-off location"
                                        value={truncateText(dropoff)}
                                        onChangeText={(text) => {
                                            setDropoff(text);
                                            setActiveInput('dropoff');
                                            fetchSuggestions(text);
                                        }}
                                        error={activeInput === 'dropoff' && error}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {isFetchingLocation ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={COLORS.zom} />
                        <Text style={styles.loaderText}>Fetching your current location...</Text>
                    </View>
                ) : loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={COLORS.zom} />
                        <Text style={styles.loaderText}>Finding locations...</Text>
                    </View>
                ) : suggestions.length > 0 ? (
                    <ScrollView style={styles.suggestionsContainer} showsVerticalScrollIndicator={false}>
                        {suggestions.map((suggestion, index) => (
                            <Pressable
                                key={index}
                                style={({ pressed }) => [
                                    styles.suggestionItem,
                                    pressed && styles.suggestionPressed
                                ]}
                                onPress={() => handleLocationSelect(suggestion.description)}
                            >
                                <Icon name="map-marker" size={20} color={COLORS.zom} />
                                <Text style={styles.suggestionText}>{suggestion.description}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                ) : null}

                {!suggestions.length && pickup && dropoff && isGeoCodeReady && (
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        activeOpacity={0.8}
                    >
                        <Icon name="car" size={24} color="white" style={styles.submitIcon} />
                        <Text style={styles.submitButtonText}>Find Riders Heading to Your Destination</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}
