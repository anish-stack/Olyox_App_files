import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { findMyNearHotels } from '../utils/Hotel.data';
import { styles } from './Styles';
import * as Location from 'expo-location';
import HotelCard from './Top_Hotel_cards';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function Top_Hotel({ show = false }) {
    const [showAll, setShowAll] = useState(show);
    const [hotelData, setHotelData] = useState([]);
    const [loading, setLoading] = useState(true); // Loading state for API call
    const [error, setError] = useState(''); // Error message state

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setError('Location permission denied');
                    setLoading(false);
                    return;
                }

                const location = await Location.getCurrentPositionAsync({});
                if (!location) {
                    setError('Unable to fetch location');
                    setLoading(false);
                    return;
                }

                const data = await findMyNearHotels(location.coords.latitude, location.coords.longitude);
                if (Array.isArray(data) && data.length > 0) {
                    setHotelData(data);
                } else {
                    setError('No nearby hotels found');
                }
            } catch (err) {
                setError('We are facing some issues. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const displayedHotels = showAll ? hotelData : hotelData.slice(0, 4);

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

            {loading ? (
                // Show SkeletonLoader if data is still loading
                <SkeletonLoader />
            ) : error ? (
                // Show error message if there's an issue
                <Text style={styles.errorText}>{error}</Text>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.cardsContainer}>
                        {displayedHotels.map((hotel, index) => (
                            <HotelCard
                                key={index}
                                hotel={hotel}
                            />
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
