import React from 'react';
import { Text, StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function Recharge() {
    // Sample plans data
    const plans = [
        {
            _id: "6774ee15d26e0d8a969fb822",
            title: "Plan 1",
            price: 805,
            description: "A premium subscription plan offering additional benefits.",
            level: 1,
            includes: ["Feature 1"],
            validityDays: 7,
            whatIsThis: "Day",
            active: true
        },
        {
            _id: "6774ee15d26e0d8a969fb823",
            title: "Plan 2",
            price: 1499,
            description: "Advanced subscription with extended features.",
            level: 2,
            includes: ["Feature 1", "Feature 2"],
            validityDays: 30,
            whatIsThis: "Day",
            active: true
        },
        {
            _id: "6774ee15d26e0d8a969fb824",
            title: "Plan 3",
            price: 3999,
            description: "Premium subscription with all features included.",
            level: 3,
            includes: ["Feature 1", "Feature 2", "Feature 3"],
            validityDays: 90,
            whatIsThis: "Day",
            active: true
        }
    ];

    const getBadgeColor = (level) => {
        switch(level) {
            case 1: return { bg: '#E8F5E9', text: '#4CAF50' };
            case 2: return { bg: '#E3F2FD', text: '#2196F3' };
            case 3: return { bg: '#FFF3E0', text: '#FF9800' };
            default: return { bg: '#E8F5E9', text: '#4CAF50' };
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Choose Your Plan</Text>
                <Text style={styles.headerSubtitle}>Select the best plan for your business</Text>
            </View>

            {/* Plans */}
            {plans.map((plan) => {
                const badgeColor = getBadgeColor(plan.level);
                return (
                    <View key={plan._id} style={styles.planCard}>
                        {/* Plan Header */}
                        <View style={styles.planHeader}>
                            <View>
                                <Text style={styles.planTitle}>{plan.title}</Text>
                                <Text style={styles.planDescription}>{plan.description}</Text>
                            </View>
                            <View style={[styles.levelBadge, { backgroundColor: badgeColor.bg }]}>
                                <Text style={[styles.levelText, { color: badgeColor.text }]}>
                                    Level {plan.level}
                                </Text>
                            </View>
                        </View>

                        {/* Price and Validity */}
                        <View style={styles.priceContainer}>
                            <View style={styles.priceBox}>
                                <Text style={styles.currency}>₹</Text>
                                <Text style={styles.price}>{plan.price}</Text>
                            </View>
                            <View style={styles.validityBox}>
                                <Icon name="clock-outline" size={20} color="#666" />
                                <Text style={styles.validityText}>
                                    {plan.validityDays} {plan.whatIsThis}s
                                </Text>
                            </View>
                        </View>

                        {/* Features */}
                        <View style={styles.featuresContainer}>
                            {plan.includes.map((feature, index) => (
                                <View key={index} style={styles.featureItem}>
                                    <Icon name="check-circle" size={20} color={badgeColor.text} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity 
                            style={[styles.selectButton, { backgroundColor: badgeColor.text }]}
                            onPress={() => {/* Handle plan selection */}}
                        >
                            <Text style={styles.selectButtonText}>Select Plan</Text>
                            <Icon name="arrow-right" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                );
            })}

            {/* Support Note */}
            <View style={styles.supportNote}>
                <Icon name="headphones" size={20} color="#666" />
                <Text style={styles.supportText}>
                    Need help choosing a plan? Contact our support team
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    planCard: {
        backgroundColor: '#FFF',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    planTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    planDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
        maxWidth: '80%',
    },
    levelBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    levelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    priceBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    currency: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 4,
    },
    price: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 2,
    },
    validityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    validityText: {
        marginLeft: 4,
        color: '#666',
        fontWeight: '500',
    },
    featuresContainer: {
        marginTop: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
    },
    selectButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    supportNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginBottom: 20,
    },
    supportText: {
        marginLeft: 8,
        color: '#666',
        fontSize: 14,
    },
});