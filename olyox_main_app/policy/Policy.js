import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Policy() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPolicies = async () => {
        try {
            const response = await axios.get('http://192.168.1.9:3100/api/v1/admin/policies');
            setPolicies(response.data);
        } catch (error) {
            console.error('Failed to fetch policies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#d53333" />
            </View>
        );
    }

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
            {policies.map((policy) => (
                <View key={policy._id} style={styles.policyCard}>
                    <Text style={styles.heading}>{policy.title}</Text>
                    <Text style={styles.smallText}>{policy.description}</Text>
                    <Text style={styles.smallText}>{policy.content}</Text>
                    <Text style={styles.date}>
                        Created: {new Date(policy.createdAt).toLocaleDateString()} | Updated: {new Date(policy.updatedAt).toLocaleDateString()}
                    </Text>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 15,
        paddingBottom: 50,
    },
    policyCard: {
        marginBottom: 25,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    heading: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#d53333',
        marginBottom: 8,
    },
    smallText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
        lineHeight: 20,
    },
    date: {
        fontSize: 12,
        color: '#888',
        marginTop: 8,
        textAlign: 'right',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
