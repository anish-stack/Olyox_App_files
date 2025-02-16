import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import Input from "../../components/Input";
import Button from "../../components/Button";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const OtpScreen = ({ onVerify, number }) => {
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(30);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const navigation = useNavigation()
  useEffect(() => {
    let interval;
    if (isResendDisabled && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsResendDisabled(false);
    }
    return () => clearInterval(interval);
  }, [isResendDisabled, timer]);

  const handleOtpVerify = async () => {
    try {
      const response = await axios.post(
        'http://192.168.50.28:3000/api/v1/parcel/login_parcel_otp_verify',
        { otp, number }
      );
      if (response.data.success) {
        const token = response.data.token;
        const type = response.data.redirect?.type;
        await AsyncStorage.setItem('auth_token_partner', token);
        console.log("OTP verified:", response.data);
        if (type === 'parcel') {
          navigation.navigate('parcelHome')
        } else if (type === "CAB") {
          navigation.navigate('cabHome')
        } else {
          navigation.navigate('parcelHome')
        }

        onVerify();
      } else {
        console.log("OTP verification failed:", response.data.message);
        Alert.alert("Error", response.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || "Something went wrong");
      console.error("Error during OTP verification:", error);
    }
  };

  const handleResendOtp = async () => {
    try {
      const response = await axios.post(
        'http://192.168.50.28:3000/api/v1/parcel/login_parcel_otp_resend',
        { number }
      );
      if (response.data.success) {
        setIsResendDisabled(true);
        setTimer(30); // Reset timer to 30 seconds after each resend
        console.log("OTP resent:", response.data);
      } else {
        console.log("Failed to resend OTP:", response.data.message);
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.message || "Something went wrong");
      console.error("Error during OTP resend:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>OTP sent to your WhatsApp number {number}</Text>

      <Input
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
        icon="numeric"
        style={styles.input}
      />

      <Button title="Verify OTP" onPress={handleOtpVerify} style={styles.verifyButton} />

      <View style={styles.resendContainer}>
        <Text style={styles.timerText}>
          {isResendDisabled ? `Resend available in ${timer}s` : `Resend OTP`}
        </Text>
        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={isResendDisabled}
          style={[styles.resendButton, isResendDisabled && styles.disabledButton]}
        >
          <Text style={styles.resendButtonText}>Resend OTP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e51e25",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 12,
    color: "#000",
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
    borderColor: "#d64444",
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    width: "100%",
    backgroundColor: "#ffffff",
  },
  verifyButton: {
    marginTop: 10,
    backgroundColor: "#e51e25",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  resendContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  timerText: {
    fontSize: 16,
    color: "#f44336",
    marginBottom: 10,
  },
  resendButton: {
    backgroundColor: "#e51e25",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  disabledButton: {
    backgroundColor: "#bdc3c7",
  },
  resendButtonText: {
    fontSize: 16,
    color: "#ffffff",
  },
});

export default OtpScreen;
