import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from './Styles';

export default function HotelCard({ hotel, onPress }) {
    return (
        <TouchableOpacity activeOpacity={0.7} style={styles.card} onPress={onPress}>
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: hotel.images.main }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.ratingBadge}>
                    <Icon name="star" size={12} color="#FFFFFF" />
                    <Text style={styles.ratingText}>{hotel.stars}.0</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{hotel.name}</Text>
                <View style={styles.locationContainer}>
                    <Icon name="map-marker" size={14} color="#666666" />
                    <Text style={styles.location} numberOfLines={1}>{hotel.location}</Text>
                </View>

                <View style={styles.amenitiesContainer}>
                    {hotel.amenities?.slice(0, 2).map((amenity, index) => (
                        <View key={index} style={styles.amenityBadge}>
                            <Text style={styles.amenityText}>{amenity}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.divider} />

                <View style={styles.bottomRow}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>${hotel.price}</Text>
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