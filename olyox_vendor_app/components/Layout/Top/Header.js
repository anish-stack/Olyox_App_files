import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Animated } from "react-native";
import { Menu, Search, MapPin, X, Home, User, ShoppingBag, MapPinned, Settings, HelpCircle } from "lucide-react-native";
import { COLORS } from "../../../constants/colors";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useNavigation } from "@react-navigation/native";

const Header = () => {
    const navigation = useNavigation();
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-300)).current;
    const [activeOrder,setActiveOrder] = useState(false)

    const showSidebar = () => {
        setSidebarVisible(true);
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const hideSidebar = () => {
        Animated.timing(slideAnim, {
            toValue: -300,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setSidebarVisible(false));
    };

    const menuItems = [
        { title: 'Home', icon: Home },
        { title: 'Profile', icon: User },
        { title: 'Orders', icon: ShoppingBag },
        { title: 'Addresses', icon: MapPinned },
        { title: 'Settings', icon: Settings },
        { title: 'Help', icon: HelpCircle },
    ];

    return (
        <View>
            <View style={styles.header}>
                {/* Location Section */}
                <View style={styles.locationContainer}>
                    <MapPin size={20} color={COLORS.white} />
                    <View style={styles.locationTextContainer}>
                        <Text style={styles.locationLabel}>Location</Text>
                        <Text style={styles.locationDetails}>Delhi Rohini Sector 7</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search What you Want To Eat, Ride, and Shift"
                        placeholderTextColor={COLORS.white}
                    />
                    <TouchableOpacity style={styles.searchIcon}>
                        <Search size={20} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

               <View style={styles.headerRightContainer}>
                    {/* Notification Icon */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('New Order')}
                        style={styles.notificationButton}
                    >
                        {activeOrder ? <Icon name="bell-badge" size={24} color={'#ffffff'} /> : <Icon name="bell" size={24} style={styles.bellDeactive} />}
                    </TouchableOpacity>

                    {/* Menu Button */}
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={showSidebar}
                    >
                        <Menu size={30} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>

            <Modal
                visible={sidebarVisible}
                transparent={true}
                onRequestClose={hideSidebar}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.sidebar,
                            {
                                transform: [{ translateX: slideAnim }]
                            }
                        ]}
                    >
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>Menu</Text>
                            <TouchableOpacity
                                onPress={hideSidebar}
                                style={styles.closeButton}
                            >
                                <X size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.authButtons}>
                            <TouchableOpacity style={styles.loginButton}>
                                <Text style={styles.loginButtonText}>Login</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.registerButton}>
                                <Text style={styles.registerButtonText}>Register</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.menuItems}>
                            {menuItems.map((item) => (
                                <TouchableOpacity
                                    key={item.title}
                                    style={styles.menuItem}
                                >
                                    <item.icon size={20} color={COLORS.text} />
                                    <Text style={styles.menuText}>{item.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderColor: COLORS.white,
        borderWidth: 2,
        borderRadius: 8,
    },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    locationTextContainer: {
        flex: 1,
        marginLeft: 8,
    },
    locationLabel: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "bold",
    },
    locationDetails: {
        color: COLORS.white,
        fontSize: 14,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderColor: COLORS.white,
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
    },
    searchInput: {
        flex: 1,
        height: 35,
        color: COLORS.white,
        fontSize: 12,
    },
    searchIcon: {
        marginLeft: 8,
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 16,
        right: 16,
    },
    notificationButton: {
        marginRight: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
    },
    sidebar: {
        backgroundColor: COLORS.background,
        width: '80%',
        height: '100%',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sidebarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sidebarTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    closeButton: {
        padding: 8,
    },
    authButtons: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    loginButton: {
        backgroundColor: COLORS.error,
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginRight: 8,
    },
    registerButton: {
        backgroundColor: 'transparent',
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    loginButtonText: {
        color: COLORS.white,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    registerButtonText: {
        color: COLORS.error,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    menuItems: {
        padding: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.2,
        borderBottomColor: COLORS.border,
    },
    menuText: {
        fontSize: 16,
        color: COLORS.text,
        marginLeft: 16,
    },
    bellDeactive: {
        color:'#ffffff'
    }
});

export default Header;