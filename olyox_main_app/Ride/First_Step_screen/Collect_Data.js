import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Pressable,
    Dimensions,
    Alert,
    Platform,
    Keyboard,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './Styles';

const GOOGLE_MAPS_APIKEY = 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8';
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

const Collect_Data = () => {
    const mapRef = useRef(null);
    const pickupInputRef = useRef(null);
    const dropoffInputRef = useRef(null);
    const debounceTimer = useRef(null);
    const navigation = useNavigation();

    const [state, setState] = useState({
        pickup: '',
        dropoff: '',
        suggestions: [],
        loading: false,
        error: '',
        activeInput: null,
        showMap: false,
        mapType: null,
        isFetchingLocation: false,
        locationPermissionGranted: false,
        inputHeight: 70,
    });

    const [rideData, setRideData] = useState({
        pickup: { latitude: 0, longitude: 0, description: '' },
        dropoff: { latitude: 0, longitude: 0, description: '' }
    });

    const [region, setRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });

    useEffect(() => {
        checkLocationPermission();
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    const checkLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            setState(prev => ({ ...prev, locationPermissionGranted: status === 'granted' }));
            if (status === 'granted') {
                await getCachedOrCurrentLocation();
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    };

    const getCachedOrCurrentLocation = async () => {
        try {
            const cachedLocation = await AsyncStorage.getItem('lastKnownLocation');
            if (cachedLocation) {
                const { location, timestamp } = JSON.parse(cachedLocation);
                if (Date.now() - timestamp < CACHE_EXPIRY) {
                    updateLocationData(location);
                    return;
                }
            }
            await fetchCurrentLocation();
        } catch (error) {
            console.error('Location cache error:', error);
            await fetchCurrentLocation();
        }
    };

    const fetchCurrentLocation = async () => {
        setState(prev => ({ ...prev, isFetchingLocation: true, error: '' }));
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            await AsyncStorage.setItem('lastKnownLocation', JSON.stringify({
                location,
                timestamp: Date.now()
            }));

            await updateLocationData(location);
        } catch (error) {
            console.error('Location error:', error);
            setState(prev => ({
                ...prev,
                error: 'Location unavailable. Please enter manually.',
                isFetchingLocation: false
            }));
        }
    };

    const updateLocationData = async (location) => {
        try {
            const response = await axios.post('https://api.srtutorsbureau.com/Fetch-Current-Location', {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            });

            const address = response?.data?.data?.address?.completeAddress;

            setRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            });

            setState(prev => ({
                ...prev,
                pickup: address,
                isFetchingLocation: false
            }));

            setRideData(prev => ({
                ...prev,
                pickup: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    description: address
                }
            }));
        } catch (error) {
            console.error('Address fetch error:', error);
            setState(prev => ({
                ...prev,
                isFetchingLocation: false,
                error: 'Failed to get address. Please enter manually.'
            }));
        }
    };

    const handleMapRegionChange = async (newRegion) => {
        setRegion(newRegion);
        const { latitude, longitude } = newRegion;

        try {
            const response = await axios.post('https://api.srtutorsbureau.com/Fetch-Current-Location', {
                lat: latitude,
                lng: longitude,
            });

            const address = response?.data?.data?.address?.completeAddress;

            if (state.mapType === 'pickup') {
                setState(prev => ({ ...prev, pickup: address }));
                setRideData(prev => ({
                    ...prev,
                    pickup: { latitude, longitude, description: address }
                }));
            } else {
                setState(prev => ({ ...prev, dropoff: address }));
                setRideData(prev => ({
                    ...prev,
                    dropoff: { latitude, longitude, description: address }
                }));
            }
        } catch (error) {
            console.error('Region change error:', error);
        }
    };

    const fetchSuggestions = (input, type) => {
        if (!input || input.length < 2) {
            setState(prev => ({ ...prev, suggestions: [] }));
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        setState(prev => ({ ...prev, loading: true }));

        debounceTimer.current = setTimeout(async () => {
            try {
                const { data } = await axios.get('https://api.srtutorsbureau.com/autocomplete', {
                    params: { input }
                });
                setState(prev => ({
                    ...prev,
                    suggestions: data || [],
                    loading: false,
                    activeInput: type
                }));
            } catch (error) {
                console.error('Suggestion error:', error);
                setState(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Failed to fetch suggestions'
                }));
            }
        }, 300);
    };

    const handleLocationSelect = async (location) => {
        try {
            const endpoint = `https://api.srtutorsbureau.com/geocode?address=${encodeURIComponent(location)}`;
            const response = await axios.get(endpoint);

            if (state.activeInput === 'pickup') {
                setState(prev => ({ ...prev, pickup: location, suggestions: [] }));
                setRideData(prev => ({
                    ...prev,
                    pickup: {
                        latitude: response.data.latitude,
                        longitude: response.data.longitude,
                        description: location
                    }
                }));
            } else {
                setState(prev => ({ ...prev, dropoff: location, suggestions: [] }));
                setRideData(prev => ({
                    ...prev,
                    dropoff: {
                        latitude: response.data.latitude,
                        longitude: response.data.longitude,
                        description: location
                    }
                }));
            }
        } catch (error) {
            console.error('Location select error:', error);
            Alert.alert('Error', 'Failed to get location coordinates');
        }

        setState(prev => ({ ...prev, activeInput: null }));
        Keyboard.dismiss();
    };

    const handleSubmit = () => {
        if (!rideData.pickup.latitude || !rideData.dropoff.latitude) {
            Alert.alert('Error', 'Please select both pickup and drop-off locations');
            return;
        }
        navigation.navigate('second_step_of_booking', { data: rideData });
    };

    const renderMapView = () => (
        <SafeAreaView style={styles.container}>
            <View style={styles.mapHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setState(prev => ({ ...prev, showMap: false }))}
                >
                    <Icon name="arrow-left" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.mapHeaderTitle}>
                    Select {state.mapType === 'pickup' ? 'Pickup' : 'Drop-off'} Location
                </Text>
            </View>

            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    region={region}
                    onRegionChangeComplete={handleMapRegionChange}
                    showsUserLocation
                    showsMyLocationButton
                >
                    <Marker
                        coordinate={{
                            latitude: region.latitude,
                            longitude: region.longitude
                        }}
                        pinColor={state.mapType === 'pickup' ? 'green' : 'red'}
                    />
                </MapView>
                <View style={styles.centerMarker}>
                    <Icon name="map-marker" size={40} color={state.mapType === 'pickup' ? 'green' : 'red'} />
                </View>
            </View>

            <View style={styles.mapFooter}>
                <Text numberOfLines={2} style={styles.mapAddressText}>
                    {state.mapType === 'pickup' ? state.pickup : state.dropoff || 'Move map to select location'}
                </Text>
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => setState(prev => ({ ...prev, showMap: false }))}
                >
                    <Text style={styles.confirmButtonText}>Confirm Location</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

    if (state.showMap) return renderMapView();

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Where to?</Text>
                </View>

                <View style={styles.inputsContainer}>
                    <View style={styles.inputWrapper}>
                        <Icon name="circle-small" size={24} color="green" />
                        <TextInput
                            ref={pickupInputRef}
                            style={[styles.input, { height: Math.max(70, state.inputHeight) }]}
                            placeholder="Enter pickup location"
                            value={state.pickup}
                            onChangeText={(text) => {
                                setState(prev => ({ ...prev, pickup: text }));
                                fetchSuggestions(text, 'pickup');
                            }}
                            onContentSizeChange={(event) => {
                                const contentSize = event?.nativeEvent?.contentSize;
                                // console.log("contentSize",contentSize)
                                if (contentSize) {
                                    setState(prev => ({
                                        ...prev,
                                        inputHeight: contentSize.height,
                                    }));
                                }
                            }}
                            multiline
                        />

                        <TouchableOpacity
                            onPress={() => {
                                setState(prev => ({
                                    ...prev,
                                    showMap: true,
                                    mapType: 'pickup'
                                }));
                            }}
                        >
                            <Icon name="map-marker" size={24} color="#35C14F" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputWrapper}>
                        <Icon name="circle-small" size={24} color="red" />
                        <TextInput
                            ref={dropoffInputRef}
                            style={[styles.input, { height: Math.max(70, state.inputHeight) }]}
                            placeholder="Enter drop-off location"
                            value={state.dropoff}
                            onChangeText={(text) => {
                                setState(prev => ({ ...prev, dropoff: text }));
                                fetchSuggestions(text, 'dropoff');
                            }}
                            onContentSizeChange={(event) => {
                                const contentSize = event?.nativeEvent?.contentSize;
                                if (contentSize) {
                                    setState(prev => ({
                                        ...prev,
                                        inputHeight: contentSize.height,
                                    }));
                                }
                            }}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={() => {
                                setState(prev => ({
                                    ...prev,
                                    showMap: true,
                                    mapType: 'dropoff'
                                }));
                            }}
                        >
                            <Icon name="map-marker" size={24} color="red" />
                        </TouchableOpacity>
                    </View>
                </View>

                {state.loading && (
                    <ActivityIndicator style={styles.loader} size="large" color="#000" />
                )}

                {state.suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                        {state.suggestions.map((suggestion, index) => (
                            <Pressable
                                key={index}
                                style={styles.suggestionItem}
                                onPress={() => handleLocationSelect(suggestion.description)}
                                android_ripple={{ color: '#eee' }}
                            >
                                <Icon name="map-marker" size={20} color="#D93A2D" />
                                <Text numberOfLines={1} style={styles.suggestionText}>{suggestion.description}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                {rideData.pickup.latitude && rideData.dropoff.latitude && !state.suggestions.length && (
                    <View style={styles.previewMapContainer}>
                        <MapView
                            ref={mapRef}
                            provider={PROVIDER_GOOGLE}
                            style={styles.previewMap}
                            region={region}
                            showsUserLocation
                        >
                            <Marker
                                coordinate={{
                                    latitude: rideData.pickup.latitude,
                                    longitude: rideData.pickup.longitude
                                }}
                                pinColor="green"
                            />
                            <Marker
                                coordinate={{
                                    latitude: rideData.dropoff.latitude,
                                    longitude: rideData.dropoff.longitude
                                }}
                                pinColor="red"
                            />
                            <MapViewDirections
                                origin={rideData.pickup}
                                destination={rideData.dropoff}
                                apikey={GOOGLE_MAPS_APIKEY}
                                strokeWidth={3}
                                strokeColor="#000"
                            />
                        </MapView>
                    </View>
                )}

                {rideData.pickup.latitude && rideData.dropoff.latitude && !state.suggestions.length && (
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                    >
                        <Icon name="car" size={24} color="white" />
                        <Text style={styles.submitButtonText}>Find Riders</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default Collect_Data;