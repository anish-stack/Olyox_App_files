import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSocket } from "../../../context/SocketContext";
import { useNavigation } from "@react-navigation/native";

export default function NewOrder({ location, order, onClose, open, driverId }) {
  const [sound, setSound] = useState(null);
  const { socket, isSocketReady, loading, error } = useSocket();
  const navigation = useNavigation();

  // Function to play the alert sound
  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require("./Box.mp3"), { isLooping: true });
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Stop the sound when user rejects or accepts
  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  useEffect(() => {
    if (open) {
      playSound();
    } else {
      stopSound();
    }

    return () => {
      stopSound(); // Ensure sound is stopped when unmounted
    };
  }, [open]);

  const handleAccept = async () => {
    if (!isSocketReady) {
      console.error("Socket not connected");
      return;
    }

    const driver_accept_time = new Date().toISOString();
    const orderData = {
      order_id: order.id,
      driver_accept: true,
      driver_accept_time,
      driver_id: driverId,
    };

    try {
      // Emit event to socket
      socket.emit("driver_parcel_accept", orderData);
    } catch (err) {
      console.error("Error emitting order data:", err);
    }

    stopSound();
    onClose(true);
  };

  useEffect(() => {
    if (!isSocketReady) {
      console.error("Socket not connected");
      return;
    }

    const handleNewOrderAccept = async (data) => {
      await AsyncStorage.setItem("accepted_order", JSON.stringify(data));

    };

    socket.on("new_order_accept", (data) => {
      handleNewOrderAccept(data)
    });


    return () => {
      socket.off("new_order_accept", handleNewOrderAccept);
    };
  }, [socket, isSocketReady]);

  return (
    <Modal transparent={true} visible={open} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {loading && <Text>Connecting to server...</Text>}
          {error && <Text style={styles.errorText}>Socket Error: {error}</Text>}
          <Text style={styles.heading}>New Order Request</Text>
          <Text>Pickup: {order.pickupLocation}</Text>
          <Text>Dropoff: {order.dropoffLocation}</Text>
          <Text>Price: ₹{order.price}</Text>
          <Text>Customer: {order.customerName}</Text>
          <Text>Phone: {order.customerPhone}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={!isSocketReady}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => {
                onClose(false); // Reject
                stopSound();
              }}
            >
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Styles
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  acceptButton: {
    backgroundColor: "green",
  },
  rejectButton: {
    backgroundColor: "red",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
  },
});

