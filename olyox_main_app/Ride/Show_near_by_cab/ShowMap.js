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
import { useRoute } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const GOOGLE_MAPS_APIKEY = 'AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34';
const { width } = Dimensions.get('window');

export default function ShowMap() {
  const route = useRoute();
  const { data } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const { dropoff, pickup } = data || {};
  const origin = { latitude: pickup?.latitude, longitude: pickup?.longitude };
  const destination = { latitude: dropoff?.latitude, longitude: dropoff?.longitude };
  useEffect(() => {
    setTimeout(() => {
      const nearbyDrivers = [
        {
          id: 1,
          name: 'Premium Sedan',
          type: 'car-estate',
          price: 350,
          time: '4 min',
          seats: 4,
          distance: '1.2 km',
          latitude: 28.7171663,  // example latitude
          longitude: 77.1260672  // example longitude
        },
        {
          id: 2,
          name: 'Comfort Ride',
          type: 'car',
          price: 250,
          time: '3 min',
          seats: 4,
          distance: '0.8 km',
          latitude: 28.7151663,  // example latitude
          longitude: 77.1250672  // example longitude
        },
        {
          id: 3,
          name: 'Bike Express',
          type: 'motorbike',
          price: 120,
          time: '2 min',
          seats: 1,
          distance: '0.5 km',
          latitude: 28.7181663,  // example latitude
          longitude: 77.1270672  // example longitude
        },
      ];
      setDrivers(nearbyDrivers);
      setLoading(false);
    }, 2000);
  }, []);


  const handleBookRide = (driver) => {
    alert(`Booking confirmed!\n${driver.name} for ₹${driver.price}`);
  };

  const LocationCard = ({ icon, title, address, isPickup }) => (
    <View style={styles.locationCard}>
      <Icon name={icon} size={24} color={isPickup ? '#FF6666' : '#F44336'} />
      <View style={styles.locationText}>
        <Text style={styles.locationTitle}>{title}</Text>
        <Text style={styles.locationAddress}>{address}</Text>
      </View>
    </View>
  );

  const RideOption = ({ driver }) => (
    <TouchableOpacity
      style={[
        styles.rideCard,
        selectedDriver?.id === driver.id && styles.selectedRideCard
      ]}
      onPress={() => setSelectedDriver(driver)}
    >
      <View style={styles.rideInfo}>
        <Icon name={driver.type} size={32} color="#333" />
        <View style={styles.rideDetails}>
          <Text style={styles.rideName}>{driver.name}</Text>
          <View style={styles.rideMetrics}>
            <Icon name="clock-outline" size={16} color="#666" />
            <Text style={styles.rideMetricText}>{driver.time}</Text>
            <Icon name="map-marker-distance" size={16} color="#666" />
            <Text style={styles.rideMetricText}>{driver.distance}</Text>
            <Icon name="account" size={16} color="#666" />
            <Text style={styles.rideMetricText}>{driver.seats} seats</Text>
          </View>
        </View>
        <Text style={styles.ridePrice}>₹{driver.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Icon name="arrow-left" size={28} color="#333" />
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <Icon name="dots-vertical" size={28} color="#333" />
      </View>

      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}

        initialRegion={{
          latitude: origin.latitude || 28.7161663,
          longitude: origin.longitude || 77.1240672,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
        toolbarEnabled={true}
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
        />
        {drivers.map((driver, index) => (
          <Marker
            key={driver.id}
            coordinate={{
              latitude: driver.latitude,
              longitude: driver.longitude
            }}
            title={driver.name}
            description={`₹${driver.price} | ${driver.time}`}
          >
            <Icon name={driver.type} size={32} color="#333" />
          </Marker>
        ))}
      </MapView>



      <View style={styles.rideContainer}>
        <Text style={styles.sectionTitle}>Available Rides</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#FF6666" style={styles.loader} />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {drivers.map(driver => (
              <RideOption key={driver.id} driver={driver} />
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[
            styles.bookButton,
            !selectedDriver && styles.bookButtonDisabled
          ]}
          disabled={!selectedDriver}
          onPress={() => selectedDriver && handleBookRide(selectedDriver)}
        >
          <Text style={styles.bookButtonText}>
            {selectedDriver ? `Book ${selectedDriver.name}` : 'Select a ride'}
          </Text>
          {selectedDriver && (
            <Text style={styles.bookButtonPrice}>₹{selectedDriver.price}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {

    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  map: {
    height: 300,
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    margin: 16,
    elevation: 2,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  locationAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  rideContainer: {

    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedRideCard: {
    borderColor: '#FF6666',
    backgroundColor: '#E3F2FD',
  },
  rideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideDetails: {
    flex: 1,
    marginLeft: 12,
  },
  rideName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rideMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rideMetricText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    marginRight: 12,
  },
  ridePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  bookButton: {
    backgroundColor: '#FF6666',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookButtonPrice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
  },
});