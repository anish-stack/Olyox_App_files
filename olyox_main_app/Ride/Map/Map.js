import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Dimensions,
    Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import ErrorBoundary from './ErrorBoundary';

const GOOGLE_MAPS_APIKEY = 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8';

export default function Map({ origin, destination }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [mapReady, setMapReady] = useState(false);
    const [directionsReady, setDirectionsReady] = useState(false);

    useEffect(() => {
        if (mapReady && directionsReady) {
            setLoading(false);
        }
    }, [mapReady, directionsReady]);

    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                if (!mapReady || !directionsReady) {
                    setError('Map loading timed out. Please check your internet connection.');
                    setLoading(false);
                }
            }, 15000); // 15 seconds timeout

            return () => clearTimeout(timer);
        }
    }, [loading, mapReady, directionsReady]);

    const handleRetry = () => {
        setError(null);
        setRetryCount(prev => prev + 1);
        setMapReady(false);
        setDirectionsReady(false);
        setLoading(true);
    };

    return (
        <View style={{ flex: 1 }}>
            {loading && <ActivityIndicator size="large" color="#23527C" style={{ position: 'absolute', top: '50%', left: '50%' }} />}
            {error && (
                <View style={{ position: 'absolute', top: '50%', left: '50%', backgroundColor: 'white', padding: 10, borderRadius: 5 }}>
                    <Text>{error}</Text>
                    <Button title="Retry" onPress={handleRetry} />
                </View>
            )}
            <MapView
                key={`map-${retryCount}`}
                provider={PROVIDER_GOOGLE}
                style={{ flex: 1 }}
                initialRegion={{
                    latitude: origin.latitude,
                    longitude: origin.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
                showsUserLocation={true}
                onMapReady={() => setMapReady(true)}
                onError={() => setError('Failed to load map.')}
            >
                <Marker coordinate={origin} title="Pickup">
                    <Icon name="nature-people" size={40} color="#23527C" />
                </Marker>
                <Marker coordinate={destination} title="Dropoff">
                    <Icon name="map-marker" size={40} color="#F44336" />
                </Marker>
                <MapViewDirections
                    origin={origin}
                    destination={destination}
                    apikey={GOOGLE_MAPS_APIKEY}
                    strokeWidth={5}
                    strokeColor="#23527C"
                    onReady={(result) => {
                        if (result?.coordinates) {
                            setDirectionsReady(true);
                        }
                    }}
                    onError={() => setError('Failed to load directions.')}
                />
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    mapContainer: {
        height: 400,
        backgroundColor: '#f0f0f0',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: 1,
    },
    errorContainer: {
        height: 400,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginVertical: 10,
    },
    retryButton: {
        backgroundColor: '#23527C',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    fallbackButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 5,
        marginTop: 10,
    },
    fallbackButtonText: {
        color: '#fff',
        fontSize: 16,
    }
});