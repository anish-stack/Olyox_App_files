import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Button,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from './FormInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import AddressForm from './AddressForm';
import styles from './RegisterStyle';
import axios from 'axios';
import { API_BASE_URL_V1, API_BASE_URL_V2 } from '../../constant/Api';

export default function RegisterViaBh() {
    const route = useRoute();
    const navigation = useNavigation();
    const { bh_id } = route.params || {};
    
    // Date state
    const [date, setDate] = useState(new Date());
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    
    // Loading and message states
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors] = useState({});

    // Form data state with proper initialization
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
        dob: '', // Initialize with a default date
        referral_code_which_applied: bh_id,
        is_referral_applied: true,
    });

    useEffect(() => {
        // Set bh_id when route params change
        if (bh_id) {
            setFormData(prev => ({
                ...prev,
                referral_code_which_applied: bh_id
            }));
        }
    }, [bh_id]);

    // Form input change handler
    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear field-specific error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        
        // Clear general error message
        if (errorMessage) {
            setErrorMessage('');
        }
    };

    // Date picker handlers
    const showDatePicker = () => {
        setIsDatePickerVisible(true);
    };

    const hideDatePicker = () => {
        setIsDatePickerVisible(false);
    };

    const handleDateChange = (event, selectedDate) => {
        if (event.type === "set" && selectedDate) {
            const newDate = selectedDate || date;

            // Calculate age
            const today = new Date();
            const birthDate = new Date(newDate);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();

            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 18) {
                Alert.alert("Age Restriction", "You must be at least 18 years old.");
                hideDatePicker();
                return;
            }

            // Store the Date object directly
            setFormData(prev => ({
                ...prev,
                dob: newDate,
            }));
        }
        
        hideDatePicker();
    };

    // Address form change handler
    const handleAddressChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value },
        }));
        
        if (errors[`address.${field}`]) {
            setErrors(prev => ({ ...prev, [`address.${field}`]: '' }));
        }
    };

    // Form validation
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
        if (!formData.reEmail) {
            newErrors.reEmail = 'Please confirm your email';
        } else if (formData.email !== formData.reEmail) {
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

        // Date of birth validation
        if (!formData.dob) {
            newErrors.dob = 'Date of birth is required';
        }

        // Address validation
        if (!formData.address.area) {
            newErrors['address.area'] = 'Area is required';
        }
        
        if (!formData.address.street_address) {
            newErrors['address.street_address'] = 'Street address is required';
        }

        // Pincode validation
        const pincodeRegex = /^\d{6}$/;
        if (!formData.address.pincode) {
            newErrors['address.pincode'] = 'Pincode is required';
        } else if (!pincodeRegex.test(formData.address.pincode)) {
            newErrors['address.pincode'] = 'Please enter a valid 6-digit pincode';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Format date for display
    const formatDate = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };
    
    // Format date for API
    const formatDateForAPI = (date) => {
        if (!date) return "";
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Form submission handler
    const handleSubmit = async () => {
        // Clear previous messages
        setErrorMessage('');
        setSuccessMessage('');

        // Validate form
        if (!validateForm()) {
            setErrorMessage('Please fix the errors in the form');
            return;
        }

        setIsLoading(true);

        try {
            // Prepare data for API
            const apiFormData = {
                ...formData,
                dob: formatDateForAPI(formData.dob),
            };

            // API call
            const response = await axios.post(
                `${API_BASE_URL_V1}/register_vendor`,
                apiFormData
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
            // Handle error response
            const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
            setErrorMessage(errorMsg);

            if (error.response?.status === 422) {
                // Handle validation errors from server
                const serverErrors = error.response.data.errors;
                if (serverErrors) {
                    const formattedErrors = Object.entries(serverErrors).reduce((acc, [key, value]) => {
                        acc[key] = Array.isArray(value) ? value[0] : value;
                        return acc;
                    }, {});
                    
                    setErrors(prev => ({
                        ...prev,
                        ...formattedErrors
                    }));
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidView}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.scrollViewContent}
                >
                    <View style={styles.cards}>
                        <Text style={styles.title}>Register Via BH</Text>
                        {bh_id && <Text style={styles.subtitle}>BH ID: {bh_id}</Text>}

                        {/* Error Message */}
                        {errorMessage ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        ) : null}

                        {/* Success Message */}
                        {successMessage ? (
                            <View style={styles.successBox}>
                                <Text style={styles.successText}>{successMessage}</Text>
                            </View>
                        ) : null}

                        <View style={styles.formContainer}>
                            {/* Personal Information */}
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

                            {/* Date of Birth Picker */}
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>Date of Birth</Text>
                                <TouchableOpacity 
                                    style={styles.dateButton} 
                                    onPress={showDatePicker}
                                >
                                    <Text style={styles.dateButtonText}>
                                        {formData.dob ? formatDate(formData.dob) : "Select Date of Birth"}
                                    </Text>
                                </TouchableOpacity>
                                {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                                
                                {isDatePickerVisible && (
                                    <DateTimePicker
                                        value={formData.dob || new Date()}
                                        mode="date"
                                        onChange={handleDateChange}
                                        display="default"
                                        maximumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* Address Form */}
                            <AddressForm
                                address={formData.address}
                                onAddressChange={handleAddressChange}
                                errors={errors}
                            />

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    isLoading && styles.buttonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.buttonText}>Register</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}