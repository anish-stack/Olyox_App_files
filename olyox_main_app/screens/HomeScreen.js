import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { COLORS } from '../constants/colors';
import Layout from '../components/Layout/_layout';
import OfferBanner from '../components/OfferBanner/OfferBanner';
import Categories from '../components/Categories/Categories';
import Top_Hotel from '../Hotels/Top_Hotel/Top_Hotel';
import TopFood from '../Foods/Top_Foods/TopFood';
import BookARide from '../components/Book_A_Ride/BookARide';
import Food_Cats from '../Foods/Food_Cats/Food_Cats';
import SkeletonLoader from './SkeletonLoader';

const HomeScreen = () => {
    const isMounted = useRef(false); // Prevent multiple fetch calls
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Function to simulate data fetching
    const fetchData = async () => {
        try {
            if (isMounted.current) return;
            isMounted.current = true;

            setLoading(true);
            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 3200));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    // Refresh function
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData().then(() => setRefreshing(false));
    }, []);

    // Show skeleton loader while loading
    if (loading) {
        return (
            <Layout>
                <ScrollView contentContainerStyle={styles.scrollViewContent}>
                    <SkeletonLoader />
                </ScrollView>
            </Layout>
        );
    }

    return (
        <Layout>
            <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <OfferBanner />
                <Categories />
                <BookARide />
                <Top_Hotel onRefresh={onRefresh} refreshing={refreshing} />
                <Food_Cats />
                <TopFood onRefresh={onRefresh} refreshing={refreshing} />
            </ScrollView>
        </Layout>
    );
};

const styles = StyleSheet.create({
    scrollViewContent: {
        paddingBottom: 16, // Optional, for scroll padding at the bottom
    },
});

export default HomeScreen;
