import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from './Styles';
import { useNavigation } from '@react-navigation/native';

export default function HotelCard({ hotel, onPress }) {
    // Extract amenities that are true
    const amenities = Object.keys(hotel.amenities).filter(key => hotel.amenities[key]);
    const navigation = useNavigation()
    return (
        <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={() => navigation.navigate('hotels-details', { item: hotel?._id })}>
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: hotel.hotel_main_show_image }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.ratingBadge}>
                    <Icon name="star" size={12} color="#FFFFFF" />
                    <Text style={styles.ratingText}>4.0</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{hotel.hotel_name}</Text>
                <View style={styles.locationContainer}>
                    <Icon name="map-marker" size={14} color="#666666" />
                    <Text style={styles.location} numberOfLines={1}>{hotel.hotel_address}</Text>
                </View>

                <View style={styles.amenitiesContainer}>
                    
                    {amenities.slice(0, 2).map((amenity, index) => (
                        <View key={index} style={styles.amenityBadge}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.divider} />

                <View style={styles.bottomRow}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}> ₹900</Text>
                        <Text style={styles.perNight}>/night</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.bookButton}
                        onPress={onPress}
                    >
                        <Text style={styles.bookButtonText}>Book Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
}
