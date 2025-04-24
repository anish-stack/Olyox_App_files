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
  Dimensions,
  Linking,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker,Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import PolylineDecoder from '@mapbox/polyline';
import axios from 'axios'
// Component imports
import { OtpCard } from './otp-card';
import { DriverCard } from './driver-card';
import { LocationCard } from './location-card';
import { PriceCard } from './price-card';

// Default locations (Delhi, India)
const DEFAULT_USER_LOCATION = { latitude: 28.7041, longitude: 77.1025 };
const DEFAULT_DRIVER_LOCATION = { latitude: 28.7045, longitude: 77.1030 };
const DEFAULT_DROP_LOCATION = { latitude: 28.7050, longitude: 77.1035 };
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
  // Refs
  console.log("rideDetails",rideDetails)
  const mapRef = useRef(null);

  // State
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const [driverLocation, setDriverLocation] = useState(DEFAULT_DRIVER_LOCATION);
  const [dropLocation, setDropLocation] = useState(DEFAULT_DROP_LOCATION);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [coordinates, setCoordinates] = useState([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Safely extract coordinates from rideDetails
  useEffect(() => {
    try {
      setIsLoading(true);

      // Safely extract drop coordinates
      if (rideDetails && rideDetails.drop_cord) {
        // Handle different possible structures
        if (rideDetails.drop_cord.coordinates && Array.isArray(rideDetails.drop_cord.coordinates)) {
          // Format: { coordinates: [longitude, latitude], type: "Point" }
          setDropLocation({
            latitude: rideDetails.drop_cord.coordinates[1] || DEFAULT_DROP_LOCATION.latitude,
            longitude: rideDetails.drop_cord.coordinates[0] || DEFAULT_DROP_LOCATION.longitude
          });
        } else if (rideDetails.drop_cord.coordinate && Array.isArray(rideDetails.drop_cord.coordinate)) {
          // Format: { coordinate: [longitude, latitude] }
          setDropLocation({
            latitude: rideDetails.drop_cord.coordinate[1] || DEFAULT_DROP_LOCATION.latitude,
            longitude: rideDetails.drop_cord.coordinate[0] || DEFAULT_DROP_LOCATION.longitude
          });
        } else {
          // Fallback to default
          console.warn('Drop coordinates in unexpected format, using default');
          setDropLocation(DEFAULT_DROP_LOCATION);
        }
      } else {
        // Fallback to default
        console.warn('No drop coordinates found, using default');
        setDropLocation(DEFAULT_DROP_LOCATION);
      }

      // Safely extract pickup coordinates
      if (rideDetails && rideDetails.pickupLocation) {
        if (rideDetails.pickupLocation.coordinates && Array.isArray(rideDetails.pickupLocation.coordinates)) {
          // Only update if we don't have current location
          if (!currentLocation || !currentLocation.latitude) {
            setUserLocation({
              latitude: rideDetails.pickupLocation.coordinates[1] || DEFAULT_USER_LOCATION.latitude,
              longitude: rideDetails.pickupLocation.coordinates[0] || DEFAULT_USER_LOCATION.longitude
            });
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      setMapError('Failed to load map coordinates');
      setIsLoading(false);
    }
  }, [rideDetails, currentLocation])

  // Update user location from props
  useEffect(() => {
    try {
      if (
        currentLocation &&
        typeof currentLocation.latitude === 'number' &&
        typeof currentLocation.longitude === 'number'
      ) {
        console.log("Maps ")
        setUserLocation({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        });
      }
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  }, [currentLocation]);

  useEffect(() => {
    const fetchDirections = async () => {
      try {
        console.log("Fetching directions...");

        // Prepare the pickup and dropoff data
        const pickup = {
          latitude: rideDetails?.pickupLocation?.coordinates[1],
          longitude: rideDetails?.pickupLocation?.coordinates[0]
        };
        const dropoff = {
          latitude: rideDetails?.drop_cord?.coordinates[1],
          longitude: rideDetails?.drop_cord?.coordinates[0]
        };

        // Send the pickup and dropoff coordinates to your backend API
        const response = await axios.post('http://192.168.1.47:3100/directions', { pickup, dropoff });

        const json = response.data;
        console.log("Fetching directions json...", json);

        if (json?.polyline) {
          const decodedCoords = PolylineDecoder.decode(json.polyline).map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          }));
          setCoordinates(decodedCoords);
        }

        if (json?.distance) setDistance(json.distance);
        if (json?.duration) setDuration(json.duration);
      } catch (err) {
        console.error("Error fetching directions:", err.response.data);
      }
    };

    // Only fetch directions if rideData is available and valid
    fetchDirections()
  }, []); // Dependency array includes rideData so it refetches when it changes.


  // Update driver location from props
  useEffect(() => {
    try {
      if (driverLocationCurrent) {
        if (Array.isArray(driverLocationCurrent) && driverLocationCurrent.length >= 2) {
          // Format: [longitude, latitude]
          setDriverLocation({
            latitude: driverLocationCurrent[1] || DEFAULT_DRIVER_LOCATION.latitude,
            longitude: driverLocationCurrent[0] || DEFAULT_DRIVER_LOCATION.longitude
          });
        } else if (
          typeof driverLocationCurrent === 'object' &&
          'latitude' in driverLocationCurrent &&
          'longitude' in driverLocationCurrent
        ) {
          // Format: { latitude, longitude }
          setDriverLocation(driverLocationCurrent);
        }
      }
    } catch (error) {
      console.error('Error updating driver location:', error);
    }
  }, [driverLocationCurrent]);

  // Share current location
  const shareLocation = useCallback(async () => {
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
  }, [userLocation]);

  // Open in Google Maps
  const openInGoogleMaps = useCallback(() => {
    try {
      const origin = `${userLocation.latitude},${userLocation.longitude}`;
      const destination = rideStart
        ? `${dropLocation.latitude},${dropLocation.longitude}`
        : `${driverLocation.latitude},${driverLocation.longitude}`;

      const url = Platform.select({
        ios: `comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=driving`,
        android: `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
      });

      // Check if Google Maps is installed
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          // Fallback to web if app is not installed
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`);
        }
      });
    } catch (error) {
      console.error('Error opening Google Maps:', error);
      Alert.alert('Error', 'Failed to open Google Maps.');
    }
  }, [userLocation, driverLocation, dropLocation, rideStart]);

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
      try {
        const coordinates = [
          { latitude: userLocation.latitude, longitude: userLocation.longitude },
          { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
        ];

        if (rideStart && dropLocation) {
          coordinates.push({ latitude: dropLocation.latitude, longitude: dropLocation.longitude });
        }

        mapRef.current.fitToCoordinates(
          coordinates,
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          }
        );
      } catch (error) {
        console.error('Error showing both locations:', error);
      }
    }
  }, [userLocation, driverLocation, dropLocation, rideStart]);

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
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }, []);

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
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


  // console.log("Origin",userLocation)
  // console.log("driver",driverLocation)


  // Validate that we have valid coordinates for directions
  const hasValidDirections = useCallback(() => {
    if (!userLocation || !driverLocation) return false;

    if (rideStart && !dropLocation) return false;

    // Check that all required coordinates are valid numbers
    const validUserLocation =
      typeof userLocation.latitude === 'number' &&
      typeof userLocation.longitude === 'number';

    const validDriverLocation =
      typeof driverLocation.latitude === 'number' &&
      typeof driverLocation.longitude === 'number';

    const validDropLocation = !rideStart || (
      typeof dropLocation.latitude === 'number' &&
      typeof dropLocation.longitude === 'number'
    );

    return validUserLocation && validDriverLocation && validDropLocation;
  }, [userLocation, driverLocation, dropLocation, rideStart]);

  // Get origin and destination for directions
  const getDirectionsPoints = useCallback(() => {
    if (!hasValidDirections()) return { origin: null, destination: null };

    return {
      origin: rideStart ? userLocation : driverLocation,
      destination: rideStart ? dropLocation : userLocation
    };
  }, [userLocation, driverLocation, dropLocation, rideStart, hasValidDirections]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C82333" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  // Render error state
  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="map-marker-alert" size={50} color="#C82333" />
        <Text style={styles.errorText}>{mapError}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setMapError(null);
            setIsLoading(true);
            // Retry loading after a short delay
            setTimeout(() => setIsLoading(false), 1000);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get directions points
  const { origin, destination } = getDirectionsPoints();

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE:PROVIDER_DEFAULT}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          style={styles.map}
          showsMyLocationButton={true}
          onMapReady={() => setIsMapReady(true)}
          onError={(error) => {
            console.error('Map error:', error);
            setMapError('Failed to load map');
          }}
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

          {/* Marker for drop location if ride has started */}
          {rideStart && (
            <Marker
              coordinate={dropLocation}
              title="Drop-off Location"
              description={rideDetails?.dropoff || "Destination"}
            >
              <View style={styles.dropMarker}>
                <MaterialCommunityIcons name="map-marker" size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Directions between points */}


              {Platform.OS === "ios" ? (
                coordinates.length > 0 && (
                  <Polyline
                    coordinates={coordinates}
                    strokeWidth={4}
                    strokeColor="#000000"
                  />
                )
              ) : (
                hasValidDirections() && origin && destination && (
                  <MapViewDirections
                    origin={origin}
                    destination={destination}
                    apikey={GOOGLE_MAPS_API_KEY}
                    strokeWidth={4}
                    strokeColor="#C82333"
                    optimizeWaypoints={true}
                    onReady={(result) => {
                      // If the directions API returns data, update with more accurate info
                      if (result) {
                        setDuration(result.duration);
                      }
                    }}
                    onError={(error) => {
                      console.error('Directions error:', error);
                    }}
                  />
                )
              )}




        
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
      </View>
        {/* <TouchableOpacity style={styles.googleMapsButton} onPress={openInGoogleMaps}>
          <MaterialCommunityIcons name="google-maps" size={24} color="#fff" />
          <Text style={styles.googleMapsButtonText}>Open in Google Maps</Text>
        </TouchableOpacity> */}

      {/* Google Maps Button */}


      {/* Share Location Button */}
      {/* <TouchableOpacity style={styles.shareButton} onPress={shareLocation}>
        <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
        <Text style={styles.shareButtonText}>Share My Location</Text>
      </TouchableOpacity> */}

      {/* Conditional Rendering for OTP Card */}
      {!rideStart && rideDetails?.otp && <OtpCard otp={rideDetails.otp} />}

      {/* Driver Card */}
      {driverData && <DriverCard driverData={driverData} rideDetails={rideDetails} />}

      {/* Location Card */}
      {rideDetails?.pickup && rideDetails?.dropoff && (
        <LocationCard pickup={rideDetails.pickup} dropoff={rideDetails.dropoff} />
      )}

      {/* Price Card */}
      {rideDetails?.price && <PriceCard price={rideDetails.price} />}

      {/* Support Button */}
      {/* <TouchableOpacity
        style={styles.supportButton}
        onPress={() => setSupportModalVisible && setSupportModalVisible(true)}
      >
        <MaterialCommunityIcons name="headset" size={24} color="#fff" />
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity> */}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#C82333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  dropMarker: {
    backgroundColor: '#047857',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  googleMapsButton: {
    backgroundColor: '#34A853',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#34A853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  googleMapsButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  supportButton: {
    backgroundColor: '#6B7280',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#6B7280',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  supportButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RideContent;