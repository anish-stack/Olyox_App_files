import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { findMyNearHotels } from '../utils/Hotel.data';
import { styles } from './Styles';
import * as Location from 'expo-location';
import HotelCard from './Top_Hotel_cards';
import SkeletonLoader from '../../components/common/SkeletonLoader';

export default function Top_Hotel({ show = false }) {
    const [showAll, setShowAll] = useState(show);
    const [hotelData, setHotelData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const isMounted = useRef(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isMounted.current) return;
                isMounted.current = true;

                // Fetch last known location first (faster)
                let location = await Location.getLastKnownPositionAsync({});
                if (!location) {
                    // Fetch current location if last known is unavailable
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        setError('Location permission denied. Enable it in settings.');
                        setLoading(false);
                        return;
                    }
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Low,
                    });
                }

                if (!location || !location.coords) {
                    setError('Unable to fetch location. Please try again.');
                    setLoading(false);
                    return;
                }

                const { latitude, longitude } = location.coords;
                console.log("Latitude:", latitude, "Longitude:", longitude);

                // Fetch nearby hotels
                const data = await findMyNearHotels(latitude, longitude);
                setHotelData(Array.isArray(data) ? data : []);
            } catch (err) {
                console.log('Error fetching hotels:', err);
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
                <TouchableOpacity style={styles.viewAllButton} onPress={() => setShowAll(!showAll)}>
                    <Text style={styles.viewAllText}>{showAll ? 'Show Less' : 'View All'}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <SkeletonLoader />
            ) : error ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.cardsContainer}>
                        {displayedHotels.map((hotel, index) => (
                            <HotelCard key={index} hotel={hotel} />
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}
