import React, { useRef, useEffect } from "react"
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Animated } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useNavigation } from "@react-navigation/native"

export default function Food_Cats() {
    const slideAnim = useRef(new Animated.Value(-100)).current
    const navigation = useNavigation()
    const Foods_Cats = [
        {
            id: 1,
            title: "Tiffins",

            image: "https://i.ibb.co/tZgXSQF/breakfast.gif",
        },


        {
            id: 4,
            title: "Veg",
            image: "https://i.ibb.co/dJb6Mwz/vegan.gif",
        },
        {
            id: 5,
            title: "Non Veg",
            image: "https://i.ibb.co/V3r1K0C/nonveg.gif",
        },
    ]

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
        }).start()
    }, [slideAnim])

    const animatePress = (index, title) => {
        Animated.sequence([
            Animated.timing(slideAnim, { toValue: 5, duration: 100, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: -5, duration: 100, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start()

        setTimeout(() => {
            if(title === "Tiffins"){
                navigation.navigate("Tiffins_Page")
            }else{

                navigation.navigate('food_Page_By_Cats', { title: title })
            }
        }, 400)
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Culinary Delights</Text>
            <Text style={styles.subHeader}>What's your craving today?</Text>
            <LinearGradient
                colors={["#FFE5E5", "#FFF0F0", "#FFFFFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
            >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
                    {Foods_Cats.map((item, index) => (
                        <Animated.View key={item.id} style={[styles.itemContainer, { transform: [{ translateX: slideAnim }] }]}>
                            <TouchableOpacity activeOpacity={0.8} style={styles.touchable} onPress={() => animatePress(index, item.title)}>
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: item.image }} style={styles.image} />
                                </View>
                                <Text style={styles.title}>{item.title}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>
            </LinearGradient>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: "#FFFFFF",
    },
    header: {
        fontSize: 24,
        fontWeight: "800",
        color: "#CB202D",
        marginBottom: 5,
        fontFamily: "System",
        letterSpacing: 0.5,
    },
    subHeader: {
        fontSize: 16,
        color: "#666",
        marginBottom: 20,
        fontFamily: "System",
        fontStyle: "italic",
    },
    gradient: {
        borderRadius: 15,
        padding: 15,
    },
    scrollViewContent: {
        paddingRight: 20,
    },
    itemContainer: {
        marginRight: 50,
        alignItems: "center",
    },
    touchable: {
        alignItems: "center",
    },
    imageContainer: {
        width: 60,
        height: 60,
        borderRadius: 40,
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: "#FFE5E5",
    },
    title: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: "600",
        color: "#333",
        textAlign: "center",
        fontFamily: "System",
    },
})

