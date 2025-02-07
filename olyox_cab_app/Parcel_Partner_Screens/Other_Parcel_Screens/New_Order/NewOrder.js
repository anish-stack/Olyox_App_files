import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Audio } from "expo-av";

export default function NewOrder({ order, onClose, open }) {
  const [sound, setSound] = useState(null);

  // Function to play the alert sound
  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        
        require("./Box.mp3"),{
            isLooping:true
        } // Place the sound file in assets folder
      );
      setSound(sound);
      await sound.playAsync();
      
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Stop the sound if user rejects
  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
  };

  useEffect(() => {
    if (open) {
      playSound();
    }
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [open]);

  return (
    <Modal transparent={true} visible={open} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.heading}>New Order Request</Text>
          <Text>Pickup: {order.pickupLocation}</Text>
          <Text>Dropoff: {order.dropoffLocation}</Text>
          <Text>Price: ₹{order.price}</Text>
          <Text>Customer: {order.customerName}</Text>
          <Text>Phone: {order.customerPhone}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => {
                onClose(true); // Accept
                stopSound();
              }}
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
});
