import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import ParcelHome from './ParcelHome';
import CabHome from './CabHome';
import { initializeSocket } from '../context/socketService';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useSocket } from '../context/SocketContext';

export default function HomeScreen() {
  const [role, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { isSocketReady, socket } = useSocket()


  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("auth_token_cab");

      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await axios.get("http://192.168.1.12:3100/api/v1/rider/user-details", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const partner = response?.data?.partner;

      if (!partner || !partner.category) {
        throw new Error("Invalid user details received");
      }

      setUserRole(partner.category);

      await initializeSocket({
        userId: partner._id,
      });

    } catch (error) {
      const message = error?.response?.data?.message || error.message || "Something went wrong";
      console.error("Error fetching user details:", message);
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);


  useEffect(() => {
    if (socket) {
      const handleNewParcel = (response) => {
        console.log("📦 New Parcel Received:", response)
      }

      socket.on('new_parcel_come', handleNewParcel)

      // ✅ Cleanup function must be a function
      return () => {
        socket.off('new_parcel_come', handleNewParcel)
      }
    }
  }, [socket])



  const RenderedComponent = useMemo(() => {
    if (role === 'parcel') return <ParcelHome />;
    return <CabHome />;
  }, [role]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text style={styles.text}>Loading user details...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {errorMsg}</Text>
      </View>
    );
  }

  return <>{RenderedComponent}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center'
  }
});
