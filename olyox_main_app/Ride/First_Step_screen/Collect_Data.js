import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Pressable,
    StyleSheet,
    Dimensions,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Input from '../../components/forms/Input';
import { COLORS } from '../../constants/colors';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import styles from './Styles'
const GOOGLE_MAPS_APIKEY = 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34';
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function Collect_Data() {
    // Refs
    const mapRef = useRef(null);
    const timeoutRef = useRef(null);

    // Navigation
    const navigation = useNavigation();

    // State variables
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeInput, setActiveInput] = useState(null);
    const [showMap, setShowMap] = useState(false);
    const [mapType, setMapType] = useState(null); // 'pickup' or 'dropoff'
    const [rideData, setRideData] = useState({
        pickup: { latitude: 0, longitude: 0, description: '' },
        dropoff: { latitude: 0, longitude: 0, description: '' },
    });
    const [region, setRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
    });
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

    // Check location permissions on mount
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                setLocationPermissionGranted(true);
                fetchCurrentLocation();
            } else {
                Alert.alert(
                    "Permission Denied",
                    "Location permission is required to use this feature.",
                    [{ text: "OK" }]
                );
            }
        })();

        return () => {
            // Clear any pending timeouts when component unmounts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Fetch current location with better error handling
    const fetchCurrentLocation = async () => {
        setIsFetchingLocation(true);
        setError('');

        try {
            // Get current position with high accuracy and timeout
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                mayShowUserSettingsDialog: true
            });

            if (location) {
                // Update map region
                const newRegion = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                };

                setRegion(newRegion);

                // Reverse geocode to get address
                const response = await axios.post('https://api.srtutorsbureau.com/Fetch-Current-Location', {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                });

                const currentLocation = response?.data?.data?.address?.completeAddress;

                if (currentLocation) {
                    setPickup(currentLocation);
                    setRideData(prev => ({
                        ...prev,
                        pickup: {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            description: currentLocation
                        }
                    }));
                } else {
                    throw new Error('Could not determine address from coordinates');
                }
            }
        } catch (error) {
            console.error('Error fetching location:', error);
            setError('Failed to get your current location. Please enter it manually.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    // Debounced search for location suggestions
    const fetchSuggestions = (input) => {
        if (!input || input.length < 3) {
            setSuggestions([]);
            return;
        }

        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        setLoading(true);

        // Debounce API calls
        timeoutRef.current = setTimeout(async () => {
            try {
                const { data } = await axios.get('https://api.srtutorsbureau.com/autocomplete', {
                    params: { input },
                });
                setSuggestions(data || []);
            } catch (err) {
                console.error('Suggestion error:', err);
                setError('Failed to fetch locations. Please try again.');
            } finally {
                setLoading(false);
            }
        }, 300);
    };

    // Handle location selection from suggestions
    const handleLocationSelect = async (location) => {
        try {
            if (activeInput === 'pickup') {
                setPickup(location);

                // Geocode the selected location
                const pickupData = await axios.get(`https://api.srtutorsbureau.com/geocode?address=${encodeURIComponent(location)}`);

                if (pickupData.data?.latitude) {
                    setRideData(prev => ({
                        ...prev,
                        pickup: {
                            latitude: pickupData.data.latitude,
                            longitude: pickupData.data.longitude,
                            description: location
                        }
                    }));
                }
            } else {
                setDropoff(location);

                // Geocode the selected location
                const dropoffData = await axios.get(`https://api.srtutorsbureau.com/geocode?address=${encodeURIComponent(location)}`);

                if (dropoffData.data?.latitude) {
                    setRideData(prev => ({
                        ...prev,
                        dropoff: {
                            latitude: dropoffData.data.latitude,
                            longitude: dropoffData.data.longitude,
                            description: location
                        }
                    }));
                }
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            setError('Failed to get coordinates for the selected location.');
        }

        setSuggestions([]);
        setActiveInput(null);
    };

    // Open map for location selection
    const openMapForSelection = (type) => {
        setMapType(type);
        setShowMap(true);

        // Set initial map region based on existing data
        if (type === 'pickup' && rideData.pickup.latitude) {
            setRegion({
                latitude: rideData.pickup.latitude,
                longitude: rideData.pickup.longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            });
        } else if (type === 'dropoff' && rideData.dropoff.latitude) {
            setRegion({
                latitude: rideData.dropoff.latitude,
                longitude: rideData.dropoff.longitude,
                latitudeDelta: LATITUDE_DELTA,
                longitudeDelta: LONGITUDE_DELTA,
            });
        }
    };

    // Handle map marker drag end
    const handleMarkerDragEnd = async (e) => {
        try {
            if (!e?.nativeEvent?.coordinate) {
                console.error("Invalid marker event");
                return;
            }

            const { latitude, longitude } = e.nativeEvent.coordinate;
            console.log("Dragged Coordinates:", latitude, longitude);

            // Show loading
            setLoading(true);

            // Reverse geocode the coordinates
            const response = await axios.post('https://api.srtutorsbureau.com/Fetch-Current-Location', {
                lat: latitude,
                lng: longitude,
            });

            const address = response?.data?.data?.address?.completeAddress || "Unknown location";

            if (mapType === 'pickup') {
                setPickup(address);
                setRideData(prev => ({
                    ...prev,
                    pickup: {
                        latitude,
                        longitude,
                        description: address
                    }
                }));
            } else {
                setDropoff(address);
                setRideData(prev => ({
                    ...prev,
                    dropoff: {
                        latitude,
                        longitude,
                        description: address
                    }
                }));
            }

        } catch (error) {
            console.error('Reverse geocoding error:', error);
            Alert.alert("Location Error", "Failed to fetch address. Please try again.");
        } finally {
            // Hide loading
            setLoading(false);
        }
    };


    // Confirm map selection
    const confirmMapSelection = () => {
        setShowMap(false);
    };

    // Handle form submission
    const handleSubmit = () => {
        if (!pickup || !dropoff) {
            setError('Please select both pickup and drop-off locations');
            return;
        }

        if (!rideData.pickup.latitude || !rideData.dropoff.latitude) {
            setError('Location coordinates are missing. Please try again.');
            return;
        }

        // Navigate to next screen with ride data
        navigation.navigate('second_step_of_booking', { data: rideData });
    };

    // Fit map to show both markers
    const fitMapToMarkers = () => {
        if (mapRef.current && rideData.pickup.latitude && rideData.dropoff.latitude) {
            mapRef.current.fitToCoordinates(
                [
                    { latitude: rideData.pickup.latitude, longitude: rideData.pickup.longitude },
                    { latitude: rideData.dropoff.latitude, longitude: rideData.dropoff.longitude }
                ],
                {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                }
            );
        }
    };

    // Effect to fit map when both locations are set
    useEffect(() => {
        if (rideData.pickup.latitude && rideData.dropoff.latitude) {
            timeoutRef.current = setTimeout(() => {
                fitMapToMarkers();
            }, 500);
        }
    }, [rideData.pickup.latitude, rideData.dropoff.latitude]);

    // Truncate text for display
    const truncateText = (text, maxLength = 30) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Render map view
    if (showMap) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.mapHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowMap(false)}
                    >
                        <Icon name="arrow-left" size={24} color={COLORS.zom} />
                    </TouchableOpacity>
                    <Text style={styles.mapHeaderTitle}>
                        Select {mapType === 'pickup' ? 'Pickup' : 'Drop-off'} Location
                    </Text>
                </View>

                <MapView
                    ref={mapRef}
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    region={region}
                    onRegionChangeComplete={setRegion}
                >
                    <Marker
                        coordinate={{
                            latitude: region.latitude,
                            longitude: region.longitude
                        }}
                        draggable
                        onPress={(e) => {
                            console.log("Marker clicked:", e.nativeEvent.coordinate);
                            handleMarkerDragEnd(e);
                        }}
                        onDragEnd={(e) => {
                            console.log("Marker dragged:", e.nativeEvent.coordinate);
                            handleMarkerDragEnd(e);
                        }}
                        pinColor={mapType === 'pickup' ? 'green' : 'red'}
                    />


                    {/* Show both markers and directions if both locations exist */}
                    {!mapType && rideData.pickup.latitude && rideData.dropoff.latitude && (
                        <>
                            <Marker
                                coordinate={{
                                    latitude: rideData.pickup.latitude,
                                    longitude: rideData.pickup.longitude
                                }}
                                pinColor="green"
                                title="Pickup"
                            />
                            <Marker
                                coordinate={{
                                    latitude: rideData.dropoff.latitude,
                                    longitude: rideData.dropoff.longitude
                                }}
                                pinColor="red"
                                title="Drop-off"
                            />
                            <MapViewDirections
                                origin={{
                                    latitude: rideData.pickup.latitude,
                                    longitude: rideData.pickup.longitude
                                }}
                                destination={{
                                    latitude: rideData.dropoff.latitude,
                                    longitude: rideData.dropoff.longitude
                                }}
                                apikey={GOOGLE_MAPS_APIKEY}
                                strokeWidth={3}
                                strokeColor={COLORS.zom}
                            />
                        </>
                    )}
                </MapView>

                <View style={styles.mapFooter}>
                    <Text style={styles.mapAddressText}>
                        {mapType === 'pickup' ? pickup : dropoff || 'Move the pin to select location'}
                    </Text>
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={confirmMapSelection}
                    >
                        <Text style={styles.confirmButtonText}>Confirm Location</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Render main location picker view
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Where to?</Text>
            </View>

            <View style={styles.card}>
                {/* Location inputs */}
                <View style={styles.locationCard}>
                    <View style={styles.inputsContainer}>
                        {/* Pickup input */}
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
                                <TouchableOpacity
                                    style={styles.mapButton}
                                    onPress={() => openMapForSelection('pickup')}
                                >
                                    <Icon name="map-marker" size={24} color={COLORS.zom} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Dropoff input */}
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
                                <TouchableOpacity
                                    style={styles.mapButton}
                                    onPress={() => openMapForSelection('dropoff')}
                                >
                                    <Icon name="map-marker" size={24} color={COLORS.zom} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Loading indicators */}
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
                ) : null}

                {/* Location suggestions */}
                {suggestions.length > 0 && (
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
                )}

                {/* Preview map when both locations are set */}
                {rideData.pickup.latitude > 0 && rideData.dropoff.latitude > 0 && !suggestions.length && (
                    <View style={styles.previewMapContainer}>
                        <MapView
                            ref={mapRef}
                            provider={PROVIDER_GOOGLE}
                            style={styles.previewMap}
                            initialRegion={{
                                latitude: rideData.pickup.latitude,
                                longitude: rideData.pickup.longitude,
                                latitudeDelta: LATITUDE_DELTA,
                                longitudeDelta: LONGITUDE_DELTA,
                            }}
                            onMapReady={fitMapToMarkers}
                        >
                            <Marker
                                coordinate={{
                                    latitude: rideData.pickup.latitude,
                                    longitude: rideData.pickup.longitude
                                }}
                                pinColor="green"
                                title="Pickup"
                            />
                            <Marker
                                coordinate={{
                                    latitude: rideData.dropoff.latitude,
                                    longitude: rideData.dropoff.longitude
                                }}
                                pinColor="red"
                                title="Drop-off"
                            />
                            <MapViewDirections
                                origin={{
                                    latitude: rideData.pickup.latitude,
                                    longitude: rideData.pickup.longitude
                                }}
                                destination={{
                                    latitude: rideData.dropoff.latitude,
                                    longitude: rideData.dropoff.longitude
                                }}
                                apikey={GOOGLE_MAPS_APIKEY}
                                strokeWidth={3}
                                strokeColor={COLORS.zom}
                            />
                        </MapView>
                    </View>
                )}

                {/* Submit button */}
                {rideData.pickup.latitude > 0 && rideData.dropoff.latitude > 0 && !suggestions.length && (
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

