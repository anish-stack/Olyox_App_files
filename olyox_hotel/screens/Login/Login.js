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
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL_V2 } from '../../constant/Api';
import { colors } from '../../constant/Colors';
import { useToken } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Login({ navigation }) {
    const [bh, setBh] = useState('BH');
    const [typeOfMessage, setTypeOfMessage] = useState('text'); // 'text' or 'whatsapp'
    const [otpInput, setOtpInput] = useState('');
    const [otpSend, setOtpSend] = useState(false);
    const [otpResendTimer, setOtpResendTimer] = useState(90);
    const [isDisabled, setDisabled] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const { updateToken } = useToken();

    useEffect(() => {
        let timer;
        if (otpSend && otpResendTimer > 0) {
            timer = setTimeout(() => setOtpResendTimer((prev) => prev - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [otpResendTimer, otpSend]);

    const handleLoginStart = async () => {
        setError('');
        if (!/^BH\d{6}$/.test(bh)) {
            return setError("Invalid BH ID. Format: BH followed by 6 digits.");
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE_URL_V2}/Login-Hotel`, {
                BH: bh,
                type: typeOfMessage,
            });

            if (response.data.success) {
                setOtpSend(true);
                setDisabled(false);
                setOtpResendTimer(90);
            }
        } catch (err) {
            console.log(err?.response?.data)
            const res = err?.response?.data;
            if (err.response?.status === 403) {
                return setTimeout(() => {
                    navigation.navigate('HotelListing', { bh: res?.BhID });
                }, 1500);
            }
            if (err.response?.status === 402) {
                return setTimeout(() => {
                    navigation.navigate('BhVerification');
                }, 1500);
            }
            setError(res?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        setError('');
        if (!otpInput) return setError('Please enter the OTP');
        setVerifying(true);
        try {
            const response = await axios.post(`${API_BASE_URL_V2}/verify-otp`, {
                hotel_phone: bh,
                otp: otpInput,
                type: 'login',
            });
            console.log(response.data)
            const { token } = response.data;
            await updateToken(token);
            navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        } catch (err) {
            setError(err.response?.data?.message || 'OTP verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const handleOtpTypeChange = (type) => {
        setTypeOfMessage(type);
        setError('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scrollView} keyboardShouldPersistTaps="handled">
                    <View style={styles.logoContainer}>
                        <Image source={{ uri: "https://i.ibb.co/pY8kDVH/image.png" }} style={styles.logo} />
                        <Text style={styles.title}>Login</Text>
                    </View>

                    <View style={styles.otpTypeContainer}>
                        <TouchableOpacity
                            style={[styles.otpTypeButton, typeOfMessage === 'text' && styles.otpTypeButtonActive]}
                            onPress={() => handleOtpTypeChange('text')}
                        >
                            <Text style={styles.otpTypeText}>OTP via Text</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.otpTypeButton, typeOfMessage === 'whatsapp' && styles.otpTypeButtonActive]}
                            onPress={() => handleOtpTypeChange('whatsapp')}
                        >
                            <Text style={styles.otpTypeText}>OTP via WhatsApp</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter BH ID (e.g., BH123456)"
                        keyboardType="number-pad"
                        value={bh}
                        
                        onChangeText={setBh}
                    />

                    {!otpSend && (
                        <TouchableOpacity style={styles.button} onPress={handleLoginStart} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
                        </TouchableOpacity>
                    )}

                    {otpSend && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter OTP"
                                keyboardType="number-pad"
                                value={otpInput}
                                onChangeText={setOtpInput}
                            />

                            <TouchableOpacity style={styles.button} onPress={verifyOtp} disabled={isDisabled || verifying}>
                                {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.resendButton]}
                                onPress={handleLoginStart}
                                disabled={otpResendTimer > 0 || loading}
                            >
                                <Text style={styles.buttonText}>
                                    {otpResendTimer > 0 ? `Resend OTP in ${otpResendTimer}s` : 'Resend OTP'}
                                </Text>
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
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: width,
        height: width,
        resizeMode: 'cover',
    },
    title: {
        marginTop: 10,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    otpTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    otpTypeButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
    },
    otpTypeButtonActive: {
        backgroundColor: colors.primaryRed,
    },
    otpTypeText: {
        color: '#fff',
        fontWeight: '600',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        marginBottom: 15,
    },
    button: {
        height: 50,
        backgroundColor: colors.primaryRed,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginTop: 10,
    },
    resendButton: {
        backgroundColor: colors.darkViolet,
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
        marginTop: 15,
    },
});
