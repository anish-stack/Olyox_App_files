import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  BackHandler
} from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import styles from './styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constant/Colors';
import { useNavigation } from '@react-navigation/native';

const isWeb = Platform.OS === 'web';
const { width } = Dimensions.get('window');

export default function Layout({data, children, title = 'Hotel Management',profileImages, activeTab = 'home' }) {
  const [sidebarVisible, setSidebarVisible] = useState(isWeb);
  const [notificationCount, setNotificationCount] = useState(3);
  const slideAnim = useState(new Animated.Value(isWeb ? 0 : -width * 0.8))[0];
  const navigation  = useNavigation()
  // Mock hotel data for sidebar
  const hotelInfo = {
    name: data?.hotel_name || "User",
    address: data?.hotel_address || "Not-Available",
    profileImage: profileImages|| 'https://content.jdmagicbox.com/v2/comp/delhi/t6/011pxx11.xx11.190201182203.t1t6/catalogue/hotel-la-pitampura-delhi-hotels-h7zomvqdiy-250.jpg'
  };
  
  // Menu items for sidebar
  const menuItems = [
    { id: 'home', label: 'Dashboard', icon: 'dashboard' },
    { id: 'rooms', label: 'Rooms', icon: 'hotel' },
    { id: 'bookings', label: 'Bookings', icon: 'book-online' },
    { id: 'guests', label: 'Guests', icon: 'people' },
    { id: 'payments', label: 'Payments', icon: 'payment' },
    { id: 'reports', label: 'Reports', icon: 'bar-chart' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  
  // Bottom bar items
  const bottomBarItems = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'rooms', label: 'Rooms', icon: 'hotel' },
    { id: 'bookings', label: 'Bookings', icon: 'book-online' },
    { id: 'profile', label: 'Profile', icon: 'person' },
  ];

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    if (sidebarVisible) {
      // Hide sidebar
      Animated.timing(slideAnim, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setSidebarVisible(false));
    } else {
      // Show sidebar
      setSidebarVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  // Handle back button press on Android to close sidebar
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backAction = () => {
        if (sidebarVisible && !isWeb) {
          toggleSidebar();
          return true;
        }
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }
  }, [sidebarVisible]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <MaterialIcons name="menu" size={24} color={colors.primaryWhite} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons name="notifications" size={24} color={colors.primaryWhite} />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Image 
              source={{ uri: hotelInfo.profileImage }} 
              style={styles.profileImage} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Sidebar - Always rendered on web, conditionally on mobile */}
        {(isWeb || sidebarVisible) && (
          <Animated.View 
            style={[
              styles.sidebar,
              { transform: [{ translateX: isWeb ? 0 : slideAnim }] }
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Image 
                source={{ uri: hotelInfo.profileImage }} 
                style={{ width: 60, height: 60, borderRadius: 30 }} 
              />
              <Text style={styles.hotelName}>{hotelInfo.name}</Text>
              <Text style={styles.hotelAddress}>{hotelInfo.address}</Text>
            </View>
            
            <ScrollView style={styles.sidebarContent}>
              {menuItems.map(item => (
                <TouchableOpacity 
                  key={item.id}
                  style={[
                    styles.menuItem,
                    activeTab === item.id && styles.menuItemActive
                  ]}
                  onPress={()=>navigation.navigate(item.label)}
                >
                  <MaterialIcons 
                    name={item.icon} 
                    size={24} 
                    color={activeTab === item.id ? colors.primaryViolet : colors.darkGray} 
                    style={styles.menuIcon}
                  />
                  <Text 
                    style={[
                      styles.menuText,
                      activeTab === item.id && styles.menuTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.sidebarFooter}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </Animated.View>
        )}

        {/* Overlay for mobile sidebar */}
        {!isWeb && sidebarVisible && (
          <TouchableOpacity 
            style={styles.overlay} 
            activeOpacity={1}
            onPress={toggleSidebar}
          />
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          <View style={styles.childrenContainer}>
            {children}
          </View>
          
          {/* Bottom Bar (mobile only) */}
          {!isWeb && (
            <View style={styles.bottomBar}>
              {bottomBarItems.map(item => (
                <TouchableOpacity 
                  key={item.id}
                  style={[
                    styles.bottomBarItem,
                    activeTab === item.id && styles.bottomBarItemActive
                  ]}
                >
                  <MaterialIcons 
                    name={item.icon} 
                    size={24} 
                    color={activeTab === item.id ? colors.primaryViolet : colors.darkGray} 
                  />
                  <Text 
                    style={[
                      styles.bottomBarLabel,
                      activeTab === item.id && styles.bottomBarLabelActive
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}