import React, { useCallback, useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Text, 
  Alert, 
  Share, 
  Platform,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';

// Component imports
import { OtpCard } from './otp-card';
import { DriverCard } from './driver-card';
import { LocationCard } from './location-card';
import { PriceCard } from './price-card';

// Default locations (Delhi, India)
const DEFAULT_USER_LOCATION = { latitude: 28.7041, longitude: 77.1025 };
const DEFAULT_DRIVER_LOCATION = { latitude: 28.7045, longitude: 77.1030 };
const GOOGLE_MAPS_API_KEY = 'AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export const RideContent = React.memo(({
  rideStart,
  rideDetails,
  driverData,
  currentLocation,
  driverLocationCurrent,
  setSupportModalVisible
}) => {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const [driverLocation, setDriverLocation] = useState(DEFAULT_DRIVER_LOCATION);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);

  // Share current location
  const shareLocation = async () => {
    try {
      const locationUrl = `https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`;
      const message = `I'm currently on my way in a ride. Track my location here: ${locationUrl}`;

      await Share.share({
        message,
        title: 'My Current Location',
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location.');
    }
  };

  // Update user location from props
  useEffect(() => {
    const updateUserLocation = () => {
      if (
        currentLocation &&
        typeof currentLocation.latitude === 'number' &&
        typeof currentLocation.longitude === 'number'
      ) {
        setUserLocation({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        });
      } else {
        // fallback location
        setUserLocation(DEFAULT_USER_LOCATION);
      }
    };

    updateUserLocation();
  }, [currentLocation]);

  // Update driver location from props
  useEffect(() => {
    if (
      driverLocationCurrent && 
      Array.isArray(driverLocationCurrent) && 
      driverLocationCurrent.length >= 2
    ) {
      // Assuming driverLocationCurrent is [longitude, latitude]
      setDriverLocation({
        latitude: driverLocationCurrent[1] || DEFAULT_DRIVER_LOCATION.latitude,
        longitude: driverLocationCurrent[0] || DEFAULT_DRIVER_LOCATION.longitude
      });
    }
  }, [driverLocationCurrent]);

  // Function to zoom to driver location
  const zoomToDriverLocation = useCallback(() => {
    if (mapRef.current && driverLocation) {
      mapRef.current.animateToRegion({
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.01, // Zoomed in
        longitudeDelta: 0.01 * ASPECT_RATIO,
      }, 1000);
    }
  }, [driverLocation]);

  // Function to show both user and driver on map
  const showBothLocations = useCallback(() => {
    if (mapRef.current && userLocation && driverLocation) {
      mapRef.current.fitToCoordinates(
        [userLocation, driverLocation],
        {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        }
      );
    }
  }, [userLocation, driverLocation]);

  // Set map to show both locations when component mounts or locations change
  useEffect(() => {
    if (isMapReady && userLocation && driverLocation) {
      // Wait a bit for the map to fully initialize
      const timer = setTimeout(() => {
        showBothLocations();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isMapReady, userLocation, driverLocation, showBothLocations]);

  // Calculate straight-line distance between two points in km
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }, []);

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // Update distance when locations change
  useEffect(() => {
    if (userLocation && driverLocation) {
      const dist = calculateDistance(
        userLocation.latitude, 
        userLocation.longitude, 
        driverLocation.latitude, 
        driverLocation.longitude
      );
      setDistance(dist);
      
      // Estimate duration (assuming average speed of 30 km/h)
      const durationInMinutes = (dist / 30) * 60;
      setDuration(durationInMinutes);
    }
  }, [userLocation, driverLocation, calculateDistance]);

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          style={styles.map}
          onMapReady={() => setIsMapReady(true)}
        >
          {/* Marker for user's location */}
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="You are here"
          >
            <View style={styles.userMarker}>
              <MaterialCommunityIcons name="account" size={20} color="#fff" />
            </View>
          </Marker>

          {/* Marker for driver's location */}
          <Marker
            coordinate={driverLocation}
            title="Driver's Location"
            description={`${driverData?.name || 'Driver'} is here`}
          >
            <View style={styles.driverMarker}>
              <MaterialCommunityIcons name="car" size={20} color="#fff" />
            </View>
          </Marker>

          {/* Directions between user and driver */}
          <MapViewDirections
            origin={driverLocation}
            destination={userLocation}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#C82333"
            optimizeWaypoints={true}
            onReady={(result) => {
              // If the directions API returns data, update with more accurate info
              if (result) {
                setDistance(result.distance);
                setDuration(result.duration);
              }
            }}
          />
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.mapButton}
            onPress={zoomToDriverLocation}
          >
            <MaterialCommunityIcons name="car-connected" size={20} color="#fff" />
            <Text style={styles.mapButtonText}>Find Driver</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mapButton}
            onPress={showBothLocations}
          >
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fff" />
            <Text style={styles.mapButtonText}>Show Both</Text>
          </TouchableOpacity>
        </View>

        {/* Distance and ETA Info */}
        <View style={styles.distanceInfo}>
          <View style={styles.distanceItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#C82333" />
            <Text style={styles.distanceText}>
              {distance.toFixed(2)} km away
            </Text>
          </View>
          <View style={styles.distanceItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#C82333" />
            <Text style={styles.distanceText}>
              ETA: {Math.round(duration)} min
            </Text>
          </View>
        </View>
      </View>

      {/* Conditional Rendering for OTP Card */}
      {!rideStart && <OtpCard otp={rideDetails?.otp} />}

      {/* Driver Card */}
      <DriverCard driverData={driverData} rideDetails={rideDetails} />

      {/* Location Card */}
      <LocationCard pickup={rideDetails?.pickup} dropoff={rideDetails?.dropoff} />

      {/* Price Card */}
      <PriceCard price={rideDetails?.price} />

      {/* Share Location Button */}
      <TouchableOpacity
        style={styles.shareButton}
        onPress={shareLocation}
      >
        <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
        <Text style={styles.shareButtonText}>Share My Location</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  mapContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  map: {
    height: 300,
    width: '100%',
    borderRadius: 16,
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'column',
    gap: 8,
  },
  mapButton: {
    backgroundColor: '#C82333',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  distanceInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 10,
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  distanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  userMarker: {
    backgroundColor: '#4F46E5',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  driverMarker: {
    backgroundColor: '#C82333',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  shareButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  shareButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideContent;