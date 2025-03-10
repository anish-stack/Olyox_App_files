import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Dimensions,
    Text,
    Animated,
    ScrollView,
} from 'react-native';
import axios from 'axios'
const { width } = Dimensions.get('screen');

export default function OfferBanner() {
    const banners = [
        {
            id: 1,
            title: "Delicious Food Deals",
            description: "Get the best offers on your favorite meals.",
            imageUrl: "https://res.cloudinary.com/dglihfwse/image/upload/v1736336797/WhatsApp_Image_2025-01-08_at_17.16.24_cot9nj.jpg",
        },
        {
            id: 2,
            title: "Ride in Style",
            description: "Book rides at amazing discounts.",
            imageUrl: "https://res.cloudinary.com/dglihfwse/image/upload/v1736336973/9878212_4224776_irocmo.jpg",
        },
        {
            id: 3,
            title: "Shop & Save",
            description: "Exciting offers on top brands.",
            imageUrl: "https://res.cloudinary.com/dglihfwse/image/upload/v1736337123/24450961_2202_w023_n001_1891b_p1_1891_hdqluf.jpg",
        },
        {
            id: 4,
            title: "Travel the World",
            description: "Find the best travel packages just for you.",
            imageUrl: "https://res.cloudinary.com/dglihfwse/image/upload/v1736337273/happy-woman-waiting-to-receive-the-package-from-the-delivery-man-mobile-phone-showing-parcel-status-and-location-fast-motorbike-driver-to-deliver-on-time-design-for-banner-illustration-website-vector_qyobml.jpg",
        },
    ];
    const [banner, setBanner] = useState([])
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data } = await axios.get('http://192.168.1.8:3100/api/v1/admin/get_home_slides')
                if (data.data) {
                    const filterData = data.data.filter((item) => item.active === true)
                    setBanner(filterData)
                } else {
                    setBanner([])

                }
            } catch (error) {
                console.log("Error Fetching Home Slides", error?.response?.data?.message)
                setBanner([])

            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        const interval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % banners.length;
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({
                    x: nextIndex * width,
                    animated: true,
                });
            }
            setCurrentIndex(nextIndex);
        }, 3000);

        return () => clearInterval(interval);
    }, [currentIndex, banners.length]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const handleScrollEnd = (event) => {
        const position = event.nativeEvent.contentOffset.x;
        const index = Math.round(position / width);
        setCurrentIndex(index);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleScrollEnd}
                scrollEventThrottle={16}
            >
                {banner.map((item, index) => (
                    <View key={index} style={styles.bannerContainer}>
                        <Image source={{ uri: item.imageUrl?.image }} style={styles.image} />

                    </View>
                ))}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {banner.map((_, index) => {
                    const inputRange = [
                        (index - 1) * width,
                        index * width,
                        (index + 1) * width,
                    ];

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.8, 1.4, 0.8],
                        extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.5, 1, 0.5],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.dotContainer,
                                { transform: [{ scale }] },
                                { opacity },
                            ]}
                        />
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
    },
    bannerContainer: {
        width: width,
        paddingHorizontal: 20,
        position: 'relative',
    },
    image: {
        width: width - 40,
        height: (width - 10) * 0.5,
        borderRadius: 10,
        resizeMode: 'cover',
    },
    textOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(222,62,66,0.6)',
        padding: 8,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    title: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    description: {
        color: 'white',
        fontSize: 12,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    dotContainer: {
        width: 8,
        height: 8,
        marginHorizontal: 4,
        borderRadius: 4,
        backgroundColor: '#FF5A5F',
    },
});