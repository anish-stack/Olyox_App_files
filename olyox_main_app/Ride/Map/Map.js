import { useEffect, useState } from 'react';
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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';

const GOOGLE_MAPS_APIKEY = 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34';
export default function Map({ origin, destination }) {

    const [loading, setLoading] = useState(true);


    useEffect(() => {
        setTimeout(() => setLoading(false), 2000); // Simulate a delay for loading state
    }, []);

    return (
        <View style={styles.mapContainer}>
            {loading ? (
                <ActivityIndicator size="large" color="#23527C" />
            ) : (
                <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.map}
                    initialRegion={{
                        latitude: origin.latitude,
                        longitude: origin.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                    showsUserLocation={true}
                    onMapReady={() => setLoading(false)}
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
                            setLoading(true); // Show loader
                            console.log("Fetching directions...");
                        }}
                        onReady={(result) => {
                            setLoading(false);
                            console.log("Directions ready:", result);
                        }}
                        onError={(error) => {
                            setLoading(false);
                            console.error("Error fetching directions:", error);
                        }}
                    />
                    {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />}
                </MapView>
            )}
        </View>
    )
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
})