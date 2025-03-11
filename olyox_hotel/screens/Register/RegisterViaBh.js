import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from './FormInput';
import AddressForm from './AddressForm';
import styles from './RegisterStyle';
import axios from 'axios';
import { API_BASE_URL_V1, API_BASE_URL_V2 } from '../../constant/Api';

export default function RegisterViaBh() {
    const route = useRoute();
    const navigation = useNavigation();
    const { bh_id } = route.params || {};

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        reEmail: '',
        number: '',
        password: '',
        category: '676ef95b5c75082fcbc59c4b',
        address: {
            area: '',
            street_address: '',
            landmark: '',
            pincode: '',
            location: {
                type: 'Point',
                coordinates: [78.2693, 25.369],
            },
        },
        dob: '2001-01-12',
        referral_code_which_applied: bh_id,
        is_referral_applied: true,
    });

    const [errors, setErrors] = useState({});

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        // Clear field-specific error when user starts typing
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
        // Clear general error messages
        setErrorMessage('');
    };

    const handleAddressChange = (field, value) => {
        setFormData({
            ...formData,
            address: { ...formData.address, [field]: value },
        });
        if (field === 'pincode' && errors.pincode) {
            setErrors({ ...errors, pincode: '' });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        // Email confirmation
        if (formData.email !== formData.reEmail) {
            newErrors.reEmail = 'Emails do not match';
        }

        // Phone validation
        const phoneRegex = /^\d{10}$/;
        if (!formData.number) {
            newErrors.number = 'Phone number is required';
        } else if (!phoneRegex.test(formData.number)) {
            newErrors.number = 'Please enter a valid 10-digit phone number';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        // Pincode validation
        const pincodeRegex = /^\d{6}$/;
        if (!formData.address.pincode) {
            newErrors.pincode = 'Pincode is required';
        } else if (!pincodeRegex.test(formData.address.pincode)) {
            newErrors.pincode = 'Please enter a valid 6-digit pincode';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!validateForm()) {
            setErrorMessage('Please fix the errors in the form');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(
                `${API_BASE_URL_V1}/register_vendor`,
                formData
            );

            if (response.data?.success) {
                setSuccessMessage('Registration successful! Proceeding to verification...');

                // Short delay to show success message
                setTimeout(() => {
                    navigation.navigate('OtpVerify', {
                        type: response.data.type,
                        email: response.data.email,
                        expireTime: response.data.time,
                        number: response.data.number,
                    });
                }, 1500);
            }
        } catch (error) {
            // console.log(error.response)
            const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
            setErrorMessage(errorMsg);

            if (error.response?.status === 422) {
                // Handle validation errors from server
                const serverErrors = error.response.data.errors;
                if (serverErrors) {
                    setErrors(prevErrors => ({
                        ...prevErrors,
                        ...Object.fromEntries(
                            Object.entries(serverErrors).map(([key, value]) => [key, value[0]])
                        )
                    }));
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView >

            <ScrollView
                showsVerticalScrollIndicator={false}

                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.cards}>
                    <Text style={styles.title}>Register Via BH</Text>
                    {/* <Text style={styles.subtitle}>BH ID: {bh_id}</Text> */}

                    {errorMessage ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    {successMessage ? (
                        <View style={styles.successBox}>
                            <Text style={styles.successText}>{successMessage}</Text>
                        </View>
                    ) : null}

                    <View style={styles.formContainer}>
                        <FormInput
                            label="Name"
                            value={formData.name}
                            onChangeText={(text) => handleInputChange('name', text)}
                            placeholder="Enter your name"
                            error={errors.name}
                            style={[styles.input, errors.name && styles.inputError]}
                        />

                        <FormInput
                            label="Email"
                            value={formData.email}
                            onChangeText={(text) => handleInputChange('email', text)}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            error={errors.email}
                            style={[styles.input, errors.email && styles.inputError]}
                            autoCapitalize="none"
                        />

                        <FormInput
                            label="Re-enter Email"
                            value={formData.reEmail}
                            onChangeText={(text) => handleInputChange('reEmail', text)}
                            placeholder="Re-enter your email"
                            keyboardType="email-address"
                            error={errors.reEmail}
                            style={[styles.input, errors.reEmail && styles.inputError]}
                            autoCapitalize="none"
                        />

                        <FormInput
                            label="Phone Number"
                            value={formData.number}
                            onChangeText={(text) => handleInputChange('number', text)}
                            placeholder="Enter your phone number"
                            keyboardType="phone-pad"
                            error={errors.number}
                            style={[styles.input, errors.number && styles.inputError]}
                            maxLength={10}
                        />

                        <FormInput
                            label="Password"
                            value={formData.password}
                            onChangeText={(text) => handleInputChange('password', text)}
                            placeholder="Enter your password"
                            secureTextEntry
                            error={errors.password}
                            style={[styles.input, errors.password && styles.inputError]}
                        />

                        <FormInput
                            label="Date of Birth"
                            value={formData.dob}
                            onChangeText={(text) => handleInputChange('dob', text)}
                            placeholder="YYYY-MM-DD"
                            style={styles.input}
                        />

                        <AddressForm
                            address={formData.address}
                            onAddressChange={handleAddressChange}
                            errors={errors}
                        />

                        <TouchableOpacity
                            style={[
                                styles.button,
                                isLoading && styles.buttonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Register</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}