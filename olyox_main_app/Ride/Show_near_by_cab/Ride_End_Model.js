import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSocket } from '../../context/SocketContext';

export default function Ride_End_Model({ open, close, handleRideEnd, data }) {
  const { socket, isConnected } = useSocket();
  const [isLoading, setIsLoading] = useState(false);

  const handleNo = () => {
    if (socket()) {
      socket().emit('ride_incorrect_mark_done', data);
      close(); // close modal after action
    } else {
      Alert.alert('Connection Error', 'Unable to connect to server. Please try again.');
    }
  };

  const handleYes = async () => {
    try {
      setIsLoading(true);
      await handleRideEnd(); // Call the provided end ride function
      close(); // close modal after action
    } catch (err) {
      Alert.alert('Error', 'Something went wrong while ending the ride.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Ride Completed?</Text>
          <Text style={styles.subtitle}>
            The rider marked the ride as completed. Is this correct?
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.noBtn} onPress={handleNo} disabled={isLoading}>
              <Text style={styles.btnText}>No</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.yesBtn}
              onPress={handleYes}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Yes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  yesBtn: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  noBtn: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
