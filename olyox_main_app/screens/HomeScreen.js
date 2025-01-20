import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import PaperExample from '../components/PaperExample';
import ExampleComponent from '../components/ExampleComponent';
import Layout from '../components/Layout/_layout';
import OfferBanner from '../components/OfferBanner/OfferBanner';
import Categories from '../components/Categories/Categories';
import Top_Hotel from '../Hotels/Top_Hotel/Top_Hotel';
import TopFood from '../Foods/Top_Foods/TopFood';
import BookARide from '../components/Book_A_Ride/BookARide';
import ShowMap from '../Ride/Show_near_by_cab/ShowMap';
import { useUser } from '@clerk/clerk-expo';

const HomeScreen = () => {
    const { user, isLoaded, isSignedIn } = useUser();
    const [loading, setLoading] = useState(true);

    // Handle loading and user session state
    useEffect(() => {
        if (isLoaded) {
            setLoading(false); // Set loading to false once user data is loaded
            if (isSignedIn) {
            
                // console.log("User is signed in", user.externalAccounts);
            } else {
                console.log("User is not signed in");
            }
        }
    }, [isLoaded, isSignedIn, user]); // Runs when `isLoaded` or `isSignedIn` changes

    // Show a loading screen while user data is being fetched
    if (loading) {
        return (
            <Layout>
                <View style={styles.container}>
                    <Text style={styles.text}>Loading...</Text>
                </View>
            </Layout>
        );
    }

    // Main content after the user data is loaded
    return (
        <Layout>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <OfferBanner />
                {/* {user.fullName} */}
                {/* <ShowMap /> Uncomment if needed */}
                <Categories />
                <BookARide />
                <Top_Hotel />
                <TopFood />
            </ScrollView>
        </Layout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    text: {
        color: COLORS.text,
        fontSize: 18,
    },
    scrollViewContent: {
        paddingBottom: 16, // Optional, for scroll padding at the bottom
    },
});

export default HomeScreen;
