import {
    View,
    Text,
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Image,
    Alert
} from 'react-native';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as WebBrowser from 'expo-web-browser';
import { useClerk, useOAuth, useUser } from '@clerk/clerk-expo';
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';
import { tokenCache } from '../Auth/cache';
import { createUserRegister, login, verify_otp } from '../utils/helpers';
// Warm up the Web Browser for OAuth
const useWarmUpBrowser = () => {
    useEffect(() => {
        console.log("Attempting to warm up WebBrowser...");
        const warmUp = async () => {
            if (Platform.OS !== 'web') {  
                await WebBrowser.warmUpAsync();
            }
        };
        warmUp();
        console.log("WebBrowser warmed up successfully.");
        return () => {
            if (Platform.OS !== 'web') {
                WebBrowser.coolDownAsync();
            }
        };
    }, []);
};


WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function Onboarding() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState('');
    const navigation = useNavigation()

    const scrollX = useRef(new Animated.Value(0)).current;

    const [fontsLoaded] = useFonts({
        'Roboto-Regular': require('./Roboto-VariableFont_wdth,wght.ttf'),
    });
    const { user } = useUser();
    // console.log("userData of you", user)

    const { signOut, setActive } = useClerk();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });


    const handleLogout = async () => {
        try {
            // Clear the Clerk session
            await signOut();
            await tokenCache.deleteToken('auth_token_db')
            console.log('User logged out');
            // Optionally redirect or update UI after logout
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    const handleVerifyOtp = async () => {
        try {
            const formData = {
                number: phoneNumber,
                otp

            }
            const data = await verify_otp(formData)
            // console.log(data)
            if (data.status === 200) {
                await tokenCache.saveToken('auth_token_db', data.token);
                Alert.alert(
                    'OTP Verification',
                    'Your OTP has been successfully verified. Redirecting you to the Home...',
                    [
                        {
                            text: 'Close',
                            onPress: () => console.log('OTP verified, redirecting...'),
                        },
                    ],
                    { cancelable: true }
                );

                setShowOtpModal(false)

                setOtp('')
                setPhoneNumber('')
                navigation.navigate('Home')
            }

            if (data.data) {
                Alert.alert(
                    'Otp Verification Failed',
                    data?.data?.message,
                    [
                        {
                            text: 'Close',
                        },
                    ],
                    { cancelable: true }
                );
            }
        } catch (error) {

            console.error('Error during logout:', error);
        }
    };


    const handleRegisterWithPhone = async () => {
        const formData = { number: phoneNumber }
        const user = await createUserRegister(formData)
        if (user.status === 201) {
            setShowOtpModal(true)
        } else if (user.status === 200) {
            setShowOtpModal(true)

        } else if (user?.data?.message) {
            Alert.alert(
                'Registration Failed',
                user?.data?.message,
                [
                    {
                        text: 'Close',
                    },
                ],
                { cancelable: true }
            );
        }

    }

    useEffect(() => {
        if (user !== null) {
            console.log("db login start")
            const loginFromServer = async () => {
                const formData = {
                    email: user.emailAddresses,
                    isGoogle: true
                }
                const data = await login(formData)
                if (data.status === 200) {
                    await tokenCache.saveToken('auth_token_db', data.token);

                } else {
                    Alert.alert(
                        'Login Failed',
                        data?.data?.message,
                        [
                            {
                                text: 'Close',
                            },
                        ],
                        { cancelable: true }
                    );
                }
            }
            loginFromServer()
        }
    }, [user])


    useWarmUpBrowser();
    const onPressGoogle = useCallback(async () => {
        try {
            const response = await startOAuthFlow({
                redirectUrl: Linking.createURL('/Home', { scheme: 'myapp' }),
            });

            const { signUp, signIn } = response;
            if (signIn && signIn.status === 'complete') {

                const { createdSessionId } = signIn;

                if (createdSessionId) {
                    const data = await setActive({ session: createdSessionId });
                    await tokenCache.saveToken('auth_token', createdSessionId);
                    await tokenCache.saveToken('auth_token_db', createdSessionId);
                    navigation.navigate('Home')
                    console.log('Session has been set as active');

                } else {
                    console.error('No session ID returned');
                }
            } else if (signUp) {
                // console.log('New user detected, proceeding with sign-up...');

                if (signUp.status === 'missing_requirements') {
                    // console.warn('Missing required fields:', signUp.missingFields);
                    if (signUp.missingFields.includes('phone_number')) {
                        console.log('Requesting phone number...');

                    }
                }

                const { firstName, emailAddress, createdSessionId } = signUp;
                // console.log(firstName, emailAddress)
                if (createdSessionId) {
                    // console.log('Session created successfully:', createdSessionId);

                    await setActive({ session: createdSessionId });
                    const formDataOfUser = {
                        name: firstName,
                        email: emailAddress,
                        isGoogle: true
                    }
                    console.log(formDataOfUser)
                    const data = await createUserRegister(formDataOfUser)
                    
                    console.log('Session has been set as active', data);
                    navigation.navigate('Home')
                    await tokenCache.saveToken('auth_token', createdSessionId);
                    await tokenCache.saveToken('auth_token_db', data.token);
                } else {
                    console.error('No session ID returned');
                }
            }
        } catch (err) {
            if(err.status === 400){
                navigation.navigate('Home')
            }
            console.error('Error during Google sign-up or login:', JSON.stringify(err, null, 2));
        }
    }, [startOAuthFlow]);



    const SlideData = [
        {
            id: 1,
            title: 'Delicious Food Delivery',
            slug: 'Food',
            description: 'Get your favorite meals delivered right to your doorstep. Enjoy restaurant-quality food in the comfort of your home.',
            image: require('./food-Photoroom.png'),
        },
        {
            id: 2,
            title: 'Quick Rides Anytime',
            slug: 'Bike and taxi ride',
            description: 'Fast and reliable rides at your fingertips. Choose between bikes or taxis for your perfect journey.',
            image: require('./Bike.png'),
        },
        {
            id: 3,
            title: 'Luxurious Stays',
            slug: 'Hotel Booking',
            description: 'Book premium hotels and accommodations worldwide. Your comfort is our priority.',
            image: require('./Hotel Ro.png'),
        },
        {
            id: 4,
            title: 'Heavy Vehicle Rentals',
            slug: 'Book Heavy Vehicle',
            description: 'Need something bigger? Rent heavy vehicles for your transportation and logistics needs.',
            image: require('./rb_27860.png'),
        }
    ];


    const renderDots = () => {
        return SlideData.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 20, 8],
                extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
            });

            return (
                <Animated.View
                    key={index}
                    style={[styles.dot, { width: dotWidth, opacity }]}
                />
            );
        });
    };

    if (!fontsLoaded) {
        return <View><Text>Loading....</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                scrollEventThrottle={16}
            >
                {SlideData.map((item, index) => (
                    <View key={item.id} style={styles.slide}>
                        <View style={styles.imageContainer}>
                            <Animated.Image
                                source={item.image}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={[styles.title, { fontFamily: 'Roboto-Regular' }]}>{item.title}</Text>
                            <Text style={[styles.description, { fontFamily: 'Roboto-Regular' }]}>{item.description}</Text>
                        </View>
                    </View>
                ))}
            </Animated.ScrollView>

            <View style={styles.dotsContainer}>
                {renderDots()}
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setShowAuthModal(true)}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
                {/* <TouchableOpacity
                    style={styles.button}
                    onPress={() => handleLogout()}
                >
                    <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity> */}
            </View>


            {/* Phone Auth Modal */}
            <Modal
                visible={showAuthModal}
                animationType="slide"
                transparent={true}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                        />
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={handleRegisterWithPhone}
                        >
                            <Text style={styles.buttonText}>Send OTP</Text>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={onPressGoogle}
                        >
                            <Image
                                source={require('./google (1).png')}
                                style={styles.googleIcon}
                            />
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowAuthModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* OTP Modal */}
            <Modal
                visible={showOtpModal}
                animationType="slide"
                transparent={true}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Enter OTP</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter OTP"
                            keyboardType="number-pad"
                            value={otp}
                            onChangeText={setOtp}
                            maxLength={6}
                        />
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={handleVerifyOtp}
                        >
                            <Text style={styles.buttonText}>Verify OTP</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowOtpModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    slide: {
        width,
        height,
        alignItems: 'center',
        padding: 20,
    },
    imageContainer: {
        width: width * 0.9,
        height: height * 0.45,
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: Platform.OS === 'ios' ? 60 : 40,

    },
    image: {
        width: width * 0.8,
        height: height * 0.4,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E53E3E',
        marginBottom: 5,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 150,
        width: '100%',
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E53E3E',
        marginHorizontal: 4,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: '#E53E3E',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#E53E3E',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E53E3E',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        fontSize: 16,
    },
    modalButton: {
        backgroundColor: '#E53E3E',
        paddingVertical: 15,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 15,
    },
    closeButton: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#666',
        fontSize: 16,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#ddd',
    },
    orText: {
        marginHorizontal: 10,
        color: '#666',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 15,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    googleButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
});