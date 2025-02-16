import React, { useState } from 'react';
import {
    Text,
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/colors';

export function Withdraw() {
    const [modalVisible, setModalVisible] = useState(false);
    const [withdrawForm, setWithdrawForm] = useState({
        vendor_id: '6778080d9305bbb2473485b2',
        amount: '',
        method: '',
        bankDetails: {
            accountNo: '',
            ifsc_code: '',
            bankName: ''
        },
        upi_details: {
            upi_id: ''
        }
    });

    // Sample withdraw history data
    const withdrawHistory = [
        {
            _id: "67796140aafa9fdd104dd607",
            vendor_id: "6778080d9305bbb2473485b2",
            amount: 1200,
            method: "UPI",
            upi_details: {
                upi_id: "anish@pytes"
            },
            status: "Approved",
            requestedAt: "2025-01-04T16:26:40.163+00:00",
            createdAt: "2025-01-04T16:26:40.234+00:00",
            updatedAt: "2025-01-04T16:27:42.454+00:00",
            time_of_payment_done: "2025-01-04T23:57:00.000+00:00",
            trn_no: "123456ASDFGH"
        },
        {
            _id: "67796140aafa9fdd104dd608",
            vendor_id: "6778080d9305bbb2473485b3",
            amount: 5000,
            method: "Bank Transfer",
            bankDetails: {
                accountNo: "1234567890",
                ifsc_code: "SBIN0001234",
                bankName: "State Bank of India"
            },
            status: "Pending",
            requestedAt: "2025-01-04T15:26:40.163+00:00",
            createdAt: "2025-01-04T15:26:40.234+00:00",
            updatedAt: "2025-01-04T15:27:42.454+00:00"
        }
    ];

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'approved': return '#4CAF50';
            case 'pending': return '#FFA000';
            case 'rejected': return '#FF5252';
            default: return '#666';
        }
    };

    const handleSubmit = () => {
        console.log('Form submitted:', withdrawForm);
        setModalVisible(false);
        // Reset form
        setWithdrawForm({
            vendor_id: '6778080d9305bbb2473485b2',
            amount: '',
            method: '',
            bankDetails: {
                accountNo: '',
                ifsc_code: '',
                bankName: ''
            },
            upi_details: {
                upi_id: ''
            }
        });
    };

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Withdraw History</Text>
                    <Text style={styles.headerSubtitle}>Track your withdrawal requests</Text>
                </View>

                <TouchableOpacity
                    style={styles.newWithdrawButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Icon name="plus-circle" size={24} color="#fff" />
                    <Text style={styles.newWithdrawText}>New Withdrawal</Text>
                </TouchableOpacity>
            </View>

            {/* Withdraw List */}
            {withdrawHistory.map((withdraw) => (
                <View key={withdraw._id} style={styles.withdrawCard}>
                    {/* Status and Amount */}
                    <View style={styles.topSection}>
                        <View style={styles.methodContainer}>
                            <Icon
                                name={withdraw.method === 'UPI' ? 'cellphone-wireless' : 'bank'}
                                size={24}
                                color="#2196F3"
                            />
                            <Text style={styles.methodText}>{withdraw.method}</Text>
                        </View>
                        <Text style={styles.amount}>₹{withdraw.amount}</Text>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(withdraw.status)}20` }]}>
                        <Icon
                            name={withdraw.status === 'Approved' ? 'check-circle' : 'clock-outline'}
                            size={20}
                            color={getStatusColor(withdraw.status)}
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(withdraw.status) }]}>
                            {withdraw.status}
                        </Text>
                    </View>

                    {/* Payment Details */}
                    <View style={styles.detailsContainer}>
                        {withdraw.method === 'UPI' ? (
                            <View style={styles.detailRow}>
                                <Icon name="identifier" size={20} color="#666" />
                                <Text style={styles.detailLabel}>UPI ID:</Text>
                                <Text style={styles.detailValue}>{withdraw.upi_details.upi_id}</Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.detailRow}>
                                    <Icon name="bank" size={20} color="#666" />
                                    <Text style={styles.detailLabel}>Bank:</Text>
                                    <Text style={styles.detailValue}>{withdraw.bankDetails.bankName}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Icon name="card-account-details" size={20} color="#666" />
                                    <Text style={styles.detailLabel}>Account:</Text>
                                    <Text style={styles.detailValue}>
                                        {withdraw.bankDetails.accountNo.replace(/(\d{4})(?=\d)/g, '$1 ')}
                                    </Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Icon name="barcode" size={20} color="#666" />
                                    <Text style={styles.detailLabel}>IFSC:</Text>
                                    <Text style={styles.detailValue}>{withdraw.bankDetails.ifsc_code}</Text>
                                </View>
                            </>
                        )}

                        {withdraw.trn_no && (
                            <View style={styles.detailRow}>
                                <Icon name="file-document" size={20} color="#666" />
                                <Text style={styles.detailLabel}>Transaction:</Text>
                                <Text style={styles.detailValue}>{withdraw.trn_no}</Text>
                            </View>
                        )}

                        <View style={styles.detailRow}>
                            <Icon name="calendar" size={20} color="#666" />
                            <Text style={styles.detailLabel}>Requested:</Text>
                            <Text style={styles.detailValue}>{formatDate(withdraw.requestedAt)}</Text>
                        </View>

                        {withdraw.time_of_payment_done && (
                            <View style={styles.detailRow}>
                                <Icon name="calendar-check" size={20} color="#666" />
                                <Text style={styles.detailLabel}>Completed:</Text>
                                <Text style={styles.detailValue}>
                                    {formatDate(withdraw.time_of_payment_done)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            ))}

            {/* Withdraw Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Withdrawal</Text>
                                <TouchableOpacity
                                    onPress={() => setModalVisible(false)}
                                    style={styles.closeButton}
                                >
                                    <Icon name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            {/* Amount Input */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Amount (₹)</Text>
                                <View style={styles.inputWrapper}>
                                    <Icon name="currency-inr" size={20} color="#666" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        placeholder="Enter amount"
                                        value={withdrawForm.amount}
                                        onChangeText={(text) => setWithdrawForm({ ...withdrawForm, amount: text })}
                                    />
                                </View>
                            </View>

                            {/* Payment Method Selection */}
                            <Text style={styles.inputLabel}>Select Payment Method</Text>
                            <View style={styles.methodContainer}>
                                {['UPI', 'Bank Transfer'].map((method) => (
                                    <TouchableOpacity
                                        key={method}
                                        style={[
                                            styles.methodButton,
                                            withdrawForm.method === method && styles.methodButtonActive
                                        ]}
                                        onPress={() => setWithdrawForm({ ...withdrawForm, method })}
                                    >
                                        <Icon
                                            name={method === 'UPI' ? 'cellphone-wireless' : 'bank'}
                                            size={24}
                                            color={withdrawForm.method === method ? '#fff' : '#666'}
                                        />
                                        <Text style={[
                                            styles.methodButtonText,
                                            withdrawForm.method === method && styles.methodButtonTextActive
                                        ]}>
                                            {method}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Conditional Form Fields */}
                            {withdrawForm.method === 'UPI' && (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>UPI ID</Text>
                                    <View style={styles.inputWrapper}>
                                        <Icon name="at" size={20} color="#666" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter UPI ID"
                                            value={withdrawForm.upi_details.upi_id}
                                            onChangeText={(text) => setWithdrawForm({
                                                ...withdrawForm,
                                                upi_details: { upi_id: text }
                                            })}
                                        />
                                    </View>
                                </View>
                            )}

                            {withdrawForm.method === 'Bank Transfer' && (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Bank Name</Text>
                                        <View style={styles.inputWrapper}>
                                            <Icon name="bank" size={20} color="#666" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter bank name"
                                                value={withdrawForm.bankDetails.bankName}
                                                onChangeText={(text) => setWithdrawForm({
                                                    ...withdrawForm,
                                                    bankDetails: { ...withdrawForm.bankDetails, bankName: text }
                                                })}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Account Number</Text>
                                        <View style={styles.inputWrapper}>
                                            <Icon name="card-account-details" size={20} color="#666" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter account number"
                                                keyboardType="numeric"
                                                value={withdrawForm.bankDetails.accountNo}
                                                onChangeText={(text) => setWithdrawForm({
                                                    ...withdrawForm,
                                                    bankDetails: { ...withdrawForm.bankDetails, accountNo: text }
                                                })}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>IFSC Code</Text>
                                        <View style={styles.inputWrapper}>
                                            <Icon name="barcode" size={20} color="#666" style={styles.inputIcon} />
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter IFSC code"
                                                autoCapitalize="characters"
                                                value={withdrawForm.bankDetails.ifsc_code}
                                                onChangeText={(text) => setWithdrawForm({
                                                    ...withdrawForm,
                                                    bankDetails: { ...withdrawForm.bankDetails, ifsc_code: text }
                                                })}
                                            />
                                        </View>
                                    </View>
                                </>
                            )}

                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.submitButtonText}>Submit Withdrawal</Text>
                                <Icon name="arrow-right" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        width: '100%',
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    withdrawCard: {
        backgroundColor: '#FFF',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    methodContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    methodText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#2196F3',
    },
    amount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginBottom: 16,
    },
    statusText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
    },
    detailsContainer: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        width: 80,
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },



    newWithdrawButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.error,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        // margin: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    newWithdrawText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    methodContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    methodButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        marginHorizontal: 6,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    methodButtonActive: {
        backgroundColor: '#2196F3',
        borderColor: '#2196F3',
    },
    methodButtonText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    methodButtonTextActive: {
        color: '#fff',
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2196F3',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
});