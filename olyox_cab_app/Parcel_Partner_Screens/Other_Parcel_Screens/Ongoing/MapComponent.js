import { View } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { Ionicons } from "@expo/vector-icons"
import styles from "./Styles"

const GOOGLE_MAPS_APIKEY = "AIzaSyC6lYO3fncTxdGNn9toDof96dqBDfYzr34"

const MapComponent = ({ driverLocation, orderData }) => {
  const pickupCoords = {
    latitude: orderData.pickupGeo.coordinates[1],
    longitude: orderData.pickupGeo.coordinates[0],
  }

  const dropoffCoords = {
    latitude: orderData.droppOffGeo.coordinates[1],
    longitude: orderData.droppOffGeo.coordinates[0],
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
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
    </View>
  )
}

export default MapComponent

