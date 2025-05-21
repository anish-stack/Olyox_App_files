import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Platform,
  Keyboard
} from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL_V1, API_BASE_URL_V2, API_BASE_URL_V3 } from '../../constant/Api';
import styles from './styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constant/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function HotelRegistration() {
  const [hotelData, setHotelData] = useState({
    hotel_name: '',
    hotel_zone: '',
    hotel_address: '',
    hotel_owner: '',
    hotel_phone: '',
    amenities: {
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
      attachedBathroom: false,
    },
    hotel_main_show_image: '',
    area: '',
    hotel_geo_location: {
      type: 'Point',
      coordinates: [],
    },
    property_pdf: '',
    bh: '',
    BhJsonData: null
  });

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation()
  const route = useRoute()
  const { bh } = route.params || {}
  const [error, setError] = useState(null);
  const [bhDetails, setBhDetails] = useState(null);
  const [isBhValid, setIsBhValid] = useState(false);
  const [useExistingAddress, setUseExistingAddress] = useState(true);
  const [showAmenities, setShowAmenities] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success'); // 'success' or 'error'

  const snackbarOpacity = useRef(new Animated.Value(0)).current;

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);

    Animated.sequence([
      Animated.timing(snackbarOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(snackbarOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSnackbarVisible(false);
    });
  };

  useEffect(() => {
    if (bh) {
      setHotelData((prev) => {
        return { ...prev, bh: bh }
      })
    }
  }, [bh])

  // Toggle amenities section
  const toggleAmenitiesSection = () => {
    setShowAmenities(!showAmenities);
  };

  // Toggle amenities
  const toggleAmenity = (key) => {
    setHotelData((prev) => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [key]: !prev.amenities[key],
      },
    }));
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setHotelData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle using existing address
  const toggleUseExistingAddress = () => {
    setUseExistingAddress(!useExistingAddress);

    if (!useExistingAddress && bhDetails?.address) {
      // If toggling to use existing address, update the hotel address
      setHotelData(prev => ({
        ...prev,
        hotel_address: bhDetails.address.street_address || '',
        area: bhDetails.address.area || '',
        hotel_geo_location: {
          type: 'Point',
          coordinates: bhDetails.address.location?.coordinates || [],
        },

      }));
    }
  };

  // Validate BH ID
  const checkBhId = async () => {
    Keyboard.dismiss();

    if (!hotelData.bh.trim()) {
      showSnackbar('Please enter a valid BH ID.', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post(`${API_BASE_URL_V3}check-bh-id`, { bh: hotelData.bh });

      if (!data.success) {
        setIsBhValid(false);
        setError(data.message || 'Invalid BH ID.');
        showSnackbar(data.message || 'Invalid BH ID.', 'error');
        return;
      }
      setBhDetails(data.complete);
      setIsBhValid(true);

      // If use existing address is enabled, update the hotel address
      if (useExistingAddress && data.complete?.address) {
        setHotelData(prev => ({
          ...prev,
          hotel_address: data.complete.address.street_address || '',
          area: data.complete.address.area || '',
          hotel_geo_location: {
            type: 'Point',
            coordinates: data.complete.address.location?.coordinates || [],
          },
          BhJsonData: data.complete
        }));
      }

      showSnackbar('BH ID validated successfully!', 'success');
    } catch (err) {
      setIsBhValid(false);
      const errorMessage = err.response?.data?.message || 'An error occurred while validating BH ID.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Register Hotel
  const handleRegister = async () => {
    Keyboard.dismiss();

    if (!isBhValid) {
      showSnackbar('Please validate BH ID before proceeding.', 'error');
      return;
    }

    if (!hotelData.hotel_name.trim() || !hotelData.hotel_address.trim() || !hotelData.hotel_owner.trim() || !hotelData.hotel_phone.trim()) {
      showSnackbar('All fields are required.', 'error');
      return;
    }
    console.log(hotelData)

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL_V2}/register-hotel`, hotelData);
      console.log(response.data)
      navigation.reset({
        index: 1,
        routes: [
          {
            name: 'OtpVerifyRegister',
            params: { hotelPhone: hotelData?.hotel_phone }, // ✅ Correct placement of params
          },
        ],
      });

      showSnackbar('Hotel Registered Successfully!', 'success');
    } catch (error) {
      console.error('Failed to register hotel:', error.response.data);
      showSnackbar('Failed to register the hotel. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Hotel Registration</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* BH ID Validation Card */}
          {!isBhValid && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>BH ID Verification</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>BH ID</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="id-card" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter BH ID"
                    value={hotelData.bh}
                    onChangeText={(text) => handleInputChange('bh', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={checkBhId}
                style={styles.button}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Verify BH ID</Text>
                )}
              </TouchableOpacity>
            </View>
          )}


          {/* BH Details Card (if valid) */}
          {isBhValid && bhDetails && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>BH Details</Text>

              <View style={styles.bhDetailsContainer}>
                <Text style={styles.bhDetailsText}>
                  <Text style={{ fontWeight: 'bold' }}>Name: </Text>
                  {bhDetails.name}
                </Text>
                <Text style={styles.bhDetailsText}>
                  <Text style={{ fontWeight: 'bold' }}>Email: </Text>
                  {bhDetails.email}
                </Text>
                <Text style={styles.bhDetailsText}>
                  <Text style={{ fontWeight: 'bold' }}>Category: </Text>
                  {bhDetails?.category?.title || 'N/A'}
                </Text>
                <Text style={styles.bhDetailsText}>
                  <Text style={{ fontWeight: 'bold' }}>Referral Code: </Text>
                  {bhDetails.myReferral}
                </Text>

                {bhDetails.address && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.bhDetailsText}>
                      <Text style={{ fontWeight: 'bold' }}>Address: </Text>
                      {bhDetails.address.street_address}
                    </Text>
                    <Text style={styles.bhDetailsText}>
                      <Text style={{ fontWeight: 'bold' }}>Area: </Text>
                      {bhDetails.address.area}
                    </Text>
                    <Text style={styles.bhDetailsText}>
                      <Text style={{ fontWeight: 'bold' }}>Pincode: </Text>
                      {bhDetails.address.pincode}
                    </Text>
                  </>
                )}
              </View>

              {/* {bhDetails.address && (
              <View style={styles.toggleContainer}>
                <Switch
                  value={useExistingAddress}
                  onValueChange={toggleUseExistingAddress}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={useExistingAddress ? '#3498db' : '#f4f3f4'}
                />
                <Text style={styles.toggleText}>
                  Use existing address for hotel registration
                </Text>
              </View>
            )} */}
            </View>
          )}

          {/* Hotel Registration Form */}
          {isBhValid && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Hotel Information</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hotel Name</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="building" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter Hotel Name"
                    value={hotelData.hotel_name}
                    onChangeText={(text) => handleInputChange('hotel_name', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hotel Address</Text>
                <View style={{ flexDirection: 'row' }}>

                  <TextInput
                    placeholder="Enter Address"
                    value={hotelData.hotel_address}
                    onChangeText={(text) => handleInputChange('hotel_address', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                   
                  />
                </View>
                {useExistingAddress && (
                  <Text style={{ fontSize: 12, color: '#7f8c8d', marginTop: 5, marginLeft: 40 }}>
                    Using address from BH details
                  </Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hotel Owner</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="user" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter Owner Name"
                    value={hotelData.hotel_owner}
                    onChangeText={(text) => handleInputChange('hotel_owner', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number (Whatsapp Enable)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="phone" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter Phone Number"
                    value={hotelData.hotel_phone}
                    keyboardType="phone-pad"
                    onChangeText={(text) => handleInputChange('hotel_phone', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Zone</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="map" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter Hotel Zone"
                    value={hotelData.hotel_zone}
                    keyboardType="default"
                    onChangeText={(text) => handleInputChange('hotel_zone', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Property Pdf Drive link</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconContainer}>
                    <FontAwesome name="link" size={20} color="#3498db" />
                  </View>
                  <TextInput
                    placeholder="Enter Pdf Drive link"
                    value={hotelData.property_pdf}
                    keyboardType="default"
                    onChangeText={(text) => handleInputChange('property_pdf', text)}
                    style={[styles.input, { flex: 1, marginLeft: 10 }]}
                  />
                </View>
              </View>

            </View>
          )}

          {/* Amenities Section */}
          {isBhValid && (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.amenitiesHeader}
                onPress={toggleAmenitiesSection}
              >
                <Text style={styles.cardTitle}>Amenities</Text>
                <MaterialIcons
                  name={showAmenities ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                  size={24}
                  color="#3498db"
                />
              </TouchableOpacity>

              {showAmenities && (
                <View style={styles.amenitiesContainer}>
                  {Object.keys(hotelData.amenities).map((amenity) => (
                    <View key={amenity} style={styles.amenityItem}>
                      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }} >
                        <MaterialIcons
                          name={hotelData.amenities[amenity] ? "check-circle" : "radio-button-unchecked"}
                          size={14}
                          color={hotelData.amenities[amenity] ? "#2ecc71" : "#bdc3c7"}
                        />
                        <Text style={styles.amenityText}>
                          {amenity.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </Text>
                      </View>
                      <View>
                        <Switch
                          value={hotelData.amenities[amenity]}
                          onValueChange={() => toggleAmenity(amenity)}
                          trackColor={{ false: colors.primaryViolet, true: colors.primaryRed }}
                          thumbColor={hotelData.amenities[amenity] ? colors.primaryRed : '#f4f3f4'}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Register Button */}
          {isBhValid && (
            <TouchableOpacity
              onPress={handleRegister}
              style={styles.registerButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Register Hotel</Text>
              )}
            </TouchableOpacity>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Snackbar */}
        {snackbarVisible && (
          <Animated.View
            style={[
              styles.snackbar,
              snackbarType === 'success' ? styles.snackbarSuccess : styles.snackbarError,
              { opacity: snackbarOpacity }
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons
                name={snackbarType === 'success' ? "check-circle" : "error"}
                size={24}
                color="white"
              />
              <Text style={styles.snackbarText}>{snackbarMessage}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Animated.timing(snackbarOpacity, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: true,
                }).start(() => {
                  setSnackbarVisible(false);
                });
              }}
            >
              <MaterialIcons name="close" size={20} color="white" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}