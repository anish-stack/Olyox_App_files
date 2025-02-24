import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import axios from 'axios';

import TopFoodCard from './TopFoodCard';
import { styles } from './FoodStyles';
import { useLocation } from '../../context/LocationContext';
import { useNavigation } from "@react-navigation/native"

export default function TopFood({ show = false }) {
    const { location } = useLocation()
    const [foodData, setFoodData] = useState([]);
    const [showAll, setShowAll] = useState(show);
    const [loading, setLoading] = useState(false);
    const displayedRestaurants = showAll ? foodData : foodData.slice(0, 4);
    const navigation = useNavigation()

    // Function to get location and fetch data
    const fetchRestaurants = async () => {
        try {

            const { latitude, longitude } = location.coords || {};
            console.log(latitude, longitude)

            setLoading(true);
            const response = await axios.get(`http://192.168.1.10:3000/api/v1/tiffin/find_RestaurantTop`, {
                params: {
                    lat: latitude,
                    lng: longitude
                }
            });

            if (response.data) {
                console.log("hey",response.data.data[0])
                setFoodData(response.data.data);
            } else {
                Alert.alert('Error', 'No top restaurants found.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Something went wrong while fetching the restaurants.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data when component mounts
    useEffect(() => {
        fetchRestaurants();
    }, [location]);

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

            {loading ? (
                <Text>Loading...</Text>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.cardsContainer}>
                        {displayedRestaurants.map((restaurant) => (
                            <TopFoodCard
                                key={restaurant._id} // Assuming each restaurant has a unique _id
                                restaurant={restaurant}
                                onPress={() => navigation.navigate('restaurants_page', { item: restaurant?._id })}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
