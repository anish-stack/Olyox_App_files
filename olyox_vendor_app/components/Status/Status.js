import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';

export default function Status() {
    const [isActive, setIsActive] = useState(true);

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
                    onPress={() => setIsActive(!isActive)}
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