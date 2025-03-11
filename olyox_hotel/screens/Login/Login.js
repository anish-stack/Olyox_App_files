import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Image,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL_V2 } from '../../constant/Api';
import { colors } from '../../constant/Colors';
import { useToken } from '../../context/AuthContext';
const { width } = Dimensions.get('window');

export default function Login({ navigation }) {
    const [bh, setBh] = useState('BH');
    const [otpSend, setOtpSend] = useState(false);
    const { updateToken } = useToken()
    const [otpResendTimer, setOtpResendTimer] = useState(90);
    const [otpInput, setOtpInput] = useState('');
    const [isDisabled, setDisabled] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer;
        if (otpResendTimer > 0 && otpSend) {
            timer = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [otpResendTimer, otpSend]);

    const handleLoginStart = async () => {
        if (!/^BH\d{6}$/.test(bh)) {
            setError("Invalid BH ID. It should be 8 digits, starting with 'BH'");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL_V2}/Login-Hotel`, { BH: bh });
            // console.log(response.data)
            if (response.data.success) {
                setSuccess(true);
                setDisabled(false);
                setOtpSend(true);
                setError('');
            }
        } catch (error) {
            console.log("Error while login", error.response.data)
            if (error.response.status === 403) {
                setTimeout(() => {
                    navigation.navigate('HotelListing', {
                        bh: error.response.data?.BhID
                    })
                }, 1500)
            }
            if (error.response.status === 402) {
                setTimeout(() => {
                    navigation.navigate('BhVerification')
                }, 1500)
            }
            setError(error.response.data.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (!otpInput) return setError("Please enter OTP");
        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL_V2}/verify-otp`, { hotel_phone: bh, otp: otpInput, type: "login" });
            const { token } = response.data;
            await updateToken(token);
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } catch (err) {
            console.log(err?.response.data)

            setError(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboardView}>
                <ScrollView contentContainerStyle={styles.scrollView} keyboardShouldPersistTaps="handled">
                    <View style={styles.logoContainer}>
                        <Image source={{ uri: "https://i.ibb.co/pY8kDVH/image.png" }} style={styles.logo} />
                        <Text style={styles.title}>Login</Text>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter BH ID (e.g., BH1234)"
                        keyboardType="default"
                        value={bh}
                        onChangeText={setBh}
                    />
                    {!otpSend && (
                        <TouchableOpacity style={styles.button} onPress={handleLoginStart} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
                        </TouchableOpacity>
                    )}

                    {success && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter OTP"
                                keyboardType="number-pad"
                                value={otpInput}
                                onChangeText={setOtpInput}
                            />
                            <TouchableOpacity style={styles.button} onPress={verifyOtp} disabled={isDisabled || loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.button, { backgroundColor: colors.darkViolet }]} onPress={handleLoginStart} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Resend Otp</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: 'start',
        alignItems: 'start',
        paddingHorizontal: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: width,
        height: width,
        resizeMode: 'cover',
    },
    title: {
        marginTop: 20,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: colors.primaryRed,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        textAlign: 'center',
        color: 'red',
        fontSize: 14,
        marginTop: 10,
    },
});
