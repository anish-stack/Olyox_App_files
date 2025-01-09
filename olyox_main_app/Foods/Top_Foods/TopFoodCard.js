import { View, TouchableOpacity, Text, Image } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from './FoodStyles';

export default function TopFoodCard({ restaurant, onPress }) {
    return (
        <TouchableOpacity style={styles.foodCard} onPress={onPress}>
            <View style={styles.imageContainer}>
                <Image 
                    source={{ uri: restaurant.image }} 
                    style={styles.foodImage}
                    resizeMode="cover"
                />
                {restaurant.offer && (
                    <View style={styles.offerBadge}>
                        <Text style={styles.offerText}>{restaurant.offer.text}</Text>
                        {restaurant.offer.discount && (
                            <Text style={styles.offerSubtext}>{restaurant.offer.discount}</Text>
                        )}
                    </View>
                )}
                <TouchableOpacity style={styles.bookmarkButton}>
                    <Icon 
                        name={restaurant.isBookmarked ? "bookmark" : "bookmark-outline"} 
                        size={20} 
                        color={restaurant.isBookmarked ? "#E23744" : "#FFFFFF"} 
                    />
                </TouchableOpacity>
            </View>
            
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.restaurantName} numberOfLines={1}>
                        {restaurant.name}
                    </Text>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.rating}>{restaurant.rating}</Text>
                        <Icon name="star" size={12} color="#FFFFFF" />
                    </View>
                </View>

                <Text style={styles.cuisines} numberOfLines={1}>
                    {restaurant.cuisines.join(' • ')}
                </Text>

                <View style={styles.infoRow}>
                    <View style={styles.deliveryInfo}>
                        <Icon name="clock-outline" size={14} color="#666666" />
                        <Text style={styles.infoText}>{restaurant.deliveryTime} mins</Text>
                    </View>
                    <View style={styles.dot} />
                    <View style={styles.distanceInfo}>
                        <Icon name="map-marker" size={14} color="#666666" />
                        <Text style={styles.infoText}>{restaurant.distance} km</Text>
                    </View>
                    <View style={styles.dot} />
                    <Text style={styles.priceText}>₹{restaurant.priceForTwo} for two</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}