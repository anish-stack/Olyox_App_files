import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Animated } from 'react-native';
import { styles } from './Styles';
import { useNavigation } from '@react-navigation/native';

export default function BookARide() {
    const navigation = useNavigation()
    const carIconAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animateCarIcon = () => {
            Animated.sequence([
                Animated.timing(carIconAnimation, {
                    toValue: 1, // Move and scale
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(carIconAnimation, {
                    toValue: 0, // Return to original position and scale
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
                .start(() => animateCarIcon()); // Loop the animation
        };

        animateCarIcon();
    }, [carIconAnimation]);

    const translateX = carIconAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 10], // Move 10 units on the X-axis
    });

    const scale = carIconAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.1], // Scale from 1 to 1.1
    });

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.iconContainer,
                    {
                        transform: [
                            { translateX },
                            { scale },
                        ],
                    },
                ]}
            >
                <Image
                    source={require('../../assets/Book_Ride/car.png')}
                    style={styles.icon}
                />
            </Animated.View>
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Start_Booking_Ride')}
            >
                <Text style={styles.buttonText}>Book a Ride</Text>
            </TouchableOpacity>
        </View>
    );
}
