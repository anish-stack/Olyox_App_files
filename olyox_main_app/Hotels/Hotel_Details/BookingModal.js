import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function BookingModal({ visible, onClose, roomData }) {
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(new Date());
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [males, setMales] = useState(1);
    const [showSuccess, setShowSuccess] = useState(false);
    const [females, setFemales] = useState(0);
    const [step, setStep] = useState(1);
    const [guestInfo, setGuestInfo] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const [paymentMethod, setPaymentMethod] = useState('online');
    const navigation = useNavigation()
    const totalGuests = males + females;
    const isValidGuests = totalGuests <= roomData.allowed_person;
    const isValidGuestInfo = guestInfo.name && guestInfo.email && guestInfo.phone;

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

    const handleSubmit = () => {
        // Handle booking submission
        console.log({
            checkInDate,
            checkOutDate,
            males,
            females,
            guestInfo,
            paymentMethod
        });

        // Show success message and close modal
        alert('Booking successful!');
        onClose();
        setStep(1);
        setShowSuccess(true);
        navigation.navigate('Booking_hotel_success', {
            data: {
                checkInDate,
                checkOutDate,
                males,
                roomData,
                females,
                guestInfo,
                paymentMethod
            }
        })
       

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
                            Maximum {roomData.allowed_person} guests allowed
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

                        {!isValidGuests && (
                            <Text style={styles.errorText}>
                                Total guests cannot exceed {roomData.allowed_person}
                            </Text>
                        )}
                    </View>
                );
            case 3:
                return (
                    <View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={guestInfo.name}
                                onChangeText={(text) => setGuestInfo({ ...guestInfo, name: text })}
                                placeholder="Enter your full name"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={guestInfo.email}
                                onChangeText={(text) => setGuestInfo({ ...guestInfo, email: text })}
                                placeholder="Enter your email"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Phone Number</Text>
                            <TextInput
                                style={styles.input}
                                value={guestInfo.phone}
                                onChangeText={(text) => setGuestInfo({ ...guestInfo, phone: text })}
                                placeholder="Enter your phone number"
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>
                );
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
                                    <Text style={styles.buttonText}>Confirm Booking</Text>
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

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    modalBody: {
        padding: 16,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        marginBottom: 16,
    },
    dateTextContainer: {
        marginLeft: 12,
    },
    dateLabel: {
        fontSize: 12,
        color: '#666',
    },
    dateValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    guestInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    guestPicker: {
        marginBottom: 16,
    },
    pickerLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 8,
    },
    picker: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: 8,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        marginBottom: 12,
    },
    selectedPayment: {
        backgroundColor: '#FFE4E8',
    },
    paymentText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#666',
    },
    selectedPaymentText: {
        color: '#de423e',
    },
    modalFooter: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    footerButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    nextButton: {
        backgroundColor: '#de423e',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    backButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#de423e',
    },
    submitButton: {
        flex: 2,
        backgroundColor: '#de423e',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButtonText: {
        color: '#de423e',
        fontSize: 16,
        fontWeight: 'bold',
    },
});