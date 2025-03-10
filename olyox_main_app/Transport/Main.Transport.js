"use client"

import { useEffect, useState } from "react"
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet } from "react-native"
import Layout from "../components/Layout/_layout"
import { VehicleCard } from "./Transport_vehicles/VehicleCard"
import Parcel_Transport from "./Parcel_Transport/Parcel_Transport"
import { useNavigation } from "@react-navigation/native"
import axios from "axios"



export default function MainTransport() {
    const navigation = useNavigation()
    const [selectedCategory, setSelectedCategory] = useState("truck")
  
    const [vehicle, setVehicle] = useState([])

    const handleBook = (vehicle) => {
        alert(`Booked ${vehicle.name[language]}!`)
    }

    const handleFetch = async () => {
        try {
            const { data } = await axios.get(`http://192.168.1.8:3100/api/v1/admin/get-heavy`)
            if (data.data) {
                console.log(data.data)
                setVehicle(data.data)
            }
            else {
                setVehicle([])
                alert("No Data Found")
            }
        } catch (error) {
            console.log("Error", error.response.data)
        }
    }

    useEffect(() => {
        handleFetch()
    }, [])

    useEffect(() => {
        if (selectedCategory === 'Deliver') {
            navigation.navigate('delivery_parcel')
        }
    }, [selectedCategory])

    return (
        <Layout isHeaderShown={false}>
            <ScrollView style={styles.container}>
                {/* Search Header */}
                <View style={styles.searchHeader}>
                    <View style={styles.searchContainer}>
                        <TextInput style={styles.searchInput} placeholder="Find Transport..." placeholderTextColor="#666" />
                       
                    </View>
                </View>

                {/* Category Preview Cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewContainer}>
                    {vehicle.map((category) => (
                        <TouchableOpacity
                            key={category._id}
                            style={[styles.previewCard, { backgroundColor: category.backgroundColour }]}
                            onPress={() => setSelectedCategory(category.category)}
                        >
                            <Text style={styles.previewTitle}>{category.title}</Text>
                            {category.image && (
                                <Image source={{ uri: category?.image?.url }} style={styles.previewImage} resizeMode="contain" />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Available Vehicles */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{ 'Available Vehicles'}</Text>
                </View>

                {/* <View style={styles.vehicleList}>
                    {vehicles
                        .find((cat) => cat.category === selectedCategory)
                        ?.items.map((vehicle) => (
                            <VehicleCard key={vehicle.id} vehicle={vehicle} language={language} onBook={handleBook} />
                        ))}
                </View> */}

                {/* <Parcel_Transport /> */}
            </ScrollView>
        </Layout>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    searchHeader: {
        backgroundColor: "#fff",
        paddingTop: 40,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    searchContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        alignItems: "center",
    },
    searchInput: {
        flex: 1,
        height: 45,
        backgroundColor: "#f8f8f8",
        borderRadius: 22,
        paddingHorizontal: 20,
        marginRight: 10,
        fontSize: 16,
    },
    languageButton: {
        padding: 10,
        backgroundColor: "#e74c3c",
        borderRadius: 8,
    },
    languageButtonText: {
        color: "#fff",
        fontWeight: "bold",
    },
    previewContainer: {
        padding: 16,
        backgroundColor: "#fff",
        marginBottom: 10,
    },
    previewCard: {
        width: 200,
        height: 150,
        marginRight: 15,
        borderRadius: 12,
        padding: 15,
        justifyContent: "space-between",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 5,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    previewTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "bold",
    },
    previewImage: {
        width: "100%",
        height: 90,
    },
    sectionHeader: {
        padding: 16,
        backgroundColor: "#fff",
        marginBottom: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
    },
    vehicleList: {
        padding: 16,
    },
})

