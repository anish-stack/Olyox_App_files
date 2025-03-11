import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import TopFoodCard from './TopFoodCard';
import { styles } from './FoodStyles';

// Define storage key for cached location
const LOCATION_CACHE_KEY = 'cached_user_location';

export default function TopFood({ show = false, refreshing, onRefresh }) {
    const isMounted = useRef(true);
    
    const [foodData, setFoodData] = useState([]);
    const [showAll, setShowAll] = useState(show);
    const [loading, setLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('Finding restaurants near you...');
    const [error, setError] = useState('');
    const navigation = useNavigation();
    
    const fetchRestaurants = async () => {
        if (!isMounted.current) return;
        
        try {
            setLoading(true);
            
            // Try to get location from AsyncStorage first
            let latitude, longitude;
            try {
                const cachedLocationJSON = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
                
                if (cachedLocationJSON) {
                    const cachedLocation = JSON.parse(cachedLocationJSON);
                    
                    // Check if cached location is recent (within last 24 hours)
                    const cacheTime = cachedLocation.timestamp || 0;
                    const cacheAgeHours = (Date.now() - cacheTime) / (1000 * 60 * 60);
                    
                    if (cacheAgeHours < 24) {
                        console.log("Using cached location");
                        latitude = cachedLocation.latitude;
                        longitude = cachedLocation.longitude;
                    }
                }
            } catch (cacheError) {
                console.error("Error reading cached location:", cacheError);
                // Continue with fetching new location if cache read fails
            }
            
            // If no valid cached location, fetch a new one
            if (!latitude || !longitude) {
                setLoadingText('Getting your location...');
                
                // Check if we already have permission
                const { status } = await Location.getForegroundPermissionsAsync();
                
                if (status !== 'granted') {
                    const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
                    if (newStatus !== 'granted') {
                        setError('Location permission denied. Enable it in settings.');
                        setLoading(false);
                        return;
                    }
                }
                
                // Get location with lower accuracy for speed
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });
                
                if (!location || !location.coords) {
                    setError('Unable to fetch location.');
                    setLoading(false);
                    return;
                }
                
                ({ latitude, longitude } = location.coords);
                
                // Cache the new location with timestamp
                try {
                    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
                        latitude,
                        longitude,
                        timestamp: Date.now()
                    }));
                } catch (storageError) {
                    console.error("Error caching location:", storageError);
                    // Continue even if caching fails
                }
            }
            
            setLoadingText('Finding restaurants near you...');
            console.log("Using location:", latitude, longitude);
            
            // Fetch restaurants based on location
            const response = await axios.get(`https://demoapi.olyox.com/api/v1/tiffin/find_RestaurantTop`, {
                params: {
                    lat: latitude,
                    lng: longitude
                },
                timeout: 8000
            });
            
            if (response.data?.data?.length > 0) {
                setFoodData(response.data.data);
            } else {
                setError('No top restaurants found in your area.');
            }
        } catch (error) {
            console.error("Food Error:", error.response?.data?.message || error.message);
            setError('Something went wrong while fetching restaurants.');
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    };
    
    useEffect(() => {
        fetchRestaurants();
        
        return () => {
            isMounted.current = false;
        };
    }, [refreshing]);
    
    const displayedRestaurants = showAll ? foodData : foodData.slice(0, 4);
    
    const renderLoader = () => (
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FF6B00" />
            <Text style={styles.loaderText}>{loadingText}</Text>
        </View>
    );
    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Top Restaurants</Text>
                {foodData.length > 4 && (
                    <TouchableOpacity style={styles.viewAllButton} onPress={() => setShowAll(!showAll)}>
                        <Text style={styles.viewAllText}>
                            {showAll ? 'Show Less' : 'View All'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
            
            {loading ? (
                renderLoader()
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={() => {
                            setError('');
                            fetchRestaurants();
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.cardsContainer}>
                        {displayedRestaurants.length > 0 ? (
                            displayedRestaurants.map((restaurant) => (
                                <TopFoodCard
                                    key={restaurant._id}
                                    restaurant={restaurant}
                                    onPress={() => navigation.navigate('restaurants_page', { item: restaurant?._id })}
                                />
                            ))
                        ) : (
                            <Text style={styles.noResultsText}>No restaurants found in your area.</Text>
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}