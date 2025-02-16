import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

export function ProfileUpdate() {
    const [vendorId, setVendorId] = useState(null)
    const [photo, setPhoto] = React.useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        category: '',
        address: {
            area: '',
            street_address: '',
            landmark: '',
            pincode: '',
            location: {
                type: 'Point',
                coordinates: [0, 0]
            }
        }
    });

    const fetchUserDetails = async () => {
        try {
            // Retrieve the token from AsyncStorage
            const token = await AsyncStorage.getItem('userToken');

            if (!token) {
                console.log('No token found');
                alert('You need to log in to access this feature.');
                return;
            }

            // Make the API request
            const response = await axios.get('http://192.168.1.8:8111/api/tiffin/find_vendor', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            // const data = await response.json();
            const data = response.data;
            const vendor = data?.data
            setVendorId(vendor?._id)
            setFormData({
                name: vendor.name,
                email: vendor.email,
                category: vendor.category.title,
                address: {
                    area: vendor.address.area,
                    street_address: vendor.address.street_address,
                    landmark: vendor.address.landmark,
                    pincode: vendor.address.pincode,
                    location: {
                        type: 'Point',
                        coordinates: [vendor.address.location.coordinates[0], vendor.address.location.coordinates[1]]
                    }
                }
            });

        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching user details. Please try again.');
        }
    };

    useEffect(() => {
        fetchUserDetails();
    }, []);


    const [images, setImages] = useState({
        FSSAIImage: null,
        AdharImageFront: null,
        AdharImageBack: null,
        PanImage: null
    });

    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [searchTimeout, setSearchTimeout] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchAddressSuggestions = async (query) => {
        try {
            const response = await axios.get(`https://www.api.blueaceindia.com/api/v1/autocomplete?input=${encodeURIComponent(query)}`);
            // const data = await response.json();
            setAddressSuggestions(response.data || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            Alert.alert('Error', 'Failed to fetch address suggestions');
        }
    };

    const fetchGeocode = async (selectedAddress) => {
        try {
            const response = await fetch(
                `https://www.api.blueaceindia.com/api/v1/geocode?address=${encodeURIComponent(selectedAddress)}`
            );
            const data = await response.json();
            const { latitude, longitude } = data;

            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    street_address: selectedAddress,
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    }
                }
            }));
            setAddressSuggestions([]);
        } catch (error) {
            console.error('Error fetching geocode:', error);
            Alert.alert('Error', 'Failed to fetch location coordinates');
        }
    };

    const handleAddressChange = (text) => {
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                street_address: text
            }
        }));

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        setSearchTimeout(
            setTimeout(() => {
                if (text.length > 2) {
                    fetchAddressSuggestions(text);
                } else {
                    setAddressSuggestions([]);
                }
            }, 200)
        );
    };

    const handleImageUpload = async (type) => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                alert('Permission to access camera roll is required!');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [12, 3],  // Adjust as needed
                allowsEditing:true,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedImage = result.assets[0];
                setImages(prev => ({ ...prev, [type]: selectedImage }));
            }
        } catch (error) {
            console.error('Error selecting image: ', error);
            alert('An error occurred while selecting the image');
        }
    };



    const handleSubmit = async () => {
        try {
            setLoading(true);
            const formDataToSend = new FormData();

            // Append text data
            formDataToSend.append('name', formData.name);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('address', JSON.stringify(formData.address));

            // Append images if they exist
            Object.keys(images).forEach(key => {
                if (images[key]) {
                    formDataToSend.append(key, images[key]);
                }
            });

            const res = await axios.put(`http://192.168.1.8:8111/api/tiffin/vendor/${vendorId}`, formDataToSend)

            // Make API call here
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label, icon, value, key, keyboardType = 'default') => (
        <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
                <Icon name={icon} size={20} color="#6366f1" />
                <Text style={styles.label}>{label}</Text>
            </View>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={(text) => {
                        if (key === 'address.street_address') {
                            handleAddressChange(text);
                        } else if (key.includes('.')) {
                            const [parent, child] = key.split('.');
                            setFormData(prev => ({
                                ...prev,
                                [parent]: { ...prev[parent], [child]: text }
                            }));
                        } else {
                            setFormData(prev => ({ ...prev, [key]: text }));
                        }
                    }}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                    placeholderTextColor="#9ca3af"
                    keyboardType={keyboardType}
                />
            </View>
            {key === 'address.street_address' && addressSuggestions.length > 0 && (
                <View style={[styles.suggestionsContainer, { maxHeight: 200 }]}>
                    <FlatList
                        data={addressSuggestions}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.suggestionItem}
                                onPress={() => fetchGeocode(item.description)} // Use the description or a valid string
                            >
                                <Icon name="map-marker" size={16} color="#6366f1" />
                                <Text style={styles.suggestionText}>{item.description}</Text> {/* Render the description */}
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}
        </View>
    );

    const renderImageUpload = (label, type) => (
        <View style={styles.imageUploadContainer}>
            <Text style={styles.imageLabel}>{label}</Text>
            <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => handleImageUpload(type)}
            >
                <Icon name="camera-plus" size={24} color="#6366f1" />
                <Text style={styles.imageUploadText}>
                    {images[type] ? 'Change Image' : 'Upload Image'}
                </Text>
            </TouchableOpacity>
            {images[type] && (
                <View style={styles.imagePreviewContainer}>
                    <Image
                        source={{ uri: images[type].uri }}
                        style={styles.imagePreview}
                    />
                    <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setImages(prev => ({ ...prev, [type]: null }))}
                    >
                        <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Icon name="account-circle" size={80} color="#6366f1" />
                    <TouchableOpacity style={styles.editAvatarButton}>
                        <Icon name="camera" size={20} color="#ffffff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.title}>Update Profile</Text>
                <Text style={styles.subtitle}>Keep your profile information up to date</Text>
            </View>

            <View style={styles.formContainer}>
                {renderInput('Name', 'account', formData.name, 'name')}
                {renderInput('Email', 'email', formData.email, 'email', 'email-address')}
                {renderInput('Category', 'food', formData.category, 'category')}
                {renderInput('Area', 'map-marker-radius', formData.address.area, 'address.area')}
                {renderInput('Street Address', 'map-marker', formData.address.street_address, 'address.street_address')}
                {renderInput('Landmark', 'map-marker-check', formData.address.landmark, 'address.landmark')}
                {renderInput('Pincode', 'numeric', formData.address.pincode, 'address.pincode', 'numeric')}

                <View style={styles.documentsSection}>
                    <Text style={styles.sectionTitle}>Documents</Text>
                    {renderImageUpload('FSSAI License', 'FSSAIImage')}
                    {renderImageUpload('Aadhar Card Front', 'AdharImageFront')}
                    {renderImageUpload('Aadhar Card Back', 'AdharImageBack')}
                    {renderImageUpload('PAN Card', 'PanImage')}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Icon name="content-save" size={24} color="#fff" style={styles.submitIcon} />
                            <Text style={styles.submitText}>Save Changes</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#ffffff',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    editAvatarButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#6366f1',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
    },
    formContainer: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
        margin: 16,
    },
    inputContainer: {
        marginBottom: 20,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#4b5563',
        fontWeight: '600',
        marginLeft: 8,
    },
    inputWrapper: {
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    input: {
        fontSize: 16,
        padding: 16,
        color: '#1f2937',
    },
    suggestionsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginTop: 4,
        maxHeight: 200,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    suggestionText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#4b5563',
    },
    documentsSection: {
        marginTop: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 16,
    },
    imageUploadContainer: {
        marginBottom: 16,
    },
    imageLabel: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 8,
    },
    imageUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#6366f1',
    },
    imageUploadText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#6366f1',
        fontWeight: '500',
    },
    imagePreviewContainer: {
        marginTop: 8,
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitIcon: {
        marginRight: 8,
    },
    submitText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});