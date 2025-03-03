import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import axios from 'axios';
;
import { useNavigation, useRoute } from '@react-navigation/native';
const { width } = Dimensions.get('screen');
const ITEM_WIDTH = (width - 75) / 4;

export default function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation()
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get('https://api.olyox.com/api/v1/categories_get');
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };


    const redirect = (screen) => {

        if (screen === 'Cab Service') {
            navigation.navigate('Start_Booking_Ride')
        } else if(screen === "Transport"){
            navigation.navigate('Transport')
            
        }else {
            navigation.navigate(screen)
        }

    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF5A5F" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.grid}>
                {categories.map((category) => (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        key={category._id}
                        style={styles.categoryButton}
                        onPress={() => redirect(category.title)}
                    >
                        <View style={styles.imageContainer}>
                            <Image
                                source={{ uri: category.icon }}
                                style={styles.icon}
                            />
                        </View>
                        <Text numberOfLines={1} style={styles.title}>{category.title}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginBottom: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    categoryButton: {
        width: ITEM_WIDTH,
        // backgroundColor: '#EB5151',

        borderRadius: 12,

        alignItems: 'center',

    },
    imageContainer: {
        width: 60,
        height: 60,
        backgroundColor: 'rgba(254, 8, 0, 0.2)',
        borderRadius: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    icon: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    title: {

        fontSize: 12,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
    },
});