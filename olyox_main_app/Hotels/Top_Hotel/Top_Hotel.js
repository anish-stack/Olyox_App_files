import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import React, { useState } from 'react';
import HotelData from '../utils/Hotel.data';
import HotelCard from './Top_Hotel_cards';
import { styles } from './Styles';

export default function Top_Hotel() {
    const [showAll, setShowAll] = useState(false);
    const displayedHotels = showAll ? HotelData : HotelData.slice(0, 4);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Trending Hotels</Text>
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
                    {displayedHotels.map((hotel) => (
                        <HotelCard
                            key={hotel.id}
                            hotel={hotel}
                            onPress={() => console.log('Hotel pressed:', hotel.name)}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}