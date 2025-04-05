import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  StyleSheet,
  Dimensions,
  Animated
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PaymentStatusModal = ({ visible, status, message, onClose }) => {
  const [scaleAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
        return {
          icon: 'check-circle',
          color: '#059669',
          title: 'Payment Successful!',
          gradient: ['#059669', '#047857']
        };
      case 'failed':
        return {
          icon: 'close-circle',
          color: '#DC2626',
          title: 'Payment Failed',
          gradient: ['#DC2626', '#B91C1C']
        };
      case 'cancelled':
        return {
          icon: 'cancel',
          color: '#F59E0B',
          title: 'Payment Cancelled',
          gradient: ['#F59E0B', '#D97706']
        };
      default:
        return {
          icon: 'information',
          color: '#3B82F6',
          title: 'Payment Status',
          gradient: ['#3B82F6', '#2563EB']
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={config.gradient}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name={config.icon} size={50} color="#FFF" />
            <Text style={styles.modalTitle}>{config.title}</Text>
          </LinearGradient>

          <View style={styles.modalBody}>
            <Text style={styles.modalMessage}>{message}</Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: config.color }]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const MembershipCard = ({ plan, selected, onSelect }) => (
  <TouchableOpacity
    style={[styles.planCard, selected && styles.selectedPlan]}
    onPress={() => onSelect(plan._id)}
    activeOpacity={0.7}
  >
    {plan.isPopular && (
      <View style={styles.popularBadge}>
        <Text style={styles.popularText}>Popular</Text>
      </View>
    )}

    <View style={styles.planHeader}>
      <Text style={styles.planTitle}>{plan.title}</Text>
      <Icon
        name={selected ? 'check-circle' : 'circle-outline'}
        size={24}
        color={selected ? '#4F46E5' : '#6B7280'}
      />
    </View>

    <View style={styles.priceContainer}>
      <Text style={styles.planPrice}>₹{plan.price}</Text>
      <Text style={styles.gstText}>+18% GST</Text>
    </View>

    <View style={styles.divider} />

    <Text style={styles.planDescription}>{plan.description}</Text>

    <View style={styles.validityContainer}>
      <Icon name="clock-outline" size={16} color="#6B7280" />
      <Text style={styles.planValidity}>
        Valid for {plan.validityDays} {plan.whatIsThis}
      </Text>
    </View>
  </TouchableOpacity>
);

export default function RechargeViaOnline() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    status: '',
    message: ''
  });

  useEffect(() => {
    fetchUserDetails();
    fetchMembershipPlans();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token_cab');
      if (!token) throw new Error('Authentication token not found');

      const response = await axios.get('https://demoapi.olyox.com/api/v1/rider/user-details', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(response.data.partner);
    } catch (error) {
      showPaymentModal('failed', 'Failed to fetch user details. Please try again.');
    }
  };

  const fetchMembershipPlans = async () => {
    try {
      const { data } = await axios.get('https://www.api.olyox.com/api/v1/membership-plans');
      setMemberships(data.data);
    } catch (error) {
      showPaymentModal('failed', 'Failed to fetch membership plans. Please try again.');
    }
  };

  const showPaymentModal = (status, message) => {
    setModalConfig({
      visible: true,
      status,
      message
    });
  };



  const initiatePayment = async (memberId) => {
    if (!memberId) {
      showPaymentModal('failed', 'Please select a membership plan.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `https://demoapi.olyox.com/api/v1/rider/recharge-wallet/${memberId}/${userData?.BH}`
      );

      const options = {
        description: 'Recharge Wallet',
        image: 'https://www.olyox.com/assets/logo-CWkwXYQ_.png',
        currency: response.data.order.currency,
        key: 'rzp_test_Yiemqpugk5YVNl',
        amount: response.data.order.amount,
        name: 'Olyox',
        order_id: response.data.order.id,
        prefill: {
          email: userData?.email,
          contact: userData?.phone,
          name: userData?.name,
        },
        theme: { color: '#4F46E5' },
      };

      // ✅ Razorpay opens and resolves on success
      const paymentResponse = await RazorpayCheckout.open(options);
      console.log('Payment Success Response:', paymentResponse);

      // ✅ After payment, call your backend verification API
      const verifyResponse = await axios.post(
        `https://demoapi.olyox.com/api/v1/rider/recharge-verify/${userData?.BH}`,
        {
          razorpay_order_id: paymentResponse?.razorpay_order_id,
          razorpay_payment_id: paymentResponse?.razorpay_payment_id,
          razorpay_signature: paymentResponse?.razorpay_signature,

        }

      );

      const rechargeStatus = verifyResponse?.data?.rechargeData;

      if (
        verifyResponse?.data?.message?.includes('successful') &&
        rechargeStatus?.payment_approved
      ) {
        showPaymentModal('success', 'Your payment was successful! Your membership has been activated.');
        setTimeout(() => {
          navigation.navigate('Home');

        }, 2000);
      } else {
        showPaymentModal('failed', 'Payment processed but verification failed. Please contact support.');
      }

    } catch (error) {
      console.log('Payment Error:', error.response.data);

      if (error?.description === 'Payment Cancelled' || error?.code === 'PAYMENT_CANCELLED') {
        showPaymentModal('cancelled', 'You cancelled the payment. Please try again when you\'re ready.');
      } else {
        showPaymentModal('failed', 'Payment failed. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };





  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSubtitle}>
          Select a membership plan that suits your needs
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.planContainer}
        showsVerticalScrollIndicator={false}
      >
        {memberships.map((plan) => (
          <MembershipCard
            key={plan._id}
            plan={plan}
            selected={plan._id === selectedMemberId}
            onSelect={(id) => {
              setSelectedMemberId(id);
              initiatePayment(id);
            }}
          />
        ))}
      </ScrollView>

      <PaymentStatusModal
        visible={modalConfig.visible}
        status={modalConfig.status}
        message={modalConfig.message}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  planContainer: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  selectedPlan: {
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  priceContainer: {
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  gstText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  planDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planValidity: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalMessage: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});