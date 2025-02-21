import React, { useRef, useCallback, useState } from 'react';
import { View, TouchableOpacity, Platform, Linking, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { Ionicons } from "@expo/vector-icons";
import styles from "./Styles";

const GOOGLE_MAPS_APIKEY = "AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34";

const LocationButton = ({ onPress, icon, color, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <View style={styles.buttonGroup}>
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{tooltip}</Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={onPress}
        onPressIn={() => setShowTooltip(true)}
        onPressOut={() => setShowTooltip(false)}
      >
        <Ionicons name={icon} size={24} color={color} />
      </TouchableOpacity>
    </View>
  );
};

const MapComponent = ({ driverLocation, orderData }) => {
  const mapRef = useRef(null);

  const pickupCoords = {
    latitude: orderData.pickupGeo.coordinates[1],
    longitude: orderData.pickupGeo.coordinates[0],
  };

  const dropoffCoords = {
    latitude: orderData.droppOffGeo.coordinates[1],
    longitude: orderData.droppOffGeo.coordinates[0],
  };

  const openInMaps = useCallback((coords, label) => {
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
      web: 'https://maps.google.com/?q='
    });
    const latLng = `${coords.latitude},${coords.longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
      web: `${scheme}${latLng}`
    });

    Linking.openURL(url);
  }, []);

  const focusLocation = useCallback((coords) => {
    mapRef.current?.animateToRegion({
      ...coords,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  }, []);

  const focusCurrentLocation = useCallback(() => {
    focusLocation(driverLocation);
  }, [driverLocation]);

  return (
    <View style={styles.mapContainer}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        <Marker coordinate={driverLocation} title="Your Location" description="This is your current location.">
          <View style={styles.driverMarker}>
            <Ionicons name="car" size={24} color="#FF6600" />
          </View>
        </Marker>

        <Marker coordinate={pickupCoords} title="Pickup Location" description={orderData.pickupLocation}>
          <View style={styles.locationMarker}>
            <Ionicons name="location" size={24} color="#4CAF50" />
          </View>
        </Marker>

        <Marker coordinate={dropoffCoords} title="Dropoff Location" description={orderData.dropoffLocation}>
          <View style={styles.locationMarker}>
            <Ionicons name="flag" size={24} color="#F44336" />
          </View>
        </Marker>

        <MapViewDirections
          origin={driverLocation}
          destination={pickupCoords}
          apikey={GOOGLE_MAPS_APIKEY}
          strokeWidth={4}
          strokeColor="#FF6600"
        />

        <MapViewDirections
          origin={pickupCoords}
          destination={dropoffCoords}
          apikey={GOOGLE_MAPS_APIKEY}
          strokeWidth={4}
          strokeColor="#4CAF50"
          strokePattern={[10, 5]}
        />
      </MapView>

      {/* Location Control Buttons */}
      <View style={styles.buttonContainer}>
        <LocationButton
          onPress={() => openInMaps(pickupCoords, "Pickup Location")}
          icon="navigate"
          color="#4CAF50"
          tooltip="Navigate to pickup location"
        />

        <LocationButton
          onPress={() => focusLocation(pickupCoords)}
          icon="location"
          color="#4CAF50"
          tooltip="Show pickup on map"
        />

        <LocationButton
          onPress={() => openInMaps(dropoffCoords, "Dropoff Location")}
          icon="navigate"
          color="#F44336"
          tooltip="Navigate to dropoff location"
        />

        <LocationButton
          onPress={() => focusLocation(dropoffCoords)}
          icon="flag"
          color="#F44336"
          tooltip="Show dropoff on map"
        />

        <LocationButton
          onPress={focusCurrentLocation}
          icon="locate"
          color="#2196F3"
          tooltip="Show my location"
        />
      </View>
    </View>
  );
};

export default MapComponent;