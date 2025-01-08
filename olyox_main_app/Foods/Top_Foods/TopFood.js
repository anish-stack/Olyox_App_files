import { View, TouchableOpacity, Text, ScrollView } from 'react-native';
import React, { useState } from 'react';
import FoodData from '../utils/Food.data';
import TopFoodCard from './TopFoodCard';
import { styles } from './FoodStyles';

export default function TopFood() {
    const [showAll, setShowAll] = useState(false);
    const displayedRestaurants = showAll ? FoodData : FoodData.slice(0, 4);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Top Restaurants</Text>
                <TouchableOpacity 
                    style={styles.viewAllButton} 
                    onPress={() => setShowAll(!showAll)}
                >
                    <Text style={styles.viewAllText}>
                        {showAll ? 'Show Less' : 'View All'}
                    </Text>
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.cardsContainer}>
                    {displayedRestaurants.map((restaurant) => (
                        <TopFoodCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            onPress={() => console.log('Restaurant pressed:', restaurant.name)}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}