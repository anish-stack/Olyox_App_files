import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const OnlineStatusToggle = ({ workStatus, onStatusChange, statusOfPartner }) => {
  
    const [isOnline, setIsOnline] = useState(statusOfPartner === "offline" ? false : true);
    const [workTime, setWorkTime] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fadeAnim] = useState(new Animated.Value(1));
    const [slideAnim] = useState(new Animated.Value(0));
  
    useEffect(() => {
        if (workStatus?.isOnline) {
            setIsOnline(true);
            setStartTime(new Date(workStatus.startTime));
        }
    }, [workStatus]);

    useEffect(() => {
        let timer;
        if (isOnline && startTime) {
            timer = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                setWorkTime(diff);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isOnline, startTime]);

    useEffect(() => {
        if (error) {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();

            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleOnlineStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) {
                throw new Error('Authentication required. Please login again.');
            }

            const response = await axios.post(
                'http://192.168.1.12:3100/api/v1/parcel/manage_offline_online',
                { status: isOnline ? 'offline' : 'online' },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log("2xledge response: " + JSON.stringify(response.data))
            if (response.data.message === 'Status updated successfully') {
                Animated.spring(slideAnim, {
                    toValue: isOnline ? 0 : 1,
                    useNativeDriver: true,
                }).start();

                setIsOnline(!isOnline);
                if (!isOnline) {
                    setStartTime(new Date());
                } else {
                    setStartTime(null);
                    setWorkTime(0);
                }
                onStatusChange?.();
            } else {
                throw new Error(response.data.message || 'Failed to update status');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isOnline ? ['#ec363f', '#b9030c'] : ['#9e9e9e', '#757575']}
                style={styles.card}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.statusHeader}>
                    <MaterialCommunityIcons
                        name={isOnline ? "bike-fast" : "bike"}
                        size={32}
                        color="#fff"
                        style={styles.icon}
                    />
                    <Text style={styles.statusText}>
                        {isOnline ? 'You\'re Online' : 'You\'re Offline'}
                    </Text>
                </View>

                {error && (
                    <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
                        <Text style={styles.errorText}>{error}</Text>
                    </Animated.View>
                )}

                <TouchableOpacity
                    style={[styles.toggleButton, loading && styles.toggleButtonDisabled]}
                    onPress={toggleOnlineStatus}
                    disabled={loading}
                >
                    <Animated.View style={[styles.toggleSlider, {
                        transform: [{
                            translateX: slideAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 22]
                            })
                        }]
                    }]} />
                    <Text style={styles.toggleText}>
                        {loading ? 'Updating...' : (isOnline ? 'Go Offline' : 'Go Online')}
                    </Text>
                </TouchableOpacity>

                {isOnline && (
                    <View style={styles.timeContainer}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" />
                        <Text style={styles.timeLabel}>Time Online:</Text>
                        <Text style={styles.timeValue}>{formatTime(workTime)}</Text>
                    </View>
                )}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginTop: -20,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    icon: {
        marginRight: 12,
    },
    statusText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    errorContainer: {
        backgroundColor: 'rgba(244, 67, 54, 0.9)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
    },
    toggleButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 16,
        borderRadius: 30,
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    toggleButtonDisabled: {
        opacity: 0.7,
    },
    toggleSlider: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
        left: 4,
    },
    toggleText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 40,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 15,
    },
    timeLabel: {
        fontSize: 14,
        color: '#fff',
        marginLeft: 8,
        marginRight: 8,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
});

export default OnlineStatusToggle;
