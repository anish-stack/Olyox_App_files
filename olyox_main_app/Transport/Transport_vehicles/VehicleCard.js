
import { useState } from "react"
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal } from "react-native"

export const VehicleCard = ({ vehicle, language, onBook }) => {
    const [modalVisible, setModalVisible] = useState(false)

    return (
        <View style={styles.vehicleCard}>
            <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} resizeMode="contain" />
            <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{vehicle.name[language]}</Text>
                <Text style={styles.vehicleTiming}>{vehicle.timing}</Text>
                <Text style={styles.vehicleDetails}>{vehicle.details}</Text>
                <Text style={styles.vehiclePrice}>{vehicle.price}</Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                    <Text style={styles.buttonText}>{language === 'hi' ? 'देखें' : 'See Details'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={() => onBook(vehicle)}>
                    <Text style={styles.buttonText}>{language === 'hi' ? 'बुक करें' : 'Book Now'}</Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalView}>
                    <Text style={styles.modalTitle}>
                        {language === 'hi' ? 'वाहन और चालक विवरण' : 'Vehicle and Driver Details'}
                    </Text>
                    <Text style={styles.modalText}>
                        {language === 'hi' ? 'वाहन:' : 'Vehicle:'} {vehicle.name[language]}
                    </Text>

                    <Text style={styles.modalText}>
                        {language === 'hi' ? 'क्षमता:' : 'Capacity:'} {vehicle.details}
                    </Text>

                    <Text style={styles.modalText}>
                        {language === 'hi' ? 'चालक:' : 'Driver:'} {vehicle.driver.name}
                    </Text>

                    <Text style={styles.modalText}>
                        {language === 'hi' ? 'अनुभव:' : 'Experience:'} {vehicle.driver.experience}
                    </Text>

                    <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => {
                            /* Implement call functionality */
                        }}
                    >
                        <Text style={styles.buttonText}>
                            {language === 'hi' ? `कॉल करें: ${vehicle.driver.phone}` : `Call: ${vehicle.driver.phone}`}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                        <Text style={styles.buttonText}>
                            {language === 'hi' ? 'बंद करें' : 'Close'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    vehicleCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        flexDirection: "column",
        // shadowColor: "#000",
        // shadowOffset: {
        //   width: 0,
        //   height: 2,
        // },
        // shadowOpacity: 0.1,
        // shadowRadius: 4,
        // elevation: 3,
    },
    vehicleImage: {
        width: "100%",
        height: 150,
        borderRadius: 8,
    },
    vehicleInfo: {
        marginTop: 10,
    },
    vehicleName: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    vehicleTiming: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    vehicleDetails: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    vehiclePrice: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#e74c3c",
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    button: {
        backgroundColor: "#27ae60",
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        flex: 1,
        marginHorizontal: 5,
    },
    buttonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
    },
    callButton: {
        backgroundColor: "#2196F3",
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        marginBottom: 10,
    },
    closeButton: {
        backgroundColor: "#e74c3c",
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
})

