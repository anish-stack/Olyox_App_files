import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Button,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import FormInput from './FormInput';
import AddressForm from './AddressForm';
import BhVerificationError from './BhVerificationError';
import DateTimePicker from '@react-native-community/datetimepicker';
export default function RegisterWithBh() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bh_id } = route.params || {};
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isBhVerify, setIsBhVerify] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reEmail: '',
    number: '',
    password: '',
    category: '',
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
    dob: '',
    member_id: '',
    referral_code_which_applied: bh_id,
    is_referral_applied: true,
  });

  useEffect(() => {
    checkBhId();
    fetchCategory();
  }, [bh_id]);


  const showDatePicker = () => {
    setIsDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setIsDatePickerVisible(false);
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "set") {
      const newDate = selectedDate || date; // Handle potential null value

      // Calculate age
      const today = new Date();
      const birthDate = new Date(newDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();

      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        alert("You must be at least 18 years old.");
        hideDatePicker();
        return;
      }

      // ✅ Store the Date object directly (NOT formatted string)
      setFormData((prev) => ({
        ...prev,
        dob: newDate,  // <-- Date object, NOT formatted string
      }));

      hideDatePicker();
    } else {
      hideDatePicker();
    }
  };



  const checkBhId = async () => {
    try {
      const { data } = await axios.post('https://www.api.olyox.com/api/v1/check-bh-id', { bh: bh_id });
      setIsBhVerify(data.success);
    } catch (err) {
      console.error(err);
      setIsBhVerify(false);
    }
  };

  const fetchCategory = async () => {
    try {
      const { data } = await axios.get('https://www.api.olyox.com/api/v1/categories_get');
      setCategories(data.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const currentDate = new Date();
    const dobDate = new Date(formData.dob);
    console.log(formData)
    if (!formData.name.trim()) newErrors.name = 'Please enter your name.';
    if (!formData.dob) {
      newErrors.dob = 'Please enter your date of birth.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.reEmail.trim()) {
      newErrors.reEmail = 'Please re-enter your email address.';
    } else if (formData.email !== formData.reEmail) {
      newErrors.reEmail = 'Emails do not match.';
    }

    if (!formData.number.trim()) {
      newErrors.number = 'Please enter your phone number.';
    } else if (!/^\d{10}$/.test(formData.number)) {
      newErrors.number = 'Phone number must be exactly 10 digits.';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Please create a password.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!formData.category) newErrors.category = 'Please select a category.';
    if (!formData.address.pincode.trim()) newErrors.pincode = 'Please enter your pincode.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const response = await axios.post(
        'https://www.api.olyox.com/api/v1/register_vendor',
        formData
      );

      if (response.data?.success) {
        navigation.navigate('OtpVerify', {
          type: response.data.type,
          email: response.data.email,
          expireTime: response.data.time,
          number: response.data.number,
        });
      }
    } catch (error) {
      console.log(error.response.data)
      const errorMessage = error.response?.data?.message || 'Registration failed';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };


  if (!isBhVerify && bh_id) {
    return <BhVerificationError />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Vendor Registration</Text>

        <FormInput
          label="Name (as per Aadhaar Card)"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          error={errors.name}
          placeholder="Enter your name"
        />
        <View>
          <Button title="Select Date of Birth" onPress={showDatePicker} />
          {isDatePickerVisible && (
            <DateTimePicker
              value={date}
              mode="date" // or "time"
              onChange={handleDateChange}
              display="default" // "default" or "spinner" or "calendar" or "clock"
            />
          )}
        </View>
        <FormInput
          editable={false}
          value={formData.dob ? formatDate(formData.dob) : ""}
          error={errors.dob}
          placeholder="DD-MM-YYYY"
        />


        <FormInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          error={errors.email}
          placeholder="Enter your email"
          keyboardType="email-address"
        />

        <FormInput
          label="Re-enter Email"
          value={formData.reEmail}
          onChangeText={(text) => setFormData({ ...formData, reEmail: text })}
          error={errors.reEmail}
          placeholder="Re-enter your email"
          keyboardType="email-address"
        />

        <FormInput
          label="Phone Number"
          value={formData.number}
          onChangeText={(text) => setFormData({ ...formData, number: text })}
          error={errors.number}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />


        <FormInput
          label="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          error={errors.password}
          placeholder="Create a password"
          secureTextEntry
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Category</Text>
          <Picker
            selectedValue={formData.category}
            onValueChange={(itemValue) => setFormData({ ...formData, category: itemValue })}
            style={styles.picker}
          >
            <Picker.Item label="Select a category" value="" />
            {categories.map((category) => (
              <Picker.Item
                key={category._id}
                label={category.title}
                value={category._id}
              />
            ))}
          </Picker>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        </View>

        <AddressForm
          address={formData.address}
          onAddressChange={(field, value) =>
            setFormData({
              ...formData,
              address: {
                ...formData.address,
                [field]: value,
              },
            })
          }
          errors={errors}
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Registering...' : 'Register'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  picker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#ff0000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});