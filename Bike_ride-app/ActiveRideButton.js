import React from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const ActiveRideButton = ({ rideDetails }) => {
    const navigation = useNavigation();
    const pulseAnim = new Animated.Value(1);

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const handlePress = () => {
        navigation.navigate('start', { params: rideDetails });
    };

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            <Animated.View style={[
                styles.button,
                { transform: [{ scale: pulseAnim }] }
            ]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="car" size={24} color="#fff" />
                    <View style={styles.dot} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Active Ride</Text>
                    <Text style={styles.subtitle}>Tap to return</Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 20,
        right: 125,
        zIndex: 1000,
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#FF3B30',
        borderRadius: 25,
        padding: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        position: 'relative',
        marginRight: 10,
    },
    dot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        backgroundColor: '#4CAF50',
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#fff',
    },
    textContainer: {
        marginLeft: 5,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    subtitle: {
        color: '#fff',
        fontSize: 12,
        opacity: 0.8,
    },
});

export default ActiveRideButton;