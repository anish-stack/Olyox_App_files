import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const WorkStatusCard = ({ workStatus }) => {
    if (!workStatus) return null;

    

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <Icon name="chart-timeline-variant" size={24} color="#ff0000" />
                    <Text style={styles.title}>Today's Summary</Text>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Icon name="clock-outline" size={24} color="#666" />
                        <View style={styles.statTextContainer}>
                            <Text style={styles.statLabel}>Hours Online</Text>
                            <Text style={styles.statValue}>{workStatus?.hoursOnline || '0'} hrs</Text>
                        </View>
                    </View>

                    <View style={styles.statItem}>
                        <Icon name="bike-fast" size={24} color="#666" />
                        <View style={styles.statTextContainer}>
                            <Text style={styles.statLabel}>Distance Covered</Text>
                            <Text style={styles.statValue}>{workStatus?.distanceCovered || '0'} km</Text>
                        </View>
                    </View>

                    <View style={styles.statItem}>
                        <Icon name="cash" size={24} color="#666" />
                        <View style={styles.statTextContainer}>
                            <Text style={styles.statLabel}>Today's Earnings</Text>
                            <Text style={styles.statValue}>₹{workStatus?.todayEarnings || '0'}</Text>
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
    statsContainer: {
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
    },
    statTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
});

export default WorkStatusCard