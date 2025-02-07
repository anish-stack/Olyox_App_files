"use client"

import { useEffect, useState } from "react"
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, StyleSheet } from "react-native"
import Layout from "../components/Layout/_layout"
import { VehicleCard } from "./Transport_vehicles/VehicleCard"
import Parcel_Transport from "./Parcel_Transport/Parcel_Transport"
import { useNavigation } from "@react-navigation/native"
export const vehicles = [
    {
        id: 1,
        category: "truck",
        name: {
            en: "Trucks",
            hi: "ट्रक"
        },
        bgColor: "#2C3E50",
        items: [
            {
                id: "t1",
                name: {
                    en: "Tata 407 Truck",
                    hi: "टाटा 407 ट्रक"
                },
                timing: "दैनिक किराया उपलब्ध",
                price: "₹3,500/दिन",
                image: "https://i.ibb.co/5XfX9Vsm/pngwing-com-15.png",
                details: "4 टन क्षमता",
                driver: {
                    name: "राजेश कुमार",
                    experience: "5 वर्ष",
                    phone: "+91 9876543210"
                }
            },
            {
                id: "t2",
                name: {
                    en: "Ashok Leyland Truck",
                    hi: "अशोक लेलैंड ट्रक"
                },
                timing: "मासिक किराया उपलब्ध",
                price: "₹85,000/माह",
                image: "https://images.unsplash.com/photo-1586191582056-b5d87b26f553?w=500",
                details: "12 टन क्षमता",
                driver: {
                    name: "अमित सिंह",
                    experience: "8 वर्ष",
                    phone: "+91 9876543211"
                }
            }
        ]
    },
    {
        id: 2,
        category: "bulldozer",
        name: {
            en: "Bulldozer",
            hi: "बुलडोज़र"
        },
        bgColor: "#E67E22",
        items: [
            {
                id: "b1",
                name: {
                    en: "JCB Bulldozer",
                    hi: "जेसीबी बुलडोज़र"
                },
                timing: "घंटों के हिसाब से",
                price: "₹1,200/घंटा",
                image: "https://i.ibb.co/jPkBgZd6/pngwing-com-16.png",
                details: "निर्माण कार्य हेतु",
                driver: {
                    name: "सुनील यादव",
                    experience: "7 वर्ष",
                    phone: "+91 9876543212"
                }
            }
        ]
    },
    {
        id: 6,
        category: "delivery parcel",
        name: {
            en: "Delivery Parcel",
            hi: "डिलीवरी पार्सल"
        },
        bgColor: "#8E44AD",
        items: [
            {
                id: "dp1",
                name: {
                    en: "Small Parcel",
                    hi: "स्मॉल पार्सल"
                },
                timing: "आवश्यकतानुसार",
                price: "₹500/पार्सल",
                image: "https://i.ibb.co/R4sjSHKm/pngwing-com-20.png",
                details: "जल्द डिलीवरी",
                driver: {
                    name: "राजीव कुमार",
                    experience: "4 वर्ष",
                    phone: "+91 9876543218"
                }
            },
            {
                id: "dp2",
                name: {
                    en: "Large Parcel",
                    hi: "लार्ज पार्सल"
                },
                timing: "आवश्यकतानुसार",
                price: "₹1,000/पार्सल",
                image: "https://i.ibb.co/R4sjSHKm/pngwing-com-20.png",
                details: "सभी प्रकार के पैकेज डिलीवरी",
                driver: {
                    name: "विक्रम सिंह",
                    experience: "5 वर्ष",
                    phone: "+91 9876543219"
                }
            }
        ]
    },
    {
        id: 3,
        category: "tractor",
        name: {
            en: "Tractor",
            hi: "ट्रैक्टर"
        },
        bgColor: "#27AE60",
        items: [
            {
                id: "tr1",
                name: {
                    en: "Mahindra 575",
                    hi: "महिंद्रा 575"
                },
                timing: "दैनिक किराया",
                price: "₹2,500/दिन",
                image: "https://i.ibb.co/0VBfc6Tj/pngwing-com-17.png",
                details: "कृषि कार्य हेतु",
                driver: {
                    name: "अनिल कुमार",
                    experience: "6 वर्ष",
                    phone: "+91 9876543213"
                }
            },
            {
                id: "tr2",
                name: {
                    en: "Sonalika Tractor",
                    hi: "सोनालिका ट्रैक्टर"
                },
                timing: "सप्ताहिक किराया",
                price: "₹15,000/सप्ताह",
                image: "https://images.unsplash.com/photo-1507670092296-5c775ab94cd9?w=500",
                details: "सभी कार्य हेतु",
                driver: {
                    name: "धीरज सिंह",
                    experience: "4 वर्ष",
                    phone: "+91 9876543214"
                }
            }
        ]
    },
    {
        id: 4,
        category: "crane",
        name: {
            en: "Crane",
            hi: "क्रेन"
        },
        bgColor: "#b33d47",
        items: [
            {
                id: "c1",
                name: {
                    en: "Mobile Crane",
                    hi: "मोबाइल क्रेन"
                },
                timing: "प्रति घंटा",
                price: "₹2,000/घंटा",
                image: "https://i.ibb.co/qFX2CwwT/pngwing-com-18.png",
                details: "भारी सामान उठाने हेतु",
                driver: {
                    name: "संजय शर्मा",
                    experience: "10 वर्ष",
                    phone: "+91 9876543215"
                }
            }
        ]
    },
    {
        id: 5,
        category: "ambulance",
        name: {
            en: "Ambulance",
            hi: "एंबुलेंस"
        },
        bgColor: "#FF5733",
        items: [
            {
                id: "a1",
                name: {
                    en: "Basic Ambulance",
                    hi: "बेसिक एंबुलेंस"
                },
                timing: "प्रति घंटा",
                price: "₹1,500/घंटा",
                image: "https://i.ibb.co/wZLGXN5y/pngwing-com-19.png",
                details: "आपातकालीन सेवा",
                driver: {
                    name: "वीरेंद्र सिंह",
                    experience: "6 वर्ष",
                    phone: "+91 9876543216"
                }
            },
            {
                id: "a2",
                name: {
                    en: "ICU Ambulance",
                    hi: "आईसीयू एंबुलेंस"
                },
                timing: "प्रति घंटा",
                price: "₹3,500/घंटा",
                image: "https://i.ibb.co/wZLGXN5y/pngwing-com-19.png",
                details: "सभी प्रकार की आपातकालीन स्थिति",
                driver: {
                    name: "पंकज कुमार",
                    experience: "8 वर्ष",
                    phone: "+91 9876543217"
                }
            }
        ]
    },

];


