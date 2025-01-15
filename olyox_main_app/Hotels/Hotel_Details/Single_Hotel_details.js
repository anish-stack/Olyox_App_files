import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Layout from '../../components/Layout/_layout';
import { useRoute } from '@react-navigation/native';
import { findHotelsDetails } from '../utils/Hotel.data';
import BookingModal from './BookingModal';
const getAmenityIcon = (amenity) => {
    const iconMap = {
        AC: 'air-conditioner',
        freeWifi: 'wifi',
        kitchen: 'kitchen',
        TV: 'television',
        powerBackup: 'power-plug',
        geyser: 'water-boiler',
        parkingFacility: 'parking',
        elevator: 'elevator',
        cctvCameras: 'cctv',
        diningArea: 'table-furniture',
        privateEntrance: 'door',
        reception: 'desk',
        caretaker: 'account-tie',
        security: 'shield-check',
        checkIn24_7: 'clock-24',
        dailyHousekeeping: 'broom',
        fireExtinguisher: 'fire-extinguisher',
        firstAidKit: 'medical-bag',
        buzzerDoorBell: 'bell',
        attachedBathroom: 'shower'
    };
    return iconMap[amenity] || 'checkbox-marked-circle';
};

// Helper function to format amenity names
const formatAmenityName = (amenity) => {
    return amenity
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .trim();
};

export default function Single_Hotel_details() {
    const route = useRoute();
    const { id } = route.params || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showAllAmenities, setShowAllAmenities] = useState(false);

    const fetchData = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            const response = await findHotelsDetails(id);
            if (response.data) {
                setData(response.data);
                setError(null);
            } else {
                setError('No hotel data found');
            }
        } catch (error) {
            setError('Failed to fetch hotel details');
            console.log(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <Layout>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#E41D57" />
                </View>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchData()}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        );
    }

    const activeAmenities = Object.entries(data.amenities)
        .filter(([_, value]) => value)
        .map(([key]) => key);

    const displayedAmenities = showAllAmenities ? activeAmenities : activeAmenities.slice(0, 6);

    return (
        <Layout>
            <ScrollView style={styles.container}>
                {/* Main Image */}
                <Image
                    source={{ uri: data.main_image.url }}
                    style={styles.mainImage}
                    resizeMode="cover"
                />

                {/* Rating Badge */}
                <View style={styles.ratingBadge}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{data.rating_number}</Text>
                    <Text style={styles.reviewCount}>({data.number_of_rating_done} reviews)</Text>
                </View>

                {/* Room Details */}
                <View style={styles.contentContainer}>
                    <Text style={styles.roomType}>{data.room_type}</Text>

                    {/* Tags */}
                    <View style={styles.tagsContainer}>
                        {data.has_tag.map((tag) => (
                            <View key={tag} style={styles.tag}>
                                <Text style={styles.tagText}>{tag.replace('_', ' ')}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Price Section */}
                    <View style={styles.priceSection}>
                        <View>
                            <Text style={styles.cutPrice}>₹{data.cut_price}</Text>
                            <Text style={styles.price}>₹{data.book_price}</Text>
                        </View>
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>{data.discount_percentage}% OFF</Text>
                        </View>
                    </View>

                    {/* Amenities */}
                    <View style={styles.amenitiesSection}>
                        <Text style={styles.sectionTitle}>Amenities</Text>
                        <View style={styles.amenitiesGrid}>
                            {displayedAmenities.map((amenity) => (
                                <View key={amenity} style={styles.amenityItem}>
                                    <Icon 
                                        name={getAmenityIcon(amenity)} 
                                        size={24} 
                                        color="#E41D57" 
                                    />
                                    <Text style={styles.amenityText}>
                                        {formatAmenityName(amenity)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                        {activeAmenities.length > 6 && (
                            <TouchableOpacity 
                                style={styles.showMoreButton}
                                onPress={() => setShowAllAmenities(!showAllAmenities)}
                            >
                                <Text style={styles.showMoreText}>
                                    {showAllAmenities ? 'Show Less' : 'Show More'}
                                </Text>
                                <Icon 
                                    name={showAllAmenities ? 'chevron-up' : 'chevron-down'} 
                                    size={20} 
                                    color="#E41D57" 
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Cancellation Policy */}
                    {data.cancellation_policy && (
                        <View style={styles.policySection}>
                            <Text style={styles.sectionTitle}>Cancellation Policy</Text>
                            {data.cancellation_policy.map((policy, index) => (
                                <View key={index} style={styles.policyItem}>
                                    <Icon name="information" size={20} color="#666" />
                                    <Text style={styles.policyText}>{policy}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Book Now Button */}
                    <TouchableOpacity 
                        style={styles.bookButton}
                        onPress={() => setShowModal(true)}
                    >
                        <Text style={styles.bookButtonText}>Book Now</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <BookingModal 
                visible={showModal}
                onClose={() => setShowModal(false)}
                roomData={data}
            />
        </Layout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainImage: {
        width: '100%',
        height: 300,
    },
    ratingBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
    },
    ratingText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    reviewCount: {
        color: '#fff',
        fontSize: 12,
        marginLeft: 4,
    },
    contentContainer: {
        padding: 16,
    },
    roomType: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    tag: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        color: '#666',
        fontSize: 14,
    },
    priceSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    cutPrice: {
        fontSize: 16,
        color: '#666',
        textDecorationLine: 'line-through',
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E41D57',
    },
    discountBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    discountText: {
        color: '#22C55E',
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    amenityItem: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 16,
    },
    amenityText: {
        marginTop: 4,
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        padding: 8,
    },
    showMoreText: {
        color: '#E41D57',
        marginRight: 4,
        fontWeight: '500',
    },
    policySection: {
        marginTop: 24,
        marginBottom: 24,
    },
    policyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    policyText: {
        marginLeft: 8,
        color: '#666',
        flex: 1,
    },
    bookButton: {
        backgroundColor: '#E41D57',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    bookButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#E41D57',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});