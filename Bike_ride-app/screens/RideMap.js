import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions, 
  Platform,
  ActivityIndicator
} from 'react-native';
import MapView, { 
  Marker, 
  PROVIDER_GOOGLE, 
  Region
} from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;
const GOOGLE_MAPS_APIKEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8";

// Default region (Delhi, India)
const DEFAULT_REGION = {
  latitude: 28.6139,
  longitude: 77.2090,
  latitudeDelta: LATITUDE_DELTA,
  longitudeDelta: LONGITUDE_DELTA,
};

// Validate coordinates to ensure they have valid lat/lng
const isValidCoordinate = (coord) => {
  return coord && 
    typeof coord === 'object' && 
    'latitude' in coord && 
    'longitude' in coord &&
    typeof coord.latitude === 'number' &&
    typeof coord.longitude === 'number' &&
    !isNaN(coord.latitude) &&
    !isNaN(coord.longitude);
};

const RideMap = ({
  mapRef,
  driverCoordinates,
  pickupCoordinates,
  dropCoordinates,
  currentLocation,
  rideStarted,
  mapReady,
  socketConnected,
  carIconAnimation,
  handleMapReady,
  openGoogleMapsDirectionsPickup,
  openGoogleMapsDirections,
  pickup_desc,
  drop_desc,
  updateState
}) => {
  // Validate input coordinates and use defaults if invalid
  const validDriverCoords = useMemo(() => 
    isValidCoordinate(driverCoordinates) ? driverCoordinates : DEFAULT_REGION,
    [driverCoordinates]
  );
  
  const validPickupCoords = useMemo(() => 
    isValidCoordinate(pickupCoordinates) ? pickupCoordinates : null,
    [pickupCoordinates]
  );
  
  const validDropCoords = useMemo(() => 
    isValidCoordinate(dropCoordinates) ? dropCoordinates : null,
    [dropCoordinates]
  );
  
  const validCurrentLocation = useMemo(() => 
    isValidCoordinate(currentLocation) ? currentLocation : validDriverCoords,
    [currentLocation, validDriverCoords]
  );

  // Local state
  const [initialRegion] = useState(validDriverCoords);
  const [isCalculating, setIsCalculating] = useState(false);
  const [routeInfo, setRouteInfo] = useState({ distance: '0.0', duration: '0' });
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Memoized values for performance
  const destination = useMemo(() => 
    rideStarted && validDropCoords ? validDropCoords : 
    validPickupCoords ? validPickupCoords : null, 
    [rideStarted, validDropCoords, validPickupCoords]
  );
  
  const routeColor = useMemo(() => 
    rideStarted ? '#FF3B30' : '#4CAF50', 
    [rideStarted]
  );

  // Start pulse animation for markers
  useEffect(() => {
    const startPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    startPulseAnimation();
    
    // Fade in UI elements
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    return () => {
      pulseAnim.stopAnimation();
      fadeAnim.stopAnimation();
    };
  }, []);
  
  // Safely fit map to markers
  const fitMapToMarkers = useCallback(() => {
    try {
      if (mapRef.current && mapLoaded) {
        // Filter out invalid coordinates
        const coordinates = [
          validCurrentLocation,
          validPickupCoords,
          validDropCoords
        ].filter(coord => isValidCoordinate(coord));
        
        if (coordinates.length > 1) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error("Error fitting to coordinates:", error);
      setMapError("Failed to adjust map view");
    }
  }, [mapRef, mapLoaded, validCurrentLocation, validPickupCoords, validDropCoords]);
  
  // Safe map ready handler
  const onMapReady = useCallback(() => {
    try {
      setMapLoaded(true);
      if (handleMapReady && typeof handleMapReady === 'function') {
        handleMapReady();
      }
      
      // Delay fitting to markers to ensure map is fully loaded
      setTimeout(() => {
        fitMapToMarkers();
      }, 1000);
    } catch (error) {
      console.error("Error in map ready handler:", error);
      setMapError("Map initialization error");
    }
  }, [handleMapReady, fitMapToMarkers]);
  
  // Handle route calculation completion
  const onRouteReady = useCallback((result) => {
    try {
      setIsCalculating(false);
      const { distance, duration } = result;
      
      // Format distance and duration
      const formattedDistance = distance.toFixed(1);
      const formattedDuration = Math.round(duration);
      
      setRouteInfo({
        distance: formattedDistance,
        duration: formattedDuration.toString(),
      });
      
      if (updateState && typeof updateState === 'function') {
        updateState({
          distanceToPickup: formattedDistance,
          timeToPickup: formattedDuration,
        });
      }
    } catch (error) {
      console.error("Error processing route data:", error);
    }
  }, [updateState]);
  
  // Re-center map on current location
  const centerOnLocation = useCallback(() => {
    try {
      if (mapRef.current && isValidCoordinate(validCurrentLocation)) {
        mapRef.current.animateToRegion({
          ...validCurrentLocation,
          latitudeDelta: LATITUDE_DELTA / 2,
          longitudeDelta: LONGITUDE_DELTA / 2,
        }, 500);
      }
    } catch (error) {
      console.error("Error centering on location:", error);
    }
  }, [mapRef, validCurrentLocation]);

  // Handle map errors
  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>Map Error: {mapError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setMapError(null)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onMapReady={onMapReady}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={true}
        loadingEnabled={true}
        loadingIndicatorColor="#FF3B30"
        onError={(error) => {
          console.error("Map error:", error);
          setMapError("Failed to load map");
        }}
      >
        {/* Driver/Current Location Marker */}
        {isValidCoordinate(validCurrentLocation) && (
          <Marker 
            coordinate={validCurrentLocation} 
            title="Your Location" 
            tracksViewChanges={false}
          >
            <Animated.View style={styles.markerContainer}>
              <View style={styles.driverMarker}>
                <FontAwesome5 name="car" size={20} color="#FFFFFF" />
              </View>
              <Animated.View
                style={[
                  styles.markerPulse,
                  {
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.4, 0],
                    }),
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 2],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </Animated.View>
          </Marker>
        )}

        {/* Pickup Location Marker */}
        {!rideStarted && isValidCoordinate(validPickupCoords) && (
          <Marker 
            coordinate={validPickupCoords} 
            title="Pickup Location" 
            description={pickup_desc || "Pickup Location"}
            tracksViewChanges={false}
          >
            <View style={styles.pickupMarker}>
              <MaterialIcons name="location-on" size={24} color="white" />
            </View>
          </Marker>
        )}

        {/* Drop Location Marker */}
        {isValidCoordinate(validDropCoords) && (
          <Marker 
            coordinate={validDropCoords} 
            title="Drop Location" 
            description={drop_desc || "Drop Location"}
            tracksViewChanges={false}
          >
            <View style={styles.dropMarker}>
              <MaterialIcons name="location-pin" size={24} color="white" />
            </View>
          </Marker>
        )}

        {/* Directions */}
        {mapReady && 
         isValidCoordinate(validCurrentLocation) && 
         destination && 
         isValidCoordinate(destination) && (
          <MapViewDirections
            origin={validCurrentLocation}
            destination={destination}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={5}
            strokeColor={routeColor}
            lineDashPattern={[0]}
            mode="DRIVING"
            precision="high"
            timePrecision="now"
            optimizeWaypoints={true}
            onStart={() => setIsCalculating(true)}
            onReady={onRouteReady}
            onError={(error) => {
              console.error("Directions error: ", error);
              setIsCalculating(false);
            }}
          />
        )}
      </MapView>

      {/* Connection Status Indicator */}
      <Animated.View style={[styles.connectionStatus, { opacity: fadeAnim }]}>
        <View style={[
          styles.connectionIndicator, 
          { backgroundColor: socketConnected ? '#4CAF50' : '#F44336' }
        ]}>
          <MaterialIcons 
            name={socketConnected ? "wifi" : "wifi-off"} 
            size={16} 
            color="white" 
          />
          <Text style={styles.connectionText}>
            {socketConnected ? "Connected" : "Disconnected"}
          </Text>
        </View>
      </Animated.View>

      {/* Route Info Card */}
      {mapReady && !isCalculating && (
        <Animated.View style={[styles.routeInfoCard, { opacity: fadeAnim }]}>
          <View style={styles.routeInfoRow}>
            <View style={styles.routeInfoItem}>
              <MaterialIcons name="directions-car" size={20} color="#FF3B30" />
              <Text style={styles.routeInfoText}>
                {routeInfo.distance} km
              </Text>
            </View>
            <View style={styles.routeInfoDivider} />
            <View style={styles.routeInfoItem}>
              <MaterialIcons name="access-time" size={20} color="#FF3B30" />
              <Text style={styles.routeInfoText}>
                {routeInfo.duration} min
              </Text>
            </View>
          </View>
          <Text style={styles.routeInfoDestination}>
            {rideStarted ? 'To Drop Point' : 'To Pickup Point'}
          </Text>
        </Animated.View>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={centerOnLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={fitMapToMarkers}
        >
          <MaterialIcons name="fit-screen" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.navigationButton, styles.pickupButton]}
          onPress={() => {
            if (typeof openGoogleMapsDirectionsPickup === 'function') {
              openGoogleMapsDirectionsPickup();
            }
          }}
        >
          <MaterialIcons name="navigation" size={20} color="#fff" />
          <Text style={styles.navigationButtonText}>Navigate to Pickup</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navigationButton, styles.dropButton]}
          onPress={() => {
            if (typeof openGoogleMapsDirections === 'function') {
              openGoogleMapsDirections();
            }
          }}
        >
          <MaterialIcons name="navigation" size={20} color="#fff" />
          <Text style={styles.navigationButtonText}>Navigate to Drop</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isCalculating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FF3B30" />
          <Text style={styles.loadingText}>Calculating route...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverMarker: {
    backgroundColor: '#FF3B30',
    borderRadius: 50,
    padding: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickupMarker: {
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropMarker: {
    backgroundColor: '#F44336',
    borderRadius: 50,
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerPulse: {
    position: 'absolute',
    backgroundColor: '#FF3B30',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  connectionStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  connectionText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  routeInfoCard: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginRight: 80,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  routeInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  routeInfoText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  routeInfoDivider: {
    height: 24,
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  routeInfoDestination: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    bottom: 150,
    zIndex: 10,
  },
  mapControlButton: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationButtons: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flex: 0.48,
  },
  pickupButton: {
    backgroundColor: '#4CAF50',
  },
  dropButton: {
    backgroundColor: '#F44336',
  },
  navigationButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loadingContainer: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default React.memo(RideMap);