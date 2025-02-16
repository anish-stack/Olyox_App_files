import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

export default function Status() {
    const navigation = useNavigation();
    const [isActive, setIsActive] = useState(null);
    const [restaurantId, setRestaurantId] = useState(null); // Store restaurant ID

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('userToken');
                if (!storedToken) {
                    navigation.replace('Login');
                    return;
                }

                const { data } = await axios.get(
                    'http://192.168.50.28:3000/api/v1/tiffin/get_single_tiffin_profile',
                    {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    }
                );

                if (data?.data) {
                    setIsActive(data.data.isWorking);
                    setRestaurantId(data.data._id); // Save restaurant ID
                } else {
                    console.error("Error: restaurant_id not found in API response");
                }

            } catch (error) {
                console.error("Internal server error", error);
            }
        };

        fetchProfile();
    }, []);

    const toggleStatus = async () => {
        if (!restaurantId) {
            console.error("Restaurant ID is missing!");
            return;
        }
        
        try {
            const newStatus = !isActive;

            const response = await axios.put(
                `http://192.168.50.28:3000/api/v1/tiffin/update_is_working/${restaurantId}`,
                { isWorking: newStatus }
            );

            if (response.data.success) {
                setIsActive(newStatus);
            } else {
                console.error("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.innerContainer}>
                {/* Left side - Status indicator */}
                <View style={styles.statusSection}>
                    <View style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]} />
                    <Text style={styles.statusText}>
                        {isActive ? 'Online' : 'Offline'}
                    </Text>
                </View>

                {/* Right side - Toggle button */}
                <TouchableOpacity
                    style={[styles.toggleContainer, isActive ? styles.toggleActive : styles.toggleInactive]}
                    onPress={toggleStatus}
                    activeOpacity={0.8}
                >
                    <View style={[styles.toggleButton, isActive ? styles.toggleButtonRight : styles.toggleButtonLeft]} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    innerContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    dotActive: {
        backgroundColor: '#4CAF50',
    },
    dotInactive: {
        backgroundColor: '#FF5252',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    toggleContainer: {
        width: 50,
        height: 28,
        borderRadius: 14,
        padding: 2,
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: '#E8F5E9',
    },
    toggleInactive: {
        backgroundColor: '#FFEBEE',
    },
    toggleButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        position: 'absolute',
    },
    toggleButtonLeft: {
        backgroundColor: '#FF5252',
        left: 2,
    },
    toggleButtonRight: {
        backgroundColor: '#4CAF50',
        right: 2,
    },
});
