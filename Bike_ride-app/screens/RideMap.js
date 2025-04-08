import React from "react"
import { View, TouchableOpacity, Animated } from "react-native"
import { Text } from "react-native-paper"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { FontAwesome5, MaterialIcons } from "@expo/vector-icons"

// Constants
const GOOGLE_MAPS_APIKEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8"
const LATITUDE_DELTA = 0.0922
const LONGITUDE_DELTA = 0.0421

export const RideMap = React.memo(
  ({
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
    openGoogleMapsDirections,
    pickup_desc,
    drop_desc,
    updateState,
  }) => {
    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            ...driverCoordinates,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
          onMapReady={handleMapReady}
        >
          {currentLocation && (
            <Marker coordinate={currentLocation} title="Your Location">
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: carIconAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }),
                    },
                  ],
                }}
              >
                <FontAwesome5 name="car" size={24} color="#FF3B30" />
              </Animated.View>
            </Marker>
          )}

          {!rideStarted && (
            <Marker coordinate={pickupCoordinates} title="Pickup Location" description={pickup_desc}>
              <View style={{ backgroundColor: "#4CAF50", padding: 5, borderRadius: 10 }}>
                <MaterialIcons name="location-on" size={24} color="white" />
              </View>
            </Marker>
          )}

          <Marker coordinate={dropCoordinates} title="Drop Location" description={drop_desc}>
            <View style={{ backgroundColor: "#F44336", padding: 5, borderRadius: 10 }}>
              <MaterialIcons name="location-on" size={24} color="white" />
            </View>
          </Marker>

          {mapReady && currentLocation && (
            <MapViewDirections
              origin={currentLocation}
              destination={rideStarted ? dropCoordinates : pickupCoordinates}
              apikey={GOOGLE_MAPS_APIKEY}
              strokeWidth={4}
              strokeColor={rideStarted ? "#FF3B30" : "#4CAF50"}
              onReady={(result) => {
                updateState({
                  distanceToPickup: result.distance.toFixed(1),
                  timeToPickup: Math.round(result.duration),
                })
              }}
            />
          )}
        </MapView>

        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: socketConnected ? "#4CAF50" : "#F44336",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 15,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <MaterialIcons name={socketConnected ? "wifi" : "wifi-off"} size={16} color="white" />
          <Text style={{ color: "white", marginLeft: 5, fontSize: 12 }}>
            {socketConnected ? "Connected" : "Disconnected"}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            backgroundColor: "white",
            padding: 10,
            borderRadius: 50,
            elevation: 5,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          }}
          onPress={openGoogleMapsDirections}
        >
         <Text>Navigation</Text>
        </TouchableOpacity>
      </View>
    )
  },
)

