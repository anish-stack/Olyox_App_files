import { useRoute } from '@react-navigation/native';
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function BookingSuccess({ navigation }) {
    const route = useRoute();
    const { data } = route.params || {};
    const {
        checkInDate,
        checkOutDate,
        males,
        roomData,
        females,
        guestInfo,
        paymentMethod
    } = data || {};

    const handleCall = () => {
        Linking.openURL(`tel:${guestInfo?.phone}`);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                {/* Success Header */}
                <View style={styles.header}>
                    <Icon name="check-circle" size={80} color="#4CAF50" />
                    <Text style={styles.title}>Booking Confirmed!</Text>
                    <Text style={styles.bookingId}>Booking ID: #{Math.random().toString(36).substr(2, 8).toUpperCase()}</Text>
                </View>

                {/* Guest Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="account" size={24} color="#1a1a1a" />
                        <Text style={styles.sectionTitle}>Guest Information</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <InfoRow label="Name" value={guestInfo?.name} />
                        <InfoRow label="Email" value={guestInfo?.email} />
                        <InfoRow label="Phone" value={guestInfo?.phone} />
                        <InfoRow label="Total Guests" value={`${males + females} (${males} Male, ${females} Female)`} />
                    </View>
                </View>

                {/* Room Details */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="hotel" size={24} color="#1a1a1a" />
                        <Text style={styles.sectionTitle}>Room Details</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <InfoRow label="Room Type" value={roomData?.room_type} />
                        <InfoRow label="Max Occupancy" value={`${roomData?.allowed_person} Persons`} />
                        <InfoRow label="Rating" value={`${roomData?.number_of_rating_done} Reviews`} />
                    </View>
                </View>

                {/* Stay Details */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Icon name="calendar" size={24} color="#1a1a1a" />
                        <Text style={styles.sectionTitle}>Stay Details</Text>
                    </View>
                    <View style={styles.sectionContent}>
                        <InfoRow label="Check-in" value={formatDate(checkInDate)} />
                        <InfoRow label="Check-out" value={formatDate(checkOutDate)} />
                        <InfoRow label="Payment Method" value={paymentMethod === 'online' ? 'Online Payment' : 'Pay at Hotel'} />
                    </View>
                </View>

                {/* Contact Section */}
                <View style={styles.contactSection}>
                    <Text style={styles.contactText}>
                        Need assistance? Our hotel staff will contact you shortly, or you can reach us directly:
                    </Text>
                    <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                        <Icon name="phone" size={24} color="#fff" />
                        <Text style={styles.callButtonText}>Contact Hotel</Text>
                    </TouchableOpacity>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={styles.closeButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

// Helper component for consistent info rows
const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: 20,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginTop: 16,
        marginBottom: 8,
    },
    bookingId: {
        fontSize: 16,
        color: '#666',
        letterSpacing: 1,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#eee',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f8f9fa',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        marginLeft: 12,
    },
    sectionContent: {
        padding: 16,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    infoLabel: {
        fontSize: 15,
        color: '#666',
        flex: 1,
    },
    infoValue: {
        fontSize: 15,
        color: '#1a1a1a',
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    contactSection: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        alignItems: 'center',
    },
    contactText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    callButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        gap: 8,
    },
    callButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    actions: {
        marginTop: 8,
        marginBottom: 32,
    },
    closeButton: {
        backgroundColor: '#E41D57',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 