import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { useNavigation } from "@react-navigation/native";

import TopFoodCard from './TopFoodCard';
import { styles } from './FoodStyles';

export default function TopFood({ show = false }) {
    const isMounted = useRef(false); // Prevent re-fetching after mount
    const [foodData, setFoodData] = useState([]);
    const [showAll, setShowAll] = useState(show);
    const [loading, setLoading] = useState(true); // Start with loading state
    const [error, setError] = useState('');
    const navigation = useNavigation();

    // Function to get location and fetch data
    const fetchRestaurants = async () => {
        try {
            // Prevent multiple fetch calls
            if (isMounted.current) return;
            isMounted.current = true;

            // Request location permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Location permission denied. Enable it in settings.');
                setLoading(false);
                return;
            }

            // Fetch user location
            const location = await Location.getCurrentPositionAsync({});
            if (!location || !location.coords) {
                setError('Unable to fetch location.');
                setLoading(false);
                return;
            }

            const { latitude, longitude } = location.coords;
            console.log("User Location:", latitude, longitude);

            // Fetch restaurants based on location
            const response = await axios.get(`http://192.168.1.2:3100/api/v1/tiffin/find_RestaurantTop`, {
                params: {
                    lat: latitude,
                    lng: longitude
                }
            });

            if (response.data?.data?.length > 0) {
                setFoodData(response.data.data);
            } else {
                setError('No top restaurants found.');
            }
        } catch (error) {
            console.error("Food Error:", error.response?.data?.message || error.message);
            setError('Something went wrong while fetching the restaurants.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch data when component mounts
    useEffect(() => {
        fetchRestaurants();
    }, []); // Run only once when component mounts

    const displayedRestaurants = showAll ? foodData : foodData.slice(0, 4);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Top Restaurants</Text>
                <TouchableOpacity style={styles.viewAllButton} onPress={() => setShowAll(!showAll)}>
                    <Text style={styles.viewAllText}>
                        {showAll ? 'Show Less' : 'View All'}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <Text>Loading...</Text>
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
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
