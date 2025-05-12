import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View, Text, ActivityIndicator } from 'react-native';
import Layout from '../components/Layout/_layout';
import OfferBanner from '../components/OfferBanner/OfferBanner';
import Categories from '../components/Categories/Categories';
import Top_Hotel from '../Hotels/Top_Hotel/Top_Hotel';
import TopFood from '../Foods/Top_Foods/TopFood';
import BookARide from '../components/Book_A_Ride/BookARide';
import Food_Cats from '../Foods/Food_Cats/Food_Cats';
import SkeletonLoader from './SkeletonLoader';
import { useSocket } from '../context/SocketContext';

const HomeScreen = () => {
    // Refs
    const isMounted = useRef(false);

    // State management
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [componentLoading, setComponentLoading] = useState({
        offers: true,
        categories: true,
        bookRide: true,
        topHotels: true,
        foodCategories: true,
        topFoods: true
    });
    const { userId } = useSocket()

    // Load individual component data
    const loadComponentData = async (component) => {
        try {
            // Simulate API call for the specific component
            await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));
            setComponentLoading(prev => ({ ...prev, [component]: false }));
        } catch (error) {
            console.error(`Error loading ${component}:`, error);
        }
    };

    // Initial data fetch
    const fetchData = async () => {
        try {
            setLoading(true);

            // Reset component loading states during a refresh
            setComponentLoading({
                offers: true,
                categories: true,
                bookRide: true,
                topHotels: true,
                foodCategories: true,
                topFoods: true
            });

            // Simulate main data loading
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Start loading individual components
            loadComponentData('offers');
            loadComponentData('categories');
            loadComponentData('bookRide');
            loadComponentData('topHotels');
            loadComponentData('foodCategories');
            loadComponentData('topFoods');

            isMounted.current = true;
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        if (!isMounted.current) {
            fetchData();
        }
    }, []);

    // Refresh function
    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            // Reset loading states
            if(userId){
              initializeSocket({ userId: userId });
            }
            await fetchData();
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Show skeleton loader while initial loading
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
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollViewContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FF6B00']} // Customize refresh indicator color
                        tintColor={'#FF6B00'}
                    />
                }
            >
                {componentLoading.offers ? (
                    <ComponentLoader text="Loading offers..." />
                ) : (
                    <OfferBanner onRefresh={onRefresh} refreshing={refreshing} />
                )}

                {componentLoading.categories ? (
                    <ComponentLoader text="Loading categories..." />
                ) : (
                    <Categories onRefresh={onRefresh} refreshing={refreshing} />
                )}

                {componentLoading.bookRide ? (
                    <ComponentLoader text="Loading ride options..." />
                ) : (
                    <BookARide onRefresh={onRefresh} refreshing={refreshing} />
                )}

                {componentLoading.topHotels ? (
                    <ComponentLoader text="Loading top hotels..." />
                ) : (
                    <Top_Hotel onRefresh={onRefresh} refreshing={refreshing} />
                )}

                {componentLoading.foodCategories ? (
                    <ComponentLoader text="Loading food categories..." />
                ) : (
                    <Food_Cats onRefresh={onRefresh} refreshing={refreshing} />
                )}

                {componentLoading.topFoods ? (
                    <ComponentLoader text="Loading top foods..." />
                ) : (
                    <TopFood onRefresh={onRefresh} refreshing={refreshing} />
                )}
            </ScrollView>
        </Layout>
    );
};

// Component loader placeholder
const ComponentLoader = ({ text }) => (
    <View style={styles.componentLoader}>
        <ActivityIndicator size="small" color="#FF6B00" />
        <Text style={styles.loaderText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    scrollViewContent: {
        paddingBottom: 16,
    },
    componentLoader: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
        marginVertical: 8,
        borderRadius: 8,
        minHeight: 100,
    },
    loaderText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
});

export default HomeScreen;