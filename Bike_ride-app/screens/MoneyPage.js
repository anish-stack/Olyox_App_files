import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
    Image,
    Animated,
} from 'react-native';
import { useNavigation, useRoute } from "@react-navigation/native";
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function MoneyPage() {
    const navigation = useNavigation();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(false);
    const route = useRoute();
    const [isRideRate, setIsRideRate] = useState(false);
    const [rateValue, setRateValue] = useState(0);
    const { data } = route.params || {};
    const { socket } = useSocket();
    const [isLoading, setIsLoading] = useState(false);
    const price = data.rideDetails?.price || '0';
    
    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.9));

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('auth_token_cab');
            if (token) {
                const response = await axios.get(
                    'http://192.168.1.10:3000/api/v1/rider/user-details',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setUserData(response.data.partner);
            }
        } catch (error) {
            console.error('Error:', error?.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, []);

    const handleISPay = () => {
        setIsLoading(true);
        setTimeout(() => {
            socket.emit('isPay', data);
            setIsLoading(false);
            setIsRideRate(true);
        }, 2000);
    };

    useEffect(() => {
        socket.on('rating', (data) => {
            setRateValue(data?.rating || 0);
        });
        return () => socket.off('rating');
    }, []);

    const handleRating = (rate) => {
        setRateValue(rate);
        socket.emit('rateRide', { rating: rate });
    };

    if (isRideRate) {
        return (
            <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.gradientContainer}
            >
                <Animated.View 
                    style={[
                        styles.ratingContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <BlurView intensity={80} style={styles.blurContainer}>
                        <Text style={styles.ratingTitle}>How was your ride?</Text>
                        <View style={styles.starsContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => handleRating(star)}
                                    style={styles.starButton}
                                >
                                    <FontAwesome
                                        name={star <= rateValue ? 'star' : 'star-o'}
                                        size={44}
                                        color="#FFD700"
                                        style={styles.star}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={styles.ratingSubtitle}>
                            {rateValue > 0 ? `You rated ${rateValue} star${rateValue > 1 ? 's' : ''}` : 'Tap to rate'}
                        </Text>
                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={() => navigation.navigate('Home')}
                        >
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            style={styles.gradientContainer}
        >
            <Animated.View 
                style={[
                    styles.mainContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                    }
                ]}
            >
                <BlurView intensity={80} style={styles.blurContainer}>
                    <Text style={styles.title}>Payment Collection</Text>

                    <View style={styles.priceContainer}>
                        <Text style={styles.currencySymbol}>₹</Text>
                        <Text style={styles.price}>{price}</Text>
                    </View>

                    {userData?.YourQrCodeToMakeOnline && (
                        <View style={styles.qrWrapper}>
                            <Image 
                                source={{ uri: userData.YourQrCodeToMakeOnline }}
                                style={styles.qrCode}
                            />
                        </View>
                    )}

                    <Text style={styles.instructions}>
                        Scan QR code to complete payment
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.backButton]}
                            onPress={() => navigation.navigate('Home')}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.collectButton]}
                            onPress={handleISPay}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>Confirm Payment</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainContainer: {
        width: width * 0.9,
        borderRadius: 24,
        overflow: 'hidden',
    },
    blurContainer: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 24,
        textAlign: 'center',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 32,
    },
    currencySymbol: {
        fontSize: 24,
        color: '#FFFFFF',
        marginTop: 8,
    },
    price: {
        fontSize: 48,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    qrWrapper: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 24,
    },
    qrCode: {
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: 8,
    },
    instructions: {
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 32,
        opacity: 0.9,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    collectButton: {
        backgroundColor: '#10B981',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    ratingContainer: {
        width: width * 0.9,
        borderRadius: 24,
        overflow: 'hidden',
    },
    ratingTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 32,
        textAlign: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
    },
    starButton: {
        padding: 8,
    },
    star: {
        marginHorizontal: 4,
    },
    ratingSubtitle: {
        fontSize: 18,
        color: '#FFFFFF',
        marginBottom: 32,
        opacity: 0.9,
        textAlign: 'center',
    },
    doneButton: {
        backgroundColor: '#10B981',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 12,
    },
    doneButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});