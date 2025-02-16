import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from "@react-navigation/native";
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../constants/colors'; 
import { FontAwesome } from '@expo/vector-icons';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');

export default function MoneyPage() {
    const navigation = useNavigation();
    const route = useRoute();
    const [isRideRate, setIsRideRate] = useState(false);
    const [rateValue, setRateValue] = useState(0);

    const { data } = route.params || {};
    const { socket } = useSocket();

    const [isLoading, setIsLoading] = useState(false);

    const price = data.rideDetails?.price || '0';
    const qrValue = data?.qrValue || '123456';

    const handleISPay = () => {
        setIsLoading(true);

        setTimeout(() => {
            socket.emit('isPay', data);
            setIsLoading(false);
            setIsRideRate(true); // Show rating screen
        }, 2000);
    };

    useEffect(() => {
        socket.on('rating', (data) => {
            console.log(data);
            setRateValue(data?.rating || 0);
        });

        return () => {
            socket.off('rating');
        };
    }, []);

    const handleRating = (rate) => {
        setRateValue(rate);
        socket.emit('rateRide', { rating: rate }); // Emit the rating to the server
    };

    if (isRideRate) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Rate Your Ride</Text>
                <Text style={styles.instructions}>Please rate your ride experience.</Text>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => handleRating(star)}
                        >
                            <FontAwesome
                                name={star <= rateValue ? 'star' : 'star-o'}
                                size={40}
                                color={COLORS.primary}
                                style={styles.star}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.subtitle}>
                    {rateValue > 0 ? `You rated: ${rateValue} Star${rateValue > 1 ? 's' : ''}` : ''}
                </Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                    color={COLORS.primary}
                    backgroundColor={COLORS.white}
                />
            </View>

            <Text style={styles.instructions}>
                Scan the QR code to complete your payment and collect the amount. Please verify the amount before confirming the transaction.
            </Text>

            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Home')}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Go Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.collectButton}
                    onPress={handleISPay}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <Text style={styles.buttonText}>Collect Cash</Text>
                    )}
                </TouchableOpacity>
            </View>
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
        backgroundColor: COLORS.primary,
        padding: 20,
        borderRadius: 10,
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    price: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    qrContainer: {
        marginBottom: 30,
        padding: 10,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3.84,
        elevation: 4,
    },
    instructions: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 30,
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    star: {
        marginHorizontal: 10,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: width * 0.8,
        gap: 10,
    },
    backButton: {
        backgroundColor: COLORS.secondary,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
    },
    collectButton: {
        backgroundColor: COLORS.success,
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
