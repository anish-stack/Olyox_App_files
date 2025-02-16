"use client";

import { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  Linking,
  Modal,
  Alert,
  TextInput,
  Button,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import styles from "./Styles";
import { useLocation } from "./LocationContext";
import { useSocket } from "../../../context/SocketContext";

const ActionButtons = ({ isNearCustomer, hasReached, functionHim, onMarkReached, orderData }) => {
  console.log("sss", functionHim)
  const [deliveryPhotoTaken, setDeliveryPhotoTaken] = useState(false);
  const [isNearDropoff, setIsNearDropoff] = useState(true);
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMode, setPaymentMode] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { driverLocation } = useLocation();
  const { socket } = useSocket();

  useEffect(() => {
    if (driverLocation && orderData?.droppOffGeo?.coordinates) {
      const distance = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        28.7055213, 77.1141586
        // orderData.droppOffGeo.coordinates[1],
        // orderData.droppOffGeo.coordinates[0]
      );
      setIsNearDropoff(distance <= 0.50); // 50 meters
    }
  }, [driverLocation, orderData]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const startRide = () => {
    if (!orderData?.droppOffGeo?.coordinates) {
      console.error("Missing coordinates for navigation");
      return;
    }

    const dropLat = orderData.droppOffGeo.coordinates[1] || 0;
    const dropLng = orderData.droppOffGeo.coordinates[0] || 0;
    const pickLat = orderData.pickupGeo.coordinates[1] || 0;
    const pickLng = orderData.pickupGeo.coordinates[0] || 0;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${pickLat},${pickLng}&destination=${dropLat},${dropLng}&travelmode=driving`;

    Linking.openURL(url).catch((err) => console.error("Failed to open Google Maps", err));
  };

  const callCustomer = () => {
    if (!orderData?.customerPhone) {
      Alert.alert("Error", "Phone number is not available");
      return;
    }
    Linking.openURL(`tel:${orderData.customerPhone}`).catch((err) =>
      Alert.alert("Error", "Unable to open dialer")
    );
  };

  const pickParcel = async () => {
    if (socket) {
      socket.emit("mark_pick", orderData);
      console.log("Picked parcel", orderData);
      await functionHim();
    }
  };

  const openPaymentModal = () => {
    setModalVisible(true);
  };

  const markDelivered = () => {
    if (!amountReceived || !paymentMode) {
      Alert.alert("Error", "Please enter the amount and select a payment mode.");
      return;
    }

    if (parseFloat(amountReceived) !== parseFloat(orderData?.price)) {
      Alert.alert("Error", "The entered amount does not match the order price.");
      return;
    }

    if (socket) {
      const copyData = {
        ...orderData,
        writableMoney: amountReceived,
        modeOfMoney: paymentMode,
      };
      socket.emit("mark_deliver", copyData);
      console.log("Parcel delivered:", copyData);
      // callFnc();
    }

    setModalVisible(false);
    Alert.alert("Success", "Order marked as delivered");
  };

  return (
    <>
      {orderData?.is_parcel_delivered ? (
        <View style={styles.deliveredMessageContainer}>
          <Text style={styles.deliveredMessage}>This Order is already marked as Delivered</Text>
        </View>
      ) : (
        <>
          {modalVisible && (
            <Modal animationType="slide" transparent={true} visible={modalVisible}>
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Enter Received Amount</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder={`Order Price: ₹${orderData?.price}`}
                    value={amountReceived}
                    onChangeText={setAmountReceived}
                  />
                  <Text style={styles.modalTitle}>Select Payment Mode</Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMode === "Online" && styles.selectedPayment,
                      ]}
                      onPress={() => setPaymentMode("Online")}
                    >
                      <Text style={styles.buttonText}>Online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMode === "Cash" && styles.selectedPayment,
                      ]}
                      onPress={() => setPaymentMode("Cash")}
                    >
                      <Text style={styles.buttonText}>Cash</Text>
                    </TouchableOpacity>
                  </View>
                  <Button title="Submit" onPress={markDelivered} />
                </View>
              </View>
            </Modal>
          )}

          {!hasReached && isNearDropoff && !orderData?.is_driver_reached_at_deliver_place ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                isNearCustomer ? styles.markReachedButton : styles.startRideButton,
              ]}
              onPress={isNearCustomer ? onMarkReached : startRide}
            >
              <Text style={styles.actionButtonText}>
                {isNearCustomer ? "Mark Reached" : "Start Ride"}
              </Text>
            </TouchableOpacity>
          ) : orderData.is_parcel_picked ? (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={startRide}>
                <Ionicons name="navigate" size={24} color="#FFF" />
                <Text style={styles.actionButtonText}>Start Ride to Drop-off</Text>
              </TouchableOpacity>

              {!isNearDropoff && !orderData?.is_driver_reached_at_deliver_place && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.deliveredButton,
                  ]}
                  onPress={openPaymentModal}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                  <Text style={styles.actionButtonText}>Order Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
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
          )}
        </>
      )}
    </>
  );

};

export default ActionButtons;
