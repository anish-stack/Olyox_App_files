import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const UserProfileCard = ({ userData }) => {
    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Icon name="account-circle" size={24} color="#ff0000" />
                    <Text style={styles.title}>Profile Details</Text>
                </View>

                <View style={styles.detailsContainer}>
                    <View style={styles.detailRow}>
                        <Icon name="account" size={20} color="#666" />
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.label}>Name</Text>
                            <Text style={styles.value}>{userData.name}</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <Icon name="phone" size={20} color="#666" />
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.label}>Phone</Text>
                            <Text style={styles.value}>{userData.phone}</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <Icon name="email" size={20} color="#666" />
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.value}>{userData.email}</Text>
                        </View>
                    </View>

                    <View style={styles.detailRow}>
                        <Icon name="map-marker" size={20} color="#666" />
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.label}>City</Text>
                            <Text style={styles.value}>{userData.city}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 12,
    },
    detailsContainer: {
        gap: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
});

export default UserProfileCard