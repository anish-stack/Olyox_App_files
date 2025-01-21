import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation, useRoute } from "@react-navigation/native";
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../constants/colors'; // Make sure to define your color constants

const { width } = Dimensions.get('window');

export default function MoneyPage() {
    const navigation = useNavigation();
    const route = useRoute();
    const { data } = route.params || {};
    console.log(data.rideDetails);
    const price = data.rideDetails?.price || '0'; // Set price from route params
    const qrValue = data?.qrValue || '123456'; // QR code value

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Amount to be Collected</Text>

            <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{price}</Text>
            </View>

            <View style={styles.qrContainer}>
                <QRCode
                    value={qrValue}
                    size={200}
                    color={COLORS.error} // Use your color scheme
                    backgroundColor="white"
                />
            </View>

            <Text style={styles.instructions}>
                Scan the QR code to complete your payment and collect the amount. Please verify the amount before confirming the transaction.
            </Text>

            <TouchableOpacity style={styles.confirmButton} onPress={() => navigation.goBack()}>
                <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
    },
    priceContainer: {
        backgroundColor: COLORS.error,
        padding: 20,
        borderRadius: 10,
        marginBottom: 30,
    },
    price: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    qrContainer: {
        marginBottom: 30,
    },
    instructions: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 30,
    },
    confirmButton: {
        backgroundColor: COLORS.button,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
