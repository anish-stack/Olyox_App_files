import React, { useEffect, useState } from "react"
import { View, StyleSheet, ScrollView, Modal, TextInput } from "react-native"
import { Text, Card, Button, Divider } from "react-native-paper"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import MapViewDirections from "react-native-maps-directions"
import { useNavigation, useRoute } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import Slider from "@react-native-community/slider"
import { useSocket } from "../context/SocketContext"

const GOOGLE_MAPS_APIKEY = "AIzaSyBvyzqhO8Tq3SvpKLjW7I5RonYAtfOVIn8"

export default function RideDetailsScreen() {
    const route = useRoute()
    const { socket } = useSocket()
    const { params } = route.params || {}
    const [loading, setLoading] = useState(true)
    const [showOtpModal, setShowOtpModal] = useState(false)
    const [otp, setOtp] = useState("")
    const [rideStarted, setRideStarted] = useState(false)
    const [sliderValue, setSliderValue] = useState(0)
    const navigation = useNavigation()
    const { drop_desc, eta, rider, RideOtp, pickup_desc, kmOfRide, rideStatus, vehicleType } = params?.rideDetails || {}

    const pickupCoordinates = rider?.location?.coordinates
        ? {
            latitude: rider.location.coordinates[1],
            longitude: rider.location.coordinates[0],
        }
        : { latitude: 28.7041, longitude: 77.1025 }

    const dropCoordinates = params?.rideDetails?.pickupLocation
        ? {
            latitude: params?.rideDetails?.pickupLocation?.coordinates[1],
            longitude: params?.rideDetails?.pickupLocation?.coordinates[0],
        }
        : { latitude: 28.7041, longitude: 77.1025 }

    useEffect(() => {
        setTimeout(() => setLoading(false), 2000)
    }, [])

    const handleSliderComplete = (value) => {
        if (value === 1) {
            setShowOtpModal(true)
        }
        setSliderValue(0)
    }
    // console.log(socket)
    const handleOtpSubmit = () => {
        if (otp === RideOtp) {
            setShowOtpModal(false)
            setRideStarted(true)
            socket.emit("ride_started", params?.rideDetails)
        } else {
            alert("Incorrect OTP. Please try again.")
        }
    }

    useEffect(() => {
        if(socket){
            socket.on('ride_end',(data)=>{
                navigation.navigate('collect_money',{data:data?.rideDetails})
            })
        }
    })

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <Text style={styles.loaderText}>Loading ride details...</Text>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    initialRegion={{
                        latitude: pickupCoordinates.latitude,
                        longitude: pickupCoordinates.longitude,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
                >
                    <Marker coordinate={pickupCoordinates} title="Pickup Location">
                        <Icon name="map-marker" size={40} color="#FF3B30" />
                    </Marker>
                    <Marker coordinate={dropCoordinates} title="Drop Location">
                        <Icon name="map-marker-check" size={40} color="#FF9500" />
                    </Marker>
                    <MapViewDirections
                        origin={pickupCoordinates}
                        destination={dropCoordinates}
                        apikey={GOOGLE_MAPS_APIKEY}
                        strokeWidth={4}
                        strokeColor="#FF3B30"
                    />
                </MapView>

                <Card style={styles.rideInfoCard}>
                    <Card.Title title="Ride Details" titleStyle={styles.cardTitle} />
                    <Card.Content>
                        <View style={styles.rideInfoRow}>
                            <Icon name="map-marker" size={24} color="#FF3B30" />
                            <Text style={styles.rideInfoText}>{pickup_desc}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.rideInfoRow}>
                            <Icon name="map-marker-check" size={24} color="#FF9500" />
                            <Text style={styles.rideInfoText}>{drop_desc}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.rideInfoRow}>
                            <Icon name="car" size={24} color="#FF3B30" />
                            <Text style={styles.rideInfoText}>{rider?.rideVehicleInfo?.VehicleNumber || "N/A"}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.rideInfoRow}>
                            <Icon name="clock-outline" size={24} color="#FF3B30" />
                            <Text style={styles.rideInfoText}>ETA: {eta}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.rideInfoRow}>
                            <Icon name="currency-inr" size={24} color="#FF3B30" />
                            <Text style={styles.rideInfoText}>Price: ₹{kmOfRide}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.rideInfoRow}>
                            <Icon name="car-info" size={24} color="#FF3B30" />
                            <Text style={styles.rideInfoText}>{vehicleType}</Text>
                        </View>
                    </Card.Content>
                </Card>
            </ScrollView>


            <Button
                mode="contained"
                onPress={() => setShowOtpModal(true)}
                style={styles.reachedButton}
                labelStyle={styles.reachedButtonText}
                disabled={rideStarted}
            >
                {rideStarted ? "Ride Started" : "Reached"}
            </Button>


            <Modal visible={showOtpModal} transparent={true} animationType="slide">
                <View style={styles.modalContainer}>
                    <Card style={styles.modalContent}>
                        <Card.Title title="Enter OTP" titleStyle={styles.modalTitle} />
                        <Card.Content>
                            <TextInput
                                style={styles.otpInput}
                                value={otp}
                                onChangeText={setOtp}
                                keyboardType="numeric"
                                maxLength={4}
                                placeholder="Enter 4-digit OTP"
                            />
                            <Button
                                mode="contained"
                                onPress={handleOtpSubmit}
                                style={styles.submitButton}
                                labelStyle={styles.submitButtonText}
                            >
                                Submit
                            </Button>
                        </Card.Content>
                    </Card>
                    <Button
                        icon="close"
                        mode="text"
                        onPress={() => setShowOtpModal(false)}
                        style={styles.closeButton}
                        labelStyle={styles.closeButtonText}
                    >
                        Close
                    </Button>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFF5F5",
    },
    scrollView: {
        flex: 1,
    },
    reachedButton: {
        backgroundColor: "#FF3B30",
        marginHorizontal: 16,
        marginBottom: 16,
        paddingVertical: 8,
    },
    reachedButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "bold",
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFF5F5",
    },
    loaderText: {
        fontSize: 18,
        color: "#FF3B30",
    },
    map: {
        height: 300,
    },
    rideInfoCard: {
        margin: 16,
        elevation: 4,
        backgroundColor: "#FFFFFF",
    },
    cardTitle: {
        color: "#FF3B30",
        fontWeight: "bold",
    },
    rideInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 8,
    },
    rideInfoText: {
        fontSize: 16,
        marginLeft: 12,
        color: "#333",
        flex: 1,
    },
    divider: {
        backgroundColor: "#FFCCCB",
        height: 1,
        marginVertical: 8,
    },
    sliderContainer: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#FFCCCB",
    },
    slider: {
        width: "100%",
        height: 50,
    },
    sliderText: {
        textAlign: "center",
        marginTop: 8,
        color: "#FF3B30",
        fontWeight: "bold",
    },
    modalContainer: {
        flex: 1,
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 59, 48, 0.2)",
    },
    modalContent: {
        position: "relative",

        width: "80%",
        backgroundColor: "#FFFFFF",
    },
    modalTitle: {

        color: "#FF3B30",
        fontWeight: "bold",
    },
    otpInput: {
        borderWidth: 1,
        borderColor: "#FF3B30",
        borderRadius: 5,
        padding: 10,
        fontSize: 18,
        textAlign: "center",
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: "#FF3B30",
        marginTop: 16,
    },
    submitButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    closeButton: {
        marginTop: 16,
        // position: "relative",
        backgroundColor: "#FF3B30",
        borderRadius: 35,
        // top: 0,
        width: "50%",
        // height: 40,

    },
    closeButtonText: {
        color: "#FFFFFF",
        padding: 8,
        textAlign: "center",
        // color: "#000",
        fontSize: 16,
    },
})

