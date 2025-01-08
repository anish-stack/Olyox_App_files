import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/colors';

const Profile = () => {
    // Sample data
    const profileData = {
        name: "Sharma's Kitchen",
        category: "Tiffin Service",
        planExpiry: "2024-04-30",
        referralCode: "SHARMA123",
        planStatus: "Active",
        referralEarnings: 5000,
        referralCount: 25,
        salesEarnings: 45000,
        totalEarnings: 50000
    };

    const MenuItem = ({ icon, title, value, onPress }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuLeft}>
                <Icon name={icon} size={24} color="#4CAF50" />
                <Text style={styles.menuText}>{title}</Text>
            </View>
            {value ? (
                <Text style={styles.menuValue}>{value}</Text>
            ) : (
                <Icon name="chevron-right" size={24} color="#666" />
            )}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.profileImageContainer}>
                    <Image
                        source={{ uri: 'https://via.placeholder.com/100' }}
                        style={styles.profileImage}
                    />
                    <TouchableOpacity style={styles.editImageButton}>
                        <Icon name="camera" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.name}>{profileData.name}</Text>
                <Text style={styles.category}>{profileData.category}</Text>
                <View style={styles.planBadge}>
                    <Icon name="crown" size={16} color="#FFD700" />
                    <Text style={styles.planText}>Premium Plan</Text>
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Icon name="currency-inr" size={24} color="#4CAF50" />
                    <Text style={styles.statAmount}>₹{profileData.totalEarnings}</Text>
                    <Text style={styles.statLabel}>Total Earnings</Text>
                </View>
                <View style={styles.statBox}>
                    <Icon name="account-group" size={24} color="#2196F3" />
                    <Text style={styles.statAmount}>{profileData.referralCount}</Text>
                    <Text style={styles.statLabel}>Referrals</Text>
                </View>
                <View style={styles.statBox}>
                    <Icon name="gift" size={24} color="#FF9800" />
                    <Text style={styles.statAmount}>₹{profileData.referralEarnings}</Text>
                    <Text style={styles.statLabel}>Referral Earnings</Text>
                </View>
            </View>

            {/* Recharge Box */}
            <View style={styles.rechargeBox}>
                <View style={styles.rechargeInfo}>
                    <Text style={styles.rechargeTitle}>Plan expires in</Text>
                    <Text style={styles.rechargeExpiry}>30 Days</Text>
                    <Text style={styles.referralCode}>Referral Code: {profileData.referralCode}</Text>
                </View>
                <TouchableOpacity style={styles.rechargeButton}>
                    <Text style={styles.rechargeButtonText}>Recharge Now</Text>
                </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View style={styles.menuContainer}>
                <Text style={styles.menuHeader}>Business</Text>
                <MenuItem icon="food"  title="Add Listing" />
                <MenuItem icon="food-variant" title="Customize Tiffin Plan" />
                <MenuItem icon="chart-bar" title="Order Report" />
                <MenuItem icon="account-multiple" title="Other Vendor IDs" />

                <Text style={styles.menuHeader}>Earnings & History</Text>
                <MenuItem icon="wallet" title="Sales Earnings" value={`₹${profileData.salesEarnings}`} />
                <MenuItem icon="history" title="Recharge History" />
                <MenuItem icon="cash-multiple" title="Withdraw History" />
                <MenuItem icon="account-group" title="Referral History" />

                <Text style={styles.menuHeader}>Account Settings</Text>
                <MenuItem icon="account-edit" title="Update Profile" />
                <MenuItem icon="lock-reset" title="Change Password" />
                <MenuItem icon="headphones" title="Support" />
                <MenuItem icon="logout" title="Logout" />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        backgroundColor: COLORS.redBackGround,
        padding: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editImageButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#4CAF50',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    category: {
        fontSize: 16,
        color: '#666',
        marginTop: 4,
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9C4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginTop: 8,
    },
    planText: {
        marginLeft: 4,
        color: '#FFA000',
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    rechargeBox: {
        backgroundColor: '#E8F5E9',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rechargeInfo: {
        flex: 1,
    },
    rechargeTitle: {
        fontSize: 14,
        color: '#666',
    },
    rechargeExpiry: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 4,
    },
    referralCode: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    rechargeButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    rechargeButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    menuContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        margin: 16,
        padding: 16,
    },
    menuHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 12,
    },
    menuValue: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: '600',
    },
});

export default Profile;