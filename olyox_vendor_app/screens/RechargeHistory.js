import React from 'react';
import { Text, StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function RechargeHistory() {
    // Sample recharge history data
    const rechargeHistory = [
        {
            _id: "67795dfbaafa9fdd104d9457",
            membership_plan: "6774ee499e74c1fdbe5c095a",
            vendor_id: "67795d72aafa9fdd104d91c4",
            end_date: "2025-02-04T16:12:43.424+00:00",
            amount: 3000,
            trn_no: "123456789SDFGHJKL",
            payment_approved: true,
            isCancelPayment: false,
            createdAt: "2025-01-04T16:12:43.696+00:00",
            updatedAt: "2025-01-04T16:24:59.023+00:00"
        },
        // Add more sample data for demonstration
        {
            _id: "67795dfbaafa9fdd104d9458",
            membership_plan: "6774ee499e74c1fdbe5c095b",
            vendor_id: "67795d72aafa9fdd104d91c4",
            end_date: "2025-03-04T16:12:43.424+00:00",
            amount: 5000,
            trn_no: "ABCDEF123456789",
            payment_approved: true,
            isCancelPayment: false,
            createdAt: "2025-01-01T10:12:43.696+00:00",
            updatedAt: "2025-01-01T10:24:59.023+00:00"
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

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Recharge History</Text>
                <Text style={styles.headerSubtitle}>View your subscription payments</Text>
            </View>

            {/* Transaction List */}
            {rechargeHistory.map((transaction) => (
                <View key={transaction._id} style={styles.transactionCard}>
                    {/* Status and Amount */}
                    <View style={styles.topSection}>
                        <View style={styles.statusContainer}>
                            <Icon 
                                name={transaction.payment_approved ? "check-circle" : "alert-circle"} 
                                size={24} 
                                color={transaction.payment_approved ? "#4CAF50" : "#FF5252"}
                            />
                            <Text style={[
                                styles.statusText,
                                { color: transaction.payment_approved ? "#4CAF50" : "#FF5252" }
                            ]}>
                                {transaction.payment_approved ? "Payment Successful" : "Payment Failed"}
                            </Text>
                        </View>
                        <Text style={styles.amount}>₹{transaction.amount}</Text>
                    </View>

                    {/* Transaction Details */}
                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Icon name="identifier" size={20} color="#666" />
                            <Text style={styles.detailLabel}>Transaction ID:</Text>
                            <Text style={styles.detailValue}>{transaction.trn_no}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Icon name="calendar" size={20} color="#666" />
                            <Text style={styles.detailLabel}>Date:</Text>
                            <Text style={styles.detailValue}>{formatDate(transaction.createdAt)}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Icon name="calendar-clock" size={20} color="#666" />
                            <Text style={styles.detailLabel}>Valid Until:</Text>
                            <Text style={styles.detailValue}>{formatDate(transaction.end_date)}</Text>
                        </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity 
                        style={styles.downloadButton}
                        onPress={() => {/* Handle invoice download */}}
                    >
                        <Icon name="download" size={20} color="#2196F3" />
                        <Text style={styles.downloadText}>Download Invoice</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        padding: 20,
        backgroundColor: '#FFF',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
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
    transactionCard: {
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
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
    },
    amount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    detailsContainer: {
        marginTop: 16,
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
        width: 100,
    },
    detailValue: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#E3F2FD',
    },
    downloadText: {
        marginLeft: 8,
        color: '#2196F3',
        fontSize: 14,
        fontWeight: '600',
    }
});