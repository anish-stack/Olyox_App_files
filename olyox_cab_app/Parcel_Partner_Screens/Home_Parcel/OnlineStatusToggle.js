import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const OnlineStatusToggle = ({ workStatus, onStatusChange }) => {
    const [isOnline, setIsOnline] = useState(workStatus?.status === 'offline' ? false : true);
    const [workTime, setWorkTime] = useState(0);
    const [startTime, setStartTime] = useState(null);
    // console.log("workStatus",workStatus)
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

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleOnlineStatus = async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token_partner');
            if (!token) {
                console.error('No auth token found');
                return;
            }

            const response = await axios.post(
                'http://192.168.50.28:3000/api/v1/parcel/manage_offline_online',
                { status: isOnline ? 'offline' : 'online' },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            console.log(response.data); // Log the response for debugging

            // Check if the status update was successful
            if (response.data.message === 'Status updated successfully') {
                setIsOnline(!isOnline);
                if (!isOnline) {
                    setStartTime(new Date());
                } else {
                    setStartTime(null);
                    setWorkTime(0);
                }
                onStatusChange();
            } else {
                console.error('Failed to update status:', response.data.message);
            }

        } catch (error) {
            console.error('Error toggling status:', error?.response?.data || error.message);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.statusHeader}>
                    <Icon 
                        name={isOnline ? "bike-fast" : "bike"} 
                        size={24} 
                        color={isOnline ? "#ff0000" : "#666"}
                    />
                    <Text style={[styles.statusText, isOnline && styles.onlineText]}>
                        {isOnline ? 'You\'re Online' : 'You\'re Offline'}
                    </Text>
                </View>
                
                <View style={styles.toggleContainer}>
                    <TouchableOpacity 
                        style={[styles.toggleButton, isOnline && styles.toggleButtonActive]}
                        onPress={toggleOnlineStatus}
                    >
                        <Text style={[styles.toggleText, isOnline && styles.toggleTextActive]}>
                            {isOnline ? 'Go Offline' : 'Go Online'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isOnline && (
                    <View style={styles.timeContainer}>
                        <Icon name="clock-outline" size={20} color="#666" />
                        <Text style={styles.timeLabel}>Time Online:</Text>
                        <Text style={styles.timeValue}>{formatTime(workTime)}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginTop: -20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginLeft: 12,
    },
    onlineText: {
        color: '#ff0000',
    },
    toggleContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    toggleButton: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        width: '100%',
        alignItems: 'center',
    },
    toggleButtonActive: {
        backgroundColor: '#ff0000',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
    },
    toggleTextActive: {
        color: '#fff',
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
    },
    timeLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        marginRight: 8,
    },
    timeValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ff0000',
    },
});

export default OnlineStatusToggle;
