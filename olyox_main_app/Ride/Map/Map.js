import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Dimensions,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const GOOGLE_MAPS_APIKEY = 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8';
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const DEFAULT_PADDING = { top: 100, right: 100, bottom: 100, left: 100 };
const INITIAL_REGION = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0922 * ASPECT_RATIO,
};

const Map = ({ origin, destination, isFakeRiderShow = false }) => {
    const mapRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fakeRiders, setFakeRiders] = useState([]);

    // Memoize map style to prevent unnecessary re-renders
    const mapStyle = useMemo(() => ({
        light: [
            {
                featureType: 'all',
                elementType: 'geometry',
                stylers: [{ color: '#f5f5f5' }]
            },
            {
                featureType: 'road',
                elementType: 'geometry',
                stylers: [{ color: '#ffffff' }]
            },
            {
                featureType: 'water',
                elementType: 'geometry',
                stylers: [{ color: '#e9e9e9' }]
            }
        ]
    }), []);

    // Generate fake riders only once when needed
    useEffect(() => {
        if (isFakeRiderShow && origin) {
            const riders = Array.from({ length: 5 }, (_, i) => ({
                id: `rider-${i}`,
                coordinate: {
                    latitude: origin.latitude + (Math.random() - 0.5) * 0.01,
                    longitude: origin.longitude + (Math.random() - 0.5) * 0.01,
                },
                type: ['car', 'suv', 'premium'][Math.floor(Math.random() * 3)]
            }));
            setFakeRiders(riders);
        }
    }, [isFakeRiderShow, origin]);
    useEffect(() => {
        if (isFakeRiderShow && fakeRiders.length && mapRef.current) {
          const coordinates = fakeRiders.map(rider => rider.coordinate);
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
            animated: true,
          });
        }
      }, [isFakeRiderShow, fakeRiders]);

    // Fit map to show all markers
    const fitToMarkers = () => {
        if (!mapRef.current || !origin || !destination) return;

        const coordinates = [origin, destination];
        if (fakeRiders.length > 0) {
            coordinates.push(...fakeRiders.map(rider => rider.coordinate));
        }

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: DEFAULT_PADDING,
            animated: true
        });
    };

    // Handle map ready event
    const onMapReady = () => {
        setLoading(false);
        fitToMarkers();
    };

    // Render vehicle marker based on type
    const renderVehicleMarker = (type) => {
        switch (type) {
            case 'car':
                return <MaterialIcons name="local-taxi" size={24} color="#000" />;
            case 'suv':
                return <MaterialIcons name="directions-car" size={24} color="#000" />;
            case 'premium':
                return <MaterialIcons name="star" size={24} color="#000" />;
            default:
                return <MaterialIcons name="local-taxi" size={24} color="#000" />;
        }
    };

    //   console.log(isFakeRiderShow)
    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={INITIAL_REGION}
                customMapStyle={mapStyle.light}
                onMapReady={onMapReady}
                showsUserLocation
                showsMyLocationButton
                showsCompass
                tracksViewChanges={false}
                rotateEnabled={false}
            >
                {origin && (
                    <Marker coordinate={origin} title="Pickup">
                        <View style={[styles.markerContainer, styles.originMarker]}>
                            <MaterialIcons name="trip-origin" size={24} color="#4CAF50" />
                        </View>
                    </Marker>
                )}

                {destination && (
                    <Marker coordinate={destination} title="Dropoff">
                        <View style={[styles.markerContainer, styles.destinationMarker]}>
                            <MaterialIcons name="place" size={24} color="#F44336" />
                        </View>
                    </Marker>
                )}

                {isFakeRiderShow && fakeRiders.map((rider) => {
                    
                    return (
                        <Marker
                            key={rider.id}
                            coordinate={rider.coordinate}
                            flat
                            tracksViewChanges={false}
                        >
                            <View style={styles.vehicleMarker}>
                                {renderVehicleMarker(rider.type)}
                            </View>
                        </Marker>
                    );
                })}


                {origin && destination && (
                    <MapViewDirections
                        origin={origin}
                        destination={destination}
                        apikey={GOOGLE_MAPS_APIKEY}
                        strokeWidth={4}
                        strokeColor="#2196F3"
                        mode="DRIVING"
                        precision="high"
                        onReady={fitToMarkers}
                        onError={(errorMessage) => {
                            setError('Failed to load directions');
                            console.warn('MapViewDirections Error:', errorMessage);
                        }}
                    />
                )}
            </MapView>

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            )}

            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={fitToMarkers}
                >
                    <MaterialIcons name="center-focus-strong" size={24} color="#2196F3" />
                </TouchableOpacity>
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    controls: {
        position: 'absolute',
        right: 16,
        bottom: 16,
    },
    controlButton: {
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    markerContainer: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'white',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },

    vehicleMarker: {
        padding: 8,
        borderRadius: 20,
       
    },
    errorContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    errorText: {
        color: '#F44336',
        textAlign: 'center',
    },
});

export default React.memo(Map);