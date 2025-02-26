import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

import { API_BASE_URL_V2 } from '../../constant/Api';
import FormField from '../../components/common/FormField';
import SwitchField from '../../components/common/SwitchField';
import ImageUploadField from '../../components/common/ImageUploadField';
import FormButton from '../../components/common/FormButton';

import { Ionicons } from '@expo/vector-icons';
import DropdownField from '../../components/common/DropdownField';
import TagInputField from '../../components/common/TagInputField';
import { Styles } from './HotelListingFormStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToken } from '../../context/AuthContext';

const roomTypeOptions = ['1BHK', '2BHK', '3BHK', 'Studio', 'Penthouse', 'Villa'];

const HotelListingForm = () => {
const {token} = useToken()
  const [form, setForm] = useState({
    room_type: '',
   
    has_tag: '',
    rating_number: '0',
    number_of_rating_done: '0',
    allowed_person: '',
    cut_price: '',
    book_price: '',
    discount_percentage: '',
    is_tax_applied: false,
    tax_fair: '',
    isPackage: false,
    package_add_ons: '',
    cancellation_policy: '',
  });

  // Tags state
  const [tags, setTags] = useState([]);

  // Images state
  const [images, setImages] = useState({
    main_image: null,
    second_image: null,
    third_image: null,
    fourth_image: null,
    fifth_image: null,
  });

  // Amenities state
  const [amenities, setAmenities] = useState({
    AC: false,
    freeWifi: false,
    kitchen: false,
    TV: false,
    powerBackup: false,
    geyser: false,
    parkingFacility: false,
    elevator: false,
    cctvCameras: false,
    diningArea: false,
    privateEntrance: false,
    reception: false,
    caretaker: false,
    security: false,
    checkIn24_7: false,
    dailyHousekeeping: false,
    fireExtinguisher: false,
    firstAidKit: false,
    buzzerDoorBell: false,
    attachedBathroom: false
  });

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const toggleAmenity = (key) => {
    setAmenities((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle text input change
  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
    // Clear any previous errors when user makes changes
    if (error) setError(null);
  };

  // Handle room type selection
  const handleRoomTypeSelect = (roomType) => {
    handleChange('room_type', roomType);
  };

  // Handle tags change
  const handleTagsChange = (newTags) => {
    setTags(newTags);
    handleChange('has_tag', newTags.join(','));
  };

  // Toggle Switch
  const handleSwitch = (key) => {
    setForm({ ...form, [key]: !form[key] });
  };

  // Image Picker
  const pickImage = async (field) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages({ ...images, [field]: result.assets[0].uri });
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image. Please try again.');
    }
  };

  // Validate form
  const validateForm = () => {
    // Required fields
    const requiredFields = ['room_type', 'book_price'];
    
    for (const field of requiredFields) {
      if (!form[field]) {
        setError(`${field.replace('_', ' ')} is required`);
        return false;
      }
    }

    // Check if main image is selected
    if (!images.main_image) {
      setError('Main image is required');
      return false;
    }

    // If tax is applied, tax_fair should be provided
    if (form.is_tax_applied && !form.tax_fair) {
      setError('Tax fair is required when tax is applied');
      return false;
    }

    // If it's a package, package_add_ons should be provided
    if (form.isPackage && !form.package_add_ons) {
      setError('Package add-ons are required for packages');
      return false;
    }

    return true;
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      // Reset states
      setError(null);
      setSuccess(false);
      
      // Validate form
      if (!validateForm()) return;

      setIsLoading(true);

      // Create FormData
      const formData = new FormData();

      // Append all form fields
      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });

      // Append amenities as JSON string
      formData.append('amenities', JSON.stringify(amenities));

      // Append images
      Object.keys(images).forEach((key) => {
        if (images[key]) {
          const filename = images[key].split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append(key, {
            uri: images[key],
            name: filename || `${key}.jpg`,
            type,
          });
        }
      });

      // Send API request
      const response = await axios.post(`${API_BASE_URL_V2}/add-hotel-listing`, formData, {
        headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        
        },
      });

      // Handle success
      setSuccess(true);
      console.log(response.data.message)
      Alert.alert('Success', 'Hotel listing added successfully!');
      
      // Reset form after successful submission
    //   resetForm();
    } catch (err) {
      console.error('API Error:', err.response);
      setError(err.response?.data?.message || 'Failed to add hotel listing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setForm({
      room_type: '',
   
      has_tag: '',
      rating_number: '0',
      number_of_rating_done: '0',
      allowed_person: '',
      cut_price: '',
      book_price: '',
      discount_percentage: '',
      is_tax_applied: false,
      tax_fair: '',
      isPackage: false,
      package_add_ons: [],
      cancellation_policy: '',
    });
    
    setTags([]);
    
    setImages({
      main_image: null,
      second_image: null,
      third_image: null,
      fourth_image: null,
      fifth_image: null,
    });
    
    setAmenities({
      AC: false,
      freeWifi: false,
      kitchen: false,
      TV: false,
      powerBackup: false,
      geyser: false,
      parkingFacility: false,
      elevator: false,
      cctvCameras: false,
      diningArea: false,
      privateEntrance: false,
      reception: false,
      caretaker: false,
      security: false,
      checkIn24_7: false,
      dailyHousekeeping: false,
      fireExtinguisher: false,
      firstAidKit: false,
      buzzerDoorBell: false,
      attachedBathroom: false
    });
  };

  return (
 <SafeAreaView style={{flex:1}}>
       <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={Styles.container}
      
    >
      <ScrollView contentContainerStyle={Styles.scrollContent}>
        <View style={Styles.formContainer}>
          <Text style={Styles.formTitle}>Add Hotel Listing</Text>
          
          {/* Error message */}
          {error && (
            <View style={Styles.errorContainer}>
              <Text style={Styles.errorText}>{error}</Text>
            </View>
          )}
          
          {/* Success message */}
          {success && (
            <View style={Styles.successContainer}>
              <Text style={Styles.successText}>Hotel listing added successfully!</Text>
            </View>
          )}

          {/* Basic Information */}
          <View style={Styles.sectionContainer}>
            <Text style={Styles.sectionTitle}>Basic Information</Text>
            
            <DropdownField
              label="Room Type"
              value={form.room_type}
              options={roomTypeOptions}
              onSelect={handleRoomTypeSelect}
              required
            />
            
          
            
            <TagInputField
              label="Tags"
              tags={tags}
              onTagsChange={handleTagsChange}
              placeholder="Type tag and press Enter"
            />
            
            <FormField
              label="Allowed Persons"
              value={form.allowed_person}
              onChangeText={(value) => handleChange('allowed_person', value)}
              keyboardType="numeric"
              placeholder="e.g. 2"
            />
          </View>

          {/* Amenities */}
          <View style={Styles.amenitiesContainer}>
            <Text style={Styles.amenitiesTitle}>Amenities</Text>
            
            {Object.keys(amenities).map((amenity) => (
              <View key={amenity} style={Styles.amenityItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={amenities[amenity] ? "checkmark-circle" : "ellipse-outline"}
                    size={20}
                    color={amenities[amenity] ? "#2196F3" : "#ccc"}
                  />
                  <Text style={Styles.amenityText}>
                    {amenity.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </Text>
                </View>
                <Switch
                  value={amenities[amenity]}
                  onValueChange={() => toggleAmenity(amenity)}
                  trackColor={{ false: '#d1d1d1', true: '#2196F3' }}
                  thumbColor={amenities[amenity] ? '#fff' : '#f4f3f4'}
                />
              </View>
            ))}
          </View>

          {/* Pricing Information */}
          <View style={Styles.sectionContainer}>
            <Text style={Styles.sectionTitle}>Pricing Information</Text>
            
            <FormField
              label="Book Price"
              value={form.book_price}
              onChangeText={(value) => handleChange('book_price', value)}
              keyboardType="numeric"
              required
            />
            
            <FormField
              label="Cut Price (Original Price)"
              value={form.cut_price}
              onChangeText={(value) => handleChange('cut_price', value)}
              keyboardType="numeric"
            />
            
            <FormField
              label="Discount Percentage"
              value={form.discount_percentage}
              onChangeText={(value) => handleChange('discount_percentage', value)}
              keyboardType="numeric"
              placeholder="e.g. 10"
            />
            
            <SwitchField
              label="Apply Tax"
              value={form.is_tax_applied}
              onValueChange={() => handleSwitch('is_tax_applied')}
            />
            
            {form.is_tax_applied && (
              <FormField
                label="Tax Fair"
                value={form.tax_fair}
                onChangeText={(value) => handleChange('tax_fair', value)}
                keyboardType="numeric"
              />
            )}
          </View>

          {/* Package Information */}
          <View style={Styles.sectionContainer}>
            <Text style={Styles.sectionTitle}>Package Information</Text>
            
            <SwitchField
              label="Is Package"
              value={form.isPackage}
              onValueChange={() => handleSwitch('isPackage')}
            />
            
            {form.isPackage && (
              <FormField
                label="Package Add-ons"
                value={form.package_add_ons}
                onChangeText={(value) => handleChange('package_add_ons', value)}
                multiline
                numberOfLines={3}
                placeholder="Describe package inclusions..."
              />
            )}
            
            <FormField
              label="Cancellation Policy"
              value={form.cancellation_policy}
              onChangeText={(value) => handleChange('cancellation_policy', value)}
              multiline
              numberOfLines={3}
              placeholder="Describe cancellation policy..."
            />
          </View>

          {/* Image Upload Section */}
          <View style={Styles.sectionContainer}>
            <Text style={Styles.sectionTitle}>Hotel Images</Text>
            <Text style={Styles.sectionSubtitle}>Upload high-quality images of your hotel room</Text>
            
            <ImageUploadField
              label="Main Image (Required)"
              imageUri={images.main_image}
              onPress={() => pickImage('main_image')}
            />
            
            <ImageUploadField
              label="Second Image"
              imageUri={images.second_image}
              onPress={() => pickImage('second_image')}
            />
            
            <ImageUploadField
              label="Third Image"
              imageUri={images.third_image}
              onPress={() => pickImage('third_image')}
            />
            
            <ImageUploadField
              label="Fourth Image"
              imageUri={images.fourth_image}
              onPress={() => pickImage('fourth_image')}
            />
            
            <ImageUploadField
              label="Fifth Image"
              imageUri={images.fifth_image}
              onPress={() => pickImage('fifth_image')}
            />
          </View>

          {/* Form Actions */}
          <View style={Styles.actionsContainer}>
            {/* <FormButton
              title="Reset Form"
              onPress={resetForm}
              type="secondary"
              disabled={isLoading}
            /> */}
            
            <FormButton
              title="Submit Listing"
              onPress={handleSubmit}
              isLoading={isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
 </SafeAreaView>
  );
};

export default HotelListingForm;