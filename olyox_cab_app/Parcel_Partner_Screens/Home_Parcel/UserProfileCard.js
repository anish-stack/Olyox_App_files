import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UserProfileCard = ({ userData }) => {
    if (!userData) {
        return null;
    }

    const ProfileSection = ({ title, items }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {items.map((item, index) => (
                    <View key={index} style={styles.detailRow}>
                        <Ionicons name={item.icon} size={20} color="#2196F3" />
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.label}>{item.label}</Text>
                            <Text style={styles.value}>{item.value}</Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    const personalInfo = [
        { icon: 'person', label: 'Full Name', value: userData.name },
        { icon: 'call', label: 'Phone Number', value: userData.phone },

    ];

    const bikeInfo = [
        { icon: 'bicycle', label: 'Make', value: userData.bikeDetails?.make },
        { icon: 'bicycle-outline', label: 'Model', value: userData.bikeDetails?.model },
        { icon: 'card', label: 'License Plate', value: userData.bikeDetails?.licensePlate },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person-circle" size={60} color="#2196F3" />
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.name}>{userData.name}</Text>
                        <View style={styles.badge}>
                            <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                            <Text style={styles.badgeText}>Verified Driver</Text>
                        </View>
                    </View>
                </View>

                <ProfileSection title="Personal Information" items={personalInfo} />
                <View style={styles.divider} />
                <ProfileSection title="Vehicle Information" items={bikeInfo} />
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
        borderRadius: 20,
        padding: 24,
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        marginRight: 16,
    },
    headerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF5020',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: '600',
        marginLeft: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 16,
    },
    sectionContent: {
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
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
        color: '#1a1a1a',
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 16,
    },
});

export default UserProfileCard;