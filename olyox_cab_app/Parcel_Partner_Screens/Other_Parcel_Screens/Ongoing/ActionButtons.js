"use client"

import { useState, useEffect } from "react"
import { View, TouchableOpacity, Text, Alert, Linking } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as Location from 'expo-location'
import styles from "./Styles"
import { useLocation } from "./LocationContext"

const ActionButtons = ({ isNearCustomer, hasReached, onMarkReached, orderData }) => {
  const [parcelPicked, setParcelPicked] = useState(false)
  const [photoTaken, setPhotoTaken] = useState(false)
  const [deliveryPhotoTaken, setDeliveryPhotoTaken] = useState(false)
  const [isNearDropoff, setIsNearDropoff] = useState(false)
  const { driverLocation } = useLocation()

  useEffect(() => {
    if (driverLocation && orderData?.droppOffGeo?.coordinates) {
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        orderData.droppOffGeo.coordinates[1],
        orderData.droppOffGeo.coordinates[0]
      )
      setIsNearDropoff(distance <= 0.05) // 50 meters
    }
  }, [driverLocation, orderData])

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
  }

  const startRide = () => {
    if (!orderData?.droppOffGeo?.coordinates) {
      console.error("Missing coordinates for navigation")
      return
    }

    const dropLat = orderData.droppOffGeo.coordinates[1] || 0
    const dropLng = orderData.droppOffGeo.coordinates[0] || 0
    const pickLat = orderData.pickupGeo.coordinates[1] || 0
    const pickLng = orderData.pickupGeo.coordinates[0] || 0

    const url = `https://www.google.com/maps/dir/?api=1&origin=${pickLat},${pickLng}&destination=${dropLat},${dropLng}&travelmode=driving`

    Linking.openURL(url).catch((err) => console.error("Failed to open Google Maps", err))
  }

  const callCustomer = () => {
    if (!orderData?.customerPhone) {
      Alert.alert("Error", "Phone number is not available")
      return
    }
    Linking.openURL(`tel:${orderData.customerPhone}`).catch((err) => Alert.alert("Error", "Unable to open dialer"))
  }

  const pickParcel = () => {
    setParcelPicked(true)
  }

  const takePhoto = async (isDeliveryPhoto = false) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync()

    if (permissionResult.granted === false) {
      Alert.alert("Error", "Camera permission is required to take photos")
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })

    if (!result.canceled) {
      console.log(result.assets[0].uri)
      Alert.alert("Success", isDeliveryPhoto ? "Delivery photo taken" : "Photo taken and ready for upload")

      if (isDeliveryPhoto) {
        setDeliveryPhotoTaken(true)
      } else {
        setPhotoTaken(true)
      }
    }
  }

  const markDelivered = () => {
    if (!deliveryPhotoTaken) {
      Alert.alert("Error", "Please take a delivery photo before marking as delivered")
      return
    }
    Alert.alert("Success", "Order marked as delivered")
  }

  if (!hasReached) {
    return (
      <TouchableOpacity
        style={[styles.actionButton, isNearCustomer ? styles.markReachedButton : styles.startRideButton]}
        onPress={isNearCustomer ? onMarkReached : startRide}
      >
        <Text style={styles.actionButtonText}>{isNearCustomer ? "Mark Reached" : "Start Ride"}</Text>
      </TouchableOpacity>
    )
  }

  if (parcelPicked && !photoTaken) {
    return (
      <TouchableOpacity style={styles.actionButton} onPress={() => takePhoto(false)}>
        <Ionicons name="camera" size={24} color="#FFF" />
        <Text style={styles.actionButtonText}>Take Photo</Text>
      </TouchableOpacity>
    )
  }

  if (photoTaken) {
    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={startRide}>
          <Ionicons name="navigate" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>Start Ride to Drop-off</Text>
        </TouchableOpacity>
        {isNearDropoff && (
          <TouchableOpacity style={styles.actionButton} onPress={() => takePhoto(true)}>
            <Ionicons name="camera" size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>Take Delivery Photo</Text>
          </TouchableOpacity>
        )}
        {isNearDropoff && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deliveredButton, !deliveryPhotoTaken && styles.disabledButton]}
            onPress={markDelivered}
            disabled={!deliveryPhotoTaken}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.actionButtonText}>Order Delivered</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity style={styles.actionButton} onPress={callCustomer}>
        <Ionicons name="call" size={24} color="#FFF" />
        <Text style={styles.actionButtonText}>Call Customer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionButton} onPress={pickParcel}>
        <Ionicons name="cube" size={24} color="#FFF" />
        <Text style={styles.actionButtonText}>Pick Parcel</Text>
      </TouchableOpacity>
    </View>
  )
}

export default ActionButtons
