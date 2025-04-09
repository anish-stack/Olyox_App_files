import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Modal,
    Dimensions,
    Alert,
    Linking,
    BackHandler,
} from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { useNavigation } from '@react-navigation/native';
import { checkBhDetails } from '../../utils/Api';

const { width } = Dimensions.get('window');

export default function Profile() {
    const { socket } = useSocket();
    const navigation = useNavigation()

    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [checkBhData, setBhData] = useState([]);
    const [showDocuments, setShowDocuments] = useState(false);
    const [showVehicleDetails, setShowVehicleDetails] = useState(false);
    const [showUpdateProfile, setShowUpdateProfile] = useState(false);

    useEffect(() => {
        fetchUserDetails();
    }, []);


    const fetchUserDetails = async () => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('auth_token_cab');
            if (token) {
                const response = await axios.get(
                    'http://192.168.1.23:3100/api/v1/rider/user-details',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (response.data.partner) {
                    try {
                        const data = await checkBhDetails(response.data.partner?.BH)
                        if (data.complete) {
                            console.log(data.complete)
                            setBhData([data.complete])
                        }
                    } catch (error) {
                        console.log('BH Found Error', error)
                    }
                }
                setUserData(response.data.partner);
            }
        } catch (error) {
            console.error('Error fetching user details:', error?.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotalReferrals = checkBhData.reduce((acc, index) => {
        return acc +
            (index.Child_referral_ids?.length || 0) +
            (index.Level1?.length || 0) +
            (index.Level2?.length || 0) +
            (index.Level3?.length || 0) +
            (index.Level4?.length || 0) +
            (index.Level5?.length || 0) +
            (index.Level6?.length || 0) +
            (index.Level7?.length || 0);
    }, 0);


    const handleLogout = async () => {
        try {
            await SecureStore.deleteItemAsync('auth_token_cab');

            // Disconnect the socket properly
            if (socket) {
                // socket.off('di'); // Remove specific event listener
                socket.disconnect(); // Disconnect from the server
            }
            BackHandler.exitApp()


            // Reset navigation
            navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
            });
        } catch (error) {
            console.error('Logout Error:', error);
        }
    };


    const shareOurApp = () => {
        const msg = `🚀 *Join the Olyox Rides Family!* 🚖💨\n\nEarn *extra income* 💸 with *zero commission* 🆓 on every ride! 🛣️✨\n\nUse my *Referral Code*: 🔑 ${userData?.BH}\n\n📝 *Register now* and start earning in just a few minutes! ⏳💼\n\n👉(https://www.olyox.com/) 🌐`;

        const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;

        Linking.canOpenURL(url)
            .then((supported) => {
                if (!supported) {
                    Alert.alert('Error', 'WhatsApp is not installed on your device');
                } else {
                    return Linking.openURL(url);
                }
            })
            .catch((err) => Alert.alert('Error', 'An unexpected error occurred'));
    };
    const formatToIST = (dateString) => {
        if (!dateString) return "N/A";

        const date = new Date(dateString);
        return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    };


    const DocumentsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showDocuments}
            onRequestClose={() => setShowDocuments(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Documents</Text>
                    <ScrollView>
                        {userData?.documents && (
                            <>
                                <TouchableOpacity onPress={() => Linking.openURL(userData.documents.license)} style={styles.documentItem}>
                                    <MaterialCommunityIcons name="license" size={24} color="#FFB300" />
                                    <Text style={styles.documentText}>Driver's License</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => Linking.openURL(userData.documents.rc)}
                                    style={styles.documentItem}>
                                    <MaterialCommunityIcons name="file-document" size={24} color="#FFB300" />
                                    <Text style={styles.documentText}>Vehicle RC</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL(userData.documents.profile)}
                                    style={styles.documentItem}>
                                    <MaterialCommunityIcons name="file-document" size={24} color="#FFB300" />
                                    <Text style={styles.documentText}>Profile Image</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL(userData.documents.aadharFront)}
                                    style={styles.documentItem}>
                                    <MaterialCommunityIcons name="file-document" size={24} color="#FFB300" />
                                    <Text style={styles.documentText}>Aadhar Front</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => Linking.openURL(userData.documents.aadharBack)}
                                    style={styles.documentItem}>
                                    <MaterialCommunityIcons name="file-document" size={24} color="#FFB300" />
                                    <Text style={styles.documentText}>Aadhar Back</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => Linking.openURL(userData.documents.insurance)}
                                    style={styles.documentItem}>
                                    <MaterialCommunityIcons name="shield-check" size={24} color="#FFB300" />
                                    <Text style={styles.documentText}>Insurance</Text>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowDocuments(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const VehicleDetailsModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showVehicleDetails}
            onRequestClose={() => setShowVehicleDetails(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Vehicle Details</Text>
                    <ScrollView>
                        <View style={styles.vehicleDetail}>
                            <Text style={styles.vehicleLabel}>Vehicle Type</Text>
                            <Text style={styles.vehicleValue}>{userData?.rideVehicleInfo?.vehicleType || 'N/A'}</Text>
                        </View>
                        <View style={styles.vehicleDetail}>
                            <Text style={styles.vehicleLabel}>Vehicle Number</Text>
                            <Text style={styles.vehicleValue}>{userData?.rideVehicleInfo?.VehicleNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.vehicleDetail}>
                            <Text style={styles.vehicleLabel}>Model</Text>
                            <Text style={styles.vehicleValue}>{userData?.rideVehicleInfo?.vehicleName || 'N/A'}</Text>
                        </View>
                        <View style={styles.vehicleDetail}>
                            <Text style={styles.vehicleLabel}>RC Expires On</Text>
                            <Text style={styles.vehicleValue}>{userData?.rideVehicleInfo?.RcExpireDate || '0'}</Text>
                        </View>
                    </ScrollView>
                    {/* <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => {
                            setShowVehicleDetails(false);
                            router.push('/vehicle-edit');
                        }}
                    >
                        <Text style={styles.editButtonText}>Edit Vehicle Details</Text>
                    </TouchableOpacity> */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowVehicleDetails(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const UpdateProfileModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showUpdateProfile}
            onRequestClose={() => setShowUpdateProfile(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}> Profile Details</Text>
                    <ScrollView>
                        <View style={styles.profileField}>
                            <Text style={styles.fieldLabel}>Name</Text>
                            <Text style={styles.fieldValue}>{userData?.name || 'N/A'}</Text>
                        </View>
                        <View style={styles.profileField}>
                            <Text style={styles.fieldLabel}>Phone</Text>
                            <Text style={styles.fieldValue}>{userData?.phone || 'N/A'}</Text>
                        </View>
                        <View style={styles.profileField}>
                            <Text style={styles.fieldLabel}>Recharge Plan</Text>
                            <Text style={styles.fieldValue}>{userData?.RechargeData?.rechargePlan || 'N/A'}</Text>
                        </View>
                        <View style={styles.profileField}>
                            <Text style={styles.fieldLabel}>Phone</Text>
                            <Text style={styles.fieldValue}>{formatToIST(userData?.RechargeData?.expireData) || 'N/A'}</Text>
                        </View>

                    </ScrollView>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowUpdateProfile(false)}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFB300" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileInfo}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>
                            {userData?.name ? userData.name[0].toUpperCase() : '?'}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{userData?.name || 'Driver'}</Text>
                        <Text style={styles.userPhone}>{userData?.phone || ''}</Text>
                        <Text style={styles.userId}>BH ID: {userData?.BH || ''}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userData?.TotalRides || 0}</Text>
                    <Text style={styles.statLabel}>Rides</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{calculateTotalReferrals || 0}</Text>
                    <Text style={styles.statLabel}>Total Refer</Text>
                </View>
                <View style={styles.statDivider} />

                <TouchableOpacity onPress={() => navigation.navigate('withdraw', {
                    _id: checkBhData[0]?._id,
                    wallet: checkBhData[0]?.wallet
                })}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>₹{checkBhData[0]?.wallet || 0}</Text>
                        <Text style={styles.statLabel}>Refer Earning</Text>
                        <Text style={styles.statLabel}>Make a Withdraw</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                        {userData?.BH || 0}
                    </Text>
                    <Text style={styles.statLabel}>BH ID</Text>
                </View>
            </View>

            <View style={styles.menuContainer}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowDocuments(true)}
                >
                    <MaterialCommunityIcons name="file-document" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>View Documents</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowUpdateProfile(true)}
                >
                    <MaterialCommunityIcons name="account-edit" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Profile Details</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowVehicleDetails(true)}
                >
                    <MaterialCommunityIcons name="car" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Vehicle Details</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => shareOurApp()}
                >
                    <MaterialCommunityIcons name="gift" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Refer & Earn</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('referral-history')}
                >
                    <MaterialCommunityIcons name="account-edit" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Referral History</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('recharge-history')}
                >
                    <MaterialCommunityIcons name="contactless-payment-circle" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Recharge History</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => navigation.navigate('upload-qr')}
                >
                    <MaterialCommunityIcons name="cash" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Payment Qr</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color="#FFB300" />
                    <Text style={styles.menuText}>Logout</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
                </TouchableOpacity>
            </View>

            <DocumentsModal />
            <VehicleDetailsModal />
            <UpdateProfileModal />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: '#f7de02',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#FFB300',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFB300',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    userPhone: {
        fontSize: 16,
        color: '#FFFFFF',
        opacity: 0.8,
        marginBottom: 4,
    },
    userId: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        margin: 8,

        padding: 8,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    statItem: {
        flex: 1,

        alignItems: 'center',
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFB300',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#757575',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 4,
    },
    menuContainer: {
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    menuText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        color: '#212121',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
        width: width,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#FFB300',
    },
    documentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    documentText: {
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        color: '#212121',
    },
    vehicleDetail: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    vehicleLabel: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 4,
    },
    vehicleValue: {
        fontSize: 16,
        color: '#212121',
        fontWeight: '500',
    },
    profileField: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    fieldLabel: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 16,
        color: '#212121',
        fontWeight: '500',
    },
    editButton: {
        backgroundColor: '#FFB300',
        padding: 16,
        borderRadius: 8,
        marginTop: 12,
    },
    editButtonText: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#FFF8E1',
        padding: 16,
        borderRadius: 8,
        marginTop: 12,
    },
    closeButtonText: {
        color: '#FFB300',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
});