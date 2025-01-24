import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import ErrorBoundary from './ErrorBoundary';

const GOOGLE_MAPS_APIKEY = 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34';

export default function Map({ origin, destination }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setError('Map loading timed out. Please check your internet connection and try again.');
                setLoading(false);
            }
        }, 10000); // 10 seconds timeout

        return () => clearTimeout(timer);
    }, [loading]);

    const handleRetry = () => {
        setLoading(true);
        setError(null);
        setRetryCount(prevCount => prevCount + 1);
    };

    const handleMapError = (e) => {
        console.error('Map error:', e);
        setError('An error occurred while loading the map. Please try again.');
        setLoading(false);
    };

    const handleDirectionsError = (e) => {
        console.error('Directions error:', e);
        setError('Unable to fetch directions. Please check your internet connection and try again.');
        setLoading(false);
    };

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="alert-circle-outline" size={50} color="#F44336" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ErrorBoundary>
            <View style={styles.mapContainer}>
                {loading && <ActivityIndicator size="large" color="#23527C" style={styles.loader} />}
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        latitude: origin.latitude,
                        longitude: origin.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    showsUserLocation={true}
                    onMapReady={() => setLoading(false)}
                    onError={handleMapError}
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
                        strokeWidth={4}
                        strokeColor="#FF6666"
                        onStart={() => {
                            setLoading(true);
                            console.log("Fetching directions...");
                        }}
                        onReady={(result) => {
                            setLoading(false);
                            console.log("Directions ready:", result);
                        }}
                        onError={handleDirectionsError}
                    />
                </MapView>
            </View>
        </ErrorBoundary>
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
});