export default function MainTransport() {
    const navigation = useNavigation()
    const [selectedCategory, setSelectedCategory] = useState("truck")
    const [language, setLanguage] = useState("hi")

    const handleBook = (vehicle) => {
        alert(`Booked ${vehicle.name[language]}!`)
    }
    useEffect(() => {
        if (selectedCategory === 'delivery parcel') {
            navigation.navigate('delivery_parcel')
        }
    }, [selectedCategory])

    return (
        <Layout isHeaderShown={false}>
            <ScrollView style={styles.container}>
                {/* Search Header */}
                <View style={styles.searchHeader}>
                    <View style={styles.searchContainer}>
                        <TextInput style={styles.searchInput} placeholder="वाहन खोजें..." placeholderTextColor="#666" />
                        <TouchableOpacity
                            style={styles.languageButton}
                            onPress={() => setLanguage(language === "en" ? "hi" : "en")}
                        >
                            <Text style={styles.languageButtonText}>{language.toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category Preview Cards */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewContainer}>
                    {vehicles.map((category) => (
                        <TouchableOpacity
                            key={category.id}
                            style={[styles.previewCard, { backgroundColor: category.bgColor }]}
                            onPress={() => setSelectedCategory(category.category)}
                        >
                            <Text style={styles.previewTitle}>{category.name[language]}</Text>
                            {category.items[0] && (
                                <Image source={{ uri: category.items[0].image }} style={styles.previewImage} resizeMode="contain" />
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Available Vehicles */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{language === 'hi' ? 'उपलब्ध वाहन' : 'Available Vehicles'}</Text>
                </View>

                <View style={styles.vehicleList}>
                    {vehicles
                        .find((cat) => cat.category === selectedCategory)
                        ?.items.map((vehicle) => (
                            <VehicleCard key={vehicle.id} vehicle={vehicle} language={language} onBook={handleBook} />
                        ))}
                </View>

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

