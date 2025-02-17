import { View, TouchableOpacity, Text, Image } from 'react-native';
import React from 'react';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from './FoodStyles';

export default function TopFoodCard({ restaurant, onPress }) {
    return (
        <TouchableOpacity style={styles.foodCard} onPress={onPress}>
            <View style={styles.imageContainer}>
                <Image
                    source={require('./pngwing.com (6).png')}
                    style={styles.foodImage}
                    resizeMode="cover"
                />
                
            </View>

            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.restaurantName} numberOfLines={1}>
                        {restaurant.restaurant_name}
                    </Text>
                    <View style={styles.ratingContainer}>
                        <Text style={styles.rating}>{restaurant.rating}</Text>
                        <Icon name="star" size={12} color="#FFFFFF" />
                    </View>
                </View>


               
            </View>
        </TouchableOpacity>
    );
}