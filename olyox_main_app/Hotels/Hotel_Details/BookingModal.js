import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput,
    Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import styles from './BookingModel.style';
import axios from 'axios'
import { tokenCache } from '../../Auth/cache';

export default function BookingModal({ visible, onClose, roomData }) {
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date());
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [males, setMales] = useState(1);
    const [loading, setLoading] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false);
    const [numberOfRooms, setNumberRooms] = useState(1)
    const [females, setFemales] = useState(0);
    const [step, setStep] = useState(1);
    const [guests, setGuests] = useState([{ guestName: "", guestAge: "", guestPhone: "" }]);
    const [paymentMethod, setPaymentMethod] = useState('online');
    const navigation = useNavigation()
    const totalGuests = males + females;
    const isValidGuests = totalGuests <= numberOfRooms * roomData.allowed_person;
    const isValidGuestInfo = guests[0].guestName && guests[0].guestAge && guests[0].guestPhone;

    const handleDateChange = (event, selectedDate, type) => {
        if (Platform.OS === 'android') {
            setShowCheckIn(false);
            setShowCheckOut(false);
        }

        if (selectedDate) {
            if (type === 'checkIn') {
                setCheckInDate(selectedDate);
            } else {
                setCheckOutDate(selectedDate);
            }
        }
    };

    const addGuest = () => {
        if (guests.length < roomData.allowed_person) {
            setGuests([...guests, { guestName: "", guestAge: "" }])
        }
    }

    const removeGuest = (index) => {
        const newGuests = [...guests]
        newGuests.splice(index, 1)
        setGuests(newGuests)
    }

    const updateGuest = (index, field, value) => {
        const newGuests = [...guests]
        newGuests[index][field] = value

        setGuests(newGuests)
    }

    const handleSubmit = async () => {
        try {
            // Fetch token from cache
            const token = await tokenCache.getToken('auth_token_db');

            if (!token) {
                Alert.alert(
                    "Session Expired",
                    "Your session has expired. Please log in again to continue.",
                    [{ text: "OK", onPress: () => navigation.navigate("Onboarding") }]
                );
                return;
            }

            // Validate required fields
            if (!guests || guests.length === 0) {
                Alert.alert("Missing Information", "Please add at least one guest before booking.");
                return;
            }
            if (!checkInDate) {
                Alert.alert("Missing Date", "Please select a check-in date.");
                return;
            }
            if (!checkOutDate) {
                Alert.alert("Missing Date", "Please select a check-out date.");
                return;
            }
            if (!roomData?._id) {
                Alert.alert("Room Not Found", "Something went wrong. Please select a valid room.");
                return;
            }
            if (!roomData?.hotel_user?._id) {
                Alert.alert("Hotel Not Found", "Unable to find hotel details. Please try again.");
                return;
            }
            if (!paymentMethod) {
                Alert.alert("Payment Method Required", "Please choose a payment method.");
                return;
            }

            // Validate date logic
            const today = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
            if (new Date(checkInDate) < new Date(today)) {
                Alert.alert("Invalid Date", "Check-in date cannot be in the past. Please select a future date.");
                return;
            }
            if (new Date(checkOutDate) <= new Date(checkInDate)) {
                Alert.alert("Invalid Date", "Check-out date must be later than check-in date.");
                return;
            }

            const dataToBeSend = {
                guestInformation: guests,
                checkInDate,
                numberOfRooms,
                checkOutDate,
                listing_id: roomData?._id,
                hotel_id: roomData?.hotel_user?._id,
                paymentMethod,
                booking_payment_done: false,
                modeOfBooking: "Online",
                paymentMode: paymentMethod
            };

            setLoading(true);

            // Make API call
            const { data } = await axios.post(
                `http://192.168.1.2:3000/api/v1/hotels/book-room-user`,
                dataToBeSend,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const bookingData = data.booking;

            // Success Alert
            Alert.alert(
                "Booking Confirmed 🎉",
                "Your booking has been successfully confirmed!",
                [{ text: "OK", onPress: () => onClose() }]
            );

            setStep(1);
            setShowSuccess(true);
            navigation.navigate('Booking_hotel_success', {
                data: {
                    checkInDate,
                    checkOutDate,
                    males,
                    roomData,
                    females,
                    guestInfo: bookingData.guestInformation,
                    paymentMethod,
                    Bookingid: bookingData.bookingId
                }
            });

        } catch (error) {
            console.error("Booking Error:", error.response?.data || error.message);

            let errorMessage = "Something went wrong. Please try again.";

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 500) {
                errorMessage = "Server error. Please try again later.";
            } else if (error.response?.status === 400) {
                errorMessage = "Invalid booking details. Please check your inputs.";
            }

            Alert.alert("Booking Failed ❌", errorMessage);
        } finally {
            setLoading(false);
        }
    };



    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View>
                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowCheckIn(true)}
                        >
                            <Icon name="calendar" size={24} color="#de423e" />
                            <View style={styles.dateTextContainer}>
                                <Text style={styles.dateLabel}>Check-in</Text>
                                <Text style={styles.dateValue}>
                                    {checkInDate.toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowCheckOut(true)}
                        >
                            <Icon name="calendar" size={24} color="#de423e" />
                            <View style={styles.dateTextContainer}>
                                <Text style={styles.dateLabel}>Check-out</Text>
                                <Text style={styles.dateValue}>
                                    {checkOutDate.toLocaleDateString()}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {(showCheckIn || showCheckOut) && Platform.OS === 'ios' && (
                            <DateTimePicker
                                value={showCheckIn ? checkInDate : checkOutDate}
                                mode="date"
                                display="spinner"
                                onChange={(event, date) =>
                                    handleDateChange(
                                        event,
                                        date,
                                        showCheckIn ? 'checkIn' : 'checkOut'
                                    )
                                }
                                minimumDate={new Date()}
                            />
                        )}
                    </View>
                );
            case 2:
                return (
                    <View>
                        <Text style={styles.guestInfo}>
                            Maximum {roomData.allowed_person * numberOfRooms} guests allowed
                        </Text>

                        <View style={styles.guestPicker}>
                            <Text style={styles.pickerLabel}>Male Guests</Text>
                            <Picker
                                selectedValue={males}
                                style={styles.picker}
                                onValueChange={setMales}
                            >
                                {[...Array(roomData.allowed_person + 1)].map((_, i) => (
                                    <Picker.Item
                                        key={i}
                                        label={i.toString()}
                                        value={i}
                                    />
                                ))}
                            </Picker>
                        </View>

                        <View style={styles.guestPicker}>
                            <Text style={styles.pickerLabel}>Female Guests</Text>
                            <Picker
                                selectedValue={females}
                                style={styles.picker}
                                onValueChange={setFemales}
                            >
                                {[...Array(roomData.allowed_person + 1)].map((_, i) => (
                                    <Picker.Item
                                        key={i}
                                        label={i.toString()}
                                        value={i}
                                    />
                                ))}
                            </Picker>
                        </View>
                        <View>
                            <Text style={styles.guestInfo}>
                                No of Rooms : {numberOfRooms}
                            </Text>
                        </View>
                        {!isValidGuests && (
                            <View style={{ flexDirection: "col", alignItems: "center", marginTop: 10 }}>
                                <Text style={{ color: "red", fontSize: 14, marginBottom: 5 }}>
                                    Total guests cannot exceed {roomData.allowed_person} Book one More Room
                                </Text>

                                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>


                                    <TouchableOpacity
                                        onPress={() => setNumberRooms((prev) => Math.max(1, prev - 1))}
                                        style={{ padding: 10, flex: 1, textAlign: 'center', backgroundColor: "#d64444", borderRadius: 5, marginHorizontal: 5 }}
                                    >
                                        <Text style={{ color: "white", textAlign: 'center', fontSize: 16, fontWeight: "bold" }}>-</Text>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 16, flex: 1, textAlign: 'center', fontWeight: "bold", marginHorizontal: 10 }}>{numberOfRooms}</Text>

                                    <TouchableOpacity
                                        onPress={() => setNumberRooms((prev) => Math.max(1, prev + 1))}
                                        style={{ padding: 10, flex: 1, textAlign: 'center', backgroundColor: "#0d6efd", borderRadius: 5, marginHorizontal: 5 }}
                                    >
                                        <Text style={{ color: "white", fontSize: 16, textAlign: 'center', fontWeight: "bold" }}>+</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setStep(step - 1)}
                        >
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 3:
                return (
                    <View>
                        <Text style={styles.guestInfo}>Maximum {roomData.allowed_person} guests allowed</Text>

                        {guests.map((guest, index) => (
                            <View key={index} style={styles.guestItem}>
                                <View style={styles.guestInputContainer}>
                                    <TextInput
                                        style={styles.guestInput}
                                        value={guest.guestName}
                                        onChangeText={(text) => updateGuest(index, "guestName", text)}
                                        placeholder="Guest Name"
                                    />
                                    <TextInput
                                        style={styles.guestInput}
                                        value={guest.guestPhone}
                                        onChangeText={(text) => updateGuest(index, "guestPhone", text)}
                                        placeholder="Contact Details"
                                        keyboardType="numeric"
                                    />
                                    <TextInput
                                        style={styles.guestInput}
                                        value={guest.guestAge}
                                        onChangeText={(text) => updateGuest(index, "guestAge", text)}
                                        placeholder="guest Age"
                                        keyboardType="numeric"
                                    />
                                </View>
                                {index > 0 && (
                                    <TouchableOpacity onPress={() => removeGuest(index)}>
                                        <Icon name="close" size={24} color="#de423e" />
                                    </TouchableOpacity>
                                )}

                            </View>
                        ))}

                        {guests.length < roomData.allowed_person * numberOfRooms && (
                            <TouchableOpacity style={styles.addGuestButton} onPress={addGuest}>
                                <Icon name="plus" size={24} color="#de423e" />
                                <Text style={styles.addGuestText}>Add Guest</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setStep(step - 1)}
                        >
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    </View>
                )

            case 4:
                return (
                    <View>
                        <Text style={styles.paymentTitle}>Select Payment Method</Text>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                paymentMethod === 'online' && styles.selectedPayment
                            ]}
                            onPress={() => setPaymentMethod('online')}
                        >
                            <Icon
                                name="credit-card"
                                size={24}
                                color={paymentMethod === 'online' ? '#de423e' : '#666'}
                            />
                            <Text style={[
                                styles.paymentText,
                                paymentMethod === 'online' && styles.selectedPaymentText
                            ]}>
                                Pay Online Now
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                paymentMethod === 'hotel' && styles.selectedPayment
                            ]}
                            onPress={() => setPaymentMethod('hotel')}
                        >
                            <Icon
                                name="home"
                                size={24}
                                color={paymentMethod === 'hotel' ? '#de423e' : '#666'}
                            />
                            <Text style={[
                                styles.paymentText,
                                paymentMethod === 'hotel' && styles.selectedPaymentText
                            ]}>
                                Pay at Hotel
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 1: return 'Select Dates';
            case 2: return 'Guest Details';
            case 3: return 'Contact Information';
            case 4: return 'Payment Method';
            default: return '';
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return true;
            case 2: return isValidGuests;
            case 3: return isValidGuestInfo;
            case 4: return true;
            default: return false;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{getStepTitle()}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {renderStepContent()}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        {step < 4 ? (
                            <TouchableOpacity
                                style={[
                                    styles.nextButton,
                                    !canProceed() && styles.disabledButton
                                ]}
                                onPress={() => setStep(step + 1)}
                                disabled={!canProceed()}
                            >
                                <Text style={styles.buttonText}>Next</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.footerButtons}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => setStep(step - 1)}
                                >
                                    <Text style={styles.backButtonText}>Back</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={handleSubmit}
                                >
                                    <Text style={styles.buttonText}>{loading ? 'Please wait' : 'Confirm Booking'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Date Picker for Android */}
            {(showCheckIn || showCheckOut) && Platform.OS === 'android' && (
                <DateTimePicker
                    value={showCheckIn ? checkInDate : checkOutDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) =>
                        handleDateChange(
                            event,
                            date,
                            showCheckIn ? 'checkIn' : 'checkOut'
                        )
                    }
                    minimumDate={new Date()}
                />
            )}
        </Modal>
    );
}

