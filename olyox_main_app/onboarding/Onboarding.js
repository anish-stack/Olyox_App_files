import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { createUserRegister, verify_otp } from '../utils/helpers';
import { initializeSocket } from '../services/socketService';
import { styles } from './onboarding.styles';
import AuthModal from './AuthModal';
import * as SecureStore from 'expo-secure-store';

import OtpModal from './OtpModal';
import OnboardingSlide from './OnboardingSlide';
import { slidesFetch } from './onboarding-slides'
import { tokenCache } from '../Auth/cache';
const { width } = Dimensions.get('screen')
export default function Onboarding() {
    const navigation = useNavigation();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [slides, setSlides] = useState([]);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');

    const [fontsLoaded] = useFonts({
        'Roboto-Regular': require('./Roboto-VariableFont_wdth,wght.ttf'),
    });

    const handleRegisterWithPhone = async () => {
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.trim())) {
            Alert.alert("Error", "Please enter a valid 10-digit phone number.");
            return;
        }

        try {
            const formData = { number: phoneNumber };
            const response = await createUserRegister(formData);

            if (response.status === 201 || response.status === 200) {
                setShowOtpModal(true);
            } else {
                Alert.alert(
                    'Registration Failed',
                    response?.data?.message || 'An error occurred',
                    [{ text: 'Close' }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'An error occurred',
                [{ text: 'Close' }]
            );
        }
    };

    const handleVerifyOtp = async () => {
        try {
            if (!otp) {
                Alert.alert("Error", "Please enter OTP");
                return
            }
            const formData = { number: phoneNumber, otp };
            let userFromRes;

            const response = await verify_otp(formData);
            console.log("Response:", response); // Debug log

            if (response.User) {
                userFromRes = response?.User?._id;
            }

            if (response.status === 200 && response.token) {  // Ensure status is 200
                console.log("Token to Save:", response.token); // Debug log

                try {
                    const dataToken = await tokenCache.saveToken('auth_token_db', response.token);
                    console.log("Saved Token:", dataToken); // Should now correctly log the token

                } catch (error) {
                    console.error("Error saving token:", error);
                }

                try {
                    const socketData = await initializeSocket({
                        userType: "user",
                        userId: userFromRes
                    });
                    console.log("Socket Initialized:", socketData);
                } catch (error) {
                    console.error("Socket Initialization Failed:", error);
                }

                Alert.alert(
                    'Success',
                    'OTP verified successfully',
                    [{
                        text: 'OK', onPress: () => {
                            setShowOtpModal(false);
                            setOtp('');
                            navigation.reset({
                                index: 0,
                                routes: [{ name: 'Home' }]
                            })
                        }
                    }]
                );
            } else {
                Alert.alert(
                    'Verification Failed',
                    response?.message || 'Invalid OTP',  // Use response.message
                    [{ text: 'Close' }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Error',
                error?.response?.data?.message || 'Verification failed',
                [{ text: 'Close' }]
            );
        }
    };

    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const data = await slidesFetch()
                if (data) {
                    setSlides(data)
                }
            } catch (error) {
                console.log(error)
            }
        }
        fetchSlides()
    }, [])

    const renderDots = () => {
        return slides.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 20, 8],
                extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
            });

            return (
                <Animated.View
                    key={index}
                    style={[styles.dot, { width: dotWidth, opacity }]}
                />
            );
        });
    };

    if (!fontsLoaded) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#ec363f" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                {slides.map((item) => (
                    <OnboardingSlide
                        key={item._id}
                        item={item}
                        fontLoaded={fontsLoaded}
                    />
                ))}
            </Animated.ScrollView>

            <View style={styles.dotsContainer}>
                {renderDots()}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setShowAuthModal(true)}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
            </View>

            <AuthModal
                visible={showAuthModal}
                phoneNumber={phoneNumber}
                onChangePhone={setPhoneNumber}
                onSubmit={handleRegisterWithPhone}
                onClose={() => setShowAuthModal(false)}
            />

            <OtpModal
                visible={showOtpModal}
                otp={otp}
                onChangeOtp={setOtp}
                onVerify={handleVerifyOtp}
                onClose={() => setShowOtpModal(false)}
            />
        </View>
    );
}