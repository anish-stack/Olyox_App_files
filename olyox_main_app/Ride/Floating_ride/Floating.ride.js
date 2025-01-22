import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Floatingride() {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => navigation.navigate('RideStarted')}
            >
                <Text style={styles.buttonText}>Click</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end', // Ensures the content is pushed to the bottom
    },
    floatingButton: {
        position: 'absolute',
        width: 50, 
        height: 50, 
        bottom: 0,
        // left: 20, // Distance from the left of the screen
        right: 20, // Distance from the right of the screen
        backgroundColor: '#965596', // Button color
        paddingVertical: 15, // Vertical padding
        borderRadius: 50, // Rounded edges
        zIndex: 100, // Places the button above other elements
        alignItems: 'center', // Center the text horizontally
    },
    buttonText: {
        color: '#ffffff', // Text color
        fontSize: 12, // Font size
        fontWeight: 'bold', // Bold text
    },
});
