import React, { useEffect, useState } from 'react';
import {
    Text,
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    TextInput,
    Image,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import useSettings from '../hooks/Settings';
import useFetchProfile from '../hooks/useFetchProfile';

const { width } = Dimensions.get('window');

export function Recharge() {
    const { settings } = useSettings()
    const { restaurant , refetch } = useFetchProfile()
    const [memberships, setMemberships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [timer, setTimer] = useState(30 * 60);

    useEffect(() => {
        fetchMembershipPlans();
    }, []);

    useEffect(() => {
        let interval;
        if (showQR && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            handleCancelPayment();
        }
        return () => clearInterval(interval);
    }, [showQR, timer]);

    const fetchMembershipPlans = async () => {
        try {
            setLoading(true);
            setError(null);
            const { data } = await axios.get('https://www.api.olyox.com/api/v1/membership-plans');
            const plans = data.data.filter((item) => item.category === 'tiffin');
            setMemberships(plans);
            refetch()
        } catch (err) {
            setError('Failed to load membership plans. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handlePlanSelect = (plan) => {
        setSelectedPlan(plan);
        setShowQR(true);
    };

    const handleCancelPayment = () => {
        setShowQR(false);
        setTransactionId('');
        setTimer(30 * 60);
        setSelectedPlan(null);
    };

    const handleRecharge = async () => {
        setLoading(true);
        await refetch()
        try {
        
          const { data } = await axios.post(
            `https://www.webapi.olyox.com/api/v1/do-recharge?_id=${restaurant?.restaurant_BHID}`,
            {
              userId:restaurant?._id,
              plan_id: selectedPlan,
              trn_no: transactionId,
            },
           
          );
          Alert.alert('Success', data?.message);
          setLoading(false);
         
        } catch (error) {
          setLoading(false);
          Alert.alert('Error', error?.response?.data?.message || error.message);
        }
      };
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getBadgeColor = (level) => {
        switch (level) {
            case 1: return { bg: '#E8F5E9', text: '#4CAF50' };
            case 2: return { bg: '#E3F2FD', text: '#2196F3' };
            case 3: return { bg: '#FFF3E0', text: '#FF9800' };
            default: return { bg: '#E8F5E9', text: '#4CAF50' };
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading plans...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Icon name="alert-circle-outline" size={48} color="#FF5252" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchMembershipPlans}>
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {!showQR ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Premium Plans</Text>
                        <Text style={styles.headerSubtitle}>Choose the perfect plan for your needs</Text>
                    </View>

                    {memberships.map((plan) => {
                        const badgeColor = getBadgeColor(plan.level);
                        return (
                            <View key={plan._id} style={styles.planCard}>
                                <View style={styles.planHeader}>
                                    <View style={styles.planTitleContainer}>
                                        <Text style={styles.planTitle}>{plan.title}</Text>
                                        <View style={[styles.levelBadge, { backgroundColor: badgeColor.bg }]}>
                                            <Text style={[styles.levelText, { color: badgeColor.text }]}>
                                                Level {plan.level}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.planDescription}>{plan.description}</Text>
                                </View>

                                <View style={styles.priceSection}>
                                    <View style={styles.priceContainer}>
                                        <Text style={styles.currency}>₹</Text>
                                        <Text style={styles.price}>{plan.price}</Text>
                                    </View>
                                    <View style={styles.validityContainer}>
                                        <Icon name="clock-outline" size={20} color="#666" />
                                        <Text style={styles.validityText}>
                                            {plan.validityDays} {plan.whatIsThis}s
                                        </Text>
                                    </View>
                                </View>

                                {plan.includes && plan.includes.length > 0 && (
                                    <View style={styles.featuresContainer}>
                                        {plan.includes.map((feature, index) => (
                                            <View key={index} style={styles.featureItem}>
                                                <Icon name="check-circle" size={18} color={badgeColor.text} />
                                                <Text style={styles.featureText}>{feature}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.selectButton, { backgroundColor: badgeColor.text }]}
                                    onPress={() => handlePlanSelect(plan)}
                                >
                                    <Text style={styles.selectButtonText}>Select Plan</Text>
                                    <Icon name="arrow-right" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </ScrollView>
            ) : (
                <View style={styles.qrContainer}>
                    <View style={styles.qrHeader}>
                        <TouchableOpacity onPress={handleCancelPayment} style={styles.backButton}>
                            <Icon name="arrow-left" size={24} color="#333" />
                        </TouchableOpacity>
                        <View style={styles.timerContainer}>
                            <Icon name="clock-outline" size={20} color="#FF385C" />
                            <Text style={styles.timerText}>{formatTime(timer)}</Text>
                        </View>
                    </View>

                    <View style={styles.qrContent}>
                        <Text style={styles.qrTitle}>Scan & Pay</Text>
                        <Text style={styles.qrAmount}>₹{selectedPlan?.price}</Text>
                        <Image
                            source={{ uri: settings?.paymentQr || 'https://offercdn.paytm.com/blog/2022/02/scan/scan-banner.png' }}
                            style={styles.qrImage}
                            resizeMode="contain"
                        />
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.container}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.verificationContainer}>
                                <Text style={styles.verificationTitle}>Payment Verification</Text>
                                <Text style={styles.note}>
                                    If payment failed and money is deducted, please contact {settings?.adminEmail}
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter transaction ID"
                                    value={transactionId}
                                    onChangeText={setTransactionId}
                                    placeholderTextColor="#666"
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.verifyButton,
                                        (!transactionId || verifying) && styles.disabledButton
                                    ]}
                                    onPress={handleRecharge}
                                    disabled={!transactionId || verifying}
                                >
                                    {verifying ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.verifyButtonText}>Verify Payment</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: '#FF5252',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#2196F3',
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    planCard: {
        backgroundColor: '#FFF',
        margin: 16,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    planHeader: {
        marginBottom: 16,
    },
    planTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    planTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    planDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    levelBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    levelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priceSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    currency: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 4,
    },
    price: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 2,
    },
    validityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    validityText: {
        marginLeft: 4,
        color: '#666',
        fontWeight: '500',
    },
    featuresContainer: {
        marginTop: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#333',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
    },
    selectButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    qrContainer: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    qrHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 8,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timerText: {
        marginLeft: 4,
        color: '#FF385C',
        fontWeight: '600',
    },
    qrContent: {
        alignItems: 'center',
        padding: 20,
    },
    qrTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    qrAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 20,
    },
    qrImage: {
        width: width * 0.8,
        height: width * 0.5,
        marginVertical: 20,
    },
    verificationContainer: {
        padding: 20,
        backgroundColor: '#F5F5F5',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    verificationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
        marginBottom: 16,
    },
    verifyButton: {
        backgroundColor: '#2196F3',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#B0BEC5',
    },
    verifyButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    note: {
        fontSize: 14,
        color: '#666',
        marginBottom: 14
    }
});